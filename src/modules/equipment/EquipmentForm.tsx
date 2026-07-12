import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import i18n from '@/i18n'
import { Equipment, EquipmentStatus, EquipmentType, EQUIPMENT_TYPE_SUGGESTIONS } from '@/types'
import { createEquipment, updateEquipment } from '@/services/equipments'
import { getOwners } from '@/services/owners'
import { uploadEquipmentPhoto } from '@/services/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { MultiPhotoUpload } from '@/components/shared/MultiPhotoUpload'
import { requiredString } from '@/lib/validation'
import { fieldErrorClass } from '@/lib/formErrors'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  name: requiredString(i18n.t('equipment:validation.nameRequired')),
  brand: z.string().optional(),
  model: requiredString(i18n.t('equipment:validation.modelRequired')),
  type: requiredString(i18n.t('equipment:validation.typeRequired')),
  status: z.enum(['disponivel', 'alugado', 'reservado', 'manutencao', 'encerrado']),
  rentValue: z.coerce.number().min(1, i18n.t('equipment:validation.valueRequired')),
  cautionValue: z.coerce.number().optional(),
  purchaseValue: z.coerce.number().optional(),
  ownerId: requiredString(i18n.t('equipment:validation.ownerRequired')),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  equipment?: Equipment | null
  companyId: string
  onSuccess: () => void
}

export function EquipmentForm({ equipment, companyId, onSuccess }: Props) {
  const { t } = useTranslation('equipment')
  const [loading, setLoading] = useState(false)
  const [photos, setPhotos] = useState<string[]>(equipment?.photos ?? [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: equipment
      ? {
          name: equipment.name,
          brand: equipment.brand,
          model: equipment.model,
          type: equipment.type,
          status: equipment.status,
          rentValue: equipment.rentValue,
          cautionValue: equipment.cautionValue,
          purchaseValue: equipment.purchaseValue,
          ownerId: equipment.ownerId,
          serialNumber: equipment.serialNumber,
          notes: equipment.notes,
        }
      : { status: 'disponivel', type: '' },
  })

  const { data: owners = [] } = useQuery({
    queryKey: ['owners', companyId],
    queryFn: () => getOwners(companyId),
    enabled: !!companyId,
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const payload = {
        companyId,
        name: data.name,
        brand: data.brand,
        model: data.model,
        type: data.type as EquipmentType,
        status: data.status as EquipmentStatus,
        rentValue: data.rentValue,
        cautionValue: data.cautionValue,
        purchaseValue: data.purchaseValue,
        ownerId: data.ownerId,
        serialNumber: data.serialNumber,
        photos,
        notes: data.notes,
      }
      if (equipment) {
        await updateEquipment(equipment.id, payload)
        toast({ title: t('toast.updated') })
      } else {
        await createEquipment(payload)
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
        <div className="space-y-2 sm:col-span-2">
          <Label>{t('form.name')} *</Label>
          <Input placeholder={t('placeholders.name')} className={fieldErrorClass(errors.name)} {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t('form.type')} *</Label>
          <Input
            list="equipment-type-suggestions"
            placeholder={t('placeholders.type')}
            className={fieldErrorClass(errors.type)}
            {...register('type')}
          />
          <datalist id="equipment-type-suggestions">
            {EQUIPMENT_TYPE_SUGGESTIONS.map((suggestion) => <option key={suggestion} value={suggestion} />)}
          </datalist>
          {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          <p className="text-xs text-muted-foreground">{t('hints.freeType')}</p>
        </div>

        <div className="space-y-2">
          <Label>{t('form.status')} *</Label>
          <Select
            value={watch('status')}
            onValueChange={(v) => setValue('status', v as EquipmentStatus)}
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
          <Label>{t('form.brand')}</Label>
          <Input placeholder={t('placeholders.brand')} {...register('brand')} />
        </div>

        <div className="space-y-2">
          <Label>{t('form.model')} *</Label>
          <Input placeholder={t('placeholders.model')} className={fieldErrorClass(errors.model)} {...register('model')} />
          {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t('form.serialNumber')}</Label>
          <Input placeholder={t('common:ui.optional')} {...register('serialNumber')} />
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

        <div className="space-y-2">
          <Label>{t('form.purchaseValue')}</Label>
          <Input type="number" step="0.01" placeholder={t('placeholders.value')} {...register('purchaseValue')} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>{t('form.owner')} *</Label>
          <Combobox
            options={owners.map((o) => ({ value: o.id, label: o.name, description: o.cpf || o.cnpj || o.email }))}
            value={watch('ownerId')}
            onChange={(v) => setValue('ownerId', v)}
            placeholder={t('placeholders.selectOwner')}
            searchPlaceholder={t('placeholders.searchOwner')}
            emptyText={t('placeholders.noOwners')}
          />
          {errors.ownerId && <p className="text-xs text-destructive">{errors.ownerId.message}</p>}
        </div>
      </div>

      <MultiPhotoUpload
        label={t('form.photosLabel')}
        value={photos}
        onChange={setPhotos}
        onUpload={(file) => uploadEquipmentPhoto(companyId, equipment?.id ?? 'novos', file)}
      />

      <div className="space-y-2">
        <Label>{t('form.observations')}</Label>
        <Input placeholder={t('placeholders.notes')} {...register('notes')} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {equipment ? t('buttons.save') : t('buttons.create')}
        </Button>
      </div>
    </form>
  )
}
