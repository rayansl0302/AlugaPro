import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { getCharges } from '@/services/charges'
import { getSharedExpenses } from '@/services/sharedExpenses'
import { getMaintenanceRequests } from '@/services/maintenance'
import { getDaysLate } from '@/lib/utils'
import { countPendingChargeReceipts, countPendingExpenseReceipts } from '@/lib/pendingReceipts'

export type NotificationAlertType = 'atrasado' | 'comprovante' | 'chamado'

export interface NotificationAlert {
  id: string
  type: NotificationAlertType
  title: string
  description: string
  href: string
  priority: number
}

const RECEIPT_REFETCH_MS = 15_000

export function useNotificationAlerts(companyId: string) {
  const { t } = useTranslation('notifications')
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: charges = [], isLoading: chargesLoading } = useQuery({
    queryKey: ['charges', companyId],
    queryFn: () => getCharges(companyId),
    enabled: !!companyId,
    refetchInterval: RECEIPT_REFETCH_MS,
  })

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['sharedExpenses', companyId],
    queryFn: () => getSharedExpenses(companyId),
    enabled: !!companyId,
    refetchInterval: RECEIPT_REFETCH_MS,
  })

  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['maintenance', companyId],
    queryFn: () => getMaintenanceRequests(companyId),
    enabled: !!companyId,
    refetchInterval: 60_000,
  })

  const alerts = useMemo(() => {
    const items: NotificationAlert[] = []

    const defaultTenant = t('alerts.defaultTenant')
    const defaultProperty = t('alerts.defaultProperty')

    charges
      .filter((c) => c.receiptStatus === 'aguardando')
      .forEach((c) => {
        items.push({
          id: `receipt-charge-${c.id}`,
          type: 'comprovante',
          title: t('alerts.receiptCharge.title'),
          description: t('alerts.receiptCharge.description', { tenant: c.tenantName ?? defaultTenant, description: c.description }),
          href: '/cobrancas',
          priority: 1,
        })
      })

    expenses.forEach((expense) => {
      expense.participants.forEach((participant, index) => {
        if (participant.receiptStatus !== 'aguardando') return
        items.push({
          id: `receipt-expense-${expense.id}-${index}`,
          type: 'comprovante',
          title: t('alerts.receiptExpense.title'),
          description: t('alerts.receiptExpense.description', { tenant: participant.tenantName, description: expense.description }),
          href: '/despesas',
          priority: 1,
        })
      })
    })

    charges
      .filter(
        (c) =>
          c.status !== 'pago' &&
          c.status !== 'cancelado' &&
          !!c.dueDate &&
          c.dueDate < today,
      )
      .forEach((c) => {
        const days = getDaysLate(c.dueDate ?? '')
        items.push({
          id: `overdue-${c.id}`,
          type: 'atrasado',
          title: t('alerts.overdue.title'),
          description: t('alerts.overdue.description', { tenant: c.tenantName ?? defaultTenant, days }),
          href: '/inadimplencia',
          priority: 2,
        })
      })

    requests
      .filter((r) => r.status === 'aberto' || r.status === 'em_analise')
      .forEach((r) => {
        const key = r.status === 'aberto' ? 'alerts.maintenanceOpen' : 'alerts.maintenanceReview'
        items.push({
          id: `maint-${r.id}`,
          type: 'chamado',
          title: t(`${key}.title`),
          description: t(`${key}.description`, { property: r.propertyName ?? defaultProperty, title: r.title }),
          href: '/chamados',
          priority: 3,
        })
      })

    return items.sort((a, b) => a.priority - b.priority)
  }, [charges, expenses, requests, today, t])

  const pendingChargeReceipts = useMemo(
    () => countPendingChargeReceipts(charges),
    [charges],
  )

  const pendingExpenseReceipts = useMemo(
    () => countPendingExpenseReceipts(expenses),
    [expenses],
  )

  const receiptAlertCount = pendingChargeReceipts + pendingExpenseReceipts

  return {
    alerts,
    count: alerts.length,
    receiptAlertCount,
    pendingChargeReceipts,
    pendingExpenseReceipts,
    isLoading: chargesLoading || expensesLoading || requestsLoading,
  }
}
