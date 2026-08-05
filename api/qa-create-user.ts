/**
 * POST /api/qa-create-user
 *
 * Cria um login de teste (Firebase Auth + doc users/{uid}) pro Painel de QA
 * (/qa, admin-only) — usado quando o admin quer logar como um gestor ou
 * inquilino de teste pra exercitar o sistema de verdade, sem precisar do
 * fluxo normal de autocadastro/convite.
 *
 * O SDK client-side não permite criar login de outra pessoa sem trocar a
 * própria sessão pela da conta nova — por isso isso só pode ser feito aqui,
 * com o Admin SDK.
 *
 * Header: Authorization: Bearer <Firebase ID token do admin>
 * Body: { email, password, name, role: 'gestor' | 'inquilino', tenantId? }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminAuth, adminDb, Timestamp } from './_firebase.js'
import { requireUser, errorResponse, httpError } from './_auth.js'

const QA_COMPANY_ID = 'alugapro-qa'
const TRIAL_DAYS = 14

async function ensureQaCompanyAndSubscription() {
  const companyRef = adminDb.doc(`companies/${QA_COMPANY_ID}`)
  const companySnap = await companyRef.get()
  if (!companySnap.exists) {
    await companyRef.set({
      id: QA_COMPANY_ID,
      name: 'AlugaPro QA',
      email: '',
      ownerId: 'qa-panel',
      createdAt: Timestamp.now(),
    })
  }

  const subRef = adminDb.doc(`subscriptions/${QA_COMPANY_ID}`)
  const subSnap = await subRef.get()
  if (!subSnap.exists) {
    const now = Timestamp.now()
    const trialEnd = Timestamp.fromMillis(now.toMillis() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    const periodEnd = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000)
    await subRef.set({
      companyId: QA_COMPANY_ID,
      planId: 'pro',
      status: 'trialing',
      trialEndsAt: trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      limits: { maxProperties: 50, maxVehicles: 50, maxUsers: 5 },
      usage: { propertyCount: 0, vehicleCount: 0, userCount: 1 },
      createdAt: now,
      updatedAt: now,
    })
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const admin = await requireUser(req)
    if (!admin.isAdmin) throw httpError(403, 'Apenas administradores podem criar logins de teste')

    const { email, password, name, role, tenantId } = req.body as {
      email?: string
      password?: string
      name?: string
      role?: 'gestor' | 'inquilino'
      tenantId?: string
    }

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Campos obrigatórios: email, password, name, role' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres' })
    }
    if (role !== 'gestor' && role !== 'inquilino') {
      return res.status(400).json({ error: 'role inválido' })
    }
    if (role === 'inquilino' && !tenantId) {
      return res.status(400).json({ error: 'tenantId obrigatório para role inquilino' })
    }

    let uid: string
    try {
      const userRecord = await adminAuth.createUser({ email, password, displayName: name })
      uid = userRecord.uid
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'Já existe uma conta com esse e-mail' })
      }
      throw err
    }

    if (role === 'gestor') {
      await ensureQaCompanyAndSubscription()
    }

    const now = Timestamp.now()
    await adminDb.doc(`users/${uid}`).set({
      name,
      email,
      role,
      companyId: QA_COMPANY_ID,
      ...(role === 'inquilino' ? { tenantId } : {}),
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    return res.status(200).json({ uid })
  } catch (err) {
    const { status, message } = errorResponse(err)
    console.error('[qa-create-user] error:', err)
    return res.status(status).json({ error: message })
  }
}
