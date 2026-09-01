/**
 * POST /api/send-charge-email
 *
 * Envia uma notificação de cobrança/inadimplência por e-mail via Resend pro
 * inquilino e registra o trigger enviado na cobrança. Espelha /api/whatsapp-notify
 * (mesmo modelo de auth e de registro de notificationsSent), trocando Evolution
 * API por Resend.
 *
 * Body: { to, subject, html, chargeId?, companyId?, trigger? }
 * Header: x-internal-key = INTERNAL_API_KEY (obrigatório) OU Bearer <Firebase ID token> de gestor/admin
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from './_firebase.js'
import { requireGestor, errorResponse, type AuthedUser } from './_auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const internalKey = process.env.INTERNAL_API_KEY
  const isInternal = !!internalKey && req.headers['x-internal-key'] === internalKey
  let caller: AuthedUser | null = null
  if (!isInternal) {
    try {
      caller = await requireGestor(req)
    } catch (err) {
      const { status, message } = errorResponse(err)
      return res.status(status).json({ error: message })
    }
  }

  const { to, subject, html, chargeId, trigger } = req.body as {
    to: string
    subject: string
    html: string
    chargeId?: string
    companyId?: string
    trigger?: string
  }

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'to, subject e html são obrigatórios' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Resend não configurado (defina RESEND_API_KEY no ambiente).' })
  }
  const from = `AlugaPro <${process.env.RESEND_FROM || 'contato@alugapro.tech'}>`

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })

  if (!resendRes.ok) {
    const detail = await resendRes.text().catch(() => '')
    console.error('[send-charge-email] Falha no envio:', resendRes.status, detail)
    return res.status(502).json({ error: 'Falha ao enviar e-mail' })
  }

  // Registra o trigger enviado na cobrança (evita duplicados).
  // Escopo: gestor só toca cobrança da PRÓPRIA empresa (admin/interno passam).
  if (chargeId && trigger) {
    try {
      const ref = adminDb.collection('charges').doc(chargeId)
      if (caller && !caller.isAdmin) {
        const snap = await ref.get()
        if (!snap.exists || snap.get('companyId') !== caller.companyId) {
          console.warn('[send-charge-email] charge fora da empresa do chamador — update ignorado')
          return res.status(200).json({ ok: true, chargeUpdated: false })
        }
      }
      await ref.update({
        notificationsSent: FieldValue.arrayUnion(trigger),
        updatedAt: FieldValue.serverTimestamp(),
      })
    } catch (err) {
      console.error('[send-charge-email] Erro ao atualizar charge:', err)
      // Não falha a requisição — mensagem já foi enviada
    }
  }

  return res.status(200).json({ ok: true })
}
