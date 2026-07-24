/**
 * Autenticação compartilhada dos endpoints Vercel.
 *
 * Todos os endpoints sensíveis exigem um Firebase ID token válido no header
 * Authorization: Bearer <token>. A partir dele resolvemos o doc users/{uid}
 * pra decidir papel/empresa — o frontend NUNCA é fonte de verdade.
 */
import type { VercelRequest } from '@vercel/node'
import { adminAuth, adminDb } from './_firebase.js'

export const ADMIN_EMAILS = ['rayansl0302@gmail.com', 'rayansl.dev@gmail.com']

export interface AuthedUser {
  uid: string
  email: string
  isAdmin: boolean
  /** Papel do doc users/{uid} ('gestor' | 'inquilino' | ...); admin → 'admin'. */
  role: string
  companyId: string
}

/** Verifica o Bearer token e carrega o perfil. Lança Error com .status. */
export async function requireUser(req: VercelRequest): Promise<AuthedUser> {
  const header = req.headers.authorization ?? ''
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!idToken) throw httpError(401, 'Token ausente')

  let decoded
  try {
    decoded = await adminAuth.verifyIdToken(idToken)
  } catch {
    throw httpError(401, 'Token inválido')
  }

  const email = (decoded.email ?? '').toLowerCase()
  const isAdmin = ADMIN_EMAILS.includes(email)

  let role = isAdmin ? 'admin' : ''
  let companyId = ''
  try {
    const snap = await adminDb.collection('users').doc(decoded.uid).get()
    if (snap.exists) {
      const d = snap.data() as { role?: string; companyId?: string }
      role = isAdmin ? 'admin' : (d.role ?? '')
      companyId = d.companyId ?? ''
    }
  } catch {
    // Sem doc: admin ainda passa; outros ficam sem papel (bloqueados adiante)
  }

  return { uid: decoded.uid, email, isAdmin, role, companyId }
}

/** Exige papel de gestão (admin ou gestor). */
export async function requireGestor(req: VercelRequest): Promise<AuthedUser> {
  const user = await requireUser(req)
  if (!user.isAdmin && user.role !== 'gestor') {
    throw httpError(403, 'Apenas gestores podem executar esta ação')
  }
  return user
}

export function httpError(status: number, message: string): Error & { status: number } {
  const err = new Error(message) as Error & { status: number }
  err.status = status
  return err
}

/** Extrai status/mensagem de um erro lançado por requireUser/requireGestor. */
export function errorResponse(err: unknown): { status: number; message: string } {
  if (err instanceof Error && 'status' in err) {
    return { status: (err as { status: number }).status, message: err.message }
  }
  return { status: 500, message: 'Erro interno' }
}
