import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Building2, Users, Home, TrendingUp, TrendingDown, Clock,
  AlertTriangle, Wrench, DollarSign, FileText, MessageSquare,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { getProperties } from '@/services/properties'
import { getCharges } from '@/services/charges'
import { getTenants } from '@/services/tenants'
import { getMaintenanceRequests } from '@/services/maintenance'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  sub?: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const companyId = user?.companyId ?? ''

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', companyId],
    queryFn: () => getProperties(companyId),
    enabled: !!companyId,
  })

  const { data: charges = [] } = useQuery({
    queryKey: ['charges', companyId],
    queryFn: () => getCharges(companyId),
    enabled: !!companyId,
  })

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants', companyId],
    queryFn: () => getTenants(companyId),
    enabled: !!companyId,
  })

  const { data: requests = [] } = useQuery({
    queryKey: ['maintenance', companyId],
    queryFn: () => getMaintenanceRequests(companyId),
    enabled: !!companyId,
  })

  const rented = properties.filter((p) => p.status === 'alugado').length
  const vacant = properties.filter((p) => p.status === 'disponivel').length
  const overdueCharges = charges.filter((c) => c.status === 'atrasado')
  const pendingCharges = charges.filter((c) => c.status === 'pendente')
  const paidCharges = charges.filter((c) => c.status === 'pago')
  const expectedRevenue = charges.reduce((s, c) => s + c.amount, 0)
  const receivedRevenue = paidCharges.reduce((s, c) => s + c.amount, 0)
  const pendingRevenue = pendingCharges.reduce((s, c) => s + c.amount, 0)
  const openRequests = requests.filter((r) => r.status !== 'finalizado').length

  const sendWhatsApp = (charge: { tenantId: string; tenantName?: string; propertyName?: string; amount: number }) => {
    const tenant = tenants.find((t) => t.id === charge.tenantId)
    const msg = encodeURIComponent(
      `Olá ${charge.tenantName ?? 'Inquilino'}, identificamos uma cobrança em atraso referente a ${charge.propertyName ?? 'seu imóvel'}. ` +
      `Valor: ${formatCurrency(charge.amount)}. Por favor, entre em contato para regularizar. AlugaPro.`
    )
    if (tenant?.whatsapp) {
      window.open(`https://wa.me/55${tenant.whatsapp.replace(/\D/g, '')}?text=${msg}`, '_blank')
    } else {
      toast({ title: 'WhatsApp não cadastrado para este inquilino.', variant: 'destructive' })
    }
  }

  const occupancyData = [
    { name: 'Alugados', value: rented },
    { name: 'Vagos', value: vacant },
    { name: 'Manutenção', value: properties.filter((p) => p.status === 'manutencao').length },
  ]

  const monthlyData = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const label = format(d, 'MMM', { locale: ptBR }).replace('.', '')
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        mes: label.charAt(0).toUpperCase() + label.slice(1),
        pago: 0,
        pendente: 0,
      }
    })
    const byKey = new Map(months.map((m) => [m.key, m]))

    for (const c of charges) {
      const ref = c.dueDate || c.paidDate
      if (!ref) continue
      const d = parseISO(ref)
      if (Number.isNaN(d.getTime())) continue
      const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`)
      if (!bucket) continue
      if (c.status === 'pago') bucket.pago += c.amount
      else if (c.status === 'pendente' || c.status === 'atrasado') bucket.pendente += c.amount
    }
    return months
  }, [charges])

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <KpiCard
          title="Total de Imóveis"
          value={properties.length}
          icon={Building2}
          color="bg-blue-500"
        />
        <KpiCard
          title="Alugados"
          value={rented}
          icon={Home}
          color="bg-emerald-500"
          sub={`${vacant} vagos`}
        />
        <KpiCard
          title="Receita Prevista"
          value={formatCurrency(expectedRevenue)}
          icon={TrendingUp}
          color="bg-indigo-500"
        />
        <KpiCard
          title="Receita Recebida"
          value={formatCurrency(receivedRevenue)}
          icon={DollarSign}
          color="bg-green-500"
        />
        <KpiCard
          title="Inadimplentes"
          value={overdueCharges.length}
          icon={AlertTriangle}
          color="bg-red-500"
          sub={formatCurrency(overdueCharges.reduce((s, c) => s + c.amount, 0))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Cobranças Vencidas"
          value={overdueCharges.length}
          icon={Clock}
          color="bg-orange-500"
        />
        <KpiCard
          title="Pendente"
          value={formatCurrency(pendingRevenue)}
          icon={TrendingDown}
          color="bg-yellow-500"
        />
        <KpiCard
          title="Inquilinos Ativos"
          value={tenants.filter((t) => t.active).length}
          icon={Users}
          color="bg-purple-500"
        />
        <KpiCard
          title="Chamados Abertos"
          value={openRequests}
          icon={Wrench}
          color="bg-pink-500"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receitas por Mês</CardTitle>
            <CardDescription>Comparativo de receita prevista vs recebida</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => (v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`)} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="pago"
                  name="Recebido"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="pendente"
                  name="Pendente"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ocupação</CardTitle>
            <CardDescription>Status dos imóveis</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {occupancyData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Overdue */}
      {overdueCharges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cobranças Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueCharges.slice(0, 5).map((charge) => (
                <div
                  key={charge.id}
                  className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                >
                  <div>
                    <p className="font-medium">{charge.tenantName}</p>
                    <p className="text-sm text-muted-foreground">{charge.propertyName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-destructive">{formatCurrency(charge.amount)}</p>
                      <Badge variant="destructive" className="text-xs">
                        {charge.daysLate}d de atraso
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
                      onClick={() => sendWhatsApp(charge)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Notificar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
