import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, FileText, Edit, Eye, Calendar, DollarSign, PenLine, CheckCircle, Clock, Users, Lock, LockKeyhole, ListFilter, ChevronDown, Check, FileWarning } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getContracts, updateContract, linkContractToAsset, releaseContractAsset } from '@/services/contracts'
import { getTenants } from '@/services/tenants'
import { getProperties } from '@/services/properties'
import { getVehicles } from '@/services/vehicles'
import { getEquipments } from '@/services/equipments'
import { getWarningsByCompany } from '@/services/warnings'
import { Contract, ContractStatus, Property, Tenant, Vehicle, Equipment } from '@/types'
import { formatCurrency, formatDate, formatDateOptional } from '@/lib/utils'
import { getContractSigningStatus } from '@/lib/contractSigning'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton, StatCardsSkeleton } from '@/components/ui/skeleton'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { ContractForm } from './ContractForm'
import { ContractSignFlow } from './ContractSignFlow'
import { TenantDetail } from '../tenants/TenantDetail'
import { PropertyDetail } from '../properties/PropertyDetail'
import { VehicleDetail } from '../vehicles/VehicleDetail'
import { EquipmentDetail } from '../equipment/EquipmentDetail'

const statusVariants: Record<ContractStatus, 'success' | 'info' | 'warning' | 'secondary' | 'destructive'> = {
  ativo: 'success',
  renovado: 'info',
  encerrado: 'secondary',
  cancelado: 'destructive',
}

export function ContractsPage() {
  const { t } = useTranslation('contracts')
  const { user } = useAuth()
  const qc = useQueryClient()
  const statusConfig = (['ativo', 'renovado', 'encerrado', 'cancelado'] as ContractStatus[]).reduce(
    (acc, s) => {
      acc[s] = { label: t(`statuses.${s}`), variant: statusVariants[s] }
      return acc
    },
    {} as Record<ContractStatus, { label: string; variant: 'success' | 'info' | 'warning' | 'secondary' | 'destructive' }>,
  )
  const companyId = user?.companyId ?? ''
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [signingContract, setSigningContract] = useState<Contract | null>(null)
  const [signFlowEdit, setSignFlowEdit] = useState(false)
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null)
  const [viewProperty, setViewProperty] = useState<Property | null>(null)
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null)
  const [viewEquipment, setViewEquipment] = useState<Equipment | null>(null)

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', companyId],
    queryFn: () => getContracts(companyId),
    enabled: !!companyId,
  })

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants', companyId],
    queryFn: () => getTenants(companyId),
    enabled: !!companyId,
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

  const { data: equipments = [] } = useQuery({
    queryKey: ['equipments', companyId],
    queryFn: () => getEquipments(companyId),
    enabled: !!companyId,
  })

  const { data: warnings = [] } = useQuery({
    queryKey: ['warnings', companyId],
    queryFn: () => getWarningsByCompany(companyId),
    enabled: !!companyId,
  })

  const warningCountByContract = useMemo(() => {
    const map: Record<string, number> = {}
    warnings.forEach((w) => { map[w.contractId] = (map[w.contractId] ?? 0) + 1 })
    return map
  }, [warnings])

  const tenantById = useMemo(() => {
    const map: Record<string, Tenant> = {}
    tenants.forEach((t) => { map[t.id] = t })
    return map
  }, [tenants])

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

  const equipmentById = useMemo(() => {
    const map: Record<string, Equipment> = {}
    equipments.forEach((eq) => { map[eq.id] = eq })
    return map
  }, [equipments])

  const openContractAsset = (contract: Contract) => {
    if (contract.assetType === 'veiculo') {
      const vehicle = vehicleById[contract.propertyId]
      if (vehicle) setViewVehicle(vehicle)
      return
    }
    if (contract.assetType === 'equipamento') {
      const equipment = equipmentById[contract.propertyId]
      if (equipment) setViewEquipment(equipment)
      return
    }
    const property = propertyById[contract.propertyId]
    if (property) setViewProperty(property)
  }

  const filtered = contracts.filter((c) => {
    const matchSearch =
      c.tenantName?.toLowerCase().includes(search.toLowerCase()) ||
      c.propertyName?.toLowerCase().includes(search.toLowerCase()) ||
      c.contractNumber.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const pag = usePagination(filtered, 10)

  const handleMarkComplete = async (contract: Contract) => {
    if (!window.confirm(t('toast.markCompleteConfirm'))) return
    try {
      await updateContract(contract.id, { locked: true, lockedAt: new Date().toISOString() })
      qc.invalidateQueries({ queryKey: ['contracts'] })
      toast({ title: t('toast.markedComplete') })
    } catch {
      toast({ title: t('toast.markCompleteError'), variant: 'destructive' })
    }
  }

  const handleStatusChange = async (contract: Contract, status: ContractStatus) => {
    try {
      await updateContract(contract.id, { status })
      const ref = { assetType: contract.assetType ?? 'imovel', assetId: contract.propertyId }
      if (status === 'encerrado' || status === 'cancelado') {
        await releaseContractAsset(ref, contract.tenantId)
      } else if (status === 'ativo' || status === 'renovado') {
        await linkContractToAsset(ref, {
          contractId: contract.id,
          tenantId: contract.tenantId,
          tenantName: contract.tenantName,
          setRented: true,
        })
      }
      qc.invalidateQueries({ queryKey: ['contracts'] })
      qc.invalidateQueries({ queryKey: ['properties'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast({ title: t('toast.statusUpdated') })
    } catch {
      toast({ title: t('toast.statusError'), variant: 'destructive' })
    }
  }

  const renderContractActions = (contract: Contract, signing: ReturnType<typeof getContractSigningStatus>) => (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={contract.locked}
        onClick={() => { setEditingContract(contract); setShowForm(true) }}
        title={contract.locked ? t('actions.locked') : t('actions.edit')}
      >
        <Edit className="h-3 w-3" />
      </Button>
      {!contract.isImported && (
        <Button
          variant="ghost"
          size="sm"
          disabled={contract.locked}
          title={contract.locked ? t('actions.locked') : t('actions.completeData')}
          onClick={() => { setSignFlowEdit(true); setSigningContract(contract) }}
        >
          <Users className="h-3.5 w-3.5" />
        </Button>
      )}
      {contract.locked ? (
        <Button variant="ghost" size="sm" className="text-green-600" disabled title={t('actions.lockedDone')}>
          <LockKeyhole className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          title={t('actions.markComplete')}
          onClick={() => handleMarkComplete(contract)}
        >
          <Lock className="h-3.5 w-3.5" />
        </Button>
      )}
      {signing.state === 'external' ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-600"
          title={t('imported.viewDocument')}
          disabled={!contract.externalPdfUrl}
          onClick={() => contract.externalPdfUrl && window.open(contract.externalPdfUrl, '_blank')}
        >
          <FileText className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          title={
            signing.state === 'complete'
              ? t('actions.signedView')
              : signing.state === 'pending'
                ? t('actions.pendingSignatures', { count: signing.pendingCount })
                : t('actions.sign')
          }
          className={
            signing.state === 'complete'
              ? 'text-green-600'
              : signing.state === 'pending'
                ? 'text-amber-500'
                : 'text-primary'
          }
          onClick={() => { setSignFlowEdit(false); setSigningContract(contract) }}
        >
          {signing.state === 'complete'
            ? <CheckCircle className="h-3.5 w-3.5" />
            : signing.state === 'pending'
              ? <Clock className="h-3.5 w-3.5" />
              : <PenLine className="h-3.5 w-3.5" />
          }
        </Button>
      )}
      {contract.status === 'ativo' && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => handleStatusChange(contract, 'encerrado')}
        >
          {t('close')}
        </Button>
      )}
    </>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholderShort')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 sm:w-64"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="justify-between gap-2">
                <span className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4" />
                  {statusFilter === 'todos' ? t('filters.all') : statusConfig[statusFilter as ContractStatus].label}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(['todos', 'ativo', 'renovado', 'encerrado', 'cancelado'] as const).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="justify-between gap-4">
                  {s === 'todos' ? t('filters.all') : statusConfig[s].label}
                  {statusFilter === s && <Check className="h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button onClick={() => { setEditingContract(null); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" /> {t('newContract')}
        </Button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['ativo', 'renovado', 'encerrado', 'cancelado'] as ContractStatus[]).map((s) => (
            <Card key={s} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter(s)}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{contracts.filter((c) => c.status === s).length}</p>
                <p className="text-xs text-muted-foreground">{statusConfig[s].label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">{t('empty.noResults')}</p>
          <Button className="mt-4" onClick={() => { setEditingContract(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> {t('newContract')}
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile — cards */}
          <div className="space-y-3 md:hidden">
            {pag.pageItems.map((contract) => {
              const sc = statusConfig[contract.status]
              const signing = getContractSigningStatus(contract)
              return (
                <Card key={contract.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-sm font-medium">{contract.contractNumber}</span>
                      <div className="flex items-center gap-1.5">
                        {warningCountByContract[contract.id] > 0 && (
                          <Link to="/advertencias" title={t('actions.viewWarnings')}>
                            <Badge variant={warningCountByContract[contract.id] >= 4 ? 'destructive' : 'warning'} className="gap-1">
                              <FileWarning className="h-3 w-3" />
                              {warningCountByContract[contract.id]}
                            </Badge>
                          </Link>
                        )}
                        {contract.isImported && (
                          <Badge variant="outline" className="gap-1 text-blue-600">
                            <FileText className="h-3 w-3" />
                            {t('imported.badge')}
                          </Badge>
                        )}
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">{t('tenantLabel')}</span>
                        <span className="truncate">{contract.tenantName || '—'}</span>
                        {contract.tenantId && tenantById[contract.tenantId] && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground"
                            title={t('actions.viewTenant')}
                            onClick={() => setViewTenant(tenantById[contract.tenantId])}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">{t('assetLabel')}</span>
                        <span className="truncate">
                          {contract.propertyName || '—'}
                          {contract.assetType === 'veiculo' && <span className="ml-1 text-xs">{t('assetVehicle')}</span>}
                          {contract.assetType === 'equipamento' && <span className="ml-1 text-xs">{t('assetEquipment')}</span>}
                        </span>
                        {(contract.assetType === 'veiculo'
                          ? vehicleById[contract.propertyId]
                          : contract.assetType === 'equipamento'
                          ? equipmentById[contract.propertyId]
                          : propertyById[contract.propertyId]) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            title={t('actions.viewAsset')}
                            onClick={() => openContractAsset(contract)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        {formatDate(contract.startDate)} — {formatDateOptional(contract.endDate, t('indefinite'))}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="font-semibold text-primary">{formatCurrency(contract.rentValue)}</span>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" /> {t('dueDayLabel', { day: contract.dueDay })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 border-t pt-2">
                      {renderContractActions(contract, signing)}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Desktop — tabela */}
          <div className="hidden rounded-lg border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.number')}</TableHead>
                <TableHead>{t('columns.tenant')}</TableHead>
                <TableHead>{t('columns.asset')}</TableHead>
                <TableHead>{t('columns.validity')}</TableHead>
                <TableHead>{t('columns.value')}</TableHead>
                <TableHead>{t('columns.due')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
                <TableHead className="text-right">{t('columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pag.pageItems.map((contract) => {
                const sc = statusConfig[contract.status]
                const signing = getContractSigningStatus(contract)
                return (
                  <TableRow key={contract.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {contract.contractNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{contract.tenantName || '—'}</span>
                        {contract.tenantId && tenantById[contract.tenantId] && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground"
                            title={t('actions.viewTenant')}
                            onClick={() => setViewTenant(tenantById[contract.tenantId])}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>
                          {contract.propertyName || '—'}
                          {contract.assetType === 'veiculo' && (
                            <span className="ml-1 text-xs">{t('assetVehicle')}</span>
                          )}
                          {contract.assetType === 'equipamento' && (
                            <span className="ml-1 text-xs">{t('assetEquipment')}</span>
                          )}
                        </span>
                        {(contract.assetType === 'veiculo'
                          ? vehicleById[contract.propertyId]
                          : contract.assetType === 'equipamento'
                          ? equipmentById[contract.propertyId]
                          : propertyById[contract.propertyId]) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            title={t('actions.viewAsset')}
                            onClick={() => openContractAsset(contract)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(contract.startDate)} — {formatDateOptional(contract.endDate, t('indefinite'))}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatCurrency(contract.rentValue)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {t('dueDayLabel', { day: contract.dueDay })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                        {contract.isImported && (
                          <Badge variant="outline" className="gap-1 text-blue-600">
                            <FileText className="h-3 w-3" />
                            {t('imported.badge')}
                          </Badge>
                        )}
                        {warningCountByContract[contract.id] > 0 && (
                          <Link to="/advertencias" title={t('actions.viewWarnings')}>
                            <Badge variant={warningCountByContract[contract.id] >= 4 ? 'destructive' : 'warning'} className="gap-1">
                              <FileWarning className="h-3 w-3" />
                              {warningCountByContract[contract.id]}
                            </Badge>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {renderContractActions(contract, signing)}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
        </>
      )}

      {!isLoading && filtered.length > 0 && (
        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          total={pag.total}
          rangeStart={pag.rangeStart}
          rangeEnd={pag.rangeEnd}
          onPageChange={pag.setPage}
          itemLabel={t('itemLabel')}
        />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? t('editContract') : t('newContract')}</DialogTitle>
          </DialogHeader>
          <ContractForm
            contract={editingContract}
            companyId={companyId}
            onSuccess={() => {
              setShowForm(false)
              qc.invalidateQueries({ queryKey: ['contracts'] })
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewTenant} onOpenChange={() => setViewTenant(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('detailTenant')}</DialogTitle>
          </DialogHeader>
          {viewTenant && <TenantDetail tenant={viewTenant} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewProperty} onOpenChange={() => setViewProperty(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('detailProperty')}</DialogTitle>
          </DialogHeader>
          {viewProperty && <PropertyDetail property={viewProperty} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewVehicle} onOpenChange={() => setViewVehicle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('detailVehicle')}</DialogTitle>
          </DialogHeader>
          {viewVehicle && <VehicleDetail vehicle={viewVehicle} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewEquipment} onOpenChange={() => setViewEquipment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('detailEquipment')}</DialogTitle>
          </DialogHeader>
          {viewEquipment && <EquipmentDetail equipment={viewEquipment} />}
        </DialogContent>
      </Dialog>

      <ContractSignFlow
        open={!!signingContract}
        contract={signingContract}
        initialEdit={signFlowEdit}
        owner={signingContract?.ownerId
          ? { id: signingContract.ownerId, name: signingContract.ownerName ?? '', cpf: '', companyId, active: true, createdAt: signingContract.createdAt, updatedAt: signingContract.updatedAt }
          : undefined}
        tenant={signingContract ? tenantById[signingContract.tenantId] : undefined}
        property={(!signingContract || signingContract.assetType === 'veiculo' || signingContract.assetType === 'equipamento') ? undefined : propertyById[signingContract.propertyId]}
        vehicle={signingContract?.assetType === 'veiculo' ? (signingContract ? vehicleById[signingContract.propertyId] : undefined) : undefined}
        equipment={signingContract?.assetType === 'equipamento' ? (signingContract ? equipmentById[signingContract.propertyId] : undefined) : undefined}
        onClose={() => { setSigningContract(null); setSignFlowEdit(false) }}
      />
    </div>
  )
}
