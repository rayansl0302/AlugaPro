import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Vehicle, VehicleStatus, VehicleType, FuelType } from '@/types'
import { createVehicle, updateVehicle } from '@/services/vehicles'
import { getOwners } from '@/services/owners'
import { uploadVehiclePhoto } from '@/services/storage'
import { useFipeBrands, useFipeModels, FipeVehicleType } from '@/hooks/useFipe'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { MultiPhotoUpload } from '@/components/shared/MultiPhotoUpload'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  brand: z.string().min(1, 'Marca obrigatória'),
  model: z.string().min(1, 'Modelo obrigatório'),
  year: z.coerce.number().min(1900, 'Ano inválido').max(new Date().getFullYear() + 1, 'Ano inválido'),
  plate: z.string().min(7, 'Placa inválida'),
  type: z.enum(['carro', 'moto', 'caminhao', 'van', 'onibus', 'outro']),
  status: z.enum(['disponivel', 'alugado', 'reservado', 'manutencao', 'encerrado']),
  rentValue: z.coerce.number().min(1, 'Valor obrigatório'),
  cautionValue: z.coerce.number().optional(),
  ownerId: z.string().min(1, 'Proprietário obrigatório'),
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
          ownerId: vehicle.ownerId,
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
        brand: data.brand,
        model: data.model,
        year: data.year,
        plate: data.plate.toUpperCase().replace(/\s/g, ''),
        type: data.type as VehicleType,
        status: data.status as VehicleStatus,
        rentValue: data.rentValue,
        cautionValue: data.cautionValue,
        ownerId: data.ownerId,
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
        toast({ title: 'Veículo atualizado com sucesso.' })
      } else {
        await createVehicle(payload)
        toast({ title: 'Veículo cadastrado com sucesso.' })
      }
      onSuccess()
    } catch {
      toast({ title: 'Erro ao salvar veículo.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select
            value={watch('type')}
            onValueChange={(v) => setValue('type', v as VehicleType)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="carro">Carro</SelectItem>
              <SelectItem value="moto">Moto</SelectItem>
              <SelectItem value="caminhao">Caminhão</SelectItem>
              <SelectItem value="van">Van</SelectItem>
              <SelectItem value="onibus">Ônibus</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status *</Label>
          <Select
            value={watch('status')}
            onValueChange={(v) => setValue('status', v as VehicleStatus)}
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
          <Label>Marca *</Label>
          {brands.length > 0 ? (
            <Select
              value={watch('brand') || ''}
              onValueChange={(v) => { setValue('brand', v); setValue('model', '') }}
            >
              <SelectTrigger>
                {brandsLoading
                  ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</span>
                  : <SelectValue placeholder="Selecione a marca" />
                }
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {brands.map((b) => (
                  <SelectItem key={b.valor} value={b.nome}>{b.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="Ex: Volkswagen" {...register('brand')} />
          )}
          {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
          {fipeType && <p className="text-xs text-muted-foreground">Marcas da tabela FIPE</p>}
        </div>

        <div className="space-y-2">
          <Label>Modelo *</Label>
          {models.length > 0 ? (
            <Select
              value={watch('model') || ''}
              onValueChange={(v) => setValue('model', v)}
            >
              <SelectTrigger>
                {modelsLoading
                  ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</span>
                  : <SelectValue placeholder="Selecione o modelo" />
                }
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {models.map((m) => (
                  <SelectItem key={m.modelo} value={m.modelo}>{m.modelo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="Ex: Gol 1.0" {...register('model')} />
          )}
          {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
          {brandCode && <p className="text-xs text-muted-foreground">Modelos da tabela FIPE</p>}
        </div>

        <div className="space-y-2">
          <Label>Ano *</Label>
          <Input type="number" placeholder="2020" {...register('year')} />
          {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Placa *</Label>
          <Input placeholder="ABC1D23" maxLength={8} className="uppercase" {...register('plate')} />
          {errors.plate && <p className="text-xs text-destructive">{errors.plate.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Cor</Label>
          <Input placeholder="Prata" {...register('color')} />
        </div>

        <div className="space-y-2">
          <Label>Combustível</Label>
          <Select
            value={watch('fuel') || ''}
            onValueChange={(v) => setValue('fuel', v as FuelType)}
          >
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gasolina">Gasolina</SelectItem>
              <SelectItem value="etanol">Etanol</SelectItem>
              <SelectItem value="flex">Flex</SelectItem>
              <SelectItem value="diesel">Diesel</SelectItem>
              <SelectItem value="gnv">GNV</SelectItem>
              <SelectItem value="eletrico">Elétrico</SelectItem>
              <SelectItem value="hibrido">Híbrido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Quilometragem</Label>
          <Input type="number" placeholder="0" {...register('mileage')} />
        </div>

        <div className="space-y-2">
          <Label>RENAVAM</Label>
          <Input placeholder="00000000000" {...register('renavam')} />
        </div>

        <div className="space-y-2">
          <Label>Chassi</Label>
          <Input placeholder="9BWZZZ..." {...register('chassi')} />
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

      <MultiPhotoUpload
        label="Fotos do veículo"
        value={photos}
        onChange={setPhotos}
        onUpload={(file) => uploadVehiclePhoto(companyId, vehicle?.id ?? 'novos', file)}
      />

      <div className="space-y-2">
        <Label>Observações</Label>
        <Input placeholder="Notas internas..." {...register('notes')} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {vehicle ? 'Salvar Alterações' : 'Cadastrar Veículo'}
        </Button>
      </div>
    </form>
  )
}
