import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Car, Edit, Trash2, Eye, ListFilter, LayoutGrid, Table2, ChevronDown, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getVehicles, deleteVehicle } from '@/services/vehicles'
import { getContractsByAsset, hasActiveContract, deleteAssetRelations } from '@/services/assetDeletion'
import { getTenants } from '@/services/tenants'
import { Contract, Tenant, Vehicle, VehicleStatus, VehicleType } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CardGridSkeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { VehicleForm } from './VehicleForm'
import { VehicleDetail } from './VehicleDetail'
import { TenantDetail } from '../tenants/TenantDetail'

const statusVariants: Record<VehicleStatus, 'success' | 'destructive' | 'warning' | 'secondary' | 'info'> = {
  disponivel: 'success',
  alugado: 'info',
  reservado: 'warning',
  manutencao: 'secondary',
  encerrado: 'destructive',
}

export function VehiclesPage() {
  const { t } = useTranslation('vehicles')
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
    tenants.forEach((tn) => { map[tn.id] = tn })
    return map
  }, [tenants])

  const deleteMutation = useMutation({
    mutationFn: async ({ id, contracts }: { id: string; contracts: Contract[] }) => {
      await deleteAssetRelations(companyId, id, contracts)
      await deleteVehicle(id)
    },
    onSuccess: () => {
      // Ativo, cobranças e despesas mudaram — reflete no dashboard/páginas.
      for (const k of ['vehicles', 'charges', 'sharedExpenses']) {
        qc.invalidateQueries({ queryKey: [k] })
      }
      toast({ title: t('toast.deleted') })
    },
    onError: () => toast({ title: t('toast.deleteError'), variant: 'destructive' }),
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

  const handleDelete = async (id: string) => {
    let contracts: Contract[]
    try {
      contracts = await getContractsByAsset(companyId, id)
    } catch {
      toast({ title: t('toast.deleteError'), variant: 'destructive' })
      return
    }
    if (hasActiveContract(contracts)) {
      toast({ title: t('toast.deleteBlockedActive'), variant: 'destructive' })
      return
    }
    const msg = contracts.length > 0
      ? t('toast.deleteWithRelations', { count: contracts.length })
      : t('toast.deleteConfirm')
    if (confirm(msg)) {
      deleteMutation.mutate({ id, contracts })
    }
  }

  const statusLabel = (s: VehicleStatus) => t(`common:status.${s}`)
  const typeLabel = (type: VehicleType) => t(`types.${type}`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
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
                  {statusFilter === 'todos' ? t('filters.all') : statusLabel(statusFilter as VehicleStatus)}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(['todos', 'disponivel', 'alugado', 'reservado', 'manutencao', 'encerrado'] as const).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="justify-between gap-4">
                  {s === 'todos' ? t('filters.all') : statusLabel(s)}
                  {statusFilter === s && <Check className="h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {viewMode === 'grid' ? <LayoutGrid className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
                {viewMode === 'grid' ? t('common:viewMode.cards') : t('common:viewMode.list')}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setViewMode('grid')} className="justify-between gap-4">
                <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> {t('common:viewMode.cards')}</span>
                {viewMode === 'grid' && <Check className="h-3.5 w-3.5" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('table')} className="justify-between gap-4">
                <span className="flex items-center gap-2"><Table2 className="h-4 w-4" /> {t('common:viewMode.list')}</span>
                {viewMode === 'table' && <Check className="h-3.5 w-3.5" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => { setEditingVehicle(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> {t('new')}
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
                  {s === 'todos' ? t('common:ui.total') : statusLabel(s)}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Grid */}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <Car className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">{t('empty.noResults')}</p>
          <Button className="mt-4" onClick={() => { setEditingVehicle(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> {t('add')}
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('title')}</TableHead>
                <TableHead>{t('common:ui.type')} / {t('form.year')}</TableHead>
                <TableHead>{t('form.plate')}</TableHead>
                <TableHead>{t('common:ui.value')}</TableHead>
                <TableHead>{t('tenantLabel')}</TableHead>
                <TableHead>{t('form.status')}</TableHead>
                <TableHead className="text-right">{t('common:ui.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pag.pageItems.map((vehicle) => {
                const variant = statusVariants[vehicle.status]
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
                    <TableCell className="text-muted-foreground">{typeLabel(vehicle.type)} • {vehicle.year}</TableCell>
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
                              title={t('view')}
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
                    <TableCell><Badge variant={variant}>{statusLabel(vehicle.status)}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" title={t('common:actions.view')} onClick={() => setViewVehicle(vehicle)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" title={t('common:actions.edit')} onClick={() => { setEditingVehicle(vehicle); setShowForm(true) }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          title={t('common:actions.delete')}
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
            const variant = statusVariants[vehicle.status]
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
                    <Badge variant={variant}>{statusLabel(vehicle.status)}</Badge>
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
                        {typeLabel(vehicle.type)} • {vehicle.year}
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
                        {t('tenantLabel')}: <span className="font-medium text-foreground">{vehicle.activeTenantName}</span>
                      </span>
                      {vehicle.activeTenantId && tenantById[vehicle.activeTenantId] && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          title={t('view')}
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
                      <Eye className="mr-1 h-3 w-3" /> {t('common:actions.view')}
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
          itemLabel={t('itemLabel')}
        />
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? t('edit') : t('new')}</DialogTitle>
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
            <DialogTitle>{t('detail.title')}</DialogTitle>
          </DialogHeader>
          {viewVehicle && <VehicleDetail vehicle={viewVehicle} />}
        </DialogContent>
      </Dialog>

      {/* Tenant Detail Dialog */}
      <Dialog open={!!viewTenant} onOpenChange={() => setViewTenant(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('tenants:detail.title')}</DialogTitle>
          </DialogHeader>
          {viewTenant && <TenantDetail tenant={viewTenant} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
