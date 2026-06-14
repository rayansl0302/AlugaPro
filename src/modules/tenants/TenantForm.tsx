import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Tenant } from '@/types'
import { createTenant, updateTenant } from '@/services/tenants'
import { upsertTenantInvite } from '@/services/invites'
import { uploadTenantPhoto } from '@/services/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReceiptUpload } from '@/components/shared/ReceiptUpload'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  cpf: z.string().min(11, 'CPF inválido'),
  rg: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  dateOfBirth: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  tenant?: Tenant | null
  companyId: string
  onSuccess: () => void
}

export function TenantForm({ tenant, companyId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(tenant?.photoUrl)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: tenant
      ? {
          name: tenant.name,
          cpf: tenant.cpf,
          rg: tenant.rg,
          email: tenant.email,
          phone: tenant.phone,
          whatsapp: tenant.whatsapp,
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
        toast({ title: 'Inquilino atualizado.' })
      } else {
        tenantId = await createTenant(payload)
        toast({ title: 'Inquilino cadastrado.' })
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
      toast({ title: 'Erro ao salvar inquilino.', variant: 'destructive' })
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
      toast({ title: 'Erro ao enviar a foto.', variant: 'destructive' })
    } finally {
      setUploadingPhoto(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <ReceiptUpload
        label="Foto do inquilino"
        value={photoUrl}
        onChange={setPhotoUrl}
        onFileSelect={handlePhotoUpload}
        uploading={uploadingPhoto}
        accept="image/*"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Nome Completo *</Label>
          <Input placeholder="João da Silva" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>CPF *</Label>
          <Input placeholder="000.000.000-00" {...register('cpf')} />
          {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>RG</Label>
          <Input placeholder="00.000.000-0" {...register('rg')} />
        </div>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input type="email" placeholder="joao@email.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Data de Nascimento</Label>
          <Input type="date" {...register('dateOfBirth')} />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input placeholder="(00) 00000-0000" {...register('phone')} />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp</Label>
          <Input placeholder="(00) 00000-0000" {...register('whatsapp')} />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tenant ? 'Salvar Alterações' : 'Cadastrar Inquilino'}
        </Button>
      </div>
    </form>
  )
}
