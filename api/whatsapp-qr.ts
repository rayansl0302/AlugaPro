import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  const BASE_URL = (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
  const API_KEY  = process.env.EVOLUTION_API_KEY  ?? ''
  const INSTANCE = process.env.EVOLUTION_INSTANCE ?? 'alugapro'

  try {
    if (!BASE_URL || !API_KEY) {
      return res.status(200).json({ configured: false })
    }

    // Verifica disponibilidade do fetch (Node 18+)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalFetch = (globalThis as any).fetch as typeof fetch | undefined
    if (!globalFetch) {
      return res.status(200).json({
        configured: true, connected: false,
        error: 'fetch não disponível neste runtime. Configure Node 18 no Vercel.',
      })
    }

    const headers: Record<string, string> = { apikey: API_KEY }

    // 1. Estado da conexão (timeout 5s)
    let stateStatus = 0
    let stateText = ''
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 5_000)
      const r = await globalFetch(`${BASE_URL}/instance/connectionState/${INSTANCE}`, {
        headers, signal: ctrl.signal,
      })
      clearTimeout(t)
      stateStatus = r.status
      stateText = await r.text()
    } catch (e) {
      const msg = String(e)
      return res.status(200).json({
        configured: true, connected: false,
        error: msg.toLowerCase().includes('abort')
          ? 'Railway está dormindo — tente novamente em 30s.'
          : `Falha ao conectar: ${msg}`,
      })
    }

    if (stateStatus >= 400) {
      return res.status(200).json({
        configured: true, connected: false,
        error: `Evolution API retornou HTTP ${stateStatus}: ${stateText.slice(0, 120)}`,
      })
    }

    let stateData: Record<string, unknown> = {}
    try { stateData = JSON.parse(stateText) } catch { /* ignora */ }

    const state = String(
      (stateData.instance as Record<string, unknown>)?.state ?? stateData.state ?? 'unknown',
    )

    if (state === 'open') {
      const inst = stateData.instance as Record<string, unknown> | undefined
      const user = inst?.user as Record<string, unknown> | undefined
      return res.status(200).json({
        configured: true, connected: true,
        number: user?.id ?? inst?.profileName,
      })
    }

    // 2. QR code (timeout 5s)
    let qrData: Record<string, unknown> = {}
    try {
      const ctrl2 = new AbortController()
      const t2 = setTimeout(() => ctrl2.abort(), 5_000)
      const r2 = await globalFetch(`${BASE_URL}/instance/connect/${INSTANCE}`, {
        headers, signal: ctrl2.signal,
      })
      clearTimeout(t2)
      if (r2.ok) qrData = await r2.json()
    } catch { /* sem QR, retorna vazio */ }

    const qrcode =
      (qrData.base64 as string | undefined) ??
      ((qrData.qrcode as Record<string, unknown> | undefined)?.base64 as string | undefined)

    return res.status(200).json({ configured: true, connected: false, state, qrcode })

  } catch (err) {
    return res.status(200).json({
      configured: true, connected: false,
      error: `Erro inesperado: ${String(err)}`,
    })
  }
}
