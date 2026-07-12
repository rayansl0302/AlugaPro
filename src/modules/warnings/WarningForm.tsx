import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { getContracts } from '@/services/contracts'
import { createWarning } from '@/services/warnings'
import { uploadWarningEvidence } from '@/services/storage'
import { Contract } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { MultiPhotoUpload } from '@/components/shared/MultiPhotoUpload'
import { AudioUpload } from '@/components/shared/AudioUpload'
import { toast } from '@/hooks/useToast'

interface Props {
  companyId: string
  issuedById: string
  issuedByName: string
  presetContractId?: string
  onSuccess: () => void
}

export function WarningForm({ companyId, issuedById, issuedByName, presetContractId, onSuccess }: Props) {
  const { t } = useTranslation('warnings')
  const [contractId, setContractId] = useState(presetContractId ?? '')
  const [reason, setReason] = useState('')
  const [clauseReference, setClauseReference] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [audios, setAudios] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', companyId],
    queryFn: () => getContracts(companyId),
    enabled: !!companyId,
  })

  const activeContracts = contracts.filter((c) => c.status === 'ativo' || c.status === 'renovado')
  const selected: Contract | undefined = activeContracts.find((c) => c.id === contractId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) {
      toast({ title: t('warningForm.toast.selectContract'), variant: 'destructive' })
      return
    }
    if (!reason.trim()) {
      toast({ title: t('warningForm.toast.describeReason'), variant: 'destructive' })
      return
    }
    if (photos.length === 0 && audios.length === 0) {
      toast({ title: t('warningForm.toast.attachEvidence'), variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      await createWarning({
        companyId,
        contractId: selected.id,
        contractNumber: selected.contractNumber,
        tenantId: selected.tenantId,
        tenantName: selected.tenantName,
        ownerId: selected.ownerId,
        propertyId: selected.propertyId,
        propertyName: selected.propertyName,
        issuedById,
        issuedByName,
        clauseReference: clauseReference.trim() || undefined,
        reason: reason.trim(),
        evidencePhotos: photos,
        evidenceAudio: audios,
      })
      toast({ title: t('warningForm.toast.created') })
      onSuccess()
    } catch {
      toast({ title: t('toast.createError'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t('warningForm.tenantContract')}</Label>
        <Combobox
          options={activeContracts.map((c) => ({
            value: c.id,
            label: `${c.tenantName ?? 'Inquilino'} — ${c.propertyName ?? ''}`,
            description: c.contractNumber,
          }))}
          value={contractId}
          onChange={setContractId}
          placeholder={t('warningForm.selectActiveContract')}
          searchPlaceholder={t('warningForm.searchTenant')}
          emptyText={t('warningForm.noActiveContracts')}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('warningForm.clauseReference')}</Label>
        <Input
          placeholder={t('warningForm.clausePlaceholder')}
          value={clauseReference}
          onChange={(e) => setClauseReference(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('warningForm.reason')}</Label>
        <textarea
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t('warningForm.reasonPlaceholder')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <MultiPhotoUpload
        label={t('warningForm.photos')}
        value={photos}
        onChange={setPhotos}
        onUpload={(file) => uploadWarningEvidence(companyId, contractId || 'novos', file)}
      />

      <AudioUpload
        label={t('warningForm.audios')}
        value={audios}
        onChange={setAudios}
        onUpload={(file) => uploadWarningEvidence(companyId, contractId || 'novos', file)}
      />

      <p className="text-xs text-muted-foreground">
        {t('warningForm.rescissionInfo')}
      </p>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('warningForm.submit')}
        </Button>
      </div>
    </form>
  )
}
