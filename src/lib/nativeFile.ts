import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

// O WebView do Capacitor não tem gerenciador de downloads: âncoras com
// `download`, `XLSX.writeFile`, `jsPDF.save()` e `window.open(blob:)` falham
// em silêncio no Android/iOS. Nesses casos o caminho confiável é gravar o
// arquivo no cache do app e abrir a share sheet nativa — de lá a pessoa
// visualiza, salva ou envia por WhatsApp/e-mail.

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function shareNativeFile(blob: Blob, filename: string) {
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  })
  try {
    await Share.share({ title: filename, url: uri, dialogTitle: filename })
  } catch (err) {
    // Fechar a share sheet sem escolher app rejeita a promise — não é erro.
    const msg = err instanceof Error ? err.message.toLowerCase() : ''
    if (msg.includes('cancel')) return
    throw err
  }
}

/** Baixa (web) ou abre a share sheet (app nativo) para um arquivo gerado no cliente. */
export async function saveOrShareFile(blob: Blob, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await shareNativeFile(blob, filename)
    return
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revogação adiada: revogar de imediato cancela o download em alguns browsers
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** Abre em nova aba (web) ou via share sheet (app nativo) um arquivo gerado no cliente. */
export async function openOrShareBlob(blob: Blob, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await shareNativeFile(blob, filename)
    return
  }
  window.open(URL.createObjectURL(blob), '_blank')
}
