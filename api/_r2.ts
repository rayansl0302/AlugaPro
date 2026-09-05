/**
 * Cliente do Cloudflare R2 (storage compatível com S3) — usado pra gerar
 * URLs assinadas de upload. R2 não tem um modo de "upload sem assinatura"
 * como o preset unsigned do Cloudinary, então o navegador pede uma URL
 * assinada aqui (credenciais nunca saem do servidor) e faz o PUT direto
 * pro R2 depois — sem passar o arquivo pela function do Vercel (que tem
 * limite de tamanho de payload bem menor que 10MB).
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? ''
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? ''
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? ''
const BUCKET_NAME = process.env.R2_BUCKET_NAME ?? ''
// URL pública de leitura do bucket — domínio pub-*.r2.dev (ativado em
// Configurações do bucket > Acesso Público) ou um domínio customizado.
const PUBLIC_URL_BASE = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '')

export function r2Configured(): boolean {
  return !!(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET_NAME && PUBLIC_URL_BASE)
}

let client: S3Client | null = null
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
    })
  }
  return client
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, ContentType: contentType })
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: 300 })
  const publicUrl = `${PUBLIC_URL_BASE}/${key}`
  return { uploadUrl, publicUrl }
}
