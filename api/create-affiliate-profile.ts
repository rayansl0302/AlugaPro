/**
 * POST /api/create-affiliate-profile
 *
 * Cria o doc users/{uid} de um novo afiliado com um código de indicação
 * único, gerado e verificado no servidor (Admin SDK) — o cliente não tem
 * permissão de listar outros usuários por referralCode, então a unicidade
 * só pode ser garantida aqui.
 *
 * Header: Authorization: Bearer <Firebase ID token do afiliado>
 * Body: { name, email }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminAuth, adminDb, Timestamp } from './_firebase.js'

const AFFILIATE_COMPANY_ID = 'alugapro-afiliados'
// Sem 0/O e 1/I para evitar confusão ao compartilhar o código por voz/texto
const REFERRAL_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_ATTEMPTS = 10

function generateCandidateCode(length = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)]
  }
  return code
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateCandidateCode()
    const existing = await adminDb.collection('users').where('referralCode', '==', candidate).limit(1).get()
    if (existing.empty) return candidate
  }
  throw new Error('Não foi possível gerar um código de indicação único — tente novamente')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization ?? ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!idToken) {
    return res.status(401).json({ error: 'Token ausente' })
  }

  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(idToken)
    uid = decoded.uid
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }

  const { name, email } = req.body as { name?: string; email?: string }

  try {
    const userRef = adminDb.doc(`users/${uid}`)
    const userSnap = await userRef.get()

    // Idempotente: se já existe um código, devolve o mesmo em vez de gerar outro
    const existingCode = userSnap.data()?.referralCode as string | undefined
    if (existingCode) {
      return res.status(200).json({ referralCode: existingCode })
    }

    const referralCode = await generateUniqueCode()
    await userRef.set(
      {
        name: name?.trim() || email || 'Usuário',
        email: email ?? '',
        role: 'afiliado',
        companyId: AFFILIATE_COMPANY_ID,
        referralCode,
        active: true,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    )

    return res.status(200).json({ referralCode })
  } catch (err) {
    console.error('[create-affiliate-profile] error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao criar perfil de afiliado',
    })
  }
}
