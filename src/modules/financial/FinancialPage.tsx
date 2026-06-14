import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { getPayments } from '@/services/payments'
import { Payment } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'

const methodLabels: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  cartao: 'Cartão',
  boleto: 'Boleto',
}

const statusVariant = {
  pago: 'success',
  pendente: 'warning',
  atrasado: 'destructive',
  cancelado: 'secondary',
} as const

export function FinancialPage() {
  const { user } = useAuth()
  const companyId = user?.companyId ?? ''
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'))

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', companyId],
    queryFn: () => getPayments(companyId),
    enabled: !!companyId,
  })

  const filtered = payments.filter((p) => p.dueDate?.startsWith(monthFilter))

  const received = filtered.filter((p) => p.status === 'pago')
  const pending = filtered.filter((p) => p.status === 'pendente' || p.status === 'atrasado')

  const totalReceived = received.reduce((s, p) => s + p.amount, 0)
  const totalPending = pending.reduce((s, p) => s + p.amount, 0)
  const totalExpected = filtered.reduce((s, p) => s + p.amount, 0)

  // Monthly chart data from all payments
  const monthlyMap: Record<string, { mes: string; recebido: number; pendente: number }> = {}
  payments.forEach((p) => {
    const key = p.dueDate?.slice(0, 7) ?? ''
    if (!key) return
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        mes: format(new Date(key + '-01'), 'MMM/yy', { locale: ptBR }),
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

  return (
    <div className="space-y-6">
      {/* Month filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">Mês:</label>
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
              <p className="text-sm text-muted-foreground">Receita Esperada</p>
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
              <p className="text-sm text-muted-foreground">Recebido</p>
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
              <p className="text-sm text-muted-foreground">Pendente</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lancamentos">
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum lançamento neste mês
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.description}</TableCell>
                        <TableCell>{payment.tenantName || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(payment.dueDate)}
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
                            {payment.status === 'pago' ? 'Pago' : payment.status === 'pendente' ? 'Pendente' : payment.status === 'atrasado' ? 'Atrasado' : 'Cancelado'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="graficos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fluxo Financeiro (6 meses)</CardTitle>
              <CardDescription>Recebido vs Pendente</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="recebido" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendente" name="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {Object.keys(byMethod).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Formas de Pagamento</CardTitle>
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
