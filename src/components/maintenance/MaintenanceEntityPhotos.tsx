import { Building2, Car } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, getInitials } from '@/lib/utils'
import type { ResolvedMaintenanceEntityPhotos } from '@/lib/maintenanceEntityPhotos'

interface MaintenanceEntityPhotosProps {
  photos: ResolvedMaintenanceEntityPhotos
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  variant?: 'both' | 'tenant' | 'asset'
  className?: string
}

const sizeStyles = {
  sm: {
    wrap: 'gap-2',
    avatar: 'h-8 w-8',
    asset: 'h-8 w-8',
    icon: 'h-3.5 w-3.5',
    label: 'text-[10px]',
  },
  md: {
    wrap: 'gap-2.5',
    avatar: 'h-10 w-10',
    asset: 'h-10 w-10',
    icon: 'h-4 w-4',
    label: 'text-xs',
  },
  lg: {
    wrap: 'gap-4',
    avatar: 'h-14 w-14',
    asset: 'h-14 w-14',
    icon: 'h-5 w-5',
    label: 'text-sm',
  },
} as const

function AssetThumbnail({
  photos,
  size,
}: {
  photos: ResolvedMaintenanceEntityPhotos
  size: keyof typeof sizeStyles
}) {
  const styles = sizeStyles[size]
  const AssetIcon = photos.assetType === 'veiculo' ? Car : Building2

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-md bg-muted',
        styles.asset,
      )}
    >
      {photos.assetPhotoUrl ? (
        <img
          src={photos.assetPhotoUrl}
          alt={photos.assetName ?? (photos.assetType === 'veiculo' ? 'Veículo' : 'Imóvel')}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <AssetIcon className={cn('text-muted-foreground', styles.icon)} />
        </div>
      )}
    </div>
  )
}

export function MaintenanceEntityPhotos({
  photos,
  size = 'sm',
  showLabels = false,
  variant = 'both',
  className,
}: MaintenanceEntityPhotosProps) {
  const styles = sizeStyles[size]
  const assetLabel = photos.assetType === 'veiculo' ? 'Veículo' : 'Imóvel'

  if (variant === 'tenant') {
    return (
      <div className={cn('flex items-center gap-2 min-w-0', className)}>
        <Avatar className={styles.avatar}>
          <AvatarImage src={photos.tenantPhotoUrl} alt={photos.tenantName} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(photos.tenantName)}
          </AvatarFallback>
        </Avatar>
        <span className="line-clamp-1 text-muted-foreground">{photos.tenantName}</span>
      </div>
    )
  }

  if (variant === 'asset') {
    return (
      <div className={cn('flex items-center gap-2 min-w-0', className)}>
        <AssetThumbnail photos={photos} size={size} />
        <span className="line-clamp-1 text-muted-foreground">{photos.assetName ?? '—'}</span>
      </div>
    )
  }

  if (showLabels) {
    return (
      <div className={cn('flex flex-wrap gap-4', className)}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className={styles.avatar}>
            <AvatarImage src={photos.tenantPhotoUrl} alt={photos.tenantName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {getInitials(photos.tenantName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className={cn('font-medium truncate', styles.label)}>{photos.tenantName}</p>
            <p className="text-[10px] text-muted-foreground">Inquilino</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 min-w-0">
          <AssetThumbnail photos={photos} size={size} />
          <div className="min-w-0">
            <p className={cn('font-medium truncate', styles.label)}>{photos.assetName ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground">{assetLabel}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center', styles.wrap, className)}>
      <Avatar className={styles.avatar}>
        <AvatarImage src={photos.tenantPhotoUrl} alt={photos.tenantName} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {getInitials(photos.tenantName)}
        </AvatarFallback>
      </Avatar>
      <AssetThumbnail photos={photos} size={size} />
    </div>
  )
}
