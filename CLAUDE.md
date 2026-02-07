# Scholarly Platform - Claude Agent Guide

## Project Overview

Scholarly is an AI-powered education platform. This is a monorepo managed with **Turbo** and **pnpm workspaces**.

## Monorepo Structure

```
scholarly/
├── packages/
│   ├── web/          # @scholarly/web - Next.js 14 frontend (port 3000)
│   ├── api/          # @scholarly/api - Express.js backend (port 3001)
│   ├── database/     # @scholarly/database - Prisma ORM + PostgreSQL
│   ├── shared/       # @scholarly/shared - Shared types/utilities
│   ├── blockchain/   # @scholarly/blockchain - Token economy (ethers.js)
│   └── curriculum-processor/  # Curriculum ingestion tooling
├── site/             # Static landing site (HTML files copied to web/public)
├── Dockerfile        # Web production image (multi-stage, standalone Next.js)
├── Dockerfile.api    # API production image
└── turbo.json        # Turbo pipeline config
```

## Package Manager & Runtime

- **Package manager**: pnpm 8.15.0 (`packageManager` field in root package.json)
- **Node.js**: >=20.0.0
- **Workspace config**: `pnpm-workspace.yaml` includes `packages/*` and `apps/*`
- **Lock file**: `pnpm-lock.yaml` (always use `--frozen-lockfile` in CI)

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm --filter web build` | Build the web package only |
| `pnpm --filter web dev` | Start web dev server (port 3000) |
| `pnpm --filter @scholarly/api dev` | Start API dev server (port 3001) |
| `pnpm --filter @scholarly/database exec prisma generate` | Generate Prisma client |
| `pnpm --filter @scholarly/database exec prisma migrate dev` | Run database migrations |
| `pnpm --filter @scholarly/database exec prisma studio` | Open Prisma Studio |
| `pnpm run build` | Build all packages (via Turbo) |
| `pnpm run lint` | Lint all packages |
| `pnpm run test` | Test all packages |

## Web Package (`packages/web`)

### Stack
- **Framework**: Next.js 14.0.4 (App Router, `output: 'standalone'`)
- **React**: 18.2.0
- **TypeScript**: 5.3.3
- **Styling**: Tailwind CSS 3.4.1 + `tailwindcss-animate`
- **Components**: Shadcn/UI (Radix UI primitives + `class-variance-authority` + `tailwind-merge`)
- **Icons**: lucide-react ^0.303.0
- **State**: Zustand 4.4.7
- **Data fetching**: TanStack React Query 5.17.0
- **Tables**: TanStack React Table 8.11.2
- **Forms**: React Hook Form 7.49.3 + Zod 3.22.4
- **Charts**: Recharts 2.10.3
- **Animation**: Framer Motion 10.18.0
- **Date**: date-fns 3.2.0
- **Theme**: next-themes 0.2.1

### Next.js Config (`next.config.js`)
- `reactStrictMode: true`
- `output: 'standalone'` (for Docker deployment)
- `transpilePackages: ['@scholarly/shared']`
- Default API URL: `NEXT_PUBLIC_API_URL` env var, falls back to `http://localhost:3001`
- Rewrites: `/site/*` routes map to static HTML files in `public/`

### Route Groups
- `(dashboard)/` — Main authenticated app pages
- `(early-years)/` — Early Years module (ages 3-7)
- `(auth)/` — Authentication and onboarding flows

### Icon Policy

**lucide-react is the ONLY icon library.** No emoji icons, with two exceptions:

1. **Early Years module** (`packages/web/src/app/(early-years)/`, `packages/web/src/components/early-years/`, `packages/web/src/types/early-years.ts`, `packages/web/src/lib/early-years-api.ts`): Emoji icons are intentionally kept for child-friendliness
2. **Country flags**: Emoji flags (e.g. `🇪🇸`, `🇫🇷`) are used for language selectors

**Icon usage pattern:**
```tsx
import { IconName } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Inline
<IconName className="h-5 w-5 text-primary" />

// Dynamic (pass as component)
const icons: Record<string, LucideIcon> = { key: IconName };
<icon.component className="h-5 w-5" />
```

**Known missing icons**: `Bear` does NOT exist in lucide-react — use `PawPrint` instead.

### Theme / Design System

**Catppuccin-inspired** color scheme defined in `globals.css` using HSL CSS variables:

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| Primary | `#8839ef` (purple) | `#cba6f7` |
| Accent | `#04a5e5` (cyan) | `#89dceb` |
| Background | `#eff1f5` | `#181825` |
| Foreground | `#4c4f69` | `#cdd6f4` |
| Destructive | `#d20f39` | `#f38ba8` |
| Success | `#40a02b` | `#a6e3a1` |
| Warning | `#fe640b` | `#fab387` |

**Tailwind** extends colors with brand overrides (blue, indigo, violet, emerald, amber, red) and a `scholarly.*` namespace. Uses HSL variables via `hsl(var(--token))` pattern in Tailwind config.

**Font**: Montserrat (--font-sans), Fira Code (--font-mono)

**Dark mode**: Class-based (`darkMode: ['class']`), toggled via `next-themes`

## API Package (`packages/api`)

### Stack
- **Framework**: Express.js 4.18.2 with TypeScript
- **ORM**: Prisma (via `@scholarly/database` workspace dep)
- **Auth**: JWT (`jsonwebtoken`) + bcrypt
- **Validation**: Zod
- **Logging**: Pino + pino-http
- **Security**: Helmet, CORS, express-rate-limit
- **Email**: SendGrid (`@sendgrid/mail`)
- **Voice**: ElevenLabs (`@elevenlabs/elevenlabs-js`)
- **Payments**: Stripe
- **WebSockets**: ws
- **Cache**: Redis
- **Testing**: Vitest + @faker-js/faker
- **Port**: 3001

### API Routes (`packages/api/src/routes/`)

**Core routes** (pre-sprint):
`/auth`, `/users`, `/tutors`, `/bookings`, `/sessions`, `/curriculum`, `/content`, `/homeschool`, `/micro-schools`, `/relief`, `/dashboard`, `/ai-buddy`, `/portfolio`, `/standards`, `/analytics`, `/data-lake`, `/ml`, `/design-pitch`, `/showcase`, `/early-years`, `/linguaflow`, `/interoperability`, `/golden-path`, `/ssi`, `/advanced-learning`, `/governance`, `/marketplace`, `/subscriptions`, `/identity`, `/payment`, `/hosting`, `/verification`, `/voice`, `/workspace`, `/integrations/google-drive`, `/integrations/onedrive`

**Sprint module routes** (Sprints 1-18):

| Route | File | Description |
|-------|------|-------------|
| `/api/v1/storybook/*` | `storybook.ts` | Story generation, illustration pipeline, audio narration, library search, 5-stage review pipeline, seed library, marketplace economics, content moderation, multilingual support |
| `/api/v1/arena/*` | `arena.ts` | Competitions (10 formats), tournaments (8 formats), teams, community dashboard, token economy (4 token types), content bounties, pilot arena |
| `/api/v1/developer/*` | `developer-portal.ts` | API docs, webhooks (14 event types), SDK tutorials, templates, LMS integration (Google Classroom, Canvas, Moodle), studio portal, developer tiers |
| `/api/v1/ai-engine/*` | `ai-engine.ts` | AI provider management (OpenAI/Claude/Gemini), tutor conversation engine, BKT mastery tracking v2, ML personalisation (21-dim feature vectors), cost/fallback management, wellbeing checks |
| `/api/v1/compliance/*` | `compliance.ts` | Data retention (COPPA/GDPR/FERPA), A/B testing framework, security audit, accessibility audit, monitoring/alerting (10 rules), production deployment orchestration |
| `/api/v1/parent/*` | `parent-portal.ts` | Child progress, activity feed, home activities, family management, daily digest, notification preferences |
| `/api/v1/collaboration/*` | `collaboration.ts` | Collaborative story creation, teacher lesson plans (fork/comments), resource exchange |

All sprint routes are protected with `authMiddleware`.

### Sprint Module Services (`packages/api/src/services/`)

These directories contain **90+ TypeScript service blueprints** from Sprints 1-18. They are **excluded from TypeScript compilation** (see `tsconfig.json` `exclude` array) because they reference external types/modules not yet in the dependency tree. They serve as implementation reference and will be incrementally integrated.

```
packages/api/src/
├── services/
│   ├── ai/                    # AI abstraction layer (7 files + adapters/)
│   │   ├── adapters/          # Provider adapters (OpenAI, Claude, Gemini)
│   │   ├── capability-interfaces.ts
│   │   ├── provider-registry.ts
│   │   ├── ai-cache.ts
│   │   ├── ai-cost-fallback.ts
│   │   └── ai-wellbeing-parent-services.ts
│   ├── storybook/             # Storybook engine (24 files)
│   │   ├── narrative-generator.ts
│   │   ├── interactive-reader.ts
│   │   ├── illustration-pipeline.ts
│   │   ├── audio-narration.ts
│   │   ├── marketplace-economics.ts
│   │   ├── review-pipeline.ts
│   │   ├── seed-library.ts
│   │   ├── content-marketplace-beta.ts
│   │   └── ... (16 more)
│   ├── arena/                 # Gamification engine (12 files)
│   │   ├── arena-competition-engine.ts
│   │   ├── arena-team-system.ts
│   │   ├── token-economy-engine.ts
│   │   ├── dao-governance-enhanced.ts
│   │   └── ... (8 more)
│   ├── developer/             # Developer portal (15 files)
│   │   ├── developer-portal.ts
│   │   ├── enterprise-deliverables.ts
│   │   ├── lms-integration.ts
│   │   └── ... (12 more)
│   ├── mobile/                # Mobile app services (10 files)
│   │   ├── parent-mobile-app.ts
│   │   ├── app-shell.ts
│   │   └── ... (8 more)
│   ├── compliance/            # Compliance & security (5 files)
│   │   ├── data-retention-purge.ts
│   │   ├── ab-testing-framework.ts
│   │   ├── end-to-end-security-audit.ts
│   │   └── ... (2 more)
│   ├── deployment/            # Deployment & ops (13 files)
│   │   ├── production-deploy.ts
│   │   ├── load-testing.ts
│   │   ├── migration-runner.ts
│   │   └── ... (10 more)
│   ├── ml/                    # ML personalisation (6 files)
│   │   ├── ml-driven-personalisation.ts
│   │   ├── advanced-bkt-v2.ts
│   │   ├── ai-tutor-conversation-engine.ts
│   │   └── ... (3 more)
│   ├── collaboration/         # Collaboration tools (2 files)
│   │   ├── collaborative-story-creation.ts
│   │   └── teacher-collaboration-tools.ts
│   ├── parent/                # Parent portal (2 files)
│   │   ├── parent-companion.ts
│   │   └── parent-mobile-app.ts
│   └── storage/               # File storage (1 file)
│       └── file-storage-service.ts
├── infrastructure/            # Platform infrastructure (21 files)
│   ├── config-validation.ts
│   ├── logger.ts
│   ├── redis-cache.ts
│   ├── nats-event-bus.ts
│   ├── payment-gateway.ts
│   ├── observability.ts
│   ├── notification-service.ts
│   ├── api-gateway.ts
│   ├── real-database-operations.ts
│   ├── authentication-authorization.ts
│   ├── input-validation.ts
│   └── ... (10 more)
└── routes/                    # Express route handlers
```

### tsconfig.json Exclusions

The API `tsconfig.json` excludes sprint module directories to prevent compilation errors from unresolved external references:

```json
"exclude": [
  "node_modules", "dist",
  "src/services/ai", "src/services/storybook", "src/services/arena",
  "src/services/developer", "src/services/mobile", "src/services/compliance",
  "src/services/deployment", "src/services/ml", "src/services/collaboration",
  "src/services/parent", "src/services/storage", "src/infrastructure"
]
```

**Important**: When incrementally integrating a service blueprint, remove it from the exclude list and resolve its type dependencies.

## Database Package (`packages/database`)

- **ORM**: Prisma 5.9.0
- **Database**: PostgreSQL
- **Build**: tsup (CJS + ESM + DTS)
- **Schema**: `packages/database/prisma/schema.prisma`

## Azure Infrastructure

### Subscription & Tenant
- **Subscription**: `chekd-id` (ID: `38bcaa28-0050-4951-8aec-abb63e491c37`)
- **Tenant**: `swotsmart.com` (ID: `b5b30124-ff98-4f9e-97ad-00448a4b917b`)

### Resources (Production)
- **Resource Group**: `scholarly-rg` (Australia East)
- **Container Registry (ACR)**: `scholarlyacr` (login server: `scholarlyacr.azurecr.io`, admin enabled)
- **Web Container App**: `scholarly`
  - Image: `scholarlyacr.azurecr.io/scholarly-web:latest`
  - FQDN: `scholarly.bravefield-dce0abaf.australiaeast.azurecontainerapps.io`
  - Port: 3000
- **API Container App**: `scholarly-api`
  - Image: `scholarlyacr.azurecr.io/scholarly-api:v1.0.1`
  - Port: 3001

### CI/CD (`.github/workflows/deploy.yml`)
- Triggers: push to main, PR to main, manual dispatch
- CI defaults ACR to `scholarlydevacr` (overridable via `vars.ACR_NAME`)
- Deploy targets: Container Apps (default) or AKS
- Environments: dev (default), prod
- Image tagging: SHA, branch, semver, `latest` on default branch

## Docker

### Web (`Dockerfile`)
- Base: `node:20-alpine`
- Multi-stage: `base` → `deps` → `builder` → `runner`
- Installs pnpm 8.15.0 via corepack
- Generates Prisma client in deps stage
- Builds all packages in order (shared → database → api → web)
- **API build uses `|| true`**: The API package has pre-existing type errors from Prisma model mismatches when built standalone (resolved by Turbo dependency chain in dev). The Dockerfile uses `pnpm --filter @scholarly/api build || true` to allow the Docker build to continue.
- Copies static site HTML from `site/` to `packages/web/public/`
- Fixes pnpm symlinks in standalone output
- Production runs as non-root `scholarly` user
- **Port**: 3000
- Health check: `wget http://localhost:3000/`

### CRITICAL: Platform Architecture
**Always build with `--platform linux/amd64` when deploying to Azure.** macOS (Apple Silicon) defaults to arm64 which will fail on Azure Container Apps:
```bash
docker build --platform linux/amd64 -t scholarlyacr.azurecr.io/scholarly-web:latest -f Dockerfile .
```

### Manual Deployment
```bash
# Login to ACR
az acr login --name scholarlyacr

# Build for linux/amd64
docker build --platform linux/amd64 -t scholarlyacr.azurecr.io/scholarly-web:latest -f Dockerfile .

# Push
docker push scholarlyacr.azurecr.io/scholarly-web:latest

# Deploy
az containerapp update --name scholarly --resource-group scholarly-rg --image scholarlyacr.azurecr.io/scholarly-web:latest
```

## Environment Variables

| Variable | Package | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | web | API base URL (default: `http://localhost:3001`) |
| `DATABASE_URL` | database | PostgreSQL connection string |
| `REDIS_URL` | api | Redis connection string |
| `JWT_SECRET` | api | JWT signing secret |
| `SENDGRID_API_KEY` | api | SendGrid email API key |
| `STRIPE_SECRET_KEY` | api | Stripe payment key |
| `ELEVENLABS_API_KEY` | api | ElevenLabs voice API key |
| `NEXT_TELEMETRY_DISABLED` | web | Set to `1` in Docker builds |

## Sprint Delivery Reference

The original sprint delivery specs (Sprints 1-18) are located at:
```
~/claude-code/scholarly/docs/new-modules-to-deploy/scholarly-platform-unified-implementation-plan/
├── Sprint1-delivery/   # Infrastructure + AI abstraction
├── Sprint2-delivery/   # AI extensions + observability + storybook
├── Sprint3-delivery/   # Interactive reader + illustration + cross-platform
├── Sprint4-delivery/   # Marketplace + review pipeline + studio
├── Sprint5-delivery/   # Repositories + events + generation orchestrator
├── Sprint6-delivery/   # Arena-storybook + appstore + v2 iterations
├── Sprint7-delivery/   # Migration + build pipeline + arena pilot
├── Sprint8-delivery/   # Developer portal + webhooks + LMS
├── Sprint9-delivery/   # Arena competition + DAO governance + token economy
├── Sprint10-delivery/  # App shell + enchanted library + observability
├── Sprint11-delivery/  # Collaboration + parent companion + analytics
├── Sprint12-delivery/  # Offline mode + security + beta programme
├── Sprint13-delivery/  # Data retention + A/B testing + parent mobile
├── Sprint14-delivery/  # ML personalisation + enterprise + data lake
├── Sprint15-delivery/  # AI tutor + BKT v2 + remaining AI
├── Sprint16-delivery/  # Security audit + marketplace beta + dev portal launch
├── Sprint17-delivery/  # Seed library v2 + ops + production deploy
└── Sprint18-delivery/  # Real DB ops + auth + file storage + validation
```

**NOTE**: This path (`~/claude-code/scholarly/`) is DIFFERENT from the working repo (`~/claude-code/orebot/scholarly/`). Sprint specs have been copied into `packages/api/src/services/` and `packages/api/src/infrastructure/`.

## Conventions

- **Imports**: Use `@/` path alias for web package (maps to `packages/web/src/`)
- **Components**: Shadcn/UI components live in `packages/web/src/components/ui/`
- **Types**: Domain types in `packages/web/src/types/`
- **No emoji in UI**: Use lucide-react icons exclusively (except Early Years + country flags)
- **Workspace deps**: Use `workspace:*` for internal package references
