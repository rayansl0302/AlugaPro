import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Send, Users, Upload, Trash2, Loader2, Eye, RefreshCw, AlertTriangle,
  ListPlus, FlaskConical, ClipboardList, CheckCircle2, ChevronDown,
  MousePointerClick, MessageSquare, StickyNote, Tag, Reply, Pencil, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import {
  EMAIL_TEMPLATES, templateDefaults, renderMarketingEmail, type EmailTemplateId,
} from '@/lib/emailMarketing'
import {
  type Audience, type Recipient, type MarketingLead, type LeadStatus, type LeadActivity,
  LEAD_STATUSES, REPLY_TO_ADDRESS, collectRecipients, parseEmailList,
  getLeads, addLead, deleteLead, updateLead, setLeadStatus, addLeadNote, subscribeLeadActivity,
  addLeadsBulk, importLeadsFromCsv, importLeadsFromExcel,
  sendCampaign, logCampaign, recordCampaignSentToLeads, replyToLead, getCampaigns,
} from '@/services/emailMarketing'

const AUDIENCES: { id: Audience; label: string; hint: string }[] = [
  { id: 'gestores', label: 'Gestores (clientes)', hint: 'Donos de conta no sistema' },
  { id: 'inquilinos', label: 'Inquilinos', hint: 'Locatários com e-mail cadastrado' },
  { id: 'afiliados', label: 'Afiliados', hint: 'Parceiros do programa' },
  { id: 'leads', label: 'Leads / prospecção', hint: 'Base salva na aba Leads' },
]

const textareaClass =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

// Cores/rótulos de cada temperatura de lead (claro + escuro).
const STATUS_META: Record<LeadStatus, { label: string; dot: string; badge: string }> = {
  novo: { label: 'Novo', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  quente: { label: 'Quente', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
  morno: { label: 'Morno', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  frio: { label: 'Frio', dot: 'bg-sky-500', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300' },
  invalido: { label: 'Inválido', dot: 'bg-neutral-400', badge: 'bg-neutral-100 text-neutral-500 line-through dark:bg-neutral-800 dark:text-neutral-400' },
}

function leadStatus(l: MarketingLead): LeadStatus {
  return l.status ?? 'novo'
}

// Ícone + texto de cada tipo de evento na timeline do lead.
const ACTIVITY_META: Record<LeadActivity['type'], { icon: React.ElementType; label: string; tone: string }> = {
  sent: { icon: Send, label: 'E-mail enviado', tone: 'text-slate-500' },
  opened: { icon: Eye, label: 'Abriu o e-mail', tone: 'text-amber-600' },
  clicked: { icon: MousePointerClick, label: 'Clicou no e-mail', tone: 'text-red-600' },
  replied: { icon: Reply, label: 'Respondeu', tone: 'text-green-600' },
  bounced: { icon: AlertTriangle, label: 'Bounce (e-mail inválido)', tone: 'text-neutral-500' },
  complained: { icon: AlertTriangle, label: 'Marcou como spam', tone: 'text-neutral-500' },
  note: { icon: StickyNote, label: 'Nota', tone: 'text-primary' },
  status: { icon: Tag, label: 'Classificação alterada', tone: 'text-primary' },
}

function fmtDateTime(ts?: { toDate: () => Date }): string {
  try { return ts ? ts.toDate().toLocaleString('pt-BR') : '' } catch { return '' }
}

/** Cabeçalho de etapa numerada, pra dar sensação de fluxo (1 → 2 → 3). */
function StepTitle({ n, icon: Icon, title, hint }: { n: number; icon: React.ElementType; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <div>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" /> {title}
        </CardTitle>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

/**
 * Painel de e-mail marketing (admin), embutido em Configurações. Sub-abas:
 * Compor (fluxo em etapas + teste + envio), Leads (base salva) e Histórico.
 */
export function EmailMarketingPanel() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">E-mail Marketing</h2>
          <p className="text-sm text-muted-foreground">
            Disparos padronizados para clientes, inquilinos, afiliados e leads.
          </p>
        </div>
      </div>

      <Tabs defaultValue="compor">
        <TabsList className="mb-6">
          <TabsTrigger value="compor">Compor &amp; enviar</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="compor"><ComposeTab /></TabsContent>
        <TabsContent value="historico"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Aba: Compor + enviar ─────────────────────────────────────────────────────

function ComposeTab() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Passo 1 — audiência
  const [audiences, setAudiences] = useState<Set<Audience>>(new Set(['gestores']))
  const [useList, setUseList] = useState(false)
  const [listRaw, setListRaw] = useState('')
  const [count, setCount] = useState<number | null>(null)

  // Passo 2 — conteúdo
  const [templateId, setTemplateId] = useState<EmailTemplateId>('boasVindas')
  const [subject, setSubject] = useState('')
  // Padrão: reply-to no endereço de inbox, pra as respostas caírem no CRM.
  const [replyTo, setReplyTo] = useState(REPLY_TO_ADDRESS)
  const seed = useMemo(() => templateDefaults(templateId), [templateId])
  const [headline, setHeadline] = useState(seed.headline)
  const [preheader, setPreheader] = useState(seed.preheader)
  const [bodyText, setBodyText] = useState(seed.paragraphs.join('\n\n'))
  const [ctaLabel, setCtaLabel] = useState(seed.ctaLabel)
  const [ctaUrl, setCtaUrl] = useState(seed.ctaUrl)

  // Passo 3 — teste/envio
  const [testEmail, setTestEmail] = useState(user?.email ?? '')
  const [showPreview, setShowPreview] = useState(true)

  const applyTemplate = (id: EmailTemplateId) => {
    setTemplateId(id)
    const d = templateDefaults(id)
    setHeadline(d.headline)
    setPreheader(d.preheader)
    setBodyText(d.paragraphs.join('\n\n'))
    setCtaLabel(d.ctaLabel)
    setCtaUrl(d.ctaUrl)
  }

  const toggleAudience = (id: Audience) => {
    setCount(null)
    setAudiences((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const listRecipients = useMemo<Recipient[]>(
    () => (useList ? parseEmailList(listRaw) : []),
    [useList, listRaw],
  )

  const html = useMemo(
    () =>
      renderMarketingEmail({
        preheader,
        headline,
        paragraphs: bodyText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
      }),
    [preheader, headline, bodyText, ctaLabel, ctaUrl],
  )

  const previewHtml = useMemo(
    () => html.split('{{name}}').join('você').split('{{unsubscribeUrl}}').join('#'),
    [html],
  )

  function validate(): { subject: string } {
    if (!subject.trim()) throw new Error('Informe o assunto do e-mail.')
    if (audiences.size === 0 && listRecipients.length === 0) {
      throw new Error('Escolha ao menos uma audiência ou cole uma lista de e-mails.')
    }
    return { subject: subject.trim() }
  }

  // Contagem de destinatários (prévia)
  const countMut = useMutation({
    mutationFn: () => collectRecipients([...audiences], listRecipients),
    onSuccess: (r) => setCount(r.length),
    onError: () => setCount(null),
  })

  // Envio de teste — só pra 1 e-mail, não entra no histórico.
  const testMut = useMutation({
    mutationFn: async () => {
      const { subject: subj } = validate()
      const email = testEmail.trim().toLowerCase()
      if (!email.includes('@')) throw new Error('Informe um e-mail de teste válido.')
      return sendCampaign({
        subject: `[TESTE] ${subj}`,
        html,
        recipients: [{ email, name: user?.name }],
        replyTo: replyTo.trim() || undefined,
      })
    },
    onSuccess: (r) =>
      toast({
        title: r.sent > 0 ? `E-mail de teste enviado para ${testEmail}.` : 'Teste não enviado (destinatário pulado/descadastrado).',
      }),
    onError: (e) => toast({ title: e instanceof Error ? e.message : 'Falha no teste.', variant: 'destructive' }),
  })

  // Envio real
  const send = useMutation({
    mutationFn: async () => {
      const { subject: subj } = validate()
      const recipients = await collectRecipients([...audiences], listRecipients)
      if (recipients.length === 0) throw new Error('Nenhum destinatário encontrado.')
      const result = await sendCampaign({
        subject: subj,
        html,
        recipients,
        replyTo: replyTo.trim() || undefined,
      })
      const templateName = EMAIL_TEMPLATES.find((t) => t.id === templateId)?.name ?? templateId
      const campaignId = await logCampaign({
        subject: subj,
        templateName,
        audiences: [...audiences],
        recipientCount: recipients.length,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      })
      // Registra o envio na timeline dos leads atingidos (não impede o resultado).
      try {
        await recordCampaignSentToLeads(recipients.map((r) => r.email), subj, campaignId)
      } catch (err) {
        console.error('[email-marketing] falha ao registrar envio nos leads:', err)
      }
      return result
    },
    onSuccess: (r) => {
      toast({ title: `Campanha enviada — ${r.sent} enviados, ${r.skipped} pulados, ${r.failed} falhas.` })
      queryClient.invalidateQueries({ queryKey: ['emailCampaigns'] })
      queryClient.invalidateQueries({ queryKey: ['marketingLeads'] })
    },
    onError: (e) => toast({ title: e instanceof Error ? e.message : 'Falha ao enviar.', variant: 'destructive' }),
  })

  const busy = send.isPending || testMut.isPending

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,400px)]">
      {/* Coluna do formulário — etapas */}
      <div className="space-y-5">
        {/* Passo 1 — Para quem */}
        <Card>
          <CardHeader className="pb-3">
            <StepTitle n={1} icon={Users} title="Para quem enviar" hint="Escolha audiências salvas e/ou cole uma lista avulsa." />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {AUDIENCES.map((a) => {
                const active = audiences.has(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAudience(a.id)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{a.label}</span>
                      <span className={`h-4 w-4 rounded border ${active ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.hint}</p>
                  </button>
                )
              })}
            </div>

            {/* Lista avulsa */}
            <div className="rounded-lg border border-dashed p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={useList}
                  onChange={(e) => { setUseList(e.target.checked); setCount(null) }}
                  className="h-4 w-4 rounded border-muted-foreground/40 accent-[hsl(var(--primary))]"
                />
                <ListPlus className="h-4 w-4" /> Lista avulsa (colar e-mails)
              </label>
              {useList && (
                <div className="mt-3 space-y-1.5">
                  <textarea
                    value={listRaw}
                    onChange={(e) => { setListRaw(e.target.value); setCount(null) }}
                    rows={4}
                    placeholder={'contato1@empresa.com, contato2@empresa.com\ncontato3@empresa.com'}
                    className={textareaClass}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separe por vírgula, ponto-e-vírgula ou linha.{' '}
                    <strong className="text-foreground">{listRecipients.length}</strong> e-mail(s) válido(s) na lista.
                    {' '}Ótimo pra apresentação/prospecção pontual.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm"
                onClick={() => countMut.mutate()}
                disabled={countMut.isPending || (audiences.size === 0 && listRecipients.length === 0)}
              >
                {countMut.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                Contar destinatários
              </Button>
              {count !== null && (
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{count}</strong> destinatário(s) únicos (sem duplicatas, sem descadastrados)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Passo 2 — Conteúdo */}
        <Card>
          <CardHeader className="pb-3">
            <StepTitle n={2} icon={Mail} title="Conteúdo do e-mail" hint="Comece de um modelo e ajuste o que quiser." />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Select value={templateId} onValueChange={(v) => applyTemplate(v as EmailTemplateId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMAIL_TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do e-mail" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Título (headline)</Label>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Pré-visualização (preheader)</Label>
              <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Texto ao lado do assunto na caixa de entrada" />
            </div>

            <div className="space-y-1.5">
              <Label>Corpo (separe parágrafos com uma linha em branco)</Label>
              <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={7} className={textareaClass} />
              <p className="text-xs text-muted-foreground">
                Use <code>{'{{name}}'}</code> para o nome do destinatário. HTML simples é permitido.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Texto do botão (opcional)</Label>
                <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Link do botão (opcional)</Label>
                <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Responder para (reply-to, opcional)</Label>
              <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="suporte@alugapro.com.br" />
            </div>
          </CardContent>
        </Card>

        {/* Passo 3 — Testar e enviar */}
        <Card>
          <CardHeader className="pb-3">
            <StepTitle n={3} icon={Send} title="Testar e enviar" hint="Mande um teste pra você antes do disparo real." />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3">
              <Label className="flex items-center gap-1.5 text-sm">
                <FlaskConical className="h-4 w-4" /> E-mail de teste
              </Label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="seu@email.com" className="sm:flex-1" />
                <Button type="button" variant="outline" onClick={() => testMut.mutate()} disabled={busy}>
                  {testMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                  Enviar teste
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                O teste vai com o assunto marcado <code>[TESTE]</code> e não entra no histórico.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              <Button onClick={() => send.mutate()} disabled={busy} size="lg">
                {send.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Disparar campanha{count !== null ? ` (${count})` : ''}
              </Button>
              <Button variant="ghost" onClick={() => setShowPreview((s) => !s)}>
                <Eye className="mr-2 h-4 w-4" /> {showPreview ? 'Ocultar' : 'Mostrar'} prévia
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coluna da prévia */}
      {showPreview && (
        <div className="lg:sticky lg:top-4 lg:self-start">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Prévia do e-mail</p>
          <div className="overflow-hidden rounded-lg border bg-white">
            <iframe title="Prévia do e-mail" srcDoc={previewHtml} className="h-[560px] w-full" />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Painel de Leads (aba própria em Configurações) ───────────────────────────

export function LeadsPanel() {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [bulkRaw, setBulkRaw] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'todos'>('todos')
  const [subTab, setSubTab] = useState<'base' | 'conversas'>('base')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [modal, setModal] = useState<null | 'add' | 'bulk'>(null)
  const [editing, setEditing] = useState<MarketingLead | null>(null)

  const openChat = (id: string) => { setSelectedLeadId(id); setSubTab('conversas') }

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['marketingLeads'],
    queryFn: getLeads,
    refetchInterval: 20000, // atualiza contadores (respostas etc.) periodicamente
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['marketingLeads'] })

  const counts = useMemo(() => {
    const c: Record<LeadStatus, number> = { novo: 0, quente: 0, morno: 0, frio: 0, invalido: 0 }
    for (const l of leads) c[leadStatus(l)]++
    return c
  }, [leads])

  const filtered = useMemo(
    () => (statusFilter === 'todos' ? leads : leads.filter((l) => leadStatus(l) === statusFilter)),
    [leads, statusFilter],
  )

  const add = useMutation({
    mutationFn: () => addLead({ email, name: name || undefined, source: 'manual' }),
    onSuccess: () => { setEmail(''); setName(''); setModal(null); toast({ title: 'Lead adicionado.' }); invalidate() },
    onError: (e) => toast({ title: e instanceof Error ? e.message : 'Erro ao adicionar.', variant: 'destructive' }),
  })

  const addBulk = useMutation({
    mutationFn: () => addLeadsBulk(bulkRaw),
    onSuccess: (n) => { setBulkRaw(''); setModal(null); toast({ title: `${n} lead(s) adicionado(s) da lista.` }); invalidate() },
    onError: () => toast({ title: 'Falha ao adicionar a lista.', variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: invalidate,
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) => setLeadStatus(id, status),
    onSuccess: (_d, v) => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['leadActivity', v.id] })
    },
    onError: () => toast({ title: 'Falha ao alterar status.', variant: 'destructive' }),
  })

  const importFile = useMutation({
    mutationFn: async (file: File): Promise<number> => {
      if (/\.xlsx?$/i.test(file.name)) return importLeadsFromExcel(await file.arrayBuffer())
      return importLeadsFromCsv(await file.text())
    },
    onSuccess: (n) => { setModal(null); toast({ title: `${n} lead(s) importado(s).` }); invalidate() },
    onError: () => toast({ title: 'Falha ao importar o arquivo.', variant: 'destructive' }),
  })

  const bulkCount = useMemo(() => parseEmailList(bulkRaw).length, [bulkRaw])

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) importFile.mutate(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="mb-1 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Leads</h2>
          <p className="text-sm text-muted-foreground">
            Base de prospecção usada nos disparos de e-mail marketing.
          </p>
        </div>
      </div>

      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'base' | 'conversas')}>
        <TabsList className="mb-4">
          <TabsTrigger value="base" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Base</TabsTrigger>
          <TabsTrigger value="conversas" className="gap-1.5"><MessageSquare className="h-4 w-4" /> Conversas</TabsTrigger>
        </TabsList>

        <TabsContent value="base">
          <Card>
            <CardContent className="pt-4">
              {/* Barra de ações */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{leads.length}</strong> lead(s) na base
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setModal('add')}>
                    <Plus className="mr-1.5 h-4 w-4" /> Adicionar lead
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setModal('bulk')}>
                    <Upload className="mr-1.5 h-4 w-4" /> Importar / colar lista
                  </Button>
                </div>
              </div>

              {/* Filtros por temperatura */}
              {leads.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <FilterChip active={statusFilter === 'todos'} onClick={() => setStatusFilter('todos')}>
                    Todos <span className="opacity-60">{leads.length}</span>
                  </FilterChip>
                  {LEAD_STATUSES.map((s) => (
                    <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                      <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                      {STATUS_META[s].label} <span className="opacity-60">{counts[s]}</span>
                    </FilterChip>
                  ))}
                </div>
              )}

              {/* Lista */}
              <div className="mt-3">
                {isLoading ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p>
                ) : leads.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Nenhum lead ainda. Use “Adicionar lead” ou “Importar / colar lista”.</p>
                ) : filtered.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Nenhum lead com esse status.</p>
                ) : (
                  <ul className="divide-y">
                    {filtered.map((l) => (
                      <LeadRow
                        key={l.id}
                        lead={l}
                        onChangeStatus={(status) => setStatus.mutate({ id: l.id, status })}
                        onEdit={() => setEditing(l)}
                        onDelete={() => remove.mutate(l.id)}
                        onOpenChat={() => openChat(l.id)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversas">
          <ConversationsView
            leads={leads}
            isLoading={isLoading}
            selectedId={selectedLeadId}
            onSelect={setSelectedLeadId}
            onInvalidate={invalidate}
          />
        </TabsContent>
      </Tabs>

      {/* Modal: adicionar 1 lead */}
      <Dialog open={modal === 'add'} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Nome (opcional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={() => add.mutate()} disabled={add.isPending || !email.includes('@')}>
              {add.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: importar / colar lista */}
      <Dialog open={modal === 'bulk'} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar / colar lista</DialogTitle>
            <DialogDescription>Cole vários e-mails ou importe um arquivo CSV/Excel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Colar lista de e-mails</Label>
              <textarea
                value={bulkRaw}
                onChange={(e) => setBulkRaw(e.target.value)}
                rows={5}
                placeholder={'joao@empresa.com, maria@empresa.com\npedro@empresa.com'}
                className={textareaClass}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground"><strong className="text-foreground">{bulkCount}</strong> e-mail(s) válido(s).</p>
                <Button size="sm" onClick={() => addBulk.mutate()} disabled={addBulk.isPending || bulkCount === 0}>
                  {addBulk.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ListPlus className="mr-1.5 h-3.5 w-3.5" />}
                  Adicionar {bulkCount > 0 ? bulkCount : ''}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t pt-4">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={onFile}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importFile.isPending}>
                {importFile.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
                Importar CSV / Excel
              </Button>
              <span className="text-xs text-muted-foreground">Colunas: e-mail, nome. Cabeçalho ignorado.</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: editar lead */}
      <EditLeadDialog lead={editing} onClose={() => setEditing(null)} onSaved={invalidate} />
    </div>
  )
}

// ─── Modal de editar lead (nome/empresa) ──────────────────────────────────────

function EditLeadDialog({ lead, onClose, onSaved }: { lead: MarketingLead | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  useEffect(() => {
    setName(lead?.name ?? '')
    setCompany(lead?.company ?? '')
  }, [lead])

  const save = useMutation({
    mutationFn: () => updateLead(lead!.id, { name: name.trim() || undefined, company: company.trim() || undefined }),
    onSuccess: () => { toast({ title: 'Lead atualizado.' }); onSaved(); onClose() },
    onError: () => toast({ title: 'Falha ao salvar.', variant: 'destructive' }),
  })

  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar lead</DialogTitle>
          <DialogDescription>{lead?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Empresa (opcional)</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Empresa" />
          </div>
          <p className="text-xs text-muted-foreground">O e-mail é o identificador do lead e não pode ser alterado.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Pencil className="mr-1.5 h-4 w-4" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Aba "Conversas": lista de leads + chat (estilo WhatsApp Web) ──────────────

function ConversationsView({
  leads, isLoading, selectedId, onSelect, onInvalidate,
}: {
  leads: MarketingLead[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onInvalidate: () => void
}) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leads
    return leads.filter((l) => l.email.includes(q) || (l.name ?? '').toLowerCase().includes(q))
  }, [leads, search])
  const selected = leads.find((l) => l.id === selectedId) ?? null

  return (
    <div className="grid h-[560px] grid-cols-1 overflow-hidden rounded-lg border md:grid-cols-[280px_1fr]">
      {/* Lista de contatos */}
      <div className={`flex min-h-0 flex-col border-r bg-card ${selected ? 'hidden md:flex' : 'flex'}`}>
        <div className="border-b p-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lead…"
            className="h-8 text-sm"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-center text-xs text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">Nenhum lead. Adicione na aba “Base”.</p>
          ) : (
            <ul>
              {filtered.map((l) => {
                const meta = STATUS_META[leadStatus(l)]
                const active = l.id === selectedId
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => onSelect(l.id)}
                      className={`flex w-full items-center gap-2.5 border-b px-3 py-2.5 text-left transition-colors ${active ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} title={meta.label} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{l.name || l.email}</span>
                        {l.name && <span className="block truncate text-xs text-muted-foreground">{l.email}</span>}
                      </span>
                      {(l.replyCount ?? 0) > 0 && <span className="shrink-0 rounded-full bg-green-600 px-1.5 text-[10px] font-bold text-white">{l.replyCount}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Conversa */}
      <div className={`min-h-0 ${selected ? 'flex flex-col' : 'hidden md:flex md:items-center md:justify-center'}`}>
        {selected ? (
          <>
            <button onClick={() => onSelect(null)} className="flex items-center gap-1 border-b p-2 text-xs text-muted-foreground md:hidden">
              <ChevronDown className="h-4 w-4 rotate-90" /> voltar
            </button>
            <div className="min-h-0 flex-1">
              <LeadDetail key={selected.id} lead={selected} onInvalidate={onInvalidate} pane />
            </div>
          </>
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-30" />
            Selecione um lead à esquerda para ver a conversa.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Chip de filtro ───────────────────────────────────────────────────────────

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted/50'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Linha de um lead (na Base) ───────────────────────────────────────────────

function LeadRow({
  lead, onChangeStatus, onEdit, onDelete, onOpenChat,
}: {
  lead: MarketingLead
  onChangeStatus: (s: LeadStatus) => void
  onEdit: () => void
  onDelete: () => void
  onOpenChat: () => void
}) {
  const status = leadStatus(lead)
  const meta = STATUS_META[status]
  const stats = [
    { n: lead.contactCount ?? 0, label: 'envios' },
    { n: lead.openCount ?? 0, label: 'aberturas' },
    { n: lead.clickCount ?? 0, label: 'cliques' },
    { n: lead.replyCount ?? 0, label: 'respostas' },
  ].filter((s) => s.n > 0)

  return (
    <li className="flex items-center gap-3 py-2.5">
      {/* Status (dropdown) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}>
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            {meta.label}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {LEAD_STATUSES.map((s) => (
            <DropdownMenuItem key={s} onClick={() => onChangeStatus(s)} className="gap-2">
              <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
              {STATUS_META[s].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Identificação — clique abre a conversa */}
      <button onClick={onOpenChat} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{lead.email}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[lead.name, lead.source].filter(Boolean).join(' · ') || '—'}
          {stats.length > 0 && ' · ' + stats.map((s) => `${s.n} ${s.label}`).join(' · ')}
        </p>
      </button>

      <Button variant="ghost" size="sm" onClick={onEdit} title="Editar nome/empresa">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onOpenChat} title="Abrir conversa">
        <MessageSquare className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  )
}

// ─── Detalhe do lead: notas + linha do tempo ──────────────────────────────────

function LeadDetail({ lead, onInvalidate, pane = false }: { lead: MarketingLead; onInvalidate: () => void; pane?: boolean }) {
  const { user } = useAuth()
  const [note, setNote] = useState('')
  const [replySubject, setReplySubject] = useState('Re: contato AlugaPro')
  const [replyMsg, setReplyMsg] = useState('')

  // Tempo real: escuta a timeline via onSnapshot (novas respostas/eventos
  // aparecem na hora, sem precisar recarregar).
  const [activity, setActivity] = useState<LeadActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    setIsLoading(true)
    const unsub = subscribeLeadActivity(lead.id, (items) => { setActivity(items); setIsLoading(false) })
    return unsub
  }, [lead.id])

  const saveNote = useMutation({
    mutationFn: () => addLeadNote(lead.id, note),
    onSuccess: () => { setNote(''); toast({ title: 'Nota adicionada.' }) },
    onError: () => toast({ title: 'Falha ao salvar nota.', variant: 'destructive' }),
  })

  const sendReply = useMutation({
    mutationFn: () => replyToLead(lead, replySubject, replyMsg, user?.name),
    onSuccess: (r) => {
      setReplyMsg('')
      toast({ title: r.sent > 0 ? `Resposta enviada para ${lead.email}.` : 'Não enviado (destinatário pulado/descadastrado).' })
      onInvalidate()
    },
    onError: (e) => toast({ title: e instanceof Error ? e.message : 'Falha ao enviar resposta.', variant: 'destructive' }),
  })

  const saveName = useMutation({
    mutationFn: (name: string) => updateLead(lead.id, { name }),
    onSuccess: () => { toast({ title: 'Lead atualizado.' }); onInvalidate() },
  })

  // Conversa em ordem cronológica (mais antigo em cima, como no WhatsApp).
  const ordered = useMemo(() => [...activity].reverse(), [activity])

  return (
    <div className={pane ? 'flex h-full min-h-0 flex-col overflow-hidden' : 'mt-3 overflow-hidden rounded-lg border'}>
      {/* Cabeçalho compacto: nome editável + e-mail */}
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <Input
          defaultValue={lead.name ?? ''}
          placeholder="Nome do contato"
          className="h-7 max-w-[220px] border-0 bg-transparent px-1 text-sm font-medium focus-visible:ring-1"
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== (lead.name ?? '')) saveName.mutate(v) }}
        />
        <span className="ml-auto truncate text-xs text-muted-foreground">{lead.email}</span>
      </div>

      {/* Conversa (chat) */}
      <div className={`${pane ? 'min-h-0 flex-1' : 'max-h-[440px]'} space-y-2 overflow-y-auto bg-muted/20 p-3`}>
        {isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Carregando…</p>
        ) : ordered.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Nenhuma mensagem ainda. Envie um e-mail ou responda abaixo — as respostas do lead aparecem aqui.
          </p>
        ) : (
          ordered.map((ev) => <ConversationItem key={ev.id} ev={ev} />)
        )}
      </div>

      {/* Composer estilo chat */}
      <div className="border-t bg-background p-2">
        <Input
          value={replySubject}
          onChange={(e) => setReplySubject(e.target.value)}
          placeholder="Assunto"
          className="mb-2 h-8 text-sm"
        />
        <div className="flex items-end gap-2">
          <textarea
            value={replyMsg}
            onChange={(e) => setReplyMsg(e.target.value)}
            rows={2}
            placeholder={`Escreva para ${lead.email}… (Ctrl+Enter envia)`}
            className={textareaClass}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && replyMsg.trim()) sendReply.mutate() }}
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => sendReply.mutate()} disabled={sendReply.isPending || !replyMsg.trim()} title="Enviar e-mail (Ctrl+Enter)">
            {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {/* Nota interna (não envia e-mail) */}
        <div className="mt-2 flex gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota interna (não envia e-mail)"
            className="h-7 text-xs"
            onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) saveNote.mutate() }}
          />
          <Button size="sm" variant="ghost" onClick={() => saveNote.mutate()} disabled={saveNote.isPending || !note.trim()}>
            <StickyNote className="mr-1.5 h-3.5 w-3.5" /> Nota
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">Enviado como AlugaPro · respostas do lead voltam para {REPLY_TO_ADDRESS}</p>
      </div>
    </div>
  )
}

// ─── Itens da conversa (balões + linhas de sistema) ───────────────────────────

function ConversationItem({ ev }: { ev: LeadActivity }) {
  if (ev.type === 'sent') {
    return <ChatBubble side="right" subject={ev.subject} text={ev.text} at={ev.at} fallback="E-mail enviado" />
  }
  if (ev.type === 'replied') {
    return <ChatBubble side="left" subject={ev.subject} text={ev.text} at={ev.at} fallback="Respondeu" />
  }
  const am = ACTIVITY_META[ev.type]
  const label =
    ev.type === 'status' && ev.text ? `Classificado como ${STATUS_META[ev.text as LeadStatus]?.label ?? ev.text}`
    : ev.type === 'note' && ev.text ? `Nota: ${ev.text}`
    : am.label
  return <SystemLine icon={am.icon} tone={am.tone} label={label} at={ev.at} />
}

function ChatBubble({ side, subject, text, at, fallback }: {
  side: 'left' | 'right'
  subject?: string
  text?: string
  at?: LeadActivity['at']
  fallback: string
}) {
  const right = side === 'right'
  return (
    <div className={`flex ${right ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
        right ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border bg-background'
      }`}>
        {subject && <p className={`mb-0.5 text-xs font-semibold ${right ? 'text-primary-foreground/85' : 'text-foreground'}`}>{subject}</p>}
        {text ? (
          <p className="whitespace-pre-wrap break-words">{text}</p>
        ) : (
          <p className={`italic ${right ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>📧 {fallback}</p>
        )}
        <p className={`mt-1 text-right text-[10px] ${right ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{fmtDateTime(at)}</p>
      </div>
    </div>
  )
}

function SystemLine({ icon: Icon, tone, label, at }: {
  icon: React.ElementType
  tone: string
  label: string
  at?: LeadActivity['at']
}) {
  return (
    <div className="flex justify-center">
      <span className="inline-flex max-w-[92%] items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
        <Icon className={`h-3 w-3 shrink-0 ${tone}`} />
        <span className="truncate">{label}</span>
        <span className="shrink-0 opacity-60">· {fmtDateTime(at)}</span>
      </span>
    </div>
  )
}

// ─── Aba: Histórico ───────────────────────────────────────────────────────────

function HistoryTab() {
  const { data: campaigns = [], isLoading } = useQuery({ queryKey: ['emailCampaigns'], queryFn: getCampaigns })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4" /> Campanhas enviadas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : campaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma campanha enviada ainda.</p>
        ) : (
          <ul className="divide-y">
            {campaigns.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{c.subject}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.templateName} · {c.audiences.join(', ') || 'lista avulsa'}
                      {c.createdAt ? ` · ${c.createdAt.toDate().toLocaleString('pt-BR')}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Badge variant="secondary">{c.sent} enviados</Badge>
                    {c.skipped > 0 && <Badge variant="outline">{c.skipped} pulados</Badge>}
                    {c.failed > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> {c.failed}
                      </Badge>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
