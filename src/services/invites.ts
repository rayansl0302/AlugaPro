import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { UserRole } from '@/types'

const COL = 'userInvites'

export interface UserInvite {
  email: string
  companyId: string
  role: UserRole
  tenantId?: string
  name?: string
}

function inviteId(email: string) {
  return email.trim().toLowerCase()
}

export async function upsertTenantInvite(params: {
  email: string
  companyId: string
  tenantId: string
  name?: string
}): Promise<void> {
  const id = inviteId(params.email)
  await setDoc(
    doc(db, COL, id),
    {
      email: id,
      companyId: params.companyId,
      role: 'inquilino',
      tenantId: params.tenantId,
      name: params.name ?? '',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function getInviteByEmail(email: string): Promise<UserInvite | null> {
  const snap = await getDoc(doc(db, COL, inviteId(email)))
  if (!snap.exists()) return null
  return snap.data() as UserInvite
}
