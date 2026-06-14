import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { toast } from '@/hooks/useToast'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  type: z.enum(['apartamento', 'casa', 'kitnet', 'sala_comercial', 'galpao', 'terreno', 'outro']),
  status: z.enum(['disponivel', 'alugado', 'reservado', 'manutencao', 'encerrado']),
  rentValue: z.coerce.number().min(1, 'Valor obrigatório'),
  cautionValue: z.coerce.number().optional(),
  ownerId: z.string().min(1, 'Proprietário obrigatório'),
  street: z.string().min(2, 'Rua obrigatória'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'UF deve ter 2 caracteres'),
  zipCode: z.string().min(8, 'CEP inválido'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  property?: Property | null
  companyId: string
  onSuccess: () => void
}

export function PropertyForm({ property, companyId, onSuccess }: Props) {
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
        toast({ title: 'Imóvel atualizado com sucesso.' })
      } else {
        await createProperty(payload)
        toast({ title: 'Imóvel cadastrado com sucesso.' })
      }
      onSuccess()
    } catch {
      toast({ title: 'Erro ao salvar imóvel.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Nome do Imóvel *</Label>
          <Input placeholder="Ex: Apto 101 - Edifício Central" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select
            value={watch('type')}
            onValueChange={(v) => setValue('type', v as PropertyType)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="apartamento">Apartamento</SelectItem>
              <SelectItem value="casa">Casa</SelectItem>
              <SelectItem value="kitnet">Kitnet</SelectItem>
              <SelectItem value="sala_comercial">Sala Comercial</SelectItem>
              <SelectItem value="galpao">Galpão</SelectItem>
              <SelectItem value="terreno">Terreno</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status *</Label>
          <Select
            value={watch('status')}
            onValueChange={(v) => setValue('status', v as PropertyStatus)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="disponivel">Disponível</SelectItem>
              <SelectItem value="alugado">Alugado</SelectItem>
              <SelectItem value="reservado">Reservado</SelectItem>
              <SelectItem value="manutencao">Em Manutenção</SelectItem>
              <SelectItem value="encerrado">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Valor do Aluguel *</Label>
          <Input type="number" step="0.01" placeholder="0,00" {...register('rentValue')} />
          {errors.rentValue && <p className="text-xs text-destructive">{errors.rentValue.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Valor da Caução</Label>
          <Input type="number" step="0.01" placeholder="0,00" {...register('cautionValue')} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Proprietário *</Label>
          <Combobox
            options={owners.map((o) => ({ value: o.id, label: o.name, description: o.cpf || o.cnpj || o.email }))}
            value={watch('ownerId')}
            onChange={(v) => setValue('ownerId', v)}
            placeholder="Selecione o proprietário"
            searchPlaceholder="Buscar proprietário..."
            emptyText="Nenhum proprietário cadastrado."
          />
          {errors.ownerId && <p className="text-xs text-destructive">{errors.ownerId.message}</p>}
        </div>
      </div>

      <p className="text-sm font-semibold text-muted-foreground">Endereço</p>

      <AddressFields
        register={register}
        setValue={setValue}
        watch={watch}
        errors={errors as Record<string, { message?: string }>}
      />

      <MultiPhotoUpload
        label="Fotos do imóvel"
        value={photos}
        onChange={setPhotos}
        onUpload={(file) => uploadPropertyPhoto(companyId, property?.id ?? 'novos', file)}
      />

      <div className="space-y-2">
        <Label>Observações</Label>
        <Input placeholder="Notas internas..." {...register('notes')} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {property ? 'Salvar Alterações' : 'Cadastrar Imóvel'}
        </Button>
      </div>
    </form>
  )
}
