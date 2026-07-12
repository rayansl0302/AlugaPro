import { useTranslation } from 'react-i18next'
import { Mail, Phone, MapPin } from 'lucide-react'
import { Owner } from '@/types'
import { formatCPF, formatPhone, getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function OwnerDetail({ owner }: { owner: Owner }) {
  const { t } = useTranslation('owners')
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={owner.photoUrl} alt={owner.name} />
          <AvatarFallback className="bg-indigo-100 text-indigo-700 text-lg dark:bg-indigo-900 dark:text-indigo-300">
            {getInitials(owner.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold">{owner.name}</h2>
          {owner.cpf && <p className="text-sm text-muted-foreground">{formatCPF(owner.cpf)}</p>}
          {owner.cnpj && <p className="text-sm text-muted-foreground">{owner.cnpj}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {owner.email && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('form.email')}</p>
              <p className="truncate font-medium">{owner.email}</p>
            </div>
          </div>
        )}
        {owner.phone && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('form.phone')}</p>
              <p className="font-medium">{formatPhone(owner.phone)}</p>
            </div>
          </div>
        )}
        {owner.whatsapp && (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('form.whatsapp')}</p>
              <p className="font-medium">{formatPhone(owner.whatsapp)}</p>
            </div>
          </div>
        )}
      </div>

      {owner.address && (
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{t('form.address')}</p>
            <p className="font-medium">
              {owner.address.street}, {owner.address.number}
              {owner.address.complement && `, ${owner.address.complement}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {owner.address.neighborhood} — {owner.address.city}/{owner.address.state} — {owner.address.zipCode}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
