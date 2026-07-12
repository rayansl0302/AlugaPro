import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { PLANS } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LockKeyhole, CheckCircle, LogOut } from 'lucide-react'

const CONTACT_WHATSAPP = '5500000000000' // substituir pelo número real

export function ExpiredPage() {
  const { t } = useTranslation('subscription')
  const { logout, user } = useAuth()

  const handleChoosePlan = (planId: string) => {
    const msg = encodeURIComponent(
      t('chooseWhatsApp', {
        plan: PLANS[planId as keyof typeof PLANS].name,
        company: user?.companyId,
        email: user?.email,
      })
    )
    window.open(`https://wa.me/${CONTACT_WHATSAPP}?text=${msg}`, '_blank')
  }

  return (
    <div className="pt-safe pb-safe min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-4">
            <LockKeyhole className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{t('expired.title')}</h1>
          <p className="text-muted-foreground max-w-sm">
            {t('expired.description')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(['starter', 'pro', 'business'] as const).map((plan) => (
            <Card key={plan} className={plan === 'pro' ? 'border-primary ring-1 ring-primary/20' : ''}>
              <CardContent className="p-5 flex flex-col gap-3">
                {plan === 'pro' && (
                  <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 w-fit mx-auto">
                    {t('mostPopular')}
                  </span>
                )}
                <p className="font-semibold">{PLANS[plan].name}</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(PLANS[plan].price)}
                  <span className="text-xs font-normal text-muted-foreground">{t('perMonth')}</span>
                </p>
                <ul className="text-xs text-left space-y-1 text-muted-foreground">
                  <li className="flex gap-1.5 items-center">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {PLANS[plan].limits.maxProperties === 999
                      ? t('unlimitedProperties')
                      : t('upToProperties', { count: PLANS[plan].limits.maxProperties })}
                  </li>
                  <li className="flex gap-1.5 items-center">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {PLANS[plan].limits.maxUsers === 999
                      ? t('unlimitedUsers')
                      : t('upToUsers', { count: PLANS[plan].limits.maxUsers })}
                  </li>
                </ul>
                <Button
                  size="sm"
                  variant={plan === 'pro' ? 'default' : 'outline'}
                  className="w-full mt-auto"
                  onClick={() => handleChoosePlan(plan)}
                >
                  {t('subscribe')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          {t('expired.logout')}
        </Button>
      </div>
    </div>
  )
}
