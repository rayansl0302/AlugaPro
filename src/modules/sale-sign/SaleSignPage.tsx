import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, FileText, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'
import { SaleSignatureRequest, SaleContractSignerRole } from '@/types'
import { getSaleSignatureRequest, submitSaleSignature } from '@/services/saleContracts'
import { uploadSaleSignatureDocument } from '@/services/storage'
import { SignatureCanvas } from '@/components/shared/SignatureCanvas'
import { MultiPhotoUpload } from '@/components/shared/MultiPhotoUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { maskCPF } from '@/lib/utils'
import { toast } from '@/hooks/useToast'

type Status = 'loading' | 'ready' | 'already' | 'notfound' | 'done'

const ROLE_LABELS: Record<SaleContractSignerRole, string> = {
  vendedor: 'Assinatura do Vendedor',
  comprador: 'Assinatura do Comprador',
  testemunha1: 'Assinatura de Testemunha',
  testemunha2: 'Assinatura de Testemunha',
}

export function SaleSignPage() {
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
        setStatus(data.status === 'signed' ? 'already' : 'ready')
      })
      .catch(() => setStatus('notfound'))
  }, [token])

  const handleSubmit = async () => {
    if (!token || !signature || !cpf || !documentFrontUrl || !documentBackUrl || !documentSelfieUrl) {
      toast({ title: 'Preencha o CPF, envie as fotos do documento (frente, verso e segurando) e confirme sua assinatura.', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      await submitSaleSignature(token, { signature, cpf, rg, documentFrontUrl, documentBackUrl, documentSelfieUrl })
      setStatus('done')
      toast({ title: 'Assinatura registrada com sucesso!' })
    } catch {
      toast({ title: 'Erro ao registrar assinatura. Tente novamente.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const roleLabel = request ? ROLE_LABELS[request.role] : 'Assinatura'

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="bg-primary px-6 py-5 text-primary-foreground">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-5 w-5" /> {roleLabel}
          </p>
          <p className="text-sm opacity-80 mt-0.5">AlugaPro — assinatura eletrônica de contrato</p>
        </div>

        <div className="p-6 space-y-5">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin" />
              <p className="text-sm">Carregando contrato...</p>
            </div>
          )}

          {status === 'notfound' && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="h-10 w-10 text-yellow-500" />
              <p className="font-semibold">Link inválido ou expirado</p>
              <p className="text-sm text-muted-foreground">
                Não encontramos esta solicitação de assinatura. Solicite um novo link ao responsável pelo contrato.
              </p>
            </div>
          )}

          {status === 'already' && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <p className="font-semibold text-green-700">Assinatura já registrada</p>
              <p className="text-sm text-muted-foreground">
                Você já assinou o contrato {request?.contractNumber}. Obrigado!
              </p>
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="font-semibold text-green-700 text-lg">Assinatura registrada!</p>
              <p className="text-sm text-muted-foreground">
                Sua assinatura foi vinculada ao contrato {request?.contractNumber}.
                Você já pode fechar esta página.
              </p>
            </div>
          )}

          {status === 'ready' && request && (
            <>
              <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-semibold text-base flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" /> Contrato {request.contractNumber}
                </p>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-muted-foreground">Vendedor</span>
                  <span className="col-span-2 font-medium">{request.vendedorName}</span>
                  <span className="text-muted-foreground">Comprador</span>
                  <span className="col-span-2 font-medium">{request.compradorName}</span>
                  <span className="text-muted-foreground">Objeto</span>
                  <span className="col-span-2 font-medium">{request.objeto}</span>
                  <span className="text-muted-foreground">Valor</span>
                  <span className="col-span-2 font-medium">{request.valor}</span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-sm text-blue-800">
                Olá, <strong>{request.signerName}</strong>. Você foi indicado(a) como{' '}
                {request.role === 'vendedor' ? 'vendedor' : request.role === 'comprador' ? 'comprador(a)' : 'testemunha'}{' '}
                deste contrato. Confira os dados e assine no campo abaixo.
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Seu CPF</Label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={14}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Seu RG</Label>
                  <Input value={rg} onChange={(e) => setRg(e.target.value)} placeholder="0000000" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MultiPhotoUpload
                  label="Documento (frente)"
                  value={documentFrontUrl ? [documentFrontUrl] : []}
                  onUpload={(file) => uploadSaleSignatureDocument(token!, 'front', file)}
                  onChange={(urls) => setDocumentFrontUrl(urls[0] ?? '')}
                  max={1}
                />
                <MultiPhotoUpload
                  label="Documento (verso)"
                  value={documentBackUrl ? [documentBackUrl] : []}
                  onUpload={(file) => uploadSaleSignatureDocument(token!, 'back', file)}
                  onChange={(urls) => setDocumentBackUrl(urls[0] ?? '')}
                  max={1}
                />
                <MultiPhotoUpload
                  label="Você segurando o documento"
                  value={documentSelfieUrl ? [documentSelfieUrl] : []}
                  onUpload={(file) => uploadSaleSignatureDocument(token!, 'selfie', file)}
                  onChange={(urls) => setDocumentSelfieUrl(urls[0] ?? '')}
                  max={1}
                />
              </div>

              <SignatureCanvas
                label="Sua assinatura"
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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...</>
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" /> Confirmar assinatura</>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Assinatura eletrônica válida nos termos da MP nº 2.200-2/2001.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
