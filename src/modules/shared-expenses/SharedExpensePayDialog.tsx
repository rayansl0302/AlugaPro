import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle, Loader2, X,
  Banknote, QrCode, ArrowLeftRight, CreditCard, Receipt,
} from 'lucide-react'
import { SharedExpense, PaymentMethod } from '@/types'
import { markParticipantPaid, markParticipantUnpaid } from '@/services/sharedExpenses'
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
  onClose: () => void
  onSuccess: () => void
}

export function SharedExpensePayDialog({ expense, onClose, onSuccess }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [payingId, setPayingId]   = useState<string | null>(null)
  const [paidDate, setPaidDate]   = useState(today)
  const [method, setMethod]       = useState<PaymentMethod>('pix')
  const [saving, setSaving]       = useState(false)
  const [undoing, setUndoing]     = useState<string | null>(null)

  if (!expense) return null

  // payingIdx stores the ARRAY INDEX of the participant being paid (not tenantId,
  // which may be non-unique or undefined in existing data)
  const handleMarkPaid = async (idx: number) => {
    setSaving(true)
    try {
      await markParticipantPaid(expense.id, idx, { paidDate, paymentMethod: method })
      toast({ title: 'Pagamento registrado!' })
      onSuccess()
      setPayingId(null)
    } catch (err) {
      console.error('[SharedExpensePayDialog] erro ao registrar pagamento:', err)
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

  const paidCount    = expense.participants.filter((p) => p.status === 'pago').length
  const pendingCount = expense.participants.length - paidCount

  // payingId stores the STRING version of the participant index ("0", "1", …)
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

        {/* Expense summary */}
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

        {/* Participants — keyed by index to avoid duplicate-key issues when tenantId is
            missing or shared between participants in existing data */}
        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {expense.participants.map((p, idx) => (
            <div key={idx} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{p.tenantName}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(p.amount)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.status === 'pago'
                    ? <Badge variant="success">Pago</Badge>
                    : <Badge variant="warning">Pendente</Badge>
                  }
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
                  ) : (
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setPayingId(payingId === toKey(idx) ? null : toKey(idx))}
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

              {/* Inline payment form — opens for the specific participant by index */}
              {payingId === toKey(idx) && p.status !== 'pago' && (
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
