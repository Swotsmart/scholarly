# Universal Identity, KYC/KYB & Trust Engine

A comprehensive identity verification and trust scoring system designed for multi-platform use across the Chekd ecosystem (Chekd-ID, Scholarly, and future products).

## Version 1.0.0

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      IDENTITY SERVICE                           │
│  (Core identity management, SSI wallet, DID, profiles)          │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  KYC SERVICE  │   │  KYB SERVICE  │   │ TRUST SERVICE │
│  (Individual  │   │  (Business    │   │ (Reputation,  │
│  verification)│   │  verification)│   │  scoring)     │
└───────────────┘   └───────────────┘   └───────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERIFICATION PROVIDERS                        │
│  (Onfido, Jumio, GreenID, WWCC APIs, ASIC, teaching regs...)    │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Identity Service
Core identity management for individual users:
- Profile management (personal details, addresses)
- Contact verification (email, phone via OTP)
- KYC level tracking (None → Basic → Standard → Enhanced)
- Credential storage and status tracking
- Linked business identities

### KYC Service
Individual identity verification with multi-provider support:
- Verification session management
- Document collection and verification
- Biometric/liveness checks
- Credential verification (WWCC, teaching registration)
- Provider failover and health monitoring
- Webhook handling from providers

### KYB Service
Business identity verification:
- Business registration verification (ABN, ACN, Company Number)
- Director and Ultimate Beneficial Owner (UBO) verification
- Authorised representative management
- Insurance policy verification
- KYB level tracking

### Trust Service
Reputation scoring and risk assessment:
- Multi-component trust score calculation
- Risk assessment with category breakdown
- Platform activity integration
- Trust tier classification
- Risk flags and required actions

## KYC Levels

| Level | Name | Requirements | Capabilities |
|-------|------|--------------|--------------|
| 0 | None | Account created | Browse only |
| 1 | Basic | Email/phone verified | Free features |
| 2 | Standard | Government ID verified | Payment enabled |
| 3 | Enhanced | ID + credentials verified | Educator features |
| 4 | Business | Full KYB verification | Institutional features |

## Supported Providers

### Identity Verification
- **Onfido** - Global ID verification, biometric, liveness
- **Jumio** - Global ID verification
- **Veriff** - Global ID verification
- **GreenID** - Australian ID verification

### Australian Credentials
- **Service NSW** - NSW Working With Children Check API
- **Victoria WWCC** - Victorian WWCC verification
- **NESA** - NSW teaching registration
- **VIT** - Victorian teaching registration
- **ABR** - Australian Business Register (ABN)
- **ASIC** - Company registration (ACN)

### UK Credentials
- **DBS** - Disclosure and Barring Service
- **Companies House** - UK business verification

### Compliance
- **World-Check** - PEP and sanctions screening
- **Dow Jones** - Risk & compliance data
- **ComplyAdvantage** - AML screening

## Credential Types

### Safeguarding (Working with Children)
```typescript
// Australian
WWCC_NSW, WWCC_VIC, WWCC_QLD, WWCC_WA, WWCC_SA, WWCC_TAS, WWCC_ACT, WWCC_NT

// UK
DBS_BASIC, DBS_STANDARD, DBS_ENHANCED, PVG_SCOTLAND

// Canada
VSC_CANADA
```

### Teaching Registration
```typescript
// Australian State Boards
NESA_NSW, VIT_VIC, QCT_QLD, TRBWA_WA, TRB_SA, TRB_TAS, TRB_ACT, TRB_NT
```

### Business
```typescript
ABN, ACN, GST_REGISTRATION
```

### Professional
```typescript
FIRST_AID, CPR, ANAPHYLAXIS, FOOD_SAFETY, RSA, RCG, SECURITY_LICENSE
```

### Insurance
```typescript
PUBLIC_LIABILITY, PROFESSIONAL_INDEMNITY
```

## Quick Start

```typescript
import { 
  IdentityService,
  KycService,
  KybService,
  TrustService,
  ProviderRegistry,
  KycLevel,
  CredentialType,
  Jurisdiction
} from '@chekd/identity-engine';

// Initialize provider registry
const providerRegistry = new ProviderRegistry();
providerRegistry.registerAdapter(VerificationProvider.ONFIDO, new OnfidoAdapter(config));
providerRegistry.registerAdapter(VerificationProvider.SERVICE_NSW, new ServiceNswAdapter(config));

// Initialize services
const identityService = new IdentityService(repo, eventBus, otpService, logger);
const kycService = new KycService(repo, providerRegistry, eventBus, logger, kycConfig);
const trustService = new TrustService(repo, platformDataProvider, eventBus, logger);

// Create an identity
const identity = await identityService.createIdentity(
  tenantId,
  userId,
  { firstName: 'John', lastName: 'Smith' },
  'john@example.com',
  '+61412345678'
);

// Verify email
await identityService.sendVerificationCode(tenantId, identity.id, emailContactId);
await identityService.verifyContact(tenantId, identity.id, emailContactId, '123456');

// Start KYC verification
const session = await kycService.startVerification(tenantId, identity.id, {
  targetLevel: KycLevel.STANDARD,
  redirectUrl: 'https://app.example.com/verification/complete'
});

// User completes verification with provider, then...
// Add a credential (WWCC)
await kycService.addCredential(tenantId, identity.id, {
  type: CredentialType.WWCC_NSW,
  credentialNumber: 'WWC1234567E',
  jurisdiction: Jurisdiction.AU_NSW,
  expiresAt: new Date('2028-01-15')
});

// Calculate trust score
const trustScore = await trustService.calculateTrustScore(tenantId, identity.id);
console.log(`Trust score: ${trustScore.overall} (${trustScore.tier})`);
```

## Trust Score Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Identity Verification | 20% | KYC level achieved |
| Credential Verification | 15% | Valid credentials vs total |
| Transaction History | 15% | Success rate, disputes |
| Review Score | 15% | Average rating from others |
| Platform History | 10% | Overall platform engagement |
| Response Rate | 5% | Speed of responses |
| Completion Rate | 5% | Sessions/bookings completed |
| Dispute History | 5% | Dispute frequency |
| Tenure | 5% | Account age |
| Activity Level | 3% | Recent activity |
| Endorsements | 2% | Badges, endorsements |

## Trust Tiers

| Tier | Score Range | Description |
|------|-------------|-------------|
| Untrusted | 0-19 | New or problematic accounts |
| Basic | 20-39 | Minimal verification |
| Verified | 40-59 | Standard verification complete |
| Trusted | 60-79 | Good standing, credentials verified |
| Highly Trusted | 80-100 | Excellent reputation |

## Risk Assessment

Risk is assessed across categories:
- **Identity Risk**: Verification status, expired credentials
- **Compliance Risk**: Missing required credentials, revocations
- **Behavioral Risk**: Dispute rate, cancellation rate, unusual patterns
- **Financial Risk**: Transaction patterns (if applicable)
- **Geographic Risk**: High-risk jurisdictions

Risk Levels: `VERY_LOW` → `LOW` → `MEDIUM` → `HIGH` → `VERY_HIGH` → `BLOCKED`

## Events

The engine publishes events for integration:

### Identity Events
- `identity.created`
- `identity.profile_updated`
- `identity.contact_verified`
- `identity.suspended`
- `identity.reinstated`
- `identity.kyc_level_changed`

### KYC Events
- `kyc.session_started`
- `kyc.verification_completed`
- `kyc.verification_failed`
- `kyc.review_required`
- `kyc.credential_verified`
- `kyc.credential_expiring`
- `kyc.credential_expired`

### KYB Events
- `kyb.business_created`
- `kyb.registration_verified`
- `kyb.director_added`
- `kyb.representative_added`
- `kyb.insurance_added`
- `kyb.level_calculated`

### Trust Events
- `trust.score_changed`
- `trust.high_risk_detected`

## Integration with Subscription Engine

The Identity/KYC engine integrates with the Universal Subscription Engine:

```typescript
// In subscription service
const kycResult = await kycService.getUserKycStatus(tenantId, userId);

if (kycResult.level < plan.kycRequirements.minimumLevel) {
  throw new KycRequiredError('KYC verification required', plan.kycRequirements.minimumLevel);
}

const missingCredentials = await kycService.getMissingCredentials(
  tenantId, 
  userId, 
  plan.kycRequirements.requiredCredentials
);

if (missingCredentials.length > 0) {
  throw new CredentialsRequiredError('Missing credentials', missingCredentials);
}

// Entitlements can be credential-gated
const entitlement = {
  key: 'tutor_sessions',
  type: 'module_access',
  module: 'tutor_booking',
  requiredCredential: CredentialType.WWCC_NSW,
  credentialMustBeValid: true
};
```

## Data Retention & Privacy

- **Document images**: Deleted after verification (not retained)
- **Biometric data**: Processed by provider, not stored
- **Credential numbers**: Last 4 digits stored, full number not retained
- **Verification records**: Retained for account duration + 7 years
- **Audit logs**: Retained for compliance (configurable)

## Dependencies

Required implementations:
- `IdentityRepository` - Data persistence
- `VerificationProviderAdapter` - Per-provider integration
- `PlatformDataProvider` - Platform activity data for trust scoring
- `EventBus` - Event publishing
- `OtpService` - OTP generation and delivery
- `Logger` - Logging

## License

Proprietary - Chekd Pty Ltd
