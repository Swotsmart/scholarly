# CLAUDE.md — Scholarly Tutor Platform

> This file is the primary context document for Claude Code sessions working on
> this codebase. Read it fully before making any changes.

## Project Overview

The Scholarly Tutor Platform is an AI-powered educational technology ecosystem.
This package contains the **tutor onboarding pipeline**, **external integrations**
(Stripe Connect, GoDaddy Domains), **Érudits migration infrastructure**, and
**Unified Communications v5.0 boot layer** — all written in TypeScript with
zero placeholder implementations.

The platform's first production tenant is **Érudits French Education**
(erudits.com.au), a Melbourne-based French tutoring business migrating from
Squarespace to Scholarly.

## Package Structure

```
scholarly-tutor-platform/
│
├── CLAUDE.md                          ← You are here
├── .env.template                      ← All required environment variables
│
├── tutor-onboarding/                  ← 7-step onboarding pipeline (2,806 lines)
│   ├── tutor-onboarding.types.ts      ← All types, interfaces, enums, dependency contracts
│   ├── tutor-onboarding.service.ts    ← Orchestrator: Steps 1–7 implementation
│   ├── onboarding-session.repository.ts ← Prisma-backed persistence layer
│   └── tutor-onboarding.service.test.ts ← Vitest suite with full mock factories
│
├── integrations/                      ← External API clients (1,143 lines)
│   ├── stripe-connect.client.ts       ← Stripe Connect Express: accounts, onboarding, payments
│   └── godaddy-domain.client.ts       ← GoDaddy API v1: availability, purchase, transfer, DNS
│
├── migrations/                        ← Database + Érudits tenant setup (1,617 lines)
│   ├── migration_20260227_consolidated.sql ← Single DDL file, all tables + columns
│   ├── erudits-provisioning.ts        ← Provisions Érudits tenant with French curriculum config
│   └── parallel-run-monitor.ts        ← Manages parallel-run period + cutover readiness
│
├── uc-v5/                             ← Unified Communications boot layer (585 lines)
│   ├── uc-v5-scholarly-boot.ts        ← Boots UC v5.0 with Scholarly auth + NATS bridge
│   └── schema-additions.prisma        ← Prisma schema for UC + onboarding models
│
├── erudits-platform-v2_10_0.zip       ← Érudits source (27,025 lines, 60 TS files)
└── unified-communications-5_0_0_tar.gz ← UC v5.0 source (30,513 lines, 62 TS files)
```

## Architecture & Conventions

### Language & Runtime
- **TypeScript** throughout (strict mode, ES2022 target, NodeNext module resolution)
- **Node.js** backend with Express.js
- **Prisma ORM** with PostgreSQL
- **React / Next.js 14** frontend (not in this package)
- **React Native + Expo** for cross-platform mobile (not in this package)

### Patterns — Follow These Exactly

**Result<T> monad for error handling:**
```typescript
type Result<T> = { ok: true; value: T } | { ok: false; error: ServiceError };
function success<T>(value: T): Result<T> { return { ok: true, value }; }
function failure(error: ServiceError): Result<never> { return { ok: false, error }; }
```
Never throw from service methods. Return `Result<T>`. Only throw from validators
and constructors where the caller expects exceptions.

**ScholarlyBaseService inheritance:**
All services extend `ScholarlyBaseService` which provides `this.log()`,
`this.deps`, and `this.serviceName`. The tutor-onboarding service is an
exception (standalone orchestrator) but follows the same logging pattern.

**Repository pattern:**
Services never call Prisma directly. They use repository interfaces injected
via constructor. See `OnboardingSessionRepository` for the pattern.

**NATS event publishing:**
Every significant state change publishes a NATS event. Topic format:
`scholarly.{domain}.{entity}.{action}` (e.g., `scholarly.onboarding.identity.completed`).
Events are fire-and-forget — never block on event publishing.

**Multi-tenant isolation:**
Every database query includes `tenantId`. Every service method receives
`tenantId` as its first parameter (or gets it from the session).

### Naming Conventions
- Files: `kebab-case.ts` (e.g., `tutor-onboarding.service.ts`)
- Interfaces: `PascalCase` with `I` prefix only for capability interfaces
  (e.g., `ITutorOnboardingService`), no prefix for data interfaces
- Types: `PascalCase` (e.g., `OnboardingSession`, `DomainStepResult`)
- Enums: `PascalCase` with `PascalCase` members (e.g., `OnboardingStep.IDENTITY`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `PERSONA_BLUEPRINTS`)
- Private methods: `camelCase` with no underscore prefix

### Testing
- Framework: **Vitest**
- Pattern: Mock factories per dependency, one `beforeEach` that wires everything
- Each mock factory returns the full interface (no `as any` casts)
- Test file lives next to the source file with `.test.ts` suffix

## Deployment Steps

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- NATS 2.10+

### Step 1: Extract Source Archives

```bash
# Extract Érudits platform
unzip erudits-platform-v2_10_0.zip -d ./erudits

# Extract UC v5.0
tar xzf unified-communications-5_0_0_tar.gz -C ./uc-v5
```

### Step 2: Run Database Migration

```bash
psql -d scholarly -f migrations/migration_20260227_consolidated.sql
```

This creates/alters (all idempotent via IF NOT EXISTS):
- `uc_kv_store` — UC plugin key-value storage
- `OnboardingSession` — Full 7-step session with 30+ columns
- `TutorProfile.stripeConnectedAccountId` — Stripe Express account link
- `PlatformMigration` — Squarespace migration tracking (6-stage pipeline)
- `MigrationContentItem` — Individual content items being migrated

### Step 3: Apply Prisma Schema

Copy `uc-v5/schema-additions.prisma` into your unified Prisma schema, then:

```bash
npx prisma generate
npx prisma db push  # or prisma migrate dev
```

### Step 4: Configure Environment

```bash
cp .env.template .env
```

Required variables:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/scholarly
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222

# Stripe Connect (Step 5 onboarding)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# GoDaddy Domains (Step 4 onboarding)
GODADDY_API_KEY=...
GODADDY_API_SECRET=...
GODADDY_ENVIRONMENT=ote  # 'ote' for testing, 'production' for live

# UC v5.0
UC_PLATFORM_PORT=3100
UC_JWT_SECRET=... (same as main Scholarly JWT secret)
```

### Step 5: Install Dependencies

```bash
npm install stripe
npm install docx  # if generating documents
```

The codebase has no other external runtime dependencies beyond what's
already in the Scholarly monorepo (Express, Prisma, ioredis, nats).

### Step 6: Wire Into Monorepo

Place files according to this mapping:

| Source | Destination |
|--------|-------------|
| `tutor-onboarding/` | `packages/api/src/services/tutor-onboarding/` |
| `integrations/` | `packages/api/src/integrations/` |
| `migrations/*.ts` | `packages/api/src/migrations/` |
| `migrations/*.sql` | `prisma/migrations/20260227_consolidated/` |
| `uc-v5/uc-v5-scholarly-boot.ts` | `packages/uc-v5/src/boot.ts` |
| `uc-v5/schema-additions.prisma` | `prisma/schema.prisma` (Section 7) |
| `erudits/` | `packages/erudits/` |
| `uc-v5/uc-v4/` | `packages/uc-v5/` |

### Step 7: Construct Services

```typescript
import Stripe from 'stripe';
import { TutorOnboardingService } from './services/tutor-onboarding/tutor-onboarding.service';
import { PrismaOnboardingSessionRepository } from './services/tutor-onboarding/onboarding-session.repository';
import { createStripeConnectClient, PrismaConnectedAccountRegistry } from './integrations/stripe-connect.client';
import { createGoDaddyDomainClient } from './integrations/godaddy-domain.client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const accountRegistry = new PrismaConnectedAccountRegistry(prisma);
const stripeClient = createStripeConnectClient(
  stripe, accountRegistry, process.env.STRIPE_WEBHOOK_SECRET!
);

const godaddy = createGoDaddyDomainClient({
  apiKey: process.env.GODADDY_API_KEY!,
  apiSecret: process.env.GODADDY_API_SECRET!,
  environment: process.env.GODADDY_ENVIRONMENT as 'ote' | 'production',
});

const onboardingService = new TutorOnboardingService(
  new PrismaOnboardingSessionRepository(prisma),
  prismaTransaction,    // Prisma $transaction wrapper
  authService,          // existing auth.service.ts
  hostingService,       // existing hosting-provider.service.ts
  tutorBookingService,  // existing tutor-booking.service.ts
  aiService,            // existing ai-integration.service.ts
  stripeClient,         // Stripe Connect (Step 5)
  godaddy,              // GoDaddy Domains (Step 4)
  eventBus,             // NATS event bus wrapper
  cache,                // Redis cache wrapper
);
```

### Step 8: Boot UC v5.0

```typescript
import { createScholarlyUCConfig, bootUCPlatform } from './uc-v5/boot';

const config = createScholarlyUCConfig();
const platform = await bootUCPlatform(config, prisma, natsConnection);
```

### Step 9: Provision Érudits Tenant

```typescript
import { provisionEruditsTenant } from './migrations/erudits-provisioning';

// This runs the full 7-step onboarding for Érudits:
// - Creates TUTOR_CENTRE tenant with French curriculum config
// - 7 subjects, navy/red theme, Melbourne availability
// - Kicks off Squarespace extraction (Stages 1-2)
const result = await provisionEruditsTenant(onboardingService, migrationService);
```

### Step 10: Érudits Migration — Parallel Run + Cutover

After provisioning, Érudits runs in parallel for 7–14 days:

```typescript
import { ParallelRunMonitor, ERUDITS_CUTOVER_RUNBOOK } from './migrations/parallel-run-monitor';

const monitor = new ParallelRunMonitor(migrationRepo, contentRepo, eventBus);

// Check readiness (run daily during parallel period)
const assessment = await monitor.assessReadiness(
  tenantId, migrationId, 'https://erudits.scholar.ly'
);

if (assessment.ready) {
  // Follow the 10-step cutover runbook
  // See ERUDITS_CUTOVER_RUNBOOK for the full procedure
  await migrationService.executeCutover(tenantId, migrationId);
}
```

## What's Built vs What's Remaining

### ✅ Complete (This Package)

| Component | Lines | Status |
|-----------|-------|--------|
| Onboarding Steps 1–7 | 2,806 | Production-ready, 0 type errors |
| Stripe Connect client | 584 | Ported from Érudits v2.10, scholarly_tutor_id metadata |
| GoDaddy Domain client | 559 | Full API v1 coverage, OTE sandbox support |
| Érudits provisioning | 553 | 7 subjects, Melbourne config, Squarespace extraction |
| Parallel run monitor | 741 | 11-check readiness, 10-step cutover runbook |
| UC v5.0 boot | 457 | JWT auth, NATS bridge, Prisma storage, 16 plugins |
| Prisma schema additions | 128 | UC KV store + onboarding models |
| Database migration | 323 | All DDL, idempotent |
| Test suite | 684 | Steps 1–3 flow, 10 mock factories |
| **Subtotal** | **6,835** | |

### 🔲 Sprint 3 (Next)

1. **E2E test suite** for Steps 4–7 (mock GoDaddy + Stripe Connect)
2. **Érudits migration Stages 3–4** (Transform + Review dashboard)
3. **ResourceStorefrontService** — Marketplace with Stripe Connect split payments
4. **Competition Platform foundation** — Schema + service skeleton for Dicta d'Or (July 2026)

### 🔲 Future Sprints

- Scholarly Storybook Engine (SSE) — see `scholarly-storybook-strategy.docx`
- Competition-as-a-Service — see `scholarly-competition-platform-architecture.docx`
- Cross-platform React Native app (Expo)
- Content SDK + Developer Portal
- Voice service integration (Kokoro TTS + Whisper STT)

## Key Domain Concepts

**Onboarding Session**: The persistent state object tracking a tutor's journey
through 7 steps. Stored in PostgreSQL, cached in Redis. Resumable — if the
browser closes mid-step, the tutor picks up where they left off.

**Persona Blueprint**: Templates that configure the onboarding flow per tutor
type: `TUTOR_SOLO` (individual tutor), `TUTOR_CENTRE` (tutoring business like
Érudits), `HOMESCHOOL_PARENT`, `SCHOOL_TEACHER`.

**Platform Migration**: The 6-stage pipeline for migrating from Squarespace to
Scholarly: Extract → Transform → Review → Import → Parallel Run → Cutover.
Érudits is the first migration, currently at Stages 1–2 (Extract + early
Transform).

**Parallel Run**: The 7–14 day period where both Squarespace and Scholarly
serve the same content. The `ParallelRunMonitor` checks content parity,
site health, and SEO readiness before allowing cutover.

**UC v5.0 Plugins**: 16 communication plugins (chat, video, telephony, webinar,
CRM, omnichannel inbox, compliance, AI transcription, etc.) managed by a plugin
lifecycle system. Booted via `uc-v5-scholarly-boot.ts` with Scholarly-specific
auth and event bridging.

## Important: Things NOT To Do

- **Never use `any` type** — use `unknown` and narrow, or define proper interfaces
- **Never call Prisma directly from services** — always go through repositories
- **Never block on NATS event publishing** — events are fire-and-forget
- **Never skip tenant isolation** — every query must filter by `tenantId`
- **Never use placeholder implementations** — every method must be complete
- **Never commit `.env` files** — only `.env.template` with empty values
- **Never modify the source archives** — they are reference copies; port what you need

## Érudits-Specific Context

- **Owner**: Marie Dupont (marie@erudits.com.au)
- **Location**: Melbourne, VIC, Australia (timezone: Australia/Melbourne)
- **Current site**: https://www.erudits.com.au (Squarespace)
- **Custom domain**: erudits.com.au (to be pointed to Scholarly after cutover)
- **Theme**: Navy #1E3A5F / Red #C41E3A
- **Subjects**: French, VCE French, IB French B, DELF Prep, TEF Prep,
  French for Business, Conversational French
- **Competition**: Dicta d'Or French dictation (target: July 2026)
- **Availability**: Mon–Thu 9–20, Fri 9–17, Sat 9–14 AEST
- **Stripe**: 15% platform fee on resource sales
