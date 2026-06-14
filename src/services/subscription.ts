import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { CompanySubscription, PlanId, PLANS, SubscriptionStatus } from '@/types'

const TRIAL_DAYS = 14

export async function getSubscription(companyId: string): Promise<CompanySubscription | null> {
  if (!companyId || companyId === 'demo-company') return null
  const snap = await getDoc(doc(db, 'subscriptions', companyId))
  if (!snap.exists()) return null
  return snap.data() as CompanySubscription
}

export async function createTrialSubscription(companyId: string): Promise<CompanySubscription> {
  const now = Timestamp.now()
  const trialEnd = Timestamp.fromMillis(now.toMillis() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const periodEnd = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000)

  const sub: CompanySubscription = {
    companyId,
    planId: 'pro',
    status: 'trialing',
    trialEndsAt: trialEnd,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    limits: PLANS.pro.limits,
    usage: { propertyCount: 0, vehicleCount: 0, userCount: 1 },
    createdAt: now,
    updatedAt: now,
  }

  await setDoc(doc(db, 'subscriptions', companyId), sub)
  return sub
}

export async function updateSubscriptionStatus(
  companyId: string,
  status: SubscriptionStatus,
  planId?: PlanId,
) {
  const patch: Partial<CompanySubscription> = {
    status,
    updatedAt: serverTimestamp() as Timestamp,
  }
  if (planId) {
    patch.planId = planId
    patch.limits = PLANS[planId].limits
  }
  await updateDoc(doc(db, 'subscriptions', companyId), patch)
}

// Chamado pelo app após um webhook confirmar pagamento (Fase 3)
export async function activateSubscription(
  companyId: string,
  planId: PlanId,
  providerCustomerId: string,
  providerSubscriptionId: string,
  periodEnd: Timestamp,
) {
  const now = Timestamp.now()
  await updateDoc(doc(db, 'subscriptions', companyId), {
    status: 'active',
    planId,
    provider: 'asaas',
    providerCustomerId,
    providerSubscriptionId,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    limits: PLANS[planId].limits,
    updatedAt: serverTimestamp(),
  })
}

// Verifica se o trial expirou e atualiza o status se necessário
export async function checkAndExpireTrial(sub: CompanySubscription): Promise<SubscriptionStatus> {
  if (sub.status !== 'trialing') return sub.status

  const now = Date.now()
  if (sub.trialEndsAt && sub.trialEndsAt.toMillis() < now) {
    await updateSubscriptionStatus(sub.companyId, 'expired')
    return 'expired'
  }
  return 'trialing'
}

export function getDaysRemaining(sub: CompanySubscription): number {
  if (sub.status === 'trialing' && sub.trialEndsAt) {
    const diff = sub.trialEndsAt.toMillis() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }
  if (sub.status === 'active' || sub.status === 'past_due') {
    const diff = sub.currentPeriodEnd.toMillis() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }
  return 0
}

export function canWrite(status: SubscriptionStatus): boolean {
  return status === 'trialing' || status === 'active'
}

export function hasAccess(status: SubscriptionStatus): boolean {
  return status === 'trialing' || status === 'active' || status === 'past_due' || status === 'canceled'
}
