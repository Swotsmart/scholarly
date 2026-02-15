# Scholarly Platform - Claude Agent Guide

## Overview

AI-powered education platform. Monorepo: **Turbo** + **pnpm 8.15.0** workspaces. Node.js >=20.

```
packages/web/          # @scholarly/web - Next.js 14 (port 3000)
packages/api/          # @scholarly/api - Express.js (port 3001)
packages/database/     # @scholarly/database - Prisma 5.9 + PostgreSQL
packages/shared/       # @scholarly/shared - Shared types/utilities
packages/blockchain/   # Token economy (ethers.js)
apps/mobile/           # @mati/mobile - Expo React Native (ages 3-7)
site/                  # Static landing (copied to web/public)
```

## Key Commands

```bash
pnpm install                                              # Install all
pnpm --filter web dev                                     # Web dev (port 3000)
pnpm --filter @scholarly/api dev                          # API dev (port 3001)
pnpm --filter @scholarly/database exec prisma generate    # Generate Prisma client
pnpm --filter @scholarly/database exec prisma migrate dev # Run migrations
pnpm run build                                            # Build all (Turbo)
```

## Web (`packages/web`)

**Stack**: Next.js 14 (App Router, standalone), React 18, TypeScript 5.3, Tailwind CSS + Shadcn/UI, Zustand, TanStack Query/Table, React Hook Form + Zod, Recharts, Framer Motion, date-fns, next-themes.

**Route groups**: `(dashboard)/` authenticated pages, `(early-years)/` ages 3-7, `(auth)/` login/onboarding.

**Icons**: lucide-react ONLY. No emoji except: Early Years module (child-friendliness) and country flags. `Bear` icon doesn't exist — use `PawPrint`.

**Theme**: Catppuccin-inspired HSL variables in `globals.css`. Primary purple `#8839ef`/`#cba6f7`. Fonts: Montserrat (sans), Fira Code (mono). Dark mode via class + next-themes.

**Config**: `output: 'standalone'`, `transpilePackages: ['@scholarly/shared']`, API URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).

## API (`packages/api`)

**Stack**: Express 4.18, Prisma, JWT + bcrypt, Zod, Pino, Helmet/CORS/rate-limit, SendGrid, ElevenLabs, Stripe, ws, Redis, Vitest.

**Sprint services** (`src/services/`, `src/infrastructure/`): 90+ TypeScript blueprints from Sprints 1-18. **Excluded from tsconfig.json compilation** due to unresolved external references. When integrating a service, remove from the exclude list and resolve dependencies.

**Sprint routes** (all `authMiddleware`-protected): `/api/v1/storybook/*`, `/api/v1/arena/*`, `/api/v1/developer/*`, `/api/v1/ai-engine/*`, `/api/v1/compliance/*`, `/api/v1/parent/*`, `/api/v1/collaboration/*`.

## Database (`packages/database`)

Prisma 5.9 + PostgreSQL. Schema at `prisma/schema.prisma`. Build: tsup (CJS + ESM + DTS).

## Azure Infrastructure

- **Resource Group**: `scholarly-rg` (Australia East)
- **ACR**: `scholarlyacr` (`scholarlyacr.azurecr.io`)
- **Environment**: `scholarly-env`

| App | FQDN prefix | Scale | Notes |
|-----|-------------|-------|-------|
| `scholarly` (prod web) | `scholarly.bravefield-dce0abaf...` | 1-3 | `NEXT_PUBLIC_DEMO_MODE=false` |
| `scholarly-api` (prod API) | `scholarly-api.bravefield-dce0abaf...` | 1-3 | |
| `scholarly-staging` (staging web) | `scholarly-staging.bravefield-dce0abaf...` | 0-2 | `NEXT_PUBLIC_DEMO_MODE=true` |
| `scholarly-staging-api` | `scholarly-staging-api.bravefield-dce0abaf...` | 0-2 | DB: `scholarly_staging` on shared server |

All FQDNs end with `.australiaeast.azurecontainerapps.io`.

### CRITICAL: Deployment Rules
1. **ALWAYS use `az acr build`** — never local `docker build`/`docker push`
2. **NEVER use `latest` tag** — always tag with git SHA (`git rev-parse --short HEAD`)
3. API Dockerfile uses `|| true` for build (pre-existing type errors)

### Deploy Commands
```bash
TAG=$(git rev-parse --short HEAD)
# Build
az acr build --registry scholarlyacr --image scholarly-web:$TAG --platform linux/amd64 --file Dockerfile .
az acr build --registry scholarlyacr --image scholarly-api:staging-$TAG --platform linux/amd64 --file Dockerfile.api .
# Deploy staging
az containerapp update --name scholarly-staging --resource-group scholarly-rg --image scholarlyacr.azurecr.io/scholarly-web:$TAG
az containerapp update --name scholarly-staging-api --resource-group scholarly-rg --image scholarlyacr.azurecr.io/scholarly-api:staging-$TAG
# Deploy production
az containerapp update --name scholarly --resource-group scholarly-rg --image scholarlyacr.azurecr.io/scholarly-web:$TAG
```

## Environment Variables

`NEXT_PUBLIC_API_URL` (web), `DATABASE_URL` (database), `REDIS_URL` / `JWT_SECRET` / `SENDGRID_API_KEY` / `STRIPE_SECRET_KEY` / `ELEVENLABS_API_KEY` (api).

## Mobile App (`apps/mobile`)

**"Mati - Learn to Read"** — Expo 52 + React Native 0.76, Expo Router 4, Zustand, WebView. iOS: `com.mati.phonics`, Android: `app.mati.phonics`.

**Architecture**: Native shell (splash, auth, tabs, parental gate, subscriptions) + WebView loading Next.js early-years pages. Bridge via `postMessage`/`onMessage` — types in `lib/bridge.ts`, web hook at `packages/web/src/hooks/use-native-bridge.ts`.

**COPPA**: No ads/tracking/social. Parental gate (math question, 30s timeout, 3 attempts, valid 15 min). COPPA consent on onboarding.

**Blocked items**: EAS Project ID (`YOUR_EAS_PROJECT_ID` in `app.config.ts`), Montserrat fonts (`assets/fonts/` empty), Apple credentials (placeholders in `eas.json`), Google Play service account JSON.

## Conventions

- **Imports**: `@/` alias for web (`packages/web/src/`) and mobile (`apps/mobile/`)
- **Components**: Shadcn/UI in `packages/web/src/components/ui/`
- **Types**: `packages/web/src/types/`
- **Icons**: lucide-react only (except Early Years + flags)
- **Workspace deps**: `workspace:*` for internal refs
