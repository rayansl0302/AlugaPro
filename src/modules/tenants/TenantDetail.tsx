import { User, IdCard, Mail, Phone, MessageCircle, Calendar, MapPin } from 'lucide-react'
import { Tenant } from '@/types'
import { formatCPF, formatPhone, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export function TenantDetail({ tenant }: { tenant: Tenant }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {tenant.photoUrl && (
            <a href={tenant.photoUrl} target="_blank" rel="noreferrer" className="h-16 w-16 shrink-0 overflow-hidden rounded-full border bg-muted/30">
              <img src={tenant.photoUrl} alt={tenant.name} className="h-full w-full object-cover" />
            </a>
          )}
          <div>
            <h2 className="text-xl font-bold">{tenant.name}</h2>
            {tenant.cpf && <p className="text-sm text-muted-foreground">{formatCPF(tenant.cpf)}</p>}
          </div>
        </div>
        <Badge variant={tenant.activeContractId ? 'success' : 'secondary'}>
          {tenant.activeContractId ? 'Com contrato' : 'Sem contrato'}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tenant.rg && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <IdCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">RG</p>
              <p className="font-medium">{tenant.rg}</p>
            </div>
          </div>
        )}
        {tenant.email && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="truncate font-medium">{tenant.email}</p>
            </div>
          </div>
        )}
        {tenant.phone && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="font-medium">{formatPhone(tenant.phone)}</p>
            </div>
          </div>
        )}
        {tenant.whatsapp && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">WhatsApp</p>
              <p className="font-medium">{formatPhone(tenant.whatsapp)}</p>
            </div>
          </div>
        )}
        {tenant.dateOfBirth && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Data de Nascimento</p>
              <p className="font-medium">{formatDate(tenant.dateOfBirth)}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <User className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Situação</p>
            <p className="font-medium">{tenant.active ? 'Ativo' : 'Inativo'}</p>
          </div>
        </div>
      </div>

      {tenant.address && (
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Endereço</p>
            <p className="font-medium">
              {tenant.address.street}, {tenant.address.number}
              {tenant.address.complement && `, ${tenant.address.complement}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {tenant.address.neighborhood} — {tenant.address.city}/{tenant.address.state} —{' '}
              {tenant.address.zipCode}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
