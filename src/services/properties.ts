import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Property } from '@/types'
import { generatePropertyCode } from '@/lib/utils'

const COL = 'properties'

export async function getProperties(companyId: string): Promise<Property[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Property))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function getProperty(id: string): Promise<Property | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Property
}

export async function createProperty(
  data: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'code'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    code: generatePropertyCode(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateProperty(id: string, data: Partial<Property>): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteProperty(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

/** Soft-delete: marca o imóvel como removido (arquivado). Ele some das telas
 *  operacionais mas continua no banco (relatórios/histórico). */
export async function archiveProperty(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { archived: true, updatedAt: serverTimestamp() })
}

export async function getPropertiesByOwner(
  companyId: string,
  ownerId: string
): Promise<Property[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId),
    where('ownerId', '==', ownerId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Property))
}
