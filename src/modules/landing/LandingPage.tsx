import { Link } from 'react-router-dom'
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
    <div className="min-h-screen bg-slate-50 text-foreground">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#032B61] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(56,189,248,0.18),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_10%_80%,rgba(16,185,129,0.12),transparent_45%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:py-24">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Gestão inteligente de aluguéis
              </span>

              <h1 className="mt-5 text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
                Sua locação organizada, do contrato ao recebimento
              </h1>

              <p className="mt-5 text-base leading-relaxed text-white/75 sm:text-lg">
                Imóveis, veículos, contratos digitais, cobranças e portal do inquilino — tudo integrado para quem administra aluguéis todos os dias.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" className="h-11 bg-white px-6 text-[#032B61] hover:bg-white/90" asChild>
                  <Link to={primaryHref}>
                    {primaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                {secondaryIsAnchor ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <a href={secondaryHref}>{secondaryLabel}</a>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <Link to={secondaryHref}>{secondaryLabel}</Link>
                  </Button>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6">
                {['Assinatura digital', 'Cobranças automáticas', 'Portal do inquilino'].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 text-sm text-white/70">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <LandingHeroPreview />
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-b bg-white py-8">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6">
            {[
              { value: 'Imóveis', label: 'Gestão completa' },
              { value: 'Veículos', label: 'Locação integrada' },
              { value: 'Contratos', label: 'Assinatura digital' },
              { value: 'Cobranças', label: 'Controle financeiro' },
            ].map((item) => (
              <div key={item.value} className="text-center sm:text-left">
                <p className="text-sm font-bold text-[#032B61]">{item.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="recursos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tudo que você precisa para administrar locações
            </h2>
            <p className="mt-4 text-muted-foreground">
              Recursos pensados para simplificar a rotina do gestor e melhorar a experiência do inquilino.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-0 shadow-md transition-shadow hover:shadow-lg">
                <CardContent className="p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Como funciona</h2>
              <p className="mt-4 text-muted-foreground">
                Em três passos você estrutura toda a operação de locação no AlugaPro.
              </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {STEPS.map(({ step, title, description }) => (
                <div key={step} className="relative rounded-2xl border bg-slate-50 p-8">
                  <span className="text-4xl font-bold text-primary/20">{step}</span>
                  <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Audience */}
        <section id="para-quem" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Para quem é o AlugaPro
              </h2>
              <p className="mt-4 text-muted-foreground">
                Uma solução completa para quem precisa profissionalizar a gestão de aluguéis sem perder agilidade.
              </p>
              <ul className="mt-8 space-y-4">
                {AUDIENCES.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Card className="border-primary/20 bg-[#032B61] text-white shadow-xl">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold">Pronto para organizar suas locações?</h3>
                <p className="mt-4 text-sm leading-relaxed text-white/80">
                  Acesse o sistema como gestor ou entre no portal do inquilino para acompanhar pagamentos e contratos.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button className="bg-white text-[#032B61] hover:bg-white/90" asChild>
                    <Link to={primaryHref}>{primaryLabel}</Link>
                  </Button>
                  {!user && (
                    <Button
                      variant="outline"
                      className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                      asChild
                    >
                      <Link to="/login?tab=inquilino">Portal do inquilino</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
