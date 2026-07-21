import { useState } from 'react'
import { Contract } from '@/types'
import { generateSignedContractPDF } from '@/lib/regenerateContractPDF'
import { contractPDFToBlob, downloadContractPDF } from '@/lib/contractPDF'
import { openOrShareBlob } from '@/lib/nativeFile'
import { toast } from '@/hooks/useToast'

export function useTenantContractActions() {
  const [loadingContractId, setLoadingContractId] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<'view' | 'download' | null>(null)

  const viewContract = async (contract: Contract) => {
    // Contrato importado: abre o PDF original anexado, sem gerar nada.
    if (contract.isImported && contract.externalPdfUrl) {
      window.open(contract.externalPdfUrl, '_blank')
      return
    }
    if (contract.signingData) {
      setLoadingContractId(contract.id)
      setLoadingAction('view')
      try {
        const doc = await generateSignedContractPDF(contract)
        await openOrShareBlob(contractPDFToBlob(doc), `Contrato_${contract.contractNumber}.pdf`)
      } catch {
        toast({ title: 'Erro ao gerar o contrato.', variant: 'destructive' })
      } finally {
        setLoadingContractId(null)
        setLoadingAction(null)
      }
      return
    }
    if (contract.signedPdfUrl) {
      window.open(contract.signedPdfUrl, '_blank')
      return
    }
    toast({ title: 'Contrato ainda não disponível para visualização.' })
  }

  const downloadContract = async (contract: Contract) => {
    // Contrato importado: o "download" abre o PDF original anexado.
    if (contract.isImported && contract.externalPdfUrl) {
      window.open(contract.externalPdfUrl, '_blank')
      return
    }
    if (contract.signingData) {
      setLoadingContractId(contract.id)
      setLoadingAction('download')
      try {
        const doc = await generateSignedContractPDF(contract)
        await downloadContractPDF(doc, `Contrato_${contract.contractNumber}.pdf`)
      } catch {
        toast({ title: 'Erro ao baixar o contrato.', variant: 'destructive' })
      } finally {
        setLoadingContractId(null)
        setLoadingAction(null)
      }
      return
    }
    if (contract.signedPdfUrl) {
      window.open(contract.signedPdfUrl, '_blank')
      return
    }
    toast({ title: 'Contrato ainda não disponível.' })
  }

  const isContractLoading = (contractId: string, action: 'view' | 'download') =>
    loadingContractId === contractId && loadingAction === action

  return { viewContract, downloadContract, isContractLoading }
}
