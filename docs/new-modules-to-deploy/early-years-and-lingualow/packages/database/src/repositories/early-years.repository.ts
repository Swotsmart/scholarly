/**
 * Early Years Repositories
 * 
 * @module @scholarly/database/repositories
 */

import { Prisma, EarlyYearsFamily, EarlyYearsChild, EarlyYearsSession, EarlyYearsActivity, EarlyYearsPicturePassword, EarlyYearsPhonicsProgress, EarlyYearsNumeracyProgress } from '@prisma/client';
import { prisma, TransactionClient, withDatabase, withTransaction } from '../client.js';
import { TenantScopedRepository, BaseRepository } from './base.repository.js';
import { Result, success, failure, NotFoundError } from '@scholarly/shared';

// =============================================================================
// FAMILY REPOSITORY
// =============================================================================

export class FamilyRepository extends TenantScopedRepository<
  EarlyYearsFamily,
  Prisma.EarlyYearsFamilyCreateInput,
  Prisma.EarlyYearsFamilyUpdateInput,
  Prisma.EarlyYearsFamilyWhereUniqueInput,
  Prisma.EarlyYearsFamilyWhereInput,
  Prisma.EarlyYearsFamilyOrderByWithRelationInput
> {
  protected entityName = 'Family';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).earlyYearsFamily;
  }

  protected buildUniqueWhere(id: string): Prisma.EarlyYearsFamilyWhereUniqueInput {
    return { id };
  }

  /**
   * Find family by primary user
   */
  async findByPrimaryUser(
    tenantId: string,
    userId: string
  ): Promise<Result<EarlyYearsFamily | null>> {
    return withDatabase(async () => {
      const family = await prisma.earlyYearsFamily.findUnique({
        where: {
          tenantId_primaryUserId: { tenantId, primaryUserId: userId },
        },
      });
      return success(family);
    }, 'Family.findByPrimaryUser');
  }

  /**
   * Find family with children
   */
  async findWithChildren(
    tenantId: string,
    id: string
  ): Promise<Result<EarlyYearsFamily & { children: EarlyYearsChild[] }>> {
    return withDatabase(async () => {
      const family = await prisma.earlyYearsFamily.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: {
          children: {
            where: { deletedAt: null },
            orderBy: { dateOfBirth: 'asc' },
          },
        },
      });

      if (!family) {
        return failure(new NotFoundError('Family', id));
      }

      return success(family);
    }, 'Family.findWithChildren');
  }

  /**
   * Update learning minutes
   */
  async addLearningMinutes(
    id: string,
    minutes: number,
    tx?: TransactionClient
  ): Promise<Result<EarlyYearsFamily>> {
    return withDatabase(async () => {
      const family = await (tx || prisma).earlyYearsFamily.update({
        where: { id },
        data: {
          totalLearningMinutes: { increment: minutes },
          lastActiveAt: new Date(),
        },
      });
      return success(family);
    }, 'Family.addLearningMinutes');
  }
}

// =============================================================================
// CHILD REPOSITORY
// =============================================================================

export class ChildRepository extends TenantScopedRepository<
  EarlyYearsChild,
  Prisma.EarlyYearsChildCreateInput,
  Prisma.EarlyYearsChildUpdateInput,
  Prisma.EarlyYearsChildWhereUniqueInput,
  Prisma.EarlyYearsChildWhereInput,
  Prisma.EarlyYearsChildOrderByWithRelationInput
> {
  protected entityName = 'Child';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).earlyYearsChild;
  }

  protected buildUniqueWhere(id: string): Prisma.EarlyYearsChildWhereUniqueInput {
    return { id };
  }

  /**
   * Find children by family
   */
  async findByFamily(
    tenantId: string,
    familyId: string
  ): Promise<Result<EarlyYearsChild[]>> {
    return this.findByTenant(tenantId, { familyId });
  }

  /**
   * Find child with all progress data
   */
  async findWithProgress(
    tenantId: string,
    id: string
  ): Promise<Result<EarlyYearsChild & {
    phonicsProgress: EarlyYearsPhonicsProgress | null;
    numeracyProgress: EarlyYearsNumeracyProgress | null;
    picturePassword: EarlyYearsPicturePassword | null;
  }>> {
    return withDatabase(async () => {
      const child = await prisma.earlyYearsChild.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: {
          phonicsProgress: true,
          numeracyProgress: true,
          picturePassword: true,
        },
      });

      if (!child) {
        return failure(new NotFoundError('Child', id));
      }

      return success(child);
    }, 'Child.findWithProgress');
  }

  /**
   * Update engagement stats
   */
  async updateEngagement(
    id: string,
    data: {
      treasuresEarned?: number;
      starsEarned?: number;
      learningMinutes?: number;
    },
    tx?: TransactionClient
  ): Promise<Result<EarlyYearsChild>> {
    return withDatabase(async () => {
      const updateData: Prisma.EarlyYearsChildUpdateInput = {
        lastActiveAt: new Date(),
      };

      if (data.treasuresEarned) {
        updateData.totalTreasures = { increment: data.treasuresEarned };
      }
      if (data.starsEarned) {
        updateData.totalStars = { increment: data.starsEarned };
      }
      if (data.learningMinutes) {
        updateData.totalLearningMinutes = { increment: data.learningMinutes };
      }

      const child = await (tx || prisma).earlyYearsChild.update({
        where: { id },
        data: updateData,
      });

      return success(child);
    }, 'Child.updateEngagement');
  }

  /**
   * Update streak
   */
  async updateStreak(id: string, tx?: TransactionClient): Promise<Result<EarlyYearsChild>> {
    return withDatabase(async () => {
      const child = await prisma.earlyYearsChild.findUnique({ where: { id } });
      if (!child) return failure(new NotFoundError('Child', id));

      const now = new Date();
      const lastActive = child.lastActiveAt;
      let newStreak = child.currentStreak;

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

      const updated = await (tx || prisma).earlyYearsChild.update({
        where: { id },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, child.longestStreak),
          lastActiveAt: now,
        },
      });

      return success(updated);
    }, 'Child.updateStreak');
  }
}

// =============================================================================
// SESSION REPOSITORY
// =============================================================================

export class SessionRepository extends TenantScopedRepository<
  EarlyYearsSession,
  Prisma.EarlyYearsSessionCreateInput,
  Prisma.EarlyYearsSessionUpdateInput,
  Prisma.EarlyYearsSessionWhereUniqueInput,
  Prisma.EarlyYearsSessionWhereInput,
  Prisma.EarlyYearsSessionOrderByWithRelationInput
> {
  protected entityName = 'Session';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).earlyYearsSession;
  }

  protected buildUniqueWhere(id: string): Prisma.EarlyYearsSessionWhereUniqueInput {
    return { id };
  }

  protected addDeletedFilter(where: Prisma.EarlyYearsSessionWhereInput): Prisma.EarlyYearsSessionWhereInput {
    // Sessions don't have deletedAt
    return where;
  }

  /**
   * Find active session for child
   */
  async findActiveSession(
    tenantId: string,
    childId: string
  ): Promise<Result<EarlyYearsSession | null>> {
    return withDatabase(async () => {
      const session = await prisma.earlyYearsSession.findFirst({
        where: {
          tenantId,
          childId,
          endedAt: null,
        },
        orderBy: { startedAt: 'desc' },
      });
      return success(session);
    }, 'Session.findActiveSession');
  }

  /**
   * Find session with activities
   */
  async findWithActivities(
    id: string
  ): Promise<Result<EarlyYearsSession & { activities: EarlyYearsActivity[] }>> {
    return withDatabase(async () => {
      const session = await prisma.earlyYearsSession.findUnique({
        where: { id },
        include: {
          activities: {
            orderBy: { startedAt: 'asc' },
          },
        },
      });

      if (!session) {
        return failure(new NotFoundError('Session', id));
      }

      return success(session);
    }, 'Session.findWithActivities');
  }

  /**
   * End session and calculate totals
   */
  async endSession(
    id: string,
    tx?: TransactionClient
  ): Promise<Result<EarlyYearsSession>> {
    return withDatabase(async () => {
      const session = await prisma.earlyYearsSession.findUnique({
        where: { id },
        include: { activities: true },
      });

      if (!session) {
        return failure(new NotFoundError('Session', id));
      }

      const endedAt = new Date();
      const durationMinutes = Math.floor(
        (endedAt.getTime() - session.startedAt.getTime()) / 60000
      );

      const completedActivities = session.activities.filter(a => a.completedAt).length;
      const treasuresEarned = session.activities.filter(a => a.treasureAwarded).length;

      const updated = await (tx || prisma).earlyYearsSession.update({
        where: { id },
        data: {
          endedAt,
          durationMinutes,
          activitiesCompleted: completedActivities,
          treasuresEarned,
        },
      });

      return success(updated);
    }, 'Session.endSession');
  }

  /**
   * Get recent sessions for child
   */
  async getRecentSessions(
    childId: string,
    limit: number = 10
  ): Promise<Result<EarlyYearsSession[]>> {
    return withDatabase(async () => {
      const sessions = await prisma.earlyYearsSession.findMany({
        where: { childId, endedAt: { not: null } },
        orderBy: { startedAt: 'desc' },
        take: limit,
      });
      return success(sessions);
    }, 'Session.getRecentSessions');
  }
}

// =============================================================================
// ACTIVITY REPOSITORY
// =============================================================================

export class ActivityRepository extends BaseRepository<
  EarlyYearsActivity,
  Prisma.EarlyYearsActivityCreateInput,
  Prisma.EarlyYearsActivityUpdateInput,
  Prisma.EarlyYearsActivityWhereUniqueInput,
  Prisma.EarlyYearsActivityWhereInput,
  Prisma.EarlyYearsActivityOrderByWithRelationInput
> {
  protected entityName = 'Activity';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).earlyYearsActivity;
  }

  protected buildUniqueWhere(id: string): Prisma.EarlyYearsActivityWhereUniqueInput {
    return { id };
  }

  protected addDeletedFilter(where: Prisma.EarlyYearsActivityWhereInput): Prisma.EarlyYearsActivityWhereInput {
    return where;
  }

  /**
   * Complete an activity
   */
  async completeActivity(
    id: string,
    result: {
      score: number;
      durationSeconds: number;
      attempts: number;
      hintsUsed: number;
      errorsCommitted: number;
      responseData?: Record<string, unknown>;
    },
    tx?: TransactionClient
  ): Promise<Result<EarlyYearsActivity>> {
    return withDatabase(async () => {
      const activity = await (tx || prisma).earlyYearsActivity.update({
        where: { id },
        data: {
          completedAt: new Date(),
          score: result.score,
          durationSeconds: result.durationSeconds,
          attempts: result.attempts,
          hintsUsed: result.hintsUsed,
          errorsCommitted: result.errorsCommitted,
          responseData: result.responseData || {},
          treasureAwarded: result.score >= 0.8,
        },
      });

      return success(activity);
    }, 'Activity.completeActivity');
  }
}

// =============================================================================
// PHONICS PROGRESS REPOSITORY
// =============================================================================

export class PhonicsProgressRepository extends BaseRepository<
  EarlyYearsPhonicsProgress,
  Prisma.EarlyYearsPhonicsProgressCreateInput,
  Prisma.EarlyYearsPhonicsProgressUpdateInput,
  Prisma.EarlyYearsPhonicsProgressWhereUniqueInput,
  Prisma.EarlyYearsPhonicsProgressWhereInput
> {
  protected entityName = 'PhonicsProgress';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).earlyYearsPhonicsProgress;
  }

  protected buildUniqueWhere(id: string): Prisma.EarlyYearsPhonicsProgressWhereUniqueInput {
    return { id };
  }

  protected addDeletedFilter(where: Prisma.EarlyYearsPhonicsProgressWhereInput) {
    return where;
  }

  /**
   * Find by child ID
   */
  async findByChild(childId: string): Promise<Result<EarlyYearsPhonicsProgress | null>> {
    return withDatabase(async () => {
      const progress = await prisma.earlyYearsPhonicsProgress.findUnique({
        where: { childId },
      });
      return success(progress);
    }, 'PhonicsProgress.findByChild');
  }

  /**
   * Get or create progress for child
   */
  async getOrCreate(childId: string): Promise<Result<EarlyYearsPhonicsProgress>> {
    return withDatabase(async () => {
      let progress = await prisma.earlyYearsPhonicsProgress.findUnique({
        where: { childId },
      });

      if (!progress) {
        progress = await prisma.earlyYearsPhonicsProgress.create({
          data: { childId },
        });
      }

      return success(progress);
    }, 'PhonicsProgress.getOrCreate');
  }

  /**
   * Update grapheme mastery
   */
  async updateGraphemeMastery(
    childId: string,
    grapheme: string,
    mastered: boolean,
    tx?: TransactionClient
  ): Promise<Result<EarlyYearsPhonicsProgress>> {
    return withDatabase(async () => {
      const progress = await prisma.earlyYearsPhonicsProgress.findUnique({
        where: { childId },
      });

      if (!progress) {
        return failure(new NotFoundError('PhonicsProgress', childId));
      }

      const masteredSet = new Set(progress.masteredGraphemes);
      const introducedSet = new Set(progress.introducedGraphemes);
      const strugglingSet = new Set(progress.strugglingGraphemes);

      if (mastered) {
        masteredSet.add(grapheme);
        strugglingSet.delete(grapheme);
      } else {
        strugglingSet.add(grapheme);
      }
      introducedSet.add(grapheme);

      const updated = await (tx || prisma).earlyYearsPhonicsProgress.update({
        where: { childId },
        data: {
          masteredGraphemes: Array.from(masteredSet),
          introducedGraphemes: Array.from(introducedSet),
          strugglingGraphemes: Array.from(strugglingSet),
        },
      });

      return success(updated);
    }, 'PhonicsProgress.updateGraphemeMastery');
  }
}

// =============================================================================
// PICTURE PASSWORD REPOSITORY
// =============================================================================

export class PicturePasswordRepository extends BaseRepository<
  EarlyYearsPicturePassword,
  Prisma.EarlyYearsPicturePasswordCreateInput,
  Prisma.EarlyYearsPicturePasswordUpdateInput,
  Prisma.EarlyYearsPicturePasswordWhereUniqueInput,
  Prisma.EarlyYearsPicturePasswordWhereInput
> {
  protected entityName = 'PicturePassword';

  protected getDelegate(tx?: TransactionClient) {
    return (tx || prisma).earlyYearsPicturePassword;
  }

  protected buildUniqueWhere(id: string): Prisma.EarlyYearsPicturePasswordWhereUniqueInput {
    return { id };
  }

  protected addDeletedFilter(where: Prisma.EarlyYearsPicturePasswordWhereInput) {
    return where;
  }

  /**
   * Find by child ID
   */
  async findByChild(childId: string): Promise<Result<EarlyYearsPicturePassword | null>> {
    return withDatabase(async () => {
      const pp = await prisma.earlyYearsPicturePassword.findUnique({
        where: { childId },
      });
      return success(pp);
    }, 'PicturePassword.findByChild');
  }

  /**
   * Record failed attempt
   */
  async recordFailedAttempt(childId: string): Promise<Result<EarlyYearsPicturePassword>> {
    return withDatabase(async () => {
      const pp = await prisma.earlyYearsPicturePassword.findUnique({
        where: { childId },
      });

      if (!pp) {
        return failure(new NotFoundError('PicturePassword', childId));
      }

      const newAttempts = pp.failedAttempts + 1;
      let lockedUntil: Date | null = null;

      // Lock for 5 minutes after 3 failed attempts
      if (newAttempts >= 3) {
        lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + 5);
      }

      const updated = await prisma.earlyYearsPicturePassword.update({
        where: { childId },
        data: {
          failedAttempts: newAttempts,
          lockedUntil,
          lastAttemptAt: new Date(),
        },
      });

      return success(updated);
    }, 'PicturePassword.recordFailedAttempt');
  }

  /**
   * Reset failed attempts
   */
  async resetAttempts(childId: string): Promise<Result<EarlyYearsPicturePassword>> {
    return withDatabase(async () => {
      const updated = await prisma.earlyYearsPicturePassword.update({
        where: { childId },
        data: {
          failedAttempts: 0,
          lockedUntil: null,
          lastAttemptAt: new Date(),
        },
      });
      return success(updated);
    }, 'PicturePassword.resetAttempts');
  }

  /**
   * Check if locked
   */
  async isLocked(childId: string): Promise<boolean> {
    const result = await this.findByChild(childId);
    if (!result.success || !result.data) return false;
    
    const pp = result.data;
    if (!pp.lockedUntil) return false;
    
    return pp.lockedUntil > new Date();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const familyRepository = new FamilyRepository();
export const childRepository = new ChildRepository();
export const sessionRepository = new SessionRepository();
export const activityRepository = new ActivityRepository();
export const phonicsProgressRepository = new PhonicsProgressRepository();
export const picturePasswordRepository = new PicturePasswordRepository();
