import {
  collection, getDocs, query, where,
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
