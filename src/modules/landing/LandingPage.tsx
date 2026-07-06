import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2, Car, FileText, CreditCard, Users, Bell,
  BarChart3, ShieldCheck, ArrowRight, CheckCircle2, Zap, X, Check,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingHeroPreview } from '@/components/landing/LandingHeroPreview'
import {
  fadeInUp, fadeInLeft, fadeInRight, scaleIn,
  staggerContainer, viewportOnce, easeTransition,
} from '@/lib/motion'
import { PLANS, PlanId } from '@/types'
import { formatCurrency } from '@/lib/utils'

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

const HERO_PERKS = ['14 dias grátis', 'Sem cartão de crédito', 'Cancele quando quiser']

type CellValue = boolean | string
interface CompRow { label: string; starter: CellValue; pro: CellValue; business: CellValue }
interface CompGroup { group: string; rows: CompRow[] }

const COMPARISON: CompGroup[] = [
  {
    group: 'Gestão',
    rows: [
      { label: 'Imóveis e veículos', starter: 'Até 10', pro: 'Até 50', business: 'Ilimitado' },
      { label: 'Usuários gestores', starter: '2', pro: '5', business: 'Ilimitado' },
      { label: 'Proprietários e inquilinos', starter: true, pro: true, business: true },
      { label: 'Portal do inquilino', starter: true, pro: true, business: true },
    ],
  },
  {
    group: 'Contratos e cobranças',
    rows: [
      { label: 'Geração de contratos', starter: true, pro: true, business: true },
      { label: 'Assinatura digital', starter: false, pro: true, business: true },
      { label: 'Modelos personalizados', starter: false, pro: true, business: true },
      { label: 'Cobranças automáticas', starter: true, pro: true, business: true },
      { label: 'Controle de inadimplência', starter: true, pro: true, business: true },
    ],
  },
  {
    group: 'Financeiro',
    rows: [
      { label: 'Dashboard financeiro', starter: true, pro: true, business: true },
      { label: 'Despesas compartilhadas', starter: true, pro: true, business: true },
      { label: 'Relatórios avançados', starter: false, pro: true, business: true },
      { label: 'Exportação Excel / PDF', starter: false, pro: true, business: true },
      { label: 'Reajuste IPCA / IGPM', starter: false, pro: true, business: true },
    ],
  },
  {
    group: 'Operação',
    rows: [
      { label: 'Chamados e manutenções', starter: true, pro: true, business: true },
      { label: 'Notificações automáticas', starter: true, pro: true, business: true },
      { label: 'Múltiplas equipes', starter: false, pro: false, business: true },
      { label: 'Onboarding assistido', starter: false, pro: false, business: true },
      { label: 'API de integrações', starter: false, pro: false, business: 'Em breve' },
    ],
  },
]

const PRICING_FEATURES: Record<PlanId, string[]> = {
  starter: [
    'Até 10 imóveis ou veículos',
    '2 usuários gestores',
    'Contratos e cobranças',
    'Portal do inquilino',
    'Controle de inadimplência',
    'Notificações automáticas',
  ],
  pro: [
    'Até 50 imóveis ou veículos',
    '5 usuários gestores',
    'Assinatura digital de contratos',
    'Relatórios avançados',
    'Exportação Excel e PDF',
    'Modelos personalizados',
  ],
  business: [
    'Imóveis e veículos ilimitados',
    'Usuários ilimitados',
    'Tudo do plano Pro',
    'Múltiplas equipes',
    'Onboarding assistido',
    'API de integrações (em breve)',
  ],
}

export function LandingPage() {
  const { user } = useAuth()

  const primaryHref = user
    ? user.role === 'inquilino'
      ? '/portal'
      : user.role === 'afiliado'
        ? '/painel-afiliado'
        : '/dashboard'
    : '/login'

  const primaryLabel = user ? 'Abrir painel' : 'Começar agora'
  const secondaryHref = user ? '#recursos' : '/login?tab=inquilino'
  const secondaryLabel = user ? 'Ver recursos' : 'Sou inquilino'
  const secondaryIsAnchor = !!user

  return (
    <div className="light min-h-screen bg-white text-foreground">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-white">
          <div className="pointer-events-none absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-sky-100/50 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl" />

          <div className="relative mx-auto grid grid-cols-1 max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:py-20">
            <motion.div
              className="min-w-0 max-w-xl"
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

        {/* Pricing */}
        <section id="precos" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              className="mx-auto max-w-2xl text-center"
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer(0.12)}
            >
              <motion.span
                variants={fadeInUp}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
              >
                <Zap className="h-3.5 w-3.5" />
                14 dias grátis em qualquer plano
              </motion.span>
              <motion.h2
                variants={fadeInUp}
                className="mt-4 text-3xl font-bold tracking-tight text-[#032B61] sm:text-4xl"
              >
                Planos simples, sem surpresas
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                Comece grátis por 14 dias. Nenhum cartão necessário. Cancele quando quiser.
              </motion.p>
            </motion.div>

            <motion.div
              className="mt-12 grid gap-6 sm:grid-cols-3"
              variants={staggerContainer(0.1)}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
            >
              {(['starter', 'pro', 'business'] as PlanId[]).map((planId) => {
                const plan = PLANS[planId]
                const isPro = planId === 'pro'
                return (
                  <motion.div key={planId} variants={fadeInUp}>
                    <Card className={`relative flex h-full flex-col ${isPro ? 'border-[#032B61] shadow-xl ring-1 ring-[#032B61]/20' : 'border-slate-200 shadow-md'}`}>
                      {isPro && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                          <Badge className="bg-[#032B61] text-white px-4 py-1 text-xs">Mais popular</Badge>
                        </div>
                      )}
                      <CardContent className="flex flex-col flex-1 p-6">
                        <p className="text-sm font-semibold text-[#032B61]">{plan.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                        <div className="mt-4 flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-[#032B61]">
                            {formatCurrency(plan.price)}
                          </span>
                          <span className="text-sm text-muted-foreground">/mês</span>
                        </div>
                        <ul className="mt-6 flex-1 space-y-2.5">
                          {PRICING_FEATURES[planId].map((feat) => (
                            <li key={feat} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              {feat}
                            </li>
                          ))}
                        </ul>
                        <Button
                          className={`mt-8 w-full ${isPro ? 'bg-[#032B61] text-white hover:bg-[#032B61]/90' : ''}`}
                          variant={isPro ? 'default' : 'outline'}
                          asChild
                        >
                          <Link to="/login?mode=signup">Começar grátis</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>

            <motion.p
              className="mt-8 text-center text-xs text-muted-foreground"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={viewportOnce}
            >
              Portal do inquilino sempre gratuito. Inquilinos nunca pagam.
            </motion.p>
          </div>
        </section>

        {/* Comparison table */}
        <section className="border-y border-slate-200 bg-slate-50/50 py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <motion.div
              className="mx-auto max-w-2xl text-center"
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer(0.1)}
            >
              <motion.h2 variants={fadeInUp} className="text-3xl font-bold tracking-tight text-[#032B61] sm:text-4xl">
                Compare os planos
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                Veja exatamente o que está incluído em cada nível de assinatura.
              </motion.p>
            </motion.div>

            {/* Mobile: cards deslizáveis por plano */}
            <motion.div
              className="mt-10 md:hidden"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.5 }}
            >
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                {([
                  { id: 'starter', name: 'Starter', price: 'R$ 39/mês', popular: false },
                  { id: 'pro',     name: 'Pro',     price: 'R$ 79/mês', popular: true },
                  { id: 'business',name: 'Business',price: 'R$ 129/mês',popular: false },
                ] as const).map((plan) => (
                  <div
                    key={plan.id}
                    className={`snap-center shrink-0 w-[80vw] max-w-xs rounded-2xl border bg-white shadow-sm ${plan.popular ? 'border-[#032B61] ring-1 ring-[#032B61]/20' : 'border-slate-200'}`}
                  >
                    <div className={`rounded-t-2xl px-5 py-4 ${plan.popular ? 'bg-[#032B61]' : 'bg-slate-50'}`}>
                      {plan.popular && (
                        <span className="mb-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
                          Mais popular
                        </span>
                      )}
                      <p className={`font-bold text-lg ${plan.popular ? 'text-white' : 'text-[#032B61]'}`}>{plan.name}</p>
                      <p className={`text-sm ${plan.popular ? 'text-white/70' : 'text-slate-400'}`}>{plan.price}</p>
                    </div>

                    <div className="px-5 py-4 space-y-4">
                      {COMPARISON.map((group) => (
                        <div key={group.group}>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {group.group}
                          </p>
                          <div className="space-y-2">
                            {group.rows.map((row) => {
                              const val = row[plan.id]
                              return (
                                <div key={row.label} className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-slate-600">{row.label}</span>
                                  <span className="shrink-0">
                                    {val === true  && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                                    {val === false && <X className="h-3.5 w-3.5 text-slate-300" />}
                                    {typeof val === 'string' && (
                                      <span className="text-[11px] font-medium text-[#032B61]">{val}</span>
                                    )}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="px-5 pb-5">
                      <Button
                        className={`w-full ${plan.popular ? 'bg-[#032B61] text-white hover:bg-[#032B61]/90' : ''}`}
                        variant={plan.popular ? 'default' : 'outline'}
                        size="sm"
                        asChild
                      >
                        <Link to="/login?mode=signup">Começar grátis</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">← deslize para ver todos os planos →</p>
            </motion.div>

            {/* Desktop: tabela completa */}
            <motion.div
              className="mt-10 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.5 }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-4 text-left font-medium text-slate-500 w-1/2">Recurso</th>
                    <th className="px-4 py-4 text-center font-semibold text-[#032B61]">
                      <div>Starter</div>
                      <div className="text-xs font-normal text-slate-400">R$ 39/mês</div>
                    </th>
                    <th className="px-4 py-4 text-center font-semibold text-[#032B61] bg-[#032B61]/[0.03]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="rounded-full bg-[#032B61] px-2 py-0.5 text-[10px] text-white font-medium">Popular</span>
                        <span>Pro</span>
                        <span className="text-xs font-normal text-slate-400">R$ 79/mês</span>
                      </div>
                    </th>
                    <th className="px-4 py-4 text-center font-semibold text-[#032B61]">
                      <div>Business</div>
                      <div className="text-xs font-normal text-slate-400">R$ 129/mês</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((group) => (
                    <Fragment key={group.group}>
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td colSpan={4} className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {group.group}
                        </td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr key={row.label} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3 text-slate-700">{row.label}</td>
                          {(['starter', 'pro', 'business'] as const).map((plan) => {
                            const val = row[plan]
                            const isProCol = plan === 'pro'
                            return (
                              <td key={plan} className={`px-4 py-3 text-center ${isProCol ? 'bg-[#032B61]/[0.02]' : ''}`}>
                                {val === true && <Check className="h-4 w-4 text-emerald-500 mx-auto" />}
                                {val === false && <X className="h-4 w-4 text-slate-300 mx-auto" />}
                                {typeof val === 'string' && (
                                  <span className="text-xs font-medium text-[#032B61]">{val}</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200">
                    <td className="px-5 py-4" />
                    {(['starter', 'pro', 'business'] as const).map((plan) => (
                      <td key={plan} className={`px-4 py-4 text-center ${plan === 'pro' ? 'bg-[#032B61]/[0.02]' : ''}`}>
                        <Button
                          size="sm"
                          variant={plan === 'pro' ? 'default' : 'outline'}
                          className={plan === 'pro' ? 'bg-[#032B61] text-white hover:bg-[#032B61]/90' : ''}
                          asChild
                        >
                          <Link to="/login?mode=signup">Começar grátis</Link>
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </motion.div>
          </div>
        </section>

        {/* Sign-up CTA */}
        <section className="bg-[#032B61] py-20">
          <motion.div
            className="mx-auto max-w-4xl px-4 text-center sm:px-6"
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerContainer(0.12)}
          >
            <motion.span
              variants={fadeInUp}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80"
            >
              <Zap className="h-3.5 w-3.5" />
              Sem cartão de crédito · Cancele quando quiser
            </motion.span>
            <motion.h2
              variants={fadeInUp}
              className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              Comece seu trial grátis hoje
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mt-5 text-lg text-white/70 max-w-xl mx-auto"
            >
              14 dias com acesso completo ao plano Pro. Sem compromisso. Configure sua empresa em menos de 5 minutos.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <Button
                size="lg"
                className="h-12 bg-white px-8 text-[#032B61] font-semibold hover:bg-white/90"
                asChild
              >
                <Link to="/login?mode=signup">
                  Criar conta gratuita
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-white/40 bg-transparent text-white hover:bg-white/10 hover:border-white/60"
                asChild
              >
                <Link to="/login?tab=inquilino">Sou inquilino</Link>
              </Button>
            </motion.div>
            <motion.div
              variants={staggerContainer(0.08)}
              className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3"
            >
              {[
                'Imóveis e veículos ilimitados no trial',
                'Contratos com assinatura digital',
                'Portal do inquilino incluso',
                'Suporte por e-mail',
              ].map((perk) => (
                <motion.span key={perk} variants={fadeInUp} className="flex items-center gap-2 text-sm text-white/60">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  {perk}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
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
