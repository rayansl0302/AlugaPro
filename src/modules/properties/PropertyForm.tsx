import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import i18n from '@/i18n'
import { Property, PropertyStatus, PropertyType } from '@/types'
import { createProperty, updateProperty } from '@/services/properties'
import { getOwners } from '@/services/owners'
import { uploadPropertyPhoto } from '@/services/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { AddressFields } from '@/components/shared/AddressFields'
import { MultiPhotoUpload } from '@/components/shared/MultiPhotoUpload'
import { requiredString } from '@/lib/validation'
import { fieldErrorClass } from '@/lib/formErrors'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  name: requiredString(i18n.t('properties:validation.nameRequired')),
  type: z.enum(['apartamento', 'casa', 'kitnet', 'sala_comercial', 'galpao', 'terreno', 'outro']),
  status: z.enum(['disponivel', 'alugado', 'reservado', 'manutencao', 'encerrado']),
  rentValue: z.coerce.number().min(1, i18n.t('properties:validation.valueRequired')),
  cautionValue: z.coerce.number().optional(),
  ownerId: requiredString(i18n.t('properties:validation.ownerRequired')),
  street: requiredString(i18n.t('properties:validation.streetRequired')),
  number: requiredString(i18n.t('properties:validation.numberRequired')),
  complement: z.string().optional(),
  neighborhood: requiredString(i18n.t('properties:validation.neighborhoodRequired')),
  city: requiredString(i18n.t('properties:validation.cityRequired')),
  state: z.string().length(2, i18n.t('properties:validation.stateLength')),
  zipCode: z.string().min(8, i18n.t('properties:validation.zipInvalid')),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  property?: Property | null
  companyId: string
  onSuccess: () => void
}

export function PropertyForm({ property, companyId, onSuccess }: Props) {
  const { t } = useTranslation('properties')
  const [loading, setLoading] = useState(false)
  const [photos, setPhotos] = useState<string[]>(property?.photos ?? [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: property
      ? {
          name: property.name,
          type: property.type,
          status: property.status,
          rentValue: property.rentValue,
          cautionValue: property.cautionValue,
          ownerId: property.ownerId,
          street: property.address.street,
          number: property.address.number,
          complement: property.address.complement,
          neighborhood: property.address.neighborhood,
          city: property.address.city,
          state: property.address.state,
          zipCode: property.address.zipCode,
          notes: property.notes,
        }
      : { status: 'disponivel', type: 'apartamento' },
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
        type: data.type as PropertyType,
        status: data.status as PropertyStatus,
        rentValue: data.rentValue,
        cautionValue: data.cautionValue,
        ownerId: data.ownerId,
        address: {
          street: data.street,
          number: data.number,
          complement: data.complement,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
        },
        photos,
        notes: data.notes,
      }
      if (property) {
        await updateProperty(property.id, payload)
        toast({ title: t('toast.updated') })
      } else {
        await createProperty(payload)
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
          <Select
            value={watch('type')}
            onValueChange={(v) => setValue('type', v as PropertyType)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="apartamento">{t('types.apartamento')}</SelectItem>
              <SelectItem value="casa">{t('types.casa')}</SelectItem>
              <SelectItem value="kitnet">{t('types.kitnet')}</SelectItem>
              <SelectItem value="sala_comercial">{t('types.sala_comercial')}</SelectItem>
              <SelectItem value="galpao">{t('types.galpao')}</SelectItem>
              <SelectItem value="terreno">{t('types.terreno')}</SelectItem>
              <SelectItem value="outro">{t('types.outro')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('form.status')} *</Label>
          <Select
            value={watch('status')}
            onValueChange={(v) => setValue('status', v as PropertyStatus)}
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
          <Label>{t('form.value')} *</Label>
          <Input type="number" step="0.01" placeholder="0,00" className={fieldErrorClass(errors.rentValue)} {...register('rentValue')} />
          {errors.rentValue && <p className="text-xs text-destructive">{errors.rentValue.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t('caution')}</Label>
          <Input type="number" step="0.01" placeholder="0,00" {...register('cautionValue')} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>{t('form.owner')} *</Label>
          <Combobox
            options={owners.map((o) => ({ value: o.id, label: o.name, description: o.cpf || o.cnpj || o.email }))}
            value={watch('ownerId')}
            onChange={(v) => setValue('ownerId', v)}
            placeholder={t('form.owner')}
            searchPlaceholder={t('form.owner')}
            emptyText={t('owners:empty.title')}
          />
          {errors.ownerId && <p className="text-xs text-destructive">{errors.ownerId.message}</p>}
        </div>
      </div>

      <p className="text-sm font-semibold text-muted-foreground">{t('form.address')}</p>

      <AddressFields
        register={(name) => register(name as Parameters<typeof register>[0])}
        setValue={setValue}
        watch={watch}
        errors={errors as Record<string, { message?: string }>}
      />

      <MultiPhotoUpload
        label={t('form.photos')}
        value={photos}
        onChange={setPhotos}
        onUpload={(file) => uploadPropertyPhoto(companyId, property?.id ?? 'novos', file)}
      />

      <div className="space-y-2">
        <Label>{t('form.observations')}</Label>
        <Input placeholder={t('placeholders.notes')} {...register('notes')} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {property ? t('common:actions.save') : t('add')}
        </Button>
      </div>
    </form>
  )
}
