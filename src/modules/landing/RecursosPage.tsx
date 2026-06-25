import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2, Car, FileText, CreditCard, Users, Bell,
  BarChart3, ArrowRight, CheckCircle2, Zap, Shield,
  PenLine, AlertCircle, Wrench, TrendingUp, FileSpreadsheet,
  RefreshCw, MessageSquare, CalendarClock,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { fadeInUp, fadeInLeft, fadeInRight, staggerContainer, viewportOnce, easeTransition } from '@/lib/motion'

const FEATURES = [
  {
    id: 'imoveis-veiculos',
    icon: Building2,
    badge: 'Portfólio',
    title: 'Imóveis e veículos em um só lugar',
    description:
      'Cadastre, organize e acompanhe todo o seu portfólio de locações — imóveis residenciais, comerciais e veículos — com visão completa de status, contratos ativos e histórico.',
    items: [
      { icon: Building2, label: 'Imóveis residenciais e comerciais' },
      { icon: Car, label: 'Veículos com controle de locação' },
      { icon: Users, label: 'Proprietários e inquilinos vinculados' },
      { icon: CalendarClock, label: 'Histórico de ocupação e contratos' },
    ],
    accent: 'emerald',
  },
  {
    id: 'contratos',
    icon: FileText,
    badge: 'Contratos',
    title: 'Contratos digitais com assinatura eletrônica',
    description:
      'Gere contratos profissionais a partir de modelos personalizáveis, colete assinaturas do locador, locatário e testemunhas remotamente — sem papel, sem deslocamento.',
    items: [
      { icon: FileText, label: 'Modelos personalizáveis de contrato' },
      { icon: PenLine, label: 'Assinatura digital de todas as partes' },
      { icon: Shield, label: 'Validade jurídica garantida' },
      { icon: Users, label: 'Assinatura de testemunhas remotas' },
    ],
    accent: 'blue',
  },
  {
    id: 'cobrancas',
    icon: CreditCard,
    badge: 'Financeiro',
    title: 'Cobranças automáticas e controle financeiro',
    description:
      'Controle mensalidades, registre comprovantes de pagamento, monitore inadimplência e tenha visão clara do fluxo de caixa de toda a operação.',
    items: [
      { icon: CreditCard, label: 'Lançamento e baixa de cobranças' },
      { icon: AlertCircle, label: 'Controle de inadimplência' },
      { icon: TrendingUp, label: 'Fluxo de caixa em tempo real' },
      { icon: RefreshCw, label: 'Reajuste IPCA / IGPM automatizado' },
    ],
    accent: 'violet',
  },
  {
    id: 'portal-inquilino',
    icon: Users,
    badge: 'Portal',
    title: 'Portal do inquilino — sempre gratuito',
    description:
      'Inquilinos têm acesso a um painel próprio onde visualizam o contrato ativo, acompanham cobranças, enviam comprovantes de pagamento e registram solicitações — tudo sem ligar para o gestor.',
    items: [
      { icon: FileText, label: 'Contrato ativo e histórico' },
      { icon: CreditCard, label: 'Visualização e envio de comprovantes' },
      { icon: MessageSquare, label: 'Abertura de chamados de manutenção' },
      { icon: Bell, label: 'Notificações de vencimento' },
    ],
    accent: 'sky',
    highlight: 'Gratuito para todos os inquilinos',
  },
  {
    id: 'notificacoes',
    icon: Bell,
    badge: 'Automação',
    title: 'Notificações automáticas e lembretes',
    description:
      'Reduza a inadimplência com alertas automáticos de vencimento, cobranças em aberto e atualizações de contrato. Comunicação em dia, sem esforço manual.',
    items: [
      { icon: Bell, label: 'Alertas de vencimento de aluguel' },
      { icon: AlertCircle, label: 'Notificações de inadimplência' },
      { icon: CalendarClock, label: 'Lembretes de renovação de contrato' },
      { icon: Wrench, label: 'Atualizações de chamados' },
    ],
    accent: 'amber',
  },
  {
    id: 'relatorios',
    icon: BarChart3,
    badge: 'Relatórios',
    title: 'Dashboard e relatórios avançados',
    description:
      'Tome decisões com base em dados. Acompanhe indicadores de desempenho, gere relatórios financeiros e exporte tudo em Excel ou PDF para ter controle total da operação.',
    items: [
      { icon: BarChart3, label: 'Dashboard com indicadores em tempo real' },
      { icon: TrendingUp, label: 'Relatório de receitas e despesas' },
      { icon: FileSpreadsheet, label: 'Exportação em Excel e PDF' },
      { icon: AlertCircle, label: 'Relatório de inadimplência' },
    ],
    accent: 'rose',
  },
]

const accentMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700' },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     badge: 'bg-sky-100 text-sky-700' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    badge: 'bg-rose-100 text-rose-700' },
}

export function RecursosPage() {
  const { user } = useAuth()

  const primaryHref = user
    ? user.role === 'inquilino' ? '/portal' : user.role === 'afiliado' ? '/painel-afiliado' : '/dashboard'
    : '/login'

  return (
    <div className="min-h-screen bg-white text-foreground">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-white py-16 sm:py-24">
          <div className="pointer-events-none absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-sky-100/50 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl" />

          <motion.div
            className="relative mx-auto max-w-3xl px-4 text-center sm:px-6"
            variants={staggerContainer(0.12, 0.1)}
            initial="hidden"
            animate="visible"
          >
            <motion.span
              variants={fadeInUp}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
            >
              <Zap className="h-3.5 w-3.5" />
              Plataforma completa de gestão
            </motion.span>

            <motion.h1
              variants={fadeInUp}
              className="mt-5 text-4xl font-bold leading-tight tracking-tight text-[#032B61] sm:text-5xl"
            >
              Todos os recursos que você precisa
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-5 text-lg leading-relaxed text-muted-foreground"
            >
              Do cadastro do imóvel ao recebimento do aluguel. Contratos, cobranças, portal do inquilino, relatórios — tudo integrado em uma só plataforma.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <Button size="lg" className="h-11 bg-[#032B61] px-6 text-white hover:bg-[#032B61]/90" asChild>
                <Link to={primaryHref}>
                  Começar grátis por 14 dias
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-11 border-slate-300 text-[#032B61] hover:bg-slate-50" asChild>
                <Link to="/#precos">Ver planos e preços</Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Feature sections */}
        {FEATURES.map((feature, i) => {
          const Icon = feature.icon
          const accent = accentMap[feature.accent]
          const isEven = i % 2 === 0

          return (
            <section
              key={feature.id}
              id={feature.id}
              className={`py-16 sm:py-20 ${isEven ? 'bg-white' : 'bg-slate-50/60 border-y border-slate-200'}`}
            >
              <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className={`grid items-center gap-12 lg:grid-cols-2 ${!isEven ? 'lg:grid-flow-col-dense' : ''}`}>

                  {/* Text side */}
                  <motion.div
                    className={!isEven ? 'lg:col-start-2' : ''}
                    initial="hidden"
                    whileInView="visible"
                    viewport={viewportOnce}
                    variants={staggerContainer(0.1)}
                  >
                    <motion.div variants={fadeInUp}>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${accent.badge}`}>
                        {feature.badge}
                      </span>
                    </motion.div>

                    <motion.h2
                      variants={fadeInUp}
                      className="mt-4 text-3xl font-bold tracking-tight text-[#032B61] sm:text-4xl"
                    >
                      {feature.title}
                    </motion.h2>

                    <motion.p
                      variants={fadeInUp}
                      className="mt-4 text-base leading-relaxed text-muted-foreground"
                    >
                      {feature.description}
                    </motion.p>

                    {feature.highlight && (
                      <motion.div variants={fadeInUp} className="mt-4">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          <CheckCircle2 className="mr-1.5 h-3 w-3" />
                          {feature.highlight}
                        </Badge>
                      </motion.div>
                    )}

                    <motion.ul variants={staggerContainer(0.07)} className="mt-8 space-y-3">
                      {feature.items.map(({ icon: ItemIcon, label }) => (
                        <motion.li key={label} variants={fadeInUp} className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.bg}`}>
                            <ItemIcon className={`h-4 w-4 ${accent.text}`} />
                          </span>
                          <span className="text-sm text-slate-700">{label}</span>
                        </motion.li>
                      ))}
                    </motion.ul>
                  </motion.div>

                  {/* Visual side */}
                  <motion.div
                    className={!isEven ? 'lg:col-start-1 lg:row-start-1' : ''}
                    initial="hidden"
                    whileInView="visible"
                    viewport={viewportOnce}
                    variants={isEven ? fadeInRight : fadeInLeft}
                    transition={easeTransition}
                  >
                    <div className={`rounded-2xl border ${accent.border} ${accent.bg} p-8 sm:p-10`}>
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm`}>
                        <Icon className={`h-7 w-7 ${accent.text}`} />
                      </div>

                      <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
                        {feature.badge}
                      </p>
                      <p className={`mt-1 text-2xl font-bold ${accent.text}`}>
                        {feature.title.split(' ').slice(0, 3).join(' ')}
                      </p>

                      <div className="mt-6 space-y-3">
                        {feature.items.map(({ icon: ItemIcon, label }) => (
                          <div key={label} className="flex items-center gap-3 rounded-lg bg-white/70 px-4 py-2.5 shadow-sm">
                            <ItemIcon className={`h-4 w-4 shrink-0 ${accent.text}`} />
                            <span className="text-sm text-slate-700">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>
          )
        })}

        {/* CTA */}
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
              14 dias grátis · Sem cartão de crédito
            </motion.span>

            <motion.h2
              variants={fadeInUp}
              className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Pronto para testar tudo isso?
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="mt-4 text-lg text-white/70"
            >
              Comece seu trial gratuito e explore todos os recursos sem compromisso.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <Button size="lg" className="h-12 bg-white px-8 text-[#032B61] font-semibold hover:bg-white/90" asChild>
                <Link to="/login?mode=signup">
                  Criar conta gratuita
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 border-white/40 bg-transparent text-white hover:bg-white/10 hover:border-white/60" asChild>
                <Link to="/#precos">Ver planos e preços</Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
