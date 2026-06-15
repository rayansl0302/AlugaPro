import type { Charge, SharedExpense } from '@/types'

export function buildPendingReceiptKeys(charges: Charge[], expenses: SharedExpense[]): string[] {
  const keys: string[] = []

  for (const charge of charges) {
    if (charge.receiptStatus === 'aguardando') {
      keys.push(`charge:${charge.id}`)
    }
  }

  for (const expense of expenses) {
    expense.participants.forEach((participant, index) => {
      if (participant.receiptStatus === 'aguardando') {
        keys.push(`expense:${expense.id}:${index}`)
      }
    })
  }

  return keys
}

export function countPendingChargeReceipts(charges: Charge[]): number {
  return charges.filter((charge) => charge.receiptStatus === 'aguardando').length
}

export function countPendingExpenseReceipts(expenses: SharedExpense[]): number {
  return expenses.reduce(
    (total, expense) =>
      total + expense.participants.filter((participant) => participant.receiptStatus === 'aguardando').length,
    0,
  )
}

export function findFirstPendingExpenseReceipt(expenses: SharedExpense[]) {
  for (const expense of expenses) {
    const participantIndex = expense.participants.findIndex(
      (participant) => participant.receiptStatus === 'aguardando',
    )
    if (participantIndex >= 0) {
      return { expense, participantIndex }
    }
  }
  return null
}
