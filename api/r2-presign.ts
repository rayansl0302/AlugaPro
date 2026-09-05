/**
 * POST /api/r2-presign
 *
 * Emite uma URL assinada de upload direto pro Cloudflare R2 (substitui o
 * preset "unsigned" do Cloudinary — R2 exige assinatura, então o navegador
 * pede a URL aqui e faz o PUT direto pro R2 na sequência).
 *
 * Autorização por path:
 *  - sale-contracts/signatures/{token}/...  → sem login (assinante externo
 *    de contrato de venda, sem conta no app), mas o token precisa existir
 *    de verdade em saleSignatures/{token} no Firestore.
 *  - companies/{companyId}/...              → requer login; companyId tem
 *    que ser o do próprio usuário (ou admin).
 *  - affiliates/{affiliateId}/...           → requer login; affiliateId
 *    tem que ser o próprio uid (ou admin).
 *  - sale-contracts/{id}/...  (exceto /signatures/) → requer login de
 *    gestor/admin (upload do PDF final pelo gestor).
 *
 * Body: { path, contentType }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { r2Configured, getPresignedUploadUrl } from './_r2.js'
import { adminDb } from './_firebase.js'
import { requireUser, errorResponse } from './_auth.js'

const ALLOWED_CONTENT_TYPES = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/

async function authorizePath(req: VercelRequest, path: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const sigMatch = path.match(/^sale-contracts\/signatures\/([^/]+)\//)
  if (sigMatch) {
    const token = sigMatch[1]
    const snap = await adminDb.collection('saleSignatures').doc(token).get()
    if (!snap.exists) return { ok: false, status: 403, error: 'Link de assinatura inválido ou expirado' }
    return { ok: true }
  }

  let caller
  try {
    caller = await requireUser(req)
  } catch (err) {
    const { status, message } = errorResponse(err)
    return { ok: false, status, error: message }
  }
  if (caller.isAdmin) return { ok: true }

  const companyMatch = path.match(/^companies\/([^/]+)\//)
  if (companyMatch) {
    if (companyMatch[1] !== caller.companyId) return { ok: false, status: 403, error: 'Sem permissão para essa empresa' }
    return { ok: true }
  }

  const affiliateMatch = path.match(/^affiliates\/([^/]+)\//)
  if (affiliateMatch) {
    if (affiliateMatch[1] !== caller.uid) return { ok: false, status: 403, error: 'Sem permissão para esse afiliado' }
    return { ok: true }
  }

  if (path.startsWith('sale-contracts/')) {
    if (caller.role !== 'gestor') return { ok: false, status: 403, error: 'Apenas gestores podem gerar contratos de venda' }
    return { ok: true }
  }

  return { ok: false, status: 400, error: 'path não reconhecido' }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!r2Configured()) {
    return res.status(503).json({ error: 'R2 não configurado (defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL).' })
  }

  const { path, contentType } = req.body as { path?: string; contentType?: string }
  if (!path || !contentType) {
    return res.status(400).json({ error: 'path e contentType são obrigatórios' })
  }
  if (path.includes('..')) {
    return res.status(400).json({ error: 'path inválido' })
  }
  if (!ALLOWED_CONTENT_TYPES.test(contentType)) {
    return res.status(400).json({ error: 'contentType não permitido' })
  }

  const auth = await authorizePath(req, path)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  try {
    // IfNoneMatch: '*' — recusa o PUT se já existir objeto nessa key. Os
    // paths sempre incluem Date.now() (únicos por convenção), isso torna a
    // unicidade uma garantia de verdade em vez de só uma convenção do cliente.
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(path, contentType)
    return res.status(200).json({ uploadUrl, publicUrl })
  } catch (err) {
    console.error('[r2-presign] Falha ao gerar URL assinada:', err)
    return res.status(500).json({ error: 'Falha ao gerar URL de upload' })
  }
}
