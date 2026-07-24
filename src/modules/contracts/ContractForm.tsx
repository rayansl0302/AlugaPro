import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload, FileText, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Contract, ContractAssetType, ReadjustmentIndex } from '@/types'
import {
  createContract,
  updateContract,
  linkContractToAsset,
  releaseContractAsset,
} from '@/services/contracts'
import { uploadContractDocument } from '@/services/storage'
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
import { requiredString } from '@/lib/validation'
import { fieldErrorClass } from '@/lib/formErrors'
import { toast } from '@/hooks/useToast'

const schema = z
  .object({
    assetType: z.enum(['imovel', 'veiculo', 'equipamento']).default('imovel'),
    propertyId: requiredString('Selecione o imóvel ou veículo'),
    propertyName: z.string().optional(),
    tenantId: requiredString('Selecione o inquilino'),
    tenantName: z.string().optional(),
    ownerId: requiredString('O bem selecionado não possui proprietário'),
    ownerName: z.string().optional(),
    startDate: requiredString('Data de início obrigatória'),
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
  /** Abre o form com a seção de anexar PDF em destaque (fluxo "Importar contrato"). */
  startInImport?: boolean
  onSuccess: () => void
}

export function ContractForm({ contract, companyId, startInImport, onSuccess }: Props) {
  const { t } = useTranslation('contracts')
  const { t: tCommon } = useTranslation('common')
  const [loading, setLoading] = useState(false)

  // Contrato importado: PDF já existente que o cliente anexa só pra gerenciar.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  // URL do PDF já salvo (quando editando um contrato importado). Fica null se
  // o usuário remover o anexo existente pra substituí-lo.
  const [existingPdfUrl, setExistingPdfUrl] = useState(contract?.externalPdfUrl ?? '')

  // Fluxo "Importar contrato": a seção de anexo é renderizada no topo do form
  // (mais confiável que scrollIntoView dentro do Radix Dialog) e destacada
  // com um ring por alguns segundos pra chamar atenção.
  const [importHighlight, setImportHighlight] = useState(false)
  useEffect(() => {
    if (!startInImport) return
    setImportHighlight(true)
    const timer = setTimeout(() => setImportHighlight(false), 2800)
    return () => clearTimeout(timer)
  }, [startInImport])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
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
      const willBeImported = !!(importFile || existingPdfUrl)
      // Anexo removido na edição (era importado e não há mais arquivo): limpa a URL.
      const clearingExternalPdf = !!contract?.externalPdfUrl && !existingPdfUrl && !importFile
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
        isImported: willBeImported,
        ...(clearingExternalPdf ? { externalPdfUrl: '' } : {}),
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
      } else {
        contractId = await createContract(payload)
        // Gera as cobranças de aluguel automaticamente. Importado não gera
        // retroativas (histórico já pago fora da plataforma) — só do mês atual.
        const fullContract = { ...payload, id: contractId, status: 'ativo' as const }
        const count = await generateChargesForContract(
          fullContract as Contract,
          willBeImported ? { fromDate: new Date().toISOString().slice(0, 10) } : undefined,
        )
        toast({ title: t('toast.createdWithCharges', { count }) })
      }

      // Upload do PDF importado só depois de ter o contractId (path do arquivo).
      if (importFile) {
        const url = await uploadContractDocument(companyId, contractId, importFile, 'importado')
        await updateContract(contractId, { externalPdfUrl: url, isImported: true })
      }

      if (contract) toast({ title: t('toast.updatedShort') })

      await linkContractToAsset(
        { assetType: data.assetType, assetId: data.propertyId },
        { contractId, tenantId: data.tenantId, tenantName: data.tenantName, setRented: isActive }
      )

      onSuccess()
    } catch {
      toast({ title: t('toast.saveError'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Campos de "termo" do contrato (caução, multa, juros, reajuste). No fluxo
  // normal ficam inline no grid; no fluxo importar vão pro "avançado" opcional,
  // pois já constam no PDF anexado.
  const termFields = (
    <>
      <div className="space-y-2">
        <Label>{t('form.deposit')}</Label>
        <Input type="number" step="0.01" {...register('cautionValue')} />
      </div>
      <div className="space-y-2">
        <Label>{t('form.lateFee')}</Label>
        <Input type="number" step="0.01" min={0} max={10} {...register('lateFee')} />
      </div>
      <div className="space-y-2">
        <Label>{t('form.monthlyInterest')}</Label>
        <Input type="number" step="0.01" min={0} max={5} {...register('monthlyInterest')} />
      </div>
      <div className="space-y-2">
        <Label>{t('form.readjustmentIndex')}</Label>
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
            <SelectItem value="Nenhum">{tCommon('ui.none')}</SelectItem>
          </SelectContent>
        </Select>
        {currentIndex?.value != null && (
          <p className="text-xs text-muted-foreground">
            {t('form.indexRef', { name: currentIndex.name, value: currentIndex.value.toFixed(2), date: currentIndex.referenceDate })}
          </p>
        )}
      </div>
    </>
  )

  // Seção de anexo do contrato importado. Renderizada no topo (fluxo "Importar")
  // ou no rodapé (fluxo "Novo contrato" comum).
  const importSection = (
    <div
      className={`rounded-lg border border-dashed bg-muted/30 p-4 transition-all ${importHighlight ? 'border-primary ring-2 ring-primary/40' : ''}`}
    >
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t('import.title')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('import.description')}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) { setImportFile(file); setExistingPdfUrl('') }
            }}
          />

          {importFile || existingPdfUrl ? (
            <div className="mt-3 flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <FileText className="h-4 w-4 shrink-0 text-red-500" />
              <span className="min-w-0 flex-1 truncate text-xs">
                {importFile ? importFile.name : t('import.currentFile')}
              </span>
              {existingPdfUrl && !importFile && (
                <a href={existingPdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                  {t('import.view')}
                </a>
              )}
              <button
                type="button"
                onClick={() => { setImportFile(null); setExistingPdfUrl(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="text-muted-foreground hover:text-destructive"
                title={t('import.remove')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t('import.selectPdf')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {startInImport && importSection}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('form.assetType')}</Label>
          <Select value={assetType} onValueChange={(v) => handleAssetTypeChange(v as ContractAssetType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="imovel">{t('form.property')}</SelectItem>
              <SelectItem value="veiculo">{t('form.vehicle')}</SelectItem>
              <SelectItem value="equipamento">{t('form.equipment')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            {assetType === 'veiculo' ? t('form.vehicleRequired') : assetType === 'equipamento' ? t('form.equipmentRequired') : t('form.propertyRequired')}
          </Label>
          <Select value={watch('propertyId') || ''} onValueChange={handleAssetSelect}>
            <SelectTrigger>
              <SelectValue placeholder={
                assetType === 'veiculo' ? t('form.selectVehicle')
                  : assetType === 'equipamento' ? t('form.selectEquipment')
                  : t('form.selectProperty')
              } />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {/* Bens removidos (archived) não podem receber novo contrato/cobrança. */}
              {assetType === 'veiculo'
                ? vehicles.filter((v) => !v.archived).map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate}</SelectItem>
                  ))
                : assetType === 'equipamento'
                ? equipments.filter((eq) => !eq.archived).map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name} — {eq.model}</SelectItem>
                  ))
                : properties.filter((p) => !p.archived).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.code}</SelectItem>
                  ))}
            </SelectContent>
          </Select>
          {errors.propertyId && <p className="text-xs text-destructive">{errors.propertyId.message}</p>}
          {ownerName && <p className="text-xs text-muted-foreground">{t('form.ownerPrefix', { name: ownerName })}</p>}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>{t('form.tenantRequired')}</Label>
          <Select value={watch('tenantId') || ''} onValueChange={handleTenantSelect}>
            <SelectTrigger>
              <SelectValue placeholder={t('form.selectTenant')} />
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
          <Label>{t('form.startDateRequired')}</Label>
          <Input type="date" className={fieldErrorClass(errors.startDate)} {...register('startDate')} />
          {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('form.endDateLabel')} {!noEndDate && '*'}</Label>
          <Input type="date" disabled={noEndDate} className={fieldErrorClass(errors.endDate)} {...register('endDate')} />
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
            {t('form.noEndDate')}
          </label>
          {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('form.rentValueRequired')}</Label>
          <Input type="number" step="0.01" className={fieldErrorClass(errors.rentValue)} {...register('rentValue')} />
          {errors.rentValue && <p className="text-xs text-destructive">{errors.rentValue.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('form.dueDayRequired')}</Label>
          <Input type="number" min={1} max={28} {...register('dueDay')} />
        </div>
        {/* Modo normal: termos inline no grid. Modo importar: escondidos aqui
            e movidos pro "avançado" opcional abaixo (já estão no PDF). */}
        {!startInImport && termFields}
      </div>

      {startInImport && (
        <details className="rounded-lg border bg-muted/20 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            {t('import.advancedTitle')}
          </summary>
          <p className="mt-1 text-xs text-muted-foreground">{t('import.advancedDescription')}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {termFields}
          </div>
        </details>
      )}

      {!startInImport && importSection}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {contract ? t('form.saveChanges') : t('form.create')}
        </Button>
      </div>
    </form>
  )
}
