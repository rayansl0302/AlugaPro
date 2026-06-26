import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import {
  Copy, Check, Share2, Gift, Users, UserCheck, Clock, LogOut, Loader2, ShieldCheck, ShieldAlert,
} from 'lucide-react'
import { auth, db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { getReferralsByCode } from '@/services/affiliateReferrals'
import { getSubscription } from '@/services/subscription'
import { uploadAffiliateDocument } from '@/services/storage'
import { AffiliateReferral, SubscriptionStatus } from '@/types'
import { formatDate, maskCPF } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiPhotoUpload } from '@/components/shared/MultiPhotoUpload'
import { toast } from '@/hooks/useToast'

const COMMISSION_WAIT_DAYS = 15
const DEMO_REFERRAL_CODE = 'MARINA'

type ReferralWithStatus = AffiliateReferral & { status?: SubscriptionStatus; activeSince?: Timestamp }

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  trialing: { label: 'Em teste', variant: 'warning' },
  active: { label: 'Ativo', variant: 'success' },
  past_due: { label: 'Pagamento atrasado', variant: 'destructive' },
  canceled: { label: 'Cancelado', variant: 'secondary' },
  expired: { label: 'Expirado', variant: 'secondary' },
}

function daysAgo(n: number): Timestamp {
  return Timestamp.fromMillis(Date.now() - n * 86_400_000)
}

const DEMO_REFERRALS: ReferralWithStatus[] = [
  { id: 'demo-ref-1', code: DEMO_REFERRAL_CODE, companyId: 'demo-empresa-costa', companyName: 'Imobiliária Costa & Cia', createdAt: daysAgo(35), status: 'active', activeSince: daysAgo(20) },
  { id: 'demo-ref-2', code: DEMO_REFERRAL_CODE, companyId: 'demo-empresa-boavista', companyName: 'Administradora Boa Vista', createdAt: daysAgo(19), status: 'active', activeSince: daysAgo(5) },
  { id: 'demo-ref-3', code: DEMO_REFERRAL_CODE, companyId: 'demo-empresa-almeida', companyName: 'João Pedro Almeida', createdAt: daysAgo(6), status: 'trialing' },
  { id: 'demo-ref-4', code: DEMO_REFERRAL_CODE, companyId: 'demo-empresa-vistaverde', companyName: 'Residencial Vista Verde', createdAt: daysAgo(90), status: 'canceled' },
]

// Taxa fixa de comissão do programa de afiliados (mesmo valor em
// api/checkout.ts e AfiliadosPage.tsx)
const AFFILIATE_COMMISSION_RATE = 7

function eligibility(r: ReferralWithStatus): { label: string; variant: 'success' | 'outline' } | null {
  if (r.status !== 'active' || !r.activeSince) return null
  const daysSince = Math.floor((Date.now() - r.activeSince.toMillis()) / 86_400_000)
  if (daysSince >= COMMISSION_WAIT_DAYS) return { label: 'Elegível p/ comissão', variant: 'success' }
  return { label: `Comissão em ${COMMISSION_WAIT_DAYS - daysSince}d`, variant: 'outline' }
}

async function fetchReferralsWithStatus(code: string): Promise<ReferralWithStatus[]> {
  if (code === DEMO_REFERRAL_CODE) return DEMO_REFERRALS
  const referrals = await getReferralsByCode(code)
  return Promise.all(
    referrals.map(async (r) => {
      const sub = await getSubscription(r.companyId)
      return { ...r, status: sub?.status, activeSince: sub?.status === 'active' ? sub.currentPeriodStart : undefined }
    }),
  )
}

export function AffiliatePanel() {
  const { user, logout, updateLocalUser } = useAuth()
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const code = user?.referralCode ?? ''
  const link = `${window.location.origin}/login?mode=signup&ref=${code}`

  const [cpf, setCpf] = useState(user?.cpf ?? '')
  const [pixKey, setPixKey] = useState(user?.pixKey ?? '')
  const [documentPhotoUrl, setDocumentPhotoUrl] = useState(user?.documentPhotoUrl ?? '')
  const [documentSelfieUrl, setDocumentSelfieUrl] = useState(user?.documentSelfieUrl ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [walletId, setWalletId] = useState(user?.asaasWalletId ?? '')
  const [savingKyc, setSavingKyc] = useState(false)

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

  const kycComplete = !!(
    user?.cpf && user?.pixKey && user?.documentPhotoUrl && user?.documentSelfieUrl && user?.asaasWalletId
  )

  const handleSaveKyc = async () => {
    const cpfDigits = cpf.replace(/\D/g, '')
    const walletIdClean = walletId.trim().replace(/^wal_/i, '')
    if (
      cpfDigits.length !== 11 || !pixKey.trim() || !documentPhotoUrl || !documentSelfieUrl ||
      !phone.trim() || !walletIdClean
    ) {
      toast({ title: 'Preencha todos os campos — CPF, PIX, fotos, telefone e Wallet ID — antes de salvar.', variant: 'destructive' })
      return
    }
    setSavingKyc(true)
    const patch = {
      cpf: cpfDigits,
      pixKey: pixKey.trim(),
      documentPhotoUrl,
      documentSelfieUrl,
      phone: phone.replace(/\D/g, ''),
      asaasWalletId: walletIdClean,
    }
    try {
      const uid = auth.currentUser?.uid
      if (uid) {
        await setDoc(doc(db, 'users', uid), { ...patch, kycSubmittedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
      }
      updateLocalUser({ ...patch, kycSubmittedAt: Timestamp.now() })
      toast({ title: 'Dados de recebimento salvos!' })
    } catch {
      toast({ title: 'Erro ao salvar. Tente novamente.', variant: 'destructive' })
    } finally {
      setSavingKyc(false)
    }
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

        <Card className={kycComplete ? 'border-emerald-200' : 'border-amber-200'}>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Dados para recebimento</h2>
              {kycComplete ? (
                <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" /> Verificação enviada</Badge>
              ) : (
                <Badge variant="warning" className="gap-1"><ShieldAlert className="h-3 w-3" /> Pendente</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Para receber suas comissões, precisamos confirmar sua identidade. Usamos esses dados apenas
              para validação e pagamento, conforme nossa{' '}
              <Link to="/politica-de-privacidade" className="underline">Política de Privacidade</Link>.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="kyc-cpf">CPF</Label>
                <Input
                  id="kyc-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kyc-pix">Chave PIX</Label>
                <Input
                  id="kyc-pix"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kyc-phone">Telefone (com DDD)</Label>
                <Input
                  id="kyc-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="kyc-wallet">Wallet ID da Asaas</Label>
                <Input
                  id="kyc-wallet"
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  placeholder="Ex: 720806d7-aa02-48c0-83fa-6e0357157ba7"
                />
                <p className="text-[11px] text-muted-foreground">
                  É pra onde sua comissão será enviada automaticamente. Crie uma conta gratuita em{' '}
                  <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer" className="underline">asaas.com</a>
                  {' '}(se ainda não tiver uma) e copie o Wallet ID em Integrações → Início, no menu superior direito do painel da Asaas.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MultiPhotoUpload
                label="Foto do documento (RG, CNH ou similar)"
                value={documentPhotoUrl ? [documentPhotoUrl] : []}
                onUpload={(file) => uploadAffiliateDocument(user?.id ?? 'afiliado', 'document', file)}
                onChange={(urls) => setDocumentPhotoUrl(urls[0] ?? '')}
                max={1}
              />
              <MultiPhotoUpload
                label="Foto sua segurando o documento"
                value={documentSelfieUrl ? [documentSelfieUrl] : []}
                onUpload={(file) => uploadAffiliateDocument(user?.id ?? 'afiliado', 'selfie', file)}
                onChange={(urls) => setDocumentSelfieUrl(urls[0] ?? '')}
                max={1}
              />
            </div>

            <Button onClick={handleSaveKyc} disabled={savingKyc}>
              {savingKyc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar dados
            </Button>
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
                  const elig = eligibility(r)
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.companyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.createdAt?.toDate ? formatDate(r.createdAt.toDate()) : '—'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {sc ? <Badge variant={sc.variant}>{sc.label}</Badge> : <Badge variant="outline">—</Badge>}
                        {elig && <Badge variant={elig.variant} className="text-[10px]">{elig.label}</Badge>}
                      </div>
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
            Sua comissão recorrente é de <strong>{AFFILIATE_COMMISSION_RATE}%</strong> sobre a mensalidade
            de cada cliente ativo indicado por você. O pagamento começa a contar apenas após o cliente
            indicado completar 15 dias ativo. Mantenha seus dados de recebimento em dia para não atrasar
            o pagamento.
          </p>
        </div>
      </main>
    </div>
  )
}
