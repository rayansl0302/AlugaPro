import { Link, useLocation } from 'react-router-dom'
import { FileText, Home, LogOut, UserCircle, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'Início', href: '/portal', icon: Home, exact: true },
  { label: 'Seus contratos', href: '/portal/contratos', icon: FileText, exact: false },
] as const

export function TenantPortalHeader() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (href: string, exact: boolean) =>
    exact ? location.pathname === href : location.pathname.startsWith(href)

  return (
    <header className="pt-safe sticky top-0 z-10 border-b border-[#032B61]/10 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/portal" className="flex shrink-0 items-center">
            <img
              src="/logo-completa-horizontal-alugapro.png"
              alt="AlugaPro"
              className="h-8 w-auto object-contain"
            />
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map(({ label, href, icon: Icon, exact }) => {
              const active = isActive(href, exact)
              return (
                <Link
                  key={href}
                  to={href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-[#032B61] text-white'
                      : 'text-[#032B61]/70 hover:bg-[#032B61]/5 hover:text-[#032B61]',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#032B61]/10 text-[#032B61] text-xs font-bold">
              {user ? getInitials(user.name) : 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="hidden items-center gap-1 text-sm font-medium lg:flex">
            {user?.name}
            {user?.phoneVerified ? (
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-600" aria-label="Telefone verificado" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Telefone não verificado" />
            )}
          </span>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Meu perfil">
            <Link to="/perfil"><UserCircle className="h-4 w-4" /></Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
