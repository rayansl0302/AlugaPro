import {
  collection, addDoc, updateDoc, doc, getDocs,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Payment } from '@/types'

const COL = 'payments'

export async function getPayments(companyId: string): Promise<Payment[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Payment))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function getPaymentsByTenant(companyId: string, tenantId: string): Promise<Payment[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId),
    where('tenantId', '==', tenantId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Payment))
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
}

export async function createPayment(
  data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  const ref = await addDoc(collection(db, COL), {
    ...clean,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updatePayment(id: string, data: Partial<Payment>): Promise<void> {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  await updateDoc(doc(db, COL, id), { ...clean, updatedAt: serverTimestamp() })
}

export async function getFinancialSummary(
  companyId: string,
  month: string
): Promise<{ expected: number; received: number; pending: number }> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  const payments = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Payment))
    .filter((p) => (p.dueDate ?? '').slice(0, 7) === month)

  const expected = payments.reduce((s, p) => s + p.amount, 0)
  const received = payments.filter((p) => p.status === 'pago').reduce((s, p) => s + p.amount, 0)
  const pending = expected - received

  return { expected, received, pending }
}
