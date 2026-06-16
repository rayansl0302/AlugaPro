import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac } from 'crypto'
import { adminDb, Timestamp } from './_firebase'

const MP_BASE = 'https://api.mercadopago.com'
const TOKEN = process.env.MP_ACCESS_TOKEN!
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET!

// Maps Mercado Pago preapproval status → AlugaPro subscription status
const STATUS_MAP: Record<string, string> = {
  authorized:  'active',
  pending:     'trialing',
  paused:      'past_due',
  cancelled:   'canceled',
  ended:       'canceled',
}

function validateSignature(req: VercelRequest): boolean {
  if (!WEBHOOK_SECRET) return true // skip in sandbox if not configured

  const xSignature = req.headers['x-signature'] as string | undefined
  const xRequestId = req.headers['x-request-id'] as string | undefined
  if (!xSignature) return false

  // MP signature format: "ts=<timestamp>&v1=<hmac>"
  const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')))
  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) return false

  const dataId = (req.query.id as string) ?? ''
  const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`
  const expected = createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex')

  return expected === v1
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!validateSignature(req)) {
    console.warn('[webhook] invalid MP signature')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { type, data } = req.body as { type: string; data: { id: string } }

  // We only handle subscription (preapproval) events
  if (type !== 'preapproval') {
    return res.status(200).json({ ignored: true })
  }

  try {
    // Fetch full preapproval object from MP
    const mpRes = await fetch(`${MP_BASE}/preapproval/${data.id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })

    if (!mpRes.ok) {
      console.error('[webhook] failed to fetch preapproval', data.id)
      return res.status(502).json({ error: 'Could not fetch preapproval' })
    }

    const preapproval = await mpRes.json()
    const externalRef: string = preapproval.external_reference ?? ''
    const [companyId, planId] = externalRef.split(':')

    if (!companyId || !planId) {
      console.warn('[webhook] missing external_reference', externalRef)
      return res.status(200).json({ ignored: true })
    }

    const newStatus = STATUS_MAP[preapproval.status] ?? 'expired'
    const now = Timestamp.now()

    // Calculate period end from next_payment_date if available
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
        cancelAtPeriodEnd: preapproval.status === 'cancelled',
        updatedAt: now,
      },
      { merge: true }
    )

    console.info(`[webhook] subscription ${companyId} → ${newStatus} (plan: ${planId})`)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[webhook] error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
