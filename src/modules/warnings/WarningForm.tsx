import { useState } from 'react'
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
      toast({ title: 'Selecione o contrato/inquilino.', variant: 'destructive' })
      return
    }
    if (!reason.trim()) {
      toast({ title: 'Descreva o motivo da advertência.', variant: 'destructive' })
      return
    }
    if (photos.length === 0 && audios.length === 0) {
      toast({ title: 'Anexe ao menos uma prova (foto ou áudio).', variant: 'destructive' })
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
      toast({ title: 'Advertência registrada.' })
      onSuccess()
    } catch {
      toast({ title: 'Erro ao registrar advertência.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Inquilino / Contrato *</Label>
        <Combobox
          options={activeContracts.map((c) => ({
            value: c.id,
            label: `${c.tenantName ?? 'Inquilino'} — ${c.propertyName ?? ''}`,
            description: c.contractNumber,
          }))}
          value={contractId}
          onChange={setContractId}
          placeholder="Selecione o contrato ativo"
          searchPlaceholder="Buscar inquilino..."
          emptyText="Nenhum contrato ativo encontrado."
        />
      </div>

      <div className="space-y-2">
        <Label>Cláusula contratual referenciada</Label>
        <Input
          placeholder="Ex: Cláusula 11.2 — Do sossego"
          value={clauseReference}
          onChange={(e) => setClauseReference(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Motivo da advertência *</Label>
        <textarea
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Descreva detalhadamente o ocorrido..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <MultiPhotoUpload
        label="Fotos (prova)"
        value={photos}
        onChange={setPhotos}
        onUpload={(file) => uploadWarningEvidence(companyId, contractId || 'novos', file)}
      />

      <AudioUpload
        label="Áudios (prova, se houver)"
        value={audios}
        onChange={setAudios}
        onUpload={(file) => uploadWarningEvidence(companyId, contractId || 'novos', file)}
      />

      <p className="text-xs text-muted-foreground">
        A advertência fica registrada permanentemente e visível para o inquilino. Ao atingir 4 advertências,
        o contrato passa a permitir rescisão imediata por parte do proprietário, conforme cláusula contratual.
      </p>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar Advertência
        </Button>
      </div>
    </form>
  )
}
