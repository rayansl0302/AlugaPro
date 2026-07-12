import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, FileText, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'
import { SaleSignatureRequest, SaleContractSignerRole } from '@/types'
import { getSaleSignatureRequest, submitSaleSignature } from '@/services/saleContracts'
import { uploadSaleSignatureDocument } from '@/services/storage'
import { SignatureCanvas } from '@/components/shared/SignatureCanvas'
import { MultiPhotoUpload } from '@/components/shared/MultiPhotoUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { maskCPF, maskRG } from '@/lib/utils'
import { LanguageSelector } from '@/i18n/LanguageSelector'
import { toast } from '@/hooks/useToast'

type Status = 'loading' | 'ready' | 'already' | 'notfound' | 'done'

export function SaleSignPage() {
  const { t } = useTranslation('saleContracts')
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<Status>('loading')
  const [request, setRequest] = useState<SaleSignatureRequest | null>(null)
  const [signature, setSignature] = useState('')
  const [cpf, setCpf] = useState('')
  const [rg, setRg] = useState('')
  const [documentFrontUrl, setDocumentFrontUrl] = useState('')
  const [documentBackUrl, setDocumentBackUrl] = useState('')
  const [documentSelfieUrl, setDocumentSelfieUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('notfound')
      return
    }
    getSaleSignatureRequest(token)
      .then((data) => {
        if (!data) {
          setStatus('notfound')
          return
        }
        setRequest(data)
        if (data.cpf) setCpf(maskCPF(data.cpf))
        if (data.rg) setRg(maskRG(data.rg))
        setStatus(data.status === 'signed' ? 'already' : 'ready')
      })
      .catch(() => setStatus('notfound'))
  }, [token])

  const handleSubmit = async () => {
    if (!token || !signature || !cpf || !documentFrontUrl || !documentBackUrl || !documentSelfieUrl) {
      toast({ title: t('signPage.toast.validation'), variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      await submitSaleSignature(token, { signature, cpf, rg, documentFrontUrl, documentBackUrl, documentSelfieUrl })
      setStatus('done')
      toast({ title: t('signPage.toast.success') })
    } catch {
      toast({ title: t('signPage.toast.error'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const roleLabel = request
    ? t(`signPage.roles.${request.role as SaleContractSignerRole}`)
    : t('signPage.titleFallback')

  const roleName = request
    ? request.role === 'vendedor'
      ? t('signPage.roleNames.vendedor')
      : request.role === 'comprador'
        ? t('signPage.roleNames.comprador')
        : t('signPage.roleNames.testemunha')
    : ''

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="bg-primary px-6 py-5 text-primary-foreground">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="h-5 w-5" /> {roleLabel}
              </p>
              <p className="text-sm opacity-80 mt-0.5">{t('signPage.brandSubtitle')}</p>
            </div>
            <LanguageSelector className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
          </div>
        </div>

        <div className="p-6 space-y-5">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin" />
              <p className="text-sm">{t('signPage.loading')}</p>
            </div>
          )}

          {status === 'notfound' && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="h-10 w-10 text-yellow-500" />
              <p className="font-semibold">{t('signPage.invalidTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('signPage.invalidDescription')}
              </p>
            </div>
          )}

          {status === 'already' && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <p className="font-semibold text-green-700">{t('signPage.alreadyTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('signPage.alreadyDescription', { contractNumber: request?.contractNumber })}
              </p>
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="font-semibold text-green-700 text-lg">{t('signPage.doneTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('signPage.doneDescription', { contractNumber: request?.contractNumber })}
              </p>
            </div>
          )}

          {status === 'ready' && request && (
            <>
              <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-semibold text-base flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />{' '}
                  {t('signPage.contractLabel', { contractNumber: request.contractNumber })}
                </p>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">{t('signPage.fields.seller')}</span>
                  <span className="col-span-2 font-medium">{request.vendedorName}</span>
                  <span className="text-muted-foreground">{t('signPage.fields.buyer')}</span>
                  <span className="col-span-2 font-medium">{request.compradorName}</span>
                  <span className="text-muted-foreground">{t('signPage.fields.object')}</span>
                  <span className="col-span-2 font-medium">{request.objeto}</span>
                  <span className="text-muted-foreground">{t('signPage.fields.value')}</span>
                  <span className="col-span-2 font-medium">{request.valor}</span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-sm text-blue-800">
                {t('signPage.greeting', { name: request.signerName, role: roleName })}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t('signPage.fields.cpf')}</Label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={14}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('signPage.fields.rg')}</Label>
                  <Input value={rg} onChange={(e) => setRg(maskRG(e.target.value))} placeholder="00.000.000-0" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MultiPhotoUpload
                  label={t('signPage.fields.docFront')}
                  value={documentFrontUrl ? [documentFrontUrl] : []}
                  onUpload={(file) => uploadSaleSignatureDocument(token!, 'front', file)}
                  onChange={(urls) => setDocumentFrontUrl(urls[0] ?? '')}
                  max={1}
                />
                <MultiPhotoUpload
                  label={t('signPage.fields.docBack')}
                  value={documentBackUrl ? [documentBackUrl] : []}
                  onUpload={(file) => uploadSaleSignatureDocument(token!, 'back', file)}
                  onChange={(urls) => setDocumentBackUrl(urls[0] ?? '')}
                  max={1}
                />
                <MultiPhotoUpload
                  label={t('signPage.fields.docSelfie')}
                  value={documentSelfieUrl ? [documentSelfieUrl] : []}
                  onUpload={(file) => uploadSaleSignatureDocument(token!, 'selfie', file)}
                  onChange={(urls) => setDocumentSelfieUrl(urls[0] ?? '')}
                  max={1}
                />
              </div>

              <SignatureCanvas
                label={t('signPage.fields.signature')}
                value={signature}
                onConfirm={(v) => setSignature(v)}
                onClear={() => setSignature('')}
              />

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting || !signature || !cpf || !documentFrontUrl || !documentBackUrl || !documentSelfieUrl}
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('signPage.submitting')}</>
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" /> {t('signPage.confirm')}</>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {t('signPage.legalNote')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
