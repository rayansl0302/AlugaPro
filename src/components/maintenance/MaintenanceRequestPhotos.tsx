import { useState } from 'react'
import { PhotoLightbox } from '@/components/shared/PhotoLightbox'

interface MaintenanceRequestPhotosProps {
  photos?: string[]
  title?: string
}

export function MaintenanceRequestPhotos({
  photos = [],
  title = 'Fotos do chamado',
}: MaintenanceRequestPhotosProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [startIndex, setStartIndex] = useState(0)

  if (photos.length === 0) return null

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {photos.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            onClick={() => {
              setStartIndex(index)
              setLightboxOpen(true)
            }}
            className="h-20 w-20 overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-90"
          >
            <img
              src={url}
              alt={`${title} ${index + 1}`}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
      <PhotoLightbox
        photos={photos}
        open={lightboxOpen}
        startIndex={startIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  )
}
