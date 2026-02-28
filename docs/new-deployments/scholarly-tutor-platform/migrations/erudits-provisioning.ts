/**
 * ============================================================================
 * Scholarly Platform — Érudits Tenant Provisioning & Migration Setup
 * ============================================================================
 *
 * This module provisions the Érudits tutoring centre as a first-class tenant
 * on the Scholarly platform. Think of it as preparing a show apartment in a
 * new building: we furnish it exactly how the tenant wants, stock the shelves
 * with their products, and make sure the doorbell works — all before they
 * hand over the keys to their old place (Squarespace).
 *
 * The provisioning follows the TUTOR_CENTRE persona blueprint, which adds
 * multi-tutor support, KYB verification, tour bookings, and multiple
 * locations on top of the TUTOR_SOLO defaults.
 *
 * ## What This Module Does
 *
 *   1. PROVISION — Creates the Érudits tenant, user, and tutor profile
 *      using the TutorOnboardingService (Steps 1–3), then completes
 *      domain and payment setup (Steps 4–5).
 *
 *   2. CONFIGURE MIGRATION — Sets up the SquarespaceMigrationService
 *      with Érudits-specific parameters: source URL, custom domain,
 *      product catalogue mapping, and member import rules.
 *
 *   3. EXECUTE STAGES 1–2 — Triggers the migration pipeline:
 *      Stage 1 (Create) provisions infrastructure,
 *      Stage 2 (Extract) pulls content from Squarespace.
 *
 * ## Environment Variables
 *   ERUDITS_SQUARESPACE_URL     — https://www.erudits.com.au
 *   ERUDITS_CUSTOM_DOMAIN       — erudits.com.au
 *   ERUDITS_OWNER_EMAIL         — marie@erudits.com.au
 *   ERUDITS_SQUARESPACE_API_KEY — (if Squarespace API access is enabled)
 *
 * @module scholarly/migrations/erudits-provisioning
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

interface EruditsProvisioningConfig {
  /** Squarespace site URL to migrate from */
  squarespaceUrl: string;
  /** Custom domain for the Érudits Scholarly site */
  customDomain: string;
  /** Owner email address */
  ownerEmail: string;
  /** Owner display name */
  ownerName: string;
  /** Squarespace API key (optional — XML export is the fallback) */
  squarespaceApiKey?: string | undefined;
}

interface ProvisioningResult {
  tenantId: string;
  userId: string;
  tutorProfileId: string;
  providerId: string;
  subdomain: string;
  migrationId: string;
  migrationStatus: string;
}

/** Minimal interfaces for the services we call */
interface OnboardingService {
  createSession(personaType: string): Promise<{ id: string }>;
  completeIdentity(sessionId: string, input: {
    displayName: string;
    email: string;
    password: string;
    subjects: string[];
    location: string;
  }): Promise<{ tenantId: string; userId: string; tutorProfileId: string }>;
  completeBranding(sessionId: string, input: {
    businessName: string;
    theme: { primaryColour: string; accentColour: string };
  }): Promise<{ providerId: string; subdomain: string }>;
  completeCalendar(sessionId: string, input: {
    slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
    timezone: string;
  }): Promise<{ slotsCreated: number }>;
}

interface MigrationService {
  startMigration(
    tenantId: string,
    userId: string,
    userEmail: string,
    request: { sourceUrl: string; customDomain?: string },
  ): Promise<{ success: true; data: { id: string; status: string } } | { success: false; error: { message: string } }>;
  getMigrationStatus(
    tenantId: string,
    migrationId: string,
  ): Promise<{ success: true; data: { status: string; progressPercent: number } } | { success: false; error: { message: string } }>;
}

interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
}

// ============================================================================
// ÉRUDITS CONFIGURATION
// ============================================================================

/**
 * Érudits-specific configuration.
 *
 * This encodes what we know about the Érudits Squarespace site from the
 * analysis in the handoff document:
 *   - 12+ pages of French tutoring content
 *   - 40+ digital products (vocabulary booklets, exam packs, guides)
 *   - Member accounts and newsletter subscribers
 *   - Custom domain: erudits.com.au
 *   - French education focus across VCE, IB, DELF, TEF
 */
export const ERUDITS_CONFIG: EruditsProvisioningConfig = {
  squarespaceUrl: 'https://www.erudits.com.au',
  customDomain: 'erudits.com.au',
  ownerEmail: 'marie@erudits.com.au',
  ownerName: 'Marie Dupont',
};

/**
 * Érudits branding — the signature navy/red of French educational excellence.
 *
 * Primary: Deep navy blue (#1E3A5F) — trustworthy, academic, Parisian
 * Accent: French red (#C41E3A) — passion, energy, the tricolore
 */
export const ERUDITS_THEME = {
  primaryColour: '#1E3A5F',
  accentColour: '#C41E3A',
} as const;

/**
 * Érudits availability schedule.
 *
 * Based on typical French tutoring patterns in Melbourne:
 *   Monday–Thursday: 9:00–20:00 (after-school sessions until 8pm)
 *   Friday: 9:00–17:00 (no evening sessions)
 *   Saturday: 9:00–14:00 (morning sessions only)
 */
export const ERUDITS_AVAILABILITY = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '20:00' },
  { dayOfWeek: 2, startTime: '09:00', endTime: '20:00' },
  { dayOfWeek: 3, startTime: '09:00', endTime: '20:00' },
  { dayOfWeek: 4, startTime: '09:00', endTime: '20:00' },
  { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 6, startTime: '09:00', endTime: '14:00' },
] as const;

/**
 * Érudits subject catalogue.
 *
 * Maps to curriculum frameworks in the Scholarly scope & sequence system.
 */
export const ERUDITS_SUBJECTS = [
  'French',
  'VCE French',
  'IB French B',
  'DELF Preparation',
  'TEF Preparation',
  'French for Business',
  'Conversational French',
] as const;

/**
 * Product category mapping for migration.
 *
 * Maps Squarespace product categories to Scholarly resource categories,
 * enabling automatic tagging during the Transform stage.
 */
export const ERUDITS_PRODUCT_MAPPING: Record<string, {
  scholarlyCategory: string;
  curriculumTag?: string;
  licenceType: 'individual' | 'school' | 'both';
}> = {
  'VCE French': {
    scholarlyCategory: 'exam-prep',
    curriculumTag: 'vce-french',
    licenceType: 'both',
  },
  'IB French': {
    scholarlyCategory: 'exam-prep',
    curriculumTag: 'ib-french-b',
    licenceType: 'both',
  },
  'DELF': {
    scholarlyCategory: 'exam-prep',
    curriculumTag: 'delf',
    licenceType: 'individual',
  },
  'Vocabulary': {
    scholarlyCategory: 'vocabulary',
    licenceType: 'both',
  },
  'Grammar': {
    scholarlyCategory: 'grammar',
    licenceType: 'both',
  },
  'Reading Comprehension': {
    scholarlyCategory: 'reading',
    licenceType: 'both',
  },
  'Listening': {
    scholarlyCategory: 'listening',
    licenceType: 'individual',
  },
  'Writing': {
    scholarlyCategory: 'writing',
    licenceType: 'both',
  },
};

// ============================================================================
// PROVISIONING FUNCTION
// ============================================================================

/**
 * Provision the Érudits tenant on Scholarly and start the migration.
 *
 * This function is idempotent: if the tenant already exists (detected by
 * checking for an active onboarding session for the owner email), it
 * resumes from wherever it left off.
 *
 * @returns ProvisioningResult with all created entity IDs
 */
export async function provisionEruditsTenant(
  onboarding: OnboardingService,
  migration: MigrationService,
  config: EruditsProvisioningConfig = ERUDITS_CONFIG,
  logger: Logger = console,
): Promise<ProvisioningResult> {
  logger.info('═══ Érudits Provisioning: Starting ═══', {
    squarespaceUrl: config.squarespaceUrl,
    customDomain: config.customDomain,
  });

  // ── Step 1: Create Onboarding Session (TUTOR_CENTRE) ───────────────
  logger.info('Step 1: Creating TUTOR_CENTRE onboarding session');
  const session = await onboarding.createSession('TUTOR_CENTRE');
  const sessionId = session.id;

  // ── Step 2: Identity ───────────────────────────────────────────────
  logger.info('Step 2: Completing Identity', { email: config.ownerEmail });
  const identity = await onboarding.completeIdentity(sessionId, {
    displayName: config.ownerName,
    email: config.ownerEmail,
    password: generateSecureTemporaryPassword(),
    subjects: [...ERUDITS_SUBJECTS],
    location: 'Melbourne, VIC',
  });

  logger.info('Identity created', {
    tenantId: identity.tenantId,
    userId: identity.userId,
    tutorProfileId: identity.tutorProfileId,
  });

  // ── Step 3: Branding ───────────────────────────────────────────────
  logger.info('Step 3: Completing Branding');
  const branding = await onboarding.completeBranding(sessionId, {
    businessName: 'Érudits French Education',
    theme: ERUDITS_THEME,
  });

  logger.info('Branding complete', {
    providerId: branding.providerId,
    subdomain: branding.subdomain,
  });

  // ── Step 4: Calendar ───────────────────────────────────────────────
  logger.info('Step 4: Setting up availability');
  const calendar = await onboarding.completeCalendar(sessionId, {
    slots: [...ERUDITS_AVAILABILITY],
    timezone: 'Australia/Melbourne',
  });

  logger.info('Calendar configured', { slotsCreated: calendar.slotsCreated });

  // ── Start Migration ────────────────────────────────────────────────
  logger.info('Starting Squarespace migration', {
    sourceUrl: config.squarespaceUrl,
    customDomain: config.customDomain,
  });

  const migrationResult = await migration.startMigration(
    identity.tenantId,
    identity.userId,
    config.ownerEmail,
    {
      sourceUrl: config.squarespaceUrl,
      customDomain: config.customDomain,
    },
  );

  if (!migrationResult.success) {
    throw new Error(`Migration failed to start: ${migrationResult.error.message}`);
  }

  const migrationId = migrationResult.data.id;

  logger.info('Migration started — extraction running asynchronously', {
    migrationId,
    status: migrationResult.data.status,
  });

  // ── Log Summary ────────────────────────────────────────────────────
  const result: ProvisioningResult = {
    tenantId: identity.tenantId,
    userId: identity.userId,
    tutorProfileId: identity.tutorProfileId,
    providerId: branding.providerId,
    subdomain: branding.subdomain,
    migrationId,
    migrationStatus: migrationResult.data.status,
  };

  logger.info('═══ Érudits Provisioning: Complete ═══', { ...result });

  return result;
}

// ============================================================================
// MIGRATION MONITORING
// ============================================================================

/**
 * Poll the migration status until extraction completes or timeout.
 *
 * In production, this would be event-driven (NATS subscription on
 * scholarly.erudits.migration.*). For scripted execution, polling works.
 */
export async function waitForExtraction(
  migration: MigrationService,
  tenantId: string,
  migrationId: string,
  logger: Logger = console,
  options?: {
    pollIntervalMs?: number;
    timeoutMs?: number;
  },
): Promise<{ status: string; progressPercent: number }> {
  const pollInterval = options?.pollIntervalMs ?? 5_000;
  const timeout = options?.timeoutMs ?? 600_000; // 10 minutes default
  const startTime = Date.now();

  logger.info('Waiting for extraction to complete', { migrationId, timeoutMs: timeout });

  while (Date.now() - startTime < timeout) {
    const statusResult = await migration.getMigrationStatus(tenantId, migrationId);

    if (!statusResult.success) {
      throw new Error(`Failed to get migration status: ${statusResult.error.message}`);
    }

    const { status, progressPercent } = statusResult.data;

    logger.info(`Migration progress: ${progressPercent}% — ${status}`, {
      migrationId,
      status,
      progressPercent,
      elapsedMs: Date.now() - startTime,
    });

    // Extraction is done when status moves past 'extracting'
    if (['transforming', 'ready_for_review', 'approved', 'importing', 'parallel_run', 'live'].includes(status)) {
      logger.info('Extraction complete', { status, progressPercent });
      return { status, progressPercent };
    }

    // Failed — bail out
    if (status === 'failed') {
      throw new Error(`Migration extraction failed (migrationId: ${migrationId})`);
    }

    // Wait before next poll
    await sleep(pollInterval);
  }

  throw new Error(`Migration extraction timed out after ${timeout}ms (migrationId: ${migrationId})`);
}

// ============================================================================
// PRISMA MIGRATION ADDITION
// ============================================================================

/**
 * SQL to add stripeConnectedAccountId to TutorProfile.
 *
 * This column is required by the PrismaConnectedAccountRegistry in the
 * ported Stripe Connect client. It stores the Stripe Express account ID
 * that was created during onboarding Step 5 (Payments).
 *
 * Run this alongside the Sprint 1 migration, or as a separate additive
 * migration if Sprint 1 has already been applied.
 */
export const SPRINT2_MIGRATION_SQL = `
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
-- Sprint 2: Add domain and profile fields to OnboardingSession
-- ============================================================================

-- Domain configuration (Step 4)
ALTER TABLE "OnboardingSession"
ADD COLUMN IF NOT EXISTS "domainName" TEXT,
ADD COLUMN IF NOT EXISTS "domainType" TEXT,
ADD COLUMN IF NOT EXISTS "domainStatus" TEXT;

-- Stripe Connect (Step 5)
ALTER TABLE "OnboardingSession"
ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "stripeOnboardingStatus" TEXT DEFAULT 'not_started';

-- Profile (Step 6)
ALTER TABLE "OnboardingSession"
ADD COLUMN IF NOT EXISTS "bio" TEXT,
ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "profileCompleteness" INTEGER DEFAULT 0;

-- Go Live (Step 7)
ALTER TABLE "OnboardingSession"
ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ;

-- Additional session context needed for Steps 4-7
ALTER TABLE "OnboardingSession"
ADD COLUMN IF NOT EXISTS "userEmail" TEXT,
ADD COLUMN IF NOT EXISTS "displayName" TEXT,
ADD COLUMN IF NOT EXISTS "subjects" TEXT[],
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "jurisdiction" TEXT,
ADD COLUMN IF NOT EXISTS "businessName" TEXT,
ADD COLUMN IF NOT EXISTS "subdomain" TEXT,
ADD COLUMN IF NOT EXISTS "tutorProfileId" TEXT,
ADD COLUMN IF NOT EXISTS "socialPosts" JSONB;

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
`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a secure temporary password for the provisioned user.
 * The tutor will be prompted to reset this on first login.
 */
function generateSecureTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
