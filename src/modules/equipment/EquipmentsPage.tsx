import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Search, HardHat, Edit, Trash2, Eye, ListFilter, LayoutGrid, Table2, ChevronDown, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getEquipments, deleteEquipment } from '@/services/equipments'
import { getContractsByAsset, hasActiveContract, deleteAssetRelations } from '@/services/assetDeletion'
import { getTenants } from '@/services/tenants'
import { Contract, Tenant, Equipment, EquipmentStatus } from '@/types'
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
import { EquipmentForm } from './EquipmentForm'
import { EquipmentDetail } from './EquipmentDetail'
import { TenantDetail } from '../tenants/TenantDetail'

const statusVariants: Record<EquipmentStatus, 'success' | 'destructive' | 'warning' | 'secondary' | 'info'> = {
  disponivel: 'success',
  alugado: 'info',
  reservado: 'warning',
  manutencao: 'secondary',
  encerrado: 'destructive',
}


export function EquipmentsPage() {
  const { t } = useTranslation('equipment')
  const { user } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.companyId ?? ''

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'todos'>('todos')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showForm, setShowForm] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const [viewEquipment, setViewEquipment] = useState<Equipment | null>(null)
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null)

  const { data: equipments = [], isLoading } = useQuery({
    queryKey: ['equipments', companyId],
    queryFn: () => getEquipments(companyId),
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
      await deleteEquipment(id)
    },
    onSuccess: () => {
      // Invalida tudo que o dashboard/páginas derivam do ativo excluído.
      for (const k of ['equipments', 'contracts', 'charges', 'maintenance', 'sharedExpenses', 'warnings', 'tenants']) {
        qc.invalidateQueries({ queryKey: [k] })
      }
      toast({ title: t('toast.deleted') })
    },
    onError: () => toast({ title: t('toast.deleteError'), variant: 'destructive' }),
  })

  const filtered = equipments.filter((eq) => {
    const matchSearch =
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      eq.type.toLowerCase().includes(search.toLowerCase()) ||
      (eq.brand ?? '').toLowerCase().includes(search.toLowerCase()) ||
      eq.model.toLowerCase().includes(search.toLowerCase()) ||
      (eq.serialNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
      eq.code.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || eq.status === statusFilter
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

  const statusLabel = (s: EquipmentStatus) => t(`common:status.${s}`)

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
                  {statusFilter === 'todos' ? t('filters.all') : statusLabel(statusFilter as EquipmentStatus)}
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
          <Button onClick={() => { setEditingEquipment(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> {t('new')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {(['todos', 'disponivel', 'alugado', 'reservado', 'manutencao'] as const).map((s) => {
          const count = s === 'todos' ? equipments.length : equipments.filter((eq) => eq.status === s).length
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
          <HardHat className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">{t('empty.noResults')}</p>
          <Button className="mt-4" onClick={() => { setEditingEquipment(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> {t('add')}
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('title')}</TableHead>
                <TableHead>{t('common:ui.type')}</TableHead>
                <TableHead>{t('form.serial')}</TableHead>
                <TableHead>{t('common:ui.value')}</TableHead>
                <TableHead>{t('tenantLabel')}</TableHead>
                <TableHead>{t('form.status')}</TableHead>
                <TableHead className="text-right">{t('common:ui.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pag.pageItems.map((equipment) => {
                const variant = statusVariants[equipment.status]
                return (
                  <TableRow key={equipment.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                          {equipment.photos?.[0] ? (
                            <img src={equipment.photos[0]} alt={equipment.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <HardHat className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{equipment.name}</p>
                          <p className="text-xs text-muted-foreground">{equipment.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{equipment.type}</TableCell>
                    <TableCell className="font-mono text-sm">{equipment.serialNumber || '—'}</TableCell>
                    <TableCell className="font-semibold text-primary">{formatCurrency(equipment.rentValue)}</TableCell>
                    <TableCell>
                      {equipment.activeTenantName ? (
                        <div className="flex items-center gap-1">
                          <span className="max-w-32 truncate text-sm">{equipment.activeTenantName}</span>
                          {equipment.activeTenantId && tenantById[equipment.activeTenantId] && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              title={t('view')}
                              onClick={() => setViewTenant(tenantById[equipment.activeTenantId!])}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell><Badge variant={variant}>{statusLabel(equipment.status)}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" title={t('common:actions.view')} onClick={() => setViewEquipment(equipment)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" title={t('common:actions.edit')} onClick={() => { setEditingEquipment(equipment); setShowForm(true) }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          title={t('common:actions.delete')}
                          onClick={() => handleDelete(equipment.id)}
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
          {pag.pageItems.map((equipment) => {
            const variant = statusVariants[equipment.status]
            return (
              <Card key={equipment.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative h-36 bg-gradient-to-br from-slate-100 to-zinc-200 dark:from-slate-900 dark:to-zinc-900">
                  {equipment.photos?.[0] ? (
                    <img
                      src={equipment.photos[0]}
                      alt={equipment.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <HardHat className="h-12 w-12 text-slate-400/60" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <Badge variant={variant}>{statusLabel(equipment.status)}</Badge>
                  </div>
                  <div className="absolute left-2 top-2">
                    <Badge variant="secondary" className="text-xs">{equipment.code}</Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{equipment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {equipment.type}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-primary">
                      {formatCurrency(equipment.rentValue)}
                    </p>
                  </div>
                  {equipment.serialNumber && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <HardHat className="h-3 w-3 shrink-0" />
                      <span className="truncate font-mono">{equipment.serialNumber}</span>
                    </div>
                  )}
                  {equipment.activeTenantName && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="truncate">
                        {t('tenantLabel')}: <span className="font-medium text-foreground">{equipment.activeTenantName}</span>
                      </span>
                      {equipment.activeTenantId && tenantById[equipment.activeTenantId] && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          title={t('view')}
                          onClick={() => setViewTenant(tenantById[equipment.activeTenantId!])}
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
                      onClick={() => setViewEquipment(equipment)}
                    >
                      <Eye className="mr-1 h-3 w-3" /> {t('common:actions.view')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingEquipment(equipment); setShowForm(true) }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDelete(equipment.id)}
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
            <DialogTitle>{editingEquipment ? t('edit') : t('new')}</DialogTitle>
          </DialogHeader>
          <EquipmentForm
            equipment={editingEquipment}
            companyId={companyId}
            onSuccess={() => {
              setShowForm(false)
              qc.invalidateQueries({ queryKey: ['equipments'] })
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewEquipment} onOpenChange={() => setViewEquipment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('detail.title')}</DialogTitle>
          </DialogHeader>
          {viewEquipment && <EquipmentDetail equipment={viewEquipment} />}
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
