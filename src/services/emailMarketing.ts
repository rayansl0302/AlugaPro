import {
  collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy, serverTimestamp, addDoc, Timestamp,
} from 'firebase/firestore'
import * as XLSX from 'xlsx'
import { db, auth } from '@/lib/firebase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Audience = 'gestores' | 'inquilinos' | 'afiliados' | 'leads'

export interface Recipient {
  email: string
  name?: string
}

export interface MarketingLead {
  id: string
  email: string
  name?: string
  company?: string
  source?: string
  createdAt?: Timestamp
}

export interface EmailCampaign {
  id: string
  subject: string
  templateName: string
  audiences: Audience[]
  recipientCount: number
  sent: number
  failed: number
  skipped: number
  createdAt?: Timestamp
}

// ─── Audiências (destinatários) ───────────────────────────────────────────────
// Puxa e-mails das bases existentes. Admin lê todas as empresas (é o dono da
// plataforma). De-dup e validação ficam no backend de envio.

function normalizeEmail(email?: string): string {
  return (email ?? '').trim().toLowerCase()
}

async function getUsersByRole(role: string): Promise<Recipient[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', role)))
  return snap.docs
    .map((d) => d.data() as { email?: string; name?: string })
    .filter((u) => normalizeEmail(u.email).includes('@'))
    .map((u) => ({ email: normalizeEmail(u.email), name: u.name }))
}

async function getTenantRecipients(): Promise<Recipient[]> {
  const snap = await getDocs(collection(db, 'tenants'))
  return snap.docs
    .map((d) => d.data() as { email?: string; name?: string; active?: boolean })
    .filter((t) => t.active !== false && normalizeEmail(t.email).includes('@'))
    .map((t) => ({ email: normalizeEmail(t.email), name: t.name }))
}

export async function getRecipientsForAudience(audience: Audience): Promise<Recipient[]> {
  switch (audience) {
    case 'gestores': return getUsersByRole('gestor')
    case 'afiliados': return getUsersByRole('afiliado')
    case 'inquilinos': return getTenantRecipients()
    case 'leads': {
      const leads = await getLeads()
      return leads.map((l) => ({ email: normalizeEmail(l.email), name: l.name }))
    }
  }
}

/** Junta várias audiências (+ uma lista avulsa opcional) e remove duplicados. */
export async function collectRecipients(
  audiences: Audience[],
  extra: Recipient[] = [],
): Promise<Recipient[]> {
  const lists = await Promise.all(audiences.map(getRecipientsForAudience))
  const byEmail = new Map<string, Recipient>()
  for (const r of [...lists.flat(), ...extra]) {
    if (r.email.includes('@') && !byEmail.has(r.email)) byEmail.set(r.email, r)
  }
  return [...byEmail.values()]
}

/** Transforma um texto colado (e-mails separados por vírgula, ponto-e-vírgula,
 *  espaço ou quebra de linha) numa lista de destinatários, sem duplicados. */
export function parseEmailList(raw: string): Recipient[] {
  const byEmail = new Map<string, Recipient>()
  for (const token of raw.split(/[\s,;]+/)) {
    const email = normalizeEmail(token)
    if (email.includes('@') && !byEmail.has(email)) byEmail.set(email, { email })
  }
  return [...byEmail.values()]
}

// ─── Leads (base externa de prospecção) ───────────────────────────────────────

const LEADS_COL = 'marketingLeads'

export async function getLeads(): Promise<MarketingLead[]> {
  const snap = await getDocs(query(collection(db, LEADS_COL), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MarketingLead))
}

export async function addLead(lead: Omit<MarketingLead, 'id' | 'createdAt'>): Promise<void> {
  const email = normalizeEmail(lead.email)
  if (!email.includes('@')) throw new Error('E-mail inválido')
  // id = e-mail normalizado (idempotente, evita duplicar o mesmo lead)
  await setDoc(doc(db, LEADS_COL, email), {
    email,
    ...(lead.name ? { name: lead.name } : {}),
    ...(lead.company ? { company: lead.company } : {}),
    ...(lead.source ? { source: lead.source } : {}),
    createdAt: serverTimestamp(),
  }, { merge: true })
}

export async function deleteLead(id: string): Promise<void> {
  await deleteDoc(doc(db, LEADS_COL, id))
}

/** Adiciona vários leads de uma vez a partir de um texto colado. Retorna
 *  quantos e-mails válidos foram adicionados. */
export async function addLeadsBulk(raw: string, source = 'lista colada'): Promise<number> {
  const recipients = parseEmailList(raw)
  for (const r of recipients) await addLead({ email: r.email, source })
  return recipients.length
}

/** Importa leads de uma planilha Excel (.xlsx/.xls). Converte a primeira aba
 *  em CSV e reaproveita o parser de CSV. Retorna quantos foram importados. */
export async function importLeadsFromExcel(buffer: ArrayBuffer): Promise<number> {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return 0
  return importLeadsFromCsv(XLSX.utils.sheet_to_csv(sheet), 'importação Excel')
}

/** Importa leads de um CSV simples (colunas: email, nome, empresa). Ignora
 *  cabeçalho e linhas sem e-mail válido. Retorna quantos foram importados. */
export async function importLeadsFromCsv(csv: string, source = 'importação'): Promise<number> {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let imported = 0
  for (const line of lines) {
    const cols = line.split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ''))
    const email = normalizeEmail(cols.find((c) => c.includes('@')))
    if (!email) continue // pula cabeçalho/linhas sem e-mail
    const name = cols.find((c) => c && !c.includes('@'))
    await addLead({ email, name, source })
    imported++
  }
  return imported
}

// ─── Envio + histórico ────────────────────────────────────────────────────────

const CAMPAIGNS_COL = 'emailCampaigns'

export interface SendResult { sent: number; failed: number; skipped: number; message?: string }

/** Dispara a campanha via /api/send-campaign (backend/Resend). */
export async function sendCampaign(input: {
  subject: string
  html: string
  recipients: Recipient[]
  replyTo?: string
}): Promise<SendResult> {
  const user = auth.currentUser
  if (!user) throw new Error('Sessão expirada — entre novamente.')
  const idToken = await user.getIdToken()
  const res = await fetch('/api/send-campaign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Falha ao enviar a campanha.')
  return data as SendResult
}

export async function logCampaign(entry: Omit<EmailCampaign, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, CAMPAIGNS_COL), { ...entry, createdAt: serverTimestamp() })
}

export async function getCampaigns(): Promise<EmailCampaign[]> {
  const snap = await getDocs(query(collection(db, CAMPAIGNS_COL), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmailCampaign))
}

// ─── Descadastro (público) ────────────────────────────────────────────────────
// Chamado pela página /descadastrar com o id opaco (sha256 do e-mail) que veio
// no link. Marca optedOut=true; o backend de envio pula esses ids. Não precisa
// do e-mail em texto — preserva privacidade.

const CONTACTS_COL = 'emailContacts'

export async function unsubscribeByContactId(contactId: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(contactId)) throw new Error('Link de descadastro inválido.')
  await setDoc(doc(db, CONTACTS_COL, contactId), { optedOut: true, updatedAt: serverTimestamp() }, { merge: true })
}
