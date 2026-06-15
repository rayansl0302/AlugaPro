import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle, Loader2, X, Eye, FileCheck,
  Banknote, QrCode, ArrowLeftRight, CreditCard, Receipt,
} from 'lucide-react'
import { SharedExpense, PaymentMethod } from '@/types'
import {
  markParticipantPaid,
  markParticipantUnpaid,
  confirmParticipantReceipt,
  rejectParticipantReceipt,
} from '@/services/sharedExpenses'
import { formatCurrency, formatDateOptional } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/useToast'

const METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'dinheiro',      label: 'Dinheiro',  icon: Banknote },
  { value: 'pix',           label: 'PIX',        icon: QrCode },
  { value: 'transferencia', label: 'Transf.',    icon: ArrowLeftRight },
  { value: 'cartao',        label: 'Cartão',     icon: CreditCard },
  { value: 'boleto',        label: 'Boleto',     icon: Receipt },
]

interface Props {
  expense: SharedExpense | null
  initialValidatingIndex?: number | null
  onClose: () => void
  onSuccess: () => void
}

export function SharedExpensePayDialog({
  expense,
  initialValidatingIndex = null,
  onClose,
  onSuccess,
}: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [payingId, setPayingId] = useState<string | null>(null)
  const [validatingIdx, setValidatingIdx] = useState<number | null>(null)
  const [paidDate, setPaidDate] = useState(today)
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [undoing, setUndoing] = useState<string | null>(null)

  useEffect(() => {
    if (!expense) {
      setValidatingIdx(null)
      setPayingId(null)
      return
    }
    if (
      typeof initialValidatingIndex === 'number'
      && initialValidatingIndex >= 0
      && initialValidatingIndex < expense.participants.length
    ) {
      setValidatingIdx(initialValidatingIndex)
      setPayingId(null)
    }
  }, [expense, initialValidatingIndex])

  if (!expense) return null

  const handleMarkPaid = async (idx: number) => {
    setSaving(true)
    try {
      await markParticipantPaid(expense.id, idx, { paidDate, paymentMethod: method })
      toast({ title: 'Pagamento registrado!' })
      onSuccess()
      setPayingId(null)
    } catch {
      toast({ title: 'Erro ao registrar pagamento.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleMarkUnpaid = async (idx: number) => {
    setUndoing(String(idx))
    try {
      await markParticipantUnpaid(expense.id, idx)
      toast({ title: 'Pagamento desfeito.' })
      onSuccess()
    } catch {
      toast({ title: 'Erro ao desfazer pagamento.', variant: 'destructive' })
    } finally {
      setUndoing(null)
    }
  }

  const handleConfirmReceipt = async (idx: number) => {
    setValidating(true)
    try {
      await confirmParticipantReceipt(expense.id, idx)
      toast({ title: 'Comprovante confirmado e pagamento registrado.' })
      onSuccess()
      setValidatingIdx(null)
    } catch {
      toast({ title: 'Erro ao confirmar comprovante.', variant: 'destructive' })
    } finally {
      setValidating(false)
    }
  }

  const handleRejectReceipt = async (idx: number) => {
    setValidating(true)
    try {
      await rejectParticipantReceipt(expense.id, idx)
      toast({ title: 'Comprovante rejeitado. Inquilino precisará reenviar.' })
      onSuccess()
      setValidatingIdx(null)
    } catch {
      toast({ title: 'Erro ao rejeitar comprovante.', variant: 'destructive' })
    } finally {
      setValidating(false)
    }
  }

  const paidCount = expense.participants.filter((p) => p.status === 'pago').length
  const pendingCount = expense.participants.length - paidCount
  const toKey = (idx: number) => String(idx)

  return (
    <Dialog open={!!expense} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Pagamentos — {expense.description}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Imóvel</span>
            <span className="font-medium">{expense.propertyName ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vencimento</span>
            <span>
              {expense.recurring
                ? `Todo dia ${expense.dueDay ?? 1}`
                : expense.dueDate ? formatDateOptional(expense.dueDate) : '—'}
            </span>
          </div>
          <div className="flex justify-between border-t pt-1.5">
            <span className="font-semibold">Total</span>
            <span className="font-bold">{formatCurrency(expense.totalAmount)}</span>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground pt-0.5">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" /> {paidCount} pagos
            </span>
            <span className="flex items-center gap-1">
              <X className="h-3 w-3 text-yellow-500" /> {pendingCount} pendentes
            </span>
          </div>
        </div>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {expense.participants.map((p, idx) => (
            <div key={idx} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{p.tenantName}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(p.amount)}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                  {p.receiptStatus === 'aguardando' && (
                    <Badge variant="warning" className="text-xs">Comprovante enviado</Badge>
                  )}
                  {p.receiptStatus === 'rejeitado' && (
                    <Badge variant="destructive" className="text-xs">Comprovante rejeitado</Badge>
                  )}
                  {p.status === 'pago'
                    ? <Badge variant="success">Pago</Badge>
                    : <Badge variant="warning">Pendente</Badge>
                  }
                  {p.receiptStatus === 'aguardando' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-orange-300 text-orange-700"
                      onClick={() => {
                        setValidatingIdx(validatingIdx === idx ? null : idx)
                        setPayingId(null)
                      }}
                    >
                      <Eye className="mr-1 h-3 w-3" /> Validar
                    </Button>
                  )}
                  {p.status === 'pago' ? (
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      disabled={undoing === toKey(idx)}
                      onClick={() => handleMarkUnpaid(idx)}
                    >
                      {undoing === toKey(idx)
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <><X className="mr-1 h-3 w-3" /> Desfazer</>
                      }
                    </Button>
                  ) : p.receiptStatus !== 'aguardando' && (
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setPayingId(payingId === toKey(idx) ? null : toKey(idx))
                        setValidatingIdx(null)
                      }}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" /> Pago
                    </Button>
                  )}
                </div>
              </div>

              {p.status === 'pago' && p.paidDate && (
                <p className="text-xs text-muted-foreground">
                  Pago em {format(new Date(p.paidDate + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                </p>
              )}

              {validatingIdx === idx && p.receiptStatus === 'aguardando' && (
                <div className="border-t pt-3 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-orange-700">
                    <FileCheck className="h-4 w-4" />
                    Validar comprovante PIX
                  </div>

                  {p.receipt && (
                    <a href={p.receipt} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={p.receipt}
                        alt="Comprovante"
                        className="w-full rounded-lg border object-contain max-h-52"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <p className="mt-1.5 text-center text-xs text-primary underline">
                        Abrir comprovante em nova aba
                      </p>
                    </a>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={validating}
                      onClick={() => handleConfirmReceipt(idx)}
                    >
                      {validating
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <><CheckCircle className="mr-1 h-3.5 w-3.5" /> Confirmar pago</>
                      }
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      disabled={validating}
                      onClick={() => handleRejectReceipt(idx)}
                    >
                      Rejeitar
                    </Button>
                  </div>
                </div>
              )}

              {payingId === toKey(idx) && p.status !== 'pago' && p.receiptStatus !== 'aguardando' && (
                <div className="border-t pt-3 space-y-3">
                  <div className="grid grid-cols-5 gap-1">
                    {METHODS.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMethod(value)}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium transition-all',
                          method === value
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'hover:border-primary/50 hover:bg-muted/50'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Data do pagamento</Label>
                    <Input
                      type="date"
                      max={today}
                      value={paidDate}
                      onChange={(e) => setPaidDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm" variant="outline" className="flex-1"
                      onClick={() => setPayingId(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm" className="flex-1"
                      onClick={() => handleMarkPaid(idx)}
                      disabled={saving}
                    >
                      {saving
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <><CheckCircle className="mr-1 h-3.5 w-3.5" /> Confirmar</>
                      }
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button variant="outline" className="w-full" onClick={onClose}>
          Fechar
        </Button>
      </DialogContent>
    </Dialog>
  )
}
