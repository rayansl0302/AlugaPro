import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Copy, Check, Loader2, FileText, CheckCircle, Clock, RefreshCw, Download, Landmark,
} from 'lucide-react'
import {
  getSaleContracts, createSaleContract, updateSaleContract,
  generateSaleSignToken, createSaleSignatureRequest, getSaleSignatureRequest,
} from '@/services/saleContracts'
import { uploadSaleContractPDF } from '@/services/storage'
import { buildTerrenoBlocks } from '@/lib/contractTemplates/terreno'
import { generateSaleContractPDF, contractPDFToBlob, PDFWitness } from '@/lib/contractPDF'
import { SaleContract, SaleContractParty, SaleContractSigner, SaleContractSignerRole } from '@/types'
import { generateSaleContractNumber, formatCurrency, formatDate, maskCPF } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

const ROLE_LABELS: Record<SaleContractSignerRole, string> = {
  vendedor: 'Vendedor',
  comprador: 'Comprador(a)',
  testemunha1: '1ª Testemunha',
  testemunha2: '2ª Testemunha',
}

function PartyFields({ idPrefix, title, value, onChange }: {
  idPrefix: string
  title: string
  value: SaleContractParty
  onChange: (v: SaleContractParty) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-name`} className="text-xs">Nome completo</Label>
          <Input id={`${idPrefix}-name`} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-nationality`} className="text-xs">Nacionalidade</Label>
          <Input id={`${idPrefix}-nationality`} value={value.nationality} onChange={(e) => onChange({ ...value, nationality: e.target.value })} placeholder="brasileiro(a)" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-marital`} className="text-xs">Estado civil</Label>
          <Input id={`${idPrefix}-marital`} value={value.maritalStatus} onChange={(e) => onChange({ ...value, maritalStatus: e.target.value })} placeholder="solteiro(a)" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-cpf`} className="text-xs">CPF</Label>
          <Input id={`${idPrefix}-cpf`} value={value.cpf} onChange={(e) => onChange({ ...value, cpf: maskCPF(e.target.value) })} placeholder="000.000.000-00" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-rg`} className="text-xs">RG</Label>
          <Input id={`${idPrefix}-rg`} value={value.rg} onChange={(e) => onChange({ ...value, rg: e.target.value })} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-address`} className="text-xs">Endereço completo</Label>
          <Input id={`${idPrefix}-address`} value={value.address} onChange={(e) => onChange({ ...value, address: e.target.value })} />
        </div>
      </div>
    </div>
  )
}

function SaleContractCard({ contract, onRefresh }: { contract: SaleContract; onRefresh: () => void }) {
  const [refreshing, setRefreshing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const signLink = (token: string) => `${window.location.origin}/assinar-venda/${token}`

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(signLink(token))
      setCopiedToken(token)
      toast({ title: 'Link copiado.' })
      setTimeout(() => setCopiedToken((t) => (t === token ? null : t)), 2000)
    } catch {
      toast({ title: 'Não foi possível copiar o link.', variant: 'destructive' })
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const updated = await Promise.all(contract.signers.map(async (s) => {
        if (s.status === 'signed') return s
        const req = await getSaleSignatureRequest(s.token)
        if (req?.status === 'signed') {
          return {
            ...s,
            signature: req.signature, cpf: req.cpf, rg: req.rg,
            documentFrontUrl: req.documentFrontUrl, documentBackUrl: req.documentBackUrl, documentSelfieUrl: req.documentSelfieUrl,
            status: 'signed' as const, signedAt: req.signedAt,
          }
        }
        return s
      }))
      await updateSaleContract(contract.id, { signers: updated })
      onRefresh()
      toast({ title: 'Status atualizado.' })
    } catch {
      toast({ title: 'Erro ao atualizar status.', variant: 'destructive' })
    } finally {
      setRefreshing(false)
    }
  }

  const requiredSigners = contract.signers.filter((s) => s.role === 'vendedor' || s.role === 'comprador' || s.token)
  const allSigned = requiredSigners.length > 0 && requiredSigners.every((s) => s.status === 'signed')

  const handleGeneratePdf = async () => {
    setGenerating(true)
    try {
      const vendedorSigner = contract.signers.find((s) => s.role === 'vendedor')
      const compradorSigner = contract.signers.find((s) => s.role === 'comprador')
      const t1 = contract.signers.find((s) => s.role === 'testemunha1')
      const t2 = contract.signers.find((s) => s.role === 'testemunha2')

      const blocks = buildTerrenoBlocks({
        contractNumber: contract.contractNumber,
        vendedor: contract.vendedor,
        comprador: contract.comprador,
        terrenoDescricao: contract.terrenoDescricao,
        terrenoEndereco: contract.terrenoEndereco,
        terrenoCoordenadas: contract.terrenoCoordenadas,
        precoValor: contract.precoValor,
        precoExtenso: contract.precoExtenso,
        formaPagamento: contract.formaPagamento,
        foro: contract.foro,
        cidade: contract.cidade,
        dataContrato: contract.dataContrato,
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

      const pdf = generateSaleContractPDF({
        blocks,
        contractNumber: contract.contractNumber,
        vendedor: await toPdfWitness(contract.vendedor.name, vendedorSigner),
        comprador: await toPdfWitness(contract.comprador.name, compradorSigner),
        testemunha1: t1 ? await toPdfWitness(t1.name, t1) : undefined,
        testemunha2: t2 ? await toPdfWitness(t2.name, t2) : undefined,
      })

      const blob = contractPDFToBlob(pdf)
      const url = await uploadSaleContractPDF(contract.id, blob, contract.contractNumber)
      await updateSaleContract(contract.id, { signedPdfUrl: url, status: 'assinado' })
      onRefresh()
      toast({ title: 'PDF final gerado!' })
    } catch {
      toast({ title: 'Erro ao gerar o PDF final.', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{contract.contractNumber}</CardTitle>
          <Badge variant={contract.status === 'assinado' ? 'success' : contract.status === 'pendente' ? 'warning' : 'secondary'}>
            {contract.status === 'assinado' ? 'Assinado' : contract.status === 'pendente' ? 'Pendente' : 'Rascunho'}
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
                <p className="font-medium truncate">{ROLE_LABELS[s.role]}</p>
                <p className="text-xs text-muted-foreground truncate">{s.name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.status === 'signed' ? (
                  <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="h-3.5 w-3.5" /> Assinou</span>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-yellow-600 text-xs font-medium"><Clock className="h-3.5 w-3.5" /> Pendente</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyLink(s.token)}>
                      {copiedToken === s.token ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />} Link
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />} Atualizar status
          </Button>
          <Button size="sm" onClick={handleGeneratePdf} disabled={!allSigned || generating}>
            {generating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />} Gerar PDF final
          </Button>
          {contract.signedPdfUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={contract.signedPdfUrl} target="_blank" rel="noopener noreferrer">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Ver PDF
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function SaleContractsPage() {
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
  const [testemunha2Nome, setTestemunha2Nome] = useState('')
  const [creating, setCreating] = useState(false)

  const resetForm = () => {
    setVendedor(emptyParty)
    setComprador(emptyParty)
    setTerrenoDescricao(''); setTerrenoEndereco(''); setTerrenoCoordenadas('')
    setPrecoValor(''); setPrecoExtenso(''); setFormaPagamento('')
    setForo(''); setCidade('')
    setTestemunha1Nome(''); setTestemunha2Nome('')
  }

  const handleGenerate = async () => {
    const precoNumber = Number(precoValor.replace(/\D/g, '')) / 100
    if (
      !vendedor.name || !vendedor.cpf || !comprador.name || !comprador.cpf ||
      !terrenoEndereco || !terrenoDescricao || !precoNumber || !formaPagamento || !foro || !cidade
    ) {
      toast({ title: 'Preencha os dados obrigatórios de vendedor, comprador, terreno, preço, foro e cidade.', variant: 'destructive' })
      return
    }

    setCreating(true)
    try {
      const contractNumber = generateSaleContractNumber()
      const dataContrato = formatDate(new Date().toISOString(), "dd 'de' MMMM 'de' yyyy")

      const signers: SaleContractSigner[] = [
        { role: 'vendedor', token: generateSaleSignToken(), name: vendedor.name, status: 'pending' },
        { role: 'comprador', token: generateSaleSignToken(), name: comprador.name, status: 'pending' },
      ]
      if (testemunha1Nome.trim()) signers.push({ role: 'testemunha1', token: generateSaleSignToken(), name: testemunha1Nome.trim(), status: 'pending' })
      if (testemunha2Nome.trim()) signers.push({ role: 'testemunha2', token: generateSaleSignToken(), name: testemunha2Nome.trim(), status: 'pending' })

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
      })))

      qc.invalidateQueries({ queryKey: ['saleContracts'] })
      resetForm()
      toast({ title: 'Contrato gerado!', description: 'Copie os links na lista abaixo e envie pra cada parte assinar.' })
    } catch {
      toast({ title: 'Erro ao gerar o contrato.', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold"><Landmark className="h-5 w-5" /> Contratos de Terreno</h1>
        <p className="text-sm text-muted-foreground">Gere contratos de compra e venda de terreno com assinatura remota por link individual.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Novo contrato</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <PartyFields idPrefix="vendedor" title="Vendedor" value={vendedor} onChange={setVendedor} />
          <PartyFields idPrefix="comprador" title="Comprador(a)" value={comprador} onChange={setComprador} />

          <div className="space-y-3">
            <p className="text-sm font-semibold">Terreno</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="terreno-endereco" className="text-xs">Endereço do terreno</Label>
                <Input id="terreno-endereco" value={terrenoEndereco} onChange={(e) => setTerrenoEndereco(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="terreno-descricao" className="text-xs">Descrição (situação, finalidade, observações)</Label>
                <Input id="terreno-descricao" value={terrenoDescricao} onChange={(e) => setTerrenoDescricao(e.target.value)} placeholder="Ex: terreno destinado a futuro processo de usucapião pela compradora." />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="terreno-coordenadas" className="text-xs">Coordenadas (opcional)</Label>
                <Input id="terreno-coordenadas" value={terrenoCoordenadas} onChange={(e) => setTerrenoCoordenadas(e.target.value)} placeholder="latitude -12.89, longitude -38.40" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Preço e pagamento</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="preco-valor" className="text-xs">Valor (R$)</Label>
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
                <Label htmlFor="preco-extenso" className="text-xs">Valor por extenso</Label>
                <Input id="preco-extenso" value={precoExtenso} onChange={(e) => setPrecoExtenso(e.target.value)} placeholder="dez mil reais" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="forma-pagamento" className="text-xs">Forma de pagamento</Label>
                <Input id="forma-pagamento" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} placeholder="Valor já integralmente pago via transferência PIX." />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Foro e local</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="foro" className="text-xs">Comarca (foro)</Label>
                <Input id="foro" value={foro} onChange={(e) => setForo(e.target.value)} placeholder="Salvador, Bahia" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cidade" className="text-xs">Cidade da assinatura</Label>
                <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Salvador" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Testemunhas (opcional)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="testemunha1-nome" className="text-xs">1ª Testemunha — nome</Label>
                <Input id="testemunha1-nome" value={testemunha1Nome} onChange={(e) => setTestemunha1Nome(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="testemunha2-nome" className="text-xs">2ª Testemunha — nome</Label>
                <Input id="testemunha2-nome" value={testemunha2Nome} onChange={(e) => setTestemunha2Nome(e.target.value)} />
              </div>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar contrato
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Contratos gerados</h2>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum contrato gerado ainda.</p>
        ) : (
          contracts.map((c) => (
            <SaleContractCard key={c.id} contract={c} onRefresh={() => qc.invalidateQueries({ queryKey: ['saleContracts'] })} />
          ))
        )}
      </div>
    </div>
  )
}
