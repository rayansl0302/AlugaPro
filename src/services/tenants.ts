import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Tenant } from '@/types'

const COL = 'tenants'

export async function getTenants(companyId: string): Promise<Tenant[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Tenant))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getTenant(id: string): Promise<Tenant | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Tenant
}

export async function createTenant(
  data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTenant(id: string, data: Partial<Tenant>): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteTenant(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}
