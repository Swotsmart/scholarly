/**
 * Prisma-based Session Repository Implementation
 *
 * Note: Legacy repository - TutorBookingService now uses Prisma directly.
 * Maintained for backwards compatibility with service factory.
 */

import { prisma, Prisma } from '@scholarly/database';
import {
  TutoringSession,
  SessionStatus,
  SessionType,
  SessionFeedback,
  SessionLocation,
  LISSessionReport
} from '@scholarly/shared/types/scholarly-types';

// Local interface for backwards compatibility
export interface SessionRepository {
  findById(tenantId: string, id: string): Promise<TutoringSession | null>;
  findByTutor(tenantId: string, tutorId: string, dateRange?: { start: Date; end: Date }): Promise<TutoringSession[]>;
  findByLearner(tenantId: string, learnerId: string): Promise<TutoringSession[]>;
  findUpcoming(tenantId: string, userId: string, limit?: number): Promise<TutoringSession[]>;
  save(tenantId: string, session: TutoringSession): Promise<TutoringSession>;
  update(tenantId: string, id: string, updates: Partial<TutoringSession>): Promise<TutoringSession>;
}

export class PrismaSessionRepository implements SessionRepository {

  async findById(tenantId: string, id: string): Promise<TutoringSession | null> {
    const session = await prisma.tutoringSession.findFirst({
      where: { id, tenantId },
      include: {
        booking: true,
        participants: true,
        subject: true
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
    const sessions = await prisma.tutoringSession.findMany({
      where: {
        tenantId,
        tutorUserId: tutorId,
        ...(dateRange && {
          scheduledStart: { gte: dateRange.start },
          scheduledEnd: { lte: dateRange.end }
        })
      },
      include: { participants: true, subject: true },
      orderBy: { scheduledStart: 'asc' }
    });

    return sessions.map((s) => this.mapToSession(s));
  }

  async findByLearner(tenantId: string, learnerId: string): Promise<TutoringSession[]> {
    const sessions = await prisma.tutoringSession.findMany({
      where: {
        tenantId,
        participants: {
          some: { learnerProfileId: learnerId }
        }
      },
      include: { participants: true, subject: true },
      orderBy: { scheduledStart: 'desc' }
    });

    return sessions.map((s) => this.mapToSession(s));
  }

  async findUpcoming(tenantId: string, userId: string, limit = 10): Promise<TutoringSession[]> {
    const now = new Date();

    const sessions = await prisma.tutoringSession.findMany({
      where: {
        tenantId,
        scheduledStart: { gte: now },
        status: { in: ['scheduled', 'confirmed'] },
        OR: [
          { tutorUserId: userId },
          { participants: { some: { learnerProfileId: userId } } }
        ]
      },
      include: { participants: true, subject: true },
      orderBy: { scheduledStart: 'asc' },
      take: limit
    });

    return sessions.map((s) => this.mapToSession(s));
  }

  async save(tenantId: string, session: TutoringSession): Promise<TutoringSession> {
    const created = await prisma.tutoringSession.create({
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
        location: session.location as unknown as Prisma.InputJsonValue,
        videoRoomUrl: session.videoRoomUrl,
        subjectId: session.subjectId,
        topicsFocus: session.topicsFocus,
        curriculumCodes: [],
        status: session.status,
        bookingId: session.bookingId!,
        preworkAssigned: session.preworkAssigned,
        sessionNotes: session.sessionNotes,
        homeworkAssigned: session.homeworkAssigned,
        resourcesShared: session.resourcesShared,
        tutorFeedback: session.tutorFeedback as unknown as Prisma.InputJsonValue,
        learnerFeedback: session.learnerFeedback as unknown as Prisma.InputJsonValue,
        parentFeedback: session.parentFeedback as unknown as Prisma.InputJsonValue,
        lisSessionReport: session.lisSessionReport as unknown as Prisma.InputJsonValue,
      },
      include: { participants: true, subject: true }
    });

    return this.mapToSession(created);
  }

  async update(
    tenantId: string,
    id: string,
    updates: Partial<TutoringSession>
  ): Promise<TutoringSession> {
    const updateData: Prisma.TutoringSessionUpdateInput = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.actualStart) updateData.actualStart = updates.actualStart;
    if (updates.actualEnd) updateData.actualEnd = updates.actualEnd;
    if (updates.sessionNotes !== undefined) updateData.sessionNotes = updates.sessionNotes;
    if (updates.homeworkAssigned !== undefined) updateData.homeworkAssigned = updates.homeworkAssigned;
    if (updates.preworkAssigned !== undefined) updateData.preworkAssigned = updates.preworkAssigned;
    if (updates.tutorFeedback) updateData.tutorFeedback = updates.tutorFeedback as unknown as Prisma.InputJsonValue;
    if (updates.learnerFeedback) updateData.learnerFeedback = updates.learnerFeedback as unknown as Prisma.InputJsonValue;
    if (updates.parentFeedback) updateData.parentFeedback = updates.parentFeedback as unknown as Prisma.InputJsonValue;
    if (updates.resourcesShared) updateData.resourcesShared = updates.resourcesShared;
    if (updates.videoRoomUrl) updateData.videoRoomUrl = updates.videoRoomUrl;

    const updated = await prisma.tutoringSession.update({
      where: { id },
      data: updateData,
      include: { subject: true }
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
      subjectName: record.subject?.name || record.subjectName,
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
      billingStatus: undefined,
      amountCharged: undefined,
      tutorEarnings: undefined,
      platformCommission: undefined,
      tokenRewards: undefined
    };
  }
}
