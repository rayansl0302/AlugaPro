import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { ArrowLeft, Loader2, Phone, ShieldCheck, ShieldAlert, Smartphone, Zap, CreditCard, AlertTriangle } from 'lucide-react'
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
import { PLANS } from '@/types'

const RECAPTCHA_ID = 'recaptcha-profile-container'

function toE164BR(masked: string): string {
  const digits = masked.replace(/\D/g, '')
  return `+55${digits}`
}

const SUB_STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'info' }> = {
  trialing:  { label: 'Trial ativo',        variant: 'info' },
  active:    { label: 'Ativo',              variant: 'success' },
  past_due:  { label: 'Pagamento pendente', variant: 'destructive' },
  canceled:  { label: 'Cancelado',          variant: 'warning' },
  expired:   { label: 'Expirado',           variant: 'secondary' },
  demo:      { label: 'Admin',              variant: 'secondary' },
}

export function ProfilePage() {
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
    toast({ title: 'Telefone verificado com sucesso.' })
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur dark:bg-gray-900/90">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)} title="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img src="/favicon.png" alt="AlugaPro" className="h-7 w-7 object-contain" />
          <span className="font-bold tracking-tight">Meu Perfil</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da conta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="truncate font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Perfil</p>
              <p className="font-medium capitalize">{user.role}</p>
            </div>
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
                  <CreditCard className="h-4 w-4" /> Assinatura
                </CardTitle>
                <Badge variant={SUB_STATUS_BADGE[status]?.variant ?? 'secondary'}>
                  {SUB_STATUS_BADGE[status]?.label ?? status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{PLANS[planId as keyof typeof PLANS]?.name ?? planId}</p>
                {status === 'trialing' && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''} de trial
                  </p>
                )}
                {status === 'demo' && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Conta pendente de ativação
                  </p>
                )}
                {status === 'past_due' && (
                  <p className="text-sm text-destructive">Pagamento falhou — acesso de escrita suspenso</p>
                )}
                {(status === 'expired' || status === 'canceled') && (
                  <p className="text-sm text-muted-foreground">Assine um plano para continuar usando</p>
                )}
                {status === 'active' && (
                  <p className="text-sm text-muted-foreground">Assinatura ativa</p>
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
                  Ativar plano
                </Button>
              )}
              {(status === 'expired' || status === 'canceled') && (
                <Button size="sm" className="gap-1.5 shrink-0" asChild>
                  <Link to="/configuracoes/assinatura"><Zap className="h-3.5 w-3.5" /> Assinar agora</Link>
                </Button>
              )}
              {status === 'past_due' && (
                <Button size="sm" variant="destructive" className="gap-1.5 shrink-0" asChild>
                  <Link to="/configuracoes/assinatura"><AlertTriangle className="h-3.5 w-3.5" /> Regularizar</Link>
                </Button>
              )}
              {status === 'active' && (
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => navigate('/configuracoes/assinatura')}>
                  Gerenciar
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4" /> Celular
              </CardTitle>
              {verified ? (
                <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" /> Verificado</Badge>
              ) : (
                <Badge variant="warning" className="gap-1"><ShieldAlert className="h-3 w-3" /> Não verificado</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasRealAccount && (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
                A verificação por SMS requer login em uma conta real (Firebase). Contas de demonstração não podem verificar o telefone.
              </p>
            )}

            {verified && !editing && (
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">{user.phone ? formatPhone(user.phone) : '—'}</p>
                    <p className="text-xs text-muted-foreground">Número confirmado por SMS</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={startEditing} disabled={!hasRealAccount}>
                  Alterar número
                </Button>
              </div>
            )}

            {(!verified || editing) && (
              <div className="space-y-4">
                {step === 'phone' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Número do celular (com DDD)</Label>
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
                        Enviar código
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Enviaremos um código de 6 dígitos por SMS para confirmar o número.</p>
                  </div>
                )}

                {step === 'code' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Código recebido por SMS</Label>
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
                        Confirmar
                      </Button>
                    </div>
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => { reset(); setCode('') }}>
                      Reenviar código / corrigir número
                    </button>
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                {editing && (
                  <Button variant="ghost" size="sm" onClick={cancelEditing}>Cancelar</Button>
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
