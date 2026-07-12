import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Eye, EyeOff, AlertTriangle, Clock, Building2, User, Info, CheckCircle, Gift } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/useToast'
import i18n from '@/i18n'
import { LanguageSelector } from '@/i18n/LanguageSelector'
import { cn } from '@/lib/utils'

type LoginRole = 'gestor' | 'inquilino' | 'afiliado'

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

const loginSchema = z.object({
  email: z.string().email(i18n.t('auth:messages.emailInvalid')),
  password: z.string().min(6, i18n.t('auth:messages.passwordMin')),
})
type LoginData = z.infer<typeof loginSchema>

const signupSchema = z.object({
  name: z.string().min(2, i18n.t('auth:messages.nameMin')),
  email: z.string().email(i18n.t('auth:messages.emailInvalid')),
  password: z.string().min(6, i18n.t('auth:messages.passwordMin')),
  confirmPassword: z.string().min(1, i18n.t('auth:messages.confirmRequired')),
}).refine(d => d.password === d.confirmPassword, {
  message: i18n.t('auth:messages.passwordsMismatch'),
  path: ['confirmPassword'],
})
type SignupData = z.infer<typeof signupSchema>

const LOCKOUT_RULES = [
  { after: 5, seconds: 30 },
  { after: 8, seconds: 300 },
  { after: 12, seconds: 900 },
]

const REMEMBER_KEY = 'alugapro_remember'

function loadRememberedEmail(): string {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY)
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    return typeof parsed === 'string' ? parsed : (parsed?.email ?? '')
  } catch {
    return ''
  }
}

const GESTOR_FEATURE_KEYS = ['portfolio', 'contracts', 'charges', 'dashboard', 'tenants', 'trial'] as const
const INQUILINO_FEATURE_KEYS = ['contract', 'payments', 'receipts', 'notifications'] as const
const AFILIADO_FEATURE_KEYS = ['code', 'panel', 'commission', 'freedom'] as const

function RoleInfoCard({ selectedRole }: { selectedRole: LoginRole }) {
  const { t } = useTranslation('auth')

  return (
    <Card className="hidden lg:flex flex-col h-fit shadow-xl">
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold text-base text-foreground">{t('hints.roleQuestion')}</h3>

        <div className={cn(
          'rounded-xl border-2 p-4 transition-all duration-200',
          selectedRole === 'gestor' ? 'border-primary bg-primary/5' : 'border-border opacity-60',
        )}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={cn(
              'rounded-lg p-1.5 transition-colors',
              selectedRole === 'gestor' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}>
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-sm">{t('hints.gestor.title')}</p>
              <p className="text-xs text-muted-foreground">{t('hints.gestor.description')}</p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {GESTOR_FEATURE_KEYS.map(key => (
              <li key={key} className="flex items-start gap-2 text-sm">
                <CheckCircle className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', selectedRole === 'gestor' ? 'text-primary' : 'text-muted-foreground')} />
                <span>{t(`hints.gestor.features.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn(
          'rounded-xl border-2 p-4 transition-all duration-200',
          selectedRole === 'inquilino' ? 'border-primary bg-primary/5' : 'border-border opacity-60',
        )}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={cn(
              'rounded-lg p-1.5 transition-colors',
              selectedRole === 'inquilino' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}>
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-sm">{t('hints.inquilino.title')}</p>
              <p className="text-xs text-muted-foreground">{t('hints.inquilino.description')}</p>
            </div>
          </div>
          <ul className="space-y-1.5 mb-3">
            {INQUILINO_FEATURE_KEYS.map(key => (
              <li key={key} className="flex items-start gap-2 text-sm">
                <CheckCircle className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', selectedRole === 'inquilino' ? 'text-primary' : 'text-muted-foreground')} />
                <span>{t(`hints.inquilino.features.${key}`)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs text-blue-700">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{t('hints.inquilino.inviteHint')}</span>
          </div>
        </div>

        <div className={cn(
          'rounded-xl border-2 p-4 transition-all duration-200',
          selectedRole === 'afiliado' ? 'border-primary bg-primary/5' : 'border-border opacity-60',
        )}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={cn(
              'rounded-lg p-1.5 transition-colors',
              selectedRole === 'afiliado' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}>
              <Gift className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-sm">{t('hints.afiliado.title')}</p>
              <p className="text-xs text-muted-foreground">{t('hints.afiliado.description')}</p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {AFILIADO_FEATURE_KEYS.map(key => (
              <li key={key} className="flex items-start gap-2 text-sm">
                <CheckCircle className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', selectedRole === 'afiliado' ? 'text-primary' : 'text-muted-foreground')} />
                <span>{t(`hints.afiliado.features.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export function LoginPage() {
  const { t } = useTranslation('auth')
  const { user, signIn, signUp, signInWithGoogle, resetPassword } = useAuth()
  const [searchParams] = useSearchParams()
  const [refCode, setRefCode] = useState(searchParams.get('ref') ?? '')
  const tabParam = searchParams.get('tab')
  const [pageMode, setPageMode] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' || !!refCode ? 'signup' : 'login',
  )
  const [signupRole, setSignupRole] = useState<LoginRole>(
    tabParam === 'afiliado' ? 'afiliado' : 'gestor',
  )
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [role, setRole] = useState<LoginRole>(
    tabParam === 'inquilino' ? 'inquilino' : tabParam === 'afiliado' ? 'afiliado' : 'gestor',
  )

  const rememberedEmail = loadRememberedEmail()
  const [remember, setRemember] = useState(!!rememberedEmail)

  const [failCount, setFailCount] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!lockedUntil) return
    const tick = setInterval(() => {
      const remaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockedUntil(null)
        setSecondsLeft(0)
      } else {
        setSecondsLeft(remaining)
      }
    }, 500)
    return () => clearInterval(tick)
  }, [lockedUntil])

  const isLocked = !!lockedUntil && lockedUntil > new Date()

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: rememberedEmail, password: '' },
  })

  const signupForm = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  if (user) {
    const dest =
      user.role === 'inquilino' ? '/portal'
      : user.role === 'afiliado' ? '/painel-afiliado'
      : '/dashboard'
    return <Navigate to={dest} replace />
  }

  const onLoginSubmit = async (data: LoginData) => {
    if (isLocked) return
    setLoading(true)
    try {
      await signIn(data.email, data.password, role)
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: data.email }))
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
      setFailCount(0)
    } catch {
      const next = failCount + 1
      setFailCount(next)
      const lockRule = [...LOCKOUT_RULES].reverse().find(r => next >= r.after)
      if (lockRule) {
        const until = new Date(Date.now() + lockRule.seconds * 1000)
        setLockedUntil(until)
        setSecondsLeft(lockRule.seconds)
      }
      toast({ title: t('messages.loginError'), description: t('messages.invalidCredentials'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const onSignupSubmit = async (data: SignupData) => {
    setLoading(true)
    try {
      await signUp(data.name, data.email, data.password, signupRole, signupRole === 'gestor' ? (refCode.trim() || undefined) : undefined)
      toast({
        title: t('messages.accountCreated'),
        description: signupRole === 'gestor'
          ? t('messages.trialStarted')
          : signupRole === 'afiliado'
          ? t('messages.affiliateCreated')
          : t('messages.tenantCreated'),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      const friendlyMsg = msg.includes('email-already-in-use')
        ? t('messages.emailAlreadyInUse')
        : msg.includes('weak-password')
        ? t('messages.weakPassword')
        : t('messages.signupFailed')
      toast({ title: t('messages.signupError'), description: friendlyMsg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (isLocked) return
    setGoogleLoading(true)
    try {
      const effectiveRole = pageMode === 'signup' ? signupRole : role
      await signInWithGoogle(effectiveRole, pageMode === 'signup' && effectiveRole === 'gestor' ? (refCode.trim() || undefined) : undefined)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: t('messages.googleError'), description: msg || t('messages.signupFailed'), variant: 'destructive' })
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleForgot = async () => {
    const email = loginForm.getValues('email')
    if (!email) {
      toast({ title: t('messages.emailRequired'), variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      await resetPassword(email)
      toast({ title: t('messages.resetSent'), description: t('messages.resetSentDescription') })
      setForgotMode(false)
    } catch {
      toast({ title: t('messages.loginError'), description: t('messages.resetFailed'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const attemptsUntilLock = LOCKOUT_RULES[0].after - failCount

  return (
    <div className="light pt-safe pb-safe flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className={cn(
        'flex w-full flex-col items-center gap-4',
        pageMode === 'signup' ? 'max-w-4xl' : 'max-w-md',
      )}>

        {pageMode === 'signup' ? (
          <div className="grid w-full items-start gap-6 lg:grid-cols-[460px_1fr]">

            {/* Left: signup form */}
            <Card className="w-full shadow-xl">
              <CardHeader className="text-center pb-2">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <Link to="/" className="inline-block text-xs text-muted-foreground transition-colors hover:text-primary">
                    {t('buttons.backToSite')}
                  </Link>
                  <LanguageSelector />
                </div>
                <img
                  src="/logo-completa-alugapro.png"
                  alt="AlugaPro"
                  className="mx-auto mb-2 w-44"
                />
              </CardHeader>

              <CardContent>
                {refCode && signupRole === 'gestor' && (
                  <div className="mb-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                    <Gift className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{t('signup.referredByPartner')}</span>
                  </div>
                )}

                {/* Role selector */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <button
                    type="button"
                    onClick={() => setSignupRole('gestor')}
                    className={cn(
                      'rounded-xl border-2 p-3 text-left transition-all',
                      signupRole === 'gestor'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40',
                    )}
                  >
                    <Building2 className={cn('h-5 w-5 mb-1.5', signupRole === 'gestor' ? 'text-primary' : 'text-muted-foreground')} />
                    <p className="font-semibold text-sm">{t('tabs.gestor')}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{t('hints.gestorShort')}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupRole('inquilino')}
                    className={cn(
                      'rounded-xl border-2 p-3 text-left transition-all',
                      signupRole === 'inquilino'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40',
                    )}
                  >
                    <User className={cn('h-5 w-5 mb-1.5', signupRole === 'inquilino' ? 'text-primary' : 'text-muted-foreground')} />
                    <p className="font-semibold text-sm">{t('tabs.inquilino')}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{t('hints.inquilinoShort')}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupRole('afiliado')}
                    className={cn(
                      'rounded-xl border-2 p-3 text-left transition-all',
                      signupRole === 'afiliado'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40',
                    )}
                  >
                    <Gift className={cn('h-5 w-5 mb-1.5', signupRole === 'afiliado' ? 'text-primary' : 'text-muted-foreground')} />
                    <p className="font-semibold text-sm">{t('tabs.afiliado')}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{t('hints.afiliadoShort')}</p>
                  </button>
                </div>

                {signupRole === 'gestor' && (
                  <p className="mb-4 text-center text-sm font-medium text-primary">
                    {t('signup.gestorOffer')}
                  </p>
                )}

                {signupRole === 'afiliado' && (
                  <p className="mb-4 text-center text-sm font-medium text-primary">
                    {t('signup.afiliadoOffer')}
                  </p>
                )}

                {signupRole === 'inquilino' && (
                  <div className="mb-4 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-700">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{t('hints.inquilino.inviteHint')}</span>
                  </div>
                )}

                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="su-name">{t('fields.name')}</Label>
                    <Input id="su-name" type="text" placeholder={t('fields.namePlaceholder')} autoComplete="name" {...signupForm.register('name')} />
                    {signupForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="su-email">{t('fields.email')}</Label>
                    <Input id="su-email" type="email" placeholder={t('fields.emailPlaceholder')} autoComplete="email" {...signupForm.register('email')} />
                    {signupForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  {signupRole === 'gestor' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="su-refcode">{t('fields.referralCode')}</Label>
                      <Input
                        id="su-refcode"
                        type="text"
                        placeholder={t('fields.referralPlaceholder')}
                        value={refCode}
                        onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="su-password">{t('fields.password')}</Label>
                    <div className="relative">
                      <Input
                        id="su-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('fields.passwordPlaceholder')}
                        className="pr-10"
                        autoComplete="new-password"
                        {...signupForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="su-confirm">{t('fields.confirmPassword')}</Label>
                    <div className="relative">
                      <Input
                        id="su-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder={t('fields.confirmPasswordPlaceholder')}
                        className="pr-10"
                        autoComplete="new-password"
                        {...signupForm.register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full mt-2" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {signupRole === 'gestor' ? t('signup.createFree') : t('signup.create')}
                  </Button>
                </form>

                <div className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">{t('orContinueWith')}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={googleLoading || loading}>
                  {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <span className="mr-2"><GoogleIcon /></span>}
                  {t('buttons.googleSignup')}
                </Button>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  {t('signup.alreadyHaveAccount')}{' '}
                  <button type="button" onClick={() => setPageMode('login')} className="font-medium text-primary hover:underline">
                    {t('buttons.login')}
                  </button>
                </p>
              </CardContent>
            </Card>

            {/* Right: role info card */}
            <RoleInfoCard selectedRole={signupRole} />
          </div>

        ) : (

          <Card className="w-full shadow-xl">
            <CardHeader className="text-center">
              <div className="mb-4 flex items-center justify-between gap-2">
                <Link to="/" className="inline-block text-xs text-muted-foreground transition-colors hover:text-primary">
                  {t('buttons.backToSite')}
                </Link>
                <LanguageSelector />
              </div>
              <img
                src="/logo-completa-alugapro.png"
                alt="AlugaPro - Gestão Inteligente de Aluguéis"
                className="mx-auto mb-2 w-48"
              />
            </CardHeader>

            <CardContent>
              {!forgotMode && (
                <Tabs value={role} onValueChange={(v) => setRole(v as LoginRole)} className="mb-4">
                  <TabsList className="w-full">
                    <TabsTrigger value="gestor" className="flex-1">{t('tabs.gestor')}</TabsTrigger>
                    <TabsTrigger value="inquilino" className="flex-1">{t('tabs.inquilino')}</TabsTrigger>
                    <TabsTrigger value="afiliado" className="flex-1">{t('tabs.afiliado')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {isLocked && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>{t('messages.locked', { seconds: secondsLeft })}</span>
                </div>
              )}

              {!isLocked && failCount >= 3 && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    {attemptsUntilLock > 0
                      ? t('messages.attemptsWarning', { count: attemptsUntilLock })
                      : t('messages.nextFailLocks')}
                  </span>
                </div>
              )}

              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('fields.email')}</Label>
                  <Input id="email" type="email" placeholder={t('fields.emailPlaceholder')} autoComplete="username" disabled={isLocked} {...loginForm.register('email')} />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                {!forgotMode && (
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('fields.password')}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pr-10"
                        autoComplete="current-password"
                        disabled={isLocked}
                        {...loginForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                )}

                {!forgotMode ? (
                  <>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
                      {t('rememberMe')}
                    </label>
                    <Button type="submit" className="w-full" disabled={loading || isLocked}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isLocked ? t('messages.lockedButton', { seconds: secondsLeft }) : t('buttons.login')}
                    </Button>
                    <button type="button" onClick={() => setForgotMode(true)} className="w-full text-center text-sm text-muted-foreground hover:text-primary">
                      {t('buttons.forgotPassword')}
                    </button>
                  </>
                ) : (
                  <>
                    <Button type="button" className="w-full" onClick={handleForgot} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('buttons.resetPassword')}
                    </Button>
                    <button type="button" onClick={() => setForgotMode(false)} className="w-full text-center text-sm text-muted-foreground hover:text-primary">
                      {t('buttons.backToLogin')}
                    </button>
                  </>
                )}
              </form>

              {!forgotMode && (
                <>
                  <div className="my-4 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">{t('orContinueWith')}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={googleLoading || loading || isLocked}>
                    {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <span className="mr-2"><GoogleIcon /></span>}
                    {t('buttons.googleLogin')}
                  </Button>

                  {(role === 'gestor' || role === 'afiliado') && (
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                      {t('signup.noAccount')}{' '}
                      <button
                        type="button"
                        onClick={() => { setSignupRole(role); setPageMode('signup') }}
                        className="font-medium text-primary hover:underline"
                      >
                        {t('buttons.startTrial')}
                      </button>
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        <p className="mt-2 text-center text-xs text-muted-foreground">
          {pageMode === 'signup' ? t('terms.signupPrefix') : t('terms.loginPrefix')}{' '}
          <Link to="/termos" className="underline-offset-2 hover:text-primary hover:underline">{t('terms.termsOfUse')}</Link>{' '}
          {t('terms.and')}{' '}
          <Link to="/politica-de-privacidade" className="underline-offset-2 hover:text-primary hover:underline">{t('terms.privacyPolicy')}</Link>.
        </p>
      </div>
    </div>
  )
}
