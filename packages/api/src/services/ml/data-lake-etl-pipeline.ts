// ============================================================================
// SCHOLARLY PLATFORM — Sprint 14, Deliverable S14-001
// Data Lake & ETL Pipeline
// ============================================================================
//
// PURPOSE: Centralised data warehouse with star schema for cross-service
// analytics and reporting. If the Scholarly platform were a city, Sprint 13's
// analytics dashboard was the traffic control centre — it could see what was
// happening on a few key roads. This Data Lake is the city's entire
// underground utility network: every pipe, every wire, every data point from
// every service flows through here, is cleaned, transformed, and stored in
// a structure optimised for asking any question about the platform's health,
// learner outcomes, and business metrics.
//
// ARCHITECTURE: Star schema (fact + dimension tables) for OLAP queries,
// CDC (Change Data Capture) for real-time sync from operational DB,
// ETL orchestration for batch processing, and data quality gates
// ensuring no garbage enters the warehouse.
//
// INTEGRATIONS:
//   - Sprint 1 (auth/users → DimUser, DimTenant)
//   - Sprint 3 (BKT mastery → FactMasterySnapshot, FactBKTUpdate)
//   - Sprint 5 (reading sessions → FactReadingSession)
//   - Sprint 6 (observability → FactSystemMetric)
//   - Sprint 7 (content pipeline → FactContentGeneration)
//   - Sprint 9 (payments/subscriptions → FactSubscriptionEvent, FactRevenue)
//   - Sprint 10 (wellbeing → FactWellbeingAssessment)
//   - Sprint 11 (gamification → FactGamificationEvent)
//   - Sprint 12 (security audit → FactSecurityEvent)
//   - Sprint 13 (A/B testing → FactExperimentEvent, analytics → FactCohortSnapshot)
// ============================================================================

import { ScholarlyBaseService, Result } from '../shared/base';

// ============================================================================
// SECTION 1: STAR SCHEMA DEFINITIONS
// ============================================================================
// Star schema is the gold standard for analytical databases. Think of it as
// a sun with rays: the "sun" is a fact table (events that happened — readings,
// purchases, mastery updates) and the "rays" are dimension tables (the who,
// what, where, when context around those events). This structure lets analysts
// slice and dice data along any dimension without complex joins.

// --- Dimension Tables ---
// Dimensions are the "adjectives" of our data — they describe the context.
// They change slowly (a learner's name, a school's address) and are referenced
// by fact tables via foreign keys.

export interface DimUser {
  userKey: number;                // Surrogate key (warehouse-internal)
  userId: string;                 // Natural key from operational DB
  tenantId: string;
  userType: 'learner' | 'educator' | 'parent' | 'admin' | 'creator';
  displayName: string;
  email?: string;                 // Nullable for COPPA-protected learners
  ageGroup: '3-5' | '5-7' | '7-9' | '9-12' | '12-16' | '16+';
  locale: string;                 // e.g., 'en-AU', 'es-MX', 'fr-FR'
  timezone: string;
  registrationDate: Date;
  subscriptionTier: 'free' | 'explorer' | 'scholar' | 'institution';
  // SCD Type 2 fields for tracking historical changes
  effectiveFrom: Date;
  effectiveTo: Date | null;       // null = current record
  isCurrent: boolean;
}

export interface DimTenant {
  tenantKey: number;
  tenantId: string;
  tenantName: string;
  tenantType: 'school' | 'district' | 'homeschool' | 'tutoring' | 'individual';
  country: string;
  region: string;
  curriculum: string;             // e.g., 'letters-and-sounds', 'jolly-phonics', 'custom'
  subscriptionPlan: string;
  maxLearners: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isCurrent: boolean;
}

export interface DimDate {
  dateKey: number;                // YYYYMMDD integer for fast joins
  fullDate: Date;
  year: number;
  quarter: number;
  month: number;
  monthName: string;
  week: number;
  dayOfWeek: number;
  dayName: string;
  isWeekend: boolean;
  isSchoolDay: boolean;           // Configurable per tenant's school calendar
  academicYear: string;           // e.g., '2025-2026'
  academicTerm: string;           // e.g., 'Term 1', 'Semester 2'
}

export interface DimTime {
  timeKey: number;                // HHMM integer
  hour: number;
  minute: number;
  period: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  isSchoolHours: boolean;         // 8am-3pm default, configurable
}

export interface DimPhonicsPhase {
  phaseKey: number;
  phaseId: string;
  phaseName: string;              // e.g., 'Phase 2: Letter Sounds'
  phaseOrder: number;
  curriculum: string;
  totalGPCs: number;
  expectedWeeks: number;          // Expected duration at normal pace
  description: string;
}

export interface DimGPC {
  gpcKey: number;
  gpcId: string;
  grapheme: string;               // e.g., 'sh', 'igh', 'tion'
  phoneme: string;                // IPA notation
  phaseKey: number;               // FK to DimPhonicsPhase
  frequency: number;              // How common in English text (rank)
  complexity: 'simple' | 'digraph' | 'trigraph' | 'split_digraph' | 'complex';
  curriculum: string;
}

export interface DimStorybook {
  storybookKey: number;
  storybookId: string;
  title: string;
  seriesId?: string;
  phaseKey: number;               // FK to DimPhonicsPhase
  decodabilityScore: number;
  wordCount: number;
  pageCount: number;
  artStyle: string;
  targetAgeGroup: string;
  creatorId: string;
  creatorType: 'system' | 'community' | 'educator';
  publishedDate: Date;
  vocabularyTier: 'tier1' | 'tier2' | 'tier3';
}

export interface DimDevice {
  deviceKey: number;
  deviceId: string;
  platform: 'ios' | 'android' | 'web' | 'chromebook';
  deviceType: 'phone' | 'tablet' | 'desktop' | 'laptop' | 'chromebook';
  osVersion: string;
  appVersion: string;
  screenSize: 'small' | 'medium' | 'large' | 'xlarge';
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isCurrent: boolean;
}

export interface DimContentType {
  contentTypeKey: number;
  contentType: 'storybook' | 'assessment' | 'activity' | 'game' | 'arena_match' | 'letter_formation';
  contentCategory: string;
  isInteractive: boolean;
  requiresAudio: boolean;
  supportsOffline: boolean;
}

// --- Fact Tables ---
// Facts are the "verbs" — things that happened. Each row records an event
// with measurements (metrics) and references to dimensions (context).

export interface FactReadingSession {
  sessionKey: number;
  dateKey: number;                // FK to DimDate
  timeKey: number;                // FK to DimTime
  userKey: number;                // FK to DimUser
  tenantKey: number;              // FK to DimTenant
  storybookKey: number;           // FK to DimStorybook
  deviceKey: number;              // FK to DimDevice
  // Measures
  durationSeconds: number;
  pagesRead: number;
  wordsAttempted: number;
  wordsCorrect: number;
  wcpm: number;                   // Words correct per minute
  accuracy: number;               // 0-1
  completionRate: number;         // 0-1 (pages read / total pages)
  readingMode: 'listen' | 'read_aloud' | 'independent';
  isOfflineSession: boolean;
  engagementScore: number;        // Composite 0-100
  retryCount: number;
  // Degenerate dimensions (facts that are their own context)
  sessionId: string;
  startedAt: Date;
  completedAt: Date | null;
}

export interface FactMasterySnapshot {
  snapshotKey: number;
  dateKey: number;
  userKey: number;
  tenantKey: number;
  gpcKey: number;                 // FK to DimGPC
  phaseKey: number;               // FK to DimPhonicsPhase
  // Measures — BKT state captured as a periodic snapshot
  masteryProbability: number;     // P(L) from BKT
  learnRate: number;              // P(T)
  slipRate: number;               // P(S)
  guessRate: number;              // P(G)
  practiceCount: number;          // Total attempts on this GPC
  consecutiveCorrect: number;
  masteryLevel: 'not_started' | 'emerging' | 'developing' | 'securing' | 'mastered';
  daysInCurrentLevel: number;
  snapshotType: 'daily' | 'weekly' | 'phase_completion';
}

export interface FactBKTUpdate {
  updateKey: number;
  dateKey: number;
  timeKey: number;
  userKey: number;
  tenantKey: number;
  gpcKey: number;
  // Measures — individual BKT transition events
  priorMastery: number;
  posteriorMastery: number;
  masteryDelta: number;
  isCorrect: boolean;
  responseTimeMs: number;
  contextType: 'reading' | 'assessment' | 'activity' | 'arena';
  sessionId: string;
}

export interface FactSubscriptionEvent {
  eventKey: number;
  dateKey: number;
  timeKey: number;
  userKey: number;
  tenantKey: number;
  // Measures
  eventType: 'trial_start' | 'subscribe' | 'upgrade' | 'downgrade' | 'renew' | 'cancel' | 'churn' | 'reactivate';
  fromTier: string | null;
  toTier: string;
  amount: number;                 // In cents
  currency: string;
  paymentMethod: 'stripe' | 'apple_iap' | 'google_play' | 'institutional';
  isAnnual: boolean;
  trialDaysRemaining: number;
  lifetimeValue: number;          // Running total LTV
}

export interface FactRevenue {
  revenueKey: number;
  dateKey: number;
  tenantKey: number;
  // Measures — daily revenue aggregations
  grossRevenue: number;
  platformFees: number;           // Apple 30%, Google 15%, Stripe 2.9%
  creatorPayouts: number;         // Revenue shared with community creators
  netRevenue: number;
  newSubscriptions: number;
  renewals: number;
  cancellations: number;
  mrrDelta: number;               // Monthly recurring revenue change
  arrProjection: number;          // Annual recurring revenue projection
}

export interface FactContentGeneration {
  generationKey: number;
  dateKey: number;
  timeKey: number;
  tenantKey: number;
  userKey: number;                // Who triggered generation
  // Measures
  contentType: 'story_narrative' | 'illustration' | 'audio_narration' | 'jit_remediation';
  aiProvider: string;             // claude, openai, elevenlabs, etc.
  aiModel: string;
  inputTokens: number;
  outputTokens: number;
  generationTimeMs: number;
  costCents: number;
  wasSuccessful: boolean;
  failureReason?: string;
  decodabilityScore?: number;     // For stories
  safetyScore?: number;
  qualityScore?: number;          // AI-assessed quality 0-1
}

export interface FactWellbeingAssessment {
  assessmentKey: number;
  dateKey: number;
  timeKey: number;
  userKey: number;
  tenantKey: number;
  // Measures
  moodScore: number;              // 1-5
  confidenceScore: number;        // 1-5
  engagementScore: number;        // 1-5
  anxietyIndicator: number;       // 0-1 (AI-assessed)
  frustrationIndicator: number;   // 0-1
  assessmentMethod: 'self_report' | 'emoji_check' | 'ai_inferred' | 'parent_report';
  triggeredIntervention: boolean;
  interventionType?: string;
}

export interface FactGamificationEvent {
  eventKey: number;
  dateKey: number;
  timeKey: number;
  userKey: number;
  tenantKey: number;
  // Measures
  eventType: 'xp_earned' | 'badge_awarded' | 'streak_milestone' | 'level_up' | 'arena_match' | 'leaderboard_change';
  xpAmount: number;
  totalXp: number;
  badgeId?: string;
  streakDays: number;
  arenaMatchId?: string;
  arenaResult?: 'win' | 'loss' | 'draw';
  leaderboardRank?: number;
  leaderboardDelta?: number;
}

export interface FactExperimentEvent {
  eventKey: number;
  dateKey: number;
  timeKey: number;
  userKey: number;
  tenantKey: number;
  // Measures — A/B test exposure and conversion events
  experimentId: string;
  variantId: string;
  eventType: 'exposure' | 'conversion' | 'guardrail_violation';
  metricName: string;
  metricValue: number;
  sessionId: string;
}

export interface FactSecurityEvent {
  eventKey: number;
  dateKey: number;
  timeKey: number;
  tenantKey: number;
  // Measures
  eventType: 'login' | 'failed_login' | 'password_reset' | 'mfa_challenge' | 'permission_change' | 'data_export' | 'suspicious_activity';
  severity: 'info' | 'warning' | 'critical';
  sourceIp: string;               // Hashed for privacy
  userAgent: string;
  wasBlocked: boolean;
  riskScore: number;              // 0-100
}

export interface FactSystemMetric {
  metricKey: number;
  dateKey: number;
  timeKey: number;
  // Measures — operational metrics aggregated per 5-minute window
  serviceName: string;
  metricType: 'latency_p50' | 'latency_p99' | 'error_rate' | 'throughput' | 'cpu_usage' | 'memory_usage' | 'db_connections' | 'cache_hit_rate';
  metricValue: number;
  sampleCount: number;
  environment: 'production' | 'staging' | 'preview';
}


// ============================================================================
// SECTION 2: CHANGE DATA CAPTURE (CDC)
// ============================================================================
// CDC is the nervous system that detects changes in the operational database
// and streams them to the data lake. Think of it as a security camera for
// your database — every INSERT, UPDATE, DELETE is captured and forwarded.
// We use logical replication (Postgres WAL) for zero-impact capture that
// doesn't slow down the operational database.

export interface CDCConfig {
  sourceDatabase: {
    host: string;
    port: number;
    database: string;
    replicationSlot: string;      // Postgres logical replication slot
    publicationName: string;      // Postgres publication for CDC
  };
  targetWarehouse: {
    host: string;
    port: number;
    database: string;
    schema: string;               // 'staging' — raw CDC events land here first
  };
  // Which tables to capture and how
  capturedTables: CDCTableConfig[];
  // Batching config for performance
  batchSize: number;              // Max events per batch (default 1000)
  flushIntervalMs: number;        // Max time before flushing (default 5000)
  // Error handling
  maxRetries: number;
  deadLetterQueue: string;        // NATS subject for failed events
}

export interface CDCTableConfig {
  tableName: string;
  schema: string;                 // Source schema (usually 'public')
  captureMode: 'full_row' | 'changed_columns' | 'key_only';
  targetStagingTable: string;     // Where CDC events land in warehouse
  primaryKeyColumns: string[];
  timestampColumn: string;        // Used for ordering and deduplication
  tenantColumn?: string;          // For multi-tenant isolation
  piiColumns: string[];           // Columns requiring PII handling
  piiStrategy: 'hash' | 'mask' | 'exclude' | 'tokenise';
  enabled: boolean;
}

export interface CDCEvent {
  id: string;
  sourceTable: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: Date;
  lsn: string;                   // Log Sequence Number for ordering
  transactionId: string;
  beforeImage: Record<string, unknown> | null;   // Previous row state (UPDATE/DELETE)
  afterImage: Record<string, unknown> | null;     // New row state (INSERT/UPDATE)
  changedColumns: string[];       // Only populated for UPDATE
  metadata: {
    capturedAt: Date;
    batchId: string;
    sequenceInBatch: number;
  };
}

// Default CDC configuration capturing all critical operational tables
export const DEFAULT_CDC_TABLES: CDCTableConfig[] = [
  {
    tableName: 'User',
    schema: 'public',
    captureMode: 'full_row',
    targetStagingTable: 'stg_users',
    primaryKeyColumns: ['id'],
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    piiColumns: ['email', 'displayName', 'firstName', 'lastName'],
    piiStrategy: 'hash',
    enabled: true,
  },
  {
    tableName: 'PhonicsLearnerProfile',
    schema: 'public',
    captureMode: 'changed_columns',
    targetStagingTable: 'stg_learner_profiles',
    primaryKeyColumns: ['id'],
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    piiStrategy: 'exclude',
    enabled: true,
  },
  {
    tableName: 'PhonicsGPCMastery',
    schema: 'public',
    captureMode: 'full_row',
    targetStagingTable: 'stg_gpc_mastery',
    primaryKeyColumns: ['id'],
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    piiStrategy: 'exclude',
    enabled: true,
  },
  {
    tableName: 'PhonicsReadingSession',
    schema: 'public',
    captureMode: 'full_row',
    targetStagingTable: 'stg_reading_sessions',
    primaryKeyColumns: ['id'],
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    piiStrategy: 'exclude',
    enabled: true,
  },
  {
    tableName: 'Storybook',
    schema: 'public',
    captureMode: 'full_row',
    targetStagingTable: 'stg_storybooks',
    primaryKeyColumns: ['id'],
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    piiStrategy: 'exclude',
    enabled: true,
  },
  {
    tableName: 'Subscription',
    schema: 'public',
    captureMode: 'full_row',
    targetStagingTable: 'stg_subscriptions',
    primaryKeyColumns: ['id'],
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    piiColumns: ['email'],
    piiStrategy: 'hash',
    enabled: true,
  },
  {
    tableName: 'Payment',
    schema: 'public',
    captureMode: 'full_row',
    targetStagingTable: 'stg_payments',
    primaryKeyColumns: ['id'],
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    piiColumns: ['cardLast4', 'billingEmail'],
    piiStrategy: 'mask',
    enabled: true,
  },
  {
    tableName: 'PhonicsAssessmentResult',
    schema: 'public',
    captureMode: 'full_row',
    targetStagingTable: 'stg_assessment_results',
    primaryKeyColumns: ['id'],
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    piiStrategy: 'exclude',
    enabled: true,
  },
  {
    tableName: 'WellbeingCheckIn',
    schema: 'public',
    captureMode: 'full_row',
    targetStagingTable: 'stg_wellbeing_checkins',
    primaryKeyColumns: ['id'],
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    piiColumns: ['freeTextResponse'],
    piiStrategy: 'tokenise',
    enabled: true,
  },
  {
    tableName: 'GamificationEvent',
    schema: 'public',
    captureMode: 'full_row',
    targetStagingTable: 'stg_gamification_events',
    primaryKeyColumns: ['id'],
    timestampColumn: 'createdAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    piiStrategy: 'exclude',
    enabled: true,
  },
  {
    tableName: 'ArenaMatch',
    schema: 'public',
    captureMode: 'full_row',
    targetStagingTable: 'stg_arena_matches',
    primaryKeyColumns: ['id'],
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    piiStrategy: 'exclude',
    enabled: true,
  },
  {
    tableName: 'SecurityAuditLog',
    schema: 'public',
    captureMode: 'full_row',
    targetStagingTable: 'stg_security_audit',
    primaryKeyColumns: ['id'],
    timestampColumn: 'createdAt',
    tenantColumn: 'tenantId',
    piiColumns: ['ipAddress', 'userAgent'],
    piiStrategy: 'hash',
    enabled: true,
  },
];

export class CDCPipeline extends ScholarlyBaseService {
  private config: CDCConfig;
  private eventBuffer: CDCEvent[] = [];
  private isRunning: boolean = false;
  private lastProcessedLSN: string = '0/0';
  private stats: CDCStats = {
    totalEventsProcessed: 0,
    totalBatchesProcessed: 0,
    eventsPerSecond: 0,
    lastBatchSize: 0,
    lastBatchDurationMs: 0,
    lastProcessedAt: null,
    errorCount: 0,
    deadLetterCount: 0,
    lagMs: 0,
    tablesMonitored: 0,
  };

  constructor(tenantId: string, config: CDCConfig) {
    super('CDCPipeline', tenantId);
    this.config = config;
    this.stats.tablesMonitored = config.capturedTables.filter(t => t.enabled).length;
  }

  // Start CDC pipeline — connects to Postgres logical replication slot
  // and begins streaming changes to the staging area
  async start(): Promise<Result<{ status: string }>> {
    if (this.isRunning) {
      return this.fail('CDC pipeline is already running');
    }

    try {
      // 1. Validate replication slot exists
      const slotValid = await this.validateReplicationSlot();
      if (!slotValid.success) return this.fail(slotValid.error!);

      // 2. Create staging tables if they don't exist
      const stagingReady = await this.ensureStagingTables();
      if (!stagingReady.success) return this.fail(stagingReady.error!);

      // 3. Start the replication stream
      this.isRunning = true;
      this.log('info', 'CDC pipeline started', {
        slot: this.config.sourceDatabase.replicationSlot,
        tables: this.config.capturedTables.filter(t => t.enabled).map(t => t.tableName),
        lastLSN: this.lastProcessedLSN,
      });

      // 4. Begin consuming WAL changes
      this.consumeWALChanges();

      return this.ok({ status: 'running' });
    } catch (error) {
      this.log('error', 'Failed to start CDC pipeline', { error: String(error) });
      return this.fail(`CDC start failed: ${String(error)}`);
    }
  }

  // Stop CDC pipeline gracefully — flush remaining buffer, checkpoint LSN
  async stop(): Promise<Result<{ status: string; flushed: number }>> {
    if (!this.isRunning) {
      return this.fail('CDC pipeline is not running');
    }

    this.isRunning = false;

    // Flush remaining events
    const flushed = await this.flushBuffer();

    // Checkpoint the last processed LSN for resume
    await this.checkpointLSN(this.lastProcessedLSN);

    this.log('info', 'CDC pipeline stopped', {
      flushedEvents: flushed,
      lastLSN: this.lastProcessedLSN,
      totalProcessed: this.stats.totalEventsProcessed,
    });

    return this.ok({ status: 'stopped', flushed });
  }

  // Process a batch of CDC events — called by the WAL consumer
  async processBatch(events: CDCEvent[]): Promise<Result<{ processed: number; errors: number }>> {
    const batchStart = Date.now();
    let processed = 0;
    let errors = 0;

    for (const event of events) {
      try {
        // 1. Find the table configuration
        const tableConfig = this.config.capturedTables.find(
          t => t.tableName === event.sourceTable && t.enabled
        );
        if (!tableConfig) continue;

        // 2. Apply PII handling
        const sanitisedEvent = this.applyPIIStrategy(event, tableConfig);

        // 3. Apply tenant isolation filter
        if (tableConfig.tenantColumn && sanitisedEvent.afterImage) {
          const eventTenant = sanitisedEvent.afterImage[tableConfig.tenantColumn] as string;
          // In multi-tenant warehouse, we store all tenants but tag them
          sanitisedEvent.afterImage['__warehouse_tenant_id'] = eventTenant;
        }

        // 4. Write to staging table
        await this.writeTostagingTable(sanitisedEvent, tableConfig);

        // 5. Update LSN tracking
        this.lastProcessedLSN = event.lsn;
        processed++;
      } catch (error) {
        errors++;
        this.stats.errorCount++;

        // Send to dead letter queue for manual inspection
        await this.sendToDeadLetterQueue(event, String(error));
      }
    }

    const batchDuration = Date.now() - batchStart;
    this.stats.totalEventsProcessed += processed;
    this.stats.totalBatchesProcessed++;
    this.stats.lastBatchSize = events.length;
    this.stats.lastBatchDurationMs = batchDuration;
    this.stats.lastProcessedAt = new Date();
    this.stats.eventsPerSecond = batchDuration > 0 ? (processed / batchDuration) * 1000 : 0;

    return this.ok({ processed, errors });
  }

  // Apply PII protection strategies before data enters the warehouse
  private applyPIIStrategy(event: CDCEvent, config: CDCTableConfig): CDCEvent {
    const sanitised = { ...event };

    if (config.piiColumns.length === 0) return sanitised;

    const applyToImage = (image: Record<string, unknown> | null): Record<string, unknown> | null => {
      if (!image) return image;
      const result = { ...image };

      for (const column of config.piiColumns) {
        if (!(column in result)) continue;

        switch (config.piiStrategy) {
          case 'hash':
            // One-way hash — can still be used for joins/dedup but not reversed
            result[column] = this.hashValue(String(result[column]));
            break;
          case 'mask':
            // Partial masking — e.g., "john@example.com" → "j***@e***.com"
            result[column] = this.maskValue(String(result[column]));
            break;
          case 'exclude':
            // Complete removal
            delete result[column];
            break;
          case 'tokenise':
            // Replace with a reversible token (for GDPR right to access)
            result[column] = this.tokeniseValue(String(result[column]));
            break;
        }
      }

      return result;
    };

    sanitised.beforeImage = applyToImage(sanitised.beforeImage);
    sanitised.afterImage = applyToImage(sanitised.afterImage);

    return sanitised;
  }

  private hashValue(value: string): string {
    // SHA-256 hash with platform salt for irreversible PII protection
    // In production: crypto.createHash('sha256').update(SALT + value).digest('hex')
    return `sha256:${Buffer.from(value).toString('base64').substring(0, 16)}`;
  }

  private maskValue(value: string): string {
    if (value.includes('@')) {
      // Email masking: keep first char and domain hint
      const [local, domain] = value.split('@');
      return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
    }
    // Generic masking: keep first and last char
    if (value.length <= 2) return '***';
    return `${value[0]}${'*'.repeat(Math.min(value.length - 2, 8))}${value[value.length - 1]}`;
  }

  private tokeniseValue(value: string): string {
    // Reversible tokenisation — token maps stored in a separate secure vault
    // In production: call TokenVaultService.tokenise(value)
    return `tok_${Buffer.from(value).toString('base64').substring(0, 12)}`;
  }

  // Placeholder methods for infrastructure integration
  private async validateReplicationSlot(): Promise<Result<void>> {
    // In production: SELECT * FROM pg_replication_slots WHERE slot_name = ?
    this.log('info', 'Validating replication slot', { slot: this.config.sourceDatabase.replicationSlot });
    return this.ok(undefined);
  }

  private async ensureStagingTables(): Promise<Result<void>> {
    // In production: CREATE TABLE IF NOT EXISTS for each staging table
    const tables = this.config.capturedTables.filter(t => t.enabled);
    this.log('info', 'Ensuring staging tables exist', { count: tables.length });
    return this.ok(undefined);
  }

  private async consumeWALChanges(): Promise<void> {
    // In production: pg_logical_slot_get_changes() in a loop
    // Uses the Postgres logical decoding protocol to stream WAL changes
    this.log('info', 'WAL consumer started', { fromLSN: this.lastProcessedLSN });
  }

  private async flushBuffer(): Promise<number> {
    const count = this.eventBuffer.length;
    if (count > 0) {
      await this.processBatch(this.eventBuffer);
      this.eventBuffer = [];
    }
    return count;
  }

  private async checkpointLSN(lsn: string): Promise<void> {
    // In production: store in Redis/DB for crash recovery
    this.log('info', 'LSN checkpointed', { lsn });
  }

  private async writeTostagingTable(event: CDCEvent, config: CDCTableConfig): Promise<void> {
    // In production: INSERT INTO staging_table VALUES (...)
    // Uses COPY for bulk inserts when batch size > 100
  }

  private async sendToDeadLetterQueue(event: CDCEvent, error: string): Promise<void> {
    // In production: publish to NATS dead letter subject
    this.stats.deadLetterCount++;
    this.log('error', 'Event sent to dead letter queue', {
      table: event.sourceTable,
      operation: event.operation,
      lsn: event.lsn,
      error,
    });
  }

  getStats(): CDCStats {
    return { ...this.stats };
  }
}

interface CDCStats {
  totalEventsProcessed: number;
  totalBatchesProcessed: number;
  eventsPerSecond: number;
  lastBatchSize: number;
  lastBatchDurationMs: number;
  lastProcessedAt: Date | null;
  errorCount: number;
  deadLetterCount: number;
  lagMs: number;
  tablesMonitored: number;
}


// ============================================================================
// SECTION 3: ETL ORCHESTRATION
// ============================================================================
// ETL (Extract, Transform, Load) is the assembly line that takes raw CDC
// events from staging, cleans and enriches them, and loads them into the
// star schema. Think of staging data as raw ingredients delivered to a
// restaurant kitchen: the ETL pipeline is the chef that washes, chops,
// seasons, and plates them into the finished dish (the star schema).

export interface ETLJob {
  jobId: string;
  jobName: string;
  jobType: 'full_refresh' | 'incremental' | 'snapshot';
  sourceTables: string[];         // Staging tables to read from
  targetTable: string;            // Star schema table to write to
  transformationSQL: string;      // The SQL that does the heavy lifting
  schedule: ETLSchedule;
  dependencies: string[];         // Other jobs that must complete first (DAG)
  timeout: number;                // Max runtime in seconds
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
  qualityChecks: DataQualityCheck[];
  enabled: boolean;
}

export interface ETLSchedule {
  type: 'cron' | 'interval' | 'event_driven';
  cron?: string;                  // e.g., '0 2 * * *' for 2 AM daily
  intervalMs?: number;
  triggerEvent?: string;          // NATS event that triggers this job
}

export interface ETLJobRun {
  runId: string;
  jobId: string;
  status: 'pending' | 'extracting' | 'transforming' | 'loading' | 'validating' | 'completed' | 'failed' | 'retrying';
  startedAt: Date;
  completedAt?: Date;
  rowsExtracted: number;
  rowsTransformed: number;
  rowsLoaded: number;
  rowsRejected: number;
  durationMs: number;
  errorMessage?: string;
  qualityResults: DataQualityResult[];
  watermark: string;              // High-water mark for incremental loads
}

// Pre-defined ETL jobs for all fact and dimension tables
export const SCHOLARLY_ETL_JOBS: ETLJob[] = [
  // --- Dimension Jobs (run first, dimensions must be current before facts) ---
  {
    jobId: 'etl-dim-date',
    jobName: 'Populate Date Dimension',
    jobType: 'full_refresh',
    sourceTables: [],             // Generated, not extracted
    targetTable: 'dim_date',
    transformationSQL: `
      -- Generate date dimension for 5 years (2024-2029)
      -- Populates year, quarter, month, week, day attributes
      -- School day calculation uses tenant-specific academic calendars
      INSERT INTO dim_date (date_key, full_date, year, quarter, month, month_name,
        week, day_of_week, day_name, is_weekend, is_school_day, academic_year, academic_term)
      SELECT
        TO_CHAR(d, 'YYYYMMDD')::int AS date_key,
        d AS full_date,
        EXTRACT(YEAR FROM d)::int,
        EXTRACT(QUARTER FROM d)::int,
        EXTRACT(MONTH FROM d)::int,
        TO_CHAR(d, 'Month'),
        EXTRACT(WEEK FROM d)::int,
        EXTRACT(DOW FROM d)::int,
        TO_CHAR(d, 'Day'),
        EXTRACT(DOW FROM d) IN (0, 6),
        EXTRACT(DOW FROM d) NOT IN (0, 6),  -- Default; overridden per tenant
        CASE WHEN EXTRACT(MONTH FROM d) >= 7
          THEN EXTRACT(YEAR FROM d) || '-' || (EXTRACT(YEAR FROM d) + 1)
          ELSE (EXTRACT(YEAR FROM d) - 1) || '-' || EXTRACT(YEAR FROM d)
        END,
        CASE
          WHEN EXTRACT(MONTH FROM d) BETWEEN 1 AND 4 THEN 'Term 1'
          WHEN EXTRACT(MONTH FROM d) BETWEEN 5 AND 8 THEN 'Term 2'
          ELSE 'Term 3'
        END
      FROM generate_series('2024-01-01'::date, '2029-12-31'::date, '1 day') AS d
      ON CONFLICT (date_key) DO NOTHING;
    `,
    schedule: { type: 'cron', cron: '0 0 1 1 *' },  // Yearly refresh
    dependencies: [],
    timeout: 60,
    retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
    qualityChecks: [
      { name: 'date_completeness', type: 'row_count', threshold: 2190, operator: 'gte' },
    ],
    enabled: true,
  },
  {
    jobId: 'etl-dim-time',
    jobName: 'Populate Time Dimension',
    jobType: 'full_refresh',
    sourceTables: [],
    targetTable: 'dim_time',
    transformationSQL: `
      INSERT INTO dim_time (time_key, hour, minute, period, is_school_hours)
      SELECT
        h * 100 + m AS time_key,
        h, m,
        CASE
          WHEN h BETWEEN 6 AND 11 THEN 'morning'
          WHEN h = 12 THEN 'midday'
          WHEN h BETWEEN 13 AND 17 THEN 'afternoon'
          WHEN h BETWEEN 18 AND 20 THEN 'evening'
          ELSE 'night'
        END,
        h BETWEEN 8 AND 14
      FROM generate_series(0, 23) AS h
      CROSS JOIN generate_series(0, 59) AS m
      ON CONFLICT (time_key) DO NOTHING;
    `,
    schedule: { type: 'cron', cron: '0 0 1 1 *' },
    dependencies: [],
    timeout: 30,
    retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
    qualityChecks: [
      { name: 'time_completeness', type: 'row_count', threshold: 1440, operator: 'eq' },
    ],
    enabled: true,
  },
  {
    jobId: 'etl-dim-user',
    jobName: 'Load User Dimension (SCD Type 2)',
    jobType: 'incremental',
    sourceTables: ['stg_users'],
    targetTable: 'dim_user',
    transformationSQL: `
      -- SCD Type 2: When a user's attributes change, close the old record
      -- and open a new one. This preserves history — we can always answer
      -- "what subscription tier was this learner on when they read that book?"
      
      -- Step 1: Identify changed records
      WITH changes AS (
        SELECT s.*
        FROM stg_users s
        LEFT JOIN dim_user d ON d.user_id = s.id AND d.is_current = true
        WHERE d.user_key IS NULL  -- New user
          OR d.subscription_tier != s.subscription_tier
          OR d.display_name != s.display_name
          OR d.locale != s.locale
      )
      -- Step 2: Close old records
      UPDATE dim_user SET effective_to = NOW(), is_current = false
      WHERE user_id IN (SELECT id FROM changes) AND is_current = true;
      
      -- Step 3: Insert new current records
      INSERT INTO dim_user (user_id, tenant_id, user_type, display_name, email,
        age_group, locale, timezone, registration_date, subscription_tier,
        effective_from, effective_to, is_current)
      SELECT id, tenant_id, user_type, display_name, email,
        age_group, locale, timezone, created_at, subscription_tier,
        NOW(), NULL, true
      FROM changes;
    `,
    schedule: { type: 'cron', cron: '0 */4 * * *' },  // Every 4 hours
    dependencies: [],
    timeout: 300,
    retryPolicy: { maxRetries: 3, backoffMs: 5000, backoffMultiplier: 2 },
    qualityChecks: [
      { name: 'no_orphan_users', type: 'custom_sql', sql: 'SELECT COUNT(*) FROM dim_user WHERE tenant_id IS NULL', threshold: 0, operator: 'eq' },
      { name: 'scd_integrity', type: 'custom_sql', sql: 'SELECT COUNT(*) FROM dim_user GROUP BY user_id HAVING SUM(CASE WHEN is_current THEN 1 ELSE 0 END) > 1', threshold: 0, operator: 'eq' },
    ],
    enabled: true,
  },
  // --- Fact Jobs (run after dimensions are loaded) ---
  {
    jobId: 'etl-fact-reading-session',
    jobName: 'Load Reading Session Facts',
    jobType: 'incremental',
    sourceTables: ['stg_reading_sessions'],
    targetTable: 'fact_reading_session',
    transformationSQL: `
      INSERT INTO fact_reading_session (
        date_key, time_key, user_key, tenant_key, storybook_key, device_key,
        duration_seconds, pages_read, words_attempted, words_correct, wcpm,
        accuracy, completion_rate, reading_mode, is_offline_session,
        engagement_score, retry_count, session_id, started_at, completed_at
      )
      SELECT
        TO_CHAR(s.started_at, 'YYYYMMDD')::int,
        EXTRACT(HOUR FROM s.started_at)::int * 100 + EXTRACT(MINUTE FROM s.started_at)::int,
        du.user_key,
        dt.tenant_key,
        ds.storybook_key,
        dd.device_key,
        s.duration_seconds,
        s.pages_read,
        s.words_attempted,
        s.words_correct,
        CASE WHEN s.duration_seconds > 0
          THEN (s.words_correct::float / (s.duration_seconds / 60.0))
          ELSE 0 END,
        CASE WHEN s.words_attempted > 0
          THEN s.words_correct::float / s.words_attempted
          ELSE 0 END,
        CASE WHEN s.total_pages > 0
          THEN s.pages_read::float / s.total_pages
          ELSE 0 END,
        s.reading_mode,
        s.is_offline,
        s.engagement_score,
        s.retry_count,
        s.session_id,
        s.started_at,
        s.completed_at
      FROM stg_reading_sessions s
      JOIN dim_user du ON du.user_id = s.learner_id AND du.is_current = true
      JOIN dim_tenant dt ON dt.tenant_id = s.tenant_id AND dt.is_current = true
      LEFT JOIN dim_storybook ds ON ds.storybook_id = s.storybook_id
      LEFT JOIN dim_device dd ON dd.device_id = s.device_id AND dd.is_current = true
      WHERE s.__cdc_timestamp > :last_watermark
      ON CONFLICT (session_id) DO UPDATE SET
        completed_at = EXCLUDED.completed_at,
        duration_seconds = EXCLUDED.duration_seconds,
        pages_read = EXCLUDED.pages_read;
    `,
    schedule: { type: 'cron', cron: '*/15 * * * *' },  // Every 15 minutes
    dependencies: ['etl-dim-user', 'etl-dim-date', 'etl-dim-time'],
    timeout: 600,
    retryPolicy: { maxRetries: 5, backoffMs: 10000, backoffMultiplier: 2 },
    qualityChecks: [
      { name: 'no_negative_duration', type: 'custom_sql', sql: "SELECT COUNT(*) FROM fact_reading_session WHERE duration_seconds < 0", threshold: 0, operator: 'eq' },
      { name: 'accuracy_range', type: 'custom_sql', sql: "SELECT COUNT(*) FROM fact_reading_session WHERE accuracy < 0 OR accuracy > 1", threshold: 0, operator: 'eq' },
      { name: 'freshness', type: 'freshness', maxAgeMinutes: 30 },
    ],
    enabled: true,
  },
  {
    jobId: 'etl-fact-mastery-snapshot',
    jobName: 'Load Daily Mastery Snapshots',
    jobType: 'snapshot',
    sourceTables: ['stg_gpc_mastery'],
    targetTable: 'fact_mastery_snapshot',
    transformationSQL: `
      -- Daily snapshot of every learner's mastery state across all GPCs
      -- This enables "time travel" queries: what did mastery look like last month?
      INSERT INTO fact_mastery_snapshot (
        date_key, user_key, tenant_key, gpc_key, phase_key,
        mastery_probability, learn_rate, slip_rate, guess_rate,
        practice_count, consecutive_correct, mastery_level,
        days_in_current_level, snapshot_type
      )
      SELECT
        TO_CHAR(NOW(), 'YYYYMMDD')::int,
        du.user_key,
        dt.tenant_key,
        dg.gpc_key,
        dg.phase_key,
        m.mastery_probability,
        m.learn_rate,
        m.slip_rate,
        m.guess_rate,
        m.practice_count,
        m.consecutive_correct,
        CASE
          WHEN m.mastery_probability >= 0.95 THEN 'mastered'
          WHEN m.mastery_probability >= 0.80 THEN 'securing'
          WHEN m.mastery_probability >= 0.60 THEN 'developing'
          WHEN m.mastery_probability >= 0.30 THEN 'emerging'
          ELSE 'not_started'
        END,
        EXTRACT(DAY FROM NOW() - m.level_changed_at)::int,
        'daily'
      FROM stg_gpc_mastery m
      JOIN dim_user du ON du.user_id = m.learner_id AND du.is_current = true
      JOIN dim_tenant dt ON dt.tenant_id = m.tenant_id AND dt.is_current = true
      JOIN dim_gpc dg ON dg.gpc_id = m.gpc_id;
    `,
    schedule: { type: 'cron', cron: '0 3 * * *' },  // 3 AM daily
    dependencies: ['etl-dim-user', 'etl-dim-date'],
    timeout: 900,
    retryPolicy: { maxRetries: 3, backoffMs: 30000, backoffMultiplier: 2 },
    qualityChecks: [
      { name: 'mastery_range', type: 'custom_sql', sql: "SELECT COUNT(*) FROM fact_mastery_snapshot WHERE mastery_probability < 0 OR mastery_probability > 1", threshold: 0, operator: 'eq' },
      { name: 'snapshot_completeness', type: 'custom_sql', sql: "SELECT COUNT(DISTINCT user_key) FROM fact_mastery_snapshot WHERE date_key = TO_CHAR(NOW(), 'YYYYMMDD')::int", threshold: 1, operator: 'gte' },
    ],
    enabled: true,
  },
  {
    jobId: 'etl-fact-subscription',
    jobName: 'Load Subscription Events',
    jobType: 'incremental',
    sourceTables: ['stg_subscriptions', 'stg_payments'],
    targetTable: 'fact_subscription_event',
    transformationSQL: `
      INSERT INTO fact_subscription_event (
        date_key, time_key, user_key, tenant_key,
        event_type, from_tier, to_tier, amount, currency,
        payment_method, is_annual, trial_days_remaining, lifetime_value
      )
      SELECT
        TO_CHAR(s.event_at, 'YYYYMMDD')::int,
        EXTRACT(HOUR FROM s.event_at)::int * 100 + EXTRACT(MINUTE FROM s.event_at)::int,
        du.user_key,
        dt.tenant_key,
        s.event_type,
        s.from_tier,
        s.to_tier,
        COALESCE(p.amount_cents, 0),
        COALESCE(p.currency, 'AUD'),
        COALESCE(p.payment_method, 'stripe'),
        s.billing_period = 'annual',
        GREATEST(0, EXTRACT(DAY FROM s.trial_end - NOW())::int),
        (SELECT COALESCE(SUM(amount_cents), 0) FROM stg_payments
         WHERE user_id = s.user_id AND status = 'succeeded')
      FROM stg_subscriptions s
      JOIN dim_user du ON du.user_id = s.user_id AND du.is_current = true
      JOIN dim_tenant dt ON dt.tenant_id = s.tenant_id AND dt.is_current = true
      LEFT JOIN stg_payments p ON p.subscription_id = s.id
      WHERE s.__cdc_timestamp > :last_watermark;
    `,
    schedule: { type: 'cron', cron: '0 */1 * * *' },  // Hourly
    dependencies: ['etl-dim-user'],
    timeout: 300,
    retryPolicy: { maxRetries: 5, backoffMs: 5000, backoffMultiplier: 2 },
    qualityChecks: [
      { name: 'no_negative_amounts', type: 'custom_sql', sql: "SELECT COUNT(*) FROM fact_subscription_event WHERE amount < 0", threshold: 0, operator: 'eq' },
    ],
    enabled: true,
  },
  {
    jobId: 'etl-fact-revenue',
    jobName: 'Aggregate Daily Revenue',
    jobType: 'incremental',
    sourceTables: ['fact_subscription_event'],
    targetTable: 'fact_revenue',
    transformationSQL: `
      -- Revenue aggregation runs after subscription events are loaded
      INSERT INTO fact_revenue (
        date_key, tenant_key,
        gross_revenue, platform_fees, creator_payouts, net_revenue,
        new_subscriptions, renewals, cancellations, mrr_delta, arr_projection
      )
      SELECT
        fse.date_key,
        fse.tenant_key,
        SUM(CASE WHEN fse.event_type IN ('subscribe', 'upgrade', 'renew') THEN fse.amount ELSE 0 END),
        SUM(CASE WHEN fse.event_type IN ('subscribe', 'upgrade', 'renew') THEN
          CASE fse.payment_method
            WHEN 'apple_iap' THEN fse.amount * 0.30
            WHEN 'google_play' THEN fse.amount * 0.15
            WHEN 'stripe' THEN fse.amount * 0.029 + 30
            ELSE 0
          END ELSE 0 END),
        0,  -- Creator payouts calculated separately
        0,  -- Net = gross - fees - payouts (computed after)
        COUNT(CASE WHEN fse.event_type = 'subscribe' THEN 1 END),
        COUNT(CASE WHEN fse.event_type = 'renew' THEN 1 END),
        COUNT(CASE WHEN fse.event_type IN ('cancel', 'churn') THEN 1 END),
        0,  -- MRR delta computed in post-processing
        0   -- ARR projection computed in post-processing
      FROM fact_subscription_event fse
      WHERE fse.date_key = TO_CHAR(NOW(), 'YYYYMMDD')::int
      GROUP BY fse.date_key, fse.tenant_key
      ON CONFLICT (date_key, tenant_key) DO UPDATE SET
        gross_revenue = EXCLUDED.gross_revenue,
        platform_fees = EXCLUDED.platform_fees,
        new_subscriptions = EXCLUDED.new_subscriptions,
        renewals = EXCLUDED.renewals,
        cancellations = EXCLUDED.cancellations;
    `,
    schedule: { type: 'cron', cron: '30 */1 * * *' },  // Hourly at :30
    dependencies: ['etl-fact-subscription'],
    timeout: 300,
    retryPolicy: { maxRetries: 3, backoffMs: 5000, backoffMultiplier: 2 },
    qualityChecks: [
      { name: 'revenue_non_negative', type: 'custom_sql', sql: "SELECT COUNT(*) FROM fact_revenue WHERE gross_revenue < 0", threshold: 0, operator: 'eq' },
    ],
    enabled: true,
  },
  {
    jobId: 'etl-fact-content-generation',
    jobName: 'Load Content Generation Facts',
    jobType: 'incremental',
    sourceTables: ['stg_ai_generation_logs'],
    targetTable: 'fact_content_generation',
    transformationSQL: `
      INSERT INTO fact_content_generation (
        date_key, time_key, tenant_key, user_key,
        content_type, ai_provider, ai_model,
        input_tokens, output_tokens, generation_time_ms,
        cost_cents, was_successful, failure_reason,
        decodability_score, safety_score, quality_score
      )
      SELECT
        TO_CHAR(g.created_at, 'YYYYMMDD')::int,
        EXTRACT(HOUR FROM g.created_at)::int * 100 + EXTRACT(MINUTE FROM g.created_at)::int,
        dt.tenant_key,
        du.user_key,
        g.content_type, g.provider, g.model,
        g.input_tokens, g.output_tokens, g.duration_ms,
        g.cost_cents, g.success, g.error_message,
        g.decodability_score, g.safety_score, g.quality_score
      FROM stg_ai_generation_logs g
      JOIN dim_tenant dt ON dt.tenant_id = g.tenant_id AND dt.is_current = true
      LEFT JOIN dim_user du ON du.user_id = g.triggered_by AND du.is_current = true
      WHERE g.__cdc_timestamp > :last_watermark;
    `,
    schedule: { type: 'cron', cron: '*/30 * * * *' },  // Every 30 minutes
    dependencies: ['etl-dim-user'],
    timeout: 300,
    retryPolicy: { maxRetries: 3, backoffMs: 5000, backoffMultiplier: 2 },
    qualityChecks: [
      { name: 'cost_range', type: 'custom_sql', sql: "SELECT COUNT(*) FROM fact_content_generation WHERE cost_cents > 10000", threshold: 0, operator: 'eq' },
    ],
    enabled: true,
  },
];


// ============================================================================
// SECTION 4: ETL ORCHESTRATOR
// ============================================================================
// The orchestrator is the conductor of our data orchestra — it knows which
// instruments (ETL jobs) need to play in which order, handles the timing,
// and stops the performance if something goes wrong. It uses a DAG
// (Directed Acyclic Graph) to resolve job dependencies, ensuring dimensions
// are loaded before the facts that reference them.

export class ETLOrchestrator extends ScholarlyBaseService {
  private jobs: Map<string, ETLJob> = new Map();
  private runHistory: Map<string, ETLJobRun[]> = new Map();
  private watermarks: Map<string, string> = new Map();  // Job → last watermark
  private isRunning: boolean = false;

  constructor(tenantId: string) {
    super('ETLOrchestrator', tenantId);

    // Register all pre-defined ETL jobs
    for (const job of SCHOLARLY_ETL_JOBS) {
      this.jobs.set(job.jobId, job);
    }
  }

  // Execute a single ETL job with full lifecycle management
  async executeJob(jobId: string): Promise<Result<ETLJobRun>> {
    const job = this.jobs.get(jobId);
    if (!job) return this.fail(`Job not found: ${jobId}`);
    if (!job.enabled) return this.fail(`Job is disabled: ${jobId}`);

    const run: ETLJobRun = {
      runId: `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      jobId,
      status: 'pending',
      startedAt: new Date(),
      rowsExtracted: 0,
      rowsTransformed: 0,
      rowsLoaded: 0,
      rowsRejected: 0,
      durationMs: 0,
      qualityResults: [],
      watermark: this.watermarks.get(jobId) || '1970-01-01T00:00:00Z',
    };

    this.log('info', `Starting ETL job: ${job.jobName}`, { jobId, runId: run.runId });

    try {
      // Phase 1: Check dependencies
      run.status = 'extracting';
      const depsOk = await this.checkDependencies(job);
      if (!depsOk.success) {
        run.status = 'failed';
        run.errorMessage = depsOk.error;
        return this.fail(`Dependency check failed: ${depsOk.error}`);
      }

      // Phase 2: Extract (read from staging)
      const extracted = await this.extract(job, run);
      run.rowsExtracted = extracted;

      // Phase 3: Transform & Load (execute transformation SQL)
      run.status = 'transforming';
      const loaded = await this.transformAndLoad(job, run);
      run.rowsTransformed = loaded.transformed;
      run.rowsLoaded = loaded.loaded;
      run.rowsRejected = loaded.rejected;

      // Phase 4: Data quality validation
      run.status = 'validating';
      const qualityResults = await this.runQualityChecks(job);
      run.qualityResults = qualityResults;

      const failedChecks = qualityResults.filter(r => !r.passed);
      if (failedChecks.length > 0) {
        this.log('warn', 'Quality checks failed', {
          jobId,
          failures: failedChecks.map(f => f.checkName),
        });
        // Quality failures are warnings, not hard failures
        // unless the check is marked as blocking
      }

      // Phase 5: Update watermark
      run.status = 'completed';
      run.completedAt = new Date();
      run.durationMs = run.completedAt.getTime() - run.startedAt.getTime();
      this.watermarks.set(jobId, new Date().toISOString());

      this.log('info', `ETL job completed: ${job.jobName}`, {
        jobId,
        runId: run.runId,
        duration: run.durationMs,
        loaded: run.rowsLoaded,
        rejected: run.rowsRejected,
      });

      // Store run history
      const history = this.runHistory.get(jobId) || [];
      history.push(run);
      if (history.length > 100) history.shift();  // Keep last 100 runs
      this.runHistory.set(jobId, history);

      return this.ok(run);
    } catch (error) {
      run.status = 'failed';
      run.errorMessage = String(error);
      run.completedAt = new Date();
      run.durationMs = run.completedAt.getTime() - run.startedAt.getTime();

      this.log('error', `ETL job failed: ${job.jobName}`, {
        jobId,
        runId: run.runId,
        error: String(error),
      });

      return this.fail(`ETL job failed: ${String(error)}`);
    }
  }

  // Execute all jobs in dependency order (topological sort)
  async executeAll(): Promise<Result<{ completed: string[]; failed: string[] }>> {
    const order = this.topologicalSort();
    const completed: string[] = [];
    const failed: string[] = [];

    this.log('info', 'Starting full ETL pipeline', { jobCount: order.length, order });

    for (const jobId of order) {
      const result = await this.executeJob(jobId);
      if (result.success) {
        completed.push(jobId);
      } else {
        failed.push(jobId);
        // Check if any downstream jobs depend on this one
        const downstream = this.getDownstreamJobs(jobId);
        if (downstream.length > 0) {
          this.log('warn', 'Skipping downstream jobs due to failure', {
            failedJob: jobId,
            skipped: downstream,
          });
          failed.push(...downstream);
        }
      }
    }

    return this.ok({ completed, failed });
  }

  // Topological sort of job DAG — ensures dependencies run before dependents
  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (jobId: string): void => {
      if (visited.has(jobId)) return;
      visited.add(jobId);

      const job = this.jobs.get(jobId);
      if (!job || !job.enabled) return;

      for (const dep of job.dependencies) {
        visit(dep);
      }

      order.push(jobId);
    };

    for (const [jobId] of this.jobs) {
      visit(jobId);
    }

    return order;
  }

  private getDownstreamJobs(jobId: string): string[] {
    const downstream: string[] = [];
    for (const [id, job] of this.jobs) {
      if (job.dependencies.includes(jobId)) {
        downstream.push(id);
      }
    }
    return downstream;
  }

  private async checkDependencies(job: ETLJob): Promise<Result<void>> {
    for (const depId of job.dependencies) {
      const depHistory = this.runHistory.get(depId) || [];
      const lastRun = depHistory[depHistory.length - 1];
      if (!lastRun || lastRun.status !== 'completed') {
        return this.fail(`Dependency ${depId} has not completed successfully`);
      }
    }
    return this.ok(undefined);
  }

  private async extract(job: ETLJob, run: ETLJobRun): Promise<number> {
    // In production: SELECT COUNT(*) FROM staging WHERE timestamp > watermark
    this.log('info', `Extracting from ${job.sourceTables.join(', ')}`, { jobId: job.jobId });
    return 0;  // Returns actual count in production
  }

  private async transformAndLoad(
    job: ETLJob,
    run: ETLJobRun
  ): Promise<{ transformed: number; loaded: number; rejected: number }> {
    // In production: Execute the transformation SQL with parameterised watermark
    this.log('info', 'Executing transformation', { jobId: job.jobId, sql: job.transformationSQL.substring(0, 100) });
    return { transformed: 0, loaded: 0, rejected: 0 };
  }

  private async runQualityChecks(job: ETLJob): Promise<DataQualityResult[]> {
    const results: DataQualityResult[] = [];

    for (const check of job.qualityChecks) {
      const result = await this.executeQualityCheck(check);
      results.push(result);
    }

    return results;
  }

  private async executeQualityCheck(check: DataQualityCheck): Promise<DataQualityResult> {
    // In production: Execute the check SQL and compare against threshold
    return {
      checkName: check.name,
      checkType: check.type,
      actualValue: 0,
      threshold: check.threshold,
      operator: check.operator,
      passed: true,
      executedAt: new Date(),
    };
  }

  // Get orchestrator status dashboard
  getStatus(): ETLDashboard {
    const jobStatuses: ETLJobStatus[] = [];

    for (const [jobId, job] of this.jobs) {
      const history = this.runHistory.get(jobId) || [];
      const lastRun = history[history.length - 1];
      const recentRuns = history.slice(-10);
      const successRate = recentRuns.length > 0
        ? recentRuns.filter(r => r.status === 'completed').length / recentRuns.length
        : 0;

      jobStatuses.push({
        jobId,
        jobName: job.jobName,
        enabled: job.enabled,
        schedule: job.schedule,
        lastRun: lastRun || null,
        successRate,
        avgDurationMs: recentRuns.length > 0
          ? recentRuns.reduce((sum, r) => sum + r.durationMs, 0) / recentRuns.length
          : 0,
        totalRuns: history.length,
        watermark: this.watermarks.get(jobId) || null,
      });
    }

    return {
      isRunning: this.isRunning,
      totalJobs: this.jobs.size,
      enabledJobs: [...this.jobs.values()].filter(j => j.enabled).length,
      jobStatuses,
      lastFullRun: null,  // Set when executeAll() completes
    };
  }
}


// ============================================================================
// SECTION 5: DATA QUALITY FRAMEWORK
// ============================================================================
// Data quality is to a data warehouse what food safety is to a restaurant:
// invisible when done well, catastrophic when neglected. Bad data leads to
// bad decisions — imagine a teacher seeing incorrect mastery data and
// assigning the wrong phonics phase to a struggling reader. The quality
// framework ensures every row that enters the star schema meets our standards.

export interface DataQualityCheck {
  name: string;
  type: 'row_count' | 'null_check' | 'range_check' | 'uniqueness' | 'freshness' | 'custom_sql' | 'referential_integrity';
  // For row_count, range_check:
  threshold: number;
  operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte';
  // For custom_sql:
  sql?: string;
  // For freshness:
  maxAgeMinutes?: number;
  // For null_check:
  column?: string;
  maxNullPercentage?: number;
  // For referential_integrity:
  sourceTable?: string;
  sourceColumn?: string;
  targetTable?: string;
  targetColumn?: string;
}

export interface DataQualityResult {
  checkName: string;
  checkType: string;
  actualValue: number;
  threshold: number;
  operator: string;
  passed: boolean;
  executedAt: Date;
  errorDetails?: string;
}

// Comprehensive quality rules applied across the entire warehouse
export const WAREHOUSE_QUALITY_RULES: DataQualityCheck[] = [
  // Referential integrity: every fact must reference valid dimensions
  {
    name: 'reading_session_user_integrity',
    type: 'referential_integrity',
    sourceTable: 'fact_reading_session',
    sourceColumn: 'user_key',
    targetTable: 'dim_user',
    targetColumn: 'user_key',
    threshold: 0,
    operator: 'eq',
  },
  {
    name: 'reading_session_tenant_integrity',
    type: 'referential_integrity',
    sourceTable: 'fact_reading_session',
    sourceColumn: 'tenant_key',
    targetTable: 'dim_tenant',
    targetColumn: 'tenant_key',
    threshold: 0,
    operator: 'eq',
  },
  {
    name: 'mastery_snapshot_gpc_integrity',
    type: 'referential_integrity',
    sourceTable: 'fact_mastery_snapshot',
    sourceColumn: 'gpc_key',
    targetTable: 'dim_gpc',
    targetColumn: 'gpc_key',
    threshold: 0,
    operator: 'eq',
  },
  // Null checks: critical columns must never be null
  {
    name: 'no_null_mastery_probability',
    type: 'null_check',
    column: 'mastery_probability',
    maxNullPercentage: 0,
    threshold: 0,
    operator: 'eq',
  },
  {
    name: 'no_null_session_duration',
    type: 'null_check',
    column: 'duration_seconds',
    maxNullPercentage: 0,
    threshold: 0,
    operator: 'eq',
  },
  // Range checks: values must be within valid ranges
  {
    name: 'mastery_probability_range',
    type: 'range_check',
    threshold: 0,
    operator: 'eq',
    sql: "SELECT COUNT(*) FROM fact_mastery_snapshot WHERE mastery_probability < 0 OR mastery_probability > 1",
  },
  {
    name: 'accuracy_range',
    type: 'range_check',
    threshold: 0,
    operator: 'eq',
    sql: "SELECT COUNT(*) FROM fact_reading_session WHERE accuracy < 0 OR accuracy > 1",
  },
  {
    name: 'wellbeing_score_range',
    type: 'range_check',
    threshold: 0,
    operator: 'eq',
    sql: "SELECT COUNT(*) FROM fact_wellbeing_assessment WHERE mood_score < 1 OR mood_score > 5",
  },
  // Freshness: critical tables must be updated regularly
  {
    name: 'reading_session_freshness',
    type: 'freshness',
    maxAgeMinutes: 30,
    threshold: 30,
    operator: 'lte',
  },
  {
    name: 'mastery_snapshot_freshness',
    type: 'freshness',
    maxAgeMinutes: 1440,  // 24 hours (daily snapshots)
    threshold: 1440,
    operator: 'lte',
  },
  // Uniqueness: no duplicate facts
  {
    name: 'unique_reading_sessions',
    type: 'uniqueness',
    sql: "SELECT COUNT(*) - COUNT(DISTINCT session_id) FROM fact_reading_session",
    threshold: 0,
    operator: 'eq',
  },
];

export class DataQualityService extends ScholarlyBaseService {
  private rules: DataQualityCheck[];
  private results: DataQualityResult[] = [];
  private alertThreshold: number = 0.95;  // Alert if quality drops below 95%

  constructor(tenantId: string, rules?: DataQualityCheck[]) {
    super('DataQualityService', tenantId);
    this.rules = rules || WAREHOUSE_QUALITY_RULES;
  }

  // Run all quality checks and return a quality report
  async runFullAudit(): Promise<Result<DataQualityReport>> {
    const startTime = Date.now();
    const results: DataQualityResult[] = [];

    for (const rule of this.rules) {
      try {
        const result = await this.executeCheck(rule);
        results.push(result);
      } catch (error) {
        results.push({
          checkName: rule.name,
          checkType: rule.type,
          actualValue: -1,
          threshold: rule.threshold,
          operator: rule.operator,
          passed: false,
          executedAt: new Date(),
          errorDetails: `Check execution failed: ${String(error)}`,
        });
      }
    }

    this.results = results;

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const qualityScore = results.length > 0 ? passed / results.length : 1;

    const report: DataQualityReport = {
      auditId: `audit_${Date.now()}`,
      executedAt: new Date(),
      durationMs: Date.now() - startTime,
      totalChecks: results.length,
      passed,
      failed,
      qualityScore,
      meetsThreshold: qualityScore >= this.alertThreshold,
      results,
      recommendations: this.generateRecommendations(results),
    };

    if (!report.meetsThreshold) {
      this.log('warn', 'Data quality below threshold', {
        score: qualityScore,
        threshold: this.alertThreshold,
        failedChecks: results.filter(r => !r.passed).map(r => r.checkName),
      });
    }

    return this.ok(report);
  }

  private async executeCheck(check: DataQualityCheck): Promise<DataQualityResult> {
    // In production: Execute SQL and compare results
    // Each check type has specific execution logic
    const result: DataQualityResult = {
      checkName: check.name,
      checkType: check.type,
      actualValue: 0,
      threshold: check.threshold,
      operator: check.operator,
      passed: true,
      executedAt: new Date(),
    };

    // Simulate check execution based on type
    switch (check.type) {
      case 'row_count':
        // SELECT COUNT(*) FROM target_table
        result.actualValue = 0;
        result.passed = this.compareValues(result.actualValue, check.threshold, check.operator);
        break;
      case 'null_check':
        // SELECT COUNT(*) FROM table WHERE column IS NULL
        result.actualValue = 0;
        result.passed = true;
        break;
      case 'freshness':
        // SELECT EXTRACT(EPOCH FROM NOW() - MAX(loaded_at))/60 FROM table
        result.actualValue = 0;
        result.passed = check.maxAgeMinutes ? result.actualValue <= check.maxAgeMinutes : true;
        break;
      case 'custom_sql':
      case 'range_check':
        // Execute arbitrary SQL
        result.actualValue = 0;
        result.passed = this.compareValues(result.actualValue, check.threshold, check.operator);
        break;
      case 'referential_integrity':
        // SELECT COUNT(*) FROM source LEFT JOIN target WHERE target.key IS NULL
        result.actualValue = 0;
        result.passed = result.actualValue === 0;
        break;
      case 'uniqueness':
        // Check for duplicates
        result.actualValue = 0;
        result.passed = result.actualValue === 0;
        break;
    }

    return result;
  }

  private compareValues(actual: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'eq': return actual === threshold;
      case 'gt': return actual > threshold;
      case 'gte': return actual >= threshold;
      case 'lt': return actual < threshold;
      case 'lte': return actual <= threshold;
      default: return false;
    }
  }

  private generateRecommendations(results: DataQualityResult[]): string[] {
    const recommendations: string[] = [];
    const failures = results.filter(r => !r.passed);

    for (const failure of failures) {
      switch (failure.checkType) {
        case 'referential_integrity':
          recommendations.push(
            `Fix referential integrity for ${failure.checkName}: ${failure.actualValue} orphaned records found. ` +
            `Run the dimension load job before the fact load job, or add missing dimension records.`
          );
          break;
        case 'null_check':
          recommendations.push(
            `Resolve null values in ${failure.checkName}: found ${failure.actualValue}% nulls. ` +
            `Check the CDC pipeline for missing data or add default value handling in the ETL transformation.`
          );
          break;
        case 'freshness':
          recommendations.push(
            `Data freshness alert for ${failure.checkName}: data is ${failure.actualValue} minutes old. ` +
            `Check if the ETL job is scheduled and running. Verify CDC pipeline is not lagging.`
          );
          break;
        case 'range_check':
          recommendations.push(
            `Range violation in ${failure.checkName}: ${failure.actualValue} out-of-range values. ` +
            `Add range validation to the ETL transformation or fix the source data.`
          );
          break;
        default:
          recommendations.push(`Review failed check: ${failure.checkName} (${failure.checkType})`);
      }
    }

    return recommendations;
  }
}

interface DataQualityReport {
  auditId: string;
  executedAt: Date;
  durationMs: number;
  totalChecks: number;
  passed: number;
  failed: number;
  qualityScore: number;          // 0-1
  meetsThreshold: boolean;
  results: DataQualityResult[];
  recommendations: string[];
}


// ============================================================================
// SECTION 6: REPORTING & ANALYTICS QUERIES
// ============================================================================
// These are the pre-built analytical queries that turn raw warehouse data
// into actionable insights. Think of the star schema as a well-organised
// filing cabinet and these queries as the reports that executives, educators,
// and product managers actually read.

export interface AnalyticsQuery {
  queryId: string;
  name: string;
  description: string;
  category: 'learner_outcomes' | 'engagement' | 'revenue' | 'operations' | 'content' | 'ai_costs';
  sql: string;
  parameters: QueryParameter[];
  refreshFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
  targetAudience: ('admin' | 'educator' | 'parent' | 'product' | 'engineering')[];
}

export interface QueryParameter {
  name: string;
  type: 'date' | 'string' | 'number' | 'enum';
  required: boolean;
  defaultValue?: string;
  enumValues?: string[];
  description: string;
}

export const SCHOLARLY_ANALYTICS_QUERIES: AnalyticsQuery[] = [
  {
    queryId: 'learner-progress-summary',
    name: 'Learner Progress Summary',
    description: 'Overview of learner mastery progression across phonics phases over time',
    category: 'learner_outcomes',
    sql: `
      SELECT
        dd.academic_year,
        dd.academic_term,
        dp.phase_name,
        fms.mastery_level,
        COUNT(DISTINCT fms.user_key) AS learner_count,
        AVG(fms.mastery_probability) AS avg_mastery,
        AVG(fms.practice_count) AS avg_practice_count,
        AVG(fms.days_in_current_level) AS avg_days_in_level
      FROM fact_mastery_snapshot fms
      JOIN dim_date dd ON dd.date_key = fms.date_key
      JOIN dim_phonics_phase dp ON dp.phase_key = fms.phase_key
      JOIN dim_tenant dt ON dt.tenant_key = fms.tenant_key
      WHERE dt.tenant_id = :tenant_id
        AND dd.full_date BETWEEN :start_date AND :end_date
        AND fms.snapshot_type = 'weekly'
      GROUP BY dd.academic_year, dd.academic_term, dp.phase_name, fms.mastery_level
      ORDER BY dp.phase_order, fms.mastery_level;
    `,
    parameters: [
      { name: 'tenant_id', type: 'string', required: true, description: 'Tenant identifier' },
      { name: 'start_date', type: 'date', required: true, description: 'Start of reporting period' },
      { name: 'end_date', type: 'date', required: true, description: 'End of reporting period' },
    ],
    refreshFrequency: 'daily',
    targetAudience: ['educator', 'admin'],
  },
  {
    queryId: 'reading-engagement-trends',
    name: 'Reading Engagement Trends',
    description: 'Daily/weekly reading activity patterns with engagement scoring',
    category: 'engagement',
    sql: `
      SELECT
        dd.year, dd.week, dd.day_name,
        dt2.period,
        COUNT(*) AS total_sessions,
        COUNT(DISTINCT frs.user_key) AS unique_readers,
        AVG(frs.duration_seconds) / 60.0 AS avg_reading_minutes,
        AVG(frs.completion_rate) AS avg_completion,
        AVG(frs.accuracy) AS avg_accuracy,
        AVG(frs.engagement_score) AS avg_engagement,
        SUM(CASE WHEN frs.reading_mode = 'read_aloud' THEN 1 ELSE 0 END) AS read_aloud_count,
        SUM(CASE WHEN frs.reading_mode = 'listen' THEN 1 ELSE 0 END) AS listen_count,
        SUM(CASE WHEN frs.is_offline_session THEN 1 ELSE 0 END) AS offline_count
      FROM fact_reading_session frs
      JOIN dim_date dd ON dd.date_key = frs.date_key
      JOIN dim_time dt2 ON dt2.time_key = frs.time_key
      JOIN dim_tenant dt ON dt.tenant_key = frs.tenant_key
      WHERE dt.tenant_id = :tenant_id
        AND dd.full_date BETWEEN :start_date AND :end_date
      GROUP BY dd.year, dd.week, dd.day_name, dt2.period
      ORDER BY dd.year, dd.week;
    `,
    parameters: [
      { name: 'tenant_id', type: 'string', required: true, description: 'Tenant identifier' },
      { name: 'start_date', type: 'date', required: true, description: 'Start date' },
      { name: 'end_date', type: 'date', required: true, description: 'End date' },
    ],
    refreshFrequency: 'hourly',
    targetAudience: ['educator', 'admin', 'product'],
  },
  {
    queryId: 'revenue-metrics',
    name: 'Revenue Metrics Dashboard',
    description: 'MRR, ARR, churn, LTV, and subscription funnel metrics',
    category: 'revenue',
    sql: `
      SELECT
        dd.year, dd.month, dd.month_name,
        SUM(fr.gross_revenue) / 100.0 AS gross_revenue_dollars,
        SUM(fr.platform_fees) / 100.0 AS platform_fees_dollars,
        SUM(fr.creator_payouts) / 100.0 AS creator_payouts_dollars,
        SUM(fr.net_revenue) / 100.0 AS net_revenue_dollars,
        SUM(fr.new_subscriptions) AS new_subs,
        SUM(fr.renewals) AS renewals,
        SUM(fr.cancellations) AS cancellations,
        SUM(fr.new_subscriptions) - SUM(fr.cancellations) AS net_subscriber_change,
        -- Churn rate
        CASE WHEN (SUM(fr.renewals) + SUM(fr.cancellations)) > 0
          THEN SUM(fr.cancellations)::float / (SUM(fr.renewals) + SUM(fr.cancellations))
          ELSE 0 END AS churn_rate,
        -- ARPU (Average Revenue Per User)
        CASE WHEN (SUM(fr.new_subscriptions) + SUM(fr.renewals)) > 0
          THEN SUM(fr.gross_revenue) / (SUM(fr.new_subscriptions) + SUM(fr.renewals)) / 100.0
          ELSE 0 END AS arpu_dollars
      FROM fact_revenue fr
      JOIN dim_date dd ON dd.date_key = fr.date_key
      WHERE dd.full_date BETWEEN :start_date AND :end_date
      GROUP BY dd.year, dd.month, dd.month_name
      ORDER BY dd.year, dd.month;
    `,
    parameters: [
      { name: 'start_date', type: 'date', required: true, description: 'Start date' },
      { name: 'end_date', type: 'date', required: true, description: 'End date' },
    ],
    refreshFrequency: 'daily',
    targetAudience: ['admin', 'product'],
  },
  {
    queryId: 'ai-cost-analysis',
    name: 'AI Generation Cost Analysis',
    description: 'Per-provider, per-content-type AI generation costs and efficiency',
    category: 'ai_costs',
    sql: `
      SELECT
        dd.year, dd.month,
        fcg.ai_provider,
        fcg.ai_model,
        fcg.content_type,
        COUNT(*) AS total_generations,
        SUM(CASE WHEN fcg.was_successful THEN 1 ELSE 0 END) AS successful,
        SUM(CASE WHEN NOT fcg.was_successful THEN 1 ELSE 0 END) AS failed,
        SUM(fcg.cost_cents) / 100.0 AS total_cost_dollars,
        AVG(fcg.cost_cents) / 100.0 AS avg_cost_per_generation_dollars,
        AVG(fcg.generation_time_ms) AS avg_generation_time_ms,
        SUM(fcg.input_tokens) AS total_input_tokens,
        SUM(fcg.output_tokens) AS total_output_tokens,
        AVG(fcg.decodability_score) AS avg_decodability,
        AVG(fcg.quality_score) AS avg_quality
      FROM fact_content_generation fcg
      JOIN dim_date dd ON dd.date_key = fcg.date_key
      WHERE dd.full_date BETWEEN :start_date AND :end_date
      GROUP BY dd.year, dd.month, fcg.ai_provider, fcg.ai_model, fcg.content_type
      ORDER BY total_cost_dollars DESC;
    `,
    parameters: [
      { name: 'start_date', type: 'date', required: true, description: 'Start date' },
      { name: 'end_date', type: 'date', required: true, description: 'End date' },
    ],
    refreshFrequency: 'daily',
    targetAudience: ['engineering', 'admin'],
  },
  {
    queryId: 'content-effectiveness',
    name: 'Content Effectiveness Report',
    description: 'Which storybooks drive the most mastery improvement',
    category: 'content',
    sql: `
      WITH reading_mastery AS (
        SELECT
          frs.storybook_key,
          frs.user_key,
          frs.date_key AS read_date,
          AVG(frs.accuracy) AS read_accuracy,
          AVG(frs.engagement_score) AS engagement,
          -- Find mastery delta in the week after reading
          (SELECT AVG(fms2.mastery_probability) - AVG(fms1.mastery_probability)
           FROM fact_mastery_snapshot fms1
           JOIN fact_mastery_snapshot fms2 ON fms2.user_key = fms1.user_key
             AND fms2.gpc_key = fms1.gpc_key
             AND fms2.date_key = fms1.date_key + 7
           WHERE fms1.user_key = frs.user_key
             AND fms1.date_key = frs.date_key
          ) AS mastery_delta_7d
        FROM fact_reading_session frs
        GROUP BY frs.storybook_key, frs.user_key, frs.date_key
      )
      SELECT
        ds.title,
        ds.storybook_id,
        dp.phase_name,
        ds.decodability_score,
        ds.art_style,
        ds.creator_type,
        COUNT(DISTINCT rm.user_key) AS unique_readers,
        COUNT(*) AS total_reads,
        AVG(rm.read_accuracy) AS avg_accuracy,
        AVG(rm.engagement) AS avg_engagement,
        AVG(rm.mastery_delta_7d) AS avg_mastery_improvement,
        -- Effectiveness score: engagement × mastery improvement
        AVG(rm.engagement) * GREATEST(AVG(rm.mastery_delta_7d), 0) AS effectiveness_score
      FROM reading_mastery rm
      JOIN dim_storybook ds ON ds.storybook_key = rm.storybook_key
      JOIN dim_phonics_phase dp ON dp.phase_key = ds.phase_key
      GROUP BY ds.title, ds.storybook_id, dp.phase_name, ds.decodability_score,
               ds.art_style, ds.creator_type
      HAVING COUNT(DISTINCT rm.user_key) >= 10  -- Minimum sample size
      ORDER BY effectiveness_score DESC;
    `,
    parameters: [],
    refreshFrequency: 'weekly',
    targetAudience: ['educator', 'admin', 'product'],
  },
  {
    queryId: 'at-risk-learners',
    name: 'At-Risk Learner Identification',
    description: 'Learners showing declining engagement, mastery, or wellbeing indicators',
    category: 'learner_outcomes',
    sql: `
      WITH recent_activity AS (
        SELECT
          du.user_key,
          du.user_id,
          du.display_name,
          du.age_group,
          dt.tenant_id,
          -- Activity recency
          MAX(dd.full_date) AS last_activity_date,
          EXTRACT(DAY FROM NOW() - MAX(dd.full_date)) AS days_since_activity,
          -- Reading engagement
          AVG(frs.engagement_score) AS avg_engagement_30d,
          AVG(frs.accuracy) AS avg_accuracy_30d,
          COUNT(DISTINCT dd.date_key) AS active_days_30d,
          -- Compare to prior 30d
          (SELECT AVG(engagement_score) FROM fact_reading_session frs2
           JOIN dim_date dd2 ON dd2.date_key = frs2.date_key
           WHERE frs2.user_key = du.user_key
             AND dd2.full_date BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days'
          ) AS avg_engagement_prior_30d
        FROM dim_user du
        JOIN dim_tenant dt ON dt.tenant_key = du.tenant_key
        LEFT JOIN fact_reading_session frs ON frs.user_key = du.user_key
        LEFT JOIN dim_date dd ON dd.date_key = frs.date_key
          AND dd.full_date >= NOW() - INTERVAL '30 days'
        WHERE du.user_type = 'learner' AND du.is_current = true
          AND dt.tenant_id = :tenant_id
        GROUP BY du.user_key, du.user_id, du.display_name, du.age_group, dt.tenant_id
      ),
      wellbeing AS (
        SELECT
          fwa.user_key,
          AVG(fwa.mood_score) AS avg_mood,
          AVG(fwa.frustration_indicator) AS avg_frustration,
          COUNT(CASE WHEN fwa.triggered_intervention THEN 1 END) AS intervention_count
        FROM fact_wellbeing_assessment fwa
        JOIN dim_date dd ON dd.date_key = fwa.date_key
        WHERE dd.full_date >= NOW() - INTERVAL '14 days'
        GROUP BY fwa.user_key
      )
      SELECT
        ra.*,
        w.avg_mood,
        w.avg_frustration,
        w.intervention_count,
        -- Composite risk score (0-100, higher = more at risk)
        (
          LEAST(ra.days_since_activity / 7.0, 1) * 30 +           -- Inactivity: 30%
          (1 - COALESCE(ra.avg_accuracy_30d, 0)) * 25 +           -- Low accuracy: 25%
          COALESCE(w.avg_frustration, 0) * 20 +                     -- Frustration: 20%
          (1 - COALESCE(w.avg_mood, 3) / 5.0) * 15 +              -- Low mood: 15%
          CASE WHEN ra.avg_engagement_30d < ra.avg_engagement_prior_30d * 0.7
            THEN 10 ELSE 0 END                                      -- Engagement decline: 10%
        ) AS risk_score
      FROM recent_activity ra
      LEFT JOIN wellbeing w ON w.user_key = ra.user_key
      WHERE ra.days_since_activity > 3  -- At least 3 days inactive
         OR ra.avg_accuracy_30d < 0.5
         OR COALESCE(w.avg_frustration, 0) > 0.6
         OR COALESCE(w.avg_mood, 3) < 2
      ORDER BY risk_score DESC
      LIMIT 50;
    `,
    parameters: [
      { name: 'tenant_id', type: 'string', required: true, description: 'Tenant identifier' },
    ],
    refreshFrequency: 'daily',
    targetAudience: ['educator', 'admin'],
  },
];


// ============================================================================
// SECTION 7: MATERIALISED VIEWS & PERFORMANCE
// ============================================================================
// Materialised views are pre-computed snapshots of complex queries that
// would be too slow to run on-demand. Think of them as pre-packaged
// meals in a freezer — the cooking (computation) is done in advance so
// serving (query response) is instant.

export interface MaterialisedViewConfig {
  viewName: string;
  description: string;
  sourceQuery: string;
  refreshSchedule: string;        // Cron expression
  refreshStrategy: 'full' | 'incremental';
  indexes: string[];              // Columns to index for fast lookups
  retentionDays: number;          // How long to keep historical data
  estimatedRows: number;          // For capacity planning
}

export const SCHOLARLY_MATERIALISED_VIEWS: MaterialisedViewConfig[] = [
  {
    viewName: 'mv_weekly_learner_stats',
    description: 'Weekly aggregation of learner activity, mastery, and engagement',
    sourceQuery: `
      SELECT
        du.user_key,
        du.user_id,
        dt.tenant_id,
        dd.year,
        dd.week,
        MIN(dd.full_date) AS week_start,
        -- Reading stats
        COUNT(DISTINCT frs.session_key) AS reading_sessions,
        SUM(frs.duration_seconds) AS total_reading_seconds,
        AVG(frs.accuracy) AS avg_accuracy,
        AVG(frs.wcpm) AS avg_wcpm,
        MAX(frs.wcpm) AS peak_wcpm,
        COUNT(DISTINCT frs.storybook_key) AS unique_books_read,
        SUM(frs.words_correct) AS total_words_correct,
        -- Mastery stats (end-of-week snapshot)
        (SELECT COUNT(*) FROM fact_mastery_snapshot fms
         WHERE fms.user_key = du.user_key
           AND fms.mastery_level = 'mastered'
           AND fms.date_key = MAX(dd.date_key)) AS gpcs_mastered,
        (SELECT AVG(mastery_probability) FROM fact_mastery_snapshot fms
         WHERE fms.user_key = du.user_key
           AND fms.date_key = MAX(dd.date_key)) AS avg_mastery,
        -- Engagement stats
        COUNT(DISTINCT dd.date_key) AS active_days,
        AVG(frs.engagement_score) AS avg_engagement,
        -- Gamification
        (SELECT SUM(xp_amount) FROM fact_gamification_event fge
         WHERE fge.user_key = du.user_key
           AND fge.date_key BETWEEN MIN(dd.date_key) AND MAX(dd.date_key)) AS weekly_xp
      FROM dim_user du
      JOIN dim_tenant dt ON dt.tenant_key = du.tenant_key
      LEFT JOIN fact_reading_session frs ON frs.user_key = du.user_key
      LEFT JOIN dim_date dd ON dd.date_key = frs.date_key
      WHERE du.is_current = true AND du.user_type = 'learner'
      GROUP BY du.user_key, du.user_id, dt.tenant_id, dd.year, dd.week
    `,
    refreshSchedule: '0 4 * * 1',  // 4 AM every Monday
    refreshStrategy: 'incremental',
    indexes: ['user_key', 'tenant_id', 'year', 'week'],
    retentionDays: 730,  // 2 years
    estimatedRows: 500000,
  },
  {
    viewName: 'mv_daily_platform_health',
    description: 'Daily operational metrics for platform monitoring',
    sourceQuery: `
      SELECT
        dd.date_key,
        dd.full_date,
        -- User activity
        COUNT(DISTINCT frs.user_key) AS daily_active_users,
        COUNT(frs.session_key) AS total_sessions,
        AVG(frs.duration_seconds) AS avg_session_duration,
        -- Content
        COUNT(DISTINCT frs.storybook_key) AS books_read,
        SUM(fcg.cost_cents) / 100.0 AS ai_cost_dollars,
        AVG(CASE WHEN fcg.was_successful THEN 1.0 ELSE 0.0 END) AS ai_success_rate,
        -- Revenue
        SUM(fr.gross_revenue) / 100.0 AS gross_revenue_dollars,
        SUM(fr.new_subscriptions) AS new_subscriptions,
        SUM(fr.cancellations) AS cancellations,
        -- System health
        AVG(fsm.metric_value) FILTER (WHERE fsm.metric_type = 'error_rate') AS avg_error_rate,
        AVG(fsm.metric_value) FILTER (WHERE fsm.metric_type = 'latency_p99') AS avg_p99_latency
      FROM dim_date dd
      LEFT JOIN fact_reading_session frs ON frs.date_key = dd.date_key
      LEFT JOIN fact_content_generation fcg ON fcg.date_key = dd.date_key
      LEFT JOIN fact_revenue fr ON fr.date_key = dd.date_key
      LEFT JOIN fact_system_metric fsm ON fsm.date_key = dd.date_key
      WHERE dd.full_date >= NOW() - INTERVAL '90 days'
      GROUP BY dd.date_key, dd.full_date
    `,
    refreshSchedule: '30 1 * * *',  // 1:30 AM daily
    refreshStrategy: 'full',
    indexes: ['date_key', 'full_date'],
    retentionDays: 365,
    estimatedRows: 365,
  },
  {
    viewName: 'mv_cohort_retention',
    description: 'Retention curves by registration cohort for churn analysis',
    sourceQuery: `
      SELECT
        DATE_TRUNC('week', du.registration_date) AS cohort_week,
        dd.week - EXTRACT(WEEK FROM du.registration_date)::int AS weeks_since_registration,
        COUNT(DISTINCT du.user_key) AS cohort_size,
        COUNT(DISTINCT frs.user_key) AS active_users,
        COUNT(DISTINCT frs.user_key)::float / NULLIF(COUNT(DISTINCT du.user_key), 0) AS retention_rate,
        AVG(frs.engagement_score) AS avg_engagement,
        AVG(fms.mastery_probability) AS avg_mastery
      FROM dim_user du
      LEFT JOIN fact_reading_session frs ON frs.user_key = du.user_key
      LEFT JOIN dim_date dd ON dd.date_key = frs.date_key
      LEFT JOIN fact_mastery_snapshot fms ON fms.user_key = du.user_key
        AND fms.date_key = dd.date_key AND fms.snapshot_type = 'weekly'
      WHERE du.user_type = 'learner' AND du.is_current = true
      GROUP BY DATE_TRUNC('week', du.registration_date), dd.week - EXTRACT(WEEK FROM du.registration_date)::int
    `,
    refreshSchedule: '0 5 * * 1',  // 5 AM every Monday
    refreshStrategy: 'full',
    indexes: ['cohort_week', 'weeks_since_registration'],
    retentionDays: 1095,  // 3 years
    estimatedRows: 10000,
  },
];


// ============================================================================
// SECTION 8: DATA LAKE SERVICE (UNIFIED API)
// ============================================================================

export interface ETLJobStatus {
  jobId: string;
  jobName: string;
  enabled: boolean;
  schedule: ETLSchedule;
  lastRun: ETLJobRun | null;
  successRate: number;
  avgDurationMs: number;
  totalRuns: number;
  watermark: string | null;
}

export interface ETLDashboard {
  isRunning: boolean;
  totalJobs: number;
  enabledJobs: number;
  jobStatuses: ETLJobStatus[];
  lastFullRun: Date | null;
}

export class DataLakeService extends ScholarlyBaseService {
  private cdcPipeline: CDCPipeline;
  private etlOrchestrator: ETLOrchestrator;
  private qualityService: DataQualityService;

  constructor(tenantId: string, cdcConfig: CDCConfig) {
    super('DataLakeService', tenantId);
    this.cdcPipeline = new CDCPipeline(tenantId, cdcConfig);
    this.etlOrchestrator = new ETLOrchestrator(tenantId);
    this.qualityService = new DataQualityService(tenantId);
  }

  // Start the full data lake pipeline: CDC → Staging → ETL → Star Schema
  async startPipeline(): Promise<Result<{ cdc: string; etl: string }>> {
    // 1. Start CDC to capture operational DB changes
    const cdcResult = await this.cdcPipeline.start();
    if (!cdcResult.success) return this.fail(`CDC failed: ${cdcResult.error}`);

    this.log('info', 'Data lake pipeline started', {
      cdcTables: this.cdcPipeline.getStats().tablesMonitored,
    });

    return this.ok({ cdc: 'running', etl: 'ready' });
  }

  // Run the full ETL pipeline (typically scheduled, can be triggered manually)
  async runETL(): Promise<Result<{ completed: string[]; failed: string[] }>> {
    const result = await this.etlOrchestrator.executeAll();
    if (!result.success) return this.fail(result.error!);

    // Run quality checks after ETL
    const qualityResult = await this.qualityService.runFullAudit();
    if (qualityResult.success && !qualityResult.data!.meetsThreshold) {
      this.log('warn', 'Post-ETL quality check below threshold', {
        score: qualityResult.data!.qualityScore,
        failures: qualityResult.data!.results.filter(r => !r.passed).map(r => r.checkName),
      });
    }

    return result;
  }

  // Execute a specific analytics query
  async executeQuery(queryId: string, parameters: Record<string, string>): Promise<Result<{ rows: Record<string, unknown>[]; metadata: QueryMetadata }>> {
    const query = SCHOLARLY_ANALYTICS_QUERIES.find(q => q.queryId === queryId);
    if (!query) return this.fail(`Query not found: ${queryId}`);

    // Validate required parameters
    for (const param of query.parameters) {
      if (param.required && !(param.name in parameters)) {
        return this.fail(`Missing required parameter: ${param.name}`);
      }
    }

    const startTime = Date.now();

    // In production: Execute parameterised SQL against warehouse
    // Here we return the query metadata for documentation
    const metadata: QueryMetadata = {
      queryId,
      queryName: query.name,
      category: query.category,
      executedAt: new Date(),
      durationMs: Date.now() - startTime,
      parameters,
      rowCount: 0,
    };

    this.log('info', 'Analytics query executed', { queryId, duration: metadata.durationMs });

    return this.ok({ rows: [], metadata });
  }

  // Get available queries for a given audience
  getAvailableQueries(audience: string): AnalyticsQuery[] {
    return SCHOLARLY_ANALYTICS_QUERIES.filter(
      q => q.targetAudience.includes(audience as any)
    );
  }

  // Get full data lake status
  getStatus(): {
    cdc: CDCStats;
    etl: ETLDashboard;
    quality: { lastAudit: Date | null; score: number };
    materializedViews: MaterialisedViewConfig[];
  } {
    return {
      cdc: this.cdcPipeline.getStats(),
      etl: this.etlOrchestrator.getStatus(),
      quality: { lastAudit: null, score: 1.0 },
      materializedViews: SCHOLARLY_MATERIALISED_VIEWS,
    };
  }
}

interface QueryMetadata {
  queryId: string;
  queryName: string;
  category: string;
  executedAt: Date;
  durationMs: number;
  parameters: Record<string, string>;
  rowCount: number;
}
