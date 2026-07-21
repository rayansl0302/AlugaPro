import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addMonths, format, parseISO, startOfMonth, endOfMonth, setDate,
} from 'date-fns'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { getDateFnsLocale } from '@/i18n/dateLocales'
import {
  Search, CheckCircle, Clock, AlertTriangle, RefreshCw,
  ChevronLeft, ChevronRight, LayoutList, CalendarDays, Plus,
  FileCheck, Eye, MessageSquare, Mail, Bell, Send,
  ListFilter, ChevronDown, Check,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getCharges, updateCharge, generateChargesForContract, createCharge } from '@/services/charges'
import { getContracts } from '@/services/contracts'
import { getProperties } from '@/services/properties'
import { getTenants } from '@/services/tenants'
import { getVehicles } from '@/services/vehicles'
import { getEquipments } from '@/services/equipments'
import { Charge, Contract, ContractAssetType } from '@/types'
import { formatCurrency, getDaysLate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MarkPaidDialog } from './MarkPaidDialog'
import { MaintenanceEntityPhotos } from '@/components/maintenance/MaintenanceEntityPhotos'
import {
  buildMaintenancePhotoLookups,
  inferAssetType,
  resolveChargeEntityPhotos,
} from '@/lib/maintenanceEntityPhotos'

// ─── Constants ────────────────────────────────────────────────────────────────

type ViewMode = 'timeline' | 'list'
type AssetFilter = 'todos' | ContractAssetType

const ASSET_FILTER_LABEL: Record<AssetFilter, string> = {
  todos: 'Todos',
  imovel: 'Imóveis',
  veiculo: 'Veículos',
  equipamento: 'Equipamentos',
}

const STATUS_VARIANT = {
  pendente: 'warning',
  pago: 'success',
  atrasado: 'destructive',
  cancelado: 'secondary',
} as const

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
}

const MONTHS_BACK = 3
const MONTHS_FWD = 2
const TOTAL_MONTHS = MONTHS_BACK + 1 + MONTHS_FWD

// ─── Month chip ───────────────────────────────────────────────────────────────

interface MonthCellProps {
  contract: Contract
  monthDate: Date
  monthStr: string
  currentMonthStr: string
  todayStr: string
  charge: Charge | undefined
  canManage: boolean
  onMarkPaid: (c: Charge) => void
  onViewDetails: (c: Charge) => void
  onGenerate: (contract: Contract, monthDate: Date) => void
}

function MonthCell({
  contract, monthDate, monthStr, currentMonthStr, todayStr,
  charge, canManage, onMarkPaid, onViewDetails, onGenerate,
}: MonthCellProps) {
  const { t } = useTranslation('charges')
  const isCurrentMonth = monthStr === currentMonthStr

  const contractStartMonth = contract.startDate.slice(0, 7)
  const contractEndMonth = contract.endDate ? contract.endDate.slice(0, 7) : null

  const ring = isCurrentMonth ? 'ring-2 ring-primary ring-offset-1' : ''
  const base = `h-14 w-[64px] shrink-0 flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all ${ring}`

  // Outside contract range → dash
  if (monthStr < contractStartMonth || (contractEndMonth && monthStr > contractEndMonth)) {
    return (
      <div className={cn(base, 'text-muted-foreground/25', isCurrentMonth && 'bg-primary/5')}>
        <span className="text-base leading-none">—</span>
      </div>
    )
  }

  // Future month, no charge yet
  if (monthStr > currentMonthStr && !charge) {
    return (
      <div className={cn(base, 'border border-dashed border-muted-foreground/20 text-muted-foreground/40')}>
        <span className="text-base leading-none">·</span>
        <span className="mt-0.5">{t('futureShort')}</span>
      </div>
    )
  }

  // No charge in current/past month within contract range → offer to generate
  if (!charge) {
    if (!canManage) {
      return (
        <div className={cn(base, 'border border-dashed border-orange-300 text-orange-400')}>
          <span>?</span>
        </div>
      )
    }
    return (
      <button
        title={t('generateChargeOf', { month: format(monthDate, 'MMM/yyyy', { locale: getDateFnsLocale(i18n.language) }) })}
        onClick={() => onGenerate(contract, monthDate)}
        className={cn(
          base,
          'border border-dashed border-orange-300 bg-orange-50 text-orange-500',
          'hover:bg-orange-100 cursor-pointer',
          'dark:bg-orange-950/20 dark:border-orange-700 dark:text-orange-400',
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="mt-0.5">{t('generateShort')}</span>
      </button>
    )
  }

  if (charge.receiptStatus === 'aguardando') {
    return (
      <button
        type="button"
        title={t('timeline.receiptSentTitle')}
        onClick={() => onViewDetails(charge)}
        className={cn(
          base,
          'border border-orange-300 bg-orange-50 text-orange-700',
          'hover:bg-orange-100 cursor-pointer',
          'dark:bg-orange-950/30 dark:border-orange-700 dark:text-orange-400',
        )}
      >
        <FileCheck className="h-3.5 w-3.5" />
        <span className="mt-0.5 text-[9px] leading-tight">{t('timeline.validate')}</span>
      </button>
    )
  }

  // Paid
  if (charge.status === 'pago') {
    return (
      <button
        title={t('timeline.paidOnTitle', { date: charge.paidDate ? format(parseISO(charge.paidDate), 'dd/MM/yyyy') : '—' })}
        onClick={() => onViewDetails(charge)}
        className={cn(
          base,
          'border border-green-200 bg-green-50 text-green-700',
          'hover:bg-green-100',
          'dark:bg-green-950/30 dark:border-green-800 dark:text-green-400',
        )}
      >
        <CheckCircle className="h-3.5 w-3.5" />
        <span className="mt-0.5">{t('timeline.paid')}</span>
      </button>
    )
  }

  // Overdue
  const isOverdue = !!charge.dueDate && charge.dueDate < todayStr
  if (isOverdue) {
    const days = charge.daysLate ?? getDaysLate(charge.dueDate ?? '')
    return (
      <button
        title={t('timeline.overdueTitle', { count: days })}
        onClick={() => canManage && onMarkPaid(charge)}
        className={cn(
          base,
          'border border-red-200 bg-red-50 text-red-700',
          canManage ? 'hover:bg-red-100 cursor-pointer' : 'cursor-default',
          'dark:bg-red-950/30 dark:border-red-800 dark:text-red-400',
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="mt-0.5">{t('timeline.daysLateShort', { count: days })}</span>
      </button>
    )
  }

  // Pending (future charge that already exists, or current month not yet due)
  const isFutureCharge = monthStr > currentMonthStr
  return (
    <button
      title={t('timeline.dueOnTitle', { date: charge.dueDate ? format(parseISO(charge.dueDate), 'dd/MM') : '—' })}
      onClick={() => canManage && !isFutureCharge && onMarkPaid(charge)}
      className={cn(
        base,
        isFutureCharge
          ? 'border border-blue-200 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400'
          : 'border border-yellow-200 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-400',
        canManage && !isFutureCharge ? 'hover:bg-yellow-100 cursor-pointer' : 'cursor-default',
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      <span className="mt-0.5">{isFutureCharge ? t('timeline.scheduled') : t('timeline.pending')}</span>
    </button>
  )
}

// ─── Notification helpers ─────────────────────────────────────────────────────

function buildWhatsAppLink(whatsapp: string, text: string) {
  return `https://wa.me/55${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}

function chargeNotifyMessage(charge: Charge): string {
  const due = charge.dueDate ? format(parseISO(charge.dueDate), 'dd/MM/yyyy') : '—'
  const valor = formatCurrency(charge.totalAmount ?? charge.amount)
  return (
    `Olá ${charge.tenantName ?? 'Inquilino'}, você tem uma cobrança pendente:\n` +
    `📋 *${charge.description}*\n` +
    `🏠 ${charge.propertyName ?? ''}\n` +
    `📅 Vencimento: ${due}\n` +
    `💰 Valor: ${valor}\n\n` +
    `Por favor, realize o pagamento para evitar encargos. AlugaPro.`
  )
}

interface NotifyDropdownProps {
  tenantWhatsApp?: string
  tenantEmail?: string
  message: string
  emailSubject: string
  chargeId?: string
  companyId?: string
  trigger?: string
  disabled?: boolean
}

function NotifyDropdown({
  tenantWhatsApp, tenantEmail, message, emailSubject,
  chargeId, companyId, trigger, disabled,
}: NotifyDropdownProps) {
  const { t } = useTranslation('charges')
  const [sending, setSending] = useState(false)

  const handleWhatsApp = () => {
    if (!tenantWhatsApp) {
      toast({ title: t('toast.noWhatsapp'), variant: 'destructive' })
      return
    }
    window.open(buildWhatsAppLink(tenantWhatsApp, message), '_blank')
  }

  const handleEmail = () => {
    if (!tenantEmail) {
      toast({ title: t('toast.noEmail'), variant: 'destructive' })
      return
    }
    window.location.href = `mailto:${tenantEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(message)}`
  }

  // Envio automático via servidor (Evolution API) — requer EVOLUTION_API configurado
  const handleAutoSend = async () => {
    if (!tenantWhatsApp) {
      toast({ title: t('toast.noWhatsapp'), variant: 'destructive' })
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/whatsapp-notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': import.meta.env.VITE_INTERNAL_API_KEY ?? '',
        },
        body: JSON.stringify({
          phone: tenantWhatsApp,
          message,
          chargeId,
          companyId,
          trigger: trigger ?? 'manual',
        }),
      })
      if (res.ok) {
        toast({ title: t('toast.whatsappSent') })
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        toast({ title: t('toast.sendFail', { error }), variant: 'destructive' })
      }
    } catch {
      toast({ title: t('toast.networkError'), variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled || sending} className="gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          {sending ? t('buttons.sending') : t('buttons.notify')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleWhatsApp}>
          <MessageSquare className="mr-2 h-4 w-4 text-green-600" />
          {t('notify.whatsappApp')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleAutoSend}>
          <Send className="mr-2 h-4 w-4 text-green-700" />
          {t('notify.whatsappAuto')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmail}>
          <Mail className="mr-2 h-4 w-4 text-blue-600" />
          {t('notify.email')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ChargesPage() {
  const { t } = useTranslation('charges')
  const { t: tCommon } = useTranslation('common')
  const assetFilterLabel: Record<AssetFilter, string> = {
    todos: t('filters.all'),
    imovel: t('assetTypes.imovel'),
    veiculo: t('assetTypes.veiculo'),
    equipamento: t('assetTypes.equipamento'),
  }
  const statusLabel = (status: string) =>
    status === 'todos' ? t('filters.all') : tCommon(`status.${status}`, { defaultValue: STATUS_LABEL[status] ?? status })
  const { user } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.companyId ?? ''
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const currentMonthStr = todayStr.slice(0, 7)

  const canManage = user?.role === 'admin' || user?.role === 'gestor'

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [centerMonth, setCenterMonth] = useState(startOfMonth(new Date()))
  const [search, setSearch] = useState('')
  const [tenantFilter, setTenantFilter] = useState('todos')
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [payingCharge, setPayingCharge] = useState<Charge | null>(null)
  const [viewingCharge, setViewingCharge] = useState<Charge | null>(null)
  const [generating, setGenerating] = useState(false)

  // Data
  const { data: charges = [], isLoading: chargesLoading } = useQuery({
    queryKey: ['charges', companyId],
    queryFn: () => getCharges(companyId),
    enabled: !!companyId,
    refetchInterval: 30_000,
  })

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts', companyId],
    queryFn: () => getContracts(companyId),
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

  const contractById = useMemo(
    () => Object.fromEntries(contracts.map((contract) => [contract.id, contract])),
    [contracts],
  )

  const matchesAssetFilter = (propertyId: string, contractAssetType?: ContractAssetType) =>
    assetFilter === 'todos' || inferAssetType(propertyId, photoLookups, contractAssetType) === assetFilter

  const isLoading = chargesLoading || contractsLoading

  // Enrich charges with overdue
  const enriched = useMemo(() =>
    charges.map((c) => {
      if (c.status !== 'pago' && c.dueDate && c.dueDate < todayStr) {
        return { ...c, status: 'atrasado' as const, daysLate: getDaysLate(c.dueDate) }
      }
      return c
    }),
    [charges, todayStr],
  )

  // Index: contractId → monthStr → Charge
  const chargeIndex = useMemo(() => {
    const map = new Map<string, Map<string, Charge>>()
    for (const c of enriched) {
      if (!c.contractId || !c.dueDate) continue
      const month = c.dueDate.slice(0, 7)
      if (!map.has(c.contractId)) map.set(c.contractId, new Map())
      map.get(c.contractId)!.set(month, c)
    }
    return map
  }, [enriched])

  const activeContracts = useMemo(() =>
    contracts.filter((c) => c.status === 'ativo' || c.status === 'renovado'),
    [contracts],
  )

  const tenantOptions = useMemo(() => {
    const map = new Map<string, string>()
    activeContracts.forEach((c) => { if (c.tenantId && c.tenantName) map.set(c.tenantId, c.tenantName) })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [activeContracts])

  const filteredContracts = useMemo(() =>
    activeContracts.filter((c) => {
      const q = search.toLowerCase()
      const matchSearch = !q || c.tenantName?.toLowerCase().includes(q) || c.propertyName?.toLowerCase().includes(q)
      const matchTenant = tenantFilter === 'todos' || c.tenantId === tenantFilter
      const matchAsset = matchesAssetFilter(c.propertyId, c.assetType)
      return matchSearch && matchTenant && matchAsset
    }),
    [activeContracts, search, tenantFilter, assetFilter, photoLookups],
  )

  const visibleMonths = useMemo(() =>
    Array.from({ length: TOTAL_MONTHS }, (_, i) => addMonths(centerMonth, i - MONTHS_BACK)),
    [centerMonth],
  )

  const filteredList = useMemo(() =>
    enriched.filter((c) => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        c.tenantName?.toLowerCase().includes(q) ||
        c.propertyName?.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'todos' || c.status === statusFilter
      const matchTenant = tenantFilter === 'todos' || c.tenantId === tenantFilter
      const contract = c.contractId ? contractById[c.contractId] : undefined
      const matchAsset = matchesAssetFilter(c.propertyId, contract?.assetType)
      return matchSearch && matchStatus && matchTenant && matchAsset
    }),
    [enriched, search, statusFilter, tenantFilter, assetFilter, contractById, photoLookups],
  )

  const listPag = usePagination(filteredList, 15)

  // KPIs
  const kpiPending = enriched.filter((c) => c.status === 'pendente').reduce((s, c) => s + c.amount, 0)
  const kpiOverdue = enriched.filter((c) => c.status === 'atrasado').reduce((s, c) => s + c.amount, 0)
  const kpiPaid = enriched.filter((c) => c.status === 'pago').reduce((s, c) => s + (c.paidAmount ?? c.amount), 0)
  const pendingReceipts = enriched.filter((c) => c.receiptStatus === 'aguardando').length
  const firstPendingReceipt = enriched.find((c) => c.receiptStatus === 'aguardando') ?? null

  // Actions
  const handleGenerateAll = async () => {
    if (activeContracts.length === 0) { toast({ title: t('toast.noActiveContract') }); return }
    setGenerating(true)
    try {
      let total = 0
      for (const contract of activeContracts) total += await generateChargesForContract(contract)
      qc.invalidateQueries({ queryKey: ['charges'] })
      toast({ title: total > 0 ? t('toast.generatedCount', { count: total }) : t('toast.alreadyUpdated') })
    } catch {
      toast({ title: t('toast.generateError'), variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateSingle = async (contract: Contract, monthDate: Date) => {
    try {
      const lastDay = endOfMonth(monthDate).getDate()
      const day = Math.min(contract.dueDay, lastDay)
      const dueDate = format(setDate(monthDate, day), 'yyyy-MM-dd')
      await createCharge({
        companyId,
        contractId: contract.id,
        propertyId: contract.propertyId,
        propertyName: contract.propertyName ?? '',
        tenantId: contract.tenantId,
        tenantName: contract.tenantName ?? '',
        type: 'aluguel',
        description: `Aluguel ${format(monthDate, 'MM/yyyy')}`,
        amount: contract.rentValue,
        dueDate,
        status: 'pendente',
      })
      qc.invalidateQueries({ queryKey: ['charges'] })
      toast({ title: t('toast.generatedMonth', { month: format(monthDate, 'MMM/yyyy', { locale: getDateFnsLocale(i18n.language) }) }) })
    } catch {
      toast({ title: t('toast.generateOneError'), variant: 'destructive' })
    }
  }

  const handleConfirmReceipt = async (charge: Charge) => {
    try {
      await updateCharge(charge.id, { receiptStatus: 'confirmado', status: 'pago', paidBy: 'admin' })
      qc.invalidateQueries({ queryKey: ['charges'] })
      toast({ title: t('toast.receiptConfirmed') })
      setViewingCharge(null)
    } catch {
      toast({ title: t('toast.confirmError'), variant: 'destructive' })
    }
  }

  const handleRejectReceipt = async (charge: Charge) => {
    try {
      await updateCharge(charge.id, { receiptStatus: 'rejeitado' })
      qc.invalidateQueries({ queryKey: ['charges'] })
      toast({ title: t('toast.receiptRejected') })
      setViewingCharge(null)
    } catch {
      toast({ title: t('toast.rejectError'), variant: 'destructive' })
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header bar ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholderPage')}
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
                    {assetFilterLabel[assetFilter]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(['todos', 'imovel', 'veiculo', 'equipamento'] as const).map((type) => (
                  <DropdownMenuItem key={type} onClick={() => setAssetFilter(type)} className="justify-between gap-4">
                    {assetFilterLabel[type]}
                    {assetFilter === type && <Check className="h-3.5 w-3.5" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {tenantOptions.length > 1 && (
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder={t('allTenants')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">{t('allTenants')}</SelectItem>
                  {tenantOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-md border p-0.5 bg-muted/30">
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 px-3"
                onClick={() => setViewMode('timeline')}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {t('view.calendar')}
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 px-3"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-3.5 w-3.5" />
                {t('view.list')}
              </Button>
            </div>

            {canManage && (
              <Button variant="outline" size="sm" onClick={handleGenerateAll} disabled={generating}>
                <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', generating && 'animate-spin')} />
                {t('generateCharges')}
              </Button>
            )}
          </div>
        </div>

        {/* Status filter — only in list mode */}
        {viewMode === 'list' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="justify-between gap-2">
                <span className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4" />
                  {statusLabel(statusFilter)}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(['todos', 'pendente', 'atrasado', 'pago', 'cancelado'] as const).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="justify-between gap-4">
                  {statusLabel(s)}
                  {statusFilter === s && <Check className="h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-7 w-7 text-yellow-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('kpi.pending')}</p>
              <p className="font-bold">{formatCurrency(kpiPending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-red-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('kpi.overdue')}</p>
              <p className="font-bold text-destructive">{formatCurrency(kpiOverdue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-7 w-7 text-green-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('kpi.received')}</p>
              <p className="font-bold text-green-600">{formatCurrency(kpiPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={pendingReceipts > 0 ? 'border-orange-300 dark:border-orange-700' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn('h-7 w-7 shrink-0 flex items-center justify-center rounded-full text-sm font-bold', pendingReceipts > 0 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40' : 'bg-muted text-muted-foreground')}>
              {pendingReceipts}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{t('kpi.pendingReceipts')}</p>
              <p className="text-sm font-medium">{pendingReceipts === 0 ? t('none') : t('toValidate', { count: pendingReceipts })}</p>
            </div>
            {pendingReceipts > 0 && canManage && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => setViewingCharge(firstPendingReceipt)}
              >
                <Eye className="mr-1.5 h-4 w-4" />
                {tCommon('actions.view')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {pendingReceipts > 0 && canManage && (
        <div className="flex flex-col gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 shrink-0" />
            <span>
              {pendingReceipts === 1
                ? t('pendingReceiptOne')
                : t('pendingReceiptMany', { count: pendingReceipts })}
            </span>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-orange-600 hover:bg-orange-700"
            onClick={() => setViewingCharge(firstPendingReceipt)}
          >
            <Eye className="mr-1.5 h-4 w-4" />
            {t('viewReceipt')}
          </Button>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : viewMode === 'timeline' ? (

        /* ─── Timeline / Calendar View ───────────────────────────────────── */
        <div className="rounded-lg border overflow-hidden">
          {/* Scrollable inner wrapper */}
          <div className="overflow-x-auto">
            {/* Min-width ensures chips never collapse */}
            <div style={{ minWidth: 760 }}>

              {/* Month header with navigation */}
              <div className="flex items-center border-b bg-muted/30 px-4 py-2.5 gap-2">
                <div className="w-[240px] shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('tenantAsset')}
                </div>
                <div className="w-[72px] shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right pr-2">
                  {t('rent')}
                </div>
                <div className="w-[140px] shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                  {t('table.actions')}
                </div>
                <Button
                  variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                  onClick={() => setCenterMonth((m) => addMonths(m, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-1 justify-between">
                  {visibleMonths.map((m) => {
                    const mStr = format(m, 'yyyy-MM')
                    const isCurrent = mStr === currentMonthStr
                    return (
                      <div
                        key={mStr}
                        className={cn(
                          'w-[68px] shrink-0 text-center leading-tight',
                          isCurrent ? 'text-primary font-bold' : 'text-muted-foreground',
                        )}
                      >
                        <div className="text-xs uppercase">{format(m, 'MMM', { locale: getDateFnsLocale(i18n.language) })}</div>
                        <div className="text-[10px]">{format(m, 'yyyy')}</div>
                        {isCurrent && (
                          <div className="mx-auto mt-0.5 h-0.5 w-4 rounded-full bg-primary" />
                        )}
                      </div>
                    )
                  })}
                </div>
                <Button
                  variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                  onClick={() => setCenterMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Contract rows */}
              {filteredContracts.length === 0 ? (
                <div className="py-16 text-center">
                  <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="font-medium text-muted-foreground">{t('noActiveContracts')}</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    {t('createContractHint')}
                  </p>
                </div>
              ) : (
                filteredContracts.map((contract, idx) => {
                  const contractChargeMap = chargeIndex.get(contract.id)
                  const pendingReceiptCharges = contractChargeMap
                    ? Array.from(contractChargeMap.values()).filter((c) => c.receiptStatus === 'aguardando')
                    : []
                  const pendingReceiptCount = pendingReceiptCharges.length
                  const firstPendingReceipt = pendingReceiptCharges[0]

                  const overdueCount = contractChargeMap
                    ? Array.from(contractChargeMap.values()).filter((c) => c.status === 'atrasado').length
                    : 0

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

                  return (
                    <div
                      key={contract.id}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 hover:bg-muted/20 transition-colors',
                        idx < filteredContracts.length - 1 && 'border-b',
                      )}
                    >
                      {/* Tenant + property */}
                      <div className="w-[240px] shrink-0 min-w-0">
                        <div className="flex items-start gap-2">
                          <MaintenanceEntityPhotos photos={entityPhotos} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate">{entityPhotos.tenantName}</p>
                              {overdueCount > 0 && (
                                <Badge variant="destructive" className="h-4 px-1 text-[9px]">{overdueCount}</Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {entityPhotos.assetName ?? contract.propertyName ?? '—'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Rent value */}
                      <div className="w-[72px] shrink-0 text-right pr-2">
                        <p className="text-sm font-bold text-primary">{formatCurrency(contract.rentValue)}</p>
                        <p className="text-[10px] text-muted-foreground">{t('dayShort', { day: contract.dueDay })}</p>
                      </div>

                      <div className="w-[140px] shrink-0 flex flex-col items-center justify-center gap-1">
                        {pendingReceiptCount > 0 && (
                          <>
                            <Badge variant="warning" className="h-5 px-1.5 text-[10px]">
                              {t('awaitingCount', { count: pendingReceiptCount })}
                            </Badge>
                            {canManage && firstPendingReceipt && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] border-orange-300 text-orange-700 hover:bg-orange-50"
                                onClick={() => setViewingCharge(firstPendingReceipt)}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                {t('buttons.validate')}
                              </Button>
                            )}
                          </>
                        )}
                        {canManage && (() => {
                          const tenant = tenants.find((t) => t.id === contract.tenantId)
                          const pendingCharge = contractChargeMap
                            ? Array.from(contractChargeMap.values()).find(
                                (c) => c.status === 'atrasado' || c.status === 'pendente',
                              )
                            : undefined
                          if (!pendingCharge) return null
                          return (
                            <NotifyDropdown
                              tenantWhatsApp={tenant?.whatsapp}
                              tenantEmail={tenant?.email}
                              message={chargeNotifyMessage(pendingCharge)}
                              emailSubject={`Cobrança: ${pendingCharge.description} — AlugaPro`}
                              chargeId={pendingCharge.id}
                              companyId={pendingCharge.companyId}
                              trigger="manual"
                            />
                          )
                        })()}
                        {!pendingReceiptCount && !canManage && (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </div>

                      {/* Navigation spacer left */}
                      <div className="w-6 shrink-0" />

                      {/* Month chips */}
                      <div className="flex flex-1 justify-between">
                        {visibleMonths.map((monthDate) => {
                          const mStr = format(monthDate, 'yyyy-MM')
                          const charge = contractChargeMap?.get(mStr)
                          return (
                            <div key={mStr} className="w-[68px] shrink-0 flex justify-center">
                              <MonthCell
                                contract={contract}
                                monthDate={monthDate}
                                monthStr={mStr}
                                currentMonthStr={currentMonthStr}
                                todayStr={todayStr}
                                charge={charge}
                                canManage={canManage}
                                onMarkPaid={setPayingCharge}
                                onViewDetails={setViewingCharge}
                                onGenerate={handleGenerateSingle}
                              />
                            </div>
                          )
                        })}
                      </div>

                      {/* Navigation spacer right */}
                      <div className="w-6 shrink-0" />
                    </div>
                  )
                })
              )}

            </div>{/* /min-width wrapper */}
          </div>{/* /overflow-x-auto */}

          {/* Legend — outside scroll so it stays visible */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-muted/10 px-4 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> {tCommon('status.pago')}</span>
            <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" /> {tCommon('status.atrasado')}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-500" /> {tCommon('status.pendente')}</span>
            <span className="flex items-center gap-1 text-orange-500"><FileCheck className="h-3 w-3" /> {t('legend.receipt')}</span>
            <span className="flex items-center gap-1 text-blue-500"><Clock className="h-3 w-3" /> {t('legend.scheduled')}</span>
            <span className="flex items-center gap-1 text-orange-400"><Plus className="h-3 w-3" /> {t('generateCharge')}</span>
            <span>— {t('legend.outOfRange')}</span>
          </div>
        </div>

      ) : (

        /* ─── List View ──────────────────────────────────────────────────── */
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.description')}</TableHead>
                <TableHead>{t('table.tenant')}</TableHead>
                <TableHead>{t('table.asset')}</TableHead>
                <TableHead>{t('table.dueDate')}</TableHead>
                <TableHead>{t('table.amount')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead className="text-right">{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    {t('emptyTitle')}
                  </td>
                </TableRow>
              ) : (
                listPag.pageItems.map((charge) => {
                  const contract = charge.contractId ? contractById[charge.contractId] : undefined
                  const entityPhotos = resolveChargeEntityPhotos(
                    {
                      tenantId: charge.tenantId,
                      tenantName: charge.tenantName,
                      propertyId: charge.propertyId,
                      propertyName: charge.propertyName,
                      assetType: contract?.assetType,
                    },
                    photoLookups,
                  )

                  return (
                  <TableRow
                    key={charge.id}
                    className={charge.status === 'atrasado' ? 'bg-destructive/5' : ''}
                  >
                    <TableCell className="font-medium">{charge.description}</TableCell>
                    <TableCell className="max-w-[180px]">
                      <MaintenanceEntityPhotos photos={entityPhotos} variant="tenant" />
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <MaintenanceEntityPhotos photos={entityPhotos} variant="asset" />
                    </TableCell>
                    <TableCell className="text-sm">
                      {charge.dueDate ? format(parseISO(charge.dueDate), 'dd/MM/yyyy') : '—'}
                      {charge.daysLate ? (
                        <span className="ml-1 text-xs text-destructive">({charge.daysLate}d)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(charge.paidAmount ?? charge.totalAmount ?? charge.amount)}
                      {charge.paidAmount && charge.paidAmount !== charge.amount && (
                        <span className="ml-1 text-xs line-through text-muted-foreground">
                          {formatCurrency(charge.amount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={STATUS_VARIANT[charge.status]}>
                          {statusLabel(charge.status)}
                        </Badge>
                        {charge.receiptStatus === 'aguardando' && (
                          <Badge variant="warning" className="text-[10px]">{t('receiptPendingBadge')}</Badge>
                        )}
                        {(charge.notificationsSent?.length ?? 0) > 0 && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Send className="h-2.5 w-2.5" />
                            {t('waSent', { count: charge.notificationsSent!.length })}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {charge.receipt && charge.receiptStatus === 'aguardando' && canManage && (
                          <Button
                            size="sm" variant="outline"
                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={() => setViewingCharge(charge)}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            {t('viewReceipt')}
                          </Button>
                        )}
                        {charge.status === 'pago' && (
                          <Button size="sm" variant="ghost" onClick={() => setViewingCharge(charge)}>
                            {t('buttons.see')}
                          </Button>
                        )}
                        {charge.status !== 'pago' && charge.status !== 'cancelado' && canManage && charge.receiptStatus !== 'aguardando' && (
                          <Button size="sm" onClick={() => setPayingCharge(charge)}>
                            <CheckCircle className="mr-1 h-3 w-3" /> {t('buttons.paid')}
                          </Button>
                        )}
                        {charge.status !== 'pago' && charge.status !== 'cancelado' && canManage && (
                          <NotifyDropdown
                            tenantWhatsApp={tenants.find((t) => t.id === charge.tenantId)?.whatsapp}
                            tenantEmail={tenants.find((t) => t.id === charge.tenantId)?.email}
                            message={chargeNotifyMessage(charge)}
                            emailSubject={`Cobrança: ${charge.description} — AlugaPro`}
                            chargeId={charge.id}
                            companyId={charge.companyId}
                            trigger="manual"
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          {filteredList.length > 0 && (
            <div className="border-t px-4 py-3">
              <Pagination
                page={listPag.page}
                totalPages={listPag.totalPages}
                total={listPag.total}
                rangeStart={listPag.rangeStart}
                rangeEnd={listPag.rangeEnd}
                onPageChange={listPag.setPage}
                itemLabel={t('itemLabel')}
              />
            </div>
          )}
        </div>
      )}

      {/* ─── Dialogs ──────────────────────────────────────────────────────── */}

      <MarkPaidDialog
        charge={payingCharge}
        companyId={companyId}
        onClose={() => setPayingCharge(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['charges'] })
          setPayingCharge(null)
        }}
      />

      {/* Payment details / receipt validation dialog */}
      <Dialog open={!!viewingCharge} onOpenChange={() => setViewingCharge(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {viewingCharge?.receiptStatus === 'aguardando' ? t('dialog.validateReceipt') : t('dialog.paymentDetails')}
            </DialogTitle>
          </DialogHeader>
          {viewingCharge && (
            <div className="space-y-4">
              {/* Charge summary */}
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('dialog.charge')}</span>
                  <span className="font-medium">{viewingCharge.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('dialog.tenant')}</span>
                  <span>{viewingCharge.tenantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('dialog.originalAmount')}</span>
                  <span className="font-bold">{formatCurrency(viewingCharge.amount)}</span>
                </div>
                {viewingCharge.paidAmount && viewingCharge.paidAmount !== viewingCharge.amount && (
                  <div className="flex justify-between border-t pt-1.5">
                    <span className="text-muted-foreground">{t('dialog.paidAmount')}</span>
                    <span className="font-bold text-green-600">{formatCurrency(viewingCharge.paidAmount)}</span>
                  </div>
                )}
                {viewingCharge.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('dialog.method')}</span>
                    <span className="capitalize">{viewingCharge.paymentMethod}</span>
                  </div>
                )}
                {viewingCharge.paidDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('dialog.paymentDate')}</span>
                    <span>{format(parseISO(viewingCharge.paidDate), 'dd/MM/yyyy')}</span>
                  </div>
                )}
                {viewingCharge.notes && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{t('dialog.notes')}</span>
                    <span className="text-right">{viewingCharge.notes}</span>
                  </div>
                )}
              </div>

              {/* Receipt image */}
              {viewingCharge.receipt && (
                <a href={viewingCharge.receipt} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={viewingCharge.receipt}
                    alt={t('dialog.receiptAlt')}
                    className="w-full rounded-lg border object-contain max-h-64"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <p className="mt-1.5 text-center text-xs text-primary underline">{t('dialog.openReceiptNewTab')}</p>
                </a>
              )}

              {/* Validation actions */}
              {viewingCharge.receiptStatus === 'aguardando' && canManage && (
                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleConfirmReceipt(viewingCharge)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> {t('dialog.confirmPaid')}
                  </Button>
                  <Button
                    variant="destructive" className="flex-1"
                    onClick={() => handleRejectReceipt(viewingCharge)}
                  >
                    {t('dialog.reject')}
                  </Button>
                </div>
              )}

              {viewingCharge.status === 'pago' && viewingCharge.receiptStatus !== 'aguardando' && (
                <Badge variant="success" className="w-full justify-center py-1.5">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('dialog.paymentConfirmed')}
                </Badge>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
