import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { Vehicle, VehicleStatus, VehicleType, FuelType } from '@/types'
import { createVehicle, updateVehicle } from '@/services/vehicles'
import { uploadVehiclePhoto } from '@/services/storage'
import { useFipeBrands, useFipeModels, FipeVehicleType } from '@/hooks/useFipe'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiPhotoUpload } from '@/components/shared/MultiPhotoUpload'
import { requiredString } from '@/lib/validation'
import { fieldErrorClass } from '@/lib/formErrors'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  brand: requiredString(i18n.t('vehicles:validation.brandRequired')),
  model: requiredString(i18n.t('vehicles:validation.modelRequired')),
  year: z.coerce.number().min(1900, i18n.t('vehicles:validation.yearInvalid')).max(new Date().getFullYear() + 1, i18n.t('vehicles:validation.yearInvalid')),
  plate: z.string().min(7, i18n.t('vehicles:validation.plateInvalid')),
  type: z.enum(['carro', 'moto', 'caminhao', 'van', 'onibus', 'outro']),
  status: z.enum(['disponivel', 'alugado', 'reservado', 'manutencao', 'encerrado']),
  rentValue: z.coerce.number().min(1, i18n.t('vehicles:validation.valueRequired')),
  cautionValue: z.coerce.number().optional(),
  color: z.string().optional(),
  renavam: z.string().optional(),
  chassi: z.string().optional(),
  fuel: z.enum(['gasolina', 'etanol', 'flex', 'diesel', 'gnv', 'eletrico', 'hibrido']).optional(),
  mileage: z.coerce.number().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  vehicle?: Vehicle | null
  companyId: string
  onSuccess: () => void
}

const fipeTypeMap: Partial<Record<VehicleType, FipeVehicleType>> = {
  carro: 'carros',
  moto: 'motos',
  caminhao: 'caminhoes',
}

export function VehicleForm({ vehicle, companyId, onSuccess }: Props) {
  const { t } = useTranslation('vehicles')
  const [loading, setLoading] = useState(false)
  const [photos, setPhotos] = useState<string[]>(vehicle?.photos ?? [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: vehicle
      ? {
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          plate: vehicle.plate,
          type: vehicle.type,
          status: vehicle.status,
          rentValue: vehicle.rentValue,
          cautionValue: vehicle.cautionValue,
          color: vehicle.color,
          renavam: vehicle.renavam,
          chassi: vehicle.chassi,
          fuel: vehicle.fuel,
          mileage: vehicle.mileage,
          notes: vehicle.notes,
        }
      : { status: 'disponivel', type: 'carro' },
  })

  const selectedType = watch('type')
  const fipeType = fipeTypeMap[selectedType] ?? null
  const { data: brands = [], isFetching: brandsLoading } = useFipeBrands(fipeType)

  const selectedBrand = watch('brand')
  const brandCode = brands.find((b) => b.nome === selectedBrand)?.valor ?? null
  const { data: models = [], isFetching: modelsLoading } = useFipeModels(fipeType, brandCode)

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const payload = {
        companyId,
        brand: data.brand,
        model: data.model,
        year: data.year,
        plate: data.plate.toUpperCase().replace(/\s/g, ''),
        type: data.type as VehicleType,
        status: data.status as VehicleStatus,
        rentValue: data.rentValue,
        cautionValue: data.cautionValue,
        color: data.color,
        renavam: data.renavam,
        chassi: data.chassi,
        fuel: data.fuel as FuelType | undefined,
        mileage: data.mileage,
        photos,
        notes: data.notes,
      }
      if (vehicle) {
        await updateVehicle(vehicle.id, payload)
        toast({ title: t('toast.updated') })
      } else {
        await createVehicle(payload)
        toast({ title: t('toast.created') })
      }
      onSuccess()
    } catch {
      toast({ title: t('toast.saveError'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('form.type')} *</Label>
          <Select
            value={watch('type')}
            onValueChange={(v) => setValue('type', v as VehicleType)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="carro">{t('types.carro')}</SelectItem>
              <SelectItem value="moto">{t('types.moto')}</SelectItem>
              <SelectItem value="caminhao">{t('types.caminhao')}</SelectItem>
              <SelectItem value="van">{t('types.van')}</SelectItem>
              <SelectItem value="onibus">{t('types.onibus')}</SelectItem>
              <SelectItem value="outro">{t('types.outro')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('form.status')} *</Label>
          <Select
            value={watch('status')}
            onValueChange={(v) => setValue('status', v as VehicleStatus)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="disponivel">{t('common:status.disponivel')}</SelectItem>
              <SelectItem value="alugado">{t('common:status.alugado')}</SelectItem>
              <SelectItem value="reservado">{t('common:status.reservado')}</SelectItem>
              <SelectItem value="manutencao">{t('common:status.manutencao')}</SelectItem>
              <SelectItem value="encerrado">{t('common:status.encerrado')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('form.brand')} *</Label>
          {brands.length > 0 ? (
            <Select
              value={watch('brand') || ''}
              onValueChange={(v) => { setValue('brand', v); setValue('model', '') }}
            >
              <SelectTrigger>
                {brandsLoading
                  ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t('common:actions.loading')}</span>
                  : <SelectValue placeholder={t('placeholders.selectBrand')} />
                }
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {brands.map((b) => (
                  <SelectItem key={b.valor} value={b.nome}>{b.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder={t('placeholders.brand')} className={fieldErrorClass(errors.brand)} {...register('brand')} />
          )}
          {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
          {fipeType && <p className="text-xs text-muted-foreground">{t('hints.fipeBrands')}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t('form.model')} *</Label>
          {models.length > 0 ? (
            <Select
              value={watch('model') || ''}
              onValueChange={(v) => setValue('model', v)}
            >
              <SelectTrigger>
                {modelsLoading
                  ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t('common:actions.loading')}</span>
                  : <SelectValue placeholder={t('placeholders.selectModel')} />
                }
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {models.map((m) => (
                  <SelectItem key={m.modelo} value={m.modelo}>{m.modelo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder={t('placeholders.model')} className={fieldErrorClass(errors.model)} {...register('model')} />
          )}
          {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
          {brandCode && <p className="text-xs text-muted-foreground">{t('hints.fipeModels')}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t('form.year')} *</Label>
          <Input type="number" placeholder={t('placeholders.year')} className={fieldErrorClass(errors.year)} {...register('year')} />
          {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t('form.plate')} *</Label>
          <Input placeholder={t('placeholders.plate')} maxLength={8} className={cn('uppercase', fieldErrorClass(errors.plate))} {...register('plate')} />
          {errors.plate && <p className="text-xs text-destructive">{errors.plate.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t('form.color')}</Label>
          <Input placeholder={t('placeholders.color')} {...register('color')} />
        </div>

        <div className="space-y-2">
          <Label>{t('form.fuelType')}</Label>
          <Select
            value={watch('fuel') || ''}
            onValueChange={(v) => setValue('fuel', v as FuelType)}
          >
            <SelectTrigger><SelectValue placeholder={t('placeholders.select')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gasolina">{t('fuels.gasolina')}</SelectItem>
              <SelectItem value="etanol">{t('fuels.etanol')}</SelectItem>
              <SelectItem value="flex">{t('fuels.flex')}</SelectItem>
              <SelectItem value="diesel">{t('fuels.diesel')}</SelectItem>
              <SelectItem value="gnv">{t('fuels.gnv')}</SelectItem>
              <SelectItem value="eletrico">{t('fuels.eletrico')}</SelectItem>
              <SelectItem value="hibrido">{t('fuels.hibrido')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('form.mileage')}</Label>
          <Input type="number" placeholder={t('placeholders.mileage')} {...register('mileage')} />
        </div>

        <div className="space-y-2">
          <Label>{t('form.renavam')}</Label>
          <Input placeholder={t('placeholders.renavam')} {...register('renavam')} />
        </div>

        <div className="space-y-2">
          <Label>{t('form.chassi')}</Label>
          <Input placeholder={t('placeholders.chassi')} {...register('chassi')} />
        </div>

        <div className="space-y-2">
          <Label>{t('fields.rentValue')} *</Label>
          <Input type="number" step="0.01" placeholder={t('placeholders.value')} className={fieldErrorClass(errors.rentValue)} {...register('rentValue')} />
          {errors.rentValue && <p className="text-xs text-destructive">{errors.rentValue.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t('caution')}</Label>
          <Input type="number" step="0.01" placeholder={t('placeholders.value')} {...register('cautionValue')} />
        </div>

      </div>

      <MultiPhotoUpload
        label={t('form.photosLabel')}
        value={photos}
        onChange={setPhotos}
        onUpload={(file) => uploadVehiclePhoto(companyId, vehicle?.id ?? 'novos', file)}
      />

      <div className="space-y-2">
        <Label>{t('form.observations')}</Label>
        <Input placeholder={t('placeholders.notes')} {...register('notes')} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {vehicle ? t('buttons.save') : t('buttons.create')}
        </Button>
      </div>
    </form>
  )
}
