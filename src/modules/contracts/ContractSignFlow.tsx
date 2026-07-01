import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight, ChevronLeft, FileText, Camera, PenLine,
  CheckCircle, Download, Loader2, User, Building2, Car, X,
  Copy, RefreshCw, Clock, Mail, Send, Eye, HardHat,
} from 'lucide-react'
import { Contract, Owner, Tenant, Vehicle, Property, Equipment, ImovelSigningData, VeiculoSigningData, EquipamentoSigningData, SigningParty, ContractWitness } from '@/types'
import { updateContract } from '@/services/contracts'
import { uploadContractDocument, uploadContractPDF } from '@/services/storage'
import { createWitnessRequest, getWitnessRequest, generateWitnessToken } from '@/services/witnessSignatures'
import { sendWitnessInvite, isEmailConfigured } from '@/services/email'
import { generateSignedContractPDF } from '@/lib/regenerateContractPDF'
import { getContractSigningStatus } from '@/lib/contractSigning'
import { buildImovelBlocks } from '@/lib/contractTemplates/imovel'
import { buildVeiculoBlocks } from '@/lib/contractTemplates/veiculo'
import { buildEquipamentoBlocks } from '@/lib/contractTemplates/equipamento'
import { renderCustomImovel, renderCustomVeiculo, renderCustomEquipamento } from '@/lib/contractTemplates/engine'
import { getContractTemplates } from '@/services/contractTemplates'
import { generateContractPDF, contractPDFToBlob, downloadContractPDF } from '@/lib/contractPDF'
import { formatCurrency, formatDate, maskCPF, maskPhone } from '@/lib/utils'
import { SignatureCanvas } from '@/components/shared/SignatureCanvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  contract: Contract | null
  owner?: Owner
  tenant?: Tenant
  property?: Property
  vehicle?: Vehicle
  equipment?: Equipment
  initialEdit?: boolean
  onClose: () => void
}

interface PartyForm {
  name: string
  nationality: string
  maritalStatus: string
  profession: string
  cpf: string
  rg: string
  address: string
  phone: string
  email: string
}

interface ImovelForm {
  endereco: string
  tipo: string
  areaConstruida: string
  areaTotal: string
  matricula: string
  cartorio: string
  comodos: string
  vagas: string
  mobilia: string
}

interface VeiculoForm {
  cnh: string
  cnhCategoria: string
  cnhValidade: string
}

interface EquipamentoForm {
  descricao: string
  numeroSerie: string
  estadoGeral: string
  acessorios: string
}

interface ComplementaryForm {
  locador: PartyForm
  locatario: PartyForm
  imovel: ImovelForm
  veiculo: VeiculoForm
  equipamento: EquipamentoForm
  valorExtenso: string
  pixKey: string
  banco: string
  agencia: string
  conta: string
  prazoExtenso: string
  indiceReajuste: string
  foro: string
  cidade: string
  testemunha1Name: string
  testemunha1Email: string
  testemunha2Name: string
  testemunha2Email: string
}

const STEPS = [
  { id: 'dados',      label: 'Dados',          icon: FileText },
  { id: 'docs-loc',   label: 'Docs Locador',   icon: Camera },
  { id: 'sig-loc',    label: 'Assin. Locador', icon: PenLine },
  { id: 'docs-lat',   label: 'Docs Locatário', icon: Camera },
  { id: 'sig-lat',    label: 'Assin. Locatário',icon: PenLine },
  { id: 'gerar',      label: 'Gerar PDF',      icon: CheckCircle },
]

const MARITAL_STATUS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável']
const READJUSTMENT = ['IGPM', 'IPCA', 'INPC', 'Fixo', 'Nenhum']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addressToStr(a?: { street?: string; number?: string; neighborhood?: string; city?: string; state?: string; zipCode?: string } | null): string {
  if (!a) return ''
  return [a.street, a.number, a.neighborhood, a.city, a.state, a.zipCode].filter(Boolean).join(', ')
}

function emptyParty(src?: { name?: string; cpf?: string; rg?: string; phone?: string; email?: string; address?: object | null }): PartyForm {
  return {
    name: src?.name ?? '',
    nationality: 'Brasileiro(a)',
    maritalStatus: 'Solteiro(a)',
    profession: '',
    cpf: maskCPF(src?.cpf ?? ''),
    rg: (src as { rg?: string })?.rg ?? '',
    address: addressToStr(src?.address as { street?: string; number?: string; neighborhood?: string; city?: string; state?: string; zipCode?: string } | null),
    phone: maskPhone(src?.phone ?? ''),
    email: (src as { email?: string })?.email ?? '',
  }
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      out[k] = stripUndefined(v)
    }
    return out as T
  }
  return value
}

function makeEmptyForm(): ComplementaryForm {
  return {
    locador: emptyParty(),
    locatario: emptyParty(),
    imovel: { endereco: '', tipo: '', areaConstruida: '', areaTotal: '', matricula: '', cartorio: '', comodos: '', vagas: '', mobilia: '' },
    veiculo: { cnh: '', cnhCategoria: 'B', cnhValidade: '' },
    equipamento: { descricao: '', numeroSerie: '', estadoGeral: 'Bom estado de uso e conservação', acessorios: '' },
    valorExtenso: '', pixKey: '', banco: '', agencia: '', conta: '',
    prazoExtenso: '', indiceReajuste: 'IGPM', foro: '', cidade: '',
    testemunha1Name: '', testemunha1Email: '',
    testemunha2Name: '', testemunha2Email: '',
  }
}

// ─── Photo uploader ───────────────────────────────────────────────────────────

function PhotoUploader({ label, value, onChange }: { label: string; value: string | null; onChange: (b64: string) => void }) {
  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => { if (e.target?.result) onChange(e.target.result as string) }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <label className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors',
        value ? 'border-green-400 bg-green-50/40' : 'border-muted-foreground/25 bg-muted/20 hover:border-primary/40 hover:bg-primary/5',
      )} style={{ minHeight: 160 }}>
        {value ? (
          <img src={value} alt={label} className="max-h-48 w-full object-contain rounded-xl" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground p-6">
            <Camera className="h-8 w-8 opacity-40" />
            <p className="text-sm text-center">Clique ou arraste a foto</p>
            <p className="text-xs opacity-60">JPG, PNG — máx. 10 MB</p>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </label>
      {value && (
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onChange('')}>
          <X className="h-3 w-3 mr-1" /> Remover foto
        </Button>
      )}
    </div>
  )
}

// ─── Signature status card ─────────────────────────────────────────────────────

function SignatureStatusCard({ label, name, signature }: { label: string; name: string; signature?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold">{label}</span>
        {signature ? (
          <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="h-3 w-3" /> Assinado</span>
        ) : (
          <span className="flex items-center gap-1 text-yellow-600 text-xs font-medium"><Clock className="h-3 w-3" /> Pendente</span>
        )}
      </div>
      <p className="text-sm font-medium truncate">{name || '—'}</p>
      {signature && <img src={signature} alt={label} className="mt-2 h-12 w-full object-contain" />}
    </div>
  )
}

// ─── Legacy witness card (assinar agora ou enviar por e-mail) ───────────────────

function LegacyWitnessCard({ witness, busy, emailConfigured, onSendEmail, onSignNow }: {
  witness: { name: string; cpf?: string; rg?: string }
  busy: boolean
  emailConfigured: boolean
  onSendEmail: (email: string) => void
  onSignNow: (signature: string) => void
}) {
  const [mode, setMode] = useState<'idle' | 'email' | 'sign'>('idle')
  const [email, setEmail] = useState('')
  const [sig, setSig] = useState('')

  return (
    <div className="rounded-lg border p-3 text-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{witness.name}</p>
          <p className="text-xs text-muted-foreground truncate">CPF: {witness.cpf || '—'} · RG: {witness.rg || '—'}</p>
        </div>
        {mode === 'idle' && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setMode('sign')}><PenLine className="mr-1 h-3 w-3" /> Assinar agora</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setMode('email')}><Mail className="mr-1 h-3 w-3" /> Enviar por e-mail</Button>
          </div>
        )}
      </div>

      {mode === 'email' && (
        <div className="space-y-2">
          <Label className="text-xs">E-mail da testemunha</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !email} onClick={() => onSendEmail(email)}>
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              {emailConfigured ? 'Enviar link' : 'Gerar link'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setMode('idle'); setEmail('') }}>Cancelar</Button>
          </div>
        </div>
      )}

      {mode === 'sign' && (
        <div className="space-y-2">
          <SignatureCanvas label={`Assinatura de ${witness.name}`} value={sig} onConfirm={setSig} onClear={() => setSig('')} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !sig} onClick={() => onSignNow(sig)}>
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />} Confirmar assinatura
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setMode('idle'); setSig('') }}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Party Form ───────────────────────────────────────────────────────────────

function PartyFormFields({ label, value, onChange }: {
  label: string
  value: PartyForm
  onChange: (v: PartyForm) => void
}) {
  const set = (k: keyof PartyForm, v: string) => onChange({ ...value, [k]: v })
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-primary border-b pb-1">{label}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label className="text-xs">Nome completo</Label><Input value={value.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Nacionalidade</Label><Input value={value.nationality} onChange={(e) => set('nationality', e.target.value)} /></div>
        <div className="space-y-1">
          <Label className="text-xs">Estado civil</Label>
          <Select value={value.maritalStatus} onValueChange={(v) => set('maritalStatus', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MARITAL_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Profissão</Label><Input value={value.profession} onChange={(e) => set('profession', e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">CPF</Label><Input value={value.cpf} onChange={(e) => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" maxLength={14} /></div>
        <div className="space-y-1"><Label className="text-xs">RG</Label><Input value={value.rg} onChange={(e) => set('rg', e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Telefone</Label><Input value={value.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" inputMode="tel" maxLength={15} /></div>
        <div className="space-y-1"><Label className="text-xs">E-mail</Label><Input value={value.email} onChange={(e) => set('email', e.target.value)} /></div>
        <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Endereço completo</Label><Input value={value.address} onChange={(e) => set('address', e.target.value)} /></div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContractSignFlow({ open, contract, owner, tenant, property, vehicle, equipment, initialEdit, onClose }: Props) {
  const qc = useQueryClient()
  const isVeiculo = contract?.assetType === 'veiculo'
  const isEquipamento = contract?.assetType === 'equipamento'

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [pdfGenerated, setPdfGenerated] = useState(false)
  const [pdfDoc, setPdfDoc] = useState<import('jspdf').jsPDF | null>(null)
  const [form, setForm] = useState<ComplementaryForm>(makeEmptyForm)
  const [docsLocador, setDocsLocador] = useState<[string, string]>(['', ''])
  const [docsLocatario, setDocsLocatario] = useState<[string, string]>(['', ''])
  const [sigLocador, setSigLocador] = useState<string>('')
  const [sigLocatario, setSigLocatario] = useState<string>('')
  const [localWitnesses, setLocalWitnesses] = useState<ContractWitness[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | undefined>(undefined)
  const [viewSignature, setViewSignature] = useState<{ name: string; signature: string } | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('system')

  const { data: contractTemplates = [] } = useQuery({
    queryKey: ['contractTemplates', contract?.companyId],
    queryFn: () => getContractTemplates(contract!.companyId),
    enabled: !!contract?.companyId,
  })
  const availableTemplates = contractTemplates.filter(
    (t) => t.assetType === (isVeiculo ? 'veiculo' : isEquipamento ? 'equipamento' : 'imovel')
  )

  // Populate form whenever a new contract is selected
  useEffect(() => {
    if (!contract) return
    setStep(0)
    setSaving(false)
    setPdfGenerated(false)
    setPdfDoc(null)
    setEditMode(false)
    setCurrentPdfUrl(contract.signedPdfUrl)
    setLocalWitnesses(contract.witnesses ?? [])
    setSelectedTemplateId(contract.templateId ?? 'system')
    setForm({
      locador: emptyParty(owner),
      locatario: emptyParty(tenant),
      imovel: {
        endereco: property ? addressToStr(property.address) : '',
        tipo: property?.type ?? '',
        areaConstruida: '', areaTotal: '', matricula: '', cartorio: '',
        comodos: '', vagas: '', mobilia: '',
      },
      veiculo: { cnh: '', cnhCategoria: 'B', cnhValidade: '' },
      equipamento: {
        descricao: equipment?.name ?? '',
        numeroSerie: equipment?.serialNumber ?? '',
        estadoGeral: 'Bom estado de uso e conservação',
        acessorios: '',
      },
      valorExtenso: '',
      pixKey: owner?.bankAccount?.pixKey ?? '',
      banco: owner?.bankAccount?.bank ?? '',
      agencia: owner?.bankAccount?.agency ?? '',
      conta: owner?.bankAccount?.account ?? '',
      prazoExtenso: '',
      indiceReajuste: contract.readjustmentIndex,
      foro: property?.address?.city ?? '',
      cidade: property?.address?.city ?? '',
      testemunha1Name: '', testemunha1Email: '',
      testemunha2Name: '', testemunha2Email: '',
    })
    setDocsLocador(['', ''])
    setDocsLocatario(['', ''])
    setSigLocador('')
    setSigLocatario('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.id])

  // Ao abrir um contrato já gerado, sincroniza automaticamente as assinaturas
  // remotas das testemunhas (sem precisar clicar em "Atualizar status").
  useEffect(() => {
    if (!contract?.signedAt) return
    const base = contract.witnesses ?? []
    const needsSync = base.some((w) => w.token && (w.status !== 'signed' || !w.signature))
    if (!needsSync) return

    let cancelled = false
    ;(async () => {
      const updated = await Promise.all(base.map(async (w) => {
        if (w.token && (w.status !== 'signed' || !w.signature)) {
          const req = await getWitnessRequest(w.token)
          if (req && req.status === 'signed') {
            return { ...w, signature: req.signature, cpf: req.cpf, rg: req.rg, status: 'signed' as const, signedAt: req.signedAt }
          }
        }
        return w
      }))
      if (cancelled) return
      const changed = updated.some((w, i) => w.status !== base[i]?.status || w.signature !== base[i]?.signature)
      if (!changed) return
      setLocalWitnesses(updated)
      try {
        await updateContract(contract.id, stripUndefined({ witnesses: updated }) as Partial<Contract>)
        qc.invalidateQueries({ queryKey: ['contracts'] })
      } catch {
        // silencioso — atualização de status pode ser refeita manualmente
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.id])

  const setFormLocador = useCallback((v: PartyForm) => setForm((f) => ({ ...f, locador: v })), [])
  const setFormLocatario = useCallback((v: PartyForm) => setForm((f) => ({ ...f, locatario: v })), [])

  const toParty = (p: PartyForm): SigningParty => ({
    name: p.name, nationality: p.nationality, maritalStatus: p.maritalStatus,
    profession: p.profession, cpf: p.cpf, rg: p.rg,
    address: p.address, phone: p.phone, email: p.email,
  })

  const buildSigningData = (): ImovelSigningData | VeiculoSigningData | EquipamentoSigningData => {
    if (!contract) throw new Error('No contract selected')
    const base = {
      locador: toParty(form.locador),
      financeiro: { valorExtenso: form.valorExtenso, pixKey: form.pixKey || undefined, banco: form.banco || undefined, agencia: form.agencia || undefined, conta: form.conta || undefined },
      prazo: {
        inicioFormatado: formatDate(contract.startDate),
        terminoFormatado: contract.endDate ? formatDate(contract.endDate) : 'Prazo indeterminado',
        prazoExtenso: form.prazoExtenso || 'prazo determinado',
      },
      indiceReajuste: form.indiceReajuste,
      foro: form.foro,
      cidade: form.cidade,
      dataContrato: format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    }

    if (isVeiculo) {
      return {
        ...base,
        locatario: { ...toParty(form.locatario), cnh: form.veiculo.cnh, cnhCategoria: form.veiculo.cnhCategoria, cnhValidade: form.veiculo.cnhValidade },
        veiculo: {
          marca: vehicle?.brand ?? '',
          modelo: vehicle?.model ?? '',
          ano: String(vehicle?.year ?? ''),
          cor: vehicle?.color ?? '',
          placa: vehicle?.plate ?? '',
          renavam: vehicle?.renavam ?? '',
          chassi: vehicle?.chassi ?? '',
          kmInicial: vehicle?.mileage ? String(vehicle.mileage) : '',
          estadoGeral: 'Bom estado geral, conforme registro fotográfico',
        },
        financeiro: { ...base.financeiro, valorMensal: formatCurrency(contract.rentValue), caucaoValor: contract.cautionValue ? formatCurrency(contract.cautionValue) : undefined },
        prazo: { dataRetiradaFormatada: formatDate(contract.startDate), dataDevolucaoFormatada: contract.endDate ? formatDate(contract.endDate) : 'Indefinido', horarioRetirada: '08:00', horarioDevolucao: '18:00' },
      } as VeiculoSigningData
    }

    if (isEquipamento) {
      return {
        ...base,
        locatario: toParty(form.locatario),
        equipamento: {
          descricao: form.equipamento.descricao || equipment?.name || '',
          marca: equipment?.brand ?? '',
          modelo: equipment?.model ?? '',
          numeroSerie: form.equipamento.numeroSerie || equipment?.serialNumber || '',
          estadoGeral: form.equipamento.estadoGeral,
          acessorios: form.equipamento.acessorios,
        },
        financeiro: { ...base.financeiro, valorMensal: formatCurrency(contract.rentValue), caucaoValor: contract.cautionValue ? formatCurrency(contract.cautionValue) : undefined },
        prazo: { dataRetiradaFormatada: formatDate(contract.startDate), dataDevolucaoFormatada: contract.endDate ? formatDate(contract.endDate) : 'Indefinido' },
      } as EquipamentoSigningData
    }

    return {
      ...base,
      locatario: toParty(form.locatario),
      imovel: { ...form.imovel },
    } as ImovelSigningData
  }

  const handleGenerate = async () => {
    if (!contract) return
    setSaving(true)
    try {
      const signingData = buildSigningData()

      const chosenTemplate = availableTemplates.find((t) => t.id === selectedTemplateId)

      let blocks
      if (isVeiculo) {
        const veiculoCtx = {
          contractNumber: contract.contractNumber,
          rentValue: contract.rentValue,
          cautionValue: contract.cautionValue,
          lateFee: contract.lateFee,
          monthlyInterest: contract.monthlyInterest,
        }
        blocks = chosenTemplate
          ? renderCustomVeiculo(chosenTemplate.clauses, signingData as VeiculoSigningData, veiculoCtx)
          : buildVeiculoBlocks(signingData as VeiculoSigningData, veiculoCtx)
      } else if (isEquipamento) {
        const equipamentoCtx = {
          contractNumber: contract.contractNumber,
          rentValue: contract.rentValue,
          cautionValue: contract.cautionValue,
          lateFee: contract.lateFee,
          monthlyInterest: contract.monthlyInterest,
        }
        blocks = chosenTemplate
          ? renderCustomEquipamento(chosenTemplate.clauses, signingData as EquipamentoSigningData, equipamentoCtx)
          : buildEquipamentoBlocks(signingData as EquipamentoSigningData, equipamentoCtx)
      } else {
        const imovelCtx = {
          contractNumber: contract.contractNumber,
          rentValue: contract.rentValue,
          dueDay: contract.dueDay,
          cautionValue: contract.cautionValue,
          lateFee: contract.lateFee,
          monthlyInterest: contract.monthlyInterest,
          startDate: contract.startDate,
          endDate: contract.endDate,
        }
        blocks = chosenTemplate
          ? renderCustomImovel(chosenTemplate.clauses, signingData as ImovelSigningData, imovelCtx)
          : buildImovelBlocks(signingData as ImovelSigningData, imovelCtx)
      }

      const existingWitnesses = contract.witnesses ?? []
      const witnesses: ContractWitness[] = [
        { name: form.testemunha1Name.trim(), email: form.testemunha1Email.trim() },
        { name: form.testemunha2Name.trim(), email: form.testemunha2Email.trim() },
      ]
        .filter((w) => w.name && w.email)
        .map((w) => {
          // Reaproveita a testemunha já existente (mesmo e-mail) para não perder token/assinatura
          const prev = existingWitnesses.find((e) => e.email.toLowerCase() === w.email.toLowerCase())
          if (prev) return { ...prev, name: w.name, email: w.email }
          return { token: generateWitnessToken(), name: w.name, email: w.email, status: 'pending' as const }
        })

      const toPdfWitness = (w?: ContractWitness) =>
        w ? { name: w.name, cpf: w.cpf, rg: w.rg, signature: w.signature } : undefined
      const tess = toPdfWitness(witnesses[0])
      const tes2 = toPdfWitness(witnesses[1])

      const doc = generateContractPDF({
        blocks,
        contractNumber: contract.contractNumber,
        locadorName: form.locador.name,
        locatarioName: form.locatario.name,
        signatureLocador: sigLocador || undefined,
        signatureLocatario: sigLocatario || undefined,
        docsLocador: docsLocador.filter(Boolean),
        docsLocatario: docsLocatario.filter(Boolean),
        testemunha1: tess,
        testemunha2: tes2,
        dataAssinatura: format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      })

      setPdfDoc(doc)

      const uploadPhoto = async (b64: string, slot: string) => {
        if (!b64) return ''
        const blob = await (await fetch(b64)).blob()
        const file = new File([blob], `${slot}.jpg`, { type: 'image/jpeg' })
        return uploadContractDocument(contract.companyId, contract.id, file, slot)
      }

      const [dlUrl1, dlUrl2, dlUrl3, dlUrl4] = await Promise.all([
        uploadPhoto(docsLocador[0], 'locador_doc'),
        uploadPhoto(docsLocador[1], 'locador_selfie'),
        uploadPhoto(docsLocatario[0], 'locatario_doc'),
        uploadPhoto(docsLocatario[1], 'locatario_selfie'),
      ])

      const pdfBlob = contractPDFToBlob(doc)
      const pdfUrl = await uploadContractPDF(contract.companyId, contract.id, pdfBlob, contract.contractNumber)

      await updateContract(contract.id, stripUndefined({
        signingData,
        signatureLocador: sigLocador || undefined,
        signatureLocatario: sigLocatario || undefined,
        docsLocador: [dlUrl1, dlUrl2].filter(Boolean),
        docsLocatario: [dlUrl3, dlUrl4].filter(Boolean),
        witnesses,
        signedPdfUrl: pdfUrl,
        signedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        templateId: chosenTemplate?.id,
        templateName: chosenTemplate?.name,
        templateClauses: chosenTemplate?.clauses,
      }) as Partial<Contract>)

      // Testemunhas assinam remotamente: cria a solicitação por token e envia o link por e-mail
      const objeto = isVeiculo
        ? `${vehicle?.brand ?? ''} ${vehicle?.model ?? ''}`.trim()
        : isEquipamento
        ? (equipment?.name || form.equipamento.descricao || '')
        : (form.imovel.endereco || property?.name || '')
      let emailFails = 0
      await Promise.all(witnesses.filter((w) => w.status !== 'signed').map(async (w) => {
        await createWitnessRequest(w.token, {
          contractId: contract.id,
          companyId: contract.companyId,
          contractNumber: contract.contractNumber,
          witnessName: w.name,
          witnessEmail: w.email,
          locadorName: form.locador.name,
          locatarioName: form.locatario.name,
          objeto,
          valor: formatCurrency(contract.rentValue),
        })
        if (isEmailConfigured()) {
          try {
            await sendWitnessInvite({
              toEmail: w.email,
              toName: w.name,
              contractNumber: contract.contractNumber,
              link: `${window.location.origin}/assinar-testemunha/${w.token}`,
              locadorName: form.locador.name,
              locatarioName: form.locatario.name,
            })
          } catch {
            emailFails++
          }
        }
      }))

      setLocalWitnesses(witnesses)
      qc.invalidateQueries({ queryKey: ['contracts'] })
      setPdfGenerated(true)

      if (witnesses.length === 0) {
        toast({ title: 'Contrato assinado e gerado com sucesso!' })
      } else if (!isEmailConfigured()) {
        toast({ title: 'Contrato gerado! Copie e envie os links de assinatura das testemunhas.' })
      } else if (emailFails > 0) {
        toast({ title: `Contrato gerado. ${emailFails} e-mail(s) falharam — use o botão "Link" para enviar manualmente.`, variant: 'destructive' })
      } else {
        toast({ title: 'Contrato gerado! Links enviados por e-mail às testemunhas.' })
      }
    } catch (err) {
      console.error('[ContractSignFlow] erro:', err)
      toast({ title: 'Erro ao gerar contrato. Tente novamente.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const enterEditMode = () => {
    if (!contract) return
    const sd = contract.signingData
    if (sd) {
      const partyToForm = (p: SigningParty): PartyForm => ({
        name: p.name, nationality: p.nationality, maritalStatus: p.maritalStatus,
        profession: p.profession, cpf: maskCPF(p.cpf), rg: p.rg,
        address: p.address, phone: maskPhone(p.phone), email: p.email,
      })
      const fin = sd.financeiro as { valorExtenso?: string; pixKey?: string; banco?: string; agencia?: string; conta?: string }
      const imovel = (!isVeiculo && !isEquipamento) ? (sd as ImovelSigningData).imovel : undefined
      const veiculoLat = isVeiculo ? (sd as VeiculoSigningData).locatario : undefined
      const equipamentoData = isEquipamento ? (sd as EquipamentoSigningData).equipamento : undefined
      setForm((f) => ({
        ...f,
        locador: partyToForm(sd.locador),
        locatario: partyToForm(sd.locatario),
        imovel: imovel ? { ...imovel } : f.imovel,
        veiculo: veiculoLat ? { cnh: veiculoLat.cnh, cnhCategoria: veiculoLat.cnhCategoria, cnhValidade: veiculoLat.cnhValidade } : f.veiculo,
        equipamento: equipamentoData
          ? { descricao: equipamentoData.descricao, numeroSerie: equipamentoData.numeroSerie, estadoGeral: equipamentoData.estadoGeral, acessorios: equipamentoData.acessorios }
          : f.equipamento,
        valorExtenso: fin.valorExtenso ?? '',
        pixKey: fin.pixKey ?? '',
        banco: fin.banco ?? '',
        agencia: fin.agencia ?? '',
        conta: fin.conta ?? '',
        prazoExtenso: (sd.prazo as { prazoExtenso?: string }).prazoExtenso ?? f.prazoExtenso,
        indiceReajuste: (sd as ImovelSigningData).indiceReajuste ?? f.indiceReajuste,
        foro: sd.foro ?? '',
        cidade: sd.cidade ?? '',
        testemunha1Name: contract.witnesses?.[0]?.name ?? sd.testemunha1?.name ?? '',
        testemunha1Email: contract.witnesses?.[0]?.email ?? '',
        testemunha2Name: contract.witnesses?.[1]?.name ?? sd.testemunha2?.name ?? '',
        testemunha2Email: contract.witnesses?.[1]?.email ?? '',
      }))
    } else {
      setForm((f) => ({
        ...f,
        testemunha1Name: contract.witnesses?.[0]?.name ?? '',
        testemunha1Email: contract.witnesses?.[0]?.email ?? '',
        testemunha2Name: contract.witnesses?.[1]?.name ?? '',
        testemunha2Email: contract.witnesses?.[1]?.email ?? '',
      }))
    }
    setSigLocador(contract.signatureLocador ?? '')
    setSigLocatario(contract.signatureLocatario ?? '')
    setDocsLocador([contract.docsLocador?.[0] ?? '', contract.docsLocador?.[1] ?? ''])
    setDocsLocatario([contract.docsLocatario?.[0] ?? '', contract.docsLocatario?.[1] ?? ''])
    setPdfGenerated(false)
    setPdfDoc(null)
    setStep(0)
    setEditMode(true)
  }

  // Abre diretamente na edição dos dados complementares quando solicitado pela lista
  useEffect(() => {
    if (open && initialEdit && contract) {
      enterEditMode()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialEdit, contract?.id])

  const [legacyBusy, setLegacyBusy] = useState(false)

  const handleLegacyEmail = async (lw: { name: string; cpf?: string; rg?: string }, email: string) => {
    if (!contract) return
    setLegacyBusy(true)
    try {
      const token = generateWitnessToken()
      const w: ContractWitness = { token, name: lw.name, email: email.trim(), cpf: lw.cpf, rg: lw.rg, status: 'pending' }
      await createWitnessRequest(token, {
        contractId: contract.id,
        companyId: contract.companyId,
        contractNumber: contract.contractNumber,
        witnessName: w.name,
        witnessEmail: w.email,
        locadorName: contract.signingData?.locador.name ?? contract.ownerName ?? '',
        locatarioName: contract.signingData?.locatario.name ?? contract.tenantName ?? '',
        objeto: contract.propertyName ?? '',
        valor: formatCurrency(contract.rentValue),
      })
      let emailed = false
      if (isEmailConfigured()) {
        try {
          await sendWitnessInvite({
            toEmail: w.email,
            toName: w.name,
            contractNumber: contract.contractNumber,
            link: `${window.location.origin}/assinar-testemunha/${token}`,
            locadorName: contract.signingData?.locador.name ?? contract.ownerName ?? '',
            locatarioName: contract.signingData?.locatario.name ?? contract.tenantName ?? '',
          })
          emailed = true
        } catch {
          emailed = false
        }
      }
      const list = [...localWitnesses, w]
      await updateContract(contract.id, stripUndefined({ witnesses: list }) as Partial<Contract>)
      setLocalWitnesses(list)
      qc.invalidateQueries({ queryKey: ['contracts'] })
      toast({ title: emailed ? 'Link enviado por e-mail à testemunha.' : 'Testemunha cadastrada. Use o botão "Link" para enviar manualmente.' })
    } catch {
      toast({ title: 'Erro ao processar. Tente novamente.', variant: 'destructive' })
    } finally {
      setLegacyBusy(false)
    }
  }

  const handleLegacySign = async (lw: { name: string; cpf?: string; rg?: string }, signature: string) => {
    if (!contract) return
    setLegacyBusy(true)
    try {
      const w: ContractWitness = {
        token: generateWitnessToken(),
        name: lw.name, email: '', cpf: lw.cpf, rg: lw.rg,
        signature, status: 'signed', signedAt: new Date().toISOString(),
      }
      const list = [...localWitnesses, w]
      await updateContract(contract.id, stripUndefined({ witnesses: list }) as Partial<Contract>)
      setLocalWitnesses(list)
      qc.invalidateQueries({ queryKey: ['contracts'] })
      toast({ title: 'Assinatura registrada! Use "Atualizar PDF com testemunhas" para incluí-la no documento.' })
    } catch {
      toast({ title: 'Erro ao registrar assinatura.', variant: 'destructive' })
    } finally {
      setLegacyBusy(false)
    }
  }

  const witnessLink = (token: string) => `${window.location.origin}/assinar-testemunha/${token}`

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(witnessLink(token))
      toast({ title: 'Link copiado para a área de transferência.' })
    } catch {
      toast({ title: 'Não foi possível copiar o link.', variant: 'destructive' })
    }
  }

  // Busca as assinaturas remotas mais recentes. Também re-busca quando a testemunha
  // já consta como "assinada" mas sem a imagem da assinatura salva.
  const fetchUpdatedWitnesses = async (list: ContractWitness[]): Promise<ContractWitness[]> => {
    return Promise.all(list.map(async (w) => {
      if (w.token && (w.status !== 'signed' || !w.signature)) {
        const req = await getWitnessRequest(w.token)
        if (req && req.status === 'signed') {
          return { ...w, signature: req.signature, cpf: req.cpf, rg: req.rg, status: 'signed' as const, signedAt: req.signedAt }
        }
      }
      return w
    }))
  }

  const persistWitnesses = async (list: ContractWitness[]) => {
    if (!contract) return
    await updateContract(contract.id, stripUndefined({ witnesses: list }) as Partial<Contract>)
    qc.invalidateQueries({ queryKey: ['contracts'] })
  }

  const handleRefreshWitnesses = async () => {
    if (!contract) return
    setRefreshing(true)
    try {
      const updated = await fetchUpdatedWitnesses(localWitnesses)
      setLocalWitnesses(updated)
      await persistWitnesses(updated)
      toast({ title: 'Status das testemunhas atualizado.' })
    } catch {
      toast({ title: 'Erro ao atualizar status das testemunhas.', variant: 'destructive' })
    } finally {
      setRefreshing(false)
    }
  }

  const handleRegenerate = async () => {
    if (!contract) return
    setRegenerating(true)
    try {
      // Garante que as assinaturas remotas mais recentes entrem no PDF
      const fresh = await fetchUpdatedWitnesses(localWitnesses)
      setLocalWitnesses(fresh)

      // Inclui também testemunhas legadas (ainda não convertidas) como pendentes no PDF
      const sd = contract.signingData
      const legacyAsWitness: ContractWitness[] = sd
        ? [sd.testemunha1, sd.testemunha2]
            .filter((t): t is { name: string; cpf: string; rg: string } => !!t?.name)
            .filter((lw) => !fresh.some((w) => w.name === lw.name))
            .map((lw) => ({ token: '', name: lw.name, email: '', cpf: lw.cpf, rg: lw.rg, status: 'pending' as const }))
        : []

      const pdfWitnesses = [...fresh, ...legacyAsWitness]
      const doc = await generateSignedContractPDF({ ...contract, witnesses: pdfWitnesses })
      const blob = contractPDFToBlob(doc)
      const pdfUrl = await uploadContractPDF(contract.companyId, contract.id, blob, contract.contractNumber)
      // Persiste somente as testemunhas reais (não as legadas, que ainda podem virar manuais/e-mail)
      await persistWitnesses(fresh)
      await updateContract(contract.id, stripUndefined({ signedPdfUrl: pdfUrl }) as Partial<Contract>)
      setCurrentPdfUrl(pdfUrl)
      setPdfDoc(doc)
      setPdfGenerated(true)
      qc.invalidateQueries({ queryKey: ['contracts'] })
      window.open(pdfUrl, '_blank')
      toast({ title: 'PDF atualizado com as assinaturas das testemunhas!' })
    } catch {
      toast({ title: 'Erro ao gerar o PDF final. Tente novamente.', variant: 'destructive' })
    } finally {
      setRegenerating(false)
    }
  }

  const signingStatus = contract
    ? getContractSigningStatus({ ...contract, witnesses: localWitnesses })
    : null

  // Testemunhas de contratos antigos (formato anterior, salvas em signingData)
  const legacyWitnesses = (() => {
    const sd = contract?.signingData
    if (!sd) return [] as { name: string; cpf?: string; rg?: string }[]
    return [sd.testemunha1, sd.testemunha2].filter((t): t is { name: string; cpf: string; rg: string } => !!t?.name)
  })()

  // Legadas que ainda não foram convertidas para o formato novo (por nome)
  const pendingLegacy = legacyWitnesses.filter((lw) => !localWitnesses.some((w) => w.name === lw.name))

  const canAdvance = () => {
    if (step === 0) return form.locador.cpf && form.locador.name && form.locatario.cpf && form.locatario.name
    if (step === 1) return docsLocador[0] && docsLocador[1]
    if (step === 2) return !!sigLocador
    if (step === 3) return docsLocatario[0] && docsLocatario[1]
    if (step === 4) return !!sigLocatario
    return true
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92dvh] flex flex-col p-0 gap-0">
        {contract ? ((contract.signedAt && !editMode) ? (
          <>
            <DialogHeader className="px-6 py-4 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                {signingStatus?.state === 'complete'
                  ? <CheckCircle className="h-4 w-4 text-green-600" />
                  : <Clock className="h-4 w-4 text-amber-500" />}
                Contrato {contract.contractNumber} — {signingStatus?.state === 'complete' ? 'Assinado' : 'Assinatura pendente'}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {signingStatus?.state === 'complete' ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Contrato totalmente assinado</p>
                    <p className="text-xs">Todas as assinaturas foram coletadas.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Assinatura pendente</p>
                    <p className="text-xs">Falta(m) {signingStatus?.pendingCount} assinatura(s). O status permanece pendente até que locador, locatário e todas as testemunhas assinem.</p>
                  </div>
                </div>
              )}

              <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-1.5">
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Objeto</span><span className="font-medium text-right">{contract.propertyName || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><span className="font-medium">{formatCurrency(contract.rentValue)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vigência</span><span className="font-medium">{formatDate(contract.startDate)} — {contract.endDate ? formatDate(contract.endDate) : 'Indeterminado'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Assinado em</span><span className="font-medium">{contract.signedAt}</span></div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Assinaturas das partes</p>
                <div className="grid grid-cols-2 gap-3">
                  <SignatureStatusCard label="Locador" name={contract.signingData?.locador.name ?? contract.ownerName ?? ''} signature={contract.signatureLocador} />
                  <SignatureStatusCard label="Locatário" name={contract.signingData?.locatario.name ?? contract.tenantName ?? ''} signature={contract.signatureLocatario} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Testemunhas</p>
                  {localWitnesses.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleRefreshWitnesses} disabled={refreshing}>
                      {refreshing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />} Atualizar status
                    </Button>
                  )}
                </div>

                {(localWitnesses.length === 0 && pendingLegacy.length === 0) ? (
                  <p className="text-sm text-muted-foreground">Nenhuma testemunha foi cadastrada para este contrato.</p>
                ) : (
                  <div className="space-y-2">
                    {localWitnesses.map((w) => (
                      <div key={w.token} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{w.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{w.email || 'Assinatura presencial'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {w.status === 'signed' ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="h-3.5 w-3.5" /> Assinou</span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-600 text-xs font-medium"><Clock className="h-3.5 w-3.5" /> Pendente</span>
                          )}
                          {w.signature && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setViewSignature({ name: w.name, signature: w.signature! })}>
                              <Eye className="mr-1 h-3 w-3" /> Assinatura
                            </Button>
                          )}
                          {w.email && w.status !== 'signed' && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyLink(w.token)}>
                              <Copy className="mr-1 h-3 w-3" /> Link
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {pendingLegacy.length > 0 && (
                      <>
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                          Testemunhas cadastradas manualmente. Escolha <strong>Assinar agora</strong> (presencial) ou <strong>Enviar por e-mail</strong> para coletar a assinatura eletrônica.
                        </p>
                        {pendingLegacy.map((lw, i) => (
                          <LegacyWitnessCard
                            key={`legacy-${i}`}
                            witness={lw}
                            busy={legacyBusy}
                            emailConfigured={isEmailConfigured()}
                            onSendEmail={(email) => handleLegacyEmail(lw, email)}
                            onSignNow={(sig) => handleLegacySign(lw, sig)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={enterEditMode}>
                  <PenLine className="mr-2 h-4 w-4" /> Editar
                </Button>
                {currentPdfUrl && (
                  <Button variant="outline" className="flex-1" onClick={() => window.open(currentPdfUrl, '_blank')}>
                    <Download className="mr-2 h-4 w-4" /> Baixar PDF atual
                  </Button>
                )}
                {localWitnesses.length > 0 && (
                  <Button className="flex-1 whitespace-normal h-auto py-2 text-center leading-tight" onClick={handleRegenerate} disabled={regenerating}>
                    {regenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</> : <><FileText className="mr-2 h-4 w-4 shrink-0" /> Atualizar PDF</>}
                  </Button>
                )}
              </div>

              {pdfGenerated && pdfDoc && (
                <Button variant="ghost" className="w-full" onClick={() => downloadContractPDF(pdfDoc, `${contract.contractNumber}_assinado.pdf`)}>
                  <Download className="mr-2 h-4 w-4" /> Baixar PDF recém-gerado
                </Button>
              )}
            </div>

            <div className="border-t px-6 py-4 flex justify-end shrink-0">
              <Button variant="outline" onClick={onClose}>Fechar</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="px-6 py-4 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Assinar Contrato — {contract.contractNumber}
              </DialogTitle>
            </DialogHeader>

            {/* Step indicator */}
            <div className="flex items-center gap-0 border-b bg-muted/20 px-4 py-2 shrink-0 overflow-x-auto">
              {STEPS.map(({ id, label, icon: Icon }, i) => (
                <div key={id} className="flex items-center shrink-0">
                  <div className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                    i === step ? 'bg-primary text-primary-foreground' : i < step ? 'text-green-600' : 'text-muted-foreground',
                  )}>
                    {i < step ? <CheckCircle className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    <span className="hidden sm:block">{label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 mx-0.5 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* STEP 0: Dados complementares */}
              {step === 0 && (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-primary">Modelo de contrato</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">Modelo do sistema (padrão)</SelectItem>
                        {availableTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Modelos personalizados são criados em "Modelos de Contrato".
                    </p>
                  </div>

                  <PartyFormFields label="Locador / Proprietário" value={form.locador} onChange={setFormLocador} />
                  <PartyFormFields label="Locatário / Inquilino" value={form.locatario} onChange={setFormLocatario} />

                  {isVeiculo && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-primary border-b pb-1 flex items-center gap-1.5"><Car className="h-4 w-4" /> CNH do Locatário</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1"><Label className="text-xs">Nº da CNH</Label><Input value={form.veiculo.cnh} onChange={(e) => setForm((f) => ({ ...f, veiculo: { ...f.veiculo, cnh: e.target.value } }))} /></div>
                        <div className="space-y-1"><Label className="text-xs">Categoria</Label>
                          <Select value={form.veiculo.cnhCategoria} onValueChange={(v) => setForm((f) => ({ ...f, veiculo: { ...f.veiculo, cnhCategoria: v } }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{['A', 'B', 'AB', 'C', 'D', 'E'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1"><Label className="text-xs">Validade</Label><Input type="date" value={form.veiculo.cnhValidade} onChange={(e) => setForm((f) => ({ ...f, veiculo: { ...f.veiculo, cnhValidade: e.target.value } }))} /></div>
                      </div>
                    </div>
                  )}

                  {!isVeiculo && !isEquipamento && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-primary border-b pb-1 flex items-center gap-1.5"><Building2 className="h-4 w-4" /> Imóvel</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {([
                          ['endereco', 'Endereço completo', 'sm:col-span-2'],
                          ['tipo', 'Tipo (ex: apartamento, casa)'],
                          ['areaConstruida', 'Área construída (m²)'],
                          ['areaTotal', 'Área total (m²)'],
                          ['matricula', 'Nº de Matrícula'],
                          ['cartorio', 'Cartório de Registro'],
                          ['comodos', 'Cômodos (ex: 2 quartos, sala, cozinha)'],
                          ['vagas', 'Vagas de garagem'],
                          ['mobilia', 'Móveis/equipamentos', 'sm:col-span-2'],
                        ] as [keyof ImovelForm, string, string?][]).map(([key, label, span]) => (
                          <div key={key} className={cn('space-y-1', span)}>
                            <Label className="text-xs">{label}</Label>
                            <Input value={form.imovel[key]} onChange={(e) => setForm((f) => ({ ...f, imovel: { ...f.imovel, [key]: e.target.value } }))} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isEquipamento && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-primary border-b pb-1 flex items-center gap-1.5"><HardHat className="h-4 w-4" /> Equipamento</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Descrição</Label>
                          <Input
                            placeholder={equipment?.name ?? 'Ex: Betoneira 400L'}
                            value={form.equipamento.descricao}
                            onChange={(e) => setForm((f) => ({ ...f, equipamento: { ...f.equipamento, descricao: e.target.value } }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Nº de Série / Patrimônio</Label>
                          <Input
                            placeholder={equipment?.serialNumber ?? ''}
                            value={form.equipamento.numeroSerie}
                            onChange={(e) => setForm((f) => ({ ...f, equipamento: { ...f.equipamento, numeroSerie: e.target.value } }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Estado geral na entrega</Label>
                          <Input
                            value={form.equipamento.estadoGeral}
                            onChange={(e) => setForm((f) => ({ ...f, equipamento: { ...f.equipamento, estadoGeral: e.target.value } }))}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Acessórios entregues</Label>
                          <Input
                            placeholder="Ex: cabo de alimentação, manual, estojo"
                            value={form.equipamento.acessorios}
                            onChange={(e) => setForm((f) => ({ ...f, equipamento: { ...f.equipamento, acessorios: e.target.value } }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-primary border-b pb-1">Dados Financeiros</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Valor por extenso (ex: "trezentos reais")</Label><Input value={form.valorExtenso} onChange={(e) => setForm((f) => ({ ...f, valorExtenso: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Chave PIX</Label><Input value={form.pixKey} onChange={(e) => setForm((f) => ({ ...f, pixKey: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Banco</Label><Input value={form.banco} onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))} /></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-primary border-b pb-1">Outros</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1"><Label className="text-xs">Prazo por extenso</Label><Input value={form.prazoExtenso} onChange={(e) => setForm((f) => ({ ...f, prazoExtenso: e.target.value }))} placeholder="ex: vinte e quatro meses" /></div>
                      <div className="space-y-1">
                        <Label className="text-xs">Índice de reajuste</Label>
                        <Select value={form.indiceReajuste} onValueChange={(v) => setForm((f) => ({ ...f, indiceReajuste: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{READJUSTMENT.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Foro (cidade)</Label><Input value={form.foro} onChange={(e) => setForm((f) => ({ ...f, foro: e.target.value }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Cidade de assinatura</Label><Input value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} /></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground border-b pb-1">Testemunhas (assinam por e-mail)</p>
                    <p className="text-xs text-muted-foreground">Informe nome e e-mail. Cada testemunha recebe um link para assinar eletronicamente; o CPF/RG é preenchido por ela no momento da assinatura.</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(['1', '2'] as const).map((n) => {
                        const nameKey = `testemunha${n}Name` as keyof ComplementaryForm
                        const emailKey = `testemunha${n}Email` as keyof ComplementaryForm
                        return (
                          <div key={`t${n}`} className="contents">
                            <div className="space-y-1"><Label className="text-xs">Testemunha {n} — Nome</Label><Input value={form[nameKey] as string} onChange={(e) => setForm((f) => ({ ...f, [nameKey]: e.target.value }))} /></div>
                            <div className="space-y-1"><Label className="text-xs">Testemunha {n} — E-mail</Label><Input type="email" value={form[emailKey] as string} onChange={(e) => setForm((f) => ({ ...f, [emailKey]: e.target.value }))} placeholder="email@exemplo.com" /></div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: Fotos do Locador */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-800">
                    <p className="font-semibold mb-1 flex items-center gap-1.5"><User className="h-4 w-4" /> Documentos do Locador — {form.locador.name}</p>
                    <p>Tire duas fotos: (1) foto do documento de identidade (RG ou CNH) e (2) foto do(a) proprietário(a) segurando o documento de frente para a câmera.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PhotoUploader label="1. Foto do documento (RG/CNH)" value={docsLocador[0]} onChange={(v) => setDocsLocador([v, docsLocador[1]])} />
                    <PhotoUploader label="2. Titular segurando o documento" value={docsLocador[1]} onChange={(v) => setDocsLocador([docsLocador[0], v])} />
                  </div>
                </div>
              )}

              {/* STEP 2: Assinatura Locador */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-800">
                    <p className="font-semibold mb-1 flex items-center gap-1.5"><PenLine className="h-4 w-4" /> Assinatura do Locador — {form.locador.name}</p>
                    <p>Assine abaixo utilizando o mouse ou dedo (touchscreen). Sua assinatura será incorporada ao contrato.</p>
                  </div>
                  <SignatureCanvas
                    label="Assinatura do Locador / Proprietário"
                    value={sigLocador}
                    onConfirm={(v) => setSigLocador(v)}
                    onClear={() => setSigLocador('')}
                  />
                </div>
              )}

              {/* STEP 3: Fotos do Locatário */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 text-sm text-purple-800">
                    <p className="font-semibold mb-1 flex items-center gap-1.5"><User className="h-4 w-4" /> Documentos do Locatário — {form.locatario.name}</p>
                    <p>Tire duas fotos: (1) foto do documento de identidade (RG ou CNH) e (2) foto do(a) inquilino(a) segurando o documento de frente para a câmera.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PhotoUploader label="1. Foto do documento (RG/CNH)" value={docsLocatario[0]} onChange={(v) => setDocsLocatario([v, docsLocatario[1]])} />
                    <PhotoUploader label="2. Titular segurando o documento" value={docsLocatario[1]} onChange={(v) => setDocsLocatario([docsLocatario[0], v])} />
                  </div>
                </div>
              )}

              {/* STEP 4: Assinatura Locatário */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 text-sm text-purple-800">
                    <p className="font-semibold mb-1 flex items-center gap-1.5"><PenLine className="h-4 w-4" /> Assinatura do Locatário — {form.locatario.name}</p>
                    <p>Assine abaixo utilizando o mouse ou dedo (touchscreen). Sua assinatura será incorporada ao contrato.</p>
                  </div>
                  <SignatureCanvas
                    label="Assinatura do Locatário / Inquilino"
                    value={sigLocatario}
                    onConfirm={(v) => setSigLocatario(v)}
                    onClear={() => setSigLocatario('')}
                  />
                </div>
              )}

              {/* STEP 5: Gerar PDF */}
              {step === 5 && (
                <div className="space-y-5">
                  <div className="rounded-xl border bg-muted/30 p-5 space-y-3 text-sm">
                    <p className="font-semibold text-base">Resumo do contrato</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      <div className="text-muted-foreground">Nº do contrato</div><div className="font-medium">{contract.contractNumber}</div>
                      <div className="text-muted-foreground">Locador</div><div className="font-medium">{form.locador.name}</div>
                      <div className="text-muted-foreground">Locatário</div><div className="font-medium">{form.locatario.name}</div>
                      <div className="text-muted-foreground">Objeto</div><div className="font-medium">{isVeiculo ? `${vehicle?.brand} ${vehicle?.model}` : isEquipamento ? (equipment?.name ?? form.equipamento.descricao) : (form.imovel.endereco || property?.name)}</div>
                      <div className="text-muted-foreground">Valor</div><div className="font-medium">{formatCurrency(contract.rentValue)}</div>
                      <div className="text-muted-foreground">Vigência</div><div className="font-medium">{formatDate(contract.startDate)} — {contract.endDate ? formatDate(contract.endDate) : 'Indeterminado'}</div>
                      <div className="text-muted-foreground">Docs Locador</div><div className={docsLocador[0] && docsLocador[1] ? 'text-green-600 font-medium' : 'text-yellow-600'}>{docsLocador[0] && docsLocador[1] ? '✓ Anexadas' : '⚠ Incompleto'}</div>
                      <div className="text-muted-foreground">Docs Locatário</div><div className={docsLocatario[0] && docsLocatario[1] ? 'text-green-600 font-medium' : 'text-yellow-600'}>{docsLocatario[0] && docsLocatario[1] ? '✓ Anexadas' : '⚠ Incompleto'}</div>
                      <div className="text-muted-foreground">Assinatura Locador</div><div className={sigLocador ? 'text-green-600 font-medium' : 'text-yellow-600'}>{sigLocador ? '✓ Assinado' : '⚠ Não assinado'}</div>
                      <div className="text-muted-foreground">Assinatura Locatário</div><div className={sigLocatario ? 'text-green-600 font-medium' : 'text-yellow-600'}>{sigLocatario ? '✓ Assinado' : '⚠ Não assinado'}</div>
                    </div>
                  </div>

                  {pdfGenerated && pdfDoc ? (
                    <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-green-300 bg-green-50 py-8">
                      <CheckCircle className="h-12 w-12 text-green-500" />
                      <div className="text-center">
                        <p className="font-semibold text-green-800">Contrato gerado com sucesso!</p>
                        <p className="text-sm text-green-700 mt-1">O arquivo foi salvo na nuvem e vinculado ao contrato.</p>
                      </div>
                      <Button onClick={() => downloadContractPDF(pdfDoc, `${contract.contractNumber}_assinado.pdf`)}>
                        <Download className="mr-2 h-4 w-4" /> Baixar PDF
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full" size="lg" onClick={handleGenerate} disabled={saving}>
                      {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</> : <><FileText className="mr-2 h-4 w-4" /> Gerar Contrato Assinado</>}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="border-t px-6 py-4 flex justify-between shrink-0">
              <Button variant="outline" onClick={() => { if (step !== 0) { setStep((s) => s - 1); return } if (editMode) { setEditMode(false); return } onClose() }}>
                <ChevronLeft className="mr-1 h-4 w-4" />{step === 0 ? 'Cancelar' : 'Voltar'}
              </Button>
              {step < 5 && (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
                  Avançar <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
              {step === 5 && pdfGenerated && (
                <Button variant="outline" onClick={onClose}>Fechar</Button>
              )}
            </div>
          </>
        )) : null}
      </DialogContent>
    </Dialog>

    <Dialog open={!!viewSignature} onOpenChange={() => setViewSignature(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Assinatura — {viewSignature?.name}</DialogTitle>
        </DialogHeader>
        {viewSignature && (
          <div className="rounded-lg border bg-white p-4">
            <img src={viewSignature.signature} alt={`Assinatura de ${viewSignature.name}`} className="mx-auto max-h-48 w-full object-contain" />
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
