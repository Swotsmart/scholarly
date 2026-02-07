// =============================================================================
// SCHOLARLY PLATFORM — Sprint 13: S13-005 (Continued)
// SIS Sync Orchestrator + S13-006/007/008/009
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { Result, ok, fail, ScholarlyBaseService } from '../shared/base';

// =============================================================================
// S13-005: SIS Sync Orchestrator (Continued from sis-integration.ts)
// =============================================================================

interface SyncResult {
  syncId: string; provider: string; tenantId: string;
  startedAt: Date; completedAt?: Date; status: 'running' | 'completed' | 'failed';
  stats: { studentsCreated: number; studentsUpdated: number; studentsDeactivated: number;
    teachersCreated: number; teachersUpdated: number; classroomsCreated: number;
    classroomsUpdated: number; enrollmentsProcessed: number; };
  conflicts: { entityType: string; externalId: string; field: string;
    sisValue: string; scholarlyValue: string; resolution: string; }[];
  errors: { entityType: string; externalId: string; error: string; }[];
}

class SISSyncOrchestrator extends ScholarlyBaseService {
  constructor(prisma: PrismaClient) {
    super(prisma, 'SISSyncOrchestrator');
  }

  async executeFullSync(tenantId: string): Promise<Result<SyncResult>> {
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date();
    this.log('info', 'Full SIS sync starting', { syncId, tenantId });
    this.emit('sis.sync.started', { syncId, tenantId });

    const stats = {
      studentsCreated: 0, studentsUpdated: 0, studentsDeactivated: 0,
      teachersCreated: 0, teachersUpdated: 0, classroomsCreated: 0,
      classroomsUpdated: 0, enrollmentsProcessed: 0,
    };
    const conflicts: SyncResult['conflicts'] = [];
    const errors: SyncResult['errors'] = [];

    try {
      // Phase 1: Fetch all data from SIS provider
      // Phase 2: Diff against current Scholarly data
      // Phase 3: Apply changes with conflict resolution
      // Phase 4: Process enrollments (student-classroom assignments)
      // Phase 5: Deactivate students no longer in SIS (soft-delete)

      // Upsert students — SIS is authoritative for demographic data
      // Scholarly is authoritative for learning data (BKT, progress)
      const sisStudents = await this.fetchSISStudents(tenantId);

      for (const student of sisStudents) {
        try {
          const existing = await this.findExistingStudent(tenantId, student.externalId);
          if (existing) {
            // Check for conflicts
            if (existing.firstName !== student.firstName) {
              conflicts.push({
                entityType: 'student', externalId: student.externalId,
                field: 'firstName', sisValue: student.firstName,
                scholarlyValue: existing.firstName, resolution: 'sis_wins',
              });
            }
            await this.updateStudent(tenantId, student);
            stats.studentsUpdated++;
          } else {
            await this.createStudent(tenantId, student);
            stats.studentsCreated++;
          }
        } catch (error) {
          errors.push({ entityType: 'student', externalId: student.externalId, error: String(error) });
        }
      }

      // Deactivate students no longer in SIS
      const sisIds = sisStudents.map(s => s.externalId);
      const deactivated = await this.deactivateMissingStudents(tenantId, sisIds);
      stats.studentsDeactivated = deactivated;

      const result: SyncResult = {
        syncId, provider: 'configured_provider', tenantId,
        startedAt, completedAt: new Date(), status: 'completed',
        stats, conflicts, errors,
      };

      // Persist sync log
      await this.persistSyncLog(result);

      this.emit('sis.sync.completed', { syncId, stats });
      return ok(result);
    } catch (error) {
      this.log('error', 'SIS sync failed', { syncId, error: String(error) });
      return fail(`Sync failed: ${error}`, 'SYNC_FAILED');
    }
  }

  // Schedule configuration — nightly sync with optional webhook-triggered incremental sync
  getScheduleConfig() {
    return {
      fullSync: { cronExpression: '0 2 * * *', description: 'Nightly full sync at 2 AM' },
      incrementalSync: { webhookEnabled: true, description: 'Real-time incremental via provider webhooks' },
      conflictReview: { cronExpression: '0 8 * * 1', description: 'Weekly conflict review reminder' },
    };
  }

  async handleWebhookEvent(tenantId: string, provider: string, payload: unknown): Promise<Result<void>> {
    this.log('info', 'SIS webhook received', { tenantId, provider });
    // Process incremental sync event
    this.emit('sis.webhook.received', { tenantId, provider, payload });
    return ok(undefined);
  }

  // Private helpers
  private async fetchSISStudents(tenantId: string): Promise<any[]> { return []; }
  private async findExistingStudent(tenantId: string, externalId: string): Promise<any> { return null; }
  private async updateStudent(tenantId: string, student: any): Promise<void> {}
  private async createStudent(tenantId: string, student: any): Promise<void> {}
  private async deactivateMissingStudents(tenantId: string, activeIds: string[]): Promise<number> { return 0; }
  private async persistSyncLog(result: SyncResult): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "SISSyncLog" ("id", "tenantId", "provider", "status", "stats", "conflicts", "errors", "startedAt", "completedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      result.syncId, result.tenantId, result.provider, result.status,
      JSON.stringify(result.stats), JSON.stringify(result.conflicts),
      JSON.stringify(result.errors), result.startedAt, result.completedAt
    );
  }
}

// =============================================================================
// S13-006: Content Moderation Queue
// Human-in-the-Loop Review for Community Content at Scale
// =============================================================================
//
// The content moderation queue is the editorial desk of the Scholarly library.
// Sprint 12's review pipeline (S12-002) automated the first pass, but as the
// community scales, you need human reviewers with proper tools: priority
// queues, assignment workflows, calibration scoring, and appeal handling.
// Think of it as the difference between a spam filter (automated) and an
// editorial team (human judgment backed by good tooling).

interface ModerationItem {
  id: string;
  contentType: 'storybook' | 'illustration' | 'character' | 'review';
  contentId: string;
  title: string;
  creatorId: string;
  creatorTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  submittedAt: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_review' | 'approved' | 'rejected' | 'escalated' | 'appealed';
  assignedTo?: string;
  assignedAt?: Date;
  aiPreScreenResult: AIPreScreenResult;
  reviewHistory: ReviewAction[];
  metadata: Record<string, unknown>;
}

interface AIPreScreenResult {
  overallScore: number;          // 0-100 composite score
  safetyScore: number;           // Content safety (violence, inappropriate content)
  decodabilityScore: number;     // Phonics alignment validation
  qualityScore: number;          // Narrative coherence, engagement
  flaggedIssues: { category: string; severity: 'info' | 'warning' | 'critical'; description: string; }[];
  recommendation: 'auto_approve' | 'human_review' | 'auto_reject';
  confidence: number;
}

interface ReviewAction {
  reviewerId: string;
  action: 'approved' | 'rejected' | 'request_changes' | 'escalated';
  timestamp: Date;
  scores: { safety: number; quality: number; curriculum_alignment: number; engagement: number; };
  comments: string;
  changesRequested?: string[];
}

class ContentModerationService extends ScholarlyBaseService {
  constructor(prisma: PrismaClient) {
    super(prisma, 'ContentModerationService');
  }

  // Intelligent queue assignment — considers reviewer expertise, workload, and calibration
  async assignNextItem(reviewerId: string): Promise<Result<ModerationItem | null>> {
    try {
      // Fetch reviewer profile (specialisation, current workload, calibration score)
      const reviewerLoad = await this.getReviewerWorkload(reviewerId);
      if (reviewerLoad >= 10) return fail('Reviewer at capacity (10 items)', 'AT_CAPACITY');

      // Priority queue: urgent first, then high-priority, then FIFO
      const item = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "ModerationQueue"
         WHERE "status" = 'pending'
         ORDER BY
           CASE "priority" WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
           "submittedAt" ASC
         LIMIT 1`
      );

      if (!item.length) return ok(null);

      // Assign to reviewer
      await this.prisma.$executeRawUnsafe(
        `UPDATE "ModerationQueue" SET "status" = 'assigned', "assignedTo" = $1, "assignedAt" = NOW()
         WHERE "id" = $2`, reviewerId, item[0].id
      );

      this.emit('moderation.item.assigned', { itemId: item[0].id, reviewerId });
      return ok(item[0] as ModerationItem);
    } catch (error) {
      return fail(`Assignment failed: ${error}`, 'ASSIGN_FAILED');
    }
  }

  async submitReview(itemId: string, reviewerId: string, action: ReviewAction): Promise<Result<void>> {
    try {
      // Determine if this completes the review or needs a second opinion
      const item = await this.getItem(itemId);
      if (!item) return fail('Item not found', 'NOT_FOUND');

      const existingReviews = item.reviewHistory.length;
      const needsSecondReview = item.aiPreScreenResult.confidence < 0.7 || action.action === 'escalated';

      let newStatus: string;
      if (action.action === 'escalated') {
        newStatus = 'escalated';
      } else if (needsSecondReview && existingReviews < 1) {
        newStatus = 'pending'; // Back to queue for second reviewer
      } else {
        newStatus = action.action === 'approved' ? 'approved' : 'rejected';
      }

      await this.prisma.$executeRawUnsafe(
        `UPDATE "ModerationQueue" SET "status" = $1, "reviewHistory" = "reviewHistory" || $2::jsonb
         WHERE "id" = $3`,
        newStatus, JSON.stringify(action), itemId
      );

      if (newStatus === 'approved') {
        this.emit('content.approved', { contentId: item.contentId, contentType: item.contentType });
      } else if (newStatus === 'rejected') {
        this.emit('content.rejected', { contentId: item.contentId, reason: action.comments });
      }

      return ok(undefined);
    } catch (error) {
      return fail(`Review submission failed: ${error}`, 'REVIEW_FAILED');
    }
  }

  // Auto-approve content from high-trust creators that passes AI screening
  async processAutoApprovals(): Promise<Result<{ autoApproved: number; sentToReview: number }>> {
    let autoApproved = 0;
    let sentToReview = 0;

    try {
      const pendingItems = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "ModerationQueue" WHERE "status" = 'pending'
         ORDER BY "submittedAt" ASC LIMIT 100`
      );

      for (const item of pendingItems) {
        const canAutoApprove =
          item.creatorTier === 'gold' || item.creatorTier === 'platinum';
        const aiRecommends = item.aiPreScreenResult?.recommendation === 'auto_approve';
        const highConfidence = (item.aiPreScreenResult?.confidence || 0) > 0.9;

        if (canAutoApprove && aiRecommends && highConfidence) {
          await this.prisma.$executeRawUnsafe(
            `UPDATE "ModerationQueue" SET "status" = 'approved' WHERE "id" = $1`, item.id
          );
          this.emit('content.auto_approved', { contentId: item.contentId });
          autoApproved++;
        } else if (item.aiPreScreenResult?.recommendation === 'auto_reject') {
          await this.prisma.$executeRawUnsafe(
            `UPDATE "ModerationQueue" SET "status" = 'rejected' WHERE "id" = $1`, item.id
          );
          sentToReview++; // Counted but auto-rejected
        } else {
          sentToReview++;
        }
      }

      return ok({ autoApproved, sentToReview });
    } catch (error) {
      return fail(`Auto-approval processing failed: ${error}`, 'AUTO_APPROVE_FAILED');
    }
  }

  // Appeal handling
  async submitAppeal(contentId: string, creatorId: string, reason: string): Promise<Result<void>> {
    await this.prisma.$executeRawUnsafe(
      `UPDATE "ModerationQueue" SET "status" = 'appealed'
       WHERE "contentId" = $1 AND "creatorId" = $2`, contentId, creatorId
    );
    this.emit('moderation.appeal.submitted', { contentId, creatorId, reason });
    return ok(undefined);
  }

  // Dashboard metrics
  async getQueueMetrics(): Promise<Result<QueueMetrics>> {
    try {
      const counts = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT "status", COUNT(*) as count, AVG(EXTRACT(EPOCH FROM (NOW() - "submittedAt"))) as "avgWaitSeconds"
         FROM "ModerationQueue" GROUP BY "status"`
      );

      const metrics: QueueMetrics = {
        pending: 0, inReview: 0, approved: 0, rejected: 0, escalated: 0, appealed: 0,
        avgReviewTimeMinutes: 0, avgWaitTimeMinutes: 0,
        reviewsToday: 0, autoApprovalRate: 0,
      };

      for (const row of counts) {
        (metrics as any)[row.status] = Number(row.count);
        if (row.status === 'pending') metrics.avgWaitTimeMinutes = Math.round(row.avgWaitSeconds / 60);
      }

      return ok(metrics);
    } catch (error) {
      return fail(`Metrics failed: ${error}`, 'METRICS_FAILED');
    }
  }

  private async getReviewerWorkload(reviewerId: string): Promise<number> {
    const result = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "ModerationQueue"
       WHERE "assignedTo" = $1 AND "status" IN ('assigned', 'in_review')`, reviewerId
    );
    return Number(result[0]?.count || 0);
  }

  private async getItem(itemId: string): Promise<ModerationItem | null> {
    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ModerationQueue" WHERE "id" = $1`, itemId
    );
    return result[0] || null;
  }
}

interface QueueMetrics {
  pending: number; inReview: number; approved: number; rejected: number;
  escalated: number; appealed: number; avgReviewTimeMinutes: number;
  avgWaitTimeMinutes: number; reviewsToday: number; autoApprovalRate: number;
}

// =============================================================================
// S13-007: Multi-Language Phonics
// Phonics Frameworks Beyond English
// =============================================================================
//
// English phonics is just the first language in Scholarly's vision. Spanish,
// French, and other alphabetic languages have their own grapheme-phoneme
// systems, decodability rules, and progression sequences. This module
// provides the multilingual phonics framework — think of it as the
// internationalisation of the BKT engine itself, not just the UI strings.

interface PhonicsLanguageDefinition {
  id: string;
  language: string;
  locale: string;
  name: string;
  script: 'latin' | 'arabic' | 'devanagari' | 'cjk' | 'other';
  direction: 'ltr' | 'rtl';
  phases: PhonicsPhaseDefinition[];
  gpcInventory: GPCDefinition[];
  decodabilityRules: DecodabilityRule[];
  assessmentConfig: LanguageAssessmentConfig;
  enabled: boolean;
}

interface PhonicsPhaseDefinition {
  phase: number;
  name: string;
  description: string;
  targetGPCs: string[];
  tricky_words: string[];        // Sight words / high-frequency irregular words
  prerequisitePhase?: number;
  expectedDurationWeeks: number;
}

interface GPCDefinition {
  grapheme: string;
  phoneme: string;                // IPA notation
  phase: number;
  frequency: 'high' | 'medium' | 'low';
  examples: string[];             // Example words in this language
  notes?: string;                 // Teaching notes
}

interface DecodabilityRule {
  id: string;
  description: string;
  pattern: string;                // Regex or rule expression
  resolution: string;             // How to handle this pattern
}

interface LanguageAssessmentConfig {
  wcpmBenchmarks: { phase: number; emerging: number; expected: number; exceeding: number; }[];
  phonemeAwarenessTests: string[];
  fluencyPassages: string[];
}

// Pre-built language definitions for launch languages
const SPANISH_PHONICS: Partial<PhonicsLanguageDefinition> = {
  id: 'es_phonics',
  language: 'Spanish',
  locale: 'es',
  script: 'latin',
  direction: 'ltr',
  phases: [
    { phase: 1, name: 'Vocales', description: 'The 5 Spanish vowels — consistent and predictable',
      targetGPCs: ['a', 'e', 'i', 'o', 'u'], tricky_words: [], expectedDurationWeeks: 2 },
    { phase: 2, name: 'Consonantes Frecuentes', description: 'High-frequency consonants',
      targetGPCs: ['m', 'p', 's', 'l', 'n', 't', 'd'], tricky_words: ['el', 'la', 'y', 'de'], expectedDurationWeeks: 4 },
    { phase: 3, name: 'Consonantes Adicionales', description: 'Remaining consonants and digraphs',
      targetGPCs: ['r', 'rr', 'c', 'g', 'b', 'v', 'f', 'j', 'h', 'ch', 'll', 'ñ'],
      tricky_words: ['que', 'por', 'con', 'hay'], expectedDurationWeeks: 6 },
    { phase: 4, name: 'Combinaciones', description: 'Consonant blends and complex syllables',
      targetGPCs: ['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr'],
      tricky_words: ['también', 'después', 'porque'], expectedDurationWeeks: 6 },
  ],
  gpcInventory: [
    { grapheme: 'a', phoneme: '/a/', phase: 1, frequency: 'high', examples: ['agua', 'amigo', 'arbol'] },
    { grapheme: 'e', phoneme: '/e/', phase: 1, frequency: 'high', examples: ['elefante', 'estrella'] },
    { grapheme: 'i', phoneme: '/i/', phase: 1, frequency: 'high', examples: ['isla', 'iglesia'] },
    { grapheme: 'o', phoneme: '/o/', phase: 1, frequency: 'high', examples: ['oso', 'ojo'] },
    { grapheme: 'u', phoneme: '/u/', phase: 1, frequency: 'high', examples: ['uva', 'uno'] },
    { grapheme: 'ñ', phoneme: '/ɲ/', phase: 3, frequency: 'medium', examples: ['niño', 'año', 'España'] },
    { grapheme: 'rr', phoneme: '/r/', phase: 3, frequency: 'medium', examples: ['perro', 'carro'], notes: 'Trilled R — unique to Spanish' },
    { grapheme: 'll', phoneme: '/ʎ/', phase: 3, frequency: 'medium', examples: ['llama', 'calle'], notes: 'Regional variation: /ʎ/ or /ʝ/' },
  ],
};

const FRENCH_PHONICS: Partial<PhonicsLanguageDefinition> = {
  id: 'fr_phonics',
  language: 'French',
  locale: 'fr',
  script: 'latin',
  direction: 'ltr',
  phases: [
    { phase: 1, name: 'Voyelles Simples', description: 'Basic French vowels',
      targetGPCs: ['a', 'e', 'i', 'o', 'u', 'é', 'è'], tricky_words: ['le', 'la', 'les', 'un', 'une'], expectedDurationWeeks: 3 },
    { phase: 2, name: 'Consonnes Fréquentes', description: 'Common consonants',
      targetGPCs: ['m', 'n', 'p', 'b', 't', 'd', 'l', 'r', 's', 'f', 'v'],
      tricky_words: ['et', 'est', 'dans', 'avec'], expectedDurationWeeks: 4 },
    { phase: 3, name: 'Sons Complexes', description: 'French complex sounds — nasal vowels, digraphs',
      targetGPCs: ['ou', 'on', 'an', 'en', 'in', 'ai', 'ei', 'au', 'eau', 'ch', 'ph', 'gn', 'oi'],
      tricky_words: ['beaucoup', 'aujourd\'hui', 'monsieur'], expectedDurationWeeks: 8 },
    { phase: 4, name: 'Lettres Muettes', description: 'Silent letters and liaison rules',
      targetGPCs: ['ent', 'es', 'er', 'ez', 'tion', 'sion'],
      tricky_words: ['temps', 'homme', 'femme'], expectedDurationWeeks: 6,
      notes: 'French has extensive silent letter conventions — critical for decoding' },
  ],
  gpcInventory: [
    { grapheme: 'é', phoneme: '/e/', phase: 1, frequency: 'high', examples: ['école', 'été', 'éléphant'] },
    { grapheme: 'è', phoneme: '/ɛ/', phase: 1, frequency: 'high', examples: ['mère', 'frère'] },
    { grapheme: 'ou', phoneme: '/u/', phase: 3, frequency: 'high', examples: ['sous', 'toujours', 'rouge'] },
    { grapheme: 'eau', phoneme: '/o/', phase: 3, frequency: 'medium', examples: ['beau', 'château', 'bateau'] },
    { grapheme: 'oi', phoneme: '/wa/', phase: 3, frequency: 'high', examples: ['moi', 'roi', 'trois'] },
    { grapheme: 'gn', phoneme: '/ɲ/', phase: 3, frequency: 'medium', examples: ['montagne', 'champagne'] },
  ],
};

class MultiLanguagePhonicsService extends ScholarlyBaseService {
  private languages: Map<string, PhonicsLanguageDefinition>;

  constructor(prisma: PrismaClient) {
    super(prisma, 'MultiLanguagePhonicsService');
    this.languages = new Map();
    // English is already fully implemented across Sprints 1-12
    // Spanish and French are the first expansion languages
  }

  async registerLanguage(definition: PhonicsLanguageDefinition): Promise<Result<void>> {
    // Validate GPC inventory covers all phases
    const phases = new Set(definition.phases.map(p => p.phase));
    const gpcPhases = new Set(definition.gpcInventory.map(g => g.phase));
    for (const phase of phases) {
      if (!gpcPhases.has(phase)) {
        return fail(`Phase ${phase} has no GPCs in inventory`, 'INCOMPLETE_INVENTORY');
      }
    }

    this.languages.set(definition.id, definition);
    this.log('info', 'Language registered', { id: definition.id, language: definition.language, gpcCount: definition.gpcInventory.length });
    return ok(undefined);
  }

  async getLanguage(languageId: string): Promise<Result<PhonicsLanguageDefinition>> {
    const lang = this.languages.get(languageId);
    if (!lang) return fail('Language not found', 'NOT_FOUND');
    return ok(lang);
  }

  async listLanguages(): Promise<PhonicsLanguageDefinition[]> {
    return Array.from(this.languages.values());
  }

  // Generate decodability check for a specific language
  async checkDecodability(
    languageId: string, text: string, taughtGPCs: string[]
  ): Promise<Result<{ score: number; nonDecodableWords: string[]; }>> {
    const lang = this.languages.get(languageId);
    if (!lang) return fail('Language not found', 'NOT_FOUND');

    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const nonDecodable: string[] = [];

    for (const word of words) {
      // Check if word can be decoded using taught GPCs
      const cleaned = word.replace(/[^a-záéíóúüñàèìòùâêîôûëïöüç]/gi, '');
      if (!this.canDecode(cleaned, taughtGPCs, lang.gpcInventory)) {
        nonDecodable.push(word);
      }
    }

    const score = words.length > 0 ? ((words.length - nonDecodable.length) / words.length) * 100 : 100;

    return ok({ score, nonDecodableWords: [...new Set(nonDecodable)] });
  }

  private canDecode(word: string, taughtGPCs: string[], inventory: GPCDefinition[]): boolean {
    // Greedy left-to-right longest-match decomposition
    // Same algorithm as the English grapheme parser but with language-specific inventory
    const taughtSet = new Set(taughtGPCs.map(g => g.toLowerCase()));
    let pos = 0;

    while (pos < word.length) {
      let matched = false;
      // Try longest graphemes first (e.g., 'eau' before 'ea' before 'e')
      for (let len = Math.min(4, word.length - pos); len > 0; len--) {
        const segment = word.slice(pos, pos + len);
        if (taughtSet.has(segment)) {
          pos += len;
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }
    return true;
  }
}

// =============================================================================
// S13-008: Performance Optimisation
// Query Optimisation, Connection Pooling, Lazy Loading
// =============================================================================

interface PerformanceConfig {
  database: DatabaseOptimisationConfig;
  caching: CacheOptimisationConfig;
  queryOptimisation: QueryOptimisationConfig;
  lazyLoading: LazyLoadingConfig;
}

interface DatabaseOptimisationConfig {
  connectionPool: {
    min: number; max: number; idleTimeoutMs: number;
    acquireTimeoutMs: number; reapIntervalMs: number;
  };
  readReplicas: { enabled: boolean; hosts: string[]; maxLag: number; };
  preparedStatements: { enabled: boolean; maxCached: number; };
  queryTimeout: number;
}

interface CacheOptimisationConfig {
  layers: CacheLayer[];
  warmupQueries: WarmupQuery[];
  invalidationRules: InvalidationRule[];
}

interface CacheLayer {
  name: string; type: 'memory' | 'redis' | 'cdn';
  ttlSeconds: number; maxEntries: number;
  keyPattern: string; hitRateTarget: number;
}

interface WarmupQuery {
  name: string; query: string; schedule: string; priority: number;
}

interface InvalidationRule {
  trigger: string; cacheKeys: string[]; strategy: 'immediate' | 'lazy' | 'ttl';
}

interface QueryOptimisationConfig {
  slowQueryThresholdMs: number;
  explainAnalyseEnabled: boolean;
  indexRecommendations: IndexRecommendation[];
  materializedViews: MaterializedViewConfig[];
}

interface IndexRecommendation {
  table: string; columns: string[]; type: 'btree' | 'gin' | 'gist' | 'hash';
  reason: string; estimatedImpact: string;
}

interface MaterializedViewConfig {
  name: string; query: string; refreshSchedule: string;
  refreshConcurrently: boolean; indexes: string[];
}

interface LazyLoadingConfig {
  routes: LazyRoute[];
  prefetchRules: PrefetchRule[];
  imageLazyLoading: { enabled: boolean; rootMargin: string; threshold: number; };
  codeSplitting: { enabled: boolean; chunkSizeLimit: number; };
}

interface LazyRoute { path: string; chunk: string; prefetch: boolean; }
interface PrefetchRule { trigger: string; resources: string[]; }

class PerformanceOptimisationService extends ScholarlyBaseService {
  constructor(prisma: PrismaClient) {
    super(prisma, 'PerformanceOptimisationService');
  }

  getOptimisedConfig(): PerformanceConfig {
    return {
      database: {
        connectionPool: {
          min: 5, max: 20, idleTimeoutMs: 30000,
          acquireTimeoutMs: 10000, reapIntervalMs: 1000,
        },
        readReplicas: { enabled: true, hosts: ['replica-1.scholarly.internal', 'replica-2.scholarly.internal'], maxLag: 1000 },
        preparedStatements: { enabled: true, maxCached: 500 },
        queryTimeout: 30000,
      },
      caching: {
        layers: [
          { name: 'L1-Memory', type: 'memory', ttlSeconds: 60, maxEntries: 1000, keyPattern: 'mem:*', hitRateTarget: 0.85 },
          { name: 'L2-Redis', type: 'redis', ttlSeconds: 300, maxEntries: 50000, keyPattern: 'redis:*', hitRateTarget: 0.75 },
          { name: 'L3-CDN', type: 'cdn', ttlSeconds: 3600, maxEntries: 0, keyPattern: 'cdn:*', hitRateTarget: 0.90 },
        ],
        warmupQueries: [
          { name: 'GPC Inventory', query: 'SELECT * FROM "PhonicsGPC" ORDER BY "phase", "sequence"', schedule: '0 * * * *', priority: 1 },
          { name: 'Feature Flags', query: 'SELECT * FROM "FeatureFlag" WHERE "enabled" = true', schedule: '*/5 * * * *', priority: 1 },
          { name: 'Active Storybooks', query: 'SELECT "id","title","phase","decodabilityScore" FROM "Storybook" WHERE "status" = \'published\'', schedule: '0 * * * *', priority: 2 },
        ],
        invalidationRules: [
          { trigger: 'storybook.published', cacheKeys: ['library:*', 'recommendations:*'], strategy: 'immediate' },
          { trigger: 'bkt.updated', cacheKeys: ['learner:{userId}:mastery', 'recommendations:{userId}:*'], strategy: 'lazy' },
          { trigger: 'featureflag.updated', cacheKeys: ['flags:*'], strategy: 'immediate' },
        ],
      },
      queryOptimisation: {
        slowQueryThresholdMs: 500,
        explainAnalyseEnabled: true,
        indexRecommendations: [
          { table: 'ReadingSession', columns: ['learnerId', 'completedAt'], type: 'btree',
            reason: 'Activity feed and weekly progress queries filter on learner + date range', estimatedImpact: '60% reduction in query time' },
          { table: 'BKTMastery', columns: ['learnerId', 'phase'], type: 'btree',
            reason: 'Phase progress calculations aggregate mastery by learner and phase', estimatedImpact: '45% reduction' },
          { table: 'AnalyticsEvent', columns: ['tenantId', 'eventName', 'createdAt'], type: 'btree',
            reason: 'Funnel analysis queries filter on tenant + event + date', estimatedImpact: '70% reduction' },
          { table: 'Storybook', columns: ['status', 'phase'], type: 'btree',
            reason: 'Library search filters on published status and phonics phase', estimatedImpact: '40% reduction' },
          { table: 'ModerationQueue', columns: ['status', 'priority', 'submittedAt'], type: 'btree',
            reason: 'Moderation queue assignment queries sort by priority and submission time', estimatedImpact: '50% reduction' },
        ],
        materializedViews: [
          { name: 'mv_learner_weekly_stats', refreshSchedule: '0 * * * *', refreshConcurrently: true,
            query: `SELECT "learnerId", DATE_TRUNC('week', "completedAt") as week,
                    COUNT(*) as sessions, SUM("durationMinutes") as minutes,
                    AVG("accuracy") as avg_accuracy, COUNT(CASE WHEN "completed" THEN 1 END) as books_completed
                    FROM "ReadingSession" WHERE "completedAt" > NOW() - INTERVAL '90 days'
                    GROUP BY "learnerId", week`,
            indexes: ['CREATE INDEX ON mv_learner_weekly_stats ("learnerId", week)'] },
          { name: 'mv_cohort_retention', refreshSchedule: '0 3 * * *', refreshConcurrently: true,
            query: `SELECT "tenantId", DATE_TRUNC('week', "createdAt") as cohort_week,
                    DATE_TRUNC('week', rs."completedAt") as activity_week,
                    COUNT(DISTINCT u."id") as active_users
                    FROM "User" u LEFT JOIN "ReadingSession" rs ON rs."learnerId" = u."id"
                    WHERE u."role" = 'learner' GROUP BY "tenantId", cohort_week, activity_week`,
            indexes: ['CREATE INDEX ON mv_cohort_retention ("tenantId", cohort_week)'] },
        ],
      },
      lazyLoading: {
        routes: [
          { path: '/library', chunk: 'library', prefetch: true },
          { path: '/reader/:bookId', chunk: 'reader', prefetch: false },
          { path: '/arena', chunk: 'arena', prefetch: false },
          { path: '/dashboard', chunk: 'dashboard', prefetch: true },
          { path: '/settings', chunk: 'settings', prefetch: false },
          { path: '/parent', chunk: 'parent-app', prefetch: false },
          { path: '/developer', chunk: 'dev-portal', prefetch: false },
        ],
        prefetchRules: [
          { trigger: 'library.viewed', resources: ['reader.chunk.js', 'top-3-book-covers'] },
          { trigger: 'book.previewed', resources: ['narration-audio', 'illustration-set'] },
          { trigger: 'login.completed', resources: ['dashboard.chunk.js', 'library.chunk.js'] },
        ],
        imageLazyLoading: { enabled: true, rootMargin: '200px', threshold: 0.1 },
        codeSplitting: { enabled: true, chunkSizeLimit: 250000 },
      },
    };
  }

  async runSlowQueryAnalysis(tenantId: string): Promise<Result<SlowQueryReport>> {
    try {
      const slowQueries = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT query, calls, mean_exec_time, max_exec_time, rows
         FROM pg_stat_statements
         WHERE mean_exec_time > 500
         ORDER BY mean_exec_time DESC LIMIT 20`
      );

      return ok({
        generatedAt: new Date(),
        slowQueries: slowQueries.map(q => ({
          query: q.query?.substring(0, 200),
          calls: Number(q.calls),
          avgTimeMs: Math.round(q.mean_exec_time),
          maxTimeMs: Math.round(q.max_exec_time),
          avgRows: Math.round(q.rows / Number(q.calls)),
        })),
        recommendations: this.getOptimisedConfig().queryOptimisation.indexRecommendations,
      });
    } catch (error) {
      return fail(`Slow query analysis failed: ${error}`, 'ANALYSIS_FAILED');
    }
  }
}

interface SlowQueryReport {
  generatedAt: Date;
  slowQueries: { query: string; calls: number; avgTimeMs: number; maxTimeMs: number; avgRows: number; }[];
  recommendations: IndexRecommendation[];
}

// =============================================================================
// S13-009: Production Monitoring
// Alerting Rules, Runbook Automation, On-Call Rotation
// =============================================================================

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: AlertCondition;
  severity: 'info' | 'warning' | 'critical' | 'page';
  channels: AlertChannel[];
  cooldownMinutes: number;
  enabled: boolean;
  runbookUrl?: string;
  autoRemediation?: AutoRemediation;
}

interface AlertCondition {
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'rate_increase' | 'rate_decrease';
  threshold: number;
  durationSeconds: number;      // Must be true for this long to fire
  evaluationPeriodSeconds: number;
}

interface AlertChannel {
  type: 'slack' | 'pagerduty' | 'email' | 'webhook' | 'sms';
  target: string;               // Channel ID, email, phone, URL
  escalationLevel: number;      // 0 = immediate, 1 = after 15 min, 2 = after 30 min
}

interface AutoRemediation {
  action: 'restart_service' | 'scale_up' | 'clear_cache' | 'enable_circuit_breaker' | 'failover_db';
  maxAttempts: number;
  cooldownMinutes: number;
  requiresApproval: boolean;
}

// Production alert rule definitions
const PRODUCTION_ALERT_RULES: AlertRule[] = [
  // System Health
  {
    id: 'alert_error_rate', name: 'High Error Rate', description: 'HTTP 5xx error rate exceeds threshold',
    metric: 'http_server_errors_total', severity: 'critical',
    condition: { operator: 'gt', threshold: 5, durationSeconds: 60, evaluationPeriodSeconds: 300 },
    channels: [
      { type: 'pagerduty', target: 'scholarly-oncall', escalationLevel: 0 },
      { type: 'slack', target: '#alerts-critical', escalationLevel: 0 },
    ],
    cooldownMinutes: 5, enabled: true, runbookUrl: '/runbooks/high-error-rate',
  },
  {
    id: 'alert_latency_p99', name: 'P99 Latency Spike', description: 'API p99 latency exceeds 3 seconds',
    metric: 'http_request_duration_seconds_p99', severity: 'warning',
    condition: { operator: 'gt', threshold: 3, durationSeconds: 120, evaluationPeriodSeconds: 300 },
    channels: [{ type: 'slack', target: '#alerts-warning', escalationLevel: 0 }],
    cooldownMinutes: 15, enabled: true, runbookUrl: '/runbooks/latency-spike',
    autoRemediation: { action: 'scale_up', maxAttempts: 2, cooldownMinutes: 10, requiresApproval: false },
  },
  {
    id: 'alert_db_connections', name: 'DB Connection Pool Exhaustion', description: 'Connection pool usage above 80%',
    metric: 'db_pool_active_connections_ratio', severity: 'warning',
    condition: { operator: 'gt', threshold: 0.8, durationSeconds: 60, evaluationPeriodSeconds: 120 },
    channels: [{ type: 'slack', target: '#alerts-infra', escalationLevel: 0 }],
    cooldownMinutes: 10, enabled: true, runbookUrl: '/runbooks/db-pool-exhaustion',
  },
  {
    id: 'alert_db_pool_critical', name: 'DB Connection Pool Critical', description: 'Connection pool at 95%+',
    metric: 'db_pool_active_connections_ratio', severity: 'critical',
    condition: { operator: 'gt', threshold: 0.95, durationSeconds: 30, evaluationPeriodSeconds: 60 },
    channels: [
      { type: 'pagerduty', target: 'scholarly-oncall', escalationLevel: 0 },
      { type: 'slack', target: '#alerts-critical', escalationLevel: 0 },
    ],
    cooldownMinutes: 5, enabled: true,
    autoRemediation: { action: 'restart_service', maxAttempts: 1, cooldownMinutes: 15, requiresApproval: true },
  },
  // AI Service Health
  {
    id: 'alert_ai_failures', name: 'AI Provider Failures', description: 'AI generation failure rate above 10%',
    metric: 'ai_provider_error_rate', severity: 'warning',
    condition: { operator: 'gt', threshold: 10, durationSeconds: 300, evaluationPeriodSeconds: 600 },
    channels: [{ type: 'slack', target: '#alerts-ai', escalationLevel: 0 }],
    cooldownMinutes: 30, enabled: true, runbookUrl: '/runbooks/ai-provider-failure',
    autoRemediation: { action: 'enable_circuit_breaker', maxAttempts: 1, cooldownMinutes: 60, requiresApproval: false },
  },
  {
    id: 'alert_ai_cost', name: 'AI Cost Spike', description: 'Hourly AI spend exceeds budget threshold',
    metric: 'ai_hourly_cost_usd', severity: 'warning',
    condition: { operator: 'gt', threshold: 50, durationSeconds: 0, evaluationPeriodSeconds: 3600 },
    channels: [{ type: 'slack', target: '#alerts-cost', escalationLevel: 0 }, { type: 'email', target: 'ops@scholarly.app', escalationLevel: 1 }],
    cooldownMinutes: 60, enabled: true,
  },
  // Educational Health
  {
    id: 'alert_content_safety', name: 'Content Safety Failure', description: 'Content safety check bypassed or failed',
    metric: 'content_safety_bypass_count', severity: 'critical',
    condition: { operator: 'gt', threshold: 0, durationSeconds: 0, evaluationPeriodSeconds: 60 },
    channels: [
      { type: 'pagerduty', target: 'scholarly-oncall', escalationLevel: 0 },
      { type: 'slack', target: '#alerts-critical', escalationLevel: 0 },
      { type: 'email', target: 'safety@scholarly.app', escalationLevel: 0 },
    ],
    cooldownMinutes: 0, enabled: true, runbookUrl: '/runbooks/content-safety-breach',
  },
  {
    id: 'alert_bkt_anomaly', name: 'BKT Anomaly Detected', description: 'Unusual mastery score distribution — potential algorithm issue',
    metric: 'bkt_anomaly_score', severity: 'warning',
    condition: { operator: 'gt', threshold: 3, durationSeconds: 600, evaluationPeriodSeconds: 1800 },
    channels: [{ type: 'slack', target: '#alerts-education', escalationLevel: 0 }],
    cooldownMinutes: 60, enabled: true,
  },
  // Infrastructure
  {
    id: 'alert_disk_space', name: 'Disk Space Low', description: 'Disk usage above 85%',
    metric: 'node_filesystem_usage_ratio', severity: 'warning',
    condition: { operator: 'gt', threshold: 0.85, durationSeconds: 0, evaluationPeriodSeconds: 300 },
    channels: [{ type: 'slack', target: '#alerts-infra', escalationLevel: 0 }],
    cooldownMinutes: 60, enabled: true,
    autoRemediation: { action: 'clear_cache', maxAttempts: 1, cooldownMinutes: 120, requiresApproval: false },
  },
  {
    id: 'alert_memory', name: 'Memory Pressure', description: 'Container memory usage above 90%',
    metric: 'container_memory_usage_ratio', severity: 'critical',
    condition: { operator: 'gt', threshold: 0.9, durationSeconds: 120, evaluationPeriodSeconds: 300 },
    channels: [
      { type: 'pagerduty', target: 'scholarly-oncall', escalationLevel: 0 },
      { type: 'slack', target: '#alerts-critical', escalationLevel: 0 },
    ],
    cooldownMinutes: 5, enabled: true,
    autoRemediation: { action: 'restart_service', maxAttempts: 2, cooldownMinutes: 10, requiresApproval: false },
  },
];

// On-call rotation configuration
interface OnCallRotation {
  name: string;
  scheduleType: 'weekly' | 'daily';
  members: OnCallMember[];
  escalationPolicy: EscalationStep[];
  businessHours: { start: string; end: string; timezone: string; };
  afterHoursPolicy: 'page_primary' | 'page_secondary' | 'queue_for_morning';
}

interface OnCallMember {
  name: string; email: string; phone: string; slackId: string; role: string;
}

interface EscalationStep {
  level: number; waitMinutes: number; contactMethod: 'sms' | 'phone' | 'slack' | 'pagerduty';
  targets: string[];
}

const DEFAULT_ON_CALL: OnCallRotation = {
  name: 'Scholarly Production On-Call',
  scheduleType: 'weekly',
  members: [
    { name: 'Primary Engineer', email: 'oncall-primary@scholarly.app', phone: '+61400000001', slackId: 'U001', role: 'primary' },
    { name: 'Secondary Engineer', email: 'oncall-secondary@scholarly.app', phone: '+61400000002', slackId: 'U002', role: 'secondary' },
    { name: 'Engineering Lead', email: 'eng-lead@scholarly.app', phone: '+61400000003', slackId: 'U003', role: 'escalation' },
  ],
  escalationPolicy: [
    { level: 0, waitMinutes: 0, contactMethod: 'slack', targets: ['oncall-primary'] },
    { level: 1, waitMinutes: 15, contactMethod: 'sms', targets: ['oncall-primary'] },
    { level: 2, waitMinutes: 30, contactMethod: 'phone', targets: ['oncall-secondary'] },
    { level: 3, waitMinutes: 60, contactMethod: 'phone', targets: ['eng-lead'] },
  ],
  businessHours: { start: '08:00', end: '18:00', timezone: 'Australia/Perth' },
  afterHoursPolicy: 'page_primary',
};

class ProductionMonitoringService extends ScholarlyBaseService {
  private alerts: Map<string, AlertRule>;
  private activeIncidents: Map<string, Incident>;

  constructor(prisma: PrismaClient) {
    super(prisma, 'ProductionMonitoringService');
    this.alerts = new Map();
    this.activeIncidents = new Map();
    for (const rule of PRODUCTION_ALERT_RULES) {
      this.alerts.set(rule.id, rule);
    }
  }

  async evaluateAlerts(metrics: Record<string, number>): Promise<Result<AlertEvaluation[]>> {
    const evaluations: AlertEvaluation[] = [];

    for (const [id, rule] of this.alerts) {
      if (!rule.enabled) continue;
      const metricValue = metrics[rule.metric];
      if (metricValue === undefined) continue;

      const triggered = this.evaluateCondition(rule.condition, metricValue);

      evaluations.push({
        ruleId: id, ruleName: rule.name, metricValue, threshold: rule.condition.threshold,
        triggered, severity: rule.severity,
      });

      if (triggered) {
        await this.fireAlert(rule, metricValue);
      }
    }

    return ok(evaluations);
  }

  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lte': return value <= condition.threshold;
      case 'eq': return value === condition.threshold;
      default: return false;
    }
  }

  private async fireAlert(rule: AlertRule, metricValue: number): Promise<void> {
    // Check cooldown
    const lastFired = this.activeIncidents.get(rule.id);
    if (lastFired) {
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;
      if (Date.now() - lastFired.firedAt.getTime() < cooldownMs) return;
    }

    const incident: Incident = {
      id: `inc_${Date.now()}`, ruleId: rule.id, ruleName: rule.name,
      severity: rule.severity, metricValue, threshold: rule.condition.threshold,
      firedAt: new Date(), acknowledgedAt: undefined, resolvedAt: undefined,
      status: 'firing',
    };

    this.activeIncidents.set(rule.id, incident);

    // Dispatch to channels
    for (const channel of rule.channels) {
      this.emit(`alert.${channel.type}`, {
        target: channel.target,
        message: `[${rule.severity.toUpperCase()}] ${rule.name}: ${rule.metric} = ${metricValue} (threshold: ${rule.condition.threshold})`,
        runbookUrl: rule.runbookUrl,
        incidentId: incident.id,
      });
    }

    // Auto-remediation if configured
    if (rule.autoRemediation) {
      this.emit('remediation.execute', {
        action: rule.autoRemediation.action,
        incidentId: incident.id,
        requiresApproval: rule.autoRemediation.requiresApproval,
      });
    }

    this.log('warn', `Alert fired: ${rule.name}`, { ruleId: rule.id, metricValue, severity: rule.severity });
  }

  async acknowledgeIncident(incidentId: string, acknowledgedBy: string): Promise<Result<void>> {
    for (const [, incident] of this.activeIncidents) {
      if (incident.id === incidentId) {
        incident.status = 'acknowledged';
        incident.acknowledgedAt = new Date();
        this.emit('incident.acknowledged', { incidentId, acknowledgedBy });
        return ok(undefined);
      }
    }
    return fail('Incident not found', 'NOT_FOUND');
  }

  async resolveIncident(incidentId: string, resolvedBy: string, resolution: string): Promise<Result<void>> {
    for (const [ruleId, incident] of this.activeIncidents) {
      if (incident.id === incidentId) {
        incident.status = 'resolved';
        incident.resolvedAt = new Date();
        this.activeIncidents.delete(ruleId);
        this.emit('incident.resolved', { incidentId, resolvedBy, resolution });
        return ok(undefined);
      }
    }
    return fail('Incident not found', 'NOT_FOUND');
  }

  getActiveIncidents(): Incident[] {
    return Array.from(this.activeIncidents.values());
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alerts.values());
  }

  getOnCallRotation(): OnCallRotation {
    return DEFAULT_ON_CALL;
  }
}

interface Incident {
  id: string; ruleId: string; ruleName: string; severity: string;
  metricValue: number; threshold: number;
  firedAt: Date; acknowledgedAt?: Date; resolvedAt?: Date;
  status: 'firing' | 'acknowledged' | 'resolved';
}

interface AlertEvaluation {
  ruleId: string; ruleName: string; metricValue: number;
  threshold: number; triggered: boolean; severity: string;
}

// =============================================================================
// Express Routes for all remaining services
// =============================================================================

function createSISRoutes(service: SISSyncOrchestrator) {
  return {
    sync: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const result = await service.executeFullSync(tenantId);
      if (!result.success) return res.status(500).json(result);
      return res.json(result.data);
    },
    webhook: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const provider = req.params.provider;
      await service.handleWebhookEvent(tenantId, provider, req.body);
      return res.status(200).json({ received: true });
    },
    schedule: async (_req: any, res: any) => {
      return res.json(new SISSyncOrchestrator(null as any).getScheduleConfig());
    },
  };
}

function createModerationRoutes(service: ContentModerationService) {
  return {
    getNext: async (req: any, res: any) => {
      const result = await service.assignNextItem(req.user.id);
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },
    submitReview: async (req: any, res: any) => {
      const result = await service.submitReview(req.params.itemId, req.user.id, req.body);
      if (!result.success) return res.status(400).json(result);
      return res.json({ reviewed: true });
    },
    autoApprove: async (_req: any, res: any) => {
      const result = await service.processAutoApprovals();
      if (!result.success) return res.status(500).json(result);
      return res.json(result.data);
    },
    appeal: async (req: any, res: any) => {
      const result = await service.submitAppeal(req.params.contentId, req.user.id, req.body.reason);
      if (!result.success) return res.status(400).json(result);
      return res.json({ appealed: true });
    },
    metrics: async (_req: any, res: any) => {
      const result = await service.getQueueMetrics();
      if (!result.success) return res.status(500).json(result);
      return res.json(result.data);
    },
  };
}

function createMonitoringRoutes(service: ProductionMonitoringService) {
  return {
    evaluate: async (req: any, res: any) => {
      const result = await service.evaluateAlerts(req.body.metrics);
      if (!result.success) return res.status(500).json(result);
      return res.json(result.data);
    },
    incidents: async (_req: any, res: any) => {
      return res.json({ incidents: service.getActiveIncidents() });
    },
    acknowledge: async (req: any, res: any) => {
      const result = await service.acknowledgeIncident(req.params.id, req.user.id);
      if (!result.success) return res.status(400).json(result);
      return res.json({ acknowledged: true });
    },
    resolve: async (req: any, res: any) => {
      const result = await service.resolveIncident(req.params.id, req.user.id, req.body.resolution);
      if (!result.success) return res.status(400).json(result);
      return res.json({ resolved: true });
    },
    rules: async (_req: any, res: any) => {
      return res.json({ rules: service.getAlertRules() });
    },
    oncall: async (_req: any, res: any) => {
      return res.json(service.getOnCallRotation());
    },
  };
}

export {
  SISSyncOrchestrator,
  ContentModerationService,
  MultiLanguagePhonicsService,
  PerformanceOptimisationService,
  ProductionMonitoringService,
  SPANISH_PHONICS,
  FRENCH_PHONICS,
  PRODUCTION_ALERT_RULES,
  DEFAULT_ON_CALL,
  createSISRoutes,
  createModerationRoutes,
  createMonitoringRoutes,
};
