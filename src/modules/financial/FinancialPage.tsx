import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { getCharges } from '@/services/charges'
import { Charge } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getDateFnsLocale } from '@/i18n/dateLocales'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'

const statusVariant = {
  pago: 'success',
  pendente: 'warning',
  atrasado: 'destructive',
  cancelado: 'secondary',
} as const

export function FinancialPage() {
  const { t, i18n } = useTranslation('financial')
  const { t: tCommon } = useTranslation('common')
  const { user } = useAuth()
  const companyId = user?.companyId ?? ''
  const dateLocale = getDateFnsLocale(i18n.language)
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'))

  const methodLabels: Record<string, string> = {
    pix: t('methods.pix'),
    dinheiro: t('methods.dinheiro'),
    transferencia: t('methods.transferencia'),
    cartao: t('methods.cartao'),
    boleto: t('methods.boleto'),
  }

  const { data: charges = [], isLoading } = useQuery({
    queryKey: ['charges', companyId],
    queryFn: () => getCharges(companyId),
    enabled: !!companyId,
  })

  const filtered = charges.filter((p) => p.dueDate?.startsWith(monthFilter))

  const pag = usePagination(filtered, 15)

  const received = filtered.filter((p) => p.status === 'pago')
  const pending = filtered.filter((p) => p.status === 'pendente' || p.status === 'atrasado')

  const totalReceived = received.reduce((s, p) => s + p.amount, 0)
  const totalPending = pending.reduce((s, p) => s + p.amount, 0)
  const totalExpected = filtered.reduce((s, p) => s + p.amount, 0)

  // Monthly chart data from all charges
  const monthlyMap: Record<string, { mes: string; recebido: number; pendente: number }> = {}
  charges.forEach((p) => {
    const key = p.dueDate?.slice(0, 7) ?? ''
    if (!key) return
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        mes: format(new Date(key + '-01'), 'MMM/yy', { locale: dateLocale }),
        recebido: 0,
        pendente: 0,
      }
    }
    if (p.status === 'pago') monthlyMap[key].recebido += p.amount
    else monthlyMap[key].pendente += p.amount
  })
  const chartData = Object.values(monthlyMap).slice(-6)

  // By method
  const byMethod: Record<string, number> = {}
  received.forEach((p) => {
    if (p.paymentMethod) {
      byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] ?? 0) + p.amount
    }
  })

  const statusLabel = (status: Charge['status']) =>
    tCommon(`status.${status}`, { defaultValue: status })

  return (
    <div className="space-y-6">
      {/* Month filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">{t('monthLabel')}</label>
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-44"
        />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900">
              <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('expectedRevenue')}</p>
              <p className="text-2xl font-bold">{formatCurrency(totalExpected)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('sections.received')}</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900">
              <TrendingDown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('sections.pending')}</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lancamentos">
        <TabsList>
          <TabsTrigger value="lancamentos">{t('tabs.entries')}</TabsTrigger>
          <TabsTrigger value="graficos">{t('tabs.charts')}</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border py-8 text-center text-muted-foreground">
              {t('emptyMonth')}
            </div>
          ) : (
            <>
              {/* Mobile — cards */}
              <div className="space-y-3 md:hidden">
                {pag.pageItems.map((payment: Charge) => (
                  <Card key={payment.id}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate font-medium">{payment.description}</p>
                        <Badge variant={statusVariant[payment.status]} className="shrink-0">
                          {statusLabel(payment.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{payment.tenantName || '—'}</p>
                      <div className="flex items-end justify-between border-t pt-2">
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <p>{t('dueShort', { date: payment.dueDate ? formatDate(payment.dueDate) : '—' })}</p>
                          {payment.paidDate && <p>{t('paidShort', { date: formatDate(payment.paidDate) })}</p>}
                          {payment.paymentMethod && <p>{methodLabels[payment.paymentMethod]}</p>}
                        </div>
                        <p className="text-base font-semibold">{formatCurrency(payment.amount)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filtered.length > 0 && (
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
              </div>

              {/* Desktop — tabela */}
              <div className="hidden rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('columns.description')}</TableHead>
                      <TableHead>{t('columns.tenant')}</TableHead>
                      <TableHead>{t('columns.due')}</TableHead>
                      <TableHead>{t('columns.payment')}</TableHead>
                      <TableHead>{t('columns.method')}</TableHead>
                      <TableHead>{t('columns.value')}</TableHead>
                      <TableHead>{t('columns.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pag.pageItems.map((payment: Charge) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.description}</TableCell>
                        <TableCell>{payment.tenantName || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.dueDate ? formatDate(payment.dueDate) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.paidDate ? formatDate(payment.paidDate) : '—'}
                        </TableCell>
                        <TableCell>
                          {payment.paymentMethod ? methodLabels[payment.paymentMethod] : '—'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[payment.status]}>
                            {statusLabel(payment.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length > 0 && (
                  <div className="border-t px-4 py-3">
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
            </>
          )}
        </TabsContent>

        <TabsContent value="graficos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('chartTitle')}</CardTitle>
              <CardDescription>{t('chartDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="recebido" name={t('chartSeries.received')} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendente" name={t('chartSeries.pending')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {Object.keys(byMethod).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('paymentMethods')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(byMethod).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <span className="font-medium">{methodLabels[method] ?? method}</span>
                      <span className="font-bold">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
