import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { PLANS, PlanId } from '@/types'
import { getDaysRemaining } from '@/services/subscription'
import { formatCurrency, maskCPF } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Zap, Building2, BarChart3, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/useToast'

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  starter: <Zap className="h-5 w-5" />,
  pro: <Building2 className="h-5 w-5" />,
  business: <BarChart3 className="h-5 w-5" />,
}

const PLAN_FEATURE_KEYS: Record<PlanId, string[]> = {
  starter: ['properties', 'users', 'contracts', 'charges', 'portal', 'support'],
  pro: ['properties', 'users', 'contracts', 'charges', 'portal', 'reports', 'export', 'support'],
  business: ['properties', 'users', 'contracts', 'charges', 'portal', 'reports', 'export', 'api', 'onboarding'],
}

const STATUS_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  trialing: 'info',
  active: 'success',
  past_due: 'destructive',
  canceled: 'warning',
  expired: 'secondary',
  demo: 'secondary',
}

export function SubscriptionPage() {
  const { t } = useTranslation('subscription')
  const { user } = useAuth()
  const { sub, status, planId, isAdmin } = useSubscription()
  const [checkoutLoading, setCheckoutLoading] = useState<PlanId | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null)
  const [cpfCnpj, setCpfCnpj] = useState('')

  // Quando a Asaas redireciona de volta com ?asaas_redirect=1, verifica e atualiza a assinatura
  useEffect(() => {
    if (!searchParams.get('asaas_redirect') || !user?.companyId || verifying) return

    setVerifying(true)
    fetch('/api/verify-asaas-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: user.companyId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'active') {
          toast({ title: t('toast.activated'), description: t('toast.activatedDesc') })
        }
        setSearchParams({}, { replace: true })
      })
      .catch(() => toast({ title: t('toast.verifyError'), variant: 'destructive' }))
      .finally(() => setVerifying(false))
  }, [searchParams, user?.companyId])

  const daysLeft = sub ? getDaysRemaining(sub) : 0
  const statusVariant = STATUS_BADGE_VARIANT[status] ?? STATUS_BADGE_VARIANT.expired
  const statusLabel = t(`status.${status}`, { defaultValue: t('status.expired') })

  const startCheckout = async (plan: PlanId, documentNumber?: string) => {
    if (!user?.companyId || !user?.email) return
    setCheckoutLoading(plan)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan,
          companyId: user.companyId,
          email: user.email,
          ...(documentNumber ? { cpfCnpj: documentNumber } : {}),
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (data.error === 'cpf_cnpj_required') {
          setPendingPlan(plan)
          setCheckoutLoading(null)
          return
        }
        throw new Error(data.error ?? 'Erro ao iniciar checkout')
      }

      if (data.affiliateApplied) {
        toast({ title: t('toast.affiliateOk'), description: t('toast.affiliateOkDesc') })
      }

      // Abre em nova aba — necessário para evitar regras de pagamento in-app das lojas
      window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer')
      toast({ title: t('toast.redirectPay'), description: t('toast.redirectPayDesc') })
      setPendingPlan(null)
      setCpfCnpj('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tente novamente.'
      toast({ title: t('toast.startError'), description: msg, variant: 'destructive' })
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleChoosePlan = (plan: PlanId) => startCheckout(plan)

  const handleConfirmDocument = () => {
    const digits = cpfCnpj.replace(/\D/g, '')
    if (digits.length !== 11 && digits.length !== 14) {
      toast({ title: t('toast.invalidDocument'), variant: 'destructive' })
      return
    }
    if (pendingPlan) startCheckout(pendingPlan, digits)
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {verifying && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          {t('verifying')}
        </div>
      )}

      {/* Status atual */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('title')}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Badge variant={statusVariant} className="text-sm px-3 py-1 w-fit">
          {statusLabel}
        </Badge>
      </div>

      {/* Card do plano atual */}
      {!isAdmin && sub && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {status === 'trialing' ? t('trialPeriod') : t('currentPlan')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {status === 'trialing'
                  ? <Zap className="h-5 w-5 text-amber-500" />
                  : PLAN_ICONS[sub.planId]}
                <span className="font-semibold text-lg">
                  {status === 'trialing' ? t('freeTrial') : PLANS[sub.planId].name}
                </span>
              </div>
              {status !== 'trialing' && (
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(PLANS[sub.planId].price)}
                  <span className="text-sm font-normal text-muted-foreground">{t('perMonth')}</span>
                </span>
              )}
            </div>

            {status === 'trialing' && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg p-3 text-sm dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {t('trial.endsIn', { count: daysLeft })}
              </div>
            )}

            {status === 'past_due' && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg p-3 text-sm dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {t('pastDue.message')}
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="font-semibold text-lg">{sub.usage.propertyCount}</p>
                <p className="text-muted-foreground">
                  {t('usage.properties', { max: sub.limits.maxProperties === 999 ? '∞' : sub.limits.maxProperties })}
                </p>
              </div>
              <div>
                <p className="font-semibold text-lg">{sub.usage.vehicleCount}</p>
                <p className="text-muted-foreground">
                  {t('usage.vehicles', { max: sub.limits.maxVehicles === 999 ? '∞' : sub.limits.maxVehicles })}
                </p>
              </div>
              <div>
                <p className="font-semibold text-lg">{sub.usage.userCount}</p>
                <p className="text-muted-foreground">
                  {t('usage.users', { max: sub.limits.maxUsers === 999 ? '∞' : sub.limits.maxUsers })}
                </p>
              </div>
            </div>

          </CardContent>
        </Card>
      )}

      {/* Planos */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {status === 'active' ? t('changePlan') : t('choosePlan')}
        </h3>

        {status === 'demo' ? (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-8 text-center">
            <BarChart3 className="mx-auto h-10 w-10 text-primary mb-3" />
            <p className="font-semibold text-lg">{t('demoTitle')}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {t('demoDescription')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {(Object.keys(PLANS) as PlanId[]).map((plan) => {
              const isCurrentPlan = sub?.planId === plan && status === 'active'
              const isCheaper = status === 'active' && sub && PLANS[plan].price < PLANS[sub.planId].price
              return (
                <Card
                  key={plan}
                  className={`relative flex flex-col transition-all ${
                    plan === 'pro'
                      ? 'border-primary shadow-md ring-1 ring-primary/20'
                      : ''
                  } ${isCurrentPlan ? 'opacity-70' : ''}`}
                >
                  {plan === 'pro' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-xs px-3">{t('mostPopular')}</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-primary">
                      {PLAN_ICONS[plan]}
                      <CardTitle className="text-base">{PLANS[plan].name}</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground">{PLANS[plan].description}</p>
                    <div className="pt-2">
                      <span className="text-3xl font-bold">{formatCurrency(PLANS[plan].price)}</span>
                      <span className="text-muted-foreground text-sm">{t('perMonth')}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 gap-4">
                    <ul className="space-y-1.5 flex-1">
                      {PLAN_FEATURE_KEYS[plan].map((featKey) => (
                        <li key={featKey} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          {t(`features.${plan}.${featKey}`)}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full mt-auto"
                      variant={plan === 'pro' ? 'default' : 'outline'}
                      disabled={isCurrentPlan || !!checkoutLoading}
                      onClick={() => handleChoosePlan(plan)}
                    >
                      {checkoutLoading === plan ? t('wait') :
                       isCurrentPlan ? t('currentPlan') :
                       isCheaper ? t('downgrade') : t('subscribeNow')}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Nota sobre mobile */}
      <p className="text-xs text-muted-foreground">
        {t('mobileNote')}
      </p>

      <Dialog open={!!pendingPlan} onOpenChange={(open) => !open && setPendingPlan(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('confirmDocumentTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('confirmDocumentDesc')}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="checkout-document">{t('documentLabel')}</Label>
            <Input
              id="checkout-document"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value.replace(/\D/g, '').length <= 11 ? maskCPF(e.target.value) : e.target.value)}
              placeholder="000.000.000-00"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleConfirmDocument} disabled={!!checkoutLoading}>
              {checkoutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('continuePayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
