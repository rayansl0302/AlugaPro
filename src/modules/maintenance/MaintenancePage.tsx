import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Wrench, Search, Eye, ListFilter, Table2, LayoutGrid, ChevronDown, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceStatus,
  buildInitialStatusHistory,
  addMaintenanceComment,
} from '@/services/maintenance'
import { getProperties } from '@/services/properties'
import { getTenants } from '@/services/tenants'
import { getVehicles } from '@/services/vehicles'
import { getEquipments } from '@/services/equipments'
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
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MaintenanceCommentsPanel } from '@/components/maintenance/MaintenanceCommentsPanel'
import { MaintenanceStatusHistoryPanel } from '@/components/maintenance/MaintenanceStatusHistoryPanel'
import { MaintenanceEntityPhotos } from '@/components/maintenance/MaintenanceEntityPhotos'
import { MaintenanceRequestPhotos } from '@/components/maintenance/MaintenanceRequestPhotos'
import {
  buildMaintenancePhotoLookups,
  resolveMaintenanceEntityPhotos,
} from '@/lib/maintenanceEntityPhotos'
import { Tenant, ContractAssetType } from '@/types'

// ─── WhatsApp helper ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  aberto:       'Aberto',
  em_analise:   'Em Análise',
  em_andamento: 'Em Andamento',
  finalizado:   'Finalizado',
}

function buildMaintenanceMsg(event: 'criado' | string, title: string, tenantName: string): string {
  const name = tenantName || 'Inquilino'
  if (event === 'criado') {
    return `✅ Olá ${name}! Seu chamado de manutenção foi registrado com sucesso.\n\n📋 *${title}*\n\nEm breve entraremos em contato. AlugaPro.`
  }
  const statusLabel = STATUS_LABELS[event] ?? event
  const emoji = event === 'finalizado' ? '✅' : event === 'em_andamento' ? '🔧' : '🔍'
  return `${emoji} Olá ${name}! Seu chamado *${title}* teve uma atualização de status:\n\n📌 Novo status: *${statusLabel}*\n\nAlugaPro.`
}

async function notifyMaintenanceWhatsApp(phone: string | undefined, message: string) {
  if (!phone) return
  try {
    await fetch('/api/whatsapp-notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': (import.meta.env.VITE_INTERNAL_API_KEY as string) ?? '',
      },
      body: JSON.stringify({ phone, message }),
    })
  } catch { /* silencioso — não bloqueia o fluxo principal */ }
}


const statusVariants: Record<MaintenanceStatus, 'info' | 'warning' | 'secondary' | 'success'> = {
  aberto: 'info',
  em_analise: 'warning',
  em_andamento: 'secondary',
  finalizado: 'success',
}

const priorityVariant = {
  baixa: 'secondary',
  media: 'warning',
  alta: 'destructive',
  urgente: 'destructive',
} as const

function formatRequestDate(request: MaintenanceRequest) {
  if (!request.createdAt) return '—'
  const date = request.createdAt.toDate ? request.createdAt.toDate() : new Date(String(request.createdAt))
  return formatDate(date.toISOString())
}

export function MaintenancePage() {
  const { t } = useTranslation('maintenance')
  const { t: tCommon } = useTranslation('common')
  const statusConfig = (Object.keys(statusVariants) as MaintenanceStatus[]).reduce((acc, s) => {
    acc[s] = { label: t(`statuses.${s}`), variant: statusVariants[s] }
    return acc
  }, {} as Record<MaintenanceStatus, { label: string; variant: 'info' | 'warning' | 'secondary' | 'success' }>)
  const ASSET_TYPE_LABEL: Record<ContractAssetType, string> = {
    imovel: t('assetTypes.imovel'),
    veiculo: t('assetTypes.veiculo'),
    equipamento: t('assetTypes.equipamento'),
  }
  const categoryLabels: Record<MaintenanceCategory, string> = {
    eletrica: t('categories.eletrica'),
    hidraulica: t('categories.hidraulica'),
    pintura: t('categories.pintura'),
    estrutura: t('categories.estrutura'),
    limpeza: t('categories.limpeza'),
    seguranca: t('categories.seguranca'),
    outro: t('categories.outro'),
  }
  const { user, firebaseUser } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.companyId ?? ''

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | 'todos'>('todos')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [viewingRequest, setViewingRequest] = useState<MaintenanceRequest | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
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

  const photoLookups = useMemo(
    () => buildMaintenancePhotoLookups(properties, vehicles, tenants, equipments),
    [properties, vehicles, tenants, equipments],
  )

  const filtered = requests.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.tenantName?.toLowerCase().includes(search.toLowerCase()) ||
      r.propertyName?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const pag = usePagination(filtered, viewMode === 'table' ? 15 : 12)

  const renderRequestCard = (request: MaintenanceRequest) => {
    const sc = statusConfig[request.status]
    const entityPhotos = resolveMaintenanceEntityPhotos(request, photoLookups)
    const assetLabel = ASSET_TYPE_LABEL[entityPhotos.assetType ?? 'imovel']
    return (
      <Card key={request.id} className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <MaintenanceEntityPhotos photos={entityPhotos} size="md" />
            <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="truncate text-base">{request.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {entityPhotos.assetName ?? request.propertyName} • {entityPhotos.tenantName}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {assetLabel}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant={sc.variant}>{sc.label}</Badge>
                <Badge variant={priorityVariant[request.priority]} className="text-xs">
                  {t(`priorities.${request.priority}`)}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5">
              {categoryLabels[request.category]}
            </span>
            <span>{t('openedAt', { date: formatRequestDate(request) })}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>

          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full"
            onClick={() => setViewingRequest(request)}
          >
            <Eye className="mr-1.5 h-4 w-4" />
            {tCommon('actions.view')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const handleCreate = async () => {
    if (!form.title || !form.propertyId) {
      toast({ title: t('toast.requiredFields'), variant: 'destructive' })
      return
    }
    setFormLoading(true)
    try {
      const actor = {
        id: firebaseUser?.uid ?? user!.id,
        name: user!.name,
        role: user!.role,
      }
      await createMaintenanceRequest({
        companyId,
        ...form,
        status: 'aberto' as const,
        comments: [],
        statusHistory: [buildInitialStatusHistory(actor)],
      })
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      toast({ title: t('toast.created') })

      // Notifica inquilino via WhatsApp
      const tenant = (tenants as Tenant[]).find((t) => t.id === form.tenantId)
      if (tenant?.whatsapp) {
        notifyMaintenanceWhatsApp(
          tenant.whatsapp,
          buildMaintenanceMsg('criado', form.title, form.tenantName),
        )
      }

      setShowForm(false)
    } catch {
      toast({ title: t('toast.createError'), variant: 'destructive' })
    } finally {
      setFormLoading(false)
    }
  }

  const handleStatusChange = async (status: MaintenanceStatus) => {
    if (!viewingRequest || !user) return
    if (viewingRequest.status === status) return

    setStatusLoading(true)
    try {
      const entry = await updateMaintenanceStatus(viewingRequest, status, {
        id: firebaseUser?.uid ?? user.id,
        name: user.name,
        role: user.role,
      })
      if (entry) {
        setViewingRequest((prev) =>
          prev ? { ...prev, status, statusHistory: [...(prev.statusHistory ?? []), entry] } : null
        )
      }
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      toast({ title: t('toast.statusUpdated') })

      // Notifica inquilino via WhatsApp
      const tenant = (tenants as Tenant[]).find((t) => t.id === viewingRequest.tenantId)
      if (tenant?.whatsapp && viewingRequest.title) {
        notifyMaintenanceWhatsApp(
          tenant.whatsapp,
          buildMaintenanceMsg(status, viewingRequest.title, viewingRequest.tenantName ?? tenant.name),
        )
      }
    } catch {
      toast({ title: t('toast.statusError'), variant: 'destructive' })
    } finally {
      setStatusLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!viewingRequest || !commentText.trim() || !user) return

    setCommentLoading(true)
    try {
      const newComment = await addMaintenanceComment(viewingRequest.id, viewingRequest, {
        authorId: firebaseUser?.uid ?? user.id,
        authorName: user.name,
        authorRole: user.role,
        message: commentText.trim(),
      })
      setViewingRequest((prev) =>
        prev ? { ...prev, comments: [...(prev.comments ?? []), newComment] } : null
      )
      setCommentText('')
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      toast({ title: t('toast.commentSent') })
    } catch {
      toast({ title: t('toast.commentError'), variant: 'destructive' })
    } finally {
      setCommentLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
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
                  {statusFilter === 'todos' ? t('filters.all') : statusConfig[statusFilter as MaintenanceStatus].label}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(['todos', 'aberto', 'em_analise', 'em_andamento', 'finalizado'] as const).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="justify-between gap-4">
                  {s === 'todos' ? t('filters.all') : statusConfig[s as MaintenanceStatus].label}
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
                {viewMode === 'table' ? <Table2 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                {viewMode === 'table' ? t('view.table') : t('view.cards')}
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setViewMode('table')} className="justify-between gap-4">
                <span className="flex items-center gap-2"><Table2 className="h-4 w-4" /> {t('view.table')}</span>
                {viewMode === 'table' && <Check className="h-3.5 w-3.5" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('grid')} className="justify-between gap-4">
                <span className="flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> {t('view.cards')}</span>
                {viewMode === 'grid' && <Check className="h-3.5 w-3.5" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t('openTicket')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        viewMode === 'table' ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <Wrench className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">{t('emptyFound')}</p>
        </div>
      ) : viewMode === 'table' ? (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.title')}</TableHead>
                  <TableHead>{t('table.assetVehicle')}</TableHead>
                  <TableHead>{t('table.tenant')}</TableHead>
                  <TableHead>{t('table.category')}</TableHead>
                  <TableHead>{t('table.priority')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>{t('table.openedAt')}</TableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pag.pageItems.map((request) => {
                  const sc = statusConfig[request.status]
                  const entityPhotos = resolveMaintenanceEntityPhotos(request, photoLookups)
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium max-w-[200px]">
                        <span className="line-clamp-2">{request.title}</span>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <MaintenanceEntityPhotos photos={entityPhotos} variant="asset" />
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <MaintenanceEntityPhotos photos={entityPhotos} variant="tenant" />
                      </TableCell>
                      <TableCell>
                        <span className="rounded bg-muted px-2 py-0.5 text-xs">
                          {categoryLabels[request.category]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityVariant[request.priority]} className="text-xs capitalize">
                          {t(`priorities.${request.priority}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatRequestDate(request)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingRequest(request)}
                        >
                          <Eye className="mr-1.5 h-4 w-4" />
                          {tCommon('actions.view')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={pag.page}
            totalPages={pag.totalPages}
            total={pag.total}
            rangeStart={pag.rangeStart}
            rangeEnd={pag.rangeEnd}
            onPageChange={pag.setPage}
            itemLabel={t('itemLabel')}
          />
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pag.pageItems.map((request) => renderRequestCard(request))}
          {filtered.length > 0 && (
            <div className="sm:col-span-2">
              <Pagination
                page={pag.page}
                totalPages={pag.totalPages}
                total={pag.total}
                rangeStart={pag.rangeStart}
                rangeEnd={pag.rangeEnd}
                onPageChange={pag.setPage}
                itemLabel={t('itemLabel')}
              />
            </div>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('openTicketTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t('form.ticketTitle')} *</Label>
                <Input
                  placeholder={t('titlePlaceholder')}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.category')}</Label>
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
                <Label>{t('form.priority')}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v as MaintenanceRequest['priority'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">{t('priorities.baixa')}</SelectItem>
                    <SelectItem value="media">{t('priorities.media')}</SelectItem>
                    <SelectItem value="alta">{t('priorities.alta')}</SelectItem>
                    <SelectItem value="urgente">{t('priorities.urgente')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.property')} *</Label>
                <Combobox
                  options={properties.map((p) => ({ value: p.id, label: p.name, description: p.code }))}
                  value={form.propertyId}
                  onChange={(value, option) =>
                    setForm((p) => ({ ...p, propertyId: value, propertyName: option.label }))
                  }
                  placeholder={t('selectProperty')}
                  searchPlaceholder={t('searchProperty')}
                  emptyText={t('emptyProperty')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.tenant')}</Label>
                <Combobox
                  options={tenants.map((t) => ({ value: t.id, label: t.name, description: t.cpf }))}
                  value={form.tenantId}
                  onChange={(value, option) =>
                    setForm((p) => ({ ...p, tenantId: value, tenantName: option.label }))
                  }
                  placeholder={t('selectTenant')}
                  searchPlaceholder={t('searchTenant')}
                  emptyText={t('emptyTenant')}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t('form.description')}</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={t('descriptionPlaceholder')}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={formLoading}>
              {formLoading ? t('opening') : t('openTicket')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewingRequest}
        onOpenChange={(open) => {
          if (!open) {
            setViewingRequest(null)
            setCommentText('')
          }
        }}
      >
        <DialogContent className="flex max-h-[90dvh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle className="pr-6">{viewingRequest?.title}</DialogTitle>
          </DialogHeader>

          {viewingRequest && (() => {
            const entityPhotos = resolveMaintenanceEntityPhotos(viewingRequest, photoLookups)
            const assetLabel = ASSET_TYPE_LABEL[entityPhotos.assetType ?? 'imovel']
            return (
            // Mobile: scroll único para todo o conteúdo empilhado.
            // Desktop: overflow oculto aqui — cada coluna do grid tem seu próprio scroll.
            <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
              <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:h-full">
              <div className="space-y-4 lg:overflow-y-auto lg:pr-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusConfig[viewingRequest.status].variant}>
                    {statusConfig[viewingRequest.status].label}
                  </Badge>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {categoryLabels[viewingRequest.category]}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                    {t('priorityWithValue', { value: t(`priorities.${viewingRequest.priority}`) })}
                  </span>
                </div>

                <MaintenanceEntityPhotos photos={entityPhotos} size="lg" showLabels />

                <div className="rounded-xl border bg-muted/30 p-3 text-sm space-y-2">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{assetLabel}</span>
                    <span className="font-medium text-right">{entityPhotos.assetName ?? viewingRequest.propertyName ?? '—'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t('form.tenant')}</span>
                    <span className="font-medium text-right">{entityPhotos.tenantName}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t('table.openedAt')}</span>
                    <span className="text-right">{formatRequestDate(viewingRequest)}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('form.description')}</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{viewingRequest.description}</p>
                </div>

                <MaintenanceRequestPhotos photos={viewingRequest.photos} />

                <div className="space-y-1.5">
                  <Label>{t('ticketStatus')}</Label>
                  <Select
                    value={viewingRequest.status}
                    onValueChange={(v) => handleStatusChange(v as MaintenanceStatus)}
                    disabled={statusLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <MaintenanceStatusHistoryPanel request={viewingRequest} />
              </div>

              <MaintenanceCommentsPanel
                comments={viewingRequest.comments ?? []}
                tenantId={viewingRequest.tenantId}
                tenantName={viewingRequest.tenantName}
                commentText={commentText}
                onCommentTextChange={setCommentText}
                onSubmit={handleAddComment}
                loading={commentLoading}
                inputId="gestor-comment"
                placeholder={t('commentPlaceholder')}
              />
            </div>
            </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
