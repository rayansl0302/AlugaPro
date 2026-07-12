import { AlertTriangle, Clock, CreditCard, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'

export function SubscriptionBanner() {
  const { t } = useTranslation('subscription')
  const { status, daysRemaining, isAdmin } = useSubscription()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  if (isAdmin || status === 'demo' || status === 'active' || dismissed) return null

  if (status === 'trialing') {
    if (daysRemaining > 7) return null
    return (
      <div className="flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm dark:bg-amber-950/30 dark:border-amber-800">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            {t('banner.trialing', { count: daysRemaining })}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => navigate('/configuracoes/assinatura')}>
            <CreditCard className="mr-1 h-3.5 w-3.5" />
            {t('viewPlans')}
          </Button>
          <button onClick={() => setDismissed(true)} className="text-amber-600 hover:text-amber-800 dark:text-amber-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  if (status === 'past_due') {
    return (
      <div className="flex items-center justify-between gap-3 bg-red-50 border-b border-red-200 px-4 py-2 text-sm dark:bg-red-950/30 dark:border-red-800">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t('banner.past_due')}
          </span>
        </div>
        <Button size="sm" variant="destructive" onClick={() => navigate('/configuracoes/assinatura')}>
          <CreditCard className="mr-1 h-3.5 w-3.5" />
          {t('regularize')}
        </Button>
      </div>
    )
  }

  if (status === 'canceled') {
    return (
      <div className="flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm dark:bg-amber-950/30 dark:border-amber-800">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t('banner.canceled', { count: daysRemaining })}
          </span>
        </div>
        <Button size="sm" onClick={() => navigate('/configuracoes/assinatura')}>
          {t('reactivate')}
        </Button>
      </div>
    )
  }

  return null
}
