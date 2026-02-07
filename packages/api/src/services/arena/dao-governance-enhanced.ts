// =============================================================================
// DAO Governance Service — Scholarly Platform Governance
// =============================================================================
// The DAO Governance Service is the democratic brain of the ecosystem.
// Anyone with Voice tokens can propose changes, vote, and delegate their
// voting power. Tiered proposal types mirror real democracy: lightweight
// Signal Proposals for suggestions, heavyweight Treasury Proposals for
// funding allocation with supermajority requirements.
//
// Architecture: Event-driven with NATS, multi-tenant, Result<T>, time-locked
// voting, quadratic voting support, transparent audit trails.
// =============================================================================

import { ScholarlyBaseService, Result, NATSClient, PrismaClient } from '../shared/types';
import { TokenType, TokenEconomyEngine, SpendingCategory } from './token-economy-engine';

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum ProposalType {
  SIGNAL = 'SIGNAL',
  FEATURE_PRIORITY = 'FEATURE_PRIORITY',
  CONTENT_POLICY = 'CONTENT_POLICY',
  BOUNTY_ALLOCATION = 'BOUNTY_ALLOCATION',
  TREASURY_SPEND = 'TREASURY_SPEND',
  PARAMETER_CHANGE = 'PARAMETER_CHANGE',
  CREATOR_TIER = 'CREATOR_TIER',
  CURRICULUM_ADDITION = 'CURRICULUM_ADDITION',
  MODERATION_POLICY = 'MODERATION_POLICY',
  EMERGENCY = 'EMERGENCY',
}

export enum ProposalStatus {
  DRAFT = 'DRAFT', ACTIVE = 'ACTIVE', QUORUM_REACHED = 'QUORUM_REACHED',
  PASSED = 'PASSED', FAILED = 'FAILED', EXECUTED = 'EXECUTED',
  VETOED = 'VETOED', CANCELLED = 'CANCELLED', EXPIRED = 'EXPIRED',
}

export enum VoteChoice { FOR = 'FOR', AGAINST = 'AGAINST', ABSTAIN = 'ABSTAIN' }

export enum VotingStrategy {
  SIMPLE_MAJORITY = 'SIMPLE_MAJORITY',
  SUPERMAJORITY = 'SUPERMAJORITY',
  QUADRATIC = 'QUADRATIC',
  CONVICTION = 'CONVICTION',
}

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface ProposalConfig {
  type: ProposalType;
  minVoiceToCreate: number;
  voiceLockToCreate: number;
  votingStrategy: VotingStrategy;
  votingPeriodHours: number;
  quorumPercentage: number;
  passThreshold: number;
  executionDelayHours: number;
  maxActivePerUser: number;
  minAge: number;
  description: string;
}

export interface Proposal {
  id: string; tenantId: string; creatorId: string; type: ProposalType;
  title: string; description: string; specification: Record<string, unknown>;
  status: ProposalStatus; votingStrategy: VotingStrategy;
  votingStartsAt: Date; votingEndsAt: Date; executionAt: Date | null;
  quorumRequired: number; votesFor: number; votesAgainst: number;
  votesAbstain: number; totalVoters: number; voiceLocked: number;
  metadata: Record<string, unknown>; createdAt: Date; updatedAt: Date;
}

export interface Vote {
  id: string; proposalId: string; voterId: string; tenantId: string;
  choice: VoteChoice; weight: number; voiceSpent: number;
  delegatedFrom: string | null; reason: string | null; createdAt: Date;
}

export interface Delegation {
  id: string; delegatorId: string; delegateId: string; tenantId: string;
  proposalTypes: ProposalType[]; voiceAmount: number;
  expiresAt: Date; isActive: boolean; createdAt: Date; updatedAt: Date;
}

export interface Treasury {
  tenantId: string; sparksBalance: number; gemsBalance: number;
  voiceBalance: number; totalAllocated: number; totalSpent: number;
}

export interface TreasuryTransaction {
  id: string; tenantId: string; proposalId: string | null;
  tokenType: TokenType; amount: number; direction: 'INFLOW' | 'OUTFLOW';
  description: string; createdAt: Date;
}

export interface CreateProposalRequest {
  tenantId: string; creatorId: string; type: ProposalType;
  title: string; description: string; specification: Record<string, unknown>;
}

export interface CastVoteRequest {
  proposalId: string; voterId: string; tenantId: string;
  choice: VoteChoice; voiceAmount: number; reason?: string;
}

export interface DelegateRequest {
  delegatorId: string; delegateId: string; tenantId: string;
  proposalTypes: ProposalType[]; voiceAmount: number; durationDays: number;
}

// ─── Proposal Configs ───────────────────────────────────────────────────────

const PROPOSAL_CONFIGS: ProposalConfig[] = [
  { type: ProposalType.SIGNAL, minVoiceToCreate: 5, voiceLockToCreate: 5, votingStrategy: VotingStrategy.SIMPLE_MAJORITY, votingPeriodHours: 48, quorumPercentage: 5, passThreshold: 50, executionDelayHours: 0, maxActivePerUser: 3, minAge: 13, description: 'Lightweight sentiment check' },
  { type: ProposalType.FEATURE_PRIORITY, minVoiceToCreate: 10, voiceLockToCreate: 10, votingStrategy: VotingStrategy.QUADRATIC, votingPeriodHours: 120, quorumPercentage: 10, passThreshold: 50, executionDelayHours: 24, maxActivePerUser: 2, minAge: 13, description: 'Feature prioritisation vote' },
  { type: ProposalType.CONTENT_POLICY, minVoiceToCreate: 20, voiceLockToCreate: 20, votingStrategy: VotingStrategy.SUPERMAJORITY, votingPeriodHours: 168, quorumPercentage: 15, passThreshold: 66, executionDelayHours: 48, maxActivePerUser: 1, minAge: 16, description: 'Content guidelines change' },
  { type: ProposalType.BOUNTY_ALLOCATION, minVoiceToCreate: 25, voiceLockToCreate: 25, votingStrategy: VotingStrategy.SIMPLE_MAJORITY, votingPeriodHours: 120, quorumPercentage: 10, passThreshold: 50, executionDelayHours: 24, maxActivePerUser: 2, minAge: 16, description: 'Allocate bounty funds' },
  { type: ProposalType.TREASURY_SPEND, minVoiceToCreate: 50, voiceLockToCreate: 50, votingStrategy: VotingStrategy.SUPERMAJORITY, votingPeriodHours: 336, quorumPercentage: 20, passThreshold: 66, executionDelayHours: 72, maxActivePerUser: 1, minAge: 18, description: 'Treasury spending proposal' },
  { type: ProposalType.PARAMETER_CHANGE, minVoiceToCreate: 30, voiceLockToCreate: 30, votingStrategy: VotingStrategy.SUPERMAJORITY, votingPeriodHours: 168, quorumPercentage: 15, passThreshold: 66, executionDelayHours: 48, maxActivePerUser: 1, minAge: 18, description: 'Platform parameter change' },
  { type: ProposalType.CREATOR_TIER, minVoiceToCreate: 20, voiceLockToCreate: 20, votingStrategy: VotingStrategy.SIMPLE_MAJORITY, votingPeriodHours: 120, quorumPercentage: 10, passThreshold: 50, executionDelayHours: 24, maxActivePerUser: 1, minAge: 16, description: 'Creator tier modification' },
  { type: ProposalType.CURRICULUM_ADDITION, minVoiceToCreate: 15, voiceLockToCreate: 15, votingStrategy: VotingStrategy.SIMPLE_MAJORITY, votingPeriodHours: 168, quorumPercentage: 10, passThreshold: 50, executionDelayHours: 24, maxActivePerUser: 2, minAge: 16, description: 'Add curriculum framework' },
  { type: ProposalType.MODERATION_POLICY, minVoiceToCreate: 25, voiceLockToCreate: 25, votingStrategy: VotingStrategy.SUPERMAJORITY, votingPeriodHours: 168, quorumPercentage: 15, passThreshold: 66, executionDelayHours: 48, maxActivePerUser: 1, minAge: 18, description: 'Moderation rule change' },
  { type: ProposalType.EMERGENCY, minVoiceToCreate: 100, voiceLockToCreate: 100, votingStrategy: VotingStrategy.SUPERMAJORITY, votingPeriodHours: 24, quorumPercentage: 25, passThreshold: 75, executionDelayHours: 0, maxActivePerUser: 1, minAge: 18, description: 'Emergency fast-track action' },
];

// ─── Service ────────────────────────────────────────────────────────────────

export class DAOGovernanceService extends ScholarlyBaseService {
  private proposalConfigs: Map<ProposalType, ProposalConfig>;

  constructor(
    private prisma: PrismaClient,
    private nats: NATSClient,
    private tokenEngine: TokenEconomyEngine,
    private redis: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, opts?: any) => Promise<void>; del: (k: string) => Promise<void> },
  ) {
    super('DAOGovernanceService');
    this.proposalConfigs = new Map();
    for (const c of PROPOSAL_CONFIGS) this.proposalConfigs.set(c.type, c);
  }

  // ── Create Proposal ─────────────────────────────────────────────────────

  async createProposal(request: CreateProposalRequest): Promise<Result<Proposal>> {
    const config = this.proposalConfigs.get(request.type);
    if (!config) return { success: false, error: `Unknown proposal type: ${request.type}` };

    const ageResult = await this.getUserAge(request.creatorId, request.tenantId);
    if (!ageResult.success) return { success: false, error: ageResult.error };
    if (ageResult.data! < config.minAge) {
      return { success: false, error: `Must be at least ${config.minAge} to create ${request.type} proposals` };
    }

    const balanceResult = await this.tokenEngine.getBalance(request.creatorId, request.tenantId);
    if (!balanceResult.success) return { success: false, error: balanceResult.error };
    if (balanceResult.data!.voice < config.minVoiceToCreate) {
      return { success: false, error: `Need ${config.minVoiceToCreate} Voice, have ${balanceResult.data!.voice}` };
    }

    const activeCount = await this.prisma.governanceProposal.count({
      where: {
        creatorId: request.creatorId, tenantId: request.tenantId,
        status: { in: [ProposalStatus.DRAFT, ProposalStatus.ACTIVE, ProposalStatus.QUORUM_REACHED] },
      },
    });
    if (activeCount >= config.maxActivePerUser) {
      return { success: false, error: `Max ${config.maxActivePerUser} active proposals of this type` };
    }

    const totalVoiceSupply = await this.getTotalVoiceSupply(request.tenantId);
    const quorumRequired = Math.ceil(totalVoiceSupply * (config.quorumPercentage / 100));

    const now = new Date();
    const votingEndsAt = new Date(now.getTime() + config.votingPeriodHours * 60 * 60 * 1000);

    try {
      const proposal = await this.prisma.governanceProposal.create({
        data: {
          tenantId: request.tenantId, creatorId: request.creatorId,
          type: request.type, title: request.title,
          description: request.description, specification: request.specification,
          status: ProposalStatus.ACTIVE, votingStrategy: config.votingStrategy,
          votingStartsAt: now, votingEndsAt, executionAt: null,
          quorumRequired, votesFor: 0, votesAgainst: 0, votesAbstain: 0,
          totalVoters: 0, voiceLocked: config.voiceLockToCreate, metadata: {},
        },
      });

      await this.nats.publish('scholarly.governance.proposal_created', {
        proposalId: proposal.id, tenantId: request.tenantId, type: request.type,
        title: request.title, creatorId: request.creatorId,
        votingEndsAt: votingEndsAt.toISOString(), quorumRequired,
      });

      return { success: true, data: proposal as unknown as Proposal };
    } catch (error) {
      return { success: false, error: `Proposal creation failed: ${(error as Error).message}` };
    }
  }

  // ── Cast Vote ───────────────────────────────────────────────────────────

  async castVote(request: CastVoteRequest): Promise<Result<Vote>> {
    const proposal = await this.prisma.governanceProposal.findUnique({
      where: { id: request.proposalId },
    });
    if (!proposal || proposal.tenantId !== request.tenantId) {
      return { success: false, error: 'Proposal not found' };
    }
    if (proposal.status !== ProposalStatus.ACTIVE && proposal.status !== ProposalStatus.QUORUM_REACHED) {
      return { success: false, error: `Cannot vote: proposal is ${proposal.status}` };
    }
    if (new Date() > new Date(proposal.votingEndsAt)) {
      return { success: false, error: 'Voting period has ended' };
    }

    const existing = await this.prisma.governanceVote.findFirst({
      where: { proposalId: request.proposalId, voterId: request.voterId },
    });
    if (existing) return { success: false, error: 'Already voted' };

    const balanceResult = await this.tokenEngine.getBalance(request.voterId, request.tenantId);
    if (!balanceResult.success) return { success: false, error: balanceResult.error };
    if (balanceResult.data!.voice < request.voiceAmount) {
      return { success: false, error: `Insufficient Voice: need ${request.voiceAmount}` };
    }

    const config = this.proposalConfigs.get(proposal.type as ProposalType)!;
    let weight: number;
    switch (config.votingStrategy) {
      case VotingStrategy.SIMPLE_MAJORITY:
      case VotingStrategy.SUPERMAJORITY:
        weight = request.voiceAmount; break;
      case VotingStrategy.QUADRATIC:
        weight = Math.floor(Math.sqrt(request.voiceAmount)); break;
      case VotingStrategy.CONVICTION:
        weight = request.voiceAmount; break;
    }

    const delegatedWeight = await this.getDelegatedWeight(request.voterId, request.tenantId, proposal.type as ProposalType);
    const totalWeight = weight + delegatedWeight;

    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        const vote = await tx.governanceVote.create({
          data: {
            proposalId: request.proposalId, voterId: request.voterId,
            tenantId: request.tenantId, choice: request.choice,
            weight: totalWeight, voiceSpent: request.voiceAmount,
            delegatedFrom: delegatedWeight > 0 ? 'multiple_delegators' : null,
            reason: request.reason || null,
          },
        });

        const updateData: Record<string, any> = { totalVoters: { increment: 1 } };
        switch (request.choice) {
          case VoteChoice.FOR: updateData.votesFor = { increment: totalWeight }; break;
          case VoteChoice.AGAINST: updateData.votesAgainst = { increment: totalWeight }; break;
          case VoteChoice.ABSTAIN: updateData.votesAbstain = { increment: totalWeight }; break;
        }

        const updated = await tx.governanceProposal.update({
          where: { id: request.proposalId }, data: updateData,
        });

        const totalVotes = updated.votesFor + updated.votesAgainst + updated.votesAbstain;
        if (totalVotes >= updated.quorumRequired && updated.status === ProposalStatus.ACTIVE) {
          await tx.governanceProposal.update({
            where: { id: request.proposalId },
            data: { status: ProposalStatus.QUORUM_REACHED },
          });
        }

        return vote;
      });

      await this.nats.publish('scholarly.governance.vote_cast', {
        proposalId: request.proposalId, voterId: request.voterId,
        tenantId: request.tenantId, choice: request.choice,
        weight: totalWeight, voiceSpent: request.voiceAmount,
      });

      return { success: true, data: result as unknown as Vote };
    } catch (error) {
      return { success: false, error: `Vote failed: ${(error as Error).message}` };
    }
  }

  // ── Finalise & Execute ──────────────────────────────────────────────────

  async finaliseProposal(proposalId: string, tenantId: string): Promise<Result<Proposal>> {
    const proposal = await this.prisma.governanceProposal.findUnique({ where: { id: proposalId } });
    if (!proposal || proposal.tenantId !== tenantId) return { success: false, error: 'Not found' };
    if (new Date() < new Date(proposal.votingEndsAt)) return { success: false, error: 'Voting not ended' };
    if (![ProposalStatus.ACTIVE, ProposalStatus.QUORUM_REACHED].includes(proposal.status as ProposalStatus)) {
      return { success: false, error: `Cannot finalise: ${proposal.status}` };
    }

    const config = this.proposalConfigs.get(proposal.type as ProposalType)!;
    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
    let newStatus: ProposalStatus;

    if (totalVotes < proposal.quorumRequired) {
      newStatus = ProposalStatus.EXPIRED;
    } else {
      const decisive = proposal.votesFor + proposal.votesAgainst;
      const forPct = decisive > 0 ? (proposal.votesFor / decisive) * 100 : 0;
      newStatus = forPct >= config.passThreshold ? ProposalStatus.PASSED : ProposalStatus.FAILED;
    }

    const executionAt = newStatus === ProposalStatus.PASSED && config.executionDelayHours > 0
      ? new Date(Date.now() + config.executionDelayHours * 3600000) : null;

    try {
      const updated = await this.prisma.governanceProposal.update({
        where: { id: proposalId }, data: { status: newStatus, executionAt },
      });

      if (newStatus !== ProposalStatus.PASSED) {
        await this.returnLockedVoice(proposal.creatorId, tenantId, proposal.voiceLocked);
      }

      await this.nats.publish('scholarly.governance.proposal_finalised', {
        proposalId, tenantId, status: newStatus,
        votesFor: proposal.votesFor, votesAgainst: proposal.votesAgainst,
      });

      return { success: true, data: updated as unknown as Proposal };
    } catch (error) {
      return { success: false, error: `Finalisation failed: ${(error as Error).message}` };
    }
  }

  async executeProposal(proposalId: string, tenantId: string): Promise<Result<Proposal>> {
    const proposal = await this.prisma.governanceProposal.findUnique({ where: { id: proposalId } });
    if (!proposal || proposal.tenantId !== tenantId) return { success: false, error: 'Not found' };
    if (proposal.status !== ProposalStatus.PASSED) return { success: false, error: `Cannot execute: ${proposal.status}` };
    if (proposal.executionAt && new Date() < new Date(proposal.executionAt)) {
      return { success: false, error: 'Timelock not expired' };
    }

    try {
      const execResult = await this.executeProposalAction(proposal as unknown as Proposal);
      if (!execResult.success) return { success: false, error: execResult.error };

      const updated = await this.prisma.governanceProposal.update({
        where: { id: proposalId }, data: { status: ProposalStatus.EXECUTED },
      });

      await this.returnLockedVoice(proposal.creatorId, tenantId, proposal.voiceLocked);

      await this.nats.publish('scholarly.governance.proposal_executed', {
        proposalId, tenantId, type: proposal.type, title: proposal.title,
      });

      return { success: true, data: updated as unknown as Proposal };
    } catch (error) {
      return { success: false, error: `Execution failed: ${(error as Error).message}` };
    }
  }

  // ── Delegation ──────────────────────────────────────────────────────────

  async createDelegation(request: DelegateRequest): Promise<Result<Delegation>> {
    if (request.delegatorId === request.delegateId) {
      return { success: false, error: 'Cannot delegate to yourself' };
    }

    const circular = await this.prisma.governanceDelegation.findFirst({
      where: {
        delegatorId: request.delegateId, delegateId: request.delegatorId,
        tenantId: request.tenantId, isActive: true,
      },
    });
    if (circular) return { success: false, error: 'Circular delegation detected' };

    const balanceResult = await this.tokenEngine.getBalance(request.delegatorId, request.tenantId);
    if (!balanceResult.success) return { success: false, error: balanceResult.error };
    if (balanceResult.data!.voice < request.voiceAmount) {
      return { success: false, error: 'Insufficient Voice for delegation' };
    }

    const expiresAt = new Date(Date.now() + request.durationDays * 86400000);

    try {
      await this.prisma.governanceDelegation.updateMany({
        where: {
          delegatorId: request.delegatorId, delegateId: request.delegateId,
          tenantId: request.tenantId, isActive: true,
        },
        data: { isActive: false },
      });

      const delegation = await this.prisma.governanceDelegation.create({
        data: {
          delegatorId: request.delegatorId, delegateId: request.delegateId,
          tenantId: request.tenantId, proposalTypes: request.proposalTypes,
          voiceAmount: request.voiceAmount, expiresAt, isActive: true,
        },
      });

      await this.nats.publish('scholarly.governance.delegation_created', {
        delegatorId: request.delegatorId, delegateId: request.delegateId,
        tenantId: request.tenantId, voiceAmount: request.voiceAmount,
      });

      return { success: true, data: delegation as unknown as Delegation };
    } catch (error) {
      return { success: false, error: `Delegation failed: ${(error as Error).message}` };
    }
  }

  async revokeDelegation(delegationId: string, delegatorId: string, tenantId: string): Promise<Result<void>> {
    try {
      const delegation = await this.prisma.governanceDelegation.findUnique({ where: { id: delegationId } });
      if (!delegation || delegation.delegatorId !== delegatorId || delegation.tenantId !== tenantId) {
        return { success: false, error: 'Delegation not found' };
      }
      await this.prisma.governanceDelegation.update({
        where: { id: delegationId }, data: { isActive: false },
      });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Revoke failed: ${(error as Error).message}` };
    }
  }

  // ── Treasury Management ─────────────────────────────────────────────────

  async getTreasury(tenantId: string): Promise<Result<Treasury>> {
    try {
      const treasury = await this.prisma.daoTreasury.findUnique({ where: { tenantId } });
      if (!treasury) {
        const created = await this.prisma.daoTreasury.create({
          data: { tenantId, sparksBalance: 0, gemsBalance: 0, voiceBalance: 0, totalAllocated: 0, totalSpent: 0 },
        });
        return { success: true, data: created as unknown as Treasury };
      }
      return { success: true, data: treasury as unknown as Treasury };
    } catch (error) {
      return { success: false, error: `Treasury fetch failed: ${(error as Error).message}` };
    }
  }

  async allocateFromTreasury(
    tenantId: string, proposalId: string, tokenType: TokenType,
    amount: number, recipientId: string, description: string,
  ): Promise<Result<TreasuryTransaction>> {
    const treasury = await this.prisma.daoTreasury.findUnique({ where: { tenantId } });
    if (!treasury) return { success: false, error: 'Treasury not found' };

    const field = tokenType === TokenType.SPARKS ? 'sparksBalance' : tokenType === TokenType.GEMS ? 'gemsBalance' : 'voiceBalance';
    if ((treasury as any)[field] < amount) {
      return { success: false, error: `Insufficient treasury ${tokenType}: need ${amount}` };
    }

    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        await tx.daoTreasury.update({
          where: { tenantId },
          data: { [field]: { decrement: amount }, totalSpent: { increment: amount } },
        });

        const txn = await tx.treasuryTransaction.create({
          data: { tenantId, proposalId, tokenType, amount, direction: 'OUTFLOW', description },
        });

        // Credit recipient
        const balanceField = tokenType.toLowerCase();
        await tx.tokenBalance.upsert({
          where: { userId_tenantId: { userId: recipientId, tenantId } },
          create: { userId: recipientId, tenantId, [balanceField]: amount, sparks: 0, gems: 0, voice: 0, stakedSparks: 0, stakedGems: 0, stakedVoice: 0, lifetimeSparksEarned: 0, lifetimeGemsEarned: 0, lifetimeVoiceEarned: 0, lastEarnedAt: new Date() },
          update: { [balanceField]: { increment: amount } },
        });

        return txn;
      });

      await this.nats.publish('scholarly.governance.treasury_allocation', {
        tenantId, proposalId, tokenType, amount, recipientId,
      });

      return { success: true, data: result as unknown as TreasuryTransaction };
    } catch (error) {
      return { success: false, error: `Allocation failed: ${(error as Error).message}` };
    }
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  async getProposals(tenantId: string, options: {
    status?: ProposalStatus; type?: ProposalType; limit?: number; offset?: number;
  }): Promise<Result<{ proposals: Proposal[]; total: number }>> {
    try {
      const where: any = { tenantId };
      if (options.status) where.status = options.status;
      if (options.type) where.type = options.type;

      const [proposals, total] = await Promise.all([
        this.prisma.governanceProposal.findMany({
          where, orderBy: { createdAt: 'desc' },
          take: options.limit || 20, skip: options.offset || 0,
        }),
        this.prisma.governanceProposal.count({ where }),
      ]);

      return { success: true, data: { proposals: proposals as unknown as Proposal[], total } };
    } catch (error) {
      return { success: false, error: `Query failed: ${(error as Error).message}` };
    }
  }

  async getVotesForProposal(proposalId: string, tenantId: string): Promise<Result<Vote[]>> {
    try {
      const votes = await this.prisma.governanceVote.findMany({
        where: { proposalId, tenantId }, orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: votes as unknown as Vote[] };
    } catch (error) {
      return { success: false, error: `Vote fetch failed: ${(error as Error).message}` };
    }
  }

  async getActiveDelegations(userId: string, tenantId: string): Promise<Result<Delegation[]>> {
    try {
      const delegations = await this.prisma.governanceDelegation.findMany({
        where: {
          tenantId, isActive: true, expiresAt: { gt: new Date() },
          OR: [{ delegatorId: userId }, { delegateId: userId }],
        },
      });
      return { success: true, data: delegations as unknown as Delegation[] };
    } catch (error) {
      return { success: false, error: `Delegation fetch failed: ${(error as Error).message}` };
    }
  }

  async getGovernanceStats(tenantId: string): Promise<Result<{
    totalProposals: number; activeProposals: number; passedProposals: number;
    totalVotesCast: number; uniqueVoters: number; avgTurnout: number;
    totalTreasuryValue: number; totalDelegated: number;
  }>> {
    try {
      const [proposalCounts, voteStats, treasury, delegations] = await Promise.all([
        this.prisma.governanceProposal.groupBy({
          by: ['status'], where: { tenantId }, _count: { id: true },
        }),
        this.prisma.governanceVote.aggregate({
          where: { tenantId }, _count: { id: true },
          _sum: { voiceSpent: true },
        }),
        this.prisma.daoTreasury.findUnique({ where: { tenantId } }),
        this.prisma.governanceDelegation.aggregate({
          where: { tenantId, isActive: true }, _sum: { voiceAmount: true },
        }),
      ]);

      const statusCounts = new Map(proposalCounts.map((p: any) => [p.status, p._count.id]));
      const totalProposals = Array.from(statusCounts.values()).reduce((s, v) => s + v, 0);
      const activeProposals = (statusCounts.get(ProposalStatus.ACTIVE) || 0) + (statusCounts.get(ProposalStatus.QUORUM_REACHED) || 0);
      const passedProposals = (statusCounts.get(ProposalStatus.PASSED) || 0) + (statusCounts.get(ProposalStatus.EXECUTED) || 0);

      const uniqueVoters = await this.prisma.governanceVote.findMany({
        where: { tenantId }, distinct: ['voterId'], select: { voterId: true },
      });

      const treasuryTotal = treasury ? treasury.sparksBalance + treasury.gemsBalance + treasury.voiceBalance : 0;

      return {
        success: true,
        data: {
          totalProposals, activeProposals, passedProposals,
          totalVotesCast: voteStats._count.id,
          uniqueVoters: uniqueVoters.length,
          avgTurnout: totalProposals > 0 ? voteStats._count.id / totalProposals : 0,
          totalTreasuryValue: treasuryTotal,
          totalDelegated: delegations._sum.voiceAmount || 0,
        },
      };
    } catch (error) {
      return { success: false, error: `Stats failed: ${(error as Error).message}` };
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async getUserAge(userId: string, tenantId: string): Promise<Result<number>> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { dateOfBirth: true } });
      if (!user?.dateOfBirth) return { success: false, error: 'Date of birth not set' };
      const age = Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 86400000));
      return { success: true, data: age };
    } catch (error) {
      return { success: false, error: `Age lookup failed: ${(error as Error).message}` };
    }
  }

  private async getTotalVoiceSupply(tenantId: string): Promise<number> {
    const result = await this.prisma.tokenBalance.aggregate({
      where: { tenantId },
      _sum: { voice: true, stakedVoice: true },
    });
    return (result._sum.voice || 0) + (result._sum.stakedVoice || 0);
  }

  private async getDelegatedWeight(delegateId: string, tenantId: string, proposalType: ProposalType): Promise<number> {
    const delegations = await this.prisma.governanceDelegation.findMany({
      where: {
        delegateId, tenantId, isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
    return delegations
      .filter((d: any) => d.proposalTypes.includes(proposalType))
      .reduce((sum: number, d: any) => sum + d.voiceAmount, 0);
  }

  private async returnLockedVoice(userId: string, tenantId: string, amount: number): Promise<void> {
    if (amount <= 0) return;
    await this.prisma.tokenBalance.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { voice: { increment: amount } },
    });
    await this.redis.del(`balance:${tenantId}:${userId}`);
  }

  private async executeProposalAction(proposal: Proposal): Promise<Result<void>> {
    switch (proposal.type) {
      case ProposalType.SIGNAL:
      case ProposalType.FEATURE_PRIORITY:
        // Signal and feature priority are advisory — no automatic execution
        return { success: true, data: undefined };

      case ProposalType.BOUNTY_ALLOCATION:
      case ProposalType.TREASURY_SPEND: {
        const spec = proposal.specification as { tokenType: TokenType; amount: number; recipientId: string; description: string };
        if (!spec.tokenType || !spec.amount || !spec.recipientId) {
          return { success: false, error: 'Invalid treasury specification' };
        }
        const allocResult = await this.allocateFromTreasury(
          proposal.tenantId, proposal.id, spec.tokenType, spec.amount, spec.recipientId, spec.description || proposal.title,
        );
        return allocResult.success ? { success: true, data: undefined } : { success: false, error: allocResult.error };
      }

      case ProposalType.PARAMETER_CHANGE:
      case ProposalType.CREATOR_TIER:
      case ProposalType.CONTENT_POLICY:
      case ProposalType.MODERATION_POLICY:
      case ProposalType.CURRICULUM_ADDITION:
        // These require manual implementation by the platform team
        // The proposal's specification contains the proposed changes
        await this.nats.publish('scholarly.governance.action_required', {
          proposalId: proposal.id, tenantId: proposal.tenantId,
          type: proposal.type, specification: proposal.specification,
        });
        return { success: true, data: undefined };

      case ProposalType.EMERGENCY:
        await this.nats.publish('scholarly.governance.emergency_action', {
          proposalId: proposal.id, tenantId: proposal.tenantId,
          specification: proposal.specification,
        });
        return { success: true, data: undefined };

      default:
        return { success: false, error: `Unhandled proposal type: ${proposal.type}` };
    }
  }

  getProposalConfigs(): ProposalConfig[] { return PROPOSAL_CONFIGS; }
}
