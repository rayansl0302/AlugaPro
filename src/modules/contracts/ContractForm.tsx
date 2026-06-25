import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Contract, ContractAssetType, ReadjustmentIndex } from '@/types'
import {
  createContract,
  updateContract,
  linkContractToAsset,
  releaseContractAsset,
} from '@/services/contracts'
import { generateChargesForContract } from '@/services/charges'
import { getProperties } from '@/services/properties'
import { getVehicles } from '@/services/vehicles'
import { getEquipments } from '@/services/equipments'
import { getTenants } from '@/services/tenants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useReadjustmentIndices } from '@/hooks/useReadjustmentIndices'
import { toast } from '@/hooks/useToast'

const schema = z
  .object({
    assetType: z.enum(['imovel', 'veiculo', 'equipamento']).default('imovel'),
    propertyId: z.string().min(1, 'Selecione o imóvel ou veículo'),
    propertyName: z.string().optional(),
    tenantId: z.string().min(1, 'Selecione o inquilino'),
    tenantName: z.string().optional(),
    ownerId: z.string().min(1, 'O bem selecionado não possui proprietário'),
    ownerName: z.string().optional(),
    startDate: z.string().min(1, 'Data de início obrigatória'),
    endDate: z.string().optional(),
    noEndDate: z.boolean().default(false),
    rentValue: z.coerce.number().min(1, 'Valor obrigatório'),
    dueDay: z.coerce.number().min(1).max(28),
    cautionValue: z.coerce.number().optional(),
    lateFee: z.coerce.number().min(0).max(10).default(2),
    monthlyInterest: z.coerce.number().min(0).max(5).default(1),
    readjustmentIndex: z.enum(['IGPM', 'IPCA', 'INPC', 'Fixo', 'Nenhum']).default('IGPM'),
  })
  .refine((d) => d.noEndDate || !!d.endDate, {
    message: 'Data de término obrigatória',
    path: ['endDate'],
  })

type FormData = z.infer<typeof schema>

interface Props {
  contract?: Contract | null
  companyId: string
  onSuccess: () => void
}

export function ContractForm({ contract, companyId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: contract
      ? {
          assetType: contract.assetType ?? 'imovel',
          propertyId: contract.propertyId,
          propertyName: contract.propertyName,
          tenantId: contract.tenantId,
          tenantName: contract.tenantName,
          ownerId: contract.ownerId,
          ownerName: contract.ownerName,
          startDate: contract.startDate,
          endDate: contract.endDate,
          noEndDate: !contract.endDate,
          rentValue: contract.rentValue,
          dueDay: contract.dueDay,
          cautionValue: contract.cautionValue,
          lateFee: contract.lateFee,
          monthlyInterest: contract.monthlyInterest,
          readjustmentIndex: contract.readjustmentIndex,
        }
      : { assetType: 'imovel', noEndDate: false, lateFee: 2, monthlyInterest: 1, dueDay: 5, readjustmentIndex: 'IGPM' },
  })

  const assetType = watch('assetType')
  const noEndDate = watch('noEndDate')

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', companyId],
    queryFn: () => getProperties(companyId),
    enabled: !!companyId,
  })
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', companyId],
    queryFn: () => getVehicles(companyId),
    enabled: !!companyId,
  })
  const { data: equipments = [] } = useQuery({
    queryKey: ['equipments', companyId],
    queryFn: () => getEquipments(companyId),
    enabled: !!companyId,
  })
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants', companyId],
    queryFn: () => getTenants(companyId),
    enabled: !!companyId,
  })

  const { data: indices = [] } = useReadjustmentIndices()
  const selectedIndex = watch('readjustmentIndex')
  const indexNameMap: Record<string, string> = { IGPM: 'IGP-M', IPCA: 'IPCA', INPC: 'INPC' }
  const currentIndex = indices.find((i) => i.name === indexNameMap[selectedIndex])

  const ownerName = watch('ownerName')

  const handleAssetTypeChange = (value: ContractAssetType) => {
    setValue('assetType', value)
    setValue('propertyId', '')
    setValue('propertyName', '')
    setValue('ownerId', '')
    setValue('ownerName', '')
  }

  const handleAssetSelect = (assetId: string) => {
    if (assetType === 'veiculo') {
      const v = vehicles.find((item) => item.id === assetId)
      if (!v) return
      setValue('propertyId', v.id)
      setValue('propertyName', `${v.brand} ${v.model} — ${v.plate}`)
      setValue('ownerId', v.ownerId)
      setValue('ownerName', v.ownerName ?? '')
      if (!contract) {
        setValue('rentValue', v.rentValue)
        if (v.cautionValue) setValue('cautionValue', v.cautionValue)
      }
    } else if (assetType === 'equipamento') {
      const eq = equipments.find((item) => item.id === assetId)
      if (!eq) return
      setValue('propertyId', eq.id)
      setValue('propertyName', `${eq.name} — ${eq.model}`)
      setValue('ownerId', eq.ownerId)
      setValue('ownerName', eq.ownerName ?? '')
      if (!contract) {
        setValue('rentValue', eq.rentValue)
        if (eq.cautionValue) setValue('cautionValue', eq.cautionValue)
      }
    } else {
      const p = properties.find((item) => item.id === assetId)
      if (!p) return
      setValue('propertyId', p.id)
      setValue('propertyName', p.name)
      setValue('ownerId', p.ownerId)
      setValue('ownerName', p.ownerName ?? '')
      if (!contract) {
        setValue('rentValue', p.rentValue)
        if (p.cautionValue) setValue('cautionValue', p.cautionValue)
      }
    }
  }

  const handleTenantSelect = (tenantId: string) => {
    const t = tenants.find((item) => item.id === tenantId)
    setValue('tenantId', tenantId)
    setValue('tenantName', t?.name ?? '')
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const status = contract?.status ?? 'ativo'
      const isActive = status === 'ativo' || status === 'renovado'
      const payload = {
        companyId,
        status,
        assetType: data.assetType,
        propertyId: data.propertyId,
        propertyName: data.propertyName,
        tenantId: data.tenantId,
        tenantName: data.tenantName,
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        startDate: data.startDate,
        endDate: data.noEndDate ? '' : (data.endDate ?? ''),
        rentValue: data.rentValue,
        dueDay: data.dueDay,
        cautionValue: data.cautionValue,
        lateFee: data.lateFee,
        monthlyInterest: data.monthlyInterest,
        readjustmentIndex: data.readjustmentIndex as ReadjustmentIndex,
      }

      let contractId: string
      if (contract) {
        const oldAssetType = contract.assetType ?? 'imovel'
        if (contract.propertyId && contract.propertyId !== data.propertyId) {
          await releaseContractAsset(
            { assetType: oldAssetType, assetId: contract.propertyId },
            contract.tenantId
          )
        }
        await updateContract(contract.id, payload)
        contractId = contract.id
        toast({ title: 'Contrato atualizado.' })
      } else {
        contractId = await createContract(payload)
        // Generate rent charges from startDate to today automatically
        const fullContract = { ...payload, id: contractId, status: 'ativo' as const }
        const count = await generateChargesForContract(fullContract)
        toast({ title: `Contrato criado com ${count} cobranças geradas.` })
      }

      await linkContractToAsset(
        { assetType: data.assetType, assetId: data.propertyId },
        { contractId, tenantId: data.tenantId, tenantName: data.tenantName, setRented: isActive }
      )

      onSuccess()
    } catch {
      toast({ title: 'Erro ao salvar contrato.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo de Bem *</Label>
          <Select value={assetType} onValueChange={(v) => handleAssetTypeChange(v as ContractAssetType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="imovel">Imóvel</SelectItem>
              <SelectItem value="veiculo">Veículo</SelectItem>
              <SelectItem value="equipamento">Equipamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            {assetType === 'veiculo' ? 'Veículo *' : assetType === 'equipamento' ? 'Equipamento *' : 'Imóvel *'}
          </Label>
          <Select value={watch('propertyId') || ''} onValueChange={handleAssetSelect}>
            <SelectTrigger>
              <SelectValue placeholder={
                assetType === 'veiculo' ? 'Selecione o veículo'
                  : assetType === 'equipamento' ? 'Selecione o equipamento'
                  : 'Selecione o imóvel'
              } />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {assetType === 'veiculo'
                ? vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</SelectItem>
                  ))
                : assetType === 'equipamento'
                ? equipments.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name} — {eq.model}</SelectItem>
                  ))
                : properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.code}</SelectItem>
                  ))}
            </SelectContent>
          </Select>
          {errors.propertyId && <p className="text-xs text-destructive">{errors.propertyId.message}</p>}
          {ownerName && <p className="text-xs text-muted-foreground">Proprietário: {ownerName}</p>}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Inquilino *</Label>
          <Select value={watch('tenantId') || ''} onValueChange={handleTenantSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o inquilino" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.tenantId && <p className="text-xs text-destructive">{errors.tenantId.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Data de Início *</Label>
          <Input type="date" {...register('startDate')} />
          {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Data de Término {!noEndDate && '*'}</Label>
          <Input type="date" disabled={noEndDate} {...register('endDate')} />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-input"
              checked={noEndDate}
              onChange={(e) => {
                setValue('noEndDate', e.target.checked)
                if (e.target.checked) setValue('endDate', '')
              }}
            />
            Prazo indeterminado (sem data de término)
          </label>
          {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Valor do Aluguel *</Label>
          <Input type="number" step="0.01" {...register('rentValue')} />
          {errors.rentValue && <p className="text-xs text-destructive">{errors.rentValue.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Dia do Vencimento *</Label>
          <Input type="number" min={1} max={28} {...register('dueDay')} />
        </div>
        <div className="space-y-2">
          <Label>Caução (R$)</Label>
          <Input type="number" step="0.01" {...register('cautionValue')} />
        </div>
        <div className="space-y-2">
          <Label>Multa por Atraso (%)</Label>
          <Input type="number" step="0.01" min={0} max={10} {...register('lateFee')} />
        </div>
        <div className="space-y-2">
          <Label>Juros Mensais (%)</Label>
          <Input type="number" step="0.01" min={0} max={5} {...register('monthlyInterest')} />
        </div>
        <div className="space-y-2">
          <Label>Índice de Reajuste</Label>
          <Select
            value={watch('readjustmentIndex')}
            onValueChange={(v) => setValue('readjustmentIndex', v as ReadjustmentIndex)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="IGPM">IGPM</SelectItem>
              <SelectItem value="IPCA">IPCA</SelectItem>
              <SelectItem value="INPC">INPC</SelectItem>
              <SelectItem value="Fixo">Fixo</SelectItem>
              <SelectItem value="Nenhum">Nenhum</SelectItem>
            </SelectContent>
          </Select>
          {currentIndex?.value != null && (
            <p className="text-xs text-muted-foreground">
              {currentIndex.name} atual: {currentIndex.value.toFixed(2)}% — ref. {currentIndex.referenceDate} (Banco Central)
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {contract ? 'Salvar Alterações' : 'Criar Contrato'}
        </Button>
      </div>
    </form>
  )
}
