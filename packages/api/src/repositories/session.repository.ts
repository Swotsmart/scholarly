/**
 * Prisma-based Session Repository Implementation
 */

import { PrismaClient } from '@prisma/client';
import {
  TutoringSession,
  SessionStatus,
  SessionType,
  SessionFeedback,
  SessionLocation,
  LISSessionReport
} from '@scholarly/shared/types/scholarly-types';
import { SessionRepository } from '../services/tutor-booking.service';

export class PrismaSessionRepository implements SessionRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(tenantId: string, id: string): Promise<TutoringSession | null> {
    const session = await this.prisma.tutoringSession.findFirst({
      where: { id, tenantId },
      include: {
        booking: true,
        participants: true
      }
    });

    if (!session) return null;
    return this.mapToSession(session);
  }

  async findByTutor(
    tenantId: string,
    tutorId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<TutoringSession[]> {
    const sessions = await this.prisma.tutoringSession.findMany({
      where: {
        tenantId,
        tutorUserId: tutorId,
        ...(dateRange && {
          scheduledStart: { gte: dateRange.start },
          scheduledEnd: { lte: dateRange.end }
        })
      },
      include: { participants: true },
      orderBy: { scheduledStart: 'asc' }
    });

    return sessions.map((s) => this.mapToSession(s));
  }

  async findByLearner(tenantId: string, learnerId: string): Promise<TutoringSession[]> {
    const sessions = await this.prisma.tutoringSession.findMany({
      where: {
        tenantId,
        participants: {
          some: { learnerProfileId: learnerId }
        }
      },
      include: { participants: true },
      orderBy: { scheduledStart: 'desc' }
    });

    return sessions.map((s) => this.mapToSession(s));
  }

  async findUpcoming(tenantId: string, userId: string, limit = 10): Promise<TutoringSession[]> {
    const now = new Date();

    const sessions = await this.prisma.tutoringSession.findMany({
      where: {
        tenantId,
        scheduledStart: { gte: now },
        status: { in: ['scheduled', 'confirmed'] },
        OR: [
          { tutorUserId: userId },
          { participants: { some: { learnerProfileId: userId } } }
        ]
      },
      include: { participants: true },
      orderBy: { scheduledStart: 'asc' },
      take: limit
    });

    return sessions.map((s) => this.mapToSession(s));
  }

  async save(tenantId: string, session: TutoringSession): Promise<TutoringSession> {
    const created = await this.prisma.tutoringSession.create({
      data: {
        id: session.id,
        tenantId,
        tutorUserId: session.tutorId,
        tutorProfileId: session.tutorId, // Assuming tutor profile ID same as user ID for simplicity
        scheduledStart: session.scheduledStart,
        scheduledEnd: session.scheduledEnd,
        actualStart: session.actualStart,
        actualEnd: session.actualEnd,
        timezone: session.timezone,
        sessionType: session.sessionType,
        isGroupSession: session.isGroupSession,
        location: session.location as any,
        videoRoomUrl: session.videoRoomUrl,
        subjectId: session.subjectId,
        subjectName: session.subjectName,
        topicsFocus: session.topicsFocus,
        curriculumCodes: [],
        status: session.status,
        bookingId: session.bookingId!,
        preworkAssigned: session.preworkAssigned,
        sessionNotes: session.sessionNotes,
        homeworkAssigned: session.homeworkAssigned,
        resourcesShared: session.resourcesShared,
        tutorFeedback: session.tutorFeedback as any,
        learnerFeedback: session.learnerFeedback as any,
        parentFeedback: session.parentFeedback as any,
        lisSessionReport: session.lisSessionReport as any,
        billingStatus: session.billingStatus,
        amountCharged: session.amountCharged,
        tutorEarnings: session.tutorEarnings,
        platformCommission: session.platformCommission,
        tokenRewards: session.tokenRewards
      },
      include: { participants: true }
    });

    return this.mapToSession(created);
  }

  async update(
    tenantId: string,
    id: string,
    updates: Partial<TutoringSession>
  ): Promise<TutoringSession> {
    const updateData: any = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.actualStart) updateData.actualStart = updates.actualStart;
    if (updates.actualEnd) updateData.actualEnd = updates.actualEnd;
    if (updates.sessionNotes !== undefined) updateData.sessionNotes = updates.sessionNotes;
    if (updates.homeworkAssigned !== undefined) updateData.homeworkAssigned = updates.homeworkAssigned;
    if (updates.preworkAssigned !== undefined) updateData.preworkAssigned = updates.preworkAssigned;
    if (updates.billingStatus) updateData.billingStatus = updates.billingStatus;
    if (updates.tutorFeedback) updateData.tutorFeedback = updates.tutorFeedback;
    if (updates.learnerFeedback) updateData.learnerFeedback = updates.learnerFeedback;
    if (updates.parentFeedback) updateData.parentFeedback = updates.parentFeedback;
    if (updates.resourcesShared) updateData.resourcesShared = updates.resourcesShared;
    if (updates.videoRoomUrl) updateData.videoRoomUrl = updates.videoRoomUrl;

    const updated = await this.prisma.tutoringSession.update({
      where: { id },
      data: updateData
    });

    return this.mapToSession(updated);
  }

  private mapToSession(record: any): TutoringSession {
    // Extract learner IDs from participants
    const learnerIds = record.participants?.map((p: any) => p.learnerProfileId) || [];

    return {
      id: record.id,
      tenantId: record.tenantId,
      tutorId: record.tutorUserId,
      learnerIds,
      parentIds: [], // Parent IDs would come from a separate lookup if needed
      scheduledStart: record.scheduledStart,
      scheduledEnd: record.scheduledEnd,
      actualStart: record.actualStart,
      actualEnd: record.actualEnd,
      timezone: record.timezone || 'Australia/Sydney',
      sessionType: record.sessionType as SessionType,
      isGroupSession: record.isGroupSession,
      location: record.location as SessionLocation | undefined,
      videoRoomUrl: record.videoRoomUrl,
      subjectId: record.subjectId,
      subjectName: record.subjectName,
      topicsFocus: record.topicsFocus || [],
      status: record.status as SessionStatus,
      bookingId: record.bookingId,
      packageId: undefined,
      preworkAssigned: record.preworkAssigned,
      sessionNotes: record.sessionNotes,
      homeworkAssigned: record.homeworkAssigned,
      resourcesShared: record.resourcesShared || [],
      tutorFeedback: record.tutorFeedback as SessionFeedback | undefined,
      learnerFeedback: record.learnerFeedback as SessionFeedback | undefined,
      parentFeedback: record.parentFeedback as SessionFeedback | undefined,
      lisSessionReport: record.lisSessionReport as LISSessionReport | undefined,
      billingStatus: record.billingStatus,
      amountCharged: record.amountCharged,
      tutorEarnings: record.tutorEarnings,
      platformCommission: record.platformCommission,
      tokenRewards: record.tokenRewards
    };
  }
}
