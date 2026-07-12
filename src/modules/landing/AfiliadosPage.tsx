import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
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

export function AfiliadosPage() {
  const { t } = useTranslation('landing')
  const { user } = useAuth()
  const ctaHref = user?.role === 'afiliado' ? '/painel-afiliado' : '/login?mode=signup&tab=afiliado'
  const ctaLabel = user?.role === 'afiliado'
    ? t('affiliatesPage.ctaGoToPanel')
    : t('affiliatesPage.ctaBecomeAffiliate')

  const COMMISSION_PERKS = t('affiliatesPage.commissionPerks', { returnObjects: true }) as string[]
  const WAITING_PERIOD_PERKS = t('affiliatesPage.waitingPeriodPerks', { returnObjects: true }) as string[]

  const AUDIENCES = [
    {
      icon: Users,
      title: t('affiliatesPage.audiences.anyone.title'),
      description: t('affiliatesPage.audiences.anyone.description'),
    },
    {
      icon: Briefcase,
      title: t('affiliatesPage.audiences.professionals.title'),
      description: t('affiliatesPage.audiences.professionals.description'),
    },
    {
      icon: Building2,
      title: t('affiliatesPage.audiences.brokers.title'),
      description: t('affiliatesPage.audiences.brokers.description'),
    },
    {
      icon: Megaphone,
      title: t('affiliatesPage.audiences.creators.title'),
      description: t('affiliatesPage.audiences.creators.description'),
    },
  ]

  const STEPS = [
    {
      step: t('affiliatesPage.steps.indicate.step'),
      icon: Share2,
      title: t('affiliatesPage.steps.indicate.title'),
      description: t('affiliatesPage.steps.indicate.description'),
    },
    {
      step: t('affiliatesPage.steps.freeTrial.step'),
      icon: Zap,
      title: t('affiliatesPage.steps.freeTrial.title'),
      description: t('affiliatesPage.steps.freeTrial.description'),
    },
    {
      step: t('affiliatesPage.steps.activeClient.step'),
      icon: UserCheck,
      title: t('affiliatesPage.steps.activeClient.title'),
      description: t('affiliatesPage.steps.activeClient.description'),
    },
    {
      step: t('affiliatesPage.steps.youEarn.step'),
      icon: Wallet,
      title: t('affiliatesPage.steps.youEarn.title'),
      description: t('affiliatesPage.steps.youEarn.description'),
    },
  ]

  return (
    <div className="light min-h-screen bg-white text-foreground">
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
              {t('affiliatesPage.badge')}
            </motion.span>

            <motion.h1
              variants={fadeInUp}
              className="mt-5 text-4xl font-bold leading-tight tracking-tight text-[#032B61] sm:text-5xl"
            >
              {t('affiliatesPage.heroTitle')}
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-5 text-lg leading-relaxed text-muted-foreground"
            >
              {t('affiliatesPage.heroSubtitle')}
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
                <a href="#como-funciona">{t('affiliatesPage.ctaSeeHowItWorks')}</a>
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
                {t('affiliatesPage.earnTitle')}
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                {t('affiliatesPage.earnSubtitle')}
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
                <h3 className="mt-5 text-2xl font-bold text-emerald-700">{t('affiliatesPage.commissionTitle')}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {t('affiliatesPage.commissionDescription')}
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
                <h3 className="mt-5 text-2xl font-bold text-blue-700">{t('affiliatesPage.waitingPeriodTitle')}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {t('affiliatesPage.waitingPeriodDescription')}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {WAITING_PERIOD_PERKS.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                      {perk}
                    </li>
                  ))}
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
                {t('affiliatesPage.forWhomTitle')}
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                {t('affiliatesPage.forWhomSubtitle')}
              </motion.p>
              <motion.div variants={fadeInUp} className="mt-5 flex justify-center">
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <CheckCircle2 className="mr-1.5 h-3 w-3" />
                  {t('affiliatesPage.forWhomBadge')}
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
                {t('affiliatesPage.howItWorksTitle')}
              </motion.h2>
              <motion.p variants={fadeInUp} className="mt-4 text-muted-foreground">
                {t('affiliatesPage.howItWorksSubtitle')}
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
              {t('affiliatesPage.ctaBannerBadge')}
            </motion.span>

            <motion.h2
              variants={fadeInUp}
              className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              {t('affiliatesPage.ctaBannerTitle')}
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="mt-4 text-lg text-white/70"
            >
              {t('affiliatesPage.ctaBannerSubtitle')}
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
                <Link to="/recursos">{t('affiliatesPage.ctaKnowPlatform')}</Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
