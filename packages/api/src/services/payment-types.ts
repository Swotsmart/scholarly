/**
 * Scholarly Payment Service - Type Definitions
 *
 * Complete type system for the financial infrastructure of the Scholarly platform.
 * Supports tutors, schools, micro-schools, homeschool coops, and content creators.
 *
 * @module ScholarlyPayment/Types
 * @version 1.0.0
 */

// Use base service Result pattern
export type { Result, ScholarlyError } from './base.service';
export { success, failure } from './base.service';

// ============================================================================
// PAYMENT ERROR TYPES
// ============================================================================

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

// ============================================================================
// ENUMS
// ============================================================================

export type AccountOwnerType =
  | 'school'
  | 'micro_school'
  | 'tutor'
  | 'tutoring_centre'
  | 'homeschool_coop'
  | 'parent'
  | 'content_creator';

export type LegalEntityType =
  | 'individual'
  | 'sole_trader'
  | 'company'
  | 'trust'
  | 'partnership'
  | 'non_profit';

export type AccountStatus =
  | 'pending_setup'
  | 'onboarding'
  | 'pending_review'
  | 'active'
  | 'suspended'
  | 'closed';

export type Currency = 'AUD' | 'GBP' | 'USD' | 'CAD' | 'NZD' | 'SGD';

export type FeeCategory =
  | 'tuition'
  | 'enrollment'
  | 'materials'
  | 'technology'
  | 'excursion'
  | 'uniform'
  | 'examination'
  | 'tutoring'
  | 'co_curricular'
  | 'boarding'
  | 'transport'
  | 'catering'
  | 'facility'
  | 'insurance'
  | 'late_payment'
  | 'marketplace'
  | 'subscription'
  | 'other';

export type PricingType =
  | 'fixed'
  | 'per_term'
  | 'per_semester'
  | 'annual'
  | 'hourly'
  | 'per_session'
  | 'package'
  | 'subscription';

export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'void'
  | 'written_off';

export type PaymentMethod =
  | 'card'
  | 'bank_transfer'
  | 'direct_debit'
  | 'bpay'
  | 'payid'
  | 'token'
  | 'cash'
  | 'cheque';

export type PayoutStatus =
  | 'calculating'
  | 'pending'
  | 'processing'
  | 'in_transit'
  | 'paid'
  | 'failed'
  | 'cancelled';

export type PayoutSchedule =
  | 'instant'
  | 'daily'
  | 'weekly'
  | 'fortnightly'
  | 'monthly';

export type RefundReason =
  | 'requested_by_customer'
  | 'duplicate_payment'
  | 'fraudulent'
  | 'session_cancelled_by_tutor'
  | 'session_cancelled_by_student'
  | 'quality_issue'
  | 'policy_withdrawal'
  | 'other';

export type XeroSyncStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'error'
  | 'manual';

// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface PaymentBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTenantEntity extends PaymentBaseEntity {
  tenantId: string;
}

export interface PaymentAuditInfo {
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// FINANCIAL ACCOUNT
// ============================================================================

export interface FinancialAccount extends PaymentTenantEntity {
  ownerType: AccountOwnerType;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  legalEntity: LegalEntityDetails;
  balances: AccountBalances;
  stripeConnect: StripeConnectDetails;
  xeroIntegration: XeroIntegrationDetails | null;
  payoutMethod: PayoutMethodDetails | null;
  settings: AccountSettings;
  stats: AccountStatistics;
  status: AccountStatus;
  statusReason: string | null;
  statusChangedAt: Date | null;
  verificationLevel: AccountVerificationLevel;
  kycStatus: KYCStatus;
  audit: PaymentAuditInfo;
}

export interface LegalEntityDetails {
  type: LegalEntityType;
  legalName: string;
  tradingName: string | null;
  abn: string | null;
  acn: string | null;
  gstRegistered: boolean;
  taxFileNumber: string | null;
  vatNumber: string | null;
  einNumber: string | null;
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
  available: number;
  pending: number;
  reserved: number;
  tokenBalance: number;
  lastUpdatedAt: Date;
}

export interface StripeConnectDetails {
  accountId: string | null;
  accountType: 'express' | 'standard' | 'custom';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingComplete: boolean;
  onboardingUrl: string | null;
  requirements: StripeRequirement[];
  capabilities: {
    cardPayments: 'active' | 'inactive' | 'pending';
    transfers: 'active' | 'inactive' | 'pending';
    auBecsDebit: 'active' | 'inactive' | 'pending';
  };
}

export interface StripeRequirement {
  requirement: string;
  dueDate: Date | null;
  currentlyDue: boolean;
  eventuallyDue: boolean;
  pastDue: boolean;
  errors: { code: string; reason: string }[];
}

export interface XeroIntegrationDetails {
  tenantId: string;
  tenantName: string;
  contactId: string;
  defaultRevenueAccount: string;
  defaultExpenseAccount: string;
  defaultBankAccount: string | null;
  syncEnabled: boolean;
  autoSyncInvoices: boolean;
  autoSyncPayments: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'expired';
  lastSyncAt: Date | null;
  lastSyncStatus: XeroSyncStatus;
  lastSyncError: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}

export interface PayoutMethodDetails {
  type: 'bank_account' | 'debit_card';
  bankName: string | null;
  accountName: string;
  bsb: string | null;
  accountNumber: string;
  stripePaymentMethodId: string;
  verified: boolean;
  verifiedAt: Date | null;
}

export interface AccountSettings {
  autoPayoutEnabled: boolean;
  payoutSchedule: PayoutSchedule;
  payoutThreshold: number;
  payoutCurrency: Currency;
  currency: Currency;
  invoicePrefix: string;
  invoiceNumberSequence: number;
  defaultPaymentTerms: number;
  lateFeeEnabled: boolean;
  lateFeePercentage: number | null;
  lateFeeGraceDays: number;
  sendReminders: boolean;
  reminderSchedule: number[];
  reminderChannels: ('email' | 'sms' | 'push')[];
  defaultTaxRate: number;
  taxInclusive: boolean;
  emailOnPaymentReceived: boolean;
  emailOnPayoutProcessed: boolean;
  emailOnInvoiceViewed: boolean;
  timezone: string;
}

export interface AccountStatistics {
  lifetimeReceived: number;
  lifetimePaid: number;
  lifetimeFees: number;
  lifetimeRefunded: number;
  invoicesIssued: number;
  invoicesPaid: number;
  invoicesOverdue: number;
  averagePaymentDays: number;
  onTimePaymentRate: number;
  payoutsProcessed: number;
  averagePayoutAmount: number;
  disputeCount: number;
  disputeRate: number;
  lastTransactionAt: Date | null;
  lastPayoutAt: Date | null;
}

export type AccountVerificationLevel =
  | 'unverified'
  | 'email_verified'
  | 'identity_verified'
  | 'bank_verified'
  | 'fully_verified';

export interface KYCStatus {
  status: 'not_started' | 'pending' | 'approved' | 'rejected' | 'review_required';
  submittedAt: Date | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  documentsRequired: string[];
  documentsSubmitted: string[];
}

// ============================================================================
// INVOICE
// ============================================================================

export interface Invoice extends PaymentTenantEntity {
  issuerId: string;
  issuerAccountId: string;
  issuerDetails: InvoicePartyDetails;
  recipientId: string;
  recipientType: 'parent' | 'student' | 'family' | 'organisation' | 'external';
  recipientDetails: InvoicePartyDetails;
  studentId: string | null;
  studentName: string | null;
  enrollmentId: string | null;
  invoiceNumber: string;
  reference: string | null;
  purchaseOrderNumber: string | null;
  issueDate: Date;
  dueDate: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: Currency;
  status: InvoiceStatus;
  statusHistory: InvoiceStatusChange[];
  payments: InvoicePayment[];
  paymentPlan: InvoicePaymentPlan | null;
  reminders: InvoiceReminder[];
  notes: string | null;
  internalNotes: string | null;
  terms: string | null;
  xeroSync: InvoiceXeroSync | null;
  stripeInvoiceId: string | null;
  stripePaymentIntentId: string | null;
  viewUrl: string | null;
  pdfUrl: string | null;
  metadata: Record<string, unknown>;
  audit: PaymentAuditInfo;
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
  description: string;
  feeStructureId: string | null;
  category: FeeCategory;
  quantity: number;
  unitPrice: number;
  amount: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  taxRate: number;
  taxAmount: number;
  taxCode: string | null;
  discountPercentage: number | null;
  discountAmount: number | null;
  discountReason: string | null;
  accountCode: string | null;
  trackingCategories: { name: string; option: string }[] | null;
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
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  failureReason: string | null;
  paidAt: Date;
  processedAt: Date | null;
  receiptUrl: string | null;
  receiptNumber: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface InvoicePaymentPlan {
  planId: string;
  templateId: string;
  templateName: string;
  totalInstallments: number;
  installmentAmount: number;
  frequency: 'weekly' | 'fortnightly' | 'monthly';
  installmentsPaid: number;
  nextInstallmentDate: Date | null;
  nextInstallmentAmount: number | null;
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  directDebitMandateId: string | null;
  directDebitStatus: 'pending' | 'active' | 'cancelled' | null;
}

export interface InvoiceReminder {
  id: string;
  type: 'upcoming' | 'due' | 'overdue';
  channel: 'email' | 'sms' | 'push';
  sentAt: Date;
  daysFromDue: number;
  deliveryStatus: 'sent' | 'delivered' | 'failed' | 'bounced';
  openedAt: Date | null;
}

export interface InvoiceXeroSync {
  invoiceId: string;
  invoiceNumber: string;
  status: XeroSyncStatus;
  lastSyncAt: Date;
  errorMessage: string | null;
  lineItemMappings: { localId: string; xeroId: string }[];
  paymentsSynced: number;
  lastPaymentSyncAt: Date | null;
}

// ============================================================================
// PAYOUT
// ============================================================================

export interface Payout extends PaymentTenantEntity {
  accountId: string;
  amount: number;
  currency: Currency;
  breakdown: PayoutBreakdown;
  transactions: PayoutTransaction[];
  stripePayoutId: string | null;
  stripeTransferId: string | null;
  destinationBankName: string | null;
  destinationLast4: string;
  status: PayoutStatus;
  statusHistory: { status: PayoutStatus; at: Date; reason: string | null }[];
  scheduledFor: Date | null;
  initiatedAt: Date | null;
  estimatedArrival: Date | null;
  arrivedAt: Date | null;
  failureCode: string | null;
  failureReason: string | null;
  retryCount: number;
  lastRetryAt: Date | null;
  statementDescriptor: string;
  statementPeriod: { from: Date; to: Date };
  xeroPaymentId: string | null;
  xeroSyncStatus: XeroSyncStatus;
  audit: PaymentAuditInfo;
}

export interface PayoutBreakdown {
  grossEarnings: number;
  platformFees: number;
  paymentProcessingFees: number;
  refundsDeducted: number;
  adjustments: number;
  taxWithheld: number;
  netPayout: number;
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

export interface Refund extends PaymentTenantEntity {
  invoiceId: string;
  paymentId: string;
  accountId: string;
  amount: number;
  currency: Currency;
  reason: RefundReason;
  reasonDescription: string | null;
  stripeRefundId: string | null;
  stripeStatus: 'pending' | 'succeeded' | 'failed' | 'cancelled' | null;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  processedAt: Date | null;
  failureReason: string | null;
  deductedFromPayoutId: string | null;
  audit: PaymentAuditInfo;
}

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
  paymentMethodId?: string;
  reference?: string;
  notes?: string;
}

export interface CreatePayoutInput {
  accountId: string;
  amount?: number;
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
// PAYMENT EVENTS
// ============================================================================

export type PaymentEventType =
  | 'payment.account.created'
  | 'payment.account.updated'
  | 'payment.account.onboarding_completed'
  | 'payment.account.suspended'
  | 'payment.account.reactivated'
  | 'payment.account.closed'
  | 'payment.invoice.created'
  | 'payment.invoice.sent'
  | 'payment.invoice.viewed'
  | 'payment.invoice.payment_received'
  | 'payment.invoice.paid'
  | 'payment.invoice.overdue'
  | 'payment.invoice.voided'
  | 'payment.invoice.written_off'
  | 'payment.initiated'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.payout.scheduled'
  | 'payment.payout.initiated'
  | 'payment.payout.paid'
  | 'payment.payout.failed';
