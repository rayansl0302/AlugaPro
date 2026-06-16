import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleWebhook } from './_webhookHandler'

// Webhook para ambiente de TESTE — configure no MP: Modo de teste → URL /api/webhook-test
export default function handler(req: VercelRequest, res: VercelResponse) {
  const token = process.env.MP_ACCESS_TOKEN_TEST!
  const secret = process.env.MP_WEBHOOK_SECRET_TEST!
  return handleWebhook(req, res, token, secret, 'test')
}
