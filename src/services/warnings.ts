import {
  collection, addDoc, deleteDoc, doc, getDocs,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ContractWarning } from '@/types'

const COL = 'warnings'

function sortByCreatedAtDesc(warnings: ContractWarning[]): ContractWarning[] {
  return warnings.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function getWarningsByCompany(companyId: string): Promise<ContractWarning[]> {
  const q = query(collection(db, COL), where('companyId', '==', companyId))
  const snap = await getDocs(q)
  return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContractWarning)))
}

export async function getWarningsByContract(contractId: string): Promise<ContractWarning[]> {
  const q = query(collection(db, COL), where('contractId', '==', contractId))
  const snap = await getDocs(q)
  return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContractWarning)))
}

export async function getWarningsByTenant(companyId: string, tenantId: string): Promise<ContractWarning[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId),
    where('tenantId', '==', tenantId),
  )
  const snap = await getDocs(q)
  return sortByCreatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContractWarning)))
}

export async function createWarning(
  data: Omit<ContractWarning, 'id' | 'createdAt'>
): Promise<string> {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  const ref = await addDoc(collection(db, COL), {
    ...clean,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteWarning(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

// Remove todas as advertências de um contrato — usado ao excluir o contrato
// junto com o ativo (advertência é um registro atrelado ao contrato).
export async function deleteWarningsByContract(contractId: string): Promise<number> {
  const list = await getWarningsByContract(contractId)
  await Promise.all(list.map((w) => deleteWarning(w.id)))
  return list.length
}
