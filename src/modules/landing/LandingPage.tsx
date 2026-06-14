import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2, Car, FileText, CreditCard, Users, Bell,
  BarChart3, ShieldCheck, ArrowRight, CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingHeroPreview } from '@/components/landing/LandingHeroPreview'
import {
  fadeInUp, fadeInLeft, fadeInRight, scaleIn,
  staggerContainer, viewportOnce, easeTransition,
} from '@/lib/motion'

const FEATURES = [
  {
    icon: Building2,
    title: 'Imóveis e veículos',
    description: 'Cadastre, organize e acompanhe todo o seu portfólio de locações em um só lugar.',
  },
  {
    icon: FileText,
    title: 'Contratos digitais',
    description: 'Gere, personalize e assine contratos com locador, locatário e testemunhas remotamente.',
  },
  {
    icon: CreditCard,
    title: 'Cobranças automáticas',
    description: 'Controle mensalidades, comprovantes, inadimplência e fluxo de caixa com visão clara.',
  },
  {
    icon: Users,
    title: 'Portal do inquilino',
    description: 'Inquilinos acompanham pagamentos, enviam comprovantes e acessam o contrato ativo.',
  },
  {
    icon: Bell,
    title: 'Notificações',
    description: 'Alertas de vencimento e cobrança para manter a comunicação em dia com os locatários.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios e dashboard',
    description: 'Indicadores, gráficos e exportações para decisões rápidas e seguras.',
  },
]

const STEPS = [
  {
    step: '01',
    title: 'Cadastre seu patrimônio',
    description: 'Imóveis, veículos, proprietários e inquilinos entram no sistema em poucos minutos.',
  },
  {
    step: '02',
    title: 'Formalize os contratos',
    description: 'Use modelos do sistema ou personalize cláusulas e colete assinaturas digitais.',
  },
  {
    step: '03',
    title: 'Gerencie as cobranças',
    description: 'Gere mensalidades, acompanhe pagamentos e reduza a inadimplência com visibilidade total.',
  },
]

const AUDIENCES = [
  'Gestores e administradoras de locação',
  'Proprietários com múltiplos imóveis ou veículos',
  'Empresas que precisam de controle financeiro integrado',
  'Inquilinos que querem autonomia no portal de pagamentos',
]

const STATS = [
  { value: 'Imóveis', label: 'Gestão completa', icon: Building2 },
  { value: 'Veículos', label: 'Locação integrada', icon: Car },
  { value: 'Contratos', label: 'Assinatura digital', icon: FileText },
  { value: 'Cobranças', label: 'Controle financeiro', icon: CreditCard },
]

const HERO_PERKS = ['Assinatura digital', 'Cobranças automáticas', 'Portal do inquilino']

export function LandingPage() {
  const { user } = useAuth()

  const primaryHref = user
    ? user.role === 'inquilino'
      ? '/portal'
      : '/dashboard'
    : '/login'

  const primaryLabel = user ? 'Abrir painel' : 'Começar agora'
  const secondaryHref = user ? '#recursos' : '/login?tab=inquilino'
  const secondaryLabel = user ? 'Ver recursos' : 'Sou inquilino'
  const secondaryIsAnchor = !!user

  return (
    <div className="min-h-screen bg-white text-foreground">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-white">
          <div className="pointer-events-none absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-sky-100/50 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:py-20">
            <motion.div
              className="max-w-xl"
              variants={staggerContainer(0.12, 0.2)}
              initial="hidden"
              animate="visible"
            >
              <motion.span
                variants={fadeInUp}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Gestão inteligente de aluguéis
              </motion.span>

              <motion.h1
                variants={fadeInUp}
                className="mt-5 text-3xl font-bold leading-[1.15] tracking-tight text-[#032B61] sm:text-4xl lg:text-5xl"
              >
                Sua locação organizada, do contrato ao recebimento
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg"
              >
                Imóveis, veículos, contratos digitais, cobranças e portal do inquilino — tudo integrado para quem administra aluguéis todos os dias.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <Button size="lg" className="h-11 bg-[#032B61] px-6 text-white hover:bg-[#032B61]/90" asChild>
                  <Link to={primaryHref}>
                    {primaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                {secondaryIsAnchor ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 border-slate-300 text-[#032B61] hover:bg-slate-50"
                    asChild
                  >
                    <a href={secondaryHref}>{secondaryLabel}</a>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 border-slate-300 text-[#032B61] hover:bg-slate-50"
                    asChild
                  >
                    <Link to={secondaryHref}>{secondaryLabel}</Link>
                  </Button>
                )}
              </motion.div>

              <motion.div
                variants={staggerContainer(0.08, 0)}
                className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 pt-6"
              >
                {HERO_PERKS.map((item) => (
                  <motion.span
                    key={item}
                    variants={fadeInUp}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {item}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>

            <LandingHeroPreview />
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-y border-slate-200 bg-white py-10">
          <motion.div
            className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6"
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {STATS.map((item) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.value}
                  variants={fadeInUp}
                  className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-0 sm:text-left"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#032B61]/5 sm:mb-3">
                    <Icon className="h-5 w-5 text-[#032B61]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#032B61]">{item.value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </section>

        {/* Features */}
        <section id="recursos" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              className="mx-auto max-w-2xl text-center"
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer(0.12)}
            >
              <motion.h2
                variants={fadeInUp}
                className="text-3xl font-bold tracking-tight text-[#032B61] sm:text-4xl"
              >
                Tudo que você precisa para administrar locações
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                Recursos pensados para simplificar a rotina do gestor e melhorar a experiência do inquilino.
              </motion.p>
            </motion.div>

            <motion.div
              className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              variants={staggerContainer(0.08)}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
            >
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <motion.div
                  key={title}
                  variants={fadeInUp}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                >
                  <Card className="h-full border-slate-200 bg-white shadow-md transition-shadow hover:shadow-xl">
                    <CardContent className="p-6">
                      <motion.span
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#032B61]/10 text-[#032B61]"
                        whileHover={{ scale: 1.08, rotate: 3 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <Icon className="h-5 w-5" />
                      </motion.span>
                      <h3 className="mt-4 text-lg font-semibold text-[#032B61]">{title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="border-y border-slate-200 bg-slate-50/50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              className="mx-auto max-w-2xl text-center"
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer(0.12)}
            >
              <motion.h2 variants={fadeInUp} className="text-3xl font-bold tracking-tight text-[#032B61] sm:text-4xl">
                Como funciona
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                Em três passos você estrutura toda a operação de locação no AlugaPro.
              </motion.p>
            </motion.div>

            <motion.div
              className="relative mt-12 grid gap-8 lg:grid-cols-3"
              variants={staggerContainer(0.15)}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
            >
              <div className="pointer-events-none absolute left-[16%] right-[16%] top-14 hidden h-px bg-gradient-to-r from-emerald-200 via-sky-300 to-[#032B61]/30 lg:block" />
              {STEPS.map(({ step, title, description }) => (
                <motion.div
                  key={step}
                  variants={scaleIn}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
                >
                  <span className="text-4xl font-bold text-[#032B61]/15">{step}</span>
                  <h3 className="mt-4 text-xl font-semibold text-[#032B61]">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Audience */}
        <section id="para-quem" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer(0.1)}
            >
              <motion.h2
                variants={fadeInLeft}
                className="text-3xl font-bold tracking-tight text-[#032B61] sm:text-4xl"
              >
                Para quem é o AlugaPro
              </motion.h2>
              <motion.p variants={fadeInLeft} className="mt-4 text-muted-foreground">
                Uma solução completa para quem precisa profissionalizar a gestão de aluguéis sem perder agilidade.
              </motion.p>
              <motion.ul
                variants={staggerContainer(0.08)}
                className="mt-8 space-y-4"
              >
                {AUDIENCES.map((item) => (
                  <motion.li
                    key={item}
                    variants={fadeInLeft}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <span className="text-sm leading-relaxed">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={fadeInRight}
              transition={easeTransition}
            >
              <Card className="border-[#032B61]/15 bg-white shadow-xl">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-[#032B61]">Pronto para organizar suas locações?</h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    Acesse o sistema como gestor ou entre no portal do inquilino para acompanhar pagamentos e contratos.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Button className="bg-[#032B61] text-white hover:bg-[#032B61]/90" asChild>
                      <Link to={primaryHref}>{primaryLabel}</Link>
                    </Button>
                    {!user && (
                      <Button
                        variant="outline"
                        className="border-slate-300 text-[#032B61] hover:bg-slate-50"
                        asChild
                      >
                        <Link to="/login?tab=inquilino">Portal do inquilino</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
