import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Copy, Check, Share2, Gift, Users, UserCheck, Clock, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getReferralsByCode } from '@/services/affiliateReferrals'
import { getSubscription } from '@/services/subscription'
import { AffiliateReferral, SubscriptionStatus } from '@/types'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/useToast'

type ReferralWithStatus = AffiliateReferral & { status?: SubscriptionStatus }

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  trialing: { label: 'Em teste', variant: 'warning' },
  active: { label: 'Ativo', variant: 'success' },
  past_due: { label: 'Pagamento atrasado', variant: 'destructive' },
  canceled: { label: 'Cancelado', variant: 'secondary' },
  expired: { label: 'Expirado', variant: 'secondary' },
}

async function fetchReferralsWithStatus(code: string): Promise<ReferralWithStatus[]> {
  const referrals = await getReferralsByCode(code)
  return Promise.all(
    referrals.map(async (r) => {
      const sub = await getSubscription(r.companyId)
      return { ...r, status: sub?.status }
    }),
  )
}

export function AffiliatePanel() {
  const { user, logout } = useAuth()
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const code = user?.referralCode ?? ''
  const link = `${window.location.origin}/login?mode=signup&ref=${code}`

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['affiliateReferrals', code],
    queryFn: () => fetchReferralsWithStatus(code),
    enabled: !!code,
  })

  const activeCount = referrals.filter((r) => r.status === 'active').length
  const trialCount = referrals.filter((r) => r.status === 'trialing').length

  const copy = async (value: string, which: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(which)
      toast({ title: which === 'code' ? 'Código copiado!' : 'Link copiado!' })
      setTimeout(() => setCopied((c) => (c === which ? null : c)), 2000)
    } catch {
      toast({ title: 'Não foi possível copiar.', variant: 'destructive' })
    }
  }

  const shareWhatsApp = () => {
    const text = `Conheça o AlugaPro, o sistema que uso para gestão de aluguéis: ${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-[#032B61]/10 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/painel-afiliado" className="flex items-center">
            <img src="/logo-completa-horizontal-alugapro.png" alt="AlugaPro" className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">{user?.name}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-xl font-bold text-[#032B61]">Painel de afiliado</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Compartilhe seu link, acompanhe suas indicações e receba por cada cliente ativo.
          </p>
        </div>

        <Card className="border-[#032B61]/15 bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seu código de indicação</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-[#032B61]/5 px-4 py-2 font-mono text-2xl font-bold tracking-widest text-[#032B61]">
                {code || '------'}
              </span>
              <Button variant="outline" size="sm" onClick={() => copy(code, 'code')}>
                {copied === 'code' ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                Copiar código
              </Button>
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seu link de indicação</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {link}
              </code>
              <Button variant="outline" size="sm" onClick={() => copy(link, 'link')}>
                {copied === 'link' ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                Copiar
              </Button>
              <Button size="sm" className="bg-[#25D366] text-white hover:bg-[#25D366]/90" onClick={shareWhatsApp}>
                <Share2 className="mr-1.5 h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#032B61]/10 text-[#032B61]">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Indicações</p>
                <p className="text-lg font-bold">{referrals.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <UserCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Clientes ativos</p>
                <p className="text-lg font-bold">{activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Em teste</p>
                <p className="text-lg font-bold">{trialCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Suas indicações</h2>
            </div>
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : referrals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Gift className="h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 font-medium text-muted-foreground">Nenhuma indicação ainda</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground/80">
                  Compartilhe seu link para começar a indicar e acompanhar aqui.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {referrals.map((r) => {
                  const sc = r.status ? STATUS_CONFIG[r.status] : null
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.companyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.createdAt?.toDate ? formatDate(r.createdAt.toDate()) : '—'}
                        </p>
                      </div>
                      {sc ? <Badge variant={sc.variant}>{sc.label}</Badge> : <Badge variant="outline">—</Badge>}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="rounded-xl border border-[#032B61]/10 bg-[#032B61]/5 p-4 text-sm text-[#032B61]">
          <p className="font-medium">Como funciona o pagamento</p>
          <p className="mt-1 text-[#032B61]/80">
            Você recebe R$ 100 por cliente ativo ou 20% de comissão recorrente, conforme combinado com o time AlugaPro.
            Entre em contato pelo{' '}
            <a href="mailto:suporte@alugapro.com.br" className="underline">suporte@alugapro.com.br</a> para combinar o
            modelo e receber.
          </p>
        </div>
      </main>
    </div>
  )
}
