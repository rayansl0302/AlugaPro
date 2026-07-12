import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { getDateFnsLocale } from '@/i18n/dateLocales'
import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addMonths, format, setDate, endOfMonth, startOfMonth,
} from 'date-fns'
import {
  DollarSign, CheckCircle, Clock, AlertTriangle, Users,
  ChevronLeft, ChevronRight, LayoutList, CalendarDays, Plus, Search, FileCheck, Eye,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getSharedExpenses, createSharedExpense, splitExpenseEqually } from '@/services/sharedExpenses'
import { countPendingExpenseReceipts, findFirstPendingExpenseReceipt } from '@/lib/pendingReceipts'
import { getProperties } from '@/services/properties'
import { getTenants } from '@/services/tenants'
import { SharedExpense, ExpenseType } from '@/types'
import { formatCurrency, formatDateOptional } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { SharedExpensePayDialog } from './SharedExpensePayDialog'

// ─── Constants ────────────────────────────────────────────────────────────────

type ViewMode = 'timeline' | 'list'

const MONTHS_BACK  = 3
const MONTHS_FWD   = 2
const TOTAL_MONTHS = MONTHS_BACK + 1 + MONTHS_FWD

const EXPENSE_TYPE_KEYS: ExpenseType[] = ['internet', 'energia', 'agua', 'gas', 'iptu', 'condominio', 'seguranca', 'outro']

const STATUS_BADGE = { pendente: 'warning', pago: 'success', parcial: 'info' } as const

// ─── Timeline month cell ──────────────────────────────────────────────────────

interface ExpenseCellProps {
  expense:         SharedExpense
  monthDate:       Date
  monthStr:        string
  currentMonthStr: string
  todayStr:        string
  canManage:       boolean
  onManage:        (id: string) => void
}

function ExpenseMonthCell({
  expense, monthDate, monthStr, currentMonthStr, todayStr, canManage, onManage,
}: ExpenseCellProps) {
  const { t } = useTranslation('sharedExpenses')
  const isCurrentMonth = monthStr === currentMonthStr
  const ring = isCurrentMonth ? 'ring-2 ring-primary ring-offset-1' : ''
  const base = `h-14 w-[64px] shrink-0 flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all ${ring}`

  // One-time: only visible in the due month
  if (!expense.recurring) {
    const dueMonth = expense.dueDate?.slice(0, 7)
    if (!dueMonth || monthStr !== dueMonth) {
      return (
        <div className={cn(base, 'text-muted-foreground/25', isCurrentMonth && 'bg-primary/5')}>
          <span className="text-base leading-none">—</span>
        </div>
      )
    }
  }

  // Recurring: past months have no per-month payment records — show dash to avoid
  // incorrectly cascading the current status (e.g. "atraso") across all previous months
  if (expense.recurring && monthStr < currentMonthStr) {
    return (
      <div className={cn(base, 'text-muted-foreground/25')}>
        <span className="text-base leading-none">—</span>
      </div>
    )
  }

  // Future month
  if (monthStr > currentMonthStr) {
    return (
      <button
        title={t('futureMonth')}
        onClick={() => canManage && onManage(expense.id)}
        className={cn(
          base,
          'border border-dashed border-blue-200 bg-blue-50 text-blue-600',
          canManage ? 'hover:bg-blue-100 cursor-pointer' : 'cursor-default',
          'dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400',
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        <span className="mt-0.5">{t('timeline.scheduled')}</span>
      </button>
    )
  }

  // Paid
  if (expense.status === 'pago') {
    return (
      <button
        title={t('allPaid')}
        onClick={() => onManage(expense.id)}
        className={cn(
          base,
          'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer',
          'dark:bg-green-950/30 dark:border-green-800 dark:text-green-400',
        )}
      >
        <CheckCircle className="h-3.5 w-3.5" />
        <span className="mt-0.5">{t('timeline.paid')}</span>
      </button>
    )
  }

  // Partial
  if (expense.status === 'parcial') {
    return (
      <button
        title={t('timeline.partialTitle')}
        onClick={() => canManage && onManage(expense.id)}
        className={cn(
          base,
          'border border-orange-200 bg-orange-50 text-orange-600',
          canManage ? 'hover:bg-orange-100 cursor-pointer' : 'cursor-default',
          'dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400',
        )}
      >
        <Users className="h-3.5 w-3.5" />
        <span className="mt-0.5">{t('timeline.partial')}</span>
      </button>
    )
  }

  // Compute overdue
  let isOverdue = false
  if (!expense.recurring && expense.dueDate) {
    isOverdue = expense.dueDate < todayStr
  } else if (expense.recurring && expense.dueDay) {
    const lastDay = endOfMonth(monthDate).getDate()
    const day = Math.min(expense.dueDay, lastDay)
    isOverdue = format(setDate(monthDate, day), 'yyyy-MM-dd') < todayStr
  }

  if (isOverdue) {
    return (
      <button
        title={t('timeline.overdueTitle')}
        onClick={() => canManage && onManage(expense.id)}
        className={cn(
          base,
          'border border-red-200 bg-red-50 text-red-700',
          canManage ? 'hover:bg-red-100 cursor-pointer' : 'cursor-default',
          'dark:bg-red-950/30 dark:border-red-800 dark:text-red-400',
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="mt-0.5">{t('timeline.overdue')}</span>
      </button>
    )
  }

  return (
    <button
      title={t('timeline.pendingTitle')}
      onClick={() => canManage && onManage(expense.id)}
      className={cn(
        base,
        'border border-yellow-200 bg-yellow-50 text-yellow-700',
        canManage ? 'hover:bg-yellow-100 cursor-pointer' : 'cursor-default',
        'dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-400',
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      <span className="mt-0.5">{t('timeline.pending')}</span>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SharedExpensesPage() {
  const { t } = useTranslation('sharedExpenses')
  const { t: tCommon } = useTranslation('common')
  const expenseTypeLabel = (type: ExpenseType) => t(`types.${type}`, { defaultValue: type })
  const EXPENSE_TYPE_LABELS = EXPENSE_TYPE_KEYS.reduce((acc, key) => {
    acc[key] = expenseTypeLabel(key)
    return acc
  }, {} as Record<ExpenseType, string>)
  const { user } = useAuth()
  const qc = useQueryClient()
  const companyId       = user?.companyId ?? ''
  const todayStr        = format(new Date(), 'yyyy-MM-dd')
  const currentMonthStr = todayStr.slice(0, 7)
  const canManage       = user?.role === 'admin' || user?.role === 'gestor'

  const [viewMode, setViewMode]               = useState<ViewMode>('timeline')
  const [centerMonth, setCenterMonth]         = useState(startOfMonth(new Date()))
  const [search, setSearch]                   = useState('')
  const [propertyFilter, setPropertyFilter]   = useState('todos')
  const [statusFilter, setStatusFilter]       = useState('todos')
  const [managingId, setManagingId]           = useState<string | null>(null)
  const [initialReceiptIndex, setInitialReceiptIndex] = useState<number | null>(null)
  const [showForm, setShowForm]               = useState(false)
  const [formLoading, setFormLoading]         = useState(false)
  const [formData, setFormData] = useState({
    propertyId: '', propertyName: '', type: 'internet' as ExpenseType,
    description: '', totalAmount: '', dueDate: '',
    recurring: false, dueDay: '', participantsRaw: '',
  })

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['sharedExpenses', companyId],
    queryFn: () => getSharedExpenses(companyId),
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

  // Always derive from live query — auto-updates after mark-paid without closing dialog
  const managingExpense = managingId ? (expenses.find((e) => e.id === managingId) ?? null) : null

  const visibleMonths = useMemo(() =>
    Array.from({ length: TOTAL_MONTHS }, (_, i) => addMonths(centerMonth, i - MONTHS_BACK)),
    [centerMonth],
  )

  const propertyOptions = useMemo(() => {
    const map = new Map<string, string>()
    expenses.forEach((e) => { if (e.propertyId && e.propertyName) map.set(e.propertyId, e.propertyName) })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [expenses])

  const filteredExpenses = useMemo(() =>
    expenses.filter((e) => {
      const q = search.toLowerCase()
      const matchSearch   = !q || e.description.toLowerCase().includes(q) || (e.propertyName ?? '').toLowerCase().includes(q)
      const matchProperty = propertyFilter === 'todos' || e.propertyId === propertyFilter
      const matchStatus   = statusFilter   === 'todos' || e.status === statusFilter
      return matchSearch && matchProperty && matchStatus
    }),
    [expenses, search, propertyFilter, statusFilter],
  )

  const cardsPag = usePagination(filteredExpenses, 12)

  const pendingReceipts = useMemo(
    () => countPendingExpenseReceipts(expenses),
    [expenses],
  )
  const firstPendingReceipt = useMemo(
    () => findFirstPendingExpenseReceipt(expenses),
    [expenses],
  )

  const openExpenseManager = (expenseId: string, receiptIndex: number | null = null) => {
    setInitialReceiptIndex(receiptIndex)
    setManagingId(expenseId)
  }

  const closeExpenseManager = () => {
    setManagingId(null)
    setInitialReceiptIndex(null)
  }

  const kpiPending = useMemo(() =>
    expenses.flatMap((e) => e.participants).filter((p) => p.status !== 'pago').reduce((s, p) => s + p.amount, 0),
    [expenses],
  )
  const kpiPaid = useMemo(() =>
    expenses.flatMap((e) => e.participants).filter((p) => p.status === 'pago').reduce((s, p) => s + p.amount, 0),
    [expenses],
  )
  const kpiOverdue = useMemo(() => {
    const today = new Date()
    return expenses.reduce((total, e) => {
      if (e.status === 'pago') return total
      let overdue = false
      if (!e.recurring && e.dueDate) {
        overdue = e.dueDate < todayStr
      } else if (e.recurring && e.dueDay) {
        const lastDay = endOfMonth(today).getDate()
        const virtualDue = format(setDate(startOfMonth(today), Math.min(e.dueDay, lastDay)), 'yyyy-MM-dd')
        overdue = virtualDue < todayStr
      }
      if (!overdue) return total
      return total + e.participants.filter((p) => p.status !== 'pago').reduce((s, p) => s + p.amount, 0)
    }, 0)
  }, [expenses, todayStr])

  const addParticipant = (tenantId: string, tenantName: string) => {
    setFormData((prev) => {
      const lines = prev.participantsRaw.split('\n').filter(Boolean)
      if (lines.some((l) => l.split(',')[0]?.trim() === tenantId)) return prev
      return { ...prev, participantsRaw: [...lines, `${tenantId},${tenantName}`].join('\n') }
    })
  }

  const handleCreate = async () => {
    try {
      setFormLoading(true)
      const participants = formData.participantsRaw
        .split('\n').filter(Boolean)
        .map((line) => {
          const [tid, tname] = line.split(',').map((s) => s.trim())
          return { tenantId: tid, tenantName: tname }
        })
      if (participants.length === 0) {
        toast({ title: t('toast.needParticipant'), variant: 'destructive' })
        return
      }
      const split = splitExpenseEqually(Number(formData.totalAmount), participants)
      const payload: Omit<SharedExpense, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId,
        propertyId: formData.propertyId,
        propertyName: formData.propertyName,
        type: formData.type,
        description: formData.description || EXPENSE_TYPE_LABELS[formData.type],
        totalAmount: Number(formData.totalAmount),
        participants: split,
        status: 'pendente',
        recurring: formData.recurring,
      }
      if (formData.recurring) {
        payload.dueDay = Number(formData.dueDay) || 1
      } else if (formData.dueDate) {
        payload.dueDate = formData.dueDate
      }
      await createSharedExpense(payload)
      qc.invalidateQueries({ queryKey: ['sharedExpenses'] })
      toast({ title: t('toast.created') })
      setShowForm(false)
      setFormData({
        propertyId: '', propertyName: '', type: 'internet',
        description: '', totalAmount: '', dueDate: '',
        recurring: false, dueDay: '', participantsRaw: '',
      })
    } catch {
      toast({ title: t('toast.createError'), variant: 'destructive' })
    } finally {
      setFormLoading(false)
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
            {propertyOptions.length > 1 && (
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('allProperties')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">{t('allProperties')}</SelectItem>
                  {propertyOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md border p-0.5 bg-muted/30">
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm" className="h-7 gap-1.5 px-3"
                onClick={() => setViewMode('timeline')}
              >
                <CalendarDays className="h-3.5 w-3.5" /> {t('view.calendar')}
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm" className="h-7 gap-1.5 px-3"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-3.5 w-3.5" /> {t('view.list')}
              </Button>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> {t('new')}
            </Button>
          </div>
        </div>

        {viewMode === 'list' && (
          <div className="flex gap-1 flex-wrap">
            {(['todos', 'pendente', 'parcial', 'pago'] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === 'todos' ? t('filters.all') : t(`statuses.${s}`)}
              </Button>
            ))}
          </div>
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
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('kpi.expenses')}</p>
              <p className="font-bold">{expenses.length}</p>
            </div>
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
          {firstPendingReceipt && (
            <Button
              size="sm"
              className="shrink-0 bg-orange-600 hover:bg-orange-700"
              onClick={() => openExpenseManager(
                firstPendingReceipt.expense.id,
                firstPendingReceipt.participantIndex,
              )}
            >
              <Eye className="mr-1.5 h-4 w-4" />
              {t('viewReceipt')}
            </Button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">{t('emptyTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            {t('emptyHint')}
          </p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t('new')}
          </Button>
        </div>
      ) : viewMode === 'timeline' ? (

        /* ─── Timeline view ──────────────────────────────────────────────── */
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 680 }}>

              {/* Month header */}
              <div className="flex items-center border-b bg-muted/30 px-4 py-2.5 gap-2">
                <div className="w-[180px] shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('expenseProperty')}
                </div>
                <div className="w-[72px] shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right pr-2">
                  {tCommon('ui.total')}
                </div>
                <div className="w-[112px] shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                  {t('receiptHead')}
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
                        {isCurrent && <div className="mx-auto mt-0.5 h-0.5 w-4 rounded-full bg-primary" />}
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

              {/* Expense rows */}
              {filteredExpenses.length === 0 ? (
                <div className="py-16 text-center">
                  <DollarSign className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="font-medium text-muted-foreground">{t('emptyFound')}</p>
                </div>
              ) : filteredExpenses.map((expense, idx) => {
                const paidCount  = expense.participants.filter((p) => p.status === 'pago').length
                const totalCount = expense.participants.length
                const pendingReceiptParticipants = expense.participants
                  .map((participant, participantIndex) => ({ participant, participantIndex }))
                  .filter(({ participant }) => participant.receiptStatus === 'aguardando')
                const pendingReceiptCount = pendingReceiptParticipants.length
                const firstPendingReceipt = pendingReceiptParticipants[0]

                return (
                  <div
                    key={expense.id}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 hover:bg-muted/20 transition-colors',
                      idx < filteredExpenses.length - 1 && 'border-b',
                    )}
                  >
                    <div className="w-[180px] shrink-0 min-w-0">
                      <p className="text-sm font-semibold truncate">{expense.description}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{expense.propertyName ?? '—'}</p>
                      <p className="text-[10px] text-muted-foreground">{t('paidRatio', { paid: paidCount, total: totalCount })}</p>
                    </div>
                    <div className="w-[72px] shrink-0 text-right pr-2">
                      <p className="text-sm font-bold text-primary">{formatCurrency(expense.totalAmount)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {expense.recurring ? t('dueDayShort', { day: expense.dueDay }) : t('oneTime')}
                      </p>
                    </div>
                    <div className="w-[112px] shrink-0 flex flex-col items-center justify-center gap-1">
                      {pendingReceiptCount > 0 ? (
                        <>
                          <Badge variant="warning" className="h-5 px-1.5 text-[10px]">
                            {t('awaitingCount', { count: pendingReceiptCount })}
                          </Badge>
                          {canManage && firstPendingReceipt && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] border-orange-300 text-orange-700 hover:bg-orange-50"
                              onClick={() => openExpenseManager(
                                expense.id,
                                firstPendingReceipt.participantIndex,
                              )}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              {t('validate')}
                            </Button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </div>
                    <div className="w-6 shrink-0" />
                    <div className="flex flex-1 justify-between">
                      {visibleMonths.map((monthDate) => {
                        const mStr = format(monthDate, 'yyyy-MM')
                        return (
                          <div key={mStr} className="w-[68px] shrink-0 flex justify-center">
                            <ExpenseMonthCell
                              expense={expense}
                              monthDate={monthDate}
                              monthStr={mStr}
                              currentMonthStr={currentMonthStr}
                              todayStr={todayStr}
                              canManage={canManage}
                              onManage={(id) => openExpenseManager(id)}
                            />
                          </div>
                        )
                      })}
                    </div>
                    <div className="w-6 shrink-0" />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-muted/10 px-4 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> {tCommon('status.pago')}</span>
            <span className="flex items-center gap-1 text-orange-500"><Users className="h-3 w-3" /> {tCommon('status.parcial')}</span>
            <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" /> {tCommon('status.atrasado')}</span>
            <span className="flex items-center gap-1 text-orange-500"><FileCheck className="h-3 w-3" /> {t('legend.receipt')}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-500" /> {tCommon('status.pendente')}</span>
            <span className="flex items-center gap-1 text-blue-500"><Clock className="h-3 w-3" /> {t('legend.scheduled')}</span>
            <span>— {t('legend.outOfRange')}</span>
          </div>
        </div>

      ) : (

        /* ─── Cards view ─────────────────────────────────────────────────── */
        <div className="grid gap-4 sm:grid-cols-2">
          {cardsPag.pageItems.map((expense) => {
            const paidCount   = expense.participants.filter((p) => p.status === 'pago').length
            const pendingCount = expense.participants.length - paidCount
            return (
              <Card key={expense.id}>
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-base">{expense.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {expense.propertyName} •{' '}
                        {expense.recurring
                          ? t('recurringEveryDay', { day: expense.dueDay ?? 1 })
                          : expense.dueDate
                            ? t('dueOn', { date: formatDateOptional(expense.dueDate) })
                            : t('noDueDate')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">{formatCurrency(expense.totalAmount)}</p>
                      <Badge variant={STATUS_BADGE[expense.status]} className="text-xs">
                        {expense.status === 'pendente' ? tCommon('status.pendente')
                          : expense.status === 'pago' ? tCommon('status.pago') : tCommon('status.parcial')}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" /> {t('paidCount', { count: paidCount })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-yellow-500" /> {t('pendingCount', { count: pendingCount })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {t('participantsCount', { count: expense.participants.length })}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {expense.participants.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                      >
                        <div>
                          <span className="font-medium">{p.tenantName}</span>
                          {p.paidDate && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({format(new Date(p.paidDate + 'T12:00:00'), 'dd/MM', { locale: getDateFnsLocale(i18n.language) })})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatCurrency(p.amount)}</span>
                          {p.receiptStatus === 'aguardando' && canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] border-orange-300 text-orange-700 px-2"
                              onClick={() => openExpenseManager(expense.id, idx)}
                            >
                              <Eye className="mr-1 h-3 w-3" /> {t('validate')}
                            </Button>
                          )}
                          <Badge variant={p.status === 'pago' ? 'success' : 'warning'} className="text-xs">
                            {p.receiptStatus === 'aguardando'
                              ? t('legend.receipt')
                              : p.status === 'pago' ? tCommon('status.pago') : tCommon('status.pendente')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {canManage && (
                    <Button
                      size="sm" variant="outline" className="mt-3 w-full"
                      onClick={() => openExpenseManager(expense.id)}
                    >
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> {t('managePayments')}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
          {filteredExpenses.length > 0 && (
            <div className="sm:col-span-2">
              <Pagination
                page={cardsPag.page}
                totalPages={cardsPag.totalPages}
                total={cardsPag.total}
                rangeStart={cardsPag.rangeStart}
                rangeEnd={cardsPag.rangeEnd}
                onPageChange={cardsPag.setPage}
                itemLabel={t('itemLabel')}
              />
            </div>
          )}
        </div>
      )}

      {/* ─── Dialogs ──────────────────────────────────────────────────────── */}

      <SharedExpensePayDialog
        expense={managingExpense}
        initialValidatingIndex={initialReceiptIndex}
        onClose={closeExpenseManager}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['sharedExpenses'] })}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{tCommon('ui.type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData((p) => ({ ...p, type: v as ExpenseType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXPENSE_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.totalAmount')}</Label>
                <Input
                  type="number" step="0.01" placeholder="200,00"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData((p) => ({ ...p, totalAmount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.property')}</Label>
                <Combobox
                  options={properties.map((p) => ({ value: p.id, label: p.name, description: p.code }))}
                  value={formData.propertyId}
                  onChange={(value, option) =>
                    setFormData((p) => ({ ...p, propertyId: value, propertyName: option.label }))
                  }
                  placeholder={t('selectProperty')}
                  searchPlaceholder={t('searchProperty')}
                  emptyText={t('emptyProperty')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{formData.recurring ? t('form.dueDayLabel') : t('form.dueDateLabel')}</Label>
                {formData.recurring ? (
                  <Input
                    type="number" min={1} max={28} placeholder={t('form.dueDayPlaceholder')}
                    value={formData.dueDay}
                    onChange={(e) => setFormData((p) => ({ ...p, dueDay: e.target.value }))}
                  />
                ) : (
                  <Input
                    type="date" value={formData.dueDate}
                    onChange={(e) => setFormData((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                )}
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox" className="h-3.5 w-3.5 rounded border-input"
                    checked={formData.recurring}
                    onChange={(e) => setFormData((p) => ({ ...p, recurring: e.target.checked }))}
                  />
                  {t('form.recurringMonthly')}
                </label>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t('form.descriptionOptional')}</Label>
                <Input
                  placeholder={EXPENSE_TYPE_LABELS[formData.type]}
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('form.participants')}</Label>
              <Combobox
                options={tenants.map((t) => ({ value: t.id, label: t.name, description: t.cpf }))}
                value=""
                onChange={(value, option) => addParticipant(value, option.label)}
                placeholder={t('addTenant')}
                searchPlaceholder={t('searchTenant')}
                emptyText={t('emptyTenant')}
              />
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={t('selectTenantsPlaceholder')}
                value={formData.participantsRaw}
                onChange={(e) => setFormData((p) => ({ ...p, participantsRaw: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                {t('form.splitHint')}
              </p>
            </div>

            <Button className="w-full" onClick={handleCreate} disabled={formLoading}>
              {formLoading ? t('creating') : t('createExpense')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
