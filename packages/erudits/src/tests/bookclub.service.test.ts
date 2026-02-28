/**
 * ============================================================================
 * Book Club Service Tests
 * ============================================================================
 */

import { BookClubService } from '../services/bookclub.service';
import {
  mockEventBus, mockCache, mockConfig, mockAIService,
  mockBookClubRepo, mockSessionRepo, mockReadingRepo, mockMemberRepo,
  fixtures, expectSuccess, expectFailure,
} from './helpers';

describe('BookClubService', () => {
  let service: BookClubService;
  let deps: ReturnType<typeof createDeps>;

  function createDeps() {
    return {
      eventBus: mockEventBus(),
      cache: mockCache(),
      config: mockConfig(),
      ai: mockAIService(),
      clubRepo: mockBookClubRepo(),
      sessionRepo: mockSessionRepo(),
      readingRepo: mockReadingRepo(),
      memberRepo: mockMemberRepo(),
    };
  }

  beforeEach(() => {
    deps = createDeps();
    service = new BookClubService(deps);
  });

  // ── Club Lifecycle ──

  describe('createClub', () => {
    it('should create a book club and add organiser as member', async () => {
      const result = await service.createClub(
        fixtures.tenantId, fixtures.userId, fixtures.userName,
        {
          name: 'French Literature Circle',
          language: 'fr',
          targetYearLevels: ['11'],
          curriculumCodes: ['FR_SL_U3'],
        },
      );

      expectSuccess(result);
      expect(deps.clubRepo.save).toHaveBeenCalledTimes(1);
      expect(deps.eventBus.publish).toHaveBeenCalled();
    });

    it('should reject short names', async () => {
      const result = await service.createClub(
        fixtures.tenantId, fixtures.userId, fixtures.userName,
        { name: 'AB', language: 'fr', targetYearLevels: ['11'] },
      );

      expectFailure(result, 'VALIDATION_ERROR');
    });
  });

  describe('updateClub', () => {
    it('should allow organiser to update club details', async () => {
      deps.clubRepo.findById.mockResolvedValue(fixtures.bookClub());

      const result = await service.updateClub(
        fixtures.tenantId, 'bc_001', fixtures.userId,
        { name: 'Updated Circle Name', maxMembers: 30 },
      );

      expectSuccess(result);
      expect(deps.clubRepo.update).toHaveBeenCalled();
    });

    it('should reject updates by non-organiser', async () => {
      deps.clubRepo.findById.mockResolvedValue(
        fixtures.bookClub({ organiserId: 'other_user' }),
      );

      const result = await service.updateClub(
        fixtures.tenantId, 'bc_001', fixtures.userId,
        { name: 'Hijacked Club' },
      );

      expectFailure(result, 'FORBIDDEN');
    });
  });

  // ── Readings ──

  describe('addReading', () => {
    it('should add a reading to the club', async () => {
      deps.clubRepo.findById.mockResolvedValue(fixtures.bookClub());
      deps.readingRepo.findByClub.mockResolvedValue([]);

      const result = await service.addReading(
        fixtures.tenantId, 'bc_001', fixtures.userId,
        {
          title: 'Le Petit Prince',
          author: 'Antoine de Saint-Exupéry',
        },
      );

      expectSuccess(result);
      expect(deps.readingRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ── Sessions ──

  describe('scheduleSession', () => {
    it('should schedule a discussion session', async () => {
      deps.clubRepo.findById.mockResolvedValue(fixtures.bookClub());
      deps.readingRepo.findById.mockResolvedValue(fixtures.reading({ bookClubId: 'bc_001' }));
      deps.sessionRepo.findByClub.mockResolvedValue([]);

      const result = await service.scheduleSession(
        fixtures.tenantId, 'bc_001', fixtures.userId,
        {
          title: 'Discussion: Chapters 1-5',
          sessionType: 'discussion',
          scheduledAt: new Date('2026-03-15T10:00:00Z'),
          durationMinutes: 60,
          readingId: 'read_001',
        },
      );

      expectSuccess(result);
      expect(deps.sessionRepo.save).toHaveBeenCalledTimes(1);
      expect(deps.eventBus.publish).toHaveBeenCalled();
    });
  });

  describe('completeSession', () => {
    it('should mark session complete and record attendance', async () => {
      deps.sessionRepo.findById.mockResolvedValue(fixtures.session());
      deps.clubRepo.findById.mockResolvedValue(fixtures.bookClub());

      const result = await service.completeSession(
        fixtures.tenantId, 'sess_001', fixtures.userId,
        ['user_001', 'user_002'],
        'Great discussion!',
      );

      expectSuccess(result);
      expect(deps.sessionRepo.update).toHaveBeenCalled();
      // Should record attendance for each attendee
      expect(deps.memberRepo.recordAttendance).toHaveBeenCalledTimes(2);
    });
  });

  // ── Membership ──

  describe('joinClub', () => {
    it('should add a new member to the club', async () => {
      deps.clubRepo.findById.mockResolvedValue(fixtures.bookClub({ participantCount: 5 }));
      deps.memberRepo.isMember.mockResolvedValue(false);

      const result = await service.joinClub(
        fixtures.tenantId, 'bc_001', 'new_user', 'New Student',
      );

      expectSuccess(result);
      expect(deps.memberRepo.save).toHaveBeenCalledTimes(1);
      expect(deps.clubRepo.update).toHaveBeenCalled();
    });

    it('should reject if already a member', async () => {
      deps.clubRepo.findById.mockResolvedValue(fixtures.bookClub());
      deps.memberRepo.findByUserAndClub.mockResolvedValue(fixtures.member());

      const result = await service.joinClub(
        fixtures.tenantId, 'bc_001', fixtures.userId, fixtures.userName,
      );

      expectFailure(result, 'CONFLICT');
    });

    it('should reject if club is full', async () => {
      deps.clubRepo.findById.mockResolvedValue(
        fixtures.bookClub({ memberCount: 20, maxMembers: 20 }),
      );

      const result = await service.joinClub(
        fixtures.tenantId, 'bc_001', 'new_user', 'New Student',
      );

      expectFailure(result, 'VALIDATION_ERROR');
    });
  });

  describe('leaveClub', () => {
    it('should remove a member from the club', async () => {
      deps.memberRepo.findByUserAndClub.mockResolvedValue(fixtures.member());
      deps.clubRepo.findById.mockResolvedValue(fixtures.bookClub({ memberCount: 5 }));

      const result = await service.leaveClub(
        fixtures.tenantId, 'bc_001', fixtures.userId,
      );

      expectSuccess(result);
      expect(deps.memberRepo.deactivate).toHaveBeenCalled();
    });

    it('should reject if not a member', async () => {
      deps.clubRepo.findById.mockResolvedValue(fixtures.bookClub());
      deps.memberRepo.findByUserAndClub.mockResolvedValue(null);

      const result = await service.leaveClub(
        fixtures.tenantId, 'bc_001', fixtures.userId,
      );

      expectFailure(result, 'NOT_FOUND');
    });
  });

  // ── AI-Powered Features ──

  describe('generateDiscussionQuestions', () => {
    it('should generate Bloom\'s taxonomy questions', async () => {
      deps.clubRepo.findById.mockResolvedValue(fixtures.bookClub());
      deps.readingRepo.findById.mockResolvedValue(fixtures.reading());
      deps.ai.complete.mockResolvedValue({
        text: JSON.stringify({
          questions: [
            { level: 'remember', question: 'Qui est le personnage principal?', answerKey: 'Le Petit Prince' },
            { level: 'analyse', question: 'Comparez la rose et le renard.', answerKey: 'Both represent love...' },
          ],
        }),
        tokensUsed: 500,
        cost: 0.02,
      });

      const result = await service.generateDiscussionQuestions(
        fixtures.tenantId, 'bc_001', 'read_001', fixtures.userId,
        { questionCount: 5, includeAnswerKey: true },
      );

      expectSuccess(result);
      expect(deps.ai.complete).toHaveBeenCalled();
    });
  });

  describe('generateFacilitatorGuide', () => {
    it('should generate a structured session plan', async () => {
      deps.sessionRepo.findById.mockResolvedValue(
        fixtures.session({ readingId: 'read_001' }),
      );
      deps.clubRepo.findById.mockResolvedValue(fixtures.bookClub());
      deps.readingRepo.findById.mockResolvedValue(fixtures.reading());
      deps.ai.complete.mockResolvedValue({
        text: JSON.stringify({
          sessionPlan: { warmUp: '5 min icebreaker', mainActivity: 'Group discussion', wrapUp: 'Reflection' },
          vocabulary: [{ term: 'apprivoiser', translation: 'to tame', context: 'Le renard dit...' }],
          differentiationNotes: 'For weaker students, provide vocabulary glossary in advance.',
        }),
        tokensUsed: 800,
        cost: 0.03,
      });

      const result = await service.generateFacilitatorGuide(
        fixtures.tenantId, 'sess_001', fixtures.userId,
      );

      expectSuccess(result);
    });
  });

  // ── Analytics ──

  describe('getClubAnalytics', () => {
    it('should return club engagement metrics', async () => {
      deps.clubRepo.findById.mockResolvedValue(fixtures.bookClub({ memberCount: 10 }));
      deps.memberRepo.findByClub.mockResolvedValue([
        fixtures.member({ engagementScore: 80 }),
        fixtures.member({ id: 'mem_002', userId: 'user_002', engagementScore: 60 }),
      ]);
      deps.sessionRepo.findByClub.mockResolvedValue([
        fixtures.session({ isCompleted: true }),
        fixtures.session({ id: 'sess_002', isCompleted: false }),
      ]);
      deps.readingRepo.findByClub.mockResolvedValue([
        fixtures.reading({ isComplete: true }),
      ]);

      const result = await service.getClubAnalytics(fixtures.tenantId, 'bc_001');

      expectSuccess(result);
      if (result.success) {
        expect(result.data.totalMembers).toBeGreaterThan(0);
      }
    });
  });
});
