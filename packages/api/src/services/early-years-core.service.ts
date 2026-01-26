/**
 * Early Years Core Service - Little Explorers
 *
 * Business logic layer for the Early Years education module (ages 3-7).
 * Implements domain rules for:
 * - Family and child management
 * - Picture password authentication for pre-literate children
 * - Learning sessions with age-appropriate time limits
 * - Phonics progression (Systematic Synthetic Phonics - 6 phases)
 * - Numeracy development (Concrete-Pictorial-Abstract approach)
 * - Gamification (treasures, stars, streaks)
 */

import bcrypt from 'bcrypt';
import { log } from '../lib/logger';
import {
  earlyYearsFamilyRepository,
  earlyYearsChildRepository,
  earlyYearsSessionRepository,
  earlyYearsActivityRepository,
  earlyYearsPhonicsProgressRepository,
  earlyYearsPicturePasswordRepository,
  EarlyYearsFamilyRepository,
  EarlyYearsChildRepository,
  EarlyYearsSessionRepository,
  EarlyYearsActivityRepository,
  EarlyYearsPhonicsProgressRepository,
  EarlyYearsPicturePasswordRepository,
} from '../repositories/early-years.repository';

// ============================================================================
// TYPES
// ============================================================================

export interface SessionLimits {
  maxMinutes: number;
  maxActivities: number;
}

export interface ActivityResult {
  activityId: string;
  treasureAwarded: boolean;
  starsEarned: number;
  phonicsProgressUpdated: boolean;
  sessionComplete: boolean;
  message: string;
}

export interface SessionSummary {
  sessionId: string;
  durationMinutes: number;
  activitiesCompleted: number;
  treasuresEarned: number;
  starsEarned: number;
  phonicsProgress: {
    graphemesMastered: string[];
    graphemesIntroduced: string[];
    currentPhase: number;
  };
  streakInfo: {
    currentStreak: number;
    longestStreak: number;
    streakContinued: boolean;
  };
}

export interface ChildDashboard {
  childId: string;
  childName: string;
  avatarId: string | null;
  age: number;
  sessionLimits: SessionLimits;
  stats: {
    totalTreasures: number;
    totalStars: number;
    totalLearningMinutes: number;
    currentStreak: number;
    longestStreak: number;
  };
  phonicsProgress: {
    currentPhase: number;
    masteredGraphemes: string[];
    introducedGraphemes: string[];
    strugglingGraphemes: string[];
    nextGraphemes: string[];
  };
  numeracyProgress: {
    currentLevel: string;
    highestNumberRecognised: number;
    operationsIntroduced: string[];
    shapesKnown: string[];
  };
  recentAchievements: string[];
  suggestedWorld: string;
  suggestedMentor: string;
}

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// Phonics phases (Systematic Synthetic Phonics)
const PHONICS_PHASES: Record<number, string[]> = {
  1: ['s', 'a', 't', 'p', 'i', 'n'],
  2: ['ck', 'e', 'h', 'r', 'm', 'd', 'g', 'o', 'u', 'l', 'f', 'b', 'j', 'z', 'w', 'v', 'y', 'x', 'qu'],
  3: ['ch', 'sh', 'th', 'ng', 'ai', 'ee', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'er'],
  4: ['ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'wh', 'ph', 'ew', 'oe', 'au'],
  5: ['ay', 'a-e', 'ea', 'ie', 'i-e', 'ey', 'oe', 'o-e', 'ou', 'ue', 'u-e', 'ew'],
  6: ['ough', 'tion', 'sion', 'cian', 'ious', 'eous', 'ible', 'able'],
};

// ============================================================================
// EARLY YEARS CORE SERVICE
// ============================================================================

export class EarlyYearsCoreService {
  constructor(
    private readonly familyRepo: EarlyYearsFamilyRepository = earlyYearsFamilyRepository,
    private readonly childRepo: EarlyYearsChildRepository = earlyYearsChildRepository,
    private readonly sessionRepo: EarlyYearsSessionRepository = earlyYearsSessionRepository,
    private readonly activityRepo: EarlyYearsActivityRepository = earlyYearsActivityRepository,
    private readonly phonicsRepo: EarlyYearsPhonicsProgressRepository = earlyYearsPhonicsProgressRepository,
    private readonly picturePasswordRepo: EarlyYearsPicturePasswordRepository = earlyYearsPicturePasswordRepository
  ) {}

  // ===========================================================================
  // FAMILY MANAGEMENT
  // ===========================================================================

  async createFamily(
    tenantId: string,
    userId: string,
    input: {
      familyName?: string;
      primaryLanguage?: string;
      homeLanguages?: string[];
      timezone?: string;
      dataProcessingConsent: boolean;
    }
  ): Promise<Result<{ familyId: string; message: string }>> {
    try {
      const existing = await this.familyRepo.findByPrimaryUser(tenantId, userId);
      if (existing) {
        return {
          success: false,
          error: { code: 'CONFLICT', message: 'User already has a family registered' },
        };
      }

      const family = await this.familyRepo.create(tenantId, {
        primaryUser: { connect: { id: userId } },
        familyName: input.familyName,
        primaryLanguage: input.primaryLanguage || 'en',
        homeLanguages: input.homeLanguages || [],
        timezone: input.timezone || 'Australia/Sydney',
        dataProcessingConsent: input.dataProcessingConsent,
        dataProcessingConsentAt: new Date(),
      });

      return {
        success: true,
        data: {
          familyId: family.id,
          message: 'Family created successfully. You can now enroll children.',
        },
      };
    } catch (error) {
      log.error('Error creating family', error as Error, { tenantId, userId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create family' },
      };
    }
  }

  async getFamily(
    tenantId: string,
    familyId: string
  ): Promise<Result<{
    family: {
      id: string;
      familyName: string | null;
      primaryLanguage: string;
      homeLanguages: string[];
      timezone: string;
      totalLearningMinutes: number;
      lastActiveAt: Date | null;
    };
    children: Array<{
      id: string;
      firstName: string;
      preferredName: string | null;
      age: number;
      avatarId: string | null;
      currentStreak: number;
      totalTreasures: number;
      totalStars: number;
    }>;
  }>> {
    try {
      const familyWithChildren = await this.familyRepo.findWithChildren(tenantId, familyId);
      if (!familyWithChildren) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Family not found' },
        };
      }

      return {
        success: true,
        data: {
          family: {
            id: familyWithChildren.id,
            familyName: familyWithChildren.familyName,
            primaryLanguage: familyWithChildren.primaryLanguage,
            homeLanguages: familyWithChildren.homeLanguages,
            timezone: familyWithChildren.timezone,
            totalLearningMinutes: familyWithChildren.totalLearningMinutes,
            lastActiveAt: familyWithChildren.lastActiveAt,
          },
          children: familyWithChildren.children.map((child) => ({
            id: child.id,
            firstName: child.firstName,
            preferredName: child.preferredName,
            age: this.calculateAge(child.dateOfBirth),
            avatarId: child.avatarId,
            currentStreak: child.currentStreak,
            totalTreasures: child.totalTreasures,
            totalStars: child.totalStars,
          })),
        },
      };
    } catch (error) {
      log.error('Error getting family', error as Error, { tenantId, familyId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get family' },
      };
    }
  }

  async getFamilyByUser(
    tenantId: string,
    userId: string
  ): Promise<Result<{ familyId: string }>> {
    try {
      const family = await this.familyRepo.findByPrimaryUser(tenantId, userId);
      if (!family) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Family not found for user' },
        };
      }

      return { success: true, data: { familyId: family.id } };
    } catch (error) {
      log.error('Error getting family by user', error as Error, { tenantId, userId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get family' },
      };
    }
  }

  // ===========================================================================
  // CHILD MANAGEMENT
  // ===========================================================================

  async enrollChild(
    tenantId: string,
    familyId: string,
    input: {
      firstName: string;
      preferredName?: string;
      dateOfBirth: Date;
      avatarId?: string;
    }
  ): Promise<Result<{ childId: string; message: string }>> {
    try {
      const family = await this.familyRepo.findById(tenantId, familyId);
      if (!family) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Family not found' },
        };
      }

      const age = this.calculateAge(input.dateOfBirth);
      if (age < 3 || age > 7) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Child must be between 3 and 7 years old. Child is ${age} years old.`,
          },
        };
      }

      const child = await this.childRepo.create(tenantId, familyId, {
        firstName: input.firstName,
        preferredName: input.preferredName,
        dateOfBirth: input.dateOfBirth,
        avatarId: input.avatarId,
      });

      // Initialize phonics progress
      await this.phonicsRepo.getOrCreate(child.id);

      return {
        success: true,
        data: {
          childId: child.id,
          message: `${input.firstName} has been enrolled! You can now set up their picture password.`,
        },
      };
    } catch (error) {
      log.error('Error enrolling child', error as Error, { tenantId, familyId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to enroll child' },
      };
    }
  }

  async getChildDashboard(
    tenantId: string,
    childId: string
  ): Promise<Result<ChildDashboard>> {
    try {
      const child = await this.childRepo.findWithProgress(tenantId, childId);
      if (!child) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Child not found' },
        };
      }

      const age = this.calculateAge(child.dateOfBirth);
      const limits = this.getSessionLimitsForAge(age);

      const phonicsProgress = child.phonicsProgress || {
        currentPhase: 1,
        masteredGraphemes: [],
        introducedGraphemes: [],
        strugglingGraphemes: [],
      };

      const nextGraphemes = this.getNextGraphemesToLearn(
        phonicsProgress.currentPhase,
        phonicsProgress.masteredGraphemes,
        phonicsProgress.introducedGraphemes
      );

      const numeracyProgress = child.numeracyProgress || {
        currentLevel: 'foundations',
        highestNumberRecognised: 10,
        operationsIntroduced: [],
        shapesKnown: [],
      };

      const recentAchievements = this.calculateRecentAchievements(child);
      const suggestedWorld = this.suggestWorld(phonicsProgress);
      const suggestedMentor = this.suggestMentor(child);

      return {
        success: true,
        data: {
          childId: child.id,
          childName: child.preferredName || child.firstName,
          avatarId: child.avatarId,
          age,
          sessionLimits: limits,
          stats: {
            totalTreasures: child.totalTreasures,
            totalStars: child.totalStars,
            totalLearningMinutes: child.totalLearningMinutes,
            currentStreak: child.currentStreak,
            longestStreak: child.longestStreak,
          },
          phonicsProgress: {
            currentPhase: phonicsProgress.currentPhase,
            masteredGraphemes: phonicsProgress.masteredGraphemes,
            introducedGraphemes: phonicsProgress.introducedGraphemes,
            strugglingGraphemes: phonicsProgress.strugglingGraphemes,
            nextGraphemes,
          },
          numeracyProgress: {
            currentLevel: numeracyProgress.currentLevel,
            highestNumberRecognised: numeracyProgress.highestNumberRecognised,
            operationsIntroduced: numeracyProgress.operationsIntroduced,
            shapesKnown: numeracyProgress.shapesKnown,
          },
          recentAchievements,
          suggestedWorld,
          suggestedMentor,
        },
      };
    } catch (error) {
      log.error('Error getting child dashboard', error as Error, { tenantId, childId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get child dashboard' },
      };
    }
  }

  // ===========================================================================
  // PICTURE PASSWORD AUTHENTICATION
  // ===========================================================================

  async setupPicturePassword(
    tenantId: string,
    childId: string,
    imageSequence: string[]
  ): Promise<Result<{ message: string }>> {
    try {
      const child = await this.childRepo.findById(tenantId, childId);
      if (!child) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Child not found' },
        };
      }

      const sequenceHash = await this.hashPictureSequence(imageSequence);
      const existing = await this.picturePasswordRepo.findByChild(childId);

      if (existing) {
        await this.picturePasswordRepo.update(childId, {
          imageSequenceHash: sequenceHash,
          sequenceLength: imageSequence.length,
          failedAttempts: 0,
          lockedUntil: null,
        });
      } else {
        await this.picturePasswordRepo.create(childId, {
          imageSequenceHash: sequenceHash,
          sequenceLength: imageSequence.length,
        });
      }

      return {
        success: true,
        data: { message: 'Picture password has been set up successfully!' },
      };
    } catch (error) {
      log.error('Error setting up picture password', error as Error, { tenantId, childId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to set up picture password' },
      };
    }
  }

  async verifyPicturePassword(
    tenantId: string,
    childId: string,
    imageSequence: string[]
  ): Promise<Result<{ verified: boolean; childName: string; avatarId: string | null }>> {
    try {
      const child = await this.childRepo.findById(tenantId, childId);
      if (!child) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Child not found' },
        };
      }

      const picturePassword = await this.picturePasswordRepo.findByChild(childId);
      if (!picturePassword) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Picture password not set up' },
        };
      }

      // Check if locked
      if (picturePassword.lockedUntil && picturePassword.lockedUntil > new Date()) {
        const remainingSeconds = Math.ceil(
          (picturePassword.lockedUntil.getTime() - Date.now()) / 1000
        );
        return {
          success: false,
          error: {
            code: 'LOCKED',
            message: `Too many failed attempts. Please try again in ${remainingSeconds} seconds.`,
          },
        };
      }

      // Verify sequence length
      if (imageSequence.length !== picturePassword.sequenceLength) {
        await this.picturePasswordRepo.recordFailedAttempt(childId);
        return {
          success: true,
          data: { verified: false, childName: child.firstName, avatarId: child.avatarId },
        };
      }

      // Verify hash
      const matches = await bcrypt.compare(
        imageSequence.join('|'),
        picturePassword.imageSequenceHash
      );

      if (!matches) {
        await this.picturePasswordRepo.recordFailedAttempt(childId);
        return {
          success: true,
          data: { verified: false, childName: child.firstName, avatarId: child.avatarId },
        };
      }

      // Success - reset attempts
      await this.picturePasswordRepo.resetAttempts(childId);

      return {
        success: true,
        data: {
          verified: true,
          childName: child.preferredName || child.firstName,
          avatarId: child.avatarId,
        },
      };
    } catch (error) {
      log.error('Error verifying picture password', error as Error, { tenantId, childId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify picture password' },
      };
    }
  }

  // ===========================================================================
  // LEARNING SESSIONS
  // ===========================================================================

  async startSession(
    tenantId: string,
    childId: string,
    input: {
      sessionType?: string;
      world?: string;
      mentor?: string;
    }
  ): Promise<Result<{
    sessionId: string;
    limits: SessionLimits;
    world: string;
    mentor: string;
  }>> {
    try {
      const child = await this.childRepo.findWithProgress(tenantId, childId);
      if (!child) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Child not found' },
        };
      }

      const age = this.calculateAge(child.dateOfBirth);
      const limits = this.getSessionLimitsForAge(age);

      // End any active session
      const activeSession = await this.sessionRepo.findActiveSession(tenantId, childId);
      if (activeSession) {
        await this.sessionRepo.endSession(activeSession.id, { completedNaturally: false });
      }

      const phonicsProgress = child.phonicsProgress || { currentPhase: 1, masteredGraphemes: [] };
      const world = input.world || this.suggestWorld(phonicsProgress);
      const mentor = input.mentor || this.suggestMentor(child);

      const session = await this.sessionRepo.create(tenantId, {
        childId,
        familyId: child.familyId,
        sessionType: input.sessionType || 'learning',
        world,
        mentor,
        maxDurationMinutes: limits.maxMinutes,
        maxActivities: limits.maxActivities,
      });

      return {
        success: true,
        data: {
          sessionId: session.id,
          limits,
          world,
          mentor,
        },
      };
    } catch (error) {
      log.error('Error starting session', error as Error, { tenantId, childId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to start session' },
      };
    }
  }

  async recordActivity(
    tenantId: string,
    sessionId: string,
    input: {
      activityType: string;
      targetContent: string[];
      difficulty?: number;
      score?: number;
      durationSeconds?: number;
      attempts?: number;
      hintsUsed?: number;
      errorsCommitted?: number;
      responseData?: Record<string, unknown>;
    }
  ): Promise<Result<ActivityResult>> {
    try {
      const session = await this.sessionRepo.findWithActivities(tenantId, sessionId);
      if (!session) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session not found' },
        };
      }

      if (session.endedAt) {
        return {
          success: false,
          error: { code: 'SESSION_ENDED', message: 'Session has already ended' },
        };
      }

      if (session.activitiesCompleted >= session.maxActivities) {
        return {
          success: false,
          error: { code: 'LIMIT_REACHED', message: 'Maximum activities reached' },
        };
      }

      const elapsedMinutes = (Date.now() - session.startedAt.getTime()) / (1000 * 60);
      if (elapsedMinutes >= session.maxDurationMinutes) {
        await this.endSession(tenantId, sessionId, {});
        return {
          success: false,
          error: { code: 'TIME_LIMIT', message: 'Session time limit reached' },
        };
      }

      const activity = await this.activityRepo.create(sessionId, {
        activityType: input.activityType,
        targetContent: input.targetContent,
        difficulty: input.difficulty || 1,
      });

      const score = input.score ?? 0;
      await this.activityRepo.completeActivity(activity.id, {
        score,
        durationSeconds: input.durationSeconds || 0,
        attempts: input.attempts || 1,
        hintsUsed: input.hintsUsed || 0,
        errorsCommitted: input.errorsCommitted || 0,
        responseData: input.responseData,
      });

      const treasureAwarded = score >= 0.8;
      const starsEarned = this.calculateStars(score, input.attempts || 1, input.hintsUsed || 0);

      await this.sessionRepo.update(sessionId, {
        activitiesCompleted: session.activitiesCompleted + 1,
        treasuresEarned: session.treasuresEarned + (treasureAwarded ? 1 : 0),
        starsEarned: session.starsEarned + starsEarned,
      });

      await this.childRepo.updateEngagement(session.childId, {
        treasuresEarned: treasureAwarded ? 1 : 0,
        starsEarned,
      });

      let phonicsProgressUpdated = false;
      if (this.isPhonicsActivity(input.activityType) && score >= 0.7) {
        for (const grapheme of input.targetContent) {
          await this.phonicsRepo.updateGraphemeMastery(
            session.childId,
            grapheme,
            score >= 0.9
          );
          phonicsProgressUpdated = true;
        }
      }

      const sessionComplete =
        session.activitiesCompleted + 1 >= session.maxActivities ||
        elapsedMinutes >= session.maxDurationMinutes - 1;

      return {
        success: true,
        data: {
          activityId: activity.id,
          treasureAwarded,
          starsEarned,
          phonicsProgressUpdated,
          sessionComplete,
          message: this.getEncouragementMessage(score, treasureAwarded, starsEarned),
        },
      };
    } catch (error) {
      log.error('Error recording activity', error as Error, { tenantId, sessionId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to record activity' },
      };
    }
  }

  async endSession(
    tenantId: string,
    sessionId: string,
    input: { childMoodRating?: number; parentNotes?: string }
  ): Promise<Result<SessionSummary>> {
    try {
      const session = await this.sessionRepo.findWithActivities(tenantId, sessionId);
      if (!session) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session not found' },
        };
      }

      if (session.endedAt) {
        return {
          success: false,
          error: { code: 'SESSION_ENDED', message: 'Session has already ended' },
        };
      }

      const durationMinutes = Math.round(
        (Date.now() - session.startedAt.getTime()) / (1000 * 60)
      );

      await this.sessionRepo.endSession(sessionId, {
        completedNaturally: session.activitiesCompleted >= session.maxActivities,
        childMoodRating: input.childMoodRating,
        parentNotes: input.parentNotes,
      });

      const child = await this.childRepo.updateStreak(session.childId);
      const streakInfo = {
        currentStreak: child.currentStreak,
        longestStreak: child.longestStreak,
        streakContinued: child.currentStreak > 1,
      };

      await this.childRepo.updateEngagement(session.childId, {
        learningMinutes: durationMinutes,
      });

      await this.familyRepo.addLearningMinutes(session.familyId, durationMinutes);

      const phonicsProgress = await this.phonicsRepo.findByChild(session.childId);
      const phonicsData = phonicsProgress
        ? {
            graphemesMastered: phonicsProgress.masteredGraphemes,
            graphemesIntroduced: phonicsProgress.introducedGraphemes,
            currentPhase: phonicsProgress.currentPhase,
          }
        : {
            graphemesMastered: [],
            graphemesIntroduced: [],
            currentPhase: 1,
          };

      return {
        success: true,
        data: {
          sessionId,
          durationMinutes,
          activitiesCompleted: session.activitiesCompleted,
          treasuresEarned: session.treasuresEarned,
          starsEarned: session.starsEarned,
          phonicsProgress: phonicsData,
          streakInfo,
        },
      };
    } catch (error) {
      log.error('Error ending session', error as Error, { tenantId, sessionId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to end session' },
      };
    }
  }

  // ===========================================================================
  // PHONICS PROGRESS
  // ===========================================================================

  async getPhonicsProgress(
    tenantId: string,
    childId: string
  ): Promise<Result<{
    currentPhase: number;
    phaseProgress: number;
    masteredGraphemes: string[];
    introducedGraphemes: string[];
    strugglingGraphemes: string[];
    nextGraphemes: string[];
    totalGraphemesInPhase: number;
    readyForNextPhase: boolean;
  }>> {
    try {
      const child = await this.childRepo.findById(tenantId, childId);
      if (!child) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Child not found' },
        };
      }

      const progress = await this.phonicsRepo.getOrCreate(childId);
      const phaseGraphemes = PHONICS_PHASES[progress.currentPhase] || [];

      const masteredInPhase = progress.masteredGraphemes.filter((g) =>
        phaseGraphemes.includes(g)
      );

      const phaseProgress =
        phaseGraphemes.length > 0 ? masteredInPhase.length / phaseGraphemes.length : 0;

      const nextGraphemes = this.getNextGraphemesToLearn(
        progress.currentPhase,
        progress.masteredGraphemes,
        progress.introducedGraphemes
      );

      const readyForNextPhase = phaseProgress >= 0.8 && progress.currentPhase < 6;

      return {
        success: true,
        data: {
          currentPhase: progress.currentPhase,
          phaseProgress,
          masteredGraphemes: progress.masteredGraphemes,
          introducedGraphemes: progress.introducedGraphemes,
          strugglingGraphemes: progress.strugglingGraphemes,
          nextGraphemes,
          totalGraphemesInPhase: phaseGraphemes.length,
          readyForNextPhase,
        },
      };
    } catch (error) {
      log.error('Error getting phonics progress', error as Error, { tenantId, childId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get phonics progress' },
      };
    }
  }

  async advancePhonicsPhase(
    tenantId: string,
    childId: string
  ): Promise<Result<{ newPhase: number; message: string }>> {
    try {
      const progressResult = await this.getPhonicsProgress(tenantId, childId);
      if (!progressResult.success) {
        return { success: false, error: progressResult.error };
      }
      if (!progressResult.data) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Progress data not found' } };
      }

      if (!progressResult.data.readyForNextPhase) {
        return {
          success: false,
          error: {
            code: 'NOT_READY',
            message: `Child has not mastered enough graphemes. ${Math.round(progressResult.data.phaseProgress * 100)}% complete.`,
          },
        };
      }

      const phonicsProgress = await this.phonicsRepo.findByChild(childId);
      if (!phonicsProgress) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Phonics progress not found' },
        };
      }

      const newPhase = phonicsProgress.currentPhase + 1;
      await this.phonicsRepo.update(phonicsProgress.id, { currentPhase: newPhase });

      return {
        success: true,
        data: {
          newPhase,
          message: `Congratulations! Advanced to Phase ${newPhase}!`,
        },
      };
    } catch (error) {
      log.error('Error advancing phonics phase', error as Error, { tenantId, childId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to advance phonics phase' },
      };
    }
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private getSessionLimitsForAge(age: number): SessionLimits {
    if (age <= 4) {
      return { maxMinutes: 15, maxActivities: 8 };
    } else if (age <= 6) {
      return { maxMinutes: 20, maxActivities: 12 };
    } else {
      return { maxMinutes: 25, maxActivities: 15 };
    }
  }

  private async hashPictureSequence(sequence: string[]): Promise<string> {
    const combined = sequence.join('|');
    return bcrypt.hash(combined, 10);
  }

  private getNextGraphemesToLearn(
    currentPhase: number,
    mastered: string[],
    introduced: string[]
  ): string[] {
    const phaseGraphemes = PHONICS_PHASES[currentPhase] || [];
    const masteredSet = new Set(mastered);
    const introducedSet = new Set(introduced);

    const inProgress = phaseGraphemes.filter(
      (g) => introducedSet.has(g) && !masteredSet.has(g)
    );

    const newGraphemes = phaseGraphemes.filter((g) => !introducedSet.has(g));

    return [...inProgress, ...newGraphemes].slice(0, 3);
  }

  private isPhonicsActivity(activityType: string): boolean {
    return [
      'phoneme_identification',
      'grapheme_matching',
      'blending_practice',
      'segmenting_practice',
      'sight_word_recognition',
    ].includes(activityType);
  }

  private calculateStars(score: number, attempts: number, hintsUsed: number): number {
    let stars = 0;

    if (score >= 0.9) stars = 3;
    else if (score >= 0.7) stars = 2;
    else if (score >= 0.5) stars = 1;

    if (attempts === 1 && hintsUsed === 0 && score >= 0.8) {
      stars = Math.min(stars + 1, 3);
    }

    return stars;
  }

  private getEncouragementMessage(
    score: number,
    treasureAwarded: boolean,
    starsEarned: number
  ): string {
    if (score >= 0.9) {
      return treasureAwarded
        ? 'Amazing work! You found a treasure!'
        : "Fantastic job! You're a superstar!";
    }
    if (score >= 0.7) {
      return 'Great effort! Keep it up!';
    }
    if (score >= 0.5) {
      return "Good try! Let's practice a bit more!";
    }
    return "Keep trying! You'll get it!";
  }

  private suggestWorld(phonicsProgress: { currentPhase: number; masteredGraphemes: string[] }): string {
    if (phonicsProgress.currentPhase <= 2 && phonicsProgress.masteredGraphemes.length < 10) {
      return 'sound_discovery';
    }
    if (phonicsProgress.currentPhase >= 3) {
      return 'word_woods';
    }
    return 'letter_land';
  }

  private suggestMentor(child: { totalSessions: number }): string {
    if (child.totalSessions < 5) {
      return 'mimo_owl';
    }
    const mentors = ['mimo_owl', 'bongo_bear', 'melody_songbird', 'puzzle_fox'];
    return mentors[child.totalSessions % mentors.length];
  }

  private calculateRecentAchievements(child: {
    totalTreasures: number;
    currentStreak: number;
    totalLearningMinutes: number;
  }): string[] {
    const achievements: string[] = [];

    if (child.totalTreasures >= 100) achievements.push('treasure_master');
    else if (child.totalTreasures >= 50) achievements.push('treasure_hunter');
    else if (child.totalTreasures >= 10) achievements.push('treasure_finder');

    if (child.currentStreak >= 7) achievements.push('week_warrior');
    else if (child.currentStreak >= 3) achievements.push('streak_starter');

    if (child.totalLearningMinutes >= 600) achievements.push('dedicated_learner');
    else if (child.totalLearningMinutes >= 300) achievements.push('curious_explorer');

    return achievements.slice(0, 5);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const earlyYearsCoreService = new EarlyYearsCoreService();
