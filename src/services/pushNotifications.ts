import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { getToken, onMessage } from 'firebase/messaging'
import { db, getMessagingInstance } from '@/lib/firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

// Pede permissão de notificação ao navegador, obtém o token FCM e salva no
// doc do usuário (users/{uid}.fcmTokens, array — suporta múltiplos dispositivos).
export async function enablePushNotifications(uid: string): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: 'Notificações não suportadas neste navegador.' }
  if (!VAPID_KEY) return { ok: false, error: 'Push não configurado (falta VITE_FIREBASE_VAPID_KEY).' }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, error: 'Permissão de notificação negada.' }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    const messaging = await getMessagingInstance()
    if (!messaging) return { ok: false, error: 'Firebase Messaging não suportado neste navegador.' }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
    if (!token) return { ok: false, error: 'Não foi possível obter o token de notificação.' }

    await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) })

    // Notificações recebidas com o app aberto (foreground) não aparecem
    // sozinhas — o SDK só dispara o evento onMessage, então mostramos manualmente.
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? 'AlugaPro'
      const body = payload.notification?.body ?? ''
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.png' })
      }
    })

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function disablePushNotifications(uid: string): Promise<void> {
  if (!pushSupported()) return
  try {
    const messaging = await getMessagingInstance()
    if (!messaging) return
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
    if (!registration) return
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration }).catch(() => null)
    if (token) await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayRemove(token) })
  } catch {
    // Best-effort — não bloqueia a UI se falhar
  }
}
