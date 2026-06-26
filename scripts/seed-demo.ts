/**
 * Seed script — popula dados de demonstração para demo-company no Firestore.
 *
 * Uso: npx tsx scripts/seed-demo.ts
 *
 * Requer: .env.local com FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * É seguro rodar mais de uma vez (sobrescreve com merge).
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()

// ─── helpers ─────────────────────────────────────────────────────────────────

function ts(daysOffset = 0): Timestamp {
  return Timestamp.fromMillis(Date.now() + daysOffset * 86_400_000)
}

function dateStr(daysOffset = 0): string {
  const d = new Date(Date.now() + daysOffset * 86_400_000)
  return d.toISOString().split('T')[0]
}

async function upsert(col: string, id: string, data: Record<string, unknown>) {
  await db.doc(`${col}/${id}`).set(data, { merge: true })
  console.log(`  ✓ ${col}/${id}`)
}

// ─── IDs fixos ───────────────────────────────────────────────────────────────

const COMPANY_ID = 'alugapro-demo'

const OWN = { carlos: 'demo-owner-carlos', maria: 'demo-owner-maria' }
const PROP = {
  apto:   'demo-prop-apto',
  casa:   'demo-prop-casa',
  kitnet: 'demo-prop-kitnet',
  sala:   'demo-prop-sala',
}
const VEH = { civic: 'demo-veh-civic', corolla: 'demo-veh-corolla' }
const EQP = { betoneira: 'demo-eqp-betoneira', gerador: 'demo-eqp-gerador' }
const TEN = { roberto: 'demo-tenant-roberto', fernanda: 'demo-tenant-fernanda', pedro: 'demo-tenant-pedro' }
const CON = { apto: 'demo-contract-apto', casa: 'demo-contract-casa', civic: 'demo-contract-civic', betoneira: 'demo-contract-betoneira' }

// ─── Empresa ─────────────────────────────────────────────────────────────────

async function seedCompany() {
  console.log('\n📦 Company')
  await upsert('companies', COMPANY_ID, {
    id: COMPANY_ID,
    name: 'Imobiliária Demo',
    cnpj: '00.000.000/0001-00',
    email: 'contato@imobiliariademo.com.br',
    phone: '(11) 3000-0000',
    address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
    createdAt: ts(-365),
    updatedAt: ts(),
  })
}

// ─── Usuários ─────────────────────────────────────────────────────────────────

async function seedUsers() {
  console.log('\n👤 Users')
  const base = { companyId: COMPANY_ID, active: true, updatedAt: ts() }
  await upsert('users', 'demo-admin', {
    ...base, id: 'demo-admin', name: 'Administrador', email: 'admin@alugapro.com',
    role: 'admin', createdAt: ts(-300),
  })
  await upsert('users', 'demo-gestor', {
    ...base, id: 'demo-gestor', name: 'Carlos Gestor', email: 'gestor@alugapro.com',
    role: 'gestor', phone: '(11) 91111-2222', createdAt: ts(-300),
  })
  await upsert('users', 'demo-inquilino', {
    ...base, id: 'demo-inquilino', name: 'Roberto Alves', email: 'inquilino@alugapro.com',
    role: 'inquilino', tenantId: TEN.roberto, phone: '(11) 98888-1111', createdAt: ts(-180),
  })
  await upsert('users', 'demo-afiliado', {
    ...base, id: 'demo-afiliado', name: 'Marina Indicadora', email: 'afiliado@alugapro.com',
    role: 'afiliado', referralCode: 'MARINA', phone: '(11) 95555-3344', createdAt: ts(-90),
  })
}

// ─── Proprietários ────────────────────────────────────────────────────────────

async function seedOwners() {
  console.log('\n🏠 Owners')
  await upsert('owners', OWN.carlos, {
    id: OWN.carlos, companyId: COMPANY_ID,
    name: 'Carlos Eduardo Silva', cpf: '123.456.789-00',
    email: 'carlos@email.com', phone: '(11) 99001-1122',
    whatsapp: '11990011122',
    address: { street: 'Rua das Flores', number: '45', neighborhood: 'Jardins', city: 'São Paulo', state: 'SP', zipCode: '01402-000' },
    bankAccount: { bank: 'Itaú', agency: '1234', account: '56789-0', type: 'corrente', pixKey: 'carlos@email.com' },
    active: true, createdAt: ts(-365), updatedAt: ts(),
  })
  await upsert('owners', OWN.maria, {
    id: OWN.maria, companyId: COMPANY_ID,
    name: 'Maria Aparecida Santos', cpf: '987.654.321-00',
    email: 'maria@email.com', phone: '(11) 97002-3344',
    whatsapp: '11970023344',
    address: { street: 'Av. Brasil', number: '200', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01310-100' },
    bankAccount: { bank: 'Bradesco', agency: '5678', account: '12345-6', type: 'poupanca', pixKey: '98765432100' },
    active: true, createdAt: ts(-300), updatedAt: ts(),
  })
}

// ─── Imóveis ──────────────────────────────────────────────────────────────────

async function seedProperties() {
  console.log('\n🏢 Properties')
  const base = { companyId: COMPANY_ID, updatedAt: ts() }

  await upsert('properties', PROP.apto, {
    ...base, id: PROP.apto,
    code: 'IMV-001', name: 'Apartamento Centro', type: 'apartamento', status: 'alugado',
    ownerId: OWN.carlos, ownerName: 'Carlos Eduardo Silva',
    address: { street: 'Rua Augusta', number: '500', complement: 'Apto 42', neighborhood: 'Consolação', city: 'São Paulo', state: 'SP', zipCode: '01305-000' },
    rentValue: 2800, cautionValue: 5600,
    activeContractId: CON.apto, activeTenantId: TEN.roberto, activeTenantName: 'Roberto Alves Moreira',
    notes: 'Apartamento de 2 quartos, 1 vaga de garagem. Reforma recente na cozinha.',
    createdAt: ts(-365),
  })

  await upsert('properties', PROP.casa, {
    ...base, id: PROP.casa,
    code: 'IMV-002', name: 'Casa Jardins', type: 'casa', status: 'alugado',
    ownerId: OWN.carlos, ownerName: 'Carlos Eduardo Silva',
    address: { street: 'Rua Oscar Freire', number: '1234', neighborhood: 'Jardins', city: 'São Paulo', state: 'SP', zipCode: '01426-001' },
    rentValue: 5500, cautionValue: 11000,
    activeContractId: CON.casa, activeTenantId: TEN.fernanda, activeTenantName: 'Fernanda Lima Costa',
    notes: 'Casa de 3 quartos com piscina e área gourmet.',
    createdAt: ts(-400),
  })

  await upsert('properties', PROP.kitnet, {
    ...base, id: PROP.kitnet,
    code: 'IMV-003', name: 'Kitnet Vila Madalena', type: 'kitnet', status: 'disponivel',
    ownerId: OWN.maria, ownerName: 'Maria Aparecida Santos',
    address: { street: 'Rua Mourato Coelho', number: '78', complement: 'Ap 12', neighborhood: 'Vila Madalena', city: 'São Paulo', state: 'SP', zipCode: '05417-010' },
    rentValue: 1400, cautionValue: 1400,
    notes: 'Kitnet reformada, próxima ao metrô.',
    createdAt: ts(-200),
  })

  await upsert('properties', PROP.sala, {
    ...base, id: PROP.sala,
    code: 'IMV-004', name: 'Sala Comercial Paulista', type: 'sala_comercial', status: 'manutencao',
    ownerId: OWN.carlos, ownerName: 'Carlos Eduardo Silva',
    address: { street: 'Av. Paulista', number: '2000', complement: 'Sala 301', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP', zipCode: '01310-200' },
    rentValue: 3200, cautionValue: 6400,
    notes: 'Em manutenção: pintura e instalação de ar-condicionado.',
    createdAt: ts(-500),
  })
}

// ─── Veículos ─────────────────────────────────────────────────────────────────

async function seedVehicles() {
  console.log('\n🚗 Vehicles')
  const base = { companyId: COMPANY_ID, updatedAt: ts() }

  await upsert('vehicles', VEH.civic, {
    ...base, id: VEH.civic,
    code: 'VEI-001', brand: 'Honda', model: 'Civic Sedan', year: 2022, plate: 'ABC-1234',
    type: 'carro', status: 'alugado', color: 'Prata', fuel: 'flex',
    renavam: '12345678901', mileage: 18000, fipeValue: 118000,
    ownerId: OWN.maria, ownerName: 'Maria Aparecida Santos',
    rentValue: 3200, cautionValue: 6400,
    activeContractId: CON.civic, activeTenantId: TEN.pedro, activeTenantName: 'Pedro Henrique Souza',
    notes: 'Revisão realizada em fevereiro/2024.',
    createdAt: ts(-200),
  })

  await upsert('vehicles', VEH.corolla, {
    ...base, id: VEH.corolla,
    code: 'VEI-002', brand: 'Toyota', model: 'Corolla XEi', year: 2021, plate: 'DEF-5678',
    type: 'carro', status: 'disponivel', color: 'Branco', fuel: 'flex',
    renavam: '98765432100', mileage: 32000, fipeValue: 105000,
    ownerId: OWN.maria, ownerName: 'Maria Aparecida Santos',
    rentValue: 2900, cautionValue: 5800,
    notes: 'Disponível a partir de agora.',
    createdAt: ts(-180),
  })
}

// ─── Equipamentos ─────────────────────────────────────────────────────────────

async function seedEquipments() {
  console.log('\n🛠️  Equipments')
  const base = { companyId: COMPANY_ID, updatedAt: ts() }

  await upsert('equipments', EQP.betoneira, {
    ...base, id: EQP.betoneira,
    code: 'EQP-001', name: 'Betoneira 400L', brand: 'CSM', model: '400L Trifásica',
    type: 'Betoneira', status: 'alugado',
    ownerId: OWN.carlos, ownerName: 'Carlos Eduardo Silva',
    serialNumber: 'CSM400-88213',
    rentValue: 450, cautionValue: 900, purchaseValue: 6200,
    activeContractId: CON.betoneira, activeTenantId: TEN.pedro, activeTenantName: 'Pedro Henrique Souza',
    notes: 'Revisão do motor feita em janeiro/2025.',
    createdAt: ts(-60),
  })

  await upsert('equipments', EQP.gerador, {
    ...base, id: EQP.gerador,
    code: 'EQP-002', name: 'Gerador de Energia 5kVA', brand: 'Toyama', model: 'TG6500CXE-DF',
    type: 'Gerador de energia', status: 'disponivel',
    ownerId: OWN.maria, ownerName: 'Maria Aparecida Santos',
    serialNumber: 'TY6500-44102',
    rentValue: 280, cautionValue: 560, purchaseValue: 4500,
    notes: 'Ideal para eventos e obras sem rede elétrica.',
    createdAt: ts(-40),
  })
}

// ─── Inquilinos ───────────────────────────────────────────────────────────────

async function seedTenants() {
  console.log('\n👥 Tenants')
  const base = { companyId: COMPANY_ID, active: true, updatedAt: ts() }

  await upsert('tenants', TEN.roberto, {
    ...base, id: TEN.roberto,
    name: 'Roberto Alves Moreira', cpf: '111.222.333-44', rg: '11.222.333-4',
    email: 'inquilino@alugapro.com', phone: '(11) 98888-1111', whatsapp: '11988881111',
    dateOfBirth: '1988-05-15',
    address: { street: 'Rua Augusta', number: '500', complement: 'Apto 42', neighborhood: 'Consolação', city: 'São Paulo', state: 'SP', zipCode: '01305-000' },
    activeContractId: CON.apto, activePropertyId: PROP.apto,
    createdAt: ts(-180),
  })

  await upsert('tenants', TEN.fernanda, {
    ...base, id: TEN.fernanda,
    name: 'Fernanda Lima Costa', cpf: '555.666.777-88', rg: '55.666.777-8',
    email: 'fernanda.lima@email.com', phone: '(11) 97777-5566', whatsapp: '11977775566',
    dateOfBirth: '1992-11-30',
    address: { street: 'Rua Oscar Freire', number: '1234', neighborhood: 'Jardins', city: 'São Paulo', state: 'SP', zipCode: '01426-001' },
    activeContractId: CON.casa, activePropertyId: PROP.casa,
    createdAt: ts(-365),
  })

  await upsert('tenants', TEN.pedro, {
    ...base, id: TEN.pedro,
    name: 'Pedro Henrique Souza', cpf: '999.888.777-66', rg: '99.888.777-6',
    email: 'pedro.h@email.com', phone: '(11) 96666-9900', whatsapp: '11966669900',
    dateOfBirth: '1995-03-22',
    address: { street: 'Av. Faria Lima', number: '3000', complement: 'Ap 80', neighborhood: 'Itaim Bibi', city: 'São Paulo', state: 'SP', zipCode: '04538-133' },
    activeContractId: CON.civic,
    createdAt: ts(-90),
  })
}

// ─── Contratos ────────────────────────────────────────────────────────────────

async function seedContracts() {
  console.log('\n📄 Contracts')
  const base = { companyId: COMPANY_ID, status: 'ativo', lateFee: 2, monthlyInterest: 1, readjustmentIndex: 'IGPM', updatedAt: ts() }

  await upsert('contracts', CON.apto, {
    ...base, id: CON.apto,
    contractNumber: 'CT-2024-001', assetType: 'imovel',
    propertyId: PROP.apto, propertyName: 'Apartamento Centro',
    tenantId: TEN.roberto, tenantName: 'Roberto Alves Moreira',
    ownerId: OWN.carlos, ownerName: 'Carlos Eduardo Silva',
    startDate: dateStr(-180), endDate: dateStr(185),
    rentValue: 2800, dueDay: 10, cautionValue: 5600,
    createdAt: ts(-180),
  })

  await upsert('contracts', CON.casa, {
    ...base, id: CON.casa,
    contractNumber: 'CT-2024-002', assetType: 'imovel',
    propertyId: PROP.casa, propertyName: 'Casa Jardins',
    tenantId: TEN.fernanda, tenantName: 'Fernanda Lima Costa',
    ownerId: OWN.carlos, ownerName: 'Carlos Eduardo Silva',
    startDate: dateStr(-365), endDate: dateStr(365),
    rentValue: 5500, dueDay: 5, cautionValue: 11000,
    createdAt: ts(-365),
  })

  await upsert('contracts', CON.civic, {
    ...base, id: CON.civic,
    contractNumber: 'CT-2024-003', assetType: 'veiculo',
    propertyId: VEH.civic, propertyName: 'Honda Civic Sedan 2022',
    tenantId: TEN.pedro, tenantName: 'Pedro Henrique Souza',
    ownerId: OWN.maria, ownerName: 'Maria Aparecida Santos',
    startDate: dateStr(-90), endDate: dateStr(275),
    rentValue: 3200, dueDay: 15, cautionValue: 6400,
    createdAt: ts(-90),
  })

  await upsert('contracts', CON.betoneira, {
    ...base, id: CON.betoneira,
    contractNumber: 'CT-2024-004', assetType: 'equipamento',
    propertyId: EQP.betoneira, propertyName: 'Betoneira 400L',
    tenantId: TEN.pedro, tenantName: 'Pedro Henrique Souza',
    ownerId: OWN.carlos, ownerName: 'Carlos Eduardo Silva',
    startDate: dateStr(-60), endDate: dateStr(120),
    rentValue: 450, dueDay: 20, cautionValue: 900,
    createdAt: ts(-60),
  })
}

// ─── Cobranças ────────────────────────────────────────────────────────────────

async function seedCharges() {
  console.log('\n💰 Charges')

  const charges: Array<Record<string, unknown>> = []

  // Contrato Apto: 6 meses → 5 pagas + 1 pendente
  for (let i = 0; i < 6; i++) {
    const dueOffset = -180 + i * 30 + 10   // vence dia 10 de cada mês
    const isPaid = i < 5
    charges.push({
      id: `demo-charge-apto-${i + 1}`,
      companyId: COMPANY_ID, contractId: CON.apto,
      propertyId: PROP.apto, propertyName: 'Apartamento Centro',
      tenantId: TEN.roberto, tenantName: 'Roberto Alves Moreira',
      type: 'aluguel', description: `Aluguel ${i + 1}º mês`,
      amount: 2800, dueDate: dateStr(dueOffset),
      status: isPaid ? 'pago' : 'pendente',
      ...(isPaid && { paidDate: dateStr(dueOffset + 2), paidAmount: 2800, paymentMethod: 'pix' }),
      totalAmount: 2800, createdAt: ts(dueOffset - 5), updatedAt: ts(isPaid ? dueOffset + 2 : 0),
    })
  }

  // Contrato Casa: 12 meses → 11 pagas + 1 atrasada
  for (let i = 0; i < 12; i++) {
    const dueOffset = -365 + i * 30 + 5   // vence dia 5
    const isPaid = i < 11
    const isLate = i === 11
    charges.push({
      id: `demo-charge-casa-${i + 1}`,
      companyId: COMPANY_ID, contractId: CON.casa,
      propertyId: PROP.casa, propertyName: 'Casa Jardins',
      tenantId: TEN.fernanda, tenantName: 'Fernanda Lima Costa',
      type: 'aluguel', description: `Aluguel ${i + 1}º mês`,
      amount: 5500, dueDate: dateStr(dueOffset),
      status: isPaid ? 'pago' : (isLate ? 'atrasado' : 'pendente'),
      ...(isPaid && { paidDate: dateStr(dueOffset + 1), paidAmount: 5500, paymentMethod: 'transferencia' }),
      ...(isLate && { daysLate: 12, lateFee: 110, interest: 55, totalAmount: 5665 }),
      totalAmount: isPaid ? 5500 : 5665, createdAt: ts(dueOffset - 5), updatedAt: ts(isPaid ? dueOffset + 1 : 0),
    })
  }

  // Contrato Civic: 3 meses → 2 pagas + 1 pendente
  for (let i = 0; i < 3; i++) {
    const dueOffset = -90 + i * 30 + 15   // vence dia 15
    const isPaid = i < 2
    charges.push({
      id: `demo-charge-civic-${i + 1}`,
      companyId: COMPANY_ID, contractId: CON.civic,
      propertyId: VEH.civic, propertyName: 'Honda Civic Sedan 2022',
      tenantId: TEN.pedro, tenantName: 'Pedro Henrique Souza',
      type: 'aluguel', description: `Aluguel ${i + 1}º mês`,
      amount: 3200, dueDate: dateStr(dueOffset),
      status: isPaid ? 'pago' : 'pendente',
      ...(isPaid && { paidDate: dateStr(dueOffset + 3), paidAmount: 3200, paymentMethod: 'pix' }),
      totalAmount: 3200, createdAt: ts(dueOffset - 5), updatedAt: ts(isPaid ? dueOffset + 3 : 0),
    })
  }

  // Contrato Betoneira: 2 meses → 1 paga + 1 pendente
  for (let i = 0; i < 2; i++) {
    const dueOffset = -60 + i * 30 + 20   // vence dia 20
    const isPaid = i < 1
    charges.push({
      id: `demo-charge-betoneira-${i + 1}`,
      companyId: COMPANY_ID, contractId: CON.betoneira,
      propertyId: EQP.betoneira, propertyName: 'Betoneira 400L',
      tenantId: TEN.pedro, tenantName: 'Pedro Henrique Souza',
      type: 'aluguel', description: `Aluguel ${i + 1}º mês`,
      amount: 450, dueDate: dateStr(dueOffset),
      status: isPaid ? 'pago' : 'pendente',
      ...(isPaid && { paidDate: dateStr(dueOffset + 1), paidAmount: 450, paymentMethod: 'pix' }),
      totalAmount: 450, createdAt: ts(dueOffset - 5), updatedAt: ts(isPaid ? dueOffset + 1 : 0),
    })
  }

  // Caução do apto (pago)
  charges.push({
    id: 'demo-charge-caucao-apto',
    companyId: COMPANY_ID, contractId: CON.apto,
    propertyId: PROP.apto, propertyName: 'Apartamento Centro',
    tenantId: TEN.roberto, tenantName: 'Roberto Alves Moreira',
    type: 'caucao', description: 'Caução — 2 meses', amount: 5600,
    dueDate: dateStr(-180), status: 'pago', paidDate: dateStr(-180), paidAmount: 5600, paymentMethod: 'transferencia',
    totalAmount: 5600, createdAt: ts(-182), updatedAt: ts(-180),
  })

  for (const c of charges) {
    await upsert('charges', c.id as string, c)
  }
}

// ─── Manutenção ───────────────────────────────────────────────────────────────

async function seedMaintenance() {
  console.log('\n🔧 Maintenance')
  await upsert('maintenanceRequests', 'demo-maintenance-1', {
    id: 'demo-maintenance-1', companyId: COMPANY_ID,
    propertyId: PROP.kitnet, propertyName: 'Kitnet Vila Madalena',
    tenantId: TEN.roberto, tenantName: 'Roberto Alves Moreira',
    title: 'Vazamento na torneira da cozinha',
    description: 'A torneira da cozinha está gotejando constantemente, causando desperdício de água.',
    category: 'hidraulica', status: 'em_andamento', priority: 'media',
    comments: [
      {
        id: 'cmt-1', authorId: 'demo-gestor', authorName: 'Carlos Gestor', authorRole: 'gestor',
        message: 'Encanador agendado para sexta-feira às 14h.', attachments: [], createdAt: ts(-3),
      },
    ],
    statusHistory: [
      {
        id: 'hist-1', status: 'aberto', previousStatus: null,
        changedById: 'demo-inquilino', changedByName: 'Roberto Alves', changedByRole: 'inquilino', createdAt: ts(-5),
      },
      {
        id: 'hist-2', status: 'em_andamento', previousStatus: 'aberto',
        changedById: 'demo-gestor', changedByName: 'Carlos Gestor', changedByRole: 'gestor', createdAt: ts(-3),
      },
    ],
    createdAt: ts(-5), updatedAt: ts(-3),
  })

  await upsert('maintenanceRequests', 'demo-maintenance-2', {
    id: 'demo-maintenance-2', companyId: COMPANY_ID,
    propertyId: PROP.sala, propertyName: 'Sala Comercial Paulista',
    tenantId: '', tenantName: '',
    title: 'Pintura e instalação de ar-condicionado',
    description: 'Sala precisa de pintura completa e instalação de 2 splits antes de nova locação.',
    category: 'pintura', status: 'em_andamento', priority: 'alta',
    assignedTo: 'Construtora ABC Ltda.',
    statusHistory: [
      {
        id: 'hist-1', status: 'aberto', previousStatus: null,
        changedById: 'demo-gestor', changedByName: 'Carlos Gestor', changedByRole: 'gestor', createdAt: ts(-15),
      },
      {
        id: 'hist-2', status: 'em_andamento', previousStatus: 'aberto',
        changedById: 'demo-gestor', changedByName: 'Carlos Gestor', changedByRole: 'gestor', createdAt: ts(-10),
      },
    ],
    createdAt: ts(-15), updatedAt: ts(-10),
  })
}

// ─── Despesas compartilhadas ──────────────────────────────────────────────────

async function seedSharedExpenses() {
  console.log('\n🔌 Shared Expenses')
  await upsert('sharedExpenses', 'demo-expense-internet', {
    id: 'demo-expense-internet', companyId: COMPANY_ID,
    propertyId: PROP.apto, propertyName: 'Apartamento Centro',
    type: 'internet', description: 'Internet fibra 300Mbps — Julho/2024',
    totalAmount: 120, dueDate: dateStr(5),
    recurring: true, dueDay: 20,
    participants: [
      {
        tenantId: TEN.roberto, tenantName: 'Roberto Alves Moreira',
        amount: 120, status: 'pendente',
      },
    ],
    participantTenantIds: [TEN.roberto],
    status: 'pendente', createdAt: ts(-10), updatedAt: ts(-10),
  })

  await upsert('sharedExpenses', 'demo-expense-agua', {
    id: 'demo-expense-agua', companyId: COMPANY_ID,
    propertyId: PROP.casa, propertyName: 'Casa Jardins',
    type: 'agua', description: 'Conta de água — Junho/2024',
    totalAmount: 280, dueDate: dateStr(-10),
    participants: [
      {
        tenantId: TEN.fernanda, tenantName: 'Fernanda Lima Costa',
        amount: 280, status: 'pago', paidDate: dateStr(-8),
      },
    ],
    participantTenantIds: [TEN.fernanda],
    status: 'pago', createdAt: ts(-25), updatedAt: ts(-8),
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding demo-company data...')
  await seedCompany()
  await seedUsers()
  await seedOwners()
  await seedProperties()
  await seedVehicles()
  await seedEquipments()
  await seedTenants()
  await seedContracts()
  await seedCharges()
  await seedMaintenance()
  await seedSharedExpenses()
  console.log('\n✅ Seed concluído com sucesso!')
  process.exit(0)
}

main().catch(err => { console.error('❌ Seed falhou:', err); process.exit(1) })
