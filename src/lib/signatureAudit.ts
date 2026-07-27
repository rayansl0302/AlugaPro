import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Trilha de auditoria de assinatura: IP público + dispositivo de quem assina,
// e hash SHA-256 do PDF final. Usado nos fluxos de assinatura de contratos de
// locação (ContractSignFlow, WitnessSignPage) e de venda de terreno
// (SaleSignPage, SaleContractsPage).

export interface SignatureAuditInfo {
  ip?: string
  userAgent: string
}

// Consulta um serviço público (sem servidor próprio) pra descobrir o IP de
// quem está assinando. Nunca lança erro — se falhar (offline, bloqueado,
// timeout), a assinatura segue sem o IP em vez de travar o usuário.
export async function getSignatureAuditInfo(): Promise<SignatureAuditInfo> {
  const userAgent = navigator.userAgent
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return { userAgent }
    const data = (await res.json()) as { ip?: string }
    return { ip: data.ip, userAgent }
  } catch {
    return { userAgent }
  }
}

// Hash SHA-256 do PDF final já gerado (com QR Code embutido), calculado a
// partir dos bytes reais do arquivo via Web Crypto — não depende de biblioteca
// externa. Retorna string hex minúscula (64 caracteres).
export async function hashBlobSHA256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Formata um timestamp ISO (como os gravados em signedAt/signatureLocadorAt
// etc.) no padrão brasileiro "dd/MM/yyyy às HH:mm" — usado tanto no PDF
// (sempre em português, independente do idioma do painel) quanto nas telas
// administrativas que exibem a trilha de auditoria da assinatura.
export function formatSignedAtPtBR(iso?: string): string | undefined {
  if (!iso) return undefined
  try {
    return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return undefined
  }
}
