import emailjs from '@emailjs/browser'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_WITNESS as string | undefined
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined

export function isEmailConfigured(): boolean {
  return Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)
}

interface WitnessInvite {
  toEmail: string
  toName: string
  contractNumber: string
  link: string
  locadorName: string
  locatarioName: string
}

export async function sendWitnessInvite(invite: WitnessInvite): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error(
      'EmailJS não configurado: defina VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_WITNESS e VITE_EMAILJS_PUBLIC_KEY no .env'
    )
  }

  await emailjs.send(
    SERVICE_ID as string,
    TEMPLATE_ID as string,
    {
      to_email: invite.toEmail,
      to_name: invite.toName,
      contract_number: invite.contractNumber,
      sign_link: invite.link,
      locador_name: invite.locadorName,
      locatario_name: invite.locatarioName,
    },
    { publicKey: PUBLIC_KEY as string }
  )
}
