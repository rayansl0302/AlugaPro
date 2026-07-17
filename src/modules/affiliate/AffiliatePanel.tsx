import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import {
  Copy, Check, Share2, Gift, Users, UserCheck, Clock, LogOut, Loader2, ShieldCheck, ShieldAlert, Banknote,
} from 'lucide-react'
import { auth, db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { getReferralsByCode } from '@/services/affiliateReferrals'
import { getCommissionsByAffiliate } from '@/services/affiliateCommissions'
import { getSubscription } from '@/services/subscription'
import { uploadAffiliateDocument } from '@/services/storage'
import { AffiliateCommission, AffiliateReferral, PixKeyType, SubscriptionStatus } from '@/types'
import { formatCurrency, formatDate, maskCPF } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiPhotoUpload } from '@/components/shared/MultiPhotoUpload'
import { LanguageSelector } from '@/i18n/LanguageSelector'
import { toast } from '@/hooks/useToast'

const COMMISSION_WAIT_DAYS = 15
const DEMO_REFERRAL_CODE = 'MARINA'

type ReferralWithStatus = AffiliateReferral & { status?: SubscriptionStatus; activeSince?: Timestamp }

function daysAgo(n: number): Timestamp {
  return Timestamp.fromMillis(Date.now() - n * 86_400_000)
}

const DEMO_REFERRALS: ReferralWithStatus[] = [
  { id: 'demo-ref-1', code: DEMO_REFERRAL_CODE, companyId: 'demo-empresa-costa', companyName: 'Imobiliária Costa & Cia', createdAt: daysAgo(35), status: 'active', activeSince: daysAgo(20) },
  { id: 'demo-ref-2', code: DEMO_REFERRAL_CODE, companyId: 'demo-empresa-boavista', companyName: 'Administradora Boa Vista', createdAt: daysAgo(19), status: 'active', activeSince: daysAgo(5) },
  { id: 'demo-ref-3', code: DEMO_REFERRAL_CODE, companyId: 'demo-empresa-almeida', companyName: 'João Pedro Almeida', createdAt: daysAgo(6), status: 'trialing' },
  { id: 'demo-ref-4', code: DEMO_REFERRAL_CODE, companyId: 'demo-empresa-vistaverde', companyName: 'Residencial Vista Verde', createdAt: daysAgo(90), status: 'canceled' },
]

const DEMO_COMMISSIONS: AffiliateCommission[] = [
  { id: 'demo-com-1', affiliateUserId: 'demo-afiliado', referralCode: DEMO_REFERRAL_CODE, companyId: 'demo-empresa-costa', companyName: 'Imobiliária Costa & Cia', paymentId: 'demo-pay-1', paymentValue: 79, commissionRate: 7, commissionValue: 5.53, status: 'pago', paidAt: daysAgo(12), createdAt: daysAgo(18), updatedAt: daysAgo(12) },
  { id: 'demo-com-2', affiliateUserId: 'demo-afiliado', referralCode: DEMO_REFERRAL_CODE, companyId: 'demo-empresa-boavista', companyName: 'Administradora Boa Vista', paymentId: 'demo-pay-2', paymentValue: 129, commissionRate: 7, commissionValue: 9.03, status: 'pendente', createdAt: daysAgo(4), updatedAt: daysAgo(4) },
  { id: 'demo-com-3', affiliateUserId: 'demo-afiliado', referralCode: DEMO_REFERRAL_CODE, companyId: 'demo-empresa-costa', companyName: 'Imobiliária Costa & Cia', paymentId: 'demo-pay-3', paymentValue: 79, commissionRate: 7, commissionValue: 5.53, status: 'pendente', createdAt: daysAgo(2), updatedAt: daysAgo(2) },
]

const PIX_KEY_TYPES: PixKeyType[] = ['cpf', 'cnpj', 'email', 'phone', 'evp']

const COMMISSION_STATUS_VARIANT: Record<AffiliateCommission['status'], 'success' | 'warning' | 'secondary' | 'destructive'> = {
  pago: 'success',
  pendente: 'warning',
  processando: 'secondary',
  cancelado: 'destructive',
}

// Taxa fixa de comissão do programa de afiliados (mesmo valor em
// api/checkout.ts e AfiliadosPage.tsx)
const AFFILIATE_COMMISSION_RATE = 7

const STATUS_VARIANT: Record<SubscriptionStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  trialing: 'warning',
  active: 'success',
  past_due: 'destructive',
  canceled: 'secondary',
  expired: 'secondary',
}

function eligibilityDays(r: ReferralWithStatus): number | null {
  if (r.status !== 'active' || !r.activeSince) return null
  const daysSince = Math.floor((Date.now() - r.activeSince.toMillis()) / 86_400_000)
  if (daysSince >= COMMISSION_WAIT_DAYS) return 0
  return COMMISSION_WAIT_DAYS - daysSince
}

async function fetchReferralsWithStatus(code: string): Promise<ReferralWithStatus[]> {
  if (code === DEMO_REFERRAL_CODE) return DEMO_REFERRALS
  const referrals = await getReferralsByCode(code)
  return Promise.all(
    referrals.map(async (r) => {
      const sub = await getSubscription(r.companyId)
      return { ...r, status: sub?.status, activeSince: sub?.status === 'active' ? sub.activatedAt : undefined }
    }),
  )
}

function statusKey(status: SubscriptionStatus): string {
  if (status === 'past_due') return 'pastDue'
  return status
}

export function AffiliatePanel() {
  const { t } = useTranslation('affiliate')
  const { user, logout, updateLocalUser } = useAuth()
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const code = user?.referralCode ?? ''
  const link = `${window.location.origin}/login?mode=signup&ref=${code}`

  const [cpf, setCpf] = useState(user?.cpf ?? '')
  const [pixKey, setPixKey] = useState(user?.pixKey ?? '')
  const [pixKeyType, setPixKeyType] = useState<PixKeyType | ''>(user?.pixKeyType ?? '')
  const [documentPhotoUrl, setDocumentPhotoUrl] = useState(user?.documentPhotoUrl ?? '')
  const [documentSelfieUrl, setDocumentSelfieUrl] = useState(user?.documentSelfieUrl ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [savingKyc, setSavingKyc] = useState(false)

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['affiliateReferrals', code],
    queryFn: () => fetchReferralsWithStatus(code),
    enabled: !!code,
  })

  const { data: commissions = [] } = useQuery({
    queryKey: ['affiliateCommissions', user?.id],
    queryFn: () =>
      code === DEMO_REFERRAL_CODE ? Promise.resolve(DEMO_COMMISSIONS) : getCommissionsByAffiliate(user!.id),
    enabled: !!user?.id,
  })

  const pendingTotal = commissions
    .filter((c) => c.status === 'pendente' || c.status === 'processando')
    .reduce((sum, c) => sum + c.commissionValue, 0)
  const paidTotal = commissions
    .filter((c) => c.status === 'pago')
    .reduce((sum, c) => sum + c.commissionValue, 0)

  const activeCount = referrals.filter((r) => r.status === 'active').length
  const trialCount = referrals.filter((r) => r.status === 'trialing').length

  const copy = async (value: string, which: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(which)
      toast({ title: which === 'code' ? t('referral.codeCopied') : t('referral.linkCopied') })
      setTimeout(() => setCopied((c) => (c === which ? null : c)), 2000)
    } catch {
      toast({ title: t('referral.copyFailed'), variant: 'destructive' })
    }
  }

  const shareWhatsApp = () => {
    const text = t('referral.shareWhatsAppText', { link })
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const kycComplete = !!(
    user?.cpf && user?.pixKey && user?.documentPhotoUrl && user?.documentSelfieUrl
  )

  const handleSaveKyc = async () => {
    const cpfDigits = cpf.replace(/\D/g, '')
    if (
      cpfDigits.length !== 11 || !pixKey.trim() || !pixKeyType || !documentPhotoUrl ||
      !documentSelfieUrl || !phone.trim()
    ) {
      toast({ title: t('kyc.validationError'), variant: 'destructive' })
      return
    }
    setSavingKyc(true)
    const patch = {
      cpf: cpfDigits,
      pixKey: pixKey.trim(),
      pixKeyType,
      documentPhotoUrl,
      documentSelfieUrl,
      phone: phone.replace(/\D/g, ''),
    }
    try {
      const uid = auth.currentUser?.uid
      if (uid) {
        await setDoc(doc(db, 'users', uid), { ...patch, kycSubmittedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
      }
      updateLocalUser({ ...patch, kycSubmittedAt: Timestamp.now() })
      toast({ title: t('kyc.saveSuccess') })
    } catch {
      toast({ title: t('kyc.saveError'), variant: 'destructive' })
    } finally {
      setSavingKyc(false)
    }
  }

  return (
    <div className="light pb-safe min-h-screen bg-slate-50">
      <header className="pt-safe sticky top-0 z-10 border-b border-[#032B61]/10 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/painel-afiliado" className="flex items-center">
            <img src="/logo-completa-horizontal-alugapro.png" alt="AlugaPro" className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">{user?.name}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} title={t('panel.logout')}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-xl font-bold text-[#032B61]">{t('panel.title')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('panel.subtitle')}
          </p>
        </div>

        <Card className="border-[#032B61]/15 bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('referral.codeLabel')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-[#032B61]/5 px-4 py-2 font-mono text-2xl font-bold tracking-widest text-[#032B61]">
                {code || '------'}
              </span>
              <Button variant="outline" size="sm" onClick={() => copy(code, 'code')}>
                {copied === 'code' ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {t('referral.copyCode')}
              </Button>
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('referral.linkLabel')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {link}
              </code>
              <Button variant="outline" size="sm" onClick={() => copy(link, 'link')}>
                {copied === 'link' ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {t('referral.copyLink')}
              </Button>
              <Button size="sm" className="bg-[#25D366] text-white hover:bg-[#25D366]/90" onClick={shareWhatsApp}>
                <Share2 className="mr-1.5 h-4 w-4" />
                {t('referral.share')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={kycComplete ? 'border-emerald-200' : 'border-amber-200'}>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{t('kyc.title')}</h2>
              {kycComplete ? (
                <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" /> {t('kyc.statusSubmitted')}</Badge>
              ) : (
                <Badge variant="warning" className="gap-1"><ShieldAlert className="h-3 w-3" /> {t('kyc.statusPending')}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('kyc.description').split(t('kyc.privacyPolicy'))[0]}
              <Link to="/politica-de-privacidade" className="underline">{t('kyc.privacyPolicy')}</Link>
              {t('kyc.description').split(t('kyc.privacyPolicy'))[1] ?? ''}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="kyc-cpf">{t('kyc.fields.cpf')}</Label>
                <Input
                  id="kyc-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  placeholder={t('kyc.fields.cpfPlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kyc-pix">{t('kyc.fields.pixKey')}</Label>
                <Input
                  id="kyc-pix"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder={t('kyc.fields.pixKeyPlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kyc-pix-type">{t('kyc.fields.pixKeyType')}</Label>
                <Select value={pixKeyType} onValueChange={(v) => setPixKeyType(v as PixKeyType)}>
                  <SelectTrigger id="kyc-pix-type">
                    <SelectValue placeholder={t('kyc.fields.pixKeyTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {PIX_KEY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{t(`kyc.fields.pixKeyTypes.${type}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kyc-phone">{t('kyc.fields.phone')}</Label>
                <Input
                  id="kyc-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('kyc.fields.phonePlaceholder')}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">{t('kyc.pixPayoutNote')}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <MultiPhotoUpload
                label={t('kyc.fields.documentPhoto')}
                value={documentPhotoUrl ? [documentPhotoUrl] : []}
                onUpload={(file) => uploadAffiliateDocument(user?.id ?? 'afiliado', 'document', file)}
                onChange={(urls) => setDocumentPhotoUrl(urls[0] ?? '')}
                max={1}
              />
              <MultiPhotoUpload
                label={t('kyc.fields.documentSelfie')}
                value={documentSelfieUrl ? [documentSelfieUrl] : []}
                onUpload={(file) => uploadAffiliateDocument(user?.id ?? 'afiliado', 'selfie', file)}
                onChange={(urls) => setDocumentSelfieUrl(urls[0] ?? '')}
                max={1}
              />
            </div>

            <Button onClick={handleSaveKyc} disabled={savingKyc}>
              {savingKyc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('kyc.save')}
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
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('earnings.referrals')}</p>
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
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('earnings.activeClients')}</p>
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
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('earnings.inTrial')}</p>
                <p className="text-lg font-bold">{trialCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <Banknote className="h-4 w-4 text-emerald-600" />
                {t('commissions.title')}
              </h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">
                  {t('commissions.pendingTotal')}: <strong className="text-amber-600">{formatCurrency(pendingTotal)}</strong>
                </span>
                <span className="text-muted-foreground">
                  {t('commissions.paidTotal')}: <strong className="text-emerald-600">{formatCurrency(paidTotal)}</strong>
                </span>
              </div>
            </div>
            {commissions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t('commissions.empty')}
              </div>
            ) : (
              <ul className="divide-y">
                {commissions.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.companyName || c.companyId}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.createdAt?.toDate ? formatDate(c.createdAt.toDate()) : '—'}
                        {c.status === 'pago' && c.paidAt?.toDate
                          ? ` · ${t('commissions.paidOn', { date: formatDate(c.paidAt.toDate()) })}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold">{formatCurrency(c.commissionValue)}</span>
                      <Badge variant={COMMISSION_STATUS_VARIANT[c.status]} className="text-[10px]">
                        {t(`commissions.status.${c.status}`)}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t bg-slate-50/60 px-4 py-2.5 text-[11px] text-muted-foreground">
              {t('commissions.payoutNote')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">{t('earnings.yourReferrals')}</h2>
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
                <p className="mt-3 font-medium text-muted-foreground">{t('earnings.emptyTitle')}</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground/80">
                  {t('earnings.emptyDescription')}
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {referrals.map((r) => {
                  const daysLeft = eligibilityDays(r)
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.companyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.createdAt?.toDate ? formatDate(r.createdAt.toDate()) : '—'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {r.status ? (
                          <Badge variant={STATUS_VARIANT[r.status]}>{t(`status.${statusKey(r.status)}`)}</Badge>
                        ) : (
                          <Badge variant="outline">—</Badge>
                        )}
                        {daysLeft !== null && (
                          <Badge variant={daysLeft === 0 ? 'success' : 'outline'} className="text-[10px]">
                            {daysLeft === 0
                              ? t('commission.eligible')
                              : t('commission.commissionInDays', { days: daysLeft })}
                          </Badge>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="rounded-xl border border-[#032B61]/10 bg-[#032B61]/5 p-4 text-sm text-[#032B61]">
          <p className="font-medium">{t('commission.howPaymentWorks')}</p>
          <p className="mt-1 text-[#032B61]/80">
            {t('commission.description')} {t('commission.waitingPeriodNote')} {t('commission.keepDataUpdated')}
          </p>
        </div>
      </main>
    </div>
  )
}
