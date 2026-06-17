import { useQuery } from '@tanstack/react-query'
import { Download, FileText, BarChart3, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAuth } from '@/contexts/AuthContext'
import { getProperties } from '@/services/properties'
import { getTenants } from '@/services/tenants'
import { getCharges } from '@/services/charges'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from '@/hooks/useToast'

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportToXLSX(data: Record<string, unknown>[], filename: string, sheetName = 'Dados') {
  if (data.length === 0) return
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

interface ReportDef {
  title: string
  description: string
  icon: React.ElementType
  getData: () => Record<string, unknown>[]
  csvName: string
  sheetName: string
}

export function ReportsPage() {
  const { user } = useAuth()
  const companyId = user?.companyId ?? ''

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

  const today = new Date().toISOString().slice(0, 10)

  const reports: ReportDef[] = [
    {
      title: 'Relatório Financeiro',
      description: 'Todas as cobranças e recebimentos do sistema',
      icon: BarChart3,
      csvName: 'relatorio-financeiro',
      sheetName: 'Financeiro',
      getData: () =>
        charges.map((c) => ({
          Descrição: c.description,
          Inquilino: c.tenantName ?? '',
          Imóvel: c.propertyName ?? '',
          Vencimento: c.dueDate ?? '',
          'Data Pagamento': c.paidDate ?? '',
          'Forma Pagamento': c.paymentMethod ?? '',
          'Valor (R$)': c.amount.toFixed(2),
          'Total com Encargos (R$)': (c.totalAmount ?? c.amount).toFixed(2),
          Status: c.status,
        })),
    },
    {
      title: 'Relatório de Imóveis',
      description: 'Cadastro completo de imóveis com status e valores',
      icon: FileText,
      csvName: 'relatorio-imoveis',
      sheetName: 'Imóveis',
      getData: () =>
        properties.map((p) => ({
          Código: p.code,
          Nome: p.name,
          Tipo: p.type,
          Status: p.status,
          Endereço: `${p.address.street}, ${p.address.number} — ${p.address.city}/${p.address.state}`,
          'Valor Aluguel (R$)': p.rentValue.toFixed(2),
          'Inquilino Atual': p.activeTenantName ?? '',
        })),
    },
    {
      title: 'Relatório de Inquilinos',
      description: 'Lista completa de inquilinos e status de contratos',
      icon: FileText,
      csvName: 'relatorio-inquilinos',
      sheetName: 'Inquilinos',
      getData: () =>
        tenants.map((t) => ({
          Nome: t.name,
          CPF: t.cpf,
          Email: t.email ?? '',
          Telefone: t.phone ?? '',
          WhatsApp: t.whatsapp ?? '',
          'Status Contrato': t.activeContractId ? 'Ativo' : 'Sem contrato',
        })),
    },
    {
      title: 'Relatório de Inadimplência',
      description: 'Cobranças em atraso com dias de inadimplência',
      icon: FileText,
      csvName: 'relatorio-inadimplencia',
      sheetName: 'Inadimplência',
      getData: () =>
        charges
          .filter((c) => c.status !== 'pago' && c.status !== 'cancelado' && !!c.dueDate && c.dueDate < today)
          .map((c) => ({
            Inquilino: c.tenantName ?? '',
            Imóvel: c.propertyName ?? '',
            Descrição: c.description,
            Vencimento: c.dueDate ?? '',
            'Valor (R$)': c.amount.toFixed(2),
            'Total com Encargos (R$)': (c.totalAmount ?? c.amount).toFixed(2),
            'Dias em Atraso': c.dueDate
              ? Math.floor((Date.now() - new Date(c.dueDate).getTime()) / 86400000)
              : 0,
          })),
    },
  ]

  const handleExport = (report: ReportDef, format: 'csv' | 'xlsx') => {
    const data = report.getData()
    if (data.length === 0) {
      toast({ title: 'Nenhum dado para exportar.', variant: 'destructive' })
      return
    }
    if (format === 'csv') {
      exportToCSV(data, report.csvName)
    } else {
      exportToXLSX(data, report.csvName, report.sheetName)
    }
    toast({ title: `${report.title} exportado em ${format.toUpperCase()}.` })
  }

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
              {formatCurrency(
                charges.filter((c) => c.status === 'pago').reduce((s, c) => s + c.amount, 0)
              )}
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleExport(report, 'csv')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
                    onClick={() => handleExport(report, 'xlsx')}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
