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

const TOURNAMENT_FORMATS = [
  'SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN',
  'SWISS', 'LEAGUE', 'SPEED_ROUND', 'ACCURACY_CHALLENGE', 'PHONICS_BEE',
] as const;

// ============================================================================
// Zod Schemas
// ============================================================================

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
        status: 'REGISTRATION_OPEN',
      },
    });

    res.status(201).json({ success: true, data: competition });
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
    const { status, format, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

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
        take: parseInt(limit as string),
      }),
      prisma.arenaCompetition.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        competitions,
        pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total },
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to list competitions' });
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
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [tournaments, total] = await Promise.all([
      prisma.arenaCompetition.findMany({
        where: {
          tenantId: user.tenantId,
          format: { in: [...TOURNAMENT_FORMATS] },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
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
    const { type, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

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
        take: parseInt(limit as string),
        include: { members: { where: { isActive: true }, select: { userId: true, role: true } } },
      }),
      prisma.arenaTeam.count({ where }),
    ]);

    res.json({ success: true, data: { teams, total } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to list teams' });
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

// ============================================================================
// Community Dashboard
// ============================================================================

arenaRouter.get('/community/leaderboards', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { type = 'sparks', limit = '20' } = req.query;

    const orderField = type === 'gems' ? 'gems' : type === 'voice' ? 'voice' : 'sparks';

    const entries = await prisma.tokenBalance.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { [orderField]: 'desc' },
      take: parseInt(limit as string),
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
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [recentCompetitions, recentBounties] = await Promise.all([
      prisma.arenaCompetition.findMany({
        where: { tenantId: user.tenantId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: Math.ceil(take / 2),
        skip,
      }),
      prisma.contentBounty.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(take / 2),
        skip,
      }),
    ]);

    const feed = [
      ...recentCompetitions.map(c => ({ type: 'competition' as const, data: c, timestamp: c.completedAt || c.createdAt })),
      ...recentBounties.map(b => ({ type: 'bounty' as const, data: b, timestamp: b.createdAt })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    res.json({ success: true, data: { feed, hasMore: feed.length === take } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to get community feed' });
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
    const { tokenType, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

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
        take: parseInt(limit as string),
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

// ============================================================================
// Content Bounties
// ============================================================================

arenaRouter.get('/bounties', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { status, category, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

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
        take: parseInt(limit as string),
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
