/**
 * Universal Subscription Engine - Type Definitions
 * 
 * A comprehensive subscription management system designed to work across
 * multiple platforms (Chekd-ID, Scholarly, and future products).
 * 
 * Key Capabilities:
 * - Multi-tenant, multi-vendor subscription management
 * - KYC-gated plan access with credential requirements
 * - Seat-based pricing for institutional customers
 * - Intent-based trial system with conversion tracking
 * - Family/group subscription support
 * - Institutional billing (invoicing, PO support)
 * - Credential-linked entitlements with expiry handling
 * - Flexible revenue share mechanics
 * 
 * @version 2.0.0
 * @author Chekd Platform Team
 */

// ============================================================================
// CORE ENUMS
// ============================================================================

/**
 * Subscription lifecycle states
 */
export enum SubscriptionStatus {
  /** In trial period, no payment taken yet */
  TRIALING = 'trialing',
  /** Active and in good standing */
  ACTIVE = 'active',
  /** Payment failed, in retry period */
  PAST_DUE = 'past_due',
  /** Temporarily paused by customer */
  PAUSED = 'paused',
  /** Canceled but access continues until period end */
  CANCELED = 'canceled',
  /** Payment failed after all retries */
  UNPAID = 'unpaid',
  /** Subscription has ended */
  EXPIRED = 'expired',
  /** Awaiting approval (institutional) */
  PENDING_APPROVAL = 'pending_approval',
  /** Suspended due to compliance issue */
  SUSPENDED = 'suspended'
}

/**
 * Plan tiers for feature gating and display
 */
export enum PlanTier {
  FREE = 'free',
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom'
}

/**
 * Pricing models supported
 */
export enum PricingModel {
  /** Fixed recurring amount */
  RECURRING = 'recurring',
  /** Based on consumption/usage */
  USAGE = 'usage',
  /** Price varies by quantity tier */
  TIERED = 'tiered',
  /** Single payment, no recurrence */
  ONE_TIME = 'one_time',
  /** Per-seat/per-user pricing */
  PER_SEAT = 'per_seat',
  /** Hybrid: base + per-seat */
  BASE_PLUS_SEAT = 'base_plus_seat'
}

/**
 * Billing intervals
 */
export enum BillingInterval {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

/**
 * Subscription types
 */
export enum SubscriptionType {
  /** Single user subscription */
  INDIVIDUAL = 'individual',
  /** Family with multiple members */
  FAMILY = 'family',
  /** Team/small business */
  TEAM = 'team',
  /** Institutional (school, enterprise) */
  INSTITUTIONAL = 'institutional'
}

/**
 * Billing types
 */
export enum BillingType {
  /** Immediate card/bank payment */
  IMMEDIATE = 'immediate',
  /** Invoice with payment terms */
  INVOICE = 'invoice'
}

/**
 * Invoice payment terms
 */
export enum InvoiceTerms {
  DUE_ON_RECEIPT = 'due_on_receipt',
  NET_7 = 'net_7',
  NET_15 = 'net_15',
  NET_30 = 'net_30',
  NET_45 = 'net_45',
  NET_60 = 'net_60',
  NET_90 = 'net_90'
}

/**
 * Invoice status
 */
export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  VOID = 'void',
  DISPUTED = 'disputed'
}

/**
 * Entitlement types
 */
export enum EntitlementType {
  /** Binary feature flag */
  FEATURE = 'feature',
  /** Access to specific resource/module */
  ACCESS = 'access',
  /** Percentage discount */
  DISCOUNT = 'discount',
  /** Priority in queues/matching */
  PRIORITY = 'priority',
  /** Increase a limit */
  LIMIT_INCREASE = 'limit_increase',
  /** Numeric quota (API calls, storage, etc.) */
  QUOTA = 'quota',
  /** Credits to spend */
  CREDITS = 'credits',
  /** Module access (platform-specific) */
  MODULE_ACCESS = 'module_access',
  /** Seat allocation */
  SEAT_ALLOCATION = 'seat_allocation'
}

/**
 * KYC verification levels
 */
export enum KycLevel {
  /** No verification */
  ANONYMOUS = 0,
  /** Email verified only */
  EMAIL_VERIFIED = 1,
  /** Government ID verified */
  IDENTITY_VERIFIED = 2,
  /** Enhanced with credentials (WWCC, etc.) */
  CREDENTIAL_VERIFIED = 3,
  /** Full business verification */
  BUSINESS_VERIFIED = 4
}

/**
 * Credential types that can gate entitlements
 */
export enum CredentialType {
  WWCC = 'wwcc',
  DBS = 'dbs',
  PVG = 'pvg',
  TEACHING_REGISTRATION = 'teaching_registration',
  FIRST_AID = 'first_aid',
  BUSINESS_REGISTRATION = 'business_registration',
  PROFESSIONAL_INSURANCE = 'professional_insurance',
  DRIVERS_LICENSE = 'drivers_license',
  FOOD_SAFETY = 'food_safety',
  RSA = 'rsa',  // Responsible Service of Alcohol
  SECURITY_LICENSE = 'security_license'
}

/**
 * Credential status
 */
export enum CredentialStatus {
  PENDING = 'pending',
  VALID = 'valid',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  SUSPENDED = 'suspended',
  NOT_FOUND = 'not_found'
}

/**
 * Dunning status for failed payments
 */
export enum DunningStatus {
  NONE = 'none',
  PAST_DUE = 'past_due',
  GRACE_PERIOD = 'grace_period',
  FINAL_NOTICE = 'final_notice',
  UNPAID = 'unpaid'
}

/**
 * Proration behavior for plan changes
 */
export enum ProrationBehavior {
  /** Change takes effect immediately, prorate billing */
  IMMEDIATE_PRORATE = 'immediate_prorate',
  /** Change takes effect immediately, charge full amount */
  IMMEDIATE_FULL = 'immediate_full',
  /** Change takes effect at next billing cycle */
  NEXT_CYCLE = 'next_cycle',
  /** Create credit for unused time */
  CREATE_CREDIT = 'create_credit'
}

/**
 * Seat status
 */
export enum SeatStatus {
  AVAILABLE = 'available',
  ASSIGNED = 'assigned',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

// ============================================================================
// PLATFORM CONFIGURATION
// ============================================================================

/**
 * Platform-specific module definitions
 * Each platform defines its own modules that can be used in entitlements
 */
export interface PlatformModules {
  [moduleKey: string]: {
    name: string;
    description: string;
    category?: string;
  };
}

/**
 * Chekd-ID platform modules
 */
export const CHEKD_MODULES: PlatformModules = {
  'vault': { name: 'Vault', description: 'Secure credential storage', category: 'core' },
  'trust': { name: 'Trust', description: 'Trust scoring engine', category: 'core' },
  'verify': { name: 'Verify', description: 'Identity verification', category: 'core' },
  'aem': { name: 'AEM', description: 'Adaptive Experience Manager', category: 'engagement' },
  'crm': { name: 'CRM', description: 'Customer relationship management', category: 'business' },
  'lms': { name: 'LMS', description: 'Learning management system', category: 'learning' },
  'concierge': { name: 'Concierge', description: 'AI assistant', category: 'ai' },
  'phyto': { name: 'Phyto', description: 'Cannabis compliance', category: 'vertical' },
  'marketplace': { name: 'Marketplace', description: 'Product marketplace', category: 'commerce' }
};

/**
 * Scholarly platform modules
 */
export const SCHOLARLY_MODULES: PlatformModules = {
  'enrollment': { name: 'Enrollment', description: 'Student enrollment & prior learning', category: 'sis' },
  'assessment': { name: 'Assessment', description: 'Formative & summative assessment', category: 'sis' },
  'gradebook': { name: 'Gradebook', description: 'Standards-based grading', category: 'sis' },
  'attendance': { name: 'Attendance', description: 'Attendance tracking & patterns', category: 'sis' },
  'wellbeing': { name: 'Wellbeing', description: 'Student wellbeing monitoring', category: 'sis' },
  'parent_portal': { name: 'Parent Portal', description: 'Family communication hub', category: 'sis' },
  'scheduling': { name: 'Scheduling', description: 'Timetable generation', category: 'operations' },
  'relief': { name: 'Relief Marketplace', description: 'Relief teacher management', category: 'operations' },
  'curriculum': { name: 'Curriculum Curator', description: 'Curriculum intelligence', category: 'intelligence' },
  'homeschool_hub': { name: 'Homeschool Hub', description: 'Homeschool family support', category: 'community' },
  'micro_school': { name: 'Micro-School', description: 'Micro-school management', category: 'community' },
  'tutor_booking': { name: 'Tutor Booking', description: 'Tutor discovery & booking', category: 'tutoring' },
  'content_marketplace': { name: 'Content Marketplace', description: 'Educational content trading', category: 'commerce' },
  'ai_buddy': { name: 'AI Buddy', description: 'Conversational learning assistant', category: 'ai' },
  'content_studio': { name: 'Content Studio', description: 'AI content generation', category: 'ai' },
  'lis_bridge': { name: 'LIS Bridge', description: 'Learning intelligence integration', category: 'intelligence' }
};

// ============================================================================
// PRICING INTERFACES
// ============================================================================

/**
 * Volume discount tier
 */
export interface VolumeDiscount {
  /** Minimum quantity for this tier */
  minQuantity: number;
  /** Maximum quantity (null = unlimited) */
  maxQuantity?: number;
  /** Discount percentage */
  discountPercent: number;
}

/**
 * Usage-based pricing configuration
 */
export interface UsageConfig {
  /** Name of the unit being measured */
  unitName: string;
  /** Price per unit */
  pricePerUnit: number;
  /** Units included in base price */
  includedUnits: number;
  /** Maximum units allowed (null = unlimited) */
  maxUnits?: number;
  /** How to handle overage */
  overageBehavior: 'charge' | 'block' | 'notify';
}

/**
 * Seat-based pricing configuration
 */
export interface SeatConfig {
  /** Type of seat being counted */
  seatType: 'user' | 'student' | 'child' | 'staff' | 'device' | 'location';
  /** Price per seat per billing period */
  pricePerSeat: number;
  /** Seats included in base price */
  includedSeats: number;
  /** Minimum seats required */
  minSeats: number;
  /** Maximum seats allowed (null = unlimited) */
  maxSeats?: number;
  /** Volume discounts for seat quantity */
  volumeDiscounts?: VolumeDiscount[];
  /** Allow mid-cycle seat additions */
  allowMidCycleAdditions: boolean;
  /** Prorate added seats */
  prorateAdditions: boolean;
}

/**
 * Tiered pricing configuration
 */
export interface TieredPricingConfig {
  tiers: {
    upTo: number | null;  // null = unlimited
    unitPrice: number;
    flatFee?: number;
  }[];
  /** 'volume' = all units at tier price, 'graduated' = each tier priced separately */
  mode: 'volume' | 'graduated';
}

/**
 * Complete pricing configuration
 */
export interface PlanPricing {
  /** Pricing model */
  model: PricingModel;
  
  /** Base amount (for recurring, one-time, or base in hybrid) */
  amount: number;
  
  /** Currency code (ISO 4217) */
  currency: string;
  
  /** Billing interval */
  interval: BillingInterval;
  
  /** Number of intervals (e.g., 3 months) */
  intervalCount: number;
  
  /** Trial period in days */
  trialDays?: number;
  
  /** One-time setup fee */
  setupFee?: number;
  
  /** Usage-based configuration */
  usageConfig?: UsageConfig;
  
  /** Seat-based configuration */
  seatConfig?: SeatConfig;
  
  /** Tiered pricing configuration */
  tieredConfig?: TieredPricingConfig;
  
  /** Billing type */
  billingType: BillingType;
  
  /** Invoice terms (if billing type is invoice) */
  invoiceTerms?: InvoiceTerms;
  
  /** Require purchase order for invoices */
  requiresPurchaseOrder?: boolean;
  
  /** Minimum contract length in months */
  minimumContractMonths?: number;
  
  /** Annual discount percentage (if paying yearly) */
  annualDiscountPercent?: number;
}

// ============================================================================
// ENTITLEMENT INTERFACES
// ============================================================================

/**
 * Entitlement definition within a plan
 */
export interface PlanEntitlement {
  /** Unique key for this entitlement */
  key: string;
  
  /** Type of entitlement */
  type: EntitlementType;
  
  /** Value (interpretation depends on type) */
  value: any;
  
  /** Human-readable description */
  description: string;
  
  /** Platform module this entitlement applies to */
  module?: string;
  
  /** Credential required to receive this entitlement */
  requiredCredential?: CredentialType;
  
  /** If true, entitlement revoked when credential expires */
  credentialMustBeValid?: boolean;
  
  /** Scope of who receives this entitlement in group subscriptions */
  memberScope?: 'primary_only' | 'all_members' | 'children_only' | 'adults_only';
  
  /** Is this entitlement visible to users */
  isVisible: boolean;
  
  /** Display order */
  displayOrder?: number;
}

/**
 * Granted entitlement (active on a user)
 */
export interface GrantedEntitlement {
  id: string;
  userId: string;
  subscriptionId: string;
  entitlementKey: string;
  type: EntitlementType;
  value: any;
  module?: string;
  
  /** When this entitlement was granted */
  grantedAt: Date;
  
  /** When this entitlement expires (null = when subscription ends) */
  expiresAt?: Date;
  
  /** Current usage (for quota-based) */
  currentUsage?: number;
  
  /** Is currently active */
  isActive: boolean;
  
  /** If suspended, the reason */
  suspensionReason?: string;
}

// ============================================================================
// KYC & COMPLIANCE INTERFACES
// ============================================================================

/**
 * KYC requirements for a plan
 */
export interface PlanKycRequirements {
  /** Minimum KYC level required */
  minimumLevel: KycLevel;
  
  /** Specific credentials required */
  requiredCredentials?: CredentialType[];
  
  /** Whether credentials must be currently valid (not just verified once) */
  credentialsMustBeValid?: boolean;
  
  /** Custom compliance checks */
  customChecks?: {
    key: string;
    description: string;
    required: boolean;
  }[];
}

/**
 * User's KYC status
 */
export interface UserKycStatus {
  userId: string;
  level: KycLevel;
  
  /** Verified credentials */
  credentials: {
    type: CredentialType;
    status: CredentialStatus;
    verifiedAt?: Date;
    expiresAt?: Date;
    documentReference?: string;
  }[];
  
  /** Identity verification details */
  identityVerification?: {
    provider: string;
    verifiedAt: Date;
    documentType: string;
    documentCountry: string;
  };
  
  /** Business verification (for KYB) */
  businessVerification?: {
    businessName: string;
    registrationNumber: string;
    registrationType: string;
    verifiedAt: Date;
    jurisdiction: string;
  };
}

// ============================================================================
// TRIAL INTERFACES
// ============================================================================

/**
 * Trial intent types (platform-specific)
 */
export type TrialIntent = string;  // Platform defines specific intents

/**
 * Trial configuration
 */
export interface TrialConfig {
  /** Intent this trial is for */
  intent: TrialIntent;
  
  /** Duration in days */
  durationDays: number;
  
  /** Entitlements available during trial */
  trialEntitlements: PlanEntitlement[];
  
  /** Limits during trial */
  trialLimits?: {
    key: string;
    limit: number;
    description: string;
  }[];
  
  /** Success metrics to track */
  successMetrics: {
    key: string;
    name: string;
    target?: number;
    conversionIndicator: boolean;  // If true, achieving this suggests ready to convert
  }[];
  
  /** Conversion triggers */
  conversionTriggers?: {
    /** Metric key */
    metric: string;
    /** Threshold value */
    threshold: number;
    /** Message to show user */
    message: string;
    /** Suggested plan to upgrade to */
    suggestedPlanId?: string;
  }[];
  
  /** Plan to convert to after trial */
  defaultConversionPlanId?: string;
  
  /** Require payment method before trial starts */
  requirePaymentMethod: boolean;
  
  /** KYC level required to start trial */
  requiredKycLevel: KycLevel;
}

/**
 * Trial progress tracking
 */
export interface TrialProgress {
  subscriptionId: string;
  intent: TrialIntent;
  
  /** Days remaining */
  daysRemaining: number;
  
  /** Percentage of trial elapsed */
  percentComplete: number;
  
  /** Metrics achieved */
  metrics: {
    key: string;
    name: string;
    current: number;
    target?: number;
    achieved: boolean;
  }[];
  
  /** Limits usage */
  limitsUsage: {
    key: string;
    used: number;
    limit: number;
    percentUsed: number;
  }[];
  
  /** Conversion readiness score (0-100) */
  conversionReadinessScore: number;
  
  /** Active conversion triggers */
  activeConversionTriggers: {
    metric: string;
    message: string;
    suggestedPlanId?: string;
  }[];
  
  /** Suggested next actions */
  suggestedActions: string[];
}

// ============================================================================
// SUBSCRIPTION PLAN INTERFACE
// ============================================================================

/**
 * Subscription plan definition
 */
export interface SubscriptionPlan {
  id: string;
  
  /** Tenant owning this plan */
  tenantId: string;
  
  /** Vendor offering this plan (can be same as tenant for platform plans) */
  vendorId: string;
  
  /** Plan name */
  name: string;
  
  /** Plan description */
  description: string;
  
  /** Feature bullet points for marketing */
  features: string[];
  
  /** Plan tier */
  tier: PlanTier;
  
  /** Pricing configuration */
  pricing: PlanPricing;
  
  /** Entitlements granted */
  entitlements: PlanEntitlement[];
  
  /** KYC requirements */
  kycRequirements?: PlanKycRequirements;
  
  /** Trial configurations by intent */
  trialConfigs?: Record<TrialIntent, TrialConfig>;
  
  /** Default trial config (if no intent specified) */
  defaultTrialConfig?: TrialConfig;
  
  /** Plan limits */
  limits?: {
    /** Maximum subscribers */
    maxSubscribers?: number;
    /** Available from date */
    availableFrom?: Date;
    /** Available until date */
    availableUntil?: Date;
    /** Geographic restrictions */
    allowedCountries?: string[];
    /** Blocked countries */
    blockedCountries?: string[];
  };
  
  /** Platform fee percentage */
  platformFeePercent: number;
  
  /** Plan status */
  status: 'draft' | 'active' | 'paused' | 'archived' | 'coming_soon';
  
  /** Whether this is visible in plan listings */
  isPublic: boolean;
  
  /** Whether this requires approval to subscribe */
  requiresApproval: boolean;
  
  /** Plans this can upgrade to */
  upgradePaths?: string[];
  
  /** Plans this can downgrade to */
  downgradePaths?: string[];
  
  /** Current subscriber count */
  subscriberCount: number;
  
  /** Total revenue generated */
  totalRevenue: number;
  
  /** Metadata */
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SUBSCRIPTION INTERFACES
// ============================================================================

/**
 * Subscription seat
 */
export interface SubscriptionSeat {
  id: string;
  subscriptionId: string;
  
  /** User assigned to this seat */
  userId?: string;
  
  /** Seat status */
  status: SeatStatus;
  
  /** Type of seat */
  seatType: string;
  
  /** Display name (for unassigned seats) */
  displayName?: string;
  
  /** Who assigned this seat */
  assignedBy?: string;
  
  /** When assigned */
  assignedAt?: Date;
  
  /** Invitation sent (for pending seats) */
  invitationSentAt?: Date;
  invitationEmail?: string;
  
  /** Seat-specific entitlement overrides */
  entitlementOverrides?: Partial<PlanEntitlement>[];
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription member (for family/team subscriptions)
 */
export interface SubscriptionMember {
  id: string;
  subscriptionId: string;
  
  /** Member's user ID */
  userId: string;
  
  /** Role in the subscription */
  role: 'primary' | 'admin' | 'member' | 'child';
  
  /** When they joined */
  joinedAt: Date;
  
  /** Who added them */
  addedBy: string;
  
  /** Member-specific entitlement overrides */
  entitlementOverrides?: Partial<PlanEntitlement>[];
  
  /** Is currently active */
  isActive: boolean;
}

/**
 * Subscription invoice
 */
export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  tenantId: string;
  
  /** Invoice number (human readable) */
  invoiceNumber: string;
  
  /** Invoice status */
  status: InvoiceStatus;
  
  /** Line items */
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
  }[];
  
  /** Subtotal before tax */
  subtotal: number;
  
  /** Tax amount */
  taxAmount: number;
  
  /** Total amount due */
  totalAmount: number;
  
  /** Amount paid so far */
  amountPaid: number;
  
  /** Amount remaining */
  amountDue: number;
  
  /** Currency */
  currency: string;
  
  /** Issue date */
  issuedAt: Date;
  
  /** Due date */
  dueAt: Date;
  
  /** When paid (if paid) */
  paidAt?: Date;
  
  /** Purchase order number */
  purchaseOrderNumber?: string;
  
  /** Payment terms */
  terms: InvoiceTerms;
  
  /** Notes */
  notes?: string;
  
  /** PDF URL */
  pdfUrl?: string;
  
  /** Billing address */
  billingAddress?: {
    name: string;
    organization?: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  
  /** Reminders sent */
  remindersSent: {
    sentAt: Date;
    type: 'upcoming' | 'due' | 'overdue';
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Main subscription interface
 */
export interface Subscription {
  id: string;
  
  /** Tenant */
  tenantId: string;
  
  /** Plan subscribed to */
  planId: string;
  
  /** Vendor offering the plan */
  vendorId: string;
  
  /** Primary customer/account holder */
  customerId: string;
  
  /** Subscription type */
  type: SubscriptionType;
  
  /** Current status */
  status: SubscriptionStatus;
  
  // ---- Billing Period ----
  
  /** Current period start */
  currentPeriodStart: Date;
  
  /** Current period end */
  currentPeriodEnd: Date;
  
  /** When subscription will cancel (if scheduled) */
  cancelAt?: Date;
  
  /** When cancellation was requested */
  canceledAt?: Date;
  
  /** When subscription actually ended */
  endedAt?: Date;
  
  // ---- Trial ----
  
  /** Trial start date */
  trialStart?: Date;
  
  /** Trial end date */
  trialEnd?: Date;
  
  /** Trial intent */
  trialIntent?: TrialIntent;
  
  /** Trial metrics */
  trialMetrics?: Record<string, number>;
  
  /** Trial limits usage */
  trialLimitsUsed?: Record<string, number>;
  
  // ---- Payment ----
  
  /** External subscription ID (Stripe, etc.) */
  externalSubscriptionId?: string;
  
  /** External customer ID */
  externalCustomerId?: string;
  
  /** Last successful payment date */
  lastPaymentAt?: Date;
  
  /** Last payment amount */
  lastPaymentAmount?: number;
  
  /** Next payment date */
  nextPaymentAt?: Date;
  
  /** Next payment amount (estimated) */
  nextPaymentAmount?: number;
  
  // ---- Usage & Seats ----
  
  /** Current usage (for usage-based) */
  currentUsage?: number;
  
  /** Current seat count */
  seatCount?: number;
  
  /** Seats (for seat-based plans) */
  seats?: SubscriptionSeat[];
  
  // ---- Family/Team ----
  
  /** Members (for family/team subscriptions) */
  members?: SubscriptionMember[];
  
  /** Maximum members allowed */
  maxMembers?: number;
  
  // ---- Institutional Billing ----
  
  /** Purchase order number */
  purchaseOrderNumber?: string;
  
  /** Contract start date */
  contractStartDate?: Date;
  
  /** Contract end date */
  contractEndDate?: Date;
  
  /** Auto-renew contract */
  autoRenew: boolean;
  
  /** Associated invoices */
  invoices?: SubscriptionInvoice[];
  
  // ---- Dunning ----
  
  /** Dunning status */
  dunningStatus: DunningStatus;
  
  /** Failed payment count */
  failedPaymentCount: number;
  
  /** Last dunning action date */
  lastDunningActionAt?: Date;
  
  // ---- Metadata ----
  
  /** Arbitrary metadata */
  metadata?: Record<string, any>;
  
  /** Source of acquisition */
  acquisitionSource?: string;
  
  /** Promo/coupon code used */
  promoCode?: string;
  
  /** Discount applied */
  discountPercent?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// REVENUE SHARE INTERFACES
// ============================================================================

/**
 * Revenue share record
 */
export interface RevenueShare {
  id: string;
  subscriptionId: string;
  planId: string;
  vendorId: string;
  tenantId: string;
  
  /** Gross amount charged */
  grossAmount: number;
  
  /** Platform fee amount */
  platformFee: number;
  
  /** Platform fee percentage applied */
  platformFeePercent: number;
  
  /** Amount to vendor */
  vendorAmount: number;
  
  /** Currency */
  currency: string;
  
  /** Period this covers */
  periodStart: Date;
  periodEnd: Date;
  
  /** When settled to vendor */
  settledAt?: Date;
  
  /** External transaction reference */
  externalTransactionId?: string;
  
  /** Settlement batch ID */
  settlementBatchId?: string;
  
  createdAt: Date;
}

// ============================================================================
// EVENT INTERFACES
// ============================================================================

/**
 * Subscription event
 */
export interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  tenantId: string;
  
  /** Event type */
  type: SubscriptionEventType;
  
  /** Event data */
  data: Record<string, any>;
  
  /** When the event was processed */
  processedAt?: Date;
  
  createdAt: Date;
}

/**
 * Subscription event types
 */
export type SubscriptionEventType =
  // Plan events
  | 'plan.created'
  | 'plan.updated'
  | 'plan.activated'
  | 'plan.paused'
  | 'plan.archived'
  
  // Subscription lifecycle
  | 'subscription.created'
  | 'subscription.activated'
  | 'subscription.trial_started'
  | 'subscription.trial_ending'
  | 'subscription.trial_ended'
  | 'subscription.trial_converted'
  | 'subscription.paused'
  | 'subscription.resumed'
  | 'subscription.canceled'
  | 'subscription.expired'
  | 'subscription.suspended'
  | 'subscription.reactivated'
  
  // Plan changes
  | 'subscription.upgraded'
  | 'subscription.downgraded'
  | 'subscription.plan_changed'
  
  // Payment events
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.disputed'
  
  // Invoice events
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'invoice.overdue'
  | 'invoice.void'
  
  // Seat events
  | 'seat.added'
  | 'seat.assigned'
  | 'seat.unassigned'
  | 'seat.removed'
  
  // Member events
  | 'member.added'
  | 'member.removed'
  | 'member.role_changed'
  
  // Entitlement events
  | 'entitlement.granted'
  | 'entitlement.revoked'
  | 'entitlement.suspended'
  | 'entitlement.quota_exceeded'
  | 'entitlement.quota_warning'
  
  // KYC events
  | 'kyc.required'
  | 'kyc.verified'
  | 'kyc.failed'
  | 'credential.expiring'
  | 'credential.expired'
  | 'credential.revoked'
  
  // Dunning events
  | 'dunning.started'
  | 'dunning.reminder_sent'
  | 'dunning.grace_period_started'
  | 'dunning.final_notice'
  | 'dunning.completed';

// ============================================================================
// SERVICE INPUT/OUTPUT INTERFACES
// ============================================================================

/**
 * Options for subscribing
 */
export interface SubscribeOptions {
  /** Payment method ID (for immediate billing) */
  paymentMethodId?: string;
  
  /** Trial intent (for intent-based trials) */
  trialIntent?: TrialIntent;
  
  /** Initial seat count (for seat-based plans) */
  initialSeatCount?: number;
  
  /** Initial members (for family/team plans) */
  initialMembers?: { userId: string; role: SubscriptionMember['role'] }[];
  
  /** Purchase order number (for institutional) */
  purchaseOrderNumber?: string;
  
  /** Promo code */
  promoCode?: string;
  
  /** Skip trial */
  skipTrial?: boolean;
  
  /** Metadata */
  metadata?: Record<string, any>;
  
  /** Acquisition source */
  acquisitionSource?: string;
}

/**
 * Result of a plan change
 */
export interface PlanChangeResult {
  subscription: Subscription;
  
  /** Amount to charge/credit */
  proratedAmount?: number;
  
  /** Credit applied to account */
  creditApplied?: number;
  
  /** When the change takes effect */
  effectiveAt: Date;
  
  /** Entitlements added */
  entitlementsAdded: string[];
  
  /** Entitlements removed */
  entitlementsRemoved: string[];
}

/**
 * KYC check result
 */
export interface KycCheckResult {
  /** Whether KYC requirements are met */
  passed: boolean;
  
  /** Current KYC level */
  currentLevel: KycLevel;
  
  /** Required KYC level */
  requiredLevel: KycLevel;
  
  /** Missing credentials */
  missingCredentials: CredentialType[];
  
  /** Expired credentials */
  expiredCredentials: CredentialType[];
  
  /** Instructions for user */
  instructions?: string;
  
  /** URL to complete verification */
  verificationUrl?: string;
}

/**
 * Subscription analytics
 */
export interface SubscriptionAnalytics {
  /** Total active subscribers */
  activeSubscribers: number;
  
  /** Subscribers by status */
  subscribersByStatus: Record<SubscriptionStatus, number>;
  
  /** Monthly recurring revenue */
  mrr: number;
  
  /** Annual recurring revenue */
  arr: number;
  
  /** Average revenue per user */
  arpu: number;
  
  /** Churn rate (monthly) */
  churnRate: number;
  
  /** Trial conversion rate */
  trialConversionRate: number;
  
  /** Revenue by plan */
  revenueByPlan: { planId: string; planName: string; revenue: number; subscribers: number }[];
  
  /** Growth metrics */
  growth: {
    newSubscribers: number;
    churned: number;
    netGrowth: number;
    growthRate: number;
  };
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

/**
 * Subscription repository interface
 */
export interface SubscriptionRepository {
  // Plans
  createPlan(plan: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan>;
  getPlan(tenantId: string, planId: string): Promise<SubscriptionPlan | null>;
  updatePlan(tenantId: string, planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan>;
  listPlans(tenantId: string, vendorId?: string, includeArchived?: boolean): Promise<SubscriptionPlan[]>;
  getPublicPlans(tenantId: string): Promise<SubscriptionPlan[]>;
  
  // Subscriptions
  createSubscription(subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription>;
  getSubscription(tenantId: string, subscriptionId: string): Promise<Subscription | null>;
  getSubscriptionByCustomer(tenantId: string, customerId: string, planId?: string): Promise<Subscription | null>;
  updateSubscription(subscriptionId: string, updates: Partial<Subscription>): Promise<Subscription>;
  getActiveSubscriptions(tenantId: string, customerId: string): Promise<Subscription[]>;
  getSubscriptionsDueForRenewal(beforeDate: Date): Promise<Subscription[]>;
  getTrialsEndingSoon(withinDays: number): Promise<Subscription[]>;
  
  // Seats
  createSeat(seat: Omit<SubscriptionSeat, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionSeat>;
  getSeat(subscriptionId: string, seatId: string): Promise<SubscriptionSeat | null>;
  updateSeat(seatId: string, updates: Partial<SubscriptionSeat>): Promise<SubscriptionSeat>;
  deleteSeat(seatId: string): Promise<void>;
  getSeats(subscriptionId: string): Promise<SubscriptionSeat[]>;
  getAvailableSeats(subscriptionId: string): Promise<SubscriptionSeat[]>;
  
  // Members
  addMember(member: Omit<SubscriptionMember, 'id'>): Promise<SubscriptionMember>;
  removeMember(subscriptionId: string, memberId: string): Promise<void>;
  getMembers(subscriptionId: string): Promise<SubscriptionMember[]>;
  getMemberByUserId(subscriptionId: string, userId: string): Promise<SubscriptionMember | null>;
  
  // Invoices
  createInvoice(invoice: Omit<SubscriptionInvoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionInvoice>;
  getInvoice(tenantId: string, invoiceId: string): Promise<SubscriptionInvoice | null>;
  updateInvoice(invoiceId: string, updates: Partial<SubscriptionInvoice>): Promise<SubscriptionInvoice>;
  getInvoices(subscriptionId: string): Promise<SubscriptionInvoice[]>;
  getOverdueInvoices(tenantId: string): Promise<SubscriptionInvoice[]>;
  getNextInvoiceNumber(tenantId: string): Promise<string>;
  
  // Revenue
  createRevenueShare(share: Omit<RevenueShare, 'id' | 'createdAt'>): Promise<RevenueShare>;
  getRevenueShares(subscriptionId: string): Promise<RevenueShare[]>;
  getUnsettledRevenue(vendorId: string): Promise<RevenueShare[]>;
  markRevenueSettled(shareIds: string[], settlementBatchId: string): Promise<void>;
  
  // Entitlements
  grantEntitlement(entitlement: Omit<GrantedEntitlement, 'id'>): Promise<GrantedEntitlement>;
  revokeEntitlement(userId: string, entitlementKey: string): Promise<void>;
  getGrantedEntitlements(userId: string): Promise<GrantedEntitlement[]>;
  checkEntitlement(userId: string, entitlementKey: string): Promise<GrantedEntitlement | null>;
  updateEntitlementUsage(userId: string, entitlementKey: string, usage: number): Promise<void>;
  
  // Events
  createEvent(event: Omit<SubscriptionEvent, 'id' | 'createdAt'>): Promise<SubscriptionEvent>;
  getEvents(subscriptionId: string, limit?: number): Promise<SubscriptionEvent[]>;
  getUnprocessedEvents(): Promise<SubscriptionEvent[]>;
  markEventProcessed(eventId: string): Promise<void>;
  
  // Analytics
  calculateMRR(tenantId: string, vendorId?: string): Promise<number>;
  calculateChurnRate(tenantId: string, vendorId?: string, periodDays?: number): Promise<number>;
  calculateTrialConversionRate(tenantId: string, periodDays?: number): Promise<number>;
  getSubscriberCounts(tenantId: string, vendorId?: string): Promise<Record<SubscriptionStatus, number>>;
  
  // Counters
  incrementSubscriberCount(planId: string): Promise<void>;
  decrementSubscriberCount(planId: string): Promise<void>;
  incrementPlanRevenue(planId: string, amount: number): Promise<void>;
}

/**
 * KYC service interface (external dependency)
 */
export interface KycServiceInterface {
  getUserKycStatus(tenantId: string, userId: string): Promise<UserKycStatus>;
  getCredential(tenantId: string, userId: string, credentialType: CredentialType): Promise<UserKycStatus['credentials'][0] | null>;
  getMissingCredentials(tenantId: string, userId: string, required: CredentialType[]): Promise<CredentialType[]>;
  getExpiredCredentials(tenantId: string, userId: string): Promise<CredentialType[]>;
  getVerificationUrl(tenantId: string, userId: string, requiredLevel: KycLevel): Promise<string>;
}

/**
 * Payment service interface (external dependency)
 */
export interface PaymentServiceInterface {
  createCustomer(tenantId: string, userId: string, email: string): Promise<string>;
  chargeSubscription(subscriptionId: string, amount: number, currency: string): Promise<{ success: boolean; transactionId?: string; error?: string }>;
  refundPayment(transactionId: string, amount?: number): Promise<{ success: boolean; refundId?: string }>;
  createPaymentMethod(customerId: string, paymentDetails: any): Promise<string>;
  getPaymentMethods(customerId: string): Promise<any[]>;
}
