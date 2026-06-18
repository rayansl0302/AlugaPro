/**
 * GET /api/whatsapp-qr
 * Retorna o estado da conexão WhatsApp + QR code se desconectado.
 * Usa https nativo (sem depender de fetch global) para compatibilidade total.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import https from 'https'
import http from 'http'
import { URL } from 'url'

const BASE_URL = (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
const API_KEY  = process.env.EVOLUTION_API_KEY  ?? ''
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? 'alugapro'

function httpGet(rawUrl: string, headers: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(rawUrl)
    const lib = parsed.protocol === 'https:' ? https : http
    const req = lib.get(rawUrl, { headers }, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
      res.on('error', reject)
    })
    req.setTimeout(5_000, () => {
      req.destroy(new Error('timeout'))
    })
    req.on('error', reject)
  })
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (!BASE_URL || !API_KEY) {
    return res.status(200).json({ configured: false })
  }

  const headers = { apikey: API_KEY }

  try {
    // 1. Verifica estado da conexão
    const stateResp = await httpGet(
      `${BASE_URL}/instance/connectionState/${INSTANCE}`,
      headers,
    )

    if (stateResp.status >= 400) {
      return res.status(200).json({
        configured: true,
        connected: false,
        error: `Evolution API retornou ${stateResp.status}: ${stateResp.body.slice(0, 120)}`,
      })
    }

    const stateData = JSON.parse(stateResp.body)
    const state: string = stateData.instance?.state ?? stateData.state ?? 'unknown'

    if (state === 'open') {
      return res.status(200).json({
        configured: true,
        connected: true,
        number: stateData.instance?.user?.id ?? stateData.instance?.profileName,
      })
    }

    // 2. Busca QR code
    const qrResp = await httpGet(
      `${BASE_URL}/instance/connect/${INSTANCE}`,
      headers,
    )
    const qrData = qrResp.status < 400 ? JSON.parse(qrResp.body) : {}

    return res.status(200).json({
      configured: true,
      connected: false,
      state,
      qrcode: qrData.base64 ?? qrData.qrcode?.base64,
    })
  } catch (err) {
    const msg = String(err)
    return res.status(200).json({
      configured: true,
      connected: false,
      error: msg.includes('timeout')
        ? 'Railway demorou para responder (serviço pode estar dormindo). Tente novamente em 30s.'
        : `Erro ao conectar: ${msg}`,
    })
  }
}
