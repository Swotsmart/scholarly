# TASK: Deploy UC v5.0 Foundation + Steps 4–7 Test Suite

> **Context:** The previous deployment of UC v5.0 only included two files:
> `uc-v5-scholarly-boot.ts` and `schema-additions.prisma`. The boot script
> imports from 5 subdirectories (`adapters/`, `bus/`, `config/`, `core/`,
> `utils/`) that were never deployed. These must be deployed now, along
> with the Steps 4–7 test suite and a fix to the boot script's plugin paths.
>
> There is NO previous UC version (v3.0/3.2) in the codebase — it was
> never deployed despite earlier reports. This is a clean install of the
> UC v5.0 foundation.

## Summary of Changes

| Action | Files | Why |
|--------|-------|-----|
| **ADD** 5 directories (8 files) | `uc-v5/adapters/`, `bus/`, `config/`, `core/`, `utils/` | Boot script imports from these — they were missing from previous deployment |
| **REPLACE** boot script | `uc-v5/uc-v5-scholarly-boot.ts` | Plugin paths fixed: `../uc-v4/src/plugins/*` → `./plugins/*` |
| **ADD** test file | `tutor-onboarding.service.steps-4-7.test.ts` | 38 new tests for Steps 4–7 |
| **REMOVE** stale test | 1 test block in `tutor-onboarding.service.test.ts` | Was asserting Steps 4–7 throw "Sprint 2" — they no longer do |

---

## Part 1: Deploy UC v5.0 Foundation Directories

The boot script (`uc-v5-scholarly-boot.ts`) imports from these 8 files.
Without them, the UC platform cannot start.

### Files to Deploy

Place these in the same directory as `uc-v5-scholarly-boot.ts`:

```
uc-v5/
├── uc-v5-scholarly-boot.ts         (468 lines) ← REPLACE existing (plugin paths fixed)
├── schema-additions.prisma         (128 lines) ← already deployed, no change
├── adapters/                       ← NEW DIRECTORY
│   ├── nats-event-bridge.ts        (268 lines)  NATS ↔ UC event bridge
│   ├── prisma-storage-adapter.ts   (279 lines)  Prisma KV store for plugins
│   └── scholarly-auth-middleware.ts (228 lines)  JWT auth for Scholarly tenants
├── bus/                            ← NEW DIRECTORY
│   ├── event-bus.ts                (225 lines)  In-process event bus
│   └── event-types.ts              (300 lines)  UC event type definitions
├── config/                         ← NEW DIRECTORY
│   └── index.ts                    (102 lines)  Platform config types + merge utility
├── core/                           ← NEW DIRECTORY
│   └── plugin-interface.ts         (249 lines)  IUCPlugin contract + capability interfaces
└── utils/                          ← NEW DIRECTORY
    └── logger.ts                    (27 lines)  Logging utility
```

### Import Dependency Chain

This is the resolution order — every import resolves within the `uc-v5/` directory:

```
uc-v5-scholarly-boot.ts
  ├── ./config                        → config/index.ts
  ├── ./bus/event-bus                  → bus/event-bus.ts (no imports)
  ├── ./adapters/nats-event-bridge     → bus/event-bus, config, utils/logger
  ├── ./adapters/prisma-storage-adapter → core/plugin-interface, config, utils/logger
  └── ./adapters/scholarly-auth-middleware → config, core/plugin-interface, utils/logger

config/index.ts                       → (no internal imports)
bus/event-bus.ts                      → (no internal imports)
bus/event-types.ts                    → (no internal imports — kept for plugin use)
core/plugin-interface.ts              → bus/event-bus, config, utils/logger
utils/logger.ts                       → (no internal imports)
```

External npm dependencies (already in the monorepo):
- `express` (types only, for middleware signature)
- `jsonwebtoken` (for JWT verification in auth middleware)

### What Changed in the Boot Script

The plugin import map was updated. Old paths pointed to `../uc-v4/src/plugins/*`
which doesn't exist. New paths point to `./plugins/*` — a future directory that
will be created when plugins are ported. The platform boots successfully without
plugins (the loader warns and skips missing ones).

```diff
- 'video':             '../uc-v4/src/plugins/video',
- 'chat':              '../uc-v4/src/plugins/chat',
+ 'video':             './plugins/video',
+ 'chat':              './plugins/chat',
  ...etc for all 16 plugins
```

---

## Part 2: Deploy Steps 4–7 Test Suite

### New File

Place `tutor-onboarding.service.steps-4-7.test.ts` (862 lines) next to
the existing test file:

```
packages/api/src/services/tutor-onboarding/
├── tutor-onboarding.types.ts
├── tutor-onboarding.service.ts
├── onboarding-session.repository.ts
├── tutor-onboarding.service.test.ts              ← existing (Steps 1–3)
└── tutor-onboarding.service.steps-4-7.test.ts    ← NEW (Steps 4–7)
```

The file is self-contained — it duplicates mock factories so there's no
shared test helper to worry about.

### Test Coverage (38 cases)

- **Step 4 Domain (9):** All 4 paths (subdomain_only, purchase_new, transfer_existing, point_existing), error cases (unavailable domain, missing domainName, missing authCode), state machine guard
- **Step 5 Payments (6):** Skip path, complete path (Stripe account + onboarding URL + country mapping), state machine guard
- **Step 6 Profile (7):** AI-generated bio, social posts (on/off), manual bio, completeness scoring (with/without photo), state machine guard
- **Step 7 Go Live (7):** Provider activation, summary, Stripe check, COMPLETED state, event, cache clear, rejected without confirmation
- **Full Flow (1):** Complete Érudits-style 7-step sequence

### Remove Stale Test

In `tutor-onboarding.service.test.ts`, find and **delete** this test block
(approximately lines 531–537):

```typescript
it('rejects completing Steps 4-7 in Sprint 1', async () => {
  const session = await service.createSession('TUTOR_SOLO');
  await expect(
    service.completeDomain(session.id, { choice: 'subdomain_only' }),
  ).rejects.toThrow(/Sprint 2/);
});
```

This test was written when Steps 4–7 were stubs. They now have real
implementations and this test will fail.

---

## Verification

Run in order:

```bash
# 1. Verify UC v5 foundation files are in place
ls -la packages/uc-v5/src/adapters/
ls -la packages/uc-v5/src/bus/
ls -la packages/uc-v5/src/config/
ls -la packages/uc-v5/src/core/
ls -la packages/uc-v5/src/utils/

# 2. TypeScript compilation
npx tsc --noEmit

# 3. Run Steps 1–3 tests (should still pass, stale test removed)
npx vitest run tutor-onboarding.service.test

# 4. Run Steps 4–7 tests (38 new tests)
npx vitest run tutor-onboarding.service.steps-4-7.test

# 5. Run everything
npm test
```

Expected: 0 compilation errors, all tests pass.

## What NOT To Do

- **Don't skip the boot script replacement** — the old one has broken `../uc-v4/` plugin paths
- **Don't merge the two test files** — they're separate by design
- **Don't create a `plugins/` directory yet** — plugins will be added in a future sprint
- **Don't look for UC v3.0/3.2 to remove** — it was never deployed
