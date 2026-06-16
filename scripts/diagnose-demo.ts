/**
 * Diagnóstico: verifica quais documentos existem em demo-company
 * e se há dados não-semeados (criados por usuários reais).
 *
 * Uso: npx tsx scripts/diagnose-demo.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

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

// IDs semeados pelo seed-demo.ts (devem ser os ÚNICOS em demo-company)
const SEEDED_IDS: Record<string, Set<string>> = {
  companies:           new Set(['demo-company']),
  users:               new Set(['demo-admin', 'demo-gestor', 'demo-inquilino']),
  owners:              new Set(['demo-owner-carlos', 'demo-owner-maria']),
  properties:          new Set(['demo-prop-apto', 'demo-prop-casa', 'demo-prop-kitnet', 'demo-prop-sala']),
  vehicles:            new Set(['demo-veh-civic', 'demo-veh-corolla']),
  tenants:             new Set(['demo-tenant-roberto', 'demo-tenant-fernanda', 'demo-tenant-pedro']),
  contracts:           new Set(['demo-contract-apto', 'demo-contract-casa', 'demo-contract-civic']),
  charges:             new Set([
    'demo-charge-apto-1','demo-charge-apto-2','demo-charge-apto-3',
    'demo-charge-apto-4','demo-charge-apto-5','demo-charge-apto-6',
    'demo-charge-casa-1','demo-charge-casa-2','demo-charge-casa-3',
    'demo-charge-casa-4','demo-charge-casa-5','demo-charge-casa-6',
    'demo-charge-casa-7','demo-charge-casa-8','demo-charge-casa-9',
    'demo-charge-casa-10','demo-charge-casa-11','demo-charge-casa-12',
    'demo-charge-civic-1','demo-charge-civic-2','demo-charge-civic-3',
    'demo-charge-caucao-apto',
  ]),
  maintenanceRequests: new Set(['demo-maintenance-1', 'demo-maintenance-2']),
  sharedExpenses:      new Set(['demo-expense-internet', 'demo-expense-agua']),
}

const COLLECTIONS_TO_CHECK = [
  'properties', 'vehicles', 'tenants', 'owners',
  'contracts', 'charges', 'maintenanceRequests', 'sharedExpenses',
]

async function diagnose() {
  console.log('🔍 Diagnóstico de dados em demo-company\n')

  let extraCount = 0

  for (const col of COLLECTIONS_TO_CHECK) {
    const snap = await db.collection(col).where('companyId', '==', 'demo-company').get()
    const seeded = SEEDED_IDS[col] ?? new Set()
    const extra = snap.docs.filter(d => !seeded.has(d.id))

    console.log(`📂 ${col}: ${snap.size} total, ${extra.length} não-semeados`)
    for (const doc of extra) {
      const data = doc.data()
      console.log(`  ⚠️  ID: ${doc.id}`)
      console.log(`      name/model/title: ${data.name ?? data.model ?? data.title ?? data.description ?? '—'}`)
      console.log(`      createdAt: ${data.createdAt?.toDate?.()?.toISOString() ?? '—'}`)
      extraCount++
    }
  }

  // Verifica users com companyId demo-company além dos 3 demo
  console.log('\n👤 users com companyId=demo-company:')
  const usersSnap = await db.collection('users').where('companyId', '==', 'demo-company').get()
  const seededUsers = SEEDED_IDS.users
  for (const doc of usersSnap.docs) {
    const data = doc.data()
    const mark = seededUsers.has(doc.id) ? '  ✓' : '  ⚠️ NÃO-SEMEADO'
    console.log(`${mark} ID: ${doc.id} | email: ${data.email} | role: ${data.role}`)
  }

  console.log(`\n${extraCount === 0 ? '✅ Nenhum dado extra encontrado — demo-company está limpo' : `⚠️  ${extraCount} documento(s) extra(s) encontrado(s) em demo-company`}`)

  // Lista também quais companyIds existem em properties (para ver se há muitas empresas)
  console.log('\n📊 companyIds distintos em properties (top 10):')
  const allProps = await db.collection('properties').limit(200).get()
  const ids = new Map<string, number>()
  for (const doc of allProps.docs) {
    const cid = doc.data().companyId ?? '(sem companyId)'
    ids.set(cid, (ids.get(cid) ?? 0) + 1)
  }
  const sorted = [...ids.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  for (const [cid, count] of sorted) {
    console.log(`  ${cid}: ${count} imóvel(s)`)
  }

  process.exit(0)
}

diagnose().catch(err => { console.error(err); process.exit(1) })
