import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { easeTransition } from '@/lib/motion'

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
    <motion.header
      className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-lg"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={easeTransition}
    >
      <div className="mx-auto flex min-h-[3.75rem] max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:min-h-[4rem] sm:px-6">
        <Link to="/" className="shrink-0">
          <img
            src="/logo-completa-horizontal-alugapro.png"
            alt="AlugaPro"
            className="h-[3.375rem] w-auto max-w-[300px] object-contain sm:h-[3.75rem] sm:max-w-[420px]"
          />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link, i) => (
            <motion.a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-[#032B61]"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...easeTransition, delay: 0.1 + i * 0.06 }}
            >
              {link.label}
            </motion.a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {!user && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:bg-slate-100 hover:text-[#032B61]"
              asChild
            >
              <Link to="/login?tab=inquilino">Portal do inquilino</Link>
            </Button>
          )}
          <Button size="sm" className="bg-[#032B61] px-5 text-white hover:bg-[#032B61]/90" asChild>
            <Link to={systemHref}>{systemLabel}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-slate-700 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="border-t border-slate-200 bg-white px-4 pb-4 md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <nav className="flex flex-col gap-1 pt-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#032B61]"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              {!user && (
                <Link
                  to="/login?tab=inquilino"
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#032B61]"
                  onClick={() => setOpen(false)}
                >
                  Portal do inquilino
                </Link>
              )}
              <Button className="mt-2 w-full bg-[#032B61] text-white hover:bg-[#032B61]/90" asChild>
                <Link to={systemHref} onClick={() => setOpen(false)}>
                  {systemLabel}
                </Link>
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
