import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
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

type CellValue = boolean | string
interface CompRow { label: string; starter: CellValue; pro: CellValue; business: CellValue }
interface CompGroup { group: string; rows: CompRow[] }

export function LandingPage() {
  const { t } = useTranslation('landing')
  const { user } = useAuth()

  const FEATURES = [
    {
      icon: Building2,
      title: t('features.propertiesVehicles.title'),
      description: t('features.propertiesVehicles.description'),
    },
    {
      icon: FileText,
      title: t('features.digitalContracts.title'),
      description: t('features.digitalContracts.description'),
    },
    {
      icon: CreditCard,
      title: t('features.autoCharges.title'),
      description: t('features.autoCharges.description'),
    },
    {
      icon: Users,
      title: t('features.tenantPortal.title'),
      description: t('features.tenantPortal.description'),
    },
    {
      icon: Bell,
      title: t('features.notifications.title'),
      description: t('features.notifications.description'),
    },
    {
      icon: BarChart3,
      title: t('features.reports.title'),
      description: t('features.reports.description'),
    },
  ]

  const STEPS = [
    {
      step: t('howItWorks.steps.register.step'),
      title: t('howItWorks.steps.register.title'),
      description: t('howItWorks.steps.register.description'),
    },
    {
      step: t('howItWorks.steps.formalize.step'),
      title: t('howItWorks.steps.formalize.title'),
      description: t('howItWorks.steps.formalize.description'),
    },
    {
      step: t('howItWorks.steps.manageCharges.step'),
      title: t('howItWorks.steps.manageCharges.title'),
      description: t('howItWorks.steps.manageCharges.description'),
    },
  ]

  const AUDIENCES = t('forWhom.audiences', { returnObjects: true }) as string[]

  const STATS = [
    { value: t('stats.properties.label'), label: t('stats.properties.description'), icon: Building2 },
    { value: t('stats.vehicles.label'), label: t('stats.vehicles.description'), icon: Car },
    { value: t('stats.contracts.label'), label: t('stats.contracts.description'), icon: FileText },
    { value: t('stats.charges.label'), label: t('stats.charges.description'), icon: CreditCard },
  ]

  const HERO_PERKS = [
    t('hero.perks.freeTrial'),
    t('hero.perks.noCreditCard'),
    t('hero.perks.cancelAnytime'),
  ]

  const COMPARISON: CompGroup[] = [
    {
      group: t('pricing.comparison.groups.management'),
      rows: [
        { label: t('pricing.comparison.rows.propertiesVehicles'), starter: t('pricing.comparison.values.upTo10'), pro: t('pricing.comparison.values.upTo50'), business: t('pricing.comparison.values.unlimited') },
        { label: t('pricing.comparison.rows.managerUsers'), starter: t('pricing.comparison.values.two'), pro: t('pricing.comparison.values.five'), business: t('pricing.comparison.values.unlimited') },
        { label: t('pricing.comparison.rows.ownersTenants'), starter: true, pro: true, business: true },
        { label: t('pricing.comparison.rows.tenantPortal'), starter: true, pro: true, business: true },
      ],
    },
    {
      group: t('pricing.comparison.groups.contractsCharges'),
      rows: [
        { label: t('pricing.comparison.rows.contractGeneration'), starter: true, pro: true, business: true },
        { label: t('pricing.comparison.rows.digitalSignature'), starter: false, pro: true, business: true },
        { label: t('pricing.comparison.rows.customTemplates'), starter: false, pro: true, business: true },
        { label: t('pricing.comparison.rows.autoCharges'), starter: true, pro: true, business: true },
        { label: t('pricing.comparison.rows.delinquencyControl'), starter: true, pro: true, business: true },
      ],
    },
    {
      group: t('pricing.comparison.groups.finance'),
      rows: [
        { label: t('pricing.comparison.rows.financeDashboard'), starter: true, pro: true, business: true },
        { label: t('pricing.comparison.rows.sharedExpenses'), starter: true, pro: true, business: true },
        { label: t('pricing.comparison.rows.advancedReports'), starter: false, pro: true, business: true },
        { label: t('pricing.comparison.rows.exportExcelPdf'), starter: false, pro: true, business: true },
        { label: t('pricing.comparison.rows.indexAdjustment'), starter: false, pro: true, business: true },
      ],
    },
    {
      group: t('pricing.comparison.groups.operations'),
      rows: [
        { label: t('pricing.comparison.rows.ticketsMaintenance'), starter: true, pro: true, business: true },
        { label: t('pricing.comparison.rows.autoNotifications'), starter: true, pro: true, business: true },
        { label: t('pricing.comparison.rows.multipleTeams'), starter: false, pro: false, business: true },
        { label: t('pricing.comparison.rows.assistedOnboarding'), starter: false, pro: false, business: true },
        { label: t('pricing.comparison.rows.integrationsApi'), starter: false, pro: false, business: t('pricing.comparison.values.comingSoon') },
      ],
    },
  ]

  const asFeatureList = (value: unknown): string[] => (Array.isArray(value) ? (value as string[]) : [])

  const PRICING_FEATURES: Record<PlanId, string[]> = {
    starter: asFeatureList(t('pricing.plans.starter.features', { returnObjects: true })),
    pro: asFeatureList(t('pricing.plans.pro.features', { returnObjects: true })),
    business: asFeatureList(t('pricing.plans.business.features', { returnObjects: true })),
  }

  const CTA_PERKS = t('ctaBanner.perks', { returnObjects: true }) as string[]

  const primaryHref = user
    ? user.role === 'inquilino'
      ? '/portal'
      : user.role === 'afiliado'
        ? '/painel-afiliado'
        : '/dashboard'
    : '/login'

  const primaryLabel = user ? t('hero.ctaOpenPanel') : t('hero.ctaStart')
  const secondaryHref = user ? '#recursos' : '/login?tab=inquilino'
  const secondaryLabel = user ? t('hero.ctaSeeFeatures') : t('hero.ctaTenant')
  const secondaryIsAnchor = !!user

  const mobilePlans = [
    { id: 'starter' as const, name: t('pricing.plans.starter.name'), price: `${formatCurrency(PLANS.starter.price)}${t('pricing.perMonth')}`, popular: false },
    { id: 'pro' as const, name: t('pricing.plans.pro.name'), price: `${formatCurrency(PLANS.pro.price)}${t('pricing.perMonth')}`, popular: true },
    { id: 'business' as const, name: t('pricing.plans.business.name'), price: `${formatCurrency(PLANS.business.price)}${t('pricing.perMonth')}`, popular: false },
  ]

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
                {t('hero.badge')}
              </motion.span>

              <motion.h1
                variants={fadeInUp}
                className="mt-5 text-3xl font-bold leading-[1.15] tracking-tight text-[#032B61] sm:text-4xl lg:text-5xl"
              >
                {t('hero.title')}
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg"
              >
                {t('hero.subtitle')}
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
                {t('features.title')}
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                {t('features.subtitle')}
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
                {t('howItWorks.title')}
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                {t('howItWorks.subtitle')}
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
                {t('pricing.badge')}
              </motion.span>
              <motion.h2
                variants={fadeInUp}
                className="mt-4 text-3xl font-bold tracking-tight text-[#032B61] sm:text-4xl"
              >
                {t('pricing.title')}
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                {t('pricing.subtitle')}
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
                          <Badge className="bg-[#032B61] text-white px-4 py-1 text-xs">{t('pricing.popular')}</Badge>
                        </div>
                      )}
                      <CardContent className="flex flex-col flex-1 p-6">
                        <p className="text-sm font-semibold text-[#032B61]">{t(`pricing.plans.${planId}.name`)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t(`pricing.plans.${planId}.description`)}</p>
                        <div className="mt-4 flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-[#032B61]">
                            {formatCurrency(plan.price)}
                          </span>
                          <span className="text-sm text-muted-foreground">{t('pricing.perMonth')}</span>
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
                          <Link to="/login?mode=signup">{t('pricing.ctaStartFree')}</Link>
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
              {t('pricing.tenantPortalFree')}
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
                {t('pricing.compareTitle')}
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                {t('pricing.compareSubtitle')}
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
                {mobilePlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`snap-center shrink-0 w-[80vw] max-w-xs rounded-2xl border bg-white shadow-sm ${plan.popular ? 'border-[#032B61] ring-1 ring-[#032B61]/20' : 'border-slate-200'}`}
                  >
                    <div className={`rounded-t-2xl px-5 py-4 ${plan.popular ? 'bg-[#032B61]' : 'bg-slate-50'}`}>
                      {plan.popular && (
                        <span className="mb-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
                          {t('pricing.popular')}
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
                        <Link to="/login?mode=signup">{t('pricing.ctaStartFree')}</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">{t('pricing.swipeHint')}</p>
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
                    <th className="px-5 py-4 text-left font-medium text-slate-500 w-1/2">{t('pricing.featureColumn')}</th>
                    <th className="px-4 py-4 text-center font-semibold text-[#032B61]">
                      <div>{t('pricing.plans.starter.name')}</div>
                      <div className="text-xs font-normal text-slate-400">{formatCurrency(PLANS.starter.price)}{t('pricing.perMonth')}</div>
                    </th>
                    <th className="px-4 py-4 text-center font-semibold text-[#032B61] bg-[#032B61]/[0.03]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="rounded-full bg-[#032B61] px-2 py-0.5 text-[10px] text-white font-medium">{t('pricing.popularShort')}</span>
                        <span>{t('pricing.plans.pro.name')}</span>
                        <span className="text-xs font-normal text-slate-400">{formatCurrency(PLANS.pro.price)}{t('pricing.perMonth')}</span>
                      </div>
                    </th>
                    <th className="px-4 py-4 text-center font-semibold text-[#032B61]">
                      <div>{t('pricing.plans.business.name')}</div>
                      <div className="text-xs font-normal text-slate-400">{formatCurrency(PLANS.business.price)}{t('pricing.perMonth')}</div>
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
                          <Link to="/login?mode=signup">{t('pricing.ctaStartFree')}</Link>
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
              {t('ctaBanner.badge')}
            </motion.span>
            <motion.h2
              variants={fadeInUp}
              className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              {t('ctaBanner.title')}
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mt-5 text-lg text-white/70 max-w-xl mx-auto"
            >
              {t('ctaBanner.subtitle')}
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
                  {t('ctaBanner.ctaCreateAccount')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-white/40 bg-transparent text-white hover:bg-white/10 hover:border-white/60"
                asChild
              >
                <Link to="/login?tab=inquilino">{t('ctaBanner.ctaTenant')}</Link>
              </Button>
            </motion.div>
            <motion.div
              variants={staggerContainer(0.08)}
              className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3"
            >
              {CTA_PERKS.map((perk) => (
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
                {t('forWhom.title')}
              </motion.h2>
              <motion.p variants={fadeInLeft} className="mt-4 text-muted-foreground">
                {t('forWhom.subtitle')}
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
                  <h3 className="text-2xl font-bold text-[#032B61]">{t('forWhom.cardTitle')}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {t('forWhom.cardDescription')}
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
                        <Link to="/login?tab=inquilino">{t('forWhom.tenantPortalCta')}</Link>
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
