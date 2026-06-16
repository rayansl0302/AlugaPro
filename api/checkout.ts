import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminDb, Timestamp } from './_firebase'

const MP_BASE = 'https://api.mercadopago.com'
const USE_TEST = process.env.MP_USE_TEST === 'true'
const TOKEN = (USE_TEST ? process.env.MP_ACCESS_TOKEN_TEST : process.env.MP_ACCESS_TOKEN_PROD)!
const APP_URL = process.env.VITE_APP_URL ?? 'https://alugapro.com.br'
const PLAN_SUFFIX = USE_TEST ? '_TEST' : '_PROD'

const PLANS: Record<string, { name: string; amount: number; envPlanId: string }> = {
  starter:  { name: 'AlugaPro Starter',  amount: 39,  envPlanId: `MP_PLAN_STARTER_ID${PLAN_SUFFIX}` },
  pro:      { name: 'AlugaPro Pro',      amount: 79,  envPlanId: `MP_PLAN_PRO_ID${PLAN_SUFFIX}` },
  business: { name: 'AlugaPro Business', amount: 129, envPlanId: `MP_PLAN_BUSINESS_ID${PLAN_SUFFIX}` },
}

// Gets or creates an MP preapproval_plan and returns { id, initPoint }.
// The initPoint is MP's hosted checkout URL — the user goes there to enter card details.
// We never create a preapproval directly; that requires a card_token from the frontend.
async function getOrCreateMpPlan(planKey: string): Promise<{ id: string; initPoint: string }> {
  const plan = PLANS[planKey]
  const cached = process.env[plan.envPlanId]

  if (cached) {
    const res = await fetch(`${MP_BASE}/preapproval_plan/${cached}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    if (res.ok) {
      const data = await res.json()
      return { id: data.id, initPoint: data.init_point }
    }
    console.warn(`[MP] Cached plan ID ${cached} (${plan.envPlanId}) not found — creating a new one`)
  }

  // First-run or stale: create the plan
  const res = await fetch(`${MP_BASE}/preapproval_plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      reason: plan.name,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: plan.amount,
        currency_id: 'BRL',
      },
      payment_methods_allowed: {
        payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'pix' },
        ],
      },
      back_url: `${APP_URL}/configuracoes/assinatura`,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`MP plan create failed: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  console.info(`[MP] Plan created — set ${plan.envPlanId}=${data.id} in your env vars`)
  return { id: data.id, initPoint: data.init_point }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { planId, companyId, email } = req.body as {
    planId: string
    companyId: string
    email: string
  }

  if (!planId || !companyId || !email) {
    return res.status(400).json({ error: 'planId, companyId e email são obrigatórios' })
  }

  if (!PLANS[planId]) {
    return res.status(400).json({ error: 'planId inválido' })
  }

  try {
    const { id: mpPlanId, initPoint } = await getOrCreateMpPlan(planId)

    // Record pending checkout so the webhook can identify the company by email
    await adminDb.doc(`subscriptions/${companyId}`).set(
      {
        provider: 'mercadopago',
        pendingPlanId: planId,
        pendingMpPlanId: mpPlanId,
        payerEmail: email,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    )

    return res.status(200).json({ checkoutUrl: initPoint })
  } catch (err) {
    console.error('[checkout] error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro interno ao iniciar checkout',
    })
  }
}
