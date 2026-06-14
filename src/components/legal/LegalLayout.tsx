import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'

interface LegalLayoutProps {
  title: string
  updatedAt: string
  children: React.ReactNode
}

export function LegalLayout({ title, updatedAt, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-foreground">
      <LandingHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao site
        </Link>

        <header className="mb-10 border-b pb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Última atualização: {updatedAt}
          </p>
        </header>

        <article className="space-y-8 text-sm leading-relaxed text-foreground/90 sm:text-base">
          {children}
        </article>
      </main>

      <LandingFooter />
    </div>
  )
}

interface LegalSectionProps {
  title: string
  children: React.ReactNode
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  )
}
