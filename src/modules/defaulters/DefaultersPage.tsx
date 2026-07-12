import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock, TrendingDown, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { getCharges } from '@/services/charges'
import { formatCurrency, formatDateOptional, getDaysLate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { format } from 'date-fns'
import { toast } from '@/hooks/useToast'

export function DefaultersPage() {
  const { t } = useTranslation('charges')
  const { user } = useAuth()
  const companyId = user?.companyId ?? ''

  const { data: charges = [], isLoading } = useQuery({
    queryKey: ['charges', companyId],
    queryFn: () => getCharges(companyId),
    enabled: !!companyId,
  })

  const today = format(new Date(), 'yyyy-MM-dd')
  const overdueCharges = charges
    .filter((c) => c.status !== 'pago' && c.status !== 'cancelado' && !!c.dueDate && c.dueDate < today)
    .map((c) => ({ ...c, daysLate: getDaysLate(c.dueDate ?? '') }))
    .sort((a, b) => b.daysLate - a.daysLate)

  // Group by tenant
  const byTenant = overdueCharges.reduce<Record<string, typeof overdueCharges>>((acc, charge) => {
    const key = charge.tenantId
    if (!acc[key]) acc[key] = []
    acc[key].push(charge)
    return acc
  }, {})

  const tenantGroups = Object.entries(byTenant)
  const pag = usePagination(tenantGroups, 8)

  const totalAmount = overdueCharges.reduce((s, c) => s + c.amount, 0)
  const avgDaysLate =
    overdueCharges.length > 0
      ? Math.round(overdueCharges.reduce((s, c) => s + c.daysLate, 0) / overdueCharges.length)
      : 0

  const sendWhatsApp = (tenantName: string, whatsapp?: string) => {
    const msg = encodeURIComponent(
      t('defaulters.whatsappMessage', { name: tenantName })
    )
    if (whatsapp) {
      window.open(`https://wa.me/55${whatsapp.replace(/\D/g, '')}?text=${msg}`, '_blank')
    } else {
      toast({ title: t('defaulters.toast.noWhatsapp'), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div>
              <p className="text-sm text-muted-foreground">{t('defaulters.totalOpen')}</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <TrendingDown className="h-10 w-10 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t('defaulters.defaultersCount')}</p>
              <p className="text-2xl font-bold">{Object.keys(byTenant).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Clock className="h-10 w-10 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t('defaulters.avgLate')}</p>
              <p className="text-2xl font-bold">{t('defaulters.days', { count: avgDaysLate })}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Tenant Groups */}
      {Object.entries(byTenant).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            {t('defaulters.emptyTitle')}
          </p>
          <p className="text-sm text-muted-foreground">{t('defaulters.emptyDescription')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pag.pageItems.map(([tenantId, tenantCharges]) => {
            const total = tenantCharges.reduce((s, c) => s + c.amount, 0)
            const maxDelay = Math.max(...tenantCharges.map((c) => c.daysLate))
            const tenantName = tenantCharges[0].tenantName || t('defaulters.tenantFallback')

            return (
              <Card key={tenantId} className="overflow-hidden border-l-4 border-l-destructive">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{tenantName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{tenantCharges[0].propertyName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-destructive">{formatCurrency(total)}</p>
                      <Badge variant="destructive">{t('defaulters.daysLate', { count: maxDelay })}</Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendWhatsApp(tenantName)}
                      className="gap-1"
                    >
                      <MessageSquare className="h-3 w-3" />
                      {t('defaulters.whatsapp')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('defaulters.columns.description')}</TableHead>
                        <TableHead>{t('defaulters.columns.due')}</TableHead>
                        <TableHead>{t('defaulters.columns.late')}</TableHead>
                        <TableHead>{t('defaulters.columns.value')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenantCharges.map((charge) => (
                        <TableRow key={charge.id}>
                          <TableCell>{charge.description}</TableCell>
                          <TableCell>{formatDateOptional(charge.dueDate, t('defaulters.noDueDate'))}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{t('defaulters.daysBadge', { count: charge.daysLate })}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(charge.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          })}
          <Pagination
            page={pag.page}
            totalPages={pag.totalPages}
            total={pag.total}
            rangeStart={pag.rangeStart}
            rangeEnd={pag.rangeEnd}
            onPageChange={pag.setPage}
            itemLabel={t('defaulters.itemLabel')}
          />
        </div>
      )}
    </div>
  )
}
