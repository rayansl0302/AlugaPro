import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface PhotoLightboxProps {
  photos: string[]
  open: boolean
  startIndex?: number
  onClose: () => void
}

export function PhotoLightbox({ photos, open, startIndex = 0, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(startIndex)

  useEffect(() => {
    if (open) setIndex(startIndex)
  }, [open, startIndex])

  useEffect(() => {
    if (!open || photos.length <= 1) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, photos.length])

  if (photos.length === 0) return null

  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length)
  const next = () => setIndex((i) => (i + 1) % photos.length)
  const multiple = photos.length > 1

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl gap-3 p-4">
        <DialogTitle className="sr-only">Visualizar fotos</DialogTitle>

        <div className="relative flex items-center justify-center rounded-lg bg-black/90" style={{ minHeight: 320 }}>
          <img
            src={photos[index]}
            alt={`Foto ${index + 1} de ${photos.length}`}
            className="max-h-[70dvh] w-full object-contain"
          />
          {multiple && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Próxima foto"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                {index + 1} / {photos.length}
              </span>
            </>
          )}
        </div>

        {multiple && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  'h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                  i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <img src={url} alt={`Miniatura ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
