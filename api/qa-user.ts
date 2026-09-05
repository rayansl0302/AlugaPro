/**
 * POST /api/qa-user
 *
 * Gerencia logins de teste do Painel de QA (/qa, admin-only): criar, editar
 * e excluir. Endpoint único pras 3 ações (Vercel Hobby limita a 12
 * Serverless Functions — juntar libera espaço pra outros endpoints em vez
 * de manter 3 arquivos quase idênticos).
 *
 * O SDK client-side não permite criar/editar/excluir login de outra pessoa
 * sem trocar a própria sessão pela dela — por isso só pode ser feito aqui,
 * com o Admin SDK.
 *
 * Header: Authorization: Bearer <Firebase ID token do admin>
 * Body: { action: 'create', email, password, name, role, tenantId? }
 *     | { action: 'update', uid, name?, password? }
 *     | { action: 'delete', uid }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminAuth, adminDb, Timestamp } from './_firebase.js'
import { requireUser, errorResponse, httpError } from './_auth.js'

const QA_COMPANY_ID = 'alugapro-qa'
const AFFILIATE_COMPANY_ID = 'alugapro-afiliados'
const TRIAL_DAYS = 14
// Sem 0/O e 1/I para evitar confusão ao compartilhar o código por voz/texto
// (mesmo alfabeto do fluxo real, api/create-affiliate-profile.ts).
const REFERRAL_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCandidateCode(length = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)]
  }
  return code
}

async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateCandidateCode()
    const existing = await adminDb.collection('users').where('referralCode', '==', candidate).limit(1).get()
    if (existing.empty) return candidate
  }
  throw new Error('Não foi possível gerar um código de indicação único — tente novamente')
}

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

async function handleCreate(req: VercelRequest, res: VercelResponse) {
  const { email, password, name, role, tenantId } = req.body as {
    email?: string
    password?: string
    name?: string
    role?: 'gestor' | 'inquilino' | 'afiliado'
    tenantId?: string
  }

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Campos obrigatórios: email, password, name, role' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres' })
  }
  if (role !== 'gestor' && role !== 'inquilino' && role !== 'afiliado') {
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

  const referralCode = role === 'afiliado' ? await generateUniqueReferralCode() : undefined

  const now = Timestamp.now()
  await adminDb.doc(`users/${uid}`).set({
    name,
    email,
    role,
    companyId: role === 'afiliado' ? AFFILIATE_COMPANY_ID : QA_COMPANY_ID,
    ...(role === 'inquilino' ? { tenantId } : {}),
    ...(role === 'afiliado' ? { referralCode } : {}),
    isQaTest: true,
    active: true,
    createdAt: now,
    updatedAt: now,
  })

  return res.status(200).json({ uid, referralCode })
}

async function handleUpdate(req: VercelRequest, res: VercelResponse) {
  const { uid, name, password } = req.body as { uid?: string; name?: string; password?: string }
  if (!uid) return res.status(400).json({ error: 'uid obrigatório' })
  if (!name && !password) return res.status(400).json({ error: 'Informe nome e/ou senha pra atualizar' })
  if (password && password.length < 6) {
    return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres' })
  }

  const userRef = adminDb.doc(`users/${uid}`)
  const userSnap = await userRef.get()
  if (!userSnap.exists || userSnap.data()?.isQaTest !== true) {
    throw httpError(403, 'Essa conta não foi criada pelo Painel de QA')
  }

  await adminAuth.updateUser(uid, {
    ...(name ? { displayName: name } : {}),
    ...(password ? { password } : {}),
  })

  if (name) {
    await userRef.update({ name, updatedAt: Timestamp.now() })
  }

  return res.status(200).json({ ok: true })
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const { uid } = req.body as { uid?: string }
  if (!uid) return res.status(400).json({ error: 'uid obrigatório' })

  // Trava de segurança: só apaga contas marcadas como criadas pelo painel
  // de QA — evita que um uid errado (ex: de um afiliado real, que
  // compartilha a mesma companyId 'alugapro-afiliados' dos de teste, ou
  // qualquer outra conta real) seja excluído por engano. Exige o doc
  // existir E estar marcado isQaTest — sem essa segunda condição, um uid
  // sem doc no Firestore (ex: conta real cujo doc falhou ao gravar) passaria
  // pela trava sem checagem nenhuma.
  const userSnap = await adminDb.doc(`users/${uid}`).get()
  if (!userSnap.exists || userSnap.data()?.isQaTest !== true) {
    throw httpError(403, 'Essa conta não foi criada pelo Painel de QA')
  }

  try {
    await adminAuth.deleteUser(uid)
  } catch (err) {
    const code = (err as { code?: string }).code
    // Conta já não existe no Auth — segue pra limpar o doc do Firestore mesmo assim.
    if (code !== 'auth/user-not-found') throw err
  }
  await adminDb.doc(`users/${uid}`).delete()

  return res.status(200).json({ ok: true })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const admin = await requireUser(req)
    if (!admin.isAdmin) throw httpError(403, 'Apenas administradores podem gerenciar logins de teste')

    const { action } = req.body as { action?: 'create' | 'update' | 'delete' }
    if (action === 'create') return await handleCreate(req, res)
    if (action === 'update') return await handleUpdate(req, res)
    if (action === 'delete') return await handleDelete(req, res)
    return res.status(400).json({ error: 'action inválida — use create, update ou delete' })
  } catch (err) {
    const { status, message } = errorResponse(err)
    console.error('[qa-user] error:', err)
    return res.status(status).json({ error: message })
  }
}
