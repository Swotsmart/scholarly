/**
 * Early Years Service - Little Explorers
 * 
 * Business logic layer for the Early Years education module (ages 3-7).
 * Orchestrates repositories and implements domain rules for:
 * - Family and child management
 * - Picture password authentication for pre-literate children
 * - Learning sessions with age-appropriate time limits
 * - Phonics progression (Systematic Synthetic Phonics)
 * - Numeracy development (Concrete-Pictorial-Abstract approach)
 * - Gamification (treasures, stars, streaks)
 * 
 * @module @scholarly/early-years
 */

import {
  Result,
  success,
  failure,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  ConflictError,
  generateId,
  calculateAge,
  getSessionLimitsForAge,
  PhonicsPhase,
  PHONICS_PHASES,
  timingSafeEqual,
} from '@scholarly/shared';

import {
  familyRepository,
  childRepository,
  sessionRepository,
  activityRepository,
  phonicsProgressRepository,
  picturePasswordRepository,
  FamilyRepository,
  ChildRepository,
  SessionRepository,
  ActivityRepository,
  PhonicsProgressRepository,
  PicturePasswordRepository,
} from '@scholarly/database';

import {
  CreateFamily,
  EnrollChild,
  SetupPicturePassword,
  VerifyPicturePassword,
  StartSession,
  RecordActivity,
  EndSession,
} from '@scholarly/validation';

import bcrypt from 'bcryptjs';

// =============================================================================
// TYPES
// =============================================================================

/** Session limits based on child's age */
interface SessionLimits {
  maxMinutes: number;
  maxActivities: number;
}

/** Activity result with calculated rewards */
interface ActivityResult {
  activityId: string;
  treasureAwarded: boolean;
  starsEarned: number;
  phonicsProgressUpdated: boolean;
  sessionComplete: boolean;
  message: string;
}

/** Session summary after completion */
interface SessionSummary {
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

/** Child dashboard data */
interface ChildDashboard {
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

// =============================================================================
// EARLY YEARS SERVICE
// =============================================================================

export class EarlyYearsService {
  constructor(
    private readonly familyRepo: FamilyRepository = familyRepository,
    private readonly childRepo: ChildRepository = childRepository,
    private readonly sessionRepo: SessionRepository = sessionRepository,
    private readonly activityRepo: ActivityRepository = activityRepository,
    private readonly phonicsRepo: PhonicsProgressRepository = phonicsProgressRepository,
    private readonly picturePasswordRepo: PicturePasswordRepository = picturePasswordRepository,
  ) {}

  // ===========================================================================
  // FAMILY MANAGEMENT
  // ===========================================================================

  /**
   * Creates a new family account for the Early Years module.
   * 
   * A family is the top-level entity that contains one or more children.
   * The primary user (parent/guardian) manages the family and can enroll children.
   */
  async createFamily(
    tenantId: string,
    userId: string,
    input: CreateFamily
  ): Promise<Result<{ familyId: string; message: string }>> {
    // Check if user already has a family in this tenant
    const existingResult = await this.familyRepo.findByPrimaryUser(tenantId, userId);
    if (existingResult.success && existingResult.data) {
      return failure(new ConflictError('User already has a family registered'));
    }

    // Create the family
    const createResult = await this.familyRepo.createInTenant(tenantId, {
      primaryUserId: userId,
      familyName: input.familyName,
      primaryLanguage: input.primaryLanguage,
      homeLanguages: input.homeLanguages,
      timezone: input.timezone,
      dataProcessingConsent: input.dataProcessingConsent,
      dataProcessingConsentAt: new Date(),
    });

    if (!createResult.success) {
      return createResult;
    }

    return success({
      familyId: createResult.data.id,
      message: 'Family created successfully. You can now enroll children.',
    });
  }

  /**
   * Retrieves family details with all enrolled children.
   */
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
    const familyResult = await this.familyRepo.findWithChildren(tenantId, familyId);
    
    if (!familyResult.success) {
      return familyResult;
    }

    const family = familyResult.data;

    return success({
      family: {
        id: family.id,
        familyName: family.familyName,
        primaryLanguage: family.primaryLanguage,
        homeLanguages: family.homeLanguages,
        timezone: family.timezone,
        totalLearningMinutes: family.totalLearningMinutes,
        lastActiveAt: family.lastActiveAt,
      },
      children: family.children.map((child) => ({
        id: child.id,
        firstName: child.firstName,
        preferredName: child.preferredName,
        age: calculateAge(child.dateOfBirth),
        avatarId: child.avatarId,
        currentStreak: child.currentStreak,
        totalTreasures: child.totalTreasures,
        totalStars: child.totalStars,
      })),
    });
  }

  /**
   * Retrieves the family for a given user.
   */
  async getFamilyByUser(
    tenantId: string,
    userId: string
  ): Promise<Result<{ familyId: string }>> {
    const result = await this.familyRepo.findByPrimaryUser(tenantId, userId);
    
    if (!result.success) {
      return result;
    }

    if (!result.data) {
      return failure(new NotFoundError('Family', userId));
    }

    return success({ familyId: result.data.id });
  }

  // ===========================================================================
  // CHILD MANAGEMENT
  // ===========================================================================

  /**
   * Enrolls a new child into the family.
   * 
   * Children must be between 3-7 years old to use the Early Years module.
   * Each child gets their own progress tracking and can have a picture password
   * for independent login.
   */
  async enrollChild(
    tenantId: string,
    familyId: string,
    input: EnrollChild
  ): Promise<Result<{ childId: string; message: string }>> {
    // Verify family exists and belongs to tenant
    const familyResult = await this.familyRepo.findByIdInTenant(tenantId, familyId);
    if (!familyResult.success) {
      return familyResult;
    }

    // Calculate age to validate
    const age = calculateAge(input.dateOfBirth);
    if (age < 3 || age > 7) {
      return failure(new ValidationError(
        'Child must be between 3 and 7 years old for the Early Years program',
        [{ field: 'dateOfBirth', message: `Child is ${age} years old` }]
      ));
    }

    // Create the child
    const createResult = await this.childRepo.createInTenant(tenantId, {
      family: { connect: { id: familyId } },
      firstName: input.firstName,
      preferredName: input.preferredName,
      dateOfBirth: input.dateOfBirth,
      avatarId: input.avatarId,
    });

    if (!createResult.success) {
      return createResult;
    }

    const child = createResult.data;

    // Initialize phonics progress
    await this.phonicsRepo.getOrCreate(child.id);

    return success({
      childId: child.id,
      message: `${input.firstName} has been enrolled! You can now set up their picture password.`,
    });
  }

  /**
   * Gets the dashboard data for a child.
   * 
   * The dashboard provides a comprehensive view of the child's progress,
   * achievements, and personalized recommendations for their next learning session.
   */
  async getChildDashboard(
    tenantId: string,
    childId: string
  ): Promise<Result<ChildDashboard>> {
    // Get child with all progress data
    const childResult = await this.childRepo.findWithProgress(tenantId, childId);
    if (!childResult.success) {
      return childResult;
    }

    const child = childResult.data;
    const age = calculateAge(child.dateOfBirth);
    const limits = getSessionLimitsForAge(age);

    // Determine phonics progress
    const phonicsProgress = child.phonicsProgress || {
      currentPhase: 1,
      masteredGraphemes: [],
      introducedGraphemes: [],
      strugglingGraphemes: [],
    };

    // Calculate next graphemes to learn
    const nextGraphemes = this.getNextGraphemesToLearn(
      phonicsProgress.currentPhase,
      phonicsProgress.masteredGraphemes,
      phonicsProgress.introducedGraphemes
    );

    // Determine numeracy progress
    const numeracyProgress = child.numeracyProgress || {
      currentLevel: 'foundations',
      highestNumberRecognised: 0,
      operationsIntroduced: [],
      shapesKnown: [],
    };

    // Get recent achievements (last 5)
    const recentAchievements = this.calculateRecentAchievements(child);

    // Suggest next world based on progress
    const suggestedWorld = this.suggestWorld(phonicsProgress, numeracyProgress);
    const suggestedMentor = this.suggestMentor(child);

    return success({
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
    });
  }

  // ===========================================================================
  // PICTURE PASSWORD AUTHENTICATION
  // ===========================================================================

  /**
   * Sets up a picture password for a child.
   * 
   * Picture passwords allow pre-literate children to log in independently
   * by selecting a sequence of images. The sequence is hashed for security.
   */
  async setupPicturePassword(
    tenantId: string,
    childId: string,
    input: SetupPicturePassword
  ): Promise<Result<{ message: string }>> {
    // Verify child exists
    const childResult = await this.childRepo.findByIdInTenant(tenantId, childId);
    if (!childResult.success) {
      return childResult;
    }

    // Hash the image sequence
    const sequenceHash = await this.hashPictureSequence(input.imageSequence);

    // Check if picture password already exists
    const existingResult = await this.picturePasswordRepo.findByChild(childId);
    
    if (existingResult.success && existingResult.data) {
      // Update existing
      await this.picturePasswordRepo.update(existingResult.data.id, {
        imageSequenceHash: sequenceHash,
        sequenceLength: input.imageSequence.length,
        failedAttempts: 0,
        lockedUntil: null,
      });
    } else {
      // Create new
      await this.picturePasswordRepo.create({
        child: { connect: { id: childId } },
        imageSequenceHash: sequenceHash,
        sequenceLength: input.imageSequence.length,
      });
    }

    return success({
      message: 'Picture password has been set up successfully!',
    });
  }

  /**
   * Verifies a picture password for a child.
   * 
   * Returns a session token if successful. After 3 failed attempts,
   * the account is locked for 5 minutes to prevent brute-force attacks.
   */
  async verifyPicturePassword(
    tenantId: string,
    childId: string,
    input: VerifyPicturePassword
  ): Promise<Result<{ verified: boolean; childName: string; avatarId: string | null }>> {
    // Verify child exists
    const childResult = await this.childRepo.findByIdInTenant(tenantId, childId);
    if (!childResult.success) {
      return childResult;
    }

    const child = childResult.data;

    // Get picture password
    const ppResult = await this.picturePasswordRepo.findByChild(childId);
    if (!ppResult.success || !ppResult.data) {
      return failure(new NotFoundError('PicturePassword', childId));
    }

    const picturePassword = ppResult.data;

    // Check if locked
    if (picturePassword.lockedUntil && picturePassword.lockedUntil > new Date()) {
      const remainingSeconds = Math.ceil(
        (picturePassword.lockedUntil.getTime() - Date.now()) / 1000
      );
      return failure(new AuthenticationError(
        `Too many failed attempts. Please try again in ${remainingSeconds} seconds.`
      ));
    }

    // Verify sequence length matches
    if (input.imageSequence.length !== picturePassword.sequenceLength) {
      await this.picturePasswordRepo.recordFailedAttempt(childId);
      return success({ verified: false, childName: child.firstName, avatarId: child.avatarId });
    }

    // Hash and compare
    const inputHash = await this.hashPictureSequence(input.imageSequence);
    const matches = timingSafeEqual(inputHash, picturePassword.imageSequenceHash);

    if (!matches) {
      await this.picturePasswordRepo.recordFailedAttempt(childId);
      return success({ verified: false, childName: child.firstName, avatarId: child.avatarId });
    }

    // Success - reset failed attempts
    await this.picturePasswordRepo.resetAttempts(childId);

    return success({
      verified: true,
      childName: child.preferredName || child.firstName,
      avatarId: child.avatarId,
    });
  }

  // ===========================================================================
  // LEARNING SESSIONS
  // ===========================================================================

  /**
   * Starts a new learning session for a child.
   * 
   * Sessions are time-limited based on the child's age to ensure
   * age-appropriate screen time:
   * - Ages 3-4: 15 minutes, 8 activities max
   * - Ages 5-6: 20 minutes, 12 activities max
   * - Age 7: 25 minutes, 15 activities max
   */
  async startSession(
    tenantId: string,
    childId: string,
    input: StartSession
  ): Promise<Result<{
    sessionId: string;
    limits: SessionLimits;
    world: string;
    mentor: string;
  }>> {
    // Verify child exists and get age
    const childResult = await this.childRepo.findWithProgress(tenantId, childId);
    if (!childResult.success) {
      return childResult;
    }

    const child = childResult.data;
    const age = calculateAge(child.dateOfBirth);
    const limits = getSessionLimitsForAge(age);

    // Check for existing active session
    const activeResult = await this.sessionRepo.findActiveSession(tenantId, childId);
    if (activeResult.success && activeResult.data) {
      // End the stale session
      await this.sessionRepo.endSession(activeResult.data.id, {
        completedNaturally: false,
      });
    }

    // Determine world and mentor
    const world = input.world || this.suggestWorld(
      child.phonicsProgress || { currentPhase: 1, masteredGraphemes: [], introducedGraphemes: [], strugglingGraphemes: [] },
      child.numeracyProgress || { currentLevel: 'foundations', highestNumberRecognised: 0, operationsIntroduced: [], shapesKnown: [] }
    );
    const mentor = input.mentor || this.suggestMentor(child);

    // Create session
    const sessionResult = await this.sessionRepo.createInTenant(tenantId, {
      child: { connect: { id: childId } },
      family: { connect: { id: child.familyId } },
      sessionType: input.sessionType,
      world,
      mentor,
      maxDurationMinutes: limits.maxMinutes,
      maxActivities: limits.maxActivities,
    });

    if (!sessionResult.success) {
      return sessionResult;
    }

    return success({
      sessionId: sessionResult.data.id,
      limits,
      world,
      mentor,
    });
  }

  /**
   * Records an activity completion within a session.
   * 
   * Activities are the atomic units of learning - things like:
   * - Identifying a phoneme
   * - Matching graphemes to sounds
   * - Counting objects
   * - Recognizing shapes
   * 
   * Each successful activity can earn treasures and stars,
   * and may update the child's progress in phonics or numeracy.
   */
  async recordActivity(
    tenantId: string,
    sessionId: string,
    input: RecordActivity
  ): Promise<Result<ActivityResult>> {
    // Get session with child data
    const sessionResult = await this.sessionRepo.findWithActivities(tenantId, sessionId);
    if (!sessionResult.success) {
      return sessionResult;
    }

    const session = sessionResult.data;

    // Verify session is still active
    if (session.endedAt) {
      return failure(new ValidationError('Session has already ended'));
    }

    // Check activity limit
    if (session.activitiesCompleted >= session.maxActivities) {
      return failure(new ValidationError(
        'Maximum activities reached for this session',
        [{ field: 'activitiesCompleted', message: `${session.maxActivities} activities completed` }]
      ));
    }

    // Check time limit
    const elapsedMinutes = (Date.now() - session.startedAt.getTime()) / (1000 * 60);
    if (elapsedMinutes >= session.maxDurationMinutes) {
      // Auto-end session
      await this.endSession(tenantId, sessionId, { childMoodRating: undefined });
      return failure(new ValidationError('Session time limit reached'));
    }

    // Create the activity record
    const activityResult = await this.activityRepo.create({
      session: { connect: { id: sessionId } },
      activityType: input.activityType,
      targetContent: input.targetContent,
      difficulty: input.difficulty,
    });

    if (!activityResult.success) {
      return activityResult;
    }

    // Complete the activity with results
    const score = input.score ?? 0;
    const durationSeconds = input.durationSeconds ?? 0;

    await this.activityRepo.completeActivity(activityResult.data.id, {
      score,
      durationSeconds,
      attempts: input.attempts,
      hintsUsed: input.hintsUsed,
      errorsCommitted: input.errorsCommitted,
      responseData: input.responseData,
    });

    // Calculate rewards
    const treasureAwarded = score >= 0.8;
    const starsEarned = this.calculateStars(score, input.attempts, input.hintsUsed);

    // Update session stats
    await this.sessionRepo.update(sessionId, {
      activitiesCompleted: session.activitiesCompleted + 1,
      treasuresEarned: session.treasuresEarned + (treasureAwarded ? 1 : 0),
      starsEarned: session.starsEarned + starsEarned,
    });

    // Update child engagement
    await this.childRepo.updateEngagement(session.childId, {
      treasuresEarned: treasureAwarded ? 1 : 0,
      starsEarned,
    });

    // Update phonics progress if applicable
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

    // Check if session should end
    const sessionComplete = 
      session.activitiesCompleted + 1 >= session.maxActivities ||
      elapsedMinutes >= session.maxDurationMinutes - 1;

    return success({
      activityId: activityResult.data.id,
      treasureAwarded,
      starsEarned,
      phonicsProgressUpdated,
      sessionComplete,
      message: this.getEncouragementMessage(score, treasureAwarded, starsEarned),
    });
  }

  /**
   * Ends a learning session.
   * 
   * When a session ends, we:
   * 1. Calculate final statistics
   * 2. Update the child's streak
   * 3. Update family learning minutes
   * 4. Return a summary for the parent
   */
  async endSession(
    tenantId: string,
    sessionId: string,
    input: EndSession
  ): Promise<Result<SessionSummary>> {
    // Get session with activities
    const sessionResult = await this.sessionRepo.findWithActivities(tenantId, sessionId);
    if (!sessionResult.success) {
      return sessionResult;
    }

    const session = sessionResult.data;

    // Check if already ended
    if (session.endedAt) {
      return failure(new ValidationError('Session has already ended'));
    }

    // Calculate duration
    const durationMinutes = Math.round(
      (Date.now() - session.startedAt.getTime()) / (1000 * 60)
    );

    // End the session
    await this.sessionRepo.endSession(sessionId, {
      completedNaturally: session.activitiesCompleted >= session.maxActivities,
      childMoodRating: input.childMoodRating,
      parentNotes: input.parentNotes,
    });

    // Update child streak
    const streakResult = await this.childRepo.updateStreak(session.childId);
    const streakInfo = streakResult.success ? {
      currentStreak: streakResult.data.currentStreak,
      longestStreak: streakResult.data.longestStreak,
      streakContinued: streakResult.data.currentStreak > 1,
    } : {
      currentStreak: 1,
      longestStreak: 1,
      streakContinued: false,
    };

    // Update child learning minutes
    await this.childRepo.updateEngagement(session.childId, {
      learningMinutes: durationMinutes,
    });

    // Update family learning minutes
    await this.familyRepo.addLearningMinutes(session.familyId, durationMinutes);

    // Get phonics progress
    const phonicsResult = await this.phonicsRepo.findByChild(session.childId);
    const phonicsProgress = phonicsResult.success && phonicsResult.data ? {
      graphemesMastered: phonicsResult.data.masteredGraphemes,
      graphemesIntroduced: phonicsResult.data.introducedGraphemes,
      currentPhase: phonicsResult.data.currentPhase,
    } : {
      graphemesMastered: [],
      graphemesIntroduced: [],
      currentPhase: 1,
    };

    return success({
      sessionId,
      durationMinutes,
      activitiesCompleted: session.activitiesCompleted,
      treasuresEarned: session.treasuresEarned,
      starsEarned: session.starsEarned,
      phonicsProgress,
      streakInfo,
    });
  }

  // ===========================================================================
  // PROGRESS TRACKING
  // ===========================================================================

  /**
   * Gets detailed phonics progress for a child.
   */
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
    // Verify child exists
    const childResult = await this.childRepo.findByIdInTenant(tenantId, childId);
    if (!childResult.success) {
      return childResult;
    }

    // Get phonics progress
    const progressResult = await this.phonicsRepo.getOrCreate(childId);
    if (!progressResult.success) {
      return progressResult;
    }

    const progress = progressResult.data;
    const phaseGraphemes = PHONICS_PHASES[progress.currentPhase] || [];
    
    const masteredInPhase = progress.masteredGraphemes.filter(
      g => phaseGraphemes.includes(g)
    );

    const phaseProgress = phaseGraphemes.length > 0
      ? masteredInPhase.length / phaseGraphemes.length
      : 0;

    const nextGraphemes = this.getNextGraphemesToLearn(
      progress.currentPhase,
      progress.masteredGraphemes,
      progress.introducedGraphemes
    );

    const readyForNextPhase = phaseProgress >= 0.8 && progress.currentPhase < 6;

    return success({
      currentPhase: progress.currentPhase,
      phaseProgress,
      masteredGraphemes: progress.masteredGraphemes,
      introducedGraphemes: progress.introducedGraphemes,
      strugglingGraphemes: progress.strugglingGraphemes,
      nextGraphemes,
      totalGraphemesInPhase: phaseGraphemes.length,
      readyForNextPhase,
    });
  }

  /**
   * Advances a child to the next phonics phase.
   */
  async advancePhonicsPhase(
    tenantId: string,
    childId: string
  ): Promise<Result<{ newPhase: number; message: string }>> {
    const progressResult = await this.getPhonicsProgress(tenantId, childId);
    if (!progressResult.success) {
      return progressResult;
    }

    const progress = progressResult.data;

    if (!progress.readyForNextPhase) {
      return failure(new ValidationError(
        'Child has not mastered enough graphemes to advance',
        [{ field: 'phaseProgress', message: `${Math.round(progress.phaseProgress * 100)}% complete` }]
      ));
    }

    const newPhase = progress.currentPhase + 1;

    // Get the phonics progress record
    const phonicsResult = await this.phonicsRepo.findByChild(childId);
    if (!phonicsResult.success || !phonicsResult.data) {
      return failure(new NotFoundError('PhonicsProgress', childId));
    }

    await this.phonicsRepo.update(phonicsResult.data.id, {
      currentPhase: newPhase,
    });

    return success({
      newPhase,
      message: `Congratulations! Advanced to Phase ${newPhase}!`,
    });
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Hashes a picture password sequence for secure storage.
   * We join the image IDs and hash them with bcrypt.
   */
  private async hashPictureSequence(sequence: string[]): Promise<string> {
    const combined = sequence.join('|');
    return bcrypt.hash(combined, 10);
  }

  /**
   * Determines which graphemes the child should learn next.
   */
  private getNextGraphemesToLearn(
    currentPhase: number,
    mastered: string[],
    introduced: string[]
  ): string[] {
    const phaseGraphemes = PHONICS_PHASES[currentPhase] || [];
    const masteredSet = new Set(mastered);
    const introducedSet = new Set(introduced);

    // First, prioritize graphemes that have been introduced but not mastered
    const inProgress = phaseGraphemes.filter(
      g => introducedSet.has(g) && !masteredSet.has(g)
    );

    // Then, add new graphemes from the current phase
    const newGraphemes = phaseGraphemes.filter(
      g => !introducedSet.has(g)
    );

    return [...inProgress, ...newGraphemes].slice(0, 3);
  }

  /**
   * Checks if an activity type is phonics-related.
   */
  private isPhonicsActivity(activityType: string): boolean {
    return [
      'phoneme_identification',
      'grapheme_matching',
      'blending_practice',
      'segmenting_practice',
      'sight_word_recognition',
    ].includes(activityType);
  }

  /**
   * Calculates stars earned based on performance.
   */
  private calculateStars(score: number, attempts: number, hintsUsed: number): number {
    let stars = 0;
    
    if (score >= 0.9) stars = 3;
    else if (score >= 0.7) stars = 2;
    else if (score >= 0.5) stars = 1;

    // Bonus for first attempt with no hints
    if (attempts === 1 && hintsUsed === 0 && score >= 0.8) {
      stars = Math.min(stars + 1, 3);
    }

    return stars;
  }

  /**
   * Generates an encouraging message based on performance.
   */
  private getEncouragementMessage(
    score: number,
    treasureAwarded: boolean,
    starsEarned: number
  ): string {
    if (score >= 0.9) {
      return treasureAwarded
        ? "Amazing work! You found a treasure! ⭐⭐⭐"
        : "Fantastic job! You're a superstar!";
    }
    if (score >= 0.7) {
      return "Great effort! Keep it up!";
    }
    if (score >= 0.5) {
      return "Good try! Let's practice a bit more!";
    }
    return "Keep trying! You'll get it!";
  }

  /**
   * Suggests a world based on progress.
   */
  private suggestWorld(
    phonicsProgress: { currentPhase: number; masteredGraphemes: string[] },
    numeracyProgress: { currentLevel: string }
  ): string {
    // If struggling with phonics, suggest sound discovery
    if (phonicsProgress.currentPhase <= 2 && phonicsProgress.masteredGraphemes.length < 10) {
      return 'sound_discovery';
    }

    // If ready for blending, suggest word woods
    if (phonicsProgress.currentPhase >= 3) {
      return 'word_woods';
    }

    // Default to letter land
    return 'letter_land';
  }

  /**
   * Suggests a mentor character for the child.
   */
  private suggestMentor(child: {
    totalSessions: number;
    currentStreak: number;
  }): string {
    // Mimo Owl for newcomers
    if (child.totalSessions < 5) {
      return 'mimo_owl';
    }

    // Rotate mentors to keep things interesting
    const mentors = ['mimo_owl', 'bongo_bear', 'melody_songbird', 'puzzle_fox'];
    return mentors[child.totalSessions % mentors.length];
  }

  /**
   * Calculates recent achievements for display.
   */
  private calculateRecentAchievements(child: {
    totalTreasures: number;
    currentStreak: number;
    longestStreak: number;
    totalLearningMinutes: number;
  }): string[] {
    const achievements: string[] = [];

    // Treasure milestones
    if (child.totalTreasures >= 100) achievements.push('treasure_master');
    else if (child.totalTreasures >= 50) achievements.push('treasure_hunter');
    else if (child.totalTreasures >= 10) achievements.push('treasure_finder');

    // Streak achievements
    if (child.currentStreak >= 7) achievements.push('week_warrior');
    else if (child.currentStreak >= 3) achievements.push('streak_starter');

    // Learning time achievements
    if (child.totalLearningMinutes >= 600) achievements.push('dedicated_learner');
    else if (child.totalLearningMinutes >= 300) achievements.push('curious_explorer');

    return achievements.slice(0, 5);
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const earlyYearsService = new EarlyYearsService();

// =============================================================================
// RE-EXPORTS
// =============================================================================

export type {
  SessionLimits,
  ActivityResult,
  SessionSummary,
  ChildDashboard,
};
