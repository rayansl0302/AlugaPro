/**
 * GET /api/cron-daily-notifications
 *
 * Cron diário (configurado em vercel.json) — roda às 8h (BRT) = 11h UTC.
 * Varre todas as cobranças não pagas e envia notificações WhatsApp via Evolution API
 * conforme a escala de vencimento definida em _notifyLogic.ts.
 *
 * Protegido pelo header Authorization: Bearer <CRON_SECRET> (Vercel injeta automaticamente).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from './_firebase.js'
import { sendWhatsAppMessage, evolutionConfigured } from './_evolution.js'
import { getTriggerForToday, buildMessage, type ChargeSnapshot } from './_notifyLogic.js'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel injeta Authorization: Bearer <CRON_SECRET> — validar
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  if (!evolutionConfigured()) {
    console.log('[cron] Evolution API não configurada — pulando envios.')
    return res.status(200).json({ ok: true, skipped: 'evolution_not_configured' })
  }

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
    return res.status(500).json({ error: 'Firestore query failed' })
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
  console.log('[cron] Concluído:', summary)
  return res.status(200).json({ ok: true, ...summary })
}
