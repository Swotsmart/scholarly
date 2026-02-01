/**
 * Scholarly Payment Service - Type Definitions
 * 
 * Complete type system for the financial infrastructure of the Scholarly platform.
 * Think of this as the vocabulary that describes every financial conversation
 * in the educational ecosystem - from a parent paying for tutoring to a school
 * managing term fees, from tutor payouts to token rewards.
 * 
 * ## The Financial Intelligence Mesh
 * 
 * Just as the Intelligence Mesh makes student data flow seamlessly between modules,
 * the Payment Service makes financial transactions flow naturally through educational
 * relationships. Every payment carries educational context, every invoice tells a
 * learning story.
 * 
 * Imagine a river system: parents, schools, and students are the tributaries feeding
 * into the main channel (Scholarly), which then distributes water (funds) to the 
 * recipients (tutors, content creators, service providers). The types defined here
 * are the banks and channels that ensure the water flows where it should.
 * 
 * @module ScholarlyPayment/Types
 * @version 1.0.0
 */

// ============================================================================
// CORE RESULT TYPE (Consistent with Scholarly patterns)
// ============================================================================

export type Result<T, E = PaymentError> = 
  | { success: true; data: T }
  | { success: false; error: E };

export const success = <T>(data: T): Result<T, never> => ({ success: true, data });
export const failure = <E>(error: E): Result<never, E> => ({ success: false, error });

// ============================================================================
// ERROR TYPES
// ============================================================================

export class PaymentError extends Error {
  constructor(
    public readonly code: PaymentErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export type PaymentErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'AUTHORIZATION_ERROR'
  | 'INSUFFICIENT_FUNDS'
  | 'PAYMENT_FAILED'
  | 'PAYOUT_FAILED'
  | 'STRIPE_ERROR'
  | 'XERO_ERROR'
  | 'ACCOUNT_SUSPENDED'
  | 'INVOICE_ALREADY_PAID'
  | 'REFUND_EXCEEDS_PAYMENT'
  | 'INTEGRATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';

export class ValidationError extends PaymentError {
  constructor(message: string, field?: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, { field, ...details });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends PaymentError {
  constructor(entityType: string, entityId: string) {
    super('NOT_FOUND', `${entityType} not found: ${entityId}`, { entityType, entityId });
    this.name = 'NotFoundError';
  }
}

export class InsufficientFundsError extends PaymentError {
  constructor(accountId: string, required: number, available: number) {
    super('INSUFFICIENT_FUNDS', `Insufficient funds: required ${required}, available ${available}`, {
      accountId,
      required,
      available
    });
    this.name = 'InsufficientFundsError';
  }
}

export class StripeIntegrationError extends PaymentError {
  constructor(message: string, stripeCode?: string, details?: Record<string, unknown>) {
    super('STRIPE_ERROR', message, { stripeCode, ...details });
    this.name = 'StripeIntegrationError';
  }
}

export class XeroIntegrationError extends PaymentError {
  constructor(message: string, xeroCode?: string, details?: Record<string, unknown>) {
    super('XERO_ERROR', message, { xeroCode, ...details });
    this.name = 'XeroIntegrationError';
  }
}

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Types of financial account owners in Scholarly
 * Each type has different capabilities and fee structures
 */
export type AccountOwnerType = 
  | 'school'           // Traditional or private school
  | 'micro_school'     // Small independent school
  | 'tutor'            // Individual tutor
  | 'tutoring_centre'  // Commercial tutoring business
  | 'homeschool_coop'  // Homeschool cooperative
  | 'parent'           // Parent making payments
  | 'content_creator'; // Creator selling on marketplace

/**
 * Legal entity types for compliance and tax purposes
 */
export type LegalEntityType =
  | 'individual'       // Natural person
  | 'sole_trader'      // Sole proprietorship
  | 'company'          // Corporation (Pty Ltd, Ltd, Inc)
  | 'trust'            // Trust structure
  | 'partnership'      // Business partnership
  | 'non_profit';      // Charity or non-profit

/**
 * Account status progression
 */
export type AccountStatus =
  | 'pending_setup'    // Account created, awaiting onboarding
  | 'onboarding'       // In Stripe Connect onboarding
  | 'pending_review'   // Awaiting manual review
  | 'active'           // Fully operational
  | 'suspended'        // Temporarily disabled
  | 'closed';          // Permanently closed

/**
 * Currencies supported (initially AUD-focused with expansion planned)
 */
export type Currency = 'AUD' | 'GBP' | 'USD' | 'CAD' | 'NZD' | 'SGD';

/**
 * Fee categories for educational contexts
 */
export type FeeCategory =
  | 'tuition'           // Core tuition/tutoring fees
  | 'enrollment'        // One-time enrollment fees
  | 'materials'         // Books, supplies, resources
  | 'technology'        // Device levy, software access
  | 'excursion'         // Field trips, activities
  | 'uniform'           // Uniform costs
  | 'examination'       // Exam fees
  | 'tutoring'          // Tutoring sessions
  | 'co_curricular'     // Sports, music, clubs
  | 'boarding'          // Boarding fees
  | 'transport'         // Bus/transport
  | 'catering'          // Meals
  | 'facility'          // Building fund, maintenance
  | 'insurance'         // Student insurance
  | 'late_payment'      // Penalty fees
  | 'marketplace'       // Content marketplace purchases
  | 'subscription'      // Platform subscription fees
  | 'other';

/**
 * Pricing model types
 */
export type PricingType =
  | 'fixed'             // Single fixed amount
  | 'per_term'          // Per academic term
  | 'per_semester'      // Per semester
  | 'annual'            // Annual fee
  | 'hourly'            // Per hour (tutoring)
  | 'per_session'       // Per session
  | 'package'           // Package of sessions
  | 'subscription';     // Recurring subscription

/**
 * Invoice status states
 */
export type InvoiceStatus =
  | 'draft'             // Being prepared
  | 'pending'           // Ready to send
  | 'sent'              // Sent to recipient
  | 'viewed'            // Recipient has opened
  | 'partial'           // Partially paid
  | 'paid'              // Fully paid
  | 'overdue'           // Past due date
  | 'void'              // Cancelled
  | 'written_off';      // Bad debt

/**
 * Payment methods
 */
export type PaymentMethod =
  | 'card'              // Credit/debit card
  | 'bank_transfer'     // Direct bank transfer
  | 'direct_debit'      // BECS/ACH direct debit
  | 'bpay'              // Australian BPAY
  | 'payid'             // Australian PayID
  | 'token'             // EDU-Nexus token payment
  | 'cash'              // Cash (manual record)
  | 'cheque';           // Cheque (manual record)

/**
 * Payout status progression
 */
export type PayoutStatus =
  | 'calculating'       // Being calculated
  | 'pending'           // Awaiting processing
  | 'processing'        // In transit
  | 'in_transit'        // Bank processing
  | 'paid'              // Successfully paid
  | 'failed'            // Payment failed
  | 'cancelled';        // Manually cancelled

/**
 * Payout schedule options
 */
export type PayoutSchedule =
  | 'instant'           // Immediate (higher fee)
  | 'daily'             // Daily batch
  | 'weekly'            // Weekly batch (default)
  | 'fortnightly'       // Every two weeks
  | 'monthly';          // Monthly batch

/**
 * Refund reasons
 */
export type RefundReason =
  | 'requested_by_customer'
  | 'duplicate_payment'
  | 'fraudulent'
  | 'session_cancelled_by_tutor'
  | 'session_cancelled_by_student'
  | 'quality_issue'
  | 'policy_withdrawal'
  | 'other';

/**
 * Xero sync status
 */
export type XeroSyncStatus =
  | 'pending'           // Not yet synced
  | 'syncing'           // Currently syncing
  | 'synced'            // Successfully synced
  | 'error'             // Sync failed
  | 'manual';           // Manually managed

// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantEntity extends BaseEntity {
  tenantId: string;
}

export interface AuditInfo {
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// FINANCIAL ACCOUNT
// ============================================================================

/**
 * Every participant in Scholarly has a Financial Account - the nexus of their 
 * money matters. Think of it as a wallet that knows who you are, what you're
 * allowed to do, and how to get money to your bank account.
 */
export interface FinancialAccount extends TenantEntity {
  // Owner identification
  ownerType: AccountOwnerType;
  ownerId: string;                    // Reference to user/school/tutor entity
  ownerName: string;
  ownerEmail: string;
  
  // Legal entity details (for compliance)
  legalEntity: LegalEntityDetails;
  
  // Current balances (all in cents to avoid floating point issues)
  balances: AccountBalances;
  
  // Stripe Connect integration
  stripeConnect: StripeConnectDetails;
  
  // Xero integration (optional)
  xeroIntegration: XeroIntegrationDetails | null;
  
  // Payout destination
  payoutMethod: PayoutMethodDetails | null;
  
  // Account settings
  settings: AccountSettings;
  
  // Lifetime statistics
  stats: AccountStatistics;
  
  // Status
  status: AccountStatus;
  statusReason: string | null;
  statusChangedAt: Date | null;
  
  // Verification
  verificationLevel: AccountVerificationLevel;
  kycStatus: KYCStatus;
  
  // Audit
  audit: AuditInfo;
}

export interface LegalEntityDetails {
  type: LegalEntityType;
  legalName: string;
  tradingName: string | null;
  
  // Australian business identifiers
  abn: string | null;                 // Australian Business Number
  acn: string | null;                 // Australian Company Number
  
  // Tax details
  gstRegistered: boolean;
  taxFileNumber: string | null;       // Encrypted at rest
  
  // International identifiers (for future expansion)
  vatNumber: string | null;           // UK/EU VAT
  einNumber: string | null;           // US EIN
  
  // Contact for legal matters
  legalAddress: PostalAddress | null;
  legalContact: ContactDetails | null;
}

export interface PostalAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface ContactDetails {
  name: string;
  email: string;
  phone: string | null;
}

export interface AccountBalances {
  available: number;                  // Can withdraw now (cents)
  pending: number;                    // Incoming, not yet settled (cents)
  reserved: number;                   // Held for disputes/refunds (cents)
  tokenBalance: number;               // EDU-Nexus tokens
  lastUpdatedAt: Date;
}

export interface StripeConnectDetails {
  accountId: string | null;           // acct_xxx
  accountType: 'express' | 'standard' | 'custom';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  
  // Onboarding state
  onboardingComplete: boolean;
  onboardingUrl: string | null;
  
  // Outstanding requirements
  requirements: StripeRequirement[];
  
  // Capabilities
  capabilities: {
    cardPayments: 'active' | 'inactive' | 'pending';
    transfers: 'active' | 'inactive' | 'pending';
    auBecsDebit: 'active' | 'inactive' | 'pending';
  };
}

export interface StripeRequirement {
  requirement: string;                // e.g., "individual.verification.document"
  dueDate: Date | null;
  currentlyDue: boolean;
  eventuallyDue: boolean;
  pastDue: boolean;
  errors: { code: string; reason: string }[];
}

export interface XeroIntegrationDetails {
  tenantId: string;                   // Xero organisation ID
  tenantName: string;                 // Organisation name
  contactId: string;                  // Contact ID in Xero
  
  // Account mappings
  defaultRevenueAccount: string;
  defaultExpenseAccount: string;
  defaultBankAccount: string | null;
  
  // Sync configuration
  syncEnabled: boolean;
  autoSyncInvoices: boolean;
  autoSyncPayments: boolean;
  
  // Status
  connectionStatus: 'connected' | 'disconnected' | 'expired';
  lastSyncAt: Date | null;
  lastSyncStatus: XeroSyncStatus;
  lastSyncError: string | null;
  
  // OAuth tokens (encrypted)
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}

export interface PayoutMethodDetails {
  type: 'bank_account' | 'debit_card';
  
  // Bank account details (masked)
  bankName: string | null;
  accountName: string;
  bsb: string | null;                 // Australian BSB (masked: xxx-xxx)
  accountNumber: string;              // Last 4 digits only
  
  // Stripe payment method ID
  stripePaymentMethodId: string;
  
  // Verification
  verified: boolean;
  verifiedAt: Date | null;
}

export interface AccountSettings {
  // Payout settings
  autoPayoutEnabled: boolean;
  payoutSchedule: PayoutSchedule;
  payoutThreshold: number;            // Minimum balance before auto-payout (cents)
  payoutCurrency: Currency;
  
  // Invoice settings
  currency: Currency;
  invoicePrefix: string;              // e.g., "BGS-" for Brighton Grammar School
  invoiceNumberSequence: number;
  defaultPaymentTerms: number;        // Days
  lateFeeEnabled: boolean;
  lateFeePercentage: number | null;   // Applied after due date
  lateFeeGraceDays: number;           // Days after due before late fee
  
  // Reminders
  sendReminders: boolean;
  reminderSchedule: number[];         // Days relative to due date [-7, -3, -1, 1, 7]
  reminderChannels: ('email' | 'sms' | 'push')[];
  
  // Tax settings
  defaultTaxRate: number;             // Percentage (e.g., 10 for GST)
  taxInclusive: boolean;              // Prices include tax by default
  
  // Notifications
  emailOnPaymentReceived: boolean;
  emailOnPayoutProcessed: boolean;
  emailOnInvoiceViewed: boolean;
  
  // Timezone for scheduling
  timezone: string;
}

export interface AccountStatistics {
  lifetimeReceived: number;           // Total received (cents)
  lifetimePaid: number;               // Total paid out (cents)
  lifetimeFees: number;               // Total platform fees (cents)
  lifetimeRefunded: number;           // Total refunded (cents)
  
  invoicesIssued: number;
  invoicesPaid: number;
  invoicesOverdue: number;
  
  averagePaymentDays: number;         // Average days to receive payment
  onTimePaymentRate: number;          // Percentage of on-time payments
  
  payoutsProcessed: number;
  averagePayoutAmount: number;        // Average payout (cents)
  
  disputeCount: number;
  disputeRate: number;                // Disputes / transactions
  
  lastTransactionAt: Date | null;
  lastPayoutAt: Date | null;
}

export type AccountVerificationLevel =
  | 'unverified'                      // No verification done
  | 'email_verified'                  // Email confirmed
  | 'identity_verified'               // KYC completed
  | 'bank_verified'                   // Bank account verified
  | 'fully_verified';                 // All checks complete

export interface KYCStatus {
  status: 'not_started' | 'pending' | 'approved' | 'rejected' | 'review_required';
  submittedAt: Date | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  documentsRequired: string[];
  documentsSubmitted: string[];
}

// ============================================================================
// FEE STRUCTURE
// ============================================================================

/**
 * Fee structures define what can be charged. Think of them as templates
 * that schools and tutors set up to describe their pricing. When it's time
 * to invoice, these templates are used to calculate the actual amounts.
 */
export interface FeeStructure extends TenantEntity {
  accountId: string;
  
  // Description
  name: string;
  description: string;
  category: FeeCategory;
  
  // What this fee applies to
  applicability: FeeApplicability;
  
  // Pricing configuration
  pricing: FeePricing;
  
  // Tax configuration
  taxConfig: FeeTaxConfig;
  
  // Billing schedule
  billingSchedule: BillingSchedule | null;
  
  // Refund policy
  refundPolicy: RefundPolicy;
  
  // Variations (discounts, siblings, early payment)
  variations: FeeVariation[];
  
  // Payment plan options
  paymentPlans: PaymentPlanTemplate[];
  
  // Status
  status: 'active' | 'archived';
  effectiveFrom: Date;
  effectiveTo: Date | null;
  
  // Audit
  audit: AuditInfo;
}

export interface FeeApplicability {
  // Apply to specific offerings
  offeringIds: string[] | null;
  
  // Apply to year levels
  yearLevels: string[] | null;
  
  // Apply to student types
  studentTypes: ('new' | 'continuing' | 'international' | 'scholarship')[] | null;
  
  // Apply to all
  applyToAll: boolean;
}

export interface FeePricing {
  type: PricingType;
  amount: number;                     // Base amount in cents
  currency: Currency;
  
  // For packages
  packageQuantity: number | null;     // e.g., 10 sessions
  
  // For subscriptions
  subscriptionInterval: 'week' | 'month' | 'quarter' | 'year' | null;
}

export interface FeeTaxConfig {
  gstApplicable: boolean;
  gstInclusive: boolean;
  taxCode: string | null;             // Xero tax code for accounting
  taxRate: number;                    // Percentage
}

export interface BillingSchedule {
  type: 'on_enrollment' | 'recurring' | 'on_completion' | 'milestone';
  
  // For recurring
  recurringConfig: {
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'termly' | 'annually';
    dayOfMonth: number | null;        // 1-28 for monthly
    weekday: number | null;           // 0-6 for weekly
    advanceBilling: boolean;          // Bill in advance or arrears
  } | null;
  
  // For milestone
  milestones: {
    description: string;
    percentage: number;               // Percentage of total
    triggerEvent: string | null;      // Event that triggers this milestone
  }[] | null;
}

export interface RefundPolicy {
  fullRefundDays: number;             // Days before start for full refund
  partialRefundDays: number;          // Days for partial refund
  partialRefundPercentage: number;    // Percentage refunded
  noRefundDays: number;               // Days before start - no refund
  administrationFee: number | null;   // Fee deducted from refunds (cents)
  customPolicy: string | null;        // Free text policy description
}

export interface FeeVariation {
  id: string;
  name: string;                       // e.g., "Sibling Discount", "Early Payment"
  condition: FeeVariationCondition;
  adjustment: {
    type: 'percentage' | 'fixed';
    value: number;                    // Percentage (negative for discount) or cents
  };
  stackable: boolean;                 // Can combine with other variations
  priority: number;                   // Order of application (lower = first)
}

export interface FeeVariationCondition {
  type: 'sibling' | 'early_payment' | 'multi_subject' | 'loyalty' | 'scholarship' | 'custom';
  
  // For early_payment
  earlyPaymentDays: number | null;    // Days before due date
  
  // For sibling
  siblingPosition: number | null;     // 2 = second child, 3 = third, etc.
  
  // For loyalty
  minimumMonths: number | null;       // Months as customer
  
  // For multi_subject
  minimumSubjects: number | null;
  
  // For custom
  customCondition: string | null;
}

export interface PaymentPlanTemplate {
  id: string;
  name: string;                       // e.g., "4 Monthly Installments"
  installments: number;
  frequency: 'weekly' | 'fortnightly' | 'monthly';
  setupFee: number | null;            // One-time setup fee (cents)
  interestRate: number;               // Annual interest rate (usually 0)
  requiresApproval: boolean;          // Manual approval required
  minimumAmount: number | null;       // Minimum invoice amount eligible (cents)
  maximumAmount: number | null;       // Maximum invoice amount eligible (cents)
}

// ============================================================================
// INVOICE
// ============================================================================

/**
 * The heart of the payment system. An invoice tells the complete story:
 * who owes what, for which student, for what services, and when it's due.
 */
export interface Invoice extends TenantEntity {
  // Issuer (who's sending the invoice)
  issuerId: string;                   // Financial account ID
  issuerAccountId: string;            // Reference for display
  issuerDetails: InvoicePartyDetails;
  
  // Recipient (who's paying)
  recipientId: string;                // Financial account ID or external
  recipientType: 'parent' | 'student' | 'family' | 'organisation' | 'external';
  recipientDetails: InvoicePartyDetails;
  
  // Student context (for educational invoices)
  studentId: string | null;
  studentName: string | null;
  enrollmentId: string | null;
  
  // Invoice identification
  invoiceNumber: string;              // Formatted: "BGS-2024-00001"
  reference: string | null;           // External reference
  purchaseOrderNumber: string | null;
  
  // Dates
  issueDate: Date;
  dueDate: Date;
  periodStart: Date | null;           // For term/period fees
  periodEnd: Date | null;
  
  // Line items
  lineItems: InvoiceLineItem[];
  
  // Totals (all in cents)
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: Currency;
  
  // Payment status
  status: InvoiceStatus;
  statusHistory: InvoiceStatusChange[];
  
  // Payments received
  payments: InvoicePayment[];
  
  // Payment plan (if applicable)
  paymentPlan: InvoicePaymentPlan | null;
  
  // Reminders sent
  reminders: InvoiceReminder[];
  
  // Notes
  notes: string | null;               // Customer-facing notes
  internalNotes: string | null;       // Internal notes
  terms: string | null;               // Payment terms text
  
  // Xero integration
  xeroSync: InvoiceXeroSync | null;
  
  // Stripe integration
  stripeInvoiceId: string | null;
  stripePaymentIntentId: string | null;
  
  // URLs
  viewUrl: string | null;             // URL for recipient to view/pay
  pdfUrl: string | null;              // Generated PDF URL
  
  // Metadata
  metadata: Record<string, unknown>;
  
  // Audit
  audit: AuditInfo;
}

export interface InvoicePartyDetails {
  name: string;
  email: string;
  phone: string | null;
  address: PostalAddress | null;
  abn: string | null;
}

export interface InvoiceLineItem {
  id: string;
  
  // What
  description: string;
  feeStructureId: string | null;      // Link to fee structure
  category: FeeCategory;
  
  // Quantity and pricing
  quantity: number;
  unitPrice: number;                  // Price per unit (cents)
  amount: number;                     // quantity * unitPrice (cents)
  
  // Period (for recurring items)
  periodStart: Date | null;
  periodEnd: Date | null;
  
  // Tax
  taxRate: number;
  taxAmount: number;
  taxCode: string | null;
  
  // Discount applied
  discountPercentage: number | null;
  discountAmount: number | null;
  discountReason: string | null;
  
  // Accounting integration
  accountCode: string | null;         // Xero account code
  trackingCategories: { name: string; option: string }[] | null;
  
  // Metadata
  metadata: Record<string, unknown> | null;
}

export interface InvoiceStatusChange {
  status: InvoiceStatus;
  changedAt: Date;
  changedBy: string;
  reason: string | null;
}

export interface InvoicePayment {
  id: string;
  
  // Amount
  amount: number;                     // Amount paid (cents)
  currency: Currency;
  
  // Method
  method: PaymentMethod;
  
  // Stripe details
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  
  // Card details (masked)
  cardBrand: string | null;
  cardLast4: string | null;
  
  // Status
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  failureReason: string | null;
  
  // Dates
  paidAt: Date;
  processedAt: Date | null;
  
  // Receipt
  receiptUrl: string | null;
  receiptNumber: string | null;
  
  // Audit
  createdBy: string;
  createdAt: Date;
}

export interface InvoicePaymentPlan {
  planId: string;
  templateId: string;                 // Which template was used
  templateName: string;
  
  // Schedule
  totalInstallments: number;
  installmentAmount: number;          // Each installment (cents)
  frequency: 'weekly' | 'fortnightly' | 'monthly';
  
  // Progress
  installmentsPaid: number;
  nextInstallmentDate: Date | null;
  nextInstallmentAmount: number | null;
  
  // Status
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  
  // Direct debit setup
  directDebitMandateId: string | null;
  directDebitStatus: 'pending' | 'active' | 'cancelled' | null;
}

export interface InvoiceReminder {
  id: string;
  type: 'upcoming' | 'due' | 'overdue';
  channel: 'email' | 'sms' | 'push';
  sentAt: Date;
  daysFromDue: number;                // Negative = before due, positive = after
  deliveryStatus: 'sent' | 'delivered' | 'failed' | 'bounced';
  openedAt: Date | null;
}

export interface InvoiceXeroSync {
  invoiceId: string;                  // Xero invoice ID
  invoiceNumber: string;              // Xero invoice number
  status: XeroSyncStatus;
  lastSyncAt: Date;
  errorMessage: string | null;
  
  // Line item mappings
  lineItemMappings: { localId: string; xeroId: string }[];
  
  // Payment sync
  paymentsSynced: number;
  lastPaymentSyncAt: Date | null;
}

// ============================================================================
// PAYOUT
// ============================================================================

/**
 * Payouts move money from Scholarly to tutors and schools.
 * Think of it as payday - we've collected payments, now we distribute
 * the earnings (minus our modest platform fee).
 */
export interface Payout extends TenantEntity {
  accountId: string;
  
  // Amounts (all in cents)
  amount: number;                     // Net payout amount
  currency: Currency;
  
  // Breakdown
  breakdown: PayoutBreakdown;
  
  // Source transactions
  transactions: PayoutTransaction[];
  
  // Stripe integration
  stripePayoutId: string | null;
  stripeTransferId: string | null;
  
  // Destination
  destinationBankName: string | null;
  destinationLast4: string;
  
  // Status
  status: PayoutStatus;
  statusHistory: { status: PayoutStatus; at: Date; reason: string | null }[];
  
  // Timing
  scheduledFor: Date | null;
  initiatedAt: Date | null;
  estimatedArrival: Date | null;
  arrivedAt: Date | null;
  
  // Failure handling
  failureCode: string | null;
  failureReason: string | null;
  retryCount: number;
  lastRetryAt: Date | null;
  
  // Statement
  statementDescriptor: string;
  statementPeriod: {
    from: Date;
    to: Date;
  };
  
  // Xero integration
  xeroPaymentId: string | null;
  xeroSyncStatus: XeroSyncStatus;
  
  // Audit
  audit: AuditInfo;
}

export interface PayoutBreakdown {
  grossEarnings: number;              // Total earnings before fees
  platformFees: number;               // Scholarly's cut
  paymentProcessingFees: number;      // Stripe fees
  refundsDeducted: number;            // Refunds from this period
  adjustments: number;                // Manual adjustments
  taxWithheld: number;                // Tax withholding (if applicable)
  netPayout: number;                  // Final amount = grossEarnings - all deductions
}

export interface PayoutTransaction {
  invoiceId: string;
  invoiceNumber: string;
  paidAt: Date;
  
  grossAmount: number;
  platformFee: number;
  processingFee: number;
  netAmount: number;
  
  studentName: string | null;
  description: string;
}

// ============================================================================
// REFUND
// ============================================================================

export interface Refund extends TenantEntity {
  // References
  invoiceId: string;
  paymentId: string;
  accountId: string;
  
  // Amount
  amount: number;                     // Refund amount (cents)
  currency: Currency;
  
  // Reason
  reason: RefundReason;
  reasonDescription: string | null;
  
  // Stripe
  stripeRefundId: string | null;
  stripeStatus: 'pending' | 'succeeded' | 'failed' | 'cancelled' | null;
  
  // Status
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  processedAt: Date | null;
  failureReason: string | null;
  
  // Impact on payout
  deductedFromPayoutId: string | null;
  
  // Audit
  audit: AuditInfo;
}

// ============================================================================
// AI FINANCIAL INTELLIGENCE
// ============================================================================

/**
 * AI-powered insights transform raw payment data into actionable intelligence.
 * This is where the "Financial Intelligence Mesh" shines - predicting cash flow,
 * identifying at-risk invoices, and recommending actions.
 */
export interface AIFinancialInsights {
  accountId: string;
  generatedAt: Date;
  modelVersion: string;
  
  // Cash flow prediction
  cashFlowForecast: CashFlowForecast;
  
  // Payment behaviour analysis
  paymentBehaviour: PaymentBehaviourAnalysis;
  
  // Revenue insights
  revenueInsights: RevenueInsights;
  
  // Recommendations
  recommendations: FinancialRecommendation[];
  
  // Anomaly detection
  anomalies: FinancialAnomaly[];
  
  // Compliance alerts
  complianceAlerts: ComplianceAlert[];
}

export interface CashFlowForecast {
  next30Days: { incoming: number; outgoing: number; net: number };
  next90Days: { incoming: number; outgoing: number; net: number };
  next365Days: { incoming: number; outgoing: number; net: number };
  
  seasonalPattern: 'stable' | 'school_term' | 'holiday_dip' | 'year_end_spike';
  seasonalNotes: string | null;
  
  projectedLowPoint: { date: Date; balance: number } | null;
  projectedHighPoint: { date: Date; balance: number } | null;
  
  confidenceLevel: number;            // 0-1
}

export interface PaymentBehaviourAnalysis {
  // Overall metrics
  averagePaymentDays: number;
  medianPaymentDays: number;
  paymentDaysStandardDeviation: number;
  
  // Trends
  paymentTrend: 'improving' | 'stable' | 'declining';
  trendDescription: string | null;
  
  // Risk assessment
  overallRiskScore: number;           // 0-100, higher = riskier
  riskFactors: string[];
  
  // At-risk invoices
  atRiskInvoices: AtRiskInvoice[];
  
  // Segment analysis
  segmentAnalysis: {
    segment: string;                  // e.g., "Tutoring", "Term Fees"
    averagePaymentDays: number;
    collectionRate: number;
    recommendedAction: string | null;
  }[];
}

export interface AtRiskInvoice {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  daysOverdue: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  suggestedAction: string;
  estimatedCollectionProbability: number;
}

export interface RevenueInsights {
  // Category breakdown
  byCategory: { category: FeeCategory; amount: number; percentage: number; trend: 'up' | 'down' | 'stable' }[];
  
  // Seasonal patterns
  byMonth: Record<string, number>;    // "2024-01" -> amount
  
  // Key metrics
  averageInvoiceValue: number;
  averageStudentValue: number;        // Lifetime value
  revenuePerStudent: number;          // Annual
  
  // Projections
  projectedAnnualRevenue: number;
  projectedGrowthRate: number;        // Percentage
  
  // Opportunities
  upsellOpportunities: string[];
  churnRiskStudents: string[];
}

export interface FinancialRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'collection' | 'pricing' | 'cash_flow' | 'compliance' | 'efficiency';
  
  title: string;
  description: string;
  
  potentialImpact: string;            // e.g., "Could recover $2,500 in overdue invoices"
  suggestedAction: string;
  
  // For actionable recommendations
  actionType: 'send_reminder' | 'apply_late_fee' | 'offer_payment_plan' | 'review_pricing' | 'manual_review' | null;
  actionTargets: string[] | null;     // Invoice IDs, student IDs, etc.
  
  expiresAt: Date | null;
}

export interface FinancialAnomaly {
  id: string;
  type: 'unusual_refund' | 'duplicate_payment' | 'late_spike' | 'revenue_drop' | 'suspicious_activity';
  severity: 'info' | 'warning' | 'critical';
  
  description: string;
  affectedAmount: number;
  affectedEntities: string[];
  
  detectedAt: Date;
  investigationStatus: 'new' | 'investigating' | 'resolved' | 'false_positive';
  resolution: string | null;
}

export interface ComplianceAlert {
  id: string;
  type: 'gst_threshold' | 'bas_due' | 'audit_flag' | 'reconciliation_needed' | 'license_expiry';
  severity: 'info' | 'warning' | 'urgent';
  
  message: string;
  details: string | null;
  
  dueDate: Date | null;
  action: string;
  
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
}

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

export interface PaymentEvent {
  id: string;
  type: PaymentEventType;
  tenantId: string;
  accountId: string;
  timestamp: Date;
  data: Record<string, unknown>;
  metadata: {
    source: string;
    version: string;
    correlationId: string | null;
    userId: string | null;
  };
}

export type PaymentEventType =
  // Account events
  | 'account.created'
  | 'account.updated'
  | 'account.onboarding_completed'
  | 'account.suspended'
  | 'account.reactivated'
  | 'account.closed'
  
  // Invoice events
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.viewed'
  | 'invoice.payment_received'
  | 'invoice.paid'
  | 'invoice.overdue'
  | 'invoice.voided'
  | 'invoice.written_off'
  
  // Payment events
  | 'payment.initiated'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  
  // Payout events
  | 'payout.scheduled'
  | 'payout.initiated'
  | 'payout.paid'
  | 'payout.failed'
  
  // Integration events
  | 'stripe.webhook_received'
  | 'xero.sync_completed'
  | 'xero.sync_failed'
  
  // Intelligence events
  | 'insights.generated'
  | 'anomaly.detected'
  | 'recommendation.created';

// ============================================================================
// API INPUT/OUTPUT TYPES
// ============================================================================

export interface CreateAccountInput {
  tenantId: string;
  ownerType: AccountOwnerType;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  
  legalEntity: {
    type: LegalEntityType;
    legalName: string;
    tradingName?: string;
    abn?: string;
    acn?: string;
    gstRegistered?: boolean;
  };
  
  settings?: Partial<AccountSettings>;
}

export interface CreateInvoiceInput {
  tenantId: string;
  issuerId: string;
  
  recipientId?: string;
  recipientType: Invoice['recipientType'];
  recipientDetails: {
    name: string;
    email: string;
    phone?: string;
    address?: PostalAddress;
  };
  
  studentId?: string;
  studentName?: string;
  enrollmentId?: string;
  
  dueDate: Date;
  periodStart?: Date;
  periodEnd?: Date;
  
  lineItems: {
    description: string;
    feeStructureId?: string;
    category: FeeCategory;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    discountPercentage?: number;
    discountReason?: string;
  }[];
  
  notes?: string;
  purchaseOrderNumber?: string;
  
  sendImmediately?: boolean;
}

export interface ProcessPaymentInput {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  
  // For card payments
  paymentMethodId?: string;           // Stripe payment method
  
  // For manual payments
  reference?: string;
  notes?: string;
}

export interface CreatePayoutInput {
  accountId: string;
  amount?: number;                    // If not provided, payout entire available balance
  scheduledFor?: Date;
}

export interface CreateRefundInput {
  invoiceId: string;
  paymentId: string;
  amount: number;
  reason: RefundReason;
  reasonDescription?: string;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  FinancialAccount,
  FeeStructure,
  Invoice,
  Payout,
  Refund,
  AIFinancialInsights,
  PaymentEvent
};
