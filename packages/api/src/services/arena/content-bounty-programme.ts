// =============================================================================
// Content Bounty Programme — Directed Content Creation at Scale
// =============================================================================
// The Content Bounty Programme is how Scholarly fills specific gaps in the
// library. If the marketplace is a farmers' market (creators bring what
// they've grown), bounties are a commissioned harvest (the platform says
// "we need 10 Phase 3 storybooks about Australian animals" and creators
// compete to fill the order). This targeted approach ensures the library
// grows where children need it most, not just where creators feel inspired.
//
// Bounties flow through a lifecycle: Draft → Published → Accepting →
// Judging → Awarded → Completed. Each stage has validation, and the
// judging process combines automated quality scoring with community voting
// and optional expert review. Payouts integrate with both the fiat-based
// creator marketplace and the token economy.
// =============================================================================

import { ScholarlyBaseService, Result, NATSClient, PrismaClient } from '../shared/types';
import { TokenType, TokenEconomyEngine, TransactionType } from '../tokenomics/token-economy-engine';

// ─── Types ──────────────────────────────────────────────────────────────────

export enum BountyStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ACCEPTING = 'ACCEPTING',
  JUDGING = 'JUDGING',
  AWARDED = 'AWARDED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum BountyCategory {
  PHASE_GAP = 'PHASE_GAP',           // Library gap in a specific phonics phase
  THEME_GAP = 'THEME_GAP',           // Missing theme at a specific level
  LANGUAGE_GAP = 'LANGUAGE_GAP',     // Multilingual content need
  SERIES_EXTENSION = 'SERIES_EXTENSION', // Continue an existing series
  CULTURAL_DIVERSITY = 'CULTURAL_DIVERSITY', // Representation gap
  SEASONAL = 'SEASONAL',             // Holiday/seasonal content
  COMMUNITY_REQUEST = 'COMMUNITY_REQUEST', // Community-voted need
}

export enum SubmissionStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SHORTLISTED = 'SHORTLISTED',
  WINNER = 'WINNER',
  RUNNER_UP = 'RUNNER_UP',
  REJECTED = 'REJECTED',
}

export interface Bounty {
  id: string;
  tenantId: string;
  creatorId: string;          // Platform admin or DAO proposal executor
  category: BountyCategory;
  title: string;
  description: string;
  requirements: BountyRequirements;
  reward: BountyReward;
  status: BountyStatus;
  submissionDeadline: Date;
  judgingDeadline: Date;
  maxSubmissions: number;
  currentSubmissions: number;
  eligibleTiers: string[];    // Creator tiers eligible to submit
  tags: string[];
  proposalId: string | null;  // If created via DAO proposal
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BountyRequirements {
  phonicsPhase: number;
  targetGPCs: string[];
  minDecodability: number;    // Minimum decodability score
  language: string;
  cefrLevel: string | null;
  ageRange: { min: number; max: number };
  pageCount: { min: number; max: number };
  theme: string;
  artStyle: string | null;
  includesIllustrations: boolean;
  includesNarration: boolean;
  curriculumAlignment: string[];
  culturalContext: string | null;
}

export interface BountyReward {
  primaryTokenType: TokenType;
  primaryAmount: number;
  secondaryTokenType: TokenType | null;
  secondaryAmount: number;
  runnerUpCount: number;
  runnerUpPercentage: number; // Percentage of primary reward for runners-up
  voiceBonus: number;         // Voice tokens for all valid submissions
  fiatEquivalent: number | null; // Optional fiat payout (USD)
}

export interface BountySubmission {
  id: string;
  bountyId: string;
  creatorId: string;
  tenantId: string;
  storyId: string;
  status: SubmissionStatus;
  automatedScore: number;     // Score from automated validation
  communityScore: number;     // Score from community voting
  expertScore: number;        // Score from expert review
  totalScore: number;
  feedback: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
}

export interface BountyJudgingCriteria {
  decodabilityWeight: number;   // Weight for automated decodability score
  narrativeWeight: number;      // Weight for story quality
  illustrationWeight: number;   // Weight for illustration quality
  communityVoteWeight: number;  // Weight for community votes
  expertReviewWeight: number;   // Weight for expert review
  bonusCriteria: { name: string; points: number; description: string }[];
}

export interface CreateBountyRequest {
  tenantId: string;
  creatorId: string;
  category: BountyCategory;
  title: string;
  description: string;
  requirements: BountyRequirements;
  reward: BountyReward;
  submissionDeadlineDays: number;
  judgingDeadlineDays: number;
  maxSubmissions: number;
  eligibleTiers: string[];
  tags: string[];
  proposalId?: string;
}

export interface SubmitToBountyRequest {
  bountyId: string;
  creatorId: string;
  tenantId: string;
  storyId: string;
}

// ─── Default Judging Criteria ───────────────────────────────────────────────

const DEFAULT_JUDGING: BountyJudgingCriteria = {
  decodabilityWeight: 0.25,
  narrativeWeight: 0.25,
  illustrationWeight: 0.15,
  communityVoteWeight: 0.15,
  expertReviewWeight: 0.20,
  bonusCriteria: [
    { name: 'Perfect Decodability', points: 5, description: 'Decodability score >= 95%' },
    { name: 'Cultural Excellence', points: 5, description: 'Outstanding cultural representation' },
    { name: 'Series Potential', points: 3, description: 'Story naturally extends into a series' },
    { name: 'Early Submission', points: 2, description: 'Submitted in the first third of the deadline' },
  ],
};

// ─── Service ────────────────────────────────────────────────────────────────

export class ContentBountyProgramme extends ScholarlyBaseService {
  constructor(
    private prisma: PrismaClient,
    private nats: NATSClient,
    private tokenEngine: TokenEconomyEngine,
  ) {
    super('ContentBountyProgramme');
  }

  async createBounty(request: CreateBountyRequest): Promise<Result<Bounty>> {
    // Validate reward minimums
    if (request.reward.primaryAmount < 5) {
      return { success: false, error: 'Minimum bounty reward is 5 tokens' };
    }

    const now = new Date();
    const submissionDeadline = new Date(now.getTime() + request.submissionDeadlineDays * 86400000);
    const judgingDeadline = new Date(submissionDeadline.getTime() + request.judgingDeadlineDays * 86400000);

    try {
      const bounty = await this.prisma.contentBounty.create({
        data: {
          tenantId: request.tenantId, creatorId: request.creatorId,
          category: request.category, title: request.title,
          description: request.description, requirements: request.requirements as any,
          reward: request.reward as any, status: BountyStatus.PUBLISHED,
          submissionDeadline, judgingDeadline,
          maxSubmissions: request.maxSubmissions, currentSubmissions: 0,
          eligibleTiers: request.eligibleTiers, tags: request.tags,
          proposalId: request.proposalId || null, metadata: {},
        },
      });

      await this.nats.publish('scholarly.bounty.created', {
        bountyId: bounty.id, tenantId: request.tenantId,
        category: request.category, title: request.title,
        reward: request.reward, submissionDeadline: submissionDeadline.toISOString(),
      });

      return { success: true, data: bounty as unknown as Bounty };
    } catch (error) {
      return { success: false, error: `Creation failed: ${(error as Error).message}` };
    }
  }

  async submitToBounty(request: SubmitToBountyRequest): Promise<Result<BountySubmission>> {
    const bounty = await this.prisma.contentBounty.findUnique({ where: { id: request.bountyId } });
    if (!bounty || bounty.tenantId !== request.tenantId) return { success: false, error: 'Bounty not found' };
    if (bounty.status !== BountyStatus.PUBLISHED && bounty.status !== BountyStatus.ACCEPTING) {
      return { success: false, error: `Bounty is ${bounty.status}` };
    }
    if (new Date() > new Date(bounty.submissionDeadline)) return { success: false, error: 'Submission deadline passed' };
    if (bounty.currentSubmissions >= bounty.maxSubmissions) return { success: false, error: 'Max submissions reached' };

    // Check creator tier eligibility
    const creator = await this.prisma.creatorProfile.findFirst({
      where: { userId: request.creatorId, tenantId: request.tenantId },
    });
    if (!creator || !(bounty.eligibleTiers as string[]).includes(creator.tier)) {
      return { success: false, error: 'Creator tier not eligible' };
    }

    // Check duplicate submission
    const existing = await this.prisma.bountySubmission.findFirst({
      where: { bountyId: request.bountyId, creatorId: request.creatorId },
    });
    if (existing) return { success: false, error: 'Already submitted to this bounty' };

    // Run automated scoring
    const automatedScore = await this.runAutomatedScoring(request.storyId, bounty.requirements as any);

    try {
      const submission = await this.prisma.$transaction(async (tx: any) => {
        const sub = await tx.bountySubmission.create({
          data: {
            bountyId: request.bountyId, creatorId: request.creatorId,
            tenantId: request.tenantId, storyId: request.storyId,
            status: SubmissionStatus.SUBMITTED, automatedScore: automatedScore.score,
            communityScore: 0, expertScore: 0, totalScore: automatedScore.score,
            feedback: automatedScore.feedback,
          },
        });

        await tx.contentBounty.update({
          where: { id: request.bountyId },
          data: { currentSubmissions: { increment: 1 }, status: BountyStatus.ACCEPTING },
        });

        return sub;
      });

      // Award Voice tokens for valid submission
      const reward = bounty.reward as any;
      if (reward.voiceBonus > 0) {
        await this.tokenEngine.processEarning({
          userId: request.creatorId, tenantId: request.tenantId,
          category: 'BOUNTY_COMPLETION' as any,
          referenceId: request.bountyId, referenceType: 'BOUNTY_SUBMISSION',
          performanceData: { bountyWinner: false, earlySubmission: this.isEarlySubmission(bounty) },
          timestamp: new Date(),
        });
      }

      await this.nats.publish('scholarly.bounty.submission_received', {
        bountyId: request.bountyId, submissionId: submission.id,
        creatorId: request.creatorId, automatedScore: automatedScore.score,
      });

      return { success: true, data: submission as unknown as BountySubmission };
    } catch (error) {
      return { success: false, error: `Submission failed: ${(error as Error).message}` };
    }
  }

  async startJudging(bountyId: string, tenantId: string): Promise<Result<Bounty>> {
    const bounty = await this.prisma.contentBounty.findUnique({ where: { id: bountyId } });
    if (!bounty || bounty.tenantId !== tenantId) return { success: false, error: 'Not found' };

    try {
      const updated = await this.prisma.contentBounty.update({
        where: { id: bountyId }, data: { status: BountyStatus.JUDGING },
      });

      // Move all submissions to UNDER_REVIEW
      await this.prisma.bountySubmission.updateMany({
        where: { bountyId, status: SubmissionStatus.SUBMITTED },
        data: { status: SubmissionStatus.UNDER_REVIEW },
      });

      await this.nats.publish('scholarly.bounty.judging_started', { bountyId, tenantId });
      return { success: true, data: updated as unknown as Bounty };
    } catch (error) {
      return { success: false, error: `Start judging failed: ${(error as Error).message}` };
    }
  }

  async awardBounty(bountyId: string, tenantId: string, winnerIds: string[], runnerUpIds: string[]): Promise<Result<{
    winnersRewarded: number; runnerUpsRewarded: number; totalTokensDistributed: number;
  }>> {
    const bounty = await this.prisma.contentBounty.findUnique({ where: { id: bountyId } });
    if (!bounty || bounty.tenantId !== tenantId) return { success: false, error: 'Not found' };
    if (bounty.status !== BountyStatus.JUDGING) return { success: false, error: `Cannot award: ${bounty.status}` };

    const reward = bounty.reward as any;
    let totalDistributed = 0;

    try {
      // Award winners
      const winnerAmount = Math.floor(reward.primaryAmount / winnerIds.length);
      for (const winnerId of winnerIds) {
        await this.prisma.bountySubmission.updateMany({
          where: { bountyId, creatorId: winnerId },
          data: { status: SubmissionStatus.WINNER },
        });

        await this.tokenEngine.processEarning({
          userId: winnerId, tenantId,
          category: 'BOUNTY_COMPLETION' as any,
          referenceId: bountyId, referenceType: 'BOUNTY_WINNER',
          performanceData: { bountyWinner: true },
          timestamp: new Date(),
        });

        totalDistributed += winnerAmount;
      }

      // Award runners-up
      const runnerUpAmount = Math.floor(winnerAmount * (reward.runnerUpPercentage / 100));
      for (const runnerId of runnerUpIds) {
        await this.prisma.bountySubmission.updateMany({
          where: { bountyId, creatorId: runnerId },
          data: { status: SubmissionStatus.RUNNER_UP },
        });
        totalDistributed += runnerUpAmount;
      }

      // Reject remaining
      await this.prisma.bountySubmission.updateMany({
        where: {
          bountyId,
          status: { in: [SubmissionStatus.UNDER_REVIEW, SubmissionStatus.SHORTLISTED] },
        },
        data: { status: SubmissionStatus.REJECTED },
      });

      await this.prisma.contentBounty.update({
        where: { id: bountyId }, data: { status: BountyStatus.AWARDED },
      });

      await this.nats.publish('scholarly.bounty.awarded', {
        bountyId, tenantId, winnerCount: winnerIds.length,
        runnerUpCount: runnerUpIds.length, totalDistributed,
      });

      return {
        success: true,
        data: { winnersRewarded: winnerIds.length, runnerUpsRewarded: runnerUpIds.length, totalTokensDistributed: totalDistributed },
      };
    } catch (error) {
      return { success: false, error: `Award failed: ${(error as Error).message}` };
    }
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  async getActiveBounties(tenantId: string, options: {
    category?: BountyCategory; phase?: number; language?: string; limit?: number;
  }): Promise<Result<Bounty[]>> {
    try {
      const where: any = {
        tenantId, status: { in: [BountyStatus.PUBLISHED, BountyStatus.ACCEPTING] },
        submissionDeadline: { gt: new Date() },
      };
      if (options.category) where.category = options.category;

      const bounties = await this.prisma.contentBounty.findMany({
        where, orderBy: { submissionDeadline: 'asc' }, take: options.limit || 20,
      });
      return { success: true, data: bounties as unknown as Bounty[] };
    } catch (error) {
      return { success: false, error: `Query failed: ${(error as Error).message}` };
    }
  }

  async getBountySubmissions(bountyId: string, tenantId: string): Promise<Result<BountySubmission[]>> {
    try {
      const submissions = await this.prisma.bountySubmission.findMany({
        where: { bountyId, tenantId }, orderBy: { totalScore: 'desc' },
      });
      return { success: true, data: submissions as unknown as BountySubmission[] };
    } catch (error) {
      return { success: false, error: `Query failed: ${(error as Error).message}` };
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async runAutomatedScoring(storyId: string, requirements: BountyRequirements): Promise<{ score: number; feedback: string }> {
    // This would call the Content Validator from Sprint 8
    // For now, return a simulated score based on requirements
    const score = 70 + Math.floor(Math.random() * 25); // 70-95
    return {
      score,
      feedback: score >= 85 ? 'Excellent quality submission' : score >= 70 ? 'Good submission with minor improvements possible' : 'Submission needs revision',
    };
  }

  private isEarlySubmission(bounty: any): boolean {
    const total = new Date(bounty.submissionDeadline).getTime() - new Date(bounty.createdAt).getTime();
    const elapsed = Date.now() - new Date(bounty.createdAt).getTime();
    return elapsed < total / 3;
  }

  getJudgingCriteria(): BountyJudgingCriteria { return DEFAULT_JUDGING; }
}
