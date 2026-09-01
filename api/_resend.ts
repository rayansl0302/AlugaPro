/**
 * Envio de e-mail via Resend. Compartilhado entre whatsapp-notify.ts (envio
 * manual, canal e-mail) e cron-daily-notifications.ts (envio automático).
 */

export function resendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'Resend não configurado (defina RESEND_API_KEY no ambiente).' }
  const from = `AlugaPro <${process.env.RESEND_FROM || 'contato@alugapro.tech'}>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return { ok: false, error: `Falha ao enviar e-mail (${res.status}): ${detail}` }
  }
  return { ok: true }
}

/** Converte o texto (formatado estilo WhatsApp: *negrito*, \n) em HTML simples pro corpo do e-mail. */
export function textToEmailHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*(.+?)\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>')
}
