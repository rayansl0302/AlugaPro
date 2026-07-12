import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { Tenant } from '@/types'
import { createTenant, updateTenant } from '@/services/tenants'
import { upsertTenantInvite } from '@/services/invites'
import { uploadTenantPhoto } from '@/services/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReceiptUpload } from '@/components/shared/ReceiptUpload'
import { maskCPF, maskRG, maskPhone } from '@/lib/utils'
import { isValidCPF, isValidPhoneBR, isValidRG } from '@/lib/documents'
import { fieldErrorClass } from '@/lib/formErrors'
import { requiredString } from '@/lib/validation'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  name: requiredString(i18n.t('tenants:validation.nameRequired')),
  cpf: z.string().refine(isValidCPF, i18n.t('tenants:validation.cpfInvalid')),
  rg: z.string().optional().refine((v) => !v || isValidRG(v), i18n.t('tenants:validation.rgInvalid')),
  email: z.string().email(i18n.t('tenants:validation.emailInvalid')).optional().or(z.literal('')),
  phone: z.string().optional().refine((v) => !v || isValidPhoneBR(v), i18n.t('tenants:validation.phoneInvalid')),
  whatsapp: z.string().optional().refine((v) => !v || isValidPhoneBR(v), i18n.t('tenants:validation.phoneInvalid')),
  dateOfBirth: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  tenant?: Tenant | null
  companyId: string
  onSuccess: () => void
}

export function TenantForm({ tenant, companyId, onSuccess }: Props) {
  const { t } = useTranslation('tenants')
  const [loading, setLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(tenant?.photoUrl)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: tenant
      ? {
          name: tenant.name,
          cpf: tenant.cpf ? maskCPF(tenant.cpf) : tenant.cpf,
          rg: tenant.rg ? maskRG(tenant.rg) : tenant.rg,
          email: tenant.email,
          phone: tenant.phone ? maskPhone(tenant.phone) : tenant.phone,
          whatsapp: tenant.whatsapp ? maskPhone(tenant.whatsapp) : tenant.whatsapp,
          dateOfBirth: tenant.dateOfBirth,
        }
      : {},
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const payload = {
        companyId,
        name: data.name,
        cpf: data.cpf.replace(/\D/g, ''),
        rg: data.rg,
        email: data.email || undefined,
        phone: data.phone?.replace(/\D/g, ''),
        whatsapp: data.whatsapp?.replace(/\D/g, ''),
        dateOfBirth: data.dateOfBirth,
        photoUrl: photoUrl || undefined,
        active: true,
      }
      let tenantId = tenant?.id
      if (tenant) {
        await updateTenant(tenant.id, payload)
        toast({ title: t('toast.updated') })
      } else {
        tenantId = await createTenant(payload)
        toast({ title: t('toast.created') })
      }
      if (payload.email && tenantId) {
        try {
          await upsertTenantInvite({ email: payload.email, companyId, tenantId, name: payload.name })
        } catch {
          // O convite é complementar; não bloqueia o cadastro do inquilino.
        }
      }
      onSuccess()
    } catch {
      toast({ title: t('toast.saveError'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true)
    try {
      const url = await uploadTenantPhoto(companyId, tenant?.id ?? 'novos', file)
      setPhotoUrl(url)
    } catch {
      toast({ title: t('toast.photoError'), variant: 'destructive' })
    } finally {
      setUploadingPhoto(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <ReceiptUpload
        label={t('form.photoLabel')}
        value={photoUrl}
        onChange={setPhotoUrl}
        onFileSelect={handlePhotoUpload}
        uploading={uploadingPhoto}
        accept="image/*"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>{t('form.name')} *</Label>
          <Input placeholder={t('placeholders.name')} className={fieldErrorClass(errors.name)} {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('form.cpf')} *</Label>
          <Input
            placeholder="000.000.000-00"
            className={fieldErrorClass(errors.cpf)}
            {...register('cpf')}
            onChange={(e) => setValue('cpf', maskCPF(e.target.value))}
          />
          {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('form.rg')}</Label>
          <Input
            placeholder="00.000.000-0"
            className={fieldErrorClass(errors.rg)}
            {...register('rg')}
            onChange={(e) => setValue('rg', maskRG(e.target.value))}
          />
          {errors.rg && <p className="text-xs text-destructive">{errors.rg.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('form.email')}</Label>
          <Input type="email" placeholder={t('placeholders.email')} className={fieldErrorClass(errors.email)} {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('form.birthDate')}</Label>
          <Input type="date" {...register('dateOfBirth')} />
        </div>
        <div className="space-y-2">
          <Label>{t('form.phone')}</Label>
          <Input
            placeholder="(00) 00000-0000"
            className={fieldErrorClass(errors.phone)}
            {...register('phone')}
            onChange={(e) => setValue('phone', maskPhone(e.target.value))}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('form.whatsapp')}</Label>
          <Input
            placeholder="(00) 00000-0000"
            className={fieldErrorClass(errors.whatsapp)}
            {...register('whatsapp')}
            onChange={(e) => setValue('whatsapp', maskPhone(e.target.value))}
          />
          {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp.message}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tenant ? t('buttons.save') : t('buttons.create')}
        </Button>
      </div>
    </form>
  )
}
