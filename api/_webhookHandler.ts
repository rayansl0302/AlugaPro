import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac } from 'crypto'
import { adminDb, Timestamp } from './_firebase.js'

const MP_BASE = 'https://api.mercadopago.com'

const STATUS_MAP: Record<string, string> = {
  authorized: 'active',
  pending:    'trialing',
  paused:     'past_due',
  cancelled:  'canceled',
  ended:      'canceled',
}

function validateSignature(req: VercelRequest, secret: string): boolean {
  if (!secret) return true

  const xSignature = req.headers['x-signature'] as string | undefined
  const xRequestId = req.headers['x-request-id'] as string | undefined
  if (!xSignature) return false

  const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')))
  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) return false

  const dataId = (req.query.id as string) ?? ''
  const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  return expected === v1
}

async function resolveCompany(preapproval: Record<string, unknown>): Promise<{ companyId: string; planId: string } | null> {
  const extRef = preapproval.external_reference as string | undefined
  if (extRef) {
    const [companyId, planId] = extRef.split(':')
    if (companyId && planId) return { companyId, planId }
  }

  const payerEmail = (preapproval.payer_email as string | undefined)?.toLowerCase()
  if (!payerEmail) return null

  const usersSnap = await adminDb.collection('users').where('email', '==', payerEmail).limit(1).get()
  if (usersSnap.empty) {
    console.warn('[webhook] no user found for email:', payerEmail)
    return null
  }

  const companyId = usersSnap.docs[0].data().companyId as string
  if (!companyId) return null

  const subSnap = await adminDb.doc(`subscriptions/${companyId}`).get()
  const planId = (subSnap.data()?.pendingPlanId as string) ?? 'pro'

  return { companyId, planId }
}

export async function handleWebhook(req: VercelRequest, res: VercelResponse, token: string, secret: string, label: string) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!validateSignature(req, secret)) {
    console.warn(`[webhook:${label}] invalid MP signature`)
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { type, data } = req.body as { type: string; data: { id: string } }

  if (type !== 'preapproval') {
    return res.status(200).json({ ignored: true })
  }

  try {
    const mpRes = await fetch(`${MP_BASE}/preapproval/${data.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!mpRes.ok) {
      console.error(`[webhook:${label}] failed to fetch preapproval`, data.id)
      return res.status(502).json({ error: 'Could not fetch preapproval' })
    }

    const preapproval = await mpRes.json()
    const resolved = await resolveCompany(preapproval)

    if (!resolved) {
      console.warn(`[webhook:${label}] could not resolve company for preapproval`, data.id)
      return res.status(200).json({ ignored: true })
    }

    const { companyId, planId } = resolved
    const newStatus = STATUS_MAP[preapproval.status] ?? 'expired'
    const now = Timestamp.now()
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
        pendingPlanId: null,
        updatedAt: now,
      },
      { merge: true }
    )

    console.info(`[webhook:${label}] ${companyId} → ${newStatus} (plan: ${planId})`)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error(`[webhook:${label}] error:`, err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
