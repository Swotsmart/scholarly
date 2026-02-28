# Érudits Platform — Complete Foundation Handoff

**Date:** February 2026
**Sessions:** 2 (Foundation + Publishing Engine + Book Club)
**Total Lines:** 7,778 across 7 files

---

## What Was Delivered

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `prisma/schema-erudits.prisma` | 935 | Complete data model: 21 models, 12 enums |
| 2 | `src/types/erudits.types.ts` | 1,126 | Types, 30+ events, DTOs, 15 repository interfaces, KDP specs |
| 3 | `src/services/migration.service.ts` | 974 | Squarespace → Scholarly 6-stage migration pipeline |
| 4 | `src/services/storefront.service.ts` | 1,102 | Resource marketplace with Stripe Connect + AI recommendations |
| 5 | `src/services/publishing.service.ts` | 1,327 | Manuscript lifecycle, cover design, multi-channel publication |
| 6 | `src/services/formatting.service.ts` | 1,517 | Content extractor + EPUB/Print PDF/Digital PDF adapters |
| 7 | `src/services/bookclub.service.ts` | 797 | Book clubs with AI discussion materials + facilitator guides |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     ÉRUDITS PLATFORM                         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Migration   │  Storefront  │  Publishing  │   Book Club    │
│  Service     │  Service     │  Engine      │   Service      │
│              │              │              │                │
│  Squarespace │  Resources   │  Manuscripts │  Reading lists │
│  → Scholarly │  Purchases   │  Formatting  │  Sessions      │
│  6 stages    │  Licences    │  Covers      │  AI materials  │
│  DNS cutover │  Downloads   │  Channels    │  Engagement    │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                    Formatting Engine                          │
│  Content Extractor → EPUB / Print PDF / Digital PDF adapters │
├──────────────────────────────────────────────────────────────┤
│                    Shared Foundation                          │
│  Prisma Schema │ TypeScript Types │ NATS Events │ KDP Specs  │
└──────────────────────────────────────────────────────────────┘
```

---

## Service Details

### 1. Migration Service (974 lines)

**6-stage pipeline:** Create → Extract → Transform → Review → Import → Cutover

Handles Érudits' migration from Squarespace: 40+ products, 12+ pages, member list, newsletter subscribers. Features URL mapping for 301 redirects, automatic flagging of items needing human review (non-digital products, multi-variant pricing), DNS verification, and rollback support.

### 2. Resource Storefront Service (1,102 lines)

**Stripe Connect split-payment marketplace.**

Payment flow: Student pays → Stripe splits → author gets 85%, platform gets 15%. Supports three licence tiers (individual, single-school, multi-school) for Érudits' $280 ATAR exam packs. Features watermarked downloads, AI-powered resource recommendations based on student learning gaps, content safety moderation, and author analytics.

### 3. Publishing Engine Service (1,327 lines)

**Manuscript-to-distribution pipeline.**

Complete lifecycle: create → write → version → format → cover → publish → distribute. Content stored as ProseMirror JSON with immutable version snapshots (like git commits). AI-assisted writing for curriculum-aligned content generation. Multi-channel publication: Scholarly Direct, Amazon KDP, IngramSpark, School Direct — each with its own submission adapter and royalty calculation.

Cover design via GPT Image with automatic KDP dimension calculation (spine width from page count + paper type).

### 4. Formatting Engine (1,517 lines)

**ProseMirror → publication-ready files.**

Three-layer architecture:
- **ContentExtractor**: Walks ProseMirror JSON tree → produces structured ExtractedContent with chapters, blocks, images, footnotes. Handles custom educational blocks (vocabulary lists, grammar tables, exercises, comprehension passages).
- **Format Adapters**: EPUB 3.2 (full OPF/XHTML/CSS generation), Print PDF (KDP-compliant with calculated margins, bleed, crop marks), Digital PDF (screen-optimised with hyperlinks).
- **FormattingEngineImpl**: Orchestrator that routes format requests to the correct adapter.

Educational blocks get format-specific styling: vocabulary lists become definition lists in EPUB, grammar tables maintain their structure, exercises use numbered prompts with hint support, and comprehension passages use colour-coded question types (Bloom's taxonomy levels).

### 5. Book Club Service (797 lines)

**Structured reading programmes with AI facilitation.**

Club lifecycle, reading list management, session scheduling, membership, and engagement tracking. AI-powered features:
- **Discussion question generation**: Claude generates Bloom's-taxonomy-spanning questions in the target language, aligned to ATAR curriculum codes.
- **Facilitator guide generation**: Complete session plans with timed agendas, key vocabulary, differentiation notes, and assessment checkpoints.
- **Engagement scoring**: Weighted composite (60% readings completed, 40% sessions attended).

---

## Key Architectural Patterns

| Pattern | Implementation |
|---|---|
| **Result monad** | All methods return success(data) or failure(error) — no thrown exceptions |
| **Repository pattern** | 15 repository interfaces abstract data access from business logic |
| **Event-driven** | 30+ NATS events for cross-service communication |
| **Multi-tenant isolation** | Every query scoped by tenantId |
| **Dependency injection** | Services receive all dependencies via constructor |
| **Format adapter pattern** | Each output format has its own adapter behind a common interface |
| **Content extraction** | ProseMirror JSON → ExtractedContent IR → format-specific output |

---

## What To Build Next

### Priority 1: Repository Implementations
Prisma implementations for all 15 repository interfaces (~2,100 lines total).

### Priority 2: API Routes
Express.js endpoints wrapping services (~950 lines total).

### Priority 3: Tests
Jest test suites for each service (~2,100 lines total).

### Priority 4: Production Integrations
EPUB packaging (JSZip), PDF rendering (WeasyPrint/Puppeteer), DOCX adapter, KDP API, IngramSpark API, Stripe webhooks, Squarespace API client, image processing (sharp).

---

**Total: 7,778 lines of production code + documentation**
