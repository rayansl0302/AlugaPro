import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Charge, Contract } from '@/types'
import { addMonths, format, parseISO, setDate, startOfMonth, endOfMonth, isBefore, isAfter } from 'date-fns'
import { calculateLateFee, calculateInterest, getDaysLate, isOverdue } from '@/lib/utils'

const COL = 'charges'

export async function getCharges(companyId: string): Promise<Charge[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Charge))
    .sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''))
}

export async function getChargesByTenant(companyId: string, tenantId: string): Promise<Charge[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId),
    where('tenantId', '==', tenantId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Charge))
    .sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''))
}

export async function getOverdueCharges(companyId: string): Promise<Charge[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  const today = new Date().toISOString().slice(0, 10)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Charge))
    .filter((c) => (c.status === 'pendente' || c.status === 'atrasado') && !!c.dueDate && c.dueDate < today)
    .map((c) => {
      const daysLate = getDaysLate(c.dueDate ?? '')
      return { ...c, status: 'atrasado' as const, daysLate }
    })
}

export async function createCharge(
  data: Omit<Charge, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCharge(id: string, data: Partial<Charge>): Promise<void> {
  // Firestore rejects undefined values — strip them before writing
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  await updateDoc(doc(db, COL, id), { ...clean, updatedAt: serverTimestamp() })
}

export async function markChargePaid(
  id: string,
  paidDate: string,
  paymentId: string
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    status: 'pago',
    paidDate,
    paymentId,
    updatedAt: serverTimestamp(),
  })
}

export function generateMonthlyCharges(contract: Contract, monthOffset = 0): Omit<Charge, 'id' | 'createdAt' | 'updatedAt'> {
  const dueDate = format(
    setDate(addMonths(new Date(), monthOffset), contract.dueDay),
    'yyyy-MM-dd'
  )
  return {
    companyId: contract.companyId,
    contractId: contract.id,
    propertyId: contract.propertyId,
    propertyName: contract.propertyName,
    tenantId: contract.tenantId,
    tenantName: contract.tenantName,
    type: 'aluguel',
    description: `Aluguel - ${format(parseISO(dueDate), 'MM/yyyy')}`,
    amount: contract.rentValue,
    dueDate,
    status: 'pendente',
  }
}

// Generates monthly rent charges for a contract from startDate to today (or endDate).
// Skips months that already have a charge. Returns count of charges created.
export async function generateChargesForContract(contract: Contract): Promise<number> {
  if (contract.status === 'encerrado' || contract.status === 'cancelado') return 0

  const q = query(collection(db, COL), where('contractId', '==', contract.id), where('type', '==', 'aluguel'))
  const snap = await getDocs(q)
  const existingDueDates = new Set(snap.docs.map((d) => d.data().dueDate as string))

  const start = parseISO(contract.startDate)
  const today = new Date()
  const contractEnd = contract.endDate ? parseISO(contract.endDate) : null
  const limit = contractEnd && isBefore(contractEnd, today) ? contractEnd : today

  let cursor = startOfMonth(start)
  let created = 0

  while (!isAfter(cursor, endOfMonth(limit))) {
    // Clamp dueDay to last day of month (e.g. day 31 in February)
    const lastDayOfMonth = endOfMonth(cursor).getDate()
    const day = Math.min(contract.dueDay, lastDayOfMonth)
    const dueDate = format(setDate(cursor, day), 'yyyy-MM-dd')

    if (!existingDueDates.has(dueDate)) {
      await addDoc(collection(db, COL), {
        companyId: contract.companyId,
        contractId: contract.id,
        propertyId: contract.propertyId,
        propertyName: contract.propertyName ?? '',
        tenantId: contract.tenantId,
        tenantName: contract.tenantName ?? '',
        type: 'aluguel',
        description: `Aluguel ${format(cursor, 'MM/yyyy')}`,
        amount: contract.rentValue,
        dueDate,
        status: 'pendente',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      created++
    }

    cursor = addMonths(cursor, 1)
  }

  return created
}

export function enrichChargeWithLateFees(
  charge: Charge,
  lateFeePercent: number,
  monthlyInterest: number
): Charge {
  if (!charge.dueDate || !isOverdue(charge.dueDate) || charge.status === 'pago') return charge
  const daysLate = getDaysLate(charge.dueDate)
  const lateFee = calculateLateFee(charge.amount, lateFeePercent)
  const interest = calculateInterest(charge.amount, monthlyInterest, daysLate)
  return {
    ...charge,
    daysLate,
    lateFee,
    interest,
    totalAmount: charge.amount + lateFee + interest,
    status: 'atrasado',
  }
}
