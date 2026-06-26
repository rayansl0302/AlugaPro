import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminDb, Timestamp } from './_firebase.js'
import {
  findCustomerByExternalReference, createCustomer, createSubscription,
  getFirstPaymentForSubscription, AsaasSplit,
} from './_asaas.js'

const APP_URL = process.env.VITE_APP_URL ?? 'https://alugapro.com.br'

const PLANS: Record<string, { name: string; amount: number }> = {
  starter:  { name: 'AlugaPro Starter',  amount: 39 },
  pro:      { name: 'AlugaPro Pro',      amount: 79 },
  business: { name: 'AlugaPro Business', amount: 129 },
}

// Mesma lógica de faixas usada no painel de afiliado (src/modules/affiliate/AffiliatePanel.tsx)
function commissionRateForActiveCount(activeCount: number): number {
  if (activeCount >= 10) return 10
  if (activeCount >= 5) return 7
  return 5
}

// Verifica se a empresa foi indicada por um afiliado e, se o afiliado já
// completou o cadastro de recebimento (tem walletId), monta o split.
async function resolveAffiliateSplit(companyId: string): Promise<AsaasSplit[] | undefined> {
  const refSnap = await adminDb.doc(`affiliateReferrals/${companyId}`).get()
  const code = refSnap.data()?.code as string | undefined
  if (!code) return undefined

  const usersSnap = await adminDb.collection('users').where('referralCode', '==', code).limit(1).get()
  if (usersSnap.empty) return undefined
  const affiliate = usersSnap.docs[0].data()
  const walletId = affiliate.asaasWalletId as string | undefined
  if (!walletId) return undefined

  const allRefs = await adminDb.collection('affiliateReferrals').where('code', '==', code).get()
  let activeCount = 0
  for (const doc of allRefs.docs) {
    const subSnap = await adminDb.doc(`subscriptions/${doc.id}`).get()
    if (subSnap.data()?.status === 'active') activeCount++
  }

  return [{ walletId, percentualValue: commissionRateForActiveCount(activeCount) }]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { planId, companyId, email, cpfCnpj } = req.body as {
    planId: string
    companyId: string
    email: string
    cpfCnpj?: string
  }

  if (!planId || !companyId || !email) {
    return res.status(400).json({ error: 'planId, companyId e email são obrigatórios' })
  }
  if (!PLANS[planId]) {
    return res.status(400).json({ error: 'planId inválido' })
  }

  try {
    const companyRef = adminDb.doc(`companies/${companyId}`)
    const companySnap = await companyRef.get()
    const company = companySnap.data() ?? {}

    const documentNumber = (company.cnpj as string | undefined)?.replace(/\D/g, '') || cpfCnpj?.replace(/\D/g, '')
    if (!documentNumber || (documentNumber.length !== 11 && documentNumber.length !== 14)) {
      return res.status(422).json({ error: 'cpf_cnpj_required', message: 'Informe um CPF ou CNPJ válido para continuar.' })
    }
    if (cpfCnpj && !company.cnpj) {
      await companyRef.set({ cnpj: documentNumber }, { merge: true })
    }

    let asaasCustomerId = company.asaasCustomerId as string | undefined
    if (!asaasCustomerId) {
      const existing = await findCustomerByExternalReference(companyId)
      if (existing) {
        asaasCustomerId = existing.id
      } else {
        const customer = await createCustomer({
          name: (company.name as string) ?? email,
          email,
          cpfCnpj: documentNumber,
          externalReference: companyId,
        })
        asaasCustomerId = customer.id
      }
      await companyRef.set({ asaasCustomerId }, { merge: true })
    }

    const split = await resolveAffiliateSplit(companyId)
    const plan = PLANS[planId]
    const nextDueDate = new Date().toISOString().split('T')[0]

    const subscription = await createSubscription({
      customer: asaasCustomerId,
      billingType: 'UNDEFINED',
      value: plan.amount,
      nextDueDate,
      cycle: 'MONTHLY',
      description: plan.name,
      externalReference: companyId,
      split,
      callback: { successUrl: `${APP_URL}/configuracoes/assinatura?asaas_redirect=1`, autoRedirect: true },
    })

    const firstPayment = await getFirstPaymentForSubscription(subscription.id)
    if (!firstPayment) {
      throw new Error('Asaas não retornou a cobrança inicial da assinatura')
    }

    await adminDb.doc(`subscriptions/${companyId}`).set(
      {
        provider: 'asaas',
        pendingPlanId: planId,
        providerSubscriptionId: subscription.id,
        providerCustomerId: asaasCustomerId,
        payerEmail: email,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    )

    return res.status(200).json({ checkoutUrl: firstPayment.invoiceUrl })
  } catch (err) {
    console.error('[checkout] error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro interno ao iniciar checkout',
    })
  }
}
