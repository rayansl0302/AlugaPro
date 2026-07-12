import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DollarSign, User, Tag, HardHat, Hash } from 'lucide-react'
import { Equipment, EquipmentStatus } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { PhotoLightbox } from '@/components/shared/PhotoLightbox'

const statusVariant: Record<EquipmentStatus, 'success' | 'info' | 'warning' | 'secondary' | 'destructive'> = {
  disponivel: 'success',
  alugado: 'info',
  reservado: 'warning',
  manutencao: 'secondary',
  encerrado: 'destructive',
}

export function EquipmentDetail({ equipment }: { equipment: Equipment }) {
  const { t } = useTranslation('equipment')
  const variant = statusVariant[equipment.status]
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 })
  const photos = equipment.photos ?? []
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{equipment.name}</h2>
          <p className="text-sm text-muted-foreground">
            {equipment.code}{equipment.brand ? ` — ${equipment.brand} ${equipment.model}` : ` — ${equipment.model}`}
          </p>
        </div>
        <Badge variant={variant}>{t(`common:status.${equipment.status}`)}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">{t('fields.rentValue')}</p>
            <p className="font-bold">{formatCurrency(equipment.rentValue)}</p>
          </div>
        </div>
        {equipment.cautionValue != null && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('caution')}</p>
              <p className="font-bold">{formatCurrency(equipment.cautionValue)}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{t('form.type')}</p>
            <p className="font-medium">{equipment.type}</p>
          </div>
        </div>
        {equipment.serialNumber && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('form.serialNumber')}</p>
              <p className="font-mono font-medium">{equipment.serialNumber}</p>
            </div>
          </div>
        )}
        {equipment.purchaseValue != null && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <HardHat className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('form.purchaseValue')}</p>
              <p className="font-medium">{formatCurrency(equipment.purchaseValue)}</p>
            </div>
          </div>
        )}
        {equipment.activeTenantName && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('currentTenant')}</p>
              <p className="font-medium">{equipment.activeTenantName}</p>
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

      {equipment.notes && (
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground">{t('form.observations')}</p>
          <p className="mt-1 text-sm">{equipment.notes}</p>
        </div>
      )}
    </div>
  )
}
