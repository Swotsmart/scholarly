/**
 * Arena & Gamification Routes - Unit Tests
 *
 * Tests for competitive learning arena, tournaments, teams,
 * community features, bounties, DAO governance, and token economy.
 *
 * 65 route handlers, ~120 test cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@scholarly/database';
import { testUtils } from '../../test/setup';
import {
  createTestCompetition,
  createTestParticipant,
  createTestTeam,
  createTestTeamMember,
  createTestTokenBalance,
  createTestTokenTransaction,
  createTestStakePosition,
  createTestProposal,
  createTestVote,
  createTestDelegation,
  createTestBounty,
  createTestBountySubmission,
  createTestTreasuryVote,
  createTestTeamTrade,
  createTestTeamChallenge,
  createTestCreatorProfile,
  createTestDaoTreasury,
} from '../../test/factories/arena.factory';
import { arenaRouter } from '../arena';

// ---------------------------------------------------------------------------
// Helper: extract the final route handler from Express Router stack
// ---------------------------------------------------------------------------
function getHandler(method: string, path: string) {
  const layer = (arenaRouter as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods[method],
  );
  if (!layer) {
    throw new Error(`No handler found for ${method.toUpperCase()} ${path}`);
  }
  const handlers = layer.route.stack;
  return handlers[handlers.length - 1].handle;
}

// ---------------------------------------------------------------------------
// Shared user context
// ---------------------------------------------------------------------------
const defaultUser = { id: 'user_1', tenantId: 'tenant_1', roles: ['learner'] };

// ---------------------------------------------------------------------------
// Add missing Prisma model mocks that are not in the global setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  // The global setup already mocks @scholarly/database, but we need arena-specific
  // models. We attach them as vi.fn() if they don't exist yet.
  const models = [
    'arenaCompetition', 'arenaParticipant', 'arenaTeam', 'arenaTeamMember',
    'arenaTeamTrade', 'arenaTeamChallenge', 'arenaTreasuryVote', 'arenaTreasuryVoteCast',
    'arenaTokenTransaction', 'arenaStakePosition', 'arenaProposal', 'arenaVote',
    'arenaDelegation', 'tokenBalance', 'contentBounty', 'bountySubmission',
    'creatorProfile', 'daoTreasury', 'daoTreasuryTransaction',
  ];

  const methods = [
    'findUnique', 'findFirst', 'findMany', 'create', 'update', 'updateMany',
    'delete', 'count', 'upsert', 'aggregate', 'groupBy',
  ];

  for (const model of models) {
    if (!(prisma as any)[model]) {
      (prisma as any)[model] = {};
    }
    for (const method of methods) {
      if (!(prisma as any)[model][method]) {
        (prisma as any)[model][method] = vi.fn();
      }
    }
  }

  // $transaction — supports both array-style and callback-style
  (prisma as any).$transaction = vi.fn(async (input: any) => {
    if (typeof input === 'function') {
      // Create a proxy that mimics the tx object by forwarding to prisma mocks
      return input(prisma);
    }
    // Array of promises
    const results = await Promise.all(input);
    return results;
  });
});

// ============================================================================
// COMPETITIONS
// ============================================================================
describe('Arena Routes - Competitions', () => {
  // ---------- POST /competitions ----------
  describe('POST /competitions', () => {
    const handler = getHandler('post', '/competitions');

    it('should create a competition with valid data', async () => {
      const comp = createTestCompetition();
      vi.mocked((prisma as any).arenaCompetition.create).mockResolvedValue(comp);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: {
          format: 'READING_SPRINT',
          title: 'My Reading Sprint',
          scoringModel: 'GROWTH_BASED',
          maxParticipants: 20,
          durationMinutes: 30,
          totalRounds: 3,
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ id: comp.id, title: comp.title, format: comp.format }),
      }));
    });

    it('should return 400 for invalid body', async () => {
      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { format: 'INVALID_FORMAT', title: 'ab' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  // ---------- GET /competitions ----------
  describe('GET /competitions', () => {
    const handler = getHandler('get', '/competitions');

    it('should list competitions with pagination', async () => {
      const comp = createTestCompetition();
      vi.mocked((prisma as any).arenaCompetition.findMany).mockResolvedValue([comp]);
      vi.mocked((prisma as any).arenaCompetition.count).mockResolvedValue(1);

      const req = testUtils.mockRequest({
        user: defaultUser,
        query: { page: '1', limit: '20' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            competitions: [comp],
            pagination: { page: 1, limit: 20, total: 1 },
          }),
        }),
      );
    });
  });

  // ---------- GET /competitions/user-stats ----------
  describe('GET /competitions/user-stats', () => {
    const handler = getHandler('get', '/competitions/user-stats');

    it('should return user competition statistics', async () => {
      const participant = {
        ...createTestParticipant({ totalScore: 80, rank: 1, status: 'COMPLETED' }),
        competition: { format: 'READING_SPRINT', status: 'COMPLETED' },
      };
      vi.mocked((prisma as any).arenaParticipant.findMany).mockResolvedValue([participant]);

      const req = testUtils.mockRequest({ user: defaultUser });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalCompetitions: 1,
            wins: 1,
          }),
        }),
      );
    });
  });

  // ---------- GET /competitions/:competitionId ----------
  describe('GET /competitions/:competitionId', () => {
    const handler = getHandler('get', '/competitions/:competitionId');

    it('should return a competition by ID', async () => {
      const comp = { ...createTestCompetition({ id: 'comp_1' }), participants: [] };
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(comp);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: 'comp_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: comp }));
    });

    it('should return 404 for non-existent competition', async () => {
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: 'comp_missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Competition not found' }),
      );
    });
  });

  // ---------- POST /competitions/:competitionId/join ----------
  describe('POST /competitions/:competitionId/join', () => {
    const handler = getHandler('post', '/competitions/:competitionId/join');

    it('should join an open competition', async () => {
      const comp = createTestCompetition({ id: 'comp_1', status: 'REGISTRATION_OPEN' });
      const participant = createTestParticipant();
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(comp);
      vi.mocked((prisma as any).arenaParticipant.create).mockResolvedValue(participant);
      vi.mocked((prisma as any).arenaCompetition.update).mockResolvedValue(comp);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: 'comp_1' },
        body: {},
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if competition does not exist', async () => {
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: 'comp_missing' },
        body: {},
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if competition is not open for registration', async () => {
      const comp = createTestCompetition({ status: 'IN_PROGRESS' });
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(comp);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: comp.id },
        body: {},
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Competition is not open for registration' }),
      );
    });

    it('should return 409 for duplicate join (P2002)', async () => {
      const comp = createTestCompetition({ status: 'REGISTRATION_OPEN' });
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(comp);
      (prisma as any).$transaction.mockRejectedValue({ code: 'P2002' });

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: comp.id },
        body: {},
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  // ---------- GET /competitions/:competitionId/leaderboard ----------
  describe('GET /competitions/:competitionId/leaderboard', () => {
    const handler = getHandler('get', '/competitions/:competitionId/leaderboard');

    it('should return leaderboard entries', async () => {
      const entry = {
        ...createTestParticipant({ totalScore: 100 }),
        user: { id: 'user_1', displayName: 'Test', avatarUrl: null },
      };
      vi.mocked((prisma as any).arenaParticipant.findMany).mockResolvedValue([entry]);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: 'comp_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ competitionId: 'comp_1' }),
        }),
      );
    });
  });

  // ---------- POST /competitions/:competitionId/start ----------
  describe('POST /competitions/:competitionId/start', () => {
    const handler = getHandler('post', '/competitions/:competitionId/start');

    it('should start a competition in REGISTRATION_OPEN status', async () => {
      const comp = createTestCompetition({ id: 'comp_1', status: 'REGISTRATION_OPEN' });
      const updatedComp = { ...comp, status: 'IN_PROGRESS', currentRound: 1 };
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(comp);
      vi.mocked((prisma as any).arenaCompetition.update).mockResolvedValue(updatedComp);
      vi.mocked((prisma as any).arenaParticipant.updateMany).mockResolvedValue({ count: 5 });

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: 'comp_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 for non-existent competition', async () => {
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if competition cannot be started', async () => {
      const comp = createTestCompetition({ status: 'COMPLETED' });
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(comp);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: comp.id },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- POST /competitions/:competitionId/rounds/submit ----------
  describe('POST /competitions/:competitionId/rounds/submit', () => {
    const handler = getHandler('post', '/competitions/:competitionId/rounds/submit');

    it('should submit a round score', async () => {
      const comp = createTestCompetition({ id: 'comp_1', status: 'IN_PROGRESS', currentRound: 1 });
      const participant = createTestParticipant({ id: 'part_1', roundScores: [], totalScore: 0 });
      const updated = { ...participant, totalScore: 55, roundScores: [{ round: 1 }] };

      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(comp);
      vi.mocked((prisma as any).arenaParticipant.findFirst).mockResolvedValue(participant);
      vi.mocked((prisma as any).arenaParticipant.update).mockResolvedValue(updated);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: 'comp_1' },
        body: { accuracy: 90, wcpm: 120, comprehensionScore: 85 },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('should return 400 for invalid round submission body', async () => {
      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: 'comp_1' },
        body: { accuracy: 200, wcpm: -1 },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if not a participant', async () => {
      const comp = createTestCompetition({ status: 'IN_PROGRESS', currentRound: 1 });
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(comp);
      vi.mocked((prisma as any).arenaParticipant.findFirst).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: comp.id },
        body: { accuracy: 80, wcpm: 100 },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Not a participant in this competition' }),
      );
    });
  });

  // ---------- POST /competitions/:competitionId/advance ----------
  describe('POST /competitions/:competitionId/advance', () => {
    const handler = getHandler('post', '/competitions/:competitionId/advance');

    it('should advance to next round', async () => {
      const comp = createTestCompetition({
        id: 'comp_1',
        status: 'IN_PROGRESS',
        currentRound: 1,
        totalRounds: 3,
      });
      const updated = { ...comp, currentRound: 2 };
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(comp);
      vi.mocked((prisma as any).arenaCompetition.update).mockResolvedValue(updated);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: 'comp_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should auto-complete when all rounds finished', async () => {
      const comp = createTestCompetition({
        id: 'comp_1',
        status: 'IN_PROGRESS',
        currentRound: 3,
        totalRounds: 3,
      });
      const participants = [
        createTestParticipant({ id: 'p1', totalScore: 100 }),
        createTestParticipant({ id: 'p2', totalScore: 80 }),
      ];
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(comp);
      vi.mocked((prisma as any).arenaParticipant.findMany).mockResolvedValue(participants);
      vi.mocked((prisma as any).arenaCompetition.update).mockResolvedValue({ ...comp, status: 'COMPLETED' });
      vi.mocked((prisma as any).arenaParticipant.update).mockResolvedValue({});

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: 'comp_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });
  });

  // ---------- POST /competitions/:competitionId/complete ----------
  describe('POST /competitions/:competitionId/complete', () => {
    const handler = getHandler('post', '/competitions/:competitionId/complete');

    it('should complete a competition and rank participants', async () => {
      const comp = createTestCompetition({
        id: 'comp_1',
        status: 'IN_PROGRESS',
        wagerPool: 0,
      });
      const participants = [
        createTestParticipant({ id: 'p1', userId: 'u1', totalScore: 100 }),
      ];

      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(comp);
      vi.mocked((prisma as any).arenaParticipant.findMany).mockResolvedValue(participants);
      vi.mocked((prisma as any).arenaCompetition.update).mockResolvedValue({ ...comp, status: 'COMPLETED' });
      vi.mocked((prisma as any).arenaParticipant.update).mockResolvedValue({});

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: 'comp_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('should return 400 if competition is not in progress', async () => {
      const comp = createTestCompetition({ status: 'REGISTRATION_OPEN' });
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(comp);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { competitionId: comp.id },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

// ============================================================================
// TOURNAMENTS
// ============================================================================
describe('Arena Routes - Tournaments', () => {
  // ---------- POST /tournaments ----------
  describe('POST /tournaments', () => {
    const handler = getHandler('post', '/tournaments');

    it('should create a tournament', async () => {
      const tournament = createTestCompetition({ format: 'ROUND_ROBIN' });
      vi.mocked((prisma as any).arenaCompetition.create).mockResolvedValue(tournament);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: {
          name: 'Phonics Bee Championship',
          format: 'ROUND_ROBIN',
          maxParticipants: 16,
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 for invalid tournament format', async () => {
      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { name: 'Bad', format: 'NOT_A_FORMAT' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- GET /tournaments ----------
  describe('GET /tournaments', () => {
    const handler = getHandler('get', '/tournaments');

    it('should list tournaments', async () => {
      const tournament = createTestCompetition({ format: 'SWISS' });
      vi.mocked((prisma as any).arenaCompetition.findMany).mockResolvedValue([tournament]);
      vi.mocked((prisma as any).arenaCompetition.count).mockResolvedValue(1);

      const req = testUtils.mockRequest({
        user: defaultUser,
        query: { page: '1', limit: '20' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ tournaments: [tournament], total: 1 }),
        }),
      );
    });
  });

  // ---------- GET /tournaments/:tournamentId ----------
  describe('GET /tournaments/:tournamentId', () => {
    const handler = getHandler('get', '/tournaments/:tournamentId');

    it('should return a tournament by ID', async () => {
      const tournament = { ...createTestCompetition({ id: 'tourney_1' }), participants: [] };
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(tournament);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { tournamentId: 'tourney_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: tournament }));
    });

    it('should return 404 for missing tournament', async () => {
      vi.mocked((prisma as any).arenaCompetition.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { tournamentId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});

// ============================================================================
// TEAMS
// ============================================================================
describe('Arena Routes - Teams', () => {
  // ---------- POST /teams ----------
  describe('POST /teams', () => {
    const handler = getHandler('post', '/teams');

    it('should create a team and add creator as captain', async () => {
      const team = createTestTeam();
      vi.mocked((prisma as any).arenaTeam.create).mockResolvedValue(team);
      vi.mocked((prisma as any).arenaTeamMember.create).mockResolvedValue(
        createTestTeamMember({ role: 'CAPTAIN' }),
      );

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: {
          name: 'Reading Rockets',
          type: 'CLASSROOM',
          maxMembers: 10,
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 for invalid team data', async () => {
      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { name: 'ab', type: 'INVALID_TYPE' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- GET /teams ----------
  describe('GET /teams', () => {
    const handler = getHandler('get', '/teams');

    it('should list active teams', async () => {
      const team = { ...createTestTeam(), members: [] };
      vi.mocked((prisma as any).arenaTeam.findMany).mockResolvedValue([team]);
      vi.mocked((prisma as any).arenaTeam.count).mockResolvedValue(1);

      const req = testUtils.mockRequest({
        user: defaultUser,
        query: { page: '1', limit: '20' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ teams: [team], total: 1 }),
        }),
      );
    });
  });

  // ---------- GET /teams/my ----------
  describe('GET /teams/my', () => {
    const handler = getHandler('get', '/teams/my');

    it('should return the user teams with role', async () => {
      const membership = {
        ...createTestTeamMember({ role: 'CAPTAIN' }),
        team: createTestTeam(),
      };
      vi.mocked((prisma as any).arenaTeamMember.findMany).mockResolvedValue([membership]);

      const req = testUtils.mockRequest({ user: defaultUser });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([expect.objectContaining({ myRole: 'CAPTAIN' })]),
        }),
      );
    });
  });

  // ---------- GET /teams/leaderboard ----------
  describe('GET /teams/leaderboard', () => {
    const handler = getHandler('get', '/teams/leaderboard');

    it('should return ranked teams', async () => {
      const teams = [createTestTeam({ xp: 200 }), createTestTeam({ xp: 100 })];
      vi.mocked((prisma as any).arenaTeam.findMany).mockResolvedValue(teams);

      const req = testUtils.mockRequest({ user: defaultUser, query: { limit: '50' } });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            teams: expect.arrayContaining([expect.objectContaining({ rank: 1 })]),
          }),
        }),
      );
    });
  });

  // ---------- GET /teams/:teamId ----------
  describe('GET /teams/:teamId', () => {
    const handler = getHandler('get', '/teams/:teamId');

    it('should return a team by ID', async () => {
      const team = { ...createTestTeam({ id: 'team_1' }), members: [] };
      vi.mocked((prisma as any).arenaTeam.findUnique).mockResolvedValue(team);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: team }));
    });

    it('should return 404 for missing team', async () => {
      vi.mocked((prisma as any).arenaTeam.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---------- GET /teams/:teamId/members ----------
  describe('GET /teams/:teamId/members', () => {
    const handler = getHandler('get', '/teams/:teamId/members');

    it('should return active team members', async () => {
      const member = createTestTeamMember();
      vi.mocked((prisma as any).arenaTeamMember.findMany).mockResolvedValue([member]);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: [member] }),
      );
    });
  });

  // ---------- POST /teams/:teamId/members ----------
  describe('POST /teams/:teamId/members', () => {
    const handler = getHandler('post', '/teams/:teamId/members');

    it('should add a member to a team', async () => {
      const team = createTestTeam({ id: 'team_1', memberCount: 3, maxMembers: 10 });
      const member = createTestTeamMember();
      vi.mocked((prisma as any).arenaTeam.findUnique).mockResolvedValue(team);
      vi.mocked((prisma as any).arenaTeamMember.create).mockResolvedValue(member);
      vi.mocked((prisma as any).arenaTeam.update).mockResolvedValue({ ...team, memberCount: 4 });

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
        body: { userId: 'user_2', role: 'MEMBER' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 if team does not exist', async () => {
      vi.mocked((prisma as any).arenaTeam.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'missing' },
        body: { userId: 'user_2' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if team is full', async () => {
      const team = createTestTeam({ memberCount: 10, maxMembers: 10 });
      vi.mocked((prisma as any).arenaTeam.findUnique).mockResolvedValue(team);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: team.id },
        body: { userId: 'user_2' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Team is full' }),
      );
    });

    it('should return 409 for duplicate member (P2002)', async () => {
      const team = createTestTeam({ memberCount: 3, maxMembers: 10 });
      vi.mocked((prisma as any).arenaTeam.findUnique).mockResolvedValue(team);
      (prisma as any).$transaction.mockRejectedValue({ code: 'P2002' });

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: team.id },
        body: { userId: 'user_2' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  // ---------- POST /teams/:teamId/leave ----------
  describe('POST /teams/:teamId/leave', () => {
    const handler = getHandler('post', '/teams/:teamId/leave');

    it('should leave a team', async () => {
      const member = createTestTeamMember({ role: 'MEMBER' });
      vi.mocked((prisma as any).arenaTeamMember.findFirst).mockResolvedValue(member);
      vi.mocked((prisma as any).arenaTeamMember.update).mockResolvedValue({});
      vi.mocked((prisma as any).arenaTeam.update).mockResolvedValue({});

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { teamId: 'team_1', left: true } }),
      );
    });

    it('should return 404 if not a member', async () => {
      vi.mocked((prisma as any).arenaTeamMember.findFirst).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---------- POST /teams/:teamId/treasury/contribute ----------
  describe('POST /teams/:teamId/treasury/contribute', () => {
    const handler = getHandler('post', '/teams/:teamId/treasury/contribute');

    it('should contribute tokens to team treasury', async () => {
      const member = createTestTeamMember();
      const balance = createTestTokenBalance({ sparks: 200 });
      const updatedTeam = createTestTeam({ treasurySparks: 120 });

      vi.mocked((prisma as any).arenaTeamMember.findFirst).mockResolvedValue(member);
      vi.mocked((prisma as any).tokenBalance.findUnique).mockResolvedValue(balance);
      vi.mocked((prisma as any).tokenBalance.update).mockResolvedValue({});
      vi.mocked((prisma as any).arenaTeam.update).mockResolvedValue(updatedTeam);
      vi.mocked((prisma as any).arenaTeamMember.update).mockResolvedValue({});
      vi.mocked((prisma as any).arenaTokenTransaction.create).mockResolvedValue({});

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
        body: { tokenType: 'SPARKS', amount: 20 },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if not a team member', async () => {
      vi.mocked((prisma as any).arenaTeamMember.findFirst).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
        body: { tokenType: 'SPARKS', amount: 20 },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for insufficient balance', async () => {
      const member = createTestTeamMember();
      const balance = createTestTokenBalance({ sparks: 5 });

      vi.mocked((prisma as any).arenaTeamMember.findFirst).mockResolvedValue(member);
      vi.mocked((prisma as any).tokenBalance.findUnique).mockResolvedValue(balance);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
        body: { tokenType: 'SPARKS', amount: 100 },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Insufficient token balance' }),
      );
    });
  });

  // ---------- POST /teams/:teamId/treasury/propose ----------
  describe('POST /teams/:teamId/treasury/propose', () => {
    const handler = getHandler('post', '/teams/:teamId/treasury/propose');

    it('should create a treasury spend proposal', async () => {
      const team = createTestTeam({ id: 'team_1', memberCount: 5 });
      const vote = createTestTreasuryVote();
      vi.mocked((prisma as any).arenaTeam.findUnique).mockResolvedValue(team);
      vi.mocked((prisma as any).arenaTreasuryVote.create).mockResolvedValue(vote);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
        body: {
          description: 'Buy new resources',
          tokenType: 'SPARKS',
          amount: 50,
          purpose: 'Resources',
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 if team not found', async () => {
      vi.mocked((prisma as any).arenaTeam.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'missing' },
        body: {
          description: 'Buy new resources',
          tokenType: 'SPARKS',
          amount: 50,
          purpose: 'Resources',
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---------- POST /teams/treasury-votes/:voteId/cast ----------
  describe('POST /teams/treasury-votes/:voteId/cast', () => {
    const handler = getHandler('post', '/teams/treasury-votes/:voteId/cast');

    it('should cast a vote on a treasury proposal', async () => {
      const vote = createTestTreasuryVote({ id: 'tvote_1', status: 'OPEN' });
      const updatedVote = { ...vote, votesFor: 1 };
      vi.mocked((prisma as any).arenaTreasuryVote.findUnique).mockResolvedValue(vote);
      vi.mocked((prisma as any).arenaTreasuryVoteCast.create).mockResolvedValue({});
      vi.mocked((prisma as any).arenaTreasuryVote.update).mockResolvedValue({
        ...updatedVote,
        autoFinalised: false,
      });

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { voteId: 'tvote_1' },
        body: { choice: 'FOR' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if vote not found', async () => {
      vi.mocked((prisma as any).arenaTreasuryVote.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { voteId: 'missing' },
        body: { choice: 'FOR' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if vote is no longer open', async () => {
      const vote = createTestTreasuryVote({ status: 'PASSED' });
      vi.mocked((prisma as any).arenaTreasuryVote.findUnique).mockResolvedValue(vote);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { voteId: vote.id },
        body: { choice: 'FOR' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- POST /teams/:teamId/trades/propose ----------
  describe('POST /teams/:teamId/trades/propose', () => {
    const handler = getHandler('post', '/teams/:teamId/trades/propose');

    it('should propose a trade between teams', async () => {
      const proposerTeam = createTestTeam({ id: 'team_1', treasurySparks: 100 });
      const recipientTeam = createTestTeam({ id: 'team_2' });
      const trade = createTestTeamTrade();

      vi.mocked((prisma as any).arenaTeam.findUnique)
        .mockResolvedValueOnce(proposerTeam)
        .mockResolvedValueOnce(recipientTeam);
      vi.mocked((prisma as any).arenaTeamTrade.create).mockResolvedValue(trade);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
        body: {
          recipientTeamId: 'team_2',
          offerTokenType: 'SPARKS',
          offerAmount: 30,
          requestTokenType: 'GEMS',
          requestAmount: 15,
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 if proposer team not found', async () => {
      vi.mocked((prisma as any).arenaTeam.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createTestTeam());

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'missing' },
        body: {
          recipientTeamId: 'team_2',
          offerTokenType: 'SPARKS',
          offerAmount: 30,
          requestTokenType: 'GEMS',
          requestAmount: 15,
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if insufficient treasury for offer', async () => {
      const proposerTeam = createTestTeam({ id: 'team_1', treasurySparks: 5 });
      const recipientTeam = createTestTeam({ id: 'team_2' });

      vi.mocked((prisma as any).arenaTeam.findUnique)
        .mockResolvedValueOnce(proposerTeam)
        .mockResolvedValueOnce(recipientTeam);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
        body: {
          recipientTeamId: 'team_2',
          offerTokenType: 'SPARKS',
          offerAmount: 100,
          requestTokenType: 'GEMS',
          requestAmount: 15,
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Insufficient team treasury for offer' }),
      );
    });
  });

  // ---------- POST /teams/trades/:tradeId/accept ----------
  describe('POST /teams/trades/:tradeId/accept', () => {
    const handler = getHandler('post', '/teams/trades/:tradeId/accept');

    it('should accept a trade', async () => {
      const trade = createTestTeamTrade({ id: 'trade_1', status: 'PROPOSED' });
      const proposer = createTestTeam({ id: 'team_1', treasurySparks: 100, treasuryGems: 100 });
      const recipient = createTestTeam({ id: 'team_2', treasurySparks: 100, treasuryGems: 100 });
      const completed = { ...trade, status: 'COMPLETED' };

      vi.mocked((prisma as any).arenaTeamTrade.findUnique).mockResolvedValue(trade);
      vi.mocked((prisma as any).arenaTeam.findUnique)
        .mockResolvedValueOnce(proposer)
        .mockResolvedValueOnce(recipient);
      vi.mocked((prisma as any).arenaTeam.update).mockResolvedValue({});
      vi.mocked((prisma as any).arenaTeamTrade.update).mockResolvedValue(completed);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { tradeId: 'trade_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if trade not found', async () => {
      vi.mocked((prisma as any).arenaTeamTrade.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { tradeId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if trade is no longer open', async () => {
      const trade = createTestTeamTrade({ status: 'COMPLETED' });
      vi.mocked((prisma as any).arenaTeamTrade.findUnique).mockResolvedValue(trade);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { tradeId: trade.id },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- POST /teams/:teamId/challenge ----------
  describe('POST /teams/:teamId/challenge', () => {
    const handler = getHandler('post', '/teams/:teamId/challenge');

    it('should create a team challenge', async () => {
      const challenger = createTestTeam({ id: 'team_1' });
      const challenged = createTestTeam({ id: 'team_2' });
      const challenge = createTestTeamChallenge();

      vi.mocked((prisma as any).arenaTeam.findUnique)
        .mockResolvedValueOnce(challenger)
        .mockResolvedValueOnce(challenged);
      vi.mocked((prisma as any).arenaTeamChallenge.create).mockResolvedValue(challenge);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
        body: { challengedTeamId: 'team_2', format: 'READING_SPRINT' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 if challenged team not found', async () => {
      const challenger = createTestTeam({ id: 'team_1' });
      vi.mocked((prisma as any).arenaTeam.findUnique)
        .mockResolvedValueOnce(challenger)
        .mockResolvedValueOnce(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { teamId: 'team_1' },
        body: { challengedTeamId: 'missing', format: 'READING_SPRINT' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});

// ============================================================================
// COMMUNITY
// ============================================================================
describe('Arena Routes - Community', () => {
  // ---------- GET /community/leaderboards ----------
  describe('GET /community/leaderboards', () => {
    const handler = getHandler('get', '/community/leaderboards');

    it('should return token leaderboard', async () => {
      const entry = {
        ...createTestTokenBalance({ userId: 'user_1' }),
        user: { id: 'user_1', displayName: 'Test', avatarUrl: null },
      };
      vi.mocked((prisma as any).tokenBalance.findMany).mockResolvedValue([entry]);

      const req = testUtils.mockRequest({
        user: defaultUser,
        query: { type: 'sparks', limit: '20' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ type: 'sparks' }),
        }),
      );
    });
  });

  // ---------- GET /community/trending ----------
  describe('GET /community/trending', () => {
    const handler = getHandler('get', '/community/trending');

    it('should return trending bounties and featured creators', async () => {
      vi.mocked((prisma as any).contentBounty.findMany).mockResolvedValue([createTestBounty()]);
      vi.mocked((prisma as any).creatorProfile.findMany).mockResolvedValue([createTestCreatorProfile()]);

      const req = testUtils.mockRequest({ user: defaultUser });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            trendingBounties: expect.any(Array),
            featuredCreators: expect.any(Array),
          }),
        }),
      );
    });
  });

  // ---------- GET /community/feed ----------
  describe('GET /community/feed', () => {
    const handler = getHandler('get', '/community/feed');

    it('should return community feed', async () => {
      const now = new Date();
      vi.mocked((prisma as any).arenaCompetition.findMany).mockResolvedValue([
        createTestCompetition({ completedAt: now, status: 'COMPLETED' }),
      ]);
      vi.mocked((prisma as any).contentBounty.findMany).mockResolvedValue([
        createTestBounty({ createdAt: now }),
      ]);

      const req = testUtils.mockRequest({
        user: defaultUser,
        query: { page: '1', limit: '20' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ feed: expect.any(Array) }),
        }),
      );
    });
  });

  // ---------- GET /community/creators/me ----------
  describe('GET /community/creators/me', () => {
    const handler = getHandler('get', '/community/creators/me');

    it('should return own creator profile', async () => {
      const profile = createTestCreatorProfile();
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(profile);

      const req = testUtils.mockRequest({ user: defaultUser });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: profile }),
      );
    });

    it('should return 404 if no creator profile', async () => {
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({ user: defaultUser });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---------- POST /community/creators/register ----------
  describe('POST /community/creators/register', () => {
    const handler = getHandler('post', '/community/creators/register');

    it('should register as a creator', async () => {
      const profile = createTestCreatorProfile();
      vi.mocked((prisma as any).creatorProfile.upsert).mockResolvedValue(profile);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { displayName: 'Creator McCreate', bio: 'I create things', specialisations: ['phonics'] },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for invalid registration data', async () => {
      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { displayName: 'A' }, // too short
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- GET /community/creators/:creatorId ----------
  describe('GET /community/creators/:creatorId', () => {
    const handler = getHandler('get', '/community/creators/:creatorId');

    it('should return a creator profile', async () => {
      const profile = createTestCreatorProfile({ id: 'creator_1' });
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(profile);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { creatorId: 'creator_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: profile }));
    });

    it('should return 404 for missing creator', async () => {
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { creatorId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---------- GET /community/creators/:creatorId/analytics ----------
  describe('GET /community/creators/:creatorId/analytics', () => {
    const handler = getHandler('get', '/community/creators/:creatorId/analytics');

    it('should return creator analytics', async () => {
      const profile = createTestCreatorProfile({
        id: 'creator_1',
        totalPublished: 5,
        totalDrafts: 2,
        avgEngagement: 3.5,
      });
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(profile);
      vi.mocked((prisma as any).bountySubmission.findMany).mockResolvedValue([]);
      vi.mocked((prisma as any).contentBounty.findMany).mockResolvedValue([]);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { creatorId: 'creator_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            content: expect.objectContaining({ totalPublished: 5 }),
            tier: expect.objectContaining({ current: expect.any(String) }),
          }),
        }),
      );
    });

    it('should return 404 if creator not found', async () => {
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { creatorId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---------- POST /community/creators/:creatorId/advance ----------
  describe('POST /community/creators/:creatorId/advance', () => {
    const handler = getHandler('post', '/community/creators/:creatorId/advance');

    it('should advance onboarding phase', async () => {
      const profile = createTestCreatorProfile({ id: 'creator_1', onboardingPhase: 'REGISTERED' });
      const updated = { ...profile, onboardingPhase: 'PROFILE_COMPLETE' };
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(profile);
      vi.mocked((prisma as any).creatorProfile.update).mockResolvedValue(updated);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { creatorId: 'creator_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: updated }));
    });

    it('should return 400 if already at final phase', async () => {
      const profile = createTestCreatorProfile({ onboardingPhase: 'ACTIVE_CREATOR' });
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(profile);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { creatorId: profile.id },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- GET /community/creators/:creatorId/checklist ----------
  describe('GET /community/creators/:creatorId/checklist', () => {
    const handler = getHandler('get', '/community/creators/:creatorId/checklist');

    it('should return onboarding checklist', async () => {
      const profile = createTestCreatorProfile({ id: 'creator_1', onboardingPhase: 'TUTORIAL_COMPLETE' });
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(profile);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { creatorId: 'creator_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            steps: expect.any(Array),
            completionPercentage: expect.any(Number),
          }),
        }),
      );
    });

    it('should return 404 if creator not found', async () => {
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { creatorId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---------- POST /community/creators/:creatorId/tier-upgrade ----------
  describe('POST /community/creators/:creatorId/tier-upgrade', () => {
    const handler = getHandler('post', '/community/creators/:creatorId/tier-upgrade');

    it('should return ineligible when requirements not met', async () => {
      const profile = createTestCreatorProfile({
        id: 'creator_1',
        tier: 'NEWCOMER',
        totalPublished: 1,
        avgEngagement: 1.0,
      });
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(profile);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { creatorId: 'creator_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ eligible: false, nextTier: 'CONTRIBUTOR' }),
        }),
      );
    });

    it('should upgrade tier when requirements met', async () => {
      const profile = createTestCreatorProfile({
        id: 'creator_1',
        tier: 'NEWCOMER',
        totalPublished: 10,
        avgEngagement: 5.0,
      });
      const updated = { ...profile, tier: 'CONTRIBUTOR' };
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(profile);
      vi.mocked((prisma as any).creatorProfile.update).mockResolvedValue(updated);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { creatorId: 'creator_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ eligible: true }),
        }),
      );
    });

    it('should return 400 if already at maximum tier', async () => {
      const profile = createTestCreatorProfile({ tier: 'MASTER' });
      vi.mocked((prisma as any).creatorProfile.findUnique).mockResolvedValue(profile);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { creatorId: profile.id },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- GET /community/health ----------
  describe('GET /community/health', () => {
    const handler = getHandler('get', '/community/health');

    it('should return community health metrics', async () => {
      vi.mocked((prisma as any).creatorProfile.count)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(25);
      vi.mocked((prisma as any).contentBounty.count).mockResolvedValue(10);
      vi.mocked((prisma as any).arenaCompetition.count).mockResolvedValue(5);
      vi.mocked((prisma as any).tokenBalance.aggregate).mockResolvedValue({
        _sum: { sparks: 5000, gems: 2000, voice: 1000, stakedSparks: 500, stakedGems: 200 },
        _count: 80,
      });

      const req = testUtils.mockRequest({ user: defaultUser });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            creators: { total: 100, verified: 25 },
            competitions: { active: 5 },
          }),
        }),
      );
    });
  });
});

// ============================================================================
// TOKENS
// ============================================================================
describe('Arena Routes - Tokens', () => {
  // ---------- GET /tokens/balance ----------
  describe('GET /tokens/balance', () => {
    const handler = getHandler('get', '/tokens/balance');

    it('should return user token balance', async () => {
      const balance = createTestTokenBalance();
      vi.mocked((prisma as any).tokenBalance.findUnique).mockResolvedValue(balance);

      const req = testUtils.mockRequest({ user: defaultUser });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: balance }));
    });

    it('should create balance record if none exists', async () => {
      const newBalance = createTestTokenBalance({ sparks: 0, gems: 0, voice: 0 });
      vi.mocked((prisma as any).tokenBalance.findUnique).mockResolvedValue(null);
      vi.mocked((prisma as any).tokenBalance.create).mockResolvedValue(newBalance);

      const req = testUtils.mockRequest({ user: defaultUser });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: newBalance }),
      );
    });
  });

  // ---------- GET /tokens/history ----------
  describe('GET /tokens/history', () => {
    const handler = getHandler('get', '/tokens/history');

    it('should return transaction history', async () => {
      const tx = createTestTokenTransaction();
      vi.mocked((prisma as any).arenaTokenTransaction.findMany).mockResolvedValue([tx]);
      vi.mocked((prisma as any).arenaTokenTransaction.count).mockResolvedValue(1);

      const req = testUtils.mockRequest({
        user: defaultUser,
        query: { page: '1', limit: '50' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ transactions: [tx], total: 1 }),
        }),
      );
    });
  });

  // ---------- POST /tokens/earn ----------
  describe('POST /tokens/earn', () => {
    const handler = getHandler('post', '/tokens/earn');

    it('should earn tokens', async () => {
      const balance = createTestTokenBalance();
      const updated = { ...balance, sparks: 110 };
      const tx = createTestTokenTransaction({ transactionType: 'EARN', amount: 10 });

      vi.mocked((prisma as any).tokenBalance.upsert).mockResolvedValue(balance);
      vi.mocked((prisma as any).tokenBalance.update).mockResolvedValue(updated);
      vi.mocked((prisma as any).arenaTokenTransaction.create).mockResolvedValue(tx);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { tokenType: 'SPARKS', amount: 10, category: 'COMPETITION' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 for invalid earn body', async () => {
      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { tokenType: 'INVALID', amount: -5, category: '' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- POST /tokens/redeem ----------
  describe('POST /tokens/redeem', () => {
    const handler = getHandler('post', '/tokens/redeem');

    it('should redeem tokens', async () => {
      const balance = createTestTokenBalance({ sparks: 100 });
      const updated = { ...balance, sparks: 80 };
      const tx = createTestTokenTransaction({ transactionType: 'SPEND', amount: -20 });

      vi.mocked((prisma as any).tokenBalance.findUnique).mockResolvedValue(balance);
      vi.mocked((prisma as any).tokenBalance.update).mockResolvedValue(updated);
      vi.mocked((prisma as any).arenaTokenTransaction.create).mockResolvedValue(tx);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { tokenType: 'SPARKS', amount: 20, category: 'AVATAR_UPGRADE' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 for insufficient balance', async () => {
      const balance = createTestTokenBalance({ sparks: 5 });

      vi.mocked((prisma as any).tokenBalance.findUnique).mockResolvedValue(balance);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { tokenType: 'SPARKS', amount: 100, category: 'AVATAR_UPGRADE' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Insufficient token balance' }),
      );
    });

    it('should return 404 if no balance record', async () => {
      vi.mocked((prisma as any).tokenBalance.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { tokenType: 'SPARKS', amount: 10, category: 'AVATAR_UPGRADE' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---------- POST /tokens/stake ----------
  describe('POST /tokens/stake', () => {
    const handler = getHandler('post', '/tokens/stake');

    it('should stake tokens', async () => {
      const balance = createTestTokenBalance({ sparks: 100 });
      const position = createTestStakePosition();

      vi.mocked((prisma as any).tokenBalance.findUnique).mockResolvedValue(balance);
      vi.mocked((prisma as any).tokenBalance.update).mockResolvedValue({});
      vi.mocked((prisma as any).arenaStakePosition.create).mockResolvedValue(position);
      vi.mocked((prisma as any).arenaTokenTransaction.create).mockResolvedValue({});

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: {
          poolType: 'ARENA_TOURNAMENT',
          tokenType: 'SPARKS',
          amount: 50,
          lockDays: 30,
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for insufficient balance', async () => {
      const balance = createTestTokenBalance({ sparks: 10 });
      vi.mocked((prisma as any).tokenBalance.findUnique).mockResolvedValue(balance);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: {
          poolType: 'ARENA_TOURNAMENT',
          tokenType: 'SPARKS',
          amount: 500,
          lockDays: 30,
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- POST /tokens/unstake ----------
  describe('POST /tokens/unstake', () => {
    const handler = getHandler('post', '/tokens/unstake');

    it('should unstake tokens', async () => {
      const position = createTestStakePosition({
        id: 'stake_1',
        userId: 'user_1',
        status: 'ACTIVE',
        amount: 50,
        yieldAccrued: 5,
        lockedUntil: new Date(Date.now() - 1000), // already unlocked
      });
      const balance = createTestTokenBalance({ sparks: 50 });

      vi.mocked((prisma as any).arenaStakePosition.findUnique).mockResolvedValue(position);
      vi.mocked((prisma as any).tokenBalance.findUnique).mockResolvedValue(balance);
      vi.mocked((prisma as any).tokenBalance.update).mockResolvedValue({});
      vi.mocked((prisma as any).arenaStakePosition.update).mockResolvedValue({});
      vi.mocked((prisma as any).arenaTokenTransaction.create).mockResolvedValue({});

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { positionId: 'stake_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if position not found or belongs to another user', async () => {
      vi.mocked((prisma as any).arenaStakePosition.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { positionId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if position is not active', async () => {
      const position = createTestStakePosition({
        userId: 'user_1',
        status: 'COMPLETED',
      });
      vi.mocked((prisma as any).arenaStakePosition.findUnique).mockResolvedValue(position);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { positionId: position.id },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Stake position is not active' }),
      );
    });
  });

  // ---------- GET /tokens/economy ----------
  describe('GET /tokens/economy', () => {
    const handler = getHandler('get', '/tokens/economy');

    it('should return economy metrics', async () => {
      vi.mocked((prisma as any).tokenBalance.aggregate).mockResolvedValue({
        _sum: {
          sparks: 10000,
          gems: 5000,
          voice: 2000,
          stakedSparks: 1000,
          stakedGems: 500,
          stakedVoice: 200,
          lifetimeSparksEarned: 20000,
          lifetimeGemsEarned: 10000,
          lifetimeVoiceEarned: 4000,
        },
        _count: 150,
      });
      vi.mocked((prisma as any).arenaTokenTransaction.count).mockResolvedValue(500);
      vi.mocked((prisma as any).arenaStakePosition.aggregate).mockResolvedValue({
        _sum: { amount: 1700, yieldAccrued: 170 },
        _count: 50,
      });

      const req = testUtils.mockRequest({ user: defaultUser });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            circulating: expect.objectContaining({ sparks: 10000 }),
            staked: expect.objectContaining({ sparks: 1000 }),
            activeUsers: 150,
          }),
        }),
      );
    });
  });
});

// ============================================================================
// GOVERNANCE
// ============================================================================
describe('Arena Routes - Governance', () => {
  // ---------- POST /governance/proposals ----------
  describe('POST /governance/proposals', () => {
    const handler = getHandler('post', '/governance/proposals');

    it('should create a governance proposal', async () => {
      const proposal = createTestProposal();
      vi.mocked((prisma as any).arenaProposal.create).mockResolvedValue(proposal);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: {
          type: 'FEATURE_PRIORITY',
          title: 'Add new reading modes',
          description: 'We should add night mode and speed reading features for better experience.',
          votingPeriodHours: 72,
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for invalid proposal', async () => {
      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { type: 'INVALID', title: 'ab', description: 'too short' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- GET /governance/proposals ----------
  describe('GET /governance/proposals', () => {
    const handler = getHandler('get', '/governance/proposals');

    it('should list proposals', async () => {
      const proposal = createTestProposal();
      vi.mocked((prisma as any).arenaProposal.findMany).mockResolvedValue([proposal]);
      vi.mocked((prisma as any).arenaProposal.count).mockResolvedValue(1);

      const req = testUtils.mockRequest({
        user: defaultUser,
        query: { page: '1', limit: '20' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ proposals: [proposal], total: 1 }),
        }),
      );
    });
  });

  // ---------- GET /governance/proposals/:proposalId ----------
  describe('GET /governance/proposals/:proposalId', () => {
    const handler = getHandler('get', '/governance/proposals/:proposalId');

    it('should return a proposal by ID', async () => {
      const proposal = createTestProposal({ id: 'prop_1' });
      vi.mocked((prisma as any).arenaProposal.findUnique).mockResolvedValue(proposal);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: 'prop_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: proposal }));
    });

    it('should return 404 for missing proposal', async () => {
      vi.mocked((prisma as any).arenaProposal.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---------- POST /governance/proposals/:proposalId/vote ----------
  describe('POST /governance/proposals/:proposalId/vote', () => {
    const handler = getHandler('post', '/governance/proposals/:proposalId/vote');

    it('should cast a vote on a proposal', async () => {
      const proposal = createTestProposal({
        id: 'prop_1',
        status: 'ACTIVE',
        votingEndsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });
      const vote = createTestVote();
      const updatedProposal = { ...proposal, votesFor: 1, totalVoters: 1 };

      vi.mocked((prisma as any).arenaProposal.findUnique).mockResolvedValue(proposal);
      vi.mocked((prisma as any).arenaVote.create).mockResolvedValue(vote);
      vi.mocked((prisma as any).arenaProposal.update).mockResolvedValue(updatedProposal);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: 'prop_1' },
        body: { choice: 'FOR' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 for non-existent proposal', async () => {
      vi.mocked((prisma as any).arenaProposal.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: 'missing' },
        body: { choice: 'FOR' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if proposal is not open for voting', async () => {
      const proposal = createTestProposal({ status: 'PASSED' });
      vi.mocked((prisma as any).arenaProposal.findUnique).mockResolvedValue(proposal);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: proposal.id },
        body: { choice: 'FOR' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 409 for duplicate vote (P2002)', async () => {
      const proposal = createTestProposal({
        status: 'ACTIVE',
        votingEndsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });
      vi.mocked((prisma as any).arenaProposal.findUnique).mockResolvedValue(proposal);
      (prisma as any).$transaction.mockRejectedValue({ code: 'P2002' });

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: proposal.id },
        body: { choice: 'FOR' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  // ---------- POST /governance/proposals/:proposalId/finalise ----------
  describe('POST /governance/proposals/:proposalId/finalise', () => {
    const handler = getHandler('post', '/governance/proposals/:proposalId/finalise');

    it('should finalise a passed proposal', async () => {
      const proposal = createTestProposal({
        id: 'prop_1',
        status: 'ACTIVE',
        votesFor: 10,
        votesAgainst: 3,
        votesAbstain: 2,
      });
      const updated = { ...proposal, status: 'PASSED' };
      vi.mocked((prisma as any).arenaProposal.findUnique).mockResolvedValue(proposal);
      vi.mocked((prisma as any).arenaProposal.update).mockResolvedValue(updated);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: 'prop_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 for missing proposal', async () => {
      vi.mocked((prisma as any).arenaProposal.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if proposal cannot be finalised', async () => {
      const proposal = createTestProposal({ status: 'EXECUTED' });
      vi.mocked((prisma as any).arenaProposal.findUnique).mockResolvedValue(proposal);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: proposal.id },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- POST /governance/proposals/:proposalId/execute ----------
  describe('POST /governance/proposals/:proposalId/execute', () => {
    const handler = getHandler('post', '/governance/proposals/:proposalId/execute');

    it('should execute a passed proposal after timelock', async () => {
      const proposal = createTestProposal({
        id: 'prop_1',
        status: 'PASSED',
        executionAt: new Date(Date.now() - 1000), // timelock expired
      });
      vi.mocked((prisma as any).arenaProposal.findUnique).mockResolvedValue(proposal);
      vi.mocked((prisma as any).arenaProposal.update).mockResolvedValue({
        ...proposal,
        status: 'EXECUTED',
      });

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: 'prop_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ status: 'EXECUTED' }),
        }),
      );
    });

    it('should return 400 if not a passed proposal', async () => {
      const proposal = createTestProposal({ status: 'ACTIVE' });
      vi.mocked((prisma as any).arenaProposal.findUnique).mockResolvedValue(proposal);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: proposal.id },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Only passed proposals can be executed' }),
      );
    });

    it('should return 400 if timelock has not expired', async () => {
      const proposal = createTestProposal({
        status: 'PASSED',
        executionAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // still locked
      });
      vi.mocked((prisma as any).arenaProposal.findUnique).mockResolvedValue(proposal);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: proposal.id },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Timelock has not expired yet' }),
      );
    });
  });

  // ---------- GET /governance/proposals/:proposalId/votes ----------
  describe('GET /governance/proposals/:proposalId/votes', () => {
    const handler = getHandler('get', '/governance/proposals/:proposalId/votes');

    it('should return votes for a proposal', async () => {
      const vote = createTestVote();
      vi.mocked((prisma as any).arenaVote.findMany).mockResolvedValue([vote]);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { proposalId: 'prop_1' },
        query: { page: '1', limit: '50' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: [vote] }),
      );
    });
  });

  // ---------- POST /governance/delegations ----------
  describe('POST /governance/delegations', () => {
    const handler = getHandler('post', '/governance/delegations');

    it('should create a delegation', async () => {
      const delegation = createTestDelegation();
      vi.mocked((prisma as any).arenaDelegation.findFirst).mockResolvedValue(null);
      vi.mocked((prisma as any).arenaDelegation.create).mockResolvedValue(delegation);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { delegateId: 'user_2', voiceAmount: 10, durationDays: 30 },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when delegating to yourself', async () => {
      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { delegateId: 'user_1', voiceAmount: 10, durationDays: 30 },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Cannot delegate to yourself' }),
      );
    });

    it('should return 400 for circular delegation', async () => {
      vi.mocked((prisma as any).arenaDelegation.findFirst).mockResolvedValue(
        createTestDelegation({ delegatorId: 'user_2', delegateId: 'user_1' }),
      );

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: { delegateId: 'user_2', voiceAmount: 10, durationDays: 30 },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Circular delegation detected' }),
      );
    });
  });

  // ---------- DELETE /governance/delegations/:delegationId ----------
  describe('DELETE /governance/delegations/:delegationId', () => {
    const handler = getHandler('delete', '/governance/delegations/:delegationId');

    it('should revoke a delegation', async () => {
      const delegation = createTestDelegation({ id: 'del_1', delegatorId: 'user_1' });
      vi.mocked((prisma as any).arenaDelegation.findUnique).mockResolvedValue(delegation);
      vi.mocked((prisma as any).arenaDelegation.update).mockResolvedValue({
        ...delegation,
        isActive: false,
      });

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { delegationId: 'del_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { revoked: true } }),
      );
    });

    it('should return 404 for missing delegation', async () => {
      vi.mocked((prisma as any).arenaDelegation.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { delegationId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if not the delegator', async () => {
      const delegation = createTestDelegation({ id: 'del_1', delegatorId: 'user_other' });
      vi.mocked((prisma as any).arenaDelegation.findUnique).mockResolvedValue(delegation);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { delegationId: 'del_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ---------- GET /governance/delegations ----------
  describe('GET /governance/delegations', () => {
    const handler = getHandler('get', '/governance/delegations');

    it('should return user delegations', async () => {
      const delegation = createTestDelegation();
      vi.mocked((prisma as any).arenaDelegation.findMany).mockResolvedValue([delegation]);

      const req = testUtils.mockRequest({ user: defaultUser });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: [delegation] }),
      );
    });
  });

  // ---------- GET /governance/treasury ----------
  describe('GET /governance/treasury', () => {
    const handler = getHandler('get', '/governance/treasury');

    it('should return or create treasury', async () => {
      const treasury = createTestDaoTreasury();
      vi.mocked((prisma as any).daoTreasury.upsert).mockResolvedValue(treasury);

      const req = testUtils.mockRequest({ user: defaultUser });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: treasury }),
      );
    });
  });

  // ---------- GET /governance/treasury/transactions ----------
  describe('GET /governance/treasury/transactions', () => {
    const handler = getHandler('get', '/governance/treasury/transactions');

    it('should return treasury transactions', async () => {
      vi.mocked((prisma as any).daoTreasuryTransaction.findMany).mockResolvedValue([]);
      vi.mocked((prisma as any).daoTreasuryTransaction.count).mockResolvedValue(0);

      const req = testUtils.mockRequest({
        user: defaultUser,
        query: { page: '1', limit: '20' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ transactions: [], total: 0 }),
        }),
      );
    });
  });

  // ---------- GET /governance/stats ----------
  describe('GET /governance/stats', () => {
    const handler = getHandler('get', '/governance/stats');

    it('should return governance statistics', async () => {
      const treasury = createTestDaoTreasury();
      vi.mocked((prisma as any).arenaProposal.count)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(20);
      vi.mocked((prisma as any).arenaVote.count).mockResolvedValue(300);
      vi.mocked((prisma as any).arenaVote.groupBy).mockResolvedValue(
        Array.from({ length: 40 }, (_, i) => ({ voterId: `voter_${i}` })),
      );
      vi.mocked((prisma as any).daoTreasury.findUnique).mockResolvedValue(treasury);

      const req = testUtils.mockRequest({ user: defaultUser });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalProposals: 50,
            activeProposals: 5,
            passedProposals: 20,
            totalVotesCast: 300,
            uniqueVoters: 40,
          }),
        }),
      );
    });
  });
});

// ============================================================================
// BOUNTIES
// ============================================================================
describe('Arena Routes - Bounties', () => {
  // ---------- GET /bounties ----------
  describe('GET /bounties', () => {
    const handler = getHandler('get', '/bounties');

    it('should list bounties', async () => {
      const bounty = createTestBounty();
      vi.mocked((prisma as any).contentBounty.findMany).mockResolvedValue([bounty]);
      vi.mocked((prisma as any).contentBounty.count).mockResolvedValue(1);

      const req = testUtils.mockRequest({
        user: defaultUser,
        query: { page: '1', limit: '20' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ bounties: [bounty], total: 1 }),
        }),
      );
    });
  });

  // ---------- POST /bounties ----------
  describe('POST /bounties', () => {
    const handler = getHandler('post', '/bounties');

    it('should create a bounty', async () => {
      const bounty = createTestBounty();
      vi.mocked((prisma as any).contentBounty.create).mockResolvedValue(bounty);

      const req = testUtils.mockRequest({
        user: defaultUser,
        body: {
          category: 'PHASE_GAP',
          title: 'Phase 3 Stories Needed',
          description: 'We need more stories for phase 3 readers covering CVC words.',
          requirements: { minWordCount: 500 },
          reward: { tokenType: 'SPARKS', amount: 50 },
          submissionDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for invalid bounty data', async () => {
      const req = testUtils.mockRequest({
        user: defaultUser,
        body: {
          category: 'INVALID',
          title: 'ab',
          description: 'short',
        },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- GET /bounties/:bountyId ----------
  describe('GET /bounties/:bountyId', () => {
    const handler = getHandler('get', '/bounties/:bountyId');

    it('should return a bounty by ID', async () => {
      const bounty = createTestBounty({ id: 'bounty_1' });
      vi.mocked((prisma as any).contentBounty.findUnique).mockResolvedValue(bounty);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: 'bounty_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: bounty }));
    });

    it('should return 404 for missing bounty', async () => {
      vi.mocked((prisma as any).contentBounty.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---------- GET /bounties/:bountyId/submissions ----------
  describe('GET /bounties/:bountyId/submissions', () => {
    const handler = getHandler('get', '/bounties/:bountyId/submissions');

    it('should return submissions for a bounty', async () => {
      const submission = createTestBountySubmission();
      vi.mocked((prisma as any).bountySubmission.findMany).mockResolvedValue([submission]);
      vi.mocked((prisma as any).bountySubmission.count).mockResolvedValue(1);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: 'bounty_1' },
        query: { page: '1', limit: '20' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ submissions: [submission], total: 1 }),
        }),
      );
    });
  });

  // ---------- POST /bounties/:bountyId/submit ----------
  describe('POST /bounties/:bountyId/submit', () => {
    const handler = getHandler('post', '/bounties/:bountyId/submit');

    it('should submit to a bounty', async () => {
      const bounty = createTestBounty({
        id: 'bounty_1',
        status: 'PUBLISHED',
        currentSubmissions: 0,
        maxSubmissions: 50,
      });
      const submission = createTestBountySubmission();

      vi.mocked((prisma as any).contentBounty.findUnique).mockResolvedValue(bounty);
      vi.mocked((prisma as any).bountySubmission.create).mockResolvedValue(submission);
      vi.mocked((prisma as any).contentBounty.update).mockResolvedValue({});

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: 'bounty_1' },
        body: { storyId: 'story_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 404 if bounty not found', async () => {
      vi.mocked((prisma as any).contentBounty.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: 'missing' },
        body: {},
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if bounty is not accepting submissions', async () => {
      const bounty = createTestBounty({ status: 'COMPLETED' });
      vi.mocked((prisma as any).contentBounty.findUnique).mockResolvedValue(bounty);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: bounty.id },
        body: {},
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if max submissions reached', async () => {
      const bounty = createTestBounty({
        status: 'ACCEPTING',
        currentSubmissions: 50,
        maxSubmissions: 50,
      });
      vi.mocked((prisma as any).contentBounty.findUnique).mockResolvedValue(bounty);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: bounty.id },
        body: {},
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Maximum submissions reached' }),
      );
    });
  });

  // ---------- POST /bounties/:bountyId/judging ----------
  describe('POST /bounties/:bountyId/judging', () => {
    const handler = getHandler('post', '/bounties/:bountyId/judging');

    it('should start judging for a bounty', async () => {
      const bounty = createTestBounty({ id: 'bounty_1', status: 'ACCEPTING' });
      vi.mocked((prisma as any).contentBounty.findUnique).mockResolvedValue(bounty);
      vi.mocked((prisma as any).contentBounty.update).mockResolvedValue({
        ...bounty,
        status: 'JUDGING',
      });
      vi.mocked((prisma as any).bountySubmission.updateMany).mockResolvedValue({ count: 5 });

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: 'bounty_1' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ status: 'JUDGING' }),
        }),
      );
    });

    it('should return 404 if bounty not found', async () => {
      vi.mocked((prisma as any).contentBounty.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: 'missing' },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if bounty is not in correct state', async () => {
      const bounty = createTestBounty({ status: 'COMPLETED' });
      vi.mocked((prisma as any).contentBounty.findUnique).mockResolvedValue(bounty);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: bounty.id },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- POST /bounties/:bountyId/award ----------
  describe('POST /bounties/:bountyId/award', () => {
    const handler = getHandler('post', '/bounties/:bountyId/award');

    it('should award a bounty to winners', async () => {
      const bounty = createTestBounty({
        id: 'bounty_1',
        status: 'JUDGING',
        reward: { tokenType: 'SPARKS', amount: 100 },
      });
      vi.mocked((prisma as any).contentBounty.findUnique).mockResolvedValue(bounty);
      vi.mocked((prisma as any).contentBounty.update).mockResolvedValue({});
      vi.mocked((prisma as any).bountySubmission.updateMany).mockResolvedValue({});
      vi.mocked((prisma as any).tokenBalance.upsert).mockResolvedValue({});

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: 'bounty_1' },
        body: { winnerIds: ['user_2', 'user_3'], runnerUpIds: ['user_4'] },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'COMPLETED',
            winnersRewarded: 2,
            runnerUpsRewarded: 1,
          }),
        }),
      );
    });

    it('should return 404 for missing bounty', async () => {
      vi.mocked((prisma as any).contentBounty.findUnique).mockResolvedValue(null);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: 'missing' },
        body: { winnerIds: ['user_1'] },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if bounty is not in judging state', async () => {
      const bounty = createTestBounty({ status: 'PUBLISHED' });
      vi.mocked((prisma as any).contentBounty.findUnique).mockResolvedValue(bounty);

      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: bounty.id },
        body: { winnerIds: ['user_1'] },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for empty winnerIds', async () => {
      const req = testUtils.mockRequest({
        user: defaultUser,
        params: { bountyId: 'bounty_1' },
        body: { winnerIds: [] },
      });
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

// ============================================================================
// PILOT
// ============================================================================
describe('Arena Routes - Pilot', () => {
  // ---------- GET /pilot/status ----------
  describe('GET /pilot/status', () => {
    const handler = getHandler('get', '/pilot/status');

    it('should return pilot arena status', async () => {
      const req = testUtils.mockRequest({});
      const res = testUtils.mockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'active',
            format: 'students_vs_teachers',
            teacherHandicap: 1.5,
            milestones: expect.any(Array),
          }),
        }),
      );
    });
  });
});
