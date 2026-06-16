import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminDb, Timestamp } from './_firebase'

const MP_BASE = 'https://api.mercadopago.com'
const USE_TEST = process.env.MP_USE_TEST === 'true'
const TOKEN = (USE_TEST ? process.env.MP_ACCESS_TOKEN_TEST : process.env.MP_ACCESS_TOKEN_PROD)!

const STATUS_MAP: Record<string, string> = {
  authorized: 'active',
  pending:    'trialing',
  paused:     'past_due',
  cancelled:  'canceled',
  ended:      'canceled',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { preapprovalId, companyId } = req.body as { preapprovalId: string; companyId: string }
  if (!preapprovalId || !companyId) {
    return res.status(400).json({ error: 'preapprovalId e companyId são obrigatórios' })
  }

  try {
    const mpRes = await fetch(`${MP_BASE}/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })

    if (!mpRes.ok) {
      const err = await mpRes.json()
      return res.status(502).json({ error: `MP: ${err.message ?? 'erro ao buscar preapproval'}` })
    }

    const preapproval = await mpRes.json()
    const newStatus = STATUS_MAP[preapproval.status] ?? 'expired'

    // Get planId from pending subscription doc
    const subSnap = await adminDb.doc(`subscriptions/${companyId}`).get()
    const planId = subSnap.data()?.pendingPlanId ?? preapproval.preapproval_plan_id ?? 'pro'

    const periodEnd = preapproval.next_payment_date
      ? Timestamp.fromDate(new Date(preapproval.next_payment_date))
      : Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

    await adminDb.doc(`subscriptions/${companyId}`).set(
      {
        status: newStatus,
        planId,
        provider: 'mercadopago',
        providerSubscriptionId: preapproval.id,
        providerCustomerId: preapproval.payer_id?.toString() ?? '',
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        pendingPlanId: null,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    )

    console.info(`[verify] ${companyId} → ${newStatus} (plan: ${planId})`)
    return res.status(200).json({ status: newStatus, planId })
  } catch (err) {
    console.error('[verify] error:', err)
    return res.status(500).json({ error: 'Erro interno ao verificar assinatura' })
  }
}
