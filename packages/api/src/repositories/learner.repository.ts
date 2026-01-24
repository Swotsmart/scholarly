/**
 * Prisma-based Learner Repository Implementation
 */

import { PrismaClient } from '@prisma/client';
import {
  LearnerUser,
  UserRole,
  Jurisdiction,
  LearningPreferences,
  SubjectInterest,
  LISProfileSharing
} from '@scholarly/shared/types/scholarly-types';
import { LearnerRepository } from '../services/tutor-booking.service';

export class PrismaLearnerRepository implements LearnerRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(tenantId: string, id: string): Promise<LearnerUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        id,
        learnerProfile: { isNot: null }
      },
      include: {
        learnerProfile: true
      }
    });

    if (!user || !user.learnerProfile) return null;
    return this.mapToLearnerUser(user);
  }

  async findByParent(tenantId: string, parentId: string): Promise<LearnerUser[]> {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        learnerProfile: {
          isNot: null,
          parentIds: { has: parentId }
        }
      },
      include: {
        learnerProfile: true
      }
    });

    return users.filter((u) => u.learnerProfile).map((u) => this.mapToLearnerUser(u));
  }

  async save(tenantId: string, learner: LearnerUser): Promise<LearnerUser> {
    const user = await this.prisma.user.upsert({
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
            learningPreferences: learner.learningPreferences as any,
            subjects: learner.subjects as any,
            lisProfileSharing: learner.lisProfileSharing as any
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
            learningPreferences: learner.learningPreferences as any,
            subjects: learner.subjects as any,
            lisProfileSharing: learner.lisProfileSharing as any
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
