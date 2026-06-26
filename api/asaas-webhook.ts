import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminDb, Timestamp } from './_firebase.js'
import { asaasFetch } from './_asaas.js'

const PAYMENT_STATUS_MAP: Record<string, string> = {
  CONFIRMED: 'active',
  RECEIVED: 'active',
  RECEIVED_IN_CASH: 'active',
  OVERDUE: 'past_due',
  REFUNDED: 'canceled',
  REFUND_REQUESTED: 'canceled',
  CHARGEBACK_REQUESTED: 'canceled',
  DELETED: 'canceled',
}

interface AsaasWebhookPayment {
  id: string
  status: string
  subscription?: string
  externalReference?: string
}

async function resolveCompanyId(payment: AsaasWebhookPayment): Promise<string | null> {
  if (payment.externalReference) return payment.externalReference
  if (!payment.subscription) return null
  try {
    const subscription = await asaasFetch<{ externalReference?: string }>(`/subscriptions/${payment.subscription}`)
    return subscription.externalReference ?? null
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers['asaas-access-token']
  if (process.env.ASAAS_WEBHOOK_TOKEN && token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    console.warn('[asaas-webhook] invalid token')
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { event, payment } = req.body as { event: string; payment?: AsaasWebhookPayment }

  if (!payment || !PAYMENT_STATUS_MAP[payment.status]) {
    return res.status(200).json({ ignored: true })
  }

  try {
    const companyId = await resolveCompanyId(payment)
    if (!companyId) {
      console.warn('[asaas-webhook] could not resolve company for payment', payment.id)
      return res.status(200).json({ ignored: true })
    }

    const newStatus = PAYMENT_STATUS_MAP[payment.status]
    const periodEnd = Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await adminDb.doc(`subscriptions/${companyId}`).set(
      {
        status: newStatus,
        provider: 'asaas',
        providerSubscriptionId: payment.subscription ?? null,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: newStatus === 'canceled',
        pendingPlanId: null,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    )

    console.info(`[asaas-webhook] ${companyId} → ${newStatus} (event: ${event})`)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[asaas-webhook] error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
