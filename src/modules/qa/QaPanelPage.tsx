import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Loader2, Trash2, FlaskConical } from 'lucide-react'
import i18n from '@/i18n'
import { createOwner, deleteOwner, getOwners } from '@/services/owners'
import { createTenant, deleteTenant, getTenants } from '@/services/tenants'
import { upsertTenantInvite } from '@/services/invites'
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

const schema = z.object({
  ownerName: requiredString(i18n.t('qa:form.validation.ownerName')),
  ownerCpf: z.string().optional(),
  ownerEmail: z.string().email(i18n.t('owners:validation.emailInvalid')).optional().or(z.literal('')),
  ownerPhone: z.string().optional().refine((v) => !v || isValidPhoneBR(v), i18n.t('owners:validation.phoneInvalid')),
  tenantName: requiredString(i18n.t('qa:form.validation.tenantName')),
  tenantCpf: requiredString(i18n.t('qa:form.validation.tenantCpf')),
  tenantEmail: z.string().email(i18n.t('tenants:validation.emailInvalid')).optional().or(z.literal('')),
  tenantPhone: z.string().optional().refine((v) => !v || isValidPhoneBR(v), i18n.t('tenants:validation.phoneInvalid')),
})

type FormData = z.infer<typeof schema>

export function QaPanelPage() {
  const { t } = useTranslation('qa')
  const qc = useQueryClient()

  const { data: owners = [] } = useQuery({
    queryKey: ['qa-owners'],
    queryFn: () => getOwners(QA_COMPANY_ID),
  })
  const { data: tenants = [] } = useQuery({
    queryKey: ['qa-tenants'],
    queryFn: () => getTenants(QA_COMPANY_ID),
  })

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
  })

  const onSubmit = async (data: FormData) => {
    try {
      // addDoc rejeita campos com valor undefined — omite em vez de mandar
      // undefined pros opcionais não preenchidos.
      await createOwner({
        companyId: QA_COMPANY_ID,
        name: data.ownerName,
        ...(data.ownerCpf ? { cpf: data.ownerCpf.replace(/\D/g, '') } : {}),
        ...(data.ownerEmail ? { email: data.ownerEmail } : {}),
        ...(data.ownerPhone ? { phone: data.ownerPhone.replace(/\D/g, '') } : {}),
        active: true,
      })
      const tenantId = await createTenant({
        companyId: QA_COMPANY_ID,
        name: data.tenantName,
        cpf: data.tenantCpf.replace(/\D/g, ''),
        ...(data.tenantEmail ? { email: data.tenantEmail } : {}),
        ...(data.tenantPhone ? { phone: data.tenantPhone.replace(/\D/g, '') } : {}),
        active: true,
      })
      if (data.tenantEmail) {
        try {
          await upsertTenantInvite({ email: data.tenantEmail, companyId: QA_COMPANY_ID, tenantId, name: data.tenantName })
        } catch {
          // Convite é complementar; não bloqueia a criação do registro de teste.
        }
      }
      qc.invalidateQueries({ queryKey: ['qa-owners'] })
      qc.invalidateQueries({ queryKey: ['qa-tenants'] })
      reset()
      toast({ title: t('toast.created') })
    } catch {
      toast({ title: t('toast.createError'), variant: 'destructive' })
    }
  }

  const deleteOwnerMutation = useMutation({
    mutationFn: deleteOwner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-owners'] })
      toast({ title: t('toast.deleted') })
    },
    onError: () => toast({ title: t('toast.deleteError'), variant: 'destructive' }),
  })

  const deleteTenantMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qa-tenants'] })
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

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('ownerSection')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('form.nameRequired')}</Label>
                  <Input placeholder={t('form.namePlaceholder')} className={fieldErrorClass(errors.ownerName)} {...register('ownerName')} />
                  {errors.ownerName && <p className="text-xs text-destructive">{errors.ownerName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('form.cpf')}</Label>
                  <Input
                    placeholder="000.000.000-00"
                    {...register('ownerCpf')}
                    onChange={(e) => setValue('ownerCpf', maskCPF(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('form.email')}</Label>
                  <Input type="email" className={fieldErrorClass(errors.ownerEmail)} {...register('ownerEmail')} />
                  {errors.ownerEmail && <p className="text-xs text-destructive">{errors.ownerEmail.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('form.phone')}</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    className={fieldErrorClass(errors.ownerPhone)}
                    {...register('ownerPhone')}
                    onChange={(e) => setValue('ownerPhone', maskPhone(e.target.value))}
                  />
                  {errors.ownerPhone && <p className="text-xs text-destructive">{errors.ownerPhone.message}</p>}
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('tenantSection')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('form.nameRequired')}</Label>
                  <Input placeholder={t('form.namePlaceholder')} className={fieldErrorClass(errors.tenantName)} {...register('tenantName')} />
                  {errors.tenantName && <p className="text-xs text-destructive">{errors.tenantName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('form.cpfRequired')}</Label>
                  <Input
                    placeholder="000.000.000-00"
                    className={fieldErrorClass(errors.tenantCpf)}
                    {...register('tenantCpf')}
                    onChange={(e) => setValue('tenantCpf', maskCPF(e.target.value))}
                  />
                  {errors.tenantCpf && <p className="text-xs text-destructive">{errors.tenantCpf.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('form.email')}</Label>
                  <Input type="email" className={fieldErrorClass(errors.tenantEmail)} {...register('tenantEmail')} />
                  {errors.tenantEmail && <p className="text-xs text-destructive">{errors.tenantEmail.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('form.phone')}</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    className={fieldErrorClass(errors.tenantPhone)}
                    {...register('tenantPhone')}
                    onChange={(e) => setValue('tenantPhone', maskPhone(e.target.value))}
                  />
                  {errors.tenantPhone && <p className="text-xs text-destructive">{errors.tenantPhone.message}</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('form.create')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('list.ownersTitle')}</CardTitle>
            <CardDescription>{owners.length}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {owners.length === 0 && <p className="text-sm text-muted-foreground">{t('list.empty')}</p>}
            {owners.map((owner) => (
              <div key={owner.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{owner.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{owner.email || owner.cpf || '—'}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  title={t('list.delete')}
                  onClick={() => {
                    if (confirm(t('list.delete'))) deleteOwnerMutation.mutate(owner.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

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
                  <p className="truncate text-sm font-medium">{tenant.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{tenant.email || tenant.cpf}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  title={t('list.delete')}
                  onClick={() => {
                    if (confirm(t('list.delete'))) deleteTenantMutation.mutate(tenant.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
