import {
  collection, addDoc, updateDoc, doc, getDocs,
  query, where, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MaintenanceComment, MaintenanceRequest } from '@/types'

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
  const q = query(
    collection(db, COL),
    where('companyId', '==', companyId),
    where('tenantId', '==', tenantId),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MaintenanceRequest))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function createMaintenanceRequest(
  data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const clean = Object.fromEntries(
    Object.entries({ ...data, status: 'aberto' }).filter(([, v]) => v !== undefined)
  )
  const ref = await addDoc(collection(db, COL), {
    ...clean,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateMaintenanceRequest(
  id: string,
  data: Partial<MaintenanceRequest>
): Promise<void> {
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  await updateDoc(doc(db, COL, id), { ...clean, updatedAt: serverTimestamp() })
}

export async function addMaintenanceComment(
  requestId: string,
  request: MaintenanceRequest,
  comment: Pick<MaintenanceComment, 'authorId' | 'authorName' | 'message'>,
): Promise<MaintenanceComment> {
  const newComment: MaintenanceComment = {
    id: crypto.randomUUID(),
    authorId: comment.authorId,
    authorName: comment.authorName,
    message: comment.message,
    createdAt: Timestamp.now(),
  }
  await updateMaintenanceRequest(requestId, {
    comments: [...(request.comments ?? []), newComment],
  })
  return newComment
}
