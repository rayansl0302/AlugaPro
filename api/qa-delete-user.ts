/**
 * POST /api/qa-delete-user
 *
 * Remove um login de teste criado pelo Painel de QA (/api/qa-create-user):
 * apaga a conta do Firebase Auth e o doc users/{uid}. Não mexe em
 * companies/subscriptions da empresa de QA — outros logins de teste podem
 * continuar usando esses docs.
 *
 * Header: Authorization: Bearer <Firebase ID token do admin>
 * Body: { uid }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminAuth, adminDb } from './_firebase.js'
import { requireUser, errorResponse, httpError } from './_auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const admin = await requireUser(req)
    if (!admin.isAdmin) throw httpError(403, 'Apenas administradores podem excluir logins de teste')

    const { uid } = req.body as { uid?: string }
    if (!uid) return res.status(400).json({ error: 'uid obrigatório' })

    // Trava de segurança: só apaga contas marcadas como criadas pelo painel
    // de QA — evita que um uid errado (ex: de um afiliado real, que
    // compartilha a mesma companyId 'alugapro-afiliados' dos de teste)
    // seja excluído por engano.
    const userSnap = await adminDb.doc(`users/${uid}`).get()
    if (userSnap.exists && userSnap.data()?.isQaTest !== true) {
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
  } catch (err) {
    const { status, message } = errorResponse(err)
    console.error('[qa-delete-user] error:', err)
    return res.status(status).json({ error: message })
  }
}
