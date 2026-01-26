# Scholarly Platform

A comprehensive education platform with two main learning modules:

- **Early Years (Little Explorers)** - Ages 3-7 education with phonics and numeracy
- **LinguaFlow** - Multi-language learning with CEFR alignment and IB curriculum support

## Table of Contents

- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [File Descriptions](#file-descriptions)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Running Tests](#running-tests)
- [Deployment](#deployment)

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 16+ (or use Docker)
- Redis 7+ (or use Docker)

### Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start database and Redis
docker-compose up -d postgres redis

# 3. Generate Prisma client
npm run db:generate

# 4. Run database migrations
npm run db:migrate

# 5. Start development server
npm run dev

# 6. Run tests
npm test
```

### Using Docker (Full Stack)

```bash
# Start everything (API, PostgreSQL, Redis)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop everything
docker-compose down
```

---

## Project Structure

```
scholarly-production/
├── apps/                      # Application entry points
│   └── api/                   # Express.js REST API
├── packages/                  # Shared packages
│   ├── database/              # Prisma schema and repositories
│   ├── shared/                # Types, utilities, algorithms
│   └── validation/            # Zod validation schemas
├── services/                  # Business logic layer
│   ├── early-years/           # Little Explorers service
│   └── linguaflow/            # Language learning service
├── tests/                     # Test suites
│   ├── fixtures/              # Factory functions and mock data
│   ├── integration/           # API integration tests
│   └── unit/                  # Service unit tests
├── scripts/                   # Utility scripts
└── .github/workflows/         # CI/CD pipelines
```

---

## File Descriptions

### Root Configuration Files

| File | Lines | Description |
|------|-------|-------------|
| `package.json` | 78 | Monorepo configuration with workspaces, scripts, and dependencies |
| `tsconfig.json` | 38 | TypeScript compiler configuration with strict mode |
| `jest.config.ts` | 72 | Jest test runner configuration with module mapping |
| `Dockerfile` | 112 | Multi-stage Docker build for production deployment |
| `docker-compose.yml` | 208 | Local development stack (PostgreSQL, Redis, API, optional tools) |
| `.dockerignore` | ~50 | Files excluded from Docker builds |

### Documentation

| File | Lines | Description |
|------|-------|-------------|
| `README.md` | This file | Project overview and setup instructions |
| `SESSION_HANDOFF.md` | ~200 | Development session summary and status |
| `HANDOFF.md` | 300 | Detailed technical handoff document |
| `PRODUCTION_READINESS_ASSESSMENT.md` | 211 | Production readiness checklist |

### Database Layer (`packages/database/`)

| File | Lines | Description |
|------|-------|-------------|
| `prisma/schema.prisma` | 844 | **Database schema** - Defines all tables, relationships, indexes for PostgreSQL. Includes Tenant, User, RefreshToken, AuditLog, Early Years models (Family, Child, Session, Activity, PhonicsProgress), and LinguaFlow models (Profile, VocabularyProgress, VocabularyItem, Conversation, HeritagePathway, Achievement) |
| `src/client.ts` | 280 | **Prisma client** - Database connection, health checks, transaction helpers, pagination utilities, soft delete helpers |
| `src/index.ts` | 106 | **Package exports** - Re-exports all repositories, types, and utilities |
| `src/repositories/base.repository.ts` | 457 | **Base repository** - Generic CRUD operations, pagination, soft deletes, tenant isolation. Provides `BaseRepository` and `TenantScopedRepository` abstract classes |
| `src/repositories/user.repository.ts` | 282 | **User repository** - User CRUD, login tracking, account lockout, refresh token storage/verification/invalidation |
| `src/repositories/early-years.repository.ts` | 633 | **Early Years repositories** - FamilyRepository, ChildRepository, SessionRepository, ActivityRepository, PhonicsProgressRepository, PicturePasswordRepository |
| `src/repositories/linguaflow.repository.ts` | 722 | **LinguaFlow repositories** - LanguageProfileRepository, VocabularyProgressRepository, VocabularyItemRepository (with SM-2 support), ConversationRepository, HeritagePathwayRepository, AchievementRepository |

### Shared Utilities (`packages/shared/`)

| File | Lines | Description |
|------|-------|-------------|
| `src/index.ts` | 542 | **Shared utilities** - Result type for explicit error handling, error classes (ValidationError, AuthenticationError, NotFoundError, ConflictError, etc.), SM-2 spaced repetition algorithm, XP level calculator, phonics phase definitions (SSP methodology), CEFR level mappings, IB-to-CEFR alignment |

### Validation Layer (`packages/validation/`)

| File | Lines | Description |
|------|-------|-------------|
| `src/index.ts` | 393 | **Zod schemas** - Type-safe validation schemas for all API inputs. Includes auth schemas (register, login, refresh), Early Years schemas (family, child enrollment, session, activity, picture password), LinguaFlow schemas (profile, vocabulary, conversation, heritage pathway, IB criteria, offline sync) |

### Service Layer (`services/`)

| File | Lines | Description |
|------|-------|-------------|
| `early-years/src/index.ts` | 1,056 | **Early Years service** - Business logic for Little Explorers module. Methods: createFamily, getFamily, getFamilyByUser, enrollChild (with 3-7 age validation), getChildDashboard, setupPicturePassword, verifyPicturePassword (with lockout), startSession (with age-appropriate limits), recordActivity (with reward calculation), endSession (with streak updates), getPhonicsProgress, advancePhonicsPhase |
| `linguaflow/src/index.ts` | 1,275 | **LinguaFlow service** - Business logic for language learning. Methods: createProfile (6 languages), getProfileDashboard, updateCefrLevel, addVocabulary, getVocabularyForReview, reviewVocabulary (SM-2 algorithm), completeReviewSession, startConversation, addConversationMessage, endConversation (with assessment), createHeritagePathway (5 pathway types), alignIbCriteria (PYP/MYP/DP), getCefrForMypPhase, createOfflinePackage, syncOfflineProgress |

### API Layer (`apps/api/`)

| File | Lines | Description |
|------|-------|-------------|
| `src/middleware/index.ts` | 560 | **Middleware stack** - JWT authentication with refresh token rotation, role/permission authorization, Zod request validation, Redis-backed rate limiting with memory fallback, Pino structured logging with correlation IDs, security headers (Helmet), CORS, error handling with structured responses, response helpers |
| `src/app.ts` | 249 | **Express application** - Middleware chain setup, health endpoints (/health, /ready), Prometheus metrics (/metrics), route mounting, 404 and error handlers |
| `src/server.ts` | 202 | **Server entry point** - HTTP server creation, graceful shutdown handling (SIGTERM, SIGINT), database connection management, uncaught exception handlers |
| `src/routes/index.ts` | 11 | **Route index** - Re-exports all route modules |
| `src/routes/auth.routes.ts` | 503 | **Auth routes** - POST /register, POST /login, POST /refresh (with token rotation), POST /logout, POST /logout-all, POST /change-password, GET /me |
| `src/routes/early-years.routes.ts` | 367 | **Early Years routes** - Family CRUD, child enrollment, picture password, session management, activity recording, phonics progress |
| `src/routes/linguaflow.routes.ts` | 456 | **LinguaFlow routes** - Profile management, vocabulary CRUD and review, conversations, heritage pathways, IB criteria, offline packages |

### Tests (`tests/`)

| File | Lines | Description |
|------|-------|-------------|
| `setup.ts` | 36 | **Test setup** - Environment variables, Jest timeout configuration |
| `fixtures/index.ts` | 8 | **Fixtures index** - Re-exports all fixture modules |
| `fixtures/early-years.fixtures.ts` | 377 | **Early Years fixtures** - Factory functions for Family, Child, Session, Activity, PhonicsProgress, PicturePassword. Includes age helpers, mock Result helpers |
| `fixtures/linguaflow.fixtures.ts` | 585 | **LinguaFlow fixtures** - Factory functions for Profile, VocabularyProgress, VocabularyItem, Conversation, HeritagePathway, Achievement, OfflinePackage. Includes SM-2 result calculator, XP level calculator |
| `unit/services/early-years.service.test.ts` | 751 | **Early Years unit tests** - 24 tests covering family management, child enrollment, picture password, sessions, activities, phonics |
| `unit/services/linguaflow.service.test.ts` | 793 | **LinguaFlow unit tests** - 35 tests covering profiles, SM-2 algorithm, conversations, heritage pathways, IB curriculum, offline sync |
| `integration/api/early-years.routes.test.ts` | 495 | **Early Years integration tests** - HTTP request/response testing for all Early Years endpoints, validation, authentication, error handling |
| `integration/api/linguaflow.routes.test.ts` | 583 | **LinguaFlow integration tests** - HTTP request/response testing for all LinguaFlow endpoints, validation, authentication, error handling |

### Infrastructure

| File | Lines | Description |
|------|-------|-------------|
| `scripts/init-db.sql` | 19 | **Database init** - PostgreSQL extensions (uuid-ossp, pg_trgm) |
| `.github/workflows/ci.yml` | 212 | **CI pipeline** - Lint, type check, unit tests, integration tests (with PostgreSQL/Redis services), build verification, Docker build |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer (Express)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Auth Routes │  │ Early Years │  │ LinguaFlow Routes       │  │
│  │             │  │ Routes      │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│  ┌──────┴────────────────┴──────────────────────┴─────────────┐ │
│  │                    Middleware Stack                         │ │
│  │  JWT Auth → Validation → Rate Limit → Logging → Errors     │ │
│  └─────────────────────────────┬───────────────────────────────┘ │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────┐
│                        Service Layer                             │
│  ┌─────────────────────────────┴───────────────────────────────┐ │
│  │  EarlyYearsService          │       LinguaFlowService       │ │
│  │  • Family management        │       • Profile management    │ │
│  │  • Child enrollment (3-7)   │       • SM-2 vocabulary       │ │
│  │  • Picture passwords        │       • AI conversations      │ │
│  │  • Session management       │       • Heritage pathways     │ │
│  │  • Phonics (SSP)            │       • IB curriculum         │ │
│  └─────────────────────────────┴───────────────────────────────┘ │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────┐
│                       Repository Layer                           │
│  ┌─────────────────────────────┴───────────────────────────────┐ │
│  │  BaseRepository → TenantScopedRepository                    │ │
│  │  • CRUD operations       • Tenant isolation                 │ │
│  │  • Soft deletes          • Pagination                       │ │
│  └─────────────────────────────┬───────────────────────────────┘ │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────┐
│                        Database Layer                            │
│  ┌─────────────────────────────┴───────────────────────────────┐ │
│  │              Prisma Client → PostgreSQL                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login and get tokens |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Logout current session |
| POST | `/logout-all` | Logout all sessions |
| POST | `/change-password` | Change password |
| GET | `/me` | Get current user |

### Early Years (`/api/v1/early-years`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/families` | Create family |
| GET | `/families/me` | Get my family |
| GET | `/families/:familyId` | Get family details |
| POST | `/families/:familyId/children` | Enroll child |
| GET | `/children/:childId` | Get child dashboard |
| POST | `/children/:childId/picture-password` | Setup picture password |
| POST | `/children/:childId/picture-password/verify` | Verify picture password |
| POST | `/children/:childId/sessions` | Start learning session |
| POST | `/sessions/:sessionId/activities` | Record activity |
| POST | `/sessions/:sessionId/end` | End session |
| GET | `/children/:childId/phonics` | Get phonics progress |
| POST | `/children/:childId/phonics/advance` | Advance phonics phase |

### LinguaFlow (`/api/v1/linguaflow`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/profiles` | Create language profile |
| GET | `/profiles/:profileId` | Get profile dashboard |
| PUT | `/profiles/:profileId/cefr` | Update CEFR level |
| POST | `/profiles/:profileId/heritage-pathway` | Create heritage pathway |
| POST | `/profiles/:profileId/vocabulary` | Add vocabulary word |
| GET | `/profiles/:profileId/vocabulary/review` | Get words due for review |
| POST | `/profiles/:profileId/vocabulary/review` | Submit single review |
| POST | `/profiles/:profileId/vocabulary/review-session` | Batch review submission |
| POST | `/profiles/:profileId/conversations` | Start AI conversation |
| POST | `/conversations/:conversationId/messages` | Add conversation message |
| POST | `/conversations/:conversationId/end` | End conversation |
| POST | `/profiles/:profileId/ib-criteria` | Record IB criteria score |
| GET | `/myp-cefr/:phase` | Get expected CEFR for MYP phase |
| POST | `/profiles/:profileId/offline-packages` | Create offline package |
| POST | `/profiles/:profileId/sync` | Sync offline progress |

---

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only (no database required)
npm run test:unit

# Run integration tests (requires database)
npm run test:integration

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/services/early-years.service.test.ts

# Run tests in watch mode
npm test -- --watch
```

---

## Deployment

### Environment Variables

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/scholarly

# Redis
REDIS_URL=redis://host:6379

# JWT (minimum 32 characters)
JWT_SECRET=your-production-secret-minimum-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGINS=https://yourdomain.com

# Metrics
ENABLE_METRICS=true
```

### Docker Deployment

```bash
# Build production image
docker build -t scholarly-api .

# Run with environment file
docker run -p 3000:3000 --env-file .env scholarly-api
```

---

## Statistics

| Category | Count |
|----------|-------|
| Total Lines | 12,638 |
| Source Code | 9,010 |
| Test Code | 3,628 |
| Total Files | 37 |
| Unit Tests | ~59 test cases |
| Integration Tests | ~50 test cases |

---

## License

Proprietary - All rights reserved
