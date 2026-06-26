/**
 * POST /api/asaas-create-subaccount
 *
 * Cria uma subconta Asaas para o afiliado autenticado, para que ele tenha
 * um walletId e possa receber sua parte no split de pagamento. Usa a API
 * key principal da Asaas (secreta) — por isso precisa rodar no servidor.
 *
 * Header: Authorization: Bearer <Firebase ID token do afiliado>
 * Body: { name, email, cpfCnpj, mobilePhone, incomeValue, street, addressNumber, neighborhood, postalCode }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminAuth, adminDb, Timestamp } from './_firebase.js'
import { createSubaccount } from './_asaas.js'

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

  const { name, email, cpfCnpj, mobilePhone, incomeValue, street, addressNumber, neighborhood, postalCode } = req.body as {
    name?: string
    email?: string
    cpfCnpj?: string
    mobilePhone?: string
    incomeValue?: number
    street?: string
    addressNumber?: string
    neighborhood?: string
    postalCode?: string
  }

  if (!name?.trim() || !email?.trim() || !cpfCnpj?.trim() || !mobilePhone?.trim() ||
      !incomeValue || !street?.trim() || !addressNumber?.trim() || !neighborhood?.trim() || !postalCode?.trim()) {
    return res.status(400).json({ error: 'Todos os campos de cadastro são obrigatórios' })
  }

  try {
    const userRef = adminDb.doc(`users/${uid}`)
    const userSnap = await userRef.get()
    if (userSnap.data()?.role !== 'afiliado') {
      return res.status(403).json({ error: 'Apenas afiliados podem se cadastrar para recebimento' })
    }
    if (userSnap.data()?.asaasWalletId) {
      return res.status(200).json({ ok: true, walletId: userSnap.data()?.asaasWalletId, alreadyExists: true })
    }

    const subaccount = await createSubaccount({
      name: name.trim(),
      email: email.trim(),
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      mobilePhone: mobilePhone.replace(/\D/g, ''),
      incomeValue,
      address: street.trim(),
      addressNumber: addressNumber.trim(),
      province: neighborhood.trim(),
      postalCode: postalCode.replace(/\D/g, ''),
    })

    await userRef.set(
      {
        asaasWalletId: subaccount.walletId,
        asaasSubaccountId: subaccount.id,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    )

    return res.status(200).json({ ok: true, walletId: subaccount.walletId })
  } catch (err) {
    console.error('[asaas-create-subaccount] error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro ao criar conta de recebimento',
    })
  }
}
