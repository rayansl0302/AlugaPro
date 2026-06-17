/**
 * Cliente da Evolution API — wrapper Baileys para envio de WhatsApp individual.
 * Configurar: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE nas envs.
 */

const BASE_URL = (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
const API_KEY  = process.env.EVOLUTION_API_KEY  ?? ''
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? 'alugapro'

export function evolutionConfigured(): boolean {
  return Boolean(BASE_URL && API_KEY)
}

export async function sendWhatsAppMessage(
  phone: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!evolutionConfigured()) {
    return { ok: false, error: 'Evolution API não configurada (EVOLUTION_API_URL / EVOLUTION_API_KEY)' }
  }

  // Normaliza para formato internacional 55 + DDD + número
  const number = '55' + phone.replace(/\D/g, '')

  try {
    const res = await fetch(`${BASE_URL}/message/sendText/${INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
      },
      body: JSON.stringify({ number, text }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status}: ${body}` }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
