import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { unsubscribeByContactId } from '@/services/emailMarketing'

type Status = 'loading' | 'done' | 'invalid' | 'error'

/**
 * Página pública de descadastro (LGPD / one-click unsubscribe).
 * Recebe ?c=<id opaco> — nunca o e-mail em texto. Marca optedOut=true e o
 * backend de envio passa a pular esse contato.
 */
export function UnsubscribePage() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const contactId = params.get('c') ?? ''

  useEffect(() => {
    if (!/^[a-f0-9]{64}$/.test(contactId)) {
      setStatus('invalid')
      return
    }
    let active = true
    unsubscribeByContactId(contactId)
      .then(() => active && setStatus('done'))
      .catch(() => active && setStatus('error'))
    return () => {
      active = false
    }
  }, [contactId])

  return (
    <div className="light pb-safe min-h-screen bg-slate-50 text-foreground">
      <LandingHeader />

      <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-6 text-muted-foreground">Processando seu descadastro…</p>
          </>
        )}

        {status === 'done' && (
          <>
            <CheckCircle2 className="h-14 w-14 text-green-600" />
            <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
              Descadastro concluído
            </h1>
            <p className="mt-3 text-muted-foreground">
              Pronto! Você não vai mais receber nossos e-mails de comunicação e novidades.
              Se mudar de ideia, é só falar com a gente.
            </p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <XCircle className="h-14 w-14 text-amber-500" />
            <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
              Link inválido
            </h1>
            <p className="mt-3 text-muted-foreground">
              Este link de descadastro está incompleto ou incorreto. Abra-o direto pelo
              botão “Descadastrar” do e-mail que você recebeu.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-14 w-14 text-red-500" />
            <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
              Não foi possível descadastrar
            </h1>
            <p className="mt-3 text-muted-foreground">
              Algo deu errado ao processar seu pedido. Tente novamente em instantes ou
              escreva para suporte@alugapro.com.br que a gente resolve pra você.
            </p>
          </>
        )}

        <Link
          to="/"
          className="mt-10 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao site
        </Link>
      </main>

      <LandingFooter />
    </div>
  )
}
