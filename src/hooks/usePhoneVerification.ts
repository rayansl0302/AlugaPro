import { useCallback, useRef, useState } from 'react'
import {
  RecaptchaVerifier,
  linkWithPhoneNumber,
  unlink,
  type AuthError,
  type ConfirmationResult,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

export type PhoneVerificationStep = 'phone' | 'code'

function messageFor(code?: string): string {
  switch (code) {
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':
      return 'Número de telefone inválido.'
    case 'auth/invalid-verification-code':
      return 'Código incorreto. Verifique e tente novamente.'
    case 'auth/code-expired':
      return 'Código expirado. Solicite um novo código.'
    case 'auth/quota-exceeded':
      return 'Limite de envios de SMS excedido. Tente novamente mais tarde.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
    case 'auth/credential-already-in-use':
    case 'auth/account-exists-with-different-credential':
      return 'Este número já está vinculado a outra conta.'
    case 'auth/operation-not-allowed':
      return 'A verificação por telefone não está habilitada no Firebase.'
    case 'auth/captcha-check-failed':
      return 'Falha na verificação de segurança (reCAPTCHA). Recarregue a página e tente novamente.'
    default:
      return 'Não foi possível concluir a verificação. Tente novamente.'
  }
}

export function usePhoneVerification() {
  const [step, setStep] = useState<PhoneVerificationStep>('phone')
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const verifierRef = useRef<RecaptchaVerifier | null>(null)

  const cleanupVerifier = () => {
    if (verifierRef.current) {
      try { verifierRef.current.clear() } catch { /* noop */ }
      verifierRef.current = null
    }
  }

  const sendCode = useCallback(async (phoneE164: string, containerId: string) => {
    setError(null)
    if (!auth.currentUser) {
      setError('Você precisa estar logado em uma conta real para verificar o telefone.')
      return false
    }
    setSending(true)

    const attempt = () => {
      cleanupVerifier()
      const verifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' })
      verifierRef.current = verifier
      return linkWithPhoneNumber(auth.currentUser!, phoneE164, verifier)
    }

    try {
      let confirmation: ConfirmationResult
      try {
        confirmation = await attempt()
      } catch (err) {
        if ((err as AuthError)?.code === 'auth/provider-already-linked') {
          await unlink(auth.currentUser, 'phone')
          confirmation = await attempt()
        } else {
          throw err
        }
      }
      confirmationRef.current = confirmation
      setStep('code')
      return true
    } catch (err) {
      cleanupVerifier()
      setError(messageFor((err as AuthError)?.code))
      return false
    } finally {
      setSending(false)
    }
  }, [])

  const confirmCode = useCallback(async (code: string) => {
    setError(null)
    if (!confirmationRef.current) {
      setError('Solicite um novo código.')
      return false
    }
    setConfirming(true)
    try {
      await confirmationRef.current.confirm(code)
      cleanupVerifier()
      return true
    } catch (err) {
      setError(messageFor((err as AuthError)?.code))
      return false
    } finally {
      setConfirming(false)
    }
  }, [])

  const reset = useCallback(() => {
    cleanupVerifier()
    confirmationRef.current = null
    setStep('phone')
    setError(null)
    setSending(false)
    setConfirming(false)
  }, [])

  return { step, sending, confirming, error, sendCode, confirmCode, reset }
}
