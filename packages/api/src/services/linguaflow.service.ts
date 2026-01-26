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
 */

import { log } from '../lib/logger';
import {
  languageProfileRepository,
  vocabularyProgressRepository,
  vocabularyItemRepository,
  conversationRepository,
  heritagePathwayRepository,
  offlinePackageRepository,
  LanguageProfileRepository,
  VocabularyProgressRepository,
  VocabularyItemRepository,
  ConversationRepository,
  HeritagePathwayRepository,
  OfflinePackageRepository,
} from '../repositories/linguaflow.repository';

// ============================================================================
// TYPES
// ============================================================================

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface ProfileDashboard {
  profileId: string;
  targetLanguage: string;
  cefrLevels: {
    overall: string;
    listening: string;
    speaking: string;
    reading: string;
    writing: string;
  };
  xpProgress: {
    level: number;
    currentXp: number;
    xpForNextLevel: number;
    progress: number;
  };
  vocabularyStats: {
    totalWords: number;
    mastered: number;
    learning: number;
    dueForReview: number;
  };
  currentStreak: number;
  longestStreak: number;
  heritagePathway: string | null;
  ibAlignment: {
    programme: string | null;
    phaseOrLevel: string | null;
    criteriaScores: Record<string, number>;
  } | null;
  dailyGoal: {
    wordsReviewed: number;
    target: number;
    completed: boolean;
  };
}

export interface ReviewSessionResult {
  wordsReviewed: number;
  correctCount: number;
  incorrectCount: number;
  xpEarned: number;
  newMasteredWords: string[];
  streakUpdated: boolean;
}

export interface ConversationSummary {
  conversationId: string;
  durationMinutes: number;
  messagesCount: number;
  vocabularyUsed: string[];
  fluencyScore: number;
  accuracyScore: number;
  overallScore: number;
  xpEarned: number;
  feedback: string[];
}

export interface VocabularyItem {
  id: string;
  wordId: string;
  word: string;
  translation: string;
  cefrLevel: string;
  partOfSpeech: string | null;
  exampleSentence: string | null;
  audioUrl: string | null;
  masteryLevel: string;
  easeFactor: number;
  interval: number;
  nextReviewAt: Date | null;
  timesCorrect: number;
  timesIncorrect: number;
}

// Language names for display
const LANGUAGE_NAMES: Record<string, string> = {
  fra: 'French',
  cmn: 'Mandarin Chinese',
  ind: 'Indonesian',
  spa: 'Spanish',
  ita: 'Italian',
  deu: 'German',
};

// SM-2 Algorithm implementation
function calculateSM2(
  quality: number,
  previousEaseFactor: number,
  previousInterval: number,
  repetitions: number
): { easeFactor: number; interval: number; repetitions: number; nextReviewAt: Date } {
  let newEaseFactor = previousEaseFactor;
  let newInterval = previousInterval;
  let newRepetitions = repetitions;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(previousInterval * previousEaseFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // Incorrect response - reset
    newRepetitions = 0;
    newInterval = 1;
  }

  // Update ease factor
  newEaseFactor =
    previousEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  // Calculate next review date
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewAt,
  };
}

// Determine mastery level based on performance
function determineMasteryLevel(
  timesCorrect: number,
  timesIncorrect: number,
  interval: number
): string {
  const accuracy = timesCorrect / Math.max(1, timesCorrect + timesIncorrect);

  if (interval >= 21 && accuracy >= 0.9) {
    return 'mastered';
  } else if (interval >= 7 && accuracy >= 0.75) {
    return 'reviewing';
  } else if (timesCorrect > 0) {
    return 'learning';
  }
  return 'new';
}

// ============================================================================
// LINGUAFLOW SERVICE
// ============================================================================

export class LinguaFlowService {
  constructor(
    private readonly profileRepo: LanguageProfileRepository = languageProfileRepository,
    private readonly vocabProgressRepo: VocabularyProgressRepository = vocabularyProgressRepository,
    private readonly vocabItemRepo: VocabularyItemRepository = vocabularyItemRepository,
    private readonly conversationRepo: ConversationRepository = conversationRepository,
    private readonly heritageRepo: HeritagePathwayRepository = heritagePathwayRepository,
    private readonly offlineRepo: OfflinePackageRepository = offlinePackageRepository
  ) {}

  // ===========================================================================
  // PROFILE MANAGEMENT
  // ===========================================================================

  async createProfile(
    tenantId: string,
    userId: string,
    input: {
      targetLanguage: string;
      nativeLanguage: string;
      additionalLanguages?: string[];
      isHeritageSpeaker?: boolean;
      curriculumFramework?: string;
      yearLevel?: string;
      ibProgramme?: string;
    }
  ): Promise<Result<{ profileId: string; message: string }>> {
    try {
      const existing = await this.profileRepo.findByUserAndLanguage(
        tenantId,
        userId,
        input.targetLanguage
      );

      if (existing) {
        return {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `You already have a profile for ${this.getLanguageName(input.targetLanguage)}`,
          },
        };
      }

      const initialLevel = input.isHeritageSpeaker ? 'A2' : 'A1';

      const profile = await this.profileRepo.create(tenantId, {
        userId,
        targetLanguage: input.targetLanguage,
        nativeLanguage: input.nativeLanguage,
        additionalLanguages: input.additionalLanguages,
        isHeritageSpeaker: input.isHeritageSpeaker,
        curriculumFramework: input.curriculumFramework,
        yearLevel: input.yearLevel,
        ibProgramme: input.ibProgramme,
      });

      // Set initial CEFR levels
      await this.profileRepo.update(profile.id, {
        overallLevel: initialLevel,
        listeningLevel: initialLevel,
        speakingLevel: initialLevel,
        readingLevel: initialLevel,
        writingLevel: initialLevel,
      });

      // Initialize vocabulary progress
      await this.vocabProgressRepo.getOrCreate(profile.id);

      return {
        success: true,
        data: {
          profileId: profile.id,
          message: `Profile created for ${this.getLanguageName(input.targetLanguage)}. Let's start learning!`,
        },
      };
    } catch (error) {
      log.error('Error creating language profile', error as Error, { tenantId, userId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create profile' },
      };
    }
  }

  async getProfileDashboard(
    tenantId: string,
    profileId: string
  ): Promise<Result<ProfileDashboard>> {
    try {
      const profile = await this.profileRepo.findWithDetails(tenantId, profileId);
      if (!profile) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        };
      }

      const vocabProgress = profile.vocabularyProgress;
      const dueItems = vocabProgress
        ? await this.vocabItemRepo.getDueForReview(vocabProgress.id, 100)
        : [];

      const xpForNextLevel = (profile.currentLevel + 1) * 100;
      const currentLevelXp = profile.totalXp - profile.currentLevel * 100;

      return {
        success: true,
        data: {
          profileId: profile.id,
          targetLanguage: profile.targetLanguage,
          cefrLevels: {
            overall: profile.overallLevel,
            listening: profile.listeningLevel,
            speaking: profile.speakingLevel,
            reading: profile.readingLevel,
            writing: profile.writingLevel,
          },
          xpProgress: {
            level: profile.currentLevel,
            currentXp: currentLevelXp,
            xpForNextLevel,
            progress: currentLevelXp / xpForNextLevel,
          },
          vocabularyStats: {
            totalWords: vocabProgress?.totalWordsExposed || 0,
            mastered: vocabProgress?.totalWordsMastered || 0,
            learning: vocabProgress?.totalWordsLearning || 0,
            dueForReview: dueItems.length,
          },
          currentStreak: profile.currentStreak,
          longestStreak: profile.longestStreak,
          heritagePathway: profile.heritagePathway?.pathwayType || null,
          ibAlignment: profile.ibProgramme
            ? {
                programme: profile.ibProgramme,
                phaseOrLevel: profile.ibPhaseOrLevel,
                criteriaScores: (profile.ibCriteriaScores as Record<string, number>) || {},
              }
            : null,
          dailyGoal: {
            wordsReviewed: 0, // Would be calculated from today's reviews
            target: this.calculateDailyTarget(profile.overallLevel),
            completed: false,
          },
        },
      };
    } catch (error) {
      log.error('Error getting profile dashboard', error as Error, { tenantId, profileId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get dashboard' },
      };
    }
  }

  async getProfilesByUser(
    tenantId: string,
    userId: string
  ): Promise<Result<Array<{ id: string; targetLanguage: string; overallLevel: string }>>> {
    try {
      const profiles = await this.profileRepo.findByUser(tenantId, userId);
      return {
        success: true,
        data: profiles.map((p) => ({
          id: p.id,
          targetLanguage: p.targetLanguage,
          overallLevel: p.overallLevel,
        })),
      };
    } catch (error) {
      log.error('Error getting profiles by user', error as Error, { tenantId, userId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get profiles' },
      };
    }
  }

  // ===========================================================================
  // HERITAGE SPEAKER SUPPORT
  // ===========================================================================

  async createHeritagePathway(
    tenantId: string,
    profileId: string,
    input: {
      oralProficiency: string;
      literacyLevel: string;
      academicRegisterLevel: string;
      dialectFeatures?: string[];
    }
  ): Promise<Result<{ pathwayType: string; message: string }>> {
    try {
      const profile = await this.profileRepo.findById(tenantId, profileId);
      if (!profile) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        };
      }

      if (!profile.isHeritageSpeaker) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Profile is not marked as heritage speaker' },
        };
      }

      const existing = await this.heritageRepo.findByProfile(profileId);
      if (existing) {
        return {
          success: false,
          error: { code: 'CONFLICT', message: 'Heritage pathway already exists' },
        };
      }

      // Determine pathway type
      const pathwayType = this.determineHeritagePathway(
        input.oralProficiency,
        input.literacyLevel,
        input.academicRegisterLevel
      );

      await this.heritageRepo.create(profileId, {
        pathwayType,
        oralProficiency: input.oralProficiency,
        literacyLevel: input.literacyLevel,
        academicRegisterLevel: input.academicRegisterLevel,
        dialectFeatures: input.dialectFeatures,
      });

      // Update profile CEFR levels
      await this.profileRepo.update(profileId, {
        speakingLevel: input.oralProficiency,
        listeningLevel: input.oralProficiency,
        readingLevel: input.literacyLevel,
        writingLevel: input.literacyLevel,
      });

      return {
        success: true,
        data: {
          pathwayType,
          message: this.getHeritagePathwayMessage(pathwayType),
        },
      };
    } catch (error) {
      log.error('Error creating heritage pathway', error as Error, { tenantId, profileId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create heritage pathway' },
      };
    }
  }

  // ===========================================================================
  // VOCABULARY MANAGEMENT
  // ===========================================================================

  async addVocabulary(
    tenantId: string,
    profileId: string,
    input: {
      wordId: string;
      word: string;
      translation: string;
      cefrLevel?: string;
      partOfSpeech?: string;
      exampleSentence?: string;
      audioUrl?: string;
    }
  ): Promise<Result<{ vocabularyId: string }>> {
    try {
      const profile = await this.profileRepo.findById(tenantId, profileId);
      if (!profile) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        };
      }

      const vocabProgress = await this.vocabProgressRepo.getOrCreate(profileId);

      const existing = await this.vocabItemRepo.findByWord(vocabProgress.id, input.wordId);
      if (existing) {
        return {
          success: false,
          error: { code: 'CONFLICT', message: 'Word already in vocabulary' },
        };
      }

      const vocabItem = await this.vocabItemRepo.create(vocabProgress.id, {
        wordId: input.wordId,
        word: input.word,
        translation: input.translation,
        cefrLevel: input.cefrLevel,
        partOfSpeech: input.partOfSpeech,
        exampleSentence: input.exampleSentence,
        audioUrl: input.audioUrl,
      });

      await this.vocabProgressRepo.updateCounts(vocabProgress.id, { exposed: 1, learning: 1 });

      return {
        success: true,
        data: { vocabularyId: vocabItem.id },
      };
    } catch (error) {
      log.error('Error adding vocabulary', error as Error, { tenantId, profileId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to add vocabulary' },
      };
    }
  }

  async getVocabularyForReview(
    tenantId: string,
    profileId: string,
    limit: number = 20
  ): Promise<Result<VocabularyItem[]>> {
    try {
      const profile = await this.profileRepo.findById(tenantId, profileId);
      if (!profile) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        };
      }

      const vocabProgress = await this.vocabProgressRepo.findByProfile(profileId);
      if (!vocabProgress) {
        return { success: true, data: [] };
      }

      const dueItems = await this.vocabItemRepo.getDueForReview(vocabProgress.id, limit);

      return {
        success: true,
        data: dueItems.map((v) => ({
          id: v.id,
          wordId: v.wordId,
          word: v.word,
          translation: v.translation,
          cefrLevel: v.cefrLevel,
          partOfSpeech: v.partOfSpeech,
          exampleSentence: v.exampleSentence,
          audioUrl: v.audioUrl,
          masteryLevel: v.masteryLevel,
          easeFactor: v.easeFactor,
          interval: v.interval,
          nextReviewAt: v.nextReviewAt,
          timesCorrect: v.timesCorrect,
          timesIncorrect: v.timesIncorrect,
        })),
      };
    } catch (error) {
      log.error('Error getting vocabulary for review', error as Error, { tenantId, profileId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get vocabulary' },
      };
    }
  }

  async reviewVocabulary(
    tenantId: string,
    profileId: string,
    vocabularyId: string,
    quality: number // 0-5
  ): Promise<Result<{
    masteryLevel: string;
    nextReviewAt: Date;
    correct: boolean;
    xpEarned: number;
  }>> {
    try {
      const profile = await this.profileRepo.findById(tenantId, profileId);
      if (!profile) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        };
      }

      const vocabProgress = await this.vocabProgressRepo.findByProfile(profileId);
      if (!vocabProgress) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vocabulary progress not found' },
        };
      }

      // Get vocabulary items
      const dueItems = await this.vocabItemRepo.getDueForReview(vocabProgress.id, 100);
      const vocab = dueItems.find((v) => v.id === vocabularyId);

      if (!vocab) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vocabulary item not found' },
        };
      }

      const correct = quality >= 3;

      // Calculate SM-2
      const sm2Result = calculateSM2(
        quality,
        vocab.easeFactor,
        vocab.interval,
        vocab.repetitions
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
      await this.vocabItemRepo.recordReview(vocab.id, {
        easeFactor: sm2Result.easeFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        nextReviewAt: sm2Result.nextReviewAt,
        correct,
        masteryLevel,
      });

      // Update mastery counts if changed
      if (masteryLevel === 'mastered' && vocab.masteryLevel !== 'mastered') {
        await this.vocabProgressRepo.updateCounts(vocabProgress.id, { mastered: 1, learning: -1 });
      }

      // Award XP
      const xpEarned = correct ? (quality >= 4 ? 15 : 10) : 5;
      await this.profileRepo.awardXP(profileId, xpEarned);

      return {
        success: true,
        data: {
          masteryLevel,
          nextReviewAt: sm2Result.nextReviewAt,
          correct,
          xpEarned,
        },
      };
    } catch (error) {
      log.error('Error reviewing vocabulary', error as Error, { tenantId, profileId, vocabularyId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to review vocabulary' },
      };
    }
  }

  async completeReviewSession(
    tenantId: string,
    profileId: string,
    reviews: Array<{ vocabularyId: string; quality: number }>
  ): Promise<Result<ReviewSessionResult>> {
    try {
      let correctCount = 0;
      let xpEarned = 0;
      const newMasteredWords: string[] = [];

      for (const review of reviews) {
        const result = await this.reviewVocabulary(
          tenantId,
          profileId,
          review.vocabularyId,
          review.quality
        );

        if (result.success && result.data) {
          if (result.data.correct) {
            correctCount++;
          }
          xpEarned += result.data.xpEarned;

          if (result.data.masteryLevel === 'mastered') {
            newMasteredWords.push(review.vocabularyId);
          }
        }
      }

      // Update streak
      await this.profileRepo.updateStreak(profileId);

      return {
        success: true,
        data: {
          wordsReviewed: reviews.length,
          correctCount,
          incorrectCount: reviews.length - correctCount,
          xpEarned,
          newMasteredWords,
          streakUpdated: true,
        },
      };
    } catch (error) {
      log.error('Error completing review session', error as Error, { tenantId, profileId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to complete review session' },
      };
    }
  }

  // ===========================================================================
  // CONVERSATION PRACTICE
  // ===========================================================================

  async startConversation(
    tenantId: string,
    profileId: string,
    input: {
      mode: string;
      aiRole?: string;
      aiPersona?: string;
      scenarioId?: string;
      scenarioTitle?: string;
      targetVocabulary?: string[];
      targetStructures?: string[];
      isHeritageVariant?: boolean;
    }
  ): Promise<Result<{
    conversationId: string;
    aiGreeting: string;
  }>> {
    try {
      const profile = await this.profileRepo.findById(tenantId, profileId);
      if (!profile) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        };
      }

      const conversation = await this.conversationRepo.create(profileId, {
        mode: input.mode,
        language: profile.targetLanguage,
        cefrLevel: profile.overallLevel,
        aiRole: input.aiRole,
        aiPersona: input.aiPersona,
        scenarioId: input.scenarioId,
        scenarioTitle: input.scenarioTitle,
        targetVocabulary: input.targetVocabulary,
        targetStructures: input.targetStructures,
        isHeritageVariant: input.isHeritageVariant,
      });

      const aiGreeting = this.generateAIGreeting(
        profile.targetLanguage,
        profile.overallLevel
      );

      return {
        success: true,
        data: {
          conversationId: conversation.id,
          aiGreeting,
        },
      };
    } catch (error) {
      log.error('Error starting conversation', error as Error, { tenantId, profileId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to start conversation' },
      };
    }
  }

  async addConversationMessage(
    conversationId: string,
    input: {
      role: 'user' | 'assistant';
      content: string;
    }
  ): Promise<Result<{ messageAdded: boolean }>> {
    try {
      const conversation = await this.conversationRepo.findById(conversationId);
      if (!conversation) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Conversation not found' },
        };
      }

      if (conversation.endedAt) {
        return {
          success: false,
          error: { code: 'CONVERSATION_ENDED', message: 'Conversation has ended' },
        };
      }

      await this.conversationRepo.addMessage(conversationId, {
        role: input.role,
        content: input.content,
        timestamp: new Date(),
      });

      return {
        success: true,
        data: { messageAdded: true },
      };
    } catch (error) {
      log.error('Error adding conversation message', error as Error, { conversationId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to add message' },
      };
    }
  }

  async endConversation(
    tenantId: string,
    conversationId: string,
    input: {
      selfFluencyRating?: number;
      selfConfidenceRating?: number;
    }
  ): Promise<Result<ConversationSummary>> {
    try {
      const conversation = await this.conversationRepo.findById(conversationId);
      if (!conversation) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Conversation not found' },
        };
      }

      if (conversation.endedAt) {
        return {
          success: false,
          error: { code: 'CONVERSATION_ENDED', message: 'Conversation has already ended' },
        };
      }

      const messages = (conversation.messages as Array<{ role: string; content: string }>) || [];
      const userMessages = messages.filter((m) => m.role === 'user');

      const durationMinutes = Math.max(
        1,
        Math.floor((Date.now() - conversation.startedAt.getTime()) / 60000)
      );

      // Calculate scores (simplified)
      const fluencyScore = Math.min(1, userMessages.length / 10) * 0.5 +
        Math.min(1, durationMinutes / 5) * 0.5;
      const accuracyScore = 0.75;
      const overallScore = (fluencyScore + accuracyScore) / 2;

      // Calculate XP
      const xpEarned = Math.round(
        durationMinutes * 5 + userMessages.length * 3 + overallScore * 50
      );

      // End conversation
      await this.conversationRepo.endConversation(conversationId, {
        fluencyScore,
        accuracyScore,
        overallScore,
        strengths: overallScore >= 0.7 ? ['Good conversation flow'] : [],
        areasToImprove: overallScore < 0.7 ? ['Practice more regularly'] : [],
        vocabularyUsed: [],
        xpEarned,
        selfFluencyRating: input.selfFluencyRating,
        selfConfidenceRating: input.selfConfidenceRating,
      });

      // Award XP
      await this.profileRepo.awardXP(conversation.profileId, xpEarned);

      // Update learning minutes
      await this.profileRepo.update(conversation.profileId, {
        totalSpeakingMinutes: { increment: durationMinutes },
        totalLearningMinutes: { increment: durationMinutes },
      });

      return {
        success: true,
        data: {
          conversationId,
          durationMinutes,
          messagesCount: userMessages.length,
          vocabularyUsed: [],
          fluencyScore,
          accuracyScore,
          overallScore,
          xpEarned,
          feedback: this.generateConversationFeedback(overallScore),
        },
      };
    } catch (error) {
      log.error('Error ending conversation', error as Error, { conversationId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to end conversation' },
      };
    }
  }

  // ===========================================================================
  // IB CURRICULUM ALIGNMENT
  // ===========================================================================

  async updateIbCriteria(
    tenantId: string,
    profileId: string,
    criterion: string,
    score: number,
    evidence?: string
  ): Promise<Result<{ message: string }>> {
    try {
      const profile = await this.profileRepo.findById(tenantId, profileId);
      if (!profile) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        };
      }

      if (!profile.ibProgramme) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Profile not aligned with IB programme' },
        };
      }

      const currentScores = (profile.ibCriteriaScores as Record<string, unknown>) || {};
      const updatedScores = {
        ...currentScores,
        [criterion]: { score, evidence, recordedAt: new Date().toISOString() },
      } as Record<string, { score: number; evidence: string; recordedAt: string }>;

      await this.profileRepo.update(profileId, {
        ibCriteriaScores: JSON.parse(JSON.stringify(updatedScores)),
      });

      return {
        success: true,
        data: { message: `Criterion ${criterion} recorded with score ${score}/8` },
      };
    } catch (error) {
      log.error('Error updating IB criteria', error as Error, { tenantId, profileId, criterion });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update IB criteria' },
      };
    }
  }

  // ===========================================================================
  // OFFLINE SUPPORT
  // ===========================================================================

  async createOfflinePackage(
    tenantId: string,
    profileId: string,
    input: {
      packageType: string;
      vocabularyCount?: number;
    }
  ): Promise<Result<{ packageId: string; expiresAt: Date }>> {
    try {
      const profile = await this.profileRepo.findById(tenantId, profileId);
      if (!profile) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        };
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const offlinePackage = await this.offlineRepo.create(profileId, {
        packageType: input.packageType,
        vocabularyCount: input.vocabularyCount || 50,
        estimatedSizeMb: (input.vocabularyCount || 50) * 0.05,
        estimatedOfflineMinutes: 30,
      });

      await this.offlineRepo.updateStatus(offlinePackage.id, 'ready', new Date());

      return {
        success: true,
        data: {
          packageId: offlinePackage.id,
          expiresAt,
        },
      };
    } catch (error) {
      log.error('Error creating offline package', error as Error, { tenantId, profileId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create offline package' },
      };
    }
  }

  async syncOfflineProgress(
    tenantId: string,
    profileId: string,
    packageId: string,
    progressData: Record<string, unknown>,
    pendingSyncItems: number
  ): Promise<Result<{ synced: boolean }>> {
    try {
      const profile = await this.profileRepo.findById(tenantId, profileId);
      if (!profile) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        };
      }

      await this.offlineRepo.syncOfflineProgress(packageId, progressData, pendingSyncItems);

      await this.profileRepo.update(profileId, {
        lastSyncedAt: new Date(),
        offlineDataVersion: { increment: 1 },
      });

      return {
        success: true,
        data: { synced: true },
      };
    } catch (error) {
      log.error('Error syncing offline progress', error as Error, { tenantId, profileId, packageId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to sync offline progress' },
      };
    }
  }

  // ===========================================================================
  // ACHIEVEMENTS
  // ===========================================================================

  async getAchievements(
    tenantId: string,
    profileId: string
  ): Promise<Result<Array<{ id: string; type: string; title: string; earnedAt: Date }>>> {
    try {
      const profile = await this.profileRepo.findById(tenantId, profileId);
      if (!profile) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        };
      }

      // Return empty array for now - achievements would be stored in a separate table
      return {
        success: true,
        data: [],
      };
    } catch (error) {
      log.error('Error getting achievements', error as Error, { tenantId, profileId });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get achievements' },
      };
    }
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  private getLanguageName(code: string): string {
    return LANGUAGE_NAMES[code] || code;
  }

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

  private determineHeritagePathway(
    oralProficiency: string,
    literacyLevel: string,
    academicRegisterLevel: string
  ): string {
    const oralValue = this.cefrToValue(oralProficiency);
    const literacyValue = this.cefrToValue(literacyLevel);
    const academicValue = this.cefrToValue(academicRegisterLevel);

    if (oralValue >= 4 && literacyValue <= 2) {
      return 'literacy_launch';
    }
    if (oralValue >= 4 && literacyValue >= 3 && academicValue <= 2) {
      return 'academic_register';
    }
    if (oralValue >= 3 && literacyValue >= 3) {
      return 'accelerated';
    }
    if (oralValue >= 2) {
      return 'standard_variety';
    }
    return 'cultural_deepening';
  }

  private cefrToValue(level: string): number {
    const values: Record<string, number> = {
      A1: 1,
      A2: 2,
      B1: 3,
      B2: 4,
      C1: 5,
      C2: 6,
    };
    return values[level] || 1;
  }

  private getHeritagePathwayMessage(pathwayType: string): string {
    const messages: Record<string, string> = {
      literacy_launch:
        "Your speaking skills are strong! We'll focus on building your reading and writing.",
      academic_register:
        "Great foundation! We'll help you develop academic vocabulary and formal registers.",
      standard_variety:
        "Let's bridge your home language skills with standard written forms.",
      cultural_deepening:
        "We'll strengthen your connection to the language while building all skills.",
      accelerated:
        'Your strong foundation means we can move quickly through advanced content.',
    };
    return messages[pathwayType] || 'Pathway created successfully.';
  }

  private generateAIGreeting(targetLanguage: string, cefrLevel: string): string {
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

  private generateConversationFeedback(overallScore: number): string[] {
    const feedback: string[] = [];

    if (overallScore >= 0.8) {
      feedback.push('Excellent conversation! Your fluency is impressive.');
    } else if (overallScore >= 0.6) {
      feedback.push('Good effort! Keep practicing to improve fluency.');
    } else {
      feedback.push('Keep going! Regular practice will help build confidence.');
    }

    return feedback;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const linguaFlowService = new LinguaFlowService();
