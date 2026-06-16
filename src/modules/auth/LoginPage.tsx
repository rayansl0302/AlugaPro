import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useSearchParams, Link } from 'react-router-dom'
import { Loader2, Eye, EyeOff, AlertTriangle, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/useToast'

type LoginRole = 'gestor' | 'inquilino'

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
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})
type LoginData = z.infer<typeof loginSchema>

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirme sua senha'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Senhas não conferem',
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

export function LoginPage() {
  const { user, signIn, signUp, signInWithGoogle, resetPassword } = useAuth()
  const [searchParams] = useSearchParams()
  const [pageMode, setPageMode] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  )
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [role, setRole] = useState<LoginRole>(
    searchParams.get('tab') === 'inquilino' ? 'inquilino' : 'gestor',
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
    return <Navigate to={user.role === 'inquilino' ? '/portal' : '/dashboard'} replace />
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
      toast({ title: 'Erro ao entrar', description: 'E-mail ou senha inválidos.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const onSignupSubmit = async (data: SignupData) => {
    setLoading(true)
    try {
      await signUp(data.name, data.email, data.password)
      toast({ title: 'Conta criada!', description: 'Bem-vindo ao AlugaPro. Seu trial de 14 dias começou.' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      const friendlyMsg = msg.includes('email-already-in-use')
        ? 'Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.'
        : msg.includes('weak-password')
        ? 'Senha muito fraca. Use ao menos 6 caracteres.'
        : 'Não foi possível criar a conta. Tente novamente.'
      toast({ title: 'Erro ao criar conta', description: friendlyMsg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (isLocked) return
    setGoogleLoading(true)
    try {
      await signInWithGoogle(pageMode === 'signup' ? 'gestor' : role)
    } catch {
      toast({ title: 'Erro ao entrar com Google', description: 'Tente novamente.', variant: 'destructive' })
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleForgot = async () => {
    const email = loginForm.getValues('email')
    if (!email) {
      toast({ title: 'Informe seu e-mail', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      await resetPassword(email)
      toast({ title: 'E-mail enviado', description: 'Verifique sua caixa de entrada.' })
      setForgotMode(false)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível enviar o e-mail.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const attemptsUntilLock = LOCKOUT_RULES[0].after - failCount

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="flex w-full max-w-md flex-col items-center">
        <Card className="w-full shadow-xl">
          <CardHeader className="text-center">
            <Link to="/" className="mb-4 inline-block text-xs text-muted-foreground transition-colors hover:text-primary">
              ← Voltar ao site
            </Link>
            <img
              src="/logo-completa-alugapro.png"
              alt="AlugaPro - Gestão Inteligente de Aluguéis"
              className="mx-auto mb-2 w-48"
            />
          </CardHeader>

          <CardContent>
            {pageMode === 'login' ? (
              <>
                {!forgotMode && (
                  <Tabs value={role} onValueChange={(v) => setRole(v as LoginRole)} className="mb-4">
                    <TabsList className="w-full">
                      <TabsTrigger value="gestor" className="flex-1">Gestor</TabsTrigger>
                      <TabsTrigger value="inquilino" className="flex-1">Inquilino</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                {isLocked && (
                  <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Muitas tentativas. Aguarde <strong>{secondsLeft}s</strong> para tentar novamente.</span>
                  </div>
                )}

                {!isLocked && failCount >= 3 && (
                  <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      {attemptsUntilLock > 0
                        ? `Mais ${attemptsUntilLock} tentativa(s) antes do bloqueio temporário.`
                        : 'Próxima falha resultará em bloqueio temporário.'}
                    </span>
                  </div>
                )}

                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      autoComplete="username"
                      disabled={isLocked}
                      {...loginForm.register('email')}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  {!forgotMode && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
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
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
                        Lembrar meu e-mail
                      </label>
                      <Button type="submit" className="w-full" disabled={loading || isLocked}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isLocked ? `Bloqueado (${secondsLeft}s)` : 'Entrar'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setForgotMode(true)}
                        className="w-full text-center text-sm text-muted-foreground hover:text-primary"
                      >
                        Esqueci minha senha
                      </button>
                    </>
                  ) : (
                    <>
                      <Button type="button" className="w-full" onClick={handleForgot} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar e-mail de recuperação
                      </Button>
                      <button
                        type="button"
                        onClick={() => setForgotMode(false)}
                        className="w-full text-center text-sm text-muted-foreground hover:text-primary"
                      >
                        Voltar ao login
                      </button>
                    </>
                  )}
                </form>

                {!forgotMode && (
                  <>
                    <div className="my-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">ou</span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogle}
                      disabled={googleLoading || loading || isLocked}
                    >
                      {googleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <span className="mr-2"><GoogleIcon /></span>
                      )}
                      Entrar com Google
                    </Button>

                    {role === 'gestor' && (
                      <p className="mt-4 text-center text-sm text-muted-foreground">
                        Não tem uma conta?{' '}
                        <button
                          type="button"
                          onClick={() => setPageMode('signup')}
                          className="font-medium text-primary hover:underline"
                        >
                          Criar conta grátis
                        </button>
                      </p>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="mb-5 text-center">
                  <p className="text-sm font-medium text-primary">14 dias grátis · sem cartão de crédito</p>
                </div>

                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Nome completo</Label>
                    <Input
                      id="su-name"
                      type="text"
                      placeholder="Seu nome"
                      autoComplete="name"
                      {...signupForm.register('name')}
                    />
                    {signupForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="su-email">E-mail</Label>
                    <Input
                      id="su-email"
                      type="email"
                      placeholder="seu@email.com"
                      autoComplete="email"
                      {...signupForm.register('email')}
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="su-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="su-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
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

                  <div className="space-y-2">
                    <Label htmlFor="su-confirm">Confirmar senha</Label>
                    <div className="relative">
                      <Input
                        id="su-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Repita a senha"
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

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar conta grátis
                  </Button>
                </form>

                <div className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">ou</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogle}
                  disabled={googleLoading || loading}
                >
                  {googleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <span className="mr-2"><GoogleIcon /></span>
                  )}
                  Cadastrar com Google
                </Button>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Já tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => setPageMode('login')}
                    className="font-medium text-primary hover:underline"
                  >
                    Entrar
                  </button>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {pageMode === 'signup' ? 'Ao criar a conta, você concorda com os' : 'Ao entrar, você concorda com os'}{' '}
          <Link to="/termos" className="underline-offset-2 hover:text-primary hover:underline">
            Termos de Uso
          </Link>{' '}
          e a{' '}
          <Link to="/politica-de-privacidade" className="underline-offset-2 hover:text-primary hover:underline">
            Política de Privacidade
          </Link>.
        </p>
      </div>
    </div>
  )
}
