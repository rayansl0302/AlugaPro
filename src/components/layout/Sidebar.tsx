import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Building2, Users, FileText, CreditCard, AlertTriangle,
  Bell, DollarSign, Wrench, BarChart3, Settings, ChevronLeft, ChevronRight,
  Home, LogOut, Car, UserCircle, ShieldCheck, ShieldAlert, Zap, X, HardHat, FileWarning, Landmark,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { useNotificationAlerts } from '@/hooks/useNotificationAlerts'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { LanguageSelector } from '@/i18n/LanguageSelector'
interface NavItem {
  key: string
  href: string
  icon: React.ElementType
  roles?: string[]
}

const navItems: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'properties', href: '/imoveis', icon: Building2 },
  { key: 'vehicles', href: '/veiculos', icon: Car },
  { key: 'equipment', href: '/equipamentos', icon: HardHat },
  { key: 'owners', href: '/proprietarios', icon: Home },
  { key: 'tenants', href: '/inquilinos', icon: Users },
  { key: 'contracts', href: '/contratos', icon: FileText },
  { key: 'contractTemplates', href: '/modelos-contrato', icon: FileText },
  { key: 'financial', href: '/financeiro', icon: CreditCard },
  { key: 'charges', href: '/cobrancas', icon: DollarSign },
  { key: 'defaulters', href: '/inadimplencia', icon: AlertTriangle },
  { key: 'warnings', href: '/advertencias', icon: FileWarning },
  { key: 'sharedExpenses', href: '/despesas', icon: DollarSign },
  { key: 'maintenance', href: '/chamados', icon: Wrench },
  { key: 'notifications', href: '/notificacoes', icon: Bell },
  { key: 'reports', href: '/relatorios', icon: BarChart3 },
  { key: 'profile', href: '/perfil', icon: UserCircle },
  { key: 'saleContracts', href: '/contratos-terreno', icon: Landmark, roles: ['admin'] },
  { key: 'settings', href: '/configuracoes', icon: Settings, roles: ['admin'] },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { t } = useTranslation(['nav', 'common', 'subscription'])
  const { user, logout } = useAuth()
  const { status, daysRemaining, isAdmin } = useSubscription()
  const location = useLocation()
  const companyId = user?.companyId ?? ''
  const { pendingChargeReceipts, pendingExpenseReceipts } = useNotificationAlerts(companyId)

  const sidebarBadgeByHref: Record<string, number> = {
    '/cobrancas': pendingChargeReceipts,
    '/despesas': pendingExpenseReceipts,
  }

  const filteredNav = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'pt-safe pb-safe fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col border-r bg-card transition-transform duration-300 ease-in-out',
          mobileOpen && 'translate-x-0',
          'md:relative md:z-auto md:translate-x-0 md:transition-[width]',
          collapsed ? 'md:w-16' : 'md:w-64'
        )}
      >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="AlugaPro" className="h-9 w-9 object-contain" />
            <span className="text-lg font-bold tracking-tight">AlugaPro</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto hidden flex-col items-center gap-1 md:flex">
            <img src="/favicon.png" alt="AlugaPro" className="h-8 w-8 object-contain" />
            <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6" title={t('common:actions.open')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!collapsed && (
          <Button variant="ghost" size="icon" onClick={onToggle} className="hidden h-8 w-8 md:flex">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onMobileClose} className="h-8 w-8 md:hidden">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="grid gap-0.5 px-2">
          {filteredNav.map((item) => {
            const Icon = item.icon
            const label = t(item.key)
            const active = location.pathname.startsWith(item.href)
            const showAlertBadge = (sidebarBadgeByHref[item.href] ?? 0) > 0
            const badgeCount = sidebarBadgeByHref[item.href] ?? 0
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onMobileClose}
                title={collapsed ? label : undefined}
                className={cn(
                  'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <span className="relative shrink-0">
                  <Icon className="h-4 w-4" />
                  {showAlertBadge && collapsed && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </span>
                {!collapsed && <span className="flex-1">{label}</span>}
                {showAlertBadge && !collapsed && (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-5 justify-center px-1.5 text-[10px]"
                  >
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </Badge>
                )}
              </NavLink>
            )
          })}
        </nav>
      </ScrollArea>

      {!isAdmin && status !== 'demo' && status !== 'active' && (
        <div className={cn('px-3 pb-2', collapsed && 'flex justify-center')}>
          <NavLink
            to="/configuracoes/assinatura"
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              status === 'trialing'
                ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300'
                : 'bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300',
              collapsed && 'px-2 justify-center'
            )}
            title={t('subscription:manage')}
          >
            <Zap className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && (
              <span>
                {status === 'trialing'
                  ? t('trialDaysLeft', { count: daysRemaining })
                  : t('subscription:title')}
              </span>
            )}
            {!collapsed && status === 'trialing' && daysRemaining <= 3 && (
              <Badge variant="destructive" className="ml-auto text-[10px] px-1 py-0">!</Badge>
            )}
          </NavLink>
        </div>
      )}

      <Separator />

      <div className={cn('p-3', collapsed && 'flex flex-col items-center gap-2')}>
        {!collapsed && (
          <div className="mb-2 flex justify-end">
            <LanguageSelector />
          </div>
        )}
        {collapsed && <LanguageSelector size="icon" className="mb-1" />}
        {!collapsed ? (
          <div className="flex items-center gap-2 rounded-md p-1">
            <Link
              to="/perfil"
              title={t('profile')}
              className="flex flex-1 items-center gap-3 overflow-hidden rounded-md p-1 transition-colors hover:bg-accent"
            >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {user ? getInitials(user.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="flex items-center gap-1 truncate text-sm font-medium">
                <span className="truncate">{user?.name}</span>
                {user?.phoneVerified ? (
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-600" aria-label={t('common:phoneVerified')}>
                    <title>{t('common:phoneVerified')}</title>
                  </ShieldCheck>
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label={t('common:phoneUnverified')}>
                    <title>{t('common:phoneUnverified')}</title>
                  </ShieldAlert>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground capitalize">
                {user?.role ? t(`common:roles.${user.role}`, { defaultValue: user.role }) : ''}
              </p>
            </div>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={logout} title={t('logout')}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Link to="/perfil" title={t('profile')}>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} title={t('logout')}>
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      </aside>
    </>
  )
}
