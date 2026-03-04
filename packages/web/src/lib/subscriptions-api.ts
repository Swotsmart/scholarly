/**
 * Subscription & Payment API Client
 *
 * 39 endpoints across two route files:
 *   subscriptions.ts (21): plans, subscribe, lifecycle, trials, seats, members, entitlements, invoices, analytics
 *   payment.ts (18): accounts, invoices, payments, payouts, refunds, profile builder, webhooks
 *
 * Backend: routes/subscriptions.ts (1,144L) + routes/payment.ts (467L)
 */

import type {
  SubscriptionPlan, Subscription, SeatResult, SeatRemovalResult,
  TrialProgress, EntitlementsResult, EntitlementCheck, Invoice, Payment,
  SubscriptionAnalytics, PaymentAccount, Payout, Refund,
  ProfileBuilderSession, ProfileDraft, SubscriptionMember,
  SubscribeInput, CancelSubscriptionInput, ChangePlanInput,
  AddSeatInput, AssignSeatInput, AddMemberInput, PayInvoiceInput,
  CreateAccountInput, CreatePayoutInput, CreateRefundInput,
  SubscriptionSeat, ApiResponse,
} from '@/types/subscriptions';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SUB_BASE = `${API_BASE}/api/v1/subscriptions`;
const PAY_BASE = `${API_BASE}/api/v1/payments`;

// =============================================================================
// DEMO DATA
// =============================================================================

const now = new Date().toISOString();

const demoPlans: SubscriptionPlan[] = [
  { id: 'plan_starter_au', name: 'Starter', slug: 'starter', description: 'Perfect for individual learners and small families.', tier: 'starter', currency: 'AUD', prices: [{ billingCycle: 'monthly', amount: 0, displayAmount: 'Free' }], features: [{ key: 'max_learners', label: 'Learners', value: 2 }, { key: 'ai_buddy_messages', label: 'AI Buddy messages/month', value: 50 }], entitlements: ['basic_curriculum', 'ai_buddy_limited', 'portfolio_basic'], isPublic: true, trialDays: 0, tenantId: 'tenant-demo', createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 'plan_family_au', name: 'Family', slug: 'family', description: 'Ideal for homeschool families needing full curriculum support.', tier: 'family', currency: 'AUD', prices: [{ billingCycle: 'monthly', amount: 2900, displayAmount: '$29.00/mo' }, { billingCycle: 'annual', amount: 29000, displayAmount: '$290.00/yr' }], features: [{ key: 'max_learners', label: 'Learners', value: 6 }, { key: 'homeschool_compliance', label: 'NESA/VRQA compliance', value: true }], entitlements: ['full_curriculum', 'ai_buddy_standard', 'homeschool_compliance', 'relief_marketplace', 'linguaflow_basic'], isPublic: true, trialDays: 14, tenantId: 'tenant-demo', createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 'plan_school_au', name: 'School', slug: 'school', description: 'For registered schools and micro-schools.', tier: 'school', currency: 'AUD', prices: [{ billingCycle: 'annual', amount: 599000, displayAmount: '$5,990.00/yr' }], features: [{ key: 'max_learners', label: 'Learners', value: 500 }, { key: 'eduscrum', label: 'EduScrum orchestration', value: true }], entitlements: ['full_curriculum', 'ai_buddy_unlimited', 'eduscrum', 'analytics_advanced', 'lti_integration', 'ssi_credentials'], isPublic: true, trialDays: 30, tenantId: 'tenant-demo', createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
  { id: 'plan_district_au', name: 'District', slug: 'district', description: 'Enterprise plan for education districts.', tier: 'enterprise', currency: 'AUD', prices: [{ billingCycle: 'annual', amount: null, displayAmount: 'Contact us' }], features: [{ key: 'max_learners', label: 'Learners', value: 'unlimited' }, { key: 'sla', label: 'SLA', value: '99.95%' }], entitlements: ['all'], isPublic: true, trialDays: 0, tenantId: 'tenant-demo', createdAt: '2025-01-15T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
];

const demoSub: Subscription = {
  id: 'sub_demo_family_001', tenantId: 'tenant-demo', userId: 'user-demo-001',
  planId: 'plan_family_au', planName: 'Family', status: 'active', billingCycle: 'annual',
  currentPeriodStart: '2025-09-01T00:00:00Z', currentPeriodEnd: '2026-09-01T00:00:00Z',
  trialStart: null, trialEnd: null, seats: 4, usedSeats: 3, cancelAtPeriodEnd: false,
  metadata: { jurisdiction: 'WA', homeschoolRegNo: 'WA-HS-2025-5678' },
  members: [
    { userId: 'user-demo-001', email: 'sarah@example.com', role: 'owner', joinedAt: '2025-08-15T10:00:00Z' },
    { userId: 'user-child-001', email: null, role: 'member', joinedAt: '2025-08-15T10:05:00Z' },
    { userId: 'user-child-002', email: null, role: 'member', joinedAt: '2025-08-15T10:06:00Z' },
  ],
  entitlements: ['full_curriculum', 'ai_buddy_standard', 'portfolio_full', 'homeschool_compliance', 'relief_marketplace', 'linguaflow_basic'],
  createdAt: '2025-08-15T10:00:00Z', updatedAt: now,
};

const demoInvoices: Invoice[] = [
  { id: 'inv_2025_09_001', subscriptionId: 'sub_demo_family_001', tenantId: 'tenant-demo', userId: 'user-demo-001', status: 'paid', currency: 'AUD', subtotal: 29000, tax: 2900, taxRate: 10, taxLabel: 'GST', total: 31900, displayTotal: '$319.00', billingPeriodStart: '2025-09-01T00:00:00Z', billingPeriodEnd: '2026-09-01T00:00:00Z', lineItems: [{ description: 'Family Plan - Annual', quantity: 1, unitPrice: 29000, amount: 29000 }], paidAt: '2025-09-01T00:05:00Z', paymentMethod: 'Visa ending 4242', invoiceUrl: 'https://billing.scholarly.app/invoices/inv_2025_09_001', createdAt: '2025-09-01T00:00:00Z' },
];

const demoAnalytics: SubscriptionAnalytics = {
  tenantId: 'tenant-demo', period: 'last_30_days', generatedAt: now,
  summary: { totalSubscriptions: 1247, activeSubscriptions: 1089, trialingSubscriptions: 98, pausedSubscriptions: 23, cancelledThisPeriod: 37, newThisPeriod: 142 },
  mrr: { current: 4523700, previous: 4198200, growthPercent: 7.75, currency: 'AUD', displayCurrent: '$45,237.00' },
  arr: { current: 54284400, currency: 'AUD', displayCurrent: '$542,844.00' },
  churn: { rate: 2.97, previousRate: 3.45, voluntaryChurn: 2.1, involuntaryChurn: 0.87 },
  trialConversion: { rate: 72.4, averageTrialDays: 11.3, topConversionPlan: 'Family' },
  planDistribution: [{ planId: 'plan_starter_au', planName: 'Starter', count: 412, percent: 33.0 }, { planId: 'plan_family_au', planName: 'Family', count: 534, percent: 42.8 }, { planId: 'plan_school_au', planName: 'School', count: 127, percent: 10.2 }, { planId: 'plan_district_au', planName: 'District', count: 16, percent: 1.3 }],
  revenueByJurisdiction: [{ jurisdiction: 'NSW', revenue: 1582000, percent: 35 }, { jurisdiction: 'VIC', revenue: 1131000, percent: 25 }, { jurisdiction: 'QLD', revenue: 905000, percent: 20 }, { jurisdiction: 'WA', revenue: 452000, percent: 10 }],
  topFeatureUsage: [{ feature: 'ai_buddy', usagePercent: 89.2 }, { feature: 'portfolio', usagePercent: 76.5 }, { feature: 'curriculum_browser', usagePercent: 71.3 }],
};

// =============================================================================
// API CLIENT
// =============================================================================

class SubscriptionApiClient {
  private async req<T>(method: string, base: string, endpoint: string, body?: unknown): Promise<T> {
    const res = await fetch(`${base}${endpoint}`, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`); }
    const json = await res.json();
    return json.data ?? json;
  }
  private sub<T>(method: string, ep: string, body?: unknown) { return this.req<T>(method, SUB_BASE, ep, body); }
  private pay<T>(method: string, ep: string, body?: unknown) { return this.req<T>(method, PAY_BASE, ep, body); }

  // =========================================================================
  // PLANS (2)
  // =========================================================================
  async getPlans(): Promise<{ plans: SubscriptionPlan[] }> { if (DEMO_MODE) return { plans: demoPlans }; return this.sub('GET', '/plans'); }
  async getPlan(planId: string): Promise<{ plan: SubscriptionPlan }> { if (DEMO_MODE) return { plan: demoPlans.find(p => p.id === planId) || demoPlans[0] }; return this.sub('GET', `/plans/${planId}`); }

  // =========================================================================
  // SUBSCRIPTION LIFECYCLE (7)
  // =========================================================================
  async subscribe(input: SubscribeInput): Promise<{ subscription: Subscription }> { if (DEMO_MODE) return { subscription: { ...demoSub, id: `sub_${Date.now()}`, planId: input.planId, status: input.options?.trialDays ? 'trialing' : 'active', createdAt: now, updatedAt: now } }; return this.sub('POST', '/subscribe', input); }
  async getMySubscriptions(): Promise<{ subscriptions: Subscription[] }> { if (DEMO_MODE) return { subscriptions: [demoSub] }; return this.sub('GET', '/my-subscriptions'); }
  async getSubscription(id: string): Promise<{ subscription: Subscription }> { if (DEMO_MODE) return { subscription: demoSub }; return this.sub('GET', `/${id}`); }
  async cancelSubscription(id: string, input: CancelSubscriptionInput): Promise<{ subscription: Partial<Subscription> }> { if (DEMO_MODE) return { subscription: { ...demoSub, id, status: input.immediate ? 'cancelled' : 'active', cancelAtPeriodEnd: !input.immediate } }; return this.sub('POST', `/${id}/cancel`, input); }
  async pauseSubscription(id: string): Promise<{ subscription: Partial<Subscription> }> { if (DEMO_MODE) return { subscription: { id, status: 'paused', pausedAt: now } }; return this.sub('POST', `/${id}/pause`); }
  async resumeSubscription(id: string): Promise<{ subscription: Partial<Subscription> }> { if (DEMO_MODE) return { subscription: { id, status: 'active', resumedAt: now } }; return this.sub('POST', `/${id}/resume`); }
  async changePlan(id: string, input: ChangePlanInput): Promise<{ subscription: Partial<Subscription> }> { if (DEMO_MODE) return { subscription: { id, planId: input.newPlanId, previousPlanId: 'plan_family_au' } }; return this.sub('POST', `/${id}/change-plan`, input); }

  // =========================================================================
  // TRIALS (2)
  // =========================================================================
  async getTrialProgress(id: string): Promise<{ trialProgress: TrialProgress }> { if (DEMO_MODE) return { trialProgress: { subscriptionId: id, tenantId: 'tenant-demo', userId: 'user-demo-001', planId: 'plan_family_au', trialStart: '2025-11-01T00:00:00Z', trialEnd: '2025-11-15T00:00:00Z', daysRemaining: 7, daysElapsed: 7, totalDays: 14, percentComplete: 50, usage: { aiMessages: { used: 120, limit: 500, percentUsed: 24 }, portfolioStorage: { usedMb: 450, limitMb: 5000, percentUsed: 9 }, learnersAdded: { used: 2, limit: 6, percentUsed: 33 }, lessonsCompleted: 15, homeschoolReportsGenerated: 2 }, conversionLikelihood: 'high', conversionRecommendation: 'Active homeschool compliance usage — emphasise NESA reporting.' } }; return this.sub('GET', `/${id}/trial-progress`); }
  async convertTrial(id: string): Promise<{ subscription: Partial<Subscription> }> { if (DEMO_MODE) return { subscription: { id, status: 'active' } }; return this.sub('POST', `/${id}/convert-trial`); }

  // =========================================================================
  // SEATS (3)
  // =========================================================================
  async addSeat(subId: string, input?: AddSeatInput): Promise<SeatResult> { if (DEMO_MODE) return { seat: { id: `seat_${Date.now()}`, subscriptionId: subId, tenantId: 'tenant-demo', label: input?.label || null, status: 'available', assignedUserId: null, assignedAt: null, createdAt: now }, totalSeats: 5, usedSeats: 3, availableSeats: 2, prorationCharge: { amount: 725, currency: 'AUD', description: 'Prorated seat addition' } }; return this.sub('POST', `/${subId}/seats`, input); }
  async assignSeat(subId: string, seatId: string, input: AssignSeatInput): Promise<{ seat: SubscriptionSeat }> { if (DEMO_MODE) return { seat: { id: seatId, subscriptionId: subId, tenantId: 'tenant-demo', label: null, status: 'assigned', assignedUserId: input.userId, assignedRole: input.role, assignedAt: now, createdAt: now } as SubscriptionSeat }; return this.sub('PUT', `/${subId}/seats/${seatId}/assign`, input); }
  async removeSeat(subId: string, seatId: string): Promise<SeatRemovalResult> { if (DEMO_MODE) return { removed: true, seatId, totalSeats: 3, usedSeats: 2, availableSeats: 1, creditAmount: { amount: 725, currency: 'AUD', description: 'Prorated seat removal credit' } }; return this.sub('DELETE', `/${subId}/seats/${seatId}`); }

  // =========================================================================
  // MEMBERS (2)
  // =========================================================================
  async addMember(subId: string, input: AddMemberInput): Promise<{ member: SubscriptionMember }> { if (DEMO_MODE) return { member: { id: `member_${Date.now()}`, userId: input.userId, email: input.email || null, role: input.role || 'member', joinedAt: now } }; return this.sub('POST', `/${subId}/members`, input); }
  async removeMember(subId: string, memberId: string): Promise<{ removed: boolean }> { if (DEMO_MODE) return { removed: true }; return this.sub('DELETE', `/${subId}/members/${memberId}`); }

  // =========================================================================
  // ENTITLEMENTS (2)
  // =========================================================================
  async getEntitlements(): Promise<EntitlementsResult> { if (DEMO_MODE) return { userId: 'user-demo-001', tenantId: 'tenant-demo', activeSubscriptions: ['sub_demo_family_001'], effectivePlan: 'family', entitlements: [{ key: 'full_curriculum', label: 'Full Australian Curriculum Access', granted: true, source: 'plan_family_au' }, { key: 'ai_buddy_standard', label: 'AI Buddy - Standard', granted: true, source: 'plan_family_au', limits: { messagesPerMonth: 500, currentUsage: 127 } }, { key: 'homeschool_compliance', label: 'NESA/VRQA Homeschool Compliance', granted: true, source: 'plan_family_au' }, { key: 'eduscrum', label: 'EduScrum Orchestration', granted: false, requiredPlan: 'school' }], evaluatedAt: now }; return this.sub('GET', '/entitlements'); }
  async checkEntitlement(key: string): Promise<EntitlementCheck> { if (DEMO_MODE) return { entitlement: { key, granted: ['full_curriculum', 'ai_buddy_standard', 'homeschool_compliance'].includes(key), label: key }, userId: 'user-demo-001', tenantId: 'tenant-demo', checkedAt: now }; return this.sub('GET', `/entitlements/${key}/check`); }

  // =========================================================================
  // INVOICES & PAYMENTS (2 subscription-side)
  // =========================================================================
  async getInvoices(subId: string): Promise<{ invoices: Invoice[] }> { if (DEMO_MODE) return { invoices: demoInvoices }; return this.sub('GET', `/${subId}/invoices`); }
  async payInvoice(subId: string, invoiceId: string, input?: PayInvoiceInput): Promise<{ payment: Payment }> { if (DEMO_MODE) return { payment: { id: `pay_${Date.now()}`, invoiceId, subscriptionId: subId, tenantId: 'tenant-demo', userId: 'user-demo-001', amount: input?.amount || 31900, currency: 'AUD', status: 'succeeded', paymentMethodId: input?.paymentMethodId || 'pm_default', reference: input?.reference || null, processedAt: now, createdAt: now } }; return this.sub('POST', `/${subId}/invoices/${invoiceId}/pay`, input); }

  // =========================================================================
  // ANALYTICS (1)
  // =========================================================================
  async getAnalytics(period?: string): Promise<{ analytics: SubscriptionAnalytics }> { if (DEMO_MODE) return { analytics: demoAnalytics }; const qs = period ? `?period=${period}` : ''; return this.sub('GET', `/analytics${qs}`); }

  // =========================================================================
  // PAYMENT SERVICE: ACCOUNTS (4)
  // =========================================================================
  async createAccount(input: CreateAccountInput): Promise<PaymentAccount> { if (DEMO_MODE) return { id: `acc_${Date.now()}`, tenantId: 'tenant-demo', name: input.name, type: input.type, status: 'pending', balance: { available: 0, pending: 0, currency: 'AUD' }, createdAt: now }; return this.pay('POST', '/accounts', input); }
  async getAccount(accountId: string): Promise<PaymentAccount> { if (DEMO_MODE) return { id: accountId, tenantId: 'tenant-demo', name: 'Primary Account', type: 'provider', status: 'active', balance: { available: 125000, pending: 15000, currency: 'AUD' }, createdAt: '2025-06-01T00:00:00Z' }; return this.pay('GET', `/accounts/${accountId}`); }
  async startOnboarding(accountId: string): Promise<{ onboardingUrl: string }> { if (DEMO_MODE) return { onboardingUrl: 'https://connect.stripe.com/onboarding/demo' }; return this.pay('POST', `/accounts/${accountId}/onboarding`); }
  async completeOnboarding(accountId: string): Promise<PaymentAccount> { if (DEMO_MODE) return { id: accountId, tenantId: 'tenant-demo', name: 'Primary Account', type: 'provider', status: 'active', balance: { available: 0, pending: 0, currency: 'AUD' }, createdAt: now }; return this.pay('POST', `/accounts/${accountId}/onboarding/complete`); }

  // =========================================================================
  // PAYMENT SERVICE: INVOICES (3)
  // =========================================================================
  async createInvoice(input: { accountId: string; lineItems: Array<{ description: string; amount: number }> }): Promise<Invoice> { if (DEMO_MODE) return demoInvoices[0]; return this.pay('POST', '/invoices', input); }
  async getInvoice(invoiceId: string): Promise<Invoice> { if (DEMO_MODE) return demoInvoices[0]; return this.pay('GET', `/invoices/${invoiceId}`); }
  async sendInvoice(invoiceId: string): Promise<{ sent: boolean }> { if (DEMO_MODE) return { sent: true }; return this.pay('POST', `/invoices/${invoiceId}/send`); }

  // =========================================================================
  // PAYMENT SERVICE: PAYMENTS, PAYOUTS, REFUNDS (3)
  // =========================================================================
  async processPayment(invoiceId: string, input?: { paymentMethodId?: string }): Promise<Payment> { if (DEMO_MODE) return { id: `pay_${Date.now()}`, invoiceId, subscriptionId: '', tenantId: 'tenant-demo', userId: 'user-demo-001', amount: 31900, currency: 'AUD', status: 'succeeded', paymentMethodId: input?.paymentMethodId || 'pm_default', reference: null, processedAt: now, createdAt: now }; return this.pay('POST', `/invoices/${invoiceId}/pay`, input); }
  async createPayout(input: CreatePayoutInput): Promise<Payout> { if (DEMO_MODE) return { id: `payout_${Date.now()}`, accountId: input.accountId, amount: input.amount, currency: input.currency || 'AUD', status: 'pending', method: input.method || 'bank_transfer', createdAt: now }; return this.pay('POST', '/payouts', input); }
  async createRefund(input: CreateRefundInput): Promise<Refund> { if (DEMO_MODE) return { id: `refund_${Date.now()}`, paymentId: input.paymentId, amount: input.amount, currency: 'AUD', reason: input.reason, status: 'pending', createdAt: now }; return this.pay('POST', '/refunds', input); }

  // =========================================================================
  // PAYMENT SERVICE: AI PROFILE BUILDER (5)
  // =========================================================================
  async startProfileSession(): Promise<ProfileBuilderSession> { if (DEMO_MODE) return { id: `session_${Date.now()}`, tenantId: 'tenant-demo', status: 'in_progress', currentQuestionIndex: 0, totalQuestions: 8, answers: {}, createdAt: now }; return this.pay('POST', '/profile/sessions'); }
  async getProfileSession(sessionId: string): Promise<ProfileBuilderSession> { if (DEMO_MODE) return { id: sessionId, tenantId: 'tenant-demo', status: 'in_progress', currentQuestionIndex: 3, totalQuestions: 8, answers: {}, createdAt: now }; return this.pay('GET', `/profile/sessions/${sessionId}`); }
  async answerProfileQuestion(sessionId: string, answer: Record<string, unknown>): Promise<ProfileBuilderSession> { if (DEMO_MODE) return { id: sessionId, tenantId: 'tenant-demo', status: 'in_progress', currentQuestionIndex: 4, totalQuestions: 8, answers: answer, createdAt: now }; return this.pay('POST', `/profile/sessions/${sessionId}/answer`, answer); }
  async generateProfileDrafts(sessionId: string): Promise<{ drafts: ProfileDraft[] }> { if (DEMO_MODE) return { drafts: [{ id: 'draft-1', sessionId, style: 'professional', content: {}, selected: false }, { id: 'draft-2', sessionId, style: 'friendly', content: {}, selected: false }] }; return this.pay('POST', `/profile/sessions/${sessionId}/generate`); }
  async selectProfileDraft(sessionId: string, draftId: string): Promise<{ draft: ProfileDraft }> { if (DEMO_MODE) return { draft: { id: draftId, sessionId, style: 'professional', content: {}, selected: true } }; return this.pay('POST', `/profile/sessions/${sessionId}/select`, { draftId }); }
  async publishProfile(sessionId: string): Promise<{ published: boolean }> { if (DEMO_MODE) return { published: true }; return this.pay('POST', `/profile/sessions/${sessionId}/publish`); }
}

export const subscriptionApi = new SubscriptionApiClient();
