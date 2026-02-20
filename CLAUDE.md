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

**Auth store** (`src/stores/auth-store.ts`): Zustand with `persist` middleware. Must persist `accessToken`, `user`, AND `isAuthenticated` — if only `accessToken` is persisted, direct URL navigation (full page load) causes the `checkAuth` flow to call `api.auth.me()` which can fail and log the user out. Client-side navigation (sidebar clicks) doesn't trigger this because auth state is already in memory.

**Icons**: lucide-react ONLY. No emoji except: Early Years module (child-friendliness) and country flags. `Bear` icon doesn't exist — use `PawPrint`.

**Theme**: Catppuccin-inspired HSL variables in `globals.css`. Primary purple `#8839ef`/`#cba6f7`. Fonts: Montserrat (sans), Fira Code (mono). Dark mode via class + next-themes.

**Config**: `output: 'standalone'`, `transpilePackages: ['@scholarly/shared', '@scholarly/database']`, API URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).

**Repositories** (`src/repositories/`): Prisma-backed data access for server-side route handlers. Import `prisma` from `@scholarly/database`. All queries include `tenantId` for multi-tenant isolation. Current repositories: `menu-state`, `menu-push`, `menu-analytics`.

**API routes** (server-side only):
- `/api/v1/menu/sync` — GET/PUT menu state (uses `PrismaMenuStateRepository`)
- `/api/cron/push-expiry` — expires stale institutional pushes (uses `PrismaMenuPushRepository`)
- `/api/cron/menu-analytics` — daily event aggregation (uses `PrismaMenuAnalyticsRepository`)

## API (`packages/api`)

**Stack**: Express 4.18, Prisma, JWT + bcrypt, Zod, Pino, Helmet/CORS/rate-limit, SendGrid, ElevenLabs, Stripe, ws, Redis, Vitest.

**Sprint services** (`src/services/`, `src/infrastructure/`): 90+ TypeScript blueprints from Sprints 1-18. **Excluded from tsconfig.json compilation** due to unresolved external references. When integrating a service, remove from the exclude list and resolve dependencies.

**Sprint routes** (all `authMiddleware`-protected): `/api/v1/storybook/*`, `/api/v1/arena/*`, `/api/v1/developer/*`, `/api/v1/ai-engine/*`, `/api/v1/compliance/*`, `/api/v1/parent/*`, `/api/v1/collaboration/*`.

## Database (`packages/database`)

Prisma 5.9 + PostgreSQL. Schema at `prisma/schema.prisma`. Build: tsup (CJS + ESM + DTS). After schema changes, run `prisma generate` then `pnpm --filter @scholarly/database build` to regenerate types.

**Self-composing menu models** (Sprint 28): `UserMenuState`, `MenuPushRecord`, `MenuUsageEvent`, `MenuAnalyticsDaily`, `MenuSyncLog`. Migration `20260216182621_add_self_composing_menu_models` applied locally. For Azure deployment, run `prisma migrate deploy` against the production DATABASE_URL (stored in Azure Key Vault, secret `database-url`).

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
| `scholarly-voice` | `scholarly-voice.bravefield-dce0abaf...` | 1-1 | GPU T4, port 8100, Kokoro TTS |

All FQDNs end with `.australiaeast.azurecontainerapps.io`.

### CRITICAL: Deployment Rules
1. **ALWAYS use `az acr build`** — never local `docker build`/`docker push`
2. **NEVER use `latest` tag** — always tag with git SHA (`git rev-parse --short HEAD`)
3. API Dockerfile uses `|| true` for build (pre-existing type errors)
4. **Staging and production web MUST be separate builds** — `NEXT_PUBLIC_*` env vars are inlined at build time by Next.js, so each environment needs its own image with the correct `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_DEMO_MODE`. Using the same image for both will cause CORS failures.

### Deploy Commands
```bash
TAG=$(git rev-parse --short HEAD)

# Build web — MUST build separately for staging vs production
az acr build --registry scholarlyacr --image scholarly-web:$TAG --platform linux/amd64 --file Dockerfile .
az acr build --registry scholarlyacr --image scholarly-web:staging-$TAG --platform linux/amd64 --file Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://scholarly-staging-api.bravefield-dce0abaf.australiaeast.azurecontainerapps.io/api/v1 \
  --build-arg NEXT_PUBLIC_DEMO_MODE=true .

# Build API (shared image for staging + production)
az acr build --registry scholarlyacr --image scholarly-api:staging-$TAG --platform linux/amd64 --file Dockerfile.api .

# Deploy staging
az containerapp update --name scholarly-staging --resource-group scholarly-rg --image scholarlyacr.azurecr.io/scholarly-web:staging-$TAG
az containerapp update --name scholarly-staging-api --resource-group scholarly-rg --image scholarlyacr.azurecr.io/scholarly-api:staging-$TAG

# Deploy production
az containerapp update --name scholarly --resource-group scholarly-rg --image scholarlyacr.azurecr.io/scholarly-web:$TAG
az containerapp update --name scholarly-api --resource-group scholarly-rg --image scholarlyacr.azurecr.io/scholarly-api:staging-$TAG
```

## Voice Service (`services/voice-service`)

**Stack**: Python 3.11, FastAPI, Uvicorn, PyTorch, CUDA 12.1 runtime. Runs on `gpu-t4` workload profile in Azure Container Apps.

**Architecture**: Standalone Python microservice for TTS, STT, voice cloning, and phonics-aware narration. Communicates via REST API, no direct database access.

**Providers**: Kokoro TTS (primary, Apache 2.0, 48 voices), Whisper STT (optional, requires `faster-whisper`), Chatterbox voice cloning (optional, requires `ENABLE_CLONING=true` build arg).

**Port**: 8100 (internal). Health check at `/healthz`. API routes at `/api/v1/tts/*`, `/api/v1/stt/*`, `/api/v1/studio/*`, `/api/v1/cloning/*`.

**Container App**: `scholarly-voice` on `scholarly-env`. FQDN: `scholarly-voice.bravefield-dce0abaf.australiaeast.azurecontainerapps.io`.

**Dockerfile notes**:
- Multi-stage build: `python:3.11-slim` (builder) → `nvidia/cuda:12.1.0-runtime-ubuntu22.04` (runtime)
- `PYTHONPATH` must include `/usr/local/lib/python3.11/site-packages` because Ubuntu Python looks in `dist-packages`, not `site-packages` where pip `--prefix` installs
- spaCy `en_core_web_sm` model must be downloaded during build (required by Kokoro for tokenisation)
- Builder installs with `pip --prefix=/install`, runtime copies to `/usr/local`

**Deploy commands**:
```bash
TAG=$(git rev-parse --short HEAD)
az acr build --registry scholarlyacr --image voice-service:gpu-$TAG --platform linux/amd64 \
  --file services/voice-service/Dockerfile services/voice-service/
az containerapp update --name scholarly-voice --resource-group scholarly-rg \
  --image scholarlyacr.azurecr.io/voice-service:gpu-$TAG
```

**CRITICAL**: `minReplicas` must be ≥1 for the voice service. With `minReplicas: 0`, the GPU container scales to zero and the health endpoint returns 404 ("Container App is stopped or does not exist"). GPU cold starts are slow (~30s for model loading).

**CORS**: Default origins only allow localhost. For staging/production, set `SVS_SERVER_CORS_ORIGINS` env var as a **JSON array** (pydantic-settings parses `list[str]` as JSON, NOT comma-separated): `'["https://staging.scholar.ly","https://scholar.ly"]'`

## Environment Variables

`NEXT_PUBLIC_API_URL` (web), `DATABASE_URL` (database + web server-side routes), `CRON_SECRET` (web cron routes), `REDIS_URL` / `JWT_SECRET` / `SENDGRID_API_KEY` / `STRIPE_SECRET_KEY` / `ELEVENLABS_API_KEY` (api).

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
- **Repositories**: API uses `prisma` singleton from `@scholarly/database` (no constructor injection). Web server-side routes follow the same pattern via `packages/web/src/repositories/`. All queries must include `tenantId`.
- **Workspace deps**: `workspace:*` for internal refs
