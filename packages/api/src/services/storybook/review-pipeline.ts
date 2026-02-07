// =============================================================================
// SCHOLARLY PLATFORM — Review & Quality Pipeline
// Sprint 4 | SB-006 | review-pipeline.ts
// =============================================================================
// Five-stage quality gate ensuring every community-contributed storybook meets
// Scholarly's educational and safety standards before reaching a child. Think
// of it as the App Store review process, but for educational content — each
// stage acts like a checkpoint on an assembly line, where the product must pass
// inspection before advancing to the next station.
//
// Stage 1 — Automated Validation: The metal detector at the airport. Fast,
//   objective, catches 80%+ of issues without human involvement.
// Stage 2 — AI Review: The experienced editor's first read. Claude assesses
//   pedagogical quality, narrative coherence, and curriculum alignment.
// Stage 3 — Peer Review: The peer review committee. Two verified educators
//   independently evaluate the storybook. They earn XP and badges for
//   thorough reviews, creating a self-sustaining review ecosystem.
// Stage 4 — Pilot Testing: The focus group. A small cohort of real learners
//   reads the storybook. Engagement and accuracy data determine readiness.
// Stage 5 — Library Publication: The grand opening. Stories that pass all
//   gates are published with full curriculum metadata and become available
//   to every learner at the appropriate phonics level.
//
// Consumes:
//   - ContentValidator from Sprint 3 (content-validator.ts) for Stage 1
//   - AIService facade from Sprint 1 (provider-registry.ts) for Stage 2
//   - NATS event bus from Sprint 1 for cross-module notifications
//   - Storybook Prisma models from the unified schema
//
// =============================================================================

import { ScholarlyBaseService, Result } from '../base-service';

// =============================================================================
// Section 1: Types & Enums
// =============================================================================

/** The five review stages form a strict linear progression — no skipping. */
export enum ReviewStage {
  AUTOMATED_VALIDATION = 'AUTOMATED_VALIDATION',
  AI_REVIEW = 'AI_REVIEW',
  PEER_REVIEW = 'PEER_REVIEW',
  PILOT_TESTING = 'PILOT_TESTING',
  LIBRARY_PUBLICATION = 'LIBRARY_PUBLICATION',
}

/** Outcome of any review stage */
export enum ReviewOutcome {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  NEEDS_REVISION = 'NEEDS_REVISION',
  IN_PROGRESS = 'IN_PROGRESS',
  SKIPPED = 'SKIPPED', // Only for admin override scenarios
}

/** Severity of individual review findings */
export enum FindingSeverity {
  CRITICAL = 'CRITICAL',   // Must fix — blocks progression
  MAJOR = 'MAJOR',         // Should fix — may block at reviewer discretion
  MINOR = 'MINOR',         // Nice to fix — advisory only
  INFO = 'INFO',           // Informational note
}

/** Categories of review findings */
export enum FindingCategory {
  DECODABILITY = 'DECODABILITY',
  VOCABULARY = 'VOCABULARY',
  CONTENT_SAFETY = 'CONTENT_SAFETY',
  NARRATIVE_QUALITY = 'NARRATIVE_QUALITY',
  CURRICULUM_ALIGNMENT = 'CURRICULUM_ALIGNMENT',
  ILLUSTRATION_QUALITY = 'ILLUSTRATION_QUALITY',
  AUDIO_QUALITY = 'AUDIO_QUALITY',
  METADATA_COMPLETENESS = 'METADATA_COMPLETENESS',
  AGE_APPROPRIATENESS = 'AGE_APPROPRIATENESS',
  CULTURAL_SENSITIVITY = 'CULTURAL_SENSITIVITY',
  ACCESSIBILITY = 'ACCESSIBILITY',
  ENGAGEMENT = 'ENGAGEMENT',
}

/** Creator tiers that unlock different review pathways */
export enum CreatorTier {
  BRONZE = 'BRONZE',       // Automated validation only, limited distribution
  SILVER = 'SILVER',       // Peer-reviewed, full distribution
  GOLD = 'GOLD',           // Consistently high engagement, featured placement
  PLATINUM = 'PLATINUM',   // Verified educators, priority review
}

/** Reviewer qualification levels */
export enum ReviewerQualification {
  COMMUNITY = 'COMMUNITY',           // General community member
  VERIFIED_EDUCATOR = 'VERIFIED_EDUCATOR', // Verified teaching credential
  CURRICULUM_SPECIALIST = 'CURRICULUM_SPECIALIST', // Subject matter expert
  CONTENT_MODERATOR = 'CONTENT_MODERATOR', // Trained content moderator
  SCHOLARLY_STAFF = 'SCHOLARLY_STAFF', // Internal team
}

// -----------------------------------------------------------------------------
// Interfaces
// -----------------------------------------------------------------------------

/** A single finding from any review stage */
export interface ReviewFinding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  stage: ReviewStage;
  title: string;
  description: string;
  location?: {
    pageNumber?: number;
    paragraphIndex?: number;
    wordRange?: { start: number; end: number };
    illustrationIndex?: number;
  };
  suggestion?: string;
  autoFixable: boolean;
  metadata?: Record<string, unknown>;
}

/** Configuration for automated validation thresholds */
export interface AutomatedValidationConfig {
  minDecodabilityScore: number;    // Default: 0.85 (85%)
  maxVocabularyTier3Ratio: number; // Default: 0.05 (5%)
  requiredMetadataFields: string[];
  maxSentenceLengthWords: number;  // Default: 15 for Phase 1-2, 25 for Phase 3+
  minPageCount: number;            // Default: 8
  maxPageCount: number;            // Default: 24
  requireIllustrations: boolean;   // Default: true
  requireNarration: boolean;       // Default: false (optional at submission)
  contentSafetyThreshold: number;  // Default: 0.95 (very strict for children)
}

/** AI review assessment structure */
export interface AIReviewAssessment {
  overallScore: number;           // 0-100
  pedagogicalQuality: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    gpcCoverageAnalysis: string;
    decodabilityNotes: string;
  };
  narrativeCoherence: {
    score: number;
    plotStructure: string;
    characterDevelopment: string;
    pacing: string;
    engagement: string;
  };
  ageAppropriateness: {
    score: number;
    targetAgeRange: { min: number; max: number };
    thematicSuitability: string;
    emotionalTone: string;
  };
  curriculumAlignment: {
    score: number;
    statedPhaseMatch: boolean;
    gpcTargetCoverage: number;
    comprehensionStrandFit: string;
  };
  illustrationAssessment: {
    score: number;
    textImageAlignment: string;
    characterConsistency: string;
    culturalSensitivity: string;
  };
  summary: string;
  recommendation: ReviewOutcome;
  suggestedRevisions: string[];
}

/** Peer reviewer's structured assessment */
export interface PeerReviewSubmission {
  reviewerId: string;
  reviewerQualification: ReviewerQualification;
  storybookId: string;
  overallRating: number;           // 1-5 stars
  pedagogicalRating: number;       // 1-5
  narrativeRating: number;         // 1-5
  illustrationRating: number;      // 1-5
  ageAppropriatenessRating: number; // 1-5
  findings: ReviewFinding[];
  writtenFeedback: string;
  recommendation: ReviewOutcome;
  timeSpentMinutes: number;
  reviewedAt: Date;
}

/** Pilot testing configuration */
export interface PilotTestConfig {
  cohortSize: number;              // Default: 20 learners
  minReadCount: number;            // Default: 10 completed reads
  testDurationDays: number;        // Default: 7 days
  successCriteria: {
    minCompletionRate: number;     // Default: 0.70 (70%)
    minEngagementScore: number;    // Default: 0.60 (60%)
    minAccuracyRate: number;       // Default: 0.75 (75%)
    maxAbandonmentRate: number;    // Default: 0.30 (30%)
  };
  targetPhonicsPhases: number[];
  targetAgeRange: { min: number; max: number };
}

/** Pilot test results aggregated from learner analytics */
export interface PilotTestResults {
  storybookId: string;
  cohortSize: number;
  totalReads: number;
  uniqueReaders: number;
  completionRate: number;
  averageAccuracy: number;
  averageEngagementScore: number;
  abandonmentRate: number;
  averageReadTimeSeconds: number;
  reReadRate: number;
  pageDropOffDistribution: Record<number, number>; // page -> drop count
  gpcAccuracyByTarget: Record<string, number>;     // gpc -> accuracy
  qualitativeFeedback: string[];                    // from parents/educators
  startedAt: Date;
  completedAt: Date;
}

/** Complete review record for a storybook */
export interface StorybookReviewRecord {
  id: string;
  storybookId: string;
  tenantId: string;
  creatorId: string;
  currentStage: ReviewStage;
  currentOutcome: ReviewOutcome;
  stageHistory: StageResult[];
  findings: ReviewFinding[];
  submittedAt: Date;
  lastUpdatedAt: Date;
  publishedAt?: Date;
  totalReviewTimeMs: number;
}

/** Result of a single stage execution */
export interface StageResult {
  stage: ReviewStage;
  outcome: ReviewOutcome;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  findings: ReviewFinding[];
  metadata: Record<string, unknown>;
}

/** Reviewer profile with XP and badge tracking */
export interface ReviewerProfile {
  userId: string;
  tenantId: string;
  qualification: ReviewerQualification;
  totalReviews: number;
  acceptedReviews: number;
  averageRating: number;
  xpEarned: number;
  badges: ReviewerBadge[];
  specialisations: FindingCategory[];
  isActive: boolean;
  lastReviewAt?: Date;
}

/** Badges earned through the review ecosystem */
export interface ReviewerBadge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedAt: Date;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

/** XP award configuration for reviewer actions */
export interface ReviewerXPConfig {
  baseReviewXP: number;                    // Default: 50 XP per review
  thoroughReviewBonus: number;             // Default: 25 XP for 5+ findings
  firstReviewBonus: number;                // Default: 100 XP for first review
  consecutiveDayBonus: number;             // Default: 10 XP per consecutive day
  agreementBonus: number;                  // Default: 15 XP when review aligns with AI
  qualityMultiplier: Record<ReviewerQualification, number>;
}

/** Events emitted by the review pipeline */
export type ReviewPipelineEvent =
  | { type: 'STORYBOOK_SUBMITTED'; storybookId: string; creatorId: string; tenantId: string }
  | { type: 'STAGE_STARTED'; storybookId: string; stage: ReviewStage }
  | { type: 'STAGE_COMPLETED'; storybookId: string; stage: ReviewStage; outcome: ReviewOutcome }
  | { type: 'FINDING_REPORTED'; storybookId: string; finding: ReviewFinding }
  | { type: 'PEER_REVIEW_ASSIGNED'; storybookId: string; reviewerId: string }
  | { type: 'PEER_REVIEW_SUBMITTED'; storybookId: string; reviewerId: string; recommendation: ReviewOutcome }
  | { type: 'PILOT_TEST_STARTED'; storybookId: string; cohortSize: number }
  | { type: 'PILOT_TEST_COMPLETED'; storybookId: string; results: PilotTestResults }
  | { type: 'STORYBOOK_PUBLISHED'; storybookId: string; libraryMetadata: Record<string, unknown> }
  | { type: 'STORYBOOK_REJECTED'; storybookId: string; stage: ReviewStage; reasons: string[] }
  | { type: 'REVIEWER_XP_AWARDED'; reviewerId: string; amount: number; reason: string }
  | { type: 'REVIEWER_BADGE_EARNED'; reviewerId: string; badge: ReviewerBadge };

// =============================================================================
// Section 2: Default Configurations
// =============================================================================

export const DEFAULT_VALIDATION_CONFIG: AutomatedValidationConfig = {
  minDecodabilityScore: 0.85,
  maxVocabularyTier3Ratio: 0.05,
  requiredMetadataFields: [
    'title', 'phonicsPhase', 'targetGPCs', 'taughtGPCSet',
    'ageRange', 'vocabularyTier', 'comprehensionStrand',
  ],
  maxSentenceLengthWords: 15,
  minPageCount: 8,
  maxPageCount: 24,
  requireIllustrations: true,
  requireNarration: false,
  contentSafetyThreshold: 0.95,
};

export const DEFAULT_PILOT_CONFIG: PilotTestConfig = {
  cohortSize: 20,
  minReadCount: 10,
  testDurationDays: 7,
  successCriteria: {
    minCompletionRate: 0.70,
    minEngagementScore: 0.60,
    minAccuracyRate: 0.75,
    maxAbandonmentRate: 0.30,
  },
  targetPhonicsPhases: [2, 3, 4, 5],
  targetAgeRange: { min: 4, max: 8 },
};

export const DEFAULT_XP_CONFIG: ReviewerXPConfig = {
  baseReviewXP: 50,
  thoroughReviewBonus: 25,
  firstReviewBonus: 100,
  consecutiveDayBonus: 10,
  agreementBonus: 15,
  qualityMultiplier: {
    [ReviewerQualification.COMMUNITY]: 1.0,
    [ReviewerQualification.VERIFIED_EDUCATOR]: 1.5,
    [ReviewerQualification.CURRICULUM_SPECIALIST]: 2.0,
    [ReviewerQualification.CONTENT_MODERATOR]: 1.5,
    [ReviewerQualification.SCHOLARLY_STAFF]: 1.0,
  },
};

/** Phase-specific validation adjustments */
export const PHASE_VALIDATION_OVERRIDES: Record<number, Partial<AutomatedValidationConfig>> = {
  1: { maxSentenceLengthWords: 8,  minDecodabilityScore: 0.90, minPageCount: 6 },
  2: { maxSentenceLengthWords: 10, minDecodabilityScore: 0.88, minPageCount: 8 },
  3: { maxSentenceLengthWords: 15, minDecodabilityScore: 0.85, minPageCount: 8 },
  4: { maxSentenceLengthWords: 20, minDecodabilityScore: 0.82, minPageCount: 10 },
  5: { maxSentenceLengthWords: 25, minDecodabilityScore: 0.80, minPageCount: 10 },
  6: { maxSentenceLengthWords: 30, minDecodabilityScore: 0.75, minPageCount: 12 },
};

/** Badge definitions for the reviewer ecosystem */
export const REVIEWER_BADGES: Record<string, Omit<ReviewerBadge, 'earnedAt'>> = {
  FIRST_REVIEW: {
    id: 'first-review',
    name: 'First Review',
    description: 'Submitted your first storybook review',
    iconUrl: '/badges/first-review.svg',
    tier: 'bronze',
  },
  TEN_REVIEWS: {
    id: 'ten-reviews',
    name: 'Dedicated Reviewer',
    description: 'Completed 10 storybook reviews',
    iconUrl: '/badges/ten-reviews.svg',
    tier: 'silver',
  },
  FIFTY_REVIEWS: {
    id: 'fifty-reviews',
    name: 'Review Champion',
    description: 'Completed 50 storybook reviews',
    iconUrl: '/badges/fifty-reviews.svg',
    tier: 'gold',
  },
  HUNDRED_REVIEWS: {
    id: 'hundred-reviews',
    name: 'Review Legend',
    description: 'Completed 100 storybook reviews',
    iconUrl: '/badges/hundred-reviews.svg',
    tier: 'platinum',
  },
  SHARP_EYE: {
    id: 'sharp-eye',
    name: 'Sharp Eye',
    description: 'Found 50+ critical findings across reviews',
    iconUrl: '/badges/sharp-eye.svg',
    tier: 'silver',
  },
  CURRICULUM_GUARDIAN: {
    id: 'curriculum-guardian',
    name: 'Curriculum Guardian',
    description: 'Reviewed 20+ storybooks with perfect curriculum alignment scores',
    iconUrl: '/badges/curriculum-guardian.svg',
    tier: 'gold',
  },
  STREAK_7: {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Reviewed storybooks for 7 consecutive days',
    iconUrl: '/badges/streak-7.svg',
    tier: 'bronze',
  },
  STREAK_30: {
    id: 'streak-30',
    name: 'Monthly Maven',
    description: 'Reviewed storybooks for 30 consecutive days',
    iconUrl: '/badges/streak-30.svg',
    tier: 'gold',
  },
};

// =============================================================================
// Section 3: Automated Validation Stage
// =============================================================================

/** Input data for a storybook submission */
export interface StorybookSubmission {
  storybookId: string;
  tenantId: string;
  creatorId: string;
  creatorTier: CreatorTier;
  title: string;
  pages: StorybookPageData[];
  metadata: StorybookMetadata;
  illustrations: IllustrationData[];
  narration?: NarrationData;
}

export interface StorybookPageData {
  pageNumber: number;
  text: string;
  wordCount: number;
  sentences: string[];
}

export interface StorybookMetadata {
  phonicsPhase: number;
  targetGPCs: string[];
  taughtGPCSet: string[];
  ageRange: { min: number; max: number };
  vocabularyTier: 'Tier1' | 'Tier2' | 'Mixed';
  comprehensionStrand: string;
  morphemeFocus?: string[];
  culturalContext?: string;
  seriesId?: string;
  [key: string]: unknown;
}

export interface IllustrationData {
  pageNumber: number;
  imageUrl: string;
  altText: string;
  moderationScore?: number;
}

export interface NarrationData {
  totalDurationMs: number;
  wordTimestamps: Array<{ word: string; startMs: number; endMs: number }>;
  voicePersona: string;
}

/**
 * Stage 1: Automated Validation
 *
 * The metal detector at the airport — fast, objective, catches the
 * majority of issues without human involvement. Runs the ContentValidator
 * from Sprint 3 plus structural checks specific to the library pipeline.
 */
export class AutomatedValidationStage {
  private config: AutomatedValidationConfig;

  constructor(config: Partial<AutomatedValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  }

  /**
   * Execute automated validation on a storybook submission.
   * Returns findings sorted by severity (critical first).
   */
  async validate(submission: StorybookSubmission): Promise<StageResult> {
    const startedAt = new Date();
    const findings: ReviewFinding[] = [];

    // 1. Metadata completeness check
    findings.push(...this.validateMetadata(submission));

    // 2. Structural validation (page count, sentence length)
    findings.push(...this.validateStructure(submission));

    // 3. Decodability validation (delegates to ContentValidator)
    findings.push(...await this.validateDecodability(submission));

    // 4. Vocabulary tier analysis
    findings.push(...this.validateVocabulary(submission));

    // 5. Content safety screening
    findings.push(...await this.validateContentSafety(submission));

    // 6. Illustration checks
    findings.push(...this.validateIllustrations(submission));

    // 7. Narration checks (if present)
    if (submission.narration) {
      findings.push(...this.validateNarration(submission));
    }

    // Sort findings: CRITICAL first, then MAJOR, MINOR, INFO
    const severityOrder = { CRITICAL: 0, MAJOR: 1, MINOR: 2, INFO: 3 };
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Determine outcome: any CRITICAL finding = FAILED
    const hasCritical = findings.some(f => f.severity === FindingSeverity.CRITICAL);
    const hasMajor = findings.some(f => f.severity === FindingSeverity.MAJOR);
    const outcome = hasCritical
      ? ReviewOutcome.FAILED
      : hasMajor
        ? ReviewOutcome.NEEDS_REVISION
        : ReviewOutcome.PASSED;

    const completedAt = new Date();

    return {
      stage: ReviewStage.AUTOMATED_VALIDATION,
      outcome,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      findings,
      metadata: {
        configUsed: this.config,
        totalChecks: 7,
        findingsCount: findings.length,
        criticalCount: findings.filter(f => f.severity === FindingSeverity.CRITICAL).length,
      },
    };
  }

  private validateMetadata(submission: StorybookSubmission): ReviewFinding[] {
    const findings: ReviewFinding[] = [];
    const meta = submission.metadata;

    for (const field of this.config.requiredMetadataFields) {
      const value = meta[field];
      if (value === undefined || value === null || value === '') {
        findings.push({
          id: `auto-meta-${field}`,
          category: FindingCategory.METADATA_COMPLETENESS,
          severity: FindingSeverity.CRITICAL,
          stage: ReviewStage.AUTOMATED_VALIDATION,
          title: `Missing required metadata: ${field}`,
          description: `The metadata field '${field}' is required but was not provided. All storybooks must include complete metadata for curriculum alignment and learner matching.`,
          autoFixable: false,
        });
      }
    }

    // Validate phonics phase range
    if (meta.phonicsPhase < 1 || meta.phonicsPhase > 6) {
      findings.push({
        id: 'auto-meta-phase-range',
        category: FindingCategory.CURRICULUM_ALIGNMENT,
        severity: FindingSeverity.CRITICAL,
        stage: ReviewStage.AUTOMATED_VALIDATION,
        title: 'Invalid phonics phase',
        description: `Phonics phase ${meta.phonicsPhase} is outside the valid range (1-6).`,
        autoFixable: false,
      });
    }

    // Validate age range
    if (meta.ageRange && (meta.ageRange.min < 3 || meta.ageRange.max > 12 || meta.ageRange.min > meta.ageRange.max)) {
      findings.push({
        id: 'auto-meta-age-range',
        category: FindingCategory.AGE_APPROPRIATENESS,
        severity: FindingSeverity.MAJOR,
        stage: ReviewStage.AUTOMATED_VALIDATION,
        title: 'Invalid age range',
        description: `Age range ${meta.ageRange.min}-${meta.ageRange.max} is outside expected bounds (3-12) or inverted.`,
        autoFixable: false,
      });
    }

    // Validate target GPCs are not empty
    if (!meta.targetGPCs || meta.targetGPCs.length === 0) {
      findings.push({
        id: 'auto-meta-target-gpcs',
        category: FindingCategory.CURRICULUM_ALIGNMENT,
        severity: FindingSeverity.CRITICAL,
        stage: ReviewStage.AUTOMATED_VALIDATION,
        title: 'No target GPCs specified',
        description: 'Every storybook must specify at least one target GPC for curriculum alignment.',
        autoFixable: false,
      });
    }

    return findings;
  }

  private validateStructure(submission: StorybookSubmission): ReviewFinding[] {
    const findings: ReviewFinding[] = [];
    const phaseOverride = PHASE_VALIDATION_OVERRIDES[submission.metadata.phonicsPhase] || {};
    const effectiveConfig = { ...this.config, ...phaseOverride };

    // Page count
    const pageCount = submission.pages.length;
    if (pageCount < effectiveConfig.minPageCount) {
      findings.push({
        id: 'auto-struct-min-pages',
        category: FindingCategory.NARRATIVE_QUALITY,
        severity: FindingSeverity.MAJOR,
        stage: ReviewStage.AUTOMATED_VALIDATION,
        title: 'Too few pages',
        description: `Storybook has ${pageCount} pages but Phase ${submission.metadata.phonicsPhase} requires at least ${effectiveConfig.minPageCount}.`,
        autoFixable: false,
      });
    }
    if (pageCount > effectiveConfig.maxPageCount) {
      findings.push({
        id: 'auto-struct-max-pages',
        category: FindingCategory.NARRATIVE_QUALITY,
        severity: FindingSeverity.MINOR,
        stage: ReviewStage.AUTOMATED_VALIDATION,
        title: 'Too many pages',
        description: `Storybook has ${pageCount} pages, exceeding the maximum of ${effectiveConfig.maxPageCount}. Consider splitting into a series.`,
        suggestion: 'Split into two books and link them as a series.',
        autoFixable: false,
      });
    }

    // Sentence length per page
    for (const page of submission.pages) {
      for (let i = 0; i < page.sentences.length; i++) {
        const wordCount = page.sentences[i].split(/\s+/).filter(w => w.length > 0).length;
        if (wordCount > effectiveConfig.maxSentenceLengthWords) {
          findings.push({
            id: `auto-struct-sentence-${page.pageNumber}-${i}`,
            category: FindingCategory.AGE_APPROPRIATENESS,
            severity: FindingSeverity.MAJOR,
            stage: ReviewStage.AUTOMATED_VALIDATION,
            title: 'Sentence too long',
            description: `Page ${page.pageNumber}, sentence ${i + 1} has ${wordCount} words (max ${effectiveConfig.maxSentenceLengthWords} for Phase ${submission.metadata.phonicsPhase}).`,
            location: { pageNumber: page.pageNumber, paragraphIndex: i },
            suggestion: 'Break into shorter sentences appropriate for the target phonics phase.',
            autoFixable: false,
          });
        }
      }
    }

    // Empty pages
    for (const page of submission.pages) {
      if (!page.text || page.text.trim().length === 0) {
        findings.push({
          id: `auto-struct-empty-${page.pageNumber}`,
          category: FindingCategory.NARRATIVE_QUALITY,
          severity: FindingSeverity.MINOR,
          stage: ReviewStage.AUTOMATED_VALIDATION,
          title: 'Empty page',
          description: `Page ${page.pageNumber} has no text. While illustration-only pages are acceptable occasionally, ensure this is intentional.`,
          location: { pageNumber: page.pageNumber },
          autoFixable: false,
        });
      }
    }

    return findings;
  }

  /**
   * Decodability validation using the ContentValidator engine.
   * Every word is checked against the learner's taught GPC set using
   * greedy longest-match DAG decomposition.
   */
  private async validateDecodability(submission: StorybookSubmission): Promise<ReviewFinding[]> {
    const findings: ReviewFinding[] = [];
    const phaseOverride = PHASE_VALIDATION_OVERRIDES[submission.metadata.phonicsPhase] || {};
    const minScore = phaseOverride.minDecodabilityScore ?? this.config.minDecodabilityScore;

    // Simulate ContentValidator decodability check
    // In production, this delegates to the ContentValidator from Sprint 3
    const allText = submission.pages.map(p => p.text).join(' ');
    const words = allText.split(/\s+/).filter(w => w.length > 0);
    const taughtGPCs = new Set(submission.metadata.taughtGPCSet || []);

    // Simplified decodability calculation — production uses full DAG decomposition
    let decodableCount = 0;
    const nonDecodableWords: Array<{ word: string; pageNumber: number }> = [];

    for (const page of submission.pages) {
      const pageWords = page.text.split(/\s+/).filter(w => w.length > 0);
      for (const word of pageWords) {
        const cleaned = word.toLowerCase().replace(/[^a-z']/g, '');
        if (cleaned.length === 0) continue;

        // Delegate to ContentValidator's decomposition engine
        const isDecodable = this.checkWordDecodability(cleaned, taughtGPCs);
        if (isDecodable) {
          decodableCount++;
        } else {
          nonDecodableWords.push({ word: cleaned, pageNumber: page.pageNumber });
        }
      }
    }

    const totalWords = decodableCount + nonDecodableWords.length;
    const decodabilityScore = totalWords > 0 ? decodableCount / totalWords : 0;

    if (decodabilityScore < minScore) {
      findings.push({
        id: 'auto-decode-score',
        category: FindingCategory.DECODABILITY,
        severity: FindingSeverity.CRITICAL,
        stage: ReviewStage.AUTOMATED_VALIDATION,
        title: 'Decodability below threshold',
        description: `Decodability score is ${(decodabilityScore * 100).toFixed(1)}% but Phase ${submission.metadata.phonicsPhase} requires ${(minScore * 100).toFixed(1)}%. ${nonDecodableWords.length} words are not decodable with the taught GPC set.`,
        metadata: {
          score: decodabilityScore,
          threshold: minScore,
          nonDecodableWords: nonDecodableWords.slice(0, 20),
          totalWords,
          decodableCount,
        },
        autoFixable: false,
      });
    }

    // Report individual non-decodable words (first 10 unique)
    const uniqueNonDecodable = [...new Set(nonDecodableWords.map(w => w.word))].slice(0, 10);
    for (const word of uniqueNonDecodable) {
      const pages = nonDecodableWords.filter(w => w.word === word).map(w => w.pageNumber);
      findings.push({
        id: `auto-decode-word-${word}`,
        category: FindingCategory.DECODABILITY,
        severity: FindingSeverity.MINOR,
        stage: ReviewStage.AUTOMATED_VALIDATION,
        title: `Non-decodable word: "${word}"`,
        description: `The word "${word}" appears on page(s) ${[...new Set(pages)].join(', ')} and cannot be decoded using the taught GPC set.`,
        suggestion: `Replace with a decodable alternative or add the required GPCs to the taught set.`,
        autoFixable: false,
      });
    }

    return findings;
  }

  /**
   * Simplified decodability check — in production, this delegates to
   * the ContentValidator's greedy longest-match GPC decomposition engine.
   */
  private checkWordDecodability(word: string, taughtGPCs: Set<string>): boolean {
    // Tricky words are always considered decodable (high-frequency exceptions)
    const trickyWords = new Set([
      'the', 'a', 'do', 'to', 'today', 'of', 'said', 'says', 'are', 'were',
      'was', 'is', 'his', 'has', 'i', 'you', 'your', 'they', 'be', 'he',
      'me', 'she', 'we', 'no', 'go', 'so', 'by', 'my', 'here', 'there',
      'where', 'love', 'come', 'some', 'one', 'once', 'ask', 'friend',
      'school', 'put', 'push', 'pull', 'full', 'house', 'our', 'water',
      'want', 'any', 'many', 'again', 'who', 'whole', 'two', 'their',
      'people', 'oh', 'mr', 'mrs', 'looked', 'called', 'asked',
    ]);

    if (trickyWords.has(word)) return true;

    // Greedy longest-match decomposition
    let remaining = word;
    while (remaining.length > 0) {
      let matched = false;
      // Try trigraphs, then digraphs, then single graphemes
      for (let len = Math.min(3, remaining.length); len >= 1; len--) {
        const grapheme = remaining.substring(0, len);
        if (taughtGPCs.has(grapheme)) {
          remaining = remaining.substring(len);
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }
    return true;
  }

  private validateVocabulary(submission: StorybookSubmission): ReviewFinding[] {
    const findings: ReviewFinding[] = [];

    // Aggregate vocabulary across all pages
    const allWords = submission.pages
      .flatMap(p => p.text.split(/\s+/))
      .filter(w => w.length > 0)
      .map(w => w.toLowerCase().replace(/[^a-z']/g, ''))
      .filter(w => w.length > 0);

    const uniqueWords = new Set(allWords);
    const totalWords = allWords.length;

    // Tier 3 (domain-specific) word detection — simplified pattern matching
    // In production, this uses the VocabularyAnalyser from content-validator.ts
    const tier3Indicators = [
      /ology$/, /tion$/, /ment$/, /eous$/, /ious$/,
      /escence$/, /isation$/, /ization$/,
    ];
    const tier3Words = [...uniqueWords].filter(w =>
      tier3Indicators.some(pattern => pattern.test(w))
    );
    const tier3Ratio = tier3Words.length / uniqueWords.size;

    if (tier3Ratio > this.config.maxVocabularyTier3Ratio) {
      findings.push({
        id: 'auto-vocab-tier3',
        category: FindingCategory.VOCABULARY,
        severity: FindingSeverity.MAJOR,
        stage: ReviewStage.AUTOMATED_VALIDATION,
        title: 'Too many Tier 3 vocabulary words',
        description: `${(tier3Ratio * 100).toFixed(1)}% of unique words appear to be Tier 3 (domain-specific), exceeding the ${(this.config.maxVocabularyTier3Ratio * 100).toFixed(1)}% threshold. Young readers benefit from predominantly Tier 1 (everyday) vocabulary.`,
        metadata: { tier3Words, tier3Ratio },
        autoFixable: false,
      });
    }

    // Word repetition density (too much repetition = boring)
    const wordFreq = new Map<string, number>();
    for (const w of allWords) {
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
    const maxRepetition = Math.max(...wordFreq.values());
    const repetitionRatio = maxRepetition / totalWords;

    if (repetitionRatio > 0.15 && totalWords > 50) {
      const mostRepeated = [...wordFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word, count]) => `"${word}" (${count}x)`);

      findings.push({
        id: 'auto-vocab-repetition',
        category: FindingCategory.ENGAGEMENT,
        severity: FindingSeverity.MINOR,
        stage: ReviewStage.AUTOMATED_VALIDATION,
        title: 'High word repetition',
        description: `Some words are repeated very frequently: ${mostRepeated.join(', ')}. While repetition supports phonics practice, excessive repetition can reduce engagement.`,
        autoFixable: false,
      });
    }

    return findings;
  }

  /**
   * Content safety screening — delegates to the ContentSafety service
   * with children's content thresholds significantly stricter than defaults.
   */
  private async validateContentSafety(submission: StorybookSubmission): Promise<ReviewFinding[]> {
    const findings: ReviewFinding[] = [];

    // Pattern-based safety screening (from content-validator.ts)
    const unsafePatterns: Array<{ pattern: RegExp; category: string; severity: FindingSeverity }> = [
      { pattern: /\b(kill|murder|die|dead|death|blood|weapon|gun|knife)\b/gi, category: 'violence', severity: FindingSeverity.CRITICAL },
      { pattern: /\b(hate|stupid|idiot|dumb|ugly|fat|loser)\b/gi, category: 'negative_language', severity: FindingSeverity.MAJOR },
      { pattern: /\b(alcohol|beer|wine|drunk|cigarette|drug|smoke)\b/gi, category: 'substance', severity: FindingSeverity.CRITICAL },
      { pattern: /\b(scary|terrifying|nightmare|monster|ghost)\b/gi, category: 'frightening', severity: FindingSeverity.MINOR },
      { pattern: /\b(divorce|abuse|neglect|abandon)\b/gi, category: 'sensitive_topics', severity: FindingSeverity.MAJOR },
    ];

    for (const page of submission.pages) {
      for (const { pattern, category, severity } of unsafePatterns) {
        const matches = page.text.match(pattern);
        if (matches) {
          for (const match of matches) {
            findings.push({
              id: `auto-safety-${category}-${page.pageNumber}-${match}`,
              category: FindingCategory.CONTENT_SAFETY,
              severity,
              stage: ReviewStage.AUTOMATED_VALIDATION,
              title: `Content safety flag: ${category}`,
              description: `Page ${page.pageNumber} contains the word "${match}" which triggers the ${category} safety filter. Children's content requires careful handling of such language.`,
              location: { pageNumber: page.pageNumber },
              suggestion: `Review this usage in context. Consider rephrasing to maintain age-appropriateness.`,
              autoFixable: false,
            });
          }
        }
      }
    }

    return findings;
  }

  private validateIllustrations(submission: StorybookSubmission): ReviewFinding[] {
    const findings: ReviewFinding[] = [];

    if (this.config.requireIllustrations) {
      // Check that most pages have illustrations
      const pagesWithIllustrations = new Set(submission.illustrations.map(i => i.pageNumber));
      const pagesWithoutIllustrations = submission.pages
        .filter(p => !pagesWithIllustrations.has(p.pageNumber))
        .map(p => p.pageNumber);

      if (pagesWithoutIllustrations.length > submission.pages.length * 0.3) {
        findings.push({
          id: 'auto-illust-coverage',
          category: FindingCategory.ILLUSTRATION_QUALITY,
          severity: FindingSeverity.MAJOR,
          stage: ReviewStage.AUTOMATED_VALIDATION,
          title: 'Insufficient illustration coverage',
          description: `${pagesWithoutIllustrations.length} of ${submission.pages.length} pages lack illustrations. Pages: ${pagesWithoutIllustrations.join(', ')}.`,
          autoFixable: false,
        });
      }

      // Check alt text for accessibility
      const missingAltText = submission.illustrations.filter(i => !i.altText || i.altText.trim().length === 0);
      if (missingAltText.length > 0) {
        findings.push({
          id: 'auto-illust-alt-text',
          category: FindingCategory.ACCESSIBILITY,
          severity: FindingSeverity.MAJOR,
          stage: ReviewStage.AUTOMATED_VALIDATION,
          title: 'Missing illustration alt text',
          description: `${missingAltText.length} illustration(s) lack alt text, which is required for screen reader accessibility.`,
          autoFixable: false,
        });
      }

      // Check moderation scores (if pre-screened)
      for (const illust of submission.illustrations) {
        if (illust.moderationScore !== undefined && illust.moderationScore < this.config.contentSafetyThreshold) {
          findings.push({
            id: `auto-illust-moderation-${illust.pageNumber}`,
            category: FindingCategory.CONTENT_SAFETY,
            severity: FindingSeverity.CRITICAL,
            stage: ReviewStage.AUTOMATED_VALIDATION,
            title: 'Illustration moderation flag',
            description: `Page ${illust.pageNumber} illustration has a moderation score of ${(illust.moderationScore * 100).toFixed(1)}%, below the ${(this.config.contentSafetyThreshold * 100).toFixed(1)}% threshold for children's content.`,
            location: { pageNumber: illust.pageNumber, illustrationIndex: 0 },
            autoFixable: false,
          });
        }
      }
    }

    return findings;
  }

  private validateNarration(submission: StorybookSubmission): ReviewFinding[] {
    const findings: ReviewFinding[] = [];
    const narration = submission.narration!;

    // Check word timestamp coverage
    const totalTextWords = submission.pages
      .flatMap(p => p.text.split(/\s+/))
      .filter(w => w.length > 0).length;
    const timestampedWords = narration.wordTimestamps.length;

    if (timestampedWords < totalTextWords * 0.9) {
      findings.push({
        id: 'auto-narr-coverage',
        category: FindingCategory.AUDIO_QUALITY,
        severity: FindingSeverity.MAJOR,
        stage: ReviewStage.AUTOMATED_VALIDATION,
        title: 'Incomplete narration timestamp coverage',
        description: `Only ${timestampedWords} of ${totalTextWords} words have timestamps (${((timestampedWords / totalTextWords) * 100).toFixed(1)}%). Karaoke-style highlighting requires at least 90% coverage.`,
        autoFixable: false,
      });
    }

    // Check for timestamp ordering issues
    let prevEnd = 0;
    for (let i = 0; i < narration.wordTimestamps.length; i++) {
      const ts = narration.wordTimestamps[i];
      if (ts.startMs < prevEnd) {
        findings.push({
          id: `auto-narr-order-${i}`,
          category: FindingCategory.AUDIO_QUALITY,
          severity: FindingSeverity.MINOR,
          stage: ReviewStage.AUTOMATED_VALIDATION,
          title: 'Narration timestamp overlap',
          description: `Word "${ts.word}" at index ${i} starts at ${ts.startMs}ms but the previous word ends at ${prevEnd}ms. This may cause highlighting glitches.`,
          autoFixable: true,
        });
        break; // Report only the first overlap to avoid spam
      }
      prevEnd = ts.endMs;
    }

    return findings;
  }
}

// =============================================================================
// Section 4: AI Review Stage
// =============================================================================

/**
 * Stage 2: AI Review
 *
 * The experienced editor's first read. Claude assesses pedagogical quality,
 * narrative coherence, age-appropriateness, and curriculum alignment. This
 * stage adds qualitative judgment that automated validation cannot provide —
 * understanding whether a story is engaging, whether its themes are handled
 * sensitively, and whether it actually teaches the phonics targets it claims.
 */
export class AIReviewStage {
  private aiServiceConfig: {
    model: string;
    maxTokens: number;
    temperature: number;
  };

  constructor(config?: { model?: string; maxTokens?: number; temperature?: number }) {
    this.aiServiceConfig = {
      model: config?.model ?? 'claude-sonnet-4-20250514',
      maxTokens: config?.maxTokens ?? 4096,
      temperature: config?.temperature ?? 0.3,
    };
  }

  /**
   * Execute AI review. Constructs a detailed prompt with the full
   * storybook text, metadata, and illustration descriptions, then
   * parses Claude's structured response into an AIReviewAssessment.
   */
  async review(submission: StorybookSubmission): Promise<StageResult> {
    const startedAt = new Date();
    const findings: ReviewFinding[] = [];

    // Build the review prompt
    const prompt = this.buildReviewPrompt(submission);

    // In production, this calls the AIService facade
    // const response = await this.aiService.complete({
    //   capability: 'text_completion',
    //   systemPrompt: prompt.system,
    //   userPrompt: prompt.user,
    //   model: this.aiServiceConfig.model,
    //   maxTokens: this.aiServiceConfig.maxTokens,
    //   temperature: this.aiServiceConfig.temperature,
    // });

    // Parse the structured response
    // const assessment = this.parseAssessment(response.text);

    // Simulated assessment for pipeline completeness
    const assessment = this.generatePlaceholderAssessment(submission);

    // Convert assessment into findings
    findings.push(...this.assessmentToFindings(assessment, submission));

    const completedAt = new Date();

    return {
      stage: ReviewStage.AI_REVIEW,
      outcome: assessment.recommendation,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      findings,
      metadata: {
        assessment,
        model: this.aiServiceConfig.model,
        promptTokenEstimate: prompt.system.length + prompt.user.length,
      },
    };
  }

  /**
   * Build the system and user prompts for the AI review. The system
   * prompt establishes Claude as a children's literacy expert; the
   * user prompt provides the complete storybook with structured
   * analysis requirements.
   */
  private buildReviewPrompt(submission: StorybookSubmission): { system: string; user: string } {
    const system = `You are a children's literacy expert and curriculum specialist reviewing a decodable storybook for the Scholarly Phonics platform. You have deep expertise in:
- Systematic Synthetic Phonics (SSP) methodology
- Grapheme-phoneme correspondence (GPC) progression
- Age-appropriate narrative construction for early readers
- Children's book illustration assessment
- Cultural sensitivity in educational materials
- The UK Letters and Sounds phonics framework

Your task is to provide a thorough, structured review assessing pedagogical quality, narrative coherence, age-appropriateness, curriculum alignment, and illustration quality. Be constructive and specific — your review will help creators improve their content.

Respond with a JSON object matching the AIReviewAssessment schema. Score each dimension 0-100 and provide specific, actionable feedback.`;

    const storyText = submission.pages
      .map(p => `[Page ${p.pageNumber}]\n${p.text}`)
      .join('\n\n');

    const illustrationDescriptions = submission.illustrations
      .map(i => `[Page ${i.pageNumber}] Alt: ${i.altText}`)
      .join('\n');

    const user = `Review the following storybook:

TITLE: ${submission.title}
PHONICS PHASE: ${submission.metadata.phonicsPhase}
TARGET GPCs: ${submission.metadata.targetGPCs.join(', ')}
AGE RANGE: ${submission.metadata.ageRange.min}-${submission.metadata.ageRange.max}
VOCABULARY TIER: ${submission.metadata.vocabularyTier}
COMPREHENSION STRAND: ${submission.metadata.comprehensionStrand}

STORY TEXT:
${storyText}

ILLUSTRATION DESCRIPTIONS:
${illustrationDescriptions}

Please provide your assessment as a JSON object with the following structure:
{
  "overallScore": number (0-100),
  "pedagogicalQuality": { "score": number, "strengths": [...], "weaknesses": [...], "gpcCoverageAnalysis": "...", "decodabilityNotes": "..." },
  "narrativeCoherence": { "score": number, "plotStructure": "...", "characterDevelopment": "...", "pacing": "...", "engagement": "..." },
  "ageAppropriateness": { "score": number, "targetAgeRange": { "min": number, "max": number }, "thematicSuitability": "...", "emotionalTone": "..." },
  "curriculumAlignment": { "score": number, "statedPhaseMatch": boolean, "gpcTargetCoverage": number, "comprehensionStrandFit": "..." },
  "illustrationAssessment": { "score": number, "textImageAlignment": "...", "characterConsistency": "...", "culturalSensitivity": "..." },
  "summary": "...",
  "recommendation": "PASSED" | "NEEDS_REVISION" | "FAILED",
  "suggestedRevisions": [...]
}`;

    return { system, user };
  }

  /**
   * Placeholder assessment generator — demonstrates the assessment
   * structure. In production, this is replaced by parsed Claude output.
   */
  private generatePlaceholderAssessment(submission: StorybookSubmission): AIReviewAssessment {
    return {
      overallScore: 0,
      pedagogicalQuality: {
        score: 0,
        strengths: [],
        weaknesses: [],
        gpcCoverageAnalysis: 'Pending AI review',
        decodabilityNotes: 'Pending AI review',
      },
      narrativeCoherence: {
        score: 0,
        plotStructure: 'Pending AI review',
        characterDevelopment: 'Pending AI review',
        pacing: 'Pending AI review',
        engagement: 'Pending AI review',
      },
      ageAppropriateness: {
        score: 0,
        targetAgeRange: submission.metadata.ageRange,
        thematicSuitability: 'Pending AI review',
        emotionalTone: 'Pending AI review',
      },
      curriculumAlignment: {
        score: 0,
        statedPhaseMatch: true,
        gpcTargetCoverage: 0,
        comprehensionStrandFit: 'Pending AI review',
      },
      illustrationAssessment: {
        score: 0,
        textImageAlignment: 'Pending AI review',
        characterConsistency: 'Pending AI review',
        culturalSensitivity: 'Pending AI review',
      },
      summary: 'AI review pending — this placeholder is replaced by live Claude assessment in production.',
      recommendation: ReviewOutcome.IN_PROGRESS,
      suggestedRevisions: [],
    };
  }

  /**
   * Convert AI assessment scores into structured findings.
   * Low scores in any dimension generate findings at appropriate severity.
   */
  private assessmentToFindings(
    assessment: AIReviewAssessment,
    submission: StorybookSubmission
  ): ReviewFinding[] {
    const findings: ReviewFinding[] = [];
    const dimensions: Array<{
      name: string;
      score: number;
      category: FindingCategory;
      details: string;
    }> = [
      {
        name: 'Pedagogical Quality',
        score: assessment.pedagogicalQuality.score,
        category: FindingCategory.CURRICULUM_ALIGNMENT,
        details: assessment.pedagogicalQuality.weaknesses.join('; ') || 'No issues identified',
      },
      {
        name: 'Narrative Coherence',
        score: assessment.narrativeCoherence.score,
        category: FindingCategory.NARRATIVE_QUALITY,
        details: assessment.narrativeCoherence.engagement,
      },
      {
        name: 'Age Appropriateness',
        score: assessment.ageAppropriateness.score,
        category: FindingCategory.AGE_APPROPRIATENESS,
        details: assessment.ageAppropriateness.thematicSuitability,
      },
      {
        name: 'Curriculum Alignment',
        score: assessment.curriculumAlignment.score,
        category: FindingCategory.CURRICULUM_ALIGNMENT,
        details: assessment.curriculumAlignment.comprehensionStrandFit,
      },
      {
        name: 'Illustration Quality',
        score: assessment.illustrationAssessment.score,
        category: FindingCategory.ILLUSTRATION_QUALITY,
        details: assessment.illustrationAssessment.textImageAlignment,
      },
    ];

    for (const dim of dimensions) {
      if (dim.score < 40) {
        findings.push({
          id: `ai-${dim.category.toLowerCase()}-critical`,
          category: dim.category,
          severity: FindingSeverity.CRITICAL,
          stage: ReviewStage.AI_REVIEW,
          title: `${dim.name}: Critical deficiency (${dim.score}/100)`,
          description: dim.details,
          autoFixable: false,
        });
      } else if (dim.score < 60) {
        findings.push({
          id: `ai-${dim.category.toLowerCase()}-major`,
          category: dim.category,
          severity: FindingSeverity.MAJOR,
          stage: ReviewStage.AI_REVIEW,
          title: `${dim.name}: Below expectations (${dim.score}/100)`,
          description: dim.details,
          autoFixable: false,
        });
      } else if (dim.score < 75) {
        findings.push({
          id: `ai-${dim.category.toLowerCase()}-minor`,
          category: dim.category,
          severity: FindingSeverity.MINOR,
          stage: ReviewStage.AI_REVIEW,
          title: `${dim.name}: Room for improvement (${dim.score}/100)`,
          description: dim.details,
          autoFixable: false,
        });
      }
    }

    // Add suggested revisions as INFO findings
    for (let i = 0; i < assessment.suggestedRevisions.length; i++) {
      findings.push({
        id: `ai-revision-${i}`,
        category: FindingCategory.NARRATIVE_QUALITY,
        severity: FindingSeverity.INFO,
        stage: ReviewStage.AI_REVIEW,
        title: `Suggested revision ${i + 1}`,
        description: assessment.suggestedRevisions[i],
        autoFixable: false,
      });
    }

    return findings;
  }
}

// =============================================================================
// Section 5: Peer Review Stage
// =============================================================================

/**
 * Stage 3: Peer Review
 *
 * The peer review committee. At least two verified educators independently
 * evaluate the storybook, earning XP and badges for their contributions.
 * This creates a self-sustaining review ecosystem — the more you review,
 * the more you earn, and the quality of the library improves for everyone.
 *
 * Think of it like academic peer review, but with gamification that makes
 * the process rewarding rather than burdensome.
 */
export class PeerReviewStage {
  private xpConfig: ReviewerXPConfig;
  private requiredReviewers: number;
  private minimumAgreementThreshold: number;

  constructor(config?: {
    xpConfig?: Partial<ReviewerXPConfig>;
    requiredReviewers?: number;
    minimumAgreementThreshold?: number;
  }) {
    this.xpConfig = { ...DEFAULT_XP_CONFIG, ...config?.xpConfig };
    this.requiredReviewers = config?.requiredReviewers ?? 2;
    this.minimumAgreementThreshold = config?.minimumAgreementThreshold ?? 0.6;
  }

  /**
   * Evaluate whether sufficient peer reviews have been collected
   * and whether reviewers agree on the outcome.
   */
  evaluateReviews(reviews: PeerReviewSubmission[]): StageResult {
    const startedAt = reviews.length > 0
      ? new Date(Math.min(...reviews.map(r => r.reviewedAt.getTime())))
      : new Date();
    const completedAt = new Date();
    const findings: ReviewFinding[] = [];

    // Check minimum reviewer count
    if (reviews.length < this.requiredReviewers) {
      return {
        stage: ReviewStage.PEER_REVIEW,
        outcome: ReviewOutcome.IN_PROGRESS,
        startedAt,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        findings: [{
          id: 'peer-insufficient',
          category: FindingCategory.METADATA_COMPLETENESS,
          severity: FindingSeverity.INFO,
          stage: ReviewStage.PEER_REVIEW,
          title: 'Insufficient reviews',
          description: `${reviews.length} of ${this.requiredReviewers} required reviews received.`,
          autoFixable: false,
        }],
        metadata: { reviewCount: reviews.length, required: this.requiredReviewers },
      };
    }

    // Aggregate ratings
    const avgOverall = reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length;
    const avgPedagogical = reviews.reduce((sum, r) => sum + r.pedagogicalRating, 0) / reviews.length;
    const avgNarrative = reviews.reduce((sum, r) => sum + r.narrativeRating, 0) / reviews.length;
    const avgIllustration = reviews.reduce((sum, r) => sum + r.illustrationRating, 0) / reviews.length;
    const avgAgeApp = reviews.reduce((sum, r) => sum + r.ageAppropriatenessRating, 0) / reviews.length;

    // Check reviewer agreement
    const recommendations = reviews.map(r => r.recommendation);
    const passedCount = recommendations.filter(r => r === ReviewOutcome.PASSED).length;
    const failedCount = recommendations.filter(r => r === ReviewOutcome.FAILED).length;
    const revisionCount = recommendations.filter(r => r === ReviewOutcome.NEEDS_REVISION).length;
    const agreementRatio = Math.max(passedCount, failedCount, revisionCount) / reviews.length;

    // Collect all findings from reviewers
    for (const review of reviews) {
      findings.push(...review.findings);
    }

    // Determine outcome based on majority recommendation
    let outcome: ReviewOutcome;
    if (agreementRatio < this.minimumAgreementThreshold) {
      // Split decision — needs additional review or escalation
      outcome = ReviewOutcome.NEEDS_REVISION;
      findings.push({
        id: 'peer-split-decision',
        category: FindingCategory.NARRATIVE_QUALITY,
        severity: FindingSeverity.INFO,
        stage: ReviewStage.PEER_REVIEW,
        title: 'Split reviewer decision',
        description: `Reviewers did not reach consensus: ${passedCount} passed, ${failedCount} failed, ${revisionCount} need revision. Agreement ratio: ${(agreementRatio * 100).toFixed(0)}%.`,
        autoFixable: false,
      });
    } else if (failedCount > passedCount) {
      outcome = ReviewOutcome.FAILED;
    } else if (revisionCount > passedCount) {
      outcome = ReviewOutcome.NEEDS_REVISION;
    } else {
      outcome = ReviewOutcome.PASSED;
    }

    // Add low rating warnings
    if (avgOverall < 3.0) {
      findings.push({
        id: 'peer-low-overall',
        category: FindingCategory.NARRATIVE_QUALITY,
        severity: FindingSeverity.MAJOR,
        stage: ReviewStage.PEER_REVIEW,
        title: `Low overall rating: ${avgOverall.toFixed(1)}/5`,
        description: 'Average peer reviewer rating is below the acceptable threshold.',
        autoFixable: false,
      });
    }

    if (avgPedagogical < 3.0) {
      findings.push({
        id: 'peer-low-pedagogical',
        category: FindingCategory.CURRICULUM_ALIGNMENT,
        severity: FindingSeverity.MAJOR,
        stage: ReviewStage.PEER_REVIEW,
        title: `Low pedagogical rating: ${avgPedagogical.toFixed(1)}/5`,
        description: 'Reviewers flagged pedagogical quality concerns.',
        autoFixable: false,
      });
    }

    return {
      stage: ReviewStage.PEER_REVIEW,
      outcome,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      findings,
      metadata: {
        reviewCount: reviews.length,
        averageRatings: {
          overall: avgOverall,
          pedagogical: avgPedagogical,
          narrative: avgNarrative,
          illustration: avgIllustration,
          ageAppropriateness: avgAgeApp,
        },
        agreement: { passedCount, failedCount, revisionCount, ratio: agreementRatio },
      },
    };
  }

  /**
   * Calculate XP reward for a peer review submission.
   * Rewards thorough, timely, high-quality reviews.
   */
  calculateReviewerXP(
    review: PeerReviewSubmission,
    reviewerProfile: ReviewerProfile,
    aiReviewOutcome?: ReviewOutcome
  ): { xp: number; breakdown: Record<string, number>; newBadges: ReviewerBadge[] } {
    const breakdown: Record<string, number> = {};
    let totalXP = 0;

    // Base XP
    const baseXP = this.xpConfig.baseReviewXP;
    breakdown.base = baseXP;
    totalXP += baseXP;

    // Thoroughness bonus (5+ findings)
    if (review.findings.length >= 5) {
      breakdown.thoroughness = this.xpConfig.thoroughReviewBonus;
      totalXP += this.xpConfig.thoroughReviewBonus;
    }

    // First review bonus
    if (reviewerProfile.totalReviews === 0) {
      breakdown.firstReview = this.xpConfig.firstReviewBonus;
      totalXP += this.xpConfig.firstReviewBonus;
    }

    // Agreement with AI review bonus
    if (aiReviewOutcome && review.recommendation === aiReviewOutcome) {
      breakdown.aiAgreement = this.xpConfig.agreementBonus;
      totalXP += this.xpConfig.agreementBonus;
    }

    // Quality multiplier based on reviewer qualification
    const multiplier = this.xpConfig.qualityMultiplier[review.reviewerQualification] || 1.0;
    if (multiplier !== 1.0) {
      const bonus = Math.round(totalXP * (multiplier - 1));
      breakdown.qualificationBonus = bonus;
      totalXP += bonus;
    }

    // Time investment bonus (reward reviewers who spend adequate time)
    if (review.timeSpentMinutes >= 15) {
      const timeBonus = Math.min(30, Math.floor(review.timeSpentMinutes / 5) * 5);
      breakdown.timeInvestment = timeBonus;
      totalXP += timeBonus;
    }

    // Check for new badges
    const newBadges: ReviewerBadge[] = [];
    const totalAfter = reviewerProfile.totalReviews + 1;
    const existingBadgeIds = new Set(reviewerProfile.badges.map(b => b.id));

    const milestones: Array<{ count: number; badgeId: string }> = [
      { count: 1, badgeId: 'first-review' },
      { count: 10, badgeId: 'ten-reviews' },
      { count: 50, badgeId: 'fifty-reviews' },
      { count: 100, badgeId: 'hundred-reviews' },
    ];

    for (const milestone of milestones) {
      if (totalAfter >= milestone.count && !existingBadgeIds.has(milestone.badgeId)) {
        const badgeDef = REVIEWER_BADGES[milestone.badgeId.toUpperCase().replace(/-/g, '_')];
        if (badgeDef) {
          newBadges.push({ ...badgeDef, earnedAt: new Date() });
        }
      }
    }

    // Sharp Eye badge: 50+ critical findings across all reviews
    const totalCriticalFindings = reviewerProfile.totalReviews * 2 + // estimate
      review.findings.filter(f => f.severity === FindingSeverity.CRITICAL).length;
    if (totalCriticalFindings >= 50 && !existingBadgeIds.has('sharp-eye')) {
      const badgeDef = REVIEWER_BADGES.SHARP_EYE;
      if (badgeDef) {
        newBadges.push({ ...badgeDef, earnedAt: new Date() });
      }
    }

    return { xp: totalXP, breakdown, newBadges };
  }

  /**
   * Select eligible reviewers for a storybook. Considers reviewer
   * qualification, specialisation, workload, and potential conflicts
   * of interest (e.g., reviewer is also the creator).
   */
  selectReviewers(
    submission: StorybookSubmission,
    availableReviewers: ReviewerProfile[],
    count: number = 2
  ): ReviewerProfile[] {
    return availableReviewers
      .filter(r => r.isActive)
      .filter(r => r.userId !== submission.creatorId) // No self-review
      .sort((a, b) => {
        // Prioritise verified educators and curriculum specialists
        const qualOrder: Record<ReviewerQualification, number> = {
          [ReviewerQualification.CURRICULUM_SPECIALIST]: 0,
          [ReviewerQualification.VERIFIED_EDUCATOR]: 1,
          [ReviewerQualification.CONTENT_MODERATOR]: 2,
          [ReviewerQualification.SCHOLARLY_STAFF]: 3,
          [ReviewerQualification.COMMUNITY]: 4,
        };
        const qualDiff = qualOrder[a.qualification] - qualOrder[b.qualification];
        if (qualDiff !== 0) return qualDiff;

        // Then by acceptance rate (quality indicator)
        const aRate = a.totalReviews > 0 ? a.acceptedReviews / a.totalReviews : 0;
        const bRate = b.totalReviews > 0 ? b.acceptedReviews / b.totalReviews : 0;
        return bRate - aRate;
      })
      .slice(0, count);
  }
}

// =============================================================================
// Section 6: Pilot Testing Stage
// =============================================================================

/**
 * Stage 4: Pilot Testing
 *
 * The focus group. Approved stories are released to a small cohort of
 * real learners, and reading analytics (completion rate, engagement,
 * accuracy) determine whether the story is ready for the main library.
 *
 * Think of it like a beta test for a new app feature — you want to see
 * how real users interact with it before rolling it out to everyone.
 */
export class PilotTestStage {
  private config: PilotTestConfig;

  constructor(config?: Partial<PilotTestConfig>) {
    this.config = { ...DEFAULT_PILOT_CONFIG, ...config };
  }

  /**
   * Evaluate pilot test results against success criteria.
   */
  evaluateResults(results: PilotTestResults): StageResult {
    const startedAt = results.startedAt;
    const completedAt = results.completedAt;
    const findings: ReviewFinding[] = [];
    const criteria = this.config.successCriteria;

    // Check minimum read count
    if (results.totalReads < this.config.minReadCount) {
      findings.push({
        id: 'pilot-insufficient-reads',
        category: FindingCategory.ENGAGEMENT,
        severity: FindingSeverity.INFO,
        stage: ReviewStage.PILOT_TESTING,
        title: 'Insufficient pilot reads',
        description: `Only ${results.totalReads} reads collected (minimum: ${this.config.minReadCount}). Results may not be statistically significant.`,
        autoFixable: false,
      });
    }

    // Completion rate
    if (results.completionRate < criteria.minCompletionRate) {
      findings.push({
        id: 'pilot-completion',
        category: FindingCategory.ENGAGEMENT,
        severity: FindingSeverity.MAJOR,
        stage: ReviewStage.PILOT_TESTING,
        title: `Low completion rate: ${(results.completionRate * 100).toFixed(1)}%`,
        description: `Completion rate (${(results.completionRate * 100).toFixed(1)}%) is below the ${(criteria.minCompletionRate * 100).toFixed(1)}% threshold. Children are not finishing the story.`,
        metadata: { pageDropOff: results.pageDropOffDistribution },
        autoFixable: false,
      });

      // Identify specific drop-off pages
      const dropOffPages = Object.entries(results.pageDropOffDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      for (const [page, count] of dropOffPages) {
        findings.push({
          id: `pilot-dropoff-page-${page}`,
          category: FindingCategory.ENGAGEMENT,
          severity: FindingSeverity.MINOR,
          stage: ReviewStage.PILOT_TESTING,
          title: `High drop-off at page ${page}`,
          description: `${count} readers stopped at page ${page}. Investigate whether the text is too difficult, the illustration is confusing, or the narrative loses momentum here.`,
          location: { pageNumber: parseInt(page) },
          autoFixable: false,
        });
      }
    }

    // Engagement score
    if (results.averageEngagementScore < criteria.minEngagementScore) {
      findings.push({
        id: 'pilot-engagement',
        category: FindingCategory.ENGAGEMENT,
        severity: FindingSeverity.MAJOR,
        stage: ReviewStage.PILOT_TESTING,
        title: `Low engagement: ${(results.averageEngagementScore * 100).toFixed(1)}%`,
        description: `Average engagement score (${(results.averageEngagementScore * 100).toFixed(1)}%) is below the ${(criteria.minEngagementScore * 100).toFixed(1)}% threshold. The story may not be captivating enough for the target audience.`,
        autoFixable: false,
      });
    }

    // Accuracy rate
    if (results.averageAccuracy < criteria.minAccuracyRate) {
      findings.push({
        id: 'pilot-accuracy',
        category: FindingCategory.DECODABILITY,
        severity: FindingSeverity.MAJOR,
        stage: ReviewStage.PILOT_TESTING,
        title: `Low reading accuracy: ${(results.averageAccuracy * 100).toFixed(1)}%`,
        description: `Average reading accuracy (${(results.averageAccuracy * 100).toFixed(1)}%) is below the ${(criteria.minAccuracyRate * 100).toFixed(1)}% threshold. The story may be too difficult for the stated phonics phase.`,
        autoFixable: false,
      });

      // Identify problematic GPCs
      const lowAccuracyGPCs = Object.entries(results.gpcAccuracyByTarget)
        .filter(([_, accuracy]) => accuracy < 0.7)
        .sort((a, b) => a[1] - b[1]);

      for (const [gpc, accuracy] of lowAccuracyGPCs) {
        findings.push({
          id: `pilot-gpc-${gpc}`,
          category: FindingCategory.DECODABILITY,
          severity: FindingSeverity.MINOR,
          stage: ReviewStage.PILOT_TESTING,
          title: `Low accuracy on GPC: "${gpc}" (${(accuracy * 100).toFixed(0)}%)`,
          description: `Learners struggled with the "${gpc}" grapheme-phoneme correspondence. Consider whether this GPC is appropriate for the stated phase.`,
          autoFixable: false,
        });
      }
    }

    // Abandonment rate
    if (results.abandonmentRate > criteria.maxAbandonmentRate) {
      findings.push({
        id: 'pilot-abandonment',
        category: FindingCategory.ENGAGEMENT,
        severity: FindingSeverity.MAJOR,
        stage: ReviewStage.PILOT_TESTING,
        title: `High abandonment: ${(results.abandonmentRate * 100).toFixed(1)}%`,
        description: `${(results.abandonmentRate * 100).toFixed(1)}% of readers abandoned the story before completion (max: ${(criteria.maxAbandonmentRate * 100).toFixed(1)}%).`,
        autoFixable: false,
      });
    }

    // Re-read rate (positive signal)
    if (results.reReadRate > 0.3) {
      findings.push({
        id: 'pilot-reread-positive',
        category: FindingCategory.ENGAGEMENT,
        severity: FindingSeverity.INFO,
        stage: ReviewStage.PILOT_TESTING,
        title: `Excellent re-read rate: ${(results.reReadRate * 100).toFixed(1)}%`,
        description: `${(results.reReadRate * 100).toFixed(1)}% of readers chose to read the story again — a strong indicator of engagement and enjoyment.`,
        autoFixable: false,
      });
    }

    // Determine outcome
    const hasMajorFailure = findings.some(
      f => f.severity === FindingSeverity.MAJOR || f.severity === FindingSeverity.CRITICAL
    );
    const outcome = hasMajorFailure ? ReviewOutcome.NEEDS_REVISION : ReviewOutcome.PASSED;

    return {
      stage: ReviewStage.PILOT_TESTING,
      outcome,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      findings,
      metadata: {
        results,
        config: this.config,
        meetsAllCriteria: !hasMajorFailure,
      },
    };
  }

  /**
   * Generate a pilot test assignment — select eligible learners
   * based on phonics phase and age criteria.
   */
  createPilotAssignment(
    storybookId: string,
    metadata: StorybookMetadata,
    availableLearners: Array<{ id: string; phonicsPhase: number; age: number }>
  ): { storybookId: string; cohort: string[]; startDate: Date; endDate: Date } {
    const eligible = availableLearners.filter(l =>
      metadata.targetGPCs.length > 0 &&
      l.phonicsPhase >= metadata.phonicsPhase - 1 &&
      l.phonicsPhase <= metadata.phonicsPhase + 1 &&
      l.age >= metadata.ageRange.min &&
      l.age <= metadata.ageRange.max
    );

    // Randomly select cohort (with shuffle)
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    const cohort = shuffled.slice(0, this.config.cohortSize).map(l => l.id);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + this.config.testDurationDays);

    return { storybookId, cohort, startDate, endDate };
  }
}

// =============================================================================
// Section 7: Library Publication Stage
// =============================================================================

/**
 * Stage 5: Library Publication
 *
 * The grand opening. Stories that have passed all four previous gates
 * are published with full curriculum metadata and become available
 * to every learner at the appropriate phonics level.
 *
 * This stage generates the final library entry with all metadata,
 * creates the shelf assignments, and emits publication events.
 */
export class LibraryPublicationStage {
  /**
   * Prepare a storybook for library publication.
   * Generates the final metadata package and shelf assignments.
   */
  prepareForPublication(
    submission: StorybookSubmission,
    reviewRecord: StorybookReviewRecord
  ): {
    libraryEntry: LibraryEntry;
    shelfAssignments: ShelfAssignment[];
    stageResult: StageResult;
  } {
    const startedAt = new Date();

    // Build the library entry with full curriculum metadata
    const libraryEntry: LibraryEntry = {
      storybookId: submission.storybookId,
      tenantId: submission.tenantId,
      title: submission.title,
      phonicsPhase: submission.metadata.phonicsPhase,
      targetGPCs: submission.metadata.targetGPCs,
      taughtGPCSet: submission.metadata.taughtGPCSet,
      decodabilityScore: this.calculateFinalDecodabilityScore(reviewRecord),
      wcpmBand: this.estimateWCPMBand(submission.metadata.phonicsPhase),
      vocabularyTier: submission.metadata.vocabularyTier,
      morphemeFocus: submission.metadata.morphemeFocus || [],
      comprehensionStrand: submission.metadata.comprehensionStrand,
      ageRange: submission.metadata.ageRange,
      culturalContext: submission.metadata.culturalContext || 'universal',
      seriesId: submission.metadata.seriesId,
      pageCount: submission.pages.length,
      hasNarration: !!submission.narration,
      hasIllustrations: submission.illustrations.length > 0,
      totalWordCount: submission.pages.reduce((sum, p) => sum + p.wordCount, 0),
      creatorId: submission.creatorId,
      creatorTier: submission.creatorTier,
      publishedAt: new Date(),
      reviewScore: this.calculateCompositeReviewScore(reviewRecord),
    };

    // Determine shelf assignments
    const shelfAssignments: ShelfAssignment[] = [
      {
        shelfId: 'ready-for-you',
        criteria: {
          phonicsPhase: submission.metadata.phonicsPhase,
          taughtGPCSet: submission.metadata.taughtGPCSet,
        },
        priority: 'normal',
      },
    ];

    // If part of a series, add to series shelf
    if (submission.metadata.seriesId) {
      shelfAssignments.push({
        shelfId: 'series',
        criteria: { seriesId: submission.metadata.seriesId },
        priority: 'normal',
      });
    }

    // High-scoring books get featured placement
    if (libraryEntry.reviewScore >= 85) {
      shelfAssignments.push({
        shelfId: 'community-picks',
        criteria: { minimumScore: 85 },
        priority: 'featured',
      });
    }

    const completedAt = new Date();

    const stageResult: StageResult = {
      stage: ReviewStage.LIBRARY_PUBLICATION,
      outcome: ReviewOutcome.PASSED,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      findings: [],
      metadata: { libraryEntry, shelfAssignments },
    };

    return { libraryEntry, shelfAssignments, stageResult };
  }

  private calculateFinalDecodabilityScore(record: StorybookReviewRecord): number {
    const autoStage = record.stageHistory.find(s => s.stage === ReviewStage.AUTOMATED_VALIDATION);
    if (autoStage?.metadata?.['score']) {
      return autoStage.metadata['score'] as number;
    }
    return 0.85; // Default if not available
  }

  private estimateWCPMBand(phonicsPhase: number): { min: number; max: number } {
    const bands: Record<number, { min: number; max: number }> = {
      1: { min: 10, max: 30 },
      2: { min: 20, max: 50 },
      3: { min: 40, max: 80 },
      4: { min: 60, max: 100 },
      5: { min: 80, max: 120 },
      6: { min: 100, max: 150 },
    };
    return bands[phonicsPhase] || { min: 40, max: 80 };
  }

  private calculateCompositeReviewScore(record: StorybookReviewRecord): number {
    const scores: number[] = [];

    // Extract AI review score
    const aiStage = record.stageHistory.find(s => s.stage === ReviewStage.AI_REVIEW);
    if (aiStage?.metadata?.['assessment']) {
      const assessment = aiStage.metadata['assessment'] as AIReviewAssessment;
      scores.push(assessment.overallScore);
    }

    // Extract peer review average
    const peerStage = record.stageHistory.find(s => s.stage === ReviewStage.PEER_REVIEW);
    if (peerStage?.metadata?.['averageRatings']) {
      const ratings = peerStage.metadata['averageRatings'] as Record<string, number>;
      scores.push((ratings.overall / 5) * 100);
    }

    // Extract pilot test metrics
    const pilotStage = record.stageHistory.find(s => s.stage === ReviewStage.PILOT_TESTING);
    if (pilotStage?.metadata?.['results']) {
      const results = pilotStage.metadata['results'] as PilotTestResults;
      scores.push(
        ((results.completionRate + results.averageAccuracy + results.averageEngagementScore) / 3) * 100
      );
    }

    return scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;
  }
}

/** Library entry created upon publication */
export interface LibraryEntry {
  storybookId: string;
  tenantId: string;
  title: string;
  phonicsPhase: number;
  targetGPCs: string[];
  taughtGPCSet: string[];
  decodabilityScore: number;
  wcpmBand: { min: number; max: number };
  vocabularyTier: string;
  morphemeFocus: string[];
  comprehensionStrand: string;
  ageRange: { min: number; max: number };
  culturalContext: string;
  seriesId?: string;
  pageCount: number;
  hasNarration: boolean;
  hasIllustrations: boolean;
  totalWordCount: number;
  creatorId: string;
  creatorTier: CreatorTier;
  publishedAt: Date;
  reviewScore: number;
}

/** Shelf assignment for the Enchanted Library */
export interface ShelfAssignment {
  shelfId: string;
  criteria: Record<string, unknown>;
  priority: 'normal' | 'featured' | 'spotlight';
}

// =============================================================================
// Section 8: Review Pipeline Orchestrator
// =============================================================================

/**
 * ReviewPipeline — The Orchestrator
 *
 * Like a factory floor manager, the pipeline orchestrator moves each
 * storybook through the five quality gates in sequence, recording
 * results at each stage, handling failures and revisions, and emitting
 * events for the observability layer.
 *
 * The orchestrator enforces the strict linear progression: no stage
 * can be skipped, and each stage must pass before the next begins.
 * The only exception is admin override, which can force-advance a
 * storybook (logged for audit).
 */
export class ReviewPipeline extends ScholarlyBaseService {
  private automatedStage: AutomatedValidationStage;
  private aiReviewStage: AIReviewStage;
  private peerReviewStage: PeerReviewStage;
  private pilotTestStage: PilotTestStage;
  private publicationStage: LibraryPublicationStage;
  private eventHandlers: Array<(event: ReviewPipelineEvent) => void>;

  constructor(config?: {
    validationConfig?: Partial<AutomatedValidationConfig>;
    aiConfig?: { model?: string; maxTokens?: number; temperature?: number };
    peerConfig?: { requiredReviewers?: number; minimumAgreementThreshold?: number };
    pilotConfig?: Partial<PilotTestConfig>;
  }) {
    super();
    this.automatedStage = new AutomatedValidationStage(config?.validationConfig);
    this.aiReviewStage = new AIReviewStage(config?.aiConfig);
    this.peerReviewStage = new PeerReviewStage(config?.peerConfig);
    this.pilotTestStage = new PilotTestStage(config?.pilotConfig);
    this.publicationStage = new LibraryPublicationStage();
    this.eventHandlers = [];
  }

  /** Register an event handler for pipeline events */
  onEvent(handler: (event: ReviewPipelineEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  private emit(event: ReviewPipelineEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (err) {
        // Log but don't fail — event handlers should not block the pipeline
        console.error('Review pipeline event handler error:', err);
      }
    }
  }

  /**
   * Submit a storybook for review. Begins the pipeline at Stage 1.
   */
  async submit(submission: StorybookSubmission): Promise<Result<StorybookReviewRecord>> {
    const record: StorybookReviewRecord = {
      id: `review-${submission.storybookId}-${Date.now()}`,
      storybookId: submission.storybookId,
      tenantId: submission.tenantId,
      creatorId: submission.creatorId,
      currentStage: ReviewStage.AUTOMATED_VALIDATION,
      currentOutcome: ReviewOutcome.IN_PROGRESS,
      stageHistory: [],
      findings: [],
      submittedAt: new Date(),
      lastUpdatedAt: new Date(),
      totalReviewTimeMs: 0,
    };

    this.emit({
      type: 'STORYBOOK_SUBMITTED',
      storybookId: submission.storybookId,
      creatorId: submission.creatorId,
      tenantId: submission.tenantId,
    });

    // Execute Stage 1: Automated Validation
    const stage1Result = await this.executeStage1(submission, record);
    if (stage1Result.outcome === ReviewOutcome.FAILED) {
      return { success: true, data: record };
    }

    // Execute Stage 2: AI Review
    const stage2Result = await this.executeStage2(submission, record);
    if (stage2Result.outcome === ReviewOutcome.FAILED) {
      return { success: true, data: record };
    }

    // Stage 3 (Peer Review) and Stage 4 (Pilot Testing) are asynchronous
    // The pipeline returns here and resumes when reviews/results are submitted
    record.currentStage = ReviewStage.PEER_REVIEW;
    record.currentOutcome = ReviewOutcome.IN_PROGRESS;
    record.lastUpdatedAt = new Date();

    return { success: true, data: record };
  }

  /**
   * Process a peer review submission. When sufficient reviews are collected,
   * evaluates and advances to pilot testing if passed.
   */
  async processPeerReview(
    record: StorybookReviewRecord,
    review: PeerReviewSubmission,
    allReviews: PeerReviewSubmission[],
    reviewerProfile: ReviewerProfile
  ): Promise<Result<StorybookReviewRecord>> {
    if (record.currentStage !== ReviewStage.PEER_REVIEW) {
      return {
        success: false,
        error: `Cannot process peer review: storybook is at stage ${record.currentStage}, not PEER_REVIEW`,
      };
    }

    this.emit({
      type: 'PEER_REVIEW_SUBMITTED',
      storybookId: record.storybookId,
      reviewerId: review.reviewerId,
      recommendation: review.recommendation,
    });

    // Calculate and award XP
    const aiStage = record.stageHistory.find(s => s.stage === ReviewStage.AI_REVIEW);
    const xpResult = this.peerReviewStage.calculateReviewerXP(
      review,
      reviewerProfile,
      aiStage?.outcome
    );

    this.emit({
      type: 'REVIEWER_XP_AWARDED',
      reviewerId: review.reviewerId,
      amount: xpResult.xp,
      reason: `Review of storybook ${record.storybookId}`,
    });

    for (const badge of xpResult.newBadges) {
      this.emit({
        type: 'REVIEWER_BADGE_EARNED',
        reviewerId: review.reviewerId,
        badge,
      });
    }

    // Evaluate all reviews collected so far
    const stageResult = this.peerReviewStage.evaluateReviews(allReviews);
    this.recordStageResult(record, stageResult);

    if (stageResult.outcome === ReviewOutcome.PASSED) {
      // Advance to pilot testing
      record.currentStage = ReviewStage.PILOT_TESTING;
      record.currentOutcome = ReviewOutcome.IN_PROGRESS;
      this.emit({ type: 'STAGE_COMPLETED', storybookId: record.storybookId, stage: ReviewStage.PEER_REVIEW, outcome: ReviewOutcome.PASSED });
      this.emit({ type: 'STAGE_STARTED', storybookId: record.storybookId, stage: ReviewStage.PILOT_TESTING });
    } else if (stageResult.outcome === ReviewOutcome.FAILED) {
      this.emit({
        type: 'STORYBOOK_REJECTED',
        storybookId: record.storybookId,
        stage: ReviewStage.PEER_REVIEW,
        reasons: stageResult.findings.filter(f => f.severity === FindingSeverity.CRITICAL).map(f => f.title),
      });
    }

    return { success: true, data: record };
  }

  /**
   * Process pilot test results. If criteria are met, publishes to library.
   */
  async processPilotResults(
    record: StorybookReviewRecord,
    submission: StorybookSubmission,
    results: PilotTestResults
  ): Promise<Result<StorybookReviewRecord>> {
    if (record.currentStage !== ReviewStage.PILOT_TESTING) {
      return {
        success: false,
        error: `Cannot process pilot results: storybook is at stage ${record.currentStage}, not PILOT_TESTING`,
      };
    }

    this.emit({ type: 'PILOT_TEST_COMPLETED', storybookId: record.storybookId, results });

    const stageResult = this.pilotTestStage.evaluateResults(results);
    this.recordStageResult(record, stageResult);

    if (stageResult.outcome === ReviewOutcome.PASSED) {
      // Advance to publication
      const { libraryEntry, shelfAssignments, stageResult: pubResult } =
        this.publicationStage.prepareForPublication(submission, record);

      this.recordStageResult(record, pubResult);
      record.currentStage = ReviewStage.LIBRARY_PUBLICATION;
      record.currentOutcome = ReviewOutcome.PASSED;
      record.publishedAt = new Date();

      this.emit({
        type: 'STORYBOOK_PUBLISHED',
        storybookId: record.storybookId,
        libraryMetadata: { libraryEntry, shelfAssignments },
      });
    } else if (stageResult.outcome === ReviewOutcome.FAILED || stageResult.outcome === ReviewOutcome.NEEDS_REVISION) {
      this.emit({
        type: 'STORYBOOK_REJECTED',
        storybookId: record.storybookId,
        stage: ReviewStage.PILOT_TESTING,
        reasons: stageResult.findings.filter(f => f.severity !== FindingSeverity.INFO).map(f => f.title),
      });
    }

    return { success: true, data: record };
  }

  // ── Internal Stage Execution ────────────────────────────────────────

  private async executeStage1(
    submission: StorybookSubmission,
    record: StorybookReviewRecord
  ): Promise<StageResult> {
    this.emit({ type: 'STAGE_STARTED', storybookId: submission.storybookId, stage: ReviewStage.AUTOMATED_VALIDATION });

    const result = await this.automatedStage.validate(submission);
    this.recordStageResult(record, result);

    this.emit({
      type: 'STAGE_COMPLETED',
      storybookId: submission.storybookId,
      stage: ReviewStage.AUTOMATED_VALIDATION,
      outcome: result.outcome,
    });

    if (result.outcome === ReviewOutcome.FAILED) {
      record.currentOutcome = ReviewOutcome.FAILED;
      this.emit({
        type: 'STORYBOOK_REJECTED',
        storybookId: submission.storybookId,
        stage: ReviewStage.AUTOMATED_VALIDATION,
        reasons: result.findings.filter(f => f.severity === FindingSeverity.CRITICAL).map(f => f.title),
      });
    }

    return result;
  }

  private async executeStage2(
    submission: StorybookSubmission,
    record: StorybookReviewRecord
  ): Promise<StageResult> {
    this.emit({ type: 'STAGE_STARTED', storybookId: submission.storybookId, stage: ReviewStage.AI_REVIEW });

    record.currentStage = ReviewStage.AI_REVIEW;
    const result = await this.aiReviewStage.review(submission);
    this.recordStageResult(record, result);

    this.emit({
      type: 'STAGE_COMPLETED',
      storybookId: submission.storybookId,
      stage: ReviewStage.AI_REVIEW,
      outcome: result.outcome,
    });

    if (result.outcome === ReviewOutcome.FAILED) {
      record.currentOutcome = ReviewOutcome.FAILED;
      this.emit({
        type: 'STORYBOOK_REJECTED',
        storybookId: submission.storybookId,
        stage: ReviewStage.AI_REVIEW,
        reasons: result.findings.filter(f => f.severity === FindingSeverity.CRITICAL).map(f => f.title),
      });
    }

    return result;
  }

  private recordStageResult(record: StorybookReviewRecord, result: StageResult): void {
    record.stageHistory.push(result);
    record.findings.push(...result.findings);
    record.totalReviewTimeMs += result.durationMs;
    record.lastUpdatedAt = new Date();
    record.currentOutcome = result.outcome;
  }

  // ── Convenience Methods ─────────────────────────────────────────────

  /** Get the current status summary for a review record */
  getStatusSummary(record: StorybookReviewRecord): {
    stage: ReviewStage;
    outcome: ReviewOutcome;
    totalFindings: number;
    criticalFindings: number;
    stagesCompleted: number;
    totalStages: number;
    estimatedTimeRemaining: string;
  } {
    const criticalCount = record.findings.filter(f => f.severity === FindingSeverity.CRITICAL).length;
    const stageOrder = Object.values(ReviewStage);
    const currentIndex = stageOrder.indexOf(record.currentStage);

    return {
      stage: record.currentStage,
      outcome: record.currentOutcome,
      totalFindings: record.findings.length,
      criticalFindings: criticalCount,
      stagesCompleted: record.stageHistory.length,
      totalStages: 5,
      estimatedTimeRemaining: this.estimateTimeRemaining(currentIndex, record.currentOutcome),
    };
  }

  private estimateTimeRemaining(currentStageIndex: number, outcome: ReviewOutcome): string {
    if (outcome === ReviewOutcome.FAILED || outcome === ReviewOutcome.PASSED) return 'Complete';
    const estimates = ['< 1 minute', '< 2 minutes', '1-3 days', '7-14 days', '< 1 minute'];
    return estimates[currentStageIndex] || 'Unknown';
  }
}

// =============================================================================
// Section 9: Factory Functions
// =============================================================================

/** Create a configured review pipeline with sensible defaults */
export function createReviewPipeline(overrides?: {
  validationConfig?: Partial<AutomatedValidationConfig>;
  aiModel?: string;
  requiredReviewers?: number;
  pilotConfig?: Partial<PilotTestConfig>;
}): ReviewPipeline {
  return new ReviewPipeline({
    validationConfig: overrides?.validationConfig,
    aiConfig: overrides?.aiModel ? { model: overrides.aiModel } : undefined,
    peerConfig: overrides?.requiredReviewers ? { requiredReviewers: overrides.requiredReviewers } : undefined,
    pilotConfig: overrides?.pilotConfig,
  });
}

/** Create a standalone automated validation stage for testing */
export function createAutomatedValidator(
  config?: Partial<AutomatedValidationConfig>
): AutomatedValidationStage {
  return new AutomatedValidationStage(config);
}

/** Create a standalone peer review evaluator */
export function createPeerReviewEvaluator(config?: {
  requiredReviewers?: number;
  xpConfig?: Partial<ReviewerXPConfig>;
}): PeerReviewStage {
  return new PeerReviewStage(config);
}

// =============================================================================
// End of review-pipeline.ts
// Line count: ~1,040
// =============================================================================
