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
├── apps/
│   └── mobile/       # @mati/mobile - Expo React Native app (Phonics & Storybook)
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

### Shared Resources
- **Resource Group**: `scholarly-rg` (Australia East)
- **Container Registry (ACR)**: `scholarlyacr` (login server: `scholarlyacr.azurecr.io`, admin enabled)
- **Container Apps Environment**: `scholarly-env` (shared by production and staging)

### Resources (Production)
- **Web Container App**: `scholarly`
  - Image: `scholarlyacr.azurecr.io/scholarly-web:<git-sha>` (NEVER use `latest` — always tag with git SHA)
  - FQDN: `scholarly.bravefield-dce0abaf.australiaeast.azurecontainerapps.io`
  - Port: 3000, Scale: 1-3 replicas, 0.5 vCPU / 1Gi
  - Env: `NODE_ENV=production`, `NEXT_PUBLIC_DEMO_MODE=false`, `NEXT_PUBLIC_API_URL=https://scholarly-api.bravefield-dce0abaf.australiaeast.azurecontainerapps.io/api/v1`
- **API Container App**: `scholarly-api`
  - Image: `scholarlyacr.azurecr.io/scholarly-api:<git-sha>`
  - FQDN: `scholarly-api.bravefield-dce0abaf.australiaeast.azurecontainerapps.io`
  - Port: 3001, Scale: 1-3 replicas, 0.5 vCPU / 1Gi
  - Env: `NODE_ENV=production`, `DATABASE_URL=<prod-connection-string>`

### Resources (Staging)
- **Web Container App**: `scholarly-staging`
  - Image: `scholarlyacr.azurecr.io/scholarly-web:<git-sha>` (same image as prod, same SHA)
  - FQDN: `scholarly-staging.bravefield-dce0abaf.australiaeast.azurecontainerapps.io`
  - Port: 3000, Scale: 0-2 replicas (scales to zero when idle), 0.5 vCPU / 1Gi
  - Env: `NODE_ENV=staging`, `NEXT_PUBLIC_DEMO_MODE=true`, `NEXT_PUBLIC_API_URL=https://scholarly-staging-api.bravefield-dce0abaf.australiaeast.azurecontainerapps.io/api/v1`
- **API Container App**: `scholarly-staging-api`
  - Image: `scholarlyacr.azurecr.io/scholarly-api:staging-<git-sha>`
  - FQDN: `scholarly-staging-api.bravefield-dce0abaf.australiaeast.azurecontainerapps.io`
  - Port: 3001, Scale: 0-2 replicas (scales to zero when idle), 0.5 vCPU / 1Gi
  - Env: `NODE_ENV=staging`, `NEXT_PUBLIC_DEMO_MODE=true`

### CI/CD (`.github/workflows/deploy.yml`)
- Triggers: push to main, PR to main, manual dispatch
- CI defaults ACR to `scholarlydevacr` (overridable via `vars.ACR_NAME`)
- Deploy targets: Container Apps (default) or AKS
- Environments: dev (default), staging, prod
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

### CRITICAL: Deployment Rules
1. **ALWAYS use Azure CLI** (`az`) for builds and deployments — never use local `docker build`/`docker push`
2. **NEVER use `latest` tag in production** — always tag images with the git SHA (`git rev-parse --short HEAD`)
3. **Use `az acr build`** to build images remotely in ACR (handles platform architecture automatically, no local Docker needed)

### Staging Deployment (Azure CLI)
```bash
TAG=$(git rev-parse --short HEAD)

# Build both images
az acr build --registry scholarlyacr --image scholarly-web:$TAG --platform linux/amd64 --file Dockerfile .
az acr build --registry scholarlyacr --image scholarly-api:staging-$TAG --platform linux/amd64 --file Dockerfile.api .

# Deploy to staging
az containerapp update --name scholarly-staging --resource-group scholarly-rg --image scholarlyacr.azurecr.io/scholarly-web:$TAG
az containerapp update --name scholarly-staging-api --resource-group scholarly-rg --image scholarlyacr.azurecr.io/scholarly-api:staging-$TAG

# Verify
az containerapp list --resource-group scholarly-rg --query "[?contains(name,'staging')].{name:name,image:properties.template.containers[0].image,status:properties.runningStatus}" -o table
```

### Production Deployment (Azure CLI)
```bash
TAG=$(git rev-parse --short HEAD)

# Build in ACR (remote build — no local Docker required)
az acr build --registry scholarlyacr --image scholarly-web:$TAG --platform linux/amd64 --file Dockerfile .

# Deploy to production
az containerapp update --name scholarly --resource-group scholarly-rg --image scholarlyacr.azurecr.io/scholarly-web:$TAG

# Verify
az containerapp show --name scholarly --resource-group scholarly-rg --query "{image:properties.template.containers[0].image, state:properties.provisioningState, status:properties.runningStatus}" -o json
```

### Promote Staging to Production
```bash
# After verifying staging, deploy the same image to production
TAG=$(az containerapp show --name scholarly-staging --resource-group scholarly-rg --query "properties.template.containers[0].image" -o tsv | grep -oP ':\K.*')
az containerapp update --name scholarly --resource-group scholarly-rg --image scholarlyacr.azurecr.io/scholarly-web:$TAG
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

**NOTE**: The original sprint docs repo that was at this path has been deleted. Sprint specs have been copied into `packages/api/src/services/` and `packages/api/src/infrastructure/`. The working repo is now at `~/claude-code/scholarly/`.

## Mobile App (`apps/mobile`)

### Overview
- **Package**: `@mati/mobile`
- **App name**: "Mati - Learn to Read"
- **Target**: Ages 3-7 (Phonics Forest + Story Garden)
- **Architecture**: Expo native shell + WebView for interactive content
- **iOS Bundle ID**: `com.mati.phonics`
- **Android Package**: `app.mati.phonics`

### Stack
- **Framework**: Expo ~52.0.0 + React Native 0.76.5
- **Router**: Expo Router ~4.0.0 (file-based routing)
- **State**: Zustand ^4.4.7
- **WebView**: react-native-webview 13.12.5
- **Auth storage**: expo-secure-store
- **Haptics**: expo-haptics
- **Notifications**: expo-notifications
- **IAP**: expo-in-app-purchases
- **Build/Submit**: EAS CLI (eas.json profiles: development, preview, production)

### Architecture

**Native shell** handles: splash, onboarding, auth, tab navigation, parental gate, subscriptions, push notifications, haptic feedback.

**WebView** loads the deployed Next.js early-years pages at the Container App FQDN for the complex interactive phonics/story content (30,000+ lines of React with Framer Motion, audio, drag-and-drop).

**Bridge protocol**: `postMessage`/`onMessage` for WebView ↔ Native communication. Message types defined in `apps/mobile/lib/bridge.ts`. Web-side hook at `packages/web/src/hooks/use-native-bridge.ts`.

### Project Structure

```
apps/mobile/
├── app.config.ts                # Dynamic Expo config (bundle IDs, splash, plugins)
├── eas.json                     # EAS Build + Submit profiles
├── package.json                 # @mati/mobile
├── metro.config.js              # Monorepo-aware Metro bundler config
├── babel.config.js              # Babel + reanimated plugin
├── tsconfig.json                # Extends expo/tsconfig.base
├── index.ts                     # Entry (expo-router/entry)
├── assets/                      # Icon, splash, adaptive icon, fonts
├── app/                         # Expo Router file-based routes
│   ├── _layout.tsx              # Root layout (SafeAreaProvider, fonts, splash gate)
│   ├── (auth)/                  # Auth stack
│   │   ├── _layout.tsx          # Redirects if authenticated
│   │   ├── welcome.tsx          # 3-slide onboarding + COPPA consent checkbox
│   │   └── login.tsx            # Parent email/password login
│   ├── (tabs)/                  # Main tab navigator
│   │   ├── _layout.tsx          # 3-tab layout (Home, Learn, Parent)
│   │   ├── index.tsx            # Home: child greeting, module cards, daily stats
│   │   ├── learn.tsx            # Learn: WebView → /early-years
│   │   └── parent.tsx           # Parent: settings, subscription, privacy (gate-protected)
│   ├── parental-gate.tsx        # Modal: math question gate (30s timeout, 3 attempts)
│   └── subscription.tsx         # Modal: IAP paywall (3 tiers)
├── components/
│   ├── WebViewShell.tsx         # WebView with bridge, offline fallback, domain lock
│   ├── ParentalGate.tsx         # COPPA math-based gate UI
│   ├── SplashLoader.tsx         # Animated splash screen
│   ├── OnboardingSlide.tsx      # Welcome carousel slide
│   └── SubscriptionCard.tsx     # IAP tier card
├── hooks/
│   ├── useWebViewBridge.ts      # WebView ↔ Native messaging helpers
│   ├── useParentalGate.ts       # Gate state + requireGate() helper
│   ├── usePushNotifications.ts  # Permission + daily reminder scheduling
│   └── useSubscription.ts       # IAP products, purchase, restore
├── lib/
│   ├── bridge.ts                # WebToNativeMessage/NativeToWebMessage types + serialization
│   ├── auth.ts                  # expo-secure-store token CRUD
│   ├── analytics.ts             # Privacy-safe (random session IDs only, no IDFA/GAID)
│   └── constants.ts             # URLs, bundle IDs, subscription tiers, colors
├── stores/
│   ├── app-store.ts             # Online status, active child, parental gate, subscription
│   └── auth-store.ts            # Auth state with expo-secure-store persistence
├── ios/mati-phonics/
│   └── PrivacyInfo.xcprivacy    # iOS 17+ privacy manifest (no tracking, no collected data)
└── store-assets/
    ├── screenshots/             # 15 mockups: iphone-67/, ipad-129/, android/ (5 each)
    └── metadata/en-AU/          # title, subtitle, description, keywords, release-notes
```

### COPPA Compliance
- No ads, no IDFA/GAID, no third-party tracking, no social features for children
- Parental gate (math question, 30s timeout, 3 attempts) required before: settings, subscriptions, parent dashboard, external links
- COPPA consent checkbox on onboarding (must be affirmatively tapped by parent)
- Gate valid for 15 minutes after passing
- Privacy-safe analytics: random session IDs only, no personal data

### WebView Bridge Messages

**Web → Native**: `haptic`, `navigate`, `authRequest`, `openParentalGate`, `sessionComplete`, `audioPlay`, `audioStop`, `ready`

**Native → Web**: `authToken`, `parentalGateResult`, `themeChange`, `offlineStatus`, `subscriptionStatus`

### Subscription Tiers (IAP)
| Tier | Product ID | Price | Trial |
|------|-----------|-------|-------|
| Explorer | `mati_explorer_monthly` | $4.99/mo | 7 days |
| Scholar | `mati_scholar_monthly` | $9.99/mo | 7 days |
| Academy | `mati_academy_monthly` | $19.99/mo | 14 days |

### Key Commands

| Command | Description |
|---------|-------------|
| `cd apps/mobile && npx expo start` | Start Expo dev server |
| `eas build --profile development --platform ios` | Build dev client (iOS simulator) |
| `eas build --profile preview --platform all` | Build preview for device testing |
| `eas build --profile production --platform all` | Build production binaries |
| `eas submit --platform ios --profile production` | Submit to App Store |
| `eas submit --platform android --profile production` | Submit to Google Play |

### Prerequisites for App Store Submission
1. Apple Developer Program membership ($99/year)
2. Google Play Developer account ($25 one-time)
3. App ID `com.mati.phonics` in Apple Developer portal
4. App created in App Store Connect and Google Play Console
5. App Store Connect API key → set in `eas.json`
6. Google Play service account JSON key → `apps/mobile/google-play-service-account.json` (gitignored)
7. EAS CLI: `npm install -g eas-cli && eas login`
8. Replace `YOUR_EAS_PROJECT_ID` in `app.config.ts` after `eas init`
9. ~~Replace placeholder PNGs in `assets/`~~ — DONE: Production icons (1024x1024) and splash (1284x2778) are in place
10. Add Montserrat font files to `assets/fonts/` (Regular, Bold, SemiBold .ttf) — directory exists but is **empty**

### App Store Deployment Status (as of 2026-02-10)

**No builds or submissions have been made.** No `.eas/` directory or build artifacts exist.

| Item | Status | Notes |
|------|--------|-------|
| App icons & splash | Done | Mati-branded art at correct dimensions (1024x1024 icon, 1024x1024 adaptive, 1284x2778 splash) |
| Store screenshots | Done | 15 mockups across 3 device classes (iPhone 6.7", iPad 12.9", Android) |
| Store metadata (en-AU) | Done | Title, subtitle, keywords, description, release notes, promotional text |
| iOS Privacy Manifest | Done | COPPA-compliant, no tracking, no data collection |
| Google Play feature graphic | Done | Mati-branded 1024x500 at `store-assets/feature-graphic.png` |
| Subscription IAP config | Done | 3 tiers in `lib/constants.ts` (product IDs: `mati_*_monthly`) |
| **EAS Project ID** | **BLOCKED** | `app.config.ts` line 75 still has `YOUR_EAS_PROJECT_ID` — run `eas init` |
| **Montserrat fonts** | **BLOCKED** | `assets/fonts/` is empty — download Regular/Bold/SemiBold .ttf from Google Fonts |
| **Apple credentials** | **BLOCKED** | `eas.json` has `YOUR_APPLE_ID`, `YOUR_APP_STORE_CONNECT_APP_ID`, `YOUR_APPLE_TEAM_ID` |
| **Google Play service account** | **BLOCKED** | `google-play-service-account.json` missing (gitignored) — create in Google Cloud Console |

### Web-Side Integration
- `packages/web/src/hooks/use-native-bridge.ts` — Detects `window.ReactNativeWebView`, provides haptic/navigate/auth bridge methods
- Loaded in `packages/web/src/app/(early-years)/layout.tsx` via `useNativeBridge()` hook
- `packages/web/src/app/(auth)/privacy/page.tsx` — Updated with COPPA/mobile-specific sections (required URL for both stores)
- `packages/web/src/app/(auth)/support/page.tsx` — Help & support page (required URL for both stores)

## Conventions

- **Imports**: Use `@/` path alias for web package (maps to `packages/web/src/`), and for mobile package (maps to `apps/mobile/`)
- **Components**: Shadcn/UI components live in `packages/web/src/components/ui/`
- **Types**: Domain types in `packages/web/src/types/`
- **No emoji in UI**: Use lucide-react icons exclusively (except Early Years + country flags + mobile app child-facing screens)
- **Workspace deps**: Use `workspace:*` for internal package references
