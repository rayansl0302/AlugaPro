import { useQuery } from '@tanstack/react-query'
import { Download, FileText, BarChart3, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { getProperties } from '@/services/properties'
import { getTenants } from '@/services/tenants'
import { getCharges } from '@/services/charges'
import { formatCurrency } from '@/lib/utils'
import { saveOrShareFile } from '@/lib/nativeFile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from '@/hooks/useToast'

async function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  await saveOrShareFile(blob, `${filename}.csv`)
}

async function exportToXLSX(data: Record<string, unknown>[], filename: string, sheetName = 'Dados') {
  if (data.length === 0) return
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  // XLSX.writeFile depende do download do browser (inexistente no WebView
  // nativo) — gera o buffer em memória e delega ao helper multiplataforma.
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  await saveOrShareFile(blob, `${filename}.xlsx`)
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
  const { t } = useTranslation('reports')
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
      title: t('types.financial'),
      description: t('descriptions.financial'),
      icon: BarChart3,
      csvName: 'relatorio-financeiro',
      sheetName: t('sheetNames.financial'),
      getData: () =>
        charges.map((c) => ({
          [t('csvColumns.description')]: c.description,
          [t('csvColumns.tenant')]: c.tenantName ?? '',
          [t('csvColumns.property')]: c.propertyName ?? '',
          [t('csvColumns.dueDate')]: c.dueDate ?? '',
          [t('csvColumns.paymentDate')]: c.paidDate ?? '',
          [t('csvColumns.paymentMethod')]: c.paymentMethod ?? '',
          [t('csvColumns.amount')]: c.amount.toFixed(2),
          [t('csvColumns.totalWithCharges')]: (c.totalAmount ?? c.amount).toFixed(2),
          [t('csvColumns.status')]: c.status,
        })),
    },
    {
      title: t('types.properties'),
      description: t('descriptions.properties'),
      icon: FileText,
      csvName: 'relatorio-imoveis',
      sheetName: t('sheetNames.properties'),
      getData: () =>
        properties.map((p) => ({
          [t('csvColumns.code')]: p.code,
          [t('csvColumns.name')]: p.name,
          [t('csvColumns.type')]: p.type,
          [t('csvColumns.status')]: p.status,
          [t('csvColumns.address')]: `${p.address.street}, ${p.address.number} — ${p.address.city}/${p.address.state}`,
          [t('csvColumns.rentValue')]: p.rentValue.toFixed(2),
          [t('csvColumns.currentTenant')]: p.activeTenantName ?? '',
        })),
    },
    {
      title: t('types.tenants'),
      description: t('descriptions.tenants'),
      icon: FileText,
      csvName: 'relatorio-inquilinos',
      sheetName: t('sheetNames.tenants'),
      getData: () =>
        tenants.map((tenant) => ({
          [t('csvColumns.name')]: tenant.name,
          [t('csvColumns.cpf')]: tenant.cpf,
          [t('csvColumns.email')]: tenant.email ?? '',
          [t('csvColumns.phone')]: tenant.phone ?? '',
          [t('csvColumns.whatsapp')]: tenant.whatsapp ?? '',
          [t('csvColumns.contractStatus')]: tenant.activeContractId ? t('contractStatus.active') : t('contractStatus.none'),
        })),
    },
    {
      title: t('types.overdue'),
      description: t('descriptions.overdue'),
      icon: FileText,
      csvName: 'relatorio-inadimplencia',
      sheetName: t('sheetNames.overdue'),
      getData: () =>
        charges
          .filter((c) => c.status !== 'pago' && c.status !== 'cancelado' && !!c.dueDate && c.dueDate < today)
          .map((c) => ({
            [t('csvColumns.tenant')]: c.tenantName ?? '',
            [t('csvColumns.property')]: c.propertyName ?? '',
            [t('csvColumns.description')]: c.description,
            [t('csvColumns.dueDate')]: c.dueDate ?? '',
            [t('csvColumns.amount')]: c.amount.toFixed(2),
            [t('csvColumns.totalWithCharges')]: (c.totalAmount ?? c.amount).toFixed(2),
            [t('csvColumns.daysOverdue')]: c.dueDate
              ? Math.floor((Date.now() - new Date(c.dueDate).getTime()) / 86400000)
              : 0,
          })),
    },
  ]

  const handleExport = async (report: ReportDef, format: 'csv' | 'xlsx') => {
    const data = report.getData()
    if (data.length === 0) {
      toast({ title: t('toast.noData'), variant: 'destructive' })
      return
    }
    try {
      if (format === 'csv') {
        await exportToCSV(data, report.csvName)
      } else {
        await exportToXLSX(data, report.csvName, report.sheetName)
      }
      toast({ title: t('toast.exported', { title: report.title, format: format.toUpperCase() }) })
    } catch {
      // Cancelar a share sheet no app nativo rejeita a promise — não é erro
      toast({ title: t('toast.exportCancelled') })
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold">{properties.length}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('summary.properties')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold">{tenants.length}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('summary.tenants')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(
                charges.filter((c) => c.status === 'pago').reduce((s, c) => s + c.amount, 0)
              )}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{t('summary.totalReceived')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-destructive">
              {charges.filter((c) => c.status === 'atrasado').length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{t('summary.overdue')}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold">{t('exportTitle')}</h2>

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
                    {t('exportCsv')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
                    onClick={() => handleExport(report, 'xlsx')}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {t('exportExcel')}
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
