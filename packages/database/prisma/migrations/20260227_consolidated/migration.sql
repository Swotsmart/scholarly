-- ============================================================================
-- SCHOLARLY PLATFORM — Sprint 1 Prisma Migration
-- ============================================================================
--
-- Migration: 20260227_uc_v5_and_onboarding
--
-- This migration adds two infrastructure tables:
--
-- 1. uc_kv_store — The UC v5.0 platform's generic key-value storage table.
--    All UC plugins persist their state through this table via the
--    PrismaStorageAdapter. It uses JSONB for flexible schema-per-plugin
--    data, with composite unique constraints for collection + key + tenant
--    isolation. Think of it as a per-tenant document store that lives inside
--    your existing PostgreSQL database — no additional infrastructure needed.
--
-- 2. onboarding_session — Tracks tutor onboarding progress through the
--    7-step flow. Each row is a complete snapshot of an onboarding journey:
--    which step the tutor is on, what data they've entered, and what
--    resources have been provisioned so far. The JSONB columns store
--    step-specific data that varies by persona type, while scalar columns
--    hold the IDs that other tables reference.
--
-- Both tables include tenantId for multi-tenant isolation and follow the
-- existing Scholarly schema conventions (cuid IDs, camelCase fields,
-- @default(now()) timestamps).
--
-- This migration is ADDITIVE — it creates new tables and indices without
-- modifying any existing tables. Safe to run in production.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- §1 — UC v5.0 Key-Value Store
-- ────────────────────────────────────────────────────────────────────────────
-- The PrismaStorageAdapter (src/adapters/prisma-storage-adapter.ts) creates
-- this table lazily on first access, but we include it in the migration for
-- schema visibility and to ensure indices are created cleanly.

CREATE TABLE IF NOT EXISTS "uc_kv_store" (
  "id"          TEXT NOT NULL,
  "collection"  TEXT NOT NULL,
  "key"         TEXT NOT NULL,
  "tenant_id"   TEXT,
  "data"        JSONB NOT NULL DEFAULT '{}',
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uc_kv_store_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uc_kv_store_collection_key_tenant" UNIQUE ("collection", "key", "tenant_id")
);

-- Index for collection + tenant scoped queries (the most common access pattern)
CREATE INDEX IF NOT EXISTS "uc_kv_store_collection_tenant_idx"
  ON "uc_kv_store" ("collection", "tenant_id");

-- Index for tenant-only queries (admin dashboards, usage reports)
CREATE INDEX IF NOT EXISTS "uc_kv_store_tenant_idx"
  ON "uc_kv_store" ("tenant_id");

-- ────────────────────────────────────────────────────────────────────────────
-- §2 — Onboarding Session
-- ────────────────────────────────────────────────────────────────────────────
-- Tracks the full state of a tutor's onboarding journey. Each step stamps
-- the session with its output data. The session is resumable: if the browser
-- closes, the tutor picks up exactly where they left off.

CREATE TYPE "OnboardingStepEnum" AS ENUM (
  'NOT_STARTED',
  'IDENTITY',
  'BRANDING',
  'CALENDAR',
  'DOMAIN',
  'PAYMENTS',
  'PROFILE',
  'GO_LIVE',
  'COMPLETED',
  'ABANDONED'
);

CREATE TYPE "PersonaTypeEnum" AS ENUM (
  'TUTOR_SOLO',
  'TUTOR_CENTRE'
);

CREATE TYPE "DomainChoiceEnum" AS ENUM (
  'subdomain_only',
  'purchase_new',
  'transfer_existing',
  'point_existing'
);

CREATE TYPE "DomainStatusEnum" AS ENUM (
  'not_configured',
  'subdomain_active',
  'purchase_pending',
  'transfer_pending',
  'dns_verification_pending',
  'ssl_provisioning',
  'active',
  'failed'
);

CREATE TYPE "StripeOnboardingStatusEnum" AS ENUM (
  'not_started',
  'link_generated',
  'pending',
  'active',
  'restricted',
  'skipped'
);

CREATE TABLE IF NOT EXISTS "OnboardingSession" (
  "id"                TEXT NOT NULL,
  "personaType"       "PersonaTypeEnum" NOT NULL DEFAULT 'TUTOR_SOLO',
  "currentStep"       "OnboardingStepEnum" NOT NULL DEFAULT 'NOT_STARTED',
  "furthestStep"      "OnboardingStepEnum" NOT NULL DEFAULT 'NOT_STARTED',
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActivityAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"       TIMESTAMP(3),

  -- Step 1: Identity
  "userId"            TEXT,
  "tenantId"          TEXT,
  "tutorProfileId"    TEXT,

  -- Step 2: Branding
  "providerId"        TEXT,
  "subdomain"         TEXT,
  "businessName"      TEXT,
  "theme"             JSONB,

  -- Step 3: Calendar
  "availabilitySlots" JSONB NOT NULL DEFAULT '[]',
  "timezone"          TEXT,

  -- Step 4: Domain
  "domainType"        "DomainChoiceEnum",
  "domainName"        TEXT,
  "domainStatus"      "DomainStatusEnum",

  -- Step 5: Payments
  "stripeAccountId"   TEXT,
  "stripeStatus"      "StripeOnboardingStatusEnum",

  -- Step 6: Profile
  "suggestedBio"      TEXT,
  "bio"               TEXT,
  "socialPosts"       JSONB NOT NULL DEFAULT '[]',
  "profilePhotoUrl"   TEXT,

  -- Step 7: Go Live
  "publishedUrl"      TEXT,

  -- Metadata
  "lastError"         JSONB,
  "resumeCount"       INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- Index for finding sessions by user (resume after login)
CREATE INDEX IF NOT EXISTS "OnboardingSession_userId_idx"
  ON "OnboardingSession" ("userId");

-- Index for finding sessions by tenant
CREATE INDEX IF NOT EXISTS "OnboardingSession_tenantId_idx"
  ON "OnboardingSession" ("tenantId");

-- Index for finding abandoned sessions (cleanup job)
CREATE INDEX IF NOT EXISTS "OnboardingSession_step_activity_idx"
  ON "OnboardingSession" ("currentStep", "lastActivityAt");

-- Foreign keys to existing models (optional — add only if the referenced
-- tables exist in your Prisma schema. Commented out by default because
-- the migration should work regardless of migration order).
--
-- ALTER TABLE "OnboardingSession"
--   ADD CONSTRAINT "OnboardingSession_userId_fkey"
--   FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
--
-- ALTER TABLE "OnboardingSession"
--   ADD CONSTRAINT "OnboardingSession_tenantId_fkey"
--   FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- §3 — Prisma Migration Metadata
-- ────────────────────────────────────────────────────────────────────────────
-- If using Prisma Migrate, this migration should be registered in the
-- _prisma_migrations table. When running manually, insert the record below.

-- INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
-- VALUES (gen_random_uuid()::text, 'manual_sprint1_uc_onboarding', NOW(), '20260227000000_uc_v5_and_onboarding', NULL, NULL, NOW(), 1);



-- ============================================================================
-- Sprint 2: Add Stripe Connect column to TutorProfile
-- ============================================================================

-- Add stripeConnectedAccountId to TutorProfile
-- This stores the Stripe Express account ID (e.g., 'acct_1234567890')
-- created during tutor onboarding Step 5 (Payments).
ALTER TABLE "TutorProfile"
ADD COLUMN IF NOT EXISTS "stripeConnectedAccountId" TEXT;

-- Index for lookup by Stripe account ID (used by webhook handler)
CREATE INDEX IF NOT EXISTS "idx_tutor_profile_stripe_account"
ON "TutorProfile" ("stripeConnectedAccountId")
WHERE "stripeConnectedAccountId" IS NOT NULL;

-- ============================================================================
-- Sprint 2: Add supplementary context fields to OnboardingSession
-- ============================================================================
-- Only adds columns not already present in the CREATE TABLE above.

ALTER TABLE "OnboardingSession"
ADD COLUMN IF NOT EXISTS "profileCompleteness" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "userEmail" TEXT,
ADD COLUMN IF NOT EXISTS "displayName" TEXT,
ADD COLUMN IF NOT EXISTS "subjects" TEXT[],
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "jurisdiction" TEXT;

-- ============================================================================
-- Sprint 2: Platform Migrations table (for Squarespace migration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "PlatformMigration" (
  "id"                    TEXT        PRIMARY KEY,
  "tenantId"              TEXT        NOT NULL,
  "source"                TEXT        NOT NULL DEFAULT 'squarespace',
  "sourceUrl"             TEXT        NOT NULL,
  "ownerId"               TEXT        NOT NULL,
  "ownerEmail"            TEXT        NOT NULL,
  "status"                TEXT        NOT NULL DEFAULT 'created',
  "currentStep"           TEXT,
  "progressPercent"       INTEGER     NOT NULL DEFAULT 0,
  "pagesFound"            INTEGER     NOT NULL DEFAULT 0,
  "productsFound"         INTEGER     NOT NULL DEFAULT 0,
  "membersFound"          INTEGER     NOT NULL DEFAULT 0,
  "imagesFound"           INTEGER     NOT NULL DEFAULT 0,
  "postsFound"            INTEGER     NOT NULL DEFAULT 0,
  "pagesImported"         INTEGER     NOT NULL DEFAULT 0,
  "productsImported"      INTEGER     NOT NULL DEFAULT 0,
  "membersImported"       INTEGER     NOT NULL DEFAULT 0,
  "imagesImported"        INTEGER     NOT NULL DEFAULT 0,
  "postsImported"         INTEGER     NOT NULL DEFAULT 0,
  "customDomain"          TEXT,
  "dnsVerified"           BOOLEAN     NOT NULL DEFAULT false,
  "sslProvisioned"        BOOLEAN     NOT NULL DEFAULT false,
  "urlMappings"           JSONB,
  "errors"                JSONB       NOT NULL DEFAULT '[]',
  "warnings"              JSONB       NOT NULL DEFAULT '[]',
  "extractionStartedAt"   TIMESTAMPTZ,
  "extractionCompletedAt" TIMESTAMPTZ,
  "importStartedAt"       TIMESTAMPTZ,
  "importCompletedAt"     TIMESTAMPTZ,
  "cutoverAt"             TIMESTAMPTZ,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_platform_migration_tenant"
ON "PlatformMigration" ("tenantId");

CREATE INDEX IF NOT EXISTS "idx_platform_migration_owner"
ON "PlatformMigration" ("ownerId");

CREATE INDEX IF NOT EXISTS "idx_platform_migration_status"
ON "PlatformMigration" ("status");

-- Migration content items (individual pages, products, members, etc.)
CREATE TABLE IF NOT EXISTS "MigrationContentItem" (
  "id"             TEXT        PRIMARY KEY,
  "tenantId"       TEXT        NOT NULL,
  "migrationId"    TEXT        NOT NULL REFERENCES "PlatformMigration"("id") ON DELETE CASCADE,
  "sourceType"     TEXT        NOT NULL,
  "sourceId"       TEXT,
  "sourceUrl"      TEXT,
  "sourceTitle"    TEXT,
  "sourceData"     JSONB       NOT NULL DEFAULT '{}',
  "targetType"     TEXT,
  "targetId"       TEXT,
  "targetUrl"      TEXT,
  "status"         TEXT        NOT NULL DEFAULT 'pending',
  "requiresReview" BOOLEAN     NOT NULL DEFAULT false,
  "reviewNotes"    TEXT,
  "errorMessage"   TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_migration_content_migration"
ON "MigrationContentItem" ("migrationId");

CREATE INDEX IF NOT EXISTS "idx_migration_content_status"
ON "MigrationContentItem" ("migrationId", "status");

CREATE INDEX IF NOT EXISTS "idx_migration_content_type"
ON "MigrationContentItem" ("migrationId", "sourceType");

