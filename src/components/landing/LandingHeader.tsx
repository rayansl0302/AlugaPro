import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Recursos', href: '#recursos' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Para quem', href: '#para-quem' },
]

export function LandingHeader() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const systemHref = user
    ? user.role === 'inquilino'
      ? '/portal'
      : '/dashboard'
    : '/login'

  const systemLabel = user ? 'Ir para o painel' : 'Acessar sistema'

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#032B61]/90 backdrop-blur-lg">
      <div className="mx-auto flex min-h-[3.75rem] max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:min-h-[4rem] sm:px-6">
        <Link to="/" className="shrink-0">
          <img
            src="/logo-completa-horizontal-alugapro.png"
            alt="AlugaPro"
            className="landing-logo-white h-[3.375rem] w-auto max-w-[300px] object-contain sm:h-[3.75rem] sm:max-w-[420px]"
          />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/75 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {!user && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link to="/login?tab=inquilino">Portal do inquilino</Link>
            </Button>
          )}
          <Button size="sm" className="bg-white px-5 text-[#032B61] hover:bg-white/90" asChild>
            <Link to={systemHref}>{systemLabel}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          'border-t border-white/10 bg-[#032B61] px-4 pb-4 md:hidden',
          open ? 'block' : 'hidden',
        )}
      >
        <nav className="flex flex-col gap-1 pt-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          {!user && (
            <Link
              to="/login?tab=inquilino"
              className="rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Portal do inquilino
            </Link>
          )}
          <Button className="mt-2 w-full bg-white text-[#032B61] hover:bg-white/90" asChild>
            <Link to={systemHref} onClick={() => setOpen(false)}>
              {systemLabel}
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
