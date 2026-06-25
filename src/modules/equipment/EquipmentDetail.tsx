import { useState } from 'react'
import { DollarSign, User, Tag, HardHat, Hash } from 'lucide-react'
import { Equipment, EquipmentStatus } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { PhotoLightbox } from '@/components/shared/PhotoLightbox'

const statusConfig: Record<EquipmentStatus, { label: string; variant: 'success' | 'info' | 'warning' | 'secondary' | 'destructive' }> = {
  disponivel: { label: 'Disponível', variant: 'success' },
  alugado: { label: 'Alugado', variant: 'info' },
  reservado: { label: 'Reservado', variant: 'warning' },
  manutencao: { label: 'Manutenção', variant: 'secondary' },
  encerrado: { label: 'Encerrado', variant: 'destructive' },
}

export function EquipmentDetail({ equipment }: { equipment: Equipment }) {
  const sc = statusConfig[equipment.status]
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
        <Badge variant={sc.variant}>{sc.label}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Valor do Aluguel</p>
            <p className="font-bold">{formatCurrency(equipment.rentValue)}</p>
          </div>
        </div>
        {equipment.cautionValue != null && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Caução</p>
              <p className="font-bold">{formatCurrency(equipment.cautionValue)}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p className="font-medium">{equipment.type}</p>
          </div>
        </div>
        {equipment.serialNumber && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Nº de Série / Patrimônio</p>
              <p className="font-mono font-medium">{equipment.serialNumber}</p>
            </div>
          </div>
        )}
        {equipment.purchaseValue != null && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <HardHat className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Valor de Aquisição</p>
              <p className="font-medium">{formatCurrency(equipment.purchaseValue)}</p>
            </div>
          </div>
        )}
        {equipment.activeTenantName && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Locatário Atual</p>
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

      {equipment.notes && (
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground">Observações</p>
          <p className="mt-1 text-sm">{equipment.notes}</p>
        </div>
      )}
    </div>
  )
}
