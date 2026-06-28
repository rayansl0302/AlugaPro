import { Link, NavLink, useLocation } from 'react-router-dom'
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

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Imóveis', href: '/imoveis', icon: Building2 },
  { label: 'Veículos', href: '/veiculos', icon: Car },
  { label: 'Equipamentos', href: '/equipamentos', icon: HardHat },
  { label: 'Proprietários', href: '/proprietarios', icon: Home },
  { label: 'Inquilinos', href: '/inquilinos', icon: Users },
  { label: 'Contratos', href: '/contratos', icon: FileText },
  { label: 'Modelos de Contrato', href: '/modelos-contrato', icon: FileText },
  { label: 'Financeiro', href: '/financeiro', icon: CreditCard },
  { label: 'Cobranças', href: '/cobrancas', icon: DollarSign },
  { label: 'Inadimplência', href: '/inadimplencia', icon: AlertTriangle },
  { label: 'Advertências', href: '/advertencias', icon: FileWarning },
  { label: 'Despesas Compartilhadas', href: '/despesas', icon: DollarSign },
  { label: 'Chamados', href: '/chamados', icon: Wrench },
  { label: 'Notificações', href: '/notificacoes', icon: Bell },
  { label: 'Relatórios', href: '/relatorios', icon: BarChart3 },
  { label: 'Meu Perfil', href: '/perfil', icon: UserCircle },
  { label: 'Contratos de Terreno', href: '/contratos-terreno', icon: Landmark, roles: ['admin'] },
  { label: 'Configurações', href: '/configuracoes', icon: Settings, roles: ['admin'] },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
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
      {/* Backdrop — somente mobile, fecha o drawer ao tocar fora */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col border-r bg-card transition-transform duration-300 ease-in-out',
          mobileOpen && 'translate-x-0',
          'md:relative md:z-auto md:translate-x-0 md:transition-[width]',
          collapsed ? 'md:w-16' : 'md:w-64'
        )}
      >
      {/* Logo */}
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
            <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6" title="Expandir">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!collapsed && (
          <Button variant="ghost" size="icon" onClick={onToggle} className="hidden h-8 w-8 md:flex">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {/* Fechar — somente mobile */}
        <Button variant="ghost" size="icon" onClick={onMobileClose} className="h-8 w-8 md:hidden">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="grid gap-0.5 px-2">
          {filteredNav.map((item) => {
            const Icon = item.icon
            const active = location.pathname.startsWith(item.href)
            const showAlertBadge = (sidebarBadgeByHref[item.href] ?? 0) > 0
            const badgeCount = sidebarBadgeByHref[item.href] ?? 0
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onMobileClose}
                title={collapsed ? item.label : undefined}
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
                {!collapsed && <span className="flex-1">{item.label}</span>}
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

      {/* Subscription chip */}
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
            title="Gerenciar assinatura"
          >
            <Zap className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && (
              <span>
                {status === 'trialing' ? `Trial — ${daysRemaining}d` : 'Assinatura'}
              </span>
            )}
            {!collapsed && status === 'trialing' && daysRemaining <= 3 && (
              <Badge variant="destructive" className="ml-auto text-[10px] px-1 py-0">!</Badge>
            )}
          </NavLink>
        </div>
      )}

      <Separator />

      {/* User section */}
      <div className={cn('p-3', collapsed && 'flex flex-col items-center gap-2')}>
        {!collapsed ? (
          <div className="flex items-center gap-2 rounded-md p-1">
            <Link
              to="/perfil"
              title="Meu perfil"
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
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-600" aria-label="Telefone verificado">
                    <title>Telefone verificado</title>
                  </ShieldCheck>
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Telefone não verificado">
                    <title>Telefone não verificado</title>
                  </ShieldAlert>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={logout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Link to="/perfil" title="Meu perfil">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      </aside>
    </>
  )
}
