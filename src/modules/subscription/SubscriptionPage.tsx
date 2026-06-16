import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { PLANS, PlanId } from '@/types'
import { getDaysRemaining } from '@/services/subscription'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Zap, Building2, BarChart3, ExternalLink, CreditCard, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/useToast'

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  starter: <Zap className="h-5 w-5" />,
  pro: <Building2 className="h-5 w-5" />,
  business: <BarChart3 className="h-5 w-5" />,
}

const PLAN_FEATURES: Record<PlanId, string[]> = {
  starter: [
    'Até 10 imóveis/veículos',
    '2 usuários gestores',
    'Contratos digitais',
    'Cobranças automáticas',
    'Portal do inquilino',
    'Suporte por e-mail',
  ],
  pro: [
    'Até 50 imóveis/veículos',
    '5 usuários gestores',
    'Contratos digitais',
    'Cobranças automáticas',
    'Portal do inquilino',
    'Relatórios avançados',
    'Exportação de dados',
    'Suporte prioritário',
  ],
  business: [
    'Imóveis/veículos ilimitados',
    'Usuários ilimitados',
    'Contratos digitais',
    'Cobranças automáticas',
    'Portal do inquilino',
    'Relatórios avançados',
    'Exportação de dados',
    'API de integrações (em breve)',
    'Onboarding assistido',
  ],
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'info' }> = {
  trialing:  { label: 'Trial ativo',       variant: 'info' },
  active:    { label: 'Ativo',             variant: 'success' },
  past_due:  { label: 'Pagamento pendente', variant: 'destructive' },
  canceled:  { label: 'Cancelado',         variant: 'warning' },
  expired:   { label: 'Expirado',          variant: 'secondary' },
  demo:      { label: 'Admin',             variant: 'secondary' },
}

export function SubscriptionPage() {
  const { user } = useAuth()
  const { sub, status, planId, isAdmin } = useSubscription()
  const [checkoutLoading, setCheckoutLoading] = useState<PlanId | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // When MP redirects back with ?preapproval_id=xxx, verify and update subscription
  useEffect(() => {
    const preapprovalId = searchParams.get('preapproval_id')
    if (!preapprovalId || !user?.companyId || verifying) return

    setVerifying(true)
    fetch('/api/verify-preapproval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preapprovalId, companyId: user.companyId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'active') {
          toast({ title: 'Assinatura ativada!', description: 'Seu plano está ativo.' })
        }
        // Remove query param from URL
        setSearchParams({}, { replace: true })
      })
      .catch(() => toast({ title: 'Erro ao verificar assinatura', variant: 'destructive' }))
      .finally(() => setVerifying(false))
  }, [searchParams, user?.companyId])

  const daysLeft = sub ? getDaysRemaining(sub) : 0
  const statusInfo = STATUS_BADGE[status] ?? STATUS_BADGE.expired

  const handleChoosePlan = async (plan: PlanId) => {
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
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erro ao iniciar checkout')
      }

      const { checkoutUrl } = await res.json()
      // Open in new tab — required to avoid App Store in-app payment rules
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer')
      toast({ title: 'Redirecionando para o pagamento...', description: 'Uma nova aba foi aberta com o Mercado Pago.' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tente novamente.'
      toast({ title: 'Erro ao iniciar assinatura', description: msg, variant: 'destructive' })
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {verifying && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          Verificando pagamento com o Mercado Pago...
        </div>
      )}

      {/* Status atual */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Assinatura</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seu plano e formas de pagamento
          </p>
        </div>
        <Badge variant={statusInfo.variant} className="text-sm px-3 py-1 w-fit">
          {statusInfo.label}
        </Badge>
      </div>

      {/* Card do plano atual */}
      {!isAdmin && sub && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {status === 'trialing' ? 'Período de avaliação' : 'Plano atual'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {status === 'trialing'
                  ? <Zap className="h-5 w-5 text-amber-500" />
                  : PLAN_ICONS[sub.planId]}
                <span className="font-semibold text-lg">
                  {status === 'trialing' ? 'Teste gratuito' : PLANS[sub.planId].name}
                </span>
              </div>
              {status !== 'trialing' && (
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(PLANS[sub.planId].price)}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </span>
              )}
            </div>

            {status === 'trialing' && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg p-3 text-sm dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Trial termina em <strong>{daysLeft} dia{daysLeft !== 1 ? 's' : ''}</strong>. Assine um plano para não perder acesso.
              </div>
            )}

            {status === 'past_due' && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg p-3 text-sm dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Pagamento falhou. Acesso de escrita suspenso. Regularize para continuar.
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="font-semibold text-lg">{sub.usage.propertyCount}</p>
                <p className="text-muted-foreground">
                  de {sub.limits.maxProperties === 999 ? '∞' : sub.limits.maxProperties} imóveis
                </p>
              </div>
              <div>
                <p className="font-semibold text-lg">{sub.usage.vehicleCount}</p>
                <p className="text-muted-foreground">
                  de {sub.limits.maxVehicles === 999 ? '∞' : sub.limits.maxVehicles} veículos
                </p>
              </div>
              <div>
                <p className="font-semibold text-lg">{sub.usage.userCount}</p>
                <p className="text-muted-foreground">
                  de {sub.limits.maxUsers === 999 ? '∞' : sub.limits.maxUsers} usuários
                </p>
              </div>
            </div>

            {status === 'active' && sub.providerSubscriptionId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(
                  `https://www.mercadopago.com.br/subscriptions#from-section=menu`,
                  '_blank',
                  'noopener,noreferrer'
                )}
              >
                <CreditCard className="mr-2 h-3.5 w-3.5" />
                Gerenciar cobrança
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Planos */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {status === 'active' ? 'Alterar plano' : 'Escolha um plano'}
        </h3>
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
                    <Badge className="bg-primary text-primary-foreground text-xs px-3">Mais popular</Badge>
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
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 gap-4">
                  <ul className="space-y-1.5 flex-1">
                    {PLAN_FEATURES[plan].map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-auto"
                    variant={plan === 'pro' ? 'default' : 'outline'}
                    disabled={isCurrentPlan || !!checkoutLoading}
                    onClick={() => handleChoosePlan(plan)}
                  >
                    {checkoutLoading === plan ? 'Aguarde...' :
                     isCurrentPlan ? 'Plano atual' :
                     isCheaper ? 'Fazer downgrade' : 'Assinar agora'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Nota sobre mobile */}
      <p className="text-xs text-muted-foreground">
        O pagamento é processado exclusivamente pelo site para evitar taxas de lojas de aplicativos.
        Se estiver no app mobile, o botão "Assinar agora" abrirá o navegador do seu celular.
      </p>
    </div>
  )
}
