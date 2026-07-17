/**
 * GET /api/cron-daily-notifications
 *
 * Cron diário (configurado em vercel.json) — roda às 8h (BRT) = 11h UTC.
 * Faz dois trabalhos independentes nessa mesma execução (pra não passar do
 * limite de 12 serverless functions do plano Hobby da Vercel):
 *
 * 1. Varre cobranças não pagas e envia notificações WhatsApp via Evolution
 *    API conforme a escala de vencimento definida em _notifyLogic.ts.
 * 2. Paga as comissões de afiliado pendentes via transferência PIX
 *    (ver payoutPendingAffiliateCommissions abaixo) — só no dia de payout.
 *
 * Protegido pelo header Authorization: Bearer <CRON_SECRET> (Vercel injeta automaticamente).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb, Timestamp } from './_firebase.js'
import { sendWhatsAppMessage, evolutionConfigured } from './_evolution.js'
import { getTriggerForToday, buildMessage, type ChargeSnapshot } from './_notifyLogic.js'
import { createPixTransfer, type AsaasPixKeyType } from './_asaas.js'

// Dia do mês em que as comissões acumuladas são pagas via PIX
const PAYOUT_DAY_OF_MONTH = 5
// Valor mínimo acumulado pra disparar a transferência (abaixo disso, acumula pro mês seguinte)
const MIN_PAYOUT_VALUE = 20
// Lançamentos presos em "processando" além desse tempo indicam transferência
// disparada sem confirmação gravada — exigem conferência manual no painel Asaas
const STUCK_PROCESSING_MS = 2 * 86_400_000

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

// Resolve o tipo da chave PIX exigido pela API de transferências da Asaas.
// Usa o tipo escolhido pelo afiliado no painel; pra cadastros antigos (sem
// tipo), infere com segurança — o caso ambíguo (11 dígitos = CPF ou celular)
// é resolvido comparando com o CPF do próprio cadastro.
function resolvePixKeyType(
  pixKey: string,
  storedType: string | undefined,
  storedCpf: string | undefined,
): AsaasPixKeyType | null {
  const typeMap: Record<string, AsaasPixKeyType> = {
    cpf: 'CPF', cnpj: 'CNPJ', email: 'EMAIL', phone: 'PHONE', evp: 'EVP',
  }
  if (storedType && typeMap[storedType]) return typeMap[storedType]

  const key = pixKey.trim()
  if (key.includes('@')) return 'EMAIL'
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return 'EVP'
  const digits = key.replace(/\D/g, '')
  if (digits.length === 14) return 'CNPJ'
  if (digits.length === 11) {
    if (storedCpf && storedCpf.replace(/\D/g, '') === digits) return 'CPF'
    if (key.startsWith('+') || key.includes('(')) return 'PHONE'
    return null // ambíguo — não arriscar transferência pra chave errada
  }
  if (digits.length === 10 || digits.length === 13) return 'PHONE'
  return null
}

// Paga via transferência PIX as comissões pendentes acumuladas no ledger
// (lançadas pelo webhook a cada mensalidade paga de empresa indicada).
// Roda só no dia PAYOUT_DAY_OF_MONTH e só paga afiliados com saldo >= mínimo.
// Fluxo por afiliado: marca lançamentos como "processando" → transfere →
// marca "pago". Se a transferência falhar, volta pra "pendente" com o erro
// gravado (tenta de novo no próximo ciclo). Lançamentos presos em
// "processando" nunca são repagos automaticamente — são alertados pra
// conferência manual, pois a transferência pode ter saído sem confirmação.
async function payoutPendingAffiliateCommissions() {
  // Alerta de lançamentos travados (todo dia, não só no dia de payout)
  const processingSnap = await adminDb.collection('affiliateCommissions').where('status', '==', 'processando').get()
  for (const d of processingSnap.docs) {
    const updatedAt = (d.data().updatedAt as { toMillis(): number } | undefined)?.toMillis() ?? 0
    if (Date.now() - updatedAt > STUCK_PROCESSING_MS) {
      console.error(`[cron] ATENÇÃO: comissão ${d.id} presa em "processando" — conferir manualmente no painel Asaas se a transferência saiu`)
    }
  }

  const today = new Date()
  if (today.getUTCDate() !== PAYOUT_DAY_OF_MONTH) {
    return { skipped: 'not_payout_day', stuckProcessing: processingSnap.size }
  }

  const pendingSnap = await adminDb.collection('affiliateCommissions').where('status', '==', 'pendente').get()

  const byAffiliate = new Map<string, typeof pendingSnap.docs>()
  for (const d of pendingSnap.docs) {
    const uid = d.data().affiliateUserId as string
    if (!byAffiliate.has(uid)) byAffiliate.set(uid, [])
    byAffiliate.get(uid)!.push(d)
  }

  let paid = 0
  let belowMinimum = 0
  let missingPixKey = 0
  let failed = 0

  for (const [affiliateUserId, docs] of byAffiliate) {
    const total = Math.round(docs.reduce((sum, d) => sum + (d.data().commissionValue as number), 0) * 100) / 100
    if (total < MIN_PAYOUT_VALUE) { belowMinimum++; continue }

    const userSnap = await adminDb.doc(`users/${affiliateUserId}`).get()
    const userData = userSnap.data() as { pixKey?: string; pixKeyType?: string; cpf?: string; name?: string } | undefined
    const pixKey = userData?.pixKey?.trim()
    const pixKeyType = pixKey ? resolvePixKeyType(pixKey, userData?.pixKeyType, userData?.cpf) : null
    if (!pixKey || !pixKeyType) {
      console.warn(`[cron] afiliado ${affiliateUserId} com R$ ${total.toFixed(2)} a receber mas sem chave PIX utilizável — pulando`)
      missingPixKey++
      continue
    }

    const monthLabel = today.toISOString().slice(0, 7)
    try {
      // 1) Reserva os lançamentos antes de transferir — se o processo morrer
      // entre a transferência e a confirmação, nada é repago no próximo ciclo
      const reserveBatch = adminDb.batch()
      for (const d of docs) reserveBatch.update(d.ref, { status: 'processando', updatedAt: Timestamp.now() })
      await reserveBatch.commit()

      // 2) Transferência PIX
      const transfer = await createPixTransfer({
        value: total,
        pixAddressKey: pixKey,
        pixAddressKeyType: pixKeyType,
        description: `Comissão programa de afiliados AlugaPro (${monthLabel})`,
      })

      // 3) Confirma
      const confirmBatch = adminDb.batch()
      for (const d of docs) {
        confirmBatch.update(d.ref, {
          status: 'pago',
          transferId: transfer.id,
          paidAt: Timestamp.now(),
          error: FieldValue.delete(),
          updatedAt: Timestamp.now(),
        })
      }
      await confirmBatch.commit()
      console.log(`[cron] ✓ payout de R$ ${total.toFixed(2)} → ${userData?.name ?? affiliateUserId} (transfer ${transfer.id})`)
      paid++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[cron] ✗ payout do afiliado ${affiliateUserId} falhou:`, message)
      // Devolve pra "pendente" com o erro — será retentado no próximo ciclo
      try {
        const revertBatch = adminDb.batch()
        for (const d of docs) revertBatch.update(d.ref, { status: 'pendente', error: message, updatedAt: Timestamp.now() })
        await revertBatch.commit()
      } catch (revertErr) {
        console.error(`[cron] ATENÇÃO: falha ao reverter lançamentos de ${affiliateUserId} pra pendente:`, revertErr)
      }
      failed++
    }
  }

  return { paid, belowMinimum, missingPixKey, failed, pendingTotal: pendingSnap.size }
}

// Varre cobranças pendentes/atrasadas e envia notificações WhatsApp.
// Independente do payout de comissões de afiliado — uma coisa não deve
// bloquear a outra (ex.: Evolution API fora do ar não pode impedir o cron
// de pagar comissões vencidas).
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

  let affiliatePayouts: unknown
  try {
    affiliatePayouts = await payoutPendingAffiliateCommissions()
    console.log('[cron] Concluído (payout de comissões):', affiliatePayouts)
  } catch (err) {
    console.error('[cron] Erro no payout de comissões:', err)
    affiliatePayouts = { error: err instanceof Error ? err.message : String(err) }
  }

  return res.status(200).json({ ok: true, notifications, affiliatePayouts })
}
