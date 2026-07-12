import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, MessageSquare, Mail, Smartphone, FileCheck, AlertTriangle, Wrench, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useNotificationAlerts, NotificationAlertType } from '@/hooks/useNotificationAlerts'
import { cn } from '@/lib/utils'

const TYPE_ICON: Record<NotificationAlertType, React.ElementType> = {
  comprovante: FileCheck,
  atrasado: AlertTriangle,
  chamado: Wrench,
}

const TYPE_COLOR: Record<NotificationAlertType, string> = {
  comprovante: 'text-orange-500 bg-orange-500/10',
  atrasado: 'text-destructive bg-destructive/10',
  chamado: 'text-blue-500 bg-blue-500/10',
}

interface NotificationRule {
  trigger: string
  daysOffset: number
  channels: { whatsapp: boolean; email: boolean; push: boolean }
}

const defaultRules: Omit<NotificationRule, 'label'>[] = [
  {
    trigger: 'vencimento_7dias',
    daysOffset: -7,
    channels: { whatsapp: true, email: true, push: false },
  },
  {
    trigger: 'vencimento_3dias',
    daysOffset: -3,
    channels: { whatsapp: true, email: false, push: true },
  },
  {
    trigger: 'vencimento_1dia',
    daysOffset: -1,
    channels: { whatsapp: true, email: false, push: true },
  },
  {
    trigger: 'vencido_dia',
    daysOffset: 0,
    channels: { whatsapp: true, email: true, push: true },
  },
  {
    trigger: 'vencido_3dias',
    daysOffset: 3,
    channels: { whatsapp: true, email: true, push: false },
  },
  {
    trigger: 'vencido_7dias',
    daysOffset: 7,
    channels: { whatsapp: true, email: true, push: false },
  },
  {
    trigger: 'vencido_15dias',
    daysOffset: 15,
    channels: { whatsapp: true, email: true, push: false },
  },
]

export function NotificationsPage() {
  const { t } = useTranslation('notifications')
  const { user } = useAuth()
  const companyId = user?.companyId ?? ''
  const { alerts, count, isLoading } = useNotificationAlerts(companyId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('pageSubtitle')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {t('pendingAlerts')}
            {count > 0 && (
              <Badge variant="destructive">{count}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {t('pendingAlertsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loadingAlerts')}
            </div>
          ) : count === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium">{t('noPendingTitle')}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('noPendingDescription')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const Icon = TYPE_ICON[alert.type]
                return (
                  <Link
                    key={alert.id}
                    to={alert.href}
                    className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        TYPE_COLOR[alert.type],
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{alert.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{alert.description}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-base font-semibold">{t('autoTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('autoSubtitle')}
          </p>
        </div>
      </div>

      {/* Channel Legend */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
          <MessageSquare className="h-4 w-4 text-green-500" />
          WhatsApp
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
          <Mail className="h-4 w-4 text-blue-500" />
          E-mail
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
          <Smartphone className="h-4 w-4 text-purple-500" />
          {t('push')}
        </div>
      </div>

      <div className="space-y-3">
        {defaultRules.map((rule) => (
          <Card key={rule.trigger}>
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-4">
                <Badge
                  variant={rule.daysOffset <= 0 ? 'warning' : 'destructive'}
                  className="shrink-0 w-24 justify-center"
                >
                  {rule.daysOffset < 0
                    ? t('daysBefore', { count: Math.abs(rule.daysOffset) })
                    : rule.daysOffset === 0
                    ? t('onDay')
                    : t('daysAfter', { count: rule.daysOffset })}
                </Badge>
                <span className="text-sm font-medium">{t(`rules.${rule.trigger}`)}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch defaultChecked={rule.channels.whatsapp} />
                  <MessageSquare className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked={rule.channels.email} />
                  <Mail className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch defaultChecked={rule.channels.push} />
                  <Smartphone className="h-4 w-4 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('templateTitle')}</CardTitle>
          <CardDescription>
            {t('templateVars')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                label: t('templates.waBeforeLabel'),
                template: t('templates.waBefore'),
              },
              {
                label: t('templates.waAfterLabel'),
                template: t('templates.waAfter'),
              },
              {
                label: t('templates.emailSubjectLabel'),
                template: t('templates.emailSubject'),
              },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{item.label}</Label>
                <textarea
                  defaultValue={item.template}
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
