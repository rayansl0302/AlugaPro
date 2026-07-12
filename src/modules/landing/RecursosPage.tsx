import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
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

const accentMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700' },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     badge: 'bg-sky-100 text-sky-700' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    badge: 'bg-rose-100 text-rose-700' },
}

export function RecursosPage() {
  const { t } = useTranslation('landing')
  const { user } = useAuth()

  const primaryHref = user
    ? user.role === 'inquilino' ? '/portal' : user.role === 'afiliado' ? '/painel-afiliado' : '/dashboard'
    : '/login'

  const propertiesVehiclesItems = t('recursos.blocks.propertiesVehicles.items', { returnObjects: true }) as string[]
  const digitalContractsItems = t('recursos.blocks.digitalContracts.items', { returnObjects: true }) as string[]
  const autoChargesItems = t('recursos.blocks.autoCharges.items', { returnObjects: true }) as string[]
  const tenantPortalItems = t('recursos.blocks.tenantPortal.items', { returnObjects: true }) as string[]
  const notificationsItems = t('recursos.blocks.notifications.items', { returnObjects: true }) as string[]
  const reportsItems = t('recursos.blocks.reports.items', { returnObjects: true }) as string[]

  const FEATURES = [
    {
      id: 'imoveis-veiculos',
      icon: Building2,
      badge: t('recursos.blocks.propertiesVehicles.badge'),
      title: t('recursos.blocks.propertiesVehicles.title'),
      description: t('recursos.blocks.propertiesVehicles.description'),
      items: [
        { icon: Building2, label: propertiesVehiclesItems[0] },
        { icon: Car, label: propertiesVehiclesItems[1] },
        { icon: Users, label: propertiesVehiclesItems[2] },
        { icon: CalendarClock, label: propertiesVehiclesItems[3] },
      ],
      accent: 'emerald',
    },
    {
      id: 'contratos',
      icon: FileText,
      badge: t('recursos.blocks.digitalContracts.badge'),
      title: t('recursos.blocks.digitalContracts.title'),
      description: t('recursos.blocks.digitalContracts.description'),
      items: [
        { icon: FileText, label: digitalContractsItems[0] },
        { icon: PenLine, label: digitalContractsItems[1] },
        { icon: Shield, label: digitalContractsItems[2] },
        { icon: Users, label: digitalContractsItems[3] },
      ],
      accent: 'blue',
    },
    {
      id: 'cobrancas',
      icon: CreditCard,
      badge: t('recursos.blocks.autoCharges.badge'),
      title: t('recursos.blocks.autoCharges.title'),
      description: t('recursos.blocks.autoCharges.description'),
      items: [
        { icon: CreditCard, label: autoChargesItems[0] },
        { icon: AlertCircle, label: autoChargesItems[1] },
        { icon: TrendingUp, label: autoChargesItems[2] },
        { icon: RefreshCw, label: autoChargesItems[3] },
      ],
      accent: 'violet',
    },
    {
      id: 'portal-inquilino',
      icon: Users,
      badge: t('recursos.blocks.tenantPortal.badge'),
      title: t('recursos.blocks.tenantPortal.title'),
      description: t('recursos.blocks.tenantPortal.description'),
      items: [
        { icon: FileText, label: tenantPortalItems[0] },
        { icon: CreditCard, label: tenantPortalItems[1] },
        { icon: MessageSquare, label: tenantPortalItems[2] },
        { icon: Bell, label: tenantPortalItems[3] },
      ],
      accent: 'sky',
      highlight: t('recursos.blocks.tenantPortal.highlight'),
    },
    {
      id: 'notificacoes',
      icon: Bell,
      badge: t('recursos.blocks.notifications.badge'),
      title: t('recursos.blocks.notifications.title'),
      description: t('recursos.blocks.notifications.description'),
      items: [
        { icon: Bell, label: notificationsItems[0] },
        { icon: AlertCircle, label: notificationsItems[1] },
        { icon: CalendarClock, label: notificationsItems[2] },
        { icon: Wrench, label: notificationsItems[3] },
      ],
      accent: 'amber',
    },
    {
      id: 'relatorios',
      icon: BarChart3,
      badge: t('recursos.blocks.reports.badge'),
      title: t('recursos.blocks.reports.title'),
      description: t('recursos.blocks.reports.description'),
      items: [
        { icon: BarChart3, label: reportsItems[0] },
        { icon: TrendingUp, label: reportsItems[1] },
        { icon: FileSpreadsheet, label: reportsItems[2] },
        { icon: AlertCircle, label: reportsItems[3] },
      ],
      accent: 'rose',
    },
  ]

  return (
    <div className="light min-h-screen bg-white text-foreground">
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
              {t('recursos.badge')}
            </motion.span>

            <motion.h1
              variants={fadeInUp}
              className="mt-5 text-4xl font-bold leading-tight tracking-tight text-[#032B61] sm:text-5xl"
            >
              {t('recursos.heroTitle')}
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-5 text-lg leading-relaxed text-muted-foreground"
            >
              {t('recursos.heroSubtitle')}
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <Button size="lg" className="h-11 bg-[#032B61] px-6 text-white hover:bg-[#032B61]/90" asChild>
                <Link to={primaryHref}>
                  {t('recursos.ctaStartTrial')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-11 border-slate-300 text-[#032B61] hover:bg-slate-50" asChild>
                <Link to="/#precos">{t('recursos.ctaSeePricing')}</Link>
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
              {t('recursos.ctaBannerBadge')}
            </motion.span>

            <motion.h2
              variants={fadeInUp}
              className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              {t('recursos.ctaBannerTitle')}
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="mt-4 text-lg text-white/70"
            >
              {t('recursos.ctaBannerSubtitle')}
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <Button size="lg" className="h-12 bg-white px-8 text-[#032B61] font-semibold hover:bg-white/90" asChild>
                <Link to="/login?mode=signup">
                  {t('ctaBanner.ctaCreateAccount')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 border-white/40 bg-transparent text-white hover:bg-white/10 hover:border-white/60" asChild>
                <Link to="/#precos">{t('recursos.ctaSeePricing')}</Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
