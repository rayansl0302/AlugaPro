import { Link } from 'react-router-dom'
import { Building2, Mail } from 'lucide-react'

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/10 bg-[#021a3d] text-white/70">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/favicon.png" alt="" className="h-9 w-9 object-contain" />
              <span className="text-lg font-bold text-white">AlugaPro</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Plataforma completa para gestão de aluguéis de imóveis e veículos, com contratos digitais e controle financeiro.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Acesso</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link to="/login" className="transition-colors hover:text-white">
                  Acessar sistema
                </Link>
              </li>
              <li>
                <Link to="/login?tab=inquilino" className="transition-colors hover:text-white">
                  Portal do inquilino
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Plataforma</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="#recursos" className="transition-colors hover:text-white">
                  Recursos
                </a>
              </li>
              <li>
                <a href="#como-funciona" className="transition-colors hover:text-white">
                  Como funciona
                </a>
              </li>
              <li>
                <a href="#para-quem" className="transition-colors hover:text-white">
                  Para quem é
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Contato</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-white/50" />
                <span>Gestão de locações inteligente</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-white/50" />
                <span>suporte@alugapro.com.br</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs sm:flex-row">
          <p>© {year} AlugaPro. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <Link to="/login" className="transition-colors hover:text-white">
              Entrar
            </Link>
            <a href="#recursos" className="transition-colors hover:text-white">
              Conhecer recursos
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
