# ElevenLabs Removal Task

## Context

The Scholarly platform has migrated from ElevenLabs (third-party TTS/STT) to a self-hosted voice service at `services/voice-service/` (Python FastAPI with Kokoro TTS, Whisper STT, Chatterbox voice cloning). The self-hosted service is fully built, deployed on a GPU T4 container at `scholarly-voice`, and actively serving production traffic through the Voice Studio UI.

ElevenLabs is still referenced across the codebase but is functionally dead — only **two files** have real runtime dependencies. Everything else is sprint blueprints (excluded from compilation), migration documentation, or comments. This task removes it completely.

**Goal**: Zero ElevenLabs references in compiled code. The API server boots without `ELEVENLABS_API_KEY`. The npm dependency is gone. Type unions are clean. Documentation is updated.

---

## Pre-Flight Checks

Before making any changes, verify the current state:

```bash
# 1. Confirm voice service exists and is intact
ls services/voice-service/
cat services/voice-service/pyproject.toml | head -20

# 2. Confirm scholarly-voice-adapter.ts exists (the replacement)
cat packages/api/src/services/ai/providers/scholarly-voice-adapter.ts | head -30

# 3. Count current ElevenLabs references (baseline)
grep -ri "elevenlabs\|eleven.labs\|eleven_labs\|ELEVENLABS" \
  --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" \
  -c . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v ":0" | wc -l

# 4. Check what's excluded from tsconfig compilation
cat packages/api/tsconfig.json | grep -A 50 "exclude"
```

**STOP if scholarly-voice-adapter.ts does not exist** — the replacement adapter is required before removing ElevenLabs.

---

## Step 1: Refactor voice-intelligence.service.ts (P0 — Critical)

**File**: `packages/api/src/services/voice-intelligence.service.ts`

This is the **only file** with a real `import { ElevenLabsClient }` in compiled code. It uses the ElevenLabs WebSocket SDK for voice intelligence features.

### What to do

1. Read the file fully to understand what ElevenLabs capabilities it uses
2. Read `packages/api/src/services/ai/providers/scholarly-voice-adapter.ts` to understand what the self-hosted replacement exposes
3. Read `services/voice-service/app/routes/` to see available endpoints on the self-hosted service

Then refactor:

- Replace `import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'` with an HTTP client calling the self-hosted voice service
- The self-hosted service URL should come from environment config (e.g., `VOICE_SERVICE_URL`), not hardcoded
- Preserve the existing public API surface of the service — callers should not need to change
- If the self-hosted service doesn't yet expose an equivalent endpoint for a specific feature, add a `// TODO: Voice service endpoint needed for [feature]` comment and throw a clear error rather than silently failing

### Verification

```bash
# Must return 0 results
grep -n "from.*elevenlabs\|require.*elevenlabs\|import.*ElevenLabs" \
  packages/api/src/services/voice-intelligence.service.ts

# Must compile
npx tsc --noEmit --project packages/api/tsconfig.json 2>&1 | head -20
```

---

## Step 2: Remove ElevenLabs from config-validation.ts (P0 — Critical)

**File**: `packages/api/src/infrastructure/config-validation.ts`

This file has a Zod schema that **requires** `ELEVENLABS_API_KEY` at startup. Without this change, the API server will refuse to boot once the env var is removed from Azure Key Vault.

### What to do

1. Read the file and find the `elevenlabs` or `ELEVENLABS_API_KEY` config block
2. Remove the entire ElevenLabs config block from the Zod schema
3. If `VOICE_SERVICE_URL` is not already in the config schema, **add it** — this is the replacement config for the self-hosted voice service
4. Remove any ElevenLabs-specific validation logic (key format checks, etc.)

### Verification

```bash
# Must return 0 results
grep -n "ELEVENLABS\|elevenlabs" packages/api/src/infrastructure/config-validation.ts

# Must have VOICE_SERVICE_URL
grep -n "VOICE_SERVICE_URL\|voiceServiceUrl\|voice.service" packages/api/src/infrastructure/config-validation.ts
```

---

## Step 3: Remove npm dependency (P1)

**File**: `packages/api/package.json`

### What to do

1. Remove `"@elevenlabs/elevenlabs-js"` from the `dependencies` block
2. Run `pnpm install` to update the lockfile
3. Verify no other package depends on it

### Verification

```bash
# Must return 0 results
grep "elevenlabs" packages/api/package.json

# Lockfile should update cleanly
pnpm install --frozen-lockfile 2>&1 || pnpm install
```

---

## Step 4: Clean up provider type union (P1)

**File**: `packages/api/src/services/ai/capability-interfaces.ts`

### What to do

1. Find the provider type union that includes `'elevenlabs'` as an option
2. Remove `'elevenlabs'` from the union
3. If there's a provider capabilities map or factory that has an ElevenLabs entry, remove that too

### Verification

```bash
# Must return 0 results
grep -n "elevenlabs" packages/api/src/services/ai/capability-interfaces.ts
```

---

## Step 5: Clean up ai-engine route (P1)

**File**: `packages/api/src/routes/ai-engine.ts`

### What to do

1. Find where `elevenlabs` is listed as a provider with an `ELEVENLABS_API_KEY` env check
2. Remove the ElevenLabs provider entry
3. If the self-hosted voice service isn't already listed as a provider, add it with `VOICE_SERVICE_URL` config

### Verification

```bash
grep -n "elevenlabs\|ELEVENLABS" packages/api/src/routes/ai-engine.ts
```

---

## Step 6: Clean up database type export (P2)

**File**: `packages/database/src/index.ts`

### What to do

1. Check if `VoiceElevenLabsConfig` is an actual Prisma model or just a re-export
2. If it's a Prisma model: leave for now (schema migration is a separate task), but add a `// TODO: Remove VoiceElevenLabsConfig model in next schema migration` comment
3. If it's a manual type/re-export: remove it

### Verification

```bash
# Check if it's in the Prisma schema
grep "VoiceElevenLabsConfig" packages/database/prisma/schema.prisma

# Check the export
grep "VoiceElevenLabsConfig" packages/database/src/index.ts
```

---

## Step 7: Clean up UI references (P2)

**Files**:
- `packages/web/src/app/(dashboard)/demo/voice-intelligence/page.tsx`
- `packages/web/src/app/(dashboard)/demo/page.tsx`
- `packages/web/src/app/(early-years)/early-years/page.tsx`
- `packages/web/src/components/early-years/mentor-selector.tsx`

### What to do

1. In demo pages: replace "ElevenLabs" labels/text with "Scholarly Voice" or "Voice Service"
2. In early-years pages: update any comments referencing ElevenLabs to reference the self-hosted service
3. Do NOT change any functionality — these are label/comment changes only

### Verification

```bash
grep -rn "ElevenLabs\|elevenlabs\|ELEVENLABS" \
  packages/web/src/app/(dashboard)/demo/ \
  packages/web/src/app/(early-years)/ \
  packages/web/src/components/early-years/
```

---

## Step 8: Clean up migration/removal documentation files (P2)

**Files**:
- `packages/api/src/services/voice/elevenlabs-removal-manifest.ts`
- `packages/api/src/services/voice/infra-config-cleanup.ts`
- `services/voice-service/provider-registry-cleanup.py`
- `services/voice-service/.env.example` (commented-out ELEVENLABS vars)

### What to do

1. `elevenlabs-removal-manifest.ts` — This file documents the removal steps. Once Steps 1–7 are complete, **delete this file entirely**. Its purpose is fulfilled.
2. `infra-config-cleanup.ts` — Same: delete once cleanup is done. It's a checklist, not runtime code.
3. `provider-registry-cleanup.py` — Delete. Removal documentation for the Python side.
4. `services/voice-service/.env.example` — Remove any commented-out `ELEVENLABS_*` environment variable lines. Keep all other vars.

### Verification

```bash
# These files should no longer exist
test ! -f packages/api/src/services/voice/elevenlabs-removal-manifest.ts && echo "PASS" || echo "FAIL"
test ! -f packages/api/src/services/voice/infra-config-cleanup.ts && echo "PASS" || echo "FAIL"
test ! -f services/voice-service/provider-registry-cleanup.py && echo "PASS" || echo "FAIL"

# .env.example should have no ElevenLabs vars
grep -i "elevenlabs" services/voice-service/.env.example
```

---

## Step 9: Clean up sprint blueprint comments (P3 — Low priority)

These files are **excluded from tsconfig compilation** and are reference blueprints, not runtime code. The changes here are cosmetic — removing stale references so future developers aren't confused.

**Files** (approximately 20, all in `packages/api/src/services/`):
- `storybook/audio-narration.ts`
- `storybook/audio-narration-pipeline.ts`
- `storybook/seed-library-generator-v2.ts`
- `voice-intelligence-websocket.service.ts`
- And others with 1–5 refs each

### What to do

For each file, find the ElevenLabs references and assess:
- **Class/function definitions** (e.g., `ElevenLabsTTSClient` class): Replace with self-hosted equivalents or add `// DEPRECATED: Replaced by self-hosted Kokoro TTS` comment
- **Hardcoded voice IDs** (e.g., ElevenLabs voice UUIDs): Replace with Kokoro voice persona IDs (e.g., `af_bella`, `am_adam`)
- **Import statements**: Replace with self-hosted service imports
- **Comments**: Update to reference current architecture

### Finding all affected files

```bash
# List all files with refs that aren't already handled in Steps 1-8
grep -ri "elevenlabs\|eleven.labs\|ELEVENLABS" \
  --include="*.ts" --include="*.tsx" \
  -l . 2>/dev/null | grep -v node_modules | grep -v ".git" | \
  grep -v "voice-intelligence.service.ts" | \
  grep -v "config-validation.ts" | \
  grep -v "capability-interfaces.ts" | \
  grep -v "ai-engine.ts" | \
  grep -v "elevenlabs-removal-manifest.ts" | \
  grep -v "infra-config-cleanup.ts" | \
  grep -v "package.json" | \
  sort
```

---

## Step 10: Update CLAUDE.md (P1)

**File**: `CLAUDE.md` (repo root)

### What to do

1. Line 49: Remove "ElevenLabs" from the API stack description. Replace with "Scholarly Voice Service (self-hosted Kokoro TTS)"
2. Line 96: Remove `ELEVENLABS_API_KEY` from the environment variables list. Add `VOICE_SERVICE_URL` instead
3. Add a new section for the voice service:

```markdown
## Voice Service (`services/voice-service`)

**Stack**: Python 3.11, FastAPI, Kokoro TTS, Whisper STT, Chatterbox voice cloning, PyTorch.

Self-hosted TTS/STT/voice cloning microservice. Deployed as `scholarly-voice` on GPU T4 workload.

**Endpoints**: `/tts/synthesise`, `/stt/transcribe`, `/clone/create`, `/studio/*`, `/health`

**Config**: `VOICE_SERVICE_URL` env var in API server points to this service.
```

---

## Step 11: Update voice-adapter legacy mappings (Deferred)

**File**: `packages/api/src/services/ai/providers/scholarly-voice-adapter.ts`

This file contains `legacyElevenLabsId` mappings that translate old ElevenLabs voice IDs to Kokoro persona IDs. These exist so that any content created with ElevenLabs voice references continues to work.

### What to do

**Do NOT remove these mappings yet.** They're needed for backward compatibility with existing content. Add a comment:

```typescript
// Legacy ElevenLabs voice ID → Kokoro persona mappings
// Retained for backward compatibility with content created before voice service migration
// Safe to remove once all content has been re-rendered with Kokoro voice IDs
// TODO: Create migration script to update StorybookPage.voiceId references in database
```

---

## Final Verification

After all steps are complete, run this full validation:

```bash
echo "=== 1. Zero ElevenLabs in compiled code ==="
# Exclude test files, sprint blueprints (check tsconfig exclude list), and node_modules
grep -ri "elevenlabs\|ELEVENLABS" \
  --include="*.ts" --include="*.tsx" \
  . 2>/dev/null | grep -v node_modules | grep -v ".git" | \
  grep -v "__tests__" | grep -v "\.test\." | grep -v "\.spec\." | wc -l
echo "(should be 0 or very close — any remaining should be in excluded sprint blueprints only)"

echo ""
echo "=== 2. No npm dependency ==="
grep "elevenlabs" packages/api/package.json && echo "FAIL" || echo "PASS"

echo ""
echo "=== 3. No config requirement ==="
grep "ELEVENLABS" packages/api/src/infrastructure/config-validation.ts && echo "FAIL" || echo "PASS"

echo ""
echo "=== 4. No active imports ==="
grep -r "from.*elevenlabs\|import.*ElevenLabs" \
  --include="*.ts" --include="*.tsx" \
  . 2>/dev/null | grep -v node_modules | grep -v ".git" && echo "FAIL" || echo "PASS"

echo ""
echo "=== 5. TypeScript compiles ==="
npx tsc --noEmit --project packages/api/tsconfig.json 2>&1 | tail -5

echo ""
echo "=== 6. VOICE_SERVICE_URL in config ==="
grep "VOICE_SERVICE_URL\|voiceServiceUrl" packages/api/src/infrastructure/config-validation.ts && echo "PASS" || echo "FAIL"

echo ""
echo "=== 7. CLAUDE.md updated ==="
grep "ElevenLabs" CLAUDE.md && echo "FAIL — still references ElevenLabs" || echo "PASS"
grep "VOICE_SERVICE_URL\|voice-service\|Voice Service" CLAUDE.md && echo "PASS" || echo "FAIL — no voice service reference"

echo ""
echo "=== 8. Removal docs deleted ==="
test ! -f packages/api/src/services/voice/elevenlabs-removal-manifest.ts && echo "PASS" || echo "FAIL"
test ! -f packages/api/src/services/voice/infra-config-cleanup.ts && echo "PASS" || echo "FAIL"

echo ""
echo "=== 9. Legacy adapter preserved ==="
grep "legacyElevenLabsId\|Legacy.*ElevenLabs" packages/api/src/services/ai/providers/scholarly-voice-adapter.ts && echo "PASS — backward compat retained" || echo "WARNING — check adapter"
```

---

## Execution Order

| Order | Step | Priority | Risk | Estimated Changes |
|-------|------|----------|------|-------------------|
| 1 | Pre-flight checks | — | None | Read-only |
| 2 | Step 1: voice-intelligence.service.ts | P0 | HIGH — only real import | Major refactor |
| 3 | Step 2: config-validation.ts | P0 | HIGH — blocks server boot | Config block removal + addition |
| 4 | Step 3: package.json | P1 | Medium | 1 line + lockfile |
| 5 | Step 4: capability-interfaces.ts | P1 | Low | Union type edit |
| 6 | Step 5: ai-engine.ts | P1 | Low | Provider list edit |
| 7 | Step 10: CLAUDE.md | P1 | None | Documentation |
| 8 | Step 6: database export | P2 | Low | Type export |
| 9 | Step 7: UI references | P2 | Low | Label/comment changes |
| 10 | Step 8: Removal docs | P2 | None | File deletions |
| 11 | Step 9: Sprint blueprints | P3 | None | Comment updates |
| 12 | Step 11: Adapter mappings | Deferred | — | Comment only |
| 13 | Final verification | — | None | Read-only |

**Commit after each P0 step.** If Step 1 breaks something, you can revert without losing Step 2 progress. Steps 3–11 can be a single commit.

---

## Infrastructure Follow-Up (Manual — Not Part of This Task)

After the code changes are merged and deployed:

1. **Azure Key Vault**: Remove `ELEVENLABS_API_KEY` secret
2. **Azure Container App** (`scholarly-api`): Remove `ELEVENLABS_API_KEY` env var from configuration
3. **Add** `VOICE_SERVICE_URL` env var pointing to `scholarly-voice` container's internal FQDN if not already set
4. **ElevenLabs account**: Cancel subscription / API access (projected saving: ~$15,000/month → $300/month with self-hosted)
