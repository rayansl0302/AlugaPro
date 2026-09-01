import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const COL = 'notificationSettings'

export interface NotificationRuleChannels {
  whatsapp: boolean
  email: boolean
  push: boolean
}

export interface NotificationSettings {
  rules: Record<string, NotificationRuleChannels>
  templates: {
    waBefore: string
    waAfter: string
    emailSubject: string
  }
}

export async function getNotificationSettings(companyId: string): Promise<NotificationSettings | null> {
  const snap = await getDoc(doc(db, COL, companyId))
  if (!snap.exists()) return null
  const data = snap.data()
  return { rules: data.rules ?? {}, templates: data.templates ?? {} }
}

export async function saveNotificationSettings(
  companyId: string,
  settings: NotificationSettings
): Promise<void> {
  await setDoc(doc(db, COL, companyId), { ...settings, updatedAt: serverTimestamp() })
}
