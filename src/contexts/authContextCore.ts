// Definição isolada do contexto de auth, sem nenhum import "de valor" que
// toque Firebase/i18n/serviços — só `react` e tipos (import type, sempre
// apagados na compilação). Existe separado de AuthContext.tsx justamente pra
// poder ser importado com segurança pelo script de pré-renderização
// (scripts/prerender.tsx), que roda em Node puro e não pode inicializar o
// Firebase real (precisaria de window/indexedDB, inexistentes ali).
import { createContext } from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import type { User, AppLocale } from '@/types'

export type LoginRole = 'gestor' | 'inquilino' | 'afiliado'

export interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string, intendedRole?: LoginRole) => Promise<void>
  signUp: (name: string, email: string, password: string, role?: LoginRole, refCode?: string) => Promise<void>
  signInWithGoogle: (intendedRole?: LoginRole, refCode?: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateLocalUser: (patch: Partial<User>) => void
  refreshProfile: () => Promise<void>
  setLocale: (locale: AppLocale) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
