import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, BarChart3 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getPayments } from '@/services/payments'
import { getProperties } from '@/services/properties'
import { getTenants } from '@/services/tenants'
import { getCharges } from '@/services/charges'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from '@/hooks/useToast'

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface ReportCard {
  title: string
  description: string
  icon: React.ElementType
  action: () => void
}

export function ReportsPage() {
  const { user } = useAuth()
  const companyId = user?.companyId ?? ''

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', companyId],
    queryFn: () => getPayments(companyId),
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
  const { data: charges = [] } = useQuery({
    queryKey: ['charges', companyId],
    queryFn: () => getCharges(companyId),
    enabled: !!companyId,
  })

  const exportFinancial = () => {
    const data = payments.map((p) => ({
      Descrição: p.description,
      Inquilino: p.tenantName ?? '',
      Imóvel: p.propertyName ?? '',
      'Vencimento': p.dueDate,
      'Data Pagamento': p.paidDate ?? '',
      'Forma Pagamento': p.paymentMethod ?? '',
      'Valor (R$)': p.amount.toFixed(2),
      Status: p.status,
    }))
    exportToCSV(data, 'relatorio-financeiro')
    toast({ title: 'Relatório financeiro exportado.' })
  }

  const exportProperties = () => {
    const data = properties.map((p) => ({
      Código: p.code,
      Nome: p.name,
      Tipo: p.type,
      Status: p.status,
      'Endereço': `${p.address.street}, ${p.address.number} — ${p.address.city}/${p.address.state}`,
      'Valor Aluguel (R$)': p.rentValue.toFixed(2),
      'Inquilino Atual': p.activeTenantName ?? '',
    }))
    exportToCSV(data, 'relatorio-imoveis')
    toast({ title: 'Relatório de imóveis exportado.' })
  }

  const exportTenants = () => {
    const data = tenants.map((t) => ({
      Nome: t.name,
      CPF: t.cpf,
      Email: t.email ?? '',
      Telefone: t.phone ?? '',
      'Status Contrato': t.activeContractId ? 'Ativo' : 'Sem contrato',
    }))
    exportToCSV(data, 'relatorio-inquilinos')
    toast({ title: 'Relatório de inquilinos exportado.' })
  }

  const exportDefaulters = () => {
    const today = new Date().toISOString().slice(0, 10)
    const overdue = charges.filter((c) => c.status !== 'pago' && !!c.dueDate && c.dueDate < today)
    const data = overdue.map((c) => ({
      Inquilino: c.tenantName ?? '',
      Imóvel: c.propertyName ?? '',
      Descrição: c.description,
      'Vencimento': c.dueDate ?? '',
      'Valor (R$)': c.amount.toFixed(2),
      'Dias em Atraso': c.dueDate
        ? Math.floor((Date.now() - new Date(c.dueDate).getTime()) / 86400000)
        : 0,
    }))
    exportToCSV(data, 'relatorio-inadimplencia')
    toast({ title: 'Relatório de inadimplência exportado.' })
  }

  const reports: ReportCard[] = [
    {
      title: 'Relatório Financeiro',
      description: 'Todos os pagamentos e recebimentos do sistema',
      icon: BarChart3,
      action: exportFinancial,
    },
    {
      title: 'Relatório de Imóveis',
      description: 'Cadastro completo de imóveis com status e valores',
      icon: FileText,
      action: exportProperties,
    },
    {
      title: 'Relatório de Inquilinos',
      description: 'Lista completa de inquilinos e status de contratos',
      icon: FileText,
      action: exportTenants,
    },
    {
      title: 'Relatório de Inadimplência',
      description: 'Cobranças em atraso com dias de inadimplência',
      icon: FileText,
      action: exportDefaulters,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold">{properties.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Imóveis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold">{tenants.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Inquilinos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(payments.filter((p) => p.status === 'pago').reduce((s, p) => s + p.amount, 0))}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total Recebido</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-destructive">
              {charges.filter((c) => c.status === 'atrasado').length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Em Atraso</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold">Exportar Relatórios</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Card key={report.title} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{report.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={report.action}>
                  <Download className="mr-2 h-4 w-4" /> Exportar CSV
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
