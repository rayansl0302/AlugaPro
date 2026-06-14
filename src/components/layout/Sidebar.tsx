import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, FileText, CreditCard, AlertTriangle,
  Bell, DollarSign, Wrench, BarChart3, Settings, ChevronLeft, ChevronRight,
  Home, LogOut, Car, UserCircle, ShieldCheck, ShieldAlert,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

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
  { label: 'Proprietários', href: '/proprietarios', icon: Home },
  { label: 'Inquilinos', href: '/inquilinos', icon: Users },
  { label: 'Contratos', href: '/contratos', icon: FileText },
  { label: 'Financeiro', href: '/financeiro', icon: CreditCard },
  { label: 'Cobranças', href: '/cobrancas', icon: DollarSign },
  { label: 'Inadimplência', href: '/inadimplencia', icon: AlertTriangle },
  { label: 'Despesas Compartilhadas', href: '/despesas', icon: DollarSign },
  { label: 'Chamados', href: '/chamados', icon: Wrench },
  { label: 'Notificações', href: '/notificacoes', icon: Bell },
  { label: 'Relatórios', href: '/relatorios', icon: BarChart3 },
  { label: 'Meu Perfil', href: '/perfil', icon: UserCircle },
  { label: 'Configurações', href: '/configuracoes', icon: Settings, roles: ['admin'] },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const filteredNav = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
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
          <div className="mx-auto flex flex-col items-center gap-1">
            <img src="/favicon.png" alt="AlugaPro" className="h-8 w-8 object-contain" />
            <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6" title="Expandir">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!collapsed && (
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="grid gap-0.5 px-2">
          {filteredNav.map((item) => {
            const Icon = item.icon
            const active = location.pathname.startsWith(item.href)
            return (
              <NavLink
                key={item.href}
                to={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>
      </ScrollArea>

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
  )
}
