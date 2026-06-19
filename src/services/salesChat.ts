import {
  collection, doc, addDoc, updateDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, getDocs, limit as fbLimit, Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { SalesConversation, SalesMessage } from '@/types'

const CONVERSATIONS_COL = 'salesConversations'

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('55')) return digits
  return '55' + digits
}

export function subscribeToConversations(
  companyId: string,
  callback: (conversations: SalesConversation[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, CONVERSATIONS_COL),
    where('companyId', '==', companyId),
    orderBy('lastMessageAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesConversation))),
    () => callback([]),
  )
}

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: SalesMessage[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, CONVERSATIONS_COL, conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesMessage))),
    () => callback([]),
  )
}

async function findConversationByPhone(companyId: string, phone: string): Promise<string | null> {
  const q = query(
    collection(db, CONVERSATIONS_COL),
    where('companyId', '==', companyId),
    where('phone', '==', phone),
    fbLimit(1),
  )
  const snap = await getDocs(q)
  return snap.empty ? null : snap.docs[0].id
}

export async function startOrGetConversation(
  companyId: string,
  phone: string,
  contactName: string | undefined,
  agent: { id: string; name: string },
): Promise<string> {
  const normalized = normalizePhone(phone)
  const existingId = await findConversationByPhone(companyId, normalized)
  if (existingId) return existingId

  const ref = await addDoc(collection(db, CONVERSATIONS_COL), {
    companyId,
    phone: normalized,
    contactName: contactName || '',
    lastMessageText: '',
    lastMessageAt: serverTimestamp(),
    lastMessageDirection: 'outbound',
    unread: false,
    createdBy: agent.id,
    createdByName: agent.name,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function sendSalesMessage(
  conversationId: string,
  phone: string,
  text: string,
  agent: { id: string; name: string },
): Promise<void> {
  await addDoc(collection(db, CONVERSATIONS_COL, conversationId, 'messages'), {
    direction: 'outbound',
    text,
    senderId: agent.id,
    senderName: agent.name,
    status: 'sent',
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, CONVERSATIONS_COL, conversationId), {
    lastMessageText: text,
    lastMessageAt: serverTimestamp(),
    lastMessageDirection: 'outbound',
    unread: false,
  })

  try {
    const res = await fetch('/api/sistema-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': (import.meta.env.VITE_INTERNAL_API_KEY as string) ?? '',
      },
      body: JSON.stringify({ phone, text }),
    })
    if (!res.ok) throw new Error('send failed')
  } catch {
    await addDoc(collection(db, CONVERSATIONS_COL, conversationId, 'messages'), {
      direction: 'outbound',
      text: '⚠️ Falha ao entregar — verifique a conexão do WhatsApp.',
      status: 'failed',
      createdAt: serverTimestamp(),
    })
  }
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await updateDoc(doc(db, CONVERSATIONS_COL, conversationId), { unread: false })
}
