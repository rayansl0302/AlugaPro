import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Gift, Percent, Clock, Users, Building2, Megaphone, Briefcase,
  Share2, Zap, UserCheck, Wallet, CheckCircle2, ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { fadeInUp, scaleIn, staggerContainer, viewportOnce } from '@/lib/motion'

const AFFILIATE_COMMISSION_RATE = 7

const COMMISSION_PERKS = [
  'Pago automaticamente, direto na sua conta',
  'Sem limite de indicações',
  'Renda recorrente, mês a mês',
]

const AUDIENCES = [
  {
    icon: Users,
    title: 'Qualquer pessoa',
    description: 'Não precisa ser corretor nem ter experiência em vendas. Se você conhece alguém que aluga imóveis, veículos ou equipamentos, já pode indicar.',
  },
  {
    icon: Briefcase,
    title: 'Vendedores e profissionais liberais',
    description: 'Vendedores profissionais, advogados, contadores e despachantes também participam — não há nenhuma restrição.',
  },
  {
    icon: Building2,
    title: 'Corretores e imobiliárias',
    description: 'Já em contato direto com proprietários — indique o AlugaPro durante o próprio atendimento.',
  },
  {
    icon: Megaphone,
    title: 'Influenciadores e criadores de conteúdo',
    description: 'De qualquer nicho, não só do mercado imobiliário — recomende para sua audiência e transforme isso em renda recorrente.',
  },
]

const STEPS = [
  { step: '01', icon: Share2, title: 'Indique', description: 'Apresente o AlugaPro para alguém que administra aluguéis de imóveis, veículos ou equipamentos.' },
  { step: '02', icon: Zap, title: 'Teste grátis', description: 'Seu indicado testa a plataforma por 14 dias, sem cartão de crédito e sem compromisso.' },
  { step: '03', icon: UserCheck, title: 'Cliente ativo', description: 'Quando ele assina um plano pago, a indicação é confirmada e fica registrada no seu nome.' },
  { step: '04', icon: Wallet, title: 'Você recebe', description: `Receba ${AFFILIATE_COMMISSION_RATE}% de comissão recorrente sobre a mensalidade, a partir de 15 dias de cliente ativo.` },
]

export function AfiliadosPage() {
  const { user } = useAuth()
  const ctaHref = user?.role === 'afiliado' ? '/painel-afiliado' : '/login?mode=signup&tab=afiliado'
  const ctaLabel = user?.role === 'afiliado' ? 'Ir para o meu painel' : 'Quero ser afiliado'

  return (
    <div className="min-h-screen bg-white text-foreground">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-white py-16 sm:py-24">
          <div className="pointer-events-none absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-sky-100/40 blur-3xl" />

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
              <Gift className="h-3.5 w-3.5" />
              Programa de Afiliados
            </motion.span>

            <motion.h1
              variants={fadeInUp}
              className="mt-5 text-4xl font-bold leading-tight tracking-tight text-[#032B61] sm:text-5xl"
            >
              Ganhe dinheiro indicando o AlugaPro
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-5 text-lg leading-relaxed text-muted-foreground"
            >
              Qualquer pessoa pode indicar — corretor, vendedor profissional, influenciador ou simplesmente
              quem conhece um proprietário de imóveis, veículos ou equipamentos. Indique o AlugaPro e
              receba por cada cliente ativo.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <Button
                size="lg"
                className="h-11 bg-[#032B61] px-6 text-white hover:bg-[#032B61]/90"
                asChild
              >
                <Link to={ctaHref}>
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-11 border-slate-300 text-[#032B61] hover:bg-slate-50" asChild>
                <a href="#como-funciona">Ver como funciona</a>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Payment models */}
        <section id="pagamento" className="border-y border-slate-200 bg-slate-50/60 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <motion.div
              className="mx-auto max-w-2xl text-center"
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer(0.12)}
            >
              <motion.h2 variants={fadeInUp} className="text-3xl font-bold tracking-tight text-[#032B61] sm:text-4xl">
                Como você ganha
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                Comissão recorrente de {AFFILIATE_COMMISSION_RATE}% sobre a mensalidade de cada cliente
                ativo indicado por você.
              </motion.p>
            </motion.div>

            <motion.div
              className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_1fr]"
              variants={staggerContainer(0.15)}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
            >
              <motion.div
                variants={scaleIn}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Percent className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-2xl font-bold text-emerald-700">{AFFILIATE_COMMISSION_RATE}% de comissão recorrente</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Todo mês, enquanto o cliente que você indicou continuar ativo, você recebe sua parte —
                  sem precisar fazer nada além de manter seus dados de recebimento em dia.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {COMMISSION_PERKS.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                variants={scaleIn}
                className="rounded-2xl border border-blue-200 bg-blue-50 p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Clock className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-2xl font-bold text-blue-700">15 dias de carência</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  O pagamento da comissão começa a contar apenas depois que o cliente indicado completa
                  15 dias consecutivos como cliente ativo — garantindo que a indicação realmente vingou.
                </p>
                <ul className="mt-6 space-y-2.5">
                  <li className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                    Sem burocracia — a contagem é automática no seu painel
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                    Você acompanha o status de cada indicação em tempo real
                  </li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Para quem */}
        <section id="para-quem" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <motion.div
              className="mx-auto max-w-2xl text-center"
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerContainer(0.12)}
            >
              <motion.h2 variants={fadeInUp} className="text-3xl font-bold tracking-tight text-[#032B61] sm:text-4xl">
                Para quem é o programa
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                Não importa a sua profissão. Vale para corretores, vendedores profissionais,
                influenciadores ou qualquer pessoa que conheça um proprietário de imóveis, veículos ou equipamentos.
              </motion.p>
              <motion.div variants={fadeInUp} className="mt-5 flex justify-center">
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <CheckCircle2 className="mr-1.5 h-3 w-3" />
                  Aberto a todos — inclusive vendedores profissionais
                </Badge>
              </motion.div>
            </motion.div>

            <motion.div
              className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
              variants={staggerContainer(0.1)}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
            >
              {AUDIENCES.map(({ icon: Icon, title, description }) => (
                <motion.div
                  key={title}
                  variants={fadeInUp}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#032B61]/10 text-[#032B61]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-[#032B61]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="border-y border-slate-200 bg-slate-50/50 py-16 sm:py-20">
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
                Da indicação ao pagamento, em quatro passos simples.
              </motion.p>
            </motion.div>

            <motion.div
              className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
              variants={staggerContainer(0.15)}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
            >
              {STEPS.map(({ step, icon: Icon, title, description }) => (
                <motion.div
                  key={step}
                  variants={scaleIn}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-[#032B61]/15">{step}</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#032B61]/10 text-[#032B61]">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#032B61]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

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
              <Gift className="h-3.5 w-3.5" />
              Indicações ilimitadas
            </motion.span>

            <motion.h2
              variants={fadeInUp}
              className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Pronto para começar a indicar?
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="mt-4 text-lg text-white/70"
            >
              Fale com a gente e entre no programa de afiliados do AlugaPro.
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
                <Link to={ctaHref}>
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 border-white/40 bg-transparent text-white hover:bg-white/10 hover:border-white/60" asChild>
                <Link to="/recursos">Conhecer a plataforma</Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
