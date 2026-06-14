import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Contract, ImovelSigningData, VeiculoSigningData } from '@/types'
import { buildImovelBlocks } from './contractTemplates/imovel'
import { buildVeiculoBlocks } from './contractTemplates/veiculo'
import { renderCustomImovel, renderCustomVeiculo } from './contractTemplates/engine'
import { generateContractPDF, PDFWitness } from './contractPDF'

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function photosToBase64(urls?: string[]): Promise<string[]> {
  if (!urls?.length) return []
  const out = await Promise.all(
    urls.map(async (u) => {
      if (!u) return ''
      if (u.startsWith('data:')) return u
      try {
        return await urlToBase64(u)
      } catch {
        return ''
      }
    })
  )
  return out.filter(Boolean)
}

export async function generateSignedContractPDF(contract: Contract) {
  if (!contract.signingData) throw new Error('Contrato sem dados de assinatura')
  const isVeiculo = contract.assetType === 'veiculo'

  const customClauses = contract.templateClauses
  const blocks = isVeiculo
    ? (() => {
        const ctx = {
          contractNumber: contract.contractNumber,
          rentValue: contract.rentValue,
          cautionValue: contract.cautionValue,
          lateFee: contract.lateFee,
          monthlyInterest: contract.monthlyInterest,
        }
        const data = contract.signingData as VeiculoSigningData
        return customClauses?.length
          ? renderCustomVeiculo(customClauses, data, ctx)
          : buildVeiculoBlocks(data, ctx)
      })()
    : (() => {
        const ctx = {
          contractNumber: contract.contractNumber,
          rentValue: contract.rentValue,
          dueDay: contract.dueDay,
          cautionValue: contract.cautionValue,
          lateFee: contract.lateFee,
          monthlyInterest: contract.monthlyInterest,
          startDate: contract.startDate,
          endDate: contract.endDate,
        }
        const data = contract.signingData as ImovelSigningData
        return customClauses?.length
          ? renderCustomImovel(customClauses, data, ctx)
          : buildImovelBlocks(data, ctx)
      })()

  const [docsLocador, docsLocatario] = await Promise.all([
    photosToBase64(contract.docsLocador),
    photosToBase64(contract.docsLocatario),
  ])

  const witnesses = contract.witnesses ?? []
  const toPDFWitness = (i: number): PDFWitness | undefined => {
    const w = witnesses[i]
    if (!w) return undefined
    return { name: w.name, cpf: w.cpf, rg: w.rg, signature: w.signature }
  }

  return generateContractPDF({
    blocks,
    contractNumber: contract.contractNumber,
    locadorName: contract.signingData.locador.name,
    locatarioName: contract.signingData.locatario.name,
    signatureLocador: contract.signatureLocador,
    signatureLocatario: contract.signatureLocatario,
    docsLocador,
    docsLocatario,
    testemunha1: toPDFWitness(0),
    testemunha2: toPDFWitness(1),
    dataAssinatura: format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
  })
}
