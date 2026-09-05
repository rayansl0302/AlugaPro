import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Loader2, Trash2, Pencil, FlaskConical, KeyRound, Wand2 } from 'lucide-react'
import i18n from '@/i18n'
import { db, auth } from '@/lib/firebase'
import { User } from '@/types'
import { createTenant, updateTenant, deleteTenant, getTenants } from '@/services/tenants'
import { upsertTenantInvite } from '@/services/invites'
import { EditQaRecordDialog, EditTarget } from './EditQaRecordDialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { maskCPF, maskPhone } from '@/lib/utils'
import { isValidPhoneBR } from '@/lib/documents'
import { fieldErrorClass } from '@/lib/formErrors'
import { requiredString } from '@/lib/validation'
import { toast } from '@/hooks/useToast'

// Empresa isolada só pra registros de teste — nunca aparece nas telas normais
// (Imóveis, Contratos, etc.), que sempre filtram pela companyId real do usuário.
const QA_COMPANY_ID = 'alugapro-qa'
// Afiliados de teste caem na MESMA companyId dos afiliados reais (é assim que
// o cadastro de afiliado de verdade funciona, api/create-affiliate-profile.ts)
// — por isso toda leitura/exclusão aqui filtra também por isQaTest === true,
// pra nunca listar/apagar uma conta de afiliado real.
const AFFILIATE_COMPANY_ID = 'alugapro-afiliados'

async function createQaLogin(payload: {
  email: string
  password: string
  name: string
  role: 'gestor' | 'inquilino' | 'afiliado'
  tenantId?: string
}): Promise<{ uid: string; referralCode?: string }> {
  const idToken = await auth.currentUser?.getIdToken()
  const res = await fetch('/api/qa-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken ?? ''}` },
    body: JSON.stringify({ action: 'create', ...payload }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao criar login de teste')
  return { uid: data.uid as string, referralCode: data.referralCode as string | undefined }
}

async function deleteQaLogin(uid: string): Promise<void> {
  const idToken = await auth.currentUser?.getIdToken()
  const res = await fetch('/api/qa-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken ?? ''}` },
    body: JSON.stringify({ action: 'delete', uid }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Erro ao excluir login de teste')
  }
}

async function getQaGestors(): Promise<User[]> {
  const q = query(
    collection(db, 'users'),
    where('companyId', '==', QA_COMPANY_ID),
    where('role', '==', 'gestor'),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as User))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function randomDigits(n: number): string {
  let s = ''
  for (let i = 0; i < n; i += 1) s += Math.floor(Math.random() * 10)
  return s
}

// Mesmo algoritmo de dígito verificador de isValidCPF (src/lib/documents.ts),
// só que gerando em vez de validando — pra não cair em CPF inválido em telas
// que checam o dígito verificador de verdade.
function generateFakeCPF(): string {
  const calcCheckDigit = (base: string, startFactor: number): number => {
    let total = 0
    let factor = startFactor
    for (const digit of base) {
      total += Number(digit) * factor
      factor -= 1
    }
    const remainder = (total * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  const base = randomDigits(9)
  const d1 = calcCheckDigit(base, 10)
  const d2 = calcCheckDigit(base + d1, 11)
  return `${base}${d1}${d2}`
}

function generateFakePhone(): string {
  const ddd = 11 + Math.floor(Math.random() * 88)
  return `${ddd}9${randomDigits(8)}`
}

const QA_FIRST_NAMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Hugo', 'Isabela', 'João', 'Karina', 'Lucas', 'Marina', 'Nicolas', 'Olivia', 'Pedro', 'Rafaela', 'Samuel', 'Tatiane', 'Vitor']
const QA_LAST_NAMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho']

function generateFakeName(): string {
  const first = QA_FIRST_NAMES[Math.floor(Math.random() * QA_FIRST_NAMES.length)]
  const last = QA_LAST_NAMES[Math.floor(Math.random() * QA_LAST_NAMES.length)]
  return `${first} ${last} QA`
}

function generateFakeEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, '.')
    .replace(/(^\.|\.$)/g, '')
  // Domínio .test é reservado (RFC 2606) — nunca existe de verdade, então
  // esses logins de QA nunca batem em caixa de e-mail real de ninguém.
  return `${slug}.${randomDigits(4)}@alugapro.test`
}

function generateFakePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pass = ''
  for (let i = 0; i < 8; i += 1) pass += chars[Math.floor(Math.random() * chars.length)]
  return pass
}

async function getQaAffiliates(): Promise<User[]> {
  const q = query(
    collection(db, 'users'),
    where('companyId', '==', AFFILIATE_COMPANY_ID),
    where('role', '==', 'afiliado'),
    where('isQaTest', '==', true),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as User))
    .sort((a, b) => a.name.localeCompare(b.name))
}

const tenantSchema = z
  .object({
    name: requiredString(i18n.t('qa:form.validation.tenantName')),
    cpf: requiredString(i18n.t('qa:form.validation.tenantCpf')),
    email: z.string().email(i18n.t('tenants:validation.emailInvalid')).optional().or(z.literal('')),
    phone: z.string().optional().refine((v) => !v || isValidPhoneBR(v), i18n.t('tenants:validation.phoneInvalid')),
    password: z.string().optional().refine((v) => !v || v.length >= 6, i18n.t('qa:form.validation.passwordMin')),
  })
  .refine((d) => !d.password || !!d.email, {
    message: i18n.t('qa:form.validation.tenantEmailForLogin'),
    path: ['email'],
  })
type TenantFormData = z.infer<typeof tenantSchema>

const gestorSchema = z.object({
  name: requiredString(i18n.t('qa:form.validation.gestorName')),
  email: requiredString(i18n.t('qa:form.validation.gestorEmail')).email(i18n.t('auth:emailInvalid')),
  password: requiredString(i18n.t('qa:form.validation.passwordMin')).min(6, i18n.t('qa:form.validation.passwordMin')),
})
type GestorFormData = z.infer<typeof gestorSchema>

const afiliadoSchema = z.object({
  name: requiredString(i18n.t('qa:form.validation.afiliadoName')),
  email: requiredString(i18n.t('qa:form.validation.afiliadoEmail')).email(i18n.t('auth:emailInvalid')),
  password: requiredString(i18n.t('qa:form.validation.passwordMin')).min(6, i18n.t('qa:form.validation.passwordMin')),
})
type AfiliadoFormData = z.infer<typeof afiliadoSchema>

export function QaPanelPage() {
  const { t } = useTranslation('qa')
  const qc = useQueryClient()
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['qa-tenants'] })
    qc.invalidateQueries({ queryKey: ['qa-gestors'] })
    qc.invalidateQueries({ queryKey: ['qa-affiliates'] })
  }

  const { data: tenants = [] } = useQuery({
    queryKey: ['qa-tenants'],
    queryFn: () => getTenants(QA_COMPANY_ID),
  })
  const { data: gestors = [] } = useQuery({
    queryKey: ['qa-gestors'],
    queryFn: getQaGestors,
  })
  const { data: affiliates = [] } = useQuery({
    queryKey: ['qa-affiliates'],
    queryFn: getQaAffiliates,
  })

  const {
    register: registerTenant, handleSubmit: submitTenant, setValue: setTenantValue, reset: resetTenant,
    formState: { errors: tenantErrors, isSubmitting: tenantSubmitting },
  } = useForm<TenantFormData>({ resolver: zodResolver(tenantSchema), mode: 'onTouched' })

  const {
    register: registerGestor, handleSubmit: submitGestor, setValue: setGestorValue, reset: resetGestor,
    formState: { errors: gestorErrors, isSubmitting: gestorSubmitting },
  } = useForm<GestorFormData>({ resolver: zodResolver(gestorSchema), mode: 'onTouched' })

  const {
    register: registerAfiliado, handleSubmit: submitAfiliado, setValue: setAfiliadoValue, reset: resetAfiliado,
    formState: { errors: afiliadoErrors, isSubmitting: afiliadoSubmitting },
  } = useForm<AfiliadoFormData>({ resolver: zodResolver(afiliadoSchema), mode: 'onTouched' })

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: t('generate.copied') })
    } catch {
      toast({ title: t('generate.copyError'), variant: 'destructive' })
    }
  }

  const generateTenantData = () => {
    const name = generateFakeName()
    const cpf = maskCPF(generateFakeCPF())
    const email = generateFakeEmail(name)
    const phone = maskPhone(generateFakePhone())
    const password = generateFakePassword()
    setTenantValue('name', name, { shouldValidate: true })
    setTenantValue('cpf', cpf, { shouldValidate: true })
    setTenantValue('email', email, { shouldValidate: true })
    setTenantValue('phone', phone, { shouldValidate: true })
    setTenantValue('password', password, { shouldValidate: true })
    copyToClipboard(`${t('tenantSection')}\nNome: ${name}\nCPF: ${cpf}\nE-mail: ${email}\nTelefone: ${phone}\nSenha: ${password}`)
  }

  const generateGestorData = () => {
    const name = generateFakeName()
    const email = generateFakeEmail(name)
    const password = generateFakePassword()
    setGestorValue('name', name, { shouldValidate: true })
    setGestorValue('email', email, { shouldValidate: true })
    setGestorValue('password', password, { shouldValidate: true })
    copyToClipboard(`${t('gestorSection')}\nNome: ${name}\nE-mail: ${email}\nSenha: ${password}`)
  }

  const generateAfiliadoData = () => {
    const name = generateFakeName()
    const email = generateFakeEmail(name)
    const password = generateFakePassword()
    setAfiliadoValue('name', name, { shouldValidate: true })
    setAfiliadoValue('email', email, { shouldValidate: true })
    setAfiliadoValue('password', password, { shouldValidate: true })
    copyToClipboard(`${t('afiliadoSection')}\nNome: ${name}\nE-mail: ${email}\nSenha: ${password}`)
  }

  const onSubmitTenant = async (data: TenantFormData) => {
    try {
      const tenantId = await createTenant({
        companyId: QA_COMPANY_ID,
        name: data.name,
        cpf: data.cpf.replace(/\D/g, ''),
        ...(data.email ? { email: data.email } : {}),
        ...(data.phone ? { phone: data.phone.replace(/\D/g, '') } : {}),
        active: true,
      })
      if (data.password && data.email) {
        // Login pronto pro inquilino de teste — pula o convite/autocadastro,
        // já nasce com conta+senha vinculada ao registro de teste.
        const { uid } = await createQaLogin({
          email: data.email,
          password: data.password,
          name: data.name,
          role: 'inquilino',
          tenantId,
        })
        await updateTenant(tenantId, { userId: uid })
      } else if (data.email) {
        try {
          await upsertTenantInvite({ email: data.email, companyId: QA_COMPANY_ID, tenantId, name: data.name })
        } catch {
          // Convite é complementar; não bloqueia a criação do registro de teste.
        }
      }
      qc.invalidateQueries({ queryKey: ['qa-tenants'] })
      resetTenant()
      toast({ title: t('toast.created') })
    } catch {
      toast({ title: t('toast.createError'), variant: 'destructive' })
    }
  }

  const onSubmitGestor = async (data: GestorFormData) => {
    try {
      await createQaLogin({ email: data.email, password: data.password, name: data.name, role: 'gestor' })
      qc.invalidateQueries({ queryKey: ['qa-gestors'] })
      resetGestor()
      toast({ title: t('toast.created') })
    } catch {
      toast({ title: t('toast.createError'), variant: 'destructive' })
    }
  }

  const onSubmitAfiliado = async (data: AfiliadoFormData) => {
    try {
      await createQaLogin({ email: data.email, password: data.password, name: data.name, role: 'afiliado' })
      qc.invalidateQueries({ queryKey: ['qa-affiliates'] })
      resetAfiliado()
      toast({ title: t('toast.created') })
    } catch {
      toast({ title: t('toast.createError'), variant: 'destructive' })
    }
  }

  const deleteTenantMutation = useMutation({
    mutationFn: async (tenant: { id: string; userId?: string }) => {
      if (tenant.userId) await deleteQaLogin(tenant.userId)
      await deleteTenant(tenant.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-tenants'] })
      toast({ title: t('toast.deleted') })
    },
    onError: () => toast({ title: t('toast.deleteError'), variant: 'destructive' }),
  })

  const deleteGestorMutation = useMutation({
    mutationFn: deleteQaLogin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-gestors'] })
      toast({ title: t('toast.deleted') })
    },
    onError: () => toast({ title: t('toast.deleteError'), variant: 'destructive' }),
  })

  const deleteAffiliateMutation = useMutation({
    mutationFn: deleteQaLogin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-affiliates'] })
      toast({ title: t('toast.deleted') })
    },
    onError: () => toast({ title: t('toast.deleteError'), variant: 'destructive' }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FlaskConical className="h-6 w-6 text-primary" />
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('isolationNote')}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={submitTenant(onSubmitTenant)} className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('tenantSection')}
                </h2>
                <Button type="button" variant="outline" size="sm" title={t('generate.hint')} onClick={generateTenantData}>
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  {t('generate.button')}
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('form.nameRequired')}</Label>
                  <Input placeholder={t('form.namePlaceholder')} className={fieldErrorClass(tenantErrors.name)} {...registerTenant('name')} />
                  {tenantErrors.name && <p className="text-xs text-destructive">{tenantErrors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('form.cpfRequired')}</Label>
                  <Input
                    placeholder="000.000.000-00"
                    className={fieldErrorClass(tenantErrors.cpf)}
                    {...registerTenant('cpf')}
                    onChange={(e) => setTenantValue('cpf', maskCPF(e.target.value))}
                  />
                  {tenantErrors.cpf && <p className="text-xs text-destructive">{tenantErrors.cpf.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('form.email')}</Label>
                  <Input type="email" className={fieldErrorClass(tenantErrors.email)} {...registerTenant('email')} />
                  {tenantErrors.email && <p className="text-xs text-destructive">{tenantErrors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('form.phone')}</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    className={fieldErrorClass(tenantErrors.phone)}
                    {...registerTenant('phone')}
                    onChange={(e) => setTenantValue('phone', maskPhone(e.target.value))}
                  />
                  {tenantErrors.phone && <p className="text-xs text-destructive">{tenantErrors.phone.message}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    {t('form.password')}
                  </Label>
                  <Input type="password" autoComplete="new-password" className={fieldErrorClass(tenantErrors.password)} {...registerTenant('password')} />
                  {tenantErrors.password && <p className="text-xs text-destructive">{tenantErrors.password.message}</p>}
                  <p className="text-xs text-muted-foreground">{t('form.tenantPasswordHint')}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={tenantSubmitting}>
                  {tenantSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('form.createTenant')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={submitGestor(onSubmitGestor)} className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('gestorSection')}
                </h2>
                <Button type="button" variant="outline" size="sm" title={t('generate.hint')} onClick={generateGestorData}>
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  {t('generate.button')}
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('form.nameRequired')}</Label>
                  <Input placeholder={t('form.namePlaceholder')} className={fieldErrorClass(gestorErrors.name)} {...registerGestor('name')} />
                  {gestorErrors.name && <p className="text-xs text-destructive">{gestorErrors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('form.emailRequired')}</Label>
                  <Input type="email" className={fieldErrorClass(gestorErrors.email)} {...registerGestor('email')} />
                  {gestorErrors.email && <p className="text-xs text-destructive">{gestorErrors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    {t('form.passwordRequired')}
                  </Label>
                  <Input type="password" autoComplete="new-password" className={fieldErrorClass(gestorErrors.password)} {...registerGestor('password')} />
                  {gestorErrors.password && <p className="text-xs text-destructive">{gestorErrors.password.message}</p>}
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={gestorSubmitting}>
                  {gestorSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('form.createGestor')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={submitAfiliado(onSubmitAfiliado)} className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('afiliadoSection')}
                </h2>
                <Button type="button" variant="outline" size="sm" title={t('generate.hint')} onClick={generateAfiliadoData}>
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  {t('generate.button')}
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('form.nameRequired')}</Label>
                  <Input placeholder={t('form.namePlaceholder')} className={fieldErrorClass(afiliadoErrors.name)} {...registerAfiliado('name')} />
                  {afiliadoErrors.name && <p className="text-xs text-destructive">{afiliadoErrors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('form.emailRequired')}</Label>
                  <Input type="email" className={fieldErrorClass(afiliadoErrors.email)} {...registerAfiliado('email')} />
                  {afiliadoErrors.email && <p className="text-xs text-destructive">{afiliadoErrors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    {t('form.passwordRequired')}
                  </Label>
                  <Input type="password" autoComplete="new-password" className={fieldErrorClass(afiliadoErrors.password)} {...registerAfiliado('password')} />
                  {afiliadoErrors.password && <p className="text-xs text-destructive">{afiliadoErrors.password.message}</p>}
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={afiliadoSubmitting}>
                  {afiliadoSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('form.createAfiliado')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('list.tenantsTitle')}</CardTitle>
            <CardDescription>{tenants.length}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tenants.length === 0 && <p className="text-sm text-muted-foreground">{t('list.empty')}</p>}
            {tenants.map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {tenant.name}
                    {tenant.userId && (
                      <span title={t('list.hasLogin')}>
                        <KeyRound className="h-3 w-3 shrink-0 text-emerald-600" />
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{tenant.email || tenant.cpf}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t('edit.title')}
                    onClick={() => setEditTarget({ kind: 'tenant', record: tenant })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    title={t('list.delete')}
                    onClick={() => {
                      if (confirm(t('list.delete'))) deleteTenantMutation.mutate({ id: tenant.id, userId: tenant.userId })
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('list.gestorsTitle')}</CardTitle>
            <CardDescription>{gestors.length}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {gestors.length === 0 && <p className="text-sm text-muted-foreground">{t('list.empty')}</p>}
            {gestors.map((gestor) => (
              <div key={gestor.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{gestor.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{gestor.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t('edit.title')}
                    onClick={() => setEditTarget({ kind: 'gestor', record: gestor })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    title={t('list.delete')}
                    onClick={() => {
                      if (confirm(t('list.delete'))) deleteGestorMutation.mutate(gestor.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('list.affiliatesTitle')}</CardTitle>
            <CardDescription>{affiliates.length}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {affiliates.length === 0 && <p className="text-sm text-muted-foreground">{t('list.empty')}</p>}
            {affiliates.map((affiliate) => (
              <div key={affiliate.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{affiliate.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {affiliate.email}{affiliate.referralCode ? ` — ${affiliate.referralCode}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t('edit.title')}
                    onClick={() => setEditTarget({ kind: 'afiliado', record: affiliate })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    title={t('list.delete')}
                    onClick={() => {
                      if (confirm(t('list.delete'))) deleteAffiliateMutation.mutate(affiliate.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <EditQaRecordDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={invalidateAll}
      />
    </div>
  )
}
