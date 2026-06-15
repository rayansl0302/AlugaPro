import {
  collection, addDoc, updateDoc, doc, getDocs,
  query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MaintenanceRequest } from '@/types'

const COL = 'maintenanceRequests'

export async function getMaintenanceRequests(companyId: string): Promise<MaintenanceRequest[]> {
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MaintenanceRequest))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function getMaintenanceRequestsByTenant(
  companyId: string,
  tenantId: string,
): Promise<MaintenanceRequest[]> {
  const requests = await getMaintenanceRequests(companyId)
  return requests.filter((r) => r.tenantId === tenantId)
}

export async function createMaintenanceRequest(
  data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    status: 'aberto',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateMaintenanceRequest(
  id: string,
  data: Partial<MaintenanceRequest>
): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
}
