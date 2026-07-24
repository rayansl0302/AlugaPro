/**
 * POST /api/resend-webhook
 *
 * Recebe os eventos do Resend e alimenta o CRM de leads:
 *  - Entrega/engajamento: email.opened, email.clicked, email.bounced,
 *    email.complained  → incrementa contadores, grava na timeline do lead e
 *    reclassifica a "temperatura" (abriu→morno, clicou→quente, bounce→inválido).
 *  - Inbound (respostas): quando o lead responde, grava um evento "replied" e
 *    marca o lead como quente.
 *
 * Só toca em quem já é lead (marketingLeads/{email}); ignora gestores/inquilinos.
 *
 * Segurança: valida a assinatura Svix (mesma que o Resend usa). Requer a env
 * RESEND_WEBHOOK_SECRET (Resend > Webhooks > Signing Secret, formato whsec_...).
 * Sem ela, responde 503 e o Resend re-tenta depois — nada é processado sem
 * verificação.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac, timingSafeEqual } from 'crypto'
import { adminDb, Timestamp } from './_firebase.js'

// Precisamos do corpo cru pra validar a assinatura — desliga o parser.
export const config = { api: { bodyParser: false } }

const LEADS_COL = 'marketingLeads'

type LeadStatus = 'novo' | 'quente' | 'morno' | 'frio' | 'invalido'

async function readRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks).toString('utf8')
}

/** Verificação de assinatura no padrão Svix (headers svix-id/timestamp/signature). */
function verifySignature(secret: string, headers: VercelRequest['headers'], body: string): boolean {
  const h = (k: string) => (headers[`svix-${k}`] ?? headers[`webhook-${k}`]) as string | undefined
  const id = h('id')
  const timestamp = h('timestamp')
  const signature = h('signature')
  if (!id || !timestamp || !signature) return false

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const signedContent = `${id}.${timestamp}.${body}`
  const expected = createHmac('sha256', secretBytes).update(signedContent).digest('base64')

  // O header traz uma ou mais assinaturas: "v1,<base64> v1,<base64>".
  return signature.split(' ').some((part) => {
    const sig = part.includes(',') ? part.split(',')[1] : part
    try {
      const a = Buffer.from(sig)
      const b = Buffer.from(expected)
      return a.length === b.length && timingSafeEqual(a, b)
    } catch {
      return false
    }
  })
}

function normalizeEmail(v?: string): string {
  return (v ?? '').trim().toLowerCase()
}

/** Extrai o e-mail de "Nome <email@x>" ou de uma string simples. */
function extractEmail(raw?: string): string {
  if (!raw) return ''
  const m = raw.match(/<([^>]+)>/)
  return normalizeEmail(m ? m[1] : raw)
}

function firstRecipient(data: Record<string, unknown>): string[] {
  const to = data.to
  if (Array.isArray(to)) return to.map((t) => extractEmail(String(t))).filter(Boolean)
  if (typeof to === 'string') return [extractEmail(to)].filter(Boolean)
  return []
}

/** Aplica um evento a um lead existente: contadores + timeline + reclassificação. */
async function applyToLead(
  email: string,
  update: {
    activityType: string
    subject?: string
    text?: string
    counter?: 'openCount' | 'clickCount' | 'replyCount'
    lastField?: 'lastOpenedAt' | 'lastClickedAt' | 'lastRepliedAt'
    newStatusIf?: (current: LeadStatus) => LeadStatus | null
  },
): Promise<void> {
  const ref = adminDb.collection(LEADS_COL).doc(email)
  const snap = await ref.get()
  if (!snap.exists) return // não é um lead — ignora (ex.: gestor/inquilino)

  const current = (snap.get('status') as LeadStatus) ?? 'novo'
  const patch: Record<string, unknown> = {}
  if (update.counter) patch[update.counter] = (snap.get(update.counter) ?? 0) + 1
  if (update.lastField) patch[update.lastField] = Timestamp.now()
  const next = update.newStatusIf?.(current)
  if (next && next !== current) patch.status = next

  if (Object.keys(patch).length > 0) await ref.set(patch, { merge: true })

  await ref.collection('activity').add({
    type: update.activityType,
    ...(update.subject ? { subject: update.subject } : {}),
    ...(update.text ? { text: update.text } : {}),
    at: Timestamp.now(),
  })
}

// Só "esquenta" (nunca esfria um lead já quente por causa de uma abertura).
const warmIfCold = (c: LeadStatus): LeadStatus | null => (c === 'novo' || c === 'frio' ? 'morno' : null)
const alwaysHot = (): LeadStatus => 'quente'
const markInvalid = (): LeadStatus => 'invalido'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET ausente — evento recusado (503).')
    return res.status(503).json({ error: 'Webhook não configurado' })
  }

  const raw = await readRawBody(req)
  // Aceita tanto o prefixo svix-* quanto webhook-* (padrão Standard Webhooks).
  if (!verifySignature(secret.trim(), req.headers, raw)) {
    const { createHash } = await import('crypto')
    const h = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 8)
    return res.status(401).json({
      error: 'Assinatura inválida',
      _env: {
        len: secret.length,
        lenTrim: secret.trim().length,
        hashRaw: h(secret),
        hashTrim: h(secret.trim()),
        startsWhsec: secret.trim().startsWith('whsec_'),
      },
    })
  }

  let payload: { type?: string; data?: Record<string, unknown> }
  try {
    payload = JSON.parse(raw)
  } catch {
    return res.status(400).json({ error: 'JSON inválido' })
  }

  const type = payload.type ?? ''
  const data = payload.data ?? {}
  const subject = typeof data.subject === 'string' ? data.subject : undefined

  try {
    // ── Respostas (inbound) ──────────────────────────────────────────────────
    if (type.includes('received') || type.includes('inbound')) {
      const from = extractEmail(typeof data.from === 'string' ? data.from : undefined)
      if (from) {
        await applyToLead(from, {
          activityType: 'replied',
          subject,
          text: typeof data.text === 'string' ? String(data.text).slice(0, 500) : undefined,
          counter: 'replyCount',
          lastField: 'lastRepliedAt',
          newStatusIf: alwaysHot,
        })
      }
      return res.status(200).json({ ok: true })
    }

    // ── Engajamento (por destinatário) ───────────────────────────────────────
    const recipients = firstRecipient(data)
    for (const email of recipients) {
      if (type === 'email.opened') {
        await applyToLead(email, { activityType: 'opened', subject, counter: 'openCount', lastField: 'lastOpenedAt', newStatusIf: warmIfCold })
      } else if (type === 'email.clicked') {
        await applyToLead(email, { activityType: 'clicked', subject, counter: 'clickCount', lastField: 'lastClickedAt', newStatusIf: alwaysHot })
      } else if (type === 'email.bounced') {
        await applyToLead(email, { activityType: 'bounced', subject, newStatusIf: markInvalid })
      } else if (type === 'email.complained') {
        await applyToLead(email, { activityType: 'complained', subject, newStatusIf: markInvalid })
      }
      // email.sent / email.delivered são ignorados (o "enviado" já é gravado no
      // momento do disparo, pelo frontend).
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[resend-webhook] erro ao processar evento:', err)
    return res.status(500).json({ error: 'Erro ao processar evento' })
  }
}
