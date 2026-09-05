// Upload direto pro Cloudflare R2 via URL assinada (o navegador nunca vê as
// credenciais do R2 — pede a URL assinada no backend e faz o PUT direto).
export async function uploadToR2(file: File, path: string): Promise<string> {
  const contentType = file.type || 'application/octet-stream'

  const presignRes = await fetch('/api/r2-presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, contentType }),
  })
  if (!presignRes.ok) {
    const detail = await presignRes.text().catch(() => '')
    throw new Error(`Falha ao preparar upload (${presignRes.status}): ${detail}`)
  }
  const { uploadUrl, publicUrl } = (await presignRes.json()) as { uploadUrl: string; publicUrl: string }

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!putRes.ok) {
    throw new Error(`Falha no upload para o R2 (${putRes.status})`)
  }

  return publicUrl
}
