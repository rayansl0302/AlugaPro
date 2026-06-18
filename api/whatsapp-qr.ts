/**
 * GET /api/whatsapp-qr
 * Retorna o estado da conexão WhatsApp + QR code se desconectado.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_URL = (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
const API_KEY  = process.env.EVOLUTION_API_KEY  ?? ''
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? 'alugapro'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (!BASE_URL || !API_KEY) {
    return res.status(200).json({ configured: false })
  }

  try {
    // 1. Verifica estado da conexão
    const stateRes = await fetch(`${BASE_URL}/instance/connectionState/${INSTANCE}`, {
      headers: { apikey: API_KEY },
    })
    const stateData = await stateRes.json()

    // Compatível com v1 e v2 da Evolution API
    const state: string = stateData.instance?.state ?? stateData.state ?? 'unknown'

    if (state === 'open') {
      return res.status(200).json({
        configured: true,
        connected: true,
        number: stateData.instance?.user?.id ?? stateData.instance?.profileName,
      })
    }

    // 2. Busca QR code
    const qrRes = await fetch(`${BASE_URL}/instance/connect/${INSTANCE}`, {
      headers: { apikey: API_KEY },
    })
    const qrData = await qrRes.json()

    return res.status(200).json({
      configured: true,
      connected: false,
      state,
      qrcode: qrData.base64 ?? qrData.qrcode?.base64,
    })
  } catch (err) {
    return res.status(500).json({ configured: true, connected: false, error: String(err) })
  }
}
