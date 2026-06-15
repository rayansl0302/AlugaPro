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

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})
type FormData = z.infer<typeof schema>

// Lockout thresholds: after N failures, lock for X seconds
const LOCKOUT_RULES = [
  { after: 5, seconds: 30 },
  { after: 8, seconds: 300 },  // 5 min
  { after: 12, seconds: 900 }, // 15 min
]

const REMEMBER_KEY = 'alugapro_remember'

function loadRememberedEmail(): string {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY)
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    // Support legacy format that may have stored {email, password} — only use email
    return typeof parsed === 'string' ? parsed : (parsed?.email ?? '')
  } catch {
    return ''
  }
}

export function LoginPage() {
  const { user, signIn, signInWithGoogle, resetPassword } = useAuth()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [role, setRole] = useState<LoginRole>(
    searchParams.get('tab') === 'inquilino' ? 'inquilino' : 'gestor',
  )

  const rememberedEmail = loadRememberedEmail()
  const [remember, setRemember] = useState(!!rememberedEmail)

  // Brute-force protection — NOT persisted across page reloads intentionally
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

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: rememberedEmail, password: '' },
  })

  if (user) {
    return <Navigate to={user.role === 'inquilino' ? '/portal' : '/dashboard'} replace />
  }

  const onSubmit = async (data: FormData) => {
    if (isLocked) return
    setLoading(true)
    try {
      await signIn(data.email, data.password, role)
      // G1: persist only email, never password
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

  const handleGoogle = async () => {
    if (isLocked) return
    setGoogleLoading(true)
    try {
      await signInWithGoogle(role)
    } catch {
      toast({ title: 'Erro ao entrar com Google', description: 'Tente novamente.', variant: 'destructive' })
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleForgot = async () => {
    const email = getValues('email')
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
          {!forgotMode && (
            <Tabs value={role} onValueChange={(v) => setRole(v as LoginRole)} className="mb-4">
              <TabsList className="w-full">
                <TabsTrigger value="gestor" className="flex-1">Gestor</TabsTrigger>
                <TabsTrigger value="inquilino" className="flex-1">Inquilino</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Lockout banner */}
          {isLocked && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                Muitas tentativas. Aguarde <strong>{secondsLeft}s</strong> para tentar novamente.
              </span>
            </div>
          )}

          {/* Warning before lockout */}
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="username"
                disabled={isLocked}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
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
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
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
                  <span className="mr-2">
                    <GoogleIcon />
                  </span>
                )}
                Entrar com Google
              </Button>
            </>
          )}
        </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao entrar, você concorda com os{' '}
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
