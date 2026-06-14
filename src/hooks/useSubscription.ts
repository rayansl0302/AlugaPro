import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  getSubscription, checkAndExpireTrial, canWrite, hasAccess, getDaysRemaining,
} from '@/services/subscription'
import { CompanySubscription, SubscriptionStatus } from '@/types'

export interface SubscriptionInfo {
  sub: CompanySubscription | null
  status: SubscriptionStatus | 'demo'
  planId: string
  daysRemaining: number
  isLoading: boolean
  canWrite: boolean
  hasAccess: boolean
  isAdmin: boolean
}

export function useSubscription(): SubscriptionInfo {
  const { user } = useAuth()
  const qc = useQueryClient()

  const companyId = user?.companyId ?? ''
  const isAdmin = user?.role === 'admin'
  const isDemo = companyId === 'demo-company'

  const { data: sub, isLoading } = useQuery({
    queryKey: ['subscription', companyId],
    queryFn: async () => {
      const s = await getSubscription(companyId)
      if (!s) return null
      // auto-expire trial se venceu
      const currentStatus = await checkAndExpireTrial(s)
      if (currentStatus !== s.status) {
        qc.invalidateQueries({ queryKey: ['subscription', companyId] })
      }
      return s
    },
    enabled: !!companyId && !isDemo,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })

  // admins AlugaPro e contas demo têm acesso total sem assinatura
  if (isAdmin || isDemo) {
    return {
      sub: null,
      status: 'demo',
      planId: 'business',
      daysRemaining: 999,
      isLoading: false,
      canWrite: true,
      hasAccess: true,
      isAdmin,
    }
  }

  const status = sub?.status ?? 'expired'
  return {
    sub: sub ?? null,
    status,
    planId: sub?.planId ?? 'starter',
    daysRemaining: sub ? getDaysRemaining(sub) : 0,
    isLoading,
    canWrite: canWrite(status),
    hasAccess: hasAccess(status),
    isAdmin: false,
  }
}
