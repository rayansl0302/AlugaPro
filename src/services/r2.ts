// Upload direto pro Cloudflare R2 via URL assinada (o navegador nunca vê as
// credenciais do R2 — pede a URL assinada no backend e faz o PUT direto).
export async function uploadToR2(file: File, path: string): Promise<string> {
  const contentType = file.type || 'application/octet-stream'

  // Sem sessão (ex: assinante externo de contrato de venda, sem conta no
  // app) — o backend libera esse caso específico validando o token na URL,
  // não a sessão Firebase, então segue sem Authorization mesmo.
  const { auth } = await import('@/lib/firebase')
  const idToken = await auth.currentUser?.getIdToken().catch(() => undefined)

  const presignRes = await fetch('/api/r2-presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ path, contentType }),
  })
  if (!presignRes.ok) {
    const detail = await presignRes.text().catch(() => '')
    throw new Error(`Falha ao preparar upload (${presignRes.status}): ${detail}`)
  }
  const { uploadUrl, publicUrl } = (await presignRes.json()) as { uploadUrl: string; publicUrl: string }

  // If-None-Match precisa bater com o que foi assinado no backend
  // (api/_r2.ts) — senão a assinatura da URL não confere e o R2 recusa com 403.
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, 'If-None-Match': '*' },
    body: file,
  })
  if (!putRes.ok) {
    throw new Error(`Falha no upload para o R2 (${putRes.status})`)
  }

  return publicUrl
}
