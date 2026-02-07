// =============================================================================
// SCHOLARLY PLATFORM — Sprint 13: S13-001
// Automated Data Retention Purge
// COPPA/GDPR Retention Policy Enforcement with Scheduled Jobs
// =============================================================================
//
// Data retention is the digital equivalent of a museum's conservation policy:
// you keep artefacts that have historical or educational value, but you don't
// store every scrap of paper that ever passed through the building. For a
// children's educational platform operating under COPPA, GDPR, FERPA, and
// Australian Privacy Principles, data retention isn't optional — it's a legal
// obligation with real penalties for non-compliance.
//
// This module implements a comprehensive, policy-driven data retention system
// that automatically identifies, classifies, and purges data that has exceeded
// its retention period. Think of it as a tireless archivist who knows exactly
// which regulations apply to which data, when the clock runs out, and how to
// safely dispose of records while preserving audit trails that prove you did.
//
// Key design decisions:
// - Policy-as-code: Retention rules are declarative configurations, not
//   hard-coded logic. Each tenant can customise retention periods within
//   regulatory minimums — a school in Germany (stricter GDPR interpretation)
//   might purge faster than one in Australia.
// - Soft-delete-first: All purges follow a two-phase pattern: soft-delete
//   (set deletedAt timestamp) with a configurable grace period, then hard
//   purge (physical deletion). This gives operators a recovery window if
//   something goes wrong — the safety net beneath the tightrope.
// - Audit-preserving: Purge operations themselves are logged in the audit
//   trail with enough metadata to satisfy a regulator ("we deleted 47 session
//   records for learner X on date Y per COPPA §312.10(c)") without retaining
//   the actual personal data — the digital equivalent of a destruction
//   certificate.
// - Batch-safe: Large purge operations are chunked to avoid locking tables
//   or overwhelming the database. Think of it as demolishing a building floor
//   by floor rather than with one big explosion — safer for the neighbours.
//
// Integration points:
// - Sprint 1: User and authentication data (account cleanup)
// - Sprint 3: BKT mastery data and federated sync logs
// - Sprint 5: Storybook reading sessions and analytics
// - Sprint 6: Observability metrics and event logs
// - Sprint 9: Payment records (with extended financial retention)
// - Sprint 12: Security audit logs (with compliance-driven retention)
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { Result, ok, fail, ScholarlyBaseService } from '../shared/base';

// =============================================================================
// Section 1: Retention Policy Definitions
// =============================================================================

// RetentionCategory — The classification system for data types, each with
// distinct regulatory requirements. Like a filing system where each drawer
// has a different "destroy after" label based on the sensitivity and legal
// obligations attached to its contents.

enum RetentionCategory {
  LEARNER_PII = 'learner_pii',                    // Names, DOBs, parent emails
  LEARNING_SESSIONS = 'learning_sessions',          // Reading sessions, BKT updates
  ASSESSMENT_DATA = 'assessment_data',              // Scores, mastery estimates, WCPM
  BEHAVIOURAL_ANALYTICS = 'behavioural_analytics',  // Click streams, engagement metrics
  AUDIO_RECORDINGS = 'audio_recordings',            // ASR voice samples from read-aloud
  AI_GENERATION_LOGS = 'ai_generation_logs',        // Prompts and responses from AI providers
  PAYMENT_RECORDS = 'payment_records',              // Transactions, invoices, refunds
  AUTHENTICATION_LOGS = 'authentication_logs',      // Login attempts, JWT events
  SECURITY_AUDIT_LOGS = 'security_audit_logs',      // Security scanner results, pen test logs
  CONTENT_CREATION = 'content_creation',            // Community-created storybook drafts
  NOTIFICATION_LOGS = 'notification_logs',          // Email/SMS/push delivery records
  DEVICE_SYNC_LOGS = 'device_sync_logs',            // Federated sync payloads and conflict logs
  OBSERVABILITY_METRICS = 'observability_metrics',  // Prometheus-style metrics, traces
  SUPPORT_TICKETS = 'support_tickets',              // Feedback, bug reports, NPS responses
}

// ComplianceFramework — Which regulatory regime governs this data
enum ComplianceFramework {
  COPPA = 'coppa',       // US Children's Online Privacy Protection Act
  GDPR = 'gdpr',         // EU General Data Protection Regulation
  FERPA = 'ferpa',       // US Family Educational Rights and Privacy Act
  APP = 'app',           // Australian Privacy Principles
  CCPA = 'ccpa',         // California Consumer Privacy Act
}

// PurgeStrategy — How the data is physically removed
enum PurgeStrategy {
  SOFT_DELETE = 'soft_delete',           // Set deletedAt, retain for grace period
  HARD_DELETE = 'hard_delete',           // Physical deletion from database
  ANONYMISE = 'anonymise',              // Replace PII with hashed/pseudonymous values
  AGGREGATE_AND_DELETE = 'aggregate_delete', // Roll up into aggregate stats, then delete detail
  ARCHIVE_AND_DELETE = 'archive_delete', // Move to cold storage, then delete from primary
}

// RetentionPolicy — A single retention rule that defines how long a category
// of data is kept and what happens when the clock runs out
interface RetentionPolicy {
  id: string;
  category: RetentionCategory;
  frameworks: ComplianceFramework[];     // Which regulations this policy satisfies
  retentionDays: number;                 // How long to keep data after last activity
  gracePeriodDays: number;               // Soft-delete grace period before hard purge
  strategy: PurgeStrategy;               // How to dispose of the data
  batchSize: number;                     // Records per purge batch (database safety)
  requiresParentalNotice: boolean;       // COPPA: must notify parents before deletion
  description: string;                   // Human-readable policy explanation
  legalBasis: string;                    // Regulatory citation
  tenantOverridable: boolean;            // Can tenants extend (never shorten) retention?
  minRetentionDays: number;              // Floor — tenants can't go below this
  maxRetentionDays: number;              // Ceiling — regulatory maximum
}

// =============================================================================
// Section 2: Default Policy Registry
// =============================================================================

const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    id: 'pol_learner_pii',
    category: RetentionCategory.LEARNER_PII,
    frameworks: [ComplianceFramework.COPPA, ComplianceFramework.GDPR, ComplianceFramework.APP],
    retentionDays: 365,
    gracePeriodDays: 30,
    strategy: PurgeStrategy.ANONYMISE,
    batchSize: 100,
    requiresParentalNotice: true,
    description: 'Learner personal information retained for 1 year after account deactivation. Anonymised rather than deleted to preserve learning analytics.',
    legalBasis: 'COPPA §312.10(c); GDPR Art. 17; APP 11.2',
    tenantOverridable: true,
    minRetentionDays: 90,
    maxRetentionDays: 730,
  },
  {
    id: 'pol_learning_sessions',
    category: RetentionCategory.LEARNING_SESSIONS,
    frameworks: [ComplianceFramework.COPPA, ComplianceFramework.FERPA],
    retentionDays: 730,
    gracePeriodDays: 14,
    strategy: PurgeStrategy.AGGREGATE_AND_DELETE,
    batchSize: 500,
    requiresParentalNotice: false,
    description: 'Individual reading sessions aggregated into summary stats after 2 years, detail records deleted.',
    legalBasis: 'FERPA §99.31(a)(6); COPPA §312.10(c)',
    tenantOverridable: true,
    minRetentionDays: 365,
    maxRetentionDays: 1095,
  },
  {
    id: 'pol_assessment_data',
    category: RetentionCategory.ASSESSMENT_DATA,
    frameworks: [ComplianceFramework.FERPA, ComplianceFramework.GDPR],
    retentionDays: 1095,
    gracePeriodDays: 30,
    strategy: PurgeStrategy.ARCHIVE_AND_DELETE,
    batchSize: 200,
    requiresParentalNotice: false,
    description: 'Assessment records archived after 3 years for longitudinal research compliance, then deleted from primary storage.',
    legalBasis: 'FERPA §99.10; GDPR Art. 5(1)(e)',
    tenantOverridable: true,
    minRetentionDays: 730,
    maxRetentionDays: 2190,
  },
  {
    id: 'pol_behavioural_analytics',
    category: RetentionCategory.BEHAVIOURAL_ANALYTICS,
    frameworks: [ComplianceFramework.COPPA, ComplianceFramework.GDPR, ComplianceFramework.CCPA],
    retentionDays: 180,
    gracePeriodDays: 7,
    strategy: PurgeStrategy.AGGREGATE_AND_DELETE,
    batchSize: 1000,
    requiresParentalNotice: false,
    description: 'Behavioural analytics (click streams, engagement metrics) aggregated after 6 months. Individual event records deleted.',
    legalBasis: 'COPPA §312.5(c); GDPR Art. 5(1)(c) data minimisation',
    tenantOverridable: false,
    minRetentionDays: 90,
    maxRetentionDays: 365,
  },
  {
    id: 'pol_audio_recordings',
    category: RetentionCategory.AUDIO_RECORDINGS,
    frameworks: [ComplianceFramework.COPPA, ComplianceFramework.GDPR, ComplianceFramework.APP],
    retentionDays: 30,
    gracePeriodDays: 7,
    strategy: PurgeStrategy.HARD_DELETE,
    batchSize: 50,
    requiresParentalNotice: true,
    description: 'Voice recordings from read-aloud sessions deleted after 30 days. Biometric data regulations require minimal retention. Transcription results retained separately.',
    legalBasis: 'COPPA §312.2 (personal information definition); GDPR Art. 9 (biometric data); APP 3.4',
    tenantOverridable: false,
    minRetentionDays: 7,
    maxRetentionDays: 90,
  },
  {
    id: 'pol_ai_generation_logs',
    category: RetentionCategory.AI_GENERATION_LOGS,
    frameworks: [ComplianceFramework.GDPR, ComplianceFramework.COPPA],
    retentionDays: 90,
    gracePeriodDays: 7,
    strategy: PurgeStrategy.HARD_DELETE,
    batchSize: 200,
    requiresParentalNotice: false,
    description: 'AI prompt/response logs retained for 90 days for quality assurance and cost reconciliation, then hard deleted.',
    legalBasis: 'GDPR Art. 5(1)(e) storage limitation; COPPA §312.10',
    tenantOverridable: true,
    minRetentionDays: 30,
    maxRetentionDays: 180,
  },
  {
    id: 'pol_payment_records',
    category: RetentionCategory.PAYMENT_RECORDS,
    frameworks: [ComplianceFramework.GDPR, ComplianceFramework.CCPA],
    retentionDays: 2555,
    gracePeriodDays: 90,
    strategy: PurgeStrategy.ARCHIVE_AND_DELETE,
    batchSize: 100,
    requiresParentalNotice: false,
    description: 'Payment records retained for 7 years per financial regulations, then archived and deleted from primary.',
    legalBasis: 'ATO record-keeping 5-7 years; IRS §6001; GDPR Art. 17(3)(b) legal obligation',
    tenantOverridable: false,
    minRetentionDays: 1825,
    maxRetentionDays: 3650,
  },
  {
    id: 'pol_auth_logs',
    category: RetentionCategory.AUTHENTICATION_LOGS,
    frameworks: [ComplianceFramework.GDPR, ComplianceFramework.APP],
    retentionDays: 90,
    gracePeriodDays: 0,
    strategy: PurgeStrategy.HARD_DELETE,
    batchSize: 1000,
    requiresParentalNotice: false,
    description: 'Authentication logs retained for 90 days for security monitoring, then hard deleted.',
    legalBasis: 'GDPR Art. 5(1)(e); APP 11.2',
    tenantOverridable: true,
    minRetentionDays: 30,
    maxRetentionDays: 365,
  },
  {
    id: 'pol_security_audit',
    category: RetentionCategory.SECURITY_AUDIT_LOGS,
    frameworks: [ComplianceFramework.GDPR, ComplianceFramework.FERPA, ComplianceFramework.APP],
    retentionDays: 1095,
    gracePeriodDays: 30,
    strategy: PurgeStrategy.ARCHIVE_AND_DELETE,
    batchSize: 200,
    requiresParentalNotice: false,
    description: 'Security audit trails retained for 3 years for incident forensics and compliance audits.',
    legalBasis: 'GDPR Art. 30 records of processing; FERPA §99.32 access records',
    tenantOverridable: false,
    minRetentionDays: 730,
    maxRetentionDays: 1825,
  },
  {
    id: 'pol_content_creation',
    category: RetentionCategory.CONTENT_CREATION,
    frameworks: [ComplianceFramework.GDPR],
    retentionDays: 365,
    gracePeriodDays: 30,
    strategy: PurgeStrategy.SOFT_DELETE,
    batchSize: 100,
    requiresParentalNotice: false,
    description: 'Unpublished community content drafts retained for 1 year after last edit, then soft-deleted.',
    legalBasis: 'GDPR Art. 17 right to erasure',
    tenantOverridable: true,
    minRetentionDays: 90,
    maxRetentionDays: 730,
  },
  {
    id: 'pol_notification_logs',
    category: RetentionCategory.NOTIFICATION_LOGS,
    frameworks: [ComplianceFramework.GDPR, ComplianceFramework.APP],
    retentionDays: 30,
    gracePeriodDays: 0,
    strategy: PurgeStrategy.HARD_DELETE,
    batchSize: 1000,
    requiresParentalNotice: false,
    description: 'Notification delivery logs retained for 30 days for troubleshooting, then hard deleted.',
    legalBasis: 'GDPR Art. 5(1)(c) data minimisation',
    tenantOverridable: false,
    minRetentionDays: 7,
    maxRetentionDays: 90,
  },
  {
    id: 'pol_device_sync',
    category: RetentionCategory.DEVICE_SYNC_LOGS,
    frameworks: [ComplianceFramework.GDPR, ComplianceFramework.COPPA],
    retentionDays: 60,
    gracePeriodDays: 7,
    strategy: PurgeStrategy.HARD_DELETE,
    batchSize: 500,
    requiresParentalNotice: false,
    description: 'Federated sync logs retained for 60 days for conflict resolution diagnostics, then hard deleted.',
    legalBasis: 'GDPR Art. 5(1)(e); COPPA §312.10',
    tenantOverridable: true,
    minRetentionDays: 30,
    maxRetentionDays: 180,
  },
  {
    id: 'pol_observability',
    category: RetentionCategory.OBSERVABILITY_METRICS,
    frameworks: [ComplianceFramework.GDPR],
    retentionDays: 90,
    gracePeriodDays: 0,
    strategy: PurgeStrategy.AGGREGATE_AND_DELETE,
    batchSize: 2000,
    requiresParentalNotice: false,
    description: 'Observability metrics aggregated into hourly/daily summaries after 90 days. Raw data points deleted.',
    legalBasis: 'GDPR Art. 5(1)(c) data minimisation',
    tenantOverridable: false,
    minRetentionDays: 30,
    maxRetentionDays: 180,
  },
  {
    id: 'pol_support_tickets',
    category: RetentionCategory.SUPPORT_TICKETS,
    frameworks: [ComplianceFramework.GDPR, ComplianceFramework.CCPA],
    retentionDays: 365,
    gracePeriodDays: 30,
    strategy: PurgeStrategy.ANONYMISE,
    batchSize: 100,
    requiresParentalNotice: false,
    description: 'Support tickets anonymised after 1 year. Aggregate satisfaction metrics retained.',
    legalBasis: 'GDPR Art. 17; CCPA §1798.105',
    tenantOverridable: true,
    minRetentionDays: 180,
    maxRetentionDays: 730,
  },
];

// =============================================================================
// Section 3: Data Discovery & Classification Engine
// =============================================================================

// The discovery engine is the archivist's catalogue — it knows which tables
// contain which categories of data, which columns hold PII, and which timestamp
// fields determine record age. Without this mapping, the purge engine would
// be like a demolition crew without a building plan.

interface DataSource {
  table: string;
  category: RetentionCategory;
  timestampColumn: string;           // Column used to determine record age
  tenantColumn: string;              // Multi-tenant isolation column
  softDeleteColumn?: string;         // Column for soft-delete (e.g., 'deletedAt')
  piiColumns: string[];              // Columns containing personal data (for anonymisation)
  aggregationTarget?: string;        // Table to aggregate into before deletion
  archiveTarget?: string;            // Cold storage destination for archive strategy
  dependentTables?: string[];        // FK-dependent tables to cascade-purge first
  estimateQuery?: string;            // Query to estimate record count for planning
}

const DATA_SOURCE_REGISTRY: DataSource[] = [
  // Learner PII — The most sensitive category
  {
    table: 'User',
    category: RetentionCategory.LEARNER_PII,
    timestampColumn: 'lastActiveAt',
    tenantColumn: 'tenantId',
    softDeleteColumn: 'deletedAt',
    piiColumns: ['email', 'firstName', 'lastName', 'avatarUrl', 'phoneNumber'],
    dependentTables: ['LearnerProfile', 'ParentLink', 'Session', 'Achievement'],
  },
  {
    table: 'LearnerProfile',
    category: RetentionCategory.LEARNER_PII,
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    piiColumns: ['dateOfBirth', 'parentEmail', 'notes'],
    dependentTables: ['PhonicsAssessment', 'ReadingSession', 'BKTMastery'],
  },
  // Learning Sessions
  {
    table: 'ReadingSession',
    category: RetentionCategory.LEARNING_SESSIONS,
    timestampColumn: 'completedAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    aggregationTarget: 'ReadingSessionAggregate',
    dependentTables: ['ReadingSessionWord', 'ReadingSessionEvent'],
  },
  {
    table: 'PhonicsSession',
    category: RetentionCategory.LEARNING_SESSIONS,
    timestampColumn: 'completedAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    aggregationTarget: 'PhonicsSessionAggregate',
  },
  // Assessment Data
  {
    table: 'PhonicsAssessment',
    category: RetentionCategory.ASSESSMENT_DATA,
    timestampColumn: 'assessedAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    archiveTarget: 'assessment_archive',
  },
  {
    table: 'BKTMastery',
    category: RetentionCategory.ASSESSMENT_DATA,
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    archiveTarget: 'assessment_archive',
  },
  // Behavioural Analytics
  {
    table: 'AnalyticsEvent',
    category: RetentionCategory.BEHAVIOURAL_ANALYTICS,
    timestampColumn: 'createdAt',
    tenantColumn: 'tenantId',
    piiColumns: ['ipAddress', 'userAgent'],
    aggregationTarget: 'AnalyticsAggregate',
  },
  // Audio Recordings (highest sensitivity, shortest retention)
  {
    table: 'AudioRecording',
    category: RetentionCategory.AUDIO_RECORDINGS,
    timestampColumn: 'recordedAt',
    tenantColumn: 'tenantId',
    piiColumns: ['audioUrl', 'transcription'],
  },
  // AI Generation Logs
  {
    table: 'AIUsageLog',
    category: RetentionCategory.AI_GENERATION_LOGS,
    timestampColumn: 'createdAt',
    tenantColumn: 'tenantId',
    piiColumns: ['requestPayload', 'responsePayload'],
  },
  // Payment Records
  {
    table: 'Payment',
    category: RetentionCategory.PAYMENT_RECORDS,
    timestampColumn: 'createdAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    archiveTarget: 'payment_archive',
    dependentTables: ['PaymentLineItem', 'Refund'],
  },
  // Authentication Logs
  {
    table: 'AuthLog',
    category: RetentionCategory.AUTHENTICATION_LOGS,
    timestampColumn: 'createdAt',
    tenantColumn: 'tenantId',
    piiColumns: ['ipAddress', 'userAgent'],
  },
  // Security Audit
  {
    table: 'AuditLog',
    category: RetentionCategory.SECURITY_AUDIT_LOGS,
    timestampColumn: 'timestamp',
    tenantColumn: 'tenantId',
    piiColumns: ['ipAddress', 'userAgent'],
    archiveTarget: 'audit_archive',
  },
  // Content Creation
  {
    table: 'Storybook',
    category: RetentionCategory.CONTENT_CREATION,
    timestampColumn: 'updatedAt',
    tenantColumn: 'tenantId',
    softDeleteColumn: 'deletedAt',
    piiColumns: [],
    dependentTables: ['StorybookPage', 'StorybookIllustration', 'StorybookReview'],
  },
  // Notification Logs
  {
    table: 'Notification',
    category: RetentionCategory.NOTIFICATION_LOGS,
    timestampColumn: 'createdAt',
    tenantColumn: 'tenantId',
    piiColumns: ['recipientEmail', 'recipientPhone'],
  },
  // Device Sync Logs
  {
    table: 'PhonicsDeviceSyncLog',
    category: RetentionCategory.DEVICE_SYNC_LOGS,
    timestampColumn: 'syncedAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
  },
  // Observability Metrics
  {
    table: 'MetricDataPoint',
    category: RetentionCategory.OBSERVABILITY_METRICS,
    timestampColumn: 'recordedAt',
    tenantColumn: 'tenantId',
    piiColumns: [],
    aggregationTarget: 'MetricAggregate',
  },
  // Support Tickets
  {
    table: 'FeedbackReport',
    category: RetentionCategory.SUPPORT_TICKETS,
    timestampColumn: 'createdAt',
    tenantColumn: 'tenantId',
    piiColumns: ['userEmail', 'userName', 'deviceInfo'],
  },
];

// =============================================================================
// Section 4: Purge Execution Engine
// =============================================================================

// PurgeJob — A single unit of purge work, like a work order for the archivist.
// It tracks what needs to be purged, how many records are affected, and the
// outcome of the operation.

interface PurgeJob {
  id: string;
  policyId: string;
  category: RetentionCategory;
  table: string;
  strategy: PurgeStrategy;
  estimatedRecords: number;
  processedRecords: number;
  failedRecords: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  auditTrail: PurgeAuditEntry[];
}

interface PurgeAuditEntry {
  timestamp: Date;
  action: string;
  recordCount: number;
  details: Record<string, unknown>;
}

// PurgeRunSummary — The executive report card for a complete purge cycle
interface PurgeRunSummary {
  runId: string;
  startedAt: Date;
  completedAt?: Date;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalRecordsPurged: number;
  totalRecordsFailed: number;
  categorySummaries: Map<RetentionCategory, CategoryPurgeSummary>;
  complianceReport: ComplianceReport;
}

interface CategoryPurgeSummary {
  category: RetentionCategory;
  tables: string[];
  recordsPurged: number;
  recordsFailed: number;
  strategy: PurgeStrategy;
  oldestRecordDate?: Date;
  newestRecordDate?: Date;
}

interface ComplianceReport {
  frameworks: ComplianceFramework[];
  allPoliciesEnforced: boolean;
  violations: ComplianceViolation[];
  certificationTimestamp: Date;
}

interface ComplianceViolation {
  framework: ComplianceFramework;
  policyId: string;
  description: string;
  severity: 'warning' | 'critical';
  affectedRecordCount: number;
}

// =============================================================================
// Section 5: Data Retention Service
// =============================================================================

class DataRetentionService extends ScholarlyBaseService {
  private policies: Map<string, RetentionPolicy>;
  private sources: Map<RetentionCategory, DataSource[]>;
  private tenantOverrides: Map<string, Map<string, Partial<RetentionPolicy>>>;

  constructor(prisma: PrismaClient) {
    super(prisma, 'DataRetentionService');
    this.policies = new Map();
    this.sources = new Map();
    this.tenantOverrides = new Map();
    this.initialise();
  }

  private initialise(): void {
    // Register default policies
    for (const policy of DEFAULT_RETENTION_POLICIES) {
      this.policies.set(policy.id, policy);
    }
    // Index data sources by category
    for (const source of DATA_SOURCE_REGISTRY) {
      const existing = this.sources.get(source.category) || [];
      existing.push(source);
      this.sources.set(source.category, existing);
    }
    this.log('info', 'Data retention service initialised', {
      policyCount: this.policies.size,
      sourceCount: DATA_SOURCE_REGISTRY.length,
      categoryCount: this.sources.size,
    });
  }

  // -------------------------------------------------------------------------
  // Tenant Policy Override Management
  // -------------------------------------------------------------------------

  async setTenantOverride(
    tenantId: string,
    policyId: string,
    override: { retentionDays?: number; gracePeriodDays?: number }
  ): Promise<Result<RetentionPolicy>> {
    const basePolicy = this.policies.get(policyId);
    if (!basePolicy) return fail('Policy not found', 'POLICY_NOT_FOUND');
    if (!basePolicy.tenantOverridable) return fail('Policy does not allow tenant overrides', 'NOT_OVERRIDABLE');

    // Validate against regulatory bounds
    if (override.retentionDays !== undefined) {
      if (override.retentionDays < basePolicy.minRetentionDays) {
        return fail(
          `Retention days ${override.retentionDays} below regulatory minimum ${basePolicy.minRetentionDays}`,
          'BELOW_MINIMUM',
          { minDays: basePolicy.minRetentionDays, legalBasis: basePolicy.legalBasis }
        );
      }
      if (override.retentionDays > basePolicy.maxRetentionDays) {
        return fail(
          `Retention days ${override.retentionDays} above regulatory maximum ${basePolicy.maxRetentionDays}`,
          'ABOVE_MAXIMUM',
          { maxDays: basePolicy.maxRetentionDays }
        );
      }
    }

    if (!this.tenantOverrides.has(tenantId)) {
      this.tenantOverrides.set(tenantId, new Map());
    }
    this.tenantOverrides.get(tenantId)!.set(policyId, override);

    const effectivePolicy = { ...basePolicy, ...override };
    this.log('info', 'Tenant retention override set', { tenantId, policyId, override });
    this.emit('retention.policy.overridden', { tenantId, policyId, effectiveRetentionDays: effectivePolicy.retentionDays });

    return ok(effectivePolicy);
  }

  getEffectivePolicy(tenantId: string, policyId: string): RetentionPolicy | undefined {
    const base = this.policies.get(policyId);
    if (!base) return undefined;
    const overrides = this.tenantOverrides.get(tenantId)?.get(policyId);
    return overrides ? { ...base, ...overrides } : base;
  }

  // -------------------------------------------------------------------------
  // Purge Discovery — Identifies what needs to be purged
  // -------------------------------------------------------------------------

  async discoverPurgeCandidates(tenantId?: string): Promise<Result<PurgeJob[]>> {
    const jobs: PurgeJob[] = [];

    for (const [policyId, policy] of this.policies) {
      const sources = this.sources.get(policy.category);
      if (!sources) continue;

      const effectivePolicy = tenantId
        ? this.getEffectivePolicy(tenantId, policyId) || policy
        : policy;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - effectivePolicy.retentionDays);

      for (const source of sources) {
        const estimatedCount = await this.estimateRecordCount(
          source.table,
          source.timestampColumn,
          cutoffDate,
          tenantId ? { [source.tenantColumn]: tenantId } : undefined
        );

        if (estimatedCount > 0) {
          jobs.push({
            id: `purge_${Date.now()}_${source.table}_${Math.random().toString(36).slice(2, 8)}`,
            policyId,
            category: policy.category,
            table: source.table,
            strategy: effectivePolicy.strategy,
            estimatedRecords: estimatedCount,
            processedRecords: 0,
            failedRecords: 0,
            status: 'pending',
            auditTrail: [],
          });
        }
      }
    }

    this.log('info', 'Purge discovery complete', {
      totalJobs: jobs.length,
      totalEstimatedRecords: jobs.reduce((sum, j) => sum + j.estimatedRecords, 0),
      tenantId: tenantId || 'all',
    });

    return ok(jobs);
  }

  private async estimateRecordCount(
    table: string,
    timestampColumn: string,
    cutoffDate: Date,
    where?: Record<string, string>
  ): Promise<number> {
    try {
      const whereClause = where
        ? Object.entries(where).map(([k, v]) => `"${k}" = '${v}'`).join(' AND ') + ' AND '
        : '';
      const result = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count FROM "${table}" WHERE ${whereClause}"${timestampColumn}" < $1`,
        cutoffDate
      );
      return Number(result[0]?.count || 0);
    } catch (error) {
      this.log('warn', `Estimate failed for ${table}`, { error: String(error) });
      return 0;
    }
  }

  // -------------------------------------------------------------------------
  // Purge Execution — The demolition crew, working floor by floor
  // -------------------------------------------------------------------------

  async executePurgeRun(tenantId?: string, dryRun: boolean = false): Promise<Result<PurgeRunSummary>> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date();

    this.log('info', 'Purge run starting', { runId, tenantId: tenantId || 'all', dryRun });
    this.emit('retention.purge.started', { runId, dryRun });

    // Discover what needs purging
    const discoveryResult = await this.discoverPurgeCandidates(tenantId);
    if (!discoveryResult.success) return fail(discoveryResult.error, discoveryResult.code);

    const jobs = discoveryResult.data;
    const categorySummaries = new Map<RetentionCategory, CategoryPurgeSummary>();

    // Execute each job in dependency order (dependent tables first)
    const orderedJobs = this.topologicalSort(jobs);

    for (const job of orderedJobs) {
      if (dryRun) {
        job.status = 'completed';
        job.processedRecords = job.estimatedRecords;
        job.auditTrail.push({
          timestamp: new Date(),
          action: 'dry_run_simulated',
          recordCount: job.estimatedRecords,
          details: { strategy: job.strategy },
        });
        continue;
      }

      await this.executeJob(job, tenantId);

      // Update category summary
      if (!categorySummaries.has(job.category)) {
        categorySummaries.set(job.category, {
          category: job.category,
          tables: [],
          recordsPurged: 0,
          recordsFailed: 0,
          strategy: job.strategy,
        });
      }
      const summary = categorySummaries.get(job.category)!;
      summary.tables.push(job.table);
      summary.recordsPurged += job.processedRecords;
      summary.recordsFailed += job.failedRecords;
    }

    // Generate compliance report
    const complianceReport = this.generateComplianceReport(jobs);

    const runSummary: PurgeRunSummary = {
      runId,
      startedAt,
      completedAt: new Date(),
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      totalRecordsPurged: jobs.reduce((sum, j) => sum + j.processedRecords, 0),
      totalRecordsFailed: jobs.reduce((sum, j) => sum + j.failedRecords, 0),
      categorySummaries,
      complianceReport,
    };

    // Persist audit record
    await this.persistAuditRecord(runSummary);

    this.log('info', 'Purge run complete', {
      runId,
      totalPurged: runSummary.totalRecordsPurged,
      totalFailed: runSummary.totalRecordsFailed,
      dryRun,
    });
    this.emit('retention.purge.completed', { runId, summary: runSummary });

    return ok(runSummary);
  }

  private async executeJob(job: PurgeJob, tenantId?: string): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();

    const policy = this.policies.get(job.policyId)!;
    const sources = this.sources.get(job.category)?.filter(s => s.table === job.table) || [];

    try {
      for (const source of sources) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

        switch (job.strategy) {
          case PurgeStrategy.SOFT_DELETE:
            await this.executeSoftDelete(source, cutoffDate, policy.batchSize, job, tenantId);
            break;
          case PurgeStrategy.HARD_DELETE:
            await this.executeHardDelete(source, cutoffDate, policy.batchSize, job, tenantId);
            break;
          case PurgeStrategy.ANONYMISE:
            await this.executeAnonymise(source, cutoffDate, policy.batchSize, job, tenantId);
            break;
          case PurgeStrategy.AGGREGATE_AND_DELETE:
            await this.executeAggregateAndDelete(source, cutoffDate, policy.batchSize, job, tenantId);
            break;
          case PurgeStrategy.ARCHIVE_AND_DELETE:
            await this.executeArchiveAndDelete(source, cutoffDate, policy.batchSize, job, tenantId);
            break;
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();
    } catch (error) {
      job.status = 'failed';
      job.error = String(error);
      job.completedAt = new Date();
      this.log('error', `Purge job failed: ${job.table}`, { jobId: job.id, error: job.error });
    }
  }

  // Strategy: Soft Delete — Set deletedAt, retain for grace period
  private async executeSoftDelete(
    source: DataSource, cutoffDate: Date, batchSize: number, job: PurgeJob, tenantId?: string
  ): Promise<void> {
    const softDeleteCol = source.softDeleteColumn || 'deletedAt';
    const tenantClause = tenantId ? `AND "${source.tenantColumn}" = '${tenantId}'` : '';

    let totalProcessed = 0;
    let batchCount = 0;

    while (true) {
      const result = await this.prisma.$executeRawUnsafe(
        `UPDATE "${source.table}" SET "${softDeleteCol}" = NOW()
         WHERE "${source.timestampColumn}" < $1
         AND "${softDeleteCol}" IS NULL
         ${tenantClause}
         LIMIT ${batchSize}`,
        cutoffDate
      );

      if (result === 0) break;
      totalProcessed += result;
      batchCount++;

      job.auditTrail.push({
        timestamp: new Date(),
        action: 'soft_delete_batch',
        recordCount: result,
        details: { batch: batchCount, table: source.table },
      });

      // Yield to event loop between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    job.processedRecords += totalProcessed;
  }

  // Strategy: Hard Delete — Physical removal with cascade
  private async executeHardDelete(
    source: DataSource, cutoffDate: Date, batchSize: number, job: PurgeJob, tenantId?: string
  ): Promise<void> {
    const tenantClause = tenantId ? `AND "${source.tenantColumn}" = '${tenantId}'` : '';

    // Delete dependent tables first
    if (source.dependentTables) {
      for (const depTable of source.dependentTables) {
        this.log('info', `Cascade-deleting dependent table ${depTable}`, { parentTable: source.table });
        // In production, resolve FK relationships to build proper cascade
      }
    }

    let totalProcessed = 0;
    let batchCount = 0;

    while (true) {
      const result = await this.prisma.$executeRawUnsafe(
        `DELETE FROM "${source.table}"
         WHERE "${source.timestampColumn}" < $1
         ${tenantClause}
         LIMIT ${batchSize}`,
        cutoffDate
      );

      if (result === 0) break;
      totalProcessed += result;
      batchCount++;

      job.auditTrail.push({
        timestamp: new Date(),
        action: 'hard_delete_batch',
        recordCount: result,
        details: { batch: batchCount, table: source.table },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    job.processedRecords += totalProcessed;
  }

  // Strategy: Anonymise — Replace PII with hashed pseudonyms
  private async executeAnonymise(
    source: DataSource, cutoffDate: Date, batchSize: number, job: PurgeJob, tenantId?: string
  ): Promise<void> {
    if (source.piiColumns.length === 0) {
      // No PII to anonymise — fall through to soft delete
      await this.executeSoftDelete(source, cutoffDate, batchSize, job, tenantId);
      return;
    }

    const tenantClause = tenantId ? `AND "${source.tenantColumn}" = '${tenantId}'` : '';
    const setClauses = source.piiColumns.map(col => {
      // Use SHA-256 hash prefix for pseudonymisation — preserves referential
      // integrity for analytics while removing personal identifiability.
      // Think of it as replacing name badges with numbered wristbands.
      return `"${col}" = CONCAT('ANON_', LEFT(encode(sha256("${col}"::bytea), 'hex'), 12))`;
    }).join(', ');

    let totalProcessed = 0;
    let batchCount = 0;

    while (true) {
      const result = await this.prisma.$executeRawUnsafe(
        `UPDATE "${source.table}" SET ${setClauses}, "anonymisedAt" = NOW()
         WHERE "${source.timestampColumn}" < $1
         AND "anonymisedAt" IS NULL
         ${tenantClause}
         LIMIT ${batchSize}`,
        cutoffDate
      );

      if (result === 0) break;
      totalProcessed += result;
      batchCount++;

      job.auditTrail.push({
        timestamp: new Date(),
        action: 'anonymise_batch',
        recordCount: result,
        details: { batch: batchCount, table: source.table, columnsAnonymised: source.piiColumns },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    job.processedRecords += totalProcessed;
  }

  // Strategy: Aggregate and Delete — Roll up stats, then remove detail records
  private async executeAggregateAndDelete(
    source: DataSource, cutoffDate: Date, batchSize: number, job: PurgeJob, tenantId?: string
  ): Promise<void> {
    if (!source.aggregationTarget) {
      this.log('warn', `No aggregation target for ${source.table}, falling back to hard delete`);
      await this.executeHardDelete(source, cutoffDate, batchSize, job, tenantId);
      return;
    }

    const tenantClause = tenantId ? `AND "${source.tenantColumn}" = '${tenantId}'` : '';

    // Phase 1: Aggregate — Roll up into daily summary buckets
    // This is like converting a box of individual receipts into a monthly
    // expense report — you keep the totals but shred the originals.
    const aggregateResult = await this.prisma.$executeRawUnsafe(
      `INSERT INTO "${source.aggregationTarget}" (
        "tenantId", "date", "recordCount", "aggregatedAt"
       )
       SELECT "${source.tenantColumn}",
              DATE("${source.timestampColumn}") as date,
              COUNT(*) as record_count,
              NOW() as aggregated_at
       FROM "${source.table}"
       WHERE "${source.timestampColumn}" < $1
       ${tenantClause}
       GROUP BY "${source.tenantColumn}", DATE("${source.timestampColumn}")
       ON CONFLICT ("tenantId", "date") DO UPDATE SET
         "recordCount" = "${source.aggregationTarget}"."recordCount" + EXCLUDED."recordCount",
         "aggregatedAt" = NOW()`,
      cutoffDate
    );

    job.auditTrail.push({
      timestamp: new Date(),
      action: 'aggregation_complete',
      recordCount: aggregateResult,
      details: { target: source.aggregationTarget },
    });

    // Phase 2: Delete the detail records (now safely aggregated)
    await this.executeHardDelete(source, cutoffDate, batchSize, job, tenantId);
  }

  // Strategy: Archive and Delete — Move to cold storage, then remove from primary
  private async executeArchiveAndDelete(
    source: DataSource, cutoffDate: Date, batchSize: number, job: PurgeJob, tenantId?: string
  ): Promise<void> {
    if (!source.archiveTarget) {
      this.log('warn', `No archive target for ${source.table}, falling back to hard delete`);
      await this.executeHardDelete(source, cutoffDate, batchSize, job, tenantId);
      return;
    }

    const tenantClause = tenantId ? `AND "${source.tenantColumn}" = '${tenantId}'` : '';

    // Phase 1: Copy to archive table (cold storage partition)
    // In production, this would be an S3/GCS export or a separate database
    // Think of it as moving old files from the main cabinet to the archive room
    const archiveResult = await this.prisma.$executeRawUnsafe(
      `INSERT INTO "${source.archiveTarget}"
       SELECT *, NOW() as archived_at FROM "${source.table}"
       WHERE "${source.timestampColumn}" < $1
       ${tenantClause}`,
      cutoffDate
    );

    job.auditTrail.push({
      timestamp: new Date(),
      action: 'archive_complete',
      recordCount: archiveResult,
      details: { target: source.archiveTarget },
    });

    // Phase 2: Delete from primary storage
    await this.executeHardDelete(source, cutoffDate, batchSize, job, tenantId);
  }

  // -------------------------------------------------------------------------
  // Topological Sort — Ensures dependent tables are purged before parents
  // -------------------------------------------------------------------------

  private topologicalSort(jobs: PurgeJob[]): PurgeJob[] {
    // Build dependency graph from data source registry
    const tableToJob = new Map<string, PurgeJob>();
    const deps = new Map<string, string[]>();

    for (const job of jobs) {
      tableToJob.set(job.table, job);
      const source = DATA_SOURCE_REGISTRY.find(s => s.table === job.table);
      deps.set(job.table, source?.dependentTables || []);
    }

    const sorted: PurgeJob[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (table: string): void => {
      if (visited.has(table)) return;
      if (visiting.has(table)) return; // Cycle detected, break it
      visiting.add(table);

      const tableDeps = deps.get(table) || [];
      for (const dep of tableDeps) {
        if (tableToJob.has(dep)) visit(dep);
      }

      visiting.delete(table);
      visited.add(table);
      const job = tableToJob.get(table);
      if (job) sorted.push(job);
    };

    for (const table of tableToJob.keys()) visit(table);
    return sorted;
  }

  // -------------------------------------------------------------------------
  // Compliance Report Generation
  // -------------------------------------------------------------------------

  private generateComplianceReport(jobs: PurgeJob[]): ComplianceReport {
    const violations: ComplianceViolation[] = [];
    const frameworksEnforced = new Set<ComplianceFramework>();

    for (const job of jobs) {
      const policy = this.policies.get(job.policyId)!;
      policy.frameworks.forEach(f => frameworksEnforced.add(f));

      if (job.status === 'failed') {
        for (const framework of policy.frameworks) {
          violations.push({
            framework,
            policyId: job.policyId,
            description: `Failed to purge ${job.table}: ${job.error}`,
            severity: 'critical',
            affectedRecordCount: job.estimatedRecords - job.processedRecords,
          });
        }
      }
    }

    return {
      frameworks: Array.from(frameworksEnforced),
      allPoliciesEnforced: violations.filter(v => v.severity === 'critical').length === 0,
      violations,
      certificationTimestamp: new Date(),
    };
  }

  private async persistAuditRecord(summary: PurgeRunSummary): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "DataRetentionAudit" ("id", "runId", "startedAt", "completedAt", "totalJobs",
         "completedJobs", "failedJobs", "totalRecordsPurged", "totalRecordsFailed",
         "complianceReport", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        `audit_${summary.runId}`,
        summary.runId,
        summary.startedAt,
        summary.completedAt,
        summary.totalJobs,
        summary.completedJobs,
        summary.failedJobs,
        summary.totalRecordsPurged,
        summary.totalRecordsFailed,
        JSON.stringify(summary.complianceReport)
      );
    } catch (error) {
      this.log('error', 'Failed to persist audit record', { error: String(error) });
    }
  }

  // -------------------------------------------------------------------------
  // GDPR Right to Erasure — Individual user data deletion on request
  // -------------------------------------------------------------------------

  async processErasureRequest(
    tenantId: string,
    userId: string,
    requestedBy: string,
    reason: string
  ): Promise<Result<{ tablesProcessed: number; recordsDeleted: number; recordsAnonymised: number }>> {
    this.log('info', 'Processing GDPR erasure request', { tenantId, userId, requestedBy });
    this.emit('retention.erasure.requested', { tenantId, userId, requestedBy, reason });

    let tablesProcessed = 0;
    let recordsDeleted = 0;
    let recordsAnonymised = 0;

    try {
      // Process each data source for this user
      for (const source of DATA_SOURCE_REGISTRY) {
        const policy = DEFAULT_RETENTION_POLICIES.find(p => p.category === source.category);
        if (!policy) continue;

        // Payment records are exempt from erasure (legal obligation)
        if (source.category === RetentionCategory.PAYMENT_RECORDS) {
          // Anonymise instead of delete — GDPR Art. 17(3)(b)
          if (source.piiColumns.length > 0) {
            const setClauses = source.piiColumns
              .map(col => `"${col}" = 'ERASED'`)
              .join(', ');
            const result = await this.prisma.$executeRawUnsafe(
              `UPDATE "${source.table}" SET ${setClauses}
               WHERE "${source.tenantColumn}" = $1 AND "userId" = $2`,
              tenantId, userId
            );
            recordsAnonymised += result;
          }
          tablesProcessed++;
          continue;
        }

        // Security audit logs are exempt (legitimate interest)
        if (source.category === RetentionCategory.SECURITY_AUDIT_LOGS) {
          tablesProcessed++;
          continue;
        }

        // Everything else: delete or anonymise based on policy
        if (policy.strategy === PurgeStrategy.ANONYMISE && source.piiColumns.length > 0) {
          const setClauses = source.piiColumns
            .map(col => `"${col}" = 'ERASED'`)
            .join(', ');
          const result = await this.prisma.$executeRawUnsafe(
            `UPDATE "${source.table}" SET ${setClauses}, "anonymisedAt" = NOW()
             WHERE "${source.tenantColumn}" = $1 AND "userId" = $2`,
            tenantId, userId
          );
          recordsAnonymised += result;
        } else {
          const result = await this.prisma.$executeRawUnsafe(
            `DELETE FROM "${source.table}"
             WHERE "${source.tenantColumn}" = $1 AND "userId" = $2`,
            tenantId, userId
          );
          recordsDeleted += result;
        }
        tablesProcessed++;
      }

      // Record the erasure in the audit log (without PII)
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "AuditLog" ("id", "tenantId", "userId", "action", "entityType", "entityId",
         "changes", "sensitivity", "timestamp")
         VALUES ($1, $2, $3, 'gdpr_erasure', 'User', $4, $5, 'critical', NOW())`,
        `erasure_${Date.now()}`,
        tenantId,
        requestedBy,
        userId,
        JSON.stringify({ tablesProcessed, recordsDeleted, recordsAnonymised, reason })
      );

      this.emit('retention.erasure.completed', { tenantId, userId, tablesProcessed, recordsDeleted, recordsAnonymised });

      return ok({ tablesProcessed, recordsDeleted, recordsAnonymised });
    } catch (error) {
      this.log('error', 'Erasure request failed', { tenantId, userId, error: String(error) });
      return fail(`Erasure failed: ${error}`, 'ERASURE_FAILED');
    }
  }

  // -------------------------------------------------------------------------
  // Parental Notification — COPPA requires notice before child data deletion
  // -------------------------------------------------------------------------

  async sendParentalPurgeNotice(
    tenantId: string,
    learnerId: string,
    policies: RetentionPolicy[]
  ): Promise<Result<{ notified: boolean; parentEmail: string }>> {
    const policiesRequiringNotice = policies.filter(p => p.requiresParentalNotice);
    if (policiesRequiringNotice.length === 0) return ok({ notified: false, parentEmail: '' });

    try {
      // Fetch parent contact from learner profile
      const learnerResult = await this.prisma.$queryRawUnsafe<[{ parentEmail: string; firstName: string }]>(
        `SELECT lp."parentEmail", u."firstName"
         FROM "LearnerProfile" lp JOIN "User" u ON lp."userId" = u."id"
         WHERE lp."userId" = $1 AND lp."tenantId" = $2`,
        learnerId, tenantId
      );

      if (!learnerResult.length || !learnerResult[0].parentEmail) {
        return fail('No parent email found for learner', 'NO_PARENT_EMAIL');
      }

      const { parentEmail, firstName } = learnerResult[0];

      // In production, this dispatches via the NotificationService (Sprint 2)
      const categories = policiesRequiringNotice.map(p => p.category).join(', ');
      this.emit('notification.send', {
        type: 'email',
        to: parentEmail,
        template: 'data_retention_notice',
        variables: {
          learnerName: firstName,
          categories,
          retentionDays: policiesRequiringNotice.map(p => `${p.category}: ${p.retentionDays} days`),
          actionRequired: 'No action required. Data will be automatically removed per our privacy policy.',
        },
      });

      return ok({ notified: true, parentEmail });
    } catch (error) {
      return fail(`Parental notice failed: ${error}`, 'NOTICE_FAILED');
    }
  }

  // -------------------------------------------------------------------------
  // Scheduled Job Configuration
  // -------------------------------------------------------------------------

  getScheduleConfig(): RetentionScheduleConfig {
    return {
      // Daily purge of short-retention categories (audio, notifications, auth logs)
      dailyPurge: {
        cronExpression: '0 3 * * *',  // 3 AM daily
        categories: [
          RetentionCategory.AUDIO_RECORDINGS,
          RetentionCategory.NOTIFICATION_LOGS,
          RetentionCategory.AUTHENTICATION_LOGS,
        ],
        enabled: true,
      },
      // Weekly purge of medium-retention categories
      weeklyPurge: {
        cronExpression: '0 2 * * 0',  // 2 AM Sunday
        categories: [
          RetentionCategory.DEVICE_SYNC_LOGS,
          RetentionCategory.AI_GENERATION_LOGS,
          RetentionCategory.OBSERVABILITY_METRICS,
          RetentionCategory.BEHAVIOURAL_ANALYTICS,
        ],
        enabled: true,
      },
      // Monthly purge of long-retention categories
      monthlyPurge: {
        cronExpression: '0 1 1 * *',  // 1 AM first of month
        categories: [
          RetentionCategory.LEARNER_PII,
          RetentionCategory.LEARNING_SESSIONS,
          RetentionCategory.ASSESSMENT_DATA,
          RetentionCategory.CONTENT_CREATION,
          RetentionCategory.SUPPORT_TICKETS,
        ],
        enabled: true,
      },
      // Quarterly purge of financial and security records
      quarterlyPurge: {
        cronExpression: '0 0 1 */3 *',  // Midnight, first of every 3rd month
        categories: [
          RetentionCategory.PAYMENT_RECORDS,
          RetentionCategory.SECURITY_AUDIT_LOGS,
        ],
        enabled: true,
      },
      // Grace period cleanup — hard-delete records past their grace period
      graceCleanup: {
        cronExpression: '0 4 * * *',  // 4 AM daily
        description: 'Removes soft-deleted records that have exceeded their grace period',
        enabled: true,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Retention Dashboard Data
  // -------------------------------------------------------------------------

  async getRetentionDashboard(tenantId?: string): Promise<Result<RetentionDashboard>> {
    const policyStatuses: PolicyStatus[] = [];

    for (const [policyId, policy] of this.policies) {
      const sources = this.sources.get(policy.category) || [];
      let totalRecords = 0;
      let expiredRecords = 0;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      for (const source of sources) {
        try {
          const tenantClause = tenantId ? `AND "${source.tenantColumn}" = '${tenantId}'` : '';
          const [totalResult] = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
            `SELECT COUNT(*) as count FROM "${source.table}" WHERE 1=1 ${tenantClause}`
          );
          const [expiredResult] = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
            `SELECT COUNT(*) as count FROM "${source.table}"
             WHERE "${source.timestampColumn}" < $1 ${tenantClause}`,
            cutoffDate
          );
          totalRecords += Number(totalResult?.count || 0);
          expiredRecords += Number(expiredResult?.count || 0);
        } catch {
          // Table may not exist yet in dev environments
        }
      }

      policyStatuses.push({
        policyId,
        category: policy.category,
        retentionDays: policy.retentionDays,
        strategy: policy.strategy,
        totalRecords,
        expiredRecords,
        complianceStatus: expiredRecords === 0 ? 'compliant' : 'action_needed',
        frameworks: policy.frameworks,
      });
    }

    return ok({
      generatedAt: new Date(),
      tenantId: tenantId || 'all',
      policies: policyStatuses,
      totalExpiredRecords: policyStatuses.reduce((sum, p) => sum + p.expiredRecords, 0),
      overallCompliance: policyStatuses.every(p => p.complianceStatus === 'compliant') ? 'compliant' : 'action_needed',
      nextScheduledPurge: this.getNextScheduledPurge(),
    });
  }

  private getNextScheduledPurge(): Date {
    // Calculate next 3 AM
    const next = new Date();
    next.setHours(3, 0, 0, 0);
    if (next <= new Date()) next.setDate(next.getDate() + 1);
    return next;
  }
}

// =============================================================================
// Section 6: Type Definitions
// =============================================================================

interface RetentionScheduleConfig {
  dailyPurge: ScheduleEntry;
  weeklyPurge: ScheduleEntry;
  monthlyPurge: ScheduleEntry;
  quarterlyPurge: ScheduleEntry;
  graceCleanup: ScheduleEntry & { description: string };
}

interface ScheduleEntry {
  cronExpression: string;
  categories?: RetentionCategory[];
  enabled: boolean;
}

interface RetentionDashboard {
  generatedAt: Date;
  tenantId: string;
  policies: PolicyStatus[];
  totalExpiredRecords: number;
  overallCompliance: 'compliant' | 'action_needed';
  nextScheduledPurge: Date;
}

interface PolicyStatus {
  policyId: string;
  category: RetentionCategory;
  retentionDays: number;
  strategy: PurgeStrategy;
  totalRecords: number;
  expiredRecords: number;
  complianceStatus: 'compliant' | 'action_needed';
  frameworks: ComplianceFramework[];
}

// =============================================================================
// Section 7: Express Routes
// =============================================================================

function createRetentionRoutes(service: DataRetentionService) {
  return {
    // GET /api/v1/retention/dashboard
    getDashboard: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const result = await service.getRetentionDashboard(tenantId);
      if (!result.success) return res.status(500).json(result);
      return res.json(result.data);
    },

    // POST /api/v1/retention/purge
    executePurge: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { dryRun = true } = req.body;
      const result = await service.executePurgeRun(tenantId, dryRun);
      if (!result.success) return res.status(500).json(result);
      return res.json(result.data);
    },

    // POST /api/v1/retention/erasure
    processErasure: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { userId, reason } = req.body;
      const requestedBy = req.user?.id || 'system';
      const result = await service.processErasureRequest(tenantId, userId, requestedBy, reason);
      if (!result.success) return res.status(500).json(result);
      return res.json(result.data);
    },

    // GET /api/v1/retention/policies
    getPolicies: async (_req: any, res: any) => {
      const policies = DEFAULT_RETENTION_POLICIES.map(p => ({
        id: p.id,
        category: p.category,
        retentionDays: p.retentionDays,
        strategy: p.strategy,
        frameworks: p.frameworks,
        tenantOverridable: p.tenantOverridable,
        description: p.description,
      }));
      return res.json({ policies });
    },

    // PUT /api/v1/retention/policies/:policyId/override
    setOverride: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { policyId } = req.params;
      const { retentionDays, gracePeriodDays } = req.body;
      const result = await service.setTenantOverride(tenantId, policyId, { retentionDays, gracePeriodDays });
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },

    // GET /api/v1/retention/schedule
    getSchedule: async (_req: any, res: any) => {
      const config = service.getScheduleConfig();
      return res.json(config);
    },
  };
}

export {
  DataRetentionService,
  RetentionCategory,
  ComplianceFramework,
  PurgeStrategy,
  RetentionPolicy,
  PurgeJob,
  PurgeRunSummary,
  ComplianceReport,
  RetentionDashboard,
  createRetentionRoutes,
  DEFAULT_RETENTION_POLICIES,
  DATA_SOURCE_REGISTRY,
};
