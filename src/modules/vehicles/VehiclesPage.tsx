import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Car, Edit, Trash2, Eye } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getVehicles, deleteVehicle } from '@/services/vehicles'
import { getTenants } from '@/services/tenants'
import { Tenant, Vehicle, VehicleStatus, VehicleType } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { VehicleForm } from './VehicleForm'
import { VehicleDetail } from './VehicleDetail'
import { TenantDetail } from '../tenants/TenantDetail'

const statusConfig: Record<VehicleStatus, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' | 'info' }> = {
  disponivel: { label: 'Disponível', variant: 'success' },
  alugado: { label: 'Alugado', variant: 'info' },
  reservado: { label: 'Reservado', variant: 'warning' },
  manutencao: { label: 'Manutenção', variant: 'secondary' },
  encerrado: { label: 'Encerrado', variant: 'destructive' },
}

const typeLabels: Record<VehicleType, string> = {
  carro: 'Carro',
  moto: 'Moto',
  caminhao: 'Caminhão',
  van: 'Van',
  onibus: 'Ônibus',
  outro: 'Outro',
}

export function VehiclesPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.companyId ?? ''

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'todos'>('todos')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showForm, setShowForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null)
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null)

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles', companyId],
    queryFn: () => getVehicles(companyId),
    enabled: !!companyId,
  })

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants', companyId],
    queryFn: () => getTenants(companyId),
    enabled: !!companyId,
  })

  const tenantById = useMemo(() => {
    const map: Record<string, Tenant> = {}
    tenants.forEach((t) => { map[t.id] = t })
    return map
  }, [tenants])

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast({ title: 'Veículo excluído com sucesso.' })
    },
    onError: () => toast({ title: 'Erro ao excluir veículo.', variant: 'destructive' }),
  })

  const filtered = vehicles.filter((v) => {
    const matchSearch =
      v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.code.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || v.status === statusFilter
    return matchSearch && matchStatus
  })

  const pag = usePagination(filtered, 12)

  const handleDelete = (id: string) => {
    if (confirm('Excluir veículo? Esta ação não pode ser desfeita.')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar veículos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 sm:w-64"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['todos', 'disponivel', 'alugado', 'reservado', 'manutencao', 'encerrado'] as const).map(
              (s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  className="capitalize"
                >
                  {s === 'todos' ? 'Todos' : statusConfig[s].label}
                </Button>
              )
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}>
            Cards
          </Button>
          <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}>
            Lista
          </Button>
          <Button onClick={() => { setEditingVehicle(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Veículo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {(['todos', 'disponivel', 'alugado', 'reservado', 'manutencao'] as const).map((s) => {
          const count = s === 'todos' ? vehicles.length : vehicles.filter((v) => v.status === s).length
          return (
            <Card key={s} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter(s)}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {s === 'todos' ? 'Total' : statusConfig[s].label}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-48 p-6" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <Car className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">Nenhum veículo encontrado</p>
          <Button className="mt-4" onClick={() => { setEditingVehicle(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar Veículo
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Veículo</TableHead>
                <TableHead>Tipo / Ano</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Locatário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pag.pageItems.map((vehicle) => {
                const sc = statusConfig[vehicle.status]
                return (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                          {vehicle.photos?.[0] ? (
                            <img src={vehicle.photos[0]} alt={`${vehicle.brand} ${vehicle.model}`} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Car className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{vehicle.brand} {vehicle.model}</p>
                          <p className="text-xs text-muted-foreground">{vehicle.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{typeLabels[vehicle.type]} • {vehicle.year}</TableCell>
                    <TableCell className="font-mono uppercase text-sm">{vehicle.plate}</TableCell>
                    <TableCell className="font-semibold text-primary">{formatCurrency(vehicle.rentValue)}</TableCell>
                    <TableCell>
                      {vehicle.activeTenantName ? (
                        <div className="flex items-center gap-1">
                          <span className="max-w-32 truncate text-sm">{vehicle.activeTenantName}</span>
                          {vehicle.activeTenantId && tenantById[vehicle.activeTenantId] && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              title="Ver locatário"
                              onClick={() => setViewTenant(tenantById[vehicle.activeTenantId!])}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" title="Ver" onClick={() => setViewVehicle(vehicle)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Editar" onClick={() => { setEditingVehicle(vehicle); setShowForm(true) }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          title="Excluir"
                          onClick={() => handleDelete(vehicle.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pag.pageItems.map((vehicle) => {
            const sc = statusConfig[vehicle.status]
            return (
              <Card key={vehicle.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative h-36 bg-gradient-to-br from-slate-100 to-zinc-200 dark:from-slate-900 dark:to-zinc-900">
                  {vehicle.photos?.[0] ? (
                    <img
                      src={vehicle.photos[0]}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Car className="h-12 w-12 text-slate-400/60" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </div>
                  <div className="absolute left-2 top-2">
                    <Badge variant="secondary" className="text-xs">{vehicle.code}</Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{vehicle.brand} {vehicle.model}</p>
                      <p className="text-xs text-muted-foreground">
                        {typeLabels[vehicle.type]} • {vehicle.year}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-primary">
                      {formatCurrency(vehicle.rentValue)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Car className="h-3 w-3 shrink-0" />
                    <span className="truncate font-mono uppercase">{vehicle.plate}</span>
                  </div>
                  {vehicle.activeTenantName && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="truncate">
                        Locatário: <span className="font-medium text-foreground">{vehicle.activeTenantName}</span>
                      </span>
                      {vehicle.activeTenantId && tenantById[vehicle.activeTenantId] && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          title="Ver locatário"
                          onClick={() => setViewTenant(tenantById[vehicle.activeTenantId!])}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setViewVehicle(vehicle)}
                    >
                      <Eye className="mr-1 h-3 w-3" /> Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingVehicle(vehicle); setShowForm(true) }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDelete(vehicle.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
          itemLabel="veículos"
        />
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
          </DialogHeader>
          <VehicleForm
            vehicle={editingVehicle}
            companyId={companyId}
            onSuccess={() => {
              setShowForm(false)
              qc.invalidateQueries({ queryKey: ['vehicles'] })
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewVehicle} onOpenChange={() => setViewVehicle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Veículo</DialogTitle>
          </DialogHeader>
          {viewVehicle && <VehicleDetail vehicle={viewVehicle} />}
        </DialogContent>
      </Dialog>

      {/* Tenant Detail Dialog */}
      <Dialog open={!!viewTenant} onOpenChange={() => setViewTenant(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Locatário</DialogTitle>
          </DialogHeader>
          {viewTenant && <TenantDetail tenant={viewTenant} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
