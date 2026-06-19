import { useState, useEffect, useRef, FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  subscribeToConversations, subscribeToMessages, startOrGetConversation,
  sendSalesMessage, markConversationRead, normalizePhone,
} from '@/services/salesChat'
import { SalesConversation, SalesMessage } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  MessageSquare, Send, Plus, Search, ArrowLeft, LogOut, Loader2, CheckCheck, Smartphone, Users, UserPlus,
} from 'lucide-react'
import {
  collection, query, where, getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/useToast'

// Mesmo valor fixo usado em AuthContext (COMERCIAL_COMPANY_ID) e no webhook
// (SALES_COMPANY_ID). /sistema não usa o companyId real do usuário logado —
// admin e comercial sempre operam neste mesmo espaço interno fixo.
const SALES_COMPANY_ID = 'alugapro-interno'

function formatTime(ts?: { toDate?: () => Date } | null): string {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(ts?: { toDate?: () => Date } | null): string {
  if (!ts?.toDate) return ''
  const d = ts.toDate()
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return formatTime(ts)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

// ─── Login mínimo dedicado ao /sistema ─────────────────────────────────────────
function SistemaLogin() {
  const { signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch {
      setError('E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch {
      setError('Não foi possível entrar com Google.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-white">Sistema Comercial</h1>
          <p className="text-sm text-slate-400">Acesso restrito a agentes</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300">E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-slate-700 bg-slate-800 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-slate-700 bg-slate-800 text-white"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>

        <div className="my-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs text-slate-500">ou</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={googleLoading}
          onClick={handleGoogle}
          className="w-full gap-2 border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
        >
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Entrar com Google
        </Button>
      </div>
    </div>
  )
}

function AccessDenied() {
  const { logout } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 p-4 text-center">
      <Smartphone className="h-10 w-10 text-slate-600" />
      <p className="text-white">Esta conta não tem acesso ao Sistema Comercial.</p>
      <Button variant="outline" onClick={logout}>
        <LogOut className="mr-2 h-4 w-4" /> Sair
      </Button>
    </div>
  )
}

// ─── Chat principal ────────────────────────────────────────────────────────────
function SistemaChat() {
  const { user, firebaseUser, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const agent = { id: user!.id, name: user!.name }

  const [conversations, setConversations] = useState<SalesConversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SalesMessage[]>([])
  const [search, setSearch] = useState('')
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [newName, setNewName] = useState('')
  const [startingChat, setStartingChat] = useState(false)
  const [showAgents, setShowAgents] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return subscribeToConversations(SALES_COMPANY_ID, setConversations, (err) => {
      toast({ title: 'Erro ao carregar conversas.', description: err.message, variant: 'destructive' })
    })
  }, [])

  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    markConversationRead(selectedId)
    return subscribeToMessages(selectedId, setMessages, (err) => {
      toast({ title: 'Erro ao carregar mensagens.', description: err.message, variant: 'destructive' })
    })
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selected = conversations.find((c) => c.id === selectedId) ?? null

  const filtered = conversations.filter((c) =>
    (c.contactName || c.phone).toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  )

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !selected || sending) return
    setSending(true)
    const text = messageText.trim()
    setMessageText('')
    try {
      await sendSalesMessage(selected.id, selected.phone, text, agent)
    } catch {
      toast({ title: 'Erro ao enviar mensagem.', variant: 'destructive' })
      setMessageText(text)
    } finally {
      setSending(false)
    }
  }

  const handleStartChat = async (e: FormEvent) => {
    e.preventDefault()
    if (!newPhone.trim() || startingChat) return
    setStartingChat(true)
    try {
      const id = await startOrGetConversation(SALES_COMPANY_ID, newPhone, newName.trim(), agent)
      setSelectedId(id)
      setShowNewChat(false)
      setNewPhone('')
      setNewName('')
    } catch {
      toast({ title: 'Erro ao iniciar conversa.', variant: 'destructive' })
    } finally {
      setStartingChat(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold">Sistema Comercial</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="hidden sm:inline">{user?.name}</span>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAgents(true)}
              className="h-8 w-8 text-slate-400 hover:text-white"
              title="Gerenciar agentes"
            >
              <Users className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-slate-400 hover:text-white">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Lista de conversas */}
        <div className={cn(
          'w-full flex-col border-r border-slate-800 md:flex md:w-80',
          selectedId ? 'hidden' : 'flex',
        )}>
          <div className="flex items-center gap-2 p-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Buscar conversa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-slate-700 bg-slate-800 pl-9 text-white placeholder:text-slate-500"
              />
            </div>
            <Button size="icon" className="shrink-0 bg-green-600 hover:bg-green-700" onClick={() => setShowNewChat(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-slate-500">
                <MessageSquare className="h-8 w-8" />
                <p className="text-sm">Nenhuma conversa ainda</p>
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-slate-800/50 px-4 py-3 text-left transition-colors hover:bg-slate-800/60',
                    selectedId === c.id && 'bg-slate-800',
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 font-medium text-slate-200">
                    {(c.contactName || c.phone).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{c.contactName || c.phone}</p>
                      <span className="shrink-0 text-xs text-slate-500">{formatDay(c.lastMessageAt)}</span>
                    </div>
                    <p className={cn('truncate text-sm', c.unread ? 'font-medium text-slate-200' : 'text-slate-500')}>
                      {c.lastMessageDirection === 'outbound' && '✓ '}{c.lastMessageText || 'Nova conversa'}
                    </p>
                  </div>
                  {c.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={cn('flex-1 flex-col md:flex', selectedId ? 'flex' : 'hidden')}>
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-500">
              <MessageSquare className="h-12 w-12" />
              <p>Selecione uma conversa para começar</p>
            </div>
          ) : (
            <>
              <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900 px-4">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedId(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 font-medium">
                  {(selected.contactName || selected.phone).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{selected.contactName || selected.phone}</p>
                  <p className="truncate text-xs text-slate-500">{selected.phone}</p>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div key={m.id} className={cn('flex', m.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[75%] rounded-lg px-3 py-2 text-sm',
                        m.direction === 'outbound'
                          ? m.status === 'failed' ? 'bg-red-900/60 text-red-200' : 'bg-green-700 text-white'
                          : 'bg-slate-800 text-slate-100',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                        {formatTime(m.createdAt)}
                        {m.direction === 'outbound' && m.status !== 'failed' && <CheckCheck className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-800 bg-slate-900 p-3">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
                <Button type="submit" size="icon" disabled={!messageText.trim() || sending} className="shrink-0 bg-green-600 hover:bg-green-700">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Nova conversa */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStartChat} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Número (WhatsApp)</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required
                autoFocus
              />
              {newPhone && (
                <p className="text-xs text-muted-foreground">Enviando para: {normalizePhone(newPhone)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Nome (opcional)</Label>
              <Input
                placeholder="Nome do contato"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={startingChat} className="w-full">
              {startingChat && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar conversa
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Gestão de agentes — só admin */}
      {isAdmin && (
        <AgentManagementDialog
          open={showAgents}
          onOpenChange={setShowAgents}
          firebaseUser={firebaseUser}
        />
      )}
    </div>
  )
}

// ─── Gestão de agentes (admin) ──────────────────────────────────────────────────
interface AgentDoc {
  id: string
  name: string
  email: string
  active?: boolean
}

function AgentManagementDialog({
  open, onOpenChange, firebaseUser,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  firebaseUser: { getIdToken: () => Promise<string> } | null
}) {
  const [agents, setAgents] = useState<AgentDoc[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  const loadAgents = async () => {
    setLoadingAgents(true)
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'comercial')))
      setAgents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AgentDoc)))
    } catch {
      toast({ title: 'Erro ao carregar agentes.', variant: 'destructive' })
    } finally {
      setLoadingAgents(false)
    }
  }

  useEffect(() => {
    if (open) loadAgents()
  }, [open])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!firebaseUser) {
      setFormError('Sessão sem login real do Firebase — use uma conta admin de verdade (não a demo).')
      return
    }
    setFormError('')
    setCreating(true)
    try {
      const idToken = await firebaseUser.getIdToken()
      const res = await fetch('/api/sistema-create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setFormError(data.error || 'Erro ao criar agente.')
        return
      }
      toast({ title: 'Agente criado com sucesso.' })
      setName(''); setEmail(''); setPassword('')
      loadAgents()
    } catch {
      setFormError('Erro de conexão ao criar agente.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Agentes comerciais
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-48 space-y-1 overflow-y-auto">
          {loadingAgents ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Nenhum agente cadastrado ainda.</p>
          ) : (
            agents.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </div>
                {a.active === false && <span className="text-xs text-destructive">Inativo</span>}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleCreate} className="space-y-3 border-t pt-4">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <UserPlus className="h-4 w-4" /> Novo agente
          </p>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Senha provisória</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" disabled={creating} className="w-full">
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar agente
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Entry point ───────────────────────────────────────────────────────────────
export function SistemaPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!user) return <SistemaLogin />
  if (user.role !== 'comercial' && user.role !== 'admin') return <AccessDenied />
  return <SistemaChat />
}
