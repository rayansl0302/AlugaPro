import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FileText, LogOut, Home, Wifi, Zap, Droplets, Building2, Landmark, Flame,
  ShieldCheck, AlertTriangle, Percent, Receipt, CalendarClock, Wallet,
  Upload, CheckCircle, Clock, X, TrendingDown, CreditCard, UserCircle, ShieldAlert,
  Eye, Download,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getChargesByTenant, updateCharge } from '@/services/charges'
import { getContractsByTenant } from '@/services/contracts'
import { getPaymentsByTenant } from '@/services/payments'
import { uploadReceipt } from '@/services/storage'
import { generateSignedContractPDF } from '@/lib/regenerateContractPDF'
import { contractPDFToBlob, downloadContractPDF } from '@/lib/contractPDF'
import { Charge, ChargeType, PaymentMethod } from '@/types'
import { formatCurrency, formatDate, formatDateOptional, getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ReceiptUpload } from '@/components/shared/ReceiptUpload'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'

const statusVariant = {
  pendente: 'warning',
  pago: 'success',
  atrasado: 'destructive',
  cancelado: 'secondary',
} as const

const statusLabel: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
}

const methodLabel: Record<PaymentMethod, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  cartao: 'Cartão',
  boleto: 'Boleto',
}

type ChargeCategory = { label: string; Icon: LucideIcon }

function getChargeCategory(charge: Pick<Charge, 'type' | 'description'>): ChargeCategory {
  const byType: Partial<Record<ChargeType, ChargeCategory>> = {
    aluguel: { label: 'Aluguel', Icon: Home },
    caucao: { label: 'Caução', Icon: ShieldCheck },
    multa: { label: 'Multa', Icon: AlertTriangle },
    juros: { label: 'Juros', Icon: Percent },
  }
  if (byType[charge.type]) return byType[charge.type] as ChargeCategory

  const text = (charge.description ?? '').toLowerCase()
  if (/inter|wi-?fi/.test(text)) return { label: 'Internet', Icon: Wifi }
  if (/energia|luz|el[eé]tr/.test(text)) return { label: 'Energia', Icon: Zap }
  if (/[aá]gua/.test(text)) return { label: 'Água', Icon: Droplets }
  if (/condom/.test(text)) return { label: 'Condomínio', Icon: Building2 }
  if (/iptu/.test(text)) return { label: 'IPTU', Icon: Landmark }
  if (/g[aá]s/.test(text)) return { label: 'Gás', Icon: Flame }
  if (/segur/.test(text)) return { label: 'Segurança', Icon: ShieldCheck }
  return { label: 'Outros', Icon: Receipt }
}

const TODAY = new Date().toISOString().slice(0, 10)

function chargeStatus(charge: Charge): keyof typeof statusVariant {
  if (charge.status === 'pago' || charge.status === 'cancelado') return charge.status
  return charge.dueDate && charge.dueDate < TODAY ? 'atrasado' : 'pendente'
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function TenantPortal() {
  const { user, logout } = useAuth()
  const qc = useQueryClient()
  const companyId = user?.companyId ?? ''
  const tenantId = user?.id ?? ''

  const [uploadingCharge, setUploadingCharge] = useState<Charge | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [contractLoading, setContractLoading] = useState<false | 'view' | 'download'>(false)

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

  const activeContract = contracts.find((c) => c.status === 'ativo')
  const pendingCharges = charges.filter((c) => c.status !== 'pago' && c.status !== 'cancelado')
  const overdueCharges = pendingCharges.filter((c) => c.dueDate && c.dueDate < TODAY)
  const totalPending = pendingCharges.reduce((s, c) => s + (c.totalAmount ?? c.amount), 0)
  const totalOverdue = overdueCharges.reduce((s, c) => s + (c.totalAmount ?? c.amount), 0)

  const historyPag = usePagination(payments, 10)

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
      toast({ title: 'Erro ao enviar arquivo.', variant: 'destructive' })
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
      toast({ title: 'Comprovante enviado!', description: 'Aguarde a confirmação do gestor.' })
      setUploadingCharge(null)
      setReceiptUrl(undefined)
    } catch {
      toast({ title: 'Erro ao enviar comprovante.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const openUpload = (charge: Charge) => {
    setReceiptUrl(charge.receipt)
    setUploadingCharge(charge)
  }

  const handleViewContract = async () => {
    if (!activeContract) return
    if (activeContract.signingData) {
      setContractLoading('view')
      try {
        const doc = await generateSignedContractPDF(activeContract)
        window.open(URL.createObjectURL(contractPDFToBlob(doc)), '_blank')
      } catch {
        toast({ title: 'Erro ao gerar o contrato.', variant: 'destructive' })
      } finally {
        setContractLoading(false)
      }
      return
    }
    if (activeContract.signedPdfUrl) {
      window.open(activeContract.signedPdfUrl, '_blank')
      return
    }
    toast({ title: 'Contrato ainda não disponível para visualização.' })
  }

  const handleDownloadContract = async () => {
    if (!activeContract) return
    if (activeContract.signingData) {
      setContractLoading('download')
      try {
        const doc = await generateSignedContractPDF(activeContract)
        downloadContractPDF(doc, `Contrato_${activeContract.contractNumber}.pdf`)
      } catch {
        toast({ title: 'Erro ao baixar o contrato.', variant: 'destructive' })
      } finally {
        setContractLoading(false)
      }
      return
    }
    if (activeContract.signedPdfUrl) {
      window.open(activeContract.signedPdfUrl, '_blank')
      return
    }
    toast({ title: 'Contrato ainda não disponível.' })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur dark:bg-gray-900/90 shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="AlugaPro" className="h-7 w-7 object-contain" />
            <span className="font-bold tracking-tight">AlugaPro</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {user ? getInitials(user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="hidden items-center gap-1 text-sm font-medium sm:flex">
              {user?.name}
              {user?.phoneVerified ? (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-600" aria-label="Telefone verificado">
                  <title>Telefone verificado</title>
                </ShieldCheck>
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Telefone não verificado">
                  <title>Telefone não verificado</title>
                </ShieldAlert>
              )}
            </span>
            <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Meu perfil">
              <Link to="/perfil"><UserCircle className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-5">

        {/* ── Greeting ── */}
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {greeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aqui está um resumo do seu aluguel
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
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total a pagar</p>
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
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Em atraso</p>
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
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Em aberto</p>
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
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Próx. vencimento</p>
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
            {activeContract && (
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-primary to-primary/80 px-4 py-3">
                  <div className="flex items-center gap-2 text-primary-foreground">
                    <FileText className="h-4 w-4 opacity-80" />
                    <span className="text-sm font-semibold">Contrato Ativo</span>
                  </div>
                </div>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { label: 'Número', value: activeContract.contractNumber, mono: true },
                      { label: 'Imóvel', value: activeContract.propertyName },
                      { label: 'Valor', value: formatCurrency(activeContract.rentValue), bold: true },
                      { label: 'Vence todo dia', value: String(activeContract.dueDay) },
                      {
                        label: 'Vigência',
                        value: `${formatDate(activeContract.startDate)} — ${formatDateOptional(activeContract.endDate, 'Indeterminado')}`,
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
                  <div className="flex gap-2 px-4 pb-4 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={!!contractLoading}
                      onClick={handleViewContract}
                    >
                      {contractLoading === 'view'
                        ? <Clock className="mr-1.5 h-4 w-4 animate-spin" />
                        : <Eye className="mr-1.5 h-4 w-4" />}
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={!!contractLoading}
                      onClick={handleDownloadContract}
                    >
                      {contractLoading === 'download'
                        ? <Clock className="mr-1.5 h-4 w-4 animate-spin" />
                        : <Download className="mr-1.5 h-4 w-4" />}
                      Baixar
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
                    Cobranças por categoria
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
                          <p className="text-sm font-medium leading-none">{label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{count} {count === 1 ? 'item' : 'itens'}</p>
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
                    Últimos pagamentos
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
                            {payment.paidDate ? `Pago em ${formatDateOptional(payment.paidDate)}` : '—'}
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
                  A pagar
                  {pendingCharges.length > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[11px] font-bold text-primary">
                      {pendingCharges.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="historico" className="flex-1">Histórico de pagamentos</TabsTrigger>
              </TabsList>

              <TabsContent value="a-pagar" className="space-y-3">
                {toPay.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white dark:bg-gray-900 py-16 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                    <p className="font-semibold text-foreground">Tudo em dia!</p>
                    <p className="text-sm text-muted-foreground mt-1">Nenhuma cobrança em aberto.</p>
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
                                  {charge.dueDate ? `Vence ${formatDateOptional(charge.dueDate)}` : 'Sem vencimento'}
                                  <span className="text-muted-foreground/50">· {label}</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold">{formatCurrency(amount)}</p>
                              <Badge variant={statusVariant[status]} className="text-xs mt-0.5">
                                {statusLabel[status]}
                              </Badge>
                            </div>
                          </div>

                          {receiptStatus === 'aguardando' ? (
                            <div className="flex items-center gap-2 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-3 py-2.5 text-sm text-yellow-700 dark:text-yellow-300">
                              <Clock className="h-4 w-4 shrink-0" />
                              <span>Comprovante enviado — aguardando confirmação do gestor</span>
                            </div>
                          ) : receiptStatus === 'confirmado' ? (
                            <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2.5 text-sm text-green-700 dark:text-green-300">
                              <CheckCircle className="h-4 w-4 shrink-0" />
                              <span>Pagamento confirmado pelo gestor</span>
                            </div>
                          ) : receiptStatus === 'rejeitado' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-sm text-destructive">
                                <X className="h-4 w-4 shrink-0" />
                                <span>Comprovante rejeitado — envie novamente</span>
                              </div>
                              <Button size="sm" variant="outline" className="w-full" onClick={() => openUpload(charge)}>
                                <Upload className="mr-2 h-4 w-4" /> Reenviar comprovante
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
                              {charge.receipt ? 'Alterar comprovante' : 'Enviar comprovante de pagamento'}
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
                    <p className="font-semibold text-foreground">Sem histórico</p>
                    <p className="text-sm text-muted-foreground mt-1">Nenhum pagamento registrado ainda.</p>
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
                                ? `Pago em ${formatDateOptional(payment.paidDate)}`
                                : payment.dueDate
                                  ? `Vence ${formatDateOptional(payment.dueDate)}`
                                  : 'Sem vencimento'}
                              {payment.paymentMethod && (
                                <span className="text-muted-foreground/60">
                                  {' '}· {methodLabel[payment.paymentMethod]}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold">{formatCurrency(payment.amount)}</p>
                            <Badge variant={statusVariant[payment.status]} className="text-xs mt-0.5">
                              {statusLabel[payment.status]}
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
                    itemLabel="pagamentos"
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
            <DialogTitle>Enviar Comprovante</DialogTitle>
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
                    Vence {formatDateOptional(uploadingCharge.dueDate)}
                  </p>
                )}
              </div>

              <ReceiptUpload
                value={receiptUrl}
                onChange={setReceiptUrl}
                onFileSelect={handleReceiptFile}
                uploading={uploading}
                label="Comprovante do PIX ou pagamento"
              />

              <p className="text-xs text-muted-foreground">
                Aceito: foto do comprovante, print do app, PDF. Após o envio, o gestor irá confirmar o pagamento.
              </p>

              <Button
                className="w-full"
                disabled={!receiptUrl || submitting || uploading}
                onClick={handleSubmitReceipt}
              >
                {submitting
                  ? <><CheckCircle className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                  : <><Upload className="mr-2 h-4 w-4" /> Enviar para confirmação</>
                }
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
