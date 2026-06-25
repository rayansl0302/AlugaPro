import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Mail } from 'lucide-react'
import { fadeInUp, staggerContainer, viewportOnce } from '@/lib/motion'

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <motion.div
          className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5"
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <motion.div variants={fadeInUp} className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-block">
              <img
                src="/logo-completa-horizontal-alugapro.png"
                alt="AlugaPro"
                className="h-12 w-auto max-w-[220px] object-contain"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Plataforma completa para gestão de aluguéis de imóveis e veículos, com contratos digitais e controle financeiro.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#032B61]">Acesso</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/login" className="transition-colors hover:text-[#032B61]">
                  Acessar sistema
                </Link>
              </li>
              <li>
                <Link to="/login?tab=inquilino" className="transition-colors hover:text-[#032B61]">
                  Portal do inquilino
                </Link>
              </li>
            </ul>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#032B61]">Plataforma</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/recursos" className="transition-colors hover:text-[#032B61]">
                  Recursos
                </Link>
              </li>
              <li>
                <a href="#como-funciona" className="transition-colors hover:text-[#032B61]">
                  Como funciona
                </a>
              </li>
              <li>
                <a href="#para-quem" className="transition-colors hover:text-[#032B61]">
                  Para quem é
                </a>
              </li>
              <li>
                <Link to="/afiliados" className="transition-colors hover:text-[#032B61]">
                  Programa de afiliados
                </Link>
              </li>
            </ul>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#032B61]">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/termos" className="transition-colors hover:text-[#032B61]">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/politica-de-privacidade" className="transition-colors hover:text-[#032B61]">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#032B61]">Contato</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-[#032B61]/50" />
                <span>Gestão de locações inteligente</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-[#032B61]/50" />
                <span>suporte@alugapro.com.br</span>
              </li>
            </ul>
          </motion.div>
        </motion.div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} AlugaPro. Todos os direitos reservados.</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link to="/termos" className="transition-colors hover:text-[#032B61]">
              Termos de Uso
            </Link>
            <Link to="/politica-de-privacidade" className="transition-colors hover:text-[#032B61]">
              Política de Privacidade
            </Link>
            <Link to="/login" className="transition-colors hover:text-[#032B61]">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
