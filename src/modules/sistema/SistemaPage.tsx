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
  MessageSquare, Send, Plus, Search, ArrowLeft, LogOut, Loader2, CheckCheck, Smartphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/useToast'

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

// ─── Login mínimo dedicado ao /sistema ─────────────────────────────────────────
function SistemaLogin() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
  const { user, logout } = useAuth()
  const companyId = user?.companyId ?? ''
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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!companyId) return
    return subscribeToConversations(companyId, setConversations)
  }, [companyId])

  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    markConversationRead(selectedId)
    return subscribeToMessages(selectedId, setMessages)
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
      const id = await startOrGetConversation(companyId, newPhone, newName.trim(), agent)
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
    </div>
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
