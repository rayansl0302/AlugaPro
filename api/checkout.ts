import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminDb, Timestamp } from './_firebase'

const MP_BASE = 'https://api.mercadopago.com'
const TOKEN = process.env.MP_ACCESS_TOKEN!
const APP_URL = process.env.VITE_APP_URL ?? 'https://alugapro.com.br'

const PLANS: Record<string, { name: string; amount: number; envPlanId: string }> = {
  starter:  { name: 'AlugaPro Starter',  amount: 39,  envPlanId: 'MP_PLAN_STARTER_ID' },
  pro:      { name: 'AlugaPro Pro',      amount: 79,  envPlanId: 'MP_PLAN_PRO_ID' },
  business: { name: 'AlugaPro Business', amount: 129, envPlanId: 'MP_PLAN_BUSINESS_ID' },
}

// Returns an existing MP preapproval_plan ID or creates one and logs it for the admin to save.
async function getOrCreateMpPlanId(planKey: string): Promise<string> {
  const plan = PLANS[planKey]

  // Prefer pre-configured plan IDs (set once in Vercel env vars)
  const cached = process.env[plan.envPlanId]
  if (cached) return cached

  // Sandbox/first-run: create a new plan and print the ID for the admin to save
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
  // Log so the admin can set the env var and avoid re-creating
  console.info(`[MP] Plan created — set ${plan.envPlanId}=${data.id} in your Vercel env vars`)
  return data.id as string
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
    const mpPlanId = await getOrCreateMpPlanId(planId)

    // Create the preapproval (subscription instance) for this customer
    const subRes = await fetch(`${MP_BASE}/preapproval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({
        preapproval_plan_id: mpPlanId,
        payer_email: email,
        external_reference: `${companyId}:${planId}`,
        back_url: `${APP_URL}/configuracoes/assinatura`,
      }),
    })

    if (!subRes.ok) {
      const err = await subRes.json()
      console.error('[MP] preapproval error:', err)
      return res.status(502).json({ error: 'Erro ao criar assinatura no Mercado Pago' })
    }

    const mpSub = await subRes.json()

    // Persist the pending subscription reference in Firestore
    // Status remains 'trialing' or current — only webhook updates to 'active'
    await adminDb.doc(`subscriptions/${companyId}`).set(
      {
        provider: 'mercadopago',
        providerSubscriptionId: mpSub.id,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    )

    return res.status(200).json({
      checkoutUrl: mpSub.init_point,
      subscriptionId: mpSub.id,
    })
  } catch (err) {
    console.error('[checkout] error:', err)
    return res.status(500).json({ error: 'Erro interno ao iniciar checkout' })
  }
}
