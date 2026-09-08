import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import {
  EmailAuthProvider, reauthenticateWithCredential, updatePassword, type AuthError,
} from 'firebase/auth'
import {
  ArrowLeft, Loader2, Phone, ShieldCheck, ShieldAlert, Smartphone, Zap, CreditCard,
  AlertTriangle, Gift, Languages, KeyRound, Camera,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { usePhoneVerification } from '@/hooks/usePhoneVerification'
import { auth, db } from '@/lib/firebase'
import { formatPhone, maskPhone, cn, getInitials } from '@/lib/utils'
import { compressImageFile } from '@/lib/imageCompress'
import { uploadUserAvatar } from '@/services/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { toast } from '@/hooks/useToast'
import { LanguageSelector } from '@/i18n/LanguageSelector'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { PLANS } from '@/types'
import { getReferral, createReferral } from '@/services/affiliateReferrals'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

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

function passwordErrorMessage(t: (key: string) => string, code?: string): string {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return t('password.errorWrongCurrent')
    case 'auth/weak-password':
      return t('password.errorWeak')
    case 'auth/too-many-requests':
      return t('password.errorTooMany')
    default:
      return t('password.errorGeneric')
  }
}

// Só mostra pra contas que têm senha de verdade (login por e-mail/senha) —
// contas que só entram via Google não têm senha nenhuma pra "trocar" aqui.
function ChangePasswordCard() {
  const { t } = useTranslation('profile')
  const [changing, setChanging] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setChanging(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleSave = async () => {
    const fbUser = auth.currentUser
    if (!fbUser?.email) return

    if (newPassword.length < 6) {
      toast({ title: t('password.errorWeak'), variant: 'destructive' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t('password.errorMismatch'), variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const credential = EmailAuthProvider.credential(fbUser.email, currentPassword)
      await reauthenticateWithCredential(fbUser, credential)
      await updatePassword(fbUser, newPassword)
      toast({ title: t('password.toastSuccess') })
      reset()
    } catch (err) {
      toast({ title: passwordErrorMessage(t, (err as AuthError)?.code), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" /> {t('password.cardTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!changing ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t('password.hint')}</p>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setChanging(true)}>
              {t('password.change')}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>{t('password.current')}</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('password.new')}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('password.confirm')}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('password.save')}
              </Button>
              <Button variant="ghost" onClick={reset} disabled={saving}>
                {t('password.cancel')}
              </Button>
            </div>
          </>
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarSelect = async (file: File) => {
    if (!user) return
    if (!file.type.startsWith('image/')) {
      toast({ title: t('avatar.invalidType'), variant: 'destructive' })
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: t('avatar.tooLarge'), variant: 'destructive' })
      return
    }
    setUploadingAvatar(true)
    try {
      const compressed = await compressImageFile(file)
      const url = await uploadUserAvatar(user.companyId, user.id, compressed)
      await setDoc(doc(db, 'users', user.id), { avatar: url, updatedAt: serverTimestamp() }, { merge: true })
      updateLocalUser({ avatar: url })
      toast({ title: t('avatar.toastSuccess') })
    } catch {
      toast({ title: t('avatar.toastError'), variant: 'destructive' })
    } finally {
      setUploadingAvatar(false)
    }
  }

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
    <div className="pb-safe min-h-screen bg-muted/30">
      <header className="pt-safe sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)} title={t('back')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src="/favicon.png" alt="AlugaPro" className="h-7 w-7 object-contain dark:brightness-0 dark:invert" />
            <span className="font-bold tracking-tight">{t('title')}</span>
          </div>
          <ThemeToggle className="h-8 w-8" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('personalInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-4 sm:col-span-2">
              <button
                type="button"
                onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
                className="group relative shrink-0"
                title={t('avatar.change')}
              >
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  {uploadingAvatar ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleAvatarSelect(file)
                  e.target.value = ''
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
              >
                {uploadingAvatar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('avatar.change')}
              </Button>
            </div>
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

        {auth.currentUser?.providerData.some((p) => p.providerId === 'password') && (
          <ChangePasswordCard />
        )}

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
