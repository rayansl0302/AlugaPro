import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User, UserRole } from '@/types'
import { Timestamp } from 'firebase/firestore'
import { getInviteByEmail } from '@/services/invites'
import { createTrialSubscription, getSubscription } from '@/services/subscription'
import { queryClient } from '@/lib/queryClient'

// ── Admins reais (somente estes e-mails recebem o papel de administrador) ──────
const ADMIN_EMAILS = ['rayansl0302@gmail.com', 'rayansl.dev@gmail.com']
const ROLE_HINT_KEY = 'alugapro_role_hint'

type LoginRole = 'gestor' | 'inquilino'

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}

function baseProfile(
  fbUser: FirebaseUser,
  id: string,
  role: UserRole,
  companyId: string,
  docData: Partial<User> | null
): User {
  return {
    id,
    name: docData?.name ?? fbUser.displayName ?? fbUser.email ?? 'Usuário',
    email: fbUser.email ?? docData?.email ?? '',
    role,
    companyId,
    tenantId: docData?.tenantId,
    phone: docData?.phone,
    whatsapp: docData?.whatsapp,
    phoneVerified: docData?.phoneVerified ?? false,
    phoneVerifiedAt: docData?.phoneVerifiedAt,
    avatar: docData?.avatar ?? fbUser.photoURL ?? undefined,
    active: docData?.active ?? true,
    createdAt: docData?.createdAt ?? Timestamp.now(),
    updatedAt: docData?.updatedAt ?? Timestamp.now(),
  }
}

// Resolve o perfil do usuário autenticado, na ordem:
// 1) e-mail admin → admin; 2) doc users/{uid} existente; 3) convite criado
// pelo gestor (vincula empresa/inquilino); 4) fallback pela aba escolhida.
async function resolveUserProfile(fbUser: FirebaseUser, hintRole: UserRole): Promise<User> {
  let docData: Partial<User> | null = null
  try {
    const snap = await getDoc(doc(db, 'users', fbUser.uid))
    if (snap.exists()) docData = snap.data() as Partial<User>
  } catch {
    // Firebase não configurado — ignora
  }

  if (isAdminEmail(fbUser.email)) {
    return baseProfile(fbUser, fbUser.uid, 'admin', docData?.companyId ?? 'demo-company', docData)
  }

  if (docData?.role) {
    const profileId =
      docData.role === 'inquilino' && docData.tenantId ? docData.tenantId : fbUser.uid
    return baseProfile(fbUser, profileId, docData.role, docData.companyId ?? 'demo-company', docData)
  }

  const email = (fbUser.email ?? '').toLowerCase()
  if (email) {
    try {
      const invite = await getInviteByEmail(email)
      if (invite) {
        const profileId =
          invite.role === 'inquilino' && invite.tenantId ? invite.tenantId : fbUser.uid
        try {
          await setDoc(
            doc(db, 'users', fbUser.uid),
            {
              name: invite.name || fbUser.displayName || email,
              email: fbUser.email ?? '',
              role: invite.role,
              companyId: invite.companyId,
              tenantId: invite.tenantId ?? null,
              active: true,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        } catch {
          // a regra exige correspondência com o convite — se falhar, segue em memória
        }
        return baseProfile(fbUser, profileId, invite.role, invite.companyId, { name: invite.name })
      }
    } catch {
      // ignora
    }
  }

  // Novo gestor sem convite: cria empresa própria automaticamente
  if (hintRole === 'gestor') {
    const companyId = `company_${fbUser.uid}`
    try {
      // Cria o doc da empresa se não existir
      const companyRef = doc(db, 'companies', companyId)
      const companySnap = await getDoc(companyRef)
      if (!companySnap.exists()) {
        await setDoc(companyRef, {
          id: companyId,
          name: fbUser.displayName ?? fbUser.email ?? 'Minha Empresa',
          email: fbUser.email ?? '',
          ownerId: fbUser.uid,
          createdAt: serverTimestamp(),
        })
      }
      // Cria o doc do usuário
      await setDoc(doc(db, 'users', fbUser.uid), {
        name: fbUser.displayName ?? fbUser.email ?? 'Usuário',
        email: fbUser.email ?? '',
        role: 'gestor',
        companyId,
        active: true,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      // Cria trial se ainda não existe assinatura
      const existingSub = await getSubscription(companyId)
      if (!existingSub) await createTrialSubscription(companyId)
    } catch {
      // Firebase não configurado ou regra bloqueou — cai no fallback
      return baseProfile(fbUser, fbUser.uid, hintRole, 'demo-company', docData)
    }
    return baseProfile(fbUser, fbUser.uid, 'gestor', companyId, docData)
  }

  return baseProfile(fbUser, fbUser.uid, hintRole, 'demo-company', docData)
}

// ── Usuários demo (disponíveis em todas as builds, inclusive Vercel) ───────────
// Credenciais públicas para demonstrações comerciais — companyId demo-company
// tem dados de vitrine e nunca toca em dados reais ou cobranças reais.
const DEMO_USERS: Record<string, User> = {
  'admin@alugapro.com': {
    id: 'demo-admin',
    name: 'Administrador',
    email: 'admin@alugapro.com',
    role: 'admin',
    companyId: 'alugapro-demo',
    active: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  'gestor@alugapro.com': {
    id: 'demo-gestor',
    name: 'Carlos Gestor',
    email: 'gestor@alugapro.com',
    role: 'gestor',
    companyId: 'alugapro-demo',
    active: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  'inquilino@alugapro.com': {
    id: 'demo-inquilino',
    name: 'Roberto Alves',
    email: 'inquilino@alugapro.com',
    role: 'inquilino',
    companyId: 'alugapro-demo',
    tenantId: 'demo-tenant-roberto',
    active: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
}
const DEMO_PASSWORD = 'demo1234'
const DEMO_SESSION_KEY = 'alugapro_demo_user'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string, intendedRole?: LoginRole) => Promise<void>
  signUp: (name: string, email: string, password: string, role?: LoginRole) => Promise<void>
  signInWithGoogle: (intendedRole?: LoginRole) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateLocalUser: (patch: Partial<User>) => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem(DEMO_SESSION_KEY)
    return stored ? (JSON.parse(stored) as User) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If already logged in via demo, skip Firebase listener setup delay
    if (sessionStorage.getItem(DEMO_SESSION_KEY)) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        const hint = (localStorage.getItem(ROLE_HINT_KEY) as UserRole) || 'gestor'
        setUser(await resolveUserProfile(fbUser, hint))
      } else {
        if (!sessionStorage.getItem(DEMO_SESSION_KEY)) setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string, intendedRole: LoginRole = 'gestor') => {
    const demoUser = DEMO_USERS[email.toLowerCase()]
    if (demoUser && password === DEMO_PASSWORD) {
      sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser))
      setUser(demoUser)
      return
    }
    localStorage.setItem(ROLE_HINT_KEY, intendedRole)
    // Fall through to Firebase
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (name: string, email: string, password: string, role: LoginRole = 'gestor') => {
    localStorage.setItem(ROLE_HINT_KEY, role)
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    setUser(await resolveUserProfile(cred.user, role))
  }

  const signInWithGoogle = async (intendedRole: LoginRole = 'gestor') => {
    localStorage.setItem(ROLE_HINT_KEY, intendedRole)
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const cred = await signInWithPopup(auth, provider)
    setUser(await resolveUserProfile(cred.user, intendedRole))
  }

  const logout = async () => {
    sessionStorage.removeItem(DEMO_SESSION_KEY)
    setUser(null)
    setFirebaseUser(null)
    queryClient.clear()
    try { await signOut(auth) } catch { /* Firebase may not be configured */ }
  }

  const resetPassword = async (email: string) => {
    if (DEMO_USERS[email.toLowerCase()]) return // silently skip for demo
    await sendPasswordResetEmail(auth, email)
  }

  const refreshProfile = async () => {
    const fbUser = auth.currentUser
    if (!fbUser) return
    const hint = (localStorage.getItem(ROLE_HINT_KEY) as UserRole) || 'gestor'
    setUser(await resolveUserProfile(fbUser, hint))
  }

  const updateLocalUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      if (sessionStorage.getItem(DEMO_SESSION_KEY)) {
        sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(next))
      }
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, signIn, signUp, signInWithGoogle, logout, resetPassword, updateLocalUser, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
