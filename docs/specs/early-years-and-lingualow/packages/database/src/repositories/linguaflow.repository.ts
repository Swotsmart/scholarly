/**
 * LinguaFlow Repositories
 * 
 * @module @scholarly/database/repositories
 */

import { Prisma, LanguageLearnerProfile, LanguageVocabularyProgress, LanguageVocabularyItem, LanguageConversation, LanguageHeritagePathway, LanguageAchievement, LanguageLearnerAchievement, LanguageOfflinePackage } from '@prisma/client';
import { prisma, TransactionClient, withDatabase } from '../client.js';
import { TenantScopedRepository, BaseRepository } from './base.repository.js';
import { Result, success, failure, NotFoundError, calculateXPLevel } from '@scholarly/shared';

// =============================================================================
// PROFILE REPOSITORY
// =============================================================================

export class LanguageProfileRepository extends TenantScopedRepository<
  LanguageLearnerProfile,
  Prisma.LanguageLearnerProfileCreateInput,
  Prisma.LanguageLearnerProfileUpdateInput,
  Prisma.LanguageLearnerProfileWhereUniqueInput,
  Prisma.LanguageLearnerProfileWhereInput,
  Prisma.LanguageLearnerProfileOrderByWithRelationInput
> {
  protected entityName = 'LanguageProfile';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).languageLearnerProfile;
  }

  protected buildUniqueWhere(id: string): Prisma.LanguageLearnerProfileWhereUniqueInput {
    return { id };
  }

  /**
   * Find profile by user and language
   */
  async findByUserAndLanguage(
    tenantId: string,
    userId: string,
    targetLanguage: string
  ): Promise<Result<LanguageLearnerProfile | null>> {
    return withDatabase(async () => {
      const profile = await prisma.languageLearnerProfile.findUnique({
        where: {
          tenantId_userId_targetLanguage: { tenantId, userId, targetLanguage },
        },
      });
      return success(profile);
    }, 'LanguageProfile.findByUserAndLanguage');
  }

  /**
   * Find all profiles for user
   */
  async findByUser(
    tenantId: string,
    userId: string
  ): Promise<Result<LanguageLearnerProfile[]>> {
    return this.findByTenant(tenantId, { userId });
  }

  /**
   * Find profile with all related data
   */
  async findWithDetails(
    tenantId: string,
    id: string
  ): Promise<Result<LanguageLearnerProfile & {
    vocabularyProgress: LanguageVocabularyProgress | null;
    heritagePathway: LanguageHeritagePathway | null;
    achievements: LanguageLearnerAchievement[];
  }>> {
    return withDatabase(async () => {
      const profile = await prisma.languageLearnerProfile.findFirst({
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

      if (!profile) {
        return failure(new NotFoundError('LanguageProfile', id));
      }

      return success(profile);
    }, 'LanguageProfile.findWithDetails');
  }

  /**
   * Award XP and update level
   */
  async awardXP(
    id: string,
    xp: number,
    tx?: TransactionClient
  ): Promise<Result<{ profile: LanguageLearnerProfile; leveledUp: boolean; newLevel: number }>> {
    return withDatabase(async () => {
      const profile = await prisma.languageLearnerProfile.findUnique({ where: { id } });
      if (!profile) return failure(new NotFoundError('LanguageProfile', id));

      const oldLevel = calculateXPLevel(profile.totalXp);
      const newTotalXp = profile.totalXp + xp;
      const newLevelInfo = calculateXPLevel(newTotalXp);
      const leveledUp = newLevelInfo.level > oldLevel.level;

      const updated = await (tx || prisma).languageLearnerProfile.update({
        where: { id },
        data: {
          totalXp: newTotalXp,
          currentLevel: newLevelInfo.level,
        },
      });

      return success({
        profile: updated,
        leveledUp,
        newLevel: newLevelInfo.level,
      });
    }, 'LanguageProfile.awardXP');
  }

  /**
   * Update streak
   */
  async updateStreak(id: string, tx?: TransactionClient): Promise<Result<LanguageLearnerProfile>> {
    return withDatabase(async () => {
      const profile = await prisma.languageLearnerProfile.findUnique({ where: { id } });
      if (!profile) return failure(new NotFoundError('LanguageProfile', id));

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

      const updated = await (tx || prisma).languageLearnerProfile.update({
        where: { id },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, profile.longestStreak),
          lastActiveAt: now,
        },
      });

      return success(updated);
    }, 'LanguageProfile.updateStreak');
  }

  /**
   * Update CEFR level
   */
  async updateCEFRLevel(
    id: string,
    skill: 'overall' | 'listening' | 'speaking' | 'reading' | 'writing',
    level: string,
    tx?: TransactionClient
  ): Promise<Result<LanguageLearnerProfile>> {
    const fieldMap: Record<string, string> = {
      overall: 'overallLevel',
      listening: 'listeningLevel',
      speaking: 'speakingLevel',
      reading: 'readingLevel',
      writing: 'writingLevel',
    };

    return this.update(id, { [fieldMap[skill]]: level }, tx);
  }
}

// =============================================================================
// VOCABULARY PROGRESS REPOSITORY
// =============================================================================

export class VocabularyProgressRepository extends BaseRepository<
  LanguageVocabularyProgress,
  Prisma.LanguageVocabularyProgressCreateInput,
  Prisma.LanguageVocabularyProgressUpdateInput,
  Prisma.LanguageVocabularyProgressWhereUniqueInput,
  Prisma.LanguageVocabularyProgressWhereInput
> {
  protected entityName = 'VocabularyProgress';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).languageVocabularyProgress;
  }

  protected buildUniqueWhere(id: string): Prisma.LanguageVocabularyProgressWhereUniqueInput {
    return { id };
  }

  protected addDeletedFilter(where: Prisma.LanguageVocabularyProgressWhereInput) {
    return where;
  }

  /**
   * Find by profile ID
   */
  async findByProfile(profileId: string): Promise<Result<LanguageVocabularyProgress | null>> {
    return withDatabase(async () => {
      const progress = await prisma.languageVocabularyProgress.findUnique({
        where: { profileId },
      });
      return success(progress);
    }, 'VocabularyProgress.findByProfile');
  }

  /**
   * Get or create for profile
   */
  async getOrCreate(profileId: string): Promise<Result<LanguageVocabularyProgress>> {
    return withDatabase(async () => {
      let progress = await prisma.languageVocabularyProgress.findUnique({
        where: { profileId },
      });

      if (!progress) {
        progress = await prisma.languageVocabularyProgress.create({
          data: { profileId },
        });
      }

      return success(progress);
    }, 'VocabularyProgress.getOrCreate');
  }

  /**
   * Update word counts
   */
  async updateCounts(
    profileId: string,
    data: {
      exposed?: number;
      mastered?: number;
      learning?: number;
    },
    tx?: TransactionClient
  ): Promise<Result<LanguageVocabularyProgress>> {
    return withDatabase(async () => {
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

      const progress = await (tx || prisma).languageVocabularyProgress.update({
        where: { profileId },
        data: updateData,
      });

      return success(progress);
    }, 'VocabularyProgress.updateCounts');
  }
}

// =============================================================================
// VOCABULARY ITEM REPOSITORY
// =============================================================================

export class VocabularyItemRepository extends BaseRepository<
  LanguageVocabularyItem,
  Prisma.LanguageVocabularyItemCreateInput,
  Prisma.LanguageVocabularyItemUpdateInput,
  Prisma.LanguageVocabularyItemWhereUniqueInput,
  Prisma.LanguageVocabularyItemWhereInput,
  Prisma.LanguageVocabularyItemOrderByWithRelationInput
> {
  protected entityName = 'VocabularyItem';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).languageVocabularyItem;
  }

  protected buildUniqueWhere(id: string): Prisma.LanguageVocabularyItemWhereUniqueInput {
    return { id };
  }

  protected addDeletedFilter(where: Prisma.LanguageVocabularyItemWhereInput) {
    return where;
  }

  /**
   * Find by progress and word
   */
  async findByWord(
    progressId: string,
    wordId: string
  ): Promise<Result<LanguageVocabularyItem | null>> {
    return withDatabase(async () => {
      const item = await prisma.languageVocabularyItem.findUnique({
        where: { progressId_wordId: { progressId, wordId } },
      });
      return success(item);
    }, 'VocabularyItem.findByWord');
  }

  /**
   * Get due vocabulary for review
   */
  async getDueForReview(
    progressId: string,
    limit: number = 20
  ): Promise<Result<LanguageVocabularyItem[]>> {
    return withDatabase(async () => {
      const now = new Date();
      const items = await prisma.languageVocabularyItem.findMany({
        where: {
          progressId,
          OR: [
            { nextReviewAt: null },
            { nextReviewAt: { lte: now } },
          ],
        },
        orderBy: [
          { nextReviewAt: 'asc' },
          { lastPracticedAt: 'asc' },
        ],
        take: limit,
      });
      return success(items);
    }, 'VocabularyItem.getDueForReview');
  }

  /**
   * Update after review (SM-2 algorithm applied externally)
   */
  async recordReview(
    id: string,
    data: {
      easeFactor: number;
      interval: number;
      repetitions: number;
      nextReviewAt: Date;
      correct: boolean;
      masteryLevel: string;
    },
    tx?: TransactionClient
  ): Promise<Result<LanguageVocabularyItem>> {
    return withDatabase(async () => {
      const item = await (tx || prisma).languageVocabularyItem.update({
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
      return success(item);
    }, 'VocabularyItem.recordReview');
  }

  /**
   * Get items by mastery level
   */
  async getByMasteryLevel(
    progressId: string,
    masteryLevel: string
  ): Promise<Result<LanguageVocabularyItem[]>> {
    return this.findMany({ progressId, masteryLevel });
  }

  /**
   * Count by mastery level
   */
  async countByMasteryLevel(
    progressId: string
  ): Promise<Result<Record<string, number>>> {
    return withDatabase(async () => {
      const counts = await prisma.languageVocabularyItem.groupBy({
        by: ['masteryLevel'],
        where: { progressId },
        _count: true,
      });

      const result: Record<string, number> = {};
      for (const c of counts) {
        result[c.masteryLevel] = c._count;
      }

      return success(result);
    }, 'VocabularyItem.countByMasteryLevel');
  }
}

// =============================================================================
// CONVERSATION REPOSITORY
// =============================================================================

export class ConversationRepository extends BaseRepository<
  LanguageConversation,
  Prisma.LanguageConversationCreateInput,
  Prisma.LanguageConversationUpdateInput,
  Prisma.LanguageConversationWhereUniqueInput,
  Prisma.LanguageConversationWhereInput,
  Prisma.LanguageConversationOrderByWithRelationInput
> {
  protected entityName = 'Conversation';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).languageConversation;
  }

  protected buildUniqueWhere(id: string): Prisma.LanguageConversationWhereUniqueInput {
    return { id };
  }

  protected addDeletedFilter(where: Prisma.LanguageConversationWhereInput) {
    return where;
  }

  /**
   * Find active conversation for profile
   */
  async findActiveConversation(profileId: string): Promise<Result<LanguageConversation | null>> {
    return withDatabase(async () => {
      const conversation = await prisma.languageConversation.findFirst({
        where: {
          profileId,
          endedAt: null,
        },
        orderBy: { startedAt: 'desc' },
      });
      return success(conversation);
    }, 'Conversation.findActiveConversation');
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    id: string,
    message: { role: 'user' | 'assistant'; content: string; timestamp: Date }
  ): Promise<Result<LanguageConversation>> {
    return withDatabase(async () => {
      const conversation = await prisma.languageConversation.findUnique({ where: { id } });
      if (!conversation) return failure(new NotFoundError('Conversation', id));

      const messages = (conversation.messages as Array<{ role: string; content: string; timestamp: string }>) || [];
      messages.push({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
      });

      const updated = await prisma.languageConversation.update({
        where: { id },
        data: {
          messages,
          durationMinutes: Math.floor(
            (new Date().getTime() - conversation.startedAt.getTime()) / 60000
          ),
        },
      });

      return success(updated);
    }, 'Conversation.addMessage');
  }

  /**
   * End conversation with assessment
   */
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
    },
    tx?: TransactionClient
  ): Promise<Result<LanguageConversation>> {
    return withDatabase(async () => {
      const conversation = await prisma.languageConversation.findUnique({ where: { id } });
      if (!conversation) return failure(new NotFoundError('Conversation', id));

      const endedAt = new Date();
      const durationMinutes = Math.max(
        1,
        Math.floor((endedAt.getTime() - conversation.startedAt.getTime()) / 60000)
      );

      const updated = await (tx || prisma).languageConversation.update({
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
        },
      });

      return success(updated);
    }, 'Conversation.endConversation');
  }

  /**
   * Get recent conversations for profile
   */
  async getRecentConversations(
    profileId: string,
    limit: number = 10
  ): Promise<Result<LanguageConversation[]>> {
    return withDatabase(async () => {
      const conversations = await prisma.languageConversation.findMany({
        where: { profileId, endedAt: { not: null } },
        orderBy: { startedAt: 'desc' },
        take: limit,
      });
      return success(conversations);
    }, 'Conversation.getRecentConversations');
  }
}

// =============================================================================
// HERITAGE PATHWAY REPOSITORY
// =============================================================================

export class HeritagePathwayRepository extends BaseRepository<
  LanguageHeritagePathway,
  Prisma.LanguageHeritagePathwayCreateInput,
  Prisma.LanguageHeritagePathwayUpdateInput,
  Prisma.LanguageHeritagePathwayWhereUniqueInput,
  Prisma.LanguageHeritagePathwayWhereInput
> {
  protected entityName = 'HeritagePathway';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).languageHeritagePathway;
  }

  protected buildUniqueWhere(id: string): Prisma.LanguageHeritagePathwayWhereUniqueInput {
    return { id };
  }

  protected addDeletedFilter(where: Prisma.LanguageHeritagePathwayWhereInput) {
    return where;
  }

  /**
   * Find by profile
   */
  async findByProfile(profileId: string): Promise<Result<LanguageHeritagePathway | null>> {
    return withDatabase(async () => {
      const pathway = await prisma.languageHeritagePathway.findUnique({
        where: { profileId },
      });
      return success(pathway);
    }, 'HeritagePathway.findByProfile');
  }
}

// =============================================================================
// ACHIEVEMENT REPOSITORY
// =============================================================================

export class AchievementRepository extends BaseRepository<
  LanguageAchievement,
  Prisma.LanguageAchievementCreateInput,
  Prisma.LanguageAchievementUpdateInput,
  Prisma.LanguageAchievementWhereUniqueInput,
  Prisma.LanguageAchievementWhereInput
> {
  protected entityName = 'Achievement';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).languageAchievement;
  }

  protected buildUniqueWhere(id: string): Prisma.LanguageAchievementWhereUniqueInput {
    return { id };
  }

  protected addDeletedFilter(where: Prisma.LanguageAchievementWhereInput) {
    return where;
  }

  /**
   * Find by code
   */
  async findByCode(code: string): Promise<Result<LanguageAchievement | null>> {
    return withDatabase(async () => {
      const achievement = await prisma.languageAchievement.findUnique({
        where: { code },
      });
      return success(achievement);
    }, 'Achievement.findByCode');
  }

  /**
   * Get all active achievements
   */
  async getActive(): Promise<Result<LanguageAchievement[]>> {
    return this.findMany({ isActive: true });
  }

  /**
   * Get achievements by category
   */
  async getByCategory(category: string): Promise<Result<LanguageAchievement[]>> {
    return this.findMany({ category, isActive: true });
  }
}

// =============================================================================
// LEARNER ACHIEVEMENT REPOSITORY
// =============================================================================

export class LearnerAchievementRepository extends BaseRepository<
  LanguageLearnerAchievement,
  Prisma.LanguageLearnerAchievementCreateInput,
  Prisma.LanguageLearnerAchievementUpdateInput,
  Prisma.LanguageLearnerAchievementWhereUniqueInput,
  Prisma.LanguageLearnerAchievementWhereInput
> {
  protected entityName = 'LearnerAchievement';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).languageLearnerAchievement;
  }

  protected buildUniqueWhere(id: string): Prisma.LanguageLearnerAchievementWhereUniqueInput {
    return { id };
  }

  protected addDeletedFilter(where: Prisma.LanguageLearnerAchievementWhereInput) {
    return where;
  }

  /**
   * Get all achievements for profile
   */
  async getByProfile(profileId: string): Promise<Result<(LanguageLearnerAchievement & { achievement: LanguageAchievement })[]>> {
    return withDatabase(async () => {
      const achievements = await prisma.languageLearnerAchievement.findMany({
        where: { profileId },
        include: { achievement: true },
        orderBy: { earnedAt: 'desc' },
      });
      return success(achievements);
    }, 'LearnerAchievement.getByProfile');
  }

  /**
   * Check if achievement already earned
   */
  async hasAchievement(profileId: string, achievementId: string): Promise<boolean> {
    const result = await withDatabase(async () => {
      const existing = await prisma.languageLearnerAchievement.findUnique({
        where: { profileId_achievementId: { profileId, achievementId } },
      });
      return success(!!existing);
    }, 'LearnerAchievement.hasAchievement');

    return result.success && result.data;
  }

  /**
   * Award achievement
   */
  async award(
    profileId: string,
    achievementId: string,
    tx?: TransactionClient
  ): Promise<Result<LanguageLearnerAchievement>> {
    return withDatabase(async () => {
      const achievement = await (tx || prisma).languageLearnerAchievement.create({
        data: {
          profileId,
          achievementId,
          currentProgress: 0,
        },
      });
      return success(achievement);
    }, 'LearnerAchievement.award');
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const languageProfileRepository = new LanguageProfileRepository();
export const vocabularyProgressRepository = new VocabularyProgressRepository();
export const vocabularyItemRepository = new VocabularyItemRepository();
export const conversationRepository = new ConversationRepository();
export const heritagePathwayRepository = new HeritagePathwayRepository();
export const achievementRepository = new AchievementRepository();
export const learnerAchievementRepository = new LearnerAchievementRepository();
