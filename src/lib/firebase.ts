import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getMessaging, isSupported } from 'firebase/messaging'

// import.meta.env não existe fora do Vite (ex: quando este módulo é
// carregado pelo script de pré-renderização, scripts/prerender.tsx, rodando
// em Node puro via tsx) — usa config placeholder nesse caso (nunca é usada de
// verdade: o script pré-renderiza páginas públicas com um Auth stub, sem
// nenhuma chamada real ao Firebase; valores vazios fariam initializeApp
// falhar com auth/invalid-api-key). No bundle real do app (browser) o Vite
// sempre injeta import.meta.env normalmente, então este fallback nunca entra.
const PRERENDER_PLACEHOLDER_ENV: Record<string, string> = {
  VITE_FIREBASE_API_KEY: 'prerender-placeholder-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'prerender-placeholder.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'prerender-placeholder',
  VITE_FIREBASE_STORAGE_BUCKET: 'prerender-placeholder.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  VITE_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
}
const env = import.meta.env ?? PRERENDER_PLACEHOLDER_ENV

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
// Evita que uploads fiquem ~2min reprocessando (padrão do SDK) quando o bucket
// rejeita a requisição (ex.: CORS não liberado) — falha rápido para o fallback.
storage.maxUploadRetryTime = 15000
storage.maxOperationRetryTime = 15000

export const getMessagingInstance = async () => {
  const supported = await isSupported()
  if (supported) return getMessaging(app)
  return null
}

export default app
