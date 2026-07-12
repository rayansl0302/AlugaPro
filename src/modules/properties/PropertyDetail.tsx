import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, DollarSign, User, Tag } from 'lucide-react'
import { Property, PropertyStatus } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { PhotoLightbox } from '@/components/shared/PhotoLightbox'

const statusVariants: Record<PropertyStatus, 'success' | 'info' | 'warning' | 'secondary' | 'destructive'> = {
  disponivel: 'success',
  alugado: 'info',
  reservado: 'warning',
  manutencao: 'secondary',
  encerrado: 'destructive',
}

export function PropertyDetail({ property }: { property: Property }) {
  const { t } = useTranslation('properties')
  const variant = statusVariants[property.status]
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 })
  const photos = property.photos ?? []
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{property.name}</h2>
          <p className="text-sm text-muted-foreground">{property.code}</p>
        </div>
        <Badge variant={variant}>{t(`common:status.${property.status}`)}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">{t('form.value')}</p>
            <p className="font-bold">{formatCurrency(property.rentValue)}</p>
          </div>
        </div>
        {!!property.cautionValue && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('caution')}</p>
              <p className="font-bold">{formatCurrency(property.cautionValue)}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{t('form.type')}</p>
            <p className="font-medium capitalize">{t(`types.${property.type}`)}</p>
          </div>
        </div>
        {property.activeTenantName && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('currentTenant')}</p>
              <p className="font-medium">{property.activeTenantName}</p>
            </div>
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => setLightbox({ open: true, index: idx })}
              className="aspect-square overflow-hidden rounded-lg border bg-muted/30"
            >
              <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover transition-transform hover:scale-105" />
            </button>
          ))}
        </div>
      )}

      <PhotoLightbox
        photos={photos}
        open={lightbox.open}
        startIndex={lightbox.index}
        onClose={() => setLightbox((s) => ({ ...s, open: false }))}
      />

      <div className="flex items-start gap-3 rounded-lg border p-4">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">{t('form.address')}</p>
          <p className="font-medium">
            {property.address.street}, {property.address.number}
            {property.address.complement && `, ${property.address.complement}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {property.address.neighborhood} — {property.address.city}/{property.address.state} —{' '}
            {property.address.zipCode}
          </p>
        </div>
      </div>

      {property.notes && (
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground">{t('form.observations')}</p>
          <p className="mt-1 text-sm">{property.notes}</p>
        </div>
      )}
    </div>
  )
}
