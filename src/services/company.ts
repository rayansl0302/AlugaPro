import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Company } from '@/types'

const COL = 'companies'

export async function getCompany(companyId: string): Promise<Company | null> {
  const snap = await getDoc(doc(db, COL, companyId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Company
}

export async function updateCompany(companyId: string, data: Partial<Company>): Promise<void> {
  await updateDoc(doc(db, COL, companyId), { ...data, updatedAt: serverTimestamp() })
}
