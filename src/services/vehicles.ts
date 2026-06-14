import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Vehicle } from '@/types'
import { generateVehicleCode } from '@/lib/utils'

const COL = 'vehicles'

export async function getVehicles(companyId: string): Promise<Vehicle[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Vehicle))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Vehicle
}

export async function createVehicle(
  data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'code'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    code: generateVehicleCode(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateVehicle(id: string, data: Partial<Vehicle>): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteVehicle(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

export async function getVehiclesByOwner(
  companyId: string,
  ownerId: string
): Promise<Vehicle[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId),
    where('ownerId', '==', ownerId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle))
}
