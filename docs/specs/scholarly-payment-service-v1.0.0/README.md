# Scholarly Payment Service

**The Financial Nervous System of the Scholarly Educational Platform**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Stripe](https://img.shields.io/badge/Stripe-Connect-blueviolet.svg)](https://stripe.com/connect)

---

## Overview

The Scholarly Payment Service is the financial infrastructure that enables money to flow through the educational ecosystem as seamlessly as learning data flows through the Intelligence Mesh. It handles:

- **Financial Accounts** - Wallets for schools, tutors, and parents
- **Invoicing** - Professional invoices with GST, payment plans, and reminders
- **Payment Processing** - Card payments via Stripe Connect
- **Payouts** - Automatic distribution of earnings to tutors and schools
- **AI Profile Builder** - Intelligent tutor profile creation system
- **Accounting Integration** - Xero synchronization for professional bookkeeping

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/scholarly/payment-service.git
cd payment-service
npm install

# Configure
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:generate
npm run db:migrate

# Start development server
npm run dev
```

### Docker Quick Start

```bash
docker-compose up -d
```

The service will be available at `http://localhost:3001`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SCHOLARLY PAYMENT SERVICE                            │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │  Account       │  │  Invoice       │  │  Payout        │                │
│  │  Management    │  │  Engine        │  │  Engine        │                │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘                │
│          │                   │                   │                          │
│          └───────────────────┼───────────────────┘                          │
│                              │                                              │
│                    ┌─────────▼─────────┐                                    │
│                    │   AI Profile      │                                    │
│                    │   Builder         │                                    │
│                    └─────────┬─────────┘                                    │
│                              │                                              │
│  ┌───────────────────────────┼───────────────────────────────────────────┐ │
│  │                     INTEGRATION LAYER                                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│  │  │  Stripe  │  │   Xero   │  │ EDU-Nexus│  │ Scholarly│              │ │
│  │  │ Connect  │  │Accounting│  │  Tokens  │  │   Core   │              │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### Financial Accounts

Every participant in Scholarly has a **Financial Account** - their financial identity in the ecosystem.

```typescript
type AccountOwnerType = 
  | 'school'           // Traditional school
  | 'micro_school'     // Small independent school
  | 'tutor'            // Individual tutor
  | 'tutoring_centre'  // Tutoring business
  | 'homeschool_coop'  // Homeschool cooperative
  | 'parent'           // Parent/payer
  | 'content_creator'; // Marketplace seller
```

### Invoices

Invoices in Scholarly are education-aware - they understand tutoring sessions, term fees, and student context.

```typescript
const invoice = await paymentService.createInvoice({
  tenantId: 'tenant_1',
  issuerId: 'tutor_account_123',
  recipientDetails: {
    name: 'Jane Parent',
    email: 'jane@example.com'
  },
  studentId: 'student_456',
  studentName: 'Tom Parent',
  dueDate: new Date('2024-02-15'),
  lineItems: [
    {
      description: 'Mathematics Tutoring - 4x 1-hour sessions',
      category: 'tutoring',
      quantity: 4,
      unitPrice: 7000  // $70 per session in cents
    }
  ]
});
```

### Payment Flow

```
Parent pays $280
    ↓
Stripe processes payment
    ↓
Platform fee deducted ($14 at 5%)
    ↓
Net amount ($266) added to tutor's pending balance
    ↓
After settlement period, moved to available balance
    ↓
Weekly payout to tutor's bank account
```

---

## API Reference

### Authentication

All API requests require a tenant ID header:

```
X-Tenant-ID: your_tenant_id
```

### Endpoints

#### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/accounts` | Create financial account |
| GET | `/api/payment/accounts/:id` | Get account details |
| POST | `/api/payment/accounts/:id/onboarding` | Start Stripe onboarding |
| POST | `/api/payment/accounts/:id/onboarding/complete` | Complete onboarding |

#### Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/invoices` | Create invoice |
| GET | `/api/payment/invoices/:id` | Get invoice details |
| POST | `/api/payment/invoices/:id/send` | Send invoice to recipient |
| POST | `/api/payment/invoices/:id/pay` | Process payment |

#### Payouts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/payouts` | Create payout |

#### Profile Builder

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/profile-builder/sessions` | Start profile building |
| GET | `/api/payment/profile-builder/sessions/:id` | Get session status |
| POST | `/api/payment/profile-builder/sessions/:id/answer` | Submit answer |
| POST | `/api/payment/profile-builder/sessions/:id/generate` | Generate drafts |
| POST | `/api/payment/profile-builder/sessions/:id/select` | Select draft option |
| POST | `/api/payment/profile-builder/sessions/:id/publish` | Publish profile |

---

## AI Profile Builder

The AI Profile Builder transforms tutor profile creation into an engaging conversation. Instead of blank text boxes, tutors answer natural questions, and AI crafts their profile.

### The Journey

```
Welcome → Background → Subjects → Teaching Style → Success Story → Review → Publish
```

### Questions Asked

1. **Background** - Teaching journey, qualifications
2. **Subjects** - What they teach, year levels
3. **Teaching Style** - What sessions look like
4. **Success Story** - Student progress example
5. **Challenges** - How they help struggling students
6. **Parent Message** - What they want parents to know
7. **Goals** - What students take away
8. **Availability** - Schedule preferences

### AI-Generated Content

The AI generates multiple options in different styles:

- **Professional** - Formal, credential-focused
- **Friendly** - Warm, approachable  
- **Results-Focused** - Outcomes and achievements
- **Parent-Reassuring** - Addresses common concerns

---

## Integrations

### Stripe Connect

Scholarly uses Stripe Connect in **Express** mode. Tutors and schools complete hosted onboarding, and Stripe handles all compliance.

### Xero Integration

For professional bookkeeping, invoices and payments sync to Xero automatically.

---

## Project Structure

```
scholarly-payment-service/
├── src/
│   ├── types/                 # TypeScript type definitions
│   │   ├── index.ts          # Payment types
│   │   └── profile-builder.ts # Profile builder types
│   ├── infrastructure/        # Database, logging, utilities
│   │   └── index.ts
│   ├── repositories/          # Data access layer
│   │   ├── account.repository.ts
│   │   └── invoice.repository.ts
│   ├── services/              # Business logic
│   │   ├── payment.service.ts
│   │   └── profile-builder.service.ts
│   ├── routes/                # API endpoints
│   │   └── index.ts
│   └── index.ts               # Application entry point
├── prisma/
│   └── schema.prisma          # Database schema
├── tests/
│   └── payment.test.ts        # Test suite
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## Development

### Commands

```bash
# Development with hot reload
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Database migrations
npm run db:migrate:dev

# Prisma Studio
npm run db:studio
```

---

## Configuration

### Key Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection | Required |
| `STRIPE_SECRET_KEY` | Stripe API key | Required |
| `PLATFORM_FEE_PERCENTAGE` | Fee on payments | `5` |
| `MINIMUM_PAYOUT_AMOUNT` | Min payout (cents) | `5000` |

See `.env.example` for complete list.

---

## Health Checks

```bash
# Liveness
curl http://localhost:3001/health

# Readiness (includes DB check)
curl http://localhost:3001/ready
```

---

## File Summary

| File | Lines | Description |
|------|-------|-------------|
| `src/types/index.ts` | ~900 | Core payment type definitions |
| `src/types/profile-builder.ts` | ~600 | AI profile builder types |
| `src/infrastructure/index.ts` | ~500 | Database, logging, utilities |
| `src/repositories/account.repository.ts` | ~400 | Account data access |
| `src/repositories/invoice.repository.ts` | ~550 | Invoice data access |
| `src/services/payment.service.ts` | ~700 | Core payment business logic |
| `src/services/profile-builder.service.ts` | ~800 | AI profile builder service |
| `src/routes/index.ts` | ~400 | API endpoints |
| `src/index.ts` | ~150 | Application entry point |
| `prisma/schema.prisma` | ~350 | Database schema |
| `tests/payment.test.ts` | ~400 | Test suite |
| **Total** | **~5,750** | Production-ready implementation |

---

## License

Proprietary - Scholarly Platform

---

*Built with ❤️ for educators and learners everywhere*
