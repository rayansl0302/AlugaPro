import { ContractAssetType, ContractTemplateClause, ImovelSigningData, VeiculoSigningData } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { buildImovelBlocks, ContractBlock } from './imovel'
import { buildVeiculoBlocks } from './veiculo'

// ── Sentinelas para valores numéricos calculados dentro dos templates ─────────
// São substituídos por variáveis {{...}} ao derivar o modelo padrão editável.
const RENT_SENTINEL = 1234567.89
const CAUTION_SENTINEL = 7654321.98
const LATEFEE_SENTINEL = 73
const MI_SENTINEL = 89
const DUEDAY_SENTINEL = 99

const T = (k: string) => `{{${k}}}`

function tokenParty(prefix: string) {
  return {
    name: T(`${prefix}.name`),
    nationality: T(`${prefix}.nationality`),
    maritalStatus: T(`${prefix}.maritalStatus`),
    profession: T(`${prefix}.profession`),
    cpf: T(`${prefix}.cpf`),
    rg: T(`${prefix}.rg`),
    address: T(`${prefix}.address`),
    phone: T(`${prefix}.phone`),
    email: T(`${prefix}.email`),
  }
}

function replaceAll(text: string, from: string, to: string): string {
  return text.split(from).join(to)
}

// Substitui os valores calculados (moeda/percentual/dia) por variáveis.
function detokenizeComputed(text: string): string {
  let out = text
  out = replaceAll(out, formatCurrency(RENT_SENTINEL), '{{valorAluguel}}')
  out = replaceAll(out, formatCurrency(CAUTION_SENTINEL), '{{caucao}}')
  out = replaceAll(out, `${MI_SENTINEL}% ao mês`, '{{juros}}')
  out = replaceAll(out, `${LATEFEE_SENTINEL}%`, '{{multa}}')
  out = replaceAll(out, `o dia ${DUEDAY_SENTINEL} de`, 'o dia {{diaVencimento}} de')
  return out
}

// Agrupa os blocos gerados em cláusulas editáveis (título + itens).
function blocksToClauses(blocks: ContractBlock[]): ContractTemplateClause[] {
  const clauses: ContractTemplateClause[] = []
  let current: ContractTemplateClause | null = null
  let idx = 0

  for (const b of blocks) {
    if (b.type === 'clause') {
      current = { id: `c${idx++}`, title: b.text ?? '', items: [] }
      clauses.push(current)
    } else if (b.type === 'subclause' && current) {
      current.items.push(detokenizeComputed(b.text ?? ''))
    }
  }

  return clauses
}

const tokenImovelData: ImovelSigningData = {
  locador: tokenParty('locador'),
  locatario: tokenParty('locatario'),
  fiador: { ...tokenParty('fiador'), patrimonioDescricao: T('fiador.patrimonio') },
  imovel: {
    endereco: T('imovel.endereco'),
    tipo: T('imovel.tipo'),
    areaConstruida: T('imovel.areaConstruida'),
    areaTotal: T('imovel.areaTotal'),
    matricula: T('imovel.matricula'),
    cartorio: T('imovel.cartorio'),
    comodos: T('imovel.comodos'),
    vagas: T('imovel.vagas'),
    mobilia: T('imovel.mobilia'),
  },
  financeiro: {
    valorExtenso: T('financeiro.valorExtenso'),
    pixKey: T('financeiro.pixKey'),
    banco: T('financeiro.banco'),
    agencia: T('financeiro.agencia'),
    conta: T('financeiro.conta'),
  },
  prazo: {
    inicioFormatado: T('prazo.inicio'),
    terminoFormatado: T('prazo.termino'),
    prazoExtenso: T('prazo.extenso'),
  },
  indiceReajuste: T('indiceReajuste'),
  testemunha1: { name: T('test1.name'), cpf: T('test1.cpf'), rg: T('test1.rg') },
  testemunha2: { name: T('test2.name'), cpf: T('test2.cpf'), rg: T('test2.rg') },
  foro: T('foro'),
  cidade: T('cidade'),
  dataContrato: T('dataContrato'),
}

const tokenImovelCtx = {
  contractNumber: T('contractNumber'),
  rentValue: RENT_SENTINEL,
  dueDay: DUEDAY_SENTINEL,
  cautionValue: CAUTION_SENTINEL,
  lateFee: LATEFEE_SENTINEL,
  monthlyInterest: MI_SENTINEL,
  startDate: '2020-01-01',
  endDate: '2021-01-01',
}

const tokenVeiculoData: VeiculoSigningData = {
  locador: tokenParty('locador'),
  locatario: {
    ...tokenParty('locatario'),
    cnh: T('locatario.cnh'),
    cnhCategoria: T('locatario.cnhCategoria'),
    cnhValidade: T('locatario.cnhValidade'),
  },
  condutoresAdicionais: [],
  veiculo: {
    marca: T('veiculo.marca'),
    modelo: T('veiculo.modelo'),
    ano: T('veiculo.ano'),
    cor: T('veiculo.cor'),
    placa: T('veiculo.placa'),
    renavam: T('veiculo.renavam'),
    chassi: T('veiculo.chassi'),
    kmInicial: T('veiculo.kmInicial'),
    estadoGeral: T('veiculo.estadoGeral'),
  },
  financeiro: {
    valorDiario: T('financeiro.valorDiario'),
    valorSemanal: T('financeiro.valorSemanal'),
    valorMensal: T('financeiro.valorMensal'),
    caucaoValor: T('financeiro.caucaoValor'),
    pixKey: T('financeiro.pixKey'),
    banco: T('financeiro.banco'),
  },
  prazo: {
    dataRetiradaFormatada: T('prazo.dataRetirada'),
    dataDevolucaoFormatada: T('prazo.dataDevolucao'),
    horarioRetirada: T('prazo.horarioRetirada'),
    horarioDevolucao: T('prazo.horarioDevolucao'),
  },
  testemunha1: { name: T('test1.name'), cpf: T('test1.cpf'), rg: T('test1.rg') },
  testemunha2: { name: T('test2.name'), cpf: T('test2.cpf'), rg: T('test2.rg') },
  foro: T('foro'),
  cidade: T('cidade'),
  dataContrato: T('dataContrato'),
}

const tokenVeiculoCtx = {
  contractNumber: T('contractNumber'),
  rentValue: RENT_SENTINEL,
  cautionValue: CAUTION_SENTINEL,
  lateFee: LATEFEE_SENTINEL,
  monthlyInterest: MI_SENTINEL,
}

let imovelDefaults: ContractTemplateClause[] | null = null
let veiculoDefaults: ContractTemplateClause[] | null = null

// Cláusulas padrão do sistema, derivadas das funções oficiais de geração.
export function getDefaultClauses(assetType: ContractAssetType): ContractTemplateClause[] {
  if (assetType === 'veiculo') {
    if (!veiculoDefaults) veiculoDefaults = blocksToClauses(buildVeiculoBlocks(tokenVeiculoData, tokenVeiculoCtx))
    return cloneClauses(veiculoDefaults)
  }
  if (!imovelDefaults) imovelDefaults = blocksToClauses(buildImovelBlocks(tokenImovelData, tokenImovelCtx))
  return cloneClauses(imovelDefaults)
}

export function cloneClauses(clauses: ContractTemplateClause[]): ContractTemplateClause[] {
  return clauses.map((c, i) => ({ id: `c${i}`, title: c.title, items: [...c.items] }))
}

export interface ImovelCtx {
  contractNumber: string
  rentValue: number
  dueDay: number
  cautionValue?: number
  lateFee: number
  monthlyInterest: number
  startDate: string
  endDate?: string
}

export interface VeiculoCtx {
  contractNumber: string
  rentValue: number
  cautionValue?: number
  lateFee: number
  monthlyInterest: number
}

function resolveImovelVars(d: ImovelSigningData, ctx: ImovelCtx): Record<string, string> {
  const party = (p: ImovelSigningData['locador'], prefix: string): Record<string, string> => ({
    [`${prefix}.name`]: p.name,
    [`${prefix}.nationality`]: p.nationality,
    [`${prefix}.maritalStatus`]: p.maritalStatus,
    [`${prefix}.profession`]: p.profession,
    [`${prefix}.cpf`]: p.cpf,
    [`${prefix}.rg`]: p.rg,
    [`${prefix}.address`]: p.address,
    [`${prefix}.phone`]: p.phone,
    [`${prefix}.email`]: p.email,
  })
  return {
    ...party(d.locador, 'locador'),
    ...party(d.locatario, 'locatario'),
    'imovel.endereco': d.imovel.endereco,
    'imovel.tipo': d.imovel.tipo,
    'imovel.areaConstruida': d.imovel.areaConstruida,
    'imovel.areaTotal': d.imovel.areaTotal,
    'imovel.matricula': d.imovel.matricula,
    'imovel.cartorio': d.imovel.cartorio,
    'imovel.comodos': d.imovel.comodos,
    'imovel.vagas': d.imovel.vagas,
    'imovel.mobilia': d.imovel.mobilia,
    'financeiro.valorExtenso': d.financeiro.valorExtenso,
    'financeiro.pixKey': d.financeiro.pixKey ?? '',
    'financeiro.banco': d.financeiro.banco ?? '',
    'financeiro.agencia': d.financeiro.agencia ?? '',
    'financeiro.conta': d.financeiro.conta ?? '',
    'prazo.inicio': d.prazo.inicioFormatado,
    'prazo.termino': d.prazo.terminoFormatado,
    'prazo.extenso': d.prazo.prazoExtenso,
    indiceReajuste: d.indiceReajuste,
    foro: d.foro,
    cidade: d.cidade,
    dataContrato: d.dataContrato,
    contractNumber: ctx.contractNumber,
    valorAluguel: formatCurrency(ctx.rentValue),
    caucao: ctx.cautionValue ? formatCurrency(ctx.cautionValue) : '',
    multa: `${ctx.lateFee}%`,
    juros: `${ctx.monthlyInterest}% ao mês`,
    diaVencimento: String(ctx.dueDay),
  }
}

function resolveVeiculoVars(d: VeiculoSigningData, ctx: VeiculoCtx): Record<string, string> {
  return {
    'locador.name': d.locador.name,
    'locatario.name': d.locatario.name,
    'locatario.cnh': d.locatario.cnh,
    'locatario.cnhCategoria': d.locatario.cnhCategoria,
    'locatario.cnhValidade': d.locatario.cnhValidade,
    'veiculo.marca': d.veiculo.marca,
    'veiculo.modelo': d.veiculo.modelo,
    'veiculo.ano': d.veiculo.ano,
    'veiculo.cor': d.veiculo.cor,
    'veiculo.placa': d.veiculo.placa,
    'veiculo.renavam': d.veiculo.renavam,
    'veiculo.chassi': d.veiculo.chassi,
    'veiculo.kmInicial': d.veiculo.kmInicial,
    'veiculo.estadoGeral': d.veiculo.estadoGeral,
    'financeiro.valorDiario': d.financeiro.valorDiario ?? '',
    'financeiro.valorSemanal': d.financeiro.valorSemanal ?? '',
    'financeiro.valorMensal': d.financeiro.valorMensal ?? formatCurrency(ctx.rentValue),
    'financeiro.caucaoValor': d.financeiro.caucaoValor ?? (ctx.cautionValue ? formatCurrency(ctx.cautionValue) : ''),
    'financeiro.pixKey': d.financeiro.pixKey ?? '',
    'financeiro.banco': d.financeiro.banco ?? '',
    'prazo.dataRetirada': d.prazo.dataRetiradaFormatada,
    'prazo.dataDevolucao': d.prazo.dataDevolucaoFormatada,
    'prazo.horarioRetirada': d.prazo.horarioRetirada,
    'prazo.horarioDevolucao': d.prazo.horarioDevolucao,
    foro: d.foro,
    cidade: d.cidade,
    dataContrato: d.dataContrato,
    contractNumber: ctx.contractNumber,
    multa: `${ctx.lateFee}%`,
    juros: `${ctx.monthlyInterest}% ao mês`,
  }
}

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k: string) => vars[k] ?? '')
}

function renderClauses(clauses: ContractTemplateClause[], vars: Record<string, string>): ContractBlock[] {
  const blocks: ContractBlock[] = []
  clauses.forEach((c, i) => {
    const n = i + 1
    blocks.push({ type: 'clause', number: `CLÁUSULA ${n}ª`, text: interpolate(c.title, vars) })
    let m = 0
    c.items.forEach((item) => {
      const text = interpolate(item, vars).trim()
      if (!text) return
      m += 1
      blocks.push({ type: 'subclause', number: `${n}.${m}`, text })
    })
    blocks.push({ type: 'spacer' })
  })
  return blocks
}

// Gera os blocos do contrato usando cláusulas personalizadas, reaproveitando o
// preâmbulo e o fecho reais produzidos pela função oficial de geração.
export function renderCustomImovel(
  clauses: ContractTemplateClause[],
  d: ImovelSigningData,
  ctx: ImovelCtx
): ContractBlock[] {
  const full = buildImovelBlocks(d, ctx)
  return composeWithCustomClauses(full, renderClauses(clauses, resolveImovelVars(d, ctx)))
}

export function renderCustomVeiculo(
  clauses: ContractTemplateClause[],
  d: VeiculoSigningData,
  ctx: VeiculoCtx
): ContractBlock[] {
  const full = buildVeiculoBlocks(d, ctx)
  return composeWithCustomClauses(full, renderClauses(clauses, resolveVeiculoVars(d, ctx)))
}

function composeWithCustomClauses(full: ContractBlock[], clauseBlocks: ContractBlock[]): ContractBlock[] {
  const firstClauseIdx = full.findIndex((b) => b.type === 'clause')
  const preamble = firstClauseIdx >= 0 ? full.slice(0, firstClauseIdx) : full
  const last = full[full.length - 1]
  const closing: ContractBlock[] = last && last.type === 'paragraph' ? [{ type: 'spacer' }, last] : []
  return [...preamble, ...clauseBlocks, ...closing]
}
