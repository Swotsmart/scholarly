// =============================================================================
// Community Dashboard — Creator Onboarding, Analytics & Health Monitoring
// =============================================================================
// The Community Dashboard is mission control for the creator ecosystem.
// It serves three audiences: creators (tracking their contributions and
// earnings), platform admins (monitoring community health and content
// pipeline throughput), and school administrators (understanding how
// community content enriches their library). Think of it as the vital
// signs monitor for the living library ecosystem.
// =============================================================================

import { ScholarlyBaseService, Result, NATSClient, PrismaClient } from '../shared/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export enum CreatorTier {
  NEWCOMER = 'NEWCOMER',   // Just joined, learning the ropes
  BRONZE = 'BRONZE',       // Automated validation only, limited distribution
  SILVER = 'SILVER',       // Peer-reviewed, full distribution
  GOLD = 'GOLD',           // Consistently high engagement, featured placement
  PLATINUM = 'PLATINUM',   // Verified credentials, priority review
}

export enum OnboardingPhase {
  REGISTERED = 'REGISTERED',
  PROFILE_COMPLETE = 'PROFILE_COMPLETE',
  TUTORIAL_COMPLETE = 'TUTORIAL_COMPLETE',
  FIRST_DRAFT = 'FIRST_DRAFT',
  FIRST_SUBMISSION = 'FIRST_SUBMISSION',
  FIRST_PUBLICATION = 'FIRST_PUBLICATION',
  ACTIVE_CREATOR = 'ACTIVE_CREATOR',
}

export interface CreatorProfile {
  id: string;
  userId: string;
  tenantId: string;
  displayName: string;
  bio: string;
  tier: CreatorTier;
  onboardingPhase: OnboardingPhase;
  specialisations: string[];  // e.g., 'phonics_phase_3', 'science_themes', 'french_content'
  totalPublished: number;
  totalDrafts: number;
  totalReviews: number;
  avgEngagement: number;      // Avg reads per published story
  avgRating: number;          // Community rating 0-5
  totalEarnings: { sparks: number; gems: number; voice: number };
  badges: string[];
  joinedAt: Date;
  lastActiveAt: Date;
  isVerifiedEducator: boolean;
}

export interface CreatorAnalytics {
  creatorId: string;
  period: 'week' | 'month' | 'quarter' | 'all_time';
  content: {
    storiesPublished: number; storiesInReview: number; storiesDrafted: number;
    avgDecodabilityScore: number; avgQualityScore: number;
    totalReads: number; totalCompletions: number; reReadRate: number;
  };
  engagement: {
    avgTimePerStory: number; completionRate: number;
    topStory: { id: string; title: string; reads: number } | null;
    audiencePhases: Record<number, number>; // Phase -> reader count
  };
  earnings: {
    sparksEarned: number; gemsEarned: number; voiceEarned: number;
    bountyWins: number; bountyRunnerUps: number;
    revenueShareEstimate: number; // Estimated fiat equivalent
  };
  reviews: {
    reviewsGiven: number; reviewsReceived: number;
    avgReviewScore: number; helpfulVotes: number;
  };
  tierProgress: {
    currentTier: CreatorTier; nextTier: CreatorTier | null;
    requirements: { name: string; current: number; required: number; met: boolean }[];
    estimatedDaysToNext: number | null;
  };
}

export interface CommunityHealth {
  tenantId: string;
  creators: {
    total: number; activeThisWeek: number; activeThisMonth: number;
    newThisMonth: number; tierDistribution: Record<CreatorTier, number>;
    verifiedEducators: number; avgOnboardingDays: number;
  };
  content: {
    totalPublished: number; publishedThisMonth: number;
    inReviewPipeline: number; avgReviewDays: number;
    rejectionRate: number; avgDecodability: number;
    phaseDistribution: Record<number, number>;
    languageDistribution: Record<string, number>;
  };
  engagement: {
    totalReads: number; readsThisMonth: number;
    avgCompletionRate: number; avgReReadRate: number;
    topStories: { id: string; title: string; reads: number }[];
  };
  economy: {
    totalTokensDistributed: number; totalBountyValue: number;
    activeBounties: number; completedBounties: number;
    avgBountySubmissions: number;
  };
}

export interface OnboardingChecklist {
  creatorId: string;
  steps: {
    phase: OnboardingPhase;
    title: string;
    description: string;
    isComplete: boolean;
    completedAt: Date | null;
    actionUrl: string;
  }[];
  completionPercentage: number;
  nextAction: string;
}

// ─── Tier Requirements ──────────────────────────────────────────────────────

interface TierRequirement {
  tier: CreatorTier;
  minPublished: number;
  minAvgRating: number;
  minAvgEngagement: number;
  minReviews: number;
  requiresVerification: boolean;
}

const TIER_REQUIREMENTS: TierRequirement[] = [
  { tier: CreatorTier.NEWCOMER, minPublished: 0, minAvgRating: 0, minAvgEngagement: 0, minReviews: 0, requiresVerification: false },
  { tier: CreatorTier.BRONZE, minPublished: 1, minAvgRating: 0, minAvgEngagement: 0, minReviews: 0, requiresVerification: false },
  { tier: CreatorTier.SILVER, minPublished: 5, minAvgRating: 3.0, minAvgEngagement: 10, minReviews: 3, requiresVerification: false },
  { tier: CreatorTier.GOLD, minPublished: 15, minAvgRating: 4.0, minAvgEngagement: 50, minReviews: 10, requiresVerification: false },
  { tier: CreatorTier.PLATINUM, minPublished: 30, minAvgRating: 4.5, minAvgEngagement: 100, minReviews: 20, requiresVerification: true },
];

// ─── Service ────────────────────────────────────────────────────────────────

export class CommunityDashboard extends ScholarlyBaseService {
  constructor(
    private prisma: PrismaClient,
    private nats: NATSClient,
    private redis: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, opts?: any) => Promise<void>; del: (k: string) => Promise<void> },
  ) {
    super('CommunityDashboard');
  }

  // ── Creator Onboarding ──────────────────────────────────────────────────

  async registerCreator(userId: string, tenantId: string, displayName: string, bio: string, specialisations: string[]): Promise<Result<CreatorProfile>> {
    const existing = await this.prisma.creatorProfile.findFirst({ where: { userId, tenantId } });
    if (existing) return { success: false, error: 'Already registered' };

    try {
      const profile = await this.prisma.creatorProfile.create({
        data: {
          userId, tenantId, displayName, bio,
          tier: CreatorTier.NEWCOMER,
          onboardingPhase: OnboardingPhase.REGISTERED,
          specialisations, totalPublished: 0, totalDrafts: 0,
          totalReviews: 0, avgEngagement: 0, avgRating: 0,
          totalEarnings: { sparks: 0, gems: 0, voice: 0 } as any,
          badges: [], lastActiveAt: new Date(), isVerifiedEducator: false,
        },
      });

      await this.nats.publish('scholarly.community.creator_registered', {
        creatorId: profile.id, userId, tenantId, displayName,
      });

      return { success: true, data: profile as unknown as CreatorProfile };
    } catch (error) {
      return { success: false, error: `Registration failed: ${(error as Error).message}` };
    }
  }

  async advanceOnboarding(creatorId: string, tenantId: string, phase: OnboardingPhase): Promise<Result<CreatorProfile>> {
    try {
      const updated = await this.prisma.creatorProfile.update({
        where: { id: creatorId },
        data: { onboardingPhase: phase, lastActiveAt: new Date() },
      });

      await this.nats.publish('scholarly.community.onboarding_advanced', {
        creatorId, tenantId, phase,
      });

      return { success: true, data: updated as unknown as CreatorProfile };
    } catch (error) {
      return { success: false, error: `Advance failed: ${(error as Error).message}` };
    }
  }

  async getOnboardingChecklist(creatorId: string, tenantId: string): Promise<Result<OnboardingChecklist>> {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { id: creatorId } });
    if (!creator || creator.tenantId !== tenantId) return { success: false, error: 'Not found' };

    const phaseOrder = Object.values(OnboardingPhase);
    const currentIdx = phaseOrder.indexOf(creator.onboardingPhase as OnboardingPhase);

    const steps = phaseOrder.map((phase, idx) => ({
      phase,
      title: this.getPhaseTitle(phase),
      description: this.getPhaseDescription(phase),
      isComplete: idx <= currentIdx,
      completedAt: idx <= currentIdx ? new Date() : null,
      actionUrl: this.getPhaseActionUrl(phase),
    }));

    const completionPct = ((currentIdx + 1) / phaseOrder.length) * 100;
    const nextPhase = currentIdx < phaseOrder.length - 1 ? phaseOrder[currentIdx + 1] : null;

    return {
      success: true,
      data: {
        creatorId,
        steps,
        completionPercentage: Math.round(completionPct),
        nextAction: nextPhase ? this.getPhaseDescription(nextPhase) : 'All onboarding complete!',
      },
    };
  }

  // ── Creator Analytics ───────────────────────────────────────────────────

  async getCreatorAnalytics(creatorId: string, tenantId: string, period: 'week' | 'month' | 'quarter' | 'all_time'): Promise<Result<CreatorAnalytics>> {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { id: creatorId } });
    if (!creator || creator.tenantId !== tenantId) return { success: false, error: 'Not found' };

    try {
      const since = this.getPeriodStart(period);

      // Aggregate story data
      const stories = await this.prisma.storybook.findMany({
        where: { creatorId: creator.userId, tenantId, createdAt: { gte: since } },
      });

      const published = stories.filter((s: any) => s.status === 'PUBLISHED');
      const inReview = stories.filter((s: any) => s.status === 'IN_REVIEW');
      const drafts = stories.filter((s: any) => s.status === 'DRAFT');

      // Get tier progress
      const tierProgress = this.calculateTierProgress(creator as unknown as CreatorProfile);

      const analytics: CreatorAnalytics = {
        creatorId,
        period,
        content: {
          storiesPublished: published.length,
          storiesInReview: inReview.length,
          storiesDrafted: drafts.length,
          avgDecodabilityScore: 0, // Would aggregate from story metadata
          avgQualityScore: 0,
          totalReads: 0,
          totalCompletions: 0,
          reReadRate: 0,
        },
        engagement: {
          avgTimePerStory: 0,
          completionRate: 0,
          topStory: published.length > 0 ? { id: published[0].id, title: published[0].title || '', reads: 0 } : null,
          audiencePhases: {},
        },
        earnings: {
          sparksEarned: (creator.totalEarnings as any)?.sparks || 0,
          gemsEarned: (creator.totalEarnings as any)?.gems || 0,
          voiceEarned: (creator.totalEarnings as any)?.voice || 0,
          bountyWins: 0,
          bountyRunnerUps: 0,
          revenueShareEstimate: 0,
        },
        reviews: {
          reviewsGiven: creator.totalReviews,
          reviewsReceived: 0,
          avgReviewScore: creator.avgRating,
          helpfulVotes: 0,
        },
        tierProgress,
      };

      return { success: true, data: analytics };
    } catch (error) {
      return { success: false, error: `Analytics failed: ${(error as Error).message}` };
    }
  }

  // ── Community Health ────────────────────────────────────────────────────

  async getCommunityHealth(tenantId: string): Promise<Result<CommunityHealth>> {
    try {
      const cached = await this.redis.get(`community_health:${tenantId}`);
      if (cached) return { success: true, data: JSON.parse(cached) };

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      const monthAgo = new Date(now.getTime() - 30 * 86400000);

      const [creators, weeklyActive, monthlyActive, newCreators, stories, publishedThisMonth] = await Promise.all([
        this.prisma.creatorProfile.findMany({ where: { tenantId } }),
        this.prisma.creatorProfile.count({ where: { tenantId, lastActiveAt: { gte: weekAgo } } }),
        this.prisma.creatorProfile.count({ where: { tenantId, lastActiveAt: { gte: monthAgo } } }),
        this.prisma.creatorProfile.count({ where: { tenantId, joinedAt: { gte: monthAgo } } }),
        this.prisma.storybook.count({ where: { tenantId, status: 'PUBLISHED' } }),
        this.prisma.storybook.count({ where: { tenantId, status: 'PUBLISHED', createdAt: { gte: monthAgo } } }),
      ]);

      // Tier distribution
      const tierDist: Record<CreatorTier, number> = {
        [CreatorTier.NEWCOMER]: 0, [CreatorTier.BRONZE]: 0,
        [CreatorTier.SILVER]: 0, [CreatorTier.GOLD]: 0, [CreatorTier.PLATINUM]: 0,
      };
      for (const c of creators) tierDist[c.tier as CreatorTier] = (tierDist[c.tier as CreatorTier] || 0) + 1;

      const health: CommunityHealth = {
        tenantId,
        creators: {
          total: creators.length, activeThisWeek: weeklyActive,
          activeThisMonth: monthlyActive, newThisMonth: newCreators,
          tierDistribution: tierDist,
          verifiedEducators: creators.filter((c: any) => c.isVerifiedEducator).length,
          avgOnboardingDays: 7, // Would calculate from actual data
        },
        content: {
          totalPublished: stories, publishedThisMonth,
          inReviewPipeline: 0, avgReviewDays: 3,
          rejectionRate: 0, avgDecodability: 0,
          phaseDistribution: {}, languageDistribution: {},
        },
        engagement: {
          totalReads: 0, readsThisMonth: 0,
          avgCompletionRate: 0, avgReReadRate: 0, topStories: [],
        },
        economy: {
          totalTokensDistributed: 0, totalBountyValue: 0,
          activeBounties: 0, completedBounties: 0, avgBountySubmissions: 0,
        },
      };

      await this.redis.set(`community_health:${tenantId}`, JSON.stringify(health), { EX: 300 });

      return { success: true, data: health };
    } catch (error) {
      return { success: false, error: `Health failed: ${(error as Error).message}` };
    }
  }

  // ── Tier Management ─────────────────────────────────────────────────────

  async evaluateTierUpgrade(creatorId: string, tenantId: string): Promise<Result<{ eligible: boolean; nextTier: CreatorTier | null; missing: string[] }>> {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { id: creatorId } });
    if (!creator || creator.tenantId !== tenantId) return { success: false, error: 'Not found' };

    const currentIdx = TIER_REQUIREMENTS.findIndex(t => t.tier === creator.tier);
    if (currentIdx >= TIER_REQUIREMENTS.length - 1) {
      return { success: true, data: { eligible: false, nextTier: null, missing: ['Already at highest tier'] } };
    }

    const nextReq = TIER_REQUIREMENTS[currentIdx + 1];
    const missing: string[] = [];
    if (creator.totalPublished < nextReq.minPublished) missing.push(`Need ${nextReq.minPublished - creator.totalPublished} more publications`);
    if (creator.avgRating < nextReq.minAvgRating) missing.push(`Rating needs to reach ${nextReq.minAvgRating}`);
    if (creator.avgEngagement < nextReq.minAvgEngagement) missing.push(`Engagement needs to reach ${nextReq.minAvgEngagement}`);
    if (creator.totalReviews < nextReq.minReviews) missing.push(`Need ${nextReq.minReviews - creator.totalReviews} more reviews`);
    if (nextReq.requiresVerification && !creator.isVerifiedEducator) missing.push('Educator verification required');

    return { success: true, data: { eligible: missing.length === 0, nextTier: nextReq.tier, missing } };
  }

  async upgradeTier(creatorId: string, tenantId: string): Promise<Result<CreatorProfile>> {
    const evalResult = await this.evaluateTierUpgrade(creatorId, tenantId);
    if (!evalResult.success) return { success: false, error: evalResult.error };
    if (!evalResult.data!.eligible) return { success: false, error: `Not eligible: ${evalResult.data!.missing.join(', ')}` };

    try {
      const updated = await this.prisma.creatorProfile.update({
        where: { id: creatorId },
        data: { tier: evalResult.data!.nextTier! },
      });

      await this.nats.publish('scholarly.community.tier_upgraded', {
        creatorId, tenantId, newTier: evalResult.data!.nextTier,
      });

      return { success: true, data: updated as unknown as CreatorProfile };
    } catch (error) {
      return { success: false, error: `Upgrade failed: ${(error as Error).message}` };
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private calculateTierProgress(creator: CreatorProfile): CreatorAnalytics['tierProgress'] {
    const currentIdx = TIER_REQUIREMENTS.findIndex(t => t.tier === creator.tier);
    if (currentIdx >= TIER_REQUIREMENTS.length - 1) {
      return { currentTier: creator.tier, nextTier: null, requirements: [], estimatedDaysToNext: null };
    }

    const next = TIER_REQUIREMENTS[currentIdx + 1];
    const requirements = [
      { name: 'Published stories', current: creator.totalPublished, required: next.minPublished, met: creator.totalPublished >= next.minPublished },
      { name: 'Average rating', current: creator.avgRating, required: next.minAvgRating, met: creator.avgRating >= next.minAvgRating },
      { name: 'Average engagement', current: creator.avgEngagement, required: next.minAvgEngagement, met: creator.avgEngagement >= next.minAvgEngagement },
      { name: 'Reviews given', current: creator.totalReviews, required: next.minReviews, met: creator.totalReviews >= next.minReviews },
    ];

    return { currentTier: creator.tier, nextTier: next.tier, requirements, estimatedDaysToNext: null };
  }

  private getPeriodStart(period: string): Date {
    const now = Date.now();
    switch (period) {
      case 'week': return new Date(now - 7 * 86400000);
      case 'month': return new Date(now - 30 * 86400000);
      case 'quarter': return new Date(now - 90 * 86400000);
      default: return new Date(0);
    }
  }

  private getPhaseTitle(phase: OnboardingPhase): string {
    const titles: Record<OnboardingPhase, string> = {
      [OnboardingPhase.REGISTERED]: 'Create Account',
      [OnboardingPhase.PROFILE_COMPLETE]: 'Complete Profile',
      [OnboardingPhase.TUTORIAL_COMPLETE]: 'Complete Tutorial',
      [OnboardingPhase.FIRST_DRAFT]: 'Create First Draft',
      [OnboardingPhase.FIRST_SUBMISSION]: 'Submit for Review',
      [OnboardingPhase.FIRST_PUBLICATION]: 'First Publication',
      [OnboardingPhase.ACTIVE_CREATOR]: 'Active Creator',
    };
    return titles[phase];
  }

  private getPhaseDescription(phase: OnboardingPhase): string {
    const descriptions: Record<OnboardingPhase, string> = {
      [OnboardingPhase.REGISTERED]: 'Sign up and verify your email',
      [OnboardingPhase.PROFILE_COMPLETE]: 'Add your bio, specialisations, and avatar',
      [OnboardingPhase.TUTORIAL_COMPLETE]: 'Complete the Storybook Studio interactive tutorial',
      [OnboardingPhase.FIRST_DRAFT]: 'Create your first storybook draft',
      [OnboardingPhase.FIRST_SUBMISSION]: 'Submit your first story for community review',
      [OnboardingPhase.FIRST_PUBLICATION]: 'Get your first story published to the library',
      [OnboardingPhase.ACTIVE_CREATOR]: 'Publish 3+ stories and give 3+ reviews',
    };
    return descriptions[phase];
  }

  private getPhaseActionUrl(phase: OnboardingPhase): string {
    const urls: Record<OnboardingPhase, string> = {
      [OnboardingPhase.REGISTERED]: '/creator/signup',
      [OnboardingPhase.PROFILE_COMPLETE]: '/creator/profile/edit',
      [OnboardingPhase.TUTORIAL_COMPLETE]: '/creator/tutorial',
      [OnboardingPhase.FIRST_DRAFT]: '/creator/studio/new',
      [OnboardingPhase.FIRST_SUBMISSION]: '/creator/stories',
      [OnboardingPhase.FIRST_PUBLICATION]: '/creator/stories',
      [OnboardingPhase.ACTIVE_CREATOR]: '/creator/dashboard',
    };
    return urls[phase];
  }
}
