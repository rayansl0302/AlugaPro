import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Equipment, EquipmentStatus, EquipmentType } from '@/types'
import { createEquipment, updateEquipment } from '@/services/equipments'
import { getOwners } from '@/services/owners'
import { uploadEquipmentPhoto } from '@/services/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { MultiPhotoUpload } from '@/components/shared/MultiPhotoUpload'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  brand: z.string().optional(),
  model: z.string().min(1, 'Modelo obrigatório'),
  type: z.enum(['betoneira', 'andaime', 'compressor', 'furadeira', 'martelete', 'gerador', 'guincho', 'compactador', 'outro']),
  status: z.enum(['disponivel', 'alugado', 'reservado', 'manutencao', 'encerrado']),
  rentValue: z.coerce.number().min(1, 'Valor obrigatório'),
  cautionValue: z.coerce.number().optional(),
  purchaseValue: z.coerce.number().optional(),
  ownerId: z.string().min(1, 'Proprietário obrigatório'),
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
      : { status: 'disponivel', type: 'betoneira' },
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
        toast({ title: 'Equipamento atualizado com sucesso.' })
      } else {
        await createEquipment(payload)
        toast({ title: 'Equipamento cadastrado com sucesso.' })
      }
      onSuccess()
    } catch {
      toast({ title: 'Erro ao salvar equipamento.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Nome *</Label>
          <Input placeholder="Ex: Betoneira 400L" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select
            value={watch('type')}
            onValueChange={(v) => setValue('type', v as EquipmentType)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="betoneira">Betoneira</SelectItem>
              <SelectItem value="andaime">Andaime</SelectItem>
              <SelectItem value="compressor">Compressor</SelectItem>
              <SelectItem value="furadeira">Furadeira</SelectItem>
              <SelectItem value="martelete">Martelete</SelectItem>
              <SelectItem value="gerador">Gerador</SelectItem>
              <SelectItem value="guincho">Guincho</SelectItem>
              <SelectItem value="compactador">Compactador</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status *</Label>
          <Select
            value={watch('status')}
            onValueChange={(v) => setValue('status', v as EquipmentStatus)}
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
          <Label>Marca</Label>
          <Input placeholder="Ex: CSM" {...register('brand')} />
        </div>

        <div className="space-y-2">
          <Label>Modelo *</Label>
          <Input placeholder="Ex: CM-400L" {...register('model')} />
          {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Nº de Série / Patrimônio</Label>
          <Input placeholder="Opcional" {...register('serialNumber')} />
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

        <div className="space-y-2">
          <Label>Valor de Aquisição</Label>
          <Input type="number" step="0.01" placeholder="0,00" {...register('purchaseValue')} />
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

      <MultiPhotoUpload
        label="Fotos do equipamento"
        value={photos}
        onChange={setPhotos}
        onUpload={(file) => uploadEquipmentPhoto(companyId, equipment?.id ?? 'novos', file)}
      />

      <div className="space-y-2">
        <Label>Observações</Label>
        <Input placeholder="Notas internas..." {...register('notes')} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {equipment ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
        </Button>
      </div>
    </form>
  )
}
