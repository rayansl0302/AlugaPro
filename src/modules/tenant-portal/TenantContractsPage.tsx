import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Search, Eye, Download, Calendar, DollarSign,
  CheckCircle, PenLine, Car, Building2, Loader2, User,
  FileWarning, ShieldAlert, Music,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getContractsByTenant } from '@/services/contracts'
import { getProperties, getProperty } from '@/services/properties'
import { getVehicles, getVehicle } from '@/services/vehicles'
import { getOwners, getOwner } from '@/services/owners'
import { getTenant } from '@/services/tenants'
import { getWarningsByTenant } from '@/services/warnings'
import { Contract, ContractStatus, ContractWarning, Owner, Property, PropertyType, ReadjustmentIndex, Vehicle } from '@/types'
import { formatCurrency, formatDate, formatDateOptional } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getContractSigningStatus } from '@/lib/contractSigning'
import { useTenantContractActions } from '@/hooks/useTenantContractActions'
import { TenantPortalHeader } from './TenantPortalHeader'
import { MaintenanceEntityPhotos } from '@/components/maintenance/MaintenanceEntityPhotos'
import {
  buildMaintenancePhotoLookups,
  resolveChargeEntityPhotos,
} from '@/lib/maintenanceEntityPhotos'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { toast } from '@/hooks/useToast'
import { usePagination } from '@/hooks/usePagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PhotoLightbox } from '@/components/shared/PhotoLightbox'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { PropertyDetail } from '@/modules/properties/PropertyDetail'
import { VehicleDetail } from '@/modules/vehicles/VehicleDetail'
import { OwnerDetail } from '@/modules/owners/OwnerDetail'

const statusConfig: Record<ContractStatus, { label: string; variant: 'success' | 'info' | 'warning' | 'secondary' | 'destructive' }> = {
  ativo: { label: 'Ativo', variant: 'success' },
  renovado: { label: 'Renovado', variant: 'info' },
  encerrado: { label: 'Encerrado', variant: 'secondary' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
}

const readjustmentLabels: Record<ReadjustmentIndex, string> = {
  IGPM: 'IGP-M',
  IPCA: 'IPCA',
  INPC: 'INPC',
  Fixo: 'Taxa fixa',
  Nenhum: 'Sem reajuste',
}

const propertyTypeLabels: Record<PropertyType, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  kitnet: 'Kitnet',
  sala_comercial: 'Sala Comercial',
  galpao: 'Galpão',
  terreno: 'Terreno',
  outro: 'Outro',
}

type StatusFilter = ContractStatus | 'todos' | 'ativos'

const RESCISSION_THRESHOLD = 4

function contractAssetLabel(contract: Contract) {
  return contract.assetType === 'veiculo' ? 'Veículo' : 'Imóvel'
}

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn('text-right', bold && 'font-bold text-primary')}>{value}</span>
    </div>
  )
}

function ContractCard({
  contract,
  photoLookups,
  property,
  vehicle,
  owner,
  warnings,
  onViewProperty,
  onViewVehicle,
  onViewOwner,
}: {
  contract: Contract
  photoLookups: ReturnType<typeof buildMaintenancePhotoLookups>
  property?: Property
  vehicle?: Vehicle
  owner?: Owner
  warnings: ContractWarning[]
  onViewProperty: (contract: Contract, property?: Property) => void
  onViewVehicle: (contract: Contract, vehicle?: Vehicle) => void
  onViewOwner: (contract: Contract, owner?: Owner) => void
}) {
  const { viewContract, downloadContract, isContractLoading } = useTenantContractActions()
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  const signing = getContractSigningStatus(contract)
  const atRisk = warnings.length >= RESCISSION_THRESHOLD
  const entityPhotos = resolveChargeEntityPhotos(
    {
      tenantId: contract.tenantId,
      tenantName: contract.tenantName,
      propertyId: contract.propertyId,
      propertyName: contract.propertyName,
      assetType: contract.assetType,
    },
    photoLookups,
  )
  const sc = statusConfig[contract.status]
  const AssetIcon = contract.assetType === 'veiculo' ? Car : Building2

  const signingLabel =
    signing.state === 'complete'
      ? 'Assinaturas completas'
      : signing.state === 'pending'
        ? `${signing.pendingCount} assinatura(s) pendente(s)`
        : 'Aguardando assinaturas'

  return (
    <AccordionItem value={contract.id} className="border border-[#032B61]/15 rounded-xl bg-white text-card-foreground shadow-sm overflow-hidden">
      <AccordionTrigger className="hover:no-underline px-4 py-4 bg-white border-l-4 border-[#032B61] [&>svg]:ml-3 [&>svg]:text-[#032B61]">
          <div className="flex min-w-0 flex-1 items-start gap-3 text-left">
            <MaintenanceEntityPhotos photos={entityPhotos} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="gap-1 border-0 bg-[#032B61] text-white hover:bg-[#032B61]/90">
                  <AssetIcon className="h-3 w-3" />
                  {contractAssetLabel(contract)}
                </Badge>
                <Badge variant={sc.variant}>{sc.label}</Badge>
                {signing.state === 'complete' && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Assinado
                  </Badge>
                )}
                {warnings.length > 0 && (
                  <Badge variant={atRisk ? 'destructive' : 'warning'} className="gap-1">
                    <FileWarning className="h-3 w-3" />
                    {warnings.length} advertência{warnings.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <p className="mt-1 font-semibold leading-tight">{contract.propertyName ?? '—'}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{contract.contractNumber}</p>
              <p className="text-sm font-bold text-[#032B61] mt-1">{formatCurrency(contract.rentValue)}/mês</p>
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="pb-0">
          <div className="border-t px-4 py-3 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {contract.assetType !== 'veiculo' && contract.propertyId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-[130px] sm:flex-none"
                  onClick={() => onViewProperty(contract, property)}
                >
                  <Building2 className="mr-1.5 h-4 w-4" />
                  Ver {property ? propertyTypeLabels[property.type] : 'imóvel'}
                </Button>
              )}
              {contract.assetType === 'veiculo' && contract.propertyId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-[130px] sm:flex-none"
                  onClick={() => onViewVehicle(contract, vehicle)}
                >
                  <Car className="mr-1.5 h-4 w-4" />
                  Ver veículo
                </Button>
              )}
              {(contract.ownerId || contract.ownerName) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-[130px] sm:flex-none"
                  onClick={() => onViewOwner(contract, owner)}
                >
                  <User className="mr-1.5 h-4 w-4" />
                  Ver proprietário
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 min-w-[130px] sm:flex-none"
                disabled={isContractLoading(contract.id, 'view')}
                onClick={() => viewContract(contract)}
              >
                {isContractLoading(contract.id, 'view')
                  ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  : <Eye className="mr-1.5 h-4 w-4" />}
                Visualizar contrato
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 min-w-[130px] sm:flex-none"
                disabled={isContractLoading(contract.id, 'download')}
                onClick={() => downloadContract(contract)}
              >
                {isContractLoading(contract.id, 'download')
                  ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  : <Download className="mr-1.5 h-4 w-4" />}
                Baixar contrato
              </Button>
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-2 border-t">
          <div className="border-b md:border-b-0 md:border-r p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <AssetIcon className="h-3.5 w-3.5" />
              {contractAssetLabel(contract)}
            </p>
            <DetailRow
              label={contract.assetType === 'veiculo' ? 'Veículo' : 'Imóvel'}
              value={contract.propertyName ?? '—'}
            />
            {property && contract.assetType !== 'veiculo' && (
              <DetailRow label="Tipo" value={propertyTypeLabels[property.type]} />
            )}
            <DetailRow
              label="Proprietário"
              value={contract.ownerName ?? owner?.name ?? '—'}
            />
            <DetailRow label="Início" value={formatDate(contract.startDate)} />
            <DetailRow
              label="Término"
              value={formatDateOptional(contract.endDate, 'Indeterminado')}
            />
            {contract.signedAt && (
              <DetailRow label="Assinado em" value={formatDate(contract.signedAt)} />
            )}
            {contract.templateName && (
              <DetailRow label="Modelo" value={contract.templateName} />
            )}
          </div>

          <div className="p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Valores e condições
            </p>
            <DetailRow label="Aluguel mensal" value={formatCurrency(contract.rentValue)} bold />
            <DetailRow
              label="Dia de vencimento"
              value={`Todo dia ${contract.dueDay}`}
            />
            {contract.cautionValue != null && contract.cautionValue > 0 && (
              <DetailRow label="Caução" value={formatCurrency(contract.cautionValue)} />
            )}
            <DetailRow label="Multa por atraso" value={`${contract.lateFee}%`} />
            <DetailRow label="Juros ao mês" value={`${contract.monthlyInterest}%`} />
            <DetailRow
              label="Reajuste"
              value={
                contract.readjustmentIndex === 'Fixo' && contract.readjustmentFixedRate != null
                  ? `${readjustmentLabels.Fixo} (${contract.readjustmentFixedRate}%)`
                  : readjustmentLabels[contract.readjustmentIndex]
              }
            />
          </div>
        </div>

        <div className="border-t bg-muted/20 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <PenLine className="h-3.5 w-3.5" />
              {signingLabel}
            </span>
            <span className="flex items-center gap-1">
              Locador: {signing.locadorSigned ? 'Assinado' : 'Pendente'}
            </span>
            <span className="flex items-center gap-1">
              Locatário: {signing.locatarioSigned ? 'Assinado' : 'Pendente'}
            </span>
            {signing.witnessesTotal > 0 && (
              <span>
                Testemunhas: {signing.witnessesSigned}/{signing.witnessesTotal}
              </span>
            )}
          </div>
          {contract.notes && (
            <p className="mt-2 text-xs text-muted-foreground border-t pt-2">
              <span className="font-medium text-foreground">Observações: </span>
              {contract.notes}
            </p>
          )}
        </div>

        {warnings.length > 0 && (
          <div className="border-t px-4 py-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileWarning className="h-3.5 w-3.5" />
              Advertências ({warnings.length})
            </p>
            {atRisk && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                Limite de {RESCISSION_THRESHOLD} advertências atingido — conforme cláusula contratual, o proprietário pode rescindir o contrato imediatamente, sem devolução dos valores já pagos.
              </p>
            )}
            {warnings.map((w) => (
              <div key={w.id} className="rounded-lg border p-3">
                {w.clauseReference && (
                  <p className="text-xs font-medium text-primary">{w.clauseReference}</p>
                )}
                <p className="text-sm">{w.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(w.createdAt?.toDate ? w.createdAt.toDate().toISOString() : new Date().toISOString())} — por {w.issuedByName}
                </p>
                {((w.evidencePhotos?.length ?? 0) > 0 || (w.evidenceAudio?.length ?? 0) > 0) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(w.evidencePhotos ?? []).map((url, idx) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setLightbox({ photos: w.evidencePhotos ?? [], index: idx })}
                        className="h-12 w-12 overflow-hidden rounded-md border"
                      >
                        <img src={url} alt="Prova" className="h-full w-full object-cover" />
                      </button>
                    ))}
                    {(w.evidenceAudio?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Music className="h-3.5 w-3.5" /> {w.evidenceAudio?.length} áudio(s)
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </AccordionContent>

        <PhotoLightbox
          photos={lightbox?.photos ?? []}
          open={!!lightbox}
          startIndex={lightbox?.index ?? 0}
          onClose={() => setLightbox(null)}
        />
    </AccordionItem>
  )
}

export function TenantContractsPage() {
  const { user } = useAuth()
  const companyId = user?.companyId ?? ''
  const tenantId = user?.tenantId ?? user?.id ?? ''

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [viewProperty, setViewProperty] = useState<Property | null>(null)
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null)
  const [viewOwner, setViewOwner] = useState<Owner | null>(null)

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', companyId, tenantId],
    queryFn: () => getContractsByTenant(companyId, tenantId),
    enabled: !!companyId && !!tenantId,
  })

  const { data: tenantProfile } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => getTenant(tenantId),
    enabled: !!tenantId,
  })

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

  const { data: owners = [] } = useQuery({
    queryKey: ['owners', companyId],
    queryFn: () => getOwners(companyId),
    enabled: !!companyId,
  })

  const { data: warnings = [] } = useQuery({
    queryKey: ['warnings', companyId, tenantId],
    queryFn: () => getWarningsByTenant(companyId, tenantId),
    enabled: !!companyId && !!tenantId,
  })

  const warningsByContract = useMemo(() => {
    const map: Record<string, ContractWarning[]> = {}
    warnings.forEach((w) => {
      if (!map[w.contractId]) map[w.contractId] = []
      map[w.contractId].push(w)
    })
    return map
  }, [warnings])

  const propertyById = useMemo(() => {
    const map: Record<string, Property> = {}
    properties.forEach((p) => { map[p.id] = p })
    return map
  }, [properties])

  const vehicleById = useMemo(() => {
    const map: Record<string, Vehicle> = {}
    vehicles.forEach((v) => { map[v.id] = v })
    return map
  }, [vehicles])

  const ownerById = useMemo(() => {
    const map: Record<string, Owner> = {}
    owners.forEach((o) => { map[o.id] = o })
    return map
  }, [owners])

  const photoLookups = useMemo(() => {
    const tenants = tenantProfile ? [tenantProfile] : []
    return buildMaintenancePhotoLookups(properties, vehicles, tenants)
  }, [properties, vehicles, tenantProfile])

  const sortedContracts = useMemo(
    () =>
      [...contracts].sort((a, b) => {
        const order: Record<ContractStatus, number> = { ativo: 0, renovado: 1, encerrado: 2, cancelado: 3 }
        const diff = order[a.status] - order[b.status]
        if (diff !== 0) return diff
        return b.startDate.localeCompare(a.startDate)
      }),
    [contracts],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return sortedContracts.filter((c) => {
      const matchSearch =
        !q ||
        c.contractNumber.toLowerCase().includes(q) ||
        c.propertyName?.toLowerCase().includes(q) ||
        c.ownerName?.toLowerCase().includes(q)
      const matchStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'ativos' && (c.status === 'ativo' || c.status === 'renovado')) ||
        c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [sortedContracts, search, statusFilter])

  const pag = usePagination(filtered, 8)

  const activeCount = contracts.filter((c) => c.status === 'ativo' || c.status === 'renovado').length
  const endedCount = contracts.filter((c) => c.status === 'encerrado' || c.status === 'cancelado').length

  const openPropertyView = async (contract: Contract, cached?: Property) => {
    if (cached) {
      setViewProperty(cached)
      return
    }
    try {
      const fetched = await getProperty(contract.propertyId)
      if (fetched) setViewProperty(fetched)
      else toast({ title: 'Imóvel não disponível.', variant: 'destructive' })
    } catch {
      toast({ title: 'Erro ao carregar imóvel.', variant: 'destructive' })
    }
  }

  const openVehicleView = async (contract: Contract, cached?: Vehicle) => {
    if (cached) {
      setViewVehicle(cached)
      return
    }
    try {
      const fetched = await getVehicle(contract.propertyId)
      if (fetched) setViewVehicle(fetched)
      else toast({ title: 'Veículo não disponível.', variant: 'destructive' })
    } catch {
      toast({ title: 'Erro ao carregar veículo.', variant: 'destructive' })
    }
  }

  const openOwnerView = async (contract: Contract, cached?: Owner) => {
    if (cached) {
      setViewOwner(cached)
      return
    }
    if (!contract.ownerId) {
      toast({ title: 'Proprietário não disponível.', variant: 'destructive' })
      return
    }
    try {
      const fetched = await getOwner(contract.ownerId)
      if (fetched) setViewOwner(fetched)
      else toast({ title: 'Proprietário não disponível.', variant: 'destructive' })
    } catch {
      toast({ title: 'Erro ao carregar proprietário.', variant: 'destructive' })
    }
  }

  return (
    <div className="light pb-safe min-h-screen bg-white">
      <TenantPortalHeader />

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[#032B61]">Seus contratos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consulte detalhes, vigência, valores e documentos dos seus contratos de locação.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="border border-[#032B61]/10 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#032B61]/10 text-[#032B61]">
                <CheckCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Ativos</p>
                <p className="text-lg font-bold">{activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-[#032B61]/10 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#032B61]/10 text-[#032B61]">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-lg font-bold">{contracts.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-[#032B61]/10 shadow-sm bg-white col-span-2 sm:col-span-1">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#032B61]/10 text-[#032B61]">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Encerrados</p>
                <p className="text-lg font-bold">{endedCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contrato, imóvel ou proprietário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {([
              ['todos', 'Todos'],
              ['ativos', 'Ativos'],
              ['encerrado', 'Encerrados'],
              ['cancelado', 'Cancelados'],
            ] as const).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={statusFilter === value ? 'default' : 'outline'}
                className={statusFilter === value ? 'bg-[#032B61] text-white hover:bg-[#032B61]/90' : 'border-[#032B61]/20 text-[#032B61] hover:bg-[#032B61]/5'}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white dark:bg-gray-900 py-20 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold">Nenhum contrato encontrado</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {contracts.length === 0
                ? 'Quando um contrato for vinculado ao seu cadastro, ele aparecerá aqui.'
                : 'Tente outro filtro ou termo de busca.'}
            </p>
          </div>
        ) : (
          <>
            <Accordion type="multiple" className="space-y-4">
              {pag.pageItems.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  photoLookups={photoLookups}
                  property={propertyById[contract.propertyId]}
                  vehicle={vehicleById[contract.propertyId]}
                  owner={ownerById[contract.ownerId]}
                  warnings={warningsByContract[contract.id] ?? []}
                  onViewProperty={openPropertyView}
                  onViewVehicle={openVehicleView}
                  onViewOwner={openOwnerView}
                />
              ))}
            </Accordion>
            <Pagination
              page={pag.page}
              totalPages={pag.totalPages}
              total={pag.total}
              rangeStart={pag.rangeStart}
              rangeEnd={pag.rangeEnd}
              onPageChange={pag.setPage}
              itemLabel="contratos"
            />
          </>
        )}
      </main>

      <Dialog open={!!viewProperty} onOpenChange={() => setViewProperty(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do imóvel</DialogTitle>
          </DialogHeader>
          {viewProperty && <PropertyDetail property={viewProperty} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewVehicle} onOpenChange={() => setViewVehicle(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do veículo</DialogTitle>
          </DialogHeader>
          {viewVehicle && <VehicleDetail vehicle={viewVehicle} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewOwner} onOpenChange={() => setViewOwner(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do proprietário</DialogTitle>
          </DialogHeader>
          {viewOwner && <OwnerDetail owner={viewOwner} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
