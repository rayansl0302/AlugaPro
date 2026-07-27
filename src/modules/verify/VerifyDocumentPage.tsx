import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Loader2, ShieldCheck, AlertTriangle, Copy, Check } from 'lucide-react'
import { ContractVerificationRecord } from '@/types'
import { getVerificationRecord } from '@/services/contractVerification'
import { Button } from '@/components/ui/button'
import { LanguageSelector } from '@/i18n/LanguageSelector'
import { toast } from '@/hooks/useToast'

type Status = 'loading' | 'found' | 'notfound'

// Página pública acessada pelo QR Code impresso no PDF final de contratos de
// locação e de venda de terreno. Lê exclusivamente a coleção pública
// contractVerifications (nunca os documentos principais contracts/saleContracts),
// então nunca expõe dados sensíveis como IP ou dispositivo de quem assinou.
export function VerifyDocumentPage() {
  const { t } = useTranslation('verify')
  const { verificationId } = useParams<{ verificationId: string }>()
  const [status, setStatus] = useState<Status>('loading')
  const [record, setRecord] = useState<ContractVerificationRecord | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!verificationId) {
      setStatus('notfound')
      return
    }
    getVerificationRecord(verificationId)
      .then((data) => {
        if (!data) {
          setStatus('notfound')
          return
        }
        setRecord(data)
        setStatus('found')
      })
      .catch(() => setStatus('notfound'))
  }, [verificationId])

  const copyHash = async () => {
    if (!record) return
    try {
      await navigator.clipboard.writeText(record.pdfHash)
      setCopied(true)
      toast({ title: t('hashCopied') })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // silencioso — o hash continua visível pra cópia manual
    }
  }

  const hashBlocks = record ? record.pdfHash.match(/.{1,8}/g)?.join(' ') ?? record.pdfHash : ''

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="bg-primary px-6 py-5 text-primary-foreground">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="h-5 w-5" /> {t('title')}
              </p>
              <p className="text-sm opacity-80 mt-0.5">{t('brandSubtitle')}</p>
            </div>
            <LanguageSelector className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
          </div>
        </div>

        <div className="p-6 space-y-5">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin" />
              <p className="text-sm">{t('loading')}</p>
            </div>
          )}

          {status === 'notfound' && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="h-10 w-10 text-yellow-500" />
              <p className="font-semibold">{t('notFoundTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('notFoundDescription')}</p>
            </div>
          )}

          {status === 'found' && record && (
            <>
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="font-semibold text-green-700 text-lg">{t('verifiedTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('verifiedDescription')}</p>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">{t('typeLabel')}</span>
                  <span className="col-span-2 font-medium">{t(`types.${record.type}`)}</span>
                  <span className="text-muted-foreground">{t('contractNumber')}</span>
                  <span className="col-span-2 font-medium">{record.contractNumber}</span>
                  <span className="text-muted-foreground">{t('generatedAt')}</span>
                  <span className="col-span-2 font-medium">{new Date(record.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">{t('partiesTitle')}</p>
                <div className="space-y-1.5">
                  {record.parties.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.role}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {p.signedAt ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle className="h-3.5 w-3.5" /> {t('signedAt')}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t('notSigned')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">{t('hashTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('hashHint')}</p>
                <code className="block break-all rounded-lg border bg-muted/40 p-3 text-xs font-mono">{hashBlocks}</code>
                <Button variant="outline" size="sm" onClick={copyHash}>
                  {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />} {t('copyHash')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
