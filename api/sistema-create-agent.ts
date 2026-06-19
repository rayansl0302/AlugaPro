/**
 * POST /api/sistema-create-agent
 *
 * Cria um novo agente comercial (Auth + Firestore) sem afetar a sessão
 * de quem está chamando — necessário porque createUserWithEmailAndPassword
 * no client SDK trocaria a sessão atual pela do usuário recém-criado.
 *
 * Header: Authorization: Bearer <Firebase ID token do admin chamador>
 * Body: { name, email, password }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminAuth, adminDb, Timestamp } from './_firebase.js'

const ADMIN_EMAILS = ['rayansl0302@gmail.com', 'rayansl.dev@gmail.com']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization ?? ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!idToken) {
    return res.status(401).json({ error: 'Token ausente' })
  }

  let callerEmail: string | undefined
  try {
    const decoded = await adminAuth.verifyIdToken(idToken)
    callerEmail = decoded.email
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }

  if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
    return res.status(403).json({ error: 'Apenas administradores podem criar agentes' })
  }

  const { name, email, password } = req.body as { name?: string; email?: string; password?: string }
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'name, email e password são obrigatórios' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' })
  }

  try {
    const userRecord = await adminAuth.createUser({
      email: email.trim(),
      password,
      displayName: name.trim(),
    })

    await adminDb.collection('users').doc(userRecord.uid).set({
      name: name.trim(),
      email: email.trim(),
      role: 'comercial',
      active: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    return res.status(200).json({ ok: true, uid: userRecord.uid })
  } catch (err) {
    const code = (err as { errorInfo?: { code?: string } })?.errorInfo?.code
    const message =
      code === 'auth/email-already-exists'
        ? 'Esse e-mail já está cadastrado.'
        : code === 'auth/invalid-password'
          ? 'Senha inválida (mínimo 6 caracteres).'
          : String((err as Error)?.message ?? err)
    return res.status(400).json({ ok: false, error: message })
  }
}
