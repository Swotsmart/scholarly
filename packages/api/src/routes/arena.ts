/**
 * Arena & Gamification Routes
 *
 * API endpoints for competitive learning arena, tournaments, teams,
 * community features, bounties, DAO governance, and token economy.
 * Sprints: 5, 7, 9, 12, 14
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { authMiddleware } from '../middleware/auth';

export const arenaRouter: Router = Router();
arenaRouter.use(authMiddleware);

/** Parse and clamp a pagination limit from query params. Max 100, default 20. */
function clampLimit(raw: string | undefined, defaultVal = 20, max = 100): number {
  const parsed = parseInt(raw || '', 10);
  if (isNaN(parsed) || parsed < 1) return defaultVal;
  return Math.min(parsed, max);
}

/** Parse and clamp a page number from query params. Min 1, default 1. */
function clampPage(raw: string | undefined): number {
  const parsed = parseInt(raw || '', 10);
  if (isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

const TOURNAMENT_FORMATS = [
  'SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN',
  'SWISS', 'LEAGUE', 'SPEED_ROUND', 'ACCURACY_CHALLENGE', 'PHONICS_BEE',
] as const;

// ============================================================================
// Zod Schemas
// ============================================================================

const curriculumAlignmentSchema = z.object({
  id: z.string(),
  code: z.string(),
  framework: z.string(),
  learningArea: z.string(),
  subject: z.string(),
  yearLevels: z.array(z.string()),
  title: z.string(),
  description: z.string().optional(),
});

const createCompetitionSchema = z.object({
  format: z.enum([
    'READING_SPRINT', 'ACCURACY_CHALLENGE', 'COMPREHENSION_QUIZ',
    'WORD_BLITZ', 'PHONICS_DUEL', 'TEAM_RELAY', 'STORY_SHOWDOWN',
    'SPELLING_BEE', 'VOCABULARY_CHALLENGE', 'COLLABORATIVE_CREATION',
  ]),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  scoringModel: z.enum(['GROWTH_BASED', 'ABSOLUTE', 'HANDICAPPED', 'COLLABORATIVE']).default('GROWTH_BASED'),
  maxParticipants: z.number().int().min(2).max(100).default(20),
  durationMinutes: z.number().int().min(5).max(120).default(30),
  totalRounds: z.number().int().min(1).max(20).default(1),
  phase: z.number().int().min(1).max(6).optional(),
  scheduledAt: z.string().datetime().optional(),
  curriculumAlignments: z.array(curriculumAlignmentSchema).max(10).optional(),
});

const createTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  format: z.enum(TOURNAMENT_FORMATS),
  description: z.string().max(2000).optional(),
  teamBased: z.boolean().default(false),
  maxParticipants: z.number().int().min(2).max(64).default(16),
  prizePool: z.object({
    xp: z.number().optional(),
    badges: z.array(z.string()).optional(),
    tokens: z.number().optional(),
  }).optional(),
  scheduledAt: z.string().datetime().optional(),
});

const createTeamSchema = z.object({
  name: z.string().min(3).max(50),
  type: z.enum(['CLASSROOM', 'SCHOOL_HOUSE', 'GLOBAL_GUILD', 'FAMILY']),
  description: z.string().max(500).optional(),
  maxMembers: z.number().int().min(2).max(50).default(10),
});

const addTeamMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['CAPTAIN', 'VICE_CAPTAIN', 'MEMBER', 'COACH']).default('MEMBER'),
});

const redeemTokenSchema = z.object({
  tokenType: z.enum(['SPARKS', 'GEMS', 'VOICE']),
  amount: z.number().int().positive(),
  category: z.string(),
});

const createBountySchema = z.object({
  category: z.enum([
    'PHASE_GAP', 'THEME_GAP', 'LANGUAGE_GAP', 'SERIES_EXTENSION',
    'CULTURAL_DIVERSITY', 'SEASONAL', 'COMMUNITY_REQUEST',
  ]),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  requirements: z.record(z.unknown()),
  reward: z.record(z.unknown()),
  submissionDeadline: z.string().datetime(),
  judgingDeadline: z.string().datetime().optional(),
  maxSubmissions: z.number().int().min(1).max(500).default(50),
  eligibleTiers: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

const submitBountySchema = z.object({
  storyId: z.string().optional(),
});

const submitRoundSchema = z.object({
  accuracy: z.number().min(0).max(100),
  wcpm: z.number().int().min(0),
  comprehensionScore: z.number().min(0).max(100).optional(),
  highlights: z.array(z.string()).optional(),
});

const contributeSchema = z.object({
  tokenType: z.enum(['SPARKS', 'GEMS']),
  amount: z.number().int().positive(),
});

const proposeTreasurySchema = z.object({
  description: z.string().min(5).max(500),
  tokenType: z.enum(['SPARKS', 'GEMS']),
  amount: z.number().int().positive(),
  purpose: z.string().min(3).max(200),
});

const castTreasuryVoteSchema = z.object({
  choice: z.enum(['FOR', 'AGAINST']),
});

const proposeTradeSchema = z.object({
  recipientTeamId: z.string(),
  offerTokenType: z.enum(['SPARKS', 'GEMS']),
  offerAmount: z.number().int().positive(),
  requestTokenType: z.enum(['SPARKS', 'GEMS']),
  requestAmount: z.number().int().positive(),
  message: z.string().max(500).optional(),
});

const challengeTeamSchema = z.object({
  challengedTeamId: z.string(),
  format: z.string(),
  phonicsPhase: z.string().optional(),
  wagerAmount: z.number().int().min(0).default(0),
  wagerTokenType: z.enum(['SPARKS', 'GEMS']).optional(),
});

const earnTokenSchema = z.object({
  tokenType: z.enum(['SPARKS', 'GEMS', 'VOICE']),
  amount: z.number().int().positive(),
  category: z.string(),
  referenceId: z.string().optional(),
  referenceType: z.string().optional(),
});

const stakeSchema = z.object({
  poolType: z.enum(['ARENA_TOURNAMENT', 'TEAM_TREASURY', 'CONTENT_BOUNTY', 'GOVERNANCE_LOCK', 'CREATOR_BOND', 'SAVINGS_POOL']),
  poolId: z.string().optional(),
  tokenType: z.enum(['SPARKS', 'GEMS', 'VOICE']),
  amount: z.number().int().positive(),
  lockDays: z.number().int().min(1).max(365),
});

const unstakeSchema = z.object({
  positionId: z.string(),
});

const createProposalSchema = z.object({
  type: z.enum([
    'SIGNAL', 'FEATURE_PRIORITY', 'CONTENT_POLICY', 'CURRICULUM_ADDITION',
    'TOKEN_ALLOCATION', 'TREASURY_SPEND', 'PLATFORM_RULE', 'PARTNERSHIP',
    'EVENT_PLANNING', 'COMMUNITY_FUND',
  ]),
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  specification: z.record(z.unknown()).optional(),
  votingStrategy: z.enum(['SIMPLE_MAJORITY', 'SUPERMAJORITY', 'QUADRATIC', 'CONVICTION']).default('SIMPLE_MAJORITY'),
  votingPeriodHours: z.number().int().min(24).max(168).default(72),
});

const castGovernanceVoteSchema = z.object({
  choice: z.enum(['FOR', 'AGAINST', 'ABSTAIN']),
  voiceAmount: z.number().int().positive().optional(),
  reason: z.string().max(1000).optional(),
});

const delegateSchema = z.object({
  delegateId: z.string(),
  proposalTypes: z.array(z.string()).default([]),
  voiceAmount: z.number().int().positive(),
  durationDays: z.number().int().min(1).max(365).default(30),
});

const registerCreatorSchema = z.object({
  displayName: z.string().min(2).max(100),
  bio: z.string().max(1000).optional(),
  specialisations: z.array(z.string()).default([]),
});

const awardBountySchema = z.object({
  winnerIds: z.array(z.string()).min(1),
  runnerUpIds: z.array(z.string()).default([]),
});

const ONBOARDING_PHASES = [
  'REGISTERED', 'PROFILE_COMPLETE', 'TUTORIAL_COMPLETE',
  'FIRST_DRAFT', 'FIRST_PUBLICATION', 'ACTIVE_CREATOR',
] as const;

const TIER_THRESHOLDS: Record<string, { published: number; engagement: number }> = {
  NEWCOMER: { published: 0, engagement: 0 },
  CONTRIBUTOR: { published: 3, engagement: 2.0 },
  ESTABLISHED: { published: 10, engagement: 3.5 },
  EXPERT: { published: 25, engagement: 4.0 },
  MASTER: { published: 50, engagement: 4.5 },
};

const TIER_ORDER = ['NEWCOMER', 'CONTRIBUTOR', 'ESTABLISHED', 'EXPERT', 'MASTER'];
function getNextTier(current: string): string | null {
  const idx = TIER_ORDER.indexOf(current);
  return idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

// ============================================================================
// Competitions
// ============================================================================

arenaRouter.post('/competitions', async (req: Request, res: Response) => {
  try {
    const params = createCompetitionSchema.parse(req.body);
    const user = req.user!;

    const competition = await prisma.arenaCompetition.create({
      data: {
        tenantId: user.tenantId,
        creatorId: user.id,
        format: params.format,
        title: params.title,
        description: params.description,
        totalRounds: params.totalRounds,
        phonicsPhase: params.phase?.toString(),
        scheduledAt: params.scheduledAt ? new Date(params.scheduledAt) : null,
        config: {
          scoringModel: params.scoringModel,
          maxParticipants: params.maxParticipants,
          durationMinutes: params.durationMinutes,
        },
        metadata: params.curriculumAlignments?.length
          ? { curriculumAlignments: params.curriculumAlignments }
          : undefined,
        status: 'REGISTRATION_OPEN',
      },
    });

    // Flatten curriculum alignments from metadata into top-level response field
    const responseData = {
      ...competition,
      curriculumAlignments: (competition.metadata as any)?.curriculumAlignments || [],
    };

    res.status(201).json({ success: true, data: responseData });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to create competition' });
  }
});

arenaRouter.get('/competitions', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { status, format, page: rawPage, limit: rawLimit } = req.query;
    const page = clampPage(rawPage as string);
    const limit = clampLimit(rawLimit as string);
    const skip = (page - 1) * limit;

    const where = {
      tenantId: user.tenantId,
      ...(status && { status: status as string }),
      ...(format && { format: format as string }),
    };

    const [competitions, total] = await Promise.all([
      prisma.arenaCompetition.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.arenaCompetition.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        competitions,
        pagination: { page, limit, total },
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to list competitions' });
  }
});

arenaRouter.get('/competitions/user-stats', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const participants = await prisma.arenaParticipant.findMany({
      where: { userId: user.id, tenantId: user.tenantId },
      include: { competition: { select: { format: true, status: true } } },
      take: 1000,
    });

    const completed = participants.filter(p => p.competition.status === 'COMPLETED');
    const wins = completed.filter(p => p.rank === 1).length;
    const totalScore = completed.reduce((sum, p) => sum + p.totalScore, 0);
    const avgScore = completed.length > 0 ? totalScore / completed.length : 0;

    const formatCounts: Record<string, number> = {};
    for (const p of completed) {
      const f = p.competition.format;
      formatCounts[f] = (formatCounts[f] || 0) + p.totalScore;
    }
    const bestFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    res.json({
      success: true,
      data: {
        totalCompetitions: completed.length,
        wins,
        totalScore,
        avgScore: Math.round(avgScore * 100) / 100,
        bestFormat,
        activeCompetitions: participants.filter(p => p.status === 'ACTIVE').length,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get user stats' });
  }
});

arenaRouter.get('/competitions/:competitionId', async (req: Request, res: Response) => {
  try {
    const competition = await prisma.arenaCompetition.findUnique({
      where: { id: req.params.competitionId },
      include: { participants: { orderBy: { totalScore: 'desc' } } },
    });

    if (!competition) {
      res.status(404).json({ success: false, error: 'Competition not found' });
      return;
    }

    res.json({ success: true, data: competition });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get competition' });
  }
});

arenaRouter.post('/competitions/:competitionId/join', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { competitionId } = req.params;

    const competition = await prisma.arenaCompetition.findUnique({
      where: { id: competitionId },
    });

    if (!competition) {
      res.status(404).json({ success: false, error: 'Competition not found' });
      return;
    }

    if (competition.status !== 'REGISTRATION_OPEN') {
      res.status(400).json({ success: false, error: 'Competition is not open for registration' });
      return;
    }

    const [participant] = await prisma.$transaction([
      prisma.arenaParticipant.create({
        data: {
          competitionId,
          userId: user.id,
          tenantId: user.tenantId,
          type: req.body.type || 'STUDENT',
        },
      }),
      prisma.arenaCompetition.update({
        where: { id: competitionId },
        data: { participantCount: { increment: 1 } },
      }),
    ]);

    res.status(201).json({ success: true, data: participant });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Already joined this competition' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to join competition' });
  }
});

arenaRouter.get('/competitions/:competitionId/leaderboard', async (req: Request, res: Response) => {
  try {
    const entries = await prisma.arenaParticipant.findMany({
      where: { competitionId: req.params.competitionId },
      orderBy: { totalScore: 'desc' },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      take: 100,
    });

    res.json({
      success: true,
      data: {
        competitionId: req.params.competitionId,
        entries: entries.map((e, i) => ({ ...e, rank: i + 1 })),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
  }
});

arenaRouter.post('/competitions/:competitionId/start', async (req: Request, res: Response) => {
  try {
    const { competitionId } = req.params;

    const competition = await prisma.arenaCompetition.findUnique({ where: { id: competitionId } });
    if (!competition) {
      res.status(404).json({ success: false, error: 'Competition not found' });
      return;
    }
    if (competition.status !== 'REGISTRATION_OPEN' && competition.status !== 'SCHEDULED') {
      res.status(400).json({ success: false, error: 'Competition cannot be started from current status' });
      return;
    }

    const [updated] = await prisma.$transaction([
      prisma.arenaCompetition.update({
        where: { id: competitionId },
        data: { status: 'IN_PROGRESS', startedAt: new Date(), currentRound: 1 },
      }),
      prisma.arenaParticipant.updateMany({
        where: { competitionId, status: 'REGISTERED' },
        data: { status: 'ACTIVE' },
      }),
    ]);

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to start competition' });
  }
});

arenaRouter.post('/competitions/:competitionId/rounds/submit', async (req: Request, res: Response) => {
  try {
    const params = submitRoundSchema.parse(req.body);
    const user = req.user!;
    const { competitionId } = req.params;

    const competition = await prisma.arenaCompetition.findUnique({ where: { id: competitionId } });
    if (!competition) {
      res.status(404).json({ success: false, error: 'Competition not found' });
      return;
    }
    if (competition.status !== 'IN_PROGRESS') {
      res.status(400).json({ success: false, error: 'Competition is not in progress' });
      return;
    }

    const participant = await prisma.arenaParticipant.findFirst({
      where: { competitionId, userId: user.id },
    });
    if (!participant) {
      res.status(404).json({ success: false, error: 'Not a participant in this competition' });
      return;
    }

    const roundScore = {
      round: competition.currentRound,
      accuracy: params.accuracy,
      wcpm: params.wcpm,
      comprehensionScore: params.comprehensionScore || 0,
      highlights: params.highlights || [],
      points: Math.round(params.accuracy * 0.4 + params.wcpm * 0.3 + (params.comprehensionScore || 0) * 0.3),
    };

    const existingScores = Array.isArray(participant.roundScores) ? participant.roundScores as any[] : [];
    const updatedScores = [...existingScores, roundScore];
    const newTotalScore = updatedScores.reduce((sum: number, s: any) => sum + (s.points || 0), 0);

    const updated = await prisma.arenaParticipant.update({
      where: { id: participant.id },
      data: { roundScores: updatedScores, totalScore: newTotalScore },
    });

    res.json({ success: true, data: { participant: updated, roundScore } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to submit round' });
  }
});

arenaRouter.post('/competitions/:competitionId/advance', async (req: Request, res: Response) => {
  try {
    const { competitionId } = req.params;

    const competition = await prisma.arenaCompetition.findUnique({ where: { id: competitionId } });
    if (!competition) {
      res.status(404).json({ success: false, error: 'Competition not found' });
      return;
    }
    if (competition.status !== 'IN_PROGRESS') {
      res.status(400).json({ success: false, error: 'Competition is not in progress' });
      return;
    }

    const nextRound = competition.currentRound + 1;
    if (nextRound > competition.totalRounds) {
      // Auto-complete
      const participants = await prisma.arenaParticipant.findMany({
        where: { competitionId },
        orderBy: { totalScore: 'desc' },
        take: 1000,
      });

      await prisma.$transaction([
        prisma.arenaCompetition.update({
          where: { id: competitionId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        }),
        ...participants.map((p, i) =>
          prisma.arenaParticipant.update({ where: { id: p.id }, data: { rank: i + 1 } })
        ),
      ]);

      res.json({ success: true, data: { status: 'COMPLETED', finalRound: competition.currentRound } });
      return;
    }

    const updated = await prisma.arenaCompetition.update({
      where: { id: competitionId },
      data: { currentRound: nextRound },
    });

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to advance round' });
  }
});

arenaRouter.post('/competitions/:competitionId/complete', async (req: Request, res: Response) => {
  try {
    const { competitionId } = req.params;

    const competition = await prisma.arenaCompetition.findUnique({ where: { id: competitionId } });
    if (!competition) {
      res.status(404).json({ success: false, error: 'Competition not found' });
      return;
    }
    if (competition.status !== 'IN_PROGRESS') {
      res.status(400).json({ success: false, error: 'Competition is not in progress' });
      return;
    }

    const participants = await prisma.arenaParticipant.findMany({
      where: { competitionId },
      orderBy: { totalScore: 'desc' },
      take: 1000,
    });

    const txOps: any[] = [
      prisma.arenaCompetition.update({
        where: { id: competitionId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }),
      ...participants.map((p, i) =>
        prisma.arenaParticipant.update({ where: { id: p.id }, data: { rank: i + 1, status: 'COMPLETED' } })
      ),
    ];

    // Distribute wager pool to top 30%
    if (competition.wagerPool > 0 && participants.length > 0) {
      const winnerCount = Math.max(1, Math.ceil(participants.length * 0.3));
      const winners = participants.slice(0, winnerCount);
      const sharePerWinner = Math.floor(competition.wagerPool / winnerCount);
      const field = (competition.wagerTokenType || 'SPARKS').toLowerCase() as 'sparks' | 'gems' | 'voice';

      for (const winner of winners) {
        txOps.push(
          prisma.tokenBalance.upsert({
            where: { tenantId_userId: { tenantId: competition.tenantId, userId: winner.userId } },
            create: { userId: winner.userId, tenantId: competition.tenantId, [field]: sharePerWinner },
            update: { [field]: { increment: sharePerWinner } },
          })
        );
      }
    }

    await prisma.$transaction(txOps);

    res.json({ success: true, data: { competitionId, status: 'COMPLETED', rankedParticipants: participants.length } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to complete competition' });
  }
});

// ============================================================================
// Tournaments (Advanced) — stored as ArenaCompetitions with tournament formats
// ============================================================================

arenaRouter.post('/tournaments', async (req: Request, res: Response) => {
  try {
    const params = createTournamentSchema.parse(req.body);
    const user = req.user!;

    const tournament = await prisma.arenaCompetition.create({
      data: {
        tenantId: user.tenantId,
        creatorId: user.id,
        format: params.format,
        title: params.name,
        description: params.description,
        scheduledAt: params.scheduledAt ? new Date(params.scheduledAt) : null,
        config: {
          teamBased: params.teamBased,
          maxParticipants: params.maxParticipants,
          prizePool: params.prizePool || {},
        },
        status: 'REGISTRATION_OPEN',
      },
    });

    res.status(201).json({ success: true, data: tournament });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to create tournament' });
  }
});

arenaRouter.get('/tournaments', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { page: rawPage, limit: rawLimit } = req.query;
    const page = clampPage(rawPage as string);
    const limit = clampLimit(rawLimit as string);
    const skip = (page - 1) * limit;

    const [tournaments, total] = await Promise.all([
      prisma.arenaCompetition.findMany({
        where: {
          tenantId: user.tenantId,
          format: { in: [...TOURNAMENT_FORMATS] },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.arenaCompetition.count({
        where: {
          tenantId: user.tenantId,
          format: { in: [...TOURNAMENT_FORMATS] },
        },
      }),
    ]);

    res.json({ success: true, data: { tournaments, total } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to list tournaments' });
  }
});

arenaRouter.get('/tournaments/:tournamentId', async (req: Request, res: Response) => {
  try {
    const tournament = await prisma.arenaCompetition.findUnique({
      where: { id: req.params.tournamentId },
      include: { participants: { orderBy: { totalScore: 'desc' } } },
    });

    if (!tournament) {
      res.status(404).json({ success: false, error: 'Tournament not found' });
      return;
    }

    res.json({ success: true, data: tournament });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get tournament' });
  }
});

// ============================================================================
// Teams
// ============================================================================

arenaRouter.post('/teams', async (req: Request, res: Response) => {
  try {
    const params = createTeamSchema.parse(req.body);
    const user = req.user!;

    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.arenaTeam.create({
        data: {
          tenantId: user.tenantId,
          name: params.name,
          type: params.type,
          description: params.description,
          maxMembers: params.maxMembers,
          createdBy: user.id,
          memberCount: 1,
        },
      });

      await tx.arenaTeamMember.create({
        data: {
          teamId: newTeam.id,
          userId: user.id,
          tenantId: user.tenantId,
          role: 'CAPTAIN',
        },
      });

      return newTeam;
    });

    res.status(201).json({ success: true, data: team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to create team' });
  }
});

arenaRouter.get('/teams', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { type, page: rawPage, limit: rawLimit } = req.query;
    const page = clampPage(rawPage as string);
    const limit = clampLimit(rawLimit as string);
    const skip = (page - 1) * limit;

    const where = {
      tenantId: user.tenantId,
      isActive: true,
      ...(type && { type: type as string }),
    };

    const [teams, total] = await Promise.all([
      prisma.arenaTeam.findMany({
        where,
        orderBy: { xp: 'desc' },
        skip,
        take: limit,
        include: { members: { where: { isActive: true }, select: { userId: true, role: true } } },
      }),
      prisma.arenaTeam.count({ where }),
    ]);

    res.json({ success: true, data: { teams, total } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to list teams' });
  }
});

arenaRouter.get('/teams/my', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const memberships = await prisma.arenaTeamMember.findMany({
      where: { userId: user.id, tenantId: user.tenantId, isActive: true },
      include: { team: true },
      take: 100,
    });

    res.json({ success: true, data: memberships.map(m => ({ ...m.team, myRole: m.role })) });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get user teams' });
  }
});

arenaRouter.get('/teams/leaderboard', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { type, limit: rawLimit } = req.query;
    const limit = clampLimit(rawLimit as string, 50, 100);

    const teams = await prisma.arenaTeam.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(type && { type: type as string }),
      },
      orderBy: { xp: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: { teams: teams.map((t, i) => ({ ...t, rank: i + 1 })) },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get team leaderboard' });
  }
});

arenaRouter.get('/teams/:teamId', async (req: Request, res: Response) => {
  try {
    const team = await prisma.arenaTeam.findUnique({
      where: { id: req.params.teamId },
      include: { members: { where: { isActive: true }, include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } } },
    });

    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }

    res.json({ success: true, data: team });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get team' });
  }
});

arenaRouter.get('/teams/:teamId/members', async (req: Request, res: Response) => {
  try {
    const members = await prisma.arenaTeamMember.findMany({
      where: { teamId: req.params.teamId, isActive: true },
      orderBy: { joinedAt: 'asc' },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      take: 100,
    });

    res.json({ success: true, data: members });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get team members' });
  }
});

arenaRouter.post('/teams/:teamId/members', async (req: Request, res: Response) => {
  try {
    const params = addTeamMemberSchema.parse(req.body);
    const { teamId } = req.params;
    const user = req.user!;

    const team = await prisma.arenaTeam.findUnique({ where: { id: teamId } });

    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }

    if (team.memberCount >= team.maxMembers) {
      res.status(400).json({ success: false, error: 'Team is full' });
      return;
    }

    const [member] = await prisma.$transaction([
      prisma.arenaTeamMember.create({
        data: {
          teamId,
          userId: params.userId,
          tenantId: user.tenantId,
          role: params.role,
        },
      }),
      prisma.arenaTeam.update({
        where: { id: teamId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    res.status(201).json({ success: true, data: member });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'User is already a member of this team' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to add team member' });
  }
});

arenaRouter.post('/teams/:teamId/leave', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { teamId } = req.params;

    const member = await prisma.arenaTeamMember.findFirst({
      where: { teamId, userId: user.id, isActive: true },
    });

    if (!member) {
      res.status(404).json({ success: false, error: 'Not a member of this team' });
      return;
    }

    const txOps: any[] = [
      prisma.arenaTeamMember.update({ where: { id: member.id }, data: { isActive: false } }),
      prisma.arenaTeam.update({ where: { id: teamId }, data: { memberCount: { decrement: 1 } } }),
    ];

    // Transfer captaincy if leaving member is captain
    if (member.role === 'CAPTAIN') {
      const nextCaptain = await prisma.arenaTeamMember.findFirst({
        where: { teamId, isActive: true, userId: { not: user.id } },
        orderBy: { joinedAt: 'asc' },
      });
      if (nextCaptain) {
        txOps.push(prisma.arenaTeamMember.update({ where: { id: nextCaptain.id }, data: { role: 'CAPTAIN' } }));
      }
    }

    await prisma.$transaction(txOps);

    res.json({ success: true, data: { teamId, left: true } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to leave team' });
  }
});

arenaRouter.post('/teams/:teamId/treasury/contribute', async (req: Request, res: Response) => {
  try {
    const params = contributeSchema.parse(req.body);
    const user = req.user!;
    const { teamId } = req.params;

    const member = await prisma.arenaTeamMember.findFirst({
      where: { teamId, userId: user.id, isActive: true },
    });
    if (!member) {
      res.status(404).json({ success: false, error: 'Not a member of this team' });
      return;
    }

    const field = params.tokenType.toLowerCase() as 'sparks' | 'gems';
    const treasuryField = params.tokenType === 'SPARKS' ? 'treasurySparks' : 'treasuryGems';
    const contributedField = params.tokenType === 'SPARKS' ? 'contributedSparks' : 'contributedGems';

    const result = await prisma.$transaction(async (tx) => {
      const balance = await tx.tokenBalance.findUnique({
        where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
      });
      if (!balance || balance[field] < params.amount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      await tx.tokenBalance.update({
        where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
        data: { [field]: { decrement: params.amount } },
      });

      const updatedTeam = await tx.arenaTeam.update({
        where: { id: teamId },
        data: { [treasuryField]: { increment: params.amount } },
      });

      await tx.arenaTeamMember.update({
        where: { id: member.id },
        data: { [contributedField]: { increment: params.amount } },
      });

      await tx.arenaTokenTransaction.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          tokenType: params.tokenType,
          transactionType: 'STAKE',
          amount: -params.amount,
          balanceBefore: balance[field],
          balanceAfter: balance[field] - params.amount,
          category: 'TEAM_TREASURY',
          referenceId: teamId,
          referenceType: 'TEAM',
        },
      });

      return updatedTeam;
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    if (error?.message === 'INSUFFICIENT_BALANCE') {
      res.status(400).json({ success: false, error: 'Insufficient token balance' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to contribute to treasury' });
  }
});

arenaRouter.post('/teams/:teamId/treasury/propose', async (req: Request, res: Response) => {
  try {
    const params = proposeTreasurySchema.parse(req.body);
    const user = req.user!;
    const { teamId } = req.params;

    const team = await prisma.arenaTeam.findUnique({ where: { id: teamId } });
    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }

    const vote = await prisma.arenaTreasuryVote.create({
      data: {
        teamId,
        tenantId: user.tenantId,
        proposerId: user.id,
        description: params.description,
        tokenType: params.tokenType,
        amount: params.amount,
        purpose: params.purpose,
        status: 'OPEN',
        totalVoters: team.memberCount,
        requiredApproval: 0.5,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      },
    });

    res.status(201).json({ success: true, data: vote });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to propose treasury spend' });
  }
});

arenaRouter.post('/teams/treasury-votes/:voteId/cast', async (req: Request, res: Response) => {
  try {
    const params = castTreasuryVoteSchema.parse(req.body);
    const user = req.user!;
    const { voteId } = req.params;

    const vote = await prisma.arenaTreasuryVote.findUnique({ where: { id: voteId } });
    if (!vote) {
      res.status(404).json({ success: false, error: 'Vote not found' });
      return;
    }
    if (vote.status !== 'OPEN') {
      res.status(400).json({ success: false, error: 'Vote is no longer open' });
      return;
    }
    if (new Date() > vote.expiresAt) {
      res.status(400).json({ success: false, error: 'Vote has expired' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.arenaTreasuryVoteCast.create({
        data: { voteId, voterId: user.id, tenantId: user.tenantId, choice: params.choice },
      });

      const incrementField = params.choice === 'FOR' ? 'votesFor' : 'votesAgainst';
      const updatedVote = await tx.arenaTreasuryVote.update({
        where: { id: voteId },
        data: { [incrementField]: { increment: 1 } },
      });

      const totalCast = updatedVote.votesFor + updatedVote.votesAgainst;
      const turnout = updatedVote.totalVoters > 0 ? totalCast / updatedVote.totalVoters : 0;

      // Auto-finalise at 80% turnout or all voted
      if (turnout >= 0.8 || totalCast >= updatedVote.totalVoters) {
        const passed = updatedVote.votesFor / totalCast >= updatedVote.requiredApproval;
        const finalStatus = passed ? 'PASSED' : 'REJECTED';

        await tx.arenaTreasuryVote.update({ where: { id: voteId }, data: { status: finalStatus } });

        if (passed) {
          const treasuryField = updatedVote.tokenType === 'SPARKS' ? 'treasurySparks' : 'treasuryGems';
          await tx.arenaTeam.update({
            where: { id: updatedVote.teamId },
            data: { [treasuryField]: { decrement: updatedVote.amount } },
          });
        }

        return { ...updatedVote, status: finalStatus, autoFinalised: true };
      }

      return { ...updatedVote, autoFinalised: false };
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Already voted on this proposal' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to cast treasury vote' });
  }
});

arenaRouter.post('/teams/:teamId/trades/propose', async (req: Request, res: Response) => {
  try {
    const params = proposeTradeSchema.parse(req.body);
    const user = req.user!;
    const { teamId } = req.params;

    const [proposerTeam, recipientTeam] = await Promise.all([
      prisma.arenaTeam.findUnique({ where: { id: teamId } }),
      prisma.arenaTeam.findUnique({ where: { id: params.recipientTeamId } }),
    ]);

    if (!proposerTeam) {
      res.status(404).json({ success: false, error: 'Proposer team not found' });
      return;
    }
    if (!recipientTeam) {
      res.status(404).json({ success: false, error: 'Recipient team not found' });
      return;
    }

    const offerField = params.offerTokenType === 'SPARKS' ? 'treasurySparks' : 'treasuryGems';
    if (proposerTeam[offerField] < params.offerAmount) {
      res.status(400).json({ success: false, error: 'Insufficient team treasury for offer' });
      return;
    }

    const trade = await prisma.arenaTeamTrade.create({
      data: {
        tenantId: user.tenantId,
        proposerTeamId: teamId,
        recipientTeamId: params.recipientTeamId,
        offerTokenType: params.offerTokenType,
        offerAmount: params.offerAmount,
        requestTokenType: params.requestTokenType,
        requestAmount: params.requestAmount,
        message: params.message,
        status: 'PROPOSED',
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
      },
    });

    res.status(201).json({ success: true, data: trade });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to propose trade' });
  }
});

arenaRouter.post('/teams/trades/:tradeId/accept', async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;

    const trade = await prisma.arenaTeamTrade.findUnique({ where: { id: tradeId } });
    if (!trade) {
      res.status(404).json({ success: false, error: 'Trade not found' });
      return;
    }
    if (trade.status !== 'PROPOSED') {
      res.status(400).json({ success: false, error: 'Trade is no longer open' });
      return;
    }
    if (new Date() > trade.expiresAt) {
      res.status(400).json({ success: false, error: 'Trade has expired' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const offerField = trade.offerTokenType === 'SPARKS' ? 'treasurySparks' : 'treasuryGems';
      const requestField = trade.requestTokenType === 'SPARKS' ? 'treasurySparks' : 'treasuryGems';

      // Verify both teams still have sufficient tokens
      const [proposer, recipient] = await Promise.all([
        tx.arenaTeam.findUnique({ where: { id: trade.proposerTeamId } }),
        tx.arenaTeam.findUnique({ where: { id: trade.recipientTeamId } }),
      ]);

      if (!proposer || proposer[offerField] < trade.offerAmount) {
        throw new Error('PROPOSER_INSUFFICIENT');
      }
      if (!recipient || recipient[requestField] < trade.requestAmount) {
        throw new Error('RECIPIENT_INSUFFICIENT');
      }

      // Swap tokens
      await tx.arenaTeam.update({
        where: { id: trade.proposerTeamId },
        data: { [offerField]: { decrement: trade.offerAmount }, [requestField]: { increment: trade.requestAmount } },
      });
      await tx.arenaTeam.update({
        where: { id: trade.recipientTeamId },
        data: { [requestField]: { decrement: trade.requestAmount }, [offerField]: { increment: trade.offerAmount } },
      });

      return tx.arenaTeamTrade.update({ where: { id: tradeId }, data: { status: 'COMPLETED' } });
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error?.message === 'PROPOSER_INSUFFICIENT' || error?.message === 'RECIPIENT_INSUFFICIENT') {
      res.status(400).json({ success: false, error: 'Insufficient treasury balance for trade' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to accept trade' });
  }
});

arenaRouter.post('/teams/:teamId/challenge', async (req: Request, res: Response) => {
  try {
    const params = challengeTeamSchema.parse(req.body);
    const user = req.user!;
    const { teamId } = req.params;

    const [challenger, challenged] = await Promise.all([
      prisma.arenaTeam.findUnique({ where: { id: teamId } }),
      prisma.arenaTeam.findUnique({ where: { id: params.challengedTeamId } }),
    ]);

    if (!challenger) {
      res.status(404).json({ success: false, error: 'Challenger team not found' });
      return;
    }
    if (!challenged) {
      res.status(404).json({ success: false, error: 'Challenged team not found' });
      return;
    }

    const challenge = await prisma.arenaTeamChallenge.create({
      data: {
        tenantId: user.tenantId,
        challengerTeamId: teamId,
        challengedTeamId: params.challengedTeamId,
        format: params.format,
        phonicsPhase: params.phonicsPhase,
        wagerAmount: params.wagerAmount,
        wagerTokenType: params.wagerTokenType,
        status: 'PENDING',
      },
    });

    res.status(201).json({ success: true, data: challenge });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to create challenge' });
  }
});

// ============================================================================
// Community Dashboard
// ============================================================================

arenaRouter.get('/community/leaderboards', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { type = 'sparks', limit: rawLimit } = req.query;
    const limit = clampLimit(rawLimit as string, 20, 100);

    const orderField = type === 'gems' ? 'gems' : type === 'voice' ? 'voice' : 'sparks';

    const entries = await prisma.tokenBalance.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { [orderField]: 'desc' },
      take: limit,
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    });

    res.json({
      success: true,
      data: {
        leaderboard: entries.map((e, i) => ({ ...e, rank: i + 1 })),
        type,
        period: 'all-time',
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get leaderboards' });
  }
});

arenaRouter.get('/community/trending', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const [trendingBounties, topCreators] = await Promise.all([
      prisma.contentBounty.findMany({
        where: { tenantId: user.tenantId, status: 'ACCEPTING' },
        orderBy: { currentSubmissions: 'desc' },
        take: 10,
      }),
      prisma.creatorProfile.findMany({
        where: { tenantId: user.tenantId, isVerifiedEducator: true },
        orderBy: { totalPublished: 'desc' },
        take: 10,
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      }),
    ]);

    res.json({
      success: true,
      data: { trendingBounties, featuredCreators: topCreators },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get trending' });
  }
});

arenaRouter.get('/community/feed', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { page: rawPage, limit: rawLimit } = req.query;
    const page = clampPage(rawPage as string);
    const limit = clampLimit(rawLimit as string);
    const skip = (page - 1) * limit;

    const [recentCompetitions, recentBounties] = await Promise.all([
      prisma.arenaCompetition.findMany({
        where: { tenantId: user.tenantId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: Math.ceil(limit / 2),
        skip,
      }),
      prisma.contentBounty.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit / 2),
        skip,
      }),
    ]);

    const feed = [
      ...recentCompetitions.map(c => ({ type: 'competition' as const, data: c, timestamp: c.completedAt || c.createdAt })),
      ...recentBounties.map(b => ({ type: 'bounty' as const, data: b, timestamp: b.createdAt })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    res.json({ success: true, data: { feed, hasMore: feed.length === limit } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get community feed' });
  }
});

arenaRouter.get('/community/creators/me', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const profile = await prisma.creatorProfile.findUnique({
      where: { userId: user.id },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
    });

    if (!profile) {
      res.status(404).json({ success: false, error: 'Creator profile not found. Register first.' });
      return;
    }

    res.json({ success: true, data: profile });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get creator profile' });
  }
});

arenaRouter.post('/community/creators/register', async (req: Request, res: Response) => {
  try {
    const params = registerCreatorSchema.parse(req.body);
    const user = req.user!;

    const profile = await prisma.creatorProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName: params.displayName,
        bio: params.bio,
        specialisations: params.specialisations,
        tier: 'NEWCOMER',
        onboardingPhase: 'REGISTERED',
        tenantId: user.tenantId,
      },
      update: {
        displayName: params.displayName,
        bio: params.bio,
        specialisations: params.specialisations,
        tenantId: user.tenantId,
      },
    });

    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to register creator' });
  }
});

arenaRouter.get('/community/creators/:creatorId', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.creatorProfile.findUnique({
      where: { id: req.params.creatorId },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    });

    if (!profile) {
      res.status(404).json({ success: false, error: 'Creator not found' });
      return;
    }

    res.json({ success: true, data: profile });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get creator' });
  }
});

arenaRouter.get('/community/creators/:creatorId/analytics', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.creatorProfile.findUnique({ where: { id: req.params.creatorId } });
    if (!profile) {
      res.status(404).json({ success: false, error: 'Creator not found' });
      return;
    }

    const [submissions, bounties] = await Promise.all([
      prisma.bountySubmission.findMany({
        where: { creatorId: profile.userId, tenantId: profile.tenantId || undefined },
        take: 1000,
      }),
      prisma.contentBounty.findMany({
        where: { creatorId: profile.userId, tenantId: profile.tenantId || undefined },
        take: 1000,
      }),
    ]);

    const acceptedSubmissions = submissions.filter(s => s.status === 'ACCEPTED');
    const avgScore = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + (s.totalScore || 0), 0) / submissions.length
      : 0;

    res.json({
      success: true,
      data: {
        profile,
        content: {
          totalPublished: profile.totalPublished,
          totalDrafts: profile.totalDrafts,
          bountiesCreated: bounties.length,
        },
        engagement: {
          avgEngagement: profile.avgEngagement,
          totalSubmissions: submissions.length,
          acceptedSubmissions: acceptedSubmissions.length,
          avgSubmissionScore: Math.round(avgScore * 100) / 100,
        },
        tier: {
          current: profile.tier,
          nextTier: getNextTier(profile.tier),
        },
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get creator analytics' });
  }
});

arenaRouter.post('/community/creators/:creatorId/advance', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.creatorProfile.findUnique({ where: { id: req.params.creatorId } });
    if (!profile) {
      res.status(404).json({ success: false, error: 'Creator not found' });
      return;
    }

    const currentIndex = ONBOARDING_PHASES.indexOf(profile.onboardingPhase as any);
    if (currentIndex === -1 || currentIndex >= ONBOARDING_PHASES.length - 1) {
      res.status(400).json({ success: false, error: 'Already at final onboarding phase' });
      return;
    }

    const nextPhase = ONBOARDING_PHASES[currentIndex + 1];
    const updated = await prisma.creatorProfile.update({
      where: { id: req.params.creatorId },
      data: { onboardingPhase: nextPhase },
    });

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to advance onboarding' });
  }
});

arenaRouter.get('/community/creators/:creatorId/checklist', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.creatorProfile.findUnique({ where: { id: req.params.creatorId } });
    if (!profile) {
      res.status(404).json({ success: false, error: 'Creator not found' });
      return;
    }

    const currentIndex = ONBOARDING_PHASES.indexOf(profile.onboardingPhase as any);
    const steps = ONBOARDING_PHASES.map((phase, i) => ({
      phase,
      title: phase.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()),
      isComplete: i <= currentIndex,
      isCurrent: i === currentIndex,
    }));

    res.json({
      success: true,
      data: {
        steps,
        completionPercentage: Math.round(((currentIndex + 1) / ONBOARDING_PHASES.length) * 100),
        nextAction: currentIndex < ONBOARDING_PHASES.length - 1 ? ONBOARDING_PHASES[currentIndex + 1] : null,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get onboarding checklist' });
  }
});

arenaRouter.post('/community/creators/:creatorId/tier-upgrade', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.creatorProfile.findUnique({ where: { id: req.params.creatorId } });
    if (!profile) {
      res.status(404).json({ success: false, error: 'Creator not found' });
      return;
    }

    const next = getNextTier(profile.tier);
    if (!next) {
      res.status(400).json({ success: false, error: 'Already at maximum tier' });
      return;
    }

    const threshold = TIER_THRESHOLDS[next];
    const missing: string[] = [];
    if (profile.totalPublished < threshold.published) {
      missing.push(`Need ${threshold.published - profile.totalPublished} more publications`);
    }
    if (profile.avgEngagement < threshold.engagement) {
      missing.push(`Need ${threshold.engagement} avg engagement (current: ${profile.avgEngagement})`);
    }

    if (missing.length > 0) {
      res.json({ success: true, data: { eligible: false, nextTier: next, missing } });
      return;
    }

    const updated = await prisma.creatorProfile.update({
      where: { id: req.params.creatorId },
      data: { tier: next },
    });

    res.json({ success: true, data: { eligible: true, profile: updated } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to evaluate tier upgrade' });
  }
});

arenaRouter.get('/community/health', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const tenantId = user.tenantId;

    const [
      totalCreators,
      verifiedCreators,
      activeBounties,
      activeCompetitions,
      tokenStats,
    ] = await Promise.all([
      prisma.creatorProfile.count({ where: { tenantId } }),
      prisma.creatorProfile.count({ where: { tenantId, isVerifiedEducator: true } }),
      prisma.contentBounty.count({ where: { tenantId, status: { in: ['PUBLISHED', 'ACCEPTING'] } } }),
      prisma.arenaCompetition.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
      prisma.tokenBalance.aggregate({
        where: { tenantId },
        _sum: { sparks: true, gems: true, voice: true, stakedSparks: true, stakedGems: true },
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        creators: { total: totalCreators, verified: verifiedCreators },
        content: { activeBounties },
        competitions: { active: activeCompetitions },
        economy: {
          totalUsers: tokenStats._count,
          totalSparks: tokenStats._sum.sparks || 0,
          totalGems: tokenStats._sum.gems || 0,
          totalVoice: tokenStats._sum.voice || 0,
          totalStaked: (tokenStats._sum.stakedSparks || 0) + (tokenStats._sum.stakedGems || 0),
        },
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get community health' });
  }
});

// ============================================================================
// Token Economy
// ============================================================================

arenaRouter.get('/tokens/balance', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    let balance = await prisma.tokenBalance.findUnique({
      where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
    });

    if (!balance) {
      balance = await prisma.tokenBalance.create({
        data: { userId: user.id, tenantId: user.tenantId },
      });
    }

    res.json({ success: true, data: balance });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get token balance' });
  }
});

arenaRouter.get('/tokens/history', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { tokenType, page: rawPage, limit: rawLimit } = req.query;
    const page = clampPage(rawPage as string);
    const limit = clampLimit(rawLimit as string, 50, 100);
    const skip = (page - 1) * limit;

    const where = {
      userId: user.id,
      tenantId: user.tenantId,
      ...(tokenType && { tokenType: tokenType as string }),
    };

    const [transactions, total] = await Promise.all([
      prisma.arenaTokenTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.arenaTokenTransaction.count({ where }),
    ]);

    res.json({ success: true, data: { transactions, total } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get transaction history' });
  }
});

arenaRouter.post('/tokens/redeem', async (req: Request, res: Response) => {
  try {
    const params = redeemTokenSchema.parse(req.body);
    const user = req.user!;

    const result = await prisma.$transaction(async (tx) => {
      const balance = await tx.tokenBalance.findUnique({
        where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
      });

      if (!balance) {
        throw new Error('NO_BALANCE');
      }

      const field = params.tokenType.toLowerCase() as 'sparks' | 'gems' | 'voice';
      const currentAmount = balance[field];

      if (currentAmount < params.amount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const updatedBalance = await tx.tokenBalance.update({
        where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
        data: {
          [field]: { decrement: params.amount },
          lastSpentAt: new Date(),
        },
      });

      const transaction = await tx.arenaTokenTransaction.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          tokenType: params.tokenType,
          transactionType: 'SPEND',
          amount: -params.amount,
          balanceBefore: currentAmount,
          balanceAfter: currentAmount - params.amount,
          category: params.category,
        },
      });

      return { transaction, balance: updatedBalance };
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    if (error?.message === 'NO_BALANCE') {
      res.status(404).json({ success: false, error: 'No token balance found' });
      return;
    }
    if (error?.message === 'INSUFFICIENT_BALANCE') {
      res.status(400).json({ success: false, error: 'Insufficient token balance' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to redeem tokens' });
  }
});

arenaRouter.post('/tokens/earn', async (req: Request, res: Response) => {
  try {
    const params = earnTokenSchema.parse(req.body);
    const user = req.user!;

    const result = await prisma.$transaction(async (tx) => {
      const balance = await tx.tokenBalance.upsert({
        where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
        create: { userId: user.id, tenantId: user.tenantId },
        update: {},
      });

      const field = params.tokenType.toLowerCase() as 'sparks' | 'gems' | 'voice';
      const lifetimeField = `lifetime${params.tokenType.charAt(0) + params.tokenType.slice(1).toLowerCase()}Earned` as
        'lifetimeSparksEarned' | 'lifetimeGemsEarned' | 'lifetimeVoiceEarned';

      const updatedBalance = await tx.tokenBalance.update({
        where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
        data: {
          [field]: { increment: params.amount },
          [lifetimeField]: { increment: params.amount },
          lastEarnedAt: new Date(),
        },
      });

      const transaction = await tx.arenaTokenTransaction.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          tokenType: params.tokenType,
          transactionType: 'EARN',
          amount: params.amount,
          balanceBefore: balance[field],
          balanceAfter: balance[field] + params.amount,
          category: params.category,
          referenceId: params.referenceId,
          referenceType: params.referenceType,
        },
      });

      return { transaction, balance: updatedBalance };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to process earning' });
  }
});

arenaRouter.post('/tokens/stake', async (req: Request, res: Response) => {
  try {
    const params = stakeSchema.parse(req.body);
    const user = req.user!;

    const result = await prisma.$transaction(async (tx) => {
      const balance = await tx.tokenBalance.findUnique({
        where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
      });

      const field = params.tokenType.toLowerCase() as 'sparks' | 'gems' | 'voice';
      const stakedField = `staked${params.tokenType.charAt(0) + params.tokenType.slice(1).toLowerCase()}` as
        'stakedSparks' | 'stakedGems' | 'stakedVoice';

      if (!balance || balance[field] < params.amount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      await tx.tokenBalance.update({
        where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
        data: {
          [field]: { decrement: params.amount },
          [stakedField]: { increment: params.amount },
        },
      });

      const lockedUntil = new Date();
      lockedUntil.setDate(lockedUntil.getDate() + params.lockDays);

      const position = await tx.arenaStakePosition.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          poolType: params.poolType,
          poolId: params.poolId,
          tokenType: params.tokenType,
          amount: params.amount,
          lockedUntil,
          status: 'ACTIVE',
        },
      });

      await tx.arenaTokenTransaction.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          tokenType: params.tokenType,
          transactionType: 'STAKE',
          amount: -params.amount,
          balanceBefore: balance[field],
          balanceAfter: balance[field] - params.amount,
          category: params.poolType,
          referenceId: position.id,
          referenceType: 'STAKE_POSITION',
        },
      });

      return position;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    if (error?.message === 'INSUFFICIENT_BALANCE') {
      res.status(400).json({ success: false, error: 'Insufficient token balance' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to stake tokens' });
  }
});

arenaRouter.post('/tokens/unstake', async (req: Request, res: Response) => {
  try {
    const params = unstakeSchema.parse(req.body);
    const user = req.user!;

    const result = await prisma.$transaction(async (tx) => {
      const position = await tx.arenaStakePosition.findUnique({ where: { id: params.positionId } });

      if (!position || position.userId !== user.id) {
        throw new Error('POSITION_NOT_FOUND');
      }
      if (position.status !== 'ACTIVE') {
        throw new Error('POSITION_NOT_ACTIVE');
      }

      const isEarlyWithdrawal = new Date() < position.lockedUntil;
      const penalty = isEarlyWithdrawal ? Math.floor(position.amount * 0.1) : 0;
      const returnAmount = position.amount - penalty + position.yieldAccrued;

      const field = position.tokenType.toLowerCase() as 'sparks' | 'gems' | 'voice';
      const stakedField = `staked${position.tokenType.charAt(0) + position.tokenType.slice(1).toLowerCase()}` as
        'stakedSparks' | 'stakedGems' | 'stakedVoice';

      const balance = await tx.tokenBalance.findUnique({
        where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
      });

      await tx.tokenBalance.update({
        where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
        data: {
          [field]: { increment: returnAmount },
          [stakedField]: { decrement: position.amount },
        },
      });

      await tx.arenaStakePosition.update({
        where: { id: params.positionId },
        data: { status: 'COMPLETED' },
      });

      const transaction = await tx.arenaTokenTransaction.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          tokenType: position.tokenType,
          transactionType: 'UNSTAKE',
          amount: returnAmount,
          balanceBefore: balance ? balance[field] : 0,
          balanceAfter: (balance ? balance[field] : 0) + returnAmount,
          category: position.poolType,
          referenceId: position.id,
          referenceType: 'STAKE_POSITION',
          metadata: { penalty, yieldAccrued: position.yieldAccrued, earlyWithdrawal: isEarlyWithdrawal },
        },
      });

      return { transaction, returnAmount, penalty, yieldAccrued: position.yieldAccrued };
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    if (error?.message === 'POSITION_NOT_FOUND') {
      res.status(404).json({ success: false, error: 'Stake position not found' });
      return;
    }
    if (error?.message === 'POSITION_NOT_ACTIVE') {
      res.status(400).json({ success: false, error: 'Stake position is not active' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to unstake tokens' });
  }
});

arenaRouter.get('/tokens/economy', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const [balanceStats, recentTransactions, activeStakes] = await Promise.all([
      prisma.tokenBalance.aggregate({
        where: { tenantId: user.tenantId },
        _sum: {
          sparks: true, gems: true, voice: true,
          stakedSparks: true, stakedGems: true, stakedVoice: true,
          lifetimeSparksEarned: true, lifetimeGemsEarned: true, lifetimeVoiceEarned: true,
        },
        _count: true,
      }),
      prisma.arenaTokenTransaction.count({
        where: { tenantId: user.tenantId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.arenaStakePosition.aggregate({
        where: { tenantId: user.tenantId, status: 'ACTIVE' },
        _sum: { amount: true, yieldAccrued: true },
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        circulating: {
          sparks: balanceStats._sum.sparks || 0,
          gems: balanceStats._sum.gems || 0,
          voice: balanceStats._sum.voice || 0,
        },
        staked: {
          sparks: balanceStats._sum.stakedSparks || 0,
          gems: balanceStats._sum.stakedGems || 0,
          voice: balanceStats._sum.stakedVoice || 0,
          totalPositions: activeStakes._count,
          totalYieldAccrued: activeStakes._sum.yieldAccrued || 0,
        },
        lifetime: {
          sparksEarned: balanceStats._sum.lifetimeSparksEarned || 0,
          gemsEarned: balanceStats._sum.lifetimeGemsEarned || 0,
          voiceEarned: balanceStats._sum.lifetimeVoiceEarned || 0,
        },
        activeUsers: balanceStats._count,
        transactionsLast24h: recentTransactions,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get economy metrics' });
  }
});

// ============================================================================
// DAO Governance
// ============================================================================

arenaRouter.post('/governance/proposals', async (req: Request, res: Response) => {
  try {
    const params = createProposalSchema.parse(req.body);
    const user = req.user!;

    const votingEndsAt = new Date();
    votingEndsAt.setHours(votingEndsAt.getHours() + params.votingPeriodHours);

    const proposal = await prisma.arenaProposal.create({
      data: {
        tenantId: user.tenantId,
        creatorId: user.id,
        type: params.type,
        title: params.title,
        description: params.description,
        specification: params.specification,
        votingStrategy: params.votingStrategy,
        status: 'ACTIVE',
        votingStartsAt: new Date(),
        votingEndsAt,
        quorumRequired: 0.1,
      },
    });

    res.status(201).json({ success: true, data: proposal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to create proposal' });
  }
});

arenaRouter.get('/governance/proposals', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { status, type, page: rawPage, limit: rawLimit } = req.query;
    const page = clampPage(rawPage as string);
    const limit = clampLimit(rawLimit as string);
    const skip = (page - 1) * limit;

    const where = {
      tenantId: user.tenantId,
      ...(status && { status: status as string }),
      ...(type && { type: type as string }),
    };

    const [proposals, total] = await Promise.all([
      prisma.arenaProposal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { creator: { select: { id: true, displayName: true, avatarUrl: true } } },
      }),
      prisma.arenaProposal.count({ where }),
    ]);

    res.json({ success: true, data: { proposals, total } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to list proposals' });
  }
});

arenaRouter.get('/governance/proposals/:proposalId', async (req: Request, res: Response) => {
  try {
    const proposal = await prisma.arenaProposal.findUnique({
      where: { id: req.params.proposalId },
      include: {
        creator: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { votes: true } },
      },
    });

    if (!proposal) {
      res.status(404).json({ success: false, error: 'Proposal not found' });
      return;
    }

    res.json({ success: true, data: proposal });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get proposal' });
  }
});

arenaRouter.post('/governance/proposals/:proposalId/vote', async (req: Request, res: Response) => {
  try {
    const params = castGovernanceVoteSchema.parse(req.body);
    const user = req.user!;
    const { proposalId } = req.params;

    const proposal = await prisma.arenaProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) {
      res.status(404).json({ success: false, error: 'Proposal not found' });
      return;
    }
    if (proposal.status !== 'ACTIVE' && proposal.status !== 'QUORUM_REACHED') {
      res.status(400).json({ success: false, error: 'Proposal is not open for voting' });
      return;
    }
    if (proposal.votingEndsAt && new Date() > proposal.votingEndsAt) {
      res.status(400).json({ success: false, error: 'Voting period has ended' });
      return;
    }

    // Calculate weight based on strategy
    const voiceAmount = params.voiceAmount || 1;
    let weight = voiceAmount;
    if (proposal.votingStrategy === 'QUADRATIC') {
      weight = Math.floor(Math.sqrt(voiceAmount));
    }

    const result = await prisma.$transaction(async (tx) => {
      const vote = await tx.arenaVote.create({
        data: {
          proposalId,
          voterId: user.id,
          tenantId: user.tenantId,
          choice: params.choice,
          weight,
          voiceSpent: voiceAmount,
          reason: params.reason,
        },
      });

      const incrementField =
        params.choice === 'FOR' ? 'votesFor' :
        params.choice === 'AGAINST' ? 'votesAgainst' : 'votesAbstain';

      const updated = await tx.arenaProposal.update({
        where: { id: proposalId },
        data: {
          [incrementField]: { increment: weight },
          totalVoters: { increment: 1 },
        },
      });

      return { vote, proposal: updated };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Already voted on this proposal' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to cast vote' });
  }
});

arenaRouter.post('/governance/proposals/:proposalId/finalise', async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;

    const proposal = await prisma.arenaProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) {
      res.status(404).json({ success: false, error: 'Proposal not found' });
      return;
    }
    if (proposal.status !== 'ACTIVE' && proposal.status !== 'QUORUM_REACHED') {
      res.status(400).json({ success: false, error: 'Proposal cannot be finalised from current status' });
      return;
    }

    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
    const passThreshold = proposal.votingStrategy === 'SUPERMAJORITY' ? 0.67 : 0.5;
    const votesExcludingAbstain = proposal.votesFor + proposal.votesAgainst;

    const passed = votesExcludingAbstain > 0 && (proposal.votesFor / votesExcludingAbstain) >= passThreshold;
    const status = totalVotes === 0 ? 'EXPIRED' : passed ? 'PASSED' : 'FAILED';

    const executionAt = passed ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined; // 24h timelock

    const updated = await prisma.arenaProposal.update({
      where: { id: proposalId },
      data: { status, executionAt },
    });

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to finalise proposal' });
  }
});

arenaRouter.post('/governance/proposals/:proposalId/execute', async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;

    const proposal = await prisma.arenaProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) {
      res.status(404).json({ success: false, error: 'Proposal not found' });
      return;
    }
    if (proposal.status !== 'PASSED') {
      res.status(400).json({ success: false, error: 'Only passed proposals can be executed' });
      return;
    }
    if (proposal.executionAt && new Date() < proposal.executionAt) {
      res.status(400).json({ success: false, error: 'Timelock has not expired yet' });
      return;
    }

    const txOps: any[] = [
      prisma.arenaProposal.update({ where: { id: proposalId }, data: { status: 'EXECUTED' } }),
    ];

    // If treasury spend, create a treasury transaction
    if (proposal.type === 'TREASURY_SPEND' && proposal.specification) {
      const spec = proposal.specification as any;
      if (spec.tokenType && spec.amount) {
        const balanceField = `${spec.tokenType.toLowerCase()}Balance` as 'sparksBalance' | 'gemsBalance' | 'voiceBalance';
        txOps.push(
          prisma.daoTreasury.update({
            where: { tenantId: proposal.tenantId },
            data: {
              [balanceField]: { decrement: spec.amount },
              totalSpent: { increment: spec.amount },
            },
          }),
          prisma.daoTreasuryTransaction.create({
            data: {
              tenantId: proposal.tenantId,
              proposalId,
              tokenType: spec.tokenType,
              amount: spec.amount,
              direction: 'OUTFLOW',
              description: proposal.title,
            },
          }),
        );
      }
    }

    await prisma.$transaction(txOps);

    res.json({ success: true, data: { proposalId, status: 'EXECUTED' } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to execute proposal' });
  }
});

arenaRouter.get('/governance/proposals/:proposalId/votes', async (req: Request, res: Response) => {
  try {
    const { page: rawPage, limit: rawLimit } = req.query;
    const page = clampPage(rawPage as string);
    const limit = clampLimit(rawLimit as string, 50, 100);
    const skip = (page - 1) * limit;

    const votes = await prisma.arenaVote.findMany({
      where: { proposalId: req.params.proposalId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { voter: { select: { id: true, displayName: true, avatarUrl: true } } },
    });

    res.json({ success: true, data: votes });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get votes' });
  }
});

arenaRouter.post('/governance/delegations', async (req: Request, res: Response) => {
  try {
    const params = delegateSchema.parse(req.body);
    const user = req.user!;

    if (params.delegateId === user.id) {
      res.status(400).json({ success: false, error: 'Cannot delegate to yourself' });
      return;
    }

    // Check for circular delegation
    const existing = await prisma.arenaDelegation.findFirst({
      where: { delegatorId: params.delegateId, delegateId: user.id, isActive: true },
    });
    if (existing) {
      res.status(400).json({ success: false, error: 'Circular delegation detected' });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + params.durationDays);

    const delegation = await prisma.arenaDelegation.create({
      data: {
        delegatorId: user.id,
        delegateId: params.delegateId,
        tenantId: user.tenantId,
        proposalTypes: params.proposalTypes,
        voiceAmount: params.voiceAmount,
        expiresAt,
        isActive: true,
      },
    });

    res.status(201).json({ success: true, data: delegation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to create delegation' });
  }
});

arenaRouter.delete('/governance/delegations/:delegationId', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const delegation = await prisma.arenaDelegation.findUnique({ where: { id: req.params.delegationId } });
    if (!delegation) {
      res.status(404).json({ success: false, error: 'Delegation not found' });
      return;
    }
    if (delegation.delegatorId !== user.id) {
      res.status(403).json({ success: false, error: 'Only the delegator can revoke a delegation' });
      return;
    }

    await prisma.arenaDelegation.update({ where: { id: req.params.delegationId }, data: { isActive: false } });

    res.json({ success: true, data: { revoked: true } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to revoke delegation' });
  }
});

arenaRouter.get('/governance/delegations', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const delegations = await prisma.arenaDelegation.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        OR: [{ delegatorId: user.id }, { delegateId: user.id }],
      },
      include: {
        delegator: { select: { id: true, displayName: true } },
        delegate: { select: { id: true, displayName: true } },
      },
      take: 100,
    });

    res.json({ success: true, data: delegations });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get delegations' });
  }
});

arenaRouter.get('/governance/treasury', async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const treasury = await prisma.daoTreasury.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId },
      update: {},
    });

    res.json({ success: true, data: treasury });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get treasury' });
  }
});

arenaRouter.get('/governance/treasury/transactions', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { page: rawPage, limit: rawLimit } = req.query;
    const page = clampPage(rawPage as string);
    const limit = clampLimit(rawLimit as string);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.daoTreasuryTransaction.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.daoTreasuryTransaction.count({ where: { tenantId: user.tenantId } }),
    ]);

    res.json({ success: true, data: { transactions, total } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get treasury transactions' });
  }
});

arenaRouter.get('/governance/stats', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const tenantId = user.tenantId;

    const [
      totalProposals,
      activeProposals,
      passedProposals,
      totalVotesCast,
      uniqueVoters,
      treasury,
    ] = await Promise.all([
      prisma.arenaProposal.count({ where: { tenantId } }),
      prisma.arenaProposal.count({ where: { tenantId, status: { in: ['ACTIVE', 'QUORUM_REACHED'] } } }),
      prisma.arenaProposal.count({ where: { tenantId, status: 'PASSED' } }),
      prisma.arenaVote.count({ where: { tenantId } }),
      prisma.arenaVote.groupBy({ by: ['voterId'], where: { tenantId } }).then(g => g.length),
      prisma.daoTreasury.findUnique({ where: { tenantId } }),
    ]);

    res.json({
      success: true,
      data: {
        totalProposals,
        activeProposals,
        passedProposals,
        totalVotesCast,
        uniqueVoters,
        treasury: treasury ? {
          sparks: treasury.sparksBalance,
          gems: treasury.gemsBalance,
          voice: treasury.voiceBalance,
          totalAllocated: treasury.totalAllocated,
          totalSpent: treasury.totalSpent,
        } : null,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get governance stats' });
  }
});

// ============================================================================
// Content Bounties
// ============================================================================

arenaRouter.get('/bounties', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { status, category, page: rawPage, limit: rawLimit } = req.query;
    const page = clampPage(rawPage as string);
    const limit = clampLimit(rawLimit as string);
    const skip = (page - 1) * limit;

    const where = {
      tenantId: user.tenantId,
      ...(status && { status: status as string }),
      ...(category && { category: category as string }),
    };

    const [bounties, total] = await Promise.all([
      prisma.contentBounty.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contentBounty.count({ where }),
    ]);

    res.json({ success: true, data: { bounties, total } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to list bounties' });
  }
});

arenaRouter.post('/bounties', async (req: Request, res: Response) => {
  try {
    const params = createBountySchema.parse(req.body);
    const user = req.user!;

    const bounty = await prisma.contentBounty.create({
      data: {
        tenantId: user.tenantId,
        creatorId: user.id,
        category: params.category,
        title: params.title,
        description: params.description,
        requirements: params.requirements,
        reward: params.reward,
        submissionDeadline: new Date(params.submissionDeadline),
        judgingDeadline: params.judgingDeadline ? new Date(params.judgingDeadline) : null,
        maxSubmissions: params.maxSubmissions,
        eligibleTiers: params.eligibleTiers,
        tags: params.tags,
        status: 'PUBLISHED',
      },
    });

    res.status(201).json({ success: true, data: bounty });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to create bounty' });
  }
});

arenaRouter.get('/bounties/:bountyId', async (req: Request, res: Response) => {
  try {
    const bounty = await prisma.contentBounty.findUnique({
      where: { id: req.params.bountyId },
      include: { _count: { select: { submissions: true } } },
    });

    if (!bounty) {
      res.status(404).json({ success: false, error: 'Bounty not found' });
      return;
    }

    res.json({ success: true, data: bounty });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get bounty' });
  }
});

arenaRouter.get('/bounties/:bountyId/submissions', async (req: Request, res: Response) => {
  try {
    const { page: rawPage, limit: rawLimit } = req.query;
    const page = clampPage(rawPage as string);
    const limit = clampLimit(rawLimit as string);
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      prisma.bountySubmission.findMany({
        where: { bountyId: req.params.bountyId },
        orderBy: { totalScore: 'desc' },
        skip,
        take: limit,
        include: { creator: { select: { id: true, displayName: true, avatarUrl: true } } },
      }),
      prisma.bountySubmission.count({ where: { bountyId: req.params.bountyId } }),
    ]);

    res.json({ success: true, data: { submissions, total } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get submissions' });
  }
});

arenaRouter.post('/bounties/:bountyId/submit', async (req: Request, res: Response) => {
  try {
    const params = submitBountySchema.parse(req.body);
    const user = req.user!;
    const { bountyId } = req.params;

    const bounty = await prisma.contentBounty.findUnique({ where: { id: bountyId } });

    if (!bounty) {
      res.status(404).json({ success: false, error: 'Bounty not found' });
      return;
    }

    if (bounty.status !== 'PUBLISHED' && bounty.status !== 'ACCEPTING') {
      res.status(400).json({ success: false, error: 'Bounty is not accepting submissions' });
      return;
    }

    if (bounty.currentSubmissions >= bounty.maxSubmissions) {
      res.status(400).json({ success: false, error: 'Maximum submissions reached' });
      return;
    }

    const [submission] = await prisma.$transaction([
      prisma.bountySubmission.create({
        data: {
          bountyId,
          creatorId: user.id,
          tenantId: user.tenantId,
          storyId: params.storyId,
          status: 'SUBMITTED',
        },
      }),
      prisma.contentBounty.update({
        where: { id: bountyId },
        data: { currentSubmissions: { increment: 1 } },
      }),
    ]);

    res.status(201).json({ success: true, data: submission });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to submit to bounty' });
  }
});

arenaRouter.post('/bounties/:bountyId/judging', async (req: Request, res: Response) => {
  try {
    const { bountyId } = req.params;

    const bounty = await prisma.contentBounty.findUnique({ where: { id: bountyId } });
    if (!bounty) {
      res.status(404).json({ success: false, error: 'Bounty not found' });
      return;
    }
    if (bounty.status !== 'PUBLISHED' && bounty.status !== 'ACCEPTING') {
      res.status(400).json({ success: false, error: 'Bounty is not in a state to start judging' });
      return;
    }

    await prisma.$transaction([
      prisma.contentBounty.update({ where: { id: bountyId }, data: { status: 'JUDGING' } }),
      prisma.bountySubmission.updateMany({
        where: { bountyId, status: 'SUBMITTED' },
        data: { status: 'UNDER_REVIEW' },
      }),
    ]);

    res.json({ success: true, data: { bountyId, status: 'JUDGING' } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to start judging' });
  }
});

arenaRouter.post('/bounties/:bountyId/award', async (req: Request, res: Response) => {
  try {
    const params = awardBountySchema.parse(req.body);
    const { bountyId } = req.params;

    const bounty = await prisma.contentBounty.findUnique({ where: { id: bountyId } });
    if (!bounty) {
      res.status(404).json({ success: false, error: 'Bounty not found' });
      return;
    }
    if (bounty.status !== 'JUDGING') {
      res.status(400).json({ success: false, error: 'Bounty must be in judging state to award' });
      return;
    }

    const reward = bounty.reward as any;
    const rewardAmount = reward?.amount || 50;
    const rewardTokenType = reward?.tokenType || 'SPARKS';
    const field = rewardTokenType.toLowerCase() as 'sparks' | 'gems' | 'voice';

    const winnerShare = Math.floor(rewardAmount / params.winnerIds.length);
    const runnerUpShare = Math.floor(winnerShare * 0.1);

    const txOps: any[] = [
      prisma.contentBounty.update({ where: { id: bountyId }, data: { status: 'COMPLETED' } }),
    ];

    // Update winner submissions
    for (const winnerId of params.winnerIds) {
      txOps.push(
        prisma.bountySubmission.updateMany({
          where: { bountyId, creatorId: winnerId },
          data: { status: 'ACCEPTED', reviewedAt: new Date() },
        }),
        prisma.tokenBalance.upsert({
          where: { tenantId_userId: { tenantId: bounty.tenantId, userId: winnerId } },
          create: { userId: winnerId, tenantId: bounty.tenantId, [field]: winnerShare },
          update: { [field]: { increment: winnerShare } },
        }),
      );
    }

    // Update runner-up submissions
    for (const runnerUpId of params.runnerUpIds) {
      txOps.push(
        prisma.bountySubmission.updateMany({
          where: { bountyId, creatorId: runnerUpId },
          data: { status: 'RUNNER_UP', reviewedAt: new Date() },
        }),
        prisma.tokenBalance.upsert({
          where: { tenantId_userId: { tenantId: bounty.tenantId, userId: runnerUpId } },
          create: { userId: runnerUpId, tenantId: bounty.tenantId, [field]: runnerUpShare },
          update: { [field]: { increment: runnerUpShare } },
        }),
      );
    }

    await prisma.$transaction(txOps);

    res.json({
      success: true,
      data: {
        bountyId,
        status: 'COMPLETED',
        winnersRewarded: params.winnerIds.length,
        runnerUpsRewarded: params.runnerUpIds.length,
        totalTokensDistributed: (winnerShare * params.winnerIds.length) + (runnerUpShare * params.runnerUpIds.length),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to award bounty' });
  }
});

// ============================================================================
// Pilot Arena
// ============================================================================

arenaRouter.get('/pilot/status', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'active',
      format: 'students_vs_teachers',
      teacherHandicap: 1.5,
      milestones: [
        { id: 'first-book', name: 'First Book', badge: 'reader' },
        { id: 'bookworm', name: 'Bookworm', badge: '5-books' },
        { id: 'champion', name: 'Reading Champion', badge: '10-books' },
      ],
    },
  });
});
