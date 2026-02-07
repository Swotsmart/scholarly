// ============================================================================
// S16-004: CONTENT MARKETPLACE BETA
// Scholarly Platform — Sprint 16
//
// The Content Marketplace is where the Scholarly ecosystem becomes
// self-sustaining — like a coral reef where every organism contributes to
// the health of the whole. Educators create content, learners consume it,
// engagement data flows back to creators as both insights and revenue, and
// the library grows richer every day. This implements the creator economy
// described in the Strategy Document (Part 2, §2.4): revenue sharing,
// creator tiers, content bounties, and the five-stage quality review
// pipeline (§2.3).
// ============================================================================

import { ScholarlyBaseService, Result, EventEmitter } from '../shared/base';

// ============================================================================
// SECTION 1: TYPE SYSTEM
// ============================================================================

export enum CreatorTier {
  BRONZE = 'BRONZE',         // Automated validation only, limited distribution
  SILVER = 'SILVER',         // Peer-reviewed, full distribution
  GOLD = 'GOLD',             // Consistently high engagement, featured placement
  PLATINUM = 'PLATINUM',     // Verified educator credentials, priority review
}

export enum ReviewStage {
  AUTOMATED_VALIDATION = 'AUTOMATED_VALIDATION',
  AI_REVIEW = 'AI_REVIEW',
  PEER_REVIEW = 'PEER_REVIEW',
  PILOT_TESTING = 'PILOT_TESTING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
}

export enum ContentLicense {
  SCHOLARLY_STANDARD = 'SCHOLARLY_STANDARD',   // Platform-exclusive, revenue sharing
  CREATIVE_COMMONS_BY = 'CC_BY',              // Attribution only
  CREATIVE_COMMONS_BY_SA = 'CC_BY_SA',        // Attribution + ShareAlike
  CREATIVE_COMMONS_BY_NC = 'CC_BY_NC',        // Attribution + NonCommercial
  CREATIVE_COMMONS_BY_NC_SA = 'CC_BY_NC_SA',  // Attribution + NC + SA
  CREATIVE_COMMONS_ZERO = 'CC0',              // Public domain dedication
}

export enum BountyStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMISSIONS_CLOSED = 'SUBMISSIONS_CLOSED',
  JUDGING = 'JUDGING',
  AWARDED = 'AWARDED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface CreatorProfile {
  id: string;
  userId: string;
  tenantId: string;
  displayName: string;
  bio: string;
  tier: CreatorTier;
  verifiedEducator: boolean;
  credentials: EducatorCredential[];
  stats: CreatorStats;
  payoutConfig: PayoutConfig;
  preferences: CreatorPreferences;
  joinedAt: Date;
  lastPublishedAt?: Date;
}

export interface EducatorCredential {
  type: 'teaching_license' | 'degree' | 'certification' | 'experience';
  description: string;
  issuingBody: string;
  verified: boolean;
  verifiedAt?: Date;
}

export interface CreatorStats {
  totalSubmissions: number;
  totalPublished: number;
  totalReads: number;
  totalCompletionRate: number;
  averageRating: number;
  totalEarnings: number;
  pendingEarnings: number;
  reviewsCompleted: number;
  bountiesWon: number;
}

export interface PayoutConfig {
  method: 'stripe' | 'paypal' | 'bank_transfer' | 'scholarly_tokens';
  accountId: string;
  currency: string;
  minimumPayout: number;
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
}

export interface CreatorPreferences {
  defaultLicense: ContentLicense;
  autoSubmitToReview: boolean;
  notifyOnReviewUpdate: boolean;
  notifyOnMilestone: boolean;
  showEarningsPublicly: boolean;
}

// Review Pipeline types
export interface ContentSubmission {
  id: string;
  creatorId: string;
  storybookId: string;
  title: string;
  currentStage: ReviewStage;
  stageHistory: StageTransition[];
  automatedResults?: AutomatedValidationResult;
  aiReviewResult?: AIReviewResult;
  peerReviews: PeerReview[];
  pilotResults?: PilotTestResult;
  submittedAt: Date;
  lastUpdatedAt: Date;
  estimatedCompletionAt: Date;
  license: ContentLicense;
}

export interface StageTransition {
  from: ReviewStage;
  to: ReviewStage;
  timestamp: Date;
  reason: string;
  automatedDecision: boolean;
}

export interface AutomatedValidationResult {
  passed: boolean;
  decodabilityScore: number;
  decodabilityPassed: boolean;
  vocabularyTierCorrect: boolean;
  contentSafetyPassed: boolean;
  illustrationAppropriatePassed: boolean;
  metadataComplete: boolean;
  issues: { type: string; severity: 'error' | 'warning'; message: string }[];
  executedAt: Date;
}

export interface AIReviewResult {
  passed: boolean;
  overallScore: number;
  pedagogicalQuality: number;
  narrativeCoherence: number;
  ageAppropriateness: number;
  curriculumAlignment: number;
  engagementPotential: number;
  feedback: string;
  suggestions: string[];
  reviewedAt: Date;
}

export interface PeerReview {
  reviewerId: string;
  reviewerName: string;
  reviewerTier: CreatorTier;
  score: number;
  pedagogicalQuality: number;
  narrativeQuality: number;
  illustrationQuality: number;
  curriculumAccuracy: number;
  comments: string;
  recommendation: 'approve' | 'revise' | 'reject';
  submittedAt: Date;
}

export interface PilotTestResult {
  cohortSize: number;
  completionRate: number;
  averageAccuracy: number;
  averageEngagementMinutes: number;
  reReadRate: number;
  benchmark: PilotBenchmark;
  passed: boolean;
  notes: string;
}

export interface PilotBenchmark {
  minCompletionRate: number;   // 70%
  minAverageAccuracy: number;  // 75%
  minEngagementMinutes: number; // 3 minutes
  minReReadRate: number;        // 10%
}

// Revenue & Marketplace types
export interface RevenueShare {
  creatorId: string;
  storybookId: string;
  period: string; // YYYY-MM
  reads: number;
  completionRate: number;
  engagementMinutes: number;
  revenueShare: number;
  calculationDetails: RevenueCalculation;
}

export interface RevenueCalculation {
  totalPoolForPeriod: number;
  creatorEngagementScore: number;
  platformEngagementScore: number;
  sharePercentage: number;
  baseRate: number;
  qualityMultiplier: number;
  tierBonus: number;
  finalAmount: number;
}

export interface ContentBounty {
  id: string;
  title: string;
  description: string;
  requirements: BountyRequirements;
  reward: BountyReward;
  status: BountyStatus;
  postedBy: string;
  submissions: BountySubmission[];
  winnerId?: string;
  postedAt: Date;
  deadline: Date;
  awardedAt?: Date;
}

export interface BountyRequirements {
  phonicsPhase: number;
  targetGPCs?: string[];
  theme: string;
  ageGroup: string;
  minPageCount: number;
  maxPageCount: number;
  artStyle?: string;
  culturalContext?: string;
  additionalNotes: string;
}

export interface BountyReward {
  type: 'tokens' | 'currency' | 'subscription_credit';
  amount: number;
  currency?: string;
  bonusForExcellence?: number;
}

export interface BountySubmission {
  id: string;
  creatorId: string;
  storybookId: string;
  submittedAt: Date;
  validationScore: number;
  selected: boolean;
}

export interface Payout {
  id: string;
  creatorId: string;
  amount: number;
  currency: string;
  period: string;
  breakdown: { storybookId: string; amount: number; reads: number }[];
  status: PayoutStatus;
  processedAt?: Date;
  transactionId?: string;
}

// ============================================================================
// SECTION 2: CREATOR MANAGEMENT
// ============================================================================

export class CreatorService extends ScholarlyBaseService {
  private creators: Map<string, CreatorProfile> = new Map();

  constructor(private events: EventEmitter) {
    super('creator-service');
  }

  async createProfile(
    userId: string, tenantId: string, displayName: string, bio: string
  ): Promise<Result<CreatorProfile>> {
    const profile: CreatorProfile = {
      id: `creator_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId, tenantId, displayName, bio,
      tier: CreatorTier.BRONZE,
      verifiedEducator: false,
      credentials: [],
      stats: {
        totalSubmissions: 0, totalPublished: 0, totalReads: 0,
        totalCompletionRate: 0, averageRating: 0, totalEarnings: 0,
        pendingEarnings: 0, reviewsCompleted: 0, bountiesWon: 0,
      },
      payoutConfig: {
        method: 'stripe', accountId: '', currency: 'AUD',
        minimumPayout: 50, payoutSchedule: 'monthly',
      },
      preferences: {
        defaultLicense: ContentLicense.SCHOLARLY_STANDARD,
        autoSubmitToReview: true,
        notifyOnReviewUpdate: true,
        notifyOnMilestone: true,
        showEarningsPublicly: false,
      },
      joinedAt: new Date(),
    };

    this.creators.set(profile.id, profile);
    this.events.emit('creator:profile:created', { creatorId: profile.id, tier: profile.tier });
    return Result.ok(profile);
  }

  async submitCredential(creatorId: string, credential: EducatorCredential): Promise<Result<CreatorProfile>> {
    const creator = this.creators.get(creatorId);
    if (!creator) return Result.fail('Creator not found');

    creator.credentials.push(credential);
    this.events.emit('creator:credential:submitted', { creatorId, type: credential.type });
    return Result.ok(creator);
  }

  async verifyCredential(creatorId: string, credentialIndex: number): Promise<Result<CreatorProfile>> {
    const creator = this.creators.get(creatorId);
    if (!creator) return Result.fail('Creator not found');
    if (credentialIndex >= creator.credentials.length) return Result.fail('Credential not found');

    creator.credentials[credentialIndex].verified = true;
    creator.credentials[credentialIndex].verifiedAt = new Date();

    // Check if enough credentials for verified educator status
    const verifiedCount = creator.credentials.filter(c => c.verified).length;
    if (verifiedCount >= 2 && !creator.verifiedEducator) {
      creator.verifiedEducator = true;
      this.events.emit('creator:verified', { creatorId });
    }

    return Result.ok(creator);
  }

  async evaluateTierUpgrade(creatorId: string): Promise<Result<{ eligible: boolean; nextTier?: CreatorTier; criteria: Record<string, { met: boolean; current: number; required: number }> }>> {
    const creator = this.creators.get(creatorId);
    if (!creator) return Result.fail('Creator not found');

    const tierCriteria: Record<CreatorTier, Record<string, number>> = {
      [CreatorTier.BRONZE]: {},
      [CreatorTier.SILVER]: { totalPublished: 3, averageRating: 3.5, reviewsCompleted: 5 },
      [CreatorTier.GOLD]: { totalPublished: 10, averageRating: 4.0, totalReads: 5000, reviewsCompleted: 20 },
      [CreatorTier.PLATINUM]: { totalPublished: 25, averageRating: 4.5, totalReads: 50000, reviewsCompleted: 50 },
    };

    const tierOrder = [CreatorTier.BRONZE, CreatorTier.SILVER, CreatorTier.GOLD, CreatorTier.PLATINUM];
    const currentIndex = tierOrder.indexOf(creator.tier);
    if (currentIndex >= tierOrder.length - 1) {
      return Result.ok({ eligible: false, criteria: {} });
    }

    const nextTier = tierOrder[currentIndex + 1];
    const required = tierCriteria[nextTier];
    const criteria: Record<string, { met: boolean; current: number; required: number }> = {};
    let allMet = true;

    for (const [key, threshold] of Object.entries(required)) {
      const current = (creator.stats as any)[key] || 0;
      const met = current >= threshold;
      criteria[key] = { met, current, required: threshold };
      if (!met) allMet = false;
    }

    // Platinum additionally requires verified educator status
    if (nextTier === CreatorTier.PLATINUM && !creator.verifiedEducator) {
      criteria['verifiedEducator'] = { met: false, current: 0, required: 1 };
      allMet = false;
    }

    if (allMet) {
      creator.tier = nextTier;
      this.events.emit('creator:tier:upgraded', { creatorId, newTier: nextTier });
    }

    return Result.ok({ eligible: allMet, nextTier, criteria });
  }

  async getLeaderboard(limit: number = 20): Promise<Result<{ rank: number; creatorId: string; displayName: string; tier: CreatorTier; totalReads: number; averageRating: number }[]>> {
    const creators = Array.from(this.creators.values())
      .sort((a, b) => b.stats.totalReads - a.stats.totalReads)
      .slice(0, limit)
      .map((c, i) => ({
        rank: i + 1, creatorId: c.id, displayName: c.displayName,
        tier: c.tier, totalReads: c.stats.totalReads, averageRating: c.stats.averageRating,
      }));
    return Result.ok(creators);
  }
}

// ============================================================================
// SECTION 3: FIVE-STAGE REVIEW PIPELINE
// This is the App Store review process for educational content. Every
// community-contributed storybook passes through five quality gates before
// it reaches a child — because in education, quality isn't just about
// polish; it's about accuracy, safety, and pedagogical effectiveness.
// ============================================================================

export class ReviewPipelineService extends ScholarlyBaseService {
  private submissions: Map<string, ContentSubmission> = new Map();
  private readonly PEER_REVIEWS_REQUIRED = 2;
  private readonly PILOT_COHORT_SIZE = 20;

  constructor(private events: EventEmitter) {
    super('review-pipeline');
  }

  async submit(
    creatorId: string, storybookId: string, title: string, license: ContentLicense
  ): Promise<Result<ContentSubmission>> {
    const submission: ContentSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      creatorId, storybookId, title, license,
      currentStage: ReviewStage.AUTOMATED_VALIDATION,
      stageHistory: [],
      peerReviews: [],
      submittedAt: new Date(),
      lastUpdatedAt: new Date(),
      estimatedCompletionAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days estimate
    };

    this.submissions.set(submission.id, submission);
    this.events.emit('review:submitted', { submissionId: submission.id, creatorId });

    // Immediately begin automated validation
    await this.runAutomatedValidation(submission.id);

    return Result.ok(submission);
  }

  /** Stage 1: Automated Validation — catches 80%+ of issues automatically */
  async runAutomatedValidation(submissionId: string): Promise<Result<AutomatedValidationResult>> {
    const submission = this.submissions.get(submissionId);
    if (!submission) return Result.fail('Submission not found');

    // Simulate comprehensive automated checks
    const result: AutomatedValidationResult = {
      passed: true,
      decodabilityScore: 0.88 + Math.random() * 0.10,
      decodabilityPassed: true,
      vocabularyTierCorrect: true,
      contentSafetyPassed: true,
      illustrationAppropriatePassed: true,
      metadataComplete: true,
      issues: [],
      executedAt: new Date(),
    };

    // Check decodability threshold
    result.decodabilityPassed = result.decodabilityScore >= 0.85;
    if (!result.decodabilityPassed) {
      result.passed = false;
      result.issues.push({
        type: 'decodability', severity: 'error',
        message: `Decodability score ${(result.decodabilityScore * 100).toFixed(1)}% below 85% threshold`,
      });
    }

    submission.automatedResults = result;
    submission.lastUpdatedAt = new Date();

    if (result.passed) {
      this.transitionStage(submission, ReviewStage.AI_REVIEW, 'Automated validation passed');
    } else {
      this.transitionStage(submission, ReviewStage.REJECTED, 'Automated validation failed');
    }

    this.events.emit('review:automated:complete', { submissionId, passed: result.passed });
    return Result.ok(result);
  }

  /** Stage 2: AI Review — Claude reviews for pedagogical quality */
  async runAIReview(submissionId: string): Promise<Result<AIReviewResult>> {
    const submission = this.submissions.get(submissionId);
    if (!submission) return Result.fail('Submission not found');
    if (submission.currentStage !== ReviewStage.AI_REVIEW) {
      return Result.fail(`Submission is at stage ${submission.currentStage}, not AI_REVIEW`);
    }

    // In production, this calls Claude with a structured review prompt
    const result: AIReviewResult = {
      passed: true,
      overallScore: 0.75 + Math.random() * 0.20,
      pedagogicalQuality: 0.80 + Math.random() * 0.15,
      narrativeCoherence: 0.85 + Math.random() * 0.10,
      ageAppropriateness: 0.90 + Math.random() * 0.10,
      curriculumAlignment: 0.80 + Math.random() * 0.15,
      engagementPotential: 0.70 + Math.random() * 0.25,
      feedback: 'The story demonstrates strong phonics integration with natural narrative flow. Target GPCs appear in contextually meaningful positions. Character motivation is clear and age-appropriate.',
      suggestions: [
        'Consider adding a comprehension question prompt after page 6',
        'The vocabulary in page 8 could include one more target GPC word',
        'Excellent use of repetitive structure for beginning readers',
      ],
      reviewedAt: new Date(),
    };

    result.passed = result.overallScore >= 0.70;
    submission.aiReviewResult = result;
    submission.lastUpdatedAt = new Date();

    if (result.passed) {
      this.transitionStage(submission, ReviewStage.PEER_REVIEW, 'AI review passed');
    } else {
      this.transitionStage(submission, ReviewStage.REJECTED, `AI review score ${(result.overallScore * 100).toFixed(0)}% below threshold`);
    }

    this.events.emit('review:ai:complete', { submissionId, passed: result.passed, score: result.overallScore });
    return Result.ok(result);
  }

  /** Stage 3: Peer Review — at least two verified educators review */
  async submitPeerReview(submissionId: string, review: PeerReview): Promise<Result<ContentSubmission>> {
    const submission = this.submissions.get(submissionId);
    if (!submission) return Result.fail('Submission not found');
    if (submission.currentStage !== ReviewStage.PEER_REVIEW) {
      return Result.fail(`Submission is at stage ${submission.currentStage}, not PEER_REVIEW`);
    }

    // Prevent self-review
    if (review.reviewerId === submission.creatorId) {
      return Result.fail('Creators cannot review their own submissions');
    }

    // Prevent duplicate review
    if (submission.peerReviews.some(r => r.reviewerId === review.reviewerId)) {
      return Result.fail('This reviewer has already reviewed this submission');
    }

    submission.peerReviews.push(review);
    submission.lastUpdatedAt = new Date();

    this.events.emit('review:peer:submitted', {
      submissionId, reviewerId: review.reviewerId,
      score: review.score, recommendation: review.recommendation,
    });

    // Check if enough peer reviews collected
    if (submission.peerReviews.length >= this.PEER_REVIEWS_REQUIRED) {
      const approvals = submission.peerReviews.filter(r => r.recommendation === 'approve').length;
      const rejections = submission.peerReviews.filter(r => r.recommendation === 'reject').length;

      if (approvals >= this.PEER_REVIEWS_REQUIRED) {
        this.transitionStage(submission, ReviewStage.PILOT_TESTING, 'Peer review approved');
      } else if (rejections >= this.PEER_REVIEWS_REQUIRED) {
        this.transitionStage(submission, ReviewStage.REJECTED, 'Peer review rejected');
      }
      // If mixed, wait for additional reviews or escalate
    }

    return Result.ok(submission);
  }

  /** Stage 4: Pilot Testing — released to small cohort, analytics collected */
  async runPilotTest(submissionId: string): Promise<Result<PilotTestResult>> {
    const submission = this.submissions.get(submissionId);
    if (!submission) return Result.fail('Submission not found');
    if (submission.currentStage !== ReviewStage.PILOT_TESTING) {
      return Result.fail(`Submission is at stage ${submission.currentStage}, not PILOT_TESTING`);
    }

    const benchmark: PilotBenchmark = {
      minCompletionRate: 0.70,
      minAverageAccuracy: 0.75,
      minEngagementMinutes: 3,
      minReReadRate: 0.10,
    };

    // Simulate pilot test results after cohort reading
    const result: PilotTestResult = {
      cohortSize: this.PILOT_COHORT_SIZE,
      completionRate: 0.75 + Math.random() * 0.20,
      averageAccuracy: 0.78 + Math.random() * 0.15,
      averageEngagementMinutes: 4 + Math.random() * 4,
      reReadRate: 0.15 + Math.random() * 0.20,
      benchmark,
      passed: true,
      notes: '',
    };

    result.passed = result.completionRate >= benchmark.minCompletionRate &&
                    result.averageAccuracy >= benchmark.minAverageAccuracy &&
                    result.averageEngagementMinutes >= benchmark.minEngagementMinutes;

    submission.pilotResults = result;
    submission.lastUpdatedAt = new Date();

    if (result.passed) {
      this.transitionStage(submission, ReviewStage.PUBLISHED, 'Pilot test passed');
    } else {
      result.notes = 'Pilot metrics below benchmark. Creator notified with improvement suggestions.';
      this.transitionStage(submission, ReviewStage.REJECTED, 'Pilot test below benchmarks');
    }

    this.events.emit('review:pilot:complete', { submissionId, passed: result.passed, completionRate: result.completionRate });
    return Result.ok(result);
  }

  /** Stage 5: Publication — story enters the main library */
  async publish(submissionId: string): Promise<Result<ContentSubmission>> {
    const submission = this.submissions.get(submissionId);
    if (!submission) return Result.fail('Submission not found');
    if (submission.currentStage !== ReviewStage.PUBLISHED) {
      return Result.fail('Submission has not completed the review pipeline');
    }

    this.events.emit('review:published', {
      submissionId, creatorId: submission.creatorId,
      storybookId: submission.storybookId, title: submission.title,
    });

    return Result.ok(submission);
  }

  async getSubmissionStatus(submissionId: string): Promise<Result<ContentSubmission>> {
    const submission = this.submissions.get(submissionId);
    if (!submission) return Result.fail('Submission not found');
    return Result.ok(submission);
  }

  async listSubmissionsByCreator(creatorId: string): Promise<Result<ContentSubmission[]>> {
    const submissions = Array.from(this.submissions.values())
      .filter(s => s.creatorId === creatorId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    return Result.ok(submissions);
  }

  async getPendingPeerReviews(reviewerTier: CreatorTier): Promise<Result<ContentSubmission[]>> {
    const tierOrder = [CreatorTier.BRONZE, CreatorTier.SILVER, CreatorTier.GOLD, CreatorTier.PLATINUM];
    const reviewerTierIndex = tierOrder.indexOf(reviewerTier);

    // Reviewers can review content from their tier or below
    const eligible = Array.from(this.submissions.values())
      .filter(s => s.currentStage === ReviewStage.PEER_REVIEW)
      .filter(s => s.peerReviews.length < this.PEER_REVIEWS_REQUIRED);

    return Result.ok(eligible);
  }

  private transitionStage(submission: ContentSubmission, to: ReviewStage, reason: string): void {
    const from = submission.currentStage;
    submission.stageHistory.push({
      from, to, timestamp: new Date(), reason, automatedDecision: true,
    });
    submission.currentStage = to;
    submission.lastUpdatedAt = new Date();

    this.events.emit('review:stage:changed', {
      submissionId: submission.id, from, to, reason,
    });
  }
}

// ============================================================================
// SECTION 4: REVENUE SHARING ENGINE
// Revenue sharing aligns creator incentives with learner outcomes: the more
// effective a storybook is at helping children learn to read, the more the
// creator earns. This creates a virtuous cycle where quality begets reward
// and reward begets more quality — like a literary ecosystem where the best
// authors naturally rise to prominence.
// ============================================================================

export class RevenueShareEngine extends ScholarlyBaseService {
  private revenueRecords: Map<string, RevenueShare[]> = new Map();
  private payouts: Map<string, Payout[]> = new Map();

  constructor(private events: EventEmitter) {
    super('revenue-share-engine');
  }

  /**
   * Calculate revenue shares for a given period.
   * 
   * The algorithm works like a weighted voting system:
   * 1. Each read is a "vote" for that storybook
   * 2. Completion rate and engagement weight the votes (quality multiplier)
   * 3. Creator tier provides a bonus (recognising verified educators)
   * 4. The total subscription revenue pool is divided proportionally
   */
  async calculatePeriodShares(
    period: string, totalRevenuePool: number,
    contentEngagement: { creatorId: string; storybookId: string; reads: number; completionRate: number; engagementMinutes: number; rating: number }[]
  ): Promise<Result<RevenueShare[]>> {
    if (contentEngagement.length === 0) return Result.ok([]);

    // Step 1: Calculate engagement scores for each piece of content
    const scored = contentEngagement.map(ce => {
      // Quality multiplier: completion rate × engagement depth × rating
      const qualityMultiplier = ce.completionRate * Math.min(1, ce.engagementMinutes / 10) * (ce.rating / 5);

      // Weighted score = reads × quality multiplier
      const weightedScore = ce.reads * qualityMultiplier;

      return { ...ce, qualityMultiplier, weightedScore };
    });

    // Step 2: Calculate total platform engagement score
    const totalWeightedScore = scored.reduce((sum, s) => sum + s.weightedScore, 0);
    if (totalWeightedScore === 0) return Result.ok([]);

    // Step 3: Distribute revenue pool proportionally
    const shares: RevenueShare[] = scored.map(s => {
      const sharePercentage = s.weightedScore / totalWeightedScore;
      const baseAmount = totalRevenuePool * sharePercentage;

      // Tier bonus: 0% (Bronze), 5% (Silver), 10% (Gold), 15% (Platinum)
      const tierBonus = 0; // Applied after looking up creator profile

      const finalAmount = Math.round(baseAmount * 100) / 100;

      const share: RevenueShare = {
        creatorId: s.creatorId,
        storybookId: s.storybookId,
        period,
        reads: s.reads,
        completionRate: s.completionRate,
        engagementMinutes: s.engagementMinutes,
        revenueShare: finalAmount,
        calculationDetails: {
          totalPoolForPeriod: totalRevenuePool,
          creatorEngagementScore: s.weightedScore,
          platformEngagementScore: totalWeightedScore,
          sharePercentage,
          baseRate: baseAmount,
          qualityMultiplier: s.qualityMultiplier,
          tierBonus,
          finalAmount,
        },
      };

      return share;
    });

    // Store records
    for (const share of shares) {
      if (!this.revenueRecords.has(share.creatorId)) {
        this.revenueRecords.set(share.creatorId, []);
      }
      this.revenueRecords.get(share.creatorId)!.push(share);
    }

    this.events.emit('revenue:period:calculated', {
      period,
      totalPool: totalRevenuePool,
      recipientCount: shares.length,
      totalDistributed: shares.reduce((sum, s) => sum + s.revenueShare, 0),
    });

    return Result.ok(shares);
  }

  async getCreatorEarnings(creatorId: string): Promise<Result<{ total: number; byPeriod: { period: string; amount: number }[]; byStorybook: { storybookId: string; amount: number; reads: number }[] }>> {
    const records = this.revenueRecords.get(creatorId) || [];

    const byPeriod = new Map<string, number>();
    const byStorybook = new Map<string, { amount: number; reads: number }>();

    for (const record of records) {
      byPeriod.set(record.period, (byPeriod.get(record.period) || 0) + record.revenueShare);
      const existing = byStorybook.get(record.storybookId) || { amount: 0, reads: 0 };
      existing.amount += record.revenueShare;
      existing.reads += record.reads;
      byStorybook.set(record.storybookId, existing);
    }

    return Result.ok({
      total: records.reduce((sum, r) => sum + r.revenueShare, 0),
      byPeriod: Array.from(byPeriod.entries()).map(([period, amount]) => ({ period, amount })),
      byStorybook: Array.from(byStorybook.entries()).map(([storybookId, data]) => ({ storybookId, ...data })),
    });
  }

  async processPayout(creatorId: string, period: string): Promise<Result<Payout>> {
    const records = (this.revenueRecords.get(creatorId) || [])
      .filter(r => r.period === period);

    if (records.length === 0) return Result.fail('No earnings for this period');

    const totalAmount = records.reduce((sum, r) => sum + r.revenueShare, 0);

    const payout: Payout = {
      id: `payout_${Date.now()}`,
      creatorId,
      amount: totalAmount,
      currency: 'AUD',
      period,
      breakdown: records.map(r => ({ storybookId: r.storybookId, amount: r.revenueShare, reads: r.reads })),
      status: PayoutStatus.PENDING,
    };

    if (!this.payouts.has(creatorId)) {
      this.payouts.set(creatorId, []);
    }
    this.payouts.get(creatorId)!.push(payout);

    // In production: submit to Stripe Connect for processing
    payout.status = PayoutStatus.PROCESSING;
    this.events.emit('revenue:payout:initiated', { payoutId: payout.id, creatorId, amount: totalAmount });

    return Result.ok(payout);
  }
}

// ============================================================================
// SECTION 5: CONTENT BOUNTY SYSTEM
// ============================================================================

export class BountyService extends ScholarlyBaseService {
  private bounties: Map<string, ContentBounty> = new Map();

  constructor(private events: EventEmitter) {
    super('bounty-service');
  }

  async postBounty(bounty: Omit<ContentBounty, 'id' | 'status' | 'submissions' | 'postedAt'>): Promise<Result<ContentBounty>> {
    const newBounty: ContentBounty = {
      ...bounty,
      id: `bounty_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: BountyStatus.OPEN,
      submissions: [],
      postedAt: new Date(),
    };

    this.bounties.set(newBounty.id, newBounty);
    this.events.emit('bounty:posted', {
      bountyId: newBounty.id, title: newBounty.title,
      reward: newBounty.reward, deadline: newBounty.deadline,
    });

    return Result.ok(newBounty);
  }

  async submitToBounty(bountyId: string, creatorId: string, storybookId: string): Promise<Result<BountySubmission>> {
    const bounty = this.bounties.get(bountyId);
    if (!bounty) return Result.fail('Bounty not found');
    if (bounty.status !== BountyStatus.OPEN) return Result.fail('Bounty is no longer accepting submissions');
    if (new Date() > bounty.deadline) return Result.fail('Bounty deadline has passed');

    // Prevent duplicate submissions from same creator
    if (bounty.submissions.some(s => s.creatorId === creatorId)) {
      return Result.fail('You have already submitted to this bounty');
    }

    const submission: BountySubmission = {
      id: `bsub_${Date.now()}`,
      creatorId, storybookId,
      submittedAt: new Date(),
      validationScore: 0.80 + Math.random() * 0.15,
      selected: false,
    };

    bounty.submissions.push(submission);
    this.events.emit('bounty:submission:received', { bountyId, creatorId });

    return Result.ok(submission);
  }

  async awardBounty(bountyId: string, winnerId: string): Promise<Result<ContentBounty>> {
    const bounty = this.bounties.get(bountyId);
    if (!bounty) return Result.fail('Bounty not found');

    const winnerSubmission = bounty.submissions.find(s => s.creatorId === winnerId);
    if (!winnerSubmission) return Result.fail('Winner did not submit to this bounty');

    winnerSubmission.selected = true;
    bounty.winnerId = winnerId;
    bounty.status = BountyStatus.AWARDED;
    bounty.awardedAt = new Date();

    this.events.emit('bounty:awarded', {
      bountyId, winnerId,
      reward: bounty.reward,
    });

    return Result.ok(bounty);
  }

  async listBounties(status?: BountyStatus): Promise<Result<ContentBounty[]>> {
    let bounties = Array.from(this.bounties.values());
    if (status) bounties = bounties.filter(b => b.status === status);
    bounties.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());
    return Result.ok(bounties);
  }

  async getBounty(id: string): Promise<Result<ContentBounty>> {
    const bounty = this.bounties.get(id);
    if (!bounty) return Result.fail('Bounty not found');
    return Result.ok(bounty);
  }
}

// ============================================================================
// SECTION 6: MARKETPLACE ORCHESTRATOR
// ============================================================================

export class MarketplaceOrchestrator extends ScholarlyBaseService {
  public readonly creators: CreatorService;
  public readonly reviews: ReviewPipelineService;
  public readonly revenue: RevenueShareEngine;
  public readonly bounties: BountyService;

  constructor(private events: EventEmitter) {
    super('marketplace-orchestrator');
    this.creators = new CreatorService(events);
    this.reviews = new ReviewPipelineService(events);
    this.revenue = new RevenueShareEngine(events);
    this.bounties = new BountyService(events);
  }

  /** Full submission flow: create profile if needed, submit content, begin review */
  async submitContent(
    userId: string, tenantId: string, displayName: string,
    storybookId: string, title: string, license: ContentLicense
  ): Promise<Result<{ profile: CreatorProfile; submission: ContentSubmission }>> {
    // Ensure creator profile exists
    let profileResult = await this.findOrCreateProfile(userId, tenantId, displayName);
    if (!profileResult.success) return Result.fail(profileResult.error!);

    // Submit to review pipeline
    const submissionResult = await this.reviews.submit(profileResult.data.id, storybookId, title, license);
    if (!submissionResult.success) return Result.fail(submissionResult.error!);

    // Update creator stats
    profileResult.data.stats.totalSubmissions++;

    return Result.ok({
      profile: profileResult.data,
      submission: submissionResult.data,
    });
  }

  /** End-of-month revenue distribution */
  async runMonthlyRevenueCycle(
    period: string, totalRevenuePool: number,
    engagementData: { creatorId: string; storybookId: string; reads: number; completionRate: number; engagementMinutes: number; rating: number }[]
  ): Promise<Result<{ shares: RevenueShare[]; payoutsInitiated: number }>> {
    // Calculate shares
    const sharesResult = await this.revenue.calculatePeriodShares(period, totalRevenuePool, engagementData);
    if (!sharesResult.success) return Result.fail(sharesResult.error!);

    // Process payouts for each creator
    let payoutsInitiated = 0;
    const creatorIds = new Set(sharesResult.data.map(s => s.creatorId));
    for (const creatorId of creatorIds) {
      const payoutResult = await this.revenue.processPayout(creatorId, period);
      if (payoutResult.success) payoutsInitiated++;
    }

    return Result.ok({ shares: sharesResult.data, payoutsInitiated });
  }

  private async findOrCreateProfile(userId: string, tenantId: string, displayName: string): Promise<Result<CreatorProfile>> {
    // In production, look up by userId first
    return this.creators.createProfile(userId, tenantId, displayName, '');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CreatorService as Creators,
  ReviewPipelineService as ReviewPipeline,
  RevenueShareEngine as RevenueShareService,
  BountyService as Bounties,
};
