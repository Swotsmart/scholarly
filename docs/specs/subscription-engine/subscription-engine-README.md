# Universal Subscription Engine

A comprehensive, multi-platform subscription management system designed for the Chekd ecosystem (Chekd-ID, Scholarly, and future products).

## Version 2.0.0

## Overview

The Universal Subscription Engine extends the proven SMM (Subscription Management Module) architecture with enterprise-grade features for education, identity verification, and multi-stakeholder platforms.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Multi-Tenant** | Full tenant isolation with `tenantId` on all operations |
| **Multi-Vendor** | Vendors (tutors, creators, schools) can create and manage their own plans |
| **KYC-Gated Plans** | Require identity verification and credentials before subscription |
| **Seat-Based Pricing** | Per-student, per-user, per-device pricing with volume discounts |
| **Intent-Based Trials** | Contextual trial experiences based on user's stated purpose |
| **Family/Team Subscriptions** | One payer, multiple beneficiaries with role-based entitlements |
| **Institutional Billing** | Invoice billing with NET-30/60/90 terms and purchase orders |
| **Credential-Linked Entitlements** | Features gated by credentials (WWCC, teaching registration) |
| **Revenue Share** | Automatic platform/vendor split on every payment |
| **Comprehensive Analytics** | MRR, churn, conversion rates, and more |

## Installation

```bash
npm install @chekd/subscription-engine
```

## Quick Start

```typescript
import { 
  UniversalSubscriptionService,
  PlanTier,
  PricingModel,
  BillingInterval,
  KycLevel,
  CredentialType
} from '@chekd/subscription-engine';

// Initialize the service
const subscriptionService = new UniversalSubscriptionService(
  subscriptionRepository,
  kycService,
  paymentService,
  eventBus,
  logger,
  {
    platformId: 'scholarly',
    defaultPlatformFeePercent: 15
  }
);

// Create a plan
const plan = await subscriptionService.createPlan(tenantId, vendorId, {
  name: 'Tutor Pro',
  description: 'Professional tutoring tools with reduced commission',
  tier: PlanTier.PREMIUM,
  pricing: {
    model: PricingModel.RECURRING,
    amount: 2999, // $29.99
    currency: 'AUD',
    interval: BillingInterval.MONTH,
    intervalCount: 1,
    trialDays: 30,
    billingType: BillingType.IMMEDIATE
  },
  entitlements: [
    {
      key: 'reduced_commission',
      type: EntitlementType.DISCOUNT,
      value: 10, // 10% commission instead of 20%
      description: 'Reduced platform commission',
      isVisible: true
    },
    {
      key: 'priority_matching',
      type: EntitlementType.PRIORITY,
      value: true,
      description: 'Priority in tutor matching',
      module: 'tutor_booking',
      isVisible: true
    }
  ],
  kycRequirements: {
    minimumLevel: KycLevel.CREDENTIAL_VERIFIED,
    requiredCredentials: [CredentialType.WWCC],
    credentialsMustBeValid: true
  },
  features: [
    'Reduced 10% commission (vs 20%)',
    'Priority matching with students',
    'Advanced analytics dashboard',
    'Marketing tools'
  ],
  isPublic: true,
  requiresApproval: false
});

// Subscribe a user
const subscription = await subscriptionService.subscribe(
  tenantId,
  customerId,
  plan.data.id,
  {
    trialIntent: 'teacher_tutoring',
    acquisitionSource: 'organic'
  }
);
```

## Core Concepts

### Plans

Plans define what subscribers get and what they pay. They belong to either the platform or vendors.

```typescript
interface SubscriptionPlan {
  id: string;
  tenantId: string;
  vendorId: string;
  name: string;
  tier: PlanTier;
  pricing: PlanPricing;
  entitlements: PlanEntitlement[];
  kycRequirements?: PlanKycRequirements;
  trialConfigs?: Record<TrialIntent, TrialConfig>;
  // ... more fields
}
```

### Pricing Models

| Model | Use Case | Example |
|-------|----------|---------|
| `RECURRING` | Fixed monthly/yearly fee | Family subscription $9.99/month |
| `PER_SEAT` | Per-user pricing | School plan $5/student/month |
| `BASE_PLUS_SEAT` | Base fee + per-user | $99/month base + $3/student |
| `USAGE` | Consumption-based | API calls, storage |
| `TIERED` | Volume-based pricing | 1-10 users: $10, 11-50: $8 |
| `ONE_TIME` | Single payment | Setup fee, lifetime access |

### Entitlements

Entitlements are capabilities unlocked by a subscription:

```typescript
interface PlanEntitlement {
  key: string;                    // Unique identifier
  type: EntitlementType;          // feature, access, discount, quota, etc.
  value: any;                     // Type-specific value
  module?: string;                // Target module (e.g., 'tutor_booking')
  requiredCredential?: string;    // Credential required (e.g., 'wwcc')
  credentialMustBeValid?: boolean; // Revoke if credential expires
  memberScope?: string;           // Who gets it in family plans
}
```

### KYC Levels

Progressive verification that gates plan access:

| Level | Name | Requirements | Typical Use |
|-------|------|--------------|-------------|
| 0 | Anonymous | None | Browse only |
| 1 | Email Verified | Email + Mobile | Free accounts |
| 2 | Identity Verified | + Government ID | Payment enabled |
| 3 | Credential Verified | + WWCC/credentials | Educators, tutors |
| 4 | Business Verified | + Business registration | Schools, institutions |

### Intent-Based Trials

Configure different trial experiences based on user intent:

```typescript
const plan = {
  // ...
  trialConfigs: {
    'teacher_tutoring': {
      intent: 'teacher_tutoring',
      durationDays: 30,
      trialEntitlements: [/* subset of entitlements */],
      trialLimits: [
        { key: 'max_students', limit: 5, description: 'Students during trial' }
      ],
      successMetrics: [
        { key: 'profile_completed', name: 'Profile Completed', conversionIndicator: true },
        { key: 'first_booking', name: 'First Booking', target: 1, conversionIndicator: true }
      ],
      conversionTriggers: [
        { metric: 'first_booking', threshold: 1, message: 'Great start! Ready to go Pro?' }
      ],
      requirePaymentMethod: false,
      requiredKycLevel: KycLevel.CREDENTIAL_VERIFIED
    },
    'teacher_marketplace': {
      intent: 'teacher_marketplace',
      durationDays: 14,
      // ... different configuration
    }
  }
};
```

## API Reference

### Plan Management

```typescript
// Create a plan
createPlan(tenantId, vendorId, data): Promise<Result<SubscriptionPlan>>

// Get a plan
getPlan(tenantId, planId): Promise<Result<SubscriptionPlan>>

// List plans
listPlans(tenantId, vendorId?, includeArchived?): Promise<Result<SubscriptionPlan[]>>

// Activate/pause/archive
activatePlan(tenantId, planId): Promise<Result<SubscriptionPlan>>
pausePlan(tenantId, planId): Promise<Result<SubscriptionPlan>>
archivePlan(tenantId, planId): Promise<Result<SubscriptionPlan>>
```

### Subscription Lifecycle

```typescript
// Subscribe (with KYC checking)
subscribe(tenantId, customerId, planId, options?): Promise<Result<Subscription>>

// Cancel
cancelSubscription(tenantId, subscriptionId, immediately?, reason?): Promise<Result<Subscription>>

// Pause/Resume
pauseSubscription(tenantId, subscriptionId): Promise<Result<Subscription>>
resumeSubscription(tenantId, subscriptionId): Promise<Result<Subscription>>

// Change plan
changePlan(tenantId, subscriptionId, newPlanId, proration?): Promise<Result<PlanChangeResult>>
```

### Seat Management

```typescript
// Add seats
addSeats(tenantId, subscriptionId, count): Promise<Result<SubscriptionSeat[]>>

// Assign/unassign user to seat
assignSeat(tenantId, subscriptionId, seatId, userId, assignedBy): Promise<Result<SubscriptionSeat>>
unassignSeat(tenantId, subscriptionId, seatId): Promise<Result<SubscriptionSeat>>

// Remove seats
removeSeats(tenantId, subscriptionId, seatIds): Promise<Result<void>>
```

### Family/Team Members

```typescript
// Add member
addMember(tenantId, subscriptionId, userId, role, addedBy): Promise<Result<SubscriptionMember>>

// Remove member
removeMember(tenantId, subscriptionId, memberId): Promise<Result<void>>
```

### Trial Management

```typescript
// Start intent-based trial
startIntentTrial(tenantId, customerId, planId, intent): Promise<Result<Subscription>>

// Track trial metrics
trackTrialMetric(tenantId, subscriptionId, metric, value): Promise<Result<TrialProgress>>

// Check trial limits
checkTrialLimit(tenantId, subscriptionId, limitKey): Promise<Result<LimitStatus>>

// Get trial progress
getTrialProgress(tenantId, subscriptionId): Promise<Result<TrialProgress>>

// Convert trial to paid
convertTrial(tenantId, subscriptionId, targetPlanId?): Promise<Result<Subscription>>
```

### Invoice Management

```typescript
// Generate invoice
generateInvoice(tenantId, subscriptionId): Promise<Result<SubscriptionInvoice>>

// Send invoice
sendInvoice(tenantId, invoiceId): Promise<Result<SubscriptionInvoice>>

// Record payment
recordInvoicePayment(tenantId, invoiceId, amount, method, ref?): Promise<Result<SubscriptionInvoice>>

// Get overdue invoices
getOverdueInvoices(tenantId): Promise<Result<SubscriptionInvoice[]>>
```

### Entitlement Checking

```typescript
// Check if user has entitlement
checkEntitlement(tenantId, userId, key): Promise<Result<{ hasEntitlement: boolean; value?: any }>>

// Get all user entitlements
getUserEntitlements(tenantId, userId): Promise<Result<GrantedEntitlement[]>>
```

### Credential Handling

```typescript
// Handle credential change (called by KYC service)
handleCredentialChange(tenantId, userId, credentialType, newStatus): Promise<void>
```

### Analytics

```typescript
// Get subscription analytics
getAnalytics(tenantId, vendorId?): Promise<Result<SubscriptionAnalytics>>

// Get vendor-specific analytics
getVendorAnalytics(tenantId, vendorId): Promise<Result<VendorAnalytics>>
```

## Events

The service publishes events for all significant actions:

### Subscription Events
- `subscription.created`
- `subscription.activated`
- `subscription.trial_started`
- `subscription.trial_ending`
- `subscription.trial_converted`
- `subscription.paused`
- `subscription.resumed`
- `subscription.canceled`
- `subscription.upgraded`
- `subscription.downgraded`

### Payment Events
- `payment.succeeded`
- `payment.failed`
- `payment.refunded`

### Invoice Events
- `invoice.created`
- `invoice.sent`
- `invoice.paid`
- `invoice.overdue`

### Entitlement Events
- `entitlement.granted`
- `entitlement.revoked`
- `entitlement.blocked` (due to missing credential)

### Credential Events
- `credential.expiring`
- `credential.expired`
- `credential.revoked`

## Platform Configuration

### For Scholarly

```typescript
import { SCHOLARLY_MODULES } from '@chekd/subscription-engine';

const config = {
  platformId: 'scholarly',
  defaultPlatformFeePercent: 15,
  gracePeriodDays: 7,
  credentialExpiryWarningDays: 30
};

// Available modules for entitlements:
// enrollment, assessment, gradebook, attendance, wellbeing,
// parent_portal, scheduling, relief, curriculum, homeschool_hub,
// micro_school, tutor_booking, content_marketplace, ai_buddy,
// content_studio, lis_bridge
```

### For Chekd-ID

```typescript
import { CHEKD_MODULES } from '@chekd/subscription-engine';

const config = {
  platformId: 'chekd',
  defaultPlatformFeePercent: 10,
  gracePeriodDays: 14
};

// Available modules for entitlements:
// vault, trust, verify, aem, crm, lms, concierge, phyto, marketplace
```

## Dependencies

The service requires implementations of:

- `SubscriptionRepository` - Data persistence
- `KycServiceInterface` - KYC/credential verification
- `PaymentServiceInterface` - Payment processing (Stripe, etc.)
- `EventBus` - Event publishing
- `Logger` - Logging

## License

Proprietary - Chekd Pty Ltd

## Support

For questions or issues, contact the Chekd Platform Team.
