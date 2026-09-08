import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, Car, Wrench, DollarSign, PenLine, FileText, Receipt,
  FileWarning, ShieldAlert, ExternalLink, Music, Loader2,
} from 'lucide-react'
import { getChargesByContract } from '@/services/charges'
import { getContractSigningStatus } from '@/lib/contractSigning'
import { Contract, ContractStatus, ContractWarning, Tenant, Property, Vehicle, Equipment } from '@/types'
import { formatCurrency, formatDate, formatDateOptional, cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PhotoLightbox } from '@/components/shared/PhotoLightbox'

const STATUS_VARIANT: Record<ContractStatus, 'success' | 'info' | 'warning' | 'secondary' | 'destructive'> = {
  ativo: 'success',
  renovado: 'info',
  encerrado: 'secondary',
  cancelado: 'destructive',
}

const CHARGE_STATUS_VARIANT: Record<string, 'success' | 'info' | 'warning' | 'secondary' | 'destructive'> = {
  pago: 'success',
  pendente: 'warning',
  atrasado: 'destructive',
  cancelado: 'secondary',
}

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn('text-right', bold && 'font-bold text-primary')}>{value}</span>
    </div>
  )
}

interface Props {
  contract: Contract | null
  tenant?: Tenant
  property?: Property
  vehicle?: Vehicle
  equipment?: Equipment
  warnings: ContractWarning[]
  onClose: () => void
}

export function ContractDetailDialog({ contract, tenant, property, vehicle, equipment, warnings, onClose }: Props) {
  const { t } = useTranslation(['contracts', 'charges'])
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)

  const { data: charges = [], isLoading: chargesLoading } = useQuery({
    queryKey: ['charges-by-contract', contract?.id],
    queryFn: () => getChargesByContract(contract!.id),
    enabled: !!contract,
  })

  if (!contract) return null

  const signing = getContractSigningStatus(contract)
  const pdfUrl = contract.isImported ? contract.externalPdfUrl : contract.signedPdfUrl
  const AssetIcon = contract.assetType === 'veiculo' ? Car : contract.assetType === 'equipamento' ? Wrench : Building2
  const assetLabel = contract.assetType === 'veiculo' ? t('form.vehicle') : contract.assetType === 'equipamento' ? t('form.equipment') : t('form.property')

  const chargesPaid = charges.filter((c) => c.status === 'pago').length
  const chargesOverdue = charges.filter((c) => c.status === 'atrasado').length
  const chargesPending = charges.length - chargesPaid - chargesOverdue - charges.filter((c) => c.status === 'cancelado').length

  return (
    <Dialog open={!!contract} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-6">
            <div>
              <DialogTitle>{contract.contractNumber}</DialogTitle>
              <p className="text-sm text-muted-foreground">{tenant?.name ?? contract.tenantName}</p>
            </div>
            <Badge variant={STATUS_VARIANT[contract.status]}>{t(`statuses.${contract.status}`)}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ver PDF */}
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-muted-foreground">
                {pdfUrl ? t('detailDialog.pdfAvailable') : t('detailDialog.pdfNotAvailable')}
              </span>
            </div>
            {pdfUrl && (
              <Button size="sm" variant="outline" className="shrink-0" asChild>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> {t('detailDialog.viewPdf')}
                </a>
              </Button>
            )}
          </div>

          {/* Ativo + Valores */}
          <div className="grid gap-0 rounded-lg border md:grid-cols-2">
            <div className="space-y-1 border-b p-4 md:border-b-0 md:border-r">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <AssetIcon className="h-3.5 w-3.5" /> {assetLabel}
              </p>
              <DetailRow label={assetLabel} value={property?.name ?? vehicle?.plate ?? equipment?.name ?? contract.propertyName ?? '—'} />
              <DetailRow label={t('form.startDateRequired').replace(' *', '')} value={formatDate(contract.startDate)} />
              <DetailRow label={t('form.endDateLabel')} value={formatDateOptional(contract.endDate, t('indefinite'))} />
              {contract.signedAt && <DetailRow label={t('sign.signedView.signedAt')} value={formatDate(contract.signedAt)} />}
              {contract.templateName && <DetailRow label={t('detailDialog.template')} value={contract.templateName} />}
            </div>
            <div className="space-y-1 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" /> {t('detail.values')}
              </p>
              <DetailRow
                label={(contract.billingCycle ?? 'mensal') === 'mensal' ? t('form.rentValueRequired').replace(' *', '') : t(`form.${contract.billingCycle === 'semanal' ? 'weeklyRateRequired' : 'dailyRateRequired'}`).replace(' *', '')}
                value={formatCurrency(contract.rentValue)}
                bold
              />
              {(contract.billingCycle ?? 'mensal') === 'mensal' ? (
                <DetailRow label={t('form.dueDayRequired').replace(' *', '')} value={t('dueDayLabel', { day: contract.dueDay })} />
              ) : (
                <DetailRow label={t('form.paymentTiming')} value={t(`form.paymentTiming${contract.paymentTiming === 'na_devolucao' ? 'NaDevolucao' : 'Antecipado'}`)} />
              )}
              {!!contract.cautionValue && <DetailRow label={t('form.deposit')} value={formatCurrency(contract.cautionValue)} />}
              <DetailRow label={t('form.lateFee')} value={`${contract.lateFee}%`} />
              <DetailRow label={t('form.monthlyInterest')} value={`${contract.monthlyInterest}%`} />
            </div>
          </div>

          {/* Status de assinatura */}
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <PenLine className="h-3.5 w-3.5" /> {t('detail.signatures')}
              </span>
              {signing.state === 'external' ? (
                <span>{t('imported.badge')}</span>
              ) : (
                <>
                  <span>{t('signatures.tenant')}: {signing.locadorSigned ? t('signatures.signed') : t('signatures.pending')}</span>
                  <span>{t('form.tenant')}: {signing.locatarioSigned ? t('signatures.signed') : t('signatures.pending')}</span>
                  {signing.witnessesTotal > 0 && (
                    <span>{t('signatures.witness')}: {signing.witnessesSigned}/{signing.witnessesTotal}</span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Cobranças vinculadas */}
          <div className="rounded-lg border p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Receipt className="h-3.5 w-3.5" /> {t('detail.charges')}
            </p>
            {chargesLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : charges.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('detailDialog.noCharges')}</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-muted-foreground">
                  {t('detailDialog.chargesSummary', { paid: chargesPaid, pending: chargesPending, overdue: chargesOverdue })}
                </p>
                <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {charges.map((charge) => (
                    <div key={charge.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2.5 py-1.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate">{charge.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDateOptional(charge.dueDate, '—')}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={CHARGE_STATUS_VARIANT[charge.status] ?? 'secondary'} className="text-[10px]">
                          {t(`charges:statuses.${charge.status}`, { defaultValue: charge.status })}
                        </Badge>
                        <span className="font-medium">{formatCurrency(charge.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Advertências */}
          {warnings.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <FileWarning className="h-3.5 w-3.5" /> {t('actions.viewWarnings')} ({warnings.length})
              </p>
              {warnings.length >= 4 && (
                <p className="mb-2 flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> {t('detailDialog.rescissionRisk')}
                </p>
              )}
              <div className="space-y-2">
                {warnings.map((w) => (
                  <div key={w.id} className="rounded-lg border p-3">
                    {w.clauseReference && <p className="text-xs font-medium text-primary">{w.clauseReference}</p>}
                    <p className="text-sm">{w.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(w.createdAt?.toDate ? w.createdAt.toDate().toISOString() : new Date().toISOString())} — {w.issuedByName}
                    </p>
                    {((w.evidencePhotos?.length ?? 0) > 0 || (w.evidenceAudio?.length ?? 0) > 0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {(w.evidencePhotos ?? []).map((url, idx) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setLightbox({ photos: w.evidencePhotos ?? [], index: idx })}
                            className="h-12 w-12 overflow-hidden rounded-md border"
                          >
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                        {(w.evidenceAudio?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Music className="h-3.5 w-3.5" /> {w.evidenceAudio?.length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <PhotoLightbox
          photos={lightbox?.photos ?? []}
          open={!!lightbox}
          startIndex={lightbox?.index ?? 0}
          onClose={() => setLightbox(null)}
        />
      </DialogContent>
    </Dialog>
  )
}
