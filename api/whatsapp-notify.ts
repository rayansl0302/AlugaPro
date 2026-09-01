/**
 * POST /api/whatsapp-notify
 *
 * Envia uma notificação de cobrança/inadimplência via WhatsApp (Evolution API),
 * e-mail (Resend) ou push (FCM) e registra o trigger enviado na cobrança.
 * Endpoint único pros três canais (Vercel Hobby limita a 12 Serverless
 * Functions — juntar evita estourar o limite em vez de criar endpoints novos).
 *
 * Body: { channel?: 'whatsapp' | 'email' | 'push', phone?, to?, subject?, message?/html?, tenantId?, chargeId?, companyId?, trigger? }
 * Header: x-internal-key = INTERNAL_API_KEY (obrigatório) OU Bearer <Firebase ID token> de gestor/admin
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from './_firebase.js'
import { sendWhatsAppMessage, evolutionConfigured } from './_evolution.js'
import { sendEmail } from './_resend.js'
import { sendPush, getTokensForTenant } from './_push.js'
import { requireGestor, errorResponse, type AuthedUser } from './_auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // SEGURANÇA (fail-closed): ou é uma chamada servidor→servidor com a chave
  // interna (que NUNCA vai ao browser), ou é um gestor/admin autenticado via
  // Firebase ID token. Sem nenhum dos dois → 401.
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

  const {
    channel, phone, message, to, subject, html, tenantId, chargeId, trigger,
  } = req.body as {
    channel?: 'whatsapp' | 'email' | 'push'
    phone?: string
    message?: string
    to?: string
    subject?: string
    html?: string
    tenantId?: string
    chargeId?: string
    companyId?: string
    trigger?: string
  }

  if (channel === 'email') {
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'to, subject e html são obrigatórios' })
    }
    const result = await sendEmail(to, subject, html)
    if (!result.ok) {
      console.error('[whatsapp-notify] Falha no envio de e-mail:', result.error)
      return res.status(502).json({ error: result.error })
    }
  } else if (channel === 'push') {
    if (!tenantId || !subject || !message) {
      return res.status(400).json({ error: 'tenantId, subject e message são obrigatórios' })
    }
    const tokens = await getTokensForTenant(tenantId)
    const result = await sendPush(tokens, subject, message)
    if (!result.ok) {
      console.error('[whatsapp-notify] Falha no envio de push:', result.error)
      return res.status(502).json({ error: result.error })
    }
  } else {
    if (!phone || !message) {
      return res.status(400).json({ error: 'phone e message são obrigatórios' })
    }
    if (!evolutionConfigured()) {
      return res.status(503).json({ error: 'Evolution API não configurada' })
    }
    const result = await sendWhatsAppMessage(phone, message)
    if (!result.ok) {
      console.error('[whatsapp-notify] Falha no envio:', result.error)
      return res.status(502).json({ error: result.error })
    }
  }

  // Registra o trigger enviado na cobrança (evita duplicados).
  // Escopo: gestor só toca cobrança da PRÓPRIA empresa (admin/interno passam).
  if (chargeId && trigger) {
    try {
      const ref = adminDb.collection('charges').doc(chargeId)
      if (caller && !caller.isAdmin) {
        const snap = await ref.get()
        if (!snap.exists || snap.get('companyId') !== caller.companyId) {
          console.warn('[whatsapp-notify] charge fora da empresa do chamador — update ignorado')
          return res.status(200).json({ ok: true, chargeUpdated: false })
        }
      }
      await ref.update({
        notificationsSent: FieldValue.arrayUnion(trigger),
        updatedAt: FieldValue.serverTimestamp(),
      })
    } catch (err) {
      console.error('[whatsapp-notify] Erro ao atualizar charge:', err)
      // Não falha a requisição — mensagem já foi enviada
    }
  }

  return res.status(200).json({ ok: true })
}
