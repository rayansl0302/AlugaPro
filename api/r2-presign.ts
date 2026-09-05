/**
 * POST /api/r2-presign
 *
 * Emite uma URL assinada de upload direto pro Cloudflare R2 (substitui o
 * preset "unsigned" do Cloudinary — R2 exige assinatura, então o navegador
 * pede a URL aqui e faz o PUT direto pro R2 na sequência).
 *
 * Sem exigência de login: alguns fluxos de upload (assinatura de contrato de
 * venda por link — comprador/vendedor/testemunha sem conta no app) já
 * funcionam hoje sem sessão Firebase, igual o preset unsigned do Cloudinary
 * — mantém a mesma abertura, só restringindo pasta e tipo de arquivo.
 *
 * Body: { path, contentType }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { r2Configured, getPresignedUploadUrl } from './_r2.js'

const ALLOWED_PREFIXES = ['companies/', 'sale-contracts/', 'affiliates/']
const ALLOWED_CONTENT_TYPES = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/

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
  if (path.includes('..') || !ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    return res.status(400).json({ error: 'path inválido' })
  }
  if (!ALLOWED_CONTENT_TYPES.test(contentType)) {
    return res.status(400).json({ error: 'contentType não permitido' })
  }

  try {
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(path, contentType)
    return res.status(200).json({ uploadUrl, publicUrl })
  } catch (err) {
    console.error('[r2-presign] Falha ao gerar URL assinada:', err)
    return res.status(500).json({ error: 'Falha ao gerar URL de upload' })
  }
}
