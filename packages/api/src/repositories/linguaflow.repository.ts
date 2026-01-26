/**
 * LinguaFlow Repository
 *
 * Prisma-based repository for the LinguaFlow language learning module.
 * Handles language profiles, vocabulary with SM-2 SRS, conversations,
 * heritage pathways, and achievements.
 */

import { prisma, Prisma } from '@scholarly/database';

// ============================================================================
// TYPES
// ============================================================================

export type LanguageLearnerProfile = Prisma.LanguageLearnerProfileGetPayload<{}>;
export type LanguageVocabularyProgress = Prisma.LanguageVocabularyProgressGetPayload<{}>;
export type LanguageVocabularyItem = Prisma.LanguageVocabularyItemGetPayload<{}>;
export type LanguageConversation = Prisma.LanguageConversationGetPayload<{}>;
export type LanguageHeritagePathway = Prisma.LanguageHeritagePathwayGetPayload<{}>;
export type LanguageAchievement = Prisma.LanguageAchievementGetPayload<{}>;
export type LanguageLearnerAchievement = Prisma.LanguageLearnerAchievementGetPayload<{}>;
export type LanguageOfflinePackage = Prisma.LanguageOfflinePackageGetPayload<{}>;

export type LanguageProfileWithDetails = LanguageLearnerProfile & {
  vocabularyProgress: LanguageVocabularyProgress | null;
  heritagePathway: LanguageHeritagePathway | null;
  achievements: (LanguageLearnerAchievement & { achievement: LanguageAchievement })[];
};

// ============================================================================
// PROFILE REPOSITORY
// ============================================================================

export class LanguageProfileRepository {
  async findById(tenantId: string, id: string): Promise<LanguageLearnerProfile | null> {
    return prisma.languageLearnerProfile.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findByUserAndLanguage(
    tenantId: string,
    userId: string,
    targetLanguage: string
  ): Promise<LanguageLearnerProfile | null> {
    return prisma.languageLearnerProfile.findUnique({
      where: {
        tenantId_userId_targetLanguage: { tenantId, userId, targetLanguage },
      },
    });
  }

  async findByUser(tenantId: string, userId: string): Promise<LanguageLearnerProfile[]> {
    return prisma.languageLearnerProfile.findMany({
      where: { tenantId, userId, deletedAt: null },
    });
  }

  async findWithDetails(tenantId: string, id: string): Promise<LanguageProfileWithDetails | null> {
    return prisma.languageLearnerProfile.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        vocabularyProgress: true,
        heritagePathway: true,
        achievements: {
          include: { achievement: true },
          orderBy: { earnedAt: 'desc' },
        },
      },
    });
  }

  async create(
    tenantId: string,
    data: {
      userId: string;
      targetLanguage: string;
      nativeLanguage: string;
      additionalLanguages?: string[];
      isHeritageSpeaker?: boolean;
      curriculumFramework?: string;
      yearLevel?: string;
      ibProgramme?: string;
    }
  ): Promise<LanguageLearnerProfile> {
    return prisma.languageLearnerProfile.create({
      data: {
        tenantId,
        userId: data.userId,
        targetLanguage: data.targetLanguage,
        nativeLanguage: data.nativeLanguage,
        additionalLanguages: data.additionalLanguages || [],
        isHeritageSpeaker: data.isHeritageSpeaker || false,
        curriculumFramework: data.curriculumFramework || 'ACARA',
        yearLevel: data.yearLevel,
        ibProgramme: data.ibProgramme,
      },
    });
  }

  async update(id: string, data: Prisma.LanguageLearnerProfileUpdateInput): Promise<LanguageLearnerProfile> {
    return prisma.languageLearnerProfile.update({
      where: { id },
      data,
    });
  }

  async awardXP(
    id: string,
    xp: number
  ): Promise<{ profile: LanguageLearnerProfile; leveledUp: boolean; newLevel: number }> {
    const profile = await prisma.languageLearnerProfile.findUnique({ where: { id } });
    if (!profile) throw new Error(`Profile not found: ${id}`);

    const oldLevel = this.calculateLevel(profile.totalXp);
    const newTotalXp = profile.totalXp + xp;
    const newLevel = this.calculateLevel(newTotalXp);
    const leveledUp = newLevel > oldLevel;

    const updated = await prisma.languageLearnerProfile.update({
      where: { id },
      data: {
        totalXp: newTotalXp,
        currentLevel: newLevel,
      },
    });

    return { profile: updated, leveledUp, newLevel };
  }

  async updateStreak(id: string): Promise<LanguageLearnerProfile> {
    const profile = await prisma.languageLearnerProfile.findUnique({ where: { id } });
    if (!profile) throw new Error(`Profile not found: ${id}`);

    const now = new Date();
    const lastActive = profile.lastActiveAt;
    let newStreak = profile.currentStreak;

    if (lastActive) {
      const hoursSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);
      if (hoursSinceActive >= 20 && hoursSinceActive <= 48) {
        newStreak += 1;
      } else if (hoursSinceActive > 48) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    return prisma.languageLearnerProfile.update({
      where: { id },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, profile.longestStreak),
        lastActiveAt: now,
      },
    });
  }

  async updateCEFRLevel(
    id: string,
    skill: 'overall' | 'listening' | 'speaking' | 'reading' | 'writing',
    level: string
  ): Promise<LanguageLearnerProfile> {
    const fieldMap: Record<string, string> = {
      overall: 'overallLevel',
      listening: 'listeningLevel',
      speaking: 'speakingLevel',
      reading: 'readingLevel',
      writing: 'writingLevel',
    };

    return prisma.languageLearnerProfile.update({
      where: { id },
      data: { [fieldMap[skill]]: level },
    });
  }

  private calculateLevel(xp: number): number {
    // Simple level formula: level = floor(sqrt(xp / 100)) + 1
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }
}

// ============================================================================
// VOCABULARY PROGRESS REPOSITORY
// ============================================================================

export class VocabularyProgressRepository {
  async findByProfile(profileId: string): Promise<LanguageVocabularyProgress | null> {
    return prisma.languageVocabularyProgress.findUnique({
      where: { profileId },
    });
  }

  async getOrCreate(profileId: string): Promise<LanguageVocabularyProgress> {
    let progress = await prisma.languageVocabularyProgress.findUnique({
      where: { profileId },
    });

    if (!progress) {
      progress = await prisma.languageVocabularyProgress.create({
        data: { profileId },
      });
    }

    return progress;
  }

  async updateCounts(
    profileId: string,
    data: { exposed?: number; mastered?: number; learning?: number }
  ): Promise<LanguageVocabularyProgress> {
    const updateData: Prisma.LanguageVocabularyProgressUpdateInput = {};

    if (data.exposed !== undefined) {
      updateData.totalWordsExposed = { increment: data.exposed };
    }
    if (data.mastered !== undefined) {
      updateData.totalWordsMastered = { increment: data.mastered };
    }
    if (data.learning !== undefined) {
      updateData.totalWordsLearning = { increment: data.learning };
    }

    return prisma.languageVocabularyProgress.update({
      where: { profileId },
      data: updateData,
    });
  }
}

// ============================================================================
// VOCABULARY ITEM REPOSITORY
// ============================================================================

export class VocabularyItemRepository {
  async findByWord(
    progressId: string,
    wordId: string
  ): Promise<LanguageVocabularyItem | null> {
    return prisma.languageVocabularyItem.findUnique({
      where: { progressId_wordId: { progressId, wordId } },
    });
  }

  async getDueForReview(
    progressId: string,
    limit: number = 20
  ): Promise<LanguageVocabularyItem[]> {
    const now = new Date();
    return prisma.languageVocabularyItem.findMany({
      where: {
        progressId,
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: now } }],
      },
      orderBy: [{ nextReviewAt: 'asc' }, { lastPracticedAt: 'asc' }],
      take: limit,
    });
  }

  async create(
    progressId: string,
    data: {
      wordId: string;
      word: string;
      translation: string;
      cefrLevel?: string;
      partOfSpeech?: string;
      exampleSentence?: string;
      audioUrl?: string;
    }
  ): Promise<LanguageVocabularyItem> {
    return prisma.languageVocabularyItem.create({
      data: {
        progressId,
        wordId: data.wordId,
        word: data.word,
        translation: data.translation,
        cefrLevel: data.cefrLevel || 'A1',
        partOfSpeech: data.partOfSpeech,
        exampleSentence: data.exampleSentence,
        audioUrl: data.audioUrl,
      },
    });
  }

  async recordReview(
    id: string,
    data: {
      easeFactor: number;
      interval: number;
      repetitions: number;
      nextReviewAt: Date;
      correct: boolean;
      masteryLevel: string;
    }
  ): Promise<LanguageVocabularyItem> {
    return prisma.languageVocabularyItem.update({
      where: { id },
      data: {
        easeFactor: data.easeFactor,
        interval: data.interval,
        repetitions: data.repetitions,
        nextReviewAt: data.nextReviewAt,
        timesCorrect: data.correct ? { increment: 1 } : undefined,
        timesIncorrect: !data.correct ? { increment: 1 } : undefined,
        lastAttemptCorrect: data.correct,
        lastPracticedAt: new Date(),
        masteryLevel: data.masteryLevel,
        masteredAt: data.masteryLevel === 'mastered' ? new Date() : undefined,
      },
    });
  }

  async getByMasteryLevel(
    progressId: string,
    masteryLevel: string
  ): Promise<LanguageVocabularyItem[]> {
    return prisma.languageVocabularyItem.findMany({
      where: { progressId, masteryLevel },
    });
  }

  async countByMasteryLevel(progressId: string): Promise<Record<string, number>> {
    const counts = await prisma.languageVocabularyItem.groupBy({
      by: ['masteryLevel'],
      where: { progressId },
      _count: true,
    });

    const result: Record<string, number> = {};
    for (const c of counts) {
      result[c.masteryLevel] = c._count;
    }

    return result;
  }
}

// ============================================================================
// CONVERSATION REPOSITORY
// ============================================================================

export class ConversationRepository {
  async findById(id: string): Promise<LanguageConversation | null> {
    return prisma.languageConversation.findUnique({ where: { id } });
  }

  async findActiveConversation(profileId: string): Promise<LanguageConversation | null> {
    return prisma.languageConversation.findFirst({
      where: {
        profileId,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async create(
    profileId: string,
    data: {
      mode: string;
      language: string;
      cefrLevel: string;
      aiRole?: string;
      aiPersona?: string;
      scenarioId?: string;
      scenarioTitle?: string;
      targetVocabulary?: string[];
      targetStructures?: string[];
      isHeritageVariant?: boolean;
    }
  ): Promise<LanguageConversation> {
    return prisma.languageConversation.create({
      data: {
        profileId,
        mode: data.mode,
        language: data.language,
        cefrLevel: data.cefrLevel,
        aiRole: data.aiRole,
        aiPersona: data.aiPersona,
        scenarioId: data.scenarioId,
        scenarioTitle: data.scenarioTitle,
        targetVocabulary: data.targetVocabulary || [],
        targetStructures: data.targetStructures || [],
        isHeritageVariant: data.isHeritageVariant || false,
      },
    });
  }

  async addMessage(
    id: string,
    message: { role: 'user' | 'assistant'; content: string; timestamp: Date }
  ): Promise<LanguageConversation> {
    const conversation = await prisma.languageConversation.findUnique({ where: { id } });
    if (!conversation) throw new Error(`Conversation not found: ${id}`);

    const messages = (conversation.messages as Array<{ role: string; content: string; timestamp: string }>) || [];
    messages.push({
      role: message.role,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
    });

    return prisma.languageConversation.update({
      where: { id },
      data: {
        messages,
        durationMinutes: Math.floor(
          (new Date().getTime() - conversation.startedAt.getTime()) / 60000
        ),
      },
    });
  }

  async endConversation(
    id: string,
    assessment: {
      fluencyScore?: number;
      accuracyScore?: number;
      overallScore?: number;
      strengths: string[];
      areasToImprove: string[];
      vocabularyUsed: string[];
      xpEarned: number;
      selfFluencyRating?: number;
      selfConfidenceRating?: number;
    }
  ): Promise<LanguageConversation> {
    const conversation = await prisma.languageConversation.findUnique({ where: { id } });
    if (!conversation) throw new Error(`Conversation not found: ${id}`);

    const endedAt = new Date();
    const durationMinutes = Math.max(
      1,
      Math.floor((endedAt.getTime() - conversation.startedAt.getTime()) / 60000)
    );

    return prisma.languageConversation.update({
      where: { id },
      data: {
        endedAt,
        durationMinutes,
        fluencyScore: assessment.fluencyScore,
        accuracyScore: assessment.accuracyScore,
        overallScore: assessment.overallScore,
        strengths: assessment.strengths,
        areasToImprove: assessment.areasToImprove,
        vocabularyUsed: assessment.vocabularyUsed,
        xpEarned: assessment.xpEarned,
        selfFluencyRating: assessment.selfFluencyRating,
        selfConfidenceRating: assessment.selfConfidenceRating,
      },
    });
  }

  async getRecentConversations(
    profileId: string,
    limit: number = 10
  ): Promise<LanguageConversation[]> {
    return prisma.languageConversation.findMany({
      where: { profileId, endedAt: { not: null } },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}

// ============================================================================
// HERITAGE PATHWAY REPOSITORY
// ============================================================================

export class HeritagePathwayRepository {
  async findByProfile(profileId: string): Promise<LanguageHeritagePathway | null> {
    return prisma.languageHeritagePathway.findUnique({
      where: { profileId },
    });
  }

  async create(
    profileId: string,
    data: {
      pathwayType: string;
      oralProficiency: string;
      literacyLevel: string;
      academicRegisterLevel: string;
      dialectFeatures?: string[];
      focusAreas?: string[];
      skipAreas?: string[];
      acceleratedTopics?: string[];
    }
  ): Promise<LanguageHeritagePathway> {
    return prisma.languageHeritagePathway.create({
      data: {
        profileId,
        pathwayType: data.pathwayType,
        oralProficiency: data.oralProficiency,
        literacyLevel: data.literacyLevel,
        academicRegisterLevel: data.academicRegisterLevel,
        dialectFeatures: data.dialectFeatures || [],
        focusAreas: data.focusAreas || [],
        skipAreas: data.skipAreas || [],
        acceleratedTopics: data.acceleratedTopics || [],
      },
    });
  }

  async update(
    profileId: string,
    data: Prisma.LanguageHeritagePathwayUpdateInput
  ): Promise<LanguageHeritagePathway> {
    return prisma.languageHeritagePathway.update({
      where: { profileId },
      data,
    });
  }
}

// ============================================================================
// ACHIEVEMENT REPOSITORY
// ============================================================================

export class AchievementRepository {
  async findByCode(code: string): Promise<LanguageAchievement | null> {
    return prisma.languageAchievement.findUnique({ where: { code } });
  }

  async getActive(): Promise<LanguageAchievement[]> {
    return prisma.languageAchievement.findMany({
      where: { isActive: true },
    });
  }

  async getByCategory(category: string): Promise<LanguageAchievement[]> {
    return prisma.languageAchievement.findMany({
      where: { category, isActive: true },
    });
  }
}

// ============================================================================
// LEARNER ACHIEVEMENT REPOSITORY
// ============================================================================

export class LearnerAchievementRepository {
  async getByProfile(
    profileId: string
  ): Promise<(LanguageLearnerAchievement & { achievement: LanguageAchievement })[]> {
    return prisma.languageLearnerAchievement.findMany({
      where: { profileId },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
    });
  }

  async hasAchievement(profileId: string, achievementId: string): Promise<boolean> {
    const existing = await prisma.languageLearnerAchievement.findUnique({
      where: { profileId_achievementId: { profileId, achievementId } },
    });
    return !!existing;
  }

  async award(profileId: string, achievementId: string): Promise<LanguageLearnerAchievement> {
    return prisma.languageLearnerAchievement.create({
      data: {
        profileId,
        achievementId,
        currentProgress: 0,
      },
    });
  }

  async updateProgress(
    profileId: string,
    achievementId: string,
    currentProgress: number,
    targetProgress?: number
  ): Promise<LanguageLearnerAchievement> {
    return prisma.languageLearnerAchievement.update({
      where: { profileId_achievementId: { profileId, achievementId } },
      data: { currentProgress, targetProgress },
    });
  }
}

// ============================================================================
// OFFLINE PACKAGE REPOSITORY
// ============================================================================

export class OfflinePackageRepository {
  async findByProfile(profileId: string): Promise<LanguageOfflinePackage[]> {
    return prisma.languageOfflinePackage.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    profileId: string,
    data: {
      packageType: string;
      contentSelection?: Record<string, unknown>;
      vocabularyCount?: number;
      totalItems?: number;
      estimatedSizeMb?: number;
      estimatedOfflineMinutes?: number;
    }
  ): Promise<LanguageOfflinePackage> {
    return prisma.languageOfflinePackage.create({
      data: {
        profileId,
        packageType: data.packageType,
        contentSelection: data.contentSelection || {},
        vocabularyCount: data.vocabularyCount || 0,
        totalItems: data.totalItems || 0,
        estimatedSizeMb: data.estimatedSizeMb || 0,
        estimatedOfflineMinutes: data.estimatedOfflineMinutes || 0,
      },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    downloadedAt?: Date
  ): Promise<LanguageOfflinePackage> {
    return prisma.languageOfflinePackage.update({
      where: { id },
      data: {
        downloadStatus: status,
        downloadedAt: downloadedAt || (status === 'ready' ? new Date() : undefined),
      },
    });
  }

  async syncOfflineProgress(
    id: string,
    progressData: Record<string, unknown>,
    pendingSyncItems: number
  ): Promise<LanguageOfflinePackage> {
    return prisma.languageOfflinePackage.update({
      where: { id },
      data: {
        offlineProgressData: progressData,
        pendingSyncItems,
        lastOfflineActivityAt: new Date(),
      },
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const languageProfileRepository = new LanguageProfileRepository();
export const vocabularyProgressRepository = new VocabularyProgressRepository();
export const vocabularyItemRepository = new VocabularyItemRepository();
export const conversationRepository = new ConversationRepository();
export const heritagePathwayRepository = new HeritagePathwayRepository();
export const achievementRepository = new AchievementRepository();
export const learnerAchievementRepository = new LearnerAchievementRepository();
export const offlinePackageRepository = new OfflinePackageRepository();
