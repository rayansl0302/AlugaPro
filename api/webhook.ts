import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleWebhook } from './_webhookHandler.js'

// Webhook para ambiente de PRODUÇÃO — configure no MP: Modo de produção → URL /api/webhook
export default function handler(req: VercelRequest, res: VercelResponse) {
  const token = process.env.MP_ACCESS_TOKEN_PROD!
  const secret = process.env.MP_WEBHOOK_SECRET_PROD!
  return handleWebhook(req, res, token, secret, 'prod')
}
