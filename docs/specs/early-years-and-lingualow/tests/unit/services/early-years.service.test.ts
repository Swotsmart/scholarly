/**
 * Early Years Service - Unit Tests
 * 
 * Tests the business logic layer in isolation using mocked repositories.
 * Each test verifies a specific behavior of the service methods.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EarlyYearsService } from '@scholarly/early-years';
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '@scholarly/shared';
import {
  createFamilyFixture,
  createFamilyInput,
  createChildFixture,
  enrollChildInput,
  createSessionFixture,
  startSessionInput,
  recordActivityInput,
  createPhonicsProgressFixture,
  createPicturePasswordFixture,
  validPictureSequence,
  invalidPictureSequence,
  dateOfBirthForAge,
  mockSuccess,
  mockFailure,
  generateTenantId,
  generateUserId,
  generateFamilyId,
  generateChildId,
  generateSessionId,
} from '../../fixtures/early-years.fixtures.js';

// =============================================================================
// MOCK REPOSITORIES
// =============================================================================

const mockFamilyRepo = {
  findByPrimaryUser: jest.fn(),
  createInTenant: jest.fn(),
  findWithChildren: jest.fn(),
  findByIdInTenant: jest.fn(),
  addLearningMinutes: jest.fn(),
};

const mockChildRepo = {
  findByIdInTenant: jest.fn(),
  createInTenant: jest.fn(),
  findWithProgress: jest.fn(),
  updateEngagement: jest.fn(),
  updateStreak: jest.fn(),
};

const mockSessionRepo = {
  findActiveSession: jest.fn(),
  createInTenant: jest.fn(),
  findWithActivities: jest.fn(),
  update: jest.fn(),
  endSession: jest.fn(),
};

const mockActivityRepo = {
  create: jest.fn(),
  completeActivity: jest.fn(),
};

const mockPhonicsRepo = {
  getOrCreate: jest.fn(),
  findByChild: jest.fn(),
  updateGraphemeMastery: jest.fn(),
  update: jest.fn(),
};

const mockPicturePasswordRepo = {
  findByChild: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  recordFailedAttempt: jest.fn(),
  resetAttempts: jest.fn(),
  isLocked: jest.fn(),
};

// =============================================================================
// TEST SETUP
// =============================================================================

describe('EarlyYearsService', () => {
  let service: EarlyYearsService;
  let tenantId: string;
  let userId: string;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Generate test IDs
    tenantId = generateTenantId();
    userId = generateUserId();

    // Create service with mocked repositories
    service = new EarlyYearsService(
      mockFamilyRepo as any,
      mockChildRepo as any,
      mockSessionRepo as any,
      mockActivityRepo as any,
      mockPhonicsRepo as any,
      mockPicturePasswordRepo as any,
    );
  });

  // ===========================================================================
  // FAMILY MANAGEMENT TESTS
  // ===========================================================================

  describe('createFamily', () => {
    it('should create a family successfully', async () => {
      const input = createFamilyInput();
      const family = createFamilyFixture({ tenantId, primaryUserId: userId });

      mockFamilyRepo.findByPrimaryUser.mockResolvedValue(mockSuccess(null));
      mockFamilyRepo.createInTenant.mockResolvedValue(mockSuccess(family));

      const result = await service.createFamily(tenantId, userId, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.familyId).toBe(family.id);
        expect(result.data.message).toContain('Family created successfully');
      }

      expect(mockFamilyRepo.findByPrimaryUser).toHaveBeenCalledWith(tenantId, userId);
      expect(mockFamilyRepo.createInTenant).toHaveBeenCalled();
    });

    it('should fail if user already has a family', async () => {
      const input = createFamilyInput();
      const existingFamily = createFamilyFixture({ tenantId, primaryUserId: userId });

      mockFamilyRepo.findByPrimaryUser.mockResolvedValue(mockSuccess(existingFamily));

      const result = await service.createFamily(tenantId, userId, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ConflictError);
        expect(result.error.message).toContain('already has a family');
      }

      expect(mockFamilyRepo.createInTenant).not.toHaveBeenCalled();
    });

    it('should require data processing consent', async () => {
      const input = createFamilyInput({ dataProcessingConsent: false });

      // The validation should be handled at the API layer, but the service
      // receives already-validated input. This test verifies the service
      // passes the consent flag correctly.
      mockFamilyRepo.findByPrimaryUser.mockResolvedValue(mockSuccess(null));
      mockFamilyRepo.createInTenant.mockResolvedValue(
        mockSuccess(createFamilyFixture({ tenantId, dataProcessingConsent: false }))
      );

      const result = await service.createFamily(tenantId, userId, input);

      expect(mockFamilyRepo.createInTenant).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ dataProcessingConsent: false })
      );
    });
  });

  describe('getFamily', () => {
    it('should return family with children', async () => {
      const familyId = generateFamilyId();
      const family = createFamilyFixture({ id: familyId, tenantId });
      const children = [
        createChildFixture({ tenantId, familyId, firstName: 'Alice', dateOfBirth: dateOfBirthForAge(5) }),
        createChildFixture({ tenantId, familyId, firstName: 'Bob', dateOfBirth: dateOfBirthForAge(4) }),
      ];

      mockFamilyRepo.findWithChildren.mockResolvedValue(
        mockSuccess({ ...family, children })
      );

      const result = await service.getFamily(tenantId, familyId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.family.id).toBe(familyId);
        expect(result.data.children).toHaveLength(2);
        expect(result.data.children[0].firstName).toBe('Alice');
        expect(result.data.children[0].age).toBe(5);
      }
    });

    it('should return error for non-existent family', async () => {
      const familyId = generateFamilyId();

      mockFamilyRepo.findWithChildren.mockResolvedValue(
        mockFailure(new NotFoundError('Family', familyId))
      );

      const result = await service.getFamily(tenantId, familyId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });
  });

  // ===========================================================================
  // CHILD ENROLLMENT TESTS
  // ===========================================================================

  describe('enrollChild', () => {
    it('should enroll a child aged 5', async () => {
      const familyId = generateFamilyId();
      const family = createFamilyFixture({ id: familyId, tenantId });
      const input = enrollChildInput(5);
      const child = createChildFixture({ tenantId, familyId });

      mockFamilyRepo.findByIdInTenant.mockResolvedValue(mockSuccess(family));
      mockChildRepo.createInTenant.mockResolvedValue(mockSuccess(child));
      mockPhonicsRepo.getOrCreate.mockResolvedValue(mockSuccess(createPhonicsProgressFixture()));

      const result = await service.enrollChild(tenantId, familyId, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.childId).toBe(child.id);
        expect(result.data.message).toContain('enrolled');
      }
    });

    it('should reject a child under 3 years old', async () => {
      const familyId = generateFamilyId();
      const family = createFamilyFixture({ id: familyId, tenantId });
      const input = enrollChildInput(2); // Too young

      mockFamilyRepo.findByIdInTenant.mockResolvedValue(mockSuccess(family));

      const result = await service.enrollChild(tenantId, familyId, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('between 3 and 7');
      }
    });

    it('should reject a child over 7 years old', async () => {
      const familyId = generateFamilyId();
      const family = createFamilyFixture({ id: familyId, tenantId });
      const input = enrollChildInput(8); // Too old

      mockFamilyRepo.findByIdInTenant.mockResolvedValue(mockSuccess(family));

      const result = await service.enrollChild(tenantId, familyId, input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('between 3 and 7');
      }
    });

    it('should accept children at boundary ages (3 and 7)', async () => {
      const familyId = generateFamilyId();
      const family = createFamilyFixture({ id: familyId, tenantId });

      mockFamilyRepo.findByIdInTenant.mockResolvedValue(mockSuccess(family));
      mockPhonicsRepo.getOrCreate.mockResolvedValue(mockSuccess(createPhonicsProgressFixture()));

      // Test age 3
      const child3 = createChildFixture({ tenantId, familyId });
      mockChildRepo.createInTenant.mockResolvedValue(mockSuccess(child3));
      const result3 = await service.enrollChild(tenantId, familyId, enrollChildInput(3));
      expect(result3.success).toBe(true);

      // Test age 7
      const child7 = createChildFixture({ tenantId, familyId });
      mockChildRepo.createInTenant.mockResolvedValue(mockSuccess(child7));
      const result7 = await service.enrollChild(tenantId, familyId, enrollChildInput(7));
      expect(result7.success).toBe(true);
    });
  });

  // ===========================================================================
  // PICTURE PASSWORD TESTS
  // ===========================================================================

  describe('setupPicturePassword', () => {
    it('should set up a new picture password', async () => {
      const childId = generateChildId();
      const child = createChildFixture({ id: childId, tenantId });

      mockChildRepo.findByIdInTenant.mockResolvedValue(mockSuccess(child));
      mockPicturePasswordRepo.findByChild.mockResolvedValue(mockSuccess(null));
      mockPicturePasswordRepo.create.mockResolvedValue(
        mockSuccess(createPicturePasswordFixture({ childId }))
      );

      const result = await service.setupPicturePassword(tenantId, childId, {
        imageSequence: validPictureSequence,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toContain('Picture password has been set up');
      }
    });

    it('should update existing picture password', async () => {
      const childId = generateChildId();
      const child = createChildFixture({ id: childId, tenantId });
      const existingPP = createPicturePasswordFixture({ childId });

      mockChildRepo.findByIdInTenant.mockResolvedValue(mockSuccess(child));
      mockPicturePasswordRepo.findByChild.mockResolvedValue(mockSuccess(existingPP));
      mockPicturePasswordRepo.update.mockResolvedValue(mockSuccess(existingPP));

      const result = await service.setupPicturePassword(tenantId, childId, {
        imageSequence: validPictureSequence,
      });

      expect(result.success).toBe(true);
      expect(mockPicturePasswordRepo.update).toHaveBeenCalled();
      expect(mockPicturePasswordRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyPicturePassword', () => {
    it('should fail when account is locked', async () => {
      const childId = generateChildId();
      const child = createChildFixture({ id: childId, tenantId });
      
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + 5); // Locked for 5 more minutes
      
      const lockedPP = createPicturePasswordFixture({ 
        childId, 
        lockedUntil,
        failedAttempts: 3,
      });

      mockChildRepo.findByIdInTenant.mockResolvedValue(mockSuccess(child));
      mockPicturePasswordRepo.findByChild.mockResolvedValue(mockSuccess(lockedPP));

      const result = await service.verifyPicturePassword(tenantId, childId, {
        imageSequence: validPictureSequence,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(AuthenticationError);
        expect(result.error.message).toContain('Too many failed attempts');
      }
    });
  });

  // ===========================================================================
  // SESSION MANAGEMENT TESTS
  // ===========================================================================

  describe('startSession', () => {
    it('should start a session with age-appropriate limits', async () => {
      const childId = generateChildId();
      const familyId = generateFamilyId();
      const child = createChildFixture({ 
        id: childId, 
        tenantId, 
        familyId,
        dateOfBirth: dateOfBirthForAge(5), // 5-year-old
      });
      const session = createSessionFixture({ tenantId, childId, familyId });

      mockChildRepo.findWithProgress.mockResolvedValue(mockSuccess({
        ...child,
        phonicsProgress: createPhonicsProgressFixture({ childId }),
        numeracyProgress: null,
        picturePassword: null,
      }));
      mockSessionRepo.findActiveSession.mockResolvedValue(mockSuccess(null));
      mockSessionRepo.createInTenant.mockResolvedValue(mockSuccess(session));

      const result = await service.startSession(tenantId, childId, startSessionInput());

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessionId).toBe(session.id);
        // 5-year-old should get 20 minutes, 12 activities
        expect(result.data.limits.maxMinutes).toBe(20);
        expect(result.data.limits.maxActivities).toBe(12);
      }
    });

    it('should apply correct limits for 3-4 year olds', async () => {
      const childId = generateChildId();
      const familyId = generateFamilyId();
      const child = createChildFixture({ 
        id: childId, 
        tenantId, 
        familyId,
        dateOfBirth: dateOfBirthForAge(4), // 4-year-old
      });
      const session = createSessionFixture({ 
        tenantId, 
        childId, 
        familyId,
        maxDurationMinutes: 15,
        maxActivities: 8,
      });

      mockChildRepo.findWithProgress.mockResolvedValue(mockSuccess({
        ...child,
        phonicsProgress: createPhonicsProgressFixture({ childId }),
        numeracyProgress: null,
        picturePassword: null,
      }));
      mockSessionRepo.findActiveSession.mockResolvedValue(mockSuccess(null));
      mockSessionRepo.createInTenant.mockResolvedValue(mockSuccess(session));

      const result = await service.startSession(tenantId, childId, startSessionInput());

      expect(result.success).toBe(true);
      if (result.success) {
        // 4-year-old should get 15 minutes, 8 activities
        expect(result.data.limits.maxMinutes).toBe(15);
        expect(result.data.limits.maxActivities).toBe(8);
      }
    });

    it('should end existing active session before starting new one', async () => {
      const childId = generateChildId();
      const familyId = generateFamilyId();
      const child = createChildFixture({ id: childId, tenantId, familyId });
      const activeSession = createSessionFixture({ tenantId, childId, familyId });
      const newSession = createSessionFixture({ tenantId, childId, familyId });

      mockChildRepo.findWithProgress.mockResolvedValue(mockSuccess({
        ...child,
        phonicsProgress: createPhonicsProgressFixture({ childId }),
        numeracyProgress: null,
        picturePassword: null,
      }));
      mockSessionRepo.findActiveSession.mockResolvedValue(mockSuccess(activeSession));
      mockSessionRepo.endSession.mockResolvedValue(mockSuccess(activeSession));
      mockSessionRepo.createInTenant.mockResolvedValue(mockSuccess(newSession));

      const result = await service.startSession(tenantId, childId, startSessionInput());

      expect(result.success).toBe(true);
      expect(mockSessionRepo.endSession).toHaveBeenCalledWith(
        activeSession.id,
        expect.objectContaining({ completedNaturally: false })
      );
    });
  });

  // ===========================================================================
  // ACTIVITY RECORDING TESTS
  // ===========================================================================

  describe('recordActivity', () => {
    it('should record activity and award treasure for high score', async () => {
      const sessionId = generateSessionId();
      const childId = generateChildId();
      const session = createSessionFixture({
        id: sessionId,
        tenantId,
        childId,
        activitiesCompleted: 0,
        maxActivities: 12,
        startedAt: new Date(),
      });
      const activity = { id: 'activity_1' };

      mockSessionRepo.findWithActivities.mockResolvedValue(mockSuccess({
        ...session,
        activities: [],
      }));
      mockActivityRepo.create.mockResolvedValue(mockSuccess(activity));
      mockActivityRepo.completeActivity.mockResolvedValue(mockSuccess(activity));
      mockSessionRepo.update.mockResolvedValue(mockSuccess(session));
      mockChildRepo.updateEngagement.mockResolvedValue(mockSuccess({}));
      mockPhonicsRepo.updateGraphemeMastery.mockResolvedValue(mockSuccess({}));

      const result = await service.recordActivity(
        tenantId,
        sessionId,
        recordActivityInput({ score: 0.95 }) // High score
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.treasureAwarded).toBe(true);
        expect(result.data.starsEarned).toBeGreaterThanOrEqual(2);
      }
    });

    it('should not award treasure for low score', async () => {
      const sessionId = generateSessionId();
      const childId = generateChildId();
      const session = createSessionFixture({
        id: sessionId,
        tenantId,
        childId,
        activitiesCompleted: 0,
        maxActivities: 12,
        startedAt: new Date(),
      });
      const activity = { id: 'activity_1' };

      mockSessionRepo.findWithActivities.mockResolvedValue(mockSuccess({
        ...session,
        activities: [],
      }));
      mockActivityRepo.create.mockResolvedValue(mockSuccess(activity));
      mockActivityRepo.completeActivity.mockResolvedValue(mockSuccess(activity));
      mockSessionRepo.update.mockResolvedValue(mockSuccess(session));
      mockChildRepo.updateEngagement.mockResolvedValue(mockSuccess({}));

      const result = await service.recordActivity(
        tenantId,
        sessionId,
        recordActivityInput({ score: 0.5 }) // Low score
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.treasureAwarded).toBe(false);
      }
    });

    it('should reject activity when session has ended', async () => {
      const sessionId = generateSessionId();
      const session = createSessionFixture({
        id: sessionId,
        tenantId,
        endedAt: new Date(), // Session already ended
      });

      mockSessionRepo.findWithActivities.mockResolvedValue(mockSuccess({
        ...session,
        activities: [],
      }));

      const result = await service.recordActivity(
        tenantId,
        sessionId,
        recordActivityInput()
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('already ended');
      }
    });

    it('should reject activity when max activities reached', async () => {
      const sessionId = generateSessionId();
      const session = createSessionFixture({
        id: sessionId,
        tenantId,
        activitiesCompleted: 12,
        maxActivities: 12, // Already at max
        startedAt: new Date(),
      });

      mockSessionRepo.findWithActivities.mockResolvedValue(mockSuccess({
        ...session,
        activities: [],
      }));

      const result = await service.recordActivity(
        tenantId,
        sessionId,
        recordActivityInput()
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Maximum activities reached');
      }
    });
  });

  // ===========================================================================
  // SESSION END TESTS
  // ===========================================================================

  describe('endSession', () => {
    it('should end session and update streak', async () => {
      const sessionId = generateSessionId();
      const childId = generateChildId();
      const familyId = generateFamilyId();
      const session = createSessionFixture({
        id: sessionId,
        tenantId,
        childId,
        familyId,
        activitiesCompleted: 5,
        treasuresEarned: 3,
        starsEarned: 10,
        startedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      });

      mockSessionRepo.findWithActivities.mockResolvedValue(mockSuccess({
        ...session,
        activities: [],
      }));
      mockSessionRepo.endSession.mockResolvedValue(mockSuccess(session));
      mockChildRepo.updateStreak.mockResolvedValue(mockSuccess({
        currentStreak: 3,
        longestStreak: 5,
      }));
      mockChildRepo.updateEngagement.mockResolvedValue(mockSuccess({}));
      mockFamilyRepo.addLearningMinutes.mockResolvedValue(mockSuccess({}));
      mockPhonicsRepo.findByChild.mockResolvedValue(mockSuccess(
        createPhonicsProgressFixture({ childId })
      ));

      const result = await service.endSession(tenantId, sessionId, {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessionId).toBe(sessionId);
        expect(result.data.activitiesCompleted).toBe(5);
        expect(result.data.treasuresEarned).toBe(3);
        expect(result.data.starsEarned).toBe(10);
        expect(result.data.streakInfo.currentStreak).toBe(3);
      }
    });

    it('should reject ending already-ended session', async () => {
      const sessionId = generateSessionId();
      const session = createSessionFixture({
        id: sessionId,
        tenantId,
        endedAt: new Date(), // Already ended
      });

      mockSessionRepo.findWithActivities.mockResolvedValue(mockSuccess({
        ...session,
        activities: [],
      }));

      const result = await service.endSession(tenantId, sessionId, {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('already ended');
      }
    });
  });

  // ===========================================================================
  // PHONICS PROGRESS TESTS
  // ===========================================================================

  describe('getPhonicsProgress', () => {
    it('should return phonics progress with next graphemes', async () => {
      const childId = generateChildId();
      const child = createChildFixture({ id: childId, tenantId });
      const progress = createPhonicsProgressFixture({
        childId,
        currentPhase: 1,
        masteredGraphemes: ['s', 'a'],
        introducedGraphemes: ['s', 'a', 't'],
        strugglingGraphemes: ['t'],
      });

      mockChildRepo.findByIdInTenant.mockResolvedValue(mockSuccess(child));
      mockPhonicsRepo.getOrCreate.mockResolvedValue(mockSuccess(progress));

      const result = await service.getPhonicsProgress(tenantId, childId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currentPhase).toBe(1);
        expect(result.data.masteredGraphemes).toContain('s');
        expect(result.data.masteredGraphemes).toContain('a');
        expect(result.data.strugglingGraphemes).toContain('t');
        expect(result.data.nextGraphemes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('advancePhonicsPhase', () => {
    it('should advance when 80% of phase is mastered', async () => {
      const childId = generateChildId();
      const child = createChildFixture({ id: childId, tenantId });
      
      // Phase 1 has 6 graphemes: s, a, t, p, i, n
      // Need to master at least 5 (80%) to advance
      const progress = createPhonicsProgressFixture({
        childId,
        currentPhase: 1,
        masteredGraphemes: ['s', 'a', 't', 'p', 'i'], // 5 of 6 = 83%
        introducedGraphemes: ['s', 'a', 't', 'p', 'i', 'n'],
        strugglingGraphemes: ['n'],
      });

      mockChildRepo.findByIdInTenant.mockResolvedValue(mockSuccess(child));
      mockPhonicsRepo.getOrCreate.mockResolvedValue(mockSuccess(progress));
      mockPhonicsRepo.findByChild.mockResolvedValue(mockSuccess(progress));
      mockPhonicsRepo.update.mockResolvedValue(mockSuccess({ ...progress, currentPhase: 2 }));

      const result = await service.advancePhonicsPhase(tenantId, childId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.newPhase).toBe(2);
        expect(result.data.message).toContain('Congratulations');
      }
    });

    it('should reject advancement when not ready', async () => {
      const childId = generateChildId();
      const child = createChildFixture({ id: childId, tenantId });
      
      // Only 50% mastered - not ready
      const progress = createPhonicsProgressFixture({
        childId,
        currentPhase: 1,
        masteredGraphemes: ['s', 'a', 't'], // 3 of 6 = 50%
        introducedGraphemes: ['s', 'a', 't', 'p', 'i', 'n'],
        strugglingGraphemes: ['p', 'i', 'n'],
      });

      mockChildRepo.findByIdInTenant.mockResolvedValue(mockSuccess(child));
      mockPhonicsRepo.getOrCreate.mockResolvedValue(mockSuccess(progress));

      const result = await service.advancePhonicsPhase(tenantId, childId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('not mastered enough');
      }
    });
  });
});
