import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Wrench, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getMaintenanceRequests, createMaintenanceRequest, updateMaintenanceRequest } from '@/services/maintenance'
import { getProperties } from '@/services/properties'
import { getTenants } from '@/services/tenants'
import { MaintenanceRequest, MaintenanceCategory, MaintenanceStatus } from '@/types'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { toast } from '@/hooks/useToast'

const categoryLabels: Record<MaintenanceCategory, string> = {
  eletrica: 'Elétrica',
  hidraulica: 'Hidráulica',
  pintura: 'Pintura',
  estrutura: 'Estrutura',
  limpeza: 'Limpeza',
  seguranca: 'Segurança',
  outro: 'Outro',
}

const statusConfig: Record<MaintenanceStatus, { label: string; variant: 'info' | 'warning' | 'secondary' | 'success' }> = {
  aberto: { label: 'Aberto', variant: 'info' },
  em_analise: { label: 'Em Análise', variant: 'warning' },
  em_andamento: { label: 'Em Andamento', variant: 'secondary' },
  finalizado: { label: 'Finalizado', variant: 'success' },
}

const priorityVariant = {
  baixa: 'secondary',
  media: 'warning',
  alta: 'destructive',
  urgente: 'destructive',
} as const

export function MaintenancePage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.companyId ?? ''

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [form, setForm] = useState({
    propertyId: '',
    propertyName: '',
    tenantId: '',
    tenantName: '',
    title: '',
    description: '',
    category: 'eletrica' as MaintenanceCategory,
    priority: 'media' as MaintenanceRequest['priority'],
  })

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['maintenance', companyId],
    queryFn: () => getMaintenanceRequests(companyId),
    enabled: !!companyId,
  })

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', companyId],
    queryFn: () => getProperties(companyId),
    enabled: !!companyId,
  })

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants', companyId],
    queryFn: () => getTenants(companyId),
    enabled: !!companyId,
  })

  const filtered = requests.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.tenantName?.toLowerCase().includes(search.toLowerCase()) ||
      r.propertyName?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleCreate = async () => {
    if (!form.title || !form.propertyId) {
      toast({ title: 'Preencha os campos obrigatórios.', variant: 'destructive' })
      return
    }
    setFormLoading(true)
    try {
      await createMaintenanceRequest({ companyId, ...form, status: 'aberto' as const, comments: [] })
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      toast({ title: 'Chamado aberto com sucesso.' })
      setShowForm(false)
    } catch {
      toast({ title: 'Erro ao abrir chamado.', variant: 'destructive' })
    } finally {
      setFormLoading(false)
    }
  }

  const handleStatusChange = async (request: MaintenanceRequest, status: MaintenanceStatus) => {
    try {
      await updateMaintenanceRequest(request.id, { status })
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      toast({ title: 'Status atualizado.' })
    } catch {
      toast({ title: 'Erro ao atualizar.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar chamados..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['todos', 'aberto', 'em_analise', 'em_andamento', 'finalizado'] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === 'todos' ? 'Todos' : statusConfig[s as MaintenanceStatus].label}
              </Button>
            ))}
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> Abrir Chamado
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <Wrench className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">Nenhum chamado encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((request) => {
            const sc = statusConfig[request.status]
            return (
              <Card key={request.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{request.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {request.propertyName} • {request.tenantName}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      <Badge variant={priorityVariant[request.priority]} className="text-xs">
                        {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span className="rounded bg-muted px-2 py-0.5">
                      {categoryLabels[request.category]}
                    </span>
                    <span>Aberto em {formatDate(request.createdAt.toDate ? request.createdAt.toDate().toISOString() : String(request.createdAt))}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>

                  {request.status !== 'finalizado' && (
                    <div className="mt-3 flex gap-2">
                      {request.status === 'aberto' && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(request, 'em_analise')}>
                          Analisar
                        </Button>
                      )}
                      {request.status === 'em_analise' && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(request, 'em_andamento')}>
                          Iniciar
                        </Button>
                      )}
                      {request.status === 'em_andamento' && (
                        <Button size="sm" onClick={() => handleStatusChange(request, 'finalizado')}>
                          Finalizar
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Abrir Chamado de Manutenção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Título *</Label>
                <Input
                  placeholder="Torneira com vazamento"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v as MaintenanceCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Imóvel *</Label>
                <Combobox
                  options={properties.map((p) => ({ value: p.id, label: p.name, description: p.code }))}
                  value={form.propertyId}
                  onChange={(value, option) =>
                    setForm((p) => ({ ...p, propertyId: value, propertyName: option.label }))
                  }
                  placeholder="Selecione o imóvel"
                  searchPlaceholder="Buscar imóvel..."
                  emptyText="Nenhum imóvel cadastrado."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Inquilino</Label>
                <Combobox
                  options={tenants.map((t) => ({ value: t.id, label: t.name, description: t.cpf }))}
                  value={form.tenantId}
                  onChange={(value, option) =>
                    setForm((p) => ({ ...p, tenantId: value, tenantName: option.label }))
                  }
                  placeholder="Selecione o inquilino"
                  searchPlaceholder="Buscar inquilino..."
                  emptyText="Nenhum inquilino cadastrado."
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Descrição</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Descreva o problema..."
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={formLoading}>
              {formLoading ? 'Abrindo...' : 'Abrir Chamado'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
