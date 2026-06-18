/**
 * GET /api/whatsapp-qr
 * Retorna o estado da conexão WhatsApp + QR code se desconectado.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_URL = (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
const API_KEY  = process.env.EVOLUTION_API_KEY  ?? ''
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? 'alugapro'

async function fetchWithTimeout(url: string, options: RequestInit, ms = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (!BASE_URL || !API_KEY) {
    return res.status(200).json({ configured: false })
  }

  const headers = { apikey: API_KEY }

  try {
    // 1. Verifica estado da conexão
    const stateRes = await fetchWithTimeout(
      `${BASE_URL}/instance/connectionState/${INSTANCE}`,
      { headers },
    )

    if (!stateRes.ok) {
      const body = await stateRes.text().catch(() => '')
      return res.status(200).json({
        configured: true,
        connected: false,
        error: `Evolution API retornou ${stateRes.status}${body ? ': ' + body.slice(0, 120) : ''}`,
      })
    }

    const stateData = await stateRes.json()
    const state: string = stateData.instance?.state ?? stateData.state ?? 'unknown'

    if (state === 'open') {
      return res.status(200).json({
        configured: true,
        connected: true,
        number: stateData.instance?.user?.id ?? stateData.instance?.profileName,
      })
    }

    // 2. Busca QR code
    const qrRes = await fetchWithTimeout(
      `${BASE_URL}/instance/connect/${INSTANCE}`,
      { headers },
    )
    const qrData = qrRes.ok ? await qrRes.json() : {}

    return res.status(200).json({
      configured: true,
      connected: false,
      state,
      qrcode: qrData.base64 ?? qrData.qrcode?.base64,
    })
  } catch (err) {
    const isTimeout = String(err).includes('abort') || String(err).includes('AbortError')
    return res.status(200).json({
      configured: true,
      connected: false,
      error: isTimeout
        ? 'Railway demorou para responder (serviço pode estar dormindo). Tente novamente em 30s.'
        : String(err),
    })
  }
}
