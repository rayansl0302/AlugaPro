import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, KeyRound } from 'lucide-react'
import { Owner, Tenant, User } from '@/types'
import { auth } from '@/lib/firebase'
import { updateOwner } from '@/services/owners'
import { updateTenant } from '@/services/tenants'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { maskCPF, maskPhone } from '@/lib/utils'
import { toast } from '@/hooks/useToast'

export type EditTarget =
  | { kind: 'owner'; record: Owner }
  | { kind: 'tenant'; record: Tenant }
  | { kind: 'gestor' | 'afiliado'; record: User }

interface Props {
  target: EditTarget | null
  onClose: () => void
  onSaved: () => void
}

async function updateQaLogin(payload: { uid: string; name?: string; password?: string }): Promise<void> {
  const idToken = await auth.currentUser?.getIdToken()
  const res = await fetch('/api/qa-update-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken ?? ''}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Erro ao atualizar login de teste')
  }
}

async function createQaLogin(payload: {
  email: string
  password: string
  name: string
  role: 'inquilino'
  tenantId: string
}): Promise<{ uid: string }> {
  const idToken = await auth.currentUser?.getIdToken()
  const res = await fetch('/api/qa-create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken ?? ''}` },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao criar login de teste')
  return { uid: data.uid as string }
}

export function EditQaRecordDialog({ target, onClose, onSaved }: Props) {
  const { t } = useTranslation('qa')
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!target) return
    setName(target.record.name)
    setPassword('')
    if (target.kind === 'owner' || target.kind === 'tenant') {
      setCpf(target.record.cpf ? maskCPF(target.record.cpf) : '')
      setEmail(target.record.email ?? '')
      setPhone(target.record.phone ? maskPhone(target.record.phone) : '')
    } else {
      setEmail(target.record.email ?? '')
      setCpf('')
      setPhone('')
    }
  }, [target])

  if (!target) return null

  const tenantHasLogin = target.kind === 'tenant' && !!target.record.userId
  const showPasswordField = target.kind === 'gestor' || target.kind === 'afiliado' || target.kind === 'tenant'
  const emailEditable = target.kind === 'owner' || target.kind === 'tenant'
  const showCpfPhone = target.kind === 'owner' || target.kind === 'tenant'

  const handleSave = async () => {
    if (password && password.length < 6) {
      toast({ title: t('form.validation.passwordMin'), variant: 'destructive' })
      return
    }
    if (password && target.kind === 'tenant' && !target.record.userId && !email) {
      toast({ title: t('form.validation.tenantEmailForLogin'), variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      if (target.kind === 'owner') {
        await updateOwner(target.record.id, {
          name,
          ...(cpf ? { cpf: cpf.replace(/\D/g, '') } : {}),
          ...(email ? { email } : {}),
          ...(phone ? { phone: phone.replace(/\D/g, '') } : {}),
        })
      } else if (target.kind === 'tenant') {
        await updateTenant(target.record.id, {
          name,
          ...(cpf ? { cpf: cpf.replace(/\D/g, '') } : {}),
          ...(email ? { email } : {}),
          ...(phone ? { phone: phone.replace(/\D/g, '') } : {}),
        })
        if (password) {
          if (target.record.userId) {
            await updateQaLogin({ uid: target.record.userId, name, password })
          } else {
            const { uid } = await createQaLogin({ email, password, name, role: 'inquilino', tenantId: target.record.id })
            await updateTenant(target.record.id, { userId: uid })
          }
        }
      } else {
        await updateQaLogin({ uid: target.record.id, name, ...(password ? { password } : {}) })
      }
      toast({ title: t('toast.updated') })
      onSaved()
      onClose()
    } catch {
      toast({ title: t('toast.updateError'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('edit.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('form.nameRequired')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {showCpfPhone && (
            <div className="space-y-2">
              <Label>{t('form.cpf')}</Label>
              <Input placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} />
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('form.email')}</Label>
            <Input type="email" value={email} disabled={!emailEditable} onChange={(e) => setEmail(e.target.value)} />
            {!emailEditable && <p className="text-xs text-muted-foreground">{t('edit.emailLocked')}</p>}
          </div>
          {showCpfPhone && (
            <div className="space-y-2">
              <Label>{t('form.phone')}</Label>
              <Input placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
            </div>
          )}
          {showPasswordField && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                {target.kind === 'tenant' && !tenantHasLogin ? t('edit.setPassword') : t('edit.newPassword')}
              </Label>
              <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {target.kind === 'tenant' && !tenantHasLogin ? t('edit.setPasswordHint') : t('edit.newPasswordHint')}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('edit.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('edit.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
