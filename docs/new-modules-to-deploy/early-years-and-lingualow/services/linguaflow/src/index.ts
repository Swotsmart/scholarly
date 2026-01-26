/**
 * LinguaFlow Service - Language Learning
 * 
 * Business logic layer for the LinguaFlow language learning module.
 * Supports 6 target languages with comprehensive features:
 * - CEFR-aligned proficiency tracking (A1-C2)
 * - SM-2 spaced repetition for vocabulary
 * - AI conversation practice
 * - Heritage speaker pathways
 * - IB curriculum alignment (PYP, MYP, DP)
 * - Offline learning support
 * 
 * @module @scholarly/linguaflow
 */

import {
  Result,
  success,
  failure,
  NotFoundError,
  ValidationError,
  ConflictError,
  generateId,
  calculateSM2,
  determineMasteryLevel,
  determineHeritagePathway,
  calculateXPLevel,
  CEFRLevel,
  TargetLanguage,
  LanguageSkill,
  HeritagePathway,
  MasteryLevel,
  MYP_PHASE_TO_CEFR,
} from '@scholarly/shared';

import {
  languageProfileRepository,
  vocabularyRepository,
  conversationRepository,
  heritagePathwayRepository,
  offlinePackageRepository,
  achievementRepository,
  LanguageProfileRepository,
  VocabularyRepository,
  ConversationRepository,
  HeritagePathwayRepository,
  OfflinePackageRepository,
  AchievementRepository,
} from '@scholarly/database';

import {
  CreateLanguageProfile,
  UpdateCefrLevel,
  CreateHeritagePathway,
  AddVocabulary,
  ReviewVocabulary,
  StartConversation,
  AddConversationMessage,
  EndConversation,
  CreateOfflinePackage,
  SyncOfflineProgress,
  AlignIbCriteria,
} from '@scholarly/validation';

// =============================================================================
// TYPES
// =============================================================================

/** Profile dashboard with comprehensive stats */
interface ProfileDashboard {
  profileId: string;
  targetLanguage: TargetLanguage;
  cefrLevels: {
    overall: CEFRLevel;
    listening: CEFRLevel;
    speaking: CEFRLevel;
    reading: CEFRLevel;
    writing: CEFRLevel;
  };
  xpProgress: {
    level: number;
    title: string;
    currentLevelXp: number;
    xpForNextLevel: number;
    progress: number;
  };
  vocabularyStats: {
    totalWords: number;
    mastered: number;
    learning: number;
    dueForReview: number;
  };
  conversationStats: {
    totalSessions: number;
    totalMinutes: number;
    averageScore: number;
  };
  currentStreak: number;
  longestStreak: number;
  heritagePathway: HeritagePathway | null;
  ibAlignment: {
    programme: string | null;
    phaseOrLevel: string | null;
    criteriaScores: Record<string, number>;
  } | null;
  recentAchievements: string[];
  dailyGoal: {
    wordsReviewed: number;
    target: number;
    completed: boolean;
  };
}

/** Vocabulary review session results */
interface ReviewSessionResult {
  wordsReviewed: number;
  correctCount: number;
  incorrectCount: number;
  xpEarned: number;
  newMasteredWords: string[];
  streakUpdated: boolean;
  dailyGoalCompleted: boolean;
}

/** Conversation summary */
interface ConversationSummary {
  conversationId: string;
  durationMinutes: number;
  messagesCount: number;
  vocabularyUsed: string[];
  structuresUsed: string[];
  fluencyScore: number;
  accuracyScore: number;
  pronunciationScore: number;
  overallScore: number;
  feedback: string[];
  suggestedPractice: string[];
  xpEarned: number;
}

/** Vocabulary item with SM-2 scheduling */
interface VocabularyItem {
  id: string;
  wordId: string;
  word: string;
  translation: string;
  cefrLevel: CEFRLevel;
  partOfSpeech: string | null;
  exampleSentence: string | null;
  audioUrl: string | null;
  masteryLevel: MasteryLevel;
  easeFactor: number;
  interval: number;
  nextReviewAt: Date;
  timesCorrect: number;
  timesIncorrect: number;
}

/** Offline package content */
interface OfflinePackageContent {
  packageId: string;
  packageType: string;
  createdAt: Date;
  expiresAt: Date;
  vocabulary: VocabularyItem[];
  conversationScenarios: Array<{
    id: string;
    title: string;
    description: string;
    targetVocabulary: string[];
    targetStructures: string[];
  }>;
  estimatedSizeKB: number;
}

// =============================================================================
// LINGUAFLOW SERVICE
// =============================================================================

export class LinguaFlowService {
  constructor(
    private readonly profileRepo: LanguageProfileRepository = languageProfileRepository,
    private readonly vocabRepo: VocabularyRepository = vocabularyRepository,
    private readonly conversationRepo: ConversationRepository = conversationRepository,
    private readonly heritageRepo: HeritagePathwayRepository = heritagePathwayRepository,
    private readonly offlineRepo: OfflinePackageRepository = offlinePackageRepository,
    private readonly achievementRepo: AchievementRepository = achievementRepository,
  ) {}

  // ===========================================================================
  // PROFILE MANAGEMENT
  // ===========================================================================

  /**
   * Creates a new language learning profile for a user.
   * 
   * A user can have multiple profiles, one for each target language.
   * The profile tracks CEFR levels, vocabulary, conversations, and achievements.
   */
  async createProfile(
    tenantId: string,
    userId: string,
    input: CreateLanguageProfile
  ): Promise<Result<{ profileId: string; message: string }>> {
    // Check if user already has a profile for this language
    const existingResult = await this.profileRepo.findByUserAndLanguage(
      tenantId,
      userId,
      input.targetLanguage
    );

    if (existingResult.success && existingResult.data) {
      return failure(new ConflictError(
        `You already have a profile for ${this.getLanguageName(input.targetLanguage)}`
      ));
    }

    // Determine initial CEFR level based on heritage status
    const initialLevel = input.isHeritageSpeaker ? CEFRLevel.A2 : CEFRLevel.A1;

    // Create the profile
    const createResult = await this.profileRepo.createInTenant(tenantId, {
      user: { connect: { id: userId } },
      targetLanguage: input.targetLanguage,
      nativeLanguage: input.nativeLanguage,
      additionalLanguages: input.additionalLanguages,
      isHeritageSpeaker: input.isHeritageSpeaker,
      curriculumFramework: input.curriculumFramework,
      yearLevel: input.yearLevel,
      ibProgramme: input.ibProgramme,
      ibPhaseOrLevel: input.ibPhaseOrLevel,
      overallCefrLevel: initialLevel,
      listeningCefrLevel: initialLevel,
      speakingCefrLevel: initialLevel,
      readingCefrLevel: initialLevel,
      writingCefrLevel: initialLevel,
    });

    if (!createResult.success) {
      return createResult;
    }

    return success({
      profileId: createResult.data.id,
      message: `Profile created for ${this.getLanguageName(input.targetLanguage)}. Let's start learning!`,
    });
  }

  /**
   * Gets the dashboard data for a language profile.
   */
  async getProfileDashboard(
    tenantId: string,
    profileId: string
  ): Promise<Result<ProfileDashboard>> {
    // Get profile with related data
    const profileResult = await this.profileRepo.findWithStats(tenantId, profileId);
    if (!profileResult.success) {
      return profileResult;
    }

    const profile = profileResult.data;

    // Calculate XP progress
    const xpProgress = calculateXPLevel(profile.totalXp);

    // Get vocabulary stats
    const vocabStatsResult = await this.vocabRepo.getStats(profileId);
    const vocabStats = vocabStatsResult.success ? vocabStatsResult.data : {
      totalWords: 0,
      mastered: 0,
      learning: 0,
      dueForReview: 0,
    };

    // Get conversation stats
    const convStatsResult = await this.conversationRepo.getStats(profileId);
    const convStats = convStatsResult.success ? convStatsResult.data : {
      totalSessions: 0,
      totalMinutes: 0,
      averageScore: 0,
    };

    // Get heritage pathway if applicable
    let heritagePathway: HeritagePathway | null = null;
    if (profile.isHeritageSpeaker) {
      const heritageResult = await this.heritageRepo.findByProfile(profileId);
      if (heritageResult.success && heritageResult.data) {
        heritagePathway = heritageResult.data.pathway;
      }
    }

    // Get IB alignment if applicable
    let ibAlignment = null;
    if (profile.ibProgramme) {
      const criteriaResult = await this.profileRepo.getIbCriteria(profileId);
      ibAlignment = {
        programme: profile.ibProgramme,
        phaseOrLevel: profile.ibPhaseOrLevel,
        criteriaScores: criteriaResult.success ? criteriaResult.data : {},
      };
    }

    // Get recent achievements
    const achievementsResult = await this.achievementRepo.getRecent(profileId, 5);
    const recentAchievements = achievementsResult.success
      ? achievementsResult.data.map(a => a.achievementType)
      : [];

    // Calculate daily goal progress
    const dailyReviewsResult = await this.vocabRepo.getTodayReviewCount(profileId);
    const wordsReviewed = dailyReviewsResult.success ? dailyReviewsResult.data : 0;
    const dailyTarget = this.calculateDailyTarget(profile.overallCefrLevel);

    return success({
      profileId: profile.id,
      targetLanguage: profile.targetLanguage as TargetLanguage,
      cefrLevels: {
        overall: profile.overallCefrLevel as CEFRLevel,
        listening: profile.listeningCefrLevel as CEFRLevel,
        speaking: profile.speakingCefrLevel as CEFRLevel,
        reading: profile.readingCefrLevel as CEFRLevel,
        writing: profile.writingCefrLevel as CEFRLevel,
      },
      xpProgress,
      vocabularyStats: vocabStats,
      conversationStats: convStats,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      heritagePathway,
      ibAlignment,
      recentAchievements,
      dailyGoal: {
        wordsReviewed,
        target: dailyTarget,
        completed: wordsReviewed >= dailyTarget,
      },
    });
  }

  /**
   * Updates a specific CEFR skill level.
   */
  async updateCefrLevel(
    tenantId: string,
    profileId: string,
    input: UpdateCefrLevel
  ): Promise<Result<{ message: string }>> {
    const profileResult = await this.profileRepo.findByIdInTenant(tenantId, profileId);
    if (!profileResult.success) {
      return profileResult;
    }

    const updateData: Record<string, CEFRLevel> = {};
    
    if (input.skill === 'overall') {
      updateData.overallCefrLevel = input.level;
    } else {
      updateData[`${input.skill}CefrLevel`] = input.level;
    }

    await this.profileRepo.update(profileId, updateData);

    return success({
      message: `${input.skill} level updated to ${input.level}`,
    });
  }

  // ===========================================================================
  // HERITAGE SPEAKER SUPPORT
  // ===========================================================================

  /**
   * Creates a heritage speaker pathway assessment.
   * 
   * Heritage speakers often have strong oral skills but limited literacy.
   * This assessment determines the appropriate learning pathway.
   */
  async createHeritagePathway(
    tenantId: string,
    profileId: string,
    input: CreateHeritagePathway
  ): Promise<Result<{ pathway: HeritagePathway; message: string }>> {
    // Verify profile exists and is heritage speaker
    const profileResult = await this.profileRepo.findByIdInTenant(tenantId, profileId);
    if (!profileResult.success) {
      return profileResult;
    }

    const profile = profileResult.data;
    if (!profile.isHeritageSpeaker) {
      return failure(new ValidationError(
        'This profile is not marked as a heritage speaker'
      ));
    }

    // Check for existing pathway
    const existingResult = await this.heritageRepo.findByProfile(profileId);
    if (existingResult.success && existingResult.data) {
      return failure(new ConflictError(
        'Heritage pathway already exists for this profile'
      ));
    }

    // Determine pathway
    const pathway = determineHeritagePathway(
      input.oralProficiency,
      input.literacyLevel,
      input.academicRegisterLevel
    );

    // Create the pathway record
    await this.heritageRepo.create({
      profile: { connect: { id: profileId } },
      pathway,
      oralProficiency: input.oralProficiency,
      literacyLevel: input.literacyLevel,
      academicRegisterLevel: input.academicRegisterLevel,
      dialectFeatures: input.dialectFeatures,
    });

    // Update profile CEFR levels based on assessment
    await this.profileRepo.update(profileId, {
      speakingCefrLevel: input.oralProficiency,
      listeningCefrLevel: input.oralProficiency,
      readingCefrLevel: input.literacyLevel,
      writingCefrLevel: input.literacyLevel,
      overallCefrLevel: this.calculateOverallCefr([
        input.oralProficiency,
        input.oralProficiency,
        input.literacyLevel,
        input.literacyLevel,
      ]),
    });

    return success({
      pathway,
      message: this.getHeritagePathwayMessage(pathway),
    });
  }

  // ===========================================================================
  // VOCABULARY MANAGEMENT
  // ===========================================================================

  /**
   * Adds a new vocabulary word to the profile.
   */
  async addVocabulary(
    tenantId: string,
    profileId: string,
    input: AddVocabulary
  ): Promise<Result<{ vocabularyId: string }>> {
    // Verify profile exists
    const profileResult = await this.profileRepo.findByIdInTenant(tenantId, profileId);
    if (!profileResult.success) {
      return profileResult;
    }

    // Check if word already exists
    const existingResult = await this.vocabRepo.findByWordId(profileId, input.wordId);
    if (existingResult.success && existingResult.data) {
      return failure(new ConflictError('This word is already in your vocabulary'));
    }

    // Calculate initial next review (tomorrow)
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + 1);

    // Create vocabulary entry
    const createResult = await this.vocabRepo.create({
      profile: { connect: { id: profileId } },
      wordId: input.wordId,
      word: input.word,
      translation: input.translation,
      cefrLevel: input.cefrLevel,
      partOfSpeech: input.partOfSpeech,
      exampleSentence: input.exampleSentence,
      audioUrl: input.audioUrl,
      masteryLevel: MasteryLevel.NEW,
      easeFactor: 2.5,
      interval: 1,
      nextReviewAt,
    });

    if (!createResult.success) {
      return createResult;
    }

    return success({ vocabularyId: createResult.data.id });
  }

  /**
   * Gets vocabulary items due for review.
   */
  async getVocabularyForReview(
    tenantId: string,
    profileId: string,
    limit: number = 20
  ): Promise<Result<VocabularyItem[]>> {
    // Verify profile exists
    const profileResult = await this.profileRepo.findByIdInTenant(tenantId, profileId);
    if (!profileResult.success) {
      return profileResult;
    }

    // Get due vocabulary
    const vocabResult = await this.vocabRepo.findDueForReview(profileId, limit);
    if (!vocabResult.success) {
      return vocabResult;
    }

    return success(vocabResult.data.map(v => ({
      id: v.id,
      wordId: v.wordId,
      word: v.word,
      translation: v.translation,
      cefrLevel: v.cefrLevel as CEFRLevel,
      partOfSpeech: v.partOfSpeech,
      exampleSentence: v.exampleSentence,
      audioUrl: v.audioUrl,
      masteryLevel: v.masteryLevel as MasteryLevel,
      easeFactor: v.easeFactor,
      interval: v.interval,
      nextReviewAt: v.nextReviewAt,
      timesCorrect: v.timesCorrect,
      timesIncorrect: v.timesIncorrect,
    })));
  }

  /**
   * Records a vocabulary review using the SM-2 algorithm.
   * 
   * Quality ratings:
   * 0 - Complete blackout
   * 1 - Incorrect, but recognized when shown
   * 2 - Incorrect, but easy to recall
   * 3 - Correct with difficulty
   * 4 - Correct with hesitation
   * 5 - Perfect recall
   */
  async reviewVocabulary(
    tenantId: string,
    profileId: string,
    input: ReviewVocabulary
  ): Promise<Result<{
    vocabularyId: string;
    masteryLevel: MasteryLevel;
    nextReviewAt: Date;
    correct: boolean;
  }>> {
    // Verify profile exists
    const profileResult = await this.profileRepo.findByIdInTenant(tenantId, profileId);
    if (!profileResult.success) {
      return profileResult;
    }

    // Get vocabulary item
    const vocabResult = await this.vocabRepo.findByWordId(profileId, input.wordId);
    if (!vocabResult.success || !vocabResult.data) {
      return failure(new NotFoundError('Vocabulary', input.wordId));
    }

    const vocab = vocabResult.data;
    const correct = input.quality >= 3;

    // Calculate SM-2 values
    const sm2Result = calculateSM2(
      input.quality,
      vocab.easeFactor,
      vocab.interval,
      correct ? vocab.timesCorrect : 0
    );

    // Determine new mastery level
    const newTimesCorrect = vocab.timesCorrect + (correct ? 1 : 0);
    const newTimesIncorrect = vocab.timesIncorrect + (correct ? 0 : 1);
    const masteryLevel = determineMasteryLevel(
      newTimesCorrect,
      newTimesIncorrect,
      sm2Result.interval
    );

    // Update vocabulary
    await this.vocabRepo.update(vocab.id, {
      easeFactor: sm2Result.easeFactor,
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions,
      nextReviewAt: sm2Result.nextReviewAt,
      lastReviewedAt: new Date(),
      timesCorrect: newTimesCorrect,
      timesIncorrect: newTimesIncorrect,
      masteryLevel,
    });

    // Award XP
    const xpEarned = correct ? (input.quality >= 4 ? 15 : 10) : 5;
    await this.profileRepo.addXp(profileId, xpEarned);

    return success({
      vocabularyId: vocab.id,
      masteryLevel,
      nextReviewAt: sm2Result.nextReviewAt,
      correct,
    });
  }

  /**
   * Completes a vocabulary review session and returns summary.
   */
  async completeReviewSession(
    tenantId: string,
    profileId: string,
    reviews: Array<{ wordId: string; quality: number }>
  ): Promise<Result<ReviewSessionResult>> {
    let correctCount = 0;
    let xpEarned = 0;
    const newMasteredWords: string[] = [];

    for (const review of reviews) {
      const result = await this.reviewVocabulary(tenantId, profileId, {
        wordId: review.wordId,
        quality: review.quality,
      });

      if (result.success) {
        if (result.data.correct) {
          correctCount++;
          xpEarned += review.quality >= 4 ? 15 : 10;
        } else {
          xpEarned += 5;
        }

        if (result.data.masteryLevel === MasteryLevel.MASTERED) {
          newMasteredWords.push(review.wordId);
        }
      }
    }

    // Update streak
    const streakResult = await this.profileRepo.updateStreak(profileId);
    const streakUpdated = streakResult.success;

    // Check daily goal
    const dashboardResult = await this.getProfileDashboard(tenantId, profileId);
    const dailyGoalCompleted = dashboardResult.success && dashboardResult.data.dailyGoal.completed;

    // Check for achievements
    await this.checkVocabularyAchievements(profileId, reviews.length, newMasteredWords.length);

    return success({
      wordsReviewed: reviews.length,
      correctCount,
      incorrectCount: reviews.length - correctCount,
      xpEarned,
      newMasteredWords,
      streakUpdated,
      dailyGoalCompleted,
    });
  }

  // ===========================================================================
  // CONVERSATION PRACTICE
  // ===========================================================================

  /**
   * Starts a new AI conversation practice session.
   */
  async startConversation(
    tenantId: string,
    profileId: string,
    input: StartConversation
  ): Promise<Result<{
    conversationId: string;
    aiGreeting: string;
    context: {
      mode: string;
      aiRole: string | null;
      targetVocabulary: string[];
      targetStructures: string[];
    };
  }>> {
    // Verify profile exists
    const profileResult = await this.profileRepo.findByIdInTenant(tenantId, profileId);
    if (!profileResult.success) {
      return profileResult;
    }

    const profile = profileResult.data;

    // Create conversation
    const createResult = await this.conversationRepo.create({
      profile: { connect: { id: profileId } },
      mode: input.mode,
      scenarioId: input.scenarioId,
      scenarioTitle: input.scenarioTitle,
      aiRole: input.aiRole,
      targetVocabulary: input.targetVocabulary,
      targetStructures: input.targetStructures,
      isHeritageVariant: input.isHeritageVariant,
    });

    if (!createResult.success) {
      return createResult;
    }

    // Generate AI greeting based on mode and context
    const aiGreeting = this.generateAIGreeting(
      input.mode,
      input.aiRole,
      profile.targetLanguage,
      profile.overallCefrLevel as CEFRLevel
    );

    return success({
      conversationId: createResult.data.id,
      aiGreeting,
      context: {
        mode: input.mode,
        aiRole: input.aiRole || null,
        targetVocabulary: input.targetVocabulary,
        targetStructures: input.targetStructures,
      },
    });
  }

  /**
   * Adds a message to an ongoing conversation.
   */
  async addConversationMessage(
    tenantId: string,
    conversationId: string,
    input: AddConversationMessage
  ): Promise<Result<{
    messageId: string;
    feedback: {
      pronunciationFeedback: string | null;
      grammarFeedback: string | null;
      vocabularyFeedback: string | null;
    } | null;
  }>> {
    // Get conversation
    const conversationResult = await this.conversationRepo.findById(conversationId);
    if (!conversationResult.success) {
      return conversationResult;
    }

    const conversation = conversationResult.data;

    // Verify conversation is still active
    if (conversation.endedAt) {
      return failure(new ValidationError('Conversation has already ended'));
    }

    // Add message
    const messageResult = await this.conversationRepo.addMessage(conversationId, {
      role: input.role,
      content: input.content,
      audioUrl: input.audioUrl,
      pronunciationScore: input.pronunciationScore,
    });

    if (!messageResult.success) {
      return messageResult;
    }

    // Generate feedback for user messages
    let feedback = null;
    if (input.role === 'user') {
      feedback = {
        pronunciationFeedback: input.pronunciationScore && input.pronunciationScore < 0.7
          ? 'Try to speak more clearly'
          : null,
        grammarFeedback: null, // Would be generated by AI in production
        vocabularyFeedback: null, // Would track target vocabulary usage
      };
    }

    return success({
      messageId: messageResult.data.id,
      feedback,
    });
  }

  /**
   * Ends a conversation and generates summary.
   */
  async endConversation(
    tenantId: string,
    conversationId: string,
    input: EndConversation
  ): Promise<Result<ConversationSummary>> {
    // Get conversation with messages
    const conversationResult = await this.conversationRepo.findWithMessages(conversationId);
    if (!conversationResult.success) {
      return conversationResult;
    }

    const conversation = conversationResult.data;

    // Verify not already ended
    if (conversation.endedAt) {
      return failure(new ValidationError('Conversation has already ended'));
    }

    // Calculate stats
    const userMessages = conversation.messages.filter(m => m.role === 'user');
    const durationMinutes = Math.round(
      (Date.now() - conversation.startedAt.getTime()) / (1000 * 60)
    );

    // Calculate scores (simplified - would use AI analysis in production)
    const pronunciationScores = userMessages
      .filter(m => m.pronunciationScore !== null)
      .map(m => m.pronunciationScore as number);
    
    const avgPronunciation = pronunciationScores.length > 0
      ? pronunciationScores.reduce((a, b) => a + b, 0) / pronunciationScores.length
      : 0.7;

    const fluencyScore = Math.min(1, userMessages.length / 10) * 0.5 + 
      Math.min(1, durationMinutes / 5) * 0.5;
    
    const accuracyScore = 0.75; // Would be calculated from grammar analysis
    const overallScore = (fluencyScore + accuracyScore + avgPronunciation) / 3;

    // Calculate XP
    const xpEarned = Math.round(
      durationMinutes * 5 + // Base XP for time
      userMessages.length * 3 + // XP per message
      overallScore * 50 // Bonus for performance
    );

    // Update conversation
    await this.conversationRepo.endConversation(conversationId, {
      fluencyScore,
      accuracyScore,
      pronunciationScore: avgPronunciation,
      overallScore,
      selfFluencyRating: input.selfFluencyRating,
      selfConfidenceRating: input.selfConfidenceRating,
    });

    // Award XP
    await this.profileRepo.addXp(conversation.profileId, xpEarned);

    // Update conversation stats
    await this.profileRepo.incrementConversationStats(conversation.profileId, durationMinutes);

    // Track vocabulary used
    const vocabularyUsed = this.extractVocabularyUsed(
      userMessages.map(m => m.content),
      conversation.targetVocabulary
    );

    return success({
      conversationId,
      durationMinutes,
      messagesCount: userMessages.length,
      vocabularyUsed,
      structuresUsed: [], // Would be analyzed in production
      fluencyScore,
      accuracyScore,
      pronunciationScore: avgPronunciation,
      overallScore,
      feedback: this.generateConversationFeedback(overallScore, vocabularyUsed),
      suggestedPractice: this.suggestNextPractice(overallScore, vocabularyUsed),
      xpEarned,
    });
  }

  // ===========================================================================
  // IB CURRICULUM ALIGNMENT
  // ===========================================================================

  /**
   * Records an IB criteria score.
   */
  async alignIbCriteria(
    tenantId: string,
    profileId: string,
    input: AlignIbCriteria
  ): Promise<Result<{ message: string }>> {
    // Verify profile exists and has IB alignment
    const profileResult = await this.profileRepo.findByIdInTenant(tenantId, profileId);
    if (!profileResult.success) {
      return profileResult;
    }

    const profile = profileResult.data;
    if (!profile.ibProgramme) {
      return failure(new ValidationError(
        'This profile is not aligned with an IB programme'
      ));
    }

    // Record the criteria score
    await this.profileRepo.updateIbCriteria(profileId, input.criterion, {
      score: input.score,
      evidence: input.evidence,
      recordedAt: new Date(),
    });

    return success({
      message: `Criterion ${input.criterion} recorded with score ${input.score}/8`,
    });
  }

  /**
   * Gets the expected CEFR levels for an MYP phase.
   */
  getCefrForMypPhase(phase: number): CEFRLevel[] {
    return MYP_PHASE_TO_CEFR[phase] || [CEFRLevel.A1];
  }

  // ===========================================================================
  // OFFLINE SUPPORT
  // ===========================================================================

  /**
   * Creates an offline learning package.
   */
  async createOfflinePackage(
    tenantId: string,
    profileId: string,
    input: CreateOfflinePackage
  ): Promise<Result<OfflinePackageContent>> {
    // Verify profile exists
    const profileResult = await this.profileRepo.findByIdInTenant(tenantId, profileId);
    if (!profileResult.success) {
      return profileResult;
    }

    // Get vocabulary for package
    let vocabulary: VocabularyItem[] = [];
    if (input.vocabularyIds && input.vocabularyIds.length > 0) {
      const vocabResult = await this.vocabRepo.findByIds(profileId, input.vocabularyIds);
      if (vocabResult.success) {
        vocabulary = vocabResult.data.map(v => ({
          id: v.id,
          wordId: v.wordId,
          word: v.word,
          translation: v.translation,
          cefrLevel: v.cefrLevel as CEFRLevel,
          partOfSpeech: v.partOfSpeech,
          exampleSentence: v.exampleSentence,
          audioUrl: v.audioUrl,
          masteryLevel: v.masteryLevel as MasteryLevel,
          easeFactor: v.easeFactor,
          interval: v.interval,
          nextReviewAt: v.nextReviewAt,
          timesCorrect: v.timesCorrect,
          timesIncorrect: v.timesIncorrect,
        }));
      }
    } else if (input.packageType === 'vocabulary_review') {
      // Get all due vocabulary
      const vocabResult = await this.vocabRepo.findDueForReview(profileId, 100);
      if (vocabResult.success) {
        vocabulary = vocabResult.data.map(v => ({
          id: v.id,
          wordId: v.wordId,
          word: v.word,
          translation: v.translation,
          cefrLevel: v.cefrLevel as CEFRLevel,
          partOfSpeech: v.partOfSpeech,
          exampleSentence: v.exampleSentence,
          audioUrl: v.audioUrl,
          masteryLevel: v.masteryLevel as MasteryLevel,
          easeFactor: v.easeFactor,
          interval: v.interval,
          nextReviewAt: v.nextReviewAt,
          timesCorrect: v.timesCorrect,
          timesIncorrect: v.timesIncorrect,
        }));
      }
    }

    // Set expiry (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create package record
    const createResult = await this.offlineRepo.create({
      profile: { connect: { id: profileId } },
      packageType: input.packageType,
      vocabularyCount: vocabulary.length,
      expiresAt,
    });

    if (!createResult.success) {
      return createResult;
    }

    // Calculate size estimate (rough approximation)
    const estimatedSizeKB = vocabulary.length * 2; // ~2KB per word with audio URL

    return success({
      packageId: createResult.data.id,
      packageType: input.packageType,
      createdAt: createResult.data.createdAt,
      expiresAt,
      vocabulary,
      conversationScenarios: [], // Would include scenarios in full implementation
      estimatedSizeKB,
    });
  }

  /**
   * Syncs offline progress back to the server.
   */
  async syncOfflineProgress(
    tenantId: string,
    profileId: string,
    input: SyncOfflineProgress
  ): Promise<Result<{
    vocabularyReviewsSynced: number;
    conversationSessionsSynced: number;
    xpEarned: number;
  }>> {
    // Verify profile exists
    const profileResult = await this.profileRepo.findByIdInTenant(tenantId, profileId);
    if (!profileResult.success) {
      return profileResult;
    }

    let xpEarned = 0;
    let vocabularyReviewsSynced = 0;
    let conversationSessionsSynced = 0;

    // Sync vocabulary reviews
    if (input.vocabularyReviews) {
      for (const review of input.vocabularyReviews) {
        const result = await this.reviewVocabulary(tenantId, profileId, {
          wordId: review.wordId,
          quality: review.quality,
        });
        
        if (result.success) {
          vocabularyReviewsSynced++;
          xpEarned += review.quality >= 3 ? 10 : 5;
        }
      }
    }

    // Sync conversation sessions
    if (input.conversationSessions) {
      for (const session of input.conversationSessions) {
        await this.profileRepo.incrementConversationStats(
          profileId,
          session.durationMinutes
        );
        conversationSessionsSynced++;
        xpEarned += session.durationMinutes * 3;
      }
    }

    // Update last activity
    await this.profileRepo.update(profileId, {
      lastActiveAt: input.lastOfflineActivityAt,
    });

    // Update streak
    await this.profileRepo.updateStreak(profileId);

    return success({
      vocabularyReviewsSynced,
      conversationSessionsSynced,
      xpEarned,
    });
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Gets human-readable language name.
   */
  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      fra: 'French',
      cmn: 'Mandarin Chinese',
      ind: 'Indonesian',
      spa: 'Spanish',
      ita: 'Italian',
      deu: 'German',
    };
    return names[code] || code;
  }

  /**
   * Calculates daily review target based on CEFR level.
   */
  private calculateDailyTarget(cefrLevel: string): number {
    const targets: Record<string, number> = {
      A1: 10,
      A2: 15,
      B1: 20,
      B2: 25,
      C1: 30,
      C2: 30,
    };
    return targets[cefrLevel] || 15;
  }

  /**
   * Calculates overall CEFR from skill levels.
   */
  private calculateOverallCefr(levels: CEFRLevel[]): CEFRLevel {
    const values: Record<CEFRLevel, number> = {
      A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6,
    };
    const cefrFromValue: Record<number, CEFRLevel> = {
      1: CEFRLevel.A1, 2: CEFRLevel.A2, 3: CEFRLevel.B1,
      4: CEFRLevel.B2, 5: CEFRLevel.C1, 6: CEFRLevel.C2,
    };

    const avg = Math.round(
      levels.reduce((sum, l) => sum + values[l], 0) / levels.length
    );

    return cefrFromValue[avg] || CEFRLevel.A1;
  }

  /**
   * Gets message explaining heritage pathway.
   */
  private getHeritagePathwayMessage(pathway: HeritagePathway): string {
    const messages: Record<HeritagePathway, string> = {
      [HeritagePathway.LITERACY_LAUNCH]: 
        'Your speaking skills are strong! We\'ll focus on building your reading and writing.',
      [HeritagePathway.ACADEMIC_REGISTER]:
        'Great foundation! We\'ll help you develop academic vocabulary and formal registers.',
      [HeritagePathway.STANDARD_VARIETY]:
        'Let\'s bridge your home language skills with standard written forms.',
      [HeritagePathway.CULTURAL_DEEPENING]:
        'We\'ll strengthen your connection to the language while building all skills.',
      [HeritagePathway.ACCELERATED]:
        'Your strong foundation means we can move quickly through advanced content.',
    };
    return messages[pathway];
  }

  /**
   * Generates AI greeting for conversation.
   */
  private generateAIGreeting(
    mode: string,
    aiRole: string | null,
    targetLanguage: string,
    cefrLevel: CEFRLevel
  ): string {
    // In production, this would call an AI service
    // For now, return a placeholder
    const greetings: Record<string, string> = {
      fra: 'Bonjour! Comment allez-vous?',
      cmn: '你好！你好吗？',
      ind: 'Halo! Apa kabar?',
      spa: '¡Hola! ¿Cómo estás?',
      ita: 'Ciao! Come stai?',
      deu: 'Hallo! Wie geht es dir?',
    };
    return greetings[targetLanguage] || 'Hello!';
  }

  /**
   * Extracts vocabulary used in messages.
   */
  private extractVocabularyUsed(messages: string[], targetVocabulary: string[]): string[] {
    const used: string[] = [];
    const combined = messages.join(' ').toLowerCase();
    
    for (const word of targetVocabulary) {
      if (combined.includes(word.toLowerCase())) {
        used.push(word);
      }
    }
    
    return used;
  }

  /**
   * Generates feedback based on conversation performance.
   */
  private generateConversationFeedback(score: number, vocabularyUsed: string[]): string[] {
    const feedback: string[] = [];
    
    if (score >= 0.8) {
      feedback.push('Excellent conversation! Your fluency is impressive.');
    } else if (score >= 0.6) {
      feedback.push('Good effort! Keep practicing to improve fluency.');
    } else {
      feedback.push('Keep going! Regular practice will help build confidence.');
    }

    if (vocabularyUsed.length > 0) {
      feedback.push(`Great use of target vocabulary: ${vocabularyUsed.slice(0, 3).join(', ')}`);
    }

    return feedback;
  }

  /**
   * Suggests next practice activities.
   */
  private suggestNextPractice(score: number, vocabularyUsed: string[]): string[] {
    const suggestions: string[] = [];
    
    if (score < 0.7) {
      suggestions.push('Try a shorter conversation to build confidence');
    }
    
    suggestions.push('Review vocabulary to expand your active vocabulary');
    suggestions.push('Practice pronunciation with the audio examples');
    
    return suggestions;
  }

  /**
   * Checks and awards vocabulary achievements.
   */
  private async checkVocabularyAchievements(
    profileId: string,
    wordsReviewed: number,
    newMasteredCount: number
  ): Promise<void> {
    // Get current stats
    const statsResult = await this.vocabRepo.getStats(profileId);
    if (!statsResult.success) return;

    const stats = statsResult.data;

    // Check milestones
    const milestones = [
      { count: 100, achievement: 'vocabulary_100' },
      { count: 500, achievement: 'vocabulary_500' },
      { count: 1000, achievement: 'vocabulary_1000' },
    ];

    for (const milestone of milestones) {
      if (stats.mastered >= milestone.count) {
        const existingResult = await this.achievementRepo.findByType(
          profileId,
          milestone.achievement
        );
        
        if (!existingResult.success || !existingResult.data) {
          await this.achievementRepo.create({
            profile: { connect: { id: profileId } },
            achievementType: milestone.achievement,
          });
        }
      }
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const linguaFlowService = new LinguaFlowService();

// =============================================================================
// RE-EXPORTS
// =============================================================================

export type {
  ProfileDashboard,
  ReviewSessionResult,
  ConversationSummary,
  VocabularyItem,
  OfflinePackageContent,
};
