/**
 * Subscription & Payment Type Definitions
 *
 * Types for the subscription engine and payment service:
 * - Plans (tiers, pricing, features, entitlements)
 * - Subscriptions (lifecycle, trials, seats, members)
 * - Entitlements (feature gating, usage limits)
 * - Invoices & Payments
 * - Analytics (MRR, churn, conversion, plan distribution)
 * - Payment Accounts, Payouts, Refunds
 * - AI Profile Builder (conversational onboarding)
 *
 * Backend sources:
 *   subscription-engine-types.ts (1,389L)
 *   payment-types.ts (657L)
 *   routes/subscriptions.ts (1,144L, 21 endpoints)
 *   routes/payment.ts (467L, 18 endpoints)
 */

// =============================================================================
// PLANS
// =============================================================================

export type PlanTier = 'starter' | 'family' | 'school' | 'enterprise';
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';

export interface PlanPrice {
  billingCycle: BillingCycle;
  amount: number | null;
  displayAmount: string;
}

export interface PlanFeature {
  key: string;
  label: string;
  value: number | string | boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  tier: PlanTier;
  currency: string;
  prices: PlanPrice[];
  features: PlanFeature[];
  entitlements: string[];
  isPublic: boolean;
  trialDays: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// SUBSCRIPTIONS
// =============================================================================

export type SubscriptionStatus = 'active' | 'trialing' | 'paused' | 'cancelled' | 'past_due' | 'unpaid';

export interface Subscription {
  id: string;
  tenantId: string;
  userId: string;
  planId: string;
  planName?: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart: string | null;
  trialEnd: string | null;
  seats: number;
  usedSeats?: number;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  cancellationReason?: string | null;
  cancellationFeedback?: string | null;
  effectiveCancelDate?: string;
  pausedAt?: string | null;
  resumedAt?: string | null;
  previousPlanId?: string;
  metadata: Record<string, string>;
  members?: SubscriptionMember[];
  entitlements?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionMember {
  id?: string;
  userId: string;
  email: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status?: string;
  joinedAt: string;
}

// =============================================================================
// SEATS
// =============================================================================

export interface SubscriptionSeat {
  id: string;
  subscriptionId: string;
  tenantId: string;
  label: string | null;
  status: 'available' | 'assigned';
  assignedUserId: string | null;
  assignedRole?: string;
  assignedAt: string | null;
  createdAt: string;
}

export interface SeatResult {
  seat: SubscriptionSeat;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  prorationCharge?: { amount: number; currency: string; description: string };
}

export interface SeatRemovalResult {
  removed: boolean;
  seatId: string;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  creditAmount?: { amount: number; currency: string; description: string };
}

// =============================================================================
// TRIALS
// =============================================================================

export interface TrialUsage {
  aiMessages: { used: number; limit: number; percentUsed: number };
  portfolioStorage: { usedMb: number; limitMb: number; percentUsed: number };
  learnersAdded: { used: number; limit: number; percentUsed: number };
  lessonsCompleted: number;
  homeschoolReportsGenerated: number;
}

export interface TrialProgress {
  subscriptionId: string;
  tenantId: string;
  userId: string;
  planId: string;
  trialStart: string;
  trialEnd: string;
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
  percentComplete: number;
  usage: TrialUsage;
  conversionLikelihood: 'low' | 'medium' | 'high';
  conversionRecommendation: string;
}

// =============================================================================
// ENTITLEMENTS
// =============================================================================

export interface Entitlement {
  key: string;
  label: string;
  granted: boolean;
  source?: string;
  limits?: Record<string, number>;
  withinLimits?: boolean;
  requiredPlan?: string;
  upgradeUrl?: string;
}

export interface EntitlementsResult {
  userId: string;
  tenantId: string;
  activeSubscriptions: string[];
  effectivePlan: string;
  entitlements: Entitlement[];
  evaluatedAt: string;
}

export interface EntitlementCheck {
  entitlement: Entitlement;
  userId: string;
  tenantId: string;
  checkedAt: string;
}

// =============================================================================
// INVOICES
// =============================================================================

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  tenantId: string;
  userId: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'overdue';
  currency: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  taxLabel: string;
  total: number;
  displayTotal: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  lineItems: InvoiceLineItem[];
  paidAt: string | null;
  paymentMethod: string | null;
  invoiceUrl: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  subscriptionId: string;
  tenantId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  paymentMethodId: string;
  reference: string | null;
  processedAt: string;
  createdAt: string;
}

// =============================================================================
// ANALYTICS
// =============================================================================

export interface SubscriptionAnalytics {
  tenantId: string;
  period: string;
  generatedAt: string;
  summary: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    pausedSubscriptions: number;
    cancelledThisPeriod: number;
    newThisPeriod: number;
  };
  mrr: { current: number; previous: number; growthPercent: number; currency: string; displayCurrent: string };
  arr: { current: number; currency: string; displayCurrent: string };
  churn: { rate: number; previousRate: number; voluntaryChurn: number; involuntaryChurn: number };
  trialConversion: { rate: number; averageTrialDays: number; topConversionPlan: string };
  planDistribution: Array<{ planId: string; planName: string; count: number; percent: number }>;
  revenueByJurisdiction: Array<{ jurisdiction: string; revenue: number; percent: number }>;
  topFeatureUsage: Array<{ feature: string; usagePercent: number }>;
}

// =============================================================================
// PAYMENT SERVICE TYPES (accounts, payouts, refunds)
// =============================================================================

export interface PaymentAccount {
  id: string;
  tenantId: string;
  name: string;
  type: 'platform' | 'provider' | 'creator';
  status: 'pending' | 'active' | 'suspended';
  stripeAccountId?: string;
  xeroContactId?: string;
  balance: { available: number; pending: number; currency: string };
  createdAt: string;
}

export interface Payout {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  method: 'bank_transfer' | 'stripe';
  createdAt: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

// =============================================================================
// AI PROFILE BUILDER
// =============================================================================

export interface ProfileBuilderSession {
  id: string;
  tenantId: string;
  status: 'in_progress' | 'drafts_generated' | 'completed';
  currentQuestionIndex: number;
  totalQuestions: number;
  answers: Record<string, unknown>;
  createdAt: string;
}

export interface ProfileDraft {
  id: string;
  sessionId: string;
  style: string;
  content: Record<string, unknown>;
  selected: boolean;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface SubscribeInput {
  planId: string;
  options?: {
    billingCycle?: BillingCycle;
    seats?: number;
    couponCode?: string;
    trialDays?: number;
    paymentMethodId?: string;
    metadata?: Record<string, string>;
  };
}

export interface CancelSubscriptionInput {
  immediate?: boolean;
  reason?: string;
  feedback?: string;
}

export interface ChangePlanInput {
  newPlanId: string;
  proration?: 'immediate' | 'next_cycle' | 'none';
}

export interface AddSeatInput {
  quantity?: number;
  label?: string;
}

export interface AssignSeatInput {
  userId: string;
  role?: string;
}

export interface AddMemberInput {
  userId: string;
  email?: string;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface PayInvoiceInput {
  paymentMethodId?: string;
  amount?: number;
  reference?: string;
}

export interface CreateAccountInput {
  name: string;
  type: 'platform' | 'provider' | 'creator';
}

export interface CreatePayoutInput {
  accountId: string;
  amount: number;
  currency?: string;
  method?: 'bank_transfer' | 'stripe';
}

export interface CreateRefundInput {
  paymentId: string;
  amount: number;
  reason: string;
}

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
