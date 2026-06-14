import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ContractTemplate } from '@/types'

const COL = 'contractTemplates'

export async function getContractTemplates(companyId: string): Promise<ContractTemplate[]> {
  const q = query(collection(db, COL), where('companyId', '==', companyId))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as ContractTemplate))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createContractTemplate(
  data: Omit<ContractTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateContractTemplate(id: string, data: Partial<ContractTemplate>): Promise<void> {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  await updateDoc(doc(db, COL, id), { ...clean, updatedAt: serverTimestamp() })
}

export async function deleteContractTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}
