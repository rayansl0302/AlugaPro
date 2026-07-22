import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Copy, Check, Loader2, FileText, CheckCircle, Clock, RefreshCw, Download, Landmark, Pencil, X,
} from 'lucide-react'
import {
  getSaleContracts, createSaleContract, updateSaleContract,
  generateSaleSignToken, createSaleSignatureRequest, getSaleSignatureRequest,
  updateSaleSignatureSnapshot, deleteSaleSignatureRequest, subscribeSaleSignatures,
} from '@/services/saleContracts'
import { uploadSaleContractPDF } from '@/services/storage'
import { buildTerrenoBlocks } from '@/lib/contractTemplates/terreno'
import { generateSaleContractPDF, contractPDFToBlob, PDFWitness } from '@/lib/contractPDF'
import { openOrShareBlob } from '@/lib/nativeFile'
import { SaleContract, SaleContractParty, SaleContractSigner, SaleContractSignerRole } from '@/types'
import { generateSaleContractNumber, formatCurrency, formatDate, maskCPF, maskRG } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from '@/hooks/useToast'

const emptyParty: SaleContractParty = { name: '', nationality: '', maritalStatus: '', cpf: '', rg: '', address: '' }

// jsPDF não busca URL remota — precisa converter pra base64 antes de embutir
// no PDF (as fotos ficam hospedadas no Cloudinary, diferente da assinatura
// que já chega em base64 direto do canvas).
async function urlToDataURL(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function openBlankTab(): Window | null {
  // Abre a aba já no clique (síncrono) pra não cair no bloqueio de pop-up —
  // o PDF é montado depois, de forma assíncrona, e só então redireciona.
  // No app nativo não existe "aba": retorna null e quem chamou cai no
  // fallback openOrShareBlob (share sheet).
  if (Capacitor.isNativePlatform()) return null
  return window.open('', '_blank')
}

interface SaleContractPdfData {
  contractNumber: string
  vendedor: SaleContractParty
  comprador: SaleContractParty
  terrenoDescricao: string
  terrenoEndereco: string
  terrenoCoordenadas?: string
  precoValor: number
  precoExtenso: string
  formaPagamento: string
  foro: string
  cidade: string
  dataContrato: string
  signers: SaleContractSigner[]
}

async function buildSaleContractPdf(input: SaleContractPdfData) {
  const vendedorSigner = input.signers.find((s) => s.role === 'vendedor')
  const compradorSigner = input.signers.find((s) => s.role === 'comprador')
  const t1 = input.signers.find((s) => s.role === 'testemunha1')
  const t2 = input.signers.find((s) => s.role === 'testemunha2')

  const blocks = buildTerrenoBlocks({
    contractNumber: input.contractNumber,
    vendedor: input.vendedor,
    comprador: input.comprador,
    terrenoDescricao: input.terrenoDescricao,
    terrenoEndereco: input.terrenoEndereco,
    terrenoCoordenadas: input.terrenoCoordenadas,
    precoValor: input.precoValor,
    precoExtenso: input.precoExtenso,
    formaPagamento: input.formaPagamento,
    foro: input.foro,
    cidade: input.cidade,
    dataContrato: input.dataContrato,
    testemunha1: t1 ? { name: t1.name, cpf: t1.cpf ?? '', rg: t1.rg ?? '' } : undefined,
    testemunha2: t2 ? { name: t2.name, cpf: t2.cpf ?? '', rg: t2.rg ?? '' } : undefined,
  })

  const toPdfWitness = async (name: string, s?: SaleContractSigner): Promise<PDFWitness> => ({
    name,
    cpf: s?.cpf,
    rg: s?.rg,
    signature: s?.signature,
    documentFrontUrl: await urlToDataURL(s?.documentFrontUrl),
    documentBackUrl: await urlToDataURL(s?.documentBackUrl),
    documentSelfieUrl: await urlToDataURL(s?.documentSelfieUrl),
  })

  return generateSaleContractPDF({
    blocks,
    contractNumber: input.contractNumber,
    vendedor: await toPdfWitness(input.vendedor.name, vendedorSigner),
    comprador: await toPdfWitness(input.comprador.name, compradorSigner),
    testemunha1: t1 ? await toPdfWitness(t1.name, t1) : undefined,
    testemunha2: t2 ? await toPdfWitness(t2.name, t2) : undefined,
  })
}

const ROLE_KEYS: Record<SaleContractSignerRole, string> = {
  vendedor: 'vendedor',
  comprador: 'comprador',
  testemunha1: 'testemunha1',
  testemunha2: 'testemunha2',
}

function PartyFields({ idPrefix, title, value, onChange, disabled }: {
  idPrefix: string
  title: string
  value: SaleContractParty
  onChange: (v: SaleContractParty) => void
  disabled?: boolean
}) {
  const { t } = useTranslation('saleContracts')
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">
        {title}
        {disabled && <span className="ml-2 text-xs font-normal text-muted-foreground">{t('formExtra.lockedAfterSign')}</span>}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-name`} className="text-xs">{t('formExtra.fullName')}</Label>
          <Input id={`${idPrefix}-name`} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-nationality`} className="text-xs">{t('form.nationality')}</Label>
          <Input id={`${idPrefix}-nationality`} value={value.nationality} onChange={(e) => onChange({ ...value, nationality: e.target.value })} placeholder={t('formExtra.nationalityPlaceholder')} disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-marital`} className="text-xs">{t('form.maritalStatus')}</Label>
          <Input id={`${idPrefix}-marital`} value={value.maritalStatus} onChange={(e) => onChange({ ...value, maritalStatus: e.target.value })} placeholder={t('formExtra.maritalPlaceholder')} disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-cpf`} className="text-xs">{t('form.cpf')}</Label>
          <Input id={`${idPrefix}-cpf`} value={value.cpf} onChange={(e) => onChange({ ...value, cpf: maskCPF(e.target.value) })} placeholder="000.000.000-00" disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-rg`} className="text-xs">{t('form.rg')}</Label>
          <Input id={`${idPrefix}-rg`} value={value.rg} onChange={(e) => onChange({ ...value, rg: maskRG(e.target.value) })} placeholder="00.000.000-0" disabled={disabled} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-address`} className="text-xs">{t('formExtra.fullAddress')}</Label>
          <Input id={`${idPrefix}-address`} value={value.address} onChange={(e) => onChange({ ...value, address: e.target.value })} disabled={disabled} />
        </div>
      </div>
    </div>
  )
}

function SaleContractCard({
  contract, onRefresh }: { contract: SaleContract; onRefresh: () => void }) {
  const { t } = useTranslation('saleContracts')
  const [refreshing, setRefreshing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editVendedor, setEditVendedor] = useState<SaleContractParty>(contract.vendedor)
  const [editComprador, setEditComprador] = useState<SaleContractParty>(contract.comprador)
  const [editTerrenoDescricao, setEditTerrenoDescricao] = useState(contract.terrenoDescricao)
  const [editTerrenoEndereco, setEditTerrenoEndereco] = useState(contract.terrenoEndereco)
  const [editTerrenoCoordenadas, setEditTerrenoCoordenadas] = useState(contract.terrenoCoordenadas ?? '')
  const [editPrecoValor, setEditPrecoValor] = useState(formatCurrency(contract.precoValor))
  const [editPrecoExtenso, setEditPrecoExtenso] = useState(contract.precoExtenso)
  const [editFormaPagamento, setEditFormaPagamento] = useState(contract.formaPagamento)
  const [editForo, setEditForo] = useState(contract.foro)
  const [editCidade, setEditCidade] = useState(contract.cidade)
  const [editTestemunha1Nome, setEditTestemunha1Nome] = useState(contract.signers.find((s) => s.role === 'testemunha1')?.name ?? '')
  const [editTestemunha1Cpf, setEditTestemunha1Cpf] = useState(contract.signers.find((s) => s.role === 'testemunha1')?.cpf ?? '')
  const [editTestemunha1Rg, setEditTestemunha1Rg] = useState(contract.signers.find((s) => s.role === 'testemunha1')?.rg ?? '')
  const [editTestemunha2Nome, setEditTestemunha2Nome] = useState(contract.signers.find((s) => s.role === 'testemunha2')?.name ?? '')
  const [editTestemunha2Cpf, setEditTestemunha2Cpf] = useState(contract.signers.find((s) => s.role === 'testemunha2')?.cpf ?? '')
  const [editTestemunha2Rg, setEditTestemunha2Rg] = useState(contract.signers.find((s) => s.role === 'testemunha2')?.rg ?? '')

  const signLink = (token: string) => `${window.location.origin}/assinar-venda/${token}`

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(signLink(token))
      setCopiedToken(token)
      toast({ title: t('toast.linkCopied') })
      setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 2000)
    } catch {
      toast({ title: t('toast.linkCopyError'), variant: 'destructive' })
    }
  }

  // Referência sempre atualizada do contrato (pro listener não usar estado velho)
  const contractRef = useRef(contract)
  contractRef.current = contract
  const syncingRef = useRef(false)

  // Sincroniza os status de assinatura a partir dos docs em saleSignatures.
  // silent=true: usado pela atualização automática (sem spinner/toast e sem
  // escrever se nada mudou); silent=false: o botão "Atualizar status".
  const syncSignatures = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    if (syncingRef.current) return
    syncingRef.current = true
    if (!silent) setRefreshing(true)
    try {
      const current = contractRef.current
      let changed = false
      const updated = await Promise.all(current.signers.map(async (s) => {
        if (s.status === 'signed') return s
        const req = await getSaleSignatureRequest(s.token)
        if (req?.status === 'signed') {
          changed = true
          return {
            ...s,
            signature: req.signature, cpf: req.cpf, rg: req.rg,
            documentFrontUrl: req.documentFrontUrl, documentBackUrl: req.documentBackUrl, documentSelfieUrl: req.documentSelfieUrl,
            status: 'signed' as const, signedAt: req.signedAt,
          }
        }
        return s
      }))
      if (changed) {
        await updateSaleContract(current.id, { signers: updated })
        onRefresh()
      }
      if (!silent) toast({ title: t('toast.statusUpdated') })
    } catch {
      if (!silent) toast({ title: t('toast.statusError'), variant: 'destructive' })
    } finally {
      syncingRef.current = false
      if (!silent) setRefreshing(false)
    }
  }

  const handleRefresh = () => syncSignatures()

  // Atualização automática em tempo real: quando um assinante conclui pelo
  // link, o doc em saleSignatures vira 'signed' e sincronizamos o contrato
  // sozinho — sem o admin precisar clicar em "Atualizar status". A subscription
  // já dispara com o estado atual ao montar, cobrindo assinaturas feitas
  // enquanto a página estava fechada.
  useEffect(() => {
    if (contract.status === 'assinado') return
    return subscribeSaleSignatures(contract.id, (signedTokens) => {
      const cur = contractRef.current
      const hasNewSignature = cur.signers.some((s) => s.status !== 'signed' && s.token && signedTokens.has(s.token))
      if (hasNewSignature) void syncSignatures({ silent: true })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.id, contract.status])

  const requiredSigners = contract.signers.filter((s) => s.role === 'vendedor' || s.role === 'comprador' || s.token)
  const allSigned = requiredSigners.length > 0 && requiredSigners.every((s) => s.status === 'signed')

  const handleGeneratePdf = async () => {
    setGenerating(true)
    try {
      const pdf = await buildSaleContractPdf(contract)
      const blob = contractPDFToBlob(pdf)
      const url = await uploadSaleContractPDF(contract.id, blob, contract.contractNumber)
      await updateSaleContract(contract.id, { signedPdfUrl: url, status: 'assinado' })
      onRefresh()
      toast({ title: t('toast.pdfGenerated') })
    } catch {
      toast({ title: t('toast.pdfError'), variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const handlePreview = async () => {
    const win = openBlankTab()
    setPreviewing(true)
    try {
      const pdf = await buildSaleContractPdf(contract)
      const blob = contractPDFToBlob(pdf)
      if (win) win.location.href = URL.createObjectURL(blob)
      else await openOrShareBlob(blob, `Previa_${contract.contractNumber}.pdf`)
    } catch {
      win?.close()
      toast({ title: t('toast.previewError'), variant: 'destructive' })
    } finally {
      setPreviewing(false)
    }
  }

  const vendedorSigner = contract.signers.find((s) => s.role === 'vendedor')
  const compradorSigner = contract.signers.find((s) => s.role === 'comprador')
  const testemunha1Signer = contract.signers.find((s) => s.role === 'testemunha1')
  const testemunha2Signer = contract.signers.find((s) => s.role === 'testemunha2')

  const startEditing = () => {
    setEditVendedor(contract.vendedor)
    setEditComprador(contract.comprador)
    setEditTerrenoDescricao(contract.terrenoDescricao)
    setEditTerrenoEndereco(contract.terrenoEndereco)
    setEditTerrenoCoordenadas(contract.terrenoCoordenadas ?? '')
    setEditPrecoValor(formatCurrency(contract.precoValor))
    setEditPrecoExtenso(contract.precoExtenso)
    setEditFormaPagamento(contract.formaPagamento)
    setEditForo(contract.foro)
    setEditCidade(contract.cidade)
    setEditTestemunha1Nome(testemunha1Signer?.name ?? '')
    setEditTestemunha1Cpf(testemunha1Signer?.cpf ?? '')
    setEditTestemunha1Rg(testemunha1Signer?.rg ?? '')
    setEditTestemunha2Nome(testemunha2Signer?.name ?? '')
    setEditTestemunha2Cpf(testemunha2Signer?.cpf ?? '')
    setEditTestemunha2Rg(testemunha2Signer?.rg ?? '')
    setEditing(true)
  }

  // Testemunha que já assinou fica travada (não pode trocar nome nem remover);
  // as outras combinações (vazio->nome, nome->vazio, nome->outro nome) são
  // tratadas como criar/remover/renomear o signatário daquele papel.
  const reconcileWitness = (
    role: 'testemunha1' | 'testemunha2',
    existing: SaleContractSigner | undefined,
    name: string,
    cpf: string,
    rg: string,
  ): SaleContractSigner | null => {
    if (existing?.status === 'signed') return existing
    const trimmedName = name.trim()
    if (!trimmedName) return null
    const base = existing ?? { role, token: generateSaleSignToken(), status: 'pending' as const }
    return {
      ...base,
      name: trimmedName,
      ...(cpf.trim() ? { cpf: cpf.trim() } : {}),
      ...(rg.trim() ? { rg: rg.trim() } : {}),
    }
  }

  const handleSaveEdit = async () => {
    const precoNumber = Number(editPrecoValor.replace(/\D/g, '')) / 100
    if (
      !editVendedor.name || !editVendedor.cpf || !editComprador.name || !editComprador.cpf ||
      !editTerrenoEndereco || !editTerrenoDescricao || !precoNumber || !editFormaPagamento || !editForo || !editCidade
    ) {
      toast({ title: t('toast.validationError'), variant: 'destructive' })
      return
    }

    setSavingEdit(true)
    try {
      const finalVendedor = vendedorSigner?.status === 'signed' ? contract.vendedor : editVendedor
      const finalComprador = compradorSigner?.status === 'signed' ? contract.comprador : editComprador

      const updatedVendedorSigner = vendedorSigner?.status === 'signed'
        ? vendedorSigner
        : { ...vendedorSigner!, name: finalVendedor.name, ...(finalVendedor.cpf ? { cpf: finalVendedor.cpf } : {}), ...(finalVendedor.rg ? { rg: finalVendedor.rg } : {}) }
      const updatedCompradorSigner = compradorSigner?.status === 'signed'
        ? compradorSigner
        : { ...compradorSigner!, name: finalComprador.name, ...(finalComprador.cpf ? { cpf: finalComprador.cpf } : {}), ...(finalComprador.rg ? { rg: finalComprador.rg } : {}) }
      const t1 = reconcileWitness('testemunha1', testemunha1Signer, editTestemunha1Nome, editTestemunha1Cpf, editTestemunha1Rg)
      const t2 = reconcileWitness('testemunha2', testemunha2Signer, editTestemunha2Nome, editTestemunha2Cpf, editTestemunha2Rg)
      const newSigners = [updatedVendedorSigner, updatedCompradorSigner, t1, t2].filter((s): s is SaleContractSigner => !!s)

      await updateSaleContract(contract.id, {
        vendedor: finalVendedor,
        comprador: finalComprador,
        terrenoDescricao: editTerrenoDescricao,
        terrenoEndereco: editTerrenoEndereco,
        ...(editTerrenoCoordenadas ? { terrenoCoordenadas: editTerrenoCoordenadas } : {}),
        precoValor: precoNumber,
        precoExtenso: editPrecoExtenso,
        formaPagamento: editFormaPagamento,
        foro: editForo,
        cidade: editCidade,
        signers: newSigners,
      })

      // Remove o link de quem foi tirado da lista de testemunhas
      const removedTokens = contract.signers
        .filter((s) => s.status !== 'signed' && !newSigners.some((ns) => ns.token === s.token))
        .map((s) => s.token)
      await Promise.all(removedTokens.map((token) => deleteSaleSignatureRequest(token)))

      // Cria o link de quem entrou agora, e atualiza o contexto (nomes/objeto/
      // valor) de quem já tinha link mas ainda não assinou.
      const objeto = `Terreno em ${editTerrenoEndereco}`
      const valor = formatCurrency(precoNumber)
      await Promise.all(newSigners.map(async (s) => {
        const isNew = !contract.signers.some((old) => old.token === s.token)
        if (isNew) {
          await createSaleSignatureRequest(s.token, {
            saleContractId: contract.id, contractNumber: contract.contractNumber, role: s.role,
            signerName: s.name, vendedorName: finalVendedor.name, compradorName: finalComprador.name,
            objeto, valor,
            ...(s.cpf ? { cpf: s.cpf } : {}), ...(s.rg ? { rg: s.rg } : {}),
          })
        } else if (s.status !== 'signed') {
          await updateSaleSignatureSnapshot(s.token, {
            signerName: s.name, vendedorName: finalVendedor.name, compradorName: finalComprador.name, objeto, valor,
            ...(s.cpf ? { cpf: s.cpf } : {}), ...(s.rg ? { rg: s.rg } : {}),
          })
        }
      }))

      onRefresh()
      setEditing(false)
      toast({ title: t('toast.updated') })
    } catch {
      toast({ title: t('toast.updateError'), variant: 'destructive' })
    } finally {
      setSavingEdit(false)
    }
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('formExtra.editing', { number: contract.contractNumber })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <PartyFields idPrefix={`edit-vendedor-${contract.id}`} title={t('roles.vendedor')} value={editVendedor} onChange={setEditVendedor} disabled={vendedorSigner?.status === 'signed'} />
          <PartyFields idPrefix={`edit-comprador-${contract.id}`} title={t('roles.comprador')} value={editComprador} onChange={setEditComprador} disabled={compradorSigner?.status === 'signed'} />

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t('formExtra.land')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">{t('formExtra.landAddress')}</Label>
                <Input value={editTerrenoEndereco} onChange={(e) => setEditTerrenoEndereco(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">{t('formExtra.landSituation')}</Label>
                <Input value={editTerrenoDescricao} onChange={(e) => setEditTerrenoDescricao(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">{t('formExtra.coordinatesOptional')}</Label>
                <Input value={editTerrenoCoordenadas} onChange={(e) => setEditTerrenoCoordenadas(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t('formExtra.priceAndPayment')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">{t('formExtra.valueBRL')}</Label>
                <Input
                  inputMode="numeric"
                  value={editPrecoValor}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setEditPrecoValor(digits ? formatCurrency(Number(digits) / 100) : '')
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('formExtra.valueInWords')}</Label>
                <Input value={editPrecoExtenso} onChange={(e) => setEditPrecoExtenso(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">{t('formExtra.paymentMethod')}</Label>
                <Input value={editFormaPagamento} onChange={(e) => setEditFormaPagamento(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t('formExtra.forumAndPlace')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">{t('formExtra.forum')}</Label>
                <Input value={editForo} onChange={(e) => setEditForo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('formExtra.signatureCity')}</Label>
                <Input value={editCidade} onChange={(e) => setEditCidade(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t('formExtra.witnessesOptional')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">
                  1ª Testemunha — nome
                  {testemunha1Signer?.status === 'signed' && <span className="ml-2 text-muted-foreground">{t('formExtra.lockedWitness')}</span>}
                </Label>
                <Input value={editTestemunha1Nome} onChange={(e) => setEditTestemunha1Nome(e.target.value)} disabled={testemunha1Signer?.status === 'signed'} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  2ª Testemunha — nome
                  {testemunha2Signer?.status === 'signed' && <span className="ml-2 text-muted-foreground">{t('formExtra.lockedWitness')}</span>}
                </Label>
                <Input value={editTestemunha2Nome} onChange={(e) => setEditTestemunha2Nome(e.target.value)} disabled={testemunha2Signer?.status === 'signed'} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('roles.testemunha1')} — {t('form.cpf')}</Label>
                <Input value={editTestemunha1Cpf} onChange={(e) => setEditTestemunha1Cpf(maskCPF(e.target.value))} placeholder="000.000.000-00" disabled={testemunha1Signer?.status === 'signed'} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('roles.testemunha2')} — {t('form.cpf')}</Label>
                <Input value={editTestemunha2Cpf} onChange={(e) => setEditTestemunha2Cpf(maskCPF(e.target.value))} placeholder="000.000.000-00" disabled={testemunha2Signer?.status === 'signed'} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('roles.testemunha1')} — {t('form.rg')}</Label>
                <Input value={editTestemunha1Rg} onChange={(e) => setEditTestemunha1Rg(maskRG(e.target.value))} placeholder="00.000.000-0" disabled={testemunha1Signer?.status === 'signed'} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('roles.testemunha2')} — {t('form.rg')}</Label>
                <Input value={editTestemunha2Rg} onChange={(e) => setEditTestemunha2Rg(maskRG(e.target.value))} placeholder="00.000.000-0" disabled={testemunha2Signer?.status === 'signed'} />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('formExtra.saveChanges')}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={savingEdit}>
              <X className="mr-1.5 h-4 w-4" /> {t('formExtra.cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{contract.contractNumber}</CardTitle>
          <Badge variant={contract.status === 'assinado' ? 'success' : contract.status === 'pendente' ? 'warning' : 'secondary'}>
            {t(`statuses.${contract.status === 'assinado' ? 'assinado' : contract.status === 'pendente' ? 'pendente' : 'rascunho'}`)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {contract.vendedor.name} → {contract.comprador.name} · {formatCurrency(contract.precoValor)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {contract.signers.map((s) => (
            <div key={s.token} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{t(`roles.${s.role}`)}</p>
                <p className="text-xs text-muted-foreground truncate">{s.name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.status === 'signed' ? (
                  <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="h-3.5 w-3.5" /> {t('formExtra.signed')}</span>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-yellow-600 text-xs font-medium"><Clock className="h-3.5 w-3.5" /> {t('signatures.pending')}</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyLink(s.token)}>
                      {copiedToken === s.token ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />} {t('formExtra.link')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />} {t('formExtra.updateStatus')}
          </Button>
          {contract.status !== 'assinado' && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t('edit')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing}>
            {previewing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />} {t('preview')}
          </Button>
          <Button size="sm" onClick={handleGeneratePdf} disabled={!allSigned || generating}>
            {generating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />} {t('formExtra.generateFinalPdf')}
          </Button>
          {contract.signedPdfUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={contract.signedPdfUrl} target="_blank" rel="noopener noreferrer">
                <Download className="mr-1.5 h-3.5 w-3.5" /> {t('formExtra.viewPdf')}
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function SaleContractsPage() {
  const { t } = useTranslation('saleContracts')
  const qc = useQueryClient()
  const { data: contracts = [], isLoading } = useQuery({ queryKey: ['saleContracts'], queryFn: getSaleContracts })

  const [vendedor, setVendedor] = useState<SaleContractParty>(emptyParty)
  const [comprador, setComprador] = useState<SaleContractParty>(emptyParty)
  const [terrenoDescricao, setTerrenoDescricao] = useState('')
  const [terrenoEndereco, setTerrenoEndereco] = useState('')
  const [terrenoCoordenadas, setTerrenoCoordenadas] = useState('')
  const [precoValor, setPrecoValor] = useState('')
  const [precoExtenso, setPrecoExtenso] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [foro, setForo] = useState('')
  const [cidade, setCidade] = useState('')
  const [testemunha1Nome, setTestemunha1Nome] = useState('')
  const [testemunha1Cpf, setTestemunha1Cpf] = useState('')
  const [testemunha1Rg, setTestemunha1Rg] = useState('')
  const [testemunha2Nome, setTestemunha2Nome] = useState('')
  const [testemunha2Cpf, setTestemunha2Cpf] = useState('')
  const [testemunha2Rg, setTestemunha2Rg] = useState('')
  const [creating, setCreating] = useState(false)
  const [previewingForm, setPreviewingForm] = useState(false)

  const resetForm = () => {
    setVendedor(emptyParty)
    setComprador(emptyParty)
    setTerrenoDescricao(''); setTerrenoEndereco(''); setTerrenoCoordenadas('')
    setPrecoValor(''); setPrecoExtenso(''); setFormaPagamento('')
    setForo(''); setCidade('')
    setTestemunha1Nome(''); setTestemunha1Cpf(''); setTestemunha1Rg('')
    setTestemunha2Nome(''); setTestemunha2Cpf(''); setTestemunha2Rg('')
  }

  const buildFormSigners = (): SaleContractSigner[] => {
    const signers: SaleContractSigner[] = [
      { role: 'vendedor', token: 'preview', name: vendedor.name, cpf: vendedor.cpf, rg: vendedor.rg, status: 'pending' },
      { role: 'comprador', token: 'preview', name: comprador.name, cpf: comprador.cpf, rg: comprador.rg, status: 'pending' },
    ]
    if (testemunha1Nome.trim()) signers.push({ role: 'testemunha1', token: 'preview', name: testemunha1Nome.trim(), cpf: testemunha1Cpf, rg: testemunha1Rg, status: 'pending' })
    if (testemunha2Nome.trim()) signers.push({ role: 'testemunha2', token: 'preview', name: testemunha2Nome.trim(), cpf: testemunha2Cpf, rg: testemunha2Rg, status: 'pending' })
    return signers
  }

  const handlePreviewForm = async () => {
    if (!vendedor.name || !comprador.name) {
      toast({ title: t('toastExtra.previewValidation'), variant: 'destructive' })
      return
    }
    const win = openBlankTab()
    setPreviewingForm(true)
    try {
      const precoNumber = Number(precoValor.replace(/\D/g, '')) / 100
      const pdf = await buildSaleContractPdf({
        contractNumber: t('formExtra.previewNumber'),
        vendedor, comprador,
        terrenoDescricao, terrenoEndereco,
        terrenoCoordenadas: terrenoCoordenadas || undefined,
        precoValor: precoNumber, precoExtenso, formaPagamento,
        foro, cidade,
        dataContrato: formatDate(new Date().toISOString(), "dd 'de' MMMM 'de' yyyy"),
        signers: buildFormSigners(),
      })
      const blob = contractPDFToBlob(pdf)
      if (win) win.location.href = URL.createObjectURL(blob)
      else await openOrShareBlob(blob, 'Previa_contrato_terreno.pdf')
    } catch {
      win?.close()
      toast({ title: t('toast.previewError'), variant: 'destructive' })
    } finally {
      setPreviewingForm(false)
    }
  }

  const handleGenerate = async () => {
    const precoNumber = Number(precoValor.replace(/\D/g, '')) / 100
    if (
      !vendedor.name || !vendedor.cpf || !comprador.name || !comprador.cpf ||
      !terrenoEndereco || !terrenoDescricao || !precoNumber || !formaPagamento || !foro || !cidade
    ) {
      toast({ title: t('toast.validationError'), variant: 'destructive' })
      return
    }

    setCreating(true)
    try {
      const contractNumber = generateSaleContractNumber()
      const dataContrato = formatDate(new Date().toISOString(), "dd 'de' MMMM 'de' yyyy")

      const signers: SaleContractSigner[] = [
        { role: 'vendedor', token: generateSaleSignToken(), name: vendedor.name, ...(vendedor.cpf ? { cpf: vendedor.cpf } : {}), ...(vendedor.rg ? { rg: vendedor.rg } : {}), status: 'pending' },
        { role: 'comprador', token: generateSaleSignToken(), name: comprador.name, ...(comprador.cpf ? { cpf: comprador.cpf } : {}), ...(comprador.rg ? { rg: comprador.rg } : {}), status: 'pending' },
      ]
      if (testemunha1Nome.trim()) {
        signers.push({
          role: 'testemunha1', token: generateSaleSignToken(), name: testemunha1Nome.trim(),
          ...(testemunha1Cpf.trim() ? { cpf: testemunha1Cpf.trim() } : {}), ...(testemunha1Rg.trim() ? { rg: testemunha1Rg.trim() } : {}),
          status: 'pending',
        })
      }
      if (testemunha2Nome.trim()) {
        signers.push({
          role: 'testemunha2', token: generateSaleSignToken(), name: testemunha2Nome.trim(),
          ...(testemunha2Cpf.trim() ? { cpf: testemunha2Cpf.trim() } : {}), ...(testemunha2Rg.trim() ? { rg: testemunha2Rg.trim() } : {}),
          status: 'pending',
        })
      }

      const contractData = {
        contractNumber,
        vendedor, comprador,
        terrenoDescricao, terrenoEndereco,
        ...(terrenoCoordenadas ? { terrenoCoordenadas } : {}),
        precoValor: precoNumber, precoExtenso, formaPagamento,
        foro, cidade, dataContrato,
        signers,
        status: 'pendente' as const,
      }

      const id = await createSaleContract(contractData)

      const objeto = `Terreno em ${terrenoEndereco}`
      const valor = formatCurrency(precoNumber)
      await Promise.all(signers.map((s) => createSaleSignatureRequest(s.token, {
        saleContractId: id,
        contractNumber,
        role: s.role,
        signerName: s.name,
        vendedorName: vendedor.name,
        compradorName: comprador.name,
        objeto,
        valor,
        ...(s.cpf ? { cpf: s.cpf } : {}),
        ...(s.rg ? { rg: s.rg } : {}),
      })))

      qc.invalidateQueries({ queryKey: ['saleContracts'] })
      resetForm()
      toast({ title: t('toast.created'), description: t('toastExtra.createdDescription') })
    } catch {
      toast({ title: t('toast.createError'), variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const pendentes = contracts.filter((c) => c.status !== 'assinado')
  const assinados = contracts.filter((c) => c.status === 'assinado')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold"><Landmark className="h-5 w-5" /> {t('landTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('landSubtitle')}</p>
      </div>

      <Tabs defaultValue="pendentes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="novo">{t('newContract')}</TabsTrigger>
          <TabsTrigger value="pendentes" className="gap-1.5">
            {t('tabPending')}
            {pendentes.length > 0 && <Badge variant="secondary" className="px-1.5">{pendentes.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="assinados" className="gap-1.5">
            {t('tabSigned')}
            {assinados.length > 0 && <Badge variant="secondary" className="px-1.5">{assinados.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="novo">
          <Card>
            <CardHeader><CardTitle className="text-base">{t('newContract')}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <PartyFields idPrefix="vendedor" title={t('roles.vendedor')} value={vendedor} onChange={setVendedor} />
          <PartyFields idPrefix="comprador" title={t('roles.comprador')} value={comprador} onChange={setComprador} />

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t('formExtra.land')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="terreno-endereco" className="text-xs">{t('formExtra.landAddress')}</Label>
                <Input id="terreno-endereco" value={terrenoEndereco} onChange={(e) => setTerrenoEndereco(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="terreno-descricao" className="text-xs">Situação (NÃO repita endereço/coordenadas — só fatos adicionais)</Label>
                <Input id="terreno-descricao" value={terrenoDescricao} onChange={(e) => setTerrenoDescricao(e.target.value)} placeholder="Ex: terreno destinado a futuro processo de usucapião pela compradora, onde já há uma casa construída por ela." />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="terreno-coordenadas" className="text-xs">{t('formExtra.coordinatesOptional')}</Label>
                <Input id="terreno-coordenadas" value={terrenoCoordenadas} onChange={(e) => setTerrenoCoordenadas(e.target.value)} placeholder="latitude -12.89, longitude -38.40" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t('formExtra.priceAndPayment')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="preco-valor" className="text-xs">{t('formExtra.valueBRL')}</Label>
                <Input
                  id="preco-valor"
                  inputMode="numeric"
                  value={precoValor}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setPrecoValor(digits ? formatCurrency(Number(digits) / 100) : '')
                  }}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="preco-extenso" className="text-xs">{t('formExtra.valueInWords')}</Label>
                <Input id="preco-extenso" value={precoExtenso} onChange={(e) => setPrecoExtenso(e.target.value)} placeholder="dez mil reais" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="forma-pagamento" className="text-xs">{t('formExtra.paymentMethod')}</Label>
                <Input id="forma-pagamento" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} placeholder="Valor já integralmente pago via transferência PIX." />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t('formExtra.forumAndPlace')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="foro" className="text-xs">{t('formExtra.forum')}</Label>
                <Input id="foro" value={foro} onChange={(e) => setForo(e.target.value)} placeholder="Salvador, Bahia" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cidade" className="text-xs">{t('formExtra.signatureCity')}</Label>
                <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Salvador" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">{t('formExtra.witnessesOptional')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="testemunha1-nome" className="text-xs">{t('roles.testemunha1')} — {t('form.name')}</Label>
                <Input id="testemunha1-nome" value={testemunha1Nome} onChange={(e) => setTestemunha1Nome(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="testemunha2-nome" className="text-xs">{t('roles.testemunha2')} — {t('form.name')}</Label>
                <Input id="testemunha2-nome" value={testemunha2Nome} onChange={(e) => setTestemunha2Nome(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="testemunha1-cpf" className="text-xs">{t('roles.testemunha1')} — {t('form.cpf')}</Label>
                <Input id="testemunha1-cpf" value={testemunha1Cpf} onChange={(e) => setTestemunha1Cpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="testemunha2-cpf" className="text-xs">{t('roles.testemunha2')} — {t('form.cpf')}</Label>
                <Input id="testemunha2-cpf" value={testemunha2Cpf} onChange={(e) => setTestemunha2Cpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="testemunha1-rg" className="text-xs">{t('roles.testemunha1')} — {t('form.rg')}</Label>
                <Input id="testemunha1-rg" value={testemunha1Rg} onChange={(e) => setTestemunha1Rg(maskRG(e.target.value))} placeholder="00.000.000-0" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="testemunha2-rg" className="text-xs">{t('roles.testemunha2')} — {t('form.rg')}</Label>
                <Input id="testemunha2-rg" value={testemunha2Rg} onChange={(e) => setTestemunha2Rg(maskRG(e.target.value))} placeholder="00.000.000-0" />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('formExtra.witnessDocsHint')}
          </p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreviewForm} disabled={previewingForm}>
              {previewingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {t('preview')}
            </Button>
            <Button onClick={handleGenerate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('generateContract')}
            </Button>
          </div>
          </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendentes" className="space-y-3">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : pendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('emptyPending')}</p>
          ) : (
            pendentes.map((c) => (
              <SaleContractCard key={c.id} contract={c} onRefresh={() => qc.invalidateQueries({ queryKey: ['saleContracts'] })} />
            ))
          )}
        </TabsContent>

        <TabsContent value="assinados" className="space-y-3">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : assinados.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('emptySigned')}</p>
          ) : (
            assinados.map((c) => (
              <SaleContractCard key={c.id} contract={c} onRefresh={() => qc.invalidateQueries({ queryKey: ['saleContracts'] })} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
