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

// Mesmos valores usados no painel do afiliado e na landing de afiliados
const AFFILIATE_COMMISSION_RATE = 7
const COMMISSION_WAIT_DAYS = 15

interface AsaasWebhookPayment {
  id: string
  status: string
  value?: number
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

// Lança a comissão do afiliado no ledger (affiliateCommissions) quando um
// pagamento de empresa indicada é confirmado. O id do doc é o paymentId da
// Asaas — create() falha se já existir, o que torna a operação idempotente
// mesmo com webhooks duplicados (CONFIRMED + RECEIVED do mesmo pagamento).
// O pagamento em si acontece depois, no cron (transferência PIX).
async function accrueAffiliateCommission(input: {
  payment: AsaasWebhookPayment
  companyId: string
  activatedAt?: { toMillis(): number }
  affiliateSplitProcessedAt?: unknown
}) {
  const { payment, companyId, activatedAt, affiliateSplitProcessedAt } = input

  const paymentValue = typeof payment.value === 'number' ? payment.value : 0
  if (paymentValue <= 0) return

  // Carência: comissão só sobre pagamentos após COMMISSION_WAIT_DAYS da
  // primeira ativação (cobre o direito de arrependimento do CDC). Se
  // activatedAt não existe ainda, este é o primeiro pagamento — sem comissão.
  if (!activatedAt) return
  if (activatedAt.toMillis() > Date.now() - COMMISSION_WAIT_DAYS * 86_400_000) return

  const refSnap = await adminDb.doc(`affiliateReferrals/${companyId}`).get()
  if (!refSnap.exists) return
  const referral = refSnap.data() as { code?: string; companyName?: string }
  if (!referral.code) return

  const usersSnap = await adminDb.collection('users').where('referralCode', '==', referral.code).limit(1).get()
  const affiliateDoc = usersSnap.docs[0]
  if (!affiliateDoc) return

  // Legado: se o split nativo da Asaas já foi ativado nessa assinatura (modelo
  // antigo, afiliado com walletId), a comissão já é dividida na fonte — lançar
  // no ledger duplicaria o pagamento.
  if (affiliateSplitProcessedAt && affiliateDoc.data().asaasWalletId) return

  const commissionValue = Math.round(paymentValue * AFFILIATE_COMMISSION_RATE) / 100
  if (commissionValue <= 0) return

  try {
    await adminDb.doc(`affiliateCommissions/${payment.id}`).create({
      affiliateUserId: affiliateDoc.id,
      referralCode: referral.code,
      companyId,
      companyName: referral.companyName ?? '',
      paymentId: payment.id,
      paymentValue,
      commissionRate: AFFILIATE_COMMISSION_RATE,
      commissionValue,
      status: 'pendente',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    console.info(`[asaas-webhook] comissão de R$ ${commissionValue.toFixed(2)} lançada para ${affiliateDoc.id} (pagamento ${payment.id})`)
  } catch (err) {
    // ALREADY_EXISTS = webhook duplicado do mesmo pagamento — esperado, ignora
    if ((err as { code?: number }).code === 6) return
    throw err
  }
}

// Estorno/chargeback: cancela a comissão pendente do pagamento. Se já foi
// paga, não mexe — fica registrada pra tratativa manual (raro o suficiente
// pra não justificar clawback automático).
async function cancelPendingCommission(paymentId: string) {
  const ref = adminDb.doc(`affiliateCommissions/${paymentId}`)
  const snap = await ref.get()
  if (snap.exists && snap.data()?.status === 'pendente') {
    await ref.update({
      status: 'cancelado',
      error: 'Pagamento estornado/cancelado na Asaas',
      updatedAt: Timestamp.now(),
    })
    console.info(`[asaas-webhook] comissão do pagamento ${paymentId} cancelada (estorno)`)
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

    const subRef = adminDb.doc(`subscriptions/${companyId}`)
    const existing = (await subRef.get()).data() as
      | { activatedAt?: { toMillis(): number }; affiliateSplitProcessedAt?: unknown }
      | undefined

    const patch: Record<string, unknown> = {
      status: newStatus,
      provider: 'asaas',
      providerSubscriptionId: payment.subscription ?? null,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: newStatus === 'canceled',
      pendingPlanId: null,
      updatedAt: Timestamp.now(),
    }

    if (newStatus === 'active') {
      // activatedAt só é gravado na primeira vez — marca o início real do
      // período de carência da comissão de afiliado (15 dias), que não deve
      // ser redefinido a cada pagamento mensal recorrente.
      if (!existing?.activatedAt) {
        patch.activatedAt = Timestamp.now()
      }
    } else if (newStatus === 'canceled') {
      // Cancelou/reembolsou — limpa pra que uma futura reativação reinicie
      // o período de carência do zero, em vez de herdar uma data antiga.
      patch.activatedAt = null
      patch.affiliateSplitProcessedAt = null
    }

    await subRef.set(patch, { merge: true })

    // Ledger de comissão — falha aqui não pode mascarar o update da assinatura
    // que já aconteceu; responde 500 pra Asaas reenviar o webhook (o create
    // idempotente garante que nada duplica no retry).
    if (newStatus === 'active') {
      await accrueAffiliateCommission({
        payment,
        companyId,
        activatedAt: existing?.activatedAt,
        affiliateSplitProcessedAt: existing?.affiliateSplitProcessedAt,
      })
    } else if (newStatus === 'canceled') {
      await cancelPendingCommission(payment.id)
    }

    console.info(`[asaas-webhook] ${companyId} → ${newStatus} (event: ${event})`)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[asaas-webhook] error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
