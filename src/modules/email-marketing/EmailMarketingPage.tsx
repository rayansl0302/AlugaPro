import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Send, Users, Upload, Trash2, Loader2, Eye, RefreshCw, AlertTriangle,
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
import {
  EMAIL_TEMPLATES, templateDefaults, renderMarketingEmail, type EmailTemplateId,
} from '@/lib/emailMarketing'
import {
  type Audience, collectRecipients, getLeads, addLead, deleteLead,
  importLeadsFromCsv, sendCampaign, logCampaign, getCampaigns,
} from '@/services/emailMarketing'

const AUDIENCES: { id: Audience; label: string; hint: string }[] = [
  { id: 'gestores', label: 'Gestores (clientes)', hint: 'Donos de conta no sistema' },
  { id: 'inquilinos', label: 'Inquilinos', hint: 'Locatários com e-mail cadastrado' },
  { id: 'afiliados', label: 'Afiliados', hint: 'Parceiros do programa' },
  { id: 'leads', label: 'Leads / prospecção', hint: 'Base externa importada' },
]

/**
 * Painel de e-mail marketing (admin). Fica embutido dentro de Configurações
 * como uma aba, então não repete o cabeçalho grande da página — só uma linha
 * de contexto + as sub-abas Compor / Leads / Histórico.
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
          <TabsTrigger value="compor">Compor</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="compor"><ComposeTab /></TabsContent>
        <TabsContent value="leads"><LeadsTab /></TabsContent>
        <TabsContent value="historico"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Aba: Compor + enviar ─────────────────────────────────────────────────────

function ComposeTab() {
  const queryClient = useQueryClient()
  const [audiences, setAudiences] = useState<Set<Audience>>(new Set(['gestores']))
  const [templateId, setTemplateId] = useState<EmailTemplateId>('boasVindas')
  const [subject, setSubject] = useState('')
  const [replyTo, setReplyTo] = useState('')

  // Campos editáveis do conteúdo, semeados pelo template.
  const seed = useMemo(() => templateDefaults(templateId), [templateId])
  const [headline, setHeadline] = useState(seed.headline)
  const [preheader, setPreheader] = useState(seed.preheader)
  const [bodyText, setBodyText] = useState(seed.paragraphs.join('\n\n'))
  const [ctaLabel, setCtaLabel] = useState(seed.ctaLabel)
  const [ctaUrl, setCtaUrl] = useState(seed.ctaUrl)
  const [showPreview, setShowPreview] = useState(true)

  // Ao trocar de template, re-semeia todos os campos.
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
    setAudiences((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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

  const send = useMutation({
    mutationFn: async () => {
      const list = [...audiences]
      if (list.length === 0) throw new Error('Selecione ao menos uma audiência.')
      if (!subject.trim()) throw new Error('Informe o assunto do e-mail.')
      const recipients = await collectRecipients(list)
      if (recipients.length === 0) throw new Error('Nenhum destinatário encontrado nas audiências escolhidas.')
      const result = await sendCampaign({
        subject: subject.trim(),
        html,
        recipients,
        replyTo: replyTo.trim() || undefined,
      })
      const templateName = EMAIL_TEMPLATES.find((t) => t.id === templateId)?.name ?? templateId
      await logCampaign({
        subject: subject.trim(),
        templateName,
        audiences: list,
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

  // Contagem de destinatários (prévia, sob demanda).
  const [count, setCount] = useState<number | null>(null)
  const countMut = useMutation({
    mutationFn: () => collectRecipients([...audiences]),
    onSuccess: (r) => setCount(r.length),
    onError: () => setCount(null),
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,420px)]">
      {/* Formulário */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Audiência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {AUDIENCES.map((a) => {
                const active = audiences.has(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { toggleAudience(a.id); setCount(null) }}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{a.label}</span>
                      <span
                        className={`h-4 w-4 rounded border ${
                          active ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                        }`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.hint}</p>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => countMut.mutate()}
                disabled={countMut.isPending || audiences.size === 0}
              >
                {countMut.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                Contar destinatários
              </Button>
              {count !== null && (
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{count}</strong> destinatário(s) (sem duplicatas)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Conteúdo</CardTitle>
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
              <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Texto que aparece ao lado do assunto na caixa de entrada" />
            </div>

            <div className="space-y-1.5">
              <Label>Corpo (separe parágrafos com uma linha em branco)</Label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={7}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
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

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => send.mutate()} disabled={send.isPending} size="lg">
            {send.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar campanha
          </Button>
          <Button variant="outline" onClick={() => setShowPreview((s) => !s)}>
            <Eye className="mr-2 h-4 w-4" /> {showPreview ? 'Ocultar' : 'Mostrar'} prévia
          </Button>
        </div>
      </div>

      {/* Prévia */}
      {showPreview && (
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Prévia do e-mail</p>
          <div className="overflow-hidden rounded-lg border bg-white">
            <iframe title="Prévia do e-mail" srcDoc={previewHtml} className="h-[560px] w-full" />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Aba: Leads ───────────────────────────────────────────────────────────────

function LeadsTab() {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  const { data: leads = [], isLoading } = useQuery({ queryKey: ['marketingLeads'], queryFn: getLeads })

  const add = useMutation({
    mutationFn: () => addLead({ email, name: name || undefined, source: 'manual' }),
    onSuccess: () => {
      setEmail(''); setName('')
      toast({ title: 'Lead adicionado.' })
      queryClient.invalidateQueries({ queryKey: ['marketingLeads'] })
    },
    onError: (e) => toast({ title: e instanceof Error ? e.message : 'Erro ao adicionar.', variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketingLeads'] }),
  })

  const importCsv = useMutation({
    mutationFn: (csv: string) => importLeadsFromCsv(csv),
    onSuccess: (n) => {
      toast({ title: `${n} lead(s) importado(s).` })
      queryClient.invalidateQueries({ queryKey: ['marketingLeads'] })
    },
    onError: () => toast({ title: 'Falha ao importar CSV.', variant: 'destructive' }),
  })

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => importCsv.mutate(String(reader.result ?? ''))
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Adicionar lead</CardTitle>
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
          <div className="mt-4 flex items-center gap-3 border-t pt-4">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importCsv.isPending}>
              {importCsv.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
              Importar CSV
            </Button>
            <span className="text-xs text-muted-foreground">Colunas: e-mail, nome. Cabeçalho é ignorado.</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            Leads <Badge variant="secondary">{leads.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : leads.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum lead ainda. Adicione ou importe um CSV.</p>
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
        <CardTitle className="text-base">Campanhas enviadas</CardTitle>
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
                      {c.templateName} · {c.audiences.join(', ')}
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
