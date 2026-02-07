// =============================================================================
// Arena Team System — Collaborative Competition & Shared Economies
// =============================================================================
// Teams transform the Arena from individual competition into social learning.
// Four team types serve different contexts: Classroom Teams (teacher-created),
// School Houses (persistent inter-class competition), Global Guilds (cross-
// school interest groups), and Family Teams (parent-child collaboration).
//
// Each team has a shared treasury funded by member contributions, democratic
// spending votes, inter-team trading, and a staking system for tournaments.
// The economic layer teaches collaborative resource management — children
// learn budgeting, voting, and collective decision-making by doing it.
// =============================================================================

import { ScholarlyBaseService, Result, NATSClient, PrismaClient } from '../shared/types';
import { TokenType, TokenEconomyEngine, StakePoolType, StakeRequest } from '../tokenomics/token-economy-engine';

// ─── Team Types ─────────────────────────────────────────────────────────────

export enum TeamType {
  CLASSROOM = 'CLASSROOM',     // Created by teacher, single class
  SCHOOL_HOUSE = 'SCHOOL_HOUSE', // Persistent school-wide team
  GLOBAL_GUILD = 'GLOBAL_GUILD', // Cross-school interest group
  FAMILY = 'FAMILY',           // Parent-child team
}

export enum TeamRole {
  CAPTAIN = 'CAPTAIN',
  VICE_CAPTAIN = 'VICE_CAPTAIN',
  MEMBER = 'MEMBER',
  COACH = 'COACH', // Teacher/parent role
}

export enum TreasuryVoteStatus {
  OPEN = 'OPEN',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum TradeStatus {
  PROPOSED = 'PROPOSED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  COMPLETED = 'COMPLETED',
}

// ─── Data Models ────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  tenantId: string;
  name: string;
  type: TeamType;
  description: string;
  avatarUrl: string | null;
  createdBy: string;
  maxMembers: number;
  memberCount: number;
  treasurySparks: number;
  treasuryGems: number;
  totalWins: number;
  totalCompetitions: number;
  xp: number;
  level: number;
  streak: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  tenantId: string;
  role: TeamRole;
  contributedSparks: number;
  contributedGems: number;
  competitionsPlayed: number;
  competitionsWon: number;
  joinedAt: Date;
  isActive: boolean;
}

export interface TreasurySpendVote {
  id: string;
  teamId: string;
  tenantId: string;
  proposerId: string;
  description: string;
  tokenType: TokenType;
  amount: number;
  purpose: string; // What the tokens would be spent on
  status: TreasuryVoteStatus;
  votesFor: number;
  votesAgainst: number;
  totalVoters: number;
  requiredApproval: number; // Percentage needed
  expiresAt: Date;
  createdAt: Date;
}

export interface TreasuryVoteCast {
  id: string;
  voteId: string;
  voterId: string;
  choice: 'FOR' | 'AGAINST';
  createdAt: Date;
}

export interface TeamTrade {
  id: string;
  tenantId: string;
  proposerTeamId: string;
  recipientTeamId: string;
  offerTokenType: TokenType;
  offerAmount: number;
  requestTokenType: TokenType;
  requestAmount: number;
  status: TradeStatus;
  message: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface TeamChallenge {
  id: string;
  tenantId: string;
  challengerTeamId: string;
  challengedTeamId: string;
  competitionId: string | null; // Created when both teams accept
  wagerAmount: number;
  wagerTokenType: TokenType;
  format: string;
  phonicsPhase: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED';
  createdAt: Date;
}

// ─── Request Types ──────────────────────────────────────────────────────────

export interface CreateTeamRequest {
  tenantId: string;
  createdBy: string;
  name: string;
  type: TeamType;
  description: string;
  maxMembers?: number;
}

export interface JoinTeamRequest {
  teamId: string;
  userId: string;
  tenantId: string;
  role?: TeamRole;
}

export interface ContributeRequest {
  teamId: string;
  userId: string;
  tenantId: string;
  tokenType: TokenType;
  amount: number;
}

export interface ProposeSpendRequest {
  teamId: string;
  proposerId: string;
  tenantId: string;
  tokenType: TokenType;
  amount: number;
  purpose: string;
  description: string;
}

export interface ProposeTradeRequest {
  proposerTeamId: string;
  recipientTeamId: string;
  tenantId: string;
  offerTokenType: TokenType;
  offerAmount: number;
  requestTokenType: TokenType;
  requestAmount: number;
  message?: string;
}

export interface ChallengeTeamRequest {
  challengerTeamId: string;
  challengedTeamId: string;
  tenantId: string;
  format: string;
  phonicsPhase: number;
  wagerAmount: number;
  wagerTokenType: TokenType;
}

// ─── Team Limits by Type ────────────────────────────────────────────────────

const TEAM_LIMITS: Record<TeamType, { maxMembers: number; maxTreasury: number; canTrade: boolean; canChallenge: boolean }> = {
  [TeamType.CLASSROOM]: { maxMembers: 35, maxTreasury: 5000, canTrade: true, canChallenge: true },
  [TeamType.SCHOOL_HOUSE]: { maxMembers: 100, maxTreasury: 20000, canTrade: true, canChallenge: true },
  [TeamType.GLOBAL_GUILD]: { maxMembers: 50, maxTreasury: 10000, canTrade: true, canChallenge: true },
  [TeamType.FAMILY]: { maxMembers: 8, maxTreasury: 2000, canTrade: false, canChallenge: true },
};

// ─── Arena Team Service ─────────────────────────────────────────────────────

export class ArenaTeamSystem extends ScholarlyBaseService {
  constructor(
    private prisma: PrismaClient,
    private nats: NATSClient,
    private tokenEngine: TokenEconomyEngine,
    private redis: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, opts?: any) => Promise<void>; del: (k: string) => Promise<void> },
  ) {
    super('ArenaTeamSystem');
  }

  // ── Team CRUD ───────────────────────────────────────────────────────────

  async createTeam(request: CreateTeamRequest): Promise<Result<Team>> {
    const limits = TEAM_LIMITS[request.type];
    const maxMembers = Math.min(request.maxMembers || limits.maxMembers, limits.maxMembers);

    try {
      const team = await this.prisma.$transaction(async (tx: any) => {
        const t = await tx.arenaTeam.create({
          data: {
            tenantId: request.tenantId, name: request.name, type: request.type,
            description: request.description, avatarUrl: null,
            createdBy: request.createdBy, maxMembers, memberCount: 1,
            treasurySparks: 0, treasuryGems: 0, totalWins: 0,
            totalCompetitions: 0, xp: 0, level: 1, streak: 0,
            isActive: true, metadata: {},
          },
        });

        // Add creator as captain
        await tx.arenaTeamMember.create({
          data: {
            teamId: t.id, userId: request.createdBy, tenantId: request.tenantId,
            role: TeamRole.CAPTAIN, contributedSparks: 0, contributedGems: 0,
            competitionsPlayed: 0, competitionsWon: 0, isActive: true,
          },
        });

        return t;
      });

      await this.nats.publish('scholarly.arena.team_created', {
        teamId: team.id, tenantId: request.tenantId, type: request.type, name: request.name,
      });

      return { success: true, data: team as unknown as Team };
    } catch (error) {
      return { success: false, error: `Team creation failed: ${(error as Error).message}` };
    }
  }

  async joinTeam(request: JoinTeamRequest): Promise<Result<TeamMember>> {
    const team = await this.prisma.arenaTeam.findUnique({ where: { id: request.teamId } });
    if (!team || team.tenantId !== request.tenantId || !team.isActive) {
      return { success: false, error: 'Team not found' };
    }
    if (team.memberCount >= team.maxMembers) {
      return { success: false, error: 'Team is full' };
    }

    const existing = await this.prisma.arenaTeamMember.findFirst({
      where: { teamId: request.teamId, userId: request.userId, isActive: true },
    });
    if (existing) return { success: false, error: 'Already a member' };

    try {
      const member = await this.prisma.$transaction(async (tx: any) => {
        const m = await tx.arenaTeamMember.create({
          data: {
            teamId: request.teamId, userId: request.userId, tenantId: request.tenantId,
            role: request.role || TeamRole.MEMBER, contributedSparks: 0,
            contributedGems: 0, competitionsPlayed: 0, competitionsWon: 0, isActive: true,
          },
        });

        await tx.arenaTeam.update({
          where: { id: request.teamId },
          data: { memberCount: { increment: 1 } },
        });

        return m;
      });

      await this.nats.publish('scholarly.arena.member_joined', {
        teamId: request.teamId, userId: request.userId, tenantId: request.tenantId,
      });

      return { success: true, data: member as unknown as TeamMember };
    } catch (error) {
      return { success: false, error: `Join failed: ${(error as Error).message}` };
    }
  }

  async leaveTeam(teamId: string, userId: string, tenantId: string): Promise<Result<void>> {
    const member = await this.prisma.arenaTeamMember.findFirst({
      where: { teamId, userId, tenantId, isActive: true },
    });
    if (!member) return { success: false, error: 'Not a member' };

    if (member.role === TeamRole.CAPTAIN) {
      // Transfer captaincy or dissolve
      const otherMembers = await this.prisma.arenaTeamMember.findMany({
        where: { teamId, isActive: true, userId: { not: userId } },
        orderBy: { joinedAt: 'asc' },
      });
      if (otherMembers.length > 0) {
        await this.prisma.arenaTeamMember.update({
          where: { id: otherMembers[0].id },
          data: { role: TeamRole.CAPTAIN },
        });
      }
    }

    try {
      await this.prisma.$transaction(async (tx: any) => {
        await tx.arenaTeamMember.update({
          where: { id: member.id }, data: { isActive: false },
        });
        await tx.arenaTeam.update({
          where: { id: teamId }, data: { memberCount: { decrement: 1 } },
        });
      });

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Leave failed: ${(error as Error).message}` };
    }
  }

  // ── Treasury ────────────────────────────────────────────────────────────

  async contributeToTreasury(request: ContributeRequest): Promise<Result<TeamMember>> {
    const team = await this.prisma.arenaTeam.findUnique({ where: { id: request.teamId } });
    if (!team || team.tenantId !== request.tenantId) return { success: false, error: 'Team not found' };

    const limits = TEAM_LIMITS[team.type as TeamType];
    const currentTreasury = team.treasurySparks + team.treasuryGems;
    if (currentTreasury + request.amount > limits.maxTreasury) {
      return { success: false, error: `Treasury limit is ${limits.maxTreasury}` };
    }

    const member = await this.prisma.arenaTeamMember.findFirst({
      where: { teamId: request.teamId, userId: request.userId, isActive: true },
    });
    if (!member) return { success: false, error: 'Not a team member' };

    // Stake tokens to team treasury
    const stakeResult = await this.tokenEngine.processStake({
      userId: request.userId,
      tenantId: request.tenantId,
      poolType: StakePoolType.TEAM_TREASURY,
      poolId: request.teamId,
      tokenType: request.tokenType,
      amount: request.amount,
    });

    if (!stakeResult.success) {
      return { success: false, error: `Contribution failed: ${stakeResult.error}` };
    }

    try {
      const field = request.tokenType === TokenType.SPARKS ? 'treasurySparks' : 'treasuryGems';
      const contributionField = request.tokenType === TokenType.SPARKS ? 'contributedSparks' : 'contributedGems';

      await this.prisma.arenaTeam.update({
        where: { id: request.teamId },
        data: { [field]: { increment: request.amount } },
      });

      const updated = await this.prisma.arenaTeamMember.update({
        where: { id: member.id },
        data: { [contributionField]: { increment: request.amount } },
      });

      await this.nats.publish('scholarly.arena.treasury_contribution', {
        teamId: request.teamId, userId: request.userId,
        tokenType: request.tokenType, amount: request.amount,
      });

      return { success: true, data: updated as unknown as TeamMember };
    } catch (error) {
      return { success: false, error: `Update failed: ${(error as Error).message}` };
    }
  }

  async proposeTreasurySpend(request: ProposeSpendRequest): Promise<Result<TreasurySpendVote>> {
    const team = await this.prisma.arenaTeam.findUnique({ where: { id: request.teamId } });
    if (!team || team.tenantId !== request.tenantId) return { success: false, error: 'Team not found' };

    const field = request.tokenType === TokenType.SPARKS ? 'treasurySparks' : 'treasuryGems';
    if ((team as any)[field] < request.amount) {
      return { success: false, error: `Insufficient treasury ${request.tokenType}` };
    }

    const member = await this.prisma.arenaTeamMember.findFirst({
      where: { teamId: request.teamId, userId: request.proposerId, isActive: true },
    });
    if (!member) return { success: false, error: 'Not a member' };

    try {
      const vote = await this.prisma.arenaTreasuryVote.create({
        data: {
          teamId: request.teamId, tenantId: request.tenantId,
          proposerId: request.proposerId, description: request.description,
          tokenType: request.tokenType, amount: request.amount,
          purpose: request.purpose, status: TreasuryVoteStatus.OPEN,
          votesFor: 0, votesAgainst: 0, totalVoters: 0,
          requiredApproval: 60, // 60% approval required
          expiresAt: new Date(Date.now() + 48 * 3600000), // 48h to vote
        },
      });

      await this.nats.publish('scholarly.arena.treasury_vote_created', {
        teamId: request.teamId, voteId: vote.id, amount: request.amount, purpose: request.purpose,
      });

      return { success: true, data: vote as unknown as TreasurySpendVote };
    } catch (error) {
      return { success: false, error: `Proposal failed: ${(error as Error).message}` };
    }
  }

  async castTreasuryVote(
    voteId: string, voterId: string, tenantId: string, choice: 'FOR' | 'AGAINST',
  ): Promise<Result<TreasurySpendVote>> {
    const vote = await this.prisma.arenaTreasuryVote.findUnique({ where: { id: voteId } });
    if (!vote || vote.tenantId !== tenantId) return { success: false, error: 'Vote not found' };
    if (vote.status !== TreasuryVoteStatus.OPEN) return { success: false, error: 'Voting closed' };
    if (new Date() > new Date(vote.expiresAt)) return { success: false, error: 'Vote expired' };

    const member = await this.prisma.arenaTeamMember.findFirst({
      where: { teamId: vote.teamId, userId: voterId, isActive: true },
    });
    if (!member) return { success: false, error: 'Not a team member' };

    const existing = await this.prisma.arenaTreasuryVoteCast.findFirst({
      where: { voteId, voterId },
    });
    if (existing) return { success: false, error: 'Already voted' };

    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        await tx.arenaTreasuryVoteCast.create({
          data: { voteId, voterId, choice },
        });

        const updateData: Record<string, any> = { totalVoters: { increment: 1 } };
        if (choice === 'FOR') updateData.votesFor = { increment: 1 };
        else updateData.votesAgainst = { increment: 1 };

        const updated = await tx.arenaTreasuryVote.update({
          where: { id: voteId }, data: updateData,
        });

        // Check if vote should be finalised
        const team = await tx.arenaTeam.findUnique({ where: { id: vote.teamId } });
        if (team) {
          const totalVoted = updated.votesFor + updated.votesAgainst;
          const memberCount = team.memberCount;
          const turnout = (totalVoted / memberCount) * 100;

          // Auto-finalise if >80% have voted or all voted
          if (turnout >= 80 || totalVoted >= memberCount) {
            const approvalPct = (updated.votesFor / totalVoted) * 100;
            const newStatus = approvalPct >= updated.requiredApproval
              ? TreasuryVoteStatus.PASSED : TreasuryVoteStatus.FAILED;

            await tx.arenaTreasuryVote.update({
              where: { id: voteId }, data: { status: newStatus },
            });

            // If passed, execute the spend
            if (newStatus === TreasuryVoteStatus.PASSED) {
              const field = vote.tokenType === TokenType.SPARKS ? 'treasurySparks' : 'treasuryGems';
              await tx.arenaTeam.update({
                where: { id: vote.teamId },
                data: { [field]: { decrement: vote.amount } },
              });
            }
          }
        }

        return updated;
      });

      return { success: true, data: result as unknown as TreasurySpendVote };
    } catch (error) {
      return { success: false, error: `Vote failed: ${(error as Error).message}` };
    }
  }

  // ── Trading ─────────────────────────────────────────────────────────────

  async proposeTrade(request: ProposeTradeRequest): Promise<Result<TeamTrade>> {
    const proposer = await this.prisma.arenaTeam.findUnique({ where: { id: request.proposerTeamId } });
    const recipient = await this.prisma.arenaTeam.findUnique({ where: { id: request.recipientTeamId } });

    if (!proposer || !recipient || proposer.tenantId !== request.tenantId || recipient.tenantId !== request.tenantId) {
      return { success: false, error: 'Teams not found' };
    }

    const proposerLimits = TEAM_LIMITS[proposer.type as TeamType];
    const recipientLimits = TEAM_LIMITS[recipient.type as TeamType];
    if (!proposerLimits.canTrade || !recipientLimits.canTrade) {
      return { success: false, error: 'One or both teams cannot trade' };
    }

    const proposerField = request.offerTokenType === TokenType.SPARKS ? 'treasurySparks' : 'treasuryGems';
    if ((proposer as any)[proposerField] < request.offerAmount) {
      return { success: false, error: 'Insufficient tokens to offer' };
    }

    try {
      const trade = await this.prisma.arenaTeamTrade.create({
        data: {
          tenantId: request.tenantId,
          proposerTeamId: request.proposerTeamId,
          recipientTeamId: request.recipientTeamId,
          offerTokenType: request.offerTokenType,
          offerAmount: request.offerAmount,
          requestTokenType: request.requestTokenType,
          requestAmount: request.requestAmount,
          status: TradeStatus.PROPOSED,
          message: request.message || null,
          expiresAt: new Date(Date.now() + 72 * 3600000), // 72h expiry
        },
      });

      await this.nats.publish('scholarly.arena.trade_proposed', {
        tradeId: trade.id, proposerTeamId: request.proposerTeamId,
        recipientTeamId: request.recipientTeamId,
      });

      return { success: true, data: trade as unknown as TeamTrade };
    } catch (error) {
      return { success: false, error: `Trade proposal failed: ${(error as Error).message}` };
    }
  }

  async acceptTrade(tradeId: string, tenantId: string): Promise<Result<TeamTrade>> {
    const trade = await this.prisma.arenaTeamTrade.findUnique({ where: { id: tradeId } });
    if (!trade || trade.tenantId !== tenantId) return { success: false, error: 'Trade not found' };
    if (trade.status !== TradeStatus.PROPOSED) return { success: false, error: 'Trade not open' };
    if (new Date() > new Date(trade.expiresAt)) return { success: false, error: 'Trade expired' };

    // Verify both teams have sufficient tokens
    const proposer = await this.prisma.arenaTeam.findUnique({ where: { id: trade.proposerTeamId } });
    const recipient = await this.prisma.arenaTeam.findUnique({ where: { id: trade.recipientTeamId } });
    if (!proposer || !recipient) return { success: false, error: 'Teams not found' };

    const pField = trade.offerTokenType === TokenType.SPARKS ? 'treasurySparks' : 'treasuryGems';
    const rField = trade.requestTokenType === TokenType.SPARKS ? 'treasurySparks' : 'treasuryGems';

    if ((proposer as any)[pField] < trade.offerAmount) return { success: false, error: 'Proposer insufficient tokens' };
    if ((recipient as any)[rField] < trade.requestAmount) return { success: false, error: 'Recipient insufficient tokens' };

    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        // Swap tokens
        const pDeductField = trade.offerTokenType === TokenType.SPARKS ? 'treasurySparks' : 'treasuryGems';
        const pAddField = trade.requestTokenType === TokenType.SPARKS ? 'treasurySparks' : 'treasuryGems';
        const rDeductField = trade.requestTokenType === TokenType.SPARKS ? 'treasurySparks' : 'treasuryGems';
        const rAddField = trade.offerTokenType === TokenType.SPARKS ? 'treasurySparks' : 'treasuryGems';

        await tx.arenaTeam.update({
          where: { id: trade.proposerTeamId },
          data: { [pDeductField]: { decrement: trade.offerAmount }, [pAddField]: { increment: trade.requestAmount } },
        });
        await tx.arenaTeam.update({
          where: { id: trade.recipientTeamId },
          data: { [rDeductField]: { decrement: trade.requestAmount }, [rAddField]: { increment: trade.offerAmount } },
        });

        return tx.arenaTeamTrade.update({
          where: { id: tradeId }, data: { status: TradeStatus.COMPLETED },
        });
      });

      await this.nats.publish('scholarly.arena.trade_completed', {
        tradeId, proposerTeamId: trade.proposerTeamId, recipientTeamId: trade.recipientTeamId,
      });

      return { success: true, data: result as unknown as TeamTrade };
    } catch (error) {
      return { success: false, error: `Trade execution failed: ${(error as Error).message}` };
    }
  }

  // ── Team Challenges ─────────────────────────────────────────────────────

  async challengeTeam(request: ChallengeTeamRequest): Promise<Result<TeamChallenge>> {
    if (request.challengerTeamId === request.challengedTeamId) {
      return { success: false, error: 'Cannot challenge yourself' };
    }

    const challenger = await this.prisma.arenaTeam.findUnique({ where: { id: request.challengerTeamId } });
    const challenged = await this.prisma.arenaTeam.findUnique({ where: { id: request.challengedTeamId } });
    if (!challenger || !challenged) return { success: false, error: 'Teams not found' };

    // Check wager availability
    if (request.wagerAmount > 0) {
      const field = request.wagerTokenType === TokenType.SPARKS ? 'treasurySparks' : 'treasuryGems';
      if ((challenger as any)[field] < request.wagerAmount) {
        return { success: false, error: 'Insufficient treasury for wager' };
      }
    }

    try {
      const challenge = await this.prisma.arenaTeamChallenge.create({
        data: {
          tenantId: request.tenantId,
          challengerTeamId: request.challengerTeamId,
          challengedTeamId: request.challengedTeamId,
          competitionId: null,
          wagerAmount: request.wagerAmount,
          wagerTokenType: request.wagerTokenType,
          format: request.format,
          phonicsPhase: request.phonicsPhase,
          status: 'PENDING',
        },
      });

      await this.nats.publish('scholarly.arena.team_challenge', {
        challengeId: challenge.id,
        challengerTeamId: request.challengerTeamId,
        challengedTeamId: request.challengedTeamId,
        wagerAmount: request.wagerAmount,
      });

      return { success: true, data: challenge as unknown as TeamChallenge };
    } catch (error) {
      return { success: false, error: `Challenge failed: ${(error as Error).message}` };
    }
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  async getTeam(teamId: string, tenantId: string): Promise<Result<Team>> {
    try {
      const team = await this.prisma.arenaTeam.findUnique({ where: { id: teamId } });
      if (!team || team.tenantId !== tenantId) return { success: false, error: 'Not found' };
      return { success: true, data: team as unknown as Team };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getTeamMembers(teamId: string, tenantId: string): Promise<Result<TeamMember[]>> {
    try {
      const members = await this.prisma.arenaTeamMember.findMany({
        where: { teamId, tenantId, isActive: true },
        orderBy: { joinedAt: 'asc' },
      });
      return { success: true, data: members as unknown as TeamMember[] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getUserTeams(userId: string, tenantId: string): Promise<Result<Team[]>> {
    try {
      const memberships = await this.prisma.arenaTeamMember.findMany({
        where: { userId, tenantId, isActive: true },
        select: { teamId: true },
      });
      const teamIds = memberships.map((m: any) => m.teamId);
      const teams = await this.prisma.arenaTeam.findMany({
        where: { id: { in: teamIds }, isActive: true },
      });
      return { success: true, data: teams as unknown as Team[] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getTeamLeaderboard(tenantId: string, type?: TeamType, limit?: number): Promise<Result<Team[]>> {
    try {
      const where: any = { tenantId, isActive: true };
      if (type) where.type = type;
      const teams = await this.prisma.arenaTeam.findMany({
        where, orderBy: { xp: 'desc' }, take: limit || 50,
      });
      return { success: true, data: teams as unknown as Team[] };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
