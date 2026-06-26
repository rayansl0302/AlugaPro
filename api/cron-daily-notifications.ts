/**
 * GET /api/cron-daily-notifications
 *
 * Cron diário (configurado em vercel.json) — roda às 8h (BRT) = 11h UTC.
 * Faz dois trabalhos independentes nessa mesma execução (pra não passar do
 * limite de 12 serverless functions do plano Hobby da Vercel):
 *
 * 1. Varre cobranças não pagas e envia notificações WhatsApp via Evolution
 *    API conforme a escala de vencimento definida em _notifyLogic.ts.
 * 2. Ativa o split de comissão de afiliado nas assinaturas que completaram
 *    o período de carência (ver activateEligibleAffiliateSplits abaixo).
 *
 * Protegido pelo header Authorization: Bearer <CRON_SECRET> (Vercel injeta automaticamente).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb, Timestamp } from './_firebase.js'
import { sendWhatsAppMessage, evolutionConfigured } from './_evolution.js'
import { getTriggerForToday, buildMessage, type ChargeSnapshot } from './_notifyLogic.js'
import { updateSubscriptionSplit } from './_asaas.js'

// Mesmos valores usados em AffiliatePanel.tsx e AfiliadosPage.tsx
const AFFILIATE_COMMISSION_RATE = 7
const COMMISSION_WAIT_DAYS = 15

interface TenantDoc {
  whatsapp?: string
  phone?: string
  email?: string
  name?: string
  companyId?: string
}

interface ChargeDoc extends ChargeSnapshot {
  id: string
  tenantId: string
  companyId?: string
}

// Ativa o split de comissão nas assinaturas que: estão "active", já
// passaram do período de carência desde activatedAt, e ainda não foram
// processadas (affiliateSplitProcessedAt). Marca como processada de
// qualquer forma (achou afiliado válido ou não) pra nunca reprocessar.
// O split só vale pras cobranças futuras — nunca retroage na primeira
// cobrança, que é justamente o período coberto pelo direito de
// arrependimento do CDC (art. 49, 7 dias).
async function activateEligibleAffiliateSplits() {
  let activated = 0
  let skipped = 0
  let failed = 0

  const snap = await adminDb.collection('subscriptions').where('status', '==', 'active').get()
  const cutoff = Date.now() - COMMISSION_WAIT_DAYS * 24 * 60 * 60 * 1000

  for (const doc of snap.docs) {
    const sub = doc.data() as {
      activatedAt?: { toMillis(): number }
      affiliateSplitProcessedAt?: unknown
      providerSubscriptionId?: string
    }

    if (sub.affiliateSplitProcessedAt) continue
    if (!sub.activatedAt || sub.activatedAt.toMillis() > cutoff) continue
    if (!sub.providerSubscriptionId) continue

    try {
      const refSnap = await adminDb.doc(`affiliateReferrals/${doc.id}`).get()
      const code = refSnap.data()?.code as string | undefined
      let walletId: string | undefined

      if (code) {
        const usersSnap = await adminDb.collection('users').where('referralCode', '==', code).limit(1).get()
        walletId = usersSnap.docs[0]?.data().asaasWalletId as string | undefined
      }

      if (walletId) {
        await updateSubscriptionSplit(sub.providerSubscriptionId, [
          { walletId, percentualValue: AFFILIATE_COMMISSION_RATE },
        ])
        console.log(`[cron] split ativado para ${doc.id} → ${walletId}`)
        activated++
      } else {
        skipped++
      }

      await doc.ref.update({ affiliateSplitProcessedAt: Timestamp.now() })
    } catch (err) {
      console.error(`[cron] erro ao ativar split de ${doc.id}:`, err)
      failed++
    }
  }

  return { activated, skipped, failed }
}

// Varre cobranças pendentes/atrasadas e envia notificações WhatsApp.
// Independente da ativação de split de afiliado — uma não deve bloquear a
// outra (ex.: Evolution API fora do ar não pode impedir o cron de ativar
// comissões vencidas).
async function sendDailyChargeNotifications() {
  const today = new Date().toISOString().slice(0, 10)
  console.log(`[cron] Rodando notificações para ${today}`)

  // ── 1. Busca todas as cobranças pendentes / atrasadas ──────────────────────
  let charges: ChargeDoc[] = []
  try {
    const snap = await adminDb
      .collection('charges')
      .where('status', 'in', ['pendente', 'atrasado'])
      .get()

    charges = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ChargeDoc, 'id'>),
    }))
  } catch (err) {
    console.error('[cron] Erro ao buscar charges:', err)
    throw new Error('Firestore query failed')
  }

  console.log(`[cron] ${charges.length} cobrança(s) ativa(s) encontrada(s)`)

  // ── 2. Cache de tenants para evitar reads duplicados ──────────────────────
  const tenantCache = new Map<string, TenantDoc>()

  async function getTenant(tenantId: string): Promise<TenantDoc | null> {
    if (tenantCache.has(tenantId)) return tenantCache.get(tenantId)!
    try {
      const snap = await adminDb.collection('tenants').doc(tenantId).get()
      if (!snap.exists) return null
      const data = snap.data() as TenantDoc
      tenantCache.set(tenantId, data)
      return data
    } catch {
      return null
    }
  }

  // ── 3. Processa cada cobrança ─────────────────────────────────────────────
  let sent = 0
  let skipped = 0
  let failed = 0

  for (const charge of charges) {
    const trigger = getTriggerForToday(charge, today)
    if (!trigger) { skipped++; continue }

    const tenant = await getTenant(charge.tenantId)
    const phone  = tenant?.whatsapp ?? tenant?.phone
    if (!phone) {
      console.log(`[cron] Sem WhatsApp para tenant ${charge.tenantId} (cobrança ${charge.id})`)
      skipped++
      continue
    }

    const message = buildMessage(charge, trigger)
    const result  = await sendWhatsAppMessage(phone, message)

    if (result.ok) {
      try {
        const isOverdue = trigger.startsWith('vencido_')
        await adminDb.collection('charges').doc(charge.id).update({
          // Atraso: salva data de hoje → cron não reenvia até amanhã
          // Pré-vencimento: registra o marco para não repetir
          ...(isOverdue
            ? { lastNotifiedDate: today }
            : { notificationsSent: FieldValue.arrayUnion(trigger) }),
          updatedAt: FieldValue.serverTimestamp(),
        })
      } catch (err) {
        console.error(`[cron] Erro ao atualizar charge ${charge.id}:`, err)
      }
      console.log(`[cron] ✓ ${trigger} → ${tenant?.name ?? charge.tenantName} (${charge.id})`)
      sent++
    } else {
      console.error(`[cron] ✗ ${charge.id}: ${result.error}`)
      failed++
    }

    // Delay anti-ban entre envios (1.5s)
    await new Promise((r) => setTimeout(r, 1_500))
  }

  const summary = { today, sent, skipped, failed, total: charges.length }
  console.log('[cron] Concluído (notificações):', summary)
  return summary
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel injeta Authorization: Bearer <CRON_SECRET> — validar
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  let notifications: unknown = { skipped: 'evolution_not_configured' }
  if (evolutionConfigured()) {
    try {
      notifications = await sendDailyChargeNotifications()
    } catch (err) {
      console.error('[cron] Erro nas notificações:', err)
      notifications = { error: err instanceof Error ? err.message : String(err) }
    }
  } else {
    console.log('[cron] Evolution API não configurada — pulando envios.')
  }

  let affiliateSplits: unknown
  try {
    affiliateSplits = await activateEligibleAffiliateSplits()
    console.log('[cron] Concluído (splits de afiliado):', affiliateSplits)
  } catch (err) {
    console.error('[cron] Erro ao ativar splits de afiliado:', err)
    affiliateSplits = { error: err instanceof Error ? err.message : String(err) }
  }

  return res.status(200).json({ ok: true, notifications, affiliateSplits })
}
