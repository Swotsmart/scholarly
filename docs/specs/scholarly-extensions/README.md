# Scholarly Extensions v1.0.0

**Early Years Curriculum Support + Third-Party Integrations**

Two production-ready extensions for the Scholarly educational platform:

1. **Early Years Curriculum Extension** - EYLF (Australia) and EYFS (UK) framework support
2. **Integrations Service** - Canva, Google Classroom, Gmail, Outlook 365, PayPal, PayID, Zimbra

## 📋 Table of Contents

- [Overview](#overview)
- [Early Years Curriculum Extension](#early-years-curriculum-extension)
- [Integrations Service](#integrations-service)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Overview

### The Problem

Scholarly's Curriculum Curator supports K-12 frameworks (ACARA, Common Core, UK National Curriculum) but lacks support for early childhood education frameworks. Additionally, educational settings need to integrate with external platforms for design, communication, and payments.

### The Solution

| Extension | Purpose | Lines of Code |
|-----------|---------|---------------|
| Early Years Curriculum | EYLF/EYFS framework support, observation linking, progress tracking | ~3,500 |
| Integrations Service | OAuth connections, API adapters, webhooks, sync engine | ~3,200 |
| Prisma Schema | Database models for both extensions | ~600 |
| **Total** | | **~7,300** |

### Key Features

#### Early Years Curriculum
- ✅ EYLF 2.0 (Australia) - 5 outcomes, 19 sub-elements
- ✅ EYFS 2024 (UK) - 7 areas of learning, Early Learning Goals
- ✅ AI-powered observation → outcome linking
- ✅ Developmental progression tracking
- ✅ Cross-framework mapping (EYLF ↔ EYFS)
- ✅ Parent-friendly progress report generation

#### Integrations
- ✅ **Canva** - Design creation, templates, export
- ✅ **Google Classroom** - Course sync, assignments, submissions
- ✅ **Gmail** - Send emails, templates, labels
- ✅ **Outlook 365** - Mail + Calendar + Teams meetings
- ✅ **PayPal** - Payments, subscriptions, refunds
- ✅ **PayID** - Australian NPP instant payments
- ✅ **Zimbra** - Enterprise email via SOAP API

---

## Early Years Curriculum Extension

### The Granny Explanation

Early years education is fundamentally different from K-12. Instead of subjects like "Mathematics" and "English", we have developmental areas like "Being, Belonging, Becoming" (EYLF's philosophy). Children don't "pass" or "fail" - they're observed showing "emerging", "developing", or "secure" understanding of concepts.

A teacher might note: *"Emma showed curiosity by asking 'why?' three times during our nature walk"* - that's evidence of EYLF Learning Outcome 4: "Children are confident and involved learners."

### Supported Frameworks

| Framework | Jurisdiction | Version | Age Range | Status |
|-----------|--------------|---------|-----------|--------|
| EYLF | Australia | 2.0 | Birth-5 years | ✅ Full Support |
| EYFS | England | 2024 | Birth-5 years | ✅ Full Support |
| Te Whāriki | New Zealand | 2017 | Birth-school | 🔄 Planned |
| Head Start | USA | 2015 | Birth-5 years | 🔄 Planned |

### EYLF Structure

```
EYLF 2.0 (Early Years Learning Framework)
├── 5 Principles (guiding beliefs)
│   ├── P1: Secure, respectful relationships
│   ├── P2: Partnerships
│   ├── P3: High expectations and equity
│   ├── P4: Respect for diversity
│   └── P5: Ongoing learning and reflective practice
│
├── 8 Practices (how educators work)
│   ├── PR1: Holistic approaches
│   ├── PR2: Responsiveness to children
│   ├── PR3: Learning through play
│   ├── PR4: Intentional teaching
│   ├── PR5: Learning environments
│   ├── PR6: Cultural competence
│   ├── PR7: Continuity and transitions
│   └── PR8: Assessment for learning
│
└── 5 Learning Outcomes
    ├── O1: Children have a strong sense of identity
    │   ├── O1.1: Feel safe, secure, supported
    │   ├── O1.2: Develop autonomy and resilience
    │   ├── O1.3: Develop confident self-identities
    │   └── O1.4: Interact with care and empathy
    ├── O2: Connected with and contribute to world
    ├── O3: Strong sense of wellbeing
    ├── O4: Confident and involved learners
    └── O5: Effective communicators
```

### EYFS Structure

```
EYFS 2024 (Early Years Foundation Stage)
├── Prime Areas (foundational, time-sensitive)
│   ├── Communication and Language (CL)
│   │   ├── Listening and Attention
│   │   ├── Understanding
│   │   └── Speaking
│   ├── Physical Development (PD)
│   │   ├── Gross Motor
│   │   └── Fine Motor
│   └── Personal, Social and Emotional Development (PSED)
│       ├── Self-Regulation
│       ├── Managing Self
│       └── Building Relationships
│
└── Specific Areas (built on prime areas)
    ├── Literacy
    ├── Mathematics
    ├── Understanding the World
    └── Expressive Arts and Design
```

### Usage Examples

#### 1. Ingest EYLF Framework

```typescript
const eyService = new EarlyYearsCurriculumService(deps);

// Ingest EYLF
const result = await eyService.ingestFramework(tenantId, 'EYLF', {
  version: '2.0'
});

if (result.success) {
  console.log(`Ingested ${result.data.stats.outcomesCreated} outcomes`);
  console.log(`Created ${result.data.stats.indicatorsCreated} indicators`);
}

// Enrich with AI
await eyService.enrichFramework(tenantId, result.data.framework.id);
```

#### 2. Link Observation to Outcomes

```typescript
// An educator records an observation
const observation = {
  observationId: 'obs_123',
  observationText: `During outdoor play, Emma showed great persistence when 
    climbing the new structure. She tried three times, adjusting her approach 
    each time. When she finally reached the top, she called out "I did it!" 
    and helped another child who was struggling.`,
  childAgeMonths: 48,
  frameworkCodes: ['EYLF'],
  activityContext: 'outdoor_play'
};

const linkResult = await eyService.linkObservationToFramework(tenantId, observation);

if (linkResult.success) {
  console.log('Suggested outcomes:', linkResult.data.suggestedLinks);
  // Expected: EYLF_O1 (identity), EYLF_O4 (confident learner)
  console.log('Confidence:', linkResult.data.confidence);
  // Expected: ~0.85
}
```

#### 3. Track Child Progress

```typescript
// Update progress based on observations
const progress = await eyService.updateChildProgress(
  tenantId,
  childId,
  frameworkId
);

if (progress.success) {
  console.log('Strengths:', progress.data.strengths);
  console.log('Areas for growth:', progress.data.areasForGrowth);
  console.log('AI Summary:', progress.data.aiSummary?.narrativeSummary);
}
```

#### 4. Generate Progress Report

```typescript
const report = await eyService.generateProgressReport(tenantId, {
  childId,
  frameworkId,
  config: {
    frameworkCode: 'EYLF',
    reportType: 'termly_summary',
    includeNarratives: true,
    includePhotos: true,
    includeNextSteps: true,
    includeHomeActivities: true,
    audience: 'parent',
    tone: 'celebratory',
    readingLevel: 'simple',
    outputFormat: 'narrative'
  },
  periodStart: new Date('2025-01-01'),
  periodEnd: new Date('2025-03-31'),
  childAgeMonths: 48
});
```

#### 5. Cross-Framework Translation

```typescript
// Translate progress from EYLF to EYFS (for families moving UK → Australia)
const translation = await eyService.translateProgress(tenantId, {
  childId,
  sourceFramework: 'EYFS',
  targetFramework: 'EYLF'
});

if (translation.success) {
  console.log('Mappings used:', translation.data.mappingsUsed.length);
  console.log('Confidence:', translation.data.confidence);
}
```

---

## Integrations Service

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       INTEGRATIONS SERVICE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     CONNECTION MANAGER                               │  │
│  │  OAuth Flow │ Token Refresh │ Credential Storage │ Health Check     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                       │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐ │
│  │                                 ▼                                     │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │ │
│  │  │  Canva  │  │ Google  │  │  Email  │  │ PayPal  │  │  PayID  │     │ │
│  │  │ Adapter │  │Classroom│  │ Adapter │  │ Adapter │  │ Adapter │     │ │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘     │ │
│  │       │            │            │            │            │          │ │
│  │       ▼            ▼            ▼            ▼            ▼          │ │
│  │  ┌─────────────────────────────────────────────────────────────┐     │ │
│  │  │                    RATE LIMITER                            │     │ │
│  │  │      Per-Provider Throttling │ Retry Logic │ Queuing      │     │ │
│  │  └─────────────────────────────────────────────────────────────┘     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       WEBHOOK HANDLER                               │  │
│  │  Signature Verification │ Event Processing │ Retry Queue           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        SYNC ENGINE                                  │  │
│  │  Bidirectional Sync │ Conflict Resolution │ Delta Detection        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Provider Details

| Provider | Auth | Rate Limits | Key Features |
|----------|------|-------------|--------------|
| **Canva** | OAuth 2.0 | 60/min, 1000/hr | Design creation, templates, export (PDF/PNG/PPTX) |
| **Google Classroom** | OAuth 2.0 | 100/min, 5000/hr | Course sync, assignments, submissions, roster |
| **Gmail** | OAuth 2.0 | 100/min, 5000/hr | Send, templates, labels, threading |
| **Outlook 365** | OAuth 2.0 | 120/min, 10000/hr | Mail, calendar, Teams meetings |
| **PayPal** | OAuth 2.0 | 30/min, 500/hr | Payments, subscriptions, refunds, payouts |
| **PayID** | API Key | Bank-specific | NPP instant AUD transfers |
| **Zimbra** | SOAP/Basic | Server-specific | Enterprise email |

### Usage Examples

#### 1. Connect to Provider (OAuth Flow)

```typescript
const integrations = new IntegrationsService(deps);

// Step 1: Get authorization URL
const authResult = await integrations.initiateConnection(
  tenantId,
  userId,
  'canva',
  { scopes: ['design:read', 'design:write'] }
);

// Redirect user to: authResult.data.authorizationUrl

// Step 2: Handle callback (after user authorizes)
const connection = await integrations.completeConnection(
  tenantId,
  userId,
  'canva',
  authorizationCode,
  state
);

console.log('Connected:', connection.data.status === 'connected');
```

#### 2. Create Canva Design

```typescript
// Create a worksheet design
const design = await integrations.canvaCreateDesign(tenantId, userId, {
  type: 'worksheet',
  title: 'Math Practice - Fractions',
  templateId: 'template_123',  // Optional: start from template
  width: 1920,
  height: 1080
});

if (design.success) {
  console.log('Edit URL:', design.data.editUrl);
  console.log('View URL:', design.data.viewUrl);
}

// Export to PDF
const exported = await integrations.canvaExportDesign(
  tenantId,
  userId,
  design.data.id,
  'pdf'
);

console.log('Download:', exported.data.exportUrl);
```

#### 3. Sync Google Classroom

```typescript
// List courses
const courses = await integrations.googleClassroomListCourses(tenantId, userId, {
  courseStates: ['active']
});

// Sync a course with Scholarly
const syncResult = await integrations.googleClassroomSyncCourse(tenantId, userId, {
  courseId: 'google_course_123',
  scholarlyClassroomId: 'scholarly_room_456',
  syncStudents: true,
  syncTeachers: true,
  syncAssignments: true,
  syncSubmissions: true,
  syncAnnouncements: false,
  direction: 'bidirectional'
});

console.log('Students synced:', syncResult.data.studentsAdded);
console.log('Assignments synced:', syncResult.data.assignmentsCreated);
```

#### 4. Send Emails (Gmail/Outlook/Zimbra)

```typescript
// Send via Gmail
const emailResult = await integrations.sendEmail(tenantId, userId, 'gmail', {
  to: [{ email: 'parent@example.com', name: 'Jane Smith' }],
  subject: 'Weekly Progress Update',
  bodyHtml: '<h1>Your child had a great week!</h1><p>...</p>',
  bodyText: 'Your child had a great week! ...'
});

// Send using template
const templateResult = await integrations.sendTemplateEmail(
  tenantId,
  userId,
  'outlook_365',
  {
    to: [{ email: 'parent@example.com' }],
    templateId: 'weekly_update',
    templateData: {
      childName: 'Emma',
      weekNumber: 12,
      highlights: ['Mastered fractions', 'Great teamwork']
    }
  }
);

// Bulk send
const bulkResult = await integrations.sendBulkEmails(tenantId, userId, 'gmail', [
  { to: [{ email: 'parent1@example.com' }], subject: '...', bodyText: '...' },
  { to: [{ email: 'parent2@example.com' }], subject: '...', bodyText: '...' }
]);

console.log(`Sent: ${bulkResult.data.sent}, Failed: ${bulkResult.data.failed}`);
```

#### 5. Create Outlook Calendar Event

```typescript
const event = await integrations.outlookCreateEvent(tenantId, userId, {
  subject: 'Parent-Teacher Conference',
  bodyText: 'Discuss Emma\'s progress',
  start: new Date('2025-02-15T10:00:00'),
  end: new Date('2025-02-15T10:30:00'),
  isAllDay: false,
  timeZone: 'Australia/Sydney',
  isOnlineMeeting: true,
  onlineMeetingProvider: 'teams',
  attendees: [{
    email: 'parent@example.com',
    name: 'Jane Smith',
    type: 'required',
    responseStatus: 'none'
  }],
  reminders: [{ minutesBefore: 1440, method: 'email' }]  // 24 hours
});

console.log('Teams link:', event.data.onlineMeetingUrl);
```

#### 6. Process Payments (PayPal)

```typescript
// Create payment
const payment = await integrations.paypalCreatePayment(tenantId, userId, {
  amount: 50.00,
  currency: 'AUD',
  description: 'Tutoring session - 1 hour',
  invoiceNumber: 'INV-2025-001',
  paymentType: 'payment',
  returnUrl: 'https://app.scholarly.com/payment/success',
  cancelUrl: 'https://app.scholarly.com/payment/cancel'
});

// Redirect user to: payment.data.approvalUrl

// After user approves, capture payment
const captured = await integrations.paypalCapturePayment(
  tenantId,
  userId,
  payment.data.id
);

console.log('Status:', captured.data.status);  // 'completed'
console.log('Net amount:', captured.data.netAmount);

// Create subscription
const subscription = await integrations.paypalCreateSubscription(tenantId, userId, {
  planId: 'P-SCHOLARLY-PREMIUM-MONTHLY',
  subscriberEmail: 'user@example.com',
  returnUrl: 'https://app.scholarly.com/subscription/success',
  cancelUrl: 'https://app.scholarly.com/subscription/cancel'
});
```

#### 7. PayID Payment (Australia)

```typescript
// Validate PayID
const validation = await integrations.payidValidate(
  tenantId,
  userId,
  'tutor@example.com'  // or phone: +61412345678, ABN: 12345678901
);

if (validation.data.valid) {
  console.log('Type:', validation.data.type);  // 'email'
  console.log('Name:', validation.data.resolvedName);  // 'John Smith'
}

// Send payment
const payidPayment = await integrations.payidCreatePayment(tenantId, userId, {
  recipientPayId: 'tutor@example.com',
  amount: 5000,  // $50.00 in cents
  currency: 'AUD',
  reference: 'Tutoring - Week 12'
});

console.log('Status:', payidPayment.data.status);  // 'pending' → 'completed'
```

---

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (for rate limiting)
- Provider API credentials

### Setup

```bash
# Clone and install
cd scholarly-extensions
npm install

# Setup database
npx prisma migrate dev

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/scholarly"

# Application
APP_URL="https://app.scholarly.com"

# Canva
CANVA_CLIENT_ID="your_canva_client_id"
CANVA_CLIENT_SECRET="your_canva_client_secret"
CANVA_WEBHOOK_SECRET="your_webhook_secret"

# Google (Classroom & Gmail)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Microsoft (Outlook 365)
MICROSOFT_CLIENT_ID="your_microsoft_client_id"
MICROSOFT_CLIENT_SECRET="your_microsoft_client_secret"
MICROSOFT_TENANT_ID="common"  # or specific tenant

# PayPal
PAYPAL_CLIENT_ID="your_paypal_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_client_secret"
PAYPAL_ENVIRONMENT="sandbox"  # or "production"
PAYPAL_WEBHOOK_ID="your_webhook_id"

# PayID (bank-specific)
PAYID_BANK_CODE="your_bank_code"
PAYID_API_KEY="your_api_key"
PAYID_API_SECRET="your_api_secret"
PAYID_ENVIRONMENT="test"  # or "production"

# Zimbra
ZIMBRA_SERVER_URL="https://mail.yourschool.edu"
```

---

## API Reference

### Early Years Curriculum

| Method | Description |
|--------|-------------|
| `ingestFramework(tenantId, code, options?)` | Load framework (EYLF, EYFS) |
| `enrichFramework(tenantId, frameworkId)` | AI enrichment |
| `linkObservationToFramework(tenantId, request)` | AI observation linking |
| `validateObservationLinks(tenantId, linkId, validation)` | Teacher validation |
| `updateChildProgress(tenantId, childId, frameworkId)` | Calculate progress |
| `getChildProgressSummary(tenantId, childId)` | Multi-framework summary |
| `generateProgressReport(tenantId, request)` | Generate parent report |
| `translateProgress(tenantId, request)` | Cross-framework translation |
| `getActivitySuggestions(tenantId, request)` | Get suggested activities |

### Integrations

| Method | Description |
|--------|-------------|
| `initiateConnection(tenantId, userId, provider)` | Start OAuth flow |
| `completeConnection(tenantId, userId, provider, code, state)` | Complete OAuth |
| `disconnectProvider(tenantId, connectionId)` | Disconnect |
| `getUserConnections(tenantId, userId)` | List all connections |
| `canvaCreateDesign(tenantId, userId, request)` | Create Canva design |
| `canvaExportDesign(tenantId, userId, designId, format)` | Export to PDF/PNG/PPTX |
| `googleClassroomListCourses(tenantId, userId)` | List GC courses |
| `googleClassroomSyncCourse(tenantId, userId, request)` | Sync course |
| `sendEmail(tenantId, userId, provider, request)` | Send email |
| `outlookCreateEvent(tenantId, userId, event)` | Create calendar event |
| `paypalCreatePayment(tenantId, userId, request)` | Create PayPal payment |
| `payidCreatePayment(tenantId, userId, request)` | Send PayID payment |
| `processWebhook(provider, headers, body)` | Handle webhooks |

---

## Testing

```bash
# Run all tests
npm test

# Run specific tests
npm test -- --grep "Early Years"
npm test -- --grep "Integrations"

# Test coverage
npm run test:coverage

# Integration tests (requires credentials)
npm run test:integration
```

---

## File Structure

```
scholarly-extensions/
├── src/
│   ├── curriculum/
│   │   └── early-years-curriculum.service.ts  # EYLF/EYFS service
│   ├── integrations/
│   │   └── integrations.service.ts            # All 7 integrations
│   └── types/
│       ├── early-years-curriculum.types.ts    # Curriculum types
│       └── integrations.types.ts              # Integration types
├── prisma/
│   └── schema.prisma                          # Database schema
├── tests/
│   ├── curriculum/
│   └── integrations/
├── package.json
└── README.md
```

---

## Production Readiness Checklist

### Early Years Curriculum
- [x] EYLF 2.0 full structure (5 outcomes, 19 sub-elements)
- [x] EYFS 2024 full structure (7 areas, 17 aspects)
- [x] Observation → outcome AI linking
- [x] Teacher validation workflow
- [x] Child progress tracking with trends
- [x] Cross-framework mapping (EYLF ↔ EYFS)
- [x] Progress report generation
- [x] Activity suggestions by age
- [x] Repository pattern with Prisma schema
- [x] Event publishing for integration

### Integrations Service
- [x] OAuth 2.0 flow with state validation
- [x] Automatic token refresh
- [x] Per-provider rate limiting
- [x] Webhook signature verification
- [x] Error handling with recovery hints
- [x] Canva full API support
- [x] Google Classroom sync
- [x] Gmail send with templates
- [x] Outlook 365 mail + calendar
- [x] PayPal payments + subscriptions
- [x] PayID validation + payments
- [x] Zimbra SOAP API
- [x] Sync job engine
- [x] Repository pattern with Prisma schema

---

## License

MIT License - See LICENSE file for details.

---

## Support

For issues or questions:
- GitHub Issues: [scholarly/extensions](https://github.com/scholarly/extensions)
- Documentation: [docs.scholarly.com/extensions](https://docs.scholarly.com/extensions)
