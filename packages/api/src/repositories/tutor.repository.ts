/**
 * Prisma-based Tutor Repository Implementation
 */

import { PrismaClient } from '@prisma/client';
import {
  TutorUser,
  UserRole,
  Jurisdiction,
  SessionType,
  TutorSubject,
  TeachingStyle,
  AvailabilitySchedule,
  TutorPricing,
  TutorMetrics,
  SafeguardingCheck,
  Qualification
} from '@scholarly/shared/types/scholarly-types';
import { TutorRepository, TutorSearchFilters } from '../services/tutor-booking.service';

export class PrismaTutorRepository implements TutorRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(tenantId: string, id: string): Promise<TutorUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        id,
        tutorProfile: { isNot: null }
      },
      include: {
        tutorProfile: true
      }
    });

    if (!user || !user.tutorProfile) return null;
    return this.mapToTutorUser(user);
  }

  async findBySubject(
    tenantId: string,
    subjectId: string,
    filters?: TutorSearchFilters
  ): Promise<TutorUser[]> {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        tutorProfile: {
          isNot: null,
          status: 'active'
        },
        ...(filters?.jurisdiction && { jurisdiction: filters.jurisdiction }),
        ...(filters?.minRating && {
          tutorProfile: {
            averageRating: { gte: filters.minRating }
          }
        })
      },
      include: {
        tutorProfile: true
      },
      take: 50
    });

    // Filter by subject in memory (subjects stored as JSON)
    const tutors = users
      .filter((u) => u.tutorProfile)
      .map((u) => this.mapToTutorUser(u))
      .filter((t) => {
        // Check if tutor teaches the subject
        const teachesSubject = t.subjects.some((s) => s.subjectId === subjectId);
        if (!teachesSubject) return false;

        // Apply additional filters
        if (filters?.maxHourlyRate && t.pricing.hourlyRate1to1 > filters.maxHourlyRate) {
          return false;
        }
        if (filters?.yearLevels && filters.yearLevels.length > 0) {
          const matchesYearLevel = t.yearLevelsTeaching.some((y) =>
            filters.yearLevels!.includes(y)
          );
          if (!matchesYearLevel) return false;
        }
        if (filters?.sessionTypes && filters.sessionTypes.length > 0) {
          const matchesSessionType = t.sessionTypes.some((st) =>
            filters.sessionTypes!.includes(st)
          );
          if (!matchesSessionType) return false;
        }
        if (filters?.languages && filters.languages.length > 0) {
          const matchesLanguage = t.languages.some((l) => filters.languages!.includes(l));
          if (!matchesLanguage) return false;
        }

        return true;
      });

    return tutors;
  }

  async findAvailable(tenantId: string, dateTime: Date, duration: number): Promise<TutorUser[]> {
    // Get all active tutors
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        tutorProfile: {
          isNot: null,
          status: 'active'
        }
      },
      include: {
        tutorProfile: true
      }
    });

    // Filter by availability (simplified - would check calendar in production)
    const dayOfWeek = dateTime.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const timeStr = dateTime.toTimeString().substring(0, 5);

    return users
      .filter((u) => u.tutorProfile)
      .map((u) => this.mapToTutorUser(u))
      .filter((t) => {
        const slot = t.availability.regularSlots.find((s) => s.dayOfWeek === dayOfWeek);
        if (!slot) return false;
        return timeStr >= slot.startTime && timeStr <= slot.endTime;
      });
  }

  async save(tenantId: string, tutor: TutorUser): Promise<TutorUser> {
    const user = await this.prisma.user.upsert({
      where: { id: tutor.id },
      create: {
        id: tutor.id,
        tenantId,
        email: `${tutor.id}@scholarly.app`,
        displayName: tutor.displayName,
        firstName: tutor.displayName.split(' ')[0] || '',
        lastName: tutor.displayName.split(' ').slice(1).join(' ') || '',
        avatarUrl: tutor.avatarUrl,
        bio: tutor.bio,
        roles: tutor.roles,
        jurisdiction: tutor.jurisdiction,
        trustScore: tutor.trustScore,
        tokenBalance: tutor.tokenBalance,
        tutorProfile: {
          create: {
            tutorType: tutor.tutorType,
            subjects: tutor.subjects as any,
            yearLevels: tutor.yearLevelsTeaching,
            teachingStyle: tutor.teachingStyle as any,
            languages: tutor.languages,
            availability: tutor.availability as any,
            sessionTypes: tutor.sessionTypes,
            maxGroupSize: tutor.maxStudentsPerGroup,
            hourlyRate: tutor.pricing.hourlyRate1to1,
            groupRate: tutor.pricing.hourlyRateGroup,
            currency: tutor.pricing.currency,
            qualifications: tutor.qualifications as any,
            safeguardingChecks: tutor.safeguardingChecks as any,
            averageRating: tutor.metrics.averageRating,
            totalSessions: tutor.metrics.totalSessions,
            totalHours: tutor.metrics.totalHours
          }
        }
      },
      update: {
        displayName: tutor.displayName,
        avatarUrl: tutor.avatarUrl,
        bio: tutor.bio,
        trustScore: tutor.trustScore,
        tokenBalance: tutor.tokenBalance,
        tutorProfile: {
          update: {
            subjects: tutor.subjects as any,
            yearLevels: tutor.yearLevelsTeaching,
            teachingStyle: tutor.teachingStyle as any,
            languages: tutor.languages,
            availability: tutor.availability as any,
            sessionTypes: tutor.sessionTypes,
            maxGroupSize: tutor.maxStudentsPerGroup,
            hourlyRate: tutor.pricing.hourlyRate1to1,
            groupRate: tutor.pricing.hourlyRateGroup,
            averageRating: tutor.metrics.averageRating,
            totalSessions: tutor.metrics.totalSessions,
            totalHours: tutor.metrics.totalHours
          }
        }
      },
      include: { tutorProfile: true }
    });

    return this.mapToTutorUser(user);
  }

  async update(tenantId: string, id: string, updates: Partial<TutorUser>): Promise<TutorUser> {
    const updateData: any = {};
    const profileUpdateData: any = {};

    if (updates.displayName) updateData.displayName = updates.displayName;
    if (updates.avatarUrl) updateData.avatarUrl = updates.avatarUrl;
    if (updates.bio) updateData.bio = updates.bio;
    if (updates.trustScore !== undefined) updateData.trustScore = updates.trustScore;
    if (updates.tokenBalance !== undefined) updateData.tokenBalance = updates.tokenBalance;

    if (updates.subjects) profileUpdateData.subjects = updates.subjects;
    if (updates.yearLevelsTeaching) profileUpdateData.yearLevels = updates.yearLevelsTeaching;
    if (updates.teachingStyle) profileUpdateData.teachingStyle = updates.teachingStyle;
    if (updates.availability) profileUpdateData.availability = updates.availability;
    if (updates.pricing) {
      profileUpdateData.hourlyRate = updates.pricing.hourlyRate1to1;
      profileUpdateData.groupRate = updates.pricing.hourlyRateGroup;
    }
    if (updates.metrics) {
      profileUpdateData.averageRating = updates.metrics.averageRating;
      profileUpdateData.totalSessions = updates.metrics.totalSessions;
      profileUpdateData.totalHours = updates.metrics.totalHours;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        tutorProfile: Object.keys(profileUpdateData).length > 0
          ? { update: profileUpdateData }
          : undefined
      },
      include: { tutorProfile: true }
    });

    return this.mapToTutorUser(user);
  }

  private mapToTutorUser(user: any): TutorUser {
    const profile = user.tutorProfile;

    return {
      id: user.id,
      tenantId: user.tenantId,
      userId: user.id,
      roles: [UserRole.TUTOR_PROFESSIONAL],
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
      tutorType: profile?.tutorType || 'professional',
      qualifications: (profile?.qualifications as Qualification[]) || [],
      safeguardingChecks: (profile?.safeguardingChecks as SafeguardingCheck[]) || [],
      subjects: (profile?.subjects as TutorSubject[]) || [],
      yearLevelsTeaching: profile?.yearLevels || [],
      teachingStyle: (profile?.teachingStyle as TeachingStyle) || {
        approach: 'mixed',
        pacePreference: 'moderate',
        usesVisuals: true,
        usesGames: false,
        assignsHomework: true,
        providesMaterials: true,
        keywords: []
      },
      languages: profile?.languages || ['English'],
      availability: (profile?.availability as AvailabilitySchedule) || {
        timezone: 'Australia/Sydney',
        regularSlots: [],
        blockedDates: [],
        advanceBookingDays: 14,
        minimumNoticeHours: 24
      },
      sessionTypes: (profile?.sessionTypes as SessionType[]) || [SessionType.ONLINE_VIDEO],
      maxStudentsPerGroup: profile?.maxGroupSize || 5,
      pricing: {
        currency: profile?.currency || 'AUD',
        hourlyRate1to1: profile?.hourlyRate || 60,
        hourlyRateGroup: profile?.groupRate || 40,
        groupDiscountPerStudent: 10,
        packagesOffered: [],
        commissionRate: 0.15
      },
      metrics: {
        totalSessions: profile?.totalSessions || 0,
        totalHours: profile?.totalHours || 0,
        uniqueStudents: 0,
        repeatBookingRate: 0,
        averageRating: profile?.averageRating || 0,
        ratingCount: profile?.ratingCount || 0,
        responseTimeMinutes: 60,
        cancellationRate: 0,
        noShowRate: 0,
        averageStudentImprovement: 0,
        goalAchievementRate: 0
      },
      profileCompleteness: profile?.profileCompleteness || 50
    };
  }
}
