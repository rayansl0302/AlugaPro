/**
 * POST /api/whatsapp-notify
 *
 * Envia uma notificação WhatsApp via Evolution API para um inquilino específico
 * e registra o trigger enviado na cobrança.
 *
 * Body: { phone, message, chargeId?, companyId?, trigger? }
 * Header: x-internal-key = INTERNAL_API_KEY (obrigatório)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from './_firebase.js'
import { sendWhatsAppMessage, evolutionConfigured } from './_evolution.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Proteção: apenas chamadas internas (cron ou gestor autenticado)
  const internalKey = process.env.INTERNAL_API_KEY
  if (internalKey && req.headers['x-internal-key'] !== internalKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { phone, message, chargeId, companyId, trigger } = req.body as {
    phone: string
    message: string
    chargeId?: string
    companyId?: string
    trigger?: string
  }

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

  // Registra o trigger enviado na cobrança (evita duplicados)
  if (chargeId && trigger) {
    try {
      await adminDb.collection('charges').doc(chargeId).update({
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
