/**
 * Prisma-based Learner Repository Implementation
 *
 * Note: Legacy repository - TutorBookingService now uses Prisma directly.
 * Maintained for backwards compatibility with service factory.
 */

import { prisma, Prisma } from '@scholarly/database';
import {
  LearnerUser,
  UserRole,
  Jurisdiction,
  LearningPreferences,
  SubjectInterest,
  LISProfileSharing
} from '@scholarly/shared/types/scholarly-types';

// Local interface for backwards compatibility
export interface LearnerRepository {
  findById(tenantId: string, id: string): Promise<LearnerUser | null>;
  findByParent(tenantId: string, parentId: string): Promise<LearnerUser[]>;
  save(tenantId: string, learner: LearnerUser): Promise<LearnerUser>;
}

export class PrismaLearnerRepository implements LearnerRepository {

  async findById(tenantId: string, id: string): Promise<LearnerUser | null> {
    const user = await prisma.user.findFirst({
      where: {
        tenantId,
        id,
      },
      include: {
        learnerProfile: true
      }
    });

    if (!user || !user.learnerProfile) return null;
    return this.mapToLearnerUser(user);
  }

  async findByParent(tenantId: string, parentId: string): Promise<LearnerUser[]> {
    // Get learner profiles with this parentId
    const learnerProfiles = await prisma.learnerProfile.findMany({
      where: {
        user: { tenantId }
      },
      include: {
        user: true
      }
    });

    // Filter for those with the parentId
    const filtered = learnerProfiles.filter((lp) => {
      const parentIds = lp.parentIds as string[] | null;
      return parentIds?.includes(parentId);
    });

    return filtered.map((lp) => this.mapToLearnerUser({ ...lp.user, learnerProfile: lp }));
  }

  async save(tenantId: string, learner: LearnerUser): Promise<LearnerUser> {
    const prefs = learner.learningPreferences;
    const user = await prisma.user.upsert({
      where: { id: learner.id },
      create: {
        id: learner.id,
        tenantId,
        email: `${learner.id}@scholarly.app`,
        displayName: learner.displayName,
        firstName: learner.displayName.split(' ')[0] || '',
        lastName: learner.displayName.split(' ').slice(1).join(' ') || '',
        avatarUrl: learner.avatarUrl,
        roles: [UserRole.LEARNER],
        jurisdiction: learner.jurisdiction,
        trustScore: learner.trustScore,
        tokenBalance: learner.tokenBalance,
        learnerProfile: {
          create: {
            dateOfBirth: learner.dateOfBirth,
            yearLevel: learner.yearLevel,
            parentIds: learner.parentIds,
            preferredSessionLength: prefs?.preferredSessionLength,
            learningPace: (prefs as any)?.pace,
            lisProfileSharing: learner.lisProfileSharing as unknown as Prisma.InputJsonValue
          }
        }
      },
      update: {
        displayName: learner.displayName,
        avatarUrl: learner.avatarUrl,
        trustScore: learner.trustScore,
        tokenBalance: learner.tokenBalance,
        learnerProfile: {
          update: {
            yearLevel: learner.yearLevel,
            preferredSessionLength: prefs?.preferredSessionLength,
            learningPace: (prefs as any)?.pace,
            lisProfileSharing: learner.lisProfileSharing as unknown as Prisma.InputJsonValue
          }
        }
      },
      include: { learnerProfile: true }
    });

    return this.mapToLearnerUser(user);
  }

  private mapToLearnerUser(user: any): LearnerUser {
    const profile = user.learnerProfile;

    return {
      id: user.id,
      tenantId: user.tenantId,
      userId: user.id,
      roles: [UserRole.LEARNER],
      jurisdiction: user.jurisdiction as Jurisdiction,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      identityVerified: user.identityVerified,
      trustScore: user.trustScore,
      tokenBalance: user.tokenBalance,
      dateOfBirth: profile?.dateOfBirth || new Date(),
      yearLevel: profile?.yearLevel || 'Year 7',
      parentIds: profile?.parentIds || [],
      learningPreferences: profile?.learningPreferences as LearningPreferences | undefined,
      subjects: (profile?.subjects as SubjectInterest[]) || [],
      lisProfileSharing: (profile?.lisProfileSharing as LISProfileSharing) || {
        shareStrengths: true,
        shareWeaknesses: true,
        shareAffectiveState: false,
        shareGoals: true,
        shareProgress: true
      }
    };
  }
}
