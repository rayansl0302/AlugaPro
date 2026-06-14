import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, FileText, Edit, Eye, Calendar, DollarSign, PenLine, CheckCircle, Clock, Users, Lock, LockKeyhole } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getContracts, updateContract, linkContractToAsset, releaseContractAsset } from '@/services/contracts'
import { getTenants } from '@/services/tenants'
import { getProperties } from '@/services/properties'
import { getVehicles } from '@/services/vehicles'
import { Contract, ContractStatus, Property, Tenant, Vehicle } from '@/types'
import { formatCurrency, formatDate, formatDateOptional } from '@/lib/utils'
import { getContractSigningStatus } from '@/lib/contractSigning'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { ContractForm } from './ContractForm'
import { ContractSignFlow } from './ContractSignFlow'
import { TenantDetail } from '../tenants/TenantDetail'
import { PropertyDetail } from '../properties/PropertyDetail'
import { VehicleDetail } from '../vehicles/VehicleDetail'

const statusConfig: Record<ContractStatus, { label: string; variant: 'success' | 'info' | 'warning' | 'secondary' | 'destructive' }> = {
  ativo: { label: 'Ativo', variant: 'success' },
  renovado: { label: 'Renovado', variant: 'info' },
  encerrado: { label: 'Encerrado', variant: 'secondary' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
}

export function ContractsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
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

  const openContractAsset = (contract: Contract) => {
    if (contract.assetType === 'veiculo') {
      const vehicle = vehicleById[contract.propertyId]
      if (vehicle) setViewVehicle(vehicle)
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
    if (!window.confirm('Marcar este contrato como completo? Após confirmar, não será mais possível editar os dados do contrato nem completar dados de locador/locatário.')) return
    try {
      await updateContract(contract.id, { locked: true, lockedAt: new Date().toISOString() })
      qc.invalidateQueries({ queryKey: ['contracts'] })
      toast({ title: 'Contrato marcado como completo.' })
    } catch {
      toast({ title: 'Erro ao marcar como completo.', variant: 'destructive' })
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
      toast({ title: 'Status atualizado.' })
    } catch {
      toast({ title: 'Erro ao atualizar status.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contratos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['todos', 'ativo', 'renovado', 'encerrado', 'cancelado'] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === 'todos' ? 'Todos' : statusConfig[s].label}
              </Button>
            ))}
          </div>
        </div>
        <Button onClick={() => { setEditingContract(null); setShowForm(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      {/* Stats */}
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

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">Nenhum contrato encontrado</p>
          <Button className="mt-4" onClick={() => { setEditingContract(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Contrato
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Contrato</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Imóvel/Veículo</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
                            title="Ver inquilino"
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
                            <span className="ml-1 text-xs">(Veículo)</span>
                          )}
                        </span>
                        {(contract.assetType === 'veiculo'
                          ? vehicleById[contract.propertyId]
                          : propertyById[contract.propertyId]) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            title="Ver imóvel/veículo"
                            onClick={() => openContractAsset(contract)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(contract.startDate)} — {formatDateOptional(contract.endDate, 'Indeterminado')}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatCurrency(contract.rentValue)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        Dia {contract.dueDay}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={contract.locked}
                          onClick={() => { setEditingContract(contract); setShowForm(true) }}
                          title={contract.locked ? 'Contrato completo — edição bloqueada' : 'Editar'}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={contract.locked}
                          title={contract.locked ? 'Contrato completo — edição bloqueada' : 'Completar dados (locador/locatário)'}
                          onClick={() => { setSignFlowEdit(true); setSigningContract(contract) }}
                        >
                          <Users className="h-3.5 w-3.5" />
                        </Button>
                        {contract.locked ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600"
                            disabled
                            title="Contrato marcado como completo"
                          >
                            <LockKeyhole className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            title="Marcar como completo (bloqueia edição)"
                            onClick={() => handleMarkComplete(contract)}
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          title={
                            signing.state === 'complete'
                              ? 'Contrato assinado — ver/baixar'
                              : signing.state === 'pending'
                                ? `Assinatura pendente — falta(m) ${signing.pendingCount} assinatura(s)`
                                : 'Assinar contrato'
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
                        {contract.status === 'ativo' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => handleStatusChange(contract, 'encerrado')}
                          >
                            Encerrar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          total={pag.total}
          rangeStart={pag.rangeStart}
          rangeEnd={pag.rangeEnd}
          onPageChange={pag.setPage}
          itemLabel="contratos"
        />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
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
            <DialogTitle>Detalhes do Inquilino</DialogTitle>
          </DialogHeader>
          {viewTenant && <TenantDetail tenant={viewTenant} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewProperty} onOpenChange={() => setViewProperty(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Imóvel</DialogTitle>
          </DialogHeader>
          {viewProperty && <PropertyDetail property={viewProperty} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewVehicle} onOpenChange={() => setViewVehicle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Veículo</DialogTitle>
          </DialogHeader>
          {viewVehicle && <VehicleDetail vehicle={viewVehicle} />}
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
        property={signingContract?.assetType !== 'veiculo' ? (signingContract ? propertyById[signingContract.propertyId] : undefined) : undefined}
        vehicle={signingContract?.assetType === 'veiculo' ? (signingContract ? vehicleById[signingContract.propertyId] : undefined) : undefined}
        onClose={() => { setSigningContract(null); setSignFlowEdit(false) }}
      />
    </div>
  )
}
