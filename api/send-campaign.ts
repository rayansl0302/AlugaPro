/**
 * POST /api/send-campaign
 *
 * Dispara uma campanha de e-mail marketing via Resend. Admin-only.
 *
 * Header: Authorization: Bearer <Firebase ID token de um admin>
 * Body: {
 *   subject: string,
 *   html: string,              // com tokens {{name}} e {{unsubscribeUrl}}
 *   fromName?: string,         // padrão "AlugaPro"
 *   replyTo?: string,
 *   recipients: { email: string; name?: string }[],
 * }
 *
 * Personaliza o HTML por destinatário, pula quem descadastrou (emailContacts
 * optedOut) e envia em lotes de 100 (limite do batch da Resend). Preserva
 * privacidade: o link de descadastro usa um id opaco (sha256 do e-mail), nunca
 * o e-mail em texto na URL.
 *
 * Requer env RESEND_API_KEY (e opcional RESEND_FROM). Sem a key, responde 503.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHash } from 'crypto'
import { adminAuth, adminDb } from './_firebase.js'

const ADMIN_EMAILS = ['rayansl0302@gmail.com', 'rayansl.dev@gmail.com']
const UNSUB_BASE = 'https://alugapro.tech/descadastrar?c='
const BATCH_SIZE = 100

interface Recipient {
  email: string
  name?: string
}

function contactId(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

function personalize(html: string, name: string, unsubscribeUrl: string): string {
  return html
    .split('{{name}}').join(name || 'tudo bem')
    .split('{{unsubscribeUrl}}').join(unsubscribeUrl)
}

interface ResendEmail {
  from: string
  to: string[]
  subject: string
  html: string
  reply_to?: string
  headers?: Record<string, string>
}

async function sendResendBatch(apiKey: string, emails: ResendEmail[]): Promise<{ ok: number; fail: number }> {
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(emails),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('[send-campaign] Resend batch falhou:', res.status, detail)
    return { ok: 0, fail: emails.length }
  }
  return { ok: emails.length, fail: 0 }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Auth admin ──────────────────────────────────────────────────────────────
  const authHeader = req.headers.authorization ?? ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!idToken) return res.status(401).json({ error: 'Token ausente' })

  let email: string | undefined
  try {
    const decoded = await adminAuth.verifyIdToken(idToken)
    email = decoded.email?.toLowerCase()
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ error: 'Apenas administradores podem disparar campanhas' })
  }

  // ── Provedor configurado? ─────────────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Resend não configurado (defina RESEND_API_KEY no ambiente).' })
  }
  const from = `${(req.body?.fromName as string)?.trim() || 'AlugaPro'} <${process.env.RESEND_FROM || 'nao-responder@alugapro.tech'}>`

  const { subject, html, replyTo, recipients } = (req.body ?? {}) as {
    subject?: string
    html?: string
    replyTo?: string
    recipients?: Recipient[]
  }

  if (!subject || !html || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'subject, html e recipients são obrigatórios' })
  }

  try {
    // Descadastrados — uma leitura só, filtra todos.
    const optOutSnap = await adminDb.collection('emailContacts').where('optedOut', '==', true).get()
    const optedOut = new Set(optOutSnap.docs.map((d) => d.id))

    // De-dup por e-mail + remove opt-outs + monta os e-mails personalizados.
    const seen = new Set<string>()
    const emails: ResendEmail[] = []
    let skipped = 0
    for (const r of recipients) {
      const addr = (r.email ?? '').trim().toLowerCase()
      if (!addr || !addr.includes('@') || seen.has(addr)) { skipped++; continue }
      seen.add(addr)
      const cid = contactId(addr)
      if (optedOut.has(cid)) { skipped++; continue }
      const unsubscribeUrl = `${UNSUB_BASE}${cid}`
      emails.push({
        from,
        to: [addr],
        subject,
        html: personalize(html, r.name ?? '', unsubscribeUrl),
        ...(replyTo ? { reply_to: replyTo } : {}),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })
    }

    if (emails.length === 0) {
      return res.status(200).json({ sent: 0, failed: 0, skipped, message: 'Nenhum destinatário elegível.' })
    }

    let sent = 0
    let failed = 0
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const chunk = emails.slice(i, i + BATCH_SIZE)
      const r = await sendResendBatch(apiKey, chunk)
      sent += r.ok
      failed += r.fail
    }

    return res.status(200).json({ sent, failed, skipped })
  } catch (err) {
    console.error('[send-campaign] erro:', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao enviar campanha' })
  }
}
