/**
 * Early Years Repository
 *
 * Prisma-based repository for the Early Years (Little Explorers) module.
 * Handles family, child, session, activity, and phonics progress data.
 */

import { prisma, Prisma } from '@scholarly/database';

// ============================================================================
// TYPES
// ============================================================================

export type EarlyYearsFamily = Prisma.EarlyYearsFamilyGetPayload<{}>;
export type EarlyYearsChild = Prisma.EarlyYearsChildGetPayload<{}>;
export type EarlyYearsSession = Prisma.EarlyYearsSessionGetPayload<{}>;
export type EarlyYearsActivity = Prisma.EarlyYearsActivityGetPayload<{}>;
export type EarlyYearsPicturePassword = Prisma.EarlyYearsPicturePasswordGetPayload<{}>;
export type EarlyYearsPhonicsProgress = Prisma.EarlyYearsPhonicsProgressGetPayload<{}>;
export type EarlyYearsNumeracyProgress = Prisma.EarlyYearsNumeracyProgressGetPayload<{}>;

export type EarlyYearsChildWithProgress = EarlyYearsChild & {
  phonicsProgress: EarlyYearsPhonicsProgress | null;
  numeracyProgress: EarlyYearsNumeracyProgress | null;
  picturePassword: EarlyYearsPicturePassword | null;
};

export type EarlyYearsFamilyWithChildren = EarlyYearsFamily & {
  children: EarlyYearsChild[];
};

export type EarlyYearsSessionWithActivities = EarlyYearsSession & {
  activities: EarlyYearsActivity[];
};

// ============================================================================
// FAMILY REPOSITORY
// ============================================================================

export class EarlyYearsFamilyRepository {
  async findByPrimaryUser(
    tenantId: string,
    userId: string
  ): Promise<EarlyYearsFamily | null> {
    return prisma.earlyYearsFamily.findFirst({
      where: {
        tenantId,
        primaryUserId: userId,
        deletedAt: null,
      },
    });
  }

  async findById(tenantId: string, id: string): Promise<EarlyYearsFamily | null> {
    return prisma.earlyYearsFamily.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findWithChildren(
    tenantId: string,
    id: string
  ): Promise<EarlyYearsFamilyWithChildren | null> {
    return prisma.earlyYearsFamily.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { dateOfBirth: 'asc' },
        },
      },
    });
  }

  async create(
    tenantId: string,
    data: Omit<Prisma.EarlyYearsFamilyCreateInput, 'tenantId'>
  ): Promise<EarlyYearsFamily> {
    return prisma.earlyYearsFamily.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async update(id: string, data: Prisma.EarlyYearsFamilyUpdateInput): Promise<EarlyYearsFamily> {
    return prisma.earlyYearsFamily.update({
      where: { id },
      data,
    });
  }

  async addLearningMinutes(id: string, minutes: number): Promise<EarlyYearsFamily> {
    return prisma.earlyYearsFamily.update({
      where: { id },
      data: {
        totalLearningMinutes: { increment: minutes },
        lastActiveAt: new Date(),
      },
    });
  }
}

// ============================================================================
// CHILD REPOSITORY
// ============================================================================

export class EarlyYearsChildRepository {
  async findById(tenantId: string, id: string): Promise<EarlyYearsChild | null> {
    return prisma.earlyYearsChild.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findByFamily(tenantId: string, familyId: string): Promise<EarlyYearsChild[]> {
    return prisma.earlyYearsChild.findMany({
      where: { tenantId, familyId, deletedAt: null },
      orderBy: { dateOfBirth: 'asc' },
    });
  }

  async findWithProgress(
    tenantId: string,
    id: string
  ): Promise<EarlyYearsChildWithProgress | null> {
    return prisma.earlyYearsChild.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        phonicsProgress: true,
        numeracyProgress: true,
        picturePassword: true,
      },
    });
  }

  async create(
    tenantId: string,
    familyId: string,
    data: {
      firstName: string;
      preferredName?: string;
      dateOfBirth: Date;
      avatarId?: string;
    }
  ): Promise<EarlyYearsChild> {
    return prisma.earlyYearsChild.create({
      data: {
        tenantId,
        familyId,
        firstName: data.firstName,
        preferredName: data.preferredName,
        dateOfBirth: data.dateOfBirth,
        avatarId: data.avatarId,
      },
    });
  }

  async update(id: string, data: Prisma.EarlyYearsChildUpdateInput): Promise<EarlyYearsChild> {
    return prisma.earlyYearsChild.update({
      where: { id },
      data,
    });
  }

  async updateEngagement(
    id: string,
    data: {
      treasuresEarned?: number;
      starsEarned?: number;
      learningMinutes?: number;
    }
  ): Promise<EarlyYearsChild> {
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

    return prisma.earlyYearsChild.update({
      where: { id },
      data: updateData,
    });
  }

  async updateStreak(id: string): Promise<EarlyYearsChild> {
    const child = await prisma.earlyYearsChild.findUnique({ where: { id } });
    if (!child) throw new Error(`Child not found: ${id}`);

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

    return prisma.earlyYearsChild.update({
      where: { id },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, child.longestStreak),
        lastActiveAt: now,
      },
    });
  }
}

// ============================================================================
// SESSION REPOSITORY
// ============================================================================

export class EarlyYearsSessionRepository {
  async findById(id: string): Promise<EarlyYearsSession | null> {
    return prisma.earlyYearsSession.findUnique({ where: { id } });
  }

  async findActiveSession(
    tenantId: string,
    childId: string
  ): Promise<EarlyYearsSession | null> {
    return prisma.earlyYearsSession.findFirst({
      where: {
        tenantId,
        childId,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findWithActivities(
    tenantId: string,
    id: string
  ): Promise<EarlyYearsSessionWithActivities | null> {
    return prisma.earlyYearsSession.findFirst({
      where: { id, tenantId },
      include: {
        activities: {
          orderBy: { startedAt: 'asc' },
        },
      },
    });
  }

  async create(
    tenantId: string,
    data: {
      childId: string;
      familyId: string;
      sessionType?: string;
      world: string;
      mentor: string;
      maxDurationMinutes?: number;
      maxActivities?: number;
    }
  ): Promise<EarlyYearsSession> {
    return prisma.earlyYearsSession.create({
      data: {
        tenantId,
        childId: data.childId,
        familyId: data.familyId,
        sessionType: data.sessionType || 'learning',
        world: data.world,
        mentor: data.mentor,
        maxDurationMinutes: data.maxDurationMinutes || 15,
        maxActivities: data.maxActivities || 10,
      },
    });
  }

  async update(id: string, data: Prisma.EarlyYearsSessionUpdateInput): Promise<EarlyYearsSession> {
    return prisma.earlyYearsSession.update({
      where: { id },
      data,
    });
  }

  async endSession(
    id: string,
    data: { completedNaturally?: boolean; childMoodRating?: number; parentNotes?: string }
  ): Promise<EarlyYearsSession> {
    const session = await prisma.earlyYearsSession.findUnique({
      where: { id },
      include: { activities: true },
    });

    if (!session) throw new Error(`Session not found: ${id}`);

    const endedAt = new Date();
    const durationMinutes = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 60000
    );

    const completedActivities = session.activities.filter((a) => a.completedAt).length;
    const treasuresEarned = session.activities.filter((a) => a.treasureAwarded).length;

    return prisma.earlyYearsSession.update({
      where: { id },
      data: {
        endedAt,
        durationMinutes,
        activitiesCompleted: completedActivities,
        treasuresEarned,
        childMoodRating: data.childMoodRating,
        parentNotes: data.parentNotes,
      },
    });
  }

  async getRecentSessions(childId: string, limit: number = 10): Promise<EarlyYearsSession[]> {
    return prisma.earlyYearsSession.findMany({
      where: { childId, endedAt: { not: null } },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}

// ============================================================================
// ACTIVITY REPOSITORY
// ============================================================================

export class EarlyYearsActivityRepository {
  async create(
    sessionId: string,
    data: {
      activityType: string;
      targetContent?: string[];
      difficulty?: number;
    }
  ): Promise<EarlyYearsActivity> {
    return prisma.earlyYearsActivity.create({
      data: {
        sessionId,
        activityType: data.activityType,
        targetContent: data.targetContent || [],
        difficulty: data.difficulty || 1,
      },
    });
  }

  async completeActivity(
    id: string,
    result: {
      score: number;
      durationSeconds: number;
      attempts: number;
      hintsUsed: number;
      errorsCommitted: number;
      responseData?: Record<string, unknown>;
    }
  ): Promise<EarlyYearsActivity> {
    return prisma.earlyYearsActivity.update({
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
  }
}

// ============================================================================
// PHONICS PROGRESS REPOSITORY
// ============================================================================

export class EarlyYearsPhonicsProgressRepository {
  async findByChild(childId: string): Promise<EarlyYearsPhonicsProgress | null> {
    return prisma.earlyYearsPhonicsProgress.findUnique({
      where: { childId },
    });
  }

  async getOrCreate(childId: string): Promise<EarlyYearsPhonicsProgress> {
    let progress = await prisma.earlyYearsPhonicsProgress.findUnique({
      where: { childId },
    });

    if (!progress) {
      progress = await prisma.earlyYearsPhonicsProgress.create({
        data: { childId },
      });
    }

    return progress;
  }

  async update(id: string, data: Prisma.EarlyYearsPhonicsProgressUpdateInput): Promise<EarlyYearsPhonicsProgress> {
    return prisma.earlyYearsPhonicsProgress.update({
      where: { id },
      data,
    });
  }

  async updateGraphemeMastery(
    childId: string,
    grapheme: string,
    mastered: boolean
  ): Promise<EarlyYearsPhonicsProgress> {
    const progress = await prisma.earlyYearsPhonicsProgress.findUnique({
      where: { childId },
    });

    if (!progress) throw new Error(`PhonicsProgress not found for child: ${childId}`);

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

    return prisma.earlyYearsPhonicsProgress.update({
      where: { childId },
      data: {
        masteredGraphemes: Array.from(masteredSet),
        introducedGraphemes: Array.from(introducedSet),
        strugglingGraphemes: Array.from(strugglingSet),
      },
    });
  }
}

// ============================================================================
// PICTURE PASSWORD REPOSITORY
// ============================================================================

export class EarlyYearsPicturePasswordRepository {
  async findByChild(childId: string): Promise<EarlyYearsPicturePassword | null> {
    return prisma.earlyYearsPicturePassword.findUnique({
      where: { childId },
    });
  }

  async create(
    childId: string,
    data: { imageSequenceHash: string; sequenceLength: number }
  ): Promise<EarlyYearsPicturePassword> {
    return prisma.earlyYearsPicturePassword.create({
      data: {
        childId,
        imageSequenceHash: data.imageSequenceHash,
        sequenceLength: data.sequenceLength,
      },
    });
  }

  async update(
    childId: string,
    data: Prisma.EarlyYearsPicturePasswordUpdateInput
  ): Promise<EarlyYearsPicturePassword> {
    return prisma.earlyYearsPicturePassword.update({
      where: { childId },
      data,
    });
  }

  async recordFailedAttempt(childId: string): Promise<EarlyYearsPicturePassword> {
    const pp = await prisma.earlyYearsPicturePassword.findUnique({
      where: { childId },
    });

    if (!pp) throw new Error(`PicturePassword not found for child: ${childId}`);

    const newAttempts = pp.failedAttempts + 1;
    let lockedUntil: Date | null = null;

    // Lock for 5 minutes after 3 failed attempts
    if (newAttempts >= 3) {
      lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + 5);
    }

    return prisma.earlyYearsPicturePassword.update({
      where: { childId },
      data: {
        failedAttempts: newAttempts,
        lockedUntil,
        lastAttemptAt: new Date(),
      },
    });
  }

  async resetAttempts(childId: string): Promise<EarlyYearsPicturePassword> {
    return prisma.earlyYearsPicturePassword.update({
      where: { childId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastAttemptAt: new Date(),
      },
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const earlyYearsFamilyRepository = new EarlyYearsFamilyRepository();
export const earlyYearsChildRepository = new EarlyYearsChildRepository();
export const earlyYearsSessionRepository = new EarlyYearsSessionRepository();
export const earlyYearsActivityRepository = new EarlyYearsActivityRepository();
export const earlyYearsPhonicsProgressRepository = new EarlyYearsPhonicsProgressRepository();
export const earlyYearsPicturePasswordRepository = new EarlyYearsPicturePasswordRepository();
