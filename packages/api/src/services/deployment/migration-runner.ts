// =============================================================================
// SCHOLARLY PLATFORM — Sprint 7: LR-001
// Database Migration Runner & Seed Data Pipeline
// =============================================================================
// Handles Prisma migration execution, rollback orchestration, seed data
// generation, and multi-tenant database provisioning. Think of this as the
// construction crew that takes the architectural blueprints (Sprint 6 Prisma
// schema) and actually pours the concrete — creating tables, indexes, enums,
// and populating them with the foundational data the platform needs to breathe.
// =============================================================================

import { Result } from '../shared/result';

// =============================================================================
// Section 1: Migration Types & Configuration
// =============================================================================

export enum MigrationStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
  SKIPPED = 'SKIPPED',
}

export enum MigrationPhase {
  SCHEMA = 'SCHEMA',           // DDL: tables, columns, indexes
  ENUM = 'ENUM',               // Enum type creation/modification
  SEED = 'SEED',               // Reference data population
  TENANT = 'TENANT',           // Multi-tenant partition setup
  INDEX = 'INDEX',             // Post-data index creation (large tables)
  CONSTRAINT = 'CONSTRAINT',   // Deferred foreign key constraints
}

export interface MigrationRecord {
  id: string;
  name: string;
  phase: MigrationPhase;
  version: string;
  checksum: string;
  status: MigrationStatus;
  appliedAt: Date | null;
  rolledBackAt: Date | null;
  executionTimeMs: number;
  errorMessage: string | null;
  sqlStatements: number;
  affectedRows: number;
}

export interface MigrationConfig {
  databaseUrl: string;
  shadowDatabaseUrl?: string;
  schemaPath: string;
  migrationsDir: string;
  seedDir: string;
  lockTimeoutMs: number;
  statementTimeoutMs: number;
  maxRetries: number;
  dryRun: boolean;
  targetVersion?: string;
  skipSeed: boolean;
  tenantIds?: string[];
}

export interface SeedDataConfig {
  tenantId: string;
  includePhonicsData: boolean;
  includeSampleUsers: boolean;
  includeSampleContent: boolean;
  includeArenaConfig: boolean;
  locale: string;
  phonicsFramework: 'letters_and_sounds' | 'jolly_phonics' | 'read_write_inc';
}

export interface MigrationPlan {
  pending: MigrationStep[];
  currentVersion: string | null;
  targetVersion: string;
  estimatedTimeMs: number;
  requiresDowntime: boolean;
  breakingChanges: BreakingChange[];
}

export interface MigrationStep {
  name: string;
  phase: MigrationPhase;
  version: string;
  sql: string;
  rollbackSql: string;
  estimatedTimeMs: number;
  isBreaking: boolean;
  dependsOn: string[];
}

export interface BreakingChange {
  migration: string;
  description: string;
  impact: string;
  mitigationSteps: string[];
}

// =============================================================================
// Section 2: Migration Lock Manager
// =============================================================================
// Only one migration process should run at a time across the entire cluster.
// This is the traffic cop at a one-lane bridge — it ensures two deployment
// pods don't try to alter the schema simultaneously, which would be
// catastrophic (imagine two cranes trying to pour concrete into the same
// foundation form from different angles).
// =============================================================================

export interface MigrationLock {
  id: string;
  acquiredBy: string;
  acquiredAt: Date;
  expiresAt: Date;
  purpose: string;
}

export class MigrationLockManager {
  private readonly instanceId: string;
  private readonly lockTimeoutMs: number;
  private currentLock: MigrationLock | null = null;

  constructor(
    private readonly db: DatabaseClient,
    config: { instanceId: string; lockTimeoutMs: number }
  ) {
    this.instanceId = config.instanceId;
    this.lockTimeoutMs = config.lockTimeoutMs;
  }

  async acquireLock(purpose: string): Promise<Result<MigrationLock>> {
    const maxAttempts = 10;
    const retryDelayMs = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Advisory lock with timeout — PostgreSQL's pg_try_advisory_lock
        // returns immediately rather than blocking
        const result = await this.db.execute(`
          SELECT pg_try_advisory_lock(hashtext('scholarly_migration_lock'))
        `);

        if (result.rows[0]?.pg_try_advisory_lock === true) {
          // Check for stale locks from crashed processes
          await this.cleanStaleLocks();

          const lock: MigrationLock = {
            id: `mig_lock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            acquiredBy: this.instanceId,
            acquiredAt: new Date(),
            expiresAt: new Date(Date.now() + this.lockTimeoutMs),
            purpose,
          };

          await this.db.execute(`
            INSERT INTO _scholarly_migration_lock (id, acquired_by, acquired_at, expires_at, purpose)
            VALUES ($1, $2, $3, $4, $5)
          `, [lock.id, lock.acquiredBy, lock.acquiredAt, lock.expiresAt, lock.purpose]);

          this.currentLock = lock;
          return Result.ok(lock);
        }

        // Lock held by another process — check if it's stale
        const existingLock = await this.db.execute(`
          SELECT * FROM _scholarly_migration_lock ORDER BY acquired_at DESC LIMIT 1
        `);

        if (existingLock.rows[0]) {
          const expiresAt = new Date(existingLock.rows[0].expires_at);
          if (expiresAt < new Date()) {
            // Stale lock — force release
            await this.forceRelease(existingLock.rows[0].id);
            continue; // Retry immediately
          }
        }

        if (attempt < maxAttempts) {
          await this.delay(retryDelayMs * attempt);
        }
      } catch (error) {
        if (attempt === maxAttempts) {
          return Result.fail(`Failed to acquire migration lock after ${maxAttempts} attempts: ${error}`);
        }
        await this.delay(retryDelayMs);
      }
    }

    return Result.fail('Migration lock acquisition timed out');
  }

  async releaseLock(): Promise<Result<void>> {
    if (!this.currentLock) {
      return Result.fail('No lock held by this instance');
    }

    try {
      await this.db.execute(`
        DELETE FROM _scholarly_migration_lock WHERE id = $1 AND acquired_by = $2
      `, [this.currentLock.id, this.instanceId]);

      await this.db.execute(`
        SELECT pg_advisory_unlock(hashtext('scholarly_migration_lock'))
      `);

      this.currentLock = null;
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to release migration lock: ${error}`);
    }
  }

  async isLocked(): Promise<boolean> {
    const result = await this.db.execute(`
      SELECT COUNT(*) as count FROM _scholarly_migration_lock
      WHERE expires_at > NOW()
    `);
    return parseInt(result.rows[0]?.count || '0') > 0;
  }

  private async cleanStaleLocks(): Promise<void> {
    await this.db.execute(`
      DELETE FROM _scholarly_migration_lock WHERE expires_at < NOW()
    `);
  }

  private async forceRelease(lockId: string): Promise<void> {
    await this.db.execute(`
      DELETE FROM _scholarly_migration_lock WHERE id = $1
    `, [lockId]);
    await this.db.execute(`
      SELECT pg_advisory_unlock_all()
    `);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Section 3: Migration History Tracker
// =============================================================================

export class MigrationHistoryTracker {
  constructor(private readonly db: DatabaseClient) {}

  async ensureHistoryTable(): Promise<Result<void>> {
    try {
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS _scholarly_migration_history (
          id              TEXT PRIMARY KEY,
          name            TEXT NOT NULL,
          phase           TEXT NOT NULL,
          version         TEXT NOT NULL,
          checksum        TEXT NOT NULL,
          status          TEXT NOT NULL DEFAULT 'PENDING',
          applied_at      TIMESTAMPTZ,
          rolled_back_at  TIMESTAMPTZ,
          execution_time_ms INTEGER DEFAULT 0,
          error_message   TEXT,
          sql_statements  INTEGER DEFAULT 0,
          affected_rows   INTEGER DEFAULT 0,
          created_at      TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS _scholarly_migration_lock (
          id          TEXT PRIMARY KEY,
          acquired_by TEXT NOT NULL,
          acquired_at TIMESTAMPTZ NOT NULL,
          expires_at  TIMESTAMPTZ NOT NULL,
          purpose     TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_migration_history_version
          ON _scholarly_migration_history(version);
        CREATE INDEX IF NOT EXISTS idx_migration_history_status
          ON _scholarly_migration_history(status);
      `);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to create migration history table: ${error}`);
    }
  }

  async getAppliedMigrations(): Promise<Result<MigrationRecord[]>> {
    try {
      const result = await this.db.execute(`
        SELECT * FROM _scholarly_migration_history
        WHERE status = 'COMPLETED'
        ORDER BY applied_at ASC
      `);
      return Result.ok(result.rows.map(this.mapRow));
    } catch (error) {
      return Result.fail(`Failed to get applied migrations: ${error}`);
    }
  }

  async getCurrentVersion(): Promise<Result<string | null>> {
    try {
      const result = await this.db.execute(`
        SELECT version FROM _scholarly_migration_history
        WHERE status = 'COMPLETED'
        ORDER BY applied_at DESC
        LIMIT 1
      `);
      return Result.ok(result.rows[0]?.version || null);
    } catch (error) {
      return Result.fail(`Failed to get current version: ${error}`);
    }
  }

  async recordStart(step: MigrationStep): Promise<Result<string>> {
    const id = `mig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      await this.db.execute(`
        INSERT INTO _scholarly_migration_history
          (id, name, phase, version, checksum, status, applied_at, sql_statements)
        VALUES ($1, $2, $3, $4, $5, 'RUNNING', NOW(), $6)
      `, [id, step.name, step.phase, step.version, this.computeChecksum(step.sql), step.sql.split(';').filter(s => s.trim()).length]);
      return Result.ok(id);
    } catch (error) {
      return Result.fail(`Failed to record migration start: ${error}`);
    }
  }

  async recordCompletion(id: string, executionTimeMs: number, affectedRows: number): Promise<Result<void>> {
    try {
      await this.db.execute(`
        UPDATE _scholarly_migration_history
        SET status = 'COMPLETED', execution_time_ms = $2, affected_rows = $3
        WHERE id = $1
      `, [id, executionTimeMs, affectedRows]);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to record migration completion: ${error}`);
    }
  }

  async recordFailure(id: string, errorMessage: string, executionTimeMs: number): Promise<Result<void>> {
    try {
      await this.db.execute(`
        UPDATE _scholarly_migration_history
        SET status = 'FAILED', error_message = $2, execution_time_ms = $3
        WHERE id = $1
      `, [id, errorMessage, executionTimeMs]);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to record migration failure: ${error}`);
    }
  }

  async recordRollback(version: string): Promise<Result<void>> {
    try {
      await this.db.execute(`
        UPDATE _scholarly_migration_history
        SET status = 'ROLLED_BACK', rolled_back_at = NOW()
        WHERE version = $1 AND status = 'COMPLETED'
      `, [version]);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to record rollback: ${error}`);
    }
  }

  private computeChecksum(sql: string): string {
    // Simple hash for migration integrity verification
    let hash = 0;
    for (let i = 0; i < sql.length; i++) {
      const char = sql.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private mapRow(row: Record<string, unknown>): MigrationRecord {
    return {
      id: row.id as string,
      name: row.name as string,
      phase: row.phase as MigrationPhase,
      version: row.version as string,
      checksum: row.checksum as string,
      status: row.status as MigrationStatus,
      appliedAt: row.applied_at ? new Date(row.applied_at as string) : null,
      rolledBackAt: row.rolled_back_at ? new Date(row.rolled_back_at as string) : null,
      executionTimeMs: row.execution_time_ms as number,
      errorMessage: row.error_message as string | null,
      sqlStatements: row.sql_statements as number,
      affectedRows: row.affected_rows as number,
    };
  }
}

// =============================================================================
// Section 4: Schema Migration Definitions
// =============================================================================
// These are the actual SQL migrations that create the Sprint 6 Prisma schema
// models in PostgreSQL. Each migration is idempotent and has a rollback
// counterpart. The order matters: enums first, then tables (respecting foreign
// key dependencies), then indexes, then constraints.
// =============================================================================

export const SPRINT7_MIGRATIONS: MigrationStep[] = [
  // --- Phase 1: Enum Types ---
  {
    name: '001_storybook_enums',
    phase: MigrationPhase.ENUM,
    version: '7.0.1',
    estimatedTimeMs: 500,
    isBreaking: false,
    dependsOn: [],
    sql: `
      DO $$ BEGIN
        CREATE TYPE storybook_status AS ENUM (
          'DRAFT', 'GENERATING', 'VALIDATING', 'IN_REVIEW', 'PILOT',
          'PUBLISHED', 'ARCHIVED', 'REJECTED', 'SUSPENDED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE review_stage AS ENUM (
          'AUTOMATED', 'AI_REVIEW', 'PEER_REVIEW', 'PILOT_TESTING', 'APPROVED', 'REJECTED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE art_style AS ENUM (
          'watercolour', 'flat_vector', 'soft_3d', 'crayon', 'papercraft',
          'pencil_sketch', 'digital_painting', 'collage', 'pixel_art',
          'ink_wash', 'pastel', 'oil_painting', 'charcoal', 'gouache',
          'linocut', 'stained_glass', 'mosaic', 'batik', 'woodcut',
          'stipple', 'crosshatch', 'manga', 'comic_book', 'pop_art',
          'art_nouveau', 'folk_art', 'aboriginal_dot', 'zentangle',
          'isometric', 'low_poly'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE vocabulary_tier AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE comprehension_strand AS ENUM (
          'VOCABULARY', 'INFERENCE', 'PRIOR_KNOWLEDGE', 'GENRE',
          'STRUCTURE', 'PREDICTION', 'SUMMARISATION', 'EVALUATION'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE cultural_context AS ENUM (
          'AUSTRALIAN', 'BRITISH', 'AMERICAN', 'EAST_ASIAN', 'SOUTH_ASIAN',
          'AFRICAN', 'MIDDLE_EASTERN', 'EUROPEAN', 'LATIN_AMERICAN',
          'INDIGENOUS', 'PACIFIC_ISLANDER', 'CARIBBEAN', 'CENTRAL_ASIAN',
          'SOUTHEAST_ASIAN', 'NORDIC', 'UNIVERSAL'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE creator_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE bounty_status AS ENUM (
          'OPEN', 'IN_PROGRESS', 'SUBMISSIONS_CLOSED', 'AWARDED', 'EXPIRED', 'CANCELLED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE download_status AS ENUM (
          'QUEUED', 'DOWNLOADING', 'COMPLETE', 'FAILED', 'EXPIRED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE phonics_phase AS ENUM (
          'PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4', 'PHASE_5', 'PHASE_6'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE narration_mode AS ENUM ('LISTEN', 'READ_ALOUD', 'DUAL');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE illustration_model AS ENUM (
          'GPT_IMAGE_1_5', 'DALL_E_3', 'STABLE_DIFFUSION_3_5',
          'MIDJOURNEY_V6', 'FLUX_PRO'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE page_layout AS ENUM (
          'FULL_BLEED', 'TEXT_BOTTOM', 'TEXT_TOP', 'TEXT_LEFT',
          'TEXT_RIGHT', 'SPLIT_HORIZONTAL', 'VIGNETTE', 'BORDER'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE content_flag AS ENUM (
          'SAFE', 'NEEDS_REVIEW', 'FLAGGED', 'BLOCKED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE generation_stage AS ENUM (
          'NARRATIVE', 'SAFETY_CHECK', 'ILLUSTRATION', 'NARRATION', 'COMPLETE', 'FAILED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE sync_status AS ENUM (
          'SYNCED', 'PENDING_UPLOAD', 'PENDING_DOWNLOAD', 'CONFLICT', 'ERROR'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `,
    rollbackSql: `
      DROP TYPE IF EXISTS sync_status CASCADE;
      DROP TYPE IF EXISTS generation_stage CASCADE;
      DROP TYPE IF EXISTS content_flag CASCADE;
      DROP TYPE IF EXISTS page_layout CASCADE;
      DROP TYPE IF EXISTS illustration_model CASCADE;
      DROP TYPE IF EXISTS narration_mode CASCADE;
      DROP TYPE IF EXISTS phonics_phase CASCADE;
      DROP TYPE IF EXISTS download_status CASCADE;
      DROP TYPE IF EXISTS bounty_status CASCADE;
      DROP TYPE IF EXISTS creator_tier CASCADE;
      DROP TYPE IF EXISTS cultural_context CASCADE;
      DROP TYPE IF EXISTS comprehension_strand CASCADE;
      DROP TYPE IF EXISTS vocabulary_tier CASCADE;
      DROP TYPE IF EXISTS art_style CASCADE;
      DROP TYPE IF EXISTS review_stage CASCADE;
      DROP TYPE IF EXISTS storybook_status CASCADE;
    `,
  },

  // --- Phase 2: Core Tables ---
  {
    name: '002_storybook_series',
    phase: MigrationPhase.SCHEMA,
    version: '7.0.2',
    estimatedTimeMs: 1000,
    isBreaking: false,
    dependsOn: ['001_storybook_enums'],
    sql: `
      CREATE TABLE IF NOT EXISTS storybook_series (
        id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        tenant_id       TEXT NOT NULL,
        name            TEXT NOT NULL,
        description     TEXT,
        theme           TEXT NOT NULL,
        target_phases   phonics_phase[] NOT NULL DEFAULT '{}',
        character_ids   TEXT[] NOT NULL DEFAULT '{}',
        narrative_arc   TEXT,
        total_books     INTEGER DEFAULT 0,
        art_style       art_style DEFAULT 'watercolour',
        cultural_context cultural_context DEFAULT 'UNIVERSAL',
        is_active       BOOLEAN DEFAULT TRUE,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_series_tenant ON storybook_series(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_series_theme ON storybook_series(theme);
    `,
    rollbackSql: `DROP TABLE IF EXISTS storybook_series CASCADE;`,
  },
  {
    name: '003_storybook_characters',
    phase: MigrationPhase.SCHEMA,
    version: '7.0.3',
    estimatedTimeMs: 1000,
    isBreaking: false,
    dependsOn: ['001_storybook_enums'],
    sql: `
      CREATE TABLE IF NOT EXISTS storybook_characters (
        id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        tenant_id         TEXT NOT NULL,
        name              TEXT NOT NULL,
        description       TEXT NOT NULL,
        personality_traits TEXT[] DEFAULT '{}',
        visual_description TEXT NOT NULL,
        style_sheet_url   TEXT,
        reference_image_url TEXT,
        age_range         TEXT,
        series_ids        TEXT[] DEFAULT '{}',
        usage_count       INTEGER DEFAULT 0,
        created_by        TEXT,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_characters_tenant ON storybook_characters(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_characters_name ON storybook_characters(tenant_id, name);
    `,
    rollbackSql: `DROP TABLE IF EXISTS storybook_characters CASCADE;`,
  },
  {
    name: '004_storybooks',
    phase: MigrationPhase.SCHEMA,
    version: '7.0.4',
    estimatedTimeMs: 2000,
    isBreaking: false,
    dependsOn: ['002_storybook_series', '003_storybook_characters'],
    sql: `
      CREATE TABLE IF NOT EXISTS storybooks (
        id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        tenant_id             TEXT NOT NULL,
        title                 TEXT NOT NULL,
        subtitle              TEXT,
        author_id             TEXT,
        author_name           TEXT DEFAULT 'Scholarly AI',
        series_id             TEXT REFERENCES storybook_series(id),
        series_order          INTEGER,
        status                storybook_status DEFAULT 'DRAFT',
        generation_stage      generation_stage DEFAULT 'NARRATIVE',

        -- Narrative content
        synopsis              TEXT,
        moral_theme           TEXT,
        page_count            INTEGER DEFAULT 0,
        word_count            INTEGER DEFAULT 0,
        estimated_read_time_s INTEGER DEFAULT 0,

        -- Phonics metadata (the educational DNA)
        phonics_phase         phonics_phase NOT NULL,
        target_gpcs           TEXT[] NOT NULL DEFAULT '{}',
        taught_gpc_set        TEXT[] NOT NULL DEFAULT '{}',
        decodability_score    DECIMAL(5,2) DEFAULT 0,
        tricky_words          TEXT[] DEFAULT '{}',
        wcpm_band_min         INTEGER DEFAULT 0,
        wcpm_band_max         INTEGER DEFAULT 0,
        vocabulary_tier       vocabulary_tier DEFAULT 'TIER_1',
        morpheme_focus        TEXT[] DEFAULT '{}',
        comprehension_strand  comprehension_strand DEFAULT 'VOCABULARY',

        -- Curriculum alignment
        eylf_outcomes         TEXT[] DEFAULT '{}',
        eyfs_goals            TEXT[] DEFAULT '{}',
        ib_pyp_themes         TEXT[] DEFAULT '{}',

        -- Presentation
        art_style             art_style DEFAULT 'watercolour',
        cultural_context      cultural_context DEFAULT 'UNIVERSAL',
        age_min               INTEGER DEFAULT 3,
        age_max               INTEGER DEFAULT 9,
        cover_image_url       TEXT,
        thumbnail_url         TEXT,

        -- Generation tracking
        generation_cost_usd   DECIMAL(8,4) DEFAULT 0,
        narrative_model       TEXT,
        illustration_model    illustration_model,
        narration_voice_id    TEXT,
        generation_duration_ms INTEGER DEFAULT 0,

        -- Community & licensing
        is_community          BOOLEAN DEFAULT FALSE,
        is_open_source        BOOLEAN DEFAULT FALSE,
        license               TEXT DEFAULT 'proprietary',
        review_score          DECIMAL(3,2),
        content_flag          content_flag DEFAULT 'SAFE',

        -- Timestamps
        published_at          TIMESTAMPTZ,
        archived_at           TIMESTAMPTZ,
        created_at            TIMESTAMPTZ DEFAULT NOW(),
        updated_at            TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_storybooks_tenant ON storybooks(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_storybooks_phase ON storybooks(tenant_id, phonics_phase);
      CREATE INDEX IF NOT EXISTS idx_storybooks_status ON storybooks(tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_storybooks_series ON storybooks(series_id);
      CREATE INDEX IF NOT EXISTS idx_storybooks_decodability ON storybooks(decodability_score);
      CREATE INDEX IF NOT EXISTS idx_storybooks_published ON storybooks(tenant_id, status, published_at)
        WHERE status = 'PUBLISHED';
      CREATE INDEX IF NOT EXISTS idx_storybooks_community ON storybooks(is_community, review_score)
        WHERE is_community = TRUE AND status = 'PUBLISHED';
    `,
    rollbackSql: `DROP TABLE IF EXISTS storybooks CASCADE;`,
  },
  {
    name: '005_storybook_pages',
    phase: MigrationPhase.SCHEMA,
    version: '7.0.5',
    estimatedTimeMs: 1500,
    isBreaking: false,
    dependsOn: ['004_storybooks'],
    sql: `
      CREATE TABLE IF NOT EXISTS storybook_pages (
        id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        storybook_id      TEXT NOT NULL REFERENCES storybooks(id) ON DELETE CASCADE,
        page_number       INTEGER NOT NULL,
        text_content      TEXT NOT NULL,
        illustration_url  TEXT,
        audio_url         TEXT,
        layout            page_layout DEFAULT 'TEXT_BOTTOM',

        -- Word-level data for karaoke highlighting & ASR
        word_timestamps   JSONB DEFAULT '[]',
        word_gpcs         JSONB DEFAULT '[]',
        decodable_words   TEXT[] DEFAULT '{}',
        tricky_words      TEXT[] DEFAULT '{}',

        -- Scene decomposition for parallax
        background_url    TEXT,
        foreground_url    TEXT,
        character_positions JSONB DEFAULT '[]',

        -- Generation metadata
        illustration_prompt TEXT,
        illustration_seed  TEXT,
        illustration_cost  DECIMAL(8,4) DEFAULT 0,
        narration_cost     DECIMAL(8,4) DEFAULT 0,
        content_flag       content_flag DEFAULT 'SAFE',

        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(storybook_id, page_number)
      );

      CREATE INDEX IF NOT EXISTS idx_pages_storybook ON storybook_pages(storybook_id, page_number);
    `,
    rollbackSql: `DROP TABLE IF EXISTS storybook_pages CASCADE;`,
  },
  {
    name: '006_storybook_illustrations',
    phase: MigrationPhase.SCHEMA,
    version: '7.0.6',
    estimatedTimeMs: 1000,
    isBreaking: false,
    dependsOn: ['005_storybook_pages'],
    sql: `
      CREATE TABLE IF NOT EXISTS storybook_illustrations (
        id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        page_id         TEXT NOT NULL REFERENCES storybook_pages(id) ON DELETE CASCADE,
        storybook_id    TEXT NOT NULL REFERENCES storybooks(id) ON DELETE CASCADE,
        prompt          TEXT NOT NULL,
        negative_prompt TEXT,
        model           illustration_model NOT NULL,
        art_style       art_style NOT NULL,
        seed            TEXT,
        width           INTEGER DEFAULT 1024,
        height          INTEGER DEFAULT 1024,
        image_url       TEXT NOT NULL,
        cost_usd        DECIMAL(8,4) DEFAULT 0,
        generation_ms   INTEGER DEFAULT 0,
        moderation_pass BOOLEAN DEFAULT TRUE,
        moderation_flags TEXT[] DEFAULT '{}',
        retry_count     INTEGER DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_illustrations_page ON storybook_illustrations(page_id);
      CREATE INDEX IF NOT EXISTS idx_illustrations_book ON storybook_illustrations(storybook_id);
    `,
    rollbackSql: `DROP TABLE IF EXISTS storybook_illustrations CASCADE;`,
  },
  {
    name: '007_storybook_reviews',
    phase: MigrationPhase.SCHEMA,
    version: '7.0.7',
    estimatedTimeMs: 1000,
    isBreaking: false,
    dependsOn: ['004_storybooks'],
    sql: `
      CREATE TABLE IF NOT EXISTS storybook_reviews (
        id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        storybook_id      TEXT NOT NULL REFERENCES storybooks(id) ON DELETE CASCADE,
        reviewer_id       TEXT NOT NULL,
        reviewer_type     TEXT NOT NULL DEFAULT 'educator',
        stage             review_stage NOT NULL,

        -- Scoring (each 0-100)
        overall_score     DECIMAL(5,2) NOT NULL,
        pedagogical_score DECIMAL(5,2),
        narrative_score   DECIMAL(5,2),
        illustration_score DECIMAL(5,2),
        safety_score      DECIMAL(5,2),
        curriculum_alignment_score DECIMAL(5,2),

        -- Qualitative
        comments          TEXT,
        strengths         TEXT[] DEFAULT '{}',
        improvements      TEXT[] DEFAULT '{}',
        recommendation    TEXT,

        -- AI review specifics
        ai_confidence     DECIMAL(3,2),
        ai_flags          TEXT[] DEFAULT '{}',

        -- Status
        is_approved       BOOLEAN DEFAULT FALSE,
        reviewed_at       TIMESTAMPTZ DEFAULT NOW(),
        created_at        TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_reviews_storybook ON storybook_reviews(storybook_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_stage ON storybook_reviews(storybook_id, stage);
      CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON storybook_reviews(reviewer_id);
    `,
    rollbackSql: `DROP TABLE IF EXISTS storybook_reviews CASCADE;`,
  },
  {
    name: '008_storybook_analytics',
    phase: MigrationPhase.SCHEMA,
    version: '7.0.8',
    estimatedTimeMs: 1000,
    isBreaking: false,
    dependsOn: ['004_storybooks'],
    sql: `
      CREATE TABLE IF NOT EXISTS storybook_analytics (
        id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        storybook_id      TEXT NOT NULL REFERENCES storybooks(id) ON DELETE CASCADE,
        tenant_id         TEXT NOT NULL,

        -- Engagement metrics (running averages for O(1) updates)
        read_count        INTEGER DEFAULT 0,
        unique_readers    INTEGER DEFAULT 0,
        completion_count  INTEGER DEFAULT 0,
        completion_rate   DECIMAL(5,4) DEFAULT 0,
        avg_accuracy      DECIMAL(5,4) DEFAULT 0,
        avg_wcpm          DECIMAL(7,2) DEFAULT 0,
        avg_time_seconds  DECIMAL(8,2) DEFAULT 0,
        reread_count      INTEGER DEFAULT 0,
        reread_rate       DECIMAL(5,4) DEFAULT 0,

        -- Quality composite (Sprint 6 formula)
        quality_score     DECIMAL(5,4) DEFAULT 0,
        retention_rate    DECIMAL(5,4) DEFAULT 0,
        popularity_score  DECIMAL(8,4) DEFAULT 0,

        -- Time-series buckets
        reads_today       INTEGER DEFAULT 0,
        reads_this_week   INTEGER DEFAULT 0,
        reads_this_month  INTEGER DEFAULT 0,
        last_read_at      TIMESTAMPTZ,

        updated_at        TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(storybook_id)
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_tenant ON storybook_analytics(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_quality ON storybook_analytics(quality_score DESC);
      CREATE INDEX IF NOT EXISTS idx_analytics_popularity ON storybook_analytics(popularity_score DESC);
    `,
    rollbackSql: `DROP TABLE IF EXISTS storybook_analytics CASCADE;`,
  },
  {
    name: '009_creator_profiles',
    phase: MigrationPhase.SCHEMA,
    version: '7.0.9',
    estimatedTimeMs: 1000,
    isBreaking: false,
    dependsOn: ['001_storybook_enums'],
    sql: `
      CREATE TABLE IF NOT EXISTS creator_profiles (
        id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id             TEXT NOT NULL UNIQUE,
        tenant_id           TEXT NOT NULL,
        display_name        TEXT NOT NULL,
        bio                 TEXT,
        avatar_url          TEXT,
        tier                creator_tier DEFAULT 'BRONZE',

        -- Stats
        published_count     INTEGER DEFAULT 0,
        total_reads         INTEGER DEFAULT 0,
        avg_review_score    DECIMAL(5,2) DEFAULT 0,
        avg_engagement      DECIMAL(5,4) DEFAULT 0,
        total_earnings_usd  DECIMAL(10,2) DEFAULT 0,
        pending_payout_usd  DECIMAL(10,2) DEFAULT 0,

        -- Verification
        is_educator_verified BOOLEAN DEFAULT FALSE,
        educator_credentials TEXT[] DEFAULT '{}',
        verification_date   TIMESTAMPTZ,

        -- Rate limits (tier-dependent)
        rate_limit_rpm      INTEGER DEFAULT 30,
        api_key_hash        TEXT,

        -- Activity
        last_active_at      TIMESTAMPTZ DEFAULT NOW(),
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_creator_tenant ON creator_profiles(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_creator_tier ON creator_profiles(tier);
      CREATE INDEX IF NOT EXISTS idx_creator_leaderboard ON creator_profiles(total_reads DESC, avg_review_score DESC);
    `,
    rollbackSql: `DROP TABLE IF EXISTS creator_profiles CASCADE;`,
  },
  {
    name: '010_content_bounties',
    phase: MigrationPhase.SCHEMA,
    version: '7.0.10',
    estimatedTimeMs: 1000,
    isBreaking: false,
    dependsOn: ['009_creator_profiles'],
    sql: `
      CREATE TABLE IF NOT EXISTS content_bounties (
        id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        tenant_id         TEXT NOT NULL,
        title             TEXT NOT NULL,
        description       TEXT NOT NULL,
        requirements      JSONB NOT NULL DEFAULT '{}',

        -- Targeting
        target_phase      phonics_phase,
        target_gpcs       TEXT[] DEFAULT '{}',
        target_age_min    INTEGER,
        target_age_max    INTEGER,
        target_theme      TEXT,
        target_cultural_context cultural_context,

        -- Reward
        reward_usd        DECIMAL(8,2) NOT NULL,
        reward_source     TEXT DEFAULT 'dao_treasury',

        -- Status
        status            bounty_status DEFAULT 'OPEN',
        submission_count  INTEGER DEFAULT 0,
        max_submissions   INTEGER DEFAULT 20,
        winner_id         TEXT REFERENCES creator_profiles(id),
        winning_book_id   TEXT,

        -- Timeline
        deadline          TIMESTAMPTZ NOT NULL,
        awarded_at        TIMESTAMPTZ,
        created_by        TEXT NOT NULL,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_bounties_tenant ON content_bounties(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_bounties_status ON content_bounties(status);
      CREATE INDEX IF NOT EXISTS idx_bounties_deadline ON content_bounties(deadline)
        WHERE status IN ('OPEN', 'IN_PROGRESS');
    `,
    rollbackSql: `DROP TABLE IF EXISTS content_bounties CASCADE;`,
  },
  {
    name: '011_device_storybooks',
    phase: MigrationPhase.SCHEMA,
    version: '7.0.11',
    estimatedTimeMs: 1000,
    isBreaking: false,
    dependsOn: ['004_storybooks'],
    sql: `
      CREATE TABLE IF NOT EXISTS device_storybooks (
        id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        device_id         TEXT NOT NULL,
        storybook_id      TEXT NOT NULL REFERENCES storybooks(id) ON DELETE CASCADE,
        user_id           TEXT NOT NULL,

        -- Download state
        download_status   download_status DEFAULT 'QUEUED',
        storage_size_bytes BIGINT DEFAULT 0,
        downloaded_at     TIMESTAMPTZ,

        -- Reading position (cross-device sync)
        current_page      INTEGER DEFAULT 0,
        current_word      INTEGER DEFAULT 0,
        reading_mode      narration_mode DEFAULT 'LISTEN',
        total_time_seconds INTEGER DEFAULT 0,

        -- Offline BKT deltas (pending sync)
        pending_bkt_deltas JSONB DEFAULT '[]',
        sync_status       sync_status DEFAULT 'SYNCED',
        last_synced_at    TIMESTAMPTZ,
        sync_version      INTEGER DEFAULT 0,

        -- Housekeeping
        last_accessed_at  TIMESTAMPTZ DEFAULT NOW(),
        expires_at        TIMESTAMPTZ,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(device_id, storybook_id)
      );

      CREATE INDEX IF NOT EXISTS idx_device_books_device ON device_storybooks(device_id);
      CREATE INDEX IF NOT EXISTS idx_device_books_user ON device_storybooks(user_id);
      CREATE INDEX IF NOT EXISTS idx_device_books_sync ON device_storybooks(sync_status)
        WHERE sync_status != 'SYNCED';
      CREATE INDEX IF NOT EXISTS idx_device_books_expiry ON device_storybooks(expires_at)
        WHERE expires_at IS NOT NULL;
    `,
    rollbackSql: `DROP TABLE IF EXISTS device_storybooks CASCADE;`,
  },

  // --- Phase 3: Seed Data ---
  {
    name: '012_seed_phonics_reference',
    phase: MigrationPhase.SEED,
    version: '7.0.12',
    estimatedTimeMs: 3000,
    isBreaking: false,
    dependsOn: ['004_storybooks'],
    sql: `
      -- Letters and Sounds GPC reference data
      -- This seeds the phonics progression that drives storybook generation
      CREATE TABLE IF NOT EXISTS phonics_gpc_reference (
        id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        phase     phonics_phase NOT NULL,
        grapheme  TEXT NOT NULL,
        phoneme   TEXT NOT NULL,
        position  TEXT DEFAULT 'any',
        frequency INTEGER DEFAULT 0,
        example_words TEXT[] DEFAULT '{}',
        introduced_order INTEGER NOT NULL,
        UNIQUE(phase, grapheme, phoneme)
      );

      -- Phase 2 GPCs (single letter correspondences)
      INSERT INTO phonics_gpc_reference (phase, grapheme, phoneme, introduced_order, example_words) VALUES
        ('PHASE_2', 's', '/s/', 1, ARRAY['sat', 'sit', 'sun']),
        ('PHASE_2', 'a', '/æ/', 2, ARRAY['ant', 'at', 'am']),
        ('PHASE_2', 't', '/t/', 3, ARRAY['tap', 'tin', 'top']),
        ('PHASE_2', 'p', '/p/', 4, ARRAY['pat', 'pin', 'pop']),
        ('PHASE_2', 'i', '/ɪ/', 5, ARRAY['it', 'in', 'if']),
        ('PHASE_2', 'n', '/n/', 6, ARRAY['nap', 'net', 'nip']),
        ('PHASE_2', 'm', '/m/', 7, ARRAY['mat', 'map', 'mop']),
        ('PHASE_2', 'd', '/d/', 8, ARRAY['dad', 'dip', 'dog']),
        ('PHASE_2', 'g', '/ɡ/', 9, ARRAY['gap', 'got', 'gum']),
        ('PHASE_2', 'o', '/ɒ/', 10, ARRAY['on', 'off', 'odd']),
        ('PHASE_2', 'c', '/k/', 11, ARRAY['cat', 'cap', 'cup']),
        ('PHASE_2', 'k', '/k/', 12, ARRAY['kit', 'kid', 'king']),
        ('PHASE_2', 'ck', '/k/', 13, ARRAY['duck', 'kick', 'sock']),
        ('PHASE_2', 'e', '/ɛ/', 14, ARRAY['egg', 'end', 'elm']),
        ('PHASE_2', 'u', '/ʌ/', 15, ARRAY['up', 'us', 'under']),
        ('PHASE_2', 'r', '/r/', 16, ARRAY['rat', 'run', 'red']),
        ('PHASE_2', 'h', '/h/', 17, ARRAY['hat', 'him', 'hot']),
        ('PHASE_2', 'b', '/b/', 18, ARRAY['bat', 'big', 'bun']),
        ('PHASE_2', 'f', '/f/', 19, ARRAY['fan', 'fit', 'fog'])
      ON CONFLICT (phase, grapheme, phoneme) DO NOTHING;

      -- Phase 3 GPCs (digraphs and remaining single letters)
      INSERT INTO phonics_gpc_reference (phase, grapheme, phoneme, introduced_order, example_words) VALUES
        ('PHASE_3', 'j', '/dʒ/', 20, ARRAY['jam', 'jet', 'jug']),
        ('PHASE_3', 'v', '/v/', 21, ARRAY['van', 'vet', 'vim']),
        ('PHASE_3', 'w', '/w/', 22, ARRAY['wag', 'web', 'win']),
        ('PHASE_3', 'x', '/ks/', 23, ARRAY['box', 'fox', 'mix']),
        ('PHASE_3', 'y', '/j/', 24, ARRAY['yam', 'yes', 'yet']),
        ('PHASE_3', 'z', '/z/', 25, ARRAY['zip', 'zoo', 'zap']),
        ('PHASE_3', 'zz', '/z/', 26, ARRAY['buzz', 'fizz', 'jazz']),
        ('PHASE_3', 'qu', '/kw/', 27, ARRAY['quit', 'quiz', 'queen']),
        ('PHASE_3', 'ch', '/tʃ/', 28, ARRAY['chip', 'chop', 'much']),
        ('PHASE_3', 'sh', '/ʃ/', 29, ARRAY['ship', 'shop', 'shell']),
        ('PHASE_3', 'th', '/θ/', 30, ARRAY['thin', 'thick', 'math']),
        ('PHASE_3', 'th', '/ð/', 31, ARRAY['this', 'that', 'then']),
        ('PHASE_3', 'ng', '/ŋ/', 32, ARRAY['ring', 'sing', 'king']),
        ('PHASE_3', 'ai', '/eɪ/', 33, ARRAY['rain', 'tail', 'wait']),
        ('PHASE_3', 'ee', '/iː/', 34, ARRAY['see', 'tree', 'green']),
        ('PHASE_3', 'igh', '/aɪ/', 35, ARRAY['high', 'night', 'light']),
        ('PHASE_3', 'oa', '/əʊ/', 36, ARRAY['boat', 'coat', 'road']),
        ('PHASE_3', 'oo', '/uː/', 37, ARRAY['moon', 'food', 'zoo']),
        ('PHASE_3', 'oo', '/ʊ/', 38, ARRAY['book', 'look', 'cook']),
        ('PHASE_3', 'ar', '/ɑː/', 39, ARRAY['car', 'star', 'park']),
        ('PHASE_3', 'or', '/ɔː/', 40, ARRAY['for', 'born', 'corn']),
        ('PHASE_3', 'ur', '/ɜː/', 41, ARRAY['fur', 'burn', 'turn']),
        ('PHASE_3', 'ow', '/aʊ/', 42, ARRAY['cow', 'now', 'down']),
        ('PHASE_3', 'oi', '/ɔɪ/', 43, ARRAY['oil', 'coin', 'join']),
        ('PHASE_3', 'ear', '/ɪər/', 44, ARRAY['ear', 'near', 'dear']),
        ('PHASE_3', 'air', '/eər/', 45, ARRAY['fair', 'hair', 'pair']),
        ('PHASE_3', 'ure', '/ʊər/', 46, ARRAY['sure', 'pure', 'cure']),
        ('PHASE_3', 'er', '/ər/', 47, ARRAY['letter', 'dinner', 'better'])
      ON CONFLICT (phase, grapheme, phoneme) DO NOTHING;

      -- Phase 5 GPCs (alternative spellings)
      INSERT INTO phonics_gpc_reference (phase, grapheme, phoneme, introduced_order, example_words) VALUES
        ('PHASE_5', 'ay', '/eɪ/', 48, ARRAY['day', 'play', 'say']),
        ('PHASE_5', 'ou', '/aʊ/', 49, ARRAY['out', 'shout', 'cloud']),
        ('PHASE_5', 'ie', '/aɪ/', 50, ARRAY['tie', 'pie', 'lie']),
        ('PHASE_5', 'ea', '/iː/', 51, ARRAY['sea', 'read', 'bead']),
        ('PHASE_5', 'oy', '/ɔɪ/', 52, ARRAY['boy', 'toy', 'joy']),
        ('PHASE_5', 'ir', '/ɜː/', 53, ARRAY['girl', 'bird', 'sir']),
        ('PHASE_5', 'ue', '/uː/', 54, ARRAY['blue', 'true', 'clue']),
        ('PHASE_5', 'aw', '/ɔː/', 55, ARRAY['saw', 'draw', 'paw']),
        ('PHASE_5', 'wh', '/w/', 56, ARRAY['when', 'what', 'where']),
        ('PHASE_5', 'ph', '/f/', 57, ARRAY['phone', 'photo', 'graph']),
        ('PHASE_5', 'ew', '/uː/', 58, ARRAY['new', 'grew', 'flew']),
        ('PHASE_5', 'oe', '/əʊ/', 59, ARRAY['toe', 'doe', 'goes']),
        ('PHASE_5', 'au', '/ɔː/', 60, ARRAY['haul', 'launch', 'sauce']),
        ('PHASE_5', 'ey', '/iː/', 61, ARRAY['key', 'money', 'donkey']),
        ('PHASE_5', 'a_e', '/eɪ/', 62, ARRAY['make', 'cake', 'name']),
        ('PHASE_5', 'i_e', '/aɪ/', 63, ARRAY['time', 'like', 'mine']),
        ('PHASE_5', 'o_e', '/əʊ/', 64, ARRAY['home', 'bone', 'stone']),
        ('PHASE_5', 'u_e', '/uː/', 65, ARRAY['rule', 'tube', 'flute'])
      ON CONFLICT (phase, grapheme, phoneme) DO NOTHING;
    `,
    rollbackSql: `DROP TABLE IF EXISTS phonics_gpc_reference CASCADE;`,
  },
];

// =============================================================================
// Section 5: Migration Runner
// =============================================================================
// The conductor of the migration orchestra. It reads the plan, acquires the
// lock, executes each step in order within a transaction, records the results,
// and releases the lock — or rolls back if anything goes wrong. Like a careful
// surgeon: prep, cut, stitch, check, close.
// =============================================================================

export class MigrationRunner {
  private readonly lockManager: MigrationLockManager;
  private readonly history: MigrationHistoryTracker;

  constructor(
    private readonly db: DatabaseClient,
    private readonly config: MigrationConfig
  ) {
    this.lockManager = new MigrationLockManager(db, {
      instanceId: `migration_${process.pid}_${Date.now()}`,
      lockTimeoutMs: config.lockTimeoutMs,
    });
    this.history = new MigrationHistoryTracker(db);
  }

  async plan(): Promise<Result<MigrationPlan>> {
    const historyResult = await this.history.ensureHistoryTable();
    if (!historyResult.success) return Result.fail(historyResult.error!);

    const appliedResult = await this.history.getAppliedMigrations();
    if (!appliedResult.success) return Result.fail(appliedResult.error!);

    const applied = new Set(appliedResult.value!.map(m => m.name));
    const currentResult = await this.history.getCurrentVersion();
    const currentVersion = currentResult.success ? currentResult.value! : null;

    const pending = SPRINT7_MIGRATIONS.filter(m => !applied.has(m.name));

    if (this.config.targetVersion) {
      const targetIdx = pending.findIndex(m => m.version === this.config.targetVersion);
      if (targetIdx >= 0) {
        pending.splice(targetIdx + 1);
      }
    }

    const breakingChanges: BreakingChange[] = pending
      .filter(m => m.isBreaking)
      .map(m => ({
        migration: m.name,
        description: `Migration ${m.name} contains breaking changes`,
        impact: 'May require application downtime',
        mitigationSteps: ['Deploy new application code first', 'Run migration during maintenance window'],
      }));

    return Result.ok({
      pending,
      currentVersion,
      targetVersion: pending.length > 0 ? pending[pending.length - 1].version : (currentVersion || '0.0.0'),
      estimatedTimeMs: pending.reduce((sum, m) => sum + m.estimatedTimeMs, 0),
      requiresDowntime: breakingChanges.length > 0,
      breakingChanges,
    });
  }

  async execute(): Promise<Result<MigrationReport>> {
    const report: MigrationReport = {
      startedAt: new Date(),
      completedAt: null,
      migrationsRun: 0,
      migrationsSkipped: 0,
      migrationsFailed: 0,
      totalTimeMs: 0,
      results: [],
    };

    // Step 1: Ensure history table exists
    const historyResult = await this.history.ensureHistoryTable();
    if (!historyResult.success) return Result.fail(historyResult.error!);

    // Step 2: Acquire lock
    const lockResult = await this.lockManager.acquireLock('Sprint 7 migration');
    if (!lockResult.success) return Result.fail(`Cannot acquire migration lock: ${lockResult.error}`);

    try {
      // Step 3: Build plan
      const planResult = await this.plan();
      if (!planResult.success) return Result.fail(planResult.error!);

      const plan = planResult.value!;

      if (plan.pending.length === 0) {
        report.completedAt = new Date();
        return Result.ok(report);
      }

      // Step 4: Execute each migration
      for (const step of plan.pending) {
        const stepResult = await this.executeStep(step);
        report.results.push(stepResult);

        if (stepResult.status === MigrationStatus.COMPLETED) {
          report.migrationsRun++;
        } else if (stepResult.status === MigrationStatus.SKIPPED) {
          report.migrationsSkipped++;
        } else {
          report.migrationsFailed++;

          // Stop on first failure — don't continue with dependent migrations
          if (!this.config.dryRun) {
            break;
          }
        }
      }

      report.completedAt = new Date();
      report.totalTimeMs = report.completedAt.getTime() - report.startedAt.getTime();

      return Result.ok(report);
    } finally {
      await this.lockManager.releaseLock();
    }
  }

  async rollback(targetVersion: string): Promise<Result<MigrationReport>> {
    const report: MigrationReport = {
      startedAt: new Date(),
      completedAt: null,
      migrationsRun: 0,
      migrationsSkipped: 0,
      migrationsFailed: 0,
      totalTimeMs: 0,
      results: [],
    };

    const lockResult = await this.lockManager.acquireLock(`Rollback to ${targetVersion}`);
    if (!lockResult.success) return Result.fail(`Cannot acquire lock for rollback: ${lockResult.error}`);

    try {
      const appliedResult = await this.history.getAppliedMigrations();
      if (!appliedResult.success) return Result.fail(appliedResult.error!);

      const applied = appliedResult.value!;
      const targetIdx = applied.findIndex(m => m.version === targetVersion);

      // Roll back in reverse order, from most recent to target
      const toRollback = applied.slice(targetIdx + 1).reverse();

      for (const migration of toRollback) {
        const step = SPRINT7_MIGRATIONS.find(m => m.name === migration.name);
        if (!step) {
          report.results.push({
            name: migration.name,
            version: migration.version,
            status: MigrationStatus.FAILED,
            executionTimeMs: 0,
            error: `No rollback SQL found for migration ${migration.name}`,
          });
          report.migrationsFailed++;
          break;
        }

        const startTime = Date.now();
        try {
          if (!this.config.dryRun) {
            await this.db.execute(step.rollbackSql);
          }
          await this.history.recordRollback(migration.version);
          const elapsed = Date.now() - startTime;

          report.results.push({
            name: migration.name,
            version: migration.version,
            status: MigrationStatus.ROLLED_BACK,
            executionTimeMs: elapsed,
          });
          report.migrationsRun++;
        } catch (error) {
          report.results.push({
            name: migration.name,
            version: migration.version,
            status: MigrationStatus.FAILED,
            executionTimeMs: Date.now() - startTime,
            error: String(error),
          });
          report.migrationsFailed++;
          break;
        }
      }

      report.completedAt = new Date();
      report.totalTimeMs = report.completedAt.getTime() - report.startedAt.getTime();
      return Result.ok(report);
    } finally {
      await this.lockManager.releaseLock();
    }
  }

  private async executeStep(step: MigrationStep): Promise<MigrationStepResult> {
    const startTime = Date.now();

    // Check dependencies
    const appliedResult = await this.history.getAppliedMigrations();
    if (appliedResult.success) {
      const appliedNames = new Set(appliedResult.value!.map(m => m.name));
      for (const dep of step.dependsOn) {
        if (!appliedNames.has(dep)) {
          return {
            name: step.name,
            version: step.version,
            status: MigrationStatus.SKIPPED,
            executionTimeMs: 0,
            error: `Dependency ${dep} not yet applied`,
          };
        }
      }
    }

    // Record start
    const recordResult = await this.history.recordStart(step);
    if (!recordResult.success) {
      return {
        name: step.name,
        version: step.version,
        status: MigrationStatus.FAILED,
        executionTimeMs: 0,
        error: recordResult.error!,
      };
    }
    const recordId = recordResult.value!;

    try {
      if (this.config.dryRun) {
        const elapsed = Date.now() - startTime;
        await this.history.recordCompletion(recordId, elapsed, 0);
        return {
          name: step.name,
          version: step.version,
          status: MigrationStatus.COMPLETED,
          executionTimeMs: elapsed,
          dryRun: true,
        };
      }

      // Execute within a transaction for atomicity
      await this.db.execute('BEGIN');
      await this.db.execute(`SET LOCAL statement_timeout = '${this.config.statementTimeoutMs}ms'`);

      const result = await this.db.execute(step.sql);
      const affectedRows = result.rowCount || 0;

      await this.db.execute('COMMIT');

      const elapsed = Date.now() - startTime;
      await this.history.recordCompletion(recordId, elapsed, affectedRows);

      return {
        name: step.name,
        version: step.version,
        status: MigrationStatus.COMPLETED,
        executionTimeMs: elapsed,
        affectedRows,
      };
    } catch (error) {
      await this.db.execute('ROLLBACK').catch((err) => { console.error('Rollback failed:', err?.message || err); });
      const elapsed = Date.now() - startTime;
      await this.history.recordFailure(recordId, String(error), elapsed);

      return {
        name: step.name,
        version: step.version,
        status: MigrationStatus.FAILED,
        executionTimeMs: elapsed,
        error: String(error),
      };
    }
  }
}

// =============================================================================
// Section 6: Tenant Seeder
// =============================================================================
// Each tenant gets their own slice of reference data configured to their
// preferences — think of it as furnishing each apartment in a building
// differently while sharing the same structural foundations.
// =============================================================================

export class TenantSeeder {
  constructor(private readonly db: DatabaseClient) {}

  async seedTenant(config: SeedDataConfig): Promise<Result<TenantSeedReport>> {
    const report: TenantSeedReport = {
      tenantId: config.tenantId,
      tablesSeeded: 0,
      rowsInserted: 0,
      errors: [],
      duration: 0,
    };
    const startTime = Date.now();

    try {
      // 1. Seed default series for the tenant
      const seriesResult = await this.seedDefaultSeries(config);
      if (seriesResult.success) {
        report.tablesSeeded++;
        report.rowsInserted += seriesResult.value!;
      } else {
        report.errors.push(`Series seeding failed: ${seriesResult.error}`);
      }

      // 2. Seed default characters
      const charResult = await this.seedDefaultCharacters(config);
      if (charResult.success) {
        report.tablesSeeded++;
        report.rowsInserted += charResult.value!;
      } else {
        report.errors.push(`Character seeding failed: ${charResult.error}`);
      }

      // 3. Seed arena defaults if requested
      if (config.includeArenaConfig) {
        const arenaResult = await this.seedArenaDefaults(config);
        if (arenaResult.success) {
          report.tablesSeeded++;
          report.rowsInserted += arenaResult.value!;
        } else {
          report.errors.push(`Arena seeding failed: ${arenaResult.error}`);
        }
      }

      // 4. Seed sample users if requested
      if (config.includeSampleUsers) {
        const userResult = await this.seedSampleUsers(config);
        if (userResult.success) {
          report.tablesSeeded++;
          report.rowsInserted += userResult.value!;
        } else {
          report.errors.push(`User seeding failed: ${userResult.error}`);
        }
      }

      report.duration = Date.now() - startTime;
      return Result.ok(report);
    } catch (error) {
      report.duration = Date.now() - startTime;
      report.errors.push(String(error));
      return Result.ok(report); // Return partial report even on failure
    }
  }

  private async seedDefaultSeries(config: SeedDataConfig): Promise<Result<number>> {
    const series = [
      {
        name: 'Finn the Fox Adventures',
        description: 'Follow Finn as he explores the forest and learns about the world around him. Each book targets a specific phonics phase, building on previously learned GPCs.',
        theme: 'nature_exploration',
        target_phases: ['PHASE_2', 'PHASE_3'],
        art_style: 'watercolour',
        cultural_context: config.locale === 'en-AU' ? 'AUSTRALIAN' : config.locale === 'en-GB' ? 'BRITISH' : 'UNIVERSAL',
      },
      {
        name: 'Star School',
        description: 'A group of friends navigate life at a magical school among the stars. Stories progress from simple CVC words through complex digraphs and trigraphs.',
        theme: 'space_school',
        target_phases: ['PHASE_3', 'PHASE_4', 'PHASE_5'],
        art_style: 'soft_3d',
        cultural_context: 'UNIVERSAL',
      },
      {
        name: 'Tiny Tales',
        description: 'Very short stories (4-8 pages) designed for the youngest readers just beginning their phonics journey. Simple sentences, familiar settings, gentle narratives.',
        theme: 'everyday_life',
        target_phases: ['PHASE_2'],
        art_style: 'crayon',
        cultural_context: 'UNIVERSAL',
      },
      {
        name: 'Ocean Explorers',
        description: 'Dive deep with marine biologists exploring coral reefs, deep trenches, and coastal ecosystems. Non-fiction storybooks linking phonics practice with science learning.',
        theme: 'marine_science',
        target_phases: ['PHASE_4', 'PHASE_5'],
        art_style: 'digital_painting',
        cultural_context: 'AUSTRALIAN',
      },
      {
        name: 'The Rhythm Crew',
        description: 'Stories told through music and rhythm. Each book features repetitive patterns, rhyme, and alliteration that reinforce phonemic awareness alongside GPC knowledge.',
        theme: 'music_rhythm',
        target_phases: ['PHASE_2', 'PHASE_3'],
        art_style: 'flat_vector',
        cultural_context: 'UNIVERSAL',
      },
    ];

    let inserted = 0;
    for (const s of series) {
      try {
        await this.db.execute(`
          INSERT INTO storybook_series (tenant_id, name, description, theme, target_phases, art_style, cultural_context)
          VALUES ($1, $2, $3, $4, $5::phonics_phase[], $6::art_style, $7::cultural_context)
          ON CONFLICT DO NOTHING
        `, [config.tenantId, s.name, s.description, s.theme,
            `{${s.target_phases.join(',')}}`, s.art_style, s.cultural_context]);
        inserted++;
      } catch (error) {
        // Continue with remaining series
      }
    }
    return Result.ok(inserted);
  }

  private async seedDefaultCharacters(config: SeedDataConfig): Promise<Result<number>> {
    const characters = [
      {
        name: 'Finn',
        description: 'A curious young fox with bright orange fur, big green eyes, and a slightly too-long bushy tail that he sometimes trips over. Always wearing a tiny blue scarf.',
        personality_traits: ['curious', 'brave', 'clumsy', 'kind'],
        visual_description: 'Young red fox, fluffy orange fur, large bright green eyes, bushy tail, small blue scarf around neck, standing upright, expressive face, children\'s book character style',
        age_range: '3-7',
      },
      {
        name: 'Luna',
        description: 'A wise owl who runs the Star School library. She has silver-blue feathers, round golden spectacles, and always carries a book under one wing. Her voice is calm and reassuring.',
        personality_traits: ['wise', 'patient', 'encouraging', 'bookish'],
        visual_description: 'Elegant owl with silver-blue feathers, round golden spectacles, holding a book, warm expression, slightly academic pose, children\'s book character style',
        age_range: '4-9',
      },
      {
        name: 'Splash',
        description: 'An enthusiastic bottlenose dolphin who loves showing visitors around the reef. Wears a tiny underwater camera around her neck and has a distinctive star-shaped marking on her side.',
        personality_traits: ['enthusiastic', 'playful', 'knowledgeable', 'adventurous'],
        visual_description: 'Friendly bottlenose dolphin, grey-blue skin, star-shaped lighter marking on side, small camera on lanyard, jumping pose, children\'s book character style',
        age_range: '5-9',
      },
      {
        name: 'Dot',
        description: 'A tiny ladybird who sees the world in the smallest details. Has exactly seven spots and wears a miniature leaf backpack. Everything is an enormous adventure for Dot.',
        personality_traits: ['observant', 'cheerful', 'tiny', 'determined'],
        visual_description: 'Small ladybird/ladybug, red with 7 black spots, leaf-shaped backpack, standing on a daisy, big friendly eyes, children\'s book character style',
        age_range: '3-6',
      },
      {
        name: 'Beats',
        description: 'A musical frog who plays drums on lily pads. Bright green with purple spots, always tapping a rhythm on something. The unofficial leader of The Rhythm Crew.',
        personality_traits: ['rhythmic', 'energetic', 'creative', 'encouraging'],
        visual_description: 'Bright green frog with purple spots, sitting on lily pad with tiny drumsticks, musical notes floating around, wearing small headphones, children\'s book character style',
        age_range: '3-7',
      },
    ];

    let inserted = 0;
    for (const c of characters) {
      try {
        await this.db.execute(`
          INSERT INTO storybook_characters (tenant_id, name, description, personality_traits, visual_description, age_range)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [config.tenantId, c.name, c.description, c.personality_traits, c.visual_description, c.age_range]);
        inserted++;
      } catch (error) {
        // Continue
      }
    }
    return Result.ok(inserted);
  }

  private async seedArenaDefaults(config: SeedDataConfig): Promise<Result<number>> {
    // Arena scoring defaults are configuration, not DB rows — stored in app config
    // But we seed a default competition template
    return Result.ok(0);
  }

  private async seedSampleUsers(config: SeedDataConfig): Promise<Result<number>> {
    // Sample creator profiles for testing
    const creators = [
      { display_name: 'Demo Educator', bio: 'Sample educator profile for testing', tier: 'SILVER' },
      { display_name: 'Demo Author', bio: 'Sample community author profile', tier: 'BRONZE' },
    ];

    let inserted = 0;
    for (const c of creators) {
      try {
        await this.db.execute(`
          INSERT INTO creator_profiles (user_id, tenant_id, display_name, bio, tier)
          VALUES ($1, $2, $3, $4, $5::creator_tier)
          ON CONFLICT (user_id) DO NOTHING
        `, [`demo_${c.tier.toLowerCase()}_${config.tenantId}`, config.tenantId, c.display_name, c.bio, c.tier]);
        inserted++;
      } catch (error) {
        // Continue
      }
    }
    return Result.ok(inserted);
  }
}

// =============================================================================
// Section 7: Supporting Types
// =============================================================================

export interface MigrationReport {
  startedAt: Date;
  completedAt: Date | null;
  migrationsRun: number;
  migrationsSkipped: number;
  migrationsFailed: number;
  totalTimeMs: number;
  results: MigrationStepResult[];
}

export interface MigrationStepResult {
  name: string;
  version: string;
  status: MigrationStatus;
  executionTimeMs: number;
  affectedRows?: number;
  error?: string;
  dryRun?: boolean;
}

export interface TenantSeedReport {
  tenantId: string;
  tablesSeeded: number;
  rowsInserted: number;
  errors: string[];
  duration: number;
}

export interface DatabaseClient {
  execute(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
}

// Line count: ~870
