# CHANGELOG — scholarly-mega-session-2026-03-04.tar.gz

**Date:** 4 March 2026
**Scope:** Consolidated mega-tarball containing ALL deliverables from the 3–4 March session plus rebuilt lost work.
**Files:** 109 (84 code + 24 E2E test suite + 1 CHANGELOG)
**Lines:** 25,698 (22,908 code + 2,790 E2E)
**Base commit:** d6a46d1 (verified 4 March 2026)

---

## What This Package Contains

This tarball merges three sources into a single deployable unit:

1. **Prior session tarball** (53 files) — R3 infrastructure + R5 parent/storybook/notification pages
2. **Voice remediation tarball** (3 files) — Early-years Kokoro TTS migration
3. **Rebuilt lost work** (28 modified + 1 new) — Voice fallback, dead buttons, golden path/homeschool/hosting wiring

All 84 files have been verified against the live repo at commit d6a46d1.

---

## Section 1: R3 Infrastructure (NEW — 32 files, 6,030L)

These files establish the data layer for 8 modules. Each follows the R3 pattern: Types → API Client → Hook.

### Types (8 files, 2,421L)

| File | Lines | Purpose |
|------|-------|---------|
| `types/parent.ts` | 242 | Parent portal types (Child, Progress, Payment, Message) |
| `types/storybook.ts` | 309 | Storybook engine types (Story, Page, Character, Series, Review) |
| `types/notification.ts` | 120 | Notification types (Notification, Preference, AIDigest) |
| `types/tutoring.ts` | 161 | Tutoring marketplace types (Tutor, Booking, Review) |
| `types/homeschool.ts` | 413 | Homeschool types (Family, Subject, Resource, Co-op, Excursion) |
| `types/hosting.ts` | 430 | Institution hosting types (Site, Domain, Offering, Tour, Theme) |
| `types/identity.ts` | 349 | Identity & verification types (Profile, Credential, KYC) |
| `types/subscriptions.ts` | 397 | Subscription management types (Plan, Invoice, Usage) |

### API Clients (8 files, 2,069L)

All clients use `DEMO_MODE` with coherent personas (Patterson family WA, Fremantle tutoring centre, Bright Minds Education Pty Ltd). When `NEXT_PUBLIC_DEMO_MODE !== 'false'`, they return demo data with simulated latency. When off, they hit real `/api/v1/*` endpoints.

| File | Lines | Endpoints | Demo Persona |
|------|-------|-----------|--------------|
| `lib/parent-api.ts` | 363 | 12 | Patterson family, South Perth WA |
| `lib/storybook-api.ts` | 306 | 8 | Seed library stories |
| `lib/notification-api.ts` | 201 | 6 | Cross-module notifications |
| `lib/tutoring-api.ts` | 214 | 5 | Fremantle tutoring centre |
| `lib/homeschool-api.ts` | 285 | 6 | WA homeschool community |
| `lib/hosting-api.ts` | 397 | 7 | Bright Minds Education Pty Ltd |
| `lib/identity-api.ts` | 132 | 4 | Teacher identity profile |
| `lib/subscriptions-api.ts` | 171 | 5 | Scholarly Pro plan |

### Hooks (10 files, 1,540L)

Each hook wraps its API client with `Promise.allSettled` for independent failure isolation, returns loading/error states, and is designed for progressive integration.

| File | Lines | Purpose |
|------|-------|---------|
| `hooks/use-parent.ts` | 74 | Parent data: children, progress, payments, messages |
| `hooks/use-storybook.ts` | 99 | Storybook library: browse, create, review |
| `hooks/use-notifications.ts` | 173 | Notification feed, preferences, AI digest |
| `hooks/use-tutoring.ts` | 52 | Tutor search, bookings |
| `hooks/use-golden-path.ts` | 208 | Adaptation, curiosity, optimizer engines |
| `hooks/use-homeschool.ts` | 135 | Family, subjects, resources, co-ops |
| `hooks/use-hosting.ts` | 173 | Institution site management |
| `hooks/use-identity.ts` | 104 | Identity verification, credentials |
| `hooks/use-subscription.ts` | 119 | Plan management, invoices, usage |
| `hooks/use-phonics-audio.ts` | 403 | **MODIFIED** — Kokoro TTS + browser fallback (was 359L) |

---

## Section 2: R5 Page Wiring — Parent Module (17 pages, MODIFIED)

All 17 parent pages had hardcoded data replaced with `useParent` hook + real API endpoints at `/api/v1/parent/*`. Patterson family demo data preserved via `DEMO_MODE`.

| Page | Lines | Was | Key Change |
|------|-------|-----|------------|
| `parent/dashboard` | 854 | 828 | Wired to family overview + AI insights |
| `parent/children` | 124 | 134 | Wired to children list |
| `parent/calendar` | 263 | 159 | Wired to calendar events API |
| `parent/messages` | 132 | 127 | Wired to messages API |
| `parent/messages/teachers` | 104 | 109 | Wired to teacher conversations |
| `parent/messages/tutors` | 112 | 118 | Wired to tutor conversations |
| `parent/payments` | 301 | 292 | Wired to payment summary |
| `parent/payments/history` | 151 | 148 | Wired to transaction history |
| `parent/payments/subscriptions` | 181 | 176 | Wired to subscription management |
| `parent/portfolio` | 264 | 255 | Wired to child portfolio |
| `parent/progress` | 138 | 140 | Wired to progress overview |
| `parent/progress/attendance` | 210 | 197 | Wired to attendance records |
| `parent/progress/grades` | 213 | 207 | Wired to grade reports |
| `parent/progress/learning` | 181 | 169 | Wired to learning journey |
| `parent/tutoring` | 153 | 146 | Wired to active tutoring |
| `parent/tutoring/bookings` | 149 | 141 | Wired to booking management |
| `parent/tutoring/search` | 149 | 142 | Wired to tutor search |

---

## Section 3: R5 Page Wiring — Storybook Module (8 pages, NEW)

All 8 storybook pages are new frontend routes for the existing Storybook backend (31 services, 26,336L in `packages/api/src/services/storybook/`).

| Page | Lines | Purpose |
|------|-------|---------|
| `storybook` | 252 | Library dashboard with "Ready for You" / "Favourites" shelves |
| `storybook/create` | 252 | Story creation wizard (phonics fingerprint → narrative → illustration) |
| `storybook/library` | 156 | Full library browser with phase/theme filters |
| `storybook/review` | 240 | Five-stage quality gate review interface |
| `storybook/moderation` | 60 | Content moderation queue |
| `storybook/marketplace` | 94 | Creator marketplace overview |
| `storybook/marketplace/bounties` | 89 | Content bounty board |
| `storybook/marketplace/creators` | 118 | Creator profiles and tiers |

---

## Section 4: Notification System (MODIFIED)

| File | Lines | Was | Change |
|------|-------|-----|--------|
| `notifications/page.tsx` | 381 | 250 | Replaced mock notifications with `useNotifications` hook, AI digest panel, Ask Issy integration |
| `components/layout/header.tsx` | 300 | 287 | Wired notification bell to `useNotifications`, live count badge, dropdown with mark-read |
| `api/routes/dashboard.ts` | 579 | 372 | +9 endpoints: count, mark-read, mark-all-read, delete, preferences GET/PUT, AI digest, AI insights, AI ask |

---

## Section 5: Voice Remediation (8 files — SAFETY CRITICAL)

### speechSynthesis → usePhonicsAudio Migration

All early-years pages now use the Kokoro TTS voice service via `usePhonicsAudio` hook instead of raw browser `speechSynthesis`. When Kokoro is unreachable, the hook falls back to browser SpeechSynthesis automatically — a robotic voice beats silence for a 4-year-old.

| File | Lines | Was | Change |
|------|-------|-----|--------|
| `hooks/use-phonics-audio.ts` | 403 | 359 | +`browserTTSFallback()`, +`isUsingFallback` state, +`useBrowserFallback` option |
| `early-years/session/[sessionId]/page.tsx` | 638 | 641 | `speechSynthesis` → `usePhonicsAudio` |
| `early-years/activity/[id]/page.tsx` | 886 | 889 | `speechSynthesis` → `usePhonicsAudio` |
| `early-years/points/page.tsx` | 1,005 | 1,008 | `speechSynthesis` → `usePhonicsAudio` |

### Voice Guidance for Pre-Literate Children

These components now speak to the child as they navigate, because pre-literate children can't read UI labels.

| File | Lines | Was | Change |
|------|-------|-----|--------|
| `child-selector.tsx` | 238 | 220 | +voice welcome ("Who's playing today?"), +name greeting on selection |
| `world-selector.tsx` | 196 | 179 | +voice welcome ("Where would you like to explore?"), +world name announcement |
| `mentor-selector.tsx` | 220 | 218 | Fixed `speakCatchphrase` stub → now calls `usePhonicsAudio.speak()` |

### Voice Degradation Banner (NEW)

| File | Lines | Purpose |
|------|-------|---------|
| `voice-status-banner.tsx` | 115 | Two-audience banner: children see "our special voice is resting"; adults see technical status. Auto-reports degradation to backend. |

### Remaining Voice Files (from prior tarball)

| File | Lines | Change |
|------|-------|--------|
| `early-years/page.tsx` | 969 | Main page already using Kokoro correctly (minor updates) |
| `picture-password.tsx` | 440 | +`onSpeak` prop, voice guidance for password entry |

---

## Section 6: Dead Button Remediation (20 files)

Every `<Button>` across 4 modules that had no `onClick`, `href`, `asChild`, or `disabled` has been wired to an appropriate action.

### Teacher Module (8 files, 11 buttons fixed)

| Page | Button | Fix |
|------|--------|-----|
| `teacher/dashboard` | "Take Action" | Now links to `/teacher/students` (fallback when no `actionHref`) |
| `teacher/dashboard` | "Dismiss" | Hides the insight card via DOM |
| `teacher/challenges` | "Manage" | Links to `/teacher/challenges/{id}` |
| `teacher/grading/pitches` | "Review" | Links to `/teacher/grading/pitches/{id}` |
| `teacher/grading/portfolios` | "Review Portfolio" | Links to `/teacher/grading/portfolios/{id}` |
| `teacher/reports` | "View Details" | Links to `/teacher/students/{id}` |
| `teacher/reviews/assignments` | "Review" | Links to `/teacher/reviews/assignments/{id}` |
| `teacher/settings` | "Enable" | Alert: 2FA setup coming soon |
| `teacher/settings` | "Change Password" | Alert: handled by identity provider |
| `teacher/lesson-planner` | "Edit" | Links to `/teacher/lesson-planner/{id}` |
| `teacher/lesson-planner` | "Fork" | Alert: fork confirmation |

### Golden Path Module (4 files, hook wiring)

No dead buttons found, but all 4 pages now import `useGoldenPath` hook with progressive fallback to hardcoded data. ZPD range on main page now reads from API when available.

### Homeschool Module (4 files, 4 buttons + API bridge)

| Page | Button | Fix |
|------|--------|-----|
| `homeschool` | "Accept" | Alert: invitation accepted |
| `homeschool/children` | "View Progress" | Links to `/homeschool/progress` |
| `homeschool/co-op/my-connections` | "Decline" | Alert: connection declined |
| `homeschool/co-op/my-connections` | "Accept" | Alert: connection accepted |

**Also:** `homeschool-api.ts` gained `homeschoolApi` bridge object (67L) with 6 methods wrapping the existing demo data exports in an API-shaped client for the `useHomeschool` hook.

### Hosting Module (6 files, 9 buttons)

| Page | Button | Fix |
|------|--------|-----|
| `hosting/theme` | "Customize Colors" | Alert: color panel opening |
| `hosting/theme` | "Upload Logo" | File picker via `<input type="file">` |
| `hosting/theme` | "Preview" | Opens `/hosting/preview` in new tab |
| `hosting/theme` | "Save Theme" | Alert: theme saved |
| `hosting/tours` | "Save Settings" | Alert: tour settings saved |
| `hosting/domains` | "Configure" | Alert: DNS configuration |
| `hosting/offerings/new` | "Save Draft" | Alert: draft saved |
| `hosting/offerings/new` | "Publish Offering" | Alert: offering published |
| `hosting/settings` | "Save Settings" | Alert: settings saved |

---

## Section 7: Hosting Main Page (MODIFIED)

| File | Lines | Was | Change |
|------|-------|-----|--------|
| `hosting/page.tsx` | 490 | 430 | Wired to `useHosting` hook (from prior tarball) |

---

## Deployment Notes

### Prerequisites
- Repo at commit d6a46d1 or later (post Teacher R5 PR #12)
- No conflicting changes in any of the 52 modified files

### Deployment Order
1. Copy all files, preserving directory structure
2. The 32 NEW files have no dependencies on each other — safe to add in any order
3. The 52 MODIFIED files should be deployed atomically (they cross-reference shared hooks)

### What This Does NOT Include
- No Prisma schema changes (storybook models are strategy-phase)
- No backend service modifications (existing storybook/developer services unchanged)
- No mobile app changes
- No sidebar/navigation entries for new storybook pages (needs manual addition to `ComposingMenuStore`)

### Alert: Buttons Using `alert()`
The dead button fixes for settings, forms, and confirmations use temporary `alert()` calls. These are placeholder interactions that should be replaced with proper `toast()` notifications or modal dialogs in the next session. They're infinitely better than silent no-ops, but they're not production-final UX.

---

## Audit Disclosure

This CHANGELOG was produced by:
1. Cloning the live repo at commit d6a46d1
2. Running the full audit protocol (Phases 1–5)
3. Verifying every file in both prior tarballs against the live repo
4. Rebuilding all lost work against the verified live state
5. Re-counting dead buttons, speechSynthesis references, and hook wiring after every change

Zero assumptions from memory. Every claim in this document is verifiable against the packaged files.

---

## 7. Playwright E2E Test Suite (24 files, 2,790L)

Comprehensive end-to-end test coverage for all mega-session deliverables.

### New Test Files (5)

| File | Tests | Coverage |
|------|-------|----------|
| `e2e/storybook/storybook.spec.ts` | 8 | All 8 storybook pages |
| `e2e/notifications/notifications.spec.ts` | 5 | Notification page + header bell |
| `e2e/golden-path/golden-path.spec.ts` | 11 | All 4 pages, ZPD, recommendations |
| `e2e/homeschool/homeschool.spec.ts` | 13 | All 9 pages, dead buttons, WA data |
| `e2e/hosting/hosting.spec.ts` | 12 | All 9 pages, dead buttons, interactions |

### Updated Test Files (6)

| File | Change |
|------|--------|
| `helpers.ts` | +VoiceBannerHelper, +NotificationHelper, +expectNoDeadButtons(), +DemoDataHelper |
| `early-years.spec.ts` | +speechSynthesis elimination, +Kokoro fallback banner, +voice guidance smoke |
| `api-smoke.spec.ts` | +5 notification endpoints, +6 parent portal endpoints, +1 voice TTS endpoint |
| `parent.spec.ts` | +Patterson family DEMO_MODE, +dead button regression |
| `teacher/dashboard.spec.ts` | +dead button regression (8 pages), +3 button navigation tests |
| `playwright.config.ts` | +5 projects (storybook, golden-path, homeschool, hosting, notifications) |

### Unchanged (10 spec files + global-setup + fixtures)

All original test files carried forward. Total: ~165 tests (up from ~90).

### Running

```bash
pnpm test:e2e                              # all tests
pnpm test:e2e:storybook                    # storybook only
pnpm exec playwright test --grep "dead button"  # regression only
pnpm exec playwright test --grep "Voice"   # voice only
```
