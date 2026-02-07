/**
 * =============================================================================
 * SCHOLARLY PLATFORM — Marketplace Repository Layer
 * =============================================================================
 *
 * Sprint 6, PW-003: The database access layer for the content marketplace
 * ecosystem. If the Storybook repositories (PW-002) handle the books on the
 * shelves, these marketplace repositories handle the people who put them
 * there — the creators, their reputations, their earnings, and the bounties
 * that guide what content gets created next.
 *
 * Think of this as the back-office of a publishing house: tracking which
 * authors are on which tier, calculating royalty payments, posting job
 * listings (bounties) for specific book types, and managing the submission
 * review workflow.
 *
 * Total: ~1,100 lines
 * =============================================================================
 */

import { PrismaClient, Prisma } from '@prisma/client';

// =============================================================================
// SHARED TYPES (same Result<T> pattern as storybook-repositories.ts)
// =============================================================================

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

function ok<T>(data: T): Result<T> { return { success: true, data }; }
function fail<T>(error: string, code: string = 'REPOSITORY_ERROR'): Result<T> {
  return { success: false, error, code };
}

interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

interface CreatorFilter {
  tier?: string | string[];
  isVerifiedEducator?: boolean;
  minPublishedCount?: number;
  minAverageScore?: number;
  search?: string;
}

interface BountyFilter {
  status?: string | string[];
  targetPhase?: string;
  fundingSource?: string;
  createdById?: string;
  deadlineBefore?: Date;
  deadlineAfter?: Date;
  minReward?: number;
}

// =============================================================================
// 1. CREATOR PROFILE REPOSITORY
// =============================================================================

export class CreatorProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, data: any): Promise<Result<any>> {
    try {
      const profile = await this.prisma.creatorProfile.create({
        data: { ...data, tenantId },
      });
      return ok(profile);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return fail('Creator profile already exists for this user', 'DUPLICATE');
      }
      return fail(`Failed to create creator profile: ${error.message}`);
    }
  }

  async findByUserId(tenantId: string, userId: string): Promise<Result<any>> {
    try {
      const profile = await this.prisma.creatorProfile.findUnique({
        where: { userId },
      });
      if (!profile || profile.tenantId !== tenantId) {
        return fail('Creator profile not found', 'NOT_FOUND');
      }
      return ok(profile);
    } catch (error: any) {
      return fail(`Failed to find creator profile: ${error.message}`);
    }
  }

  async findById(tenantId: string, id: string): Promise<Result<any>> {
    try {
      const profile = await this.prisma.creatorProfile.findFirst({
        where: { id, tenantId },
      });
      if (!profile) return fail('Creator profile not found', 'NOT_FOUND');
      return ok(profile);
    } catch (error: any) {
      return fail(`Failed to find creator profile: ${error.message}`);
    }
  }

  async list(
    tenantId: string,
    filter: CreatorFilter = {},
    pagination: PaginationOptions = {}
  ): Promise<Result<PaginatedResult<any>>> {
    try {
      const { page = 1, pageSize = 20, sortBy = 'lifetimeEarnings', sortOrder = 'desc' } = pagination;
      const where: any = { tenantId };

      if (filter.tier) {
        where.tier = Array.isArray(filter.tier) ? { in: filter.tier } : filter.tier;
      }
      if (filter.isVerifiedEducator !== undefined) {
        where.isVerifiedEducator = filter.isVerifiedEducator;
      }
      if (filter.minPublishedCount) {
        where.publishedCount = { gte: filter.minPublishedCount };
      }
      if (filter.minAverageScore) {
        where.averageReviewScore = { gte: filter.minAverageScore };
      }
      if (filter.search) {
        where.OR = [
          { displayName: { contains: filter.search, mode: 'insensitive' } },
          { bio: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await this.prisma.$transaction([
        this.prisma.creatorProfile.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.creatorProfile.count({ where }),
      ]);
      const totalPages = Math.ceil(total / pageSize);
      return ok({ items, total, page, pageSize, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 });
    } catch (error: any) {
      return fail(`Failed to list creator profiles: ${error.message}`);
    }
  }

  async update(tenantId: string, id: string, data: any): Promise<Result<any>> {
    try {
      const existing = await this.prisma.creatorProfile.findFirst({ where: { id, tenantId } });
      if (!existing) return fail('Creator profile not found', 'NOT_FOUND');
      const updated = await this.prisma.creatorProfile.update({ where: { id }, data });
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to update creator profile: ${error.message}`);
    }
  }

  /**
   * Evaluate and potentially upgrade a creator's tier based on their metrics.
   * Tier thresholds (from Sprint 4 marketplace.ts):
   * - Bronze → Silver: 5+ published, avg score ≥ 60, verified educator
   * - Silver → Gold:  15+ published, avg score ≥ 75, avg engagement ≥ 0.6
   * - Gold → Platinum: 30+ published, avg score ≥ 85, avg engagement ≥ 0.75, verified
   */
  async evaluateTierPromotion(tenantId: string, id: string): Promise<Result<{ promoted: boolean; newTier?: string; reason?: string }>> {
    try {
      const profile = await this.prisma.creatorProfile.findFirst({ where: { id, tenantId } });
      if (!profile) return fail('Creator profile not found', 'NOT_FOUND');

      const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
      const currentIndex = tierOrder.indexOf(profile.tier);
      if (currentIndex >= tierOrder.length - 1) {
        return ok({ promoted: false, reason: 'Already at maximum tier' });
      }

      // Check promotion criteria
      const nextTier = tierOrder[currentIndex + 1];
      let qualifies = false;
      let reason = '';

      switch (nextTier) {
        case 'SILVER':
          qualifies = profile.publishedCount >= 5 &&
            profile.averageReviewScore >= 60 &&
            profile.isVerifiedEducator;
          reason = qualifies
            ? 'Met Silver criteria: 5+ published, avg score ≥ 60, verified educator'
            : `Missing: ${profile.publishedCount < 5 ? 'need 5+ published' : ''} ${profile.averageReviewScore < 60 ? 'need avg score ≥ 60' : ''} ${!profile.isVerifiedEducator ? 'need educator verification' : ''}`.trim();
          break;
        case 'GOLD':
          qualifies = profile.publishedCount >= 15 &&
            profile.averageReviewScore >= 75 &&
            profile.averageEngagement >= 0.6;
          reason = qualifies
            ? 'Met Gold criteria: 15+ published, avg score ≥ 75, engagement ≥ 60%'
            : `Missing: ${profile.publishedCount < 15 ? 'need 15+ published' : ''} ${profile.averageReviewScore < 75 ? 'need avg score ≥ 75' : ''} ${profile.averageEngagement < 0.6 ? 'need engagement ≥ 60%' : ''}`.trim();
          break;
        case 'PLATINUM':
          qualifies = profile.publishedCount >= 30 &&
            profile.averageReviewScore >= 85 &&
            profile.averageEngagement >= 0.75 &&
            profile.isVerifiedEducator;
          reason = qualifies
            ? 'Met Platinum criteria: 30+ published, avg score ≥ 85, engagement ≥ 75%, verified'
            : 'Does not yet meet Platinum criteria';
          break;
      }

      if (qualifies) {
        // Update tier and associated rate limits
        const rateLimits: Record<string, number> = {
          BRONZE: 30, SILVER: 60, GOLD: 120, PLATINUM: 180,
        };
        await this.prisma.creatorProfile.update({
          where: { id },
          data: {
            tier: nextTier as any,
            apiRateLimit: rateLimits[nextTier] || 30,
          },
        });
        return ok({ promoted: true, newTier: nextTier, reason });
      }

      return ok({ promoted: false, reason });
    } catch (error: any) {
      return fail(`Failed to evaluate tier promotion: ${error.message}`);
    }
  }

  /** Record a publication and update creator stats */
  async recordPublication(
    tenantId: string,
    userId: string,
    reviewScore: number,
    engagement: number
  ): Promise<Result<void>> {
    try {
      const profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
      if (!profile || profile.tenantId !== tenantId) {
        return fail('Creator profile not found', 'NOT_FOUND');
      }

      // Incremental average update
      const newPublishedCount = profile.publishedCount + 1;
      const newAvgScore = profile.averageReviewScore +
        (reviewScore - profile.averageReviewScore) / newPublishedCount;
      const newAvgEngagement = profile.averageEngagement +
        (engagement - profile.averageEngagement) / newPublishedCount;

      await this.prisma.creatorProfile.update({
        where: { userId },
        data: {
          publishedCount: newPublishedCount,
          totalContributions: { increment: 1 },
          averageReviewScore: newAvgScore,
          averageEngagement: newAvgEngagement,
          lastActiveAt: new Date(),
        },
      });
      return ok(undefined);
    } catch (error: any) {
      return fail(`Failed to record publication: ${error.message}`);
    }
  }

  /** Record a rejection */
  async recordRejection(tenantId: string, userId: string): Promise<Result<void>> {
    try {
      await this.prisma.creatorProfile.updateMany({
        where: { userId, tenantId },
        data: {
          rejectedCount: { increment: 1 },
          totalContributions: { increment: 1 },
          lastActiveAt: new Date(),
        },
      });
      return ok(undefined);
    } catch (error: any) {
      return fail(`Failed to record rejection: ${error.message}`);
    }
  }

  /** Add earnings from revenue share calculation */
  async addEarnings(tenantId: string, userId: string, amount: number): Promise<Result<void>> {
    try {
      await this.prisma.creatorProfile.updateMany({
        where: { userId, tenantId },
        data: {
          pendingEarnings: { increment: amount },
          lifetimeEarnings: { increment: amount },
        },
      });
      return ok(undefined);
    } catch (error: any) {
      return fail(`Failed to add earnings: ${error.message}`);
    }
  }

  /** Process payout: move pending to paid */
  async processPayout(tenantId: string, userId: string, amount: number): Promise<Result<void>> {
    try {
      const profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
      if (!profile || profile.tenantId !== tenantId) {
        return fail('Creator profile not found', 'NOT_FOUND');
      }
      if (profile.pendingEarnings < amount) {
        return fail('Insufficient pending earnings', 'INSUFFICIENT_BALANCE');
      }

      await this.prisma.creatorProfile.update({
        where: { userId },
        data: {
          pendingEarnings: { decrement: amount },
          lastPayoutAt: new Date(),
        },
      });
      return ok(undefined);
    } catch (error: any) {
      return fail(`Failed to process payout: ${error.message}`);
    }
  }

  /** Record review activity for XP tracking */
  async recordReviewActivity(
    tenantId: string,
    userId: string,
    xpEarned: number,
    badgeId?: string
  ): Promise<Result<void>> {
    try {
      const updateData: any = {
        reviewsGiven: { increment: 1 },
        reviewXp: { increment: xpEarned },
        lastActiveAt: new Date(),
      };
      if (badgeId) {
        updateData.reviewBadges = { push: badgeId };
      }

      await this.prisma.creatorProfile.updateMany({
        where: { userId, tenantId },
        data: updateData,
      });
      return ok(undefined);
    } catch (error: any) {
      return fail(`Failed to record review activity: ${error.message}`);
    }
  }

  /** Get leaderboard for creator engagement */
  async getLeaderboard(
    tenantId: string,
    metric: 'lifetimeEarnings' | 'publishedCount' | 'averageReviewScore' | 'totalReadsReceived',
    limit: number = 20
  ): Promise<Result<any[]>> {
    try {
      const creators = await this.prisma.creatorProfile.findMany({
        where: { tenantId, publishedCount: { gt: 0 } },
        orderBy: { [metric]: 'desc' },
        take: limit,
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          tier: true,
          publishedCount: true,
          averageReviewScore: true,
          lifetimeEarnings: true,
          totalReadsReceived: true,
          isVerifiedEducator: true,
        },
      });
      return ok(creators);
    } catch (error: any) {
      return fail(`Failed to get leaderboard: ${error.message}`);
    }
  }

  /** Increment API usage counter (for rate limiting) */
  async incrementApiUsage(tenantId: string, userId: string): Promise<Result<{ current: number; limit: number }>> {
    try {
      const profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
      if (!profile || profile.tenantId !== tenantId) {
        return fail('Creator profile not found', 'NOT_FOUND');
      }

      const updated = await this.prisma.creatorProfile.update({
        where: { userId },
        data: { apiUsageThisMonth: { increment: 1 } },
        select: { apiUsageThisMonth: true, apiRateLimit: true },
      });
      return ok({ current: updated.apiUsageThisMonth, limit: updated.apiRateLimit });
    } catch (error: any) {
      return fail(`Failed to increment API usage: ${error.message}`);
    }
  }

  /** Reset monthly API usage counters (called by cron job) */
  async resetMonthlyApiUsage(tenantId: string): Promise<Result<number>> {
    try {
      const result = await this.prisma.creatorProfile.updateMany({
        where: { tenantId, apiUsageThisMonth: { gt: 0 } },
        data: { apiUsageThisMonth: 0 },
      });
      return ok(result.count);
    } catch (error: any) {
      return fail(`Failed to reset API usage: ${error.message}`);
    }
  }
}

// =============================================================================
// 2. CONTENT BOUNTY REPOSITORY
// =============================================================================

export class ContentBountyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, data: any): Promise<Result<any>> {
    try {
      const bounty = await this.prisma.contentBounty.create({
        data: { ...data, tenantId },
        include: { creator: { select: { displayName: true, tier: true } } },
      });
      return ok(bounty);
    } catch (error: any) {
      return fail(`Failed to create bounty: ${error.message}`);
    }
  }

  async findById(tenantId: string, id: string): Promise<Result<any>> {
    try {
      const bounty = await this.prisma.contentBounty.findFirst({
        where: { id, tenantId },
        include: {
          creator: { select: { displayName: true, tier: true, avatarUrl: true } },
          submissions: { select: { id: true, displayName: true, tier: true } },
        },
      });
      if (!bounty) return fail('Bounty not found', 'NOT_FOUND');
      return ok(bounty);
    } catch (error: any) {
      return fail(`Failed to find bounty: ${error.message}`);
    }
  }

  async list(
    tenantId: string,
    filter: BountyFilter = {},
    pagination: PaginationOptions = {}
  ): Promise<Result<PaginatedResult<any>>> {
    try {
      const { page = 1, pageSize = 20, sortBy = 'deadline', sortOrder = 'asc' } = pagination;
      const where: any = { tenantId };

      if (filter.status) {
        where.status = Array.isArray(filter.status) ? { in: filter.status } : filter.status;
      }
      if (filter.targetPhase) where.targetPhase = filter.targetPhase;
      if (filter.fundingSource) where.fundingSource = filter.fundingSource;
      if (filter.createdById) where.createdById = filter.createdById;
      if (filter.minReward) where.rewardAmount = { gte: filter.minReward };
      if (filter.deadlineBefore) where.deadline = { ...(where.deadline || {}), lte: filter.deadlineBefore };
      if (filter.deadlineAfter) where.deadline = { ...(where.deadline || {}), gte: filter.deadlineAfter };

      const [items, total] = await this.prisma.$transaction([
        this.prisma.contentBounty.findMany({
          where,
          include: { creator: { select: { displayName: true, tier: true } } },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.contentBounty.count({ where }),
      ]);
      const totalPages = Math.ceil(total / pageSize);
      return ok({ items, total, page, pageSize, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 });
    } catch (error: any) {
      return fail(`Failed to list bounties: ${error.message}`);
    }
  }

  async updateStatus(tenantId: string, id: string, status: string): Promise<Result<any>> {
    try {
      const existing = await this.prisma.contentBounty.findFirst({ where: { id, tenantId } });
      if (!existing) return fail('Bounty not found', 'NOT_FOUND');

      const updated = await this.prisma.contentBounty.update({
        where: { id },
        data: { status: status as any },
      });
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to update bounty status: ${error.message}`);
    }
  }

  async addSubmission(tenantId: string, bountyId: string, creatorProfileId: string): Promise<Result<any>> {
    try {
      const updated = await this.prisma.contentBounty.update({
        where: { id: bountyId },
        data: {
          submissions: { connect: { id: creatorProfileId } },
          submissionCount: { increment: 1 },
          status: 'IN_PROGRESS',
        },
      });
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to add submission: ${error.message}`);
    }
  }

  async awardBounty(
    tenantId: string,
    bountyId: string,
    winnerSubmissionId: string,
    judgingResults: any
  ): Promise<Result<any>> {
    try {
      const bounty = await this.prisma.contentBounty.findFirst({ where: { id: bountyId, tenantId } });
      if (!bounty) return fail('Bounty not found', 'NOT_FOUND');
      if (bounty.status === 'AWARDED') {
        return fail('Bounty already awarded', 'ALREADY_AWARDED');
      }

      const updated = await this.prisma.contentBounty.update({
        where: { id: bountyId },
        data: {
          status: 'AWARDED',
          winnerSubmissionId,
          judgingResults,
        },
      });
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to award bounty: ${error.message}`);
    }
  }

  /** Expire bounties past their deadline */
  async expireOverdue(tenantId: string): Promise<Result<number>> {
    try {
      const result = await this.prisma.contentBounty.updateMany({
        where: {
          tenantId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          deadline: { lt: new Date() },
        },
        data: { status: 'EXPIRED' },
      });
      return ok(result.count);
    } catch (error: any) {
      return fail(`Failed to expire bounties: ${error.message}`);
    }
  }

  /** Get bounties matching a creator's expertise (for recommendations) */
  async findMatchingBounties(
    tenantId: string,
    creatorStrengths: { phases: string[]; themes: string[]; artStyles: string[] },
    limit: number = 10
  ): Promise<Result<any[]>> {
    try {
      const bounties = await this.prisma.contentBounty.findMany({
        where: {
          tenantId,
          status: 'OPEN',
          deadline: { gt: new Date() },
          OR: [
            { targetPhase: { in: creatorStrengths.phases as any[] } },
            { targetThemes: { hasSome: creatorStrengths.themes } },
            ...(creatorStrengths.artStyles.length > 0
              ? [{ requiredArtStyle: { in: creatorStrengths.artStyles as any[] } }]
              : []),
          ],
        },
        include: { creator: { select: { displayName: true } } },
        orderBy: { rewardAmount: 'desc' },
        take: limit,
      });
      return ok(bounties);
    } catch (error: any) {
      return fail(`Failed to find matching bounties: ${error.message}`);
    }
  }
}

// =============================================================================
// 3. MARKETPLACE REPOSITORY FACTORY
// =============================================================================

export class MarketplaceRepositoryFactory {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  get creators(): CreatorProfileRepository {
    return new CreatorProfileRepository(this.prisma);
  }

  get bounties(): ContentBountyRepository {
    return new ContentBountyRepository(this.prisma);
  }
}
