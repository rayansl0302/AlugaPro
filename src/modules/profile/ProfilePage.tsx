import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import {
  ArrowLeft, Loader2, Phone, ShieldCheck, ShieldAlert, Smartphone, Zap, CreditCard,
  AlertTriangle, Gift, Languages,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { usePhoneVerification } from '@/hooks/usePhoneVerification'
import { auth, db } from '@/lib/firebase'
import { formatPhone, maskPhone, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/useToast'
import { LanguageSelector } from '@/i18n/LanguageSelector'
import { PLANS } from '@/types'
import { getReferral, createReferral } from '@/services/affiliateReferrals'

const RECAPTCHA_ID = 'recaptcha-profile-container'

function toE164BR(masked: string): string {
  const digits = masked.replace(/\D/g, '')
  return `+55${digits}`
}

const SUB_STATUS_BADGE: Record<string, { labelKey: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'info' }> = {
  trialing:  { labelKey: 'subStatus.trialing',  variant: 'info' },
  active:    { labelKey: 'subStatus.active',     variant: 'success' },
  past_due:  { labelKey: 'subStatus.past_due',   variant: 'destructive' },
  canceled:  { labelKey: 'subStatus.canceled',   variant: 'warning' },
  expired:   { labelKey: 'subStatus.expired',    variant: 'secondary' },
  demo:      { labelKey: 'subStatus.demo',       variant: 'secondary' },
}

function AffiliateCodeCard({ companyId, status, name, email }: {
  companyId: string
  status: string
  name: string
  email: string
}) {
  const { t } = useTranslation('profile')
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [linking, setLinking] = useState(false)

  const { data: referral, isLoading } = useQuery({
    queryKey: ['affiliateReferral', companyId],
    queryFn: () => getReferral(companyId),
    enabled: !!companyId,
  })

  const canLink = status !== 'active'

  const handleLink = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      toast({ title: t('affiliate.toastEmptyCode'), variant: 'destructive' })
      return
    }
    if (!confirm(t('affiliate.confirmLink', { code: trimmed }))) {
      return
    }
    setLinking(true)
    try {
      await createReferral(companyId, trimmed, name || email || 'Empresa')
      toast({ title: t('affiliate.toastLinked') })
      qc.invalidateQueries({ queryKey: ['affiliateReferral', companyId] })
    } catch {
      toast({ title: t('affiliate.toastError'), description: t('affiliate.toastErrorDesc'), variant: 'destructive' })
    } finally {
      setLinking(false)
    }
  }

  if (isLoading) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-4 w-4" /> {t('affiliate.cardTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {referral ? (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-green-600" />
            <div>
              <p className="font-medium">{t('affiliate.linked', { code: referral.code })}</p>
              <p className="text-xs text-muted-foreground">{t('affiliate.linkedNote')}</p>
            </div>
          </div>
        ) : canLink ? (
          <>
            <p className="text-sm text-muted-foreground">
              {t('affiliate.explain')}
            </p>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t('affiliate.placeholder')}
                disabled={linking}
              />
              <Button onClick={handleLink} disabled={linking || !code.trim()}>
                {linking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('affiliate.link')}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('affiliate.disabledHint')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function ProfilePage() {
  const { t } = useTranslation('profile')
  const navigate = useNavigate()
  const { user, updateLocalUser, refreshProfile } = useAuth()
  const { status, daysRemaining, isAdmin, planId } = useSubscription()
  const [refreshing, setRefreshing] = useState(false)
  const { step, sending, confirming, error, sendCode, confirmCode, reset } = usePhoneVerification()

  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState(user?.phone ? formatPhone(user.phone) : '')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const verified = !!user.phoneVerified
  const hasRealAccount = !!auth.currentUser
  const phoneDigits = phone.replace(/\D/g, '')
  const phoneValid = phoneDigits.length >= 10 && phoneDigits.length <= 11

  const startEditing = () => {
    reset()
    setCode('')
    setEditing(true)
  }

  const cancelEditing = () => {
    reset()
    setCode('')
    setEditing(false)
    setPhone(user.phone ? formatPhone(user.phone) : '')
  }

  const handleSend = async () => {
    if (!phoneValid) return
    await sendCode(toE164BR(phone), RECAPTCHA_ID)
  }

  const handleConfirm = async () => {
    if (code.replace(/\D/g, '').length < 6) return
    const ok = await confirmCode(code)
    if (!ok) return

    setSaving(true)
    const verifiedAt = new Date().toISOString()
    try {
      const uid = auth.currentUser?.uid
      if (uid) {
        await setDoc(
          doc(db, 'users', uid),
          { phone: phoneDigits, phoneVerified: true, phoneVerifiedAt: verifiedAt, updatedAt: serverTimestamp() },
          { merge: true },
        )
      }
    } catch {
      // Persistência é complementar — a posse já foi comprovada via Firebase Auth.
    } finally {
      setSaving(false)
    }

    updateLocalUser({ phone: phoneDigits, phoneVerified: true, phoneVerifiedAt: verifiedAt })
    setEditing(false)
    setCode('')
    reset()
    toast({ title: t('toastPhoneVerified') })
  }

  return (
    <div className="light pb-safe min-h-screen bg-muted/30">
      <header className="pt-safe sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)} title={t('back')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img src="/favicon.png" alt="AlugaPro" className="h-7 w-7 object-contain" />
          <span className="font-bold tracking-tight">{t('title')}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('personalInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">{t('fields.name')}</p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('fields.email')}</p>
              <p className="truncate font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('fields.role')}</p>
              <p className="font-medium capitalize">{user.role}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Languages className="h-4 w-4" /> {t('language')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('languageHint')}</p>
            <LanguageSelector showLabel />
          </CardContent>
        </Card>

        {user.role !== 'inquilino' && !isAdmin && (
          <Card className={cn(
            'border-2 transition-colors',
            status === 'active'   ? 'border-green-300 dark:border-green-700' :
            status === 'trialing' ? 'border-amber-300 dark:border-amber-700' :
            status === 'past_due' ? 'border-red-400 dark:border-red-700' :
            'border-muted',
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" /> {t('subscription')}
                </CardTitle>
                <Badge variant={SUB_STATUS_BADGE[status]?.variant ?? 'secondary'}>
                  {SUB_STATUS_BADGE[status] ? t(SUB_STATUS_BADGE[status].labelKey) : status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{PLANS[planId as keyof typeof PLANS]?.name ?? planId}</p>
                {status === 'trialing' && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {t('sub.trialDaysLeft', { count: daysRemaining })}
                  </p>
                )}
                {status === 'demo' && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {t('sub.pendingActivation')}
                  </p>
                )}
                {status === 'past_due' && (
                  <p className="text-sm text-destructive">{t('sub.paymentFailed')}</p>
                )}
                {(status === 'expired' || status === 'canceled') && (
                  <p className="text-sm text-muted-foreground">{t('sub.subscribeToPlan')}</p>
                )}
                {status === 'active' && (
                  <p className="text-sm text-muted-foreground">{t('sub.active')}</p>
                )}
              </div>

              {(status === 'trialing' || status === 'demo') && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                  disabled={refreshing}
                  onClick={async () => {
                    if (status === 'demo') {
                      setRefreshing(true)
                      try { await refreshProfile() } finally { setRefreshing(false) }
                    }
                    navigate('/configuracoes/assinatura')
                  }}
                >
                  {refreshing
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Zap className="h-3.5 w-3.5 fill-current" />}
                  {t('sub.activatePlan')}
                </Button>
              )}
              {(status === 'expired' || status === 'canceled') && (
                <Button size="sm" className="gap-1.5 shrink-0" asChild>
                  <Link to="/configuracoes/assinatura"><Zap className="h-3.5 w-3.5" /> {t('sub.subscribeNow')}</Link>
                </Button>
              )}
              {status === 'past_due' && (
                <Button size="sm" variant="destructive" className="gap-1.5 shrink-0" asChild>
                  <Link to="/configuracoes/assinatura"><AlertTriangle className="h-3.5 w-3.5" /> {t('sub.regularize')}</Link>
                </Button>
              )}
              {status === 'active' && (
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => navigate('/configuracoes/assinatura')}>
                  {t('sub.manage')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {user.role === 'gestor' && status !== 'demo' && (
          <AffiliateCodeCard companyId={user.companyId} status={status} name={user.name} email={user.email} />
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4" /> {t('phone')}
              </CardTitle>
              {verified ? (
                <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" /> {t('phoneCard.verified')}</Badge>
              ) : (
                <Badge variant="warning" className="gap-1"><ShieldAlert className="h-3 w-3" /> {t('phoneCard.notVerified')}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasRealAccount && (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
                {t('phoneCard.realAccountRequired')}
              </p>
            )}

            {verified && !editing && (
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">{user.phone ? formatPhone(user.phone) : '—'}</p>
                    <p className="text-xs text-muted-foreground">{t('phoneCard.confirmedBySms')}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={startEditing} disabled={!hasRealAccount}>
                  {t('phoneCard.changeNumber')}
                </Button>
              </div>
            )}

            {(!verified || editing) && (
              <div className="space-y-4">
                {step === 'phone' && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t('phoneCard.numberLabel')}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(maskPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        inputMode="tel"
                        maxLength={15}
                        disabled={!hasRealAccount || sending}
                      />
                      <Button onClick={handleSend} disabled={!hasRealAccount || !phoneValid || sending}>
                        {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('phoneCard.sendCode')}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('phoneCard.smsHint')}</p>
                  </div>
                )}

                {step === 'code' && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t('phoneCard.codeLabel')}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        inputMode="numeric"
                        maxLength={6}
                        disabled={confirming || saving}
                      />
                      <Button onClick={handleConfirm} disabled={code.replace(/\D/g, '').length < 6 || confirming || saving}>
                        {(confirming || saving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('phoneCard.confirm')}
                      </Button>
                    </div>
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => { reset(); setCode('') }}>
                      {t('phoneCard.resendCode')}
                    </button>
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                {editing && (
                  <Button variant="ghost" size="sm" onClick={cancelEditing}>{t('phoneCard.cancel')}</Button>
                )}
              </div>
            )}

            <div id={RECAPTCHA_ID} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
