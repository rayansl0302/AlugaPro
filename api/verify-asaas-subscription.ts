import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminDb, Timestamp } from './_firebase.js'
import { getFirstPaymentForSubscription } from './_asaas.js'
import { requireUser, errorResponse } from './_auth.js'

const PAYMENT_STATUS_MAP: Record<string, string> = {
  CONFIRMED: 'active',
  RECEIVED: 'active',
  RECEIVED_IN_CASH: 'active',
  PENDING: 'trialing',
  OVERDUE: 'past_due',
  REFUNDED: 'canceled',
  REFUND_REQUESTED: 'canceled',
  CHARGEBACK_REQUESTED: 'canceled',
  DELETED: 'canceled',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // SEGURANÇA: só usuário autenticado da própria empresa (ou admin).
  let caller
  try {
    caller = await requireUser(req)
  } catch (err) {
    const { status, message } = errorResponse(err)
    return res.status(status).json({ error: message })
  }

  const { companyId } = req.body as { companyId: string }
  if (!companyId) {
    return res.status(400).json({ error: 'companyId é obrigatório' })
  }
  if (!caller.isAdmin && caller.companyId !== companyId) {
    return res.status(403).json({ error: 'Empresa não pertence ao usuário autenticado' })
  }

  try {
    const subSnap = await adminDb.doc(`subscriptions/${companyId}`).get()
    const subData = subSnap.data()
    const subscriptionId = subData?.providerSubscriptionId as string | undefined
    const planId = (subData?.pendingPlanId as string) ?? subData?.planId ?? 'pro'

    if (!subscriptionId) {
      return res.status(404).json({ error: 'Nenhuma assinatura Asaas pendente para esta empresa' })
    }

    const payment = await getFirstPaymentForSubscription(subscriptionId)
    const newStatus = payment ? (PAYMENT_STATUS_MAP[payment.status] ?? 'trialing') : 'trialing'

    const periodEnd = Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await adminDb.doc(`subscriptions/${companyId}`).set(
      {
        status: newStatus,
        planId,
        provider: 'asaas',
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        pendingPlanId: null,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    )

    console.info(`[verify-asaas] ${companyId} → ${newStatus} (plan: ${planId})`)
    return res.status(200).json({ status: newStatus, planId })
  } catch (err) {
    console.error('[verify-asaas] error:', err)
    return res.status(500).json({ error: 'Erro interno ao verificar assinatura' })
  }
}
