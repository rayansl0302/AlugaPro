/**
 * POST /api/sistema-send
 * Envia uma mensagem avulsa de prospecção via Evolution API (chat comercial /sistema).
 * Header: x-internal-key = INTERNAL_API_KEY
 * Body: { phone, text }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendWhatsAppMessage, evolutionConfigured } from './_evolution'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const internalKey = process.env.INTERNAL_API_KEY
    if (internalKey && req.headers['x-internal-key'] !== internalKey) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!evolutionConfigured()) {
      return res.status(200).json({ ok: false, error: 'Evolution API não configurada' })
    }

    const { phone, text } = (req.body ?? {}) as { phone?: string; text?: string }
    if (!phone || !text) {
      return res.status(400).json({ error: 'phone e text são obrigatórios' })
    }

    const result = await sendWhatsAppMessage(phone, text)
    if (!result.ok) {
      return res.status(200).json({ ok: false, error: result.error })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(200).json({ ok: false, error: `Erro inesperado: ${String(err)}` })
  }
}
