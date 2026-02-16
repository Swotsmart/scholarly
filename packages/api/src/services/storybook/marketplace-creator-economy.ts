// ============================================================================
// SCHOLARLY PLATFORM — Sprint 25, Path C
// Content Marketplace & Creator Economy
// ============================================================================
//
// Sprint 23 opened the front door (SDK). Sprint 24 installed quality
// control (review pipeline). Sprint 25 Path C builds the economy that
// makes the whole ecosystem self-sustaining. Think of it as the
// difference between a charity bookshelf (anyone can donate, no one
// earns) and a thriving bookshop (creators earn from their craft,
// the best content rises to the top, and specific needs are filled
// through bounties).
//
// The marketplace transforms the Scholarly library from "content we
// make" to "content the community makes" — the same shift that turned
// WordPress from a blog tool into 40% of the web, and Scratch from
// a programming tool into a creative universe with 100M+ projects.
//
// C25-001: CREATOR ONBOARDING
//   Profile creation, credential verification (for Platinum tier),
//   content guidelines acceptance, SDK setup wizard. The warm welcome
//   that turns a visitor into a contributing member.
//
// C25-002: REVENUE SHARING ENGINE
//   Engagement-proportional revenue. Creators earn based on reading
//   time, completion rates, and re-reads — not just views. Monthly
//   payout via Stripe Connect. Dashboard showing reads, earnings,
//   and trends. The engine that aligns creator incentives with
//   learner outcomes.
//
// C25-003: CONTENT BOUNTY SYSTEM
//   "We need Phase 3 books about Australian animals for ages 5-7."
//   Targeted content requests funded by the DAO treasury. Creators
//   compete, review pipeline evaluates, best submission wins. The
//   demand signal that fills gaps in the library.
//
// C25-004: OPEN EDUCATIONAL RESOURCE (OER) CHANNEL
//   Creative Commons track for schools that can't afford premium.
//   Free library, OER badges, download statistics. The social
//   mission that ensures no child is left out.
//
// Consumes from prior sprints:
//   - Review pipeline from Sprint 24 (C24-001-003) — content vetting
//   - Content safety from Sprint 24 (C24-004) — submission screening
//   - SDK types (Story, StoryAnalytics) from Sprint 23 (C23-001)
//   - Auth0 identity from Sprint 21 (B21-001) — creator auth
//   - NATS marketplace events from Sprint 22 (scholarly.marketplace.*)
//   - DAO treasury from existing tokenomics (Sprint 10)
//   - StoryAnalytics from Sprint 23 SDK
//
// Produces for Sprint 26:
//   - Creator accounts ready for beta onboarding
//   - Revenue pipeline ready for first payouts
//   - Bounty system ready for seed library gap-filling
//   - OER channel ready for school partnerships
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';

// ============================================================================
// Section 1: Creator Onboarding (C25-001)
// ============================================================================

export type CreatorTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface CreatorProfile {
  readonly id: string;
  readonly userId: string;
  readonly displayName: string;
  readonly bio: string;
  readonly tier: CreatorTier;
  readonly credentials: CreatorCredential[];
  readonly onboardingStatus: OnboardingStatus;
  readonly contentGuidelines: { accepted: boolean; acceptedAt?: Date; version: string };
  readonly sdkSetup: { completed: boolean; apiKeyGenerated: boolean; firstBookGenerated: boolean };
  readonly statistics: CreatorStatistics;
  readonly stripeConnectId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreatorCredential {
  readonly type: 'teaching_certificate' | 'reading_specialist' | 'slp' | 'academic_degree' | 'published_author' | 'experience_years';
  readonly description: string;
  readonly documentUrl?: string;
  readonly verificationStatus: 'pending' | 'verified' | 'rejected';
  readonly verifiedBy?: string;
  readonly verifiedAt?: Date;
}

export type OnboardingStatus = 'profile_created' | 'guidelines_accepted' | 'sdk_setup' | 'first_book' | 'complete';

export interface CreatorStatistics {
  readonly totalBooks: number;
  readonly publishedBooks: number;
  readonly totalReads: number;
  readonly totalEarnings: number;
  readonly averageRating: number;
  readonly averageCompletionRate: number;
  readonly engagementScore: number;
}

export interface OnboardingStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: 'pending' | 'in_progress' | 'complete' | 'skipped';
  readonly required: boolean;
  readonly estimatedMinutes: number;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'profile', title: 'Create Your Profile', description: 'Tell us about yourself and your experience with children\'s education.', status: 'pending', required: true, estimatedMinutes: 3 },
  { id: 'guidelines', title: 'Content Guidelines', description: 'Read and accept the Scholarly content creation guidelines. These ensure every story meets our educational and safety standards.', status: 'pending', required: true, estimatedMinutes: 5 },
  { id: 'credentials', title: 'Verify Credentials', description: 'Upload teaching certificates or other credentials to unlock Platinum tier. Optional but recommended.', status: 'pending', required: false, estimatedMinutes: 5 },
  { id: 'sdk_setup', title: 'Set Up Your Tools', description: 'Generate your API key and install the Content SDK or Storybook CLI.', status: 'pending', required: true, estimatedMinutes: 3 },
  { id: 'first_book', title: 'Create Your First Book', description: 'Follow our guided tutorial to generate your first decodable storybook.', status: 'pending', required: true, estimatedMinutes: 10 },
];

export const TIER_REQUIREMENTS: Record<CreatorTier, { minBooks: number; minRating: number; minEngagement: number; credentialsRequired: boolean; description: string }> = {
  bronze: { minBooks: 0, minRating: 0, minEngagement: 0, credentialsRequired: false, description: 'New creators. Automated validation only. Limited distribution.' },
  silver: { minBooks: 3, minRating: 3.5, minEngagement: 50, credentialsRequired: false, description: 'Peer-reviewed content. Full library distribution.' },
  gold: { minBooks: 10, minRating: 4.0, minEngagement: 200, credentialsRequired: false, description: 'Consistently high quality. Featured placement eligible.' },
  platinum: { minBooks: 20, minRating: 4.5, minEngagement: 500, credentialsRequired: true, description: 'Verified educators. Priority review. Bounty judging.' },
};

export class CreatorOnboardingService extends ScholarlyBaseService {
  constructor() {
    super(null as any, 'CreatorOnboardingService');
  }

  /** Evaluate whether a creator qualifies for a tier upgrade */
  evaluateTierUpgrade(profile: CreatorProfile): Result<{ eligible: boolean; nextTier?: CreatorTier; requirements?: string[] }> {
    const tiers: CreatorTier[] = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(profile.tier);

    if (currentIndex >= tiers.length - 1) {
      return ok({ eligible: false, requirements: ['Already at highest tier'] });
    }

    const nextTier = tiers[currentIndex + 1];
    const req = TIER_REQUIREMENTS[nextTier];
    const unmet: string[] = [];

    if (profile.statistics.publishedBooks < req.minBooks) unmet.push(`Need ${req.minBooks} published books (have ${profile.statistics.publishedBooks})`);
    if (profile.statistics.averageRating < req.minRating) unmet.push(`Need ${req.minRating}+ average rating (have ${profile.statistics.averageRating.toFixed(1)})`);
    if (profile.statistics.engagementScore < req.minEngagement) unmet.push(`Need ${req.minEngagement}+ engagement score (have ${profile.statistics.engagementScore})`);
    if (req.credentialsRequired && !profile.credentials.some(c => c.verificationStatus === 'verified')) unmet.push('Need at least one verified credential');

    return ok({
      eligible: unmet.length === 0,
      nextTier,
      requirements: unmet.length > 0 ? unmet : undefined,
    });
  }

  /** Calculate onboarding progress percentage */
  calculateProgress(profile: CreatorProfile): number {
    const steps = ONBOARDING_STEPS;
    const requiredSteps = steps.filter(s => s.required);
    let completed = 0;

    if (profile.displayName && profile.bio) completed++;
    if (profile.contentGuidelines.accepted) completed++;
    if (profile.sdkSetup.apiKeyGenerated) completed++;
    if (profile.sdkSetup.firstBookGenerated) completed++;

    return Math.round((completed / requiredSteps.length) * 100);
  }
}

// ============================================================================
// Section 2: Revenue Sharing Engine (C25-002)
// ============================================================================

export interface RevenueConfig {
  readonly creatorSharePercent: number;       // e.g. 40 = creators get 40% of content revenue
  readonly platformSharePercent: number;      // e.g. 50 = platform keeps 50%
  readonly daoTreasuryPercent: number;        // e.g. 10 = 10% to DAO treasury
  readonly minPayoutAmount: number;           // Minimum payout in USD
  readonly payoutFrequency: 'monthly' | 'quarterly';
  readonly engagementWeights: EngagementWeights;
}

export interface EngagementWeights {
  readonly readingTimeWeight: number;         // 0.0-1.0
  readonly completionRateWeight: number;      // 0.0-1.0
  readonly reReadWeight: number;              // 0.0-1.0
  readonly accuracyWeight: number;            // 0.0-1.0 (children learning = good content)
}

export const DEFAULT_REVENUE_CONFIG: RevenueConfig = {
  creatorSharePercent: 40,
  platformSharePercent: 50,
  daoTreasuryPercent: 10,
  minPayoutAmount: 10.00,
  payoutFrequency: 'monthly',
  engagementWeights: {
    readingTimeWeight: 0.30,
    completionRateWeight: 0.30,
    reReadWeight: 0.20,
    accuracyWeight: 0.20,
  },
};

export interface CreatorEarning {
  readonly id: string;
  readonly creatorId: string;
  readonly storyId: string;
  readonly period: string;               // YYYY-MM
  readonly reads: number;
  readonly totalReadingTimeMinutes: number;
  readonly avgCompletionRate: number;
  readonly avgAccuracy: number;
  readonly reReads: number;
  readonly engagementScore: number;
  readonly rawAmount: number;            // USD
  readonly adjustedAmount: number;       // After tier multiplier
  readonly tierMultiplier: number;
  readonly status: 'calculated' | 'approved' | 'paid' | 'disputed';
  readonly calculatedAt: Date;
}

export interface PayoutSummary {
  readonly creatorId: string;
  readonly period: string;
  readonly totalEarnings: number;
  readonly bookBreakdown: { storyId: string; title: string; earnings: number; reads: number }[];
  readonly tierMultiplier: number;
  readonly payoutAmount: number;
  readonly stripeTransferId?: string;
  readonly status: 'pending' | 'processing' | 'paid' | 'failed';
}

export class RevenueShareEngine extends ScholarlyBaseService {
  private readonly config: RevenueConfig;

  constructor(config: RevenueConfig = DEFAULT_REVENUE_CONFIG) {
    super(null as any, 'RevenueShareEngine');
    this.config = config;
  }

  /**
   * Calculate a creator's engagement score for a single story in a period.
   * The score determines their share of the revenue pool — higher engagement
   * means the content is genuinely helping children learn, which earns
   * more revenue.
   */
  calculateEngagementScore(metrics: {
    totalReadingTimeMinutes: number;
    completionRate: number;
    reReadRate: number;
    averageAccuracy: number;
    reads: number;
  }): number {
    const w = this.config.engagementWeights;

    // Normalise each metric to 0-100
    const timeScore = Math.min(100, (metrics.totalReadingTimeMinutes / metrics.reads) * 10);
    const completionScore = metrics.completionRate * 100;
    const reReadScore = Math.min(100, metrics.reReadRate * 200);
    const accuracyScore = metrics.averageAccuracy * 100;

    const weighted = (timeScore * w.readingTimeWeight)
                   + (completionScore * w.completionRateWeight)
                   + (reReadScore * w.reReadWeight)
                   + (accuracyScore * w.accuracyWeight);

    // Volume multiplier: more reads = more impact (logarithmic)
    const volumeMultiplier = Math.log10(Math.max(10, metrics.reads)) / 2;

    return Math.round(weighted * volumeMultiplier * 10) / 10;
  }

  /** Get the tier earnings multiplier */
  getTierMultiplier(tier: CreatorTier): number {
    const multipliers: Record<CreatorTier, number> = {
      bronze: 1.0, silver: 1.1, gold: 1.2, platinum: 1.5,
    };
    return multipliers[tier];
  }

  /** Calculate a single earning record for one story in one period */
  calculateEarning(params: {
    creatorId: string;
    storyId: string;
    period: string;
    tier: CreatorTier;
    metrics: {
      reads: number;
      totalReadingTimeMinutes: number;
      completionRate: number;
      reReadRate: number;
      averageAccuracy: number;
    };
    totalRevenuePool: number;          // Total subscription revenue for the period
    totalPlatformEngagement: number;   // Sum of all creators' engagement scores
  }): Result<CreatorEarning> {
    try {
      const engagementScore = this.calculateEngagementScore(params.metrics);
      const tierMultiplier = this.getTierMultiplier(params.tier);

      // Creator's share = (their engagement / total engagement) * creator pool
      const creatorPool = params.totalRevenuePool * (this.config.creatorSharePercent / 100);
      const shareRatio = params.totalPlatformEngagement > 0
        ? engagementScore / params.totalPlatformEngagement
        : 0;

      const rawAmount = Math.round(creatorPool * shareRatio * 100) / 100;
      const adjustedAmount = Math.round(rawAmount * tierMultiplier * 100) / 100;

      return ok({
        id: `earn_${params.creatorId}_${params.storyId}_${params.period}`,
        creatorId: params.creatorId,
        storyId: params.storyId,
        period: params.period,
        reads: params.metrics.reads,
        totalReadingTimeMinutes: params.metrics.totalReadingTimeMinutes,
        avgCompletionRate: params.metrics.completionRate,
        avgAccuracy: params.metrics.averageAccuracy,
        reReads: Math.round(params.metrics.reads * params.metrics.reReadRate),
        engagementScore,
        rawAmount,
        adjustedAmount,
        tierMultiplier,
        status: 'calculated',
        calculatedAt: new Date(),
      });
    } catch (error) {
      return fail(`Earning calculation failed: ${error}`, 'EARNING_CALC_FAILED');
    }
  }

  /** Check if a payout meets the minimum threshold */
  meetsMinimumPayout(amount: number): boolean {
    return amount >= this.config.minPayoutAmount;
  }
}

// ============================================================================
// Section 3: Content Bounty System (C25-003)
// ============================================================================

export type BountyStatus = 'draft' | 'active' | 'submissions_closed' | 'judging' | 'awarded' | 'expired' | 'cancelled';

export interface ContentBounty {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly requirements: BountyRequirements;
  readonly reward: BountyReward;
  readonly timeline: BountyTimeline;
  readonly submissions: BountySubmission[];
  readonly status: BountyStatus;
  readonly createdBy: string;             // Admin or DAO vote
  readonly judgeIds: string[];            // Platinum-tier reviewers
  readonly winnerId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface BountyRequirements {
  readonly phonicsPhase: number;
  readonly targetGpcs?: string[];
  readonly ageGroup: string;
  readonly theme: string;
  readonly pageCount: { min: number; max: number };
  readonly minDecodability: number;
  readonly artStyle?: string;
  readonly additionalCriteria?: string;
}

export interface BountyReward {
  readonly amount: number;                // USD
  readonly currency: 'USD' | 'SCH_TOKEN';
  readonly source: 'dao_treasury' | 'platform' | 'sponsor';
  readonly sponsorName?: string;
  readonly runnerUpReward?: number;
}

export interface BountyTimeline {
  readonly opensAt: Date;
  readonly submissionDeadline: Date;
  readonly judgingDeadline: Date;
  readonly awardedBy: Date;
}

export interface BountySubmission {
  readonly id: string;
  readonly bountyId: string;
  readonly creatorId: string;
  readonly storyId: string;
  readonly submittedAt: Date;
  readonly reviewPipelineId?: string;
  readonly scores?: { judge: string; score: number; comments: string }[];
  readonly status: 'submitted' | 'reviewing' | 'shortlisted' | 'winner' | 'runner_up' | 'not_selected';
}

export class BountyService extends ScholarlyBaseService {
  constructor() {
    super(null as any, 'BountyService');
  }

  /** Validate that a submission meets bounty requirements */
  validateSubmission(bounty: ContentBounty, storyMetadata: {
    phonicsPhase: number;
    decodabilityScore: number;
    pageCount: number;
    ageGroup: string;
  }): Result<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const req = bounty.requirements;

    if (storyMetadata.phonicsPhase !== req.phonicsPhase) {
      issues.push(`Phonics phase mismatch: required ${req.phonicsPhase}, got ${storyMetadata.phonicsPhase}`);
    }
    if (storyMetadata.decodabilityScore < req.minDecodability) {
      issues.push(`Decodability ${(storyMetadata.decodabilityScore * 100).toFixed(1)}% below minimum ${(req.minDecodability * 100)}%`);
    }
    if (storyMetadata.pageCount < req.pageCount.min || storyMetadata.pageCount > req.pageCount.max) {
      issues.push(`Page count ${storyMetadata.pageCount} outside range ${req.pageCount.min}-${req.pageCount.max}`);
    }
    if (storyMetadata.ageGroup !== req.ageGroup) {
      issues.push(`Age group mismatch: required ${req.ageGroup}, got ${storyMetadata.ageGroup}`);
    }

    return ok({ valid: issues.length === 0, issues });
  }

  /** Check if a bounty is still accepting submissions */
  isAcceptingSubmissions(bounty: ContentBounty): boolean {
    return bounty.status === 'active' && new Date() < bounty.timeline.submissionDeadline;
  }

  /** Calculate the average judge score for a submission */
  calculateAverageScore(submission: BountySubmission): number {
    if (!submission.scores || submission.scores.length === 0) return 0;
    return submission.scores.reduce((sum, s) => sum + s.score, 0) / submission.scores.length;
  }

  /** Select winner from scored submissions */
  selectWinner(submissions: BountySubmission[]): Result<{ winner: BountySubmission; runnerUp?: BountySubmission }> {
    const scored = submissions
      .filter(s => s.scores && s.scores.length > 0)
      .map(s => ({ submission: s, avgScore: this.calculateAverageScore(s) }))
      .sort((a, b) => b.avgScore - a.avgScore);

    if (scored.length === 0) {
      return fail('No scored submissions', 'NO_SUBMISSIONS');
    }

    return ok({
      winner: scored[0].submission,
      runnerUp: scored.length > 1 ? scored[1].submission : undefined,
    });
  }
}

// ============================================================================
// Section 4: OER Channel (C25-004)
// ============================================================================

export type OerLicense = 'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'CC-BY-NC-4.0' | 'CC-BY-NC-SA-4.0';

export interface OerContent {
  readonly storyId: string;
  readonly license: OerLicense;
  readonly creatorId: string;
  readonly publishedAt: Date;
  readonly downloadCount: number;
  readonly schoolsUsing: number;
  readonly oerBadge: boolean;
  readonly attributionText: string;
}

export interface OerChannelConfig {
  readonly enabledLicenses: OerLicense[];
  readonly oerBadgeThreshold: number;        // Downloads to earn badge
  readonly freeForSchools: boolean;
  readonly downloadTracking: boolean;
  readonly maxDownloadsPerDay: number;        // Rate limiting
}

export const DEFAULT_OER_CONFIG: OerChannelConfig = {
  enabledLicenses: ['CC-BY-4.0', 'CC-BY-SA-4.0', 'CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0'],
  oerBadgeThreshold: 100,
  freeForSchools: true,
  downloadTracking: true,
  maxDownloadsPerDay: 50,
};

export const OER_LICENSE_DETAILS: Record<OerLicense, { name: string; description: string; commercial: boolean; shareAlike: boolean }> = {
  'CC-BY-4.0': { name: 'Creative Commons Attribution 4.0', description: 'Others can share, adapt, and build upon the work, even commercially, with attribution.', commercial: true, shareAlike: false },
  'CC-BY-SA-4.0': { name: 'Creative Commons Attribution-ShareAlike 4.0', description: 'Like CC-BY, but derivatives must use the same license.', commercial: true, shareAlike: true },
  'CC-BY-NC-4.0': { name: 'Creative Commons Attribution-NonCommercial 4.0', description: 'Others can share and adapt, but not for commercial purposes.', commercial: false, shareAlike: false },
  'CC-BY-NC-SA-4.0': { name: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0', description: 'Non-commercial sharing with same-license derivatives.', commercial: false, shareAlike: true },
};

export class OerService extends ScholarlyBaseService {
  private readonly config: OerChannelConfig;

  constructor(config: OerChannelConfig = DEFAULT_OER_CONFIG) {
    super(null as any, 'OerService');
    this.config = config;
  }

  /** Check if content qualifies for the OER badge */
  qualifiesForBadge(content: OerContent): boolean {
    return content.downloadCount >= this.config.oerBadgeThreshold;
  }

  /** Generate attribution text for OER content */
  generateAttribution(creatorName: string, storyTitle: string, license: OerLicense): string {
    return `"${storyTitle}" by ${creatorName} is licensed under ${OER_LICENSE_DETAILS[license].name}. Available via the Scholarly OER Library.`;
  }

  /** Validate that a license choice is permitted */
  isLicenseEnabled(license: OerLicense): boolean {
    return this.config.enabledLicenses.includes(license);
  }

  /** Check download rate limit */
  isWithinRateLimit(downloadsToday: number): boolean {
    return downloadsToday < this.config.maxDownloadsPerDay;
  }
}

// ============================================================================
// Section 5: Marketplace NATS Events
// ============================================================================
// These events integrate with Sprint 22's NATS event bus on the
// scholarly.marketplace.* subject hierarchy.

export interface MarketplaceEvent {
  readonly type: string;
  readonly natsSubject: string;
  readonly description: string;
  readonly payload: Record<string, string>;
}

export const MARKETPLACE_EVENTS: MarketplaceEvent[] = [
  { type: 'creator.onboarded', natsSubject: 'scholarly.marketplace.creator.onboarded', description: 'New creator completed onboarding', payload: { creatorId: 'string', tier: 'string', timestamp: 'ISO8601' } },
  { type: 'creator.tier_upgraded', natsSubject: 'scholarly.marketplace.creator.tier_upgraded', description: 'Creator advanced to new tier', payload: { creatorId: 'string', fromTier: 'string', toTier: 'string' } },
  { type: 'earning.calculated', natsSubject: 'scholarly.marketplace.earning.calculated', description: 'Monthly earnings calculated for a creator', payload: { creatorId: 'string', period: 'YYYY-MM', amount: 'number' } },
  { type: 'payout.processed', natsSubject: 'scholarly.marketplace.payout.processed', description: 'Stripe payout completed', payload: { creatorId: 'string', amount: 'number', stripeTransferId: 'string' } },
  { type: 'bounty.created', natsSubject: 'scholarly.marketplace.bounty.created', description: 'New content bounty posted', payload: { bountyId: 'string', theme: 'string', reward: 'number' } },
  { type: 'bounty.awarded', natsSubject: 'scholarly.marketplace.bounty.awarded', description: 'Bounty winner selected', payload: { bountyId: 'string', winnerId: 'string', storyId: 'string' } },
  { type: 'oer.published', natsSubject: 'scholarly.marketplace.oer.published', description: 'Content published as OER', payload: { storyId: 'string', license: 'string', creatorId: 'string' } },
  { type: 'oer.downloaded', natsSubject: 'scholarly.marketplace.oer.downloaded', description: 'OER content downloaded', payload: { storyId: 'string', schoolId: 'string' } },
];
