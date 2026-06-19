/**
 * POST /api/whatsapp-webhook?key=WEBHOOK_SECRET
 *
 * Recebe eventos da Evolution API (messages.upsert) e grava as mensagens
 * recebidas de clientes/prospects no inbox comercial (/sistema).
 *
 * Configurar na Evolution API: POST /webhook/set/{instance}
 * Body: { "url": "https://seuapp.vercel.app/api/whatsapp-webhook?key=...", "webhook_by_events": false, "events": ["MESSAGES_UPSERT"] }
 *
 * Mensagens enviadas por nós (fromMe: true) e de grupos (@g.us) são ignoradas —
 * envios já são registrados em src/services/salesChat.ts no momento do disparo.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminDb, Timestamp } from './_firebase'

const SALES_COMPANY_ID = process.env.SALES_COMPANY_ID ?? ''
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? ''

interface EvolutionMessageData {
  key?: { remoteJid?: string; fromMe?: boolean }
  pushName?: string
  message?: {
    conversation?: string
    extendedTextMessage?: { text?: string }
    imageMessage?: { caption?: string }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true })
  }

  if (WEBHOOK_SECRET && req.query.key !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!SALES_COMPANY_ID) {
    return res.status(200).json({ ok: true, skipped: 'SALES_COMPANY_ID não configurada' })
  }

  try {
    const body = req.body as { event?: string; data?: EvolutionMessageData }
    if (body?.event !== 'messages.upsert') {
      return res.status(200).json({ ok: true, skipped: 'not a message event' })
    }

    const data = body.data
    const remoteJid = data?.key?.remoteJid ?? ''
    const fromMe = data?.key?.fromMe ?? false

    if (fromMe || !remoteJid || remoteJid.endsWith('@g.us')) {
      return res.status(200).json({ ok: true, skipped: true })
    }

    const text =
      data?.message?.conversation ??
      data?.message?.extendedTextMessage?.text ??
      data?.message?.imageMessage?.caption ??
      ''

    if (!text) {
      return res.status(200).json({ ok: true, skipped: 'no text content' })
    }

    const phone = remoteJid.split('@')[0]
    const pushName = data?.pushName ?? ''
    const now = Timestamp.now()

    const conversations = adminDb.collection('salesConversations')
    const existing = await conversations
      .where('companyId', '==', SALES_COMPANY_ID)
      .where('phone', '==', phone)
      .limit(1)
      .get()

    let conversationId: string
    if (!existing.empty) {
      conversationId = existing.docs[0].id
    } else {
      const created = await conversations.add({
        companyId: SALES_COMPANY_ID,
        phone,
        contactName: pushName,
        lastMessageText: text,
        lastMessageAt: now,
        lastMessageDirection: 'inbound',
        unread: true,
        createdBy: 'cliente',
        createdByName: pushName || phone,
        createdAt: now,
      })
      conversationId = created.id
    }

    await conversations.doc(conversationId).collection('messages').add({
      direction: 'inbound',
      text,
      createdAt: now,
    })

    await conversations.doc(conversationId).update({
      lastMessageText: text,
      lastMessageAt: now,
      lastMessageDirection: 'inbound',
      unread: true,
      ...(pushName ? { contactName: pushName } : {}),
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[whatsapp-webhook] erro:', err)
    return res.status(200).json({ ok: false, error: String(err) })
  }
}
