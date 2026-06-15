import { Timestamp } from 'firebase/firestore'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'gestor' | 'proprietario' | 'inquilino'

export type PropertyStatus = 'disponivel' | 'alugado' | 'reservado' | 'manutencao' | 'encerrado'
export type PropertyType = 'apartamento' | 'casa' | 'kitnet' | 'sala_comercial' | 'galpao' | 'terreno' | 'outro'

export type ContractStatus = 'ativo' | 'renovado' | 'encerrado' | 'cancelado'
export type ReadjustmentIndex = 'IGPM' | 'IPCA' | 'INPC' | 'Fixo' | 'Nenhum'

export type PaymentMethod = 'pix' | 'dinheiro' | 'transferencia' | 'cartao' | 'boleto'
export type PaymentStatus = 'pendente' | 'pago' | 'atrasado' | 'cancelado'
export type ChargeType = 'aluguel' | 'caucao' | 'multa' | 'juros' | 'taxa' | 'despesa_compartilhada' | 'outro'

export type ExpenseType = 'internet' | 'energia' | 'agua' | 'gas' | 'iptu' | 'condominio' | 'seguranca' | 'outro'
export type ExpenseStatus = 'pendente' | 'pago' | 'parcial'

export type MaintenanceCategory = 'eletrica' | 'hidraulica' | 'pintura' | 'estrutura' | 'limpeza' | 'seguranca' | 'outro'
export type MaintenanceStatus = 'aberto' | 'em_analise' | 'em_andamento' | 'finalizado'

export type NotificationChannel = 'whatsapp' | 'email' | 'push'
export type NotificationTrigger =
  | 'vencimento_7dias'
  | 'vencimento_3dias'
  | 'vencimento_1dia'
  | 'vencido_dia'
  | 'vencido_3dias'
  | 'vencido_7dias'
  | 'vencido_15dias'

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  tenantId?: string
  phone?: string
  whatsapp?: string
  phoneVerified?: boolean
  phoneVerifiedAt?: string
  avatar?: string
  companyId: string
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Subscription ────────────────────────────────────────────────────────────

export type PlanId = 'starter' | 'pro' | 'business'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'

export interface PlanLimits {
  maxProperties: number
  maxVehicles: number
  maxUsers: number
}

export const PLANS: Record<PlanId, { name: string; price: number; limits: PlanLimits; description: string }> = {
  starter: {
    name: 'Starter',
    price: 39,
    description: 'Para gestores iniciantes',
    limits: { maxProperties: 10, maxVehicles: 10, maxUsers: 2 },
  },
  pro: {
    name: 'Pro',
    price: 79,
    description: 'Para administradoras em crescimento',
    limits: { maxProperties: 50, maxVehicles: 50, maxUsers: 5 },
  },
  business: {
    name: 'Business',
    price: 129,
    description: 'Para operações maiores',
    limits: { maxProperties: 999, maxVehicles: 999, maxUsers: 20 },
  },
}

export interface CompanySubscription {
  companyId: string
  planId: PlanId
  status: SubscriptionStatus
  provider?: 'asaas' | 'stripe'
  providerCustomerId?: string
  providerSubscriptionId?: string
  trialEndsAt?: Timestamp
  currentPeriodStart: Timestamp
  currentPeriodEnd: Timestamp
  cancelAtPeriodEnd: boolean
  limits: PlanLimits
  usage: {
    propertyCount: number
    vehicleCount: number
    userCount: number
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Company ─────────────────────────────────────────────────────────────────

export interface Company {
  id: string
  name: string
  cnpj?: string
  email?: string
  phone?: string
  address?: string
  logo?: string
  ownerId?: string
  createdAt: Timestamp
}

// ─── Owner (Proprietário) ─────────────────────────────────────────────────────

export interface Owner {
  id: string
  companyId: string
  userId?: string
  name: string
  cpf?: string
  cnpj?: string
  email?: string
  phone?: string
  whatsapp?: string
  photoUrl?: string
  address?: Address
  bankAccount?: BankAccount
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Property (Imóvel) ────────────────────────────────────────────────────────

export interface Property {
  id: string
  companyId: string
  code: string
  name: string
  type: PropertyType
  status: PropertyStatus
  ownerId: string
  ownerName?: string
  address: Address
  rentValue: number
  cautionValue?: number
  photos?: string[]
  notes?: string
  activeContractId?: string
  activeTenantId?: string
  activeTenantName?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Address {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
}

export interface BankAccount {
  bank: string
  agency: string
  account: string
  type: 'corrente' | 'poupanca' | 'pix'
  pixKey?: string
}

// ─── Vehicle (Automóvel) ──────────────────────────────────────────────────────

export type VehicleStatus = 'disponivel' | 'alugado' | 'reservado' | 'manutencao' | 'encerrado'
export type VehicleType = 'carro' | 'moto' | 'caminhao' | 'van' | 'onibus' | 'outro'
export type FuelType = 'gasolina' | 'etanol' | 'flex' | 'diesel' | 'gnv' | 'eletrico' | 'hibrido'

export interface Vehicle {
  id: string
  companyId: string
  code: string
  brand: string
  model: string
  year: number
  plate: string
  type: VehicleType
  status: VehicleStatus
  ownerId: string
  ownerName?: string
  color?: string
  renavam?: string
  chassi?: string
  fuel?: FuelType
  mileage?: number
  rentValue: number
  cautionValue?: number
  fipeValue?: number
  photos?: string[]
  notes?: string
  activeContractId?: string
  activeTenantId?: string
  activeTenantName?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Tenant (Inquilino) ────────────────────────────────────────────────────────

export interface Tenant {
  id: string
  companyId: string
  userId?: string
  name: string
  cpf: string
  rg?: string
  email?: string
  phone?: string
  whatsapp?: string
  dateOfBirth?: string
  photoUrl?: string
  address?: Address
  documents?: string[]
  incomeProof?: string[]
  activeContractId?: string
  activePropertyId?: string
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Contract (Contrato) ─────────────────────────────────────────────────────

export type ContractAssetType = 'imovel' | 'veiculo'

export interface Contract {
  id: string
  companyId: string
  contractNumber: string
  assetType?: ContractAssetType
  propertyId: string
  propertyName?: string
  tenantId: string
  tenantName?: string
  ownerId: string
  ownerName?: string
  startDate: string
  endDate?: string
  rentValue: number
  dueDay: number
  cautionValue?: number
  lateFee: number
  monthlyInterest: number
  readjustmentIndex: ReadjustmentIndex
  readjustmentFixedRate?: number
  status: ContractStatus
  files?: string[]
  notes?: string
  // Signing
  signingData?: ContractSigningData
  signatureLocador?: string
  signatureLocatario?: string
  docsLocador?: string[]
  docsLocatario?: string[]
  witnesses?: ContractWitness[]
  signedPdfUrl?: string
  signedAt?: string
  locked?: boolean
  lockedAt?: string
  templateId?: string
  templateName?: string
  templateClauses?: ContractTemplateClause[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── ContractTemplate (Modelo de Contrato) ───────────────────────────────────

export interface ContractTemplateClause {
  id: string
  title: string
  items: string[]
}

export interface ContractTemplate {
  id: string
  companyId: string
  assetType: ContractAssetType
  name: string
  clauses: ContractTemplateClause[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Testemunha que assina remotamente por link público enviado por e-mail
export interface ContractWitness {
  token: string
  name: string
  email: string
  cpf?: string
  rg?: string
  signature?: string
  status: 'pending' | 'signed'
  signedAt?: string
}

// Documento público (coleção witnessSignatures) acessado pelo token na URL.
// Guarda um snapshot do contrato para exibir a prévia sem expor o contrato.
export interface WitnessSignatureRequest {
  id?: string
  contractId: string
  companyId: string
  contractNumber: string
  witnessName: string
  witnessEmail: string
  locadorName: string
  locatarioName: string
  objeto: string
  valor: string
  status: 'pending' | 'signed'
  signature?: string
  cpf?: string
  rg?: string
  createdAt?: string
  signedAt?: string
}

// ─── Payment (Pagamento) ──────────────────────────────────────────────────────

export interface Payment {
  id: string
  companyId: string
  contractId: string
  propertyId: string
  propertyName?: string
  tenantId: string
  tenantName?: string
  chargeId?: string
  type: ChargeType
  description: string
  amount: number
  dueDate: string
  paidDate?: string
  paymentMethod?: PaymentMethod
  status: PaymentStatus
  lateFee?: number
  interest?: number
  discount?: number
  receipt?: string
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Charge (Cobrança) ────────────────────────────────────────────────────────

export interface Charge {
  id: string
  companyId: string
  contractId: string
  propertyId: string
  propertyName?: string
  tenantId: string
  tenantName?: string
  type: ChargeType
  description: string
  amount: number
  dueDate?: string
  status: PaymentStatus
  daysLate?: number
  lateFee?: number
  interest?: number
  totalAmount?: number
  paidDate?: string
  paidAmount?: number
  paymentId?: string
  paymentMethod?: PaymentMethod
  receipt?: string
  receiptStatus?: 'aguardando' | 'confirmado' | 'rejeitado'
  paidBy?: 'tenant' | 'admin'
  notes?: string
  notificationsSent?: NotificationTrigger[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── SharedExpense (Despesa Compartilhada) ────────────────────────────────────

export interface SharedExpense {
  id: string
  companyId: string
  propertyId: string
  propertyName?: string
  type: ExpenseType
  description: string
  totalAmount: number
  dueDate?: string
  recurring?: boolean
  dueDay?: number
  attachments?: string[]
  participants: SharedExpenseParticipant[]
  participantTenantIds?: string[]
  status: ExpenseStatus
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface SharedExpenseParticipant {
  tenantId: string
  tenantName: string
  amount: number
  status: PaymentStatus
  chargeId?: string
  paidDate?: string
  receipt?: string
  receiptStatus?: 'aguardando' | 'confirmado' | 'rejeitado'
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  companyId: string
  recipientId: string
  recipientName?: string
  recipientEmail?: string
  recipientWhatsapp?: string
  chargeId?: string
  contractId?: string
  propertyId?: string
  title: string
  message: string
  channel: NotificationChannel
  trigger: NotificationTrigger
  sentAt?: Timestamp
  status: 'pendente' | 'enviado' | 'erro'
  error?: string
  createdAt: Timestamp
}

export interface NotificationTemplate {
  id: string
  companyId: string
  trigger: NotificationTrigger
  channel: NotificationChannel
  subject?: string
  body: string
  active: boolean
  updatedAt: Timestamp
}

// ─── MaintenanceRequest (Chamado de Manutenção) ───────────────────────────────

// ─── Contract Signing ─────────────────────────────────────────────────────────

export interface SigningParty {
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

export interface ImovelSigningData {
  locador: SigningParty
  locatario: SigningParty
  fiador?: SigningParty & { patrimonioDescricao: string }
  imovel: {
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
  financeiro: {
    valorExtenso: string
    pixKey?: string
    banco?: string
    agencia?: string
    conta?: string
  }
  prazo: {
    inicioFormatado: string
    terminoFormatado: string
    prazoExtenso: string
  }
  indiceReajuste: string
  testemunha1?: { name: string; cpf: string; rg: string }
  testemunha2?: { name: string; cpf: string; rg: string }
  foro: string
  cidade: string
  dataContrato: string
}

export interface VeiculoSigningData {
  locador: SigningParty
  locatario: SigningParty & { cnh: string; cnhCategoria: string; cnhValidade: string }
  condutoresAdicionais?: Array<{ name: string; cpf: string; cnh: string }>
  veiculo: {
    marca: string
    modelo: string
    ano: string
    cor: string
    placa: string
    renavam: string
    chassi: string
    kmInicial: string
    estadoGeral: string
  }
  financeiro: {
    valorDiario?: string
    valorSemanal?: string
    valorMensal?: string
    caucaoValor?: string
    pixKey?: string
    banco?: string
  }
  prazo: {
    dataRetiradaFormatada: string
    dataDevolucaoFormatada: string
    horarioRetirada: string
    horarioDevolucao: string
  }
  testemunha1?: { name: string; cpf: string; rg: string }
  testemunha2?: { name: string; cpf: string; rg: string }
  foro: string
  cidade: string
  dataContrato: string
}

export type ContractSigningData = ImovelSigningData | VeiculoSigningData

// Add these fields to Contract (stored in Firestore alongside existing fields):
// signingData?: ContractSigningData
// signatureLocador?: string   (base64 PNG)
// signatureLocatario?: string (base64 PNG)
// docsLocador?: string[]      (Firebase Storage URLs: [doc_photo, selfie_with_doc])
// docsLocatario?: string[]
// signedPdfUrl?: string
// signedAt?: string

export interface MaintenanceRequest {
  id: string
  companyId: string
  propertyId: string
  propertyName?: string
  tenantId: string
  tenantName?: string
  title: string
  description: string
  category: MaintenanceCategory
  status: MaintenanceStatus
  priority: 'baixa' | 'media' | 'alta' | 'urgente'
  photos?: string[]
  videos?: string[]
  comments?: MaintenanceComment[]
  statusHistory?: MaintenanceStatusHistory[]
  assignedTo?: string
  resolvedAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface MaintenanceComment {
  id: string
  authorId: string
  authorName: string
  authorRole?: UserRole
  message: string
  attachments?: string[]
  createdAt: Timestamp
}

export interface MaintenanceStatusHistory {
  id: string
  status: MaintenanceStatus
  previousStatus?: MaintenanceStatus
  changedById: string
  changedByName: string
  changedByRole?: UserRole
  createdAt: Timestamp
}

// ─── AuditLog ─────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  companyId: string
  userId: string
  userName: string
  action: string
  module: string
  entityId?: string
  entityType?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ip?: string
  createdAt: Timestamp
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalProperties: number
  rentedProperties: number
  vacantProperties: number
  expectedRevenue: number
  receivedRevenue: number
  pendingRevenue: number
  defaultingTenants: number
  overdueCharges: number
  openRequests: number
  pendingSharedExpenses: number
}
