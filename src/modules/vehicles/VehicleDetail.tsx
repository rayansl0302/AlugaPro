import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DollarSign, User, Tag, Car, Gauge, Fuel } from 'lucide-react'
import { Vehicle, VehicleStatus } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { PhotoLightbox } from '@/components/shared/PhotoLightbox'

const statusVariant: Record<VehicleStatus, 'success' | 'info' | 'warning' | 'secondary' | 'destructive'> = {
  disponivel: 'success',
  alugado: 'info',
  reservado: 'warning',
  manutencao: 'secondary',
  encerrado: 'destructive',
}

export function VehicleDetail({ vehicle }: { vehicle: Vehicle }) {
  const { t } = useTranslation('vehicles')
  const variant = statusVariant[vehicle.status]
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 })
  const photos = vehicle.photos ?? []
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{vehicle.brand} {vehicle.model}</h2>
          <p className="text-sm text-muted-foreground">{vehicle.code} — {vehicle.plate}</p>
        </div>
        <Badge variant={variant}>{t(`common:status.${vehicle.status}`)}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">{t('fields.rentValue')}</p>
            <p className="font-bold">{formatCurrency(vehicle.rentValue)}</p>
          </div>
        </div>
        {vehicle.cautionValue != null && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('caution')}</p>
              <p className="font-bold">{formatCurrency(vehicle.cautionValue)}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{t('form.type')}</p>
            <p className="font-medium">{t(`types.${vehicle.type}`)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Car className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{t('form.year')}</p>
            <p className="font-medium">{vehicle.year}</p>
          </div>
        </div>
        {vehicle.fuel && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Fuel className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('form.fuelType')}</p>
              <p className="font-medium">{t(`fuels.${vehicle.fuel}`)}</p>
            </div>
          </div>
        )}
        {vehicle.mileage != null && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Gauge className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('form.mileage')}</p>
              <p className="font-medium">{vehicle.mileage.toLocaleString('pt-BR')} km</p>
            </div>
          </div>
        )}
        {vehicle.color && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Tag className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('form.color')}</p>
              <p className="font-medium">{vehicle.color}</p>
            </div>
          </div>
        )}
        {vehicle.activeTenantName && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('currentTenant')}</p>
              <p className="font-medium">{vehicle.activeTenantName}</p>
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
              <img src={url} alt={t('fields.photoAlt', { index: idx + 1 })} className="h-full w-full object-cover transition-transform hover:scale-105" />
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

      {(vehicle.renavam || vehicle.chassi) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {vehicle.renavam && (
            <div className="rounded-lg border p-4">
              <p className="text-xs font-medium text-muted-foreground">{t('form.renavam')}</p>
              <p className="mt-1 font-mono text-sm">{vehicle.renavam}</p>
            </div>
          )}
          {vehicle.chassi && (
            <div className="rounded-lg border p-4">
              <p className="text-xs font-medium text-muted-foreground">{t('form.chassi')}</p>
              <p className="mt-1 font-mono text-sm">{vehicle.chassi}</p>
            </div>
          )}
        </div>
      )}

      {vehicle.notes && (
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground">{t('form.observations')}</p>
          <p className="mt-1 text-sm">{vehicle.notes}</p>
        </div>
      )}
    </div>
  )
}
