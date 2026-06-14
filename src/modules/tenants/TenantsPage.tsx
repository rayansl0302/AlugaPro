import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Users, Phone, Mail, Edit, Trash2, Eye, Building2, Car } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getTenants, deleteTenant } from '@/services/tenants'
import { getProperties } from '@/services/properties'
import { getVehicles } from '@/services/vehicles'
import { Property, Tenant, Vehicle } from '@/types'
import { formatCPF, formatPhone } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { TenantForm } from './TenantForm'
import { PropertyDetail } from '../properties/PropertyDetail'
import { VehicleDetail } from '../vehicles/VehicleDetail'
import { getInitials } from '@/lib/utils'

export function TenantsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.companyId ?? ''

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [viewProperty, setViewProperty] = useState<Property | null>(null)
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null)

  const { data: tenants = [], isLoading } = useQuery({
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

  const assetByTenant = useMemo(() => {
    const map: Record<
      string,
      { label: string; kind: 'imovel' | 'veiculo'; property?: Property; vehicle?: Vehicle }
    > = {}
    properties.forEach((p) => {
      if (p.activeTenantId) map[p.activeTenantId] = { label: p.name, kind: 'imovel', property: p }
    })
    vehicles.forEach((v) => {
      if (v.activeTenantId)
        map[v.activeTenantId] = { label: `${v.brand} ${v.model}`, kind: 'veiculo', vehicle: v }
    })
    return map
  }, [properties, vehicles])

  const openAsset = (asset: { property?: Property; vehicle?: Vehicle }) => {
    if (asset.property) setViewProperty(asset.property)
    else if (asset.vehicle) setViewVehicle(asset.vehicle)
  }

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] })
      toast({ title: 'Inquilino removido.' })
    },
    onError: () => toast({ title: 'Erro ao remover.', variant: 'destructive' }),
  })

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.cpf?.includes(search) ||
      t.email?.toLowerCase().includes(search.toLowerCase())
  )

  const pag = usePagination(filtered, 12)

  const handleDelete = (id: string) => {
    if (confirm('Remover inquilino?')) deleteMutation.mutate(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Tabela
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Cards
          </Button>
          <Button onClick={() => { setEditingTenant(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Inquilino
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{tenants.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{tenants.filter(t => t.active && t.activeContractId).length}</p>
          <p className="text-xs text-muted-foreground">Ativos</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{tenants.filter(t => !t.activeContractId).length}</p>
          <p className="text-xs text-muted-foreground">Sem Contrato</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <Users className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">Nenhum inquilino encontrado</p>
          <Button className="mt-4" onClick={() => { setEditingTenant(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Cadastrar Inquilino
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inquilino</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Imóvel/Veículo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pag.pageItems.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={tenant.photoUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(tenant.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{tenant.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tenant.cpf ? formatCPF(tenant.cpf) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {tenant.phone && (
                        <p className="text-xs text-muted-foreground">{formatPhone(tenant.phone)}</p>
                      )}
                      {tenant.email && (
                        <p className="text-xs text-muted-foreground truncate max-w-40">{tenant.email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {assetByTenant[tenant.id] ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        {assetByTenant[tenant.id].kind === 'imovel' ? (
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate max-w-40">{assetByTenant[tenant.id].label}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground"
                          title="Ver detalhes"
                          onClick={() => openAsset(assetByTenant[tenant.id])}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.activeContractId ? 'success' : 'secondary'}>
                      {tenant.activeContractId ? 'Com contrato' : 'Sem contrato'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingTenant(tenant); setShowForm(true) }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(tenant.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pag.pageItems.map((tenant) => (
            <Card key={tenant.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={tenant.photoUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(tenant.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">{tenant.cpf ? formatCPF(tenant.cpf) : '—'}</p>
                  </div>
                  <Badge variant={tenant.activeContractId ? 'success' : 'secondary'} className="shrink-0 text-xs">
                    {tenant.activeContractId ? 'Ativo' : 'Sem contrato'}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {tenant.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {formatPhone(tenant.phone)}
                    </div>
                  )}
                  {tenant.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{tenant.email}</span>
                    </div>
                  )}
                  {assetByTenant[tenant.id] && (
                    <div className="flex items-center gap-2 truncate">
                      {assetByTenant[tenant.id].kind === 'imovel' ? (
                        <Building2 className="h-3 w-3 shrink-0" />
                      ) : (
                        <Car className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate font-medium text-foreground">
                        {assetByTenant[tenant.id].label}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground"
                        title="Ver detalhes"
                        onClick={() => openAsset(assetByTenant[tenant.id])}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setEditingTenant(tenant); setShowForm(true) }}
                  >
                    <Edit className="mr-1 h-3 w-3" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDelete(tenant.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
          itemLabel="inquilinos"
        />
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTenant ? 'Editar Inquilino' : 'Novo Inquilino'}</DialogTitle>
          </DialogHeader>
          <TenantForm
            tenant={editingTenant}
            companyId={companyId}
            onSuccess={() => {
              setShowForm(false)
              qc.invalidateQueries({ queryKey: ['tenants'] })
            }}
          />
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
    </div>
  )
}
