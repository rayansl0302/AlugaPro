import { useState } from 'react'
import { format } from 'date-fns'
import { Loader2, CheckCircle, Banknote, CreditCard, QrCode, ArrowLeftRight, Receipt } from 'lucide-react'
import { Charge, PaymentMethod } from '@/types'
import { updateCharge } from '@/services/charges'
import { createPayment } from '@/services/payments'
import { uploadReceipt } from '@/services/storage'
import { formatCurrency, formatDateOptional } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ReceiptUpload } from '@/components/shared/ReceiptUpload'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/useToast'

const METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'dinheiro',     label: 'Dinheiro',       icon: Banknote },
  { value: 'pix',          label: 'PIX',             icon: QrCode },
  { value: 'transferencia',label: 'Transferência',   icon: ArrowLeftRight },
  { value: 'cartao',       label: 'Cartão',          icon: CreditCard },
  { value: 'boleto',       label: 'Boleto',          icon: Receipt },
]

interface Props {
  charge: Charge | null
  companyId: string
  onClose: () => void
  onSuccess: () => void
}

export function MarkPaidDialog({ charge, companyId, onClose, onSuccess }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')

  const [method, setMethod]       = useState<PaymentMethod>('dinheiro')
  const [paidDate, setPaidDate]   = useState(today)
  const [paidAmount, setPaidAmount] = useState<string>('')
  const [notes, setNotes]         = useState('')
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]       = useState(false)

  if (!charge) return null

  const baseAmount  = charge.totalAmount ?? charge.amount
  const finalAmount = paidAmount !== '' ? parseFloat(paidAmount) : baseAmount
  const discount    = baseAmount - finalAmount

  const handleReceiptFile = async (file: File) => {
    setUploading(true)
    try {
      const url = await uploadReceipt(companyId, charge.id, file)
      setReceiptUrl(url)
    } catch {
      toast({ title: 'Erro ao enviar comprovante.', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      // Build payment payload — omit undefined fields (Firestore rejects them)
      const paymentPayload: Parameters<typeof createPayment>[0] = {
        companyId,
        contractId: charge.contractId,
        propertyId: charge.propertyId,
        propertyName: charge.propertyName ?? '',
        tenantId: charge.tenantId,
        tenantName: charge.tenantName ?? '',
        chargeId: charge.id,
        type: charge.type,
        description: charge.description,
        amount: finalAmount,
        dueDate: charge.dueDate ?? '',
        paidDate,
        paymentMethod: method,
        status: 'pago',
      }
      if (discount > 0) paymentPayload.discount = discount
      if (receiptUrl)   paymentPayload.receipt = receiptUrl
      if (notes)        paymentPayload.notes = notes

      const paymentId = await createPayment(paymentPayload)

      // Build charge update — omit undefined fields
      const chargeUpdate: Parameters<typeof updateCharge>[1] = {
        status: 'pago',
        paidDate,
        paidAmount: finalAmount,
        paymentMethod: method,
        paymentId,
        paidBy: 'admin',
      }
      if (receiptUrl) {
        chargeUpdate.receipt = receiptUrl
        chargeUpdate.receiptStatus = 'confirmado'
      }
      if (notes) chargeUpdate.notes = notes

      await updateCharge(charge.id, chargeUpdate)

      toast({ title: 'Pagamento registrado!' })
      onSuccess()
      onClose()
    } catch (err) {
      console.error('[MarkPaidDialog] erro ao registrar pagamento:', err)
      toast({ title: 'Erro ao registrar pagamento.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!charge} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90dvh] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Registrar Pagamento
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="space-y-5">
          {/* Resumo da cobrança */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cobrança</span>
              <span className="font-medium">{charge.description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inquilino</span>
              <span className="font-medium">{charge.tenantName ?? '—'}</span>
            </div>
            {charge.dueDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vencimento</span>
                <span>{formatDateOptional(charge.dueDate)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Valor original</span>
              <span className="text-lg font-bold">{formatCurrency(baseAmount)}</span>
            </div>
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-all',
                    method === value
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Data do pagamento */}
          <div className="space-y-2">
            <Label>Data do Pagamento</Label>
            <Input
              type="date"
              max={today}
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Pode registrar com data retroativa para pagamentos em espécie recebidos anteriormente.
            </p>
          </div>

          {/* Valor recebido (opcional — para desconto/negociação) */}
          <div className="space-y-2">
            <Label>
              Valor Recebido{' '}
              <span className="text-xs font-normal text-muted-foreground">(opcional — deixe em branco para o valor original)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={baseAmount.toFixed(2)}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="pl-9"
              />
            </div>
            {paidAmount !== '' && discount !== 0 && (
              <p className={cn('text-xs', discount > 0 ? 'text-orange-600' : 'text-destructive')}>
                {discount > 0
                  ? `Desconto de ${formatCurrency(discount)} aplicado`
                  : `Valor acima do original (+${formatCurrency(-discount)})`}
              </p>
            )}
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label>Observação <span className="text-xs font-normal text-muted-foreground">(opcional)</span></Label>
            <Input
              placeholder="Ex: Pago em espécie na portaria, recibo nº 42..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Comprovante */}
          <ReceiptUpload
            value={receiptUrl}
            onChange={setReceiptUrl}
            onFileSelect={handleReceiptFile}
            uploading={uploading}
            label="Comprovante (opcional)"
          />
        </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || uploading}>
            {saving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
              : <><CheckCircle className="mr-2 h-4 w-4" /> Confirmar Pagamento</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
