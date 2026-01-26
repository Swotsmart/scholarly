# Scholarly Platform - Integration Summary

## Repository Analysis & Extension Mapping

---

## Current Repository Structure

Based on the GitHub repo at `https://github.com/Swotsmart/scholarly`:

```
scholarly/
├── packages/
│   ├── api/                      # Express.js REST API
│   │   └── src/
│   │       ├── services/         # 20+ service modules ✅
│   │       ├── routes/           # API route handlers
│   │       ├── middleware/       # Auth, rate limiting, CSRF
│   │       └── repositories/     # Data access layer
│   ├── blockchain/               # Solidity smart contracts
│   ├── database/                 # Prisma ORM + PostgreSQL
│   ├── shared/                   # Shared types & utilities
│   ├── curriculum-processor/     # MRAC JSON-LD ingestion CLI
│   └── web/                      # Next.js 14 frontend
└── docs/
    ├── architecture/
    ├── prds/
    ├── specs/
    └── curriculum/               # Australian Curriculum JSON-LD/RDF
```

---

## Existing Services (from repo)

| Service | File | Lines | Status |
|---------|------|-------|--------|
| curriculum-curator | `curriculum-curator_service.ts` | 2,503 | ✅ Implemented |
| relief-marketplace | `relief-marketplace_service.ts` | 2,201 | ✅ Implemented |
| homeschool-hub | `homeschool-hub_service.ts` | 1,800+ | ✅ Implemented |
| scheduling-engine | `scheduling-engine_service.ts` | 1,500+ | ✅ Implemented |
| lis-scholarly-bridge | `lis-scholarly-bridge_service.ts` | 1,600+ | ✅ Implemented |
| micro-school | `micro-school_service.ts` | 1,200+ | ✅ Implemented |
| eduscrum-orchestrator | `eduscrum-orchestrator_service.ts` | 1,000+ | ✅ Implemented |
| content-marketplace | `content-marketplace_service.ts` | 900+ | ✅ Implemented |
| tutor-booking | `tutor-booking_service.ts` | 750+ | ✅ Implemented |
| capacity-planning | `capacity-planning_service.ts` | 300+ | ✅ Implemented |

---

## Our Extensions - Integration Points

### 1. Early Years Module (Little Explorers)

**New Service**: `early-years_service.ts`

**Integrates With**:
- `curriculum-curator_service.ts` - EYLF/NQF curriculum standards
- `homeschool-hub_service.ts` - Family/parent engagement
- `content-marketplace_service.ts` - Age-appropriate content
- `tutor-booking_service.ts` - Early childhood specialists

**Database**: `early-years-schema-complete.prisma` (50+ models)

**Key Features**:
- Storybook World with Alphabetia narrative
- Picture password authentication for 3-7 year olds
- Eye tracking integration for reading development
- Adaptive phonics/numeracy engines
- Multilingual family support

**API Routes** (new):
```
/api/early-years/
  /students              # Little Explorer profiles
  /phonics               # Phonics engine
  /numeracy              # Numeracy engine  
  /stories               # Story mode content
  /families              # Family portal
  /authentication        # Picture passwords
```

---

### 2. Language Learning Module (LinguaFlow)

**New Service**: `language-learning_service.ts`

**Integrates With**:
- `curriculum-curator_service.ts` - IB MYP/DP Language Acquisition alignment
- `content-marketplace_service.ts` - Language learning resources
- `tutor-booking_service.ts` - Native speaker tutors
- `eduscrum-orchestrator_service.ts` - Language learning sprints

**Database**: `language-learning-schema.prisma` (40+ models)

**Key Features**:
- 6 Languages: French, Mandarin, Spanish, German, Japanese, Italian
- AI Conversation Partner with cultural personas
- Heritage speaker pathways
- CEFR A1→C2 progression
- IB MYP Phase alignment

**API Routes** (new):
```
/api/language/
  /profiles              # Learner language profiles
  /lessons               # Structured lessons
  /conversations         # AI conversation partner
  /vocabulary            # SRS vocabulary system
  /heritage              # Heritage speaker programs
  /assessment            # Placement & progress tests
```

---

### 3. IB Curriculum Extension

**Extends**: `curriculum-curator_service.ts`

**New Types**:
```typescript
// Add to curriculum-curator_service.ts
interface IBProgramme { type: 'PYP' | 'MYP' | 'DP' | 'CP'; ... }
interface MYPSubject { phases: MYPPhase[]; criteria: MYPCriterion[]; ... }
interface MYPCriterion { letter: 'A'|'B'|'C'|'D'; strandDescriptors: {...}[]; ... }
interface DPSubject { level: 'SL'|'HL'; components: DPAssessmentComponent[]; ... }
interface PYPUnitOfInquiry { transdisciplinaryTheme: string; centralIdea: string; ... }
```

**New Methods** (add to CurriculumCuratorService):
```typescript
// IB-specific methods
mapACARAtoIB(acaraCode: string): Promise<CurriculumMapping[]>
findExtensionOpportunities(acaraCode: string, level: string): Promise<IBExtensionSuggestion[]>
generateMYPUnit(acaraCodes: string[], subject: string): Promise<MYPUnitPlanner>
generatePYPUnit(theme: string, yearLevel: string): Promise<PYPUnitOfInquiry>
getDualTrackCoverage(studentId: string): Promise<DualTrackReport>
```

**API Routes** (extend existing):
```
/api/curriculum/
  /ib/programmes         # IB programme info
  /ib/mapping            # ACARA-IB mapping
  /ib/extensions         # Extension suggestions
  /ib/myp/units          # MYP unit planners
  /ib/pyp/units          # PYP units of inquiry
  /ib/dp/subjects        # DP subject info
```

---

### 4. Gamification System

**New Service**: `gamification_service.ts`

**Integrates With**:
- ALL services (cross-cutting concern)
- `eduscrum-orchestrator_service.ts` - Sprint achievements
- `content-marketplace_service.ts` - Creator rewards
- `tutor-booking_service.ts` - Tutor ratings

**Key Features**:
- XP system with healthy engagement design
- 50+ achievements across categories
- Streaks with freezes (anti-anxiety)
- Class/school/global leaderboards

**API Routes** (new):
```
/api/gamification/
  /xp                    # XP balance & history
  /achievements          # Achievement tracking
  /streaks               # Streak management
  /leaderboards          # Leaderboard queries
  /rewards               # Reward redemption
```

---

### 5. Offline Mode

**New Service**: `offline-sync_service.ts`

**Integrates With**:
- ALL services (cross-cutting concern)
- Mobile apps (React Native)
- PWA functionality

**Key Features**:
- Intelligent content pre-caching
- Conflict resolution on sync
- Rural Australia support
- School camp/excursion packs

---

## Database Schema Integration

### Current Prisma Schema Location
```
packages/database/prisma/schema.prisma
```

### New Schema Files to Merge

| Schema | Models | Integration |
|--------|--------|-------------|
| `early-years-schema-complete.prisma` | 50+ | Merge into main schema |
| `language-learning-schema.prisma` | 40+ | Merge into main schema |
| IB Curriculum models | 20+ | Add to curriculum section |
| Gamification models | 15+ | Add new section |

### Schema Merge Strategy

```prisma
// packages/database/prisma/schema.prisma

// ============================================================================
// EXISTING SECTIONS (keep as-is)
// ============================================================================

// ... existing User, Tenant, Auth models ...
// ... existing Curriculum models ...
// ... existing Booking, Tutor models ...

// ============================================================================
// NEW: EARLY YEARS SECTION
// ============================================================================

// Paste from early-years-schema-complete.prisma
model LittleExplorer { ... }
model PicturePassword { ... }
// ... etc

// ============================================================================
// NEW: LANGUAGE LEARNING SECTION  
// ============================================================================

// Paste from language-learning-schema.prisma
model LanguageLearnerProfile { ... }
model ConversationSession { ... }
// ... etc

// ============================================================================
// NEW: IB CURRICULUM EXTENSION
// ============================================================================

model IBEnrollment { ... }
model MYPUnit { ... }
model PYPUnit { ... }
model DPExtendedEssay { ... }
// ... etc

// ============================================================================
// NEW: GAMIFICATION SECTION
// ============================================================================

model XPTransaction { ... }
model Achievement { ... }
model Streak { ... }
// ... etc
```

---

## Frontend Integration

### Current Web App Structure
```
packages/web/src/app/
├── (dashboard)/
│   ├── dashboard/
│   ├── design-pitch/
│   ├── showcase/
│   ├── learning/
│   ├── tutoring/
│   └── teacher/
```

### New Pages to Add

```
packages/web/src/app/
├── (dashboard)/
│   ├── early-years/           # NEW: Little Explorers
│   │   ├── page.tsx           # Dashboard for young learners
│   │   ├── stories/           # Storybook World
│   │   ├── phonics/           # Phonics games
│   │   ├── numeracy/          # Number adventures
│   │   └── progress/          # Parent progress view
│   │
│   ├── languages/             # NEW: LinguaFlow
│   │   ├── page.tsx           # Language hub
│   │   ├── lessons/           # Structured lessons
│   │   ├── conversations/     # AI conversation partner
│   │   ├── vocabulary/        # Flashcard/SRS
│   │   └── heritage/          # Heritage pathways
│   │
│   ├── teacher/
│   │   ├── ib/                # NEW: IB Tools
│   │   │   ├── myp-units/     # MYP unit planner
│   │   │   ├── pyp-units/     # PYP unit of inquiry
│   │   │   ├── mapping/       # ACARA-IB mapping
│   │   │   └── extensions/    # Extension suggestions
│   │
│   └── (parent)/              # NEW: Parent Portal
│       ├── family/            # Family dashboard
│       ├── progress/          # Child progress
│       └── settings/          # Family settings
```

---

## API Integration Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SCHOLARLY API ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EXISTING ROUTES                    NEW ROUTES                              │
│  ───────────────                    ──────────                              │
│  /api/auth/*                        /api/early-years/*     ← NEW           │
│  /api/curriculum/*  ←───────────────/api/curriculum/ib/*   ← EXTEND        │
│  /api/bookings/*                    /api/language/*        ← NEW           │
│  /api/tutors/*                      /api/gamification/*    ← NEW           │
│  /api/relief/*                      /api/offline/*         ← NEW           │
│  /api/homeschool/*                  /api/families/*        ← NEW           │
│  /api/content/*                                                            │
│  /api/showcase/*                                                            │
│  /api/design-pitch/*                                                        │
│  /api/analytics/*                                                           │
│                                                                             │
│  INTEGRATION POINTS:                                                        │
│  • All new services use existing auth middleware                           │
│  • All new services emit events to existing EventBus                       │
│  • All new services use existing Cache infrastructure                      │
│  • All new services follow existing Result<T,E> pattern                    │
│  • All new services respect existing tenant isolation                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Migration Path

### Phase 1: Database Schema
```bash
# Add new models to schema.prisma
# Generate migration
pnpm db:generate
pnpm db:migrate --name add_early_years_language_ib_gamification
```

### Phase 2: Services
```bash
# Add new service files
packages/api/src/services/
├── early-years.service.ts
├── language-learning.service.ts
├── gamification.service.ts
└── offline-sync.service.ts

# Extend existing
# curriculum-curator.service.ts → add IB methods
```

### Phase 3: Routes
```bash
# Add new route files
packages/api/src/routes/
├── early-years.ts
├── language.ts
├── gamification.ts
└── offline.ts

# Register in index.ts
```

### Phase 4: Frontend
```bash
# Add new page directories
packages/web/src/app/(dashboard)/
├── early-years/
├── languages/
└── teacher/ib/
```

### Phase 5: Seed Data
```bash
# Add IB curriculum reference data
pnpm curriculum:ingest --source ./docs/curriculum/IB

# Add early years content
pnpm db:seed --module early-years

# Add language content
pnpm db:seed --module languages
```

---

## Package Contents Summary

| Document | Size | Purpose |
|----------|------|---------|
| **EARLY_YEARS_MODULE.md** | 40KB | Core Little Explorers design |
| **EARLY_YEARS_PART2_FAMILIES.md** | 34KB | Family portal, parent engagement |
| **EARLY_YEARS_PART3_ENGINES.md** | 23KB | Adaptive phonics/numeracy |
| **EARLY_YEARS_AUTHENTICATION.md** | 85KB | Picture passwords for toddlers |
| **EARLY_YEARS_EYE_TRACKING.md** | 44KB | Gaze analytics for reading |
| **LANGUAGE_LEARNING_MODULE.md** | 107KB | Complete LinguaFlow spec |
| **HERITAGE_SPEAKER_PATHWAYS.md** | 55KB | Mandarin, Italian, Spanish heritage |
| **IB_CURRICULUM_EXTENSION.md** | 40KB | IB types, dual-track support |
| **IB_CURRICULUM_REFERENCE_DATA.md** | 50KB | IB seed data (with attribution) |
| **GAMIFICATION_SYSTEM.md** | 58KB | XP, achievements, streaks |
| **OFFLINE_MODE.md** | 50KB | Rural/remote/travel support |
| **INTEGRATION_GUIDE.md** | 12KB | Service connections |
| **REPORTING_TEMPLATES.md** | 12KB | Report generation |
| **early-years-schema.prisma** | 102KB | Database models |
| **language-learning-schema.prisma** | 56KB | Database models |

**Total**: ~768KB of documentation and schemas ready to implement!

---

## Next Steps

1. **Review** this integration plan against your roadmap
2. **Prioritize** which modules to implement first
3. **Create** feature branches for each module
4. **Merge** schemas incrementally
5. **Deploy** to staging for testing

The documentation is designed to be implementation-ready - developers can work directly from these specs!
