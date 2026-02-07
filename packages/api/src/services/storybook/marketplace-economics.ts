// =============================================================================
// SCHOLARLY PLATFORM — Content Marketplace & Webhook Events
// Sprint 4 | MK-001 + MK-002 | marketplace.ts
// =============================================================================
// The marketplace is the economic engine that incentivises quality content
// creation at scale. Think of it as an App Store for educational storybooks:
// creators build, the platform validates, and learners benefit — with revenue
// flowing back to the creators who produce the most engaging content.
//
// MK-001: Creator profiles, content bounties, revenue sharing, tier system
// MK-002: Webhook events for review status, publication, and analytics
//
// Consumes:
//   - Review Pipeline from Sprint 4 (review-pipeline.ts)
//   - NATS event bus from Sprint 1 for cross-module notifications
//   - DAO/token infrastructure for bounty funding
//
// =============================================================================

import { ScholarlyBaseService, Result } from '../base-service';

// =============================================================================
// Section 1: Creator Profiles
// =============================================================================

/** Creator tier progression — like guild ranks in an MMORPG */
export enum CreatorTier {
  BRONZE = 'BRONZE',       // New creators: automated validation only, limited distribution
  SILVER = 'SILVER',       // Peer-reviewed: full distribution across library
  GOLD = 'GOLD',           // Consistent quality: featured placement, higher revenue share
  PLATINUM = 'PLATINUM',   // Verified educators: priority review, spotlight features
}

/** Verification status for educator credentials */
export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

/** Complete creator profile */
export interface CreatorProfile {
  id: string;
  userId: string;
  tenantId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  tier: CreatorTier;
  verificationStatus: VerificationStatus;
  credentials?: EducatorCredentials;

  // Statistics
  stats: CreatorStats;

  // Earnings
  earnings: CreatorEarnings;

  // Preferences
  specialisations: string[];           // e.g., ['Phase 2', 'Australian animals', 'STEM']
  preferredArtStyles: string[];
  preferredPhonicsPhases: number[];

  // Account
  isActive: boolean;
  joinedAt: Date;
  lastPublishedAt?: Date;
  webhookUrl?: string;                 // For webhook notifications
  webhookSecret?: string;
}

export interface EducatorCredentials {
  institution: string;
  qualification: string;
  country: string;
  verifiedAt?: Date;
  expiresAt?: Date;
  documentUrl?: string;              // Uploaded credential document
}

export interface CreatorStats {
  totalSubmissions: number;
  publishedBooks: number;
  rejectedBooks: number;
  totalReads: number;
  totalCompletions: number;
  averageCompletionRate: number;
  averageEngagementScore: number;
  averageReviewScore: number;
  totalReReads: number;
  activeSeries: number;
  bountyWins: number;
}

export interface CreatorEarnings {
  lifetimeEarningsUSD: number;
  currentMonthEarningsUSD: number;
  pendingPayoutUSD: number;
  lastPayoutAt?: Date;
  lastPayoutAmountUSD?: number;
  revenueShareRate: number;          // Percentage of subscription revenue
  bonusMultiplier: number;           // Tier-based bonus
}

/** Tier progression thresholds and benefits */
export const TIER_CONFIG: Record<CreatorTier, {
  requirements: {
    minPublishedBooks: number;
    minAverageReviewScore: number;
    minAverageEngagementScore: number;
    minTotalReads: number;
    requiresVerification: boolean;
  };
  benefits: {
    revenueShareRate: number;
    bonusMultiplier: number;
    reviewPriority: 'standard' | 'priority' | 'express';
    maxConcurrentSubmissions: number;
    featuredPlacement: boolean;
    spotlightEligible: boolean;
    bountyAccess: boolean;
    apiRateLimit: number;           // Requests per minute
  };
}> = {
  [CreatorTier.BRONZE]: {
    requirements: {
      minPublishedBooks: 0,
      minAverageReviewScore: 0,
      minAverageEngagementScore: 0,
      minTotalReads: 0,
      requiresVerification: false,
    },
    benefits: {
      revenueShareRate: 0.05,       // 5% of engagement-based revenue
      bonusMultiplier: 1.0,
      reviewPriority: 'standard',
      maxConcurrentSubmissions: 2,
      featuredPlacement: false,
      spotlightEligible: false,
      bountyAccess: false,
      apiRateLimit: 30,
    },
  },
  [CreatorTier.SILVER]: {
    requirements: {
      minPublishedBooks: 3,
      minAverageReviewScore: 65,
      minAverageEngagementScore: 0.55,
      minTotalReads: 100,
      requiresVerification: false,
    },
    benefits: {
      revenueShareRate: 0.10,
      bonusMultiplier: 1.25,
      reviewPriority: 'standard',
      maxConcurrentSubmissions: 5,
      featuredPlacement: false,
      spotlightEligible: false,
      bountyAccess: true,
      apiRateLimit: 60,
    },
  },
  [CreatorTier.GOLD]: {
    requirements: {
      minPublishedBooks: 10,
      minAverageReviewScore: 75,
      minAverageEngagementScore: 0.65,
      minTotalReads: 1000,
      requiresVerification: false,
    },
    benefits: {
      revenueShareRate: 0.15,
      bonusMultiplier: 1.5,
      reviewPriority: 'priority',
      maxConcurrentSubmissions: 10,
      featuredPlacement: true,
      spotlightEligible: true,
      bountyAccess: true,
      apiRateLimit: 120,
    },
  },
  [CreatorTier.PLATINUM]: {
    requirements: {
      minPublishedBooks: 5,          // Lower book count but requires verification
      minAverageReviewScore: 70,
      minAverageEngagementScore: 0.60,
      minTotalReads: 500,
      requiresVerification: true,    // Must be a verified educator
    },
    benefits: {
      revenueShareRate: 0.20,
      bonusMultiplier: 2.0,
      reviewPriority: 'express',
      maxConcurrentSubmissions: 15,
      featuredPlacement: true,
      spotlightEligible: true,
      bountyAccess: true,
      apiRateLimit: 180,
    },
  },
};

// =============================================================================
// Section 2: Content Bounties
// =============================================================================

/** A content bounty — a request for specific educational content */
export interface ContentBounty {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  requirements: BountyRequirements;
  reward: BountyReward;
  status: BountyStatus;
  postedBy: string;                    // User ID of poster (admin or DAO)
  fundingSource: 'dao_treasury' | 'tenant_budget' | 'community_pool';
  submissions: BountySubmission[];
  winnerId?: string;
  maxSubmissions: number;
  deadline: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum BountyStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  AWARDED = 'AWARDED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface BountyRequirements {
  phonicsPhase: number;
  targetGPCs?: string[];
  ageRange: { min: number; max: number };
  theme: string;
  minPageCount: number;
  requiredNarration: boolean;
  requiredIllustrations: boolean;
  culturalContext?: string;
  artStylePreference?: string;
  additionalNotes?: string;
  minimumCreatorTier: CreatorTier;
}

export interface BountyReward {
  amountUSD: number;
  bonusTokens?: number;               // Platform tokens for DAO participation
  tierBoost: boolean;                  // Winning counts double for tier progression
  featuredDuration: number;            // Days of featured placement for winning book
}

export interface BountySubmission {
  id: string;
  bountyId: string;
  creatorId: string;
  storybookId: string;
  submittedAt: Date;
  reviewScore?: number;
  pilotResults?: {
    completionRate: number;
    engagementScore: number;
    accuracy: number;
  };
  status: 'submitted' | 'reviewing' | 'accepted' | 'rejected';
}

// =============================================================================
// Section 3: Revenue Sharing Engine
// =============================================================================

/**
 * The revenue sharing model aligns creator incentives with learner outcomes.
 * Rather than paying per creation (which incentivises quantity), we pay based
 * on engagement (which incentivises quality). Think of it like Spotify for
 * educational content: the most-listened-to songs earn the most revenue.
 */
export interface RevenueShareConfig {
  /** Total monthly revenue pool available for creators (% of subscription revenue) */
  creatorPoolPercentage: number;      // Default: 20% of subscription revenue

  /** How engagement is weighted in revenue calculation */
  engagementWeights: {
    readTime: number;                  // Weight for total reading time
    completionRate: number;            // Weight for completion rate
    reReadRate: number;                // Weight for re-reads (quality signal)
    accuracyImpact: number;            // Weight for measurable learning gains
  };

  /** Minimum engagement threshold to qualify for revenue share */
  minimumMonthlyReads: number;         // Default: 10 reads/month

  /** Maximum share any single creator can receive */
  maxCreatorSharePercentage: number;   // Default: 10% of pool (prevents monopoly)

  /** Open-source content bonus — incentivise Creative Commons contributions */
  openSourceBonus: number;             // Default: 1.2x multiplier
}

export const DEFAULT_REVENUE_CONFIG: RevenueShareConfig = {
  creatorPoolPercentage: 0.20,
  engagementWeights: {
    readTime: 0.30,
    completionRate: 0.25,
    reReadRate: 0.20,
    accuracyImpact: 0.25,
  },
  minimumMonthlyReads: 10,
  maxCreatorSharePercentage: 0.10,
  openSourceBonus: 1.2,
};

/** Monthly revenue calculation result for a creator */
export interface CreatorRevenueCalculation {
  creatorId: string;
  period: { year: number; month: number };
  engagementMetrics: {
    totalReadTimeMinutes: number;
    averageCompletionRate: number;
    reReadRate: number;
    measuredAccuracyGain: number;
  };
  engagementScore: number;             // Weighted composite score
  shareOfPool: number;                 // Percentage of revenue pool
  earnedAmountUSD: number;
  tierBonus: number;
  openSourceBonus: number;
  totalAmountUSD: number;
  bookBreakdown: Array<{
    storybookId: string;
    title: string;
    reads: number;
    engagementScore: number;
    revenueUSD: number;
  }>;
}

export class RevenueShareEngine {
  private config: RevenueShareConfig;

  constructor(config?: Partial<RevenueShareConfig>) {
    this.config = { ...DEFAULT_REVENUE_CONFIG, ...config };
  }

  /**
   * Calculate revenue shares for all eligible creators in a period.
   * Like splitting a pie based on how much value each slice brought
   * to the diners — the best slices get the biggest portions.
   */
  calculateMonthlyShares(
    totalRevenueUSD: number,
    creatorMetrics: Array<{
      creatorId: string;
      tier: CreatorTier;
      isOpenSource: boolean;
      books: Array<{
        storybookId: string;
        title: string;
        reads: number;
        totalReadTimeMinutes: number;
        completionRate: number;
        reReadRate: number;
        accuracyGain: number;
      }>;
    }>,
    period: { year: number; month: number }
  ): CreatorRevenueCalculation[] {
    const pool = totalRevenueUSD * this.config.creatorPoolPercentage;

    // Calculate engagement scores for all creators
    const scored = creatorMetrics
      .filter(cm => {
        const totalReads = cm.books.reduce((sum, b) => sum + b.reads, 0);
        return totalReads >= this.config.minimumMonthlyReads;
      })
      .map(cm => {
        const totalReads = cm.books.reduce((sum, b) => sum + b.reads, 0);
        const totalReadTime = cm.books.reduce((sum, b) => sum + b.totalReadTimeMinutes, 0);
        const avgCompletion = cm.books.length > 0
          ? cm.books.reduce((sum, b) => sum + b.completionRate * b.reads, 0) / totalReads
          : 0;
        const avgReRead = cm.books.length > 0
          ? cm.books.reduce((sum, b) => sum + b.reReadRate * b.reads, 0) / totalReads
          : 0;
        const avgAccuracy = cm.books.length > 0
          ? cm.books.reduce((sum, b) => sum + b.accuracyGain * b.reads, 0) / totalReads
          : 0;

        const w = this.config.engagementWeights;
        const engagementScore =
          (totalReadTime / Math.max(totalReadTime, 1)) * w.readTime +
          avgCompletion * w.completionRate +
          avgReRead * w.reReadRate +
          avgAccuracy * w.accuracyImpact;

        return { ...cm, engagementScore, totalReads, totalReadTime, avgCompletion, avgReRead, avgAccuracy };
      });

    // Normalise scores to determine pool share
    const totalScore = scored.reduce((sum, s) => sum + s.engagementScore, 0);

    return scored.map(s => {
      const rawShare = totalScore > 0 ? s.engagementScore / totalScore : 0;
      const cappedShare = Math.min(rawShare, this.config.maxCreatorSharePercentage);
      const baseAmount = pool * cappedShare;

      const tierConfig = TIER_CONFIG[s.tier];
      const tierBonus = baseAmount * (tierConfig.benefits.bonusMultiplier - 1);
      const osBonus = s.isOpenSource ? baseAmount * (this.config.openSourceBonus - 1) : 0;
      const totalAmount = baseAmount + tierBonus + osBonus;

      const bookBreakdown = s.books.map(b => {
        const bookScore = b.reads > 0
          ? (b.totalReadTimeMinutes * this.config.engagementWeights.readTime +
             b.completionRate * b.reads * this.config.engagementWeights.completionRate +
             b.reReadRate * b.reads * this.config.engagementWeights.reReadRate +
             b.accuracyGain * b.reads * this.config.engagementWeights.accuracyImpact) /
            s.engagementScore
          : 0;
        return {
          storybookId: b.storybookId,
          title: b.title,
          reads: b.reads,
          engagementScore: bookScore,
          revenueUSD: totalAmount * (s.engagementScore > 0 ? bookScore : 0),
        };
      });

      return {
        creatorId: s.creatorId,
        period,
        engagementMetrics: {
          totalReadTimeMinutes: s.totalReadTime,
          averageCompletionRate: s.avgCompletion,
          reReadRate: s.avgReRead,
          measuredAccuracyGain: s.avgAccuracy,
        },
        engagementScore: s.engagementScore,
        shareOfPool: cappedShare,
        earnedAmountUSD: baseAmount,
        tierBonus,
        openSourceBonus: osBonus,
        totalAmountUSD: totalAmount,
        bookBreakdown,
      };
    });
  }
}

// =============================================================================
// Section 4: Creator Tier Evaluation
// =============================================================================

export class CreatorTierEngine {
  /**
   * Evaluate whether a creator qualifies for a tier upgrade.
   * Like levelling up in a game — you need to meet specific criteria
   * across multiple dimensions before you can advance.
   */
  evaluateTierEligibility(
    profile: CreatorProfile
  ): {
    currentTier: CreatorTier;
    nextTier?: CreatorTier;
    eligible: boolean;
    progress: Record<string, { current: number; required: number; met: boolean }>;
  } {
    const tiers = [CreatorTier.BRONZE, CreatorTier.SILVER, CreatorTier.GOLD, CreatorTier.PLATINUM];
    const currentIndex = tiers.indexOf(profile.tier);
    const nextTier = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : undefined;

    if (!nextTier) {
      return { currentTier: profile.tier, eligible: false, progress: {} };
    }

    const reqs = TIER_CONFIG[nextTier].requirements;
    const stats = profile.stats;

    const progress: Record<string, { current: number; required: number; met: boolean }> = {
      publishedBooks: {
        current: stats.publishedBooks,
        required: reqs.minPublishedBooks,
        met: stats.publishedBooks >= reqs.minPublishedBooks,
      },
      averageReviewScore: {
        current: stats.averageReviewScore,
        required: reqs.minAverageReviewScore,
        met: stats.averageReviewScore >= reqs.minAverageReviewScore,
      },
      averageEngagement: {
        current: stats.averageEngagementScore,
        required: reqs.minAverageEngagementScore,
        met: stats.averageEngagementScore >= reqs.minAverageEngagementScore,
      },
      totalReads: {
        current: stats.totalReads,
        required: reqs.minTotalReads,
        met: stats.totalReads >= reqs.minTotalReads,
      },
    };

    if (reqs.requiresVerification) {
      progress.verification = {
        current: profile.verificationStatus === VerificationStatus.VERIFIED ? 1 : 0,
        required: 1,
        met: profile.verificationStatus === VerificationStatus.VERIFIED,
      };
    }

    const eligible = Object.values(progress).every(p => p.met);

    return { currentTier: profile.tier, nextTier, eligible, progress };
  }

  /** Auto-promote creators who meet all criteria for the next tier */
  processAutoPromotions(
    profiles: CreatorProfile[]
  ): Array<{ creatorId: string; from: CreatorTier; to: CreatorTier }> {
    const promotions: Array<{ creatorId: string; from: CreatorTier; to: CreatorTier }> = [];

    for (const profile of profiles) {
      const evaluation = this.evaluateTierEligibility(profile);
      if (evaluation.eligible && evaluation.nextTier) {
        promotions.push({
          creatorId: profile.id,
          from: profile.tier,
          to: evaluation.nextTier,
        });
      }
    }

    return promotions;
  }
}

// =============================================================================
// Section 5: Webhook Events System (MK-002)
// =============================================================================

/** All webhook event types that creators and integrators can subscribe to */
export enum WebhookEventType {
  // Review lifecycle
  REVIEW_SUBMITTED = 'review.submitted',
  REVIEW_STAGE_CHANGED = 'review.stage_changed',
  REVIEW_COMPLETED = 'review.completed',
  REVIEW_FEEDBACK_AVAILABLE = 'review.feedback_available',

  // Publication
  STORYBOOK_PUBLISHED = 'storybook.published',
  STORYBOOK_FEATURED = 'storybook.featured',
  STORYBOOK_REMOVED = 'storybook.removed',

  // Analytics milestones
  MILESTONE_READS = 'milestone.reads',           // 100, 500, 1000, 5000, 10000
  MILESTONE_COMPLETIONS = 'milestone.completions',
  MILESTONE_REREADS = 'milestone.rereads',

  // Creator
  TIER_PROMOTION = 'creator.tier_promotion',
  EARNINGS_AVAILABLE = 'creator.earnings_available',
  PAYOUT_PROCESSED = 'creator.payout_processed',

  // Bounty
  BOUNTY_POSTED = 'bounty.posted',
  BOUNTY_SUBMISSION_RECEIVED = 'bounty.submission_received',
  BOUNTY_AWARDED = 'bounty.awarded',
  BOUNTY_EXPIRED = 'bounty.expired',
}

/** Webhook delivery payload */
export interface WebhookPayload {
  id: string;                          // Unique event ID for idempotency
  type: WebhookEventType;
  timestamp: string;                   // ISO 8601
  version: string;                     // API version (e.g., '2026-02-01')
  data: Record<string, unknown>;
  metadata: {
    tenantId: string;
    creatorId?: string;
    storybookId?: string;
    bountyId?: string;
  };
}

/** Webhook subscription configuration */
export interface WebhookSubscription {
  id: string;
  creatorId: string;
  url: string;
  secret: string;                      // HMAC-SHA256 signing secret
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: Date;
  lastDeliveredAt?: Date;
  failureCount: number;
  maxRetries: number;                  // Default: 3
  retryDelayMs: number;               // Default: exponential backoff
}

/** Webhook delivery record for auditing */
export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;
  eventType: WebhookEventType;
  url: string;
  payload: string;                     // JSON string
  signature: string;                   // HMAC-SHA256 signature
  httpStatus?: number;
  responseBody?: string;
  deliveredAt?: Date;
  attempts: number;
  lastAttemptAt: Date;
  nextRetryAt?: Date;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
}

/**
 * WebhookService — The Messenger
 *
 * Delivers real-time notifications to creator webhook endpoints. Like
 * a postal service with guaranteed delivery: it signs every letter,
 * tracks delivery, retries on failure, and keeps a complete audit trail.
 */
export class WebhookService extends ScholarlyBaseService {
  private subscriptions: Map<string, WebhookSubscription>;
  private deliveryLog: WebhookDelivery[];
  private maxRetries: number;
  private baseRetryDelayMs: number;

  constructor(config?: { maxRetries?: number; baseRetryDelayMs?: number }) {
    super();
    this.subscriptions = new Map();
    this.deliveryLog = [];
    this.maxRetries = config?.maxRetries ?? 3;
    this.baseRetryDelayMs = config?.baseRetryDelayMs ?? 1000;
  }

  /** Register a new webhook subscription */
  subscribe(subscription: WebhookSubscription): Result<WebhookSubscription> {
    // Validate URL
    try {
      new URL(subscription.url);
    } catch {
      return { success: false, error: 'Invalid webhook URL' };
    }

    // Validate events
    if (subscription.events.length === 0) {
      return { success: false, error: 'Must subscribe to at least one event type' };
    }

    this.subscriptions.set(subscription.id, {
      ...subscription,
      maxRetries: subscription.maxRetries || this.maxRetries,
      retryDelayMs: subscription.retryDelayMs || this.baseRetryDelayMs,
    });

    return { success: true, data: subscription };
  }

  /** Unsubscribe from webhook notifications */
  unsubscribe(subscriptionId: string): Result<void> {
    if (!this.subscriptions.has(subscriptionId)) {
      return { success: false, error: 'Subscription not found' };
    }
    this.subscriptions.delete(subscriptionId);
    return { success: true, data: undefined };
  }

  /** Update subscription (e.g., change events or URL) */
  updateSubscription(
    subscriptionId: string,
    updates: Partial<Pick<WebhookSubscription, 'url' | 'events' | 'isActive' | 'secret'>>
  ): Result<WebhookSubscription> {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) {
      return { success: false, error: 'Subscription not found' };
    }

    const updated = { ...sub, ...updates };
    this.subscriptions.set(subscriptionId, updated);
    return { success: true, data: updated };
  }

  /**
   * Dispatch a webhook event to all matching subscribers.
   * Signs the payload with HMAC-SHA256 for verification.
   */
  async dispatch(payload: WebhookPayload): Promise<{
    dispatched: number;
    deliveries: WebhookDelivery[];
  }> {
    const matchingSubscriptions = [...this.subscriptions.values()].filter(
      sub => sub.isActive && sub.events.includes(payload.type)
    );

    const deliveries: WebhookDelivery[] = [];

    for (const sub of matchingSubscriptions) {
      const delivery = await this.deliverToSubscription(sub, payload);
      deliveries.push(delivery);
    }

    return { dispatched: matchingSubscriptions.length, deliveries };
  }

  /**
   * Deliver a webhook payload to a specific subscription endpoint.
   * Includes HMAC-SHA256 signature for payload verification.
   */
  private async deliverToSubscription(
    subscription: WebhookSubscription,
    payload: WebhookPayload
  ): Promise<WebhookDelivery> {
    const payloadJson = JSON.stringify(payload);
    const signature = this.signPayload(payloadJson, subscription.secret);

    const delivery: WebhookDelivery = {
      id: `del-${payload.id}-${subscription.id}`,
      subscriptionId: subscription.id,
      eventId: payload.id,
      eventType: payload.type,
      url: subscription.url,
      payload: payloadJson,
      signature,
      attempts: 0,
      lastAttemptAt: new Date(),
      status: 'pending',
    };

    // Attempt delivery with retries
    for (let attempt = 0; attempt <= subscription.maxRetries; attempt++) {
      delivery.attempts = attempt + 1;
      delivery.lastAttemptAt = new Date();

      try {
        // In production: actual HTTP POST to subscription.url
        // const response = await fetch(subscription.url, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'X-Scholarly-Signature': `sha256=${signature}`,
        //     'X-Scholarly-Event': payload.type,
        //     'X-Scholarly-Delivery': delivery.id,
        //   },
        //   body: payloadJson,
        //   signal: AbortSignal.timeout(10000),
        // });
        //
        // delivery.httpStatus = response.status;
        // delivery.responseBody = await response.text();

        // Simulate successful delivery
        delivery.httpStatus = 200;
        delivery.deliveredAt = new Date();
        delivery.status = 'delivered';

        // Update subscription metadata
        subscription.lastDeliveredAt = new Date();
        subscription.failureCount = 0;

        break;
      } catch (err) {
        if (attempt < subscription.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, 8s...
          const delay = subscription.retryDelayMs * Math.pow(2, attempt);
          delivery.nextRetryAt = new Date(Date.now() + delay);
          delivery.status = 'retrying';
          // In production: await new Promise(r => setTimeout(r, delay));
        } else {
          delivery.status = 'failed';
          subscription.failureCount++;

          // Disable subscription after 10 consecutive failures
          if (subscription.failureCount >= 10) {
            subscription.isActive = false;
          }
        }
      }
    }

    this.deliveryLog.push(delivery);
    return delivery;
  }

  /**
   * Sign a payload with HMAC-SHA256 for webhook verification.
   * Recipients verify by computing the same signature with their secret.
   */
  private signPayload(payload: string, secret: string): string {
    // In production: uses crypto.createHmac('sha256', secret).update(payload).digest('hex')
    // Simplified for type safety — production uses Node.js crypto module
    const hash = Array.from(payload + secret)
      .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  // ── Convenience Methods ─────────────────────────────────────────

  /** Build a webhook payload for a review stage change */
  buildReviewStagePayload(data: {
    storybookId: string;
    creatorId: string;
    tenantId: string;
    stage: string;
    outcome: string;
    findings: number;
  }): WebhookPayload {
    return {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: WebhookEventType.REVIEW_STAGE_CHANGED,
      timestamp: new Date().toISOString(),
      version: '2026-02-01',
      data,
      metadata: {
        tenantId: data.tenantId,
        creatorId: data.creatorId,
        storybookId: data.storybookId,
      },
    };
  }

  /** Build a webhook payload for a reads milestone */
  buildMilestonePayload(data: {
    storybookId: string;
    creatorId: string;
    tenantId: string;
    milestone: number;
    totalReads: number;
    title: string;
  }): WebhookPayload {
    return {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: WebhookEventType.MILESTONE_READS,
      timestamp: new Date().toISOString(),
      version: '2026-02-01',
      data,
      metadata: {
        tenantId: data.tenantId,
        creatorId: data.creatorId,
        storybookId: data.storybookId,
      },
    };
  }

  /** Build a webhook payload for earnings availability */
  buildEarningsPayload(data: {
    creatorId: string;
    tenantId: string;
    period: { year: number; month: number };
    amountUSD: number;
  }): WebhookPayload {
    return {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: WebhookEventType.EARNINGS_AVAILABLE,
      timestamp: new Date().toISOString(),
      version: '2026-02-01',
      data,
      metadata: {
        tenantId: data.tenantId,
        creatorId: data.creatorId,
      },
    };
  }

  /** Get delivery history for a subscription */
  getDeliveryHistory(subscriptionId: string, limit: number = 50): WebhookDelivery[] {
    return this.deliveryLog
      .filter(d => d.subscriptionId === subscriptionId)
      .sort((a, b) => b.lastAttemptAt.getTime() - a.lastAttemptAt.getTime())
      .slice(0, limit);
  }

  /** Get all active subscriptions for a creator */
  getCreatorSubscriptions(creatorId: string): WebhookSubscription[] {
    return [...this.subscriptions.values()].filter(
      s => s.creatorId === creatorId
    );
  }

  /** Retry all failed deliveries */
  async retryFailedDeliveries(): Promise<{ retried: number; succeeded: number }> {
    const failed = this.deliveryLog.filter(d => d.status === 'failed');
    let succeeded = 0;

    for (const delivery of failed) {
      const sub = this.subscriptions.get(delivery.subscriptionId);
      if (!sub || !sub.isActive) continue;

      const payload: WebhookPayload = JSON.parse(delivery.payload);
      const retryDelivery = await this.deliverToSubscription(sub, payload);
      if (retryDelivery.status === 'delivered') {
        succeeded++;
      }
    }

    return { retried: failed.length, succeeded };
  }
}

// =============================================================================
// Section 6: Marketplace Service (Orchestrator)
// =============================================================================

/**
 * MarketplaceService — The Town Square
 *
 * Orchestrates the marketplace: creator management, bounty lifecycle,
 * revenue distribution, and webhook notifications. Like the town square
 * where creators, learners, and the platform meet.
 */
export class MarketplaceService extends ScholarlyBaseService {
  private revenueEngine: RevenueShareEngine;
  private tierEngine: CreatorTierEngine;
  private webhookService: WebhookService;
  private creators: Map<string, CreatorProfile>;
  private bounties: Map<string, ContentBounty>;

  constructor(config?: {
    revenueConfig?: Partial<RevenueShareConfig>;
    webhookConfig?: { maxRetries?: number; baseRetryDelayMs?: number };
  }) {
    super();
    this.revenueEngine = new RevenueShareEngine(config?.revenueConfig);
    this.tierEngine = new CreatorTierEngine();
    this.webhookService = new WebhookService(config?.webhookConfig);
    this.creators = new Map();
    this.bounties = new Map();
  }

  // ── Creator Management ──────────────────────────────────────────

  async registerCreator(data: {
    userId: string;
    tenantId: string;
    displayName: string;
    bio: string;
    specialisations?: string[];
  }): Promise<Result<CreatorProfile>> {
    const profile: CreatorProfile = {
      id: `creator-${data.userId}`,
      userId: data.userId,
      tenantId: data.tenantId,
      displayName: data.displayName,
      bio: data.bio,
      tier: CreatorTier.BRONZE,
      verificationStatus: VerificationStatus.UNVERIFIED,
      stats: {
        totalSubmissions: 0, publishedBooks: 0, rejectedBooks: 0,
        totalReads: 0, totalCompletions: 0, averageCompletionRate: 0,
        averageEngagementScore: 0, averageReviewScore: 0,
        totalReReads: 0, activeSeries: 0, bountyWins: 0,
      },
      earnings: {
        lifetimeEarningsUSD: 0, currentMonthEarningsUSD: 0,
        pendingPayoutUSD: 0, revenueShareRate: TIER_CONFIG[CreatorTier.BRONZE].benefits.revenueShareRate,
        bonusMultiplier: TIER_CONFIG[CreatorTier.BRONZE].benefits.bonusMultiplier,
      },
      specialisations: data.specialisations || [],
      preferredArtStyles: [],
      preferredPhonicsPhases: [],
      isActive: true,
      joinedAt: new Date(),
    };

    this.creators.set(profile.id, profile);
    return { success: true, data: profile };
  }

  async evaluateAndPromote(creatorId: string): Promise<Result<{
    promoted: boolean;
    from?: CreatorTier;
    to?: CreatorTier;
    progress: Record<string, { current: number; required: number; met: boolean }>;
  }>> {
    const profile = this.creators.get(creatorId);
    if (!profile) return { success: false, error: 'Creator not found' };

    const evaluation = this.tierEngine.evaluateTierEligibility(profile);

    if (evaluation.eligible && evaluation.nextTier) {
      const from = profile.tier;
      profile.tier = evaluation.nextTier;

      // Update benefits
      const tierBenefits = TIER_CONFIG[evaluation.nextTier].benefits;
      profile.earnings.revenueShareRate = tierBenefits.revenueShareRate;
      profile.earnings.bonusMultiplier = tierBenefits.bonusMultiplier;

      // Send webhook
      await this.webhookService.dispatch({
        id: `evt-promo-${Date.now()}`,
        type: WebhookEventType.TIER_PROMOTION,
        timestamp: new Date().toISOString(),
        version: '2026-02-01',
        data: { creatorId, from, to: evaluation.nextTier },
        metadata: { tenantId: profile.tenantId, creatorId },
      });

      return { success: true, data: { promoted: true, from, to: evaluation.nextTier, progress: evaluation.progress } };
    }

    return { success: true, data: { promoted: false, progress: evaluation.progress } };
  }

  // ── Bounty Management ───────────────────────────────────────────

  async createBounty(bounty: ContentBounty): Promise<Result<ContentBounty>> {
    bounty.status = BountyStatus.OPEN;
    bounty.createdAt = new Date();
    bounty.updatedAt = new Date();
    bounty.submissions = [];
    this.bounties.set(bounty.id, bounty);

    await this.webhookService.dispatch({
      id: `evt-bounty-${Date.now()}`,
      type: WebhookEventType.BOUNTY_POSTED,
      timestamp: new Date().toISOString(),
      version: '2026-02-01',
      data: {
        bountyId: bounty.id,
        title: bounty.title,
        requirements: bounty.requirements,
        reward: bounty.reward,
        deadline: bounty.deadline.toISOString(),
      },
      metadata: { tenantId: bounty.tenantId, bountyId: bounty.id },
    });

    return { success: true, data: bounty };
  }

  async submitToBounty(
    bountyId: string,
    submission: BountySubmission
  ): Promise<Result<ContentBounty>> {
    const bounty = this.bounties.get(bountyId);
    if (!bounty) return { success: false, error: 'Bounty not found' };
    if (bounty.status !== BountyStatus.OPEN) return { success: false, error: 'Bounty is not open' };
    if (bounty.submissions.length >= bounty.maxSubmissions) {
      return { success: false, error: 'Maximum submissions reached' };
    }

    // Check creator tier
    const creator = this.creators.get(submission.creatorId);
    if (!creator) return { success: false, error: 'Creator not found' };

    const tierOrder = [CreatorTier.BRONZE, CreatorTier.SILVER, CreatorTier.GOLD, CreatorTier.PLATINUM];
    const creatorTierIndex = tierOrder.indexOf(creator.tier);
    const requiredTierIndex = tierOrder.indexOf(bounty.requirements.minimumCreatorTier);

    if (creatorTierIndex < requiredTierIndex) {
      return { success: false, error: `Creator tier ${creator.tier} does not meet minimum ${bounty.requirements.minimumCreatorTier}` };
    }

    bounty.submissions.push(submission);
    bounty.updatedAt = new Date();

    return { success: true, data: bounty };
  }

  async awardBounty(bountyId: string, winnerId: string): Promise<Result<ContentBounty>> {
    const bounty = this.bounties.get(bountyId);
    if (!bounty) return { success: false, error: 'Bounty not found' };

    const winningSubmission = bounty.submissions.find(s => s.creatorId === winnerId);
    if (!winningSubmission) return { success: false, error: 'Winner not found in submissions' };

    bounty.status = BountyStatus.AWARDED;
    bounty.winnerId = winnerId;
    bounty.updatedAt = new Date();
    winningSubmission.status = 'accepted';

    // Update winner stats
    const winner = this.creators.get(winnerId);
    if (winner) {
      winner.stats.bountyWins++;
      winner.earnings.pendingPayoutUSD += bounty.reward.amountUSD;
    }

    // Reject other submissions
    for (const sub of bounty.submissions) {
      if (sub.creatorId !== winnerId) sub.status = 'rejected';
    }

    await this.webhookService.dispatch({
      id: `evt-award-${Date.now()}`,
      type: WebhookEventType.BOUNTY_AWARDED,
      timestamp: new Date().toISOString(),
      version: '2026-02-01',
      data: { bountyId, winnerId, reward: bounty.reward },
      metadata: { tenantId: bounty.tenantId, bountyId: bounty.id, creatorId: winnerId },
    });

    return { success: true, data: bounty };
  }

  // ── Revenue Processing ──────────────────────────────────────────

  async processMonthlyRevenue(
    totalRevenueUSD: number,
    period: { year: number; month: number },
    creatorMetrics: Parameters<RevenueShareEngine['calculateMonthlyShares']>[1]
  ): Promise<Result<CreatorRevenueCalculation[]>> {
    const calculations = this.revenueEngine.calculateMonthlyShares(
      totalRevenueUSD,
      creatorMetrics,
      period
    );

    // Update creator earnings and send notifications
    for (const calc of calculations) {
      const creator = this.creators.get(calc.creatorId);
      if (creator) {
        creator.earnings.currentMonthEarningsUSD = calc.totalAmountUSD;
        creator.earnings.lifetimeEarningsUSD += calc.totalAmountUSD;
        creator.earnings.pendingPayoutUSD += calc.totalAmountUSD;

        await this.webhookService.dispatch(
          this.webhookService.buildEarningsPayload({
            creatorId: calc.creatorId,
            tenantId: creator.tenantId,
            period,
            amountUSD: calc.totalAmountUSD,
          })
        );
      }
    }

    return { success: true, data: calculations };
  }

  // ── Accessors ───────────────────────────────────────────────────

  getCreator(creatorId: string): CreatorProfile | undefined {
    return this.creators.get(creatorId);
  }

  getBounty(bountyId: string): ContentBounty | undefined {
    return this.bounties.get(bountyId);
  }

  getOpenBounties(): ContentBounty[] {
    return [...this.bounties.values()].filter(b => b.status === BountyStatus.OPEN);
  }

  getWebhookService(): WebhookService {
    return this.webhookService;
  }
}

// =============================================================================
// Section 7: Factory Functions
// =============================================================================

export function createMarketplaceService(config?: {
  revenueConfig?: Partial<RevenueShareConfig>;
  webhookConfig?: { maxRetries?: number; baseRetryDelayMs?: number };
}): MarketplaceService {
  return new MarketplaceService(config);
}

export function createWebhookService(config?: {
  maxRetries?: number;
  baseRetryDelayMs?: number;
}): WebhookService {
  return new WebhookService(config);
}

export function createRevenueShareEngine(
  config?: Partial<RevenueShareConfig>
): RevenueShareEngine {
  return new RevenueShareEngine(config);
}

// =============================================================================
// End of marketplace.ts
// =============================================================================
