import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Building2, MapPin, Edit, Trash2, Eye, ListFilter, LayoutGrid, Table2, ChevronDown, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getProperties, createProperty, updateProperty, deleteProperty } from '@/services/properties'
import { getTenants } from '@/services/tenants'
import { Property, PropertyStatus, PropertyType, Tenant } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { PropertyForm } from './PropertyForm'
import { PropertyDetail } from './PropertyDetail'
import { TenantDetail } from '../tenants/TenantDetail'

const statusConfig: Record<PropertyStatus, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' | 'info' }> = {
  disponivel: { label: 'Disponível', variant: 'success' },
  alugado: { label: 'Alugado', variant: 'info' },
  reservado: { label: 'Reservado', variant: 'warning' },
  manutencao: { label: 'Manutenção', variant: 'secondary' },
  encerrado: { label: 'Encerrado', variant: 'destructive' },
}

const typeLabels: Record<PropertyType, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  kitnet: 'Kitnet',
  sala_comercial: 'Sala Comercial',
  galpao: 'Galpão',
  terreno: 'Terreno',
  outro: 'Outro',
}

export function PropertiesPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.companyId ?? ''

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'todos'>('todos')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [viewProperty, setViewProperty] = useState<Property | null>(null)
  const [viewTenant, setViewTenant] = useState<Tenant | null>(null)

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', companyId],
    queryFn: () => getProperties(companyId),
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
    mutationFn: deleteProperty,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] })
      toast({ title: 'Imóvel excluído com sucesso.' })
    },
    onError: () => toast({ title: 'Erro ao excluir imóvel.', variant: 'destructive' }),
  })

  const filtered = properties.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.street.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const pag = usePagination(filtered, 12)

  const handleDelete = (id: string) => {
    if (confirm('Excluir imóvel? Esta ação não pode ser desfeita.')) {
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
              placeholder="Buscar imóveis..."
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
                  {statusFilter === 'todos' ? 'Todos' : statusConfig[statusFilter as PropertyStatus].label}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(['todos', 'disponivel', 'alugado', 'reservado', 'manutencao', 'encerrado'] as const).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="justify-between gap-4">
                  {s === 'todos' ? 'Todos' : statusConfig[s].label}
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
                {viewMode === 'grid' ? 'Cards' : 'Lista'}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setViewMode('grid')} className="justify-between gap-4">
                <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> Cards</span>
                {viewMode === 'grid' && <Check className="h-3.5 w-3.5" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('table')} className="justify-between gap-4">
                <span className="flex items-center gap-2"><Table2 className="h-4 w-4" /> Lista</span>
                {viewMode === 'table' && <Check className="h-3.5 w-3.5" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => { setEditingProperty(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Imóvel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {(['todos', 'disponivel', 'alugado', 'reservado', 'manutencao'] as const).map((s) => {
          const count = s === 'todos' ? properties.length : properties.filter((p) => p.status === s).length
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
          <Building2 className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">Nenhum imóvel encontrado</p>
          <Button className="mt-4" onClick={() => { setEditingProperty(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar Imóvel
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pag.pageItems.map((property) => {
                const sc = statusConfig[property.status]
                return (
                  <TableRow key={property.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                          {property.photos?.[0] ? (
                            <img src={property.photos[0]} alt={property.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{property.name}</p>
                          <p className="text-xs text-muted-foreground">{property.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">{typeLabels[property.type]}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="block max-w-56 truncate">
                        {property.address.street}, {property.address.number} — {property.address.city}/{property.address.state}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">{formatCurrency(property.rentValue)}</TableCell>
                    <TableCell>
                      {property.activeTenantName ? (
                        <div className="flex items-center gap-1">
                          <span className="max-w-32 truncate text-sm">{property.activeTenantName}</span>
                          {property.activeTenantId && tenantById[property.activeTenantId] && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              title="Ver inquilino"
                              onClick={() => setViewTenant(tenantById[property.activeTenantId!])}
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
                        <Button variant="ghost" size="sm" title="Ver" onClick={() => setViewProperty(property)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Editar" onClick={() => { setEditingProperty(property); setShowForm(true) }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          title="Excluir"
                          onClick={() => handleDelete(property.id)}
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
          {pag.pageItems.map((property) => {
            const sc = statusConfig[property.status]
            return (
              <Card key={property.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative h-36 bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-900">
                  {property.photos?.[0] ? (
                    <img
                      src={property.photos[0]}
                      alt={property.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Building2 className="h-12 w-12 text-blue-400/60" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </div>
                  <div className="absolute left-2 top-2">
                    <Badge variant="secondary" className="text-xs">{property.code}</Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{property.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {typeLabels[property.type]}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-primary">
                      {formatCurrency(property.rentValue)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {property.address.street}, {property.address.number} — {property.address.city}/{property.address.state}
                    </span>
                  </div>
                  {property.activeTenantName && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="truncate">
                        Inquilino: <span className="font-medium text-foreground">{property.activeTenantName}</span>
                      </span>
                      {property.activeTenantId && tenantById[property.activeTenantId] && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          title="Ver inquilino"
                          onClick={() => setViewTenant(tenantById[property.activeTenantId!])}
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
                      onClick={() => setViewProperty(property)}
                    >
                      <Eye className="mr-1 h-3 w-3" /> Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingProperty(property); setShowForm(true) }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDelete(property.id)}
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
          itemLabel="imóveis"
        />
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProperty ? 'Editar Imóvel' : 'Novo Imóvel'}</DialogTitle>
          </DialogHeader>
          <PropertyForm
            property={editingProperty}
            companyId={companyId}
            onSuccess={() => {
              setShowForm(false)
              qc.invalidateQueries({ queryKey: ['properties'] })
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewProperty} onOpenChange={() => setViewProperty(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Imóvel</DialogTitle>
          </DialogHeader>
          {viewProperty && <PropertyDetail property={viewProperty} />}
        </DialogContent>
      </Dialog>

      {/* Tenant Detail Dialog */}
      <Dialog open={!!viewTenant} onOpenChange={() => setViewTenant(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Inquilino</DialogTitle>
          </DialogHeader>
          {viewTenant && <TenantDetail tenant={viewTenant} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
