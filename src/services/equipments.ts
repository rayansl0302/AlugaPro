import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Equipment } from '@/types'
import { generateEquipmentCode } from '@/lib/utils'

const COL = 'equipments'

export async function getEquipments(companyId: string): Promise<Equipment[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Equipment))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function getEquipment(id: string): Promise<Equipment | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Equipment
}

export async function createEquipment(
  data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt' | 'code'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    code: generateEquipmentCode(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateEquipment(id: string, data: Partial<Equipment>): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteEquipment(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

/** Soft-delete: marca o equipamento como removido (arquivado). */
export async function archiveEquipment(id: string): Promise<void> {
  await updateDoc(doc(db, COL, id), { archived: true, updatedAt: serverTimestamp() })
}

export async function getEquipmentsByOwner(
  companyId: string,
  ownerId: string
): Promise<Equipment[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId),
    where('ownerId', '==', ownerId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Equipment))
}
