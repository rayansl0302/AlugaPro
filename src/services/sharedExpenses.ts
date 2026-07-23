import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { SharedExpense, SharedExpenseParticipant, ExpenseStatus, PaymentMethod } from '@/types'

const COL = 'sharedExpenses'

// Remove as despesas compartilhadas NÃO totalmente pagas de um ativo — usado
// ao excluir o imóvel. Despesas quitadas ficam como histórico. Retorna
// quantas foram removidas.
export async function deleteOpenSharedExpensesForAsset(companyId: string, assetId: string): Promise<number> {
  const all = await getSharedExpenses(companyId)
  const open = all.filter((e) => e.propertyId === assetId && e.status !== 'pago')
  await Promise.all(open.map((e) => deleteDoc(doc(db, COL, e.id))))
  return open.length
}

export async function getSharedExpenses(companyId: string): Promise<SharedExpense[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as SharedExpense))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export interface TenantSharedExpenseItem {
  expense: SharedExpense
  participant: SharedExpenseParticipant
  participantIndex: number
}

export async function getSharedExpensesByTenant(
  companyId: string,
  tenantId: string,
): Promise<TenantSharedExpenseItem[]> {
  const expenses = await getSharedExpenses(companyId)
  return expenses.flatMap((expense) =>
    expense.participants.flatMap((participant, participantIndex) =>
      participant.tenantId === tenantId
        ? [{ expense, participant, participantIndex }]
        : []
    )
  )
}

export function resolveExpenseParticipantIndex(
  expense: SharedExpense,
  participant: SharedExpenseParticipant,
  preferredIndex: number | undefined,
  fallbackTenantId: string,
): number {
  if (
    typeof preferredIndex === 'number'
    && Number.isInteger(preferredIndex)
    && preferredIndex >= 0
    && preferredIndex < expense.participants.length
  ) {
    return preferredIndex
  }

  const tenantId = participant.tenantId ?? fallbackTenantId
  if (tenantId) {
    const byTenant = expense.participants.findIndex((p) => p.tenantId === tenantId)
    if (byTenant >= 0) return byTenant
  }

  return expense.participants.findIndex(
    (p) => p.tenantName === participant.tenantName && p.amount === participant.amount,
  )
}

export async function submitSharedExpenseReceipt(
  expenseId: string,
  participantIndex: number,
  receiptUrl: string,
  expectedTenantId?: string,
): Promise<void> {
  const ref = doc(db, COL, expenseId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Despesa não encontrada')
  const current = snap.data() as SharedExpense
  if (
    !Number.isInteger(participantIndex)
    || participantIndex < 0
    || participantIndex >= current.participants.length
  ) {
    throw new Error('Participante não encontrado')
  }

  const participant = current.participants[participantIndex]
  if (!participant) throw new Error('Participante não encontrado')
  if (expectedTenantId && participant.tenantId && participant.tenantId !== expectedTenantId) {
    throw new Error('Participante não autorizado')
  }

  const updatedParticipants = [...current.participants]
  updatedParticipants[participantIndex] = {
    ...participant,
    receipt: receiptUrl,
    receiptStatus: 'aguardando',
  }

  await updateDoc(ref, {
    participants: updatedParticipants,
    updatedAt: serverTimestamp(),
  })
}

export async function createSharedExpense(
  data: Omit<SharedExpense, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    participantTenantIds: data.participants.map((p) => p.tenantId),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateSharedExpense(
  id: string,
  data: Partial<SharedExpense>
): Promise<void> {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  await updateDoc(doc(db, COL, id), { ...clean, updatedAt: serverTimestamp() })
}

function computeExpenseStatus(participants: SharedExpenseParticipant[]): ExpenseStatus {
  const allPaid = participants.every((p) => p.status === 'pago')
  const somePaid = participants.some((p) => p.status === 'pago')
  return allPaid ? 'pago' : somePaid ? 'parcial' : 'pendente'
}

export async function confirmParticipantReceipt(
  expenseId: string,
  participantIndex: number,
): Promise<void> {
  const ref = doc(db, COL, expenseId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Despesa não encontrada')
  const current = snap.data() as SharedExpense
  if (
    !Number.isInteger(participantIndex)
    || participantIndex < 0
    || participantIndex >= current.participants.length
  ) {
    throw new Error('Participante não encontrado')
  }

  const participant = current.participants[participantIndex]
  if (!participant) throw new Error('Participante não encontrado')

  const paidDate = new Date().toISOString().slice(0, 10)
  const updatedParticipants = [...current.participants]
  updatedParticipants[participantIndex] = {
    ...participant,
    status: 'pago',
    paidDate,
    receiptStatus: 'confirmado',
  }

  await updateDoc(ref, {
    participants: updatedParticipants,
    status: computeExpenseStatus(updatedParticipants),
    updatedAt: serverTimestamp(),
  })
}

export async function rejectParticipantReceipt(
  expenseId: string,
  participantIndex: number,
): Promise<void> {
  const ref = doc(db, COL, expenseId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Despesa não encontrada')
  const current = snap.data() as SharedExpense
  if (
    !Number.isInteger(participantIndex)
    || participantIndex < 0
    || participantIndex >= current.participants.length
  ) {
    throw new Error('Participante não encontrado')
  }

  const participant = current.participants[participantIndex]
  if (!participant) throw new Error('Participante não encontrado')

  const updatedParticipants = [...current.participants]
  updatedParticipants[participantIndex] = {
    ...participant,
    receiptStatus: 'rejeitado',
  }

  await updateDoc(ref, {
    participants: updatedParticipants,
    updatedAt: serverTimestamp(),
  })
}

// Both functions read fresh from Firestore and match by ARRAY INDEX (not tenantId).
// Matching by tenantId is unsafe: if participants lack the field (undefined) or share the
// same value, the condition matches every element and marks them all.
export async function markParticipantPaid(
  expenseId: string,
  participantIndex: number,
  data: { paidDate: string; paymentMethod: PaymentMethod }
): Promise<void> {
  const ref = doc(db, COL, expenseId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Despesa não encontrada')
  const current = snap.data() as { participants: SharedExpenseParticipant[] }

  const updatedParticipants: SharedExpenseParticipant[] = current.participants.map((p, idx) =>
    idx === participantIndex
      ? { ...p, status: 'pago' as const, paidDate: data.paidDate }
      : { ...p }
  )
  const allPaid = updatedParticipants.every((p) => p.status === 'pago')
  const somePaid = updatedParticipants.some((p) => p.status === 'pago')
  const newStatus: ExpenseStatus = allPaid ? 'pago' : somePaid ? 'parcial' : 'pendente'
  await updateDoc(ref, {
    participants: updatedParticipants,
    status: newStatus,
    updatedAt: serverTimestamp(),
  })
}

export async function markParticipantUnpaid(
  expenseId: string,
  participantIndex: number,
): Promise<void> {
  const ref = doc(db, COL, expenseId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Despesa não encontrada')
  const current = snap.data() as { participants: SharedExpenseParticipant[] }

  const updatedParticipants: SharedExpenseParticipant[] = current.participants.map((p, idx) => {
    if (idx !== participantIndex) return { ...p }
    const { paidDate, ...rest } = p
    return { ...rest, status: 'pendente' as const }
  })
  const allPaid = updatedParticipants.every((p) => p.status === 'pago')
  const somePaid = updatedParticipants.some((p) => p.status === 'pago')
  const newStatus: ExpenseStatus = allPaid ? 'pago' : somePaid ? 'parcial' : 'pendente'
  await updateDoc(ref, {
    participants: updatedParticipants,
    status: newStatus,
    updatedAt: serverTimestamp(),
  })
}

export function splitExpenseEqually(
  totalAmount: number,
  participants: Array<{ tenantId: string; tenantName: string }>
) {
  const share = Math.round((totalAmount / participants.length) * 100) / 100
  return participants.map((p) => ({
    ...p,
    amount: share,
    status: 'pendente' as const,
  }))
}
