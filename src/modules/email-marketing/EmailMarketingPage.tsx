import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Send, Users, Upload, Trash2, Loader2, Eye, RefreshCw, AlertTriangle,
  ListPlus, FlaskConical, ClipboardList, CheckCircle2,
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
import { toast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import {
  EMAIL_TEMPLATES, templateDefaults, renderMarketingEmail, type EmailTemplateId,
} from '@/lib/emailMarketing'
import {
  type Audience, type Recipient, collectRecipients, parseEmailList,
  getLeads, addLead, deleteLead, addLeadsBulk, importLeadsFromCsv, importLeadsFromExcel,
  sendCampaign, logCampaign, getCampaigns,
} from '@/services/emailMarketing'

const AUDIENCES: { id: Audience; label: string; hint: string }[] = [
  { id: 'gestores', label: 'Gestores (clientes)', hint: 'Donos de conta no sistema' },
  { id: 'inquilinos', label: 'Inquilinos', hint: 'Locatários com e-mail cadastrado' },
  { id: 'afiliados', label: 'Afiliados', hint: 'Parceiros do programa' },
  { id: 'leads', label: 'Leads / prospecção', hint: 'Base salva na aba Leads' },
]

const textareaClass =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

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
  const [replyTo, setReplyTo] = useState('')
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
      await logCampaign({
        subject: subj,
        templateName,
        audiences: [...audiences],
        recipientCount: recipients.length,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      })
      return result
    },
    onSuccess: (r) => {
      toast({ title: `Campanha enviada — ${r.sent} enviados, ${r.skipped} pulados, ${r.failed} falhas.` })
      queryClient.invalidateQueries({ queryKey: ['emailCampaigns'] })
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

  const { data: leads = [], isLoading } = useQuery({ queryKey: ['marketingLeads'], queryFn: getLeads })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['marketingLeads'] })

  const add = useMutation({
    mutationFn: () => addLead({ email, name: name || undefined, source: 'manual' }),
    onSuccess: () => { setEmail(''); setName(''); toast({ title: 'Lead adicionado.' }); invalidate() },
    onError: (e) => toast({ title: e instanceof Error ? e.message : 'Erro ao adicionar.', variant: 'destructive' }),
  })

  const addBulk = useMutation({
    mutationFn: () => addLeadsBulk(bulkRaw),
    onSuccess: (n) => { setBulkRaw(''); toast({ title: `${n} lead(s) adicionado(s) da lista.` }); invalidate() },
    onError: () => toast({ title: 'Falha ao adicionar a lista.', variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: invalidate,
  })

  const importFile = useMutation({
    mutationFn: async (file: File): Promise<number> => {
      if (/\.xlsx?$/i.test(file.name)) return importLeadsFromExcel(await file.arrayBuffer())
      return importLeadsFromCsv(await file.text())
    },
    onSuccess: (n) => { toast({ title: `${n} lead(s) importado(s).` }); invalidate() },
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

      {/* Adicionar 1 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ListPlus className="h-4 w-4" /> Adicionar lead</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>Nome (opcional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button onClick={() => add.mutate()} disabled={add.isPending || !email.includes('@')}>
              {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Adicionar em massa: colar lista OU CSV */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4" /> Adicionar vários de uma vez</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Colar lista de e-mails</Label>
            <textarea
              value={bulkRaw}
              onChange={(e) => setBulkRaw(e.target.value)}
              rows={4}
              placeholder={'joao@empresa.com, maria@empresa.com\npedro@empresa.com'}
              className={textareaClass}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">{bulkCount}</strong> e-mail(s) válido(s) detectado(s).</p>
              <Button size="sm" onClick={() => addBulk.mutate()} disabled={addBulk.isPending || bulkCount === 0}>
                {addBulk.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ListPlus className="mr-1.5 h-3.5 w-3.5" />}
                Adicionar {bulkCount > 0 ? bulkCount : ''} à base
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
            <span className="text-xs text-muted-foreground">Aceita .csv, .xlsx e .xls · colunas: e-mail, nome. Cabeçalho é ignorado.</span>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">Leads salvos <Badge variant="secondary">{leads.length}</Badge></CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : leads.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum lead ainda. Adicione, cole uma lista ou importe um CSV.</p>
          ) : (
            <ul className="divide-y">
              {leads.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{l.email}</p>
                    {(l.name || l.source) && (
                      <p className="text-xs text-muted-foreground">
                        {l.name}{l.name && l.source ? ' · ' : ''}{l.source}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(l.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
