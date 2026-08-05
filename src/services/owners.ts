import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Owner } from '@/types'

const COL = 'owners'

export async function getOwners(companyId: string): Promise<Owner[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Owner))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getOwner(id: string): Promise<Owner | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Owner
}

export async function createOwner(
  data: Omit<Owner, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateOwner(id: string, data: Partial<Owner>): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteOwner(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}
