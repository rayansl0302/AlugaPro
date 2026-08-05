/**
 * POST /api/qa-update-user
 *
 * Edita um login de teste criado pelo Painel de QA (/api/qa-create-user):
 * troca o nome e/ou a senha via Admin SDK (o cliente não pode alterar a
 * senha de outra conta sem trocar a própria sessão pela dela). O e-mail não
 * é editável aqui — trocar o e-mail de login exigiria sincronizar Auth e
 * Firestore, fora de escopo por ora.
 *
 * Mesma trava de segurança do qa-delete-user: só edita contas marcadas com
 * isQaTest === true, nunca uma conta real (ex: afiliado real, que
 * compartilha a companyId alugapro-afiliados com os de teste).
 *
 * Header: Authorization: Bearer <Firebase ID token do admin>
 * Body: { uid, name?, password? }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminAuth, adminDb, Timestamp } from './_firebase.js'
import { requireUser, errorResponse, httpError } from './_auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const admin = await requireUser(req)
    if (!admin.isAdmin) throw httpError(403, 'Apenas administradores podem editar logins de teste')

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
  } catch (err) {
    const { status, message } = errorResponse(err)
    console.error('[qa-update-user] error:', err)
    return res.status(status).json({ error: message })
  }
}
