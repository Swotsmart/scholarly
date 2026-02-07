// =============================================================================
// Arena Competition Engine — Storybook-Based Competitive Learning
// =============================================================================
// The Arena transforms reading from a solitary activity into a social,
// competitive experience — like the difference between practising piano
// alone and performing in a recital. The engine orchestrates competitions
// that make phonics practice feel like a game while feeding every
// interaction back into the learning analytics pipeline.
//
// Competition formats range from individual reading accuracy sprints
// (where children race to read passages with the fewest errors) to team
// comprehension battles (where groups collaborate on understanding a
// story) to collaborative story creation events (where the community
// collectively writes a new storybook through competitive contributions).
//
// Integration: Tokenomics for wagering and rewards, BKT for handicapping,
// Webhook system for real-time notifications, NATS for event streaming.
// =============================================================================

import { ScholarlyBaseService, Result, NATSClient, PrismaClient } from '../shared/types';
import { TokenType, TokenEconomyEngine, EarningCategory, EarningEvent } from '../tokenomics/token-economy-engine';

// ─── Competition Types ──────────────────────────────────────────────────────

export enum CompetitionFormat {
  READING_SPRINT = 'READING_SPRINT',             // Individual: read a passage accurately and quickly
  ACCURACY_CHALLENGE = 'ACCURACY_CHALLENGE',       // Individual: highest reading accuracy wins
  COMPREHENSION_QUIZ = 'COMPREHENSION_QUIZ',       // Individual or team: answer questions about a story
  WORD_BLITZ = 'WORD_BLITZ',                       // Individual: decode as many words as possible
  PHONICS_DUEL = 'PHONICS_DUEL',                   // 1v1: alternating phonics challenges
  TEAM_RELAY = 'TEAM_RELAY',                       // Team: relay-style reading, each member reads a section
  STORY_SHOWDOWN = 'STORY_SHOWDOWN',               // Team: create the best mini-story with given GPCs
  SPELLING_BEE = 'SPELLING_BEE',                   // Individual: spell words from audio prompts
  VOCABULARY_CHALLENGE = 'VOCABULARY_CHALLENGE',     // Individual: match words to meanings
  COLLABORATIVE_CREATION = 'COLLABORATIVE_CREATION', // Community: collectively create a storybook
}

export enum CompetitionStatus {
  SCHEDULED = 'SCHEDULED',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  ROUND_COMPLETE = 'ROUND_COMPLETE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ParticipantType {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  TEAM = 'TEAM',
}

export enum ScoringModel {
  GROWTH_BASED = 'GROWTH_BASED',       // Points based on improvement from baseline
  ABSOLUTE = 'ABSOLUTE',               // Raw accuracy/speed scores
  HANDICAPPED = 'HANDICAPPED',         // BKT-adjusted to level the playing field
  COLLABORATIVE = 'COLLABORATIVE',     // Team aggregate scoring
}

// ─── Data Models ────────────────────────────────────────────────────────────

export interface CompetitionConfig {
  format: CompetitionFormat;
  minParticipants: number;
  maxParticipants: number;
  roundCount: number;
  roundDurationSeconds: number;
  scoringModel: ScoringModel;
  allowWagers: boolean;
  maxWagerPerParticipant: number;
  phonicsPhasesAllowed: number[];
  ageRange: { min: number; max: number };
  handicapEnabled: boolean;
  teacherParticipation: boolean;
  teamSize: number | null; // null = individual
  description: string;
}

export interface Competition {
  id: string;
  tenantId: string;
  creatorId: string;
  format: CompetitionFormat;
  title: string;
  description: string;
  config: CompetitionConfig;
  status: CompetitionStatus;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  currentRound: number;
  totalRounds: number;
  storybookId: string | null;    // The storybook being used
  phonicsPhase: number;
  targetGPCs: string[];
  wagerPool: number;
  wagerTokenType: TokenType;
  participantCount: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Participant {
  id: string;
  competitionId: string;
  userId: string;
  tenantId: string;
  teamId: string | null;
  type: ParticipantType;
  handicapFactor: number;     // BKT-derived adjustment (1.0 = no handicap)
  wagerAmount: number;
  totalScore: number;
  roundScores: RoundScore[];
  rank: number | null;
  status: 'REGISTERED' | 'ACTIVE' | 'ELIMINATED' | 'COMPLETED' | 'FORFEITED';
  joinedAt: Date;
}

export interface RoundScore {
  round: number;
  accuracy: number;           // 0-100%
  wordsCorrect: number;
  wordsAttempted: number;
  wcpm: number;               // Words correct per minute
  comprehensionScore: number; // 0-100%
  timeSeconds: number;
  growthPoints: number;       // Points from improvement over baseline
  bonusPoints: number;        // Bonus for streaks, perfect scores, etc.
  totalPoints: number;
  submittedAt: Date;
}

export interface CompetitionResult {
  competitionId: string;
  tenantId: string;
  rankings: RankedParticipant[];
  wagerDistribution: WagerPayout[];
  totalTokensAwarded: number;
  completionRate: number;
  avgAccuracy: number;
  avgGrowth: number;
  mvpUserId: string | null;
  mvpReason: string | null;
}

export interface RankedParticipant {
  userId: string;
  teamId: string | null;
  rank: number;
  totalScore: number;
  tokensEarned: number;
  badges: string[];
}

export interface WagerPayout {
  userId: string;
  wagered: number;
  returned: number;
  netGain: number;
}

// ─── Request Types ──────────────────────────────────────────────────────────

export interface CreateCompetitionRequest {
  tenantId: string;
  creatorId: string;
  format: CompetitionFormat;
  title: string;
  description: string;
  scheduledAt: Date;
  phonicsPhase: number;
  targetGPCs?: string[];
  storybookId?: string;
  configOverrides?: Partial<CompetitionConfig>;
}

export interface JoinCompetitionRequest {
  competitionId: string;
  userId: string;
  tenantId: string;
  participantType: ParticipantType;
  teamId?: string;
  wagerAmount?: number;
  wagerTokenType?: TokenType;
}

export interface SubmitRoundRequest {
  competitionId: string;
  userId: string;
  tenantId: string;
  round: number;
  accuracy: number;
  wordsCorrect: number;
  wordsAttempted: number;
  wcpm: number;
  comprehensionScore: number;
  timeSeconds: number;
}

// ─── Default Configs ────────────────────────────────────────────────────────

const DEFAULT_CONFIGS: CompetitionConfig[] = [
  {
    format: CompetitionFormat.READING_SPRINT,
    minParticipants: 2, maxParticipants: 30, roundCount: 3,
    roundDurationSeconds: 120, scoringModel: ScoringModel.GROWTH_BASED,
    allowWagers: true, maxWagerPerParticipant: 20,
    phonicsPhasesAllowed: [2, 3, 4, 5], ageRange: { min: 5, max: 12 },
    handicapEnabled: true, teacherParticipation: true, teamSize: null,
    description: 'Race to read a passage — accuracy and speed both count',
  },
  {
    format: CompetitionFormat.ACCURACY_CHALLENGE,
    minParticipants: 2, maxParticipants: 50, roundCount: 5,
    roundDurationSeconds: 180, scoringModel: ScoringModel.HANDICAPPED,
    allowWagers: true, maxWagerPerParticipant: 15,
    phonicsPhasesAllowed: [2, 3, 4, 5, 6], ageRange: { min: 5, max: 14 },
    handicapEnabled: true, teacherParticipation: true, teamSize: null,
    description: 'Precision reading — every word counts, speed is secondary',
  },
  {
    format: CompetitionFormat.COMPREHENSION_QUIZ,
    minParticipants: 2, maxParticipants: 40, roundCount: 1,
    roundDurationSeconds: 600, scoringModel: ScoringModel.ABSOLUTE,
    allowWagers: true, maxWagerPerParticipant: 10,
    phonicsPhasesAllowed: [3, 4, 5, 6], ageRange: { min: 6, max: 14 },
    handicapEnabled: false, teacherParticipation: true, teamSize: null,
    description: 'Read a story, then answer comprehension questions',
  },
  {
    format: CompetitionFormat.WORD_BLITZ,
    minParticipants: 2, maxParticipants: 100, roundCount: 3,
    roundDurationSeconds: 60, scoringModel: ScoringModel.GROWTH_BASED,
    allowWagers: true, maxWagerPerParticipant: 10,
    phonicsPhasesAllowed: [2, 3, 4, 5], ageRange: { min: 5, max: 10 },
    handicapEnabled: true, teacherParticipation: false, teamSize: null,
    description: 'Decode as many words as possible in 60 seconds',
  },
  {
    format: CompetitionFormat.PHONICS_DUEL,
    minParticipants: 2, maxParticipants: 2, roundCount: 10,
    roundDurationSeconds: 30, scoringModel: ScoringModel.HANDICAPPED,
    allowWagers: true, maxWagerPerParticipant: 25,
    phonicsPhasesAllowed: [2, 3, 4, 5, 6], ageRange: { min: 5, max: 14 },
    handicapEnabled: true, teacherParticipation: true, teamSize: null,
    description: 'Head-to-head phonics battle — alternating challenges',
  },
  {
    format: CompetitionFormat.TEAM_RELAY,
    minParticipants: 8, maxParticipants: 40, roundCount: 1,
    roundDurationSeconds: 300, scoringModel: ScoringModel.COLLABORATIVE,
    allowWagers: true, maxWagerPerParticipant: 15,
    phonicsPhasesAllowed: [2, 3, 4, 5], ageRange: { min: 5, max: 12 },
    handicapEnabled: true, teacherParticipation: true, teamSize: 4,
    description: 'Team relay — each member reads a section of the story',
  },
  {
    format: CompetitionFormat.STORY_SHOWDOWN,
    minParticipants: 6, maxParticipants: 30, roundCount: 1,
    roundDurationSeconds: 900, scoringModel: ScoringModel.COLLABORATIVE,
    allowWagers: false, maxWagerPerParticipant: 0,
    phonicsPhasesAllowed: [3, 4, 5, 6], ageRange: { min: 7, max: 14 },
    handicapEnabled: false, teacherParticipation: true, teamSize: 3,
    description: 'Teams compete to create the best mini-story using given GPCs',
  },
  {
    format: CompetitionFormat.SPELLING_BEE,
    minParticipants: 2, maxParticipants: 30, roundCount: 10,
    roundDurationSeconds: 30, scoringModel: ScoringModel.ABSOLUTE,
    allowWagers: true, maxWagerPerParticipant: 15,
    phonicsPhasesAllowed: [3, 4, 5, 6], ageRange: { min: 6, max: 14 },
    handicapEnabled: true, teacherParticipation: false, teamSize: null,
    description: 'Spell words from audio — classic bee format with phonics twist',
  },
  {
    format: CompetitionFormat.VOCABULARY_CHALLENGE,
    minParticipants: 2, maxParticipants: 50, roundCount: 5,
    roundDurationSeconds: 120, scoringModel: ScoringModel.HANDICAPPED,
    allowWagers: true, maxWagerPerParticipant: 10,
    phonicsPhasesAllowed: [3, 4, 5, 6], ageRange: { min: 6, max: 14 },
    handicapEnabled: true, teacherParticipation: true, teamSize: null,
    description: 'Match words to definitions — vocabulary breadth challenge',
  },
  {
    format: CompetitionFormat.COLLABORATIVE_CREATION,
    minParticipants: 10, maxParticipants: 200, roundCount: 1,
    roundDurationSeconds: 3600, scoringModel: ScoringModel.COLLABORATIVE,
    allowWagers: false, maxWagerPerParticipant: 0,
    phonicsPhasesAllowed: [3, 4, 5, 6], ageRange: { min: 7, max: 99 },
    handicapEnabled: false, teacherParticipation: true, teamSize: null,
    description: 'Community event — collectively create a new storybook',
  },
];

// ─── Scoring Engine ─────────────────────────────────────────────────────────
// The scoring engine is where learning science meets game design.
// Growth-based scoring ensures a Phase 2 learner can win against a
// Phase 5 learner if they show more improvement — like a golf handicap
// that makes the game fair regardless of skill level.

export class ScoringEngine {
  calculateRoundScore(
    submission: SubmitRoundRequest,
    config: CompetitionConfig,
    participant: Participant,
    baseline: { avgAccuracy: number; avgWcpm: number },
  ): RoundScore {
    let growthPoints = 0;
    let bonusPoints = 0;
    let totalPoints = 0;

    switch (config.scoringModel) {
      case ScoringModel.GROWTH_BASED: {
        // Growth = improvement over personal baseline
        const accuracyGrowth = Math.max(0, submission.accuracy - baseline.avgAccuracy);
        const wcpmGrowth = Math.max(0, submission.wcpm - baseline.avgWcpm);
        growthPoints = Math.round(accuracyGrowth * 5 + wcpmGrowth * 2);

        // Base points for participation
        const basePoints = Math.round(submission.accuracy * 0.5 + submission.wcpm * 0.3);
        totalPoints = basePoints + growthPoints;
        break;
      }

      case ScoringModel.ABSOLUTE: {
        totalPoints = Math.round(
          submission.accuracy * 0.6 +
          submission.comprehensionScore * 0.3 +
          Math.min(submission.wcpm, 200) * 0.1,
        );
        break;
      }

      case ScoringModel.HANDICAPPED: {
        const rawScore = Math.round(
          submission.accuracy * 0.5 +
          submission.comprehensionScore * 0.3 +
          submission.wcpm * 0.2,
        );
        totalPoints = Math.round(rawScore * participant.handicapFactor);
        break;
      }

      case ScoringModel.COLLABORATIVE: {
        // Team scoring — individual contribution to team total
        totalPoints = Math.round(
          submission.accuracy * 0.4 +
          submission.comprehensionScore * 0.3 +
          submission.wcpm * 0.15 +
          (submission.wordsCorrect / Math.max(submission.wordsAttempted, 1)) * 15,
        );
        break;
      }
    }

    // Bonus points
    if (submission.accuracy >= 100) bonusPoints += 10;       // Perfect accuracy
    if (submission.accuracy >= 95) bonusPoints += 5;          // Near-perfect
    if (submission.comprehensionScore >= 100) bonusPoints += 8; // Perfect comprehension
    if (submission.wcpm > baseline.avgWcpm * 1.2) bonusPoints += 5; // Speed improvement

    totalPoints += bonusPoints;

    return {
      round: submission.round,
      accuracy: submission.accuracy,
      wordsCorrect: submission.wordsCorrect,
      wordsAttempted: submission.wordsAttempted,
      wcpm: submission.wcpm,
      comprehensionScore: submission.comprehensionScore,
      timeSeconds: submission.timeSeconds,
      growthPoints,
      bonusPoints,
      totalPoints,
      submittedAt: new Date(),
    };
  }

  calculateHandicap(
    learnerPhase: number,
    learnerMasteryAvg: number,
    competitionPhase: number,
  ): number {
    // Handicap > 1.0 = boost, < 1.0 = penalty
    const phaseDiff = competitionPhase - learnerPhase;
    const phaseBoost = phaseDiff > 0 ? 1 + (phaseDiff * 0.1) : 1 - (Math.abs(phaseDiff) * 0.05);
    const masteryAdjust = learnerMasteryAvg < 60 ? 1.15 : learnerMasteryAvg < 80 ? 1.05 : 1.0;
    return Math.round(phaseBoost * masteryAdjust * 100) / 100;
  }

  // Teacher handicap — teachers get a significant penalty to keep it fair
  calculateTeacherHandicap(): number {
    return 0.6; // Teachers score at 60% — they're playing for fun, not to crush the kids
  }
}

// ─── Arena Competition Service ──────────────────────────────────────────────

export class ArenaCompetitionEngine extends ScholarlyBaseService {
  private defaultConfigs: Map<CompetitionFormat, CompetitionConfig>;
  private scoringEngine: ScoringEngine;

  constructor(
    private prisma: PrismaClient,
    private nats: NATSClient,
    private tokenEngine: TokenEconomyEngine,
    private redis: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, opts?: any) => Promise<void>; del: (k: string) => Promise<void> },
  ) {
    super('ArenaCompetitionEngine');
    this.defaultConfigs = new Map();
    for (const c of DEFAULT_CONFIGS) this.defaultConfigs.set(c.format, c);
    this.scoringEngine = new ScoringEngine();
  }

  // ── Create Competition ──────────────────────────────────────────────────

  async createCompetition(request: CreateCompetitionRequest): Promise<Result<Competition>> {
    const defaultConfig = this.defaultConfigs.get(request.format);
    if (!defaultConfig) {
      return { success: false, error: `Unknown format: ${request.format}` };
    }

    const config: CompetitionConfig = { ...defaultConfig, ...request.configOverrides };

    if (!config.phonicsPhasesAllowed.includes(request.phonicsPhase)) {
      return { success: false, error: `Phase ${request.phonicsPhase} not allowed for ${request.format}` };
    }

    try {
      const competition = await this.prisma.arenaCompetition.create({
        data: {
          tenantId: request.tenantId,
          creatorId: request.creatorId,
          format: request.format,
          title: request.title,
          description: request.description,
          config: config as any,
          status: CompetitionStatus.SCHEDULED,
          scheduledAt: request.scheduledAt,
          startedAt: null,
          completedAt: null,
          currentRound: 0,
          totalRounds: config.roundCount,
          storybookId: request.storybookId || null,
          phonicsPhase: request.phonicsPhase,
          targetGPCs: request.targetGPCs || [],
          wagerPool: 0,
          wagerTokenType: TokenType.SPARKS,
          participantCount: 0,
          metadata: {},
        },
      });

      await this.nats.publish('scholarly.arena.competition_created', {
        competitionId: competition.id,
        tenantId: request.tenantId,
        format: request.format,
        title: request.title,
        scheduledAt: request.scheduledAt.toISOString(),
        phonicsPhase: request.phonicsPhase,
      });

      return { success: true, data: competition as unknown as Competition };
    } catch (error) {
      return { success: false, error: `Creation failed: ${(error as Error).message}` };
    }
  }

  // ── Registration ────────────────────────────────────────────────────────

  async joinCompetition(request: JoinCompetitionRequest): Promise<Result<Participant>> {
    const competition = await this.prisma.arenaCompetition.findUnique({
      where: { id: request.competitionId },
    });
    if (!competition || competition.tenantId !== request.tenantId) {
      return { success: false, error: 'Competition not found' };
    }
    if (competition.status !== CompetitionStatus.SCHEDULED && competition.status !== CompetitionStatus.REGISTRATION_OPEN) {
      return { success: false, error: `Cannot join: status is ${competition.status}` };
    }

    const config = competition.config as unknown as CompetitionConfig;
    if (competition.participantCount >= config.maxParticipants) {
      return { success: false, error: 'Competition is full' };
    }

    // Team size validation
    if (config.teamSize && !request.teamId) {
      return { success: false, error: 'This competition requires a team' };
    }

    // Duplicate check
    const existing = await this.prisma.arenaParticipant.findFirst({
      where: { competitionId: request.competitionId, userId: request.userId },
    });
    if (existing) return { success: false, error: 'Already registered' };

    // Calculate handicap
    let handicapFactor = 1.0;
    if (config.handicapEnabled) {
      if (request.participantType === ParticipantType.TEACHER) {
        handicapFactor = this.scoringEngine.calculateTeacherHandicap();
      } else {
        const learnerData = await this.getLearnerBaseline(request.userId, request.tenantId);
        if (learnerData) {
          handicapFactor = this.scoringEngine.calculateHandicap(
            learnerData.currentPhase,
            learnerData.avgMastery,
            competition.phonicsPhase,
          );
        }
      }
    }

    // Process wager if applicable
    let wagerAmount = 0;
    if (config.allowWagers && request.wagerAmount && request.wagerAmount > 0) {
      if (request.wagerAmount > config.maxWagerPerParticipant) {
        return { success: false, error: `Max wager is ${config.maxWagerPerParticipant}` };
      }
      const wagerResult = await this.tokenEngine.processWager({
        userId: request.userId,
        tenantId: request.tenantId,
        competitionId: request.competitionId,
        tokenType: request.wagerTokenType || TokenType.SPARKS,
        amount: request.wagerAmount,
      });
      if (!wagerResult.success) {
        return { success: false, error: `Wager failed: ${wagerResult.error}` };
      }
      wagerAmount = request.wagerAmount;
    }

    try {
      const participant = await this.prisma.$transaction(async (tx: any) => {
        const p = await tx.arenaParticipant.create({
          data: {
            competitionId: request.competitionId,
            userId: request.userId,
            tenantId: request.tenantId,
            teamId: request.teamId || null,
            type: request.participantType,
            handicapFactor,
            wagerAmount,
            totalScore: 0,
            roundScores: [],
            rank: null,
            status: 'REGISTERED',
          },
        });

        await tx.arenaCompetition.update({
          where: { id: request.competitionId },
          data: {
            participantCount: { increment: 1 },
            wagerPool: { increment: wagerAmount },
          },
        });

        return p;
      });

      await this.nats.publish('scholarly.arena.participant_joined', {
        competitionId: request.competitionId,
        userId: request.userId,
        tenantId: request.tenantId,
        participantType: request.participantType,
        handicapFactor,
        wagerAmount,
      });

      return { success: true, data: participant as unknown as Participant };
    } catch (error) {
      return { success: false, error: `Join failed: ${(error as Error).message}` };
    }
  }

  // ── Competition Lifecycle ───────────────────────────────────────────────

  async startCompetition(competitionId: string, tenantId: string): Promise<Result<Competition>> {
    const competition = await this.prisma.arenaCompetition.findUnique({ where: { id: competitionId } });
    if (!competition || competition.tenantId !== tenantId) {
      return { success: false, error: 'Not found' };
    }

    const config = competition.config as unknown as CompetitionConfig;
    if (competition.participantCount < config.minParticipants) {
      return { success: false, error: `Need at least ${config.minParticipants} participants` };
    }

    try {
      const updated = await this.prisma.$transaction(async (tx: any) => {
        // Set all participants to active
        await tx.arenaParticipant.updateMany({
          where: { competitionId, status: 'REGISTERED' },
          data: { status: 'ACTIVE' },
        });

        return tx.arenaCompetition.update({
          where: { id: competitionId },
          data: { status: CompetitionStatus.IN_PROGRESS, startedAt: new Date(), currentRound: 1 },
        });
      });

      await this.nats.publish('scholarly.arena.competition_started', {
        competitionId, tenantId, format: competition.format,
        participantCount: competition.participantCount,
        totalRounds: competition.totalRounds,
      });

      return { success: true, data: updated as unknown as Competition };
    } catch (error) {
      return { success: false, error: `Start failed: ${(error as Error).message}` };
    }
  }

  async submitRound(request: SubmitRoundRequest): Promise<Result<RoundScore>> {
    const competition = await this.prisma.arenaCompetition.findUnique({ where: { id: request.competitionId } });
    if (!competition || competition.tenantId !== request.tenantId) {
      return { success: false, error: 'Not found' };
    }
    if (competition.status !== CompetitionStatus.IN_PROGRESS) {
      return { success: false, error: 'Competition not in progress' };
    }
    if (request.round !== competition.currentRound) {
      return { success: false, error: `Expected round ${competition.currentRound}` };
    }

    const participant = await this.prisma.arenaParticipant.findFirst({
      where: { competitionId: request.competitionId, userId: request.userId, status: 'ACTIVE' },
    });
    if (!participant) return { success: false, error: 'Participant not found or not active' };

    const config = competition.config as unknown as CompetitionConfig;
    const baseline = await this.getLearnerBaseline(request.userId, request.tenantId);
    const avgBaseline = baseline || { avgAccuracy: 70, avgWcpm: 40 };

    const roundScore = this.scoringEngine.calculateRoundScore(
      request, config, participant as unknown as Participant, avgBaseline,
    );

    try {
      const existingScores = (participant.roundScores as any[]) || [];
      const newScores = [...existingScores, roundScore];
      const newTotal = newScores.reduce((s: number, r: any) => s + r.totalPoints, 0);

      await this.prisma.arenaParticipant.update({
        where: { id: participant.id },
        data: { roundScores: newScores as any, totalScore: newTotal },
      });

      // Award participation tokens
      await this.tokenEngine.processEarning({
        userId: request.userId,
        tenantId: request.tenantId,
        category: EarningCategory.ARENA_PARTICIPATION,
        referenceId: request.competitionId,
        referenceType: 'ARENA_COMPETITION',
        performanceData: {
          accuracy: request.accuracy,
          wcpm: request.wcpm,
          completedAllRounds: request.round === competition.totalRounds,
          teamEvent: config.teamSize !== null,
        },
        timestamp: new Date(),
      });

      await this.nats.publish('scholarly.arena.round_submitted', {
        competitionId: request.competitionId,
        userId: request.userId,
        round: request.round,
        totalPoints: roundScore.totalPoints,
        accuracy: request.accuracy,
      });

      return { success: true, data: roundScore };
    } catch (error) {
      return { success: false, error: `Submission failed: ${(error as Error).message}` };
    }
  }

  async advanceRound(competitionId: string, tenantId: string): Promise<Result<Competition>> {
    const competition = await this.prisma.arenaCompetition.findUnique({ where: { id: competitionId } });
    if (!competition || competition.tenantId !== tenantId) return { success: false, error: 'Not found' };

    if (competition.currentRound >= competition.totalRounds) {
      return this.completeCompetition(competitionId, tenantId);
    }

    try {
      const updated = await this.prisma.arenaCompetition.update({
        where: { id: competitionId },
        data: { currentRound: { increment: 1 }, status: CompetitionStatus.IN_PROGRESS },
      });

      await this.nats.publish('scholarly.arena.round_advanced', {
        competitionId, tenantId, newRound: updated.currentRound,
      });

      return { success: true, data: updated as unknown as Competition };
    } catch (error) {
      return { success: false, error: `Advance failed: ${(error as Error).message}` };
    }
  }

  async completeCompetition(competitionId: string, tenantId: string): Promise<Result<Competition>> {
    const competition = await this.prisma.arenaCompetition.findUnique({ where: { id: competitionId } });
    if (!competition || competition.tenantId !== tenantId) return { success: false, error: 'Not found' };

    const participants = await this.prisma.arenaParticipant.findMany({
      where: { competitionId, status: 'ACTIVE' },
      orderBy: { totalScore: 'desc' },
    });

    try {
      // Assign ranks
      for (let i = 0; i < participants.length; i++) {
        await this.prisma.arenaParticipant.update({
          where: { id: participants[i].id },
          data: { rank: i + 1, status: 'COMPLETED' },
        });
      }

      // Award winner tokens
      if (participants.length > 0) {
        const winner = participants[0];
        await this.tokenEngine.processEarning({
          userId: winner.userId,
          tenantId,
          category: EarningCategory.ARENA_WIN,
          referenceId: competitionId,
          referenceType: 'ARENA_COMPETITION',
          performanceData: {
            perfectScore: winner.totalScore >= 100 * competition.totalRounds,
            comebackWin: false, // Would need round-by-round analysis
            tournamentFinal: false,
          },
          timestamp: new Date(),
        });
      }

      // Resolve wagers
      if (competition.wagerPool > 0) {
        const wagerers = participants.filter((p: any) => p.wagerAmount > 0);
        const winners = wagerers.slice(0, Math.ceil(wagerers.length * 0.3)); // Top 30% win
        const losers = wagerers.slice(Math.ceil(wagerers.length * 0.3));

        const winnerShares = winners.map((w: any, i: number) => ({
          userId: w.userId,
          share: (winners.length - i) / (winners.length * (winners.length + 1) / 2),
        }));
        const loserData = losers.map((l: any) => ({ userId: l.userId, wageredAmount: l.wagerAmount }));

        await this.tokenEngine.resolveWager(
          competitionId, tenantId, winnerShares, loserData, competition.wagerPool,
        );
      }

      const updated = await this.prisma.arenaCompetition.update({
        where: { id: competitionId },
        data: { status: CompetitionStatus.COMPLETED, completedAt: new Date() },
      });

      await this.nats.publish('scholarly.arena.competition_completed', {
        competitionId, tenantId,
        winnerId: participants[0]?.userId,
        participantCount: participants.length,
        wagerPool: competition.wagerPool,
      });

      return { success: true, data: updated as unknown as Competition };
    } catch (error) {
      return { success: false, error: `Completion failed: ${(error as Error).message}` };
    }
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  async getCompetition(competitionId: string, tenantId: string): Promise<Result<Competition>> {
    try {
      const comp = await this.prisma.arenaCompetition.findUnique({ where: { id: competitionId } });
      if (!comp || comp.tenantId !== tenantId) return { success: false, error: 'Not found' };
      return { success: true, data: comp as unknown as Competition };
    } catch (error) {
      return { success: false, error: `Fetch failed: ${(error as Error).message}` };
    }
  }

  async getLeaderboard(competitionId: string, tenantId: string): Promise<Result<Participant[]>> {
    try {
      const participants = await this.prisma.arenaParticipant.findMany({
        where: { competitionId, tenantId },
        orderBy: { totalScore: 'desc' },
      });
      return { success: true, data: participants as unknown as Participant[] };
    } catch (error) {
      return { success: false, error: `Leaderboard failed: ${(error as Error).message}` };
    }
  }

  async getUpcomingCompetitions(tenantId: string, options: {
    format?: CompetitionFormat; phase?: number; limit?: number;
  }): Promise<Result<Competition[]>> {
    try {
      const where: any = {
        tenantId,
        status: { in: [CompetitionStatus.SCHEDULED, CompetitionStatus.REGISTRATION_OPEN] },
        scheduledAt: { gt: new Date() },
      };
      if (options.format) where.format = options.format;
      if (options.phase) where.phonicsPhase = options.phase;

      const competitions = await this.prisma.arenaCompetition.findMany({
        where, orderBy: { scheduledAt: 'asc' }, take: options.limit || 20,
      });
      return { success: true, data: competitions as unknown as Competition[] };
    } catch (error) {
      return { success: false, error: `Query failed: ${(error as Error).message}` };
    }
  }

  async getUserStats(userId: string, tenantId: string): Promise<Result<{
    totalCompetitions: number; wins: number; totalScore: number;
    avgAccuracy: number; avgGrowth: number; bestFormat: string;
    currentStreak: number; tokensEarned: number;
  }>> {
    try {
      const participations = await this.prisma.arenaParticipant.findMany({
        where: { userId, tenantId, status: 'COMPLETED' },
      });

      const wins = participations.filter((p: any) => p.rank === 1).length;
      const totalScore = participations.reduce((s: number, p: any) => s + p.totalScore, 0);

      // Calculate averages from round scores
      const allRoundScores = participations.flatMap((p: any) => p.roundScores || []);
      const avgAccuracy = allRoundScores.length > 0
        ? allRoundScores.reduce((s: number, r: any) => s + r.accuracy, 0) / allRoundScores.length : 0;
      const avgGrowth = allRoundScores.length > 0
        ? allRoundScores.reduce((s: number, r: any) => s + r.growthPoints, 0) / allRoundScores.length : 0;

      // Best format by win rate
      const formatStats = new Map<string, { wins: number; total: number }>();
      for (const p of participations) {
        const comp = await this.prisma.arenaCompetition.findUnique({
          where: { id: p.competitionId }, select: { format: true },
        });
        if (comp) {
          const stat = formatStats.get(comp.format) || { wins: 0, total: 0 };
          stat.total++;
          if ((p as any).rank === 1) stat.wins++;
          formatStats.set(comp.format, stat);
        }
      }

      let bestFormat = '';
      let bestWinRate = 0;
      for (const [format, stat] of formatStats) {
        const rate = stat.total > 0 ? stat.wins / stat.total : 0;
        if (rate > bestWinRate) { bestWinRate = rate; bestFormat = format; }
      }

      return {
        success: true,
        data: {
          totalCompetitions: participations.length,
          wins, totalScore, avgAccuracy, avgGrowth,
          bestFormat: bestFormat || 'N/A', currentStreak: 0,
          tokensEarned: 0, // Would aggregate from token transactions
        },
      };
    } catch (error) {
      return { success: false, error: `Stats failed: ${(error as Error).message}` };
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async getLearnerBaseline(userId: string, tenantId: string): Promise<{
    currentPhase: number; avgMastery: number; avgAccuracy: number; avgWcpm: number;
  } | null> {
    try {
      // This would query the BKT/phonics data from the existing services
      const cached = await this.redis.get(`baseline:${tenantId}:${userId}`);
      if (cached) return JSON.parse(cached);

      // Default baseline if no data available
      return { currentPhase: 3, avgMastery: 65, avgAccuracy: 70, avgWcpm: 40 };
    } catch {
      return null;
    }
  }

  getDefaultConfigs(): CompetitionConfig[] { return DEFAULT_CONFIGS; }
}
