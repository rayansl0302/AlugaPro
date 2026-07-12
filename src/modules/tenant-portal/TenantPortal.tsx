import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Home, Wifi, Zap, Droplets, Building2, Landmark, Flame,
  ShieldCheck, AlertTriangle, Percent, Receipt, CalendarClock, Wallet,
  Upload, CheckCircle, Clock, X, TrendingDown, CreditCard, Car, User,
  Eye, Download, Wrench, Plus, Loader2, DollarSign, QrCode, Copy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getChargesByTenant, updateCharge } from '@/services/charges'
import { getContractsByTenant } from '@/services/contracts'
import { getPaymentsByTenant } from '@/services/payments'
import { createMaintenanceRequest, getMaintenanceRequestsByTenant, addMaintenanceComment, buildInitialStatusHistory } from '@/services/maintenance'
import { getProperties } from '@/services/properties'
import { getVehicles } from '@/services/vehicles'
import { getOwners } from '@/services/owners'
import { getTenant } from '@/services/tenants'
import { getSharedExpensesByTenant, resolveExpenseParticipantIndex, submitSharedExpenseReceipt, type TenantSharedExpenseItem } from '@/services/sharedExpenses'
import { uploadReceipt } from '@/services/storage'
import { useTenantContractActions } from '@/hooks/useTenantContractActions'
import { TenantPortalHeader } from './TenantPortalHeader'
import { Charge, ChargeType, PaymentMethod, MaintenanceCategory, MaintenanceRequest, ExpenseType, Contract, Owner, Property, Vehicle } from '@/types'
import { formatCurrency, formatDate, formatDateOptional } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ReceiptUpload } from '@/components/shared/ReceiptUpload'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { MaintenanceCommentsPanel } from '@/components/maintenance/MaintenanceCommentsPanel'
import { MaintenanceStatusHistoryPanel } from '@/components/maintenance/MaintenanceStatusHistoryPanel'
import { MaintenanceEntityPhotos } from '@/components/maintenance/MaintenanceEntityPhotos'
import { MaintenanceRequestPhotos } from '@/components/maintenance/MaintenanceRequestPhotos'
import {
  buildMaintenancePhotoLookups,
  resolveMaintenanceEntityPhotos,
} from '@/lib/maintenanceEntityPhotos'
import { PropertyDetail } from '@/modules/properties/PropertyDetail'
import { VehicleDetail } from '@/modules/vehicles/VehicleDetail'
import { OwnerDetail } from '@/modules/owners/OwnerDetail'

const statusVariant = {
  pendente: 'warning',
  pago: 'success',
  atrasado: 'destructive',
  cancelado: 'secondary',
} as const

const STATUS_I18N: Record<string, string> = {
  pendente: 'pending',
  pago: 'paid',
  atrasado: 'overdue',
  cancelado: 'canceled',
  ativo: 'active',
  renovado: 'renewed',
  encerrado: 'closed',
  aberto: 'open',
  em_analise: 'underReview',
  em_andamento: 'inProgress',
  finalizado: 'finished',
}

const METHOD_I18N: Record<PaymentMethod, string> = {
  pix: 'pix',
  dinheiro: 'cash',
  transferencia: 'transfer',
  cartao: 'card',
  boleto: 'boleto',
}

const MAINTENANCE_CATEGORY_I18N: Record<MaintenanceCategory, string> = {
  eletrica: 'electrical',
  hidraulica: 'plumbing',
  pintura: 'painting',
  estrutura: 'structure',
  limpeza: 'cleaning',
  seguranca: 'security',
  outro: 'other',
}

const maintenanceStatusVariant = {
  aberto: 'info' as const,
  em_analise: 'warning' as const,
  em_andamento: 'secondary' as const,
  finalizado: 'success' as const,
}

const EXPENSE_TYPE_I18N: Record<ExpenseType, string> = {
  internet: 'internet',
  energia: 'energy',
  agua: 'water',
  gas: 'gas',
  iptu: 'iptu',
  condominio: 'condo',
  seguranca: 'security',
  outro: 'other',
}


const expenseTypeIcons: Record<ExpenseType, LucideIcon> = {
  internet: Wifi,
  energia: Zap,
  agua: Droplets,
  gas: Flame,
  iptu: Landmark,
  condominio: Building2,
  seguranca: ShieldCheck,
  outro: Receipt,
}

type ChargeCategory = { label: string; Icon: LucideIcon }

function getChargeCategory(charge: Pick<Charge, 'type' | 'description'>): ChargeCategory {
  const byType: Partial<Record<ChargeType, ChargeCategory>> = {
    aluguel: { label: 'rent', Icon: Home },
    caucao: { label: 'deposit', Icon: ShieldCheck },
    multa: { label: 'fine', Icon: AlertTriangle },
    juros: { label: 'interest', Icon: Percent },
  }
  if (byType[charge.type]) return byType[charge.type] as ChargeCategory

  const text = (charge.description ?? '').toLowerCase()
  if (/inter|wi-?fi/.test(text)) return { label: 'internet', Icon: Wifi }
  if (/energia|luz|el[eé]tr/.test(text)) return { label: 'energy', Icon: Zap }
  if (/[aá]gua/.test(text)) return { label: 'water', Icon: Droplets }
  if (/condom/.test(text)) return { label: 'condo', Icon: Building2 }
  if (/iptu/.test(text)) return { label: 'iptu', Icon: Landmark }
  if (/g[aá]s/.test(text)) return { label: 'gas', Icon: Flame }
  if (/segur/.test(text)) return { label: 'security', Icon: ShieldCheck }
  return { label: 'other', Icon: Receipt }
}

const TODAY = new Date().toISOString().slice(0, 10)

function chargeStatus(charge: Charge): keyof typeof statusVariant {
  if (charge.status === 'pago' || charge.status === 'cancelado') return charge.status
  return charge.dueDate && charge.dueDate < TODAY ? 'atrasado' : 'pendente'
}

function greetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

interface TenantPaymentInfo {
  pixKey?: string
  bank?: string
  agency?: string
  account?: string
}

function resolvePaymentInfo(contract: Contract | undefined, owner: Owner | undefined): TenantPaymentInfo {
  const fin = contract?.signingData?.financeiro
  if (fin?.pixKey?.trim() || fin?.banco?.trim()) {
    return {
      pixKey: fin.pixKey?.trim(),
      bank: fin.banco?.trim(),
      agency: 'agencia' in fin ? fin.agencia?.trim() : undefined,
      account: 'conta' in fin ? fin.conta?.trim() : undefined,
    }
  }
  const bankAccount = owner?.bankAccount
  if (bankAccount?.pixKey?.trim() || bankAccount?.bank?.trim()) {
    return {
      pixKey: bankAccount.pixKey?.trim(),
      bank: bankAccount.bank?.trim(),
      agency: bankAccount.agency?.trim(),
      account: bankAccount.account?.trim(),
    }
  }
  return {}
}

function PaymentInfoBox({ info }: { info: TenantPaymentInfo }) {
  const { t } = useTranslation('portal')
  const handleCopyPix = async () => {
    if (!info.pixKey) return
    try {
      await navigator.clipboard.writeText(info.pixKey)
      toast({ title: t('charges.pixKeyCopied') })
    } catch {
      toast({ title: t('charges.copyFailed'), variant: 'destructive' })
    }
  }

  const hasInfo = !!(info.pixKey || info.bank || info.agency || info.account)

  if (!hasInfo) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
        {t('charges.paymentDataMissing')}
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-[#032B61]/15 bg-[#032B61]/5 p-3">
      <p className="text-xs font-semibold text-[#032B61]">{t('charges.paymentDataTitle')}</p>

      {info.bank && (
        <div className="text-sm">
          <span className="text-muted-foreground">{t('charges.bank')}: </span>
          <span className="font-medium">{info.bank}</span>
        </div>
      )}

      {(info.agency || info.account) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {info.agency && (
            <span>
              <span className="text-muted-foreground">{t('charges.agency')}: </span>
              <span className="font-medium">{info.agency}</span>
            </span>
          )}
          {info.account && (
            <span>
              <span className="text-muted-foreground">{t('charges.account')}: </span>
              <span className="font-medium">{info.account}</span>
            </span>
          )}
        </div>
      )}

      {info.pixKey && (
        <div className="space-y-1.5 border-t border-[#032B61]/10 pt-2">
          <p className="text-xs text-muted-foreground">{t('charges.pixKey')}</p>
          <div className="flex items-start gap-2">
            <p className="flex-1 break-all font-mono text-sm font-medium leading-snug">{info.pixKey}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 border-[#032B61]/20 text-[#032B61] hover:bg-[#032B61]/10"
              onClick={handleCopyPix}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {t('common.copy')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function TenantPortal() {
  const { t } = useTranslation('portal')
  const { user, firebaseUser } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.companyId ?? ''
  const tenantId = user?.tenantId ?? user?.id ?? ''

  const [uploadingCharge, setUploadingCharge] = useState<Charge | null>(null)
  const [uploadingExpense, setUploadingExpense] = useState<TenantSharedExpenseItem | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>()
  const [expenseReceiptUrl, setExpenseReceiptUrl] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const [expenseUploading, setExpenseUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)
  const [selectedContractId, setSelectedContractId] = useState('')
  const { viewContract, downloadContract, isContractLoading } = useTenantContractActions()
  const [viewProperty, setViewProperty] = useState<Property | null>(null)
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null)
  const [viewOwner, setViewOwner] = useState<Owner | null>(null)
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [viewingRequest, setViewingRequest] = useState<MaintenanceRequest | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [maintenanceLoading, setMaintenanceLoading] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    description: '',
    category: 'outro' as MaintenanceCategory,
    priority: 'media' as MaintenanceRequest['priority'],
  })

  const { data: charges = [] } = useQuery({
    queryKey: ['charges', companyId, tenantId],
    queryFn: () => getChargesByTenant(companyId, tenantId),
    enabled: !!companyId && !!tenantId,
  })

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', companyId, tenantId],
    queryFn: () => getContractsByTenant(companyId, tenantId),
    enabled: !!companyId && !!tenantId,
  })

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', companyId, tenantId],
    queryFn: () => getPaymentsByTenant(companyId, tenantId),
    enabled: !!companyId && !!tenantId,
  })

  const { data: maintenanceRequests = [] } = useQuery({
    queryKey: ['maintenance', companyId, tenantId],
    queryFn: () => getMaintenanceRequestsByTenant(companyId, tenantId),
    enabled: !!companyId && !!tenantId,
  })

  const { data: sharedExpenses = [] } = useQuery({
    queryKey: ['sharedExpenses', companyId, tenantId],
    queryFn: () => getSharedExpensesByTenant(companyId, tenantId),
    enabled: !!companyId && !!tenantId,
  })

  const { data: tenantProfile } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => getTenant(tenantId),
    enabled: !!tenantId,
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

  const { data: owners = [] } = useQuery({
    queryKey: ['owners', companyId],
    queryFn: () => getOwners(companyId),
    enabled: !!companyId,
  })

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

  const ownerById = useMemo(() => {
    const map: Record<string, Owner> = {}
    owners.forEach((o) => { map[o.id] = o })
    return map
  }, [owners])

  const chargePaymentInfo = useMemo(() => {
    if (!uploadingCharge) return {}
    const contract = contracts.find((c) => c.id === uploadingCharge.contractId)
    return resolvePaymentInfo(contract, contract ? ownerById[contract.ownerId] : undefined)
  }, [uploadingCharge, contracts, ownerById])

  const expensePaymentInfo = useMemo(() => {
    if (!uploadingExpense) return {}
    const contract =
      contracts.find(
        (c) =>
          c.propertyId === uploadingExpense.expense.propertyId &&
          (c.status === 'ativo' || c.status === 'renovado'),
      ) ?? contracts.find((c) => c.propertyId === uploadingExpense.expense.propertyId)
    return resolvePaymentInfo(contract, contract ? ownerById[contract.ownerId] : undefined)
  }, [uploadingExpense, contracts, ownerById])

  const photoLookups = useMemo(() => {
    const tenants = tenantProfile ? [tenantProfile] : []
    return buildMaintenancePhotoLookups(properties, vehicles, tenants)
  }, [properties, vehicles, tenantProfile])

  const activeContracts = useMemo(
    () => contracts.filter((c) => c.status === 'ativo' || c.status === 'renovado'),
    [contracts],
  )

  useEffect(() => {
    if (activeContracts.length === 0) {
      setSelectedContractId('')
      return
    }
    if (!selectedContractId || !activeContracts.some((c) => c.id === selectedContractId)) {
      setSelectedContractId(activeContracts[0].id)
    }
  }, [activeContracts, selectedContractId])

  const selectedContract = activeContracts.find((c) => c.id === selectedContractId) ?? activeContracts[0]
  const selectedProperty = selectedContract ? propertyById[selectedContract.propertyId] : undefined
  const selectedVehicle = selectedContract ? vehicleById[selectedContract.propertyId] : undefined
  const selectedOwner = selectedContract ? ownerById[selectedContract.ownerId] : undefined
  const pendingCharges = charges.filter((c) => c.status !== 'pago' && c.status !== 'cancelado')
  const overdueCharges = pendingCharges.filter((c) => c.dueDate && c.dueDate < TODAY)
  const totalPending = pendingCharges.reduce((s, c) => s + (c.totalAmount ?? c.amount), 0)
  const totalOverdue = overdueCharges.reduce((s, c) => s + (c.totalAmount ?? c.amount), 0)

  const historyPag = usePagination(payments, 10)
  const maintenancePag = usePagination(maintenanceRequests, 8)
  const sharedExpensesPag = usePagination(sharedExpenses, 8)

  const openMaintenanceRequests = maintenanceRequests.filter((r) => r.status !== 'finalizado')
  const pendingSharedExpenses = sharedExpenses.filter((item) => item.participant.status !== 'pago')

  const toPay = [...pendingCharges].sort((a, b) =>
    (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31')
  )
  const nextDue = toPay.find((c) => !!c.dueDate)

  const breakdown = Object.values(
    pendingCharges.reduce<Record<string, { label: string; Icon: LucideIcon; total: number; count: number }>>(
      (acc, charge) => {
        const { label, Icon } = getChargeCategory(charge)
        if (!acc[label]) acc[label] = { label, Icon, total: 0, count: 0 }
        acc[label].total += charge.totalAmount ?? charge.amount
        acc[label].count += 1
        return acc
      },
      {}
    )
  ).sort((a, b) => b.total - a.total)

  const handleReceiptFile = async (file: File) => {
    setUploading(true)
    try {
      const url = await uploadReceipt(companyId, uploadingCharge?.id ?? 'unknown', file)
      setReceiptUrl(url)
    } catch {
      toast({ title: t('receiptsExtra.uploadFileError'), variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmitReceipt = async () => {
    if (!uploadingCharge || !receiptUrl) return
    setSubmitting(true)
    try {
      await updateCharge(uploadingCharge.id, {
        receipt: receiptUrl,
        receiptStatus: 'aguardando',
        paidBy: 'tenant',
      })
      qc.invalidateQueries({ queryKey: ['charges'] })
      toast({ title: t('receiptsExtra.uploadSuccessTitle'), description: t('receiptsExtra.uploadSuccessDesc') })
      setUploadingCharge(null)
      setReceiptUrl(undefined)
    } catch {
      toast({ title: t('receipts.uploadError'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const openUpload = (charge: Charge) => {
    setReceiptUrl(charge.receipt)
    setUploadingCharge(charge)
  }

  const openExpenseUpload = (item: TenantSharedExpenseItem) => {
    const participantIndex = resolveExpenseParticipantIndex(
      item.expense,
      item.participant,
      item.participantIndex,
      tenantId,
    )
    if (participantIndex < 0) {
      toast({ title: t('receiptsExtra.shareIdentifyError'), variant: 'destructive' })
      return
    }
    setExpenseReceiptUrl(item.participant.receipt)
    setUploadingExpense({ ...item, participantIndex })
  }

  const handleExpenseReceiptFile = async (file: File) => {
    if (!uploadingExpense) return
    setExpenseUploading(true)
    try {
      const url = await uploadReceipt(companyId, `expense-${uploadingExpense.expense.id}`, file)
      setExpenseReceiptUrl(url)
    } catch {
      toast({ title: t('receiptsExtra.uploadFileError'), variant: 'destructive' })
    } finally {
      setExpenseUploading(false)
    }
  }

  const handleSubmitExpenseReceipt = async () => {
    if (!uploadingExpense || !expenseReceiptUrl) return
    setExpenseSubmitting(true)
    try {
      const participantIndex = resolveExpenseParticipantIndex(
        uploadingExpense.expense,
        uploadingExpense.participant,
        uploadingExpense.participantIndex,
        tenantId,
      )
      if (participantIndex < 0) throw new Error('Participante não encontrado')

      await submitSharedExpenseReceipt(
        uploadingExpense.expense.id,
        participantIndex,
        expenseReceiptUrl,
        uploadingExpense.participant.tenantId ?? tenantId,
      )
      qc.invalidateQueries({ queryKey: ['sharedExpenses'] })
      toast({ title: t('receiptsExtra.uploadSuccessTitle'), description: t('receiptsExtra.uploadSuccessDesc') })
      setUploadingExpense(null)
      setExpenseReceiptUrl(undefined)
    } catch (err) {
      const description = err instanceof Error ? err.message : undefined
      toast({ title: t('receipts.uploadError'), description, variant: 'destructive' })
    } finally {
      setExpenseSubmitting(false)
    }
  }

  const contractAssetLabel = (contract: Contract) =>
    contract.assetType === 'veiculo' ? t('contracts.vehicle') : t('contracts.property')

  const resetMaintenanceForm = () => {
    setMaintenanceForm({
      title: '',
      description: '',
      category: 'outro',
      priority: 'media',
    })
  }

  const handleCreateMaintenance = async () => {
    if (!user) return
    if (!selectedContract) {
      toast({ title: t('maintenanceExtra.needsActiveContractTitle'), description: t('maintenanceExtra.needsActiveContractDesc'), variant: 'destructive' })
      return
    }
    if (!maintenanceForm.title.trim() || !maintenanceForm.description.trim()) {
      toast({ title: t('maintenanceExtra.fillTitleDescription'), variant: 'destructive' })
      return
    }

    setMaintenanceLoading(true)
    try {
      await createMaintenanceRequest({
        companyId,
        propertyId: selectedContract.propertyId,
        propertyName: selectedContract.propertyName,
        tenantId,
        tenantName: user?.name,
        title: maintenanceForm.title.trim(),
        description: maintenanceForm.description.trim(),
        category: maintenanceForm.category,
        priority: maintenanceForm.priority,
        status: 'aberto',
        comments: [],
        statusHistory: [
          buildInitialStatusHistory({
            id: tenantId,
            name: user.name,
            role: 'inquilino',
          }),
        ],
      })
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      toast({ title: t('maintenanceExtra.openedTitle'), description: t('maintenanceExtra.openedDesc') })
      setShowMaintenanceForm(false)
      resetMaintenanceForm()
    } catch {
      toast({ title: t('maintenanceExtra.openError'), variant: 'destructive' })
    } finally {
      setMaintenanceLoading(false)
    }
  }

  const formatMaintenanceDate = (request: MaintenanceRequest) => {
    if (!request.createdAt) return '—'
    const date = request.createdAt.toDate ? request.createdAt.toDate() : new Date(String(request.createdAt))
    return formatDate(date.toISOString())
  }

  const handleAddComment = async () => {
    if (!viewingRequest || !commentText.trim() || !user) return

    setCommentLoading(true)
    try {
      const newComment = await addMaintenanceComment(viewingRequest.id, viewingRequest, {
        authorId: tenantId,
        authorName: user.name,
        authorRole: 'inquilino',
        message: commentText.trim(),
      })
      setViewingRequest((prev) =>
        prev ? { ...prev, comments: [...(prev.comments ?? []), newComment] } : null
      )
      setCommentText('')
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      toast({ title: t('maintenanceExtra.commentSent') })
    } catch {
      toast({ title: t('maintenanceExtra.commentError'), variant: 'destructive' })
    } finally {
      setCommentLoading(false)
    }
  }

  const handleViewContract = () => {
    if (selectedContract) viewContract(selectedContract)
  }

  const handleDownloadContract = () => {
    if (selectedContract) downloadContract(selectedContract)
  }

  return (
    <div className="light pb-safe min-h-screen bg-slate-50">

      <TenantPortalHeader />

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-5">

        {/* ── Greeting ── */}
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t(`greeting.${greetingKey()}`)}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('home.summarySubtitle')}
          </p>
        </div>

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <TrendingDown className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t('home.kpi.totalToPay')}</p>
                <p className={cn('text-lg font-bold leading-tight', totalPending > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                  {formatCurrency(totalPending)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t('home.kpi.overdue')}</p>
                <p className={cn('text-lg font-bold leading-tight', totalOverdue > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-foreground')}>
                  {formatCurrency(totalOverdue)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Receipt className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t('home.kpi.open')}</p>
                <p className="text-lg font-bold leading-tight">{pendingCharges.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t('home.kpi.nextDue')}</p>
                <p className="text-base font-bold leading-tight">
                  {nextDue ? formatDateOptional(nextDue.dueDate) : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Two-column body ── */}
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">

          {/* ── Left column ── */}
          <div className="space-y-4">

            {/* Active contract */}
            {selectedContract && (
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-primary to-primary/80 px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-primary-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 opacity-80" />
                      <span className="text-sm font-semibold">
                        {activeContracts.length > 1 ? t('contracts.title') : t('home.activeContract')}
                      </span>
                    </div>
                    {activeContracts.length > 1 && (
                      <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                        {activeContracts.length}
                      </Badge>
                    )}
                  </div>
                  {activeContracts.length > 1 && (
                    <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                      <SelectTrigger className="h-9 bg-white/15 border-white/20 text-primary-foreground">
                        <SelectValue placeholder={t('contractsExtra.selectContract')} />
                      </SelectTrigger>
                      <SelectContent>
                        {activeContracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.propertyName ?? contract.contractNumber} — {contract.contractNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { label: t('contractsExtra.number'), value: selectedContract.contractNumber, mono: true },
                      { label: contractAssetLabel(selectedContract), value: selectedContract.propertyName },
                      { label: t('contracts.owner'), value: selectedContract.ownerName ?? selectedOwner?.name },
                      { label: t('contractsExtra.value'), value: formatCurrency(selectedContract.rentValue), bold: true },
                      { label: t('contractsExtra.dueEveryDay'), value: String(selectedContract.dueDay) },
                      {
                        label: t('contractsExtra.validity'),
                        value: `${formatDate(selectedContract.startDate)} — ${formatDateOptional(selectedContract.endDate, t('contracts.indefinite'))}`,
                        small: true,
                      },
                    ].map(({ label, value, mono, bold, small }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={cn(
                          'text-right',
                          mono && 'font-mono text-xs',
                          bold && 'font-bold text-base text-primary',
                          small && 'text-xs',
                        )}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 px-4 pb-2">
                    {selectedContract.assetType !== 'veiculo' && selectedProperty && (
                      <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={() => setViewProperty(selectedProperty)}>
                        <Building2 className="mr-1.5 h-4 w-4" />
                        {t('contractsExtra.viewPropertyType', { type: t(`propertyTypes.${selectedProperty.type}`) })}
                      </Button>
                    )}
                    {selectedContract.assetType === 'veiculo' && selectedVehicle && (
                      <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={() => setViewVehicle(selectedVehicle)}>
                        <Car className="mr-1.5 h-4 w-4" />
                        {t('contractsExtra.viewVehicle')}
                      </Button>
                    )}
                    {selectedOwner && (
                      <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={() => setViewOwner(selectedOwner)}>
                        <User className="mr-1.5 h-4 w-4" />
                        {t('contractsExtra.viewOwner')}
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2 px-4 pb-4 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={!selectedContract || isContractLoading(selectedContract.id, 'view')}
                      onClick={handleViewContract}
                    >
                      {selectedContract && isContractLoading(selectedContract.id, 'view')
                        ? <Clock className="mr-1.5 h-4 w-4 animate-spin" />
                        : <Eye className="mr-1.5 h-4 w-4" />}
                      {t('contracts.viewPdf')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={!selectedContract || isContractLoading(selectedContract.id, 'download')}
                      onClick={handleDownloadContract}
                    >
                      {selectedContract && isContractLoading(selectedContract.id, 'download')
                        ? <Clock className="mr-1.5 h-4 w-4 animate-spin" />
                        : <Download className="mr-1.5 h-4 w-4" />}
                      {t('contracts.downloadPdf')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Breakdown */}
            {breakdown.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Wallet className="h-4 w-4 text-primary" />
                    {t('home.chargesByCategory')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1">
                  {breakdown.map(({ label, Icon, total, count }) => (
                    <div key={label} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="text-sm font-medium leading-none">{t(`charges.categories.${label}`)}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{count} {count === 1 ? t('home.itemOne') : t('home.itemOther')}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(total)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Histórico resumido */}
            {payments.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="h-4 w-4 text-primary" />
                    {t('home.recentPayments')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1">
                  {payments.slice(0, 4).map((payment) => {
                    const { Icon } = getChargeCategory(payment)
                    return (
                      <div key={payment.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-400">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate leading-none">{payment.description}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {payment.paidDate ? t('home.paidOn', { date: formatDateOptional(payment.paidDate) }) : '—'}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400 shrink-0">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right column ── */}
          <div>
            <Tabs defaultValue="a-pagar">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="a-pagar" className="flex-1">
                  {t('tabs.toPay')}
                  {pendingCharges.length > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[11px] font-bold text-primary">
                      {pendingCharges.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="historico" className="flex-1">{t('tabs.paymentHistory')}</TabsTrigger>
                <TabsTrigger value="despesas" className="flex-1">
                  {t('tabs.expenses')}
                  {pendingSharedExpenses.length > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/15 px-1.5 text-[11px] font-bold text-amber-600">
                      {pendingSharedExpenses.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="chamados" className="flex-1">
                  {t('tabs.tickets')}
                  {openMaintenanceRequests.length > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500/15 px-1.5 text-[11px] font-bold text-orange-600">
                      {openMaintenanceRequests.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="a-pagar" className="space-y-3">
                {toPay.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white dark:bg-gray-900 py-16 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                    <p className="font-semibold text-foreground">{t('chargesExtra.allCaughtUpTitle')}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t('charges.emptyPending')}</p>
                  </div>
                ) : (
                  toPay.map((charge) => {
                    const { label, Icon } = getChargeCategory(charge)
                    const status = chargeStatus(charge)
                    const amount = charge.totalAmount ?? charge.amount
                    const receiptStatus = charge.receiptStatus
                    const isOverdue = status === 'atrasado'

                    return (
                      <Card key={charge.id} className={cn(
                        'border-0 shadow-sm overflow-hidden',
                        isOverdue && 'ring-1 ring-destructive/30',
                      )}>
                        {isOverdue && (
                          <div className="h-0.5 w-full bg-gradient-to-r from-destructive/60 to-destructive/20" />
                        )}
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={cn(
                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                                isOverdue
                                  ? 'bg-destructive/10 text-destructive'
                                  : 'bg-primary/10 text-primary',
                              )}>
                                <Icon className="h-5 w-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold truncate leading-tight">{charge.description}</p>
                                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <CalendarClock className="h-3 w-3" />
                                  {charge.dueDate ? t('chargesExtra.dueOn', { date: formatDateOptional(charge.dueDate) }) : t('chargesExtra.noDueDate')}
                                  <span className="text-muted-foreground/50">· {t(`charges.categories.${label}`)}</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold">{formatCurrency(amount)}</p>
                              <Badge variant={statusVariant[status]} className="text-xs mt-0.5">
                                {t(`status.${STATUS_I18N[status]}`)}
                              </Badge>
                            </div>
                          </div>

                          {receiptStatus === 'aguardando' ? (
                            <div className="flex items-center gap-2 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-3 py-2.5 text-sm text-yellow-700 dark:text-yellow-300">
                              <Clock className="h-4 w-4 shrink-0" />
                              <span>{t('receiptsExtra.awaitingConfirmation')}</span>
                            </div>
                          ) : receiptStatus === 'confirmado' ? (
                            <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2.5 text-sm text-green-700 dark:text-green-300">
                              <CheckCircle className="h-4 w-4 shrink-0" />
                              <span>{t('receiptsExtra.confirmedByManager')}</span>
                            </div>
                          ) : receiptStatus === 'rejeitado' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-sm text-destructive">
                                <X className="h-4 w-4 shrink-0" />
                                <span>{t('receiptsExtra.rejected')}</span>
                              </div>
                              <Button size="sm" variant="outline" className="w-full" onClick={() => openUpload(charge)}>
                                <Upload className="mr-2 h-4 w-4" /> {t('chargesExtra.resendReceipt')}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-dashed gap-2"
                              onClick={() => openUpload(charge)}
                            >
                              <Upload className="h-4 w-4" />
                              {charge.receipt ? t('chargesExtra.changeReceipt') : t('chargesExtra.sendPaymentReceipt')}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </TabsContent>

              <TabsContent value="historico" className="space-y-3">
                {payments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white dark:bg-gray-900 py-16 text-center">
                    <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="font-semibold text-foreground">{t('chargesExtra.emptyHistoryTitle')}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t('charges.emptyPaid')}</p>
                  </div>
                ) : (
                  historyPag.pageItems.map((payment) => {
                    const { Icon } = getChargeCategory(payment)
                    return (
                      <Card key={payment.id} className="border-0 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-400">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate leading-tight">{payment.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {payment.paidDate
                                ? t('home.paidOn', { date: formatDateOptional(payment.paidDate) })
                                : payment.dueDate
                                  ? `Vence ${formatDateOptional(payment.dueDate)}`
                                  : t('chargesExtra.noDueDate')}
                              {payment.paymentMethod && (
                                <span className="text-muted-foreground/60">
                                  {' '}· {t(`paymentMethods.${METHOD_I18N[payment.paymentMethod]}`)}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold">{formatCurrency(payment.amount)}</p>
                            <Badge variant={statusVariant[payment.status]} className="text-xs mt-0.5">
                              {t(`status.${STATUS_I18N[payment.status]}`)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
                {payments.length > 0 && (
                  <Pagination
                    page={historyPag.page}
                    totalPages={historyPag.totalPages}
                    total={historyPag.total}
                    rangeStart={historyPag.rangeStart}
                    rangeEnd={historyPag.rangeEnd}
                    onPageChange={historyPag.setPage}
                    itemLabel={t('pagination.payments')}
                  />
                )}
              </TabsContent>

              <TabsContent value="despesas" className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">{t('sharedExpenses.title')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('sharedExpensesExtra.subtitle')}
                  </p>
                </div>

                {sharedExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white dark:bg-gray-900 py-16 text-center">
                    <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="font-semibold text-foreground">{t('sharedExpenses.empty')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('sharedExpensesExtra.emptyHint')}
                    </p>
                  </div>
                ) : (
                  sharedExpensesPag.pageItems.map(({ expense, participant, participantIndex }) => {
                    const ExpenseIcon = expenseTypeIcons[expense.type]
                    const typeLabel = t(`sharedExpenses.types.${EXPENSE_TYPE_I18N[expense.type]}`)
                    const isPaid = participant.status === 'pago'
                    const dueLabel = expense.recurring
                      ? t('contracts.dueDayValue', { day: expense.dueDay ?? 1 })
                      : expense.dueDate
                        ? t('chargesExtra.dueOn', { date: formatDateOptional(expense.dueDate) })
                        : t('chargesExtra.noDueDate')

                    return (
                      <Card key={expense.id} className="border-0 shadow-sm overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <ExpenseIcon className="h-5 w-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold leading-tight">{expense.description}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {expense.propertyName ?? t('contracts.property')} · {typeLabel}
                                </p>
                                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <CalendarClock className="h-3 w-3" />
                                  {dueLabel}
                                  {expense.recurring && (
                                    <span className="text-muted-foreground/60">· {t('sharedExpensesExtra.recurring')}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold">{formatCurrency(participant.amount)}</p>
                              <Badge variant={isPaid ? 'success' : 'warning'} className="text-xs mt-0.5">
                                {isPaid ? t('status.paid') : t('status.pending')}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                            <span>{t('sharedExpensesExtra.totalExpense')}: {formatCurrency(expense.totalAmount)}</span>
                            <span>
                              {expense.participants.length}{' '}
                              {t('sharedExpensesExtra.participants')}
                            </span>
                          </div>

                          {isPaid && participant.paidDate && (
                            <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2.5 text-sm text-green-700 dark:text-green-300">
                              <CheckCircle className="h-4 w-4 shrink-0" />
                              <span>{t('home.paidOn', { date: formatDateOptional(participant.paidDate) })}</span>
                            </div>
                          )}

                          {!isPaid && participant.receiptStatus === 'aguardando' && (
                            <div className="flex items-center gap-2 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-3 py-2.5 text-sm text-yellow-700 dark:text-yellow-300">
                              <Clock className="h-4 w-4 shrink-0" />
                              <span>{t('receiptsExtra.awaitingConfirmation')}</span>
                            </div>
                          )}

                          {!isPaid && participant.receiptStatus === 'rejeitado' && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-sm text-destructive">
                                <X className="h-4 w-4 shrink-0" />
                                <span>{t('receiptsExtra.rejected')}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full border-dashed gap-2"
                                onClick={() => openExpenseUpload({ expense, participant, participantIndex })}
                              >
                                <Upload className="h-4 w-4" />
                                {t('chargesExtra.resendReceipt')}
                              </Button>
                            </div>
                          )}

                          {!isPaid && participant.receiptStatus !== 'aguardando' && participant.receiptStatus !== 'rejeitado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-dashed gap-2"
                              onClick={() => openExpenseUpload({ expense, participant, participantIndex })}
                            >
                              <Upload className="h-4 w-4" />
                              {t('chargesExtra.sendPaymentReceipt')}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })
                )}

                {sharedExpenses.length > 0 && (
                  <Pagination
                    page={sharedExpensesPag.page}
                    totalPages={sharedExpensesPag.totalPages}
                    total={sharedExpensesPag.total}
                    rangeStart={sharedExpensesPag.rangeStart}
                    rangeEnd={sharedExpensesPag.rangeEnd}
                    onPageChange={sharedExpensesPag.setPage}
                    itemLabel={t('pagination.expenses')}
                  />
                )}
              </TabsContent>

              <TabsContent value="chamados" className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{t('maintenanceExtra.sectionTitle')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('maintenanceExtra.sectionSubtitle')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowMaintenanceForm(true)}
                    disabled={!selectedContract}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    {t('maintenance.openTicket')}
                  </Button>
                </div>

                {!selectedContract && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    {t('maintenanceExtra.needsActiveContractDesc')}
                  </div>
                )}

                {maintenanceRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white dark:bg-gray-900 py-16 text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="font-semibold text-foreground">{t('maintenanceExtra.emptyTitle')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedContract
                        ? t('maintenance.emptyHint')
                        : t('contracts.emptyActive')}
                    </p>
                  </div>
                ) : (
                  maintenancePag.pageItems.map((request) => {
                    const mStatusVariant = maintenanceStatusVariant[request.status]
                    const mStatusLabel = t(`status.${STATUS_I18N[request.status]}`)
                    const entityPhotos = resolveMaintenanceEntityPhotos(request, photoLookups)
                    const assetLabel = entityPhotos.assetType === 'veiculo' ? t('contracts.vehicle') : t('contracts.property')
                    return (
                      <Card key={request.id} className="border-0 shadow-sm">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <MaintenanceEntityPhotos photos={entityPhotos} size="md" />
                            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold leading-tight">{request.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {entityPhotos.assetName ?? request.propertyName ?? assetLabel} · {formatMaintenanceDate(request)}
                                </p>
                              </div>
                              <Badge variant={mStatusVariant} className="shrink-0 text-xs">
                                {mStatusLabel}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
                              {t(`maintenance.categories.${MAINTENANCE_CATEGORY_I18N[request.category]}`)}
                            </span>
                            <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground capitalize">
                              {t('maintenanceExtra.priorityLabel', { priority: t(`maintenanceExtra.priorities.${request.priority}`) })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => setViewingRequest(request)}
                          >
                            <Eye className="mr-1.5 h-4 w-4" />
                            {t('common.seeMore')}
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })
                )}

                {maintenanceRequests.length > 0 && (
                  <Pagination
                    page={maintenancePag.page}
                    totalPages={maintenancePag.totalPages}
                    total={maintenancePag.total}
                    rangeStart={maintenancePag.rangeStart}
                    rangeEnd={maintenancePag.rangeEnd}
                    onPageChange={maintenancePag.setPage}
                    itemLabel={t('pagination.tickets')}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* ── Dialog: enviar comprovante ── */}
      <Dialog
        open={!!uploadingCharge}
        onOpenChange={(open) => { if (!open) { setUploadingCharge(null); setReceiptUrl(undefined) } }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('chargesExtra.uploadPixTitle')}</DialogTitle>
          </DialogHeader>

          {uploadingCharge && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-1">
                <p className="font-semibold">{uploadingCharge.description}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(uploadingCharge.totalAmount ?? uploadingCharge.amount)}
                </p>
                {uploadingCharge.dueDate && (
                  <p className="text-muted-foreground text-xs">
                    {t('chargesExtra.dueOn', { date: formatDateOptional(uploadingCharge.dueDate) })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-[#032B61]/15 bg-[#032B61]/5 px-3 py-2.5 text-xs text-[#032B61]">
                <QrCode className="h-4 w-4 shrink-0" />
                <span>{t('chargesExtra.uploadPixHint')}</span>
              </div>

              <PaymentInfoBox info={chargePaymentInfo} />

              <ReceiptUpload
                value={receiptUrl}
                onChange={setReceiptUrl}
                onFileSelect={handleReceiptFile}
                uploading={uploading}
                label={t('chargesExtra.receiptLabel')}
              />

              <p className="text-xs text-muted-foreground">
                {t('receiptsExtra.acceptHint')}
              </p>

              <Button
                className="w-full bg-[#032B61] text-white hover:bg-[#032B61]/90"
                disabled={!receiptUrl || submitting || uploading}
                onClick={handleSubmitReceipt}
              >
                {submitting
                  ? <><CheckCircle className="mr-2 h-4 w-4 animate-spin" /> {t('chargesExtra.sending')}</>
                  : <><Upload className="mr-2 h-4 w-4" /> {t('charges.sendReceipt')}</>
                }
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!uploadingExpense}
        onOpenChange={(open) => {
          if (!open) {
            setUploadingExpense(null)
            setExpenseReceiptUrl(undefined)
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('chargesExtra.uploadPixTitle')}</DialogTitle>
          </DialogHeader>

          {uploadingExpense && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-1">
                <p className="font-semibold">{uploadingExpense.expense.description}</p>
                <p className="text-2xl font-bold">{formatCurrency(uploadingExpense.participant.amount)}</p>
                <p className="text-muted-foreground text-xs">
                  {uploadingExpense.expense.propertyName ?? t('sharedExpenses.title')}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-[#032B61]/15 bg-[#032B61]/5 px-3 py-2.5 text-xs text-[#032B61]">
                <QrCode className="h-4 w-4 shrink-0" />
                <span>{t('chargesExtra.uploadPixHint')}</span>
              </div>

              <PaymentInfoBox info={expensePaymentInfo} />

              <ReceiptUpload
                value={expenseReceiptUrl}
                onChange={setExpenseReceiptUrl}
                onFileSelect={handleExpenseReceiptFile}
                uploading={expenseUploading}
                label={t('chargesExtra.receiptLabel')}
              />

              <p className="text-xs text-muted-foreground">
                {t('receiptsExtra.acceptHint')}
              </p>

              <Button
                className="w-full bg-[#032B61] text-white hover:bg-[#032B61]/90"
                disabled={!expenseReceiptUrl || expenseSubmitting || expenseUploading}
                onClick={handleSubmitExpenseReceipt}
              >
                {expenseSubmitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('chargesExtra.sending')}</>
                  : <><Upload className="mr-2 h-4 w-4" /> {t('charges.sendReceipt')}</>
                }
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showMaintenanceForm}
        onOpenChange={(open) => {
          setShowMaintenanceForm(open)
          if (!open) resetMaintenanceForm()
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('maintenanceExtra.dialogTitle')}</DialogTitle>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                <p className="text-xs text-muted-foreground">{t('maintenanceExtra.location')}</p>
                <p className="font-medium">{selectedContract.propertyName ?? t('contracts.property')}</p>
                <p className="text-xs text-muted-foreground mt-2">{t('maintenanceExtra.contract')}</p>
                <p className="font-mono text-xs">{selectedContract.contractNumber}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maintenance-title">{t('maintenanceExtra.titleRequired')}</Label>
                <Input
                  id="maintenance-title"
                  placeholder={t('maintenanceExtra.titlePlaceholder')}
                  value={maintenanceForm.title}
                  onChange={(e) => setMaintenanceForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t('maintenance.category')}</Label>
                  <Select
                    value={maintenanceForm.category}
                    onValueChange={(v) => setMaintenanceForm((p) => ({ ...p, category: v as MaintenanceCategory }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(MAINTENANCE_CATEGORY_I18N) as MaintenanceCategory[]).map((value) => (
                        <SelectItem key={value} value={value}>{t(`maintenance.categories.${MAINTENANCE_CATEGORY_I18N[value]}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('maintenance.priority')}</Label>
                  <Select
                    value={maintenanceForm.priority}
                    onValueChange={(v) => setMaintenanceForm((p) => ({ ...p, priority: v as MaintenanceRequest['priority'] }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">{t('maintenanceExtra.priorities.baixa')}</SelectItem>
                      <SelectItem value="media">{t('maintenanceExtra.priorities.media')}</SelectItem>
                      <SelectItem value="alta">{t('maintenanceExtra.priorities.alta')}</SelectItem>
                      <SelectItem value="urgente">{t('maintenanceExtra.priorities.urgente')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maintenance-description">{t('maintenanceExtra.descriptionRequired')}</Label>
                <textarea
                  id="maintenance-description"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={t('maintenanceExtra.descriptionPlaceholder')}
                  value={maintenanceForm.description}
                  onChange={(e) => setMaintenanceForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleCreateMaintenance}
                disabled={maintenanceLoading}
              >
                {maintenanceLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('chargesExtra.sending')}</>
                  : <><Wrench className="mr-2 h-4 w-4" /> {t('maintenanceExtra.submitTicket')}</>
                }
              </Button>
            </div>
          )}
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
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="pr-6">{viewingRequest?.title}</DialogTitle>
          </DialogHeader>

          {viewingRequest && (() => {
            const entityPhotos = resolveMaintenanceEntityPhotos(viewingRequest, photoLookups)
            const assetLabel = entityPhotos.assetType === 'veiculo' ? t('contracts.vehicle') : t('contracts.property')
            return (
            <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1fr_300px]">
              <div className="space-y-4 overflow-y-auto pr-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={maintenanceStatusVariant[viewingRequest.status]}>
                    {t(`status.${STATUS_I18N[viewingRequest.status]}`)}
                  </Badge>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {t(`maintenance.categories.${MAINTENANCE_CATEGORY_I18N[viewingRequest.category]}`)}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                    {t('maintenanceExtra.priorityLabel', { priority: t(`maintenanceExtra.priorities.${viewingRequest.priority}`) })}
                  </span>
                </div>

                <MaintenanceEntityPhotos photos={entityPhotos} size="lg" showLabels />

                <div className="rounded-xl border bg-muted/30 p-3 text-sm space-y-2">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{assetLabel}</span>
                    <span className="font-medium text-right">{entityPhotos.assetName ?? viewingRequest.propertyName ?? '—'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t('maintenanceExtra.openedAt')}</span>
                    <span className="text-right">{formatMaintenanceDate(viewingRequest)}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('charges.description')}</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{viewingRequest.description}</p>
                </div>

                <MaintenanceRequestPhotos photos={viewingRequest.photos} />

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
                canComment={viewingRequest.status !== 'finalizado'}
                inputId="tenant-maintenance-comment"
                placeholder={t('maintenanceExtra.commentPlaceholder')}
              />
            </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewProperty} onOpenChange={() => setViewProperty(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('contractsExtra.dialogs.propertyDetails')}</DialogTitle>
          </DialogHeader>
          {viewProperty && <PropertyDetail property={viewProperty} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewVehicle} onOpenChange={() => setViewVehicle(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('contractsExtra.dialogs.vehicleDetails')}</DialogTitle>
          </DialogHeader>
          {viewVehicle && <VehicleDetail vehicle={viewVehicle} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewOwner} onOpenChange={() => setViewOwner(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('contractsExtra.dialogs.ownerDetails')}</DialogTitle>
          </DialogHeader>
          {viewOwner && <OwnerDetail owner={viewOwner} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
