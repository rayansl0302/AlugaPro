// Comprime uma imagem (buscada de uma URL remota) antes de embutir num PDF.
// Fotos de celular sem compressão (3-8MB cada) fazem um PDF com várias fotos
// (frente/verso/selfie × 4 assinantes) passar de 50MB facilmente — o PDF só
// exibe a foto num retângulo pequeno (~55mm), então não há motivo pra embutir
// a imagem em resolução original.
export async function compressImageUrlToDataURL(
  url: string,
  maxDim = 1000,
  quality = 0.72,
): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  const bitmap = await createImageBitmap(blob)

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // Sem canvas (ambiente sem suporte) — cai pro data URL original sem comprimir
    return blobToDataURL(blob)
  }
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  return canvas.toDataURL('image/jpeg', quality)
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
