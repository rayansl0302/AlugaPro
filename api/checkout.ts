import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminDb, Timestamp } from './_firebase.js'
import {
  findCustomerByExternalReference, createCustomer, createSubscription,
  getFirstPaymentForSubscription,
} from './_asaas.js'
import { requireUser, errorResponse } from './_auth.js'

const APP_URL = process.env.VITE_APP_URL ?? 'https://alugapro.com.br'

const PLANS: Record<string, { name: string; amount: number }> = {
  starter:  { name: 'AlugaPro Starter',  amount: 39 },
  pro:      { name: 'AlugaPro Pro',      amount: 79 },
  business: { name: 'AlugaPro Business', amount: 129 },
}

// Verifica se a empresa foi indicada por um afiliado que já tem carteira de
// recebimento cadastrada. NÃO monta o split aqui — ele só é ativado pelo cron
// depois do período de carência (api/cron-daily-notifications.ts), pra não
// repassar comissão sobre um pagamento que pode ser reembolsado pelo direito
// de arrependimento do CDC (art. 49, 7 dias). Usado só pra informar o
// gestor, no toast de confirmação, que a indicação é válida.
async function hasValidAffiliateReferral(companyId: string): Promise<boolean> {
  const refSnap = await adminDb.doc(`affiliateReferrals/${companyId}`).get()
  const code = refSnap.data()?.code as string | undefined
  if (!code) return false

  const usersSnap = await adminDb.collection('users').where('referralCode', '==', code).limit(1).get()
  if (usersSnap.empty) return false
  return !!usersSnap.docs[0].data().asaasWalletId
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // SEGURANÇA: só um usuário autenticado da PRÓPRIA empresa (ou admin) pode
  // abrir checkout — senão qualquer um cria cobranças/altera CNPJ de terceiros.
  let caller
  try {
    caller = await requireUser(req)
  } catch (err) {
    const { status, message } = errorResponse(err)
    return res.status(status).json({ error: message })
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
  if (!caller.isAdmin && caller.companyId !== companyId) {
    return res.status(403).json({ error: 'Empresa não pertence ao usuário autenticado' })
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

    const affiliateApplied = await hasValidAffiliateReferral(companyId)
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

    return res.status(200).json({ checkoutUrl: firstPayment.invoiceUrl, affiliateApplied })
  } catch (err) {
    console.error('[checkout] error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro interno ao iniciar checkout',
    })
  }
}
