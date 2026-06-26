/**
 * Local dev API server — serves the same handlers as Vercel serverless functions.
 * Run with: npm run dev:api  (in a second terminal alongside npm run dev)
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import http from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'

const PORT = 3001

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

// Minimal shim so our handlers get the same req/res shape as Vercel
function makeVercelReq(req: IncomingMessage, body: unknown) {
  return Object.assign(req, { body })
}

function makeVercelRes(res: ServerResponse) {
  const vRes = {
    status(code: number) { res.statusCode = code; return vRes },
    json(data: unknown) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data))
      return vRes
    },
    send(data: string) { res.end(data); return vRes },
    setHeader: res.setHeader.bind(res),
  }
  return vRes
}

const server = http.createServer(async (req, res) => {
  // CORS for local Vite dev server
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const url = req.url ?? ''
  const bodyText = await readBody(req)
  let body: unknown = {}
  try { body = JSON.parse(bodyText) } catch { /* not JSON */ }

  const vReq = makeVercelReq(req, body)
  const vRes = makeVercelRes(res)

  try {
    if (url.startsWith('/api/checkout')) {
      const { default: handler } = await import('./api/checkout.js')
      return handler(vReq as never, vRes as never)
    }
    if (url.startsWith('/api/verify-asaas-subscription')) {
      const { default: handler } = await import('./api/verify-asaas-subscription.js')
      return handler(vReq as never, vRes as never)
    }
    if (url.startsWith('/api/asaas-webhook')) {
      const { default: handler } = await import('./api/asaas-webhook.js')
      return handler(vReq as never, vRes as never)
    }
    if (url.startsWith('/api/create-affiliate-profile')) {
      const { default: handler } = await import('./api/create-affiliate-profile.js')
      return handler(vReq as never, vRes as never)
    }
    if (url.startsWith('/api/cron-daily-notifications')) {
      const { default: handler } = await import('./api/cron-daily-notifications.js')
      return handler(vReq as never, vRes as never)
    }
    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Not found' }))
  } catch (err) {
    console.error('[dev-api]', err)
    res.writeHead(500)
    res.end(JSON.stringify({ error: String(err) }))
  }
})

server.listen(PORT, () => {
  console.log(`[dev-api] API server running at http://localhost:${PORT}`)
  console.log('[dev-api] Proxying: /api/checkout  /api/asaas-webhook  /api/verify-asaas-subscription  /api/create-affiliate-profile')
})
