// =============================================================================
// Creator Marketplace Service
// =============================================================================
// The Creator Marketplace is the economic engine that transforms the Scholarly
// storybook library from a curated collection into a self-sustaining ecosystem.
// If the Storybook Engine is the printing press and the Developer Tools are the
// typesetting workshop, the Marketplace is the publishing house — it handles
// the business of content: who gets paid, how quality is rewarded, and how
// supply meets demand.
//
// The marketplace implements four economic mechanisms:
// 1. Revenue Sharing: Creators earn proportional to engagement their content generates
// 2. Creator Tiers: Progressive privileges based on quality and consistency
// 3. Content Bounties: Platform-directed requests for specific content gaps
// 4. Open Source Contribution: Creative Commons option for OER libraries
//
// File: marketplace/creator-marketplace.ts
// Sprint: 8 (Developer Ecosystem & Platform Activation)
// Backlog: DE-005
// Lines: ~680
// =============================================================================

import { Result } from '../shared/result';

// =============================================================================
// Section 1: Type Definitions
// =============================================================================

export type CreatorTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'suspended';
export type BountyStatus = 'open' | 'in_progress' | 'judging' | 'awarded' | 'expired' | 'cancelled';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type LicenseType = 'platform_exclusive' | 'creative_commons_by' | 'creative_commons_by_sa' | 'creative_commons_by_nc';

/** Creator profile with marketplace metrics */
export interface CreatorProfile {
  id: string;
  tenantId: string;
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  tier: CreatorTier;
  verificationStatus: VerificationStatus;
  credentials: CreatorCredential[];
  specialisations: string[];
  stats: CreatorStats;
  earnings: CreatorEarnings;
  preferences: CreatorPreferences;
  joinedAt: string;
  lastActiveAt: string;
}

export interface CreatorCredential {
  type: 'teaching_qualification' | 'phonics_certification' | 'slp_license' | 'education_degree' | 'other';
  issuer: string;
  title: string;
  verifiedAt?: string;
  documentUrl?: string;
}

export interface CreatorStats {
  totalSubmissions: number;
  publishedBooks: number;
  rejectedBooks: number;
  totalReads: number;
  averageRating: number;
  averageCompletionRate: number;
  averageDecodabilityScore: number;
  peerReviewsCompleted: number;
  peerReviewAccuracy: number;
  consecutiveQualityPublications: number;
}

export interface CreatorEarnings {
  lifetimeEarningsUsd: number;
  currentMonthUsd: number;
  pendingPayoutUsd: number;
  lastPayoutDate?: string;
  payoutMethod?: 'bank_transfer' | 'paypal' | 'stripe_connect';
  payoutDetails?: Record<string, string>;
  earningsBreakdown: {
    revenueShare: number;
    bountyWinnings: number;
    reviewRewards: number;
    bonuses: number;
  };
}

export interface CreatorPreferences {
  defaultLicense: LicenseType;
  emailNotifications: boolean;
  publicProfile: boolean;
  autoSubmitToReview: boolean;
}

/** Tier progression requirements */
export interface TierRequirements {
  tier: CreatorTier;
  minPublishedBooks: number;
  minAverageRating: number;
  minAverageDecodability: number;
  minPeerReviews: number;
  requiresVerification: boolean;
  benefits: string[];
  revenueSharePercentage: number;
  rateLimitRpm: number;
  reviewPriority: 'standard' | 'expedited' | 'priority';
  featuredPlacement: boolean;
}

/** Content bounty for filling library gaps */
export interface ContentBounty {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  requirements: BountyRequirements;
  rewardUsd: number;
  status: BountyStatus;
  postedBy: string;
  postedAt: string;
  deadline: string;
  submissions: BountySubmission[];
  winnerId?: string;
  judgedAt?: string;
  tags: string[];
}

export interface BountyRequirements {
  phase: number;
  targetGpcs: string[];
  theme: string;
  ageRange: { min: number; max: number };
  minDecodability: number;
  minPageCount: number;
  maxPageCount: number;
  artStyle?: string;
  language?: string;
  curriculumFramework?: string;
  additionalCriteria?: string;
}

export interface BountySubmission {
  creatorId: string;
  storybookId: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
}

/** Revenue share calculation */
export interface RevenueShareCalculation {
  creatorId: string;
  period: { start: string; end: string };
  metrics: {
    totalReads: number;
    totalReadingTimeMinutes: number;
    completionWeightedReads: number;
    uniqueReaders: number;
  };
  platformTotalMetrics: {
    totalReads: number;
    totalReadingTimeMinutes: number;
  };
  sharePercentage: number;
  engagementScore: number;
  calculatedAmountUsd: number;
  bonusUsd: number;
  totalUsd: number;
}

/** Payout record */
export interface PayoutRecord {
  id: string;
  creatorId: string;
  amountUsd: number;
  status: PayoutStatus;
  period: { start: string; end: string };
  breakdown: RevenueShareCalculation;
  payoutMethod: string;
  initiatedAt: string;
  completedAt?: string;
  transactionRef?: string;
}

// =============================================================================
// Section 2: Tier Definitions
// =============================================================================

const TIER_DEFINITIONS: TierRequirements[] = [
  {
    tier: 'bronze',
    minPublishedBooks: 0,
    minAverageRating: 0,
    minAverageDecodability: 85,
    minPeerReviews: 0,
    requiresVerification: false,
    benefits: [
      'Basic content creation and submission',
      'Automated validation feedback',
      'Community forum access',
      'Standard review queue',
    ],
    revenueSharePercentage: 40,
    rateLimitRpm: 30,
    reviewPriority: 'standard',
    featuredPlacement: false,
  },
  {
    tier: 'silver',
    minPublishedBooks: 5,
    minAverageRating: 3.5,
    minAverageDecodability: 88,
    minPeerReviews: 10,
    requiresVerification: false,
    benefits: [
      'All Bronze benefits',
      'Full library distribution',
      'Peer review participation',
      'Revenue sharing access',
      'Expedited review queue',
      'Analytics dashboard',
    ],
    revenueSharePercentage: 50,
    rateLimitRpm: 60,
    reviewPriority: 'expedited',
    featuredPlacement: false,
  },
  {
    tier: 'gold',
    minPublishedBooks: 20,
    minAverageRating: 4.0,
    minAverageDecodability: 90,
    minPeerReviews: 30,
    requiresVerification: false,
    benefits: [
      'All Silver benefits',
      'Featured placement eligibility',
      'Content bounty participation',
      'Priority review queue',
      'Beta feature access',
      'Direct editorial support',
    ],
    revenueSharePercentage: 60,
    rateLimitRpm: 120,
    reviewPriority: 'priority',
    featuredPlacement: true,
  },
  {
    tier: 'platinum',
    minPublishedBooks: 50,
    minAverageRating: 4.5,
    minAverageDecodability: 92,
    minPeerReviews: 50,
    requiresVerification: true,
    benefits: [
      'All Gold benefits',
      'Verified educator badge',
      'Maximum revenue share (70%)',
      'Priority featured placement',
      'Content bounty creation rights',
      'API rate limit exemption',
      'Direct Scholarly partnership',
      'Annual creator summit invitation',
    ],
    revenueSharePercentage: 70,
    rateLimitRpm: 180,
    reviewPriority: 'priority',
    featuredPlacement: true,
  },
];

// =============================================================================
// Section 3: Creator Marketplace Service
// =============================================================================

export class CreatorMarketplaceService {
  private readonly creators: Map<string, CreatorProfile> = new Map();
  private readonly bounties: Map<string, ContentBounty> = new Map();
  private readonly payouts: Map<string, PayoutRecord[]> = new Map();

  // -------------------------------------------------------------------------
  // Creator Profile Management
  // -------------------------------------------------------------------------

  /** Register a new creator in the marketplace */
  registerCreator(
    tenantId: string,
    userId: string,
    displayName: string,
    bio: string
  ): Result<CreatorProfile> {
    // Check for duplicate registration
    for (const creator of this.creators.values()) {
      if (creator.userId === userId && creator.tenantId === tenantId) {
        return { success: false, error: 'Creator already registered for this tenant' };
      }
    }

    const creatorId = `cr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const profile: CreatorProfile = {
      id: creatorId,
      tenantId,
      userId,
      displayName,
      bio,
      tier: 'bronze',
      verificationStatus: 'unverified',
      credentials: [],
      specialisations: [],
      stats: {
        totalSubmissions: 0, publishedBooks: 0, rejectedBooks: 0,
        totalReads: 0, averageRating: 0, averageCompletionRate: 0,
        averageDecodabilityScore: 0, peerReviewsCompleted: 0,
        peerReviewAccuracy: 0, consecutiveQualityPublications: 0,
      },
      earnings: {
        lifetimeEarningsUsd: 0, currentMonthUsd: 0, pendingPayoutUsd: 0,
        earningsBreakdown: { revenueShare: 0, bountyWinnings: 0, reviewRewards: 0, bonuses: 0 },
      },
      preferences: {
        defaultLicense: 'platform_exclusive',
        emailNotifications: true,
        publicProfile: true,
        autoSubmitToReview: false,
      },
      joinedAt: now,
      lastActiveAt: now,
    };

    this.creators.set(creatorId, profile);
    return { success: true, data: profile };
  }

  /** Get a creator profile */
  getCreator(creatorId: string): Result<CreatorProfile> {
    const creator = this.creators.get(creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };
    return { success: true, data: creator };
  }

  /** Update creator profile */
  updateCreator(creatorId: string, updates: Partial<Pick<CreatorProfile, 'displayName' | 'bio' | 'avatarUrl' | 'specialisations' | 'preferences'>>): Result<CreatorProfile> {
    const creator = this.creators.get(creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };

    if (updates.displayName) creator.displayName = updates.displayName;
    if (updates.bio) creator.bio = updates.bio;
    if (updates.avatarUrl) creator.avatarUrl = updates.avatarUrl;
    if (updates.specialisations) creator.specialisations = updates.specialisations;
    if (updates.preferences) creator.preferences = { ...creator.preferences, ...updates.preferences };
    creator.lastActiveAt = new Date().toISOString();

    return { success: true, data: creator };
  }

  /** Submit a credential for verification */
  submitCredential(creatorId: string, credential: Omit<CreatorCredential, 'verifiedAt'>): Result<CreatorProfile> {
    const creator = this.creators.get(creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };

    creator.credentials.push({ ...credential, verifiedAt: undefined });
    if (creator.verificationStatus === 'unverified') {
      creator.verificationStatus = 'pending';
    }

    return { success: true, data: creator };
  }

  // -------------------------------------------------------------------------
  // Tier Evaluation
  // -------------------------------------------------------------------------

  /** Evaluate and potentially promote a creator's tier */
  evaluateTier(creatorId: string): Result<{ previousTier: CreatorTier; newTier: CreatorTier; promoted: boolean; nextTierRequirements?: TierRequirements }> {
    const creator = this.creators.get(creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };

    const previousTier = creator.tier;
    let newTier: CreatorTier = 'bronze';

    // Evaluate against each tier in descending order
    for (const tierDef of [...TIER_DEFINITIONS].reverse()) {
      if (this.meetsTierRequirements(creator, tierDef)) {
        newTier = tierDef.tier;
        break;
      }
    }

    const promoted = this.tierRank(newTier) > this.tierRank(previousTier);
    if (promoted) {
      creator.tier = newTier;
    }

    // Find next tier requirements
    const currentRank = this.tierRank(newTier);
    const nextTier = TIER_DEFINITIONS.find(t => this.tierRank(t.tier) === currentRank + 1);

    return {
      success: true,
      data: {
        previousTier,
        newTier: creator.tier,
        promoted,
        nextTierRequirements: nextTier,
      },
    };
  }

  /** Get tier definition */
  getTierDefinition(tier: CreatorTier): TierRequirements {
    return TIER_DEFINITIONS.find(t => t.tier === tier) || TIER_DEFINITIONS[0];
  }

  /** Get all tier definitions */
  getAllTierDefinitions(): TierRequirements[] {
    return [...TIER_DEFINITIONS];
  }

  private meetsTierRequirements(creator: CreatorProfile, tier: TierRequirements): boolean {
    return (
      creator.stats.publishedBooks >= tier.minPublishedBooks &&
      (creator.stats.averageRating >= tier.minAverageRating || creator.stats.publishedBooks === 0) &&
      (creator.stats.averageDecodabilityScore >= tier.minAverageDecodability || creator.stats.publishedBooks === 0) &&
      creator.stats.peerReviewsCompleted >= tier.minPeerReviews &&
      (!tier.requiresVerification || creator.verificationStatus === 'verified')
    );
  }

  private tierRank(tier: CreatorTier): number {
    const ranks: Record<CreatorTier, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };
    return ranks[tier];
  }

  // -------------------------------------------------------------------------
  // Revenue Share Calculation
  // -------------------------------------------------------------------------

  /**
   * Calculate revenue share for a creator over a given period.
   * 
   * The formula is engagement-weighted: creators earn proportional to the
   * reading engagement their content generates, not just raw read counts.
   * A book that's read completely by 10 children is worth more than a book
   * that's abandoned after 2 pages by 100 children.
   * 
   * Completion-weighted reads = sum of (completion_rate × 1) for each read session
   * So a book read to 100% counts as 1.0, while one abandoned at 50% counts as 0.5
   */
  calculateRevenueShare(
    creatorId: string,
    period: { start: string; end: string },
    creatorMetrics: {
      totalReads: number;
      totalReadingTimeMinutes: number;
      completionWeightedReads: number;
      uniqueReaders: number;
    },
    platformTotalMetrics: {
      totalReads: number;
      totalReadingTimeMinutes: number;
      totalSubscriptionRevenueUsd: number;
    }
  ): Result<RevenueShareCalculation> {
    const creator = this.creators.get(creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };

    const tierDef = this.getTierDefinition(creator.tier);

    // Engagement score: blend of completion-weighted reads and reading time
    // This prevents gaming via many short reads while rewarding genuinely engaging content
    const readShare = platformTotalMetrics.totalReads > 0
      ? creatorMetrics.completionWeightedReads / platformTotalMetrics.totalReads
      : 0;

    const timeShare = platformTotalMetrics.totalReadingTimeMinutes > 0
      ? creatorMetrics.totalReadingTimeMinutes / platformTotalMetrics.totalReadingTimeMinutes
      : 0;

    // Engagement score is 60% completion-weighted reads + 40% reading time
    const engagementScore = readShare * 0.6 + timeShare * 0.4;

    // Creator's share of total revenue pool allocated to creators
    // Platform retains (100 - revenueSharePercentage)% for operations
    const creatorPoolUsd = platformTotalMetrics.totalSubscriptionRevenueUsd * (tierDef.revenueSharePercentage / 100);
    const calculatedAmountUsd = Math.round(creatorPoolUsd * engagementScore * 100) / 100;

    // Quality bonus for high-performing content (>4.5 avg rating, >90% decodability)
    let bonusUsd = 0;
    if (creator.stats.averageRating >= 4.5 && creator.stats.averageDecodabilityScore >= 90) {
      bonusUsd = Math.round(calculatedAmountUsd * 0.1 * 100) / 100; // 10% quality bonus
    }

    const calculation: RevenueShareCalculation = {
      creatorId,
      period,
      metrics: creatorMetrics,
      platformTotalMetrics: {
        totalReads: platformTotalMetrics.totalReads,
        totalReadingTimeMinutes: platformTotalMetrics.totalReadingTimeMinutes,
      },
      sharePercentage: tierDef.revenueSharePercentage,
      engagementScore: Math.round(engagementScore * 10000) / 10000,
      calculatedAmountUsd,
      bonusUsd,
      totalUsd: Math.round((calculatedAmountUsd + bonusUsd) * 100) / 100,
    };

    return { success: true, data: calculation };
  }

  /** Initiate a payout for a creator */
  initiatePayout(creatorId: string, calculation: RevenueShareCalculation): Result<PayoutRecord> {
    const creator = this.creators.get(creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };

    if (calculation.totalUsd < 10) {
      return { success: false, error: 'Minimum payout threshold is $10.00 USD. Earnings will roll over to next period.' };
    }

    if (!creator.earnings.payoutMethod) {
      return { success: false, error: 'No payout method configured. Please set up bank transfer, PayPal, or Stripe Connect.' };
    }

    const payoutId = `po_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const payout: PayoutRecord = {
      id: payoutId,
      creatorId,
      amountUsd: calculation.totalUsd,
      status: 'pending',
      period: calculation.period,
      breakdown: calculation,
      payoutMethod: creator.earnings.payoutMethod,
      initiatedAt: new Date().toISOString(),
    };

    const existing = this.payouts.get(creatorId) || [];
    existing.push(payout);
    this.payouts.set(creatorId, existing);

    // Update creator earnings
    creator.earnings.pendingPayoutUsd += calculation.totalUsd;
    creator.earnings.earningsBreakdown.revenueShare += calculation.calculatedAmountUsd;
    creator.earnings.earningsBreakdown.bonuses += calculation.bonusUsd;

    return { success: true, data: payout };
  }

  /** Get payout history for a creator */
  getPayoutHistory(creatorId: string): Result<PayoutRecord[]> {
    const records = this.payouts.get(creatorId) || [];
    return { success: true, data: records };
  }

  // -------------------------------------------------------------------------
  // Content Bounties
  // -------------------------------------------------------------------------

  /** Post a new content bounty */
  postBounty(
    tenantId: string,
    postedBy: string,
    title: string,
    description: string,
    requirements: BountyRequirements,
    rewardUsd: number,
    deadline: string,
    tags: string[]
  ): Result<ContentBounty> {
    if (rewardUsd < 5) {
      return { success: false, error: 'Minimum bounty reward is $5.00 USD' };
    }

    const bountyId = `bn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const bounty: ContentBounty = {
      id: bountyId,
      tenantId,
      title,
      description,
      requirements,
      rewardUsd,
      status: 'open',
      postedBy,
      postedAt: new Date().toISOString(),
      deadline,
      submissions: [],
      tags,
    };

    this.bounties.set(bountyId, bounty);
    return { success: true, data: bounty };
  }

  /** Submit a storybook to a bounty */
  submitToBounty(bountyId: string, creatorId: string, storybookId: string): Result<ContentBounty> {
    const bounty = this.bounties.get(bountyId);
    if (!bounty) return { success: false, error: 'Bounty not found' };
    if (bounty.status !== 'open' && bounty.status !== 'in_progress') {
      return { success: false, error: `Bounty is ${bounty.status} — submissions are closed` };
    }

    const existingSubmission = bounty.submissions.find(s => s.creatorId === creatorId);
    if (existingSubmission) {
      return { success: false, error: 'You have already submitted to this bounty' };
    }

    const creator = this.creators.get(creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };

    // Gold+ tier required for bounty participation
    if (this.tierRank(creator.tier) < this.tierRank('gold')) {
      return { success: false, error: 'Gold tier or above required to participate in bounties' };
    }

    bounty.submissions.push({
      creatorId,
      storybookId,
      submittedAt: new Date().toISOString(),
    });

    if (bounty.status === 'open') {
      bounty.status = 'in_progress';
    }

    return { success: true, data: bounty };
  }

  /** Award a bounty to a winning submission */
  awardBounty(bountyId: string, winnerId: string, feedback: Record<string, string>): Result<ContentBounty> {
    const bounty = this.bounties.get(bountyId);
    if (!bounty) return { success: false, error: 'Bounty not found' };

    const winnerSubmission = bounty.submissions.find(s => s.creatorId === winnerId);
    if (!winnerSubmission) return { success: false, error: 'Winner not found in submissions' };

    bounty.status = 'awarded';
    bounty.winnerId = winnerId;
    bounty.judgedAt = new Date().toISOString();

    // Score all submissions
    for (const submission of bounty.submissions) {
      submission.feedback = feedback[submission.creatorId] || 'No specific feedback provided.';
      submission.score = submission.creatorId === winnerId ? 100 : undefined;
    }

    // Credit the winner's earnings
    const winner = this.creators.get(winnerId);
    if (winner) {
      winner.earnings.lifetimeEarningsUsd += bounty.rewardUsd;
      winner.earnings.currentMonthUsd += bounty.rewardUsd;
      winner.earnings.earningsBreakdown.bountyWinnings += bounty.rewardUsd;
    }

    return { success: true, data: bounty };
  }

  /** Get open bounties, optionally filtered */
  getOpenBounties(filters?: { phase?: number; theme?: string; minReward?: number }): Result<ContentBounty[]> {
    let bounties = Array.from(this.bounties.values()).filter(b => b.status === 'open' || b.status === 'in_progress');

    if (filters?.phase) bounties = bounties.filter(b => b.requirements.phase === filters.phase);
    if (filters?.theme) bounties = bounties.filter(b => b.requirements.theme.toLowerCase().includes(filters.theme!.toLowerCase()));
    if (filters?.minReward) bounties = bounties.filter(b => b.rewardUsd >= filters.minReward!);

    return { success: true, data: bounties };
  }

  // -------------------------------------------------------------------------
  // Leaderboard & Discovery
  // -------------------------------------------------------------------------

  /** Get the creator leaderboard for a given period */
  getLeaderboard(
    tenantId: string,
    sortBy: 'reads' | 'rating' | 'books' | 'earnings' = 'reads',
    limit: number = 20
  ): Result<Array<{ rank: number; creator: CreatorProfile; metric: number }>> {
    let creators = Array.from(this.creators.values()).filter(c => c.tenantId === tenantId && c.stats.publishedBooks > 0);

    // Sort by requested metric
    switch (sortBy) {
      case 'reads': creators.sort((a, b) => b.stats.totalReads - a.stats.totalReads); break;
      case 'rating': creators.sort((a, b) => b.stats.averageRating - a.stats.averageRating); break;
      case 'books': creators.sort((a, b) => b.stats.publishedBooks - a.stats.publishedBooks); break;
      case 'earnings': creators.sort((a, b) => b.earnings.lifetimeEarningsUsd - a.earnings.lifetimeEarningsUsd); break;
    }

    const leaderboard = creators.slice(0, limit).map((creator, index) => ({
      rank: index + 1,
      creator,
      metric: sortBy === 'reads' ? creator.stats.totalReads
        : sortBy === 'rating' ? creator.stats.averageRating
        : sortBy === 'books' ? creator.stats.publishedBooks
        : creator.earnings.lifetimeEarningsUsd,
    }));

    return { success: true, data: leaderboard };
  }

  /** Record a publication event and update creator stats */
  recordPublication(creatorId: string, decodabilityScore: number): Result<void> {
    const creator = this.creators.get(creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };

    creator.stats.totalSubmissions++;
    creator.stats.publishedBooks++;
    creator.stats.consecutiveQualityPublications++;

    // Update running average decodability
    const total = creator.stats.averageDecodabilityScore * (creator.stats.publishedBooks - 1) + decodabilityScore;
    creator.stats.averageDecodabilityScore = Math.round(total / creator.stats.publishedBooks);

    creator.lastActiveAt = new Date().toISOString();

    // Auto-evaluate tier after publication
    this.evaluateTier(creatorId);

    return { success: true, data: undefined };
  }

  /** Record a rejection and update stats */
  recordRejection(creatorId: string): Result<void> {
    const creator = this.creators.get(creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };

    creator.stats.totalSubmissions++;
    creator.stats.rejectedBooks++;
    creator.stats.consecutiveQualityPublications = 0;
    creator.lastActiveAt = new Date().toISOString();

    return { success: true, data: undefined };
  }
}

export default CreatorMarketplaceService;
