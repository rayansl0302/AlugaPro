import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle, Bell, FileCheck, Loader2, Wrench,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotificationAlerts, NotificationAlertType } from '@/hooks/useNotificationAlerts'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

const PREVIEW_LIMIT = 8

export function NotificationBell() {
  const { t } = useTranslation('nav')
  const { user } = useAuth()
  const companyId = user?.companyId ?? ''
  const { alerts, count, isLoading } = useNotificationAlerts(companyId)
  const preview = alerts.slice(0, PREVIEW_LIMIT)
  const hiddenCount = Math.max(0, count - PREVIEW_LIMIT)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t('notificationsTitle')}>
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="border-b px-4 py-3 font-semibold">
          {t('notificationsTitle')}
          {count > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {count} pendente{count !== 1 ? 's' : ''}
            </span>
          )}
        </DropdownMenuLabel>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('loading')}
          </div>
        ) : count === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium">{t('allGood')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nenhum alerta no momento.
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto py-1">
            {preview.map((alert) => {
              const Icon = TYPE_ICON[alert.type]
              return (
                <DropdownMenuItem key={alert.id} asChild className="cursor-pointer p-0">
                  <Link
                    to={alert.href}
                    className="flex w-full items-start gap-3 px-4 py-3"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        TYPE_COLOR[alert.type],
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-tight">
                        {alert.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {alert.description}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              )
            })}
            {hiddenCount > 0 && (
              <p className="px-4 py-2 text-center text-xs text-muted-foreground">
                {t('moreNotifications', { count: hiddenCount })}
              </p>
            )}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/notificacoes" className="w-full justify-center text-center text-xs text-muted-foreground">
            {t('openPanel')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
