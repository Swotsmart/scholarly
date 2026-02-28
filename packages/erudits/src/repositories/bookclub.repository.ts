/**
 * ============================================================================
 * Book Club Repositories — Prisma Implementation
 * ============================================================================
 *
 * Data access for book clubs, sessions, readings, and members.
 *
 * @module erudits/repositories/bookclub
 */

import type {
  BookClub, BookClubSession, BookClubReading, BookClubMember,
  BookClubRepository, BookClubSessionRepository,
  BookClubReadingRepository, BookClubMemberRepository,
  CurriculumTag,
  ListFilter, PaginatedResult,
StrictPartial,
} from '../types/erudits.types';

import {
  PrismaClientLike,
  toPrismaEnum, fromPrismaEnumToSnake,
  paginationArgs, paginatedResult,
  jsonOrDefault,
} from './shared';

// ============================================================================
// BOOK CLUB REPOSITORY
// ============================================================================

export class PrismaBookClubRepository implements BookClubRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, club: BookClub): Promise<BookClub> {
    const row = await this.prisma.bookClub.create({
      data: {
        id: club.id,
        tenantId,
        organiserId: club.organiserId,
        organiserName: club.organiserName,
        name: club.name,
        slug: club.slug,
        description: club.description,
        coverImageUrl: club.coverImageUrl,
        language: club.language,
        maxParticipants: club.maxParticipants,
        isPublic: club.isPublic,
        requiresApproval: club.requiresApproval,
        subscriptionRequired: club.subscriptionRequired,
        subjectArea: club.subjectArea,
        yearLevels: club.yearLevels,
        startDate: club.startDate,
        endDate: club.endDate,
        meetingFrequency: club.meetingFrequency,
        meetingDay: club.meetingDay,
        meetingTime: club.meetingTime,
        timezone: club.timezone,
        isActive: club.isActive,
        participantCount: club.participantCount,
      },
    });

    return this.mapFromPrisma(row);
  }

  async findById(tenantId: string, id: string): Promise<BookClub | null> {
    const row = await this.prisma.bookClub.findFirst({
      where: { id, tenantId },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<BookClub | null> {
    const row = await this.prisma.bookClub.findFirst({
      where: { tenantId, slug },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findByOrganiser(tenantId: string, organiserId: string): Promise<BookClub[]> {
    const rows = await this.prisma.bookClub.findMany({
      where: { tenantId, organiserId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.mapFromPrisma(r));
  }

  async findPublic(tenantId: string, filter: ListFilter): Promise<PaginatedResult<BookClub>> {
    const { skip, take, page, pageSize } = paginationArgs(filter);
    const where = { tenantId, isPublic: true, isActive: true };

    const [rows, total] = await Promise.all([
      this.prisma.bookClub.findMany({ where, skip, take, orderBy: { participantCount: 'desc' } }),
      this.prisma.bookClub.count({ where }),
    ]);

    return paginatedResult(rows.map(r => this.mapFromPrisma(r)), total, page, pageSize);
  }

  async update(_tenantId: string, id: string, updates: StrictPartial<BookClub>): Promise<BookClub> {
    const data: Record<string, unknown> = {};

    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.maxParticipants !== undefined) data.maxParticipants = updates.maxParticipants;
    if (updates.isPublic !== undefined) data.isPublic = updates.isPublic;
    if (updates.isActive !== undefined) data.isActive = updates.isActive;
    if (updates.startDate !== undefined) data.startDate = updates.startDate;
    if (updates.endDate !== undefined) data.endDate = updates.endDate;
    if (updates.participantCount !== undefined) data.participantCount = updates.participantCount;

    const row = await this.prisma.bookClub.update({
      where: { id },
      data,
    });

    return this.mapFromPrisma(row);
  }

  private mapFromPrisma(row: Record<string, unknown>): BookClub {
    const yearLevels = jsonOrDefault(row.yearLevels, [] as string[]);
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
      organiserId: row.organiserId as string,
      organiserName: row.organiserName as string,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string | undefined,
      coverImageUrl: row.coverImageUrl as string | undefined,
      language: row.language as string,
      maxParticipants: row.maxParticipants as number | undefined,
      maxMembers: row.maxParticipants as number | undefined,
      isPublic: row.isPublic as boolean,
      requiresApproval: row.requiresApproval as boolean,
      subscriptionRequired: row.subscriptionRequired as boolean,
      subjectArea: row.subjectArea as string | undefined,
      yearLevels,
      targetYearLevels: yearLevels,
      curriculumTags: [] as CurriculumTag[],
      curriculumCodes: [],
      startDate: row.startDate as Date | undefined,
      endDate: row.endDate as Date | undefined,
      meetingFrequency: row.meetingFrequency as string | undefined,
      meetingDay: row.meetingDay as string | undefined,
      meetingTime: row.meetingTime as string | undefined,
      timezone: row.timezone as string,
      isActive: row.isActive as boolean,
      participantCount: row.participantCount as number,
      memberCount: row.participantCount as number,
      sessionCount: 0,
      readingCount: 0,
      completionRate: 0,
    };
  }
}

// ============================================================================
// BOOK CLUB SESSION REPOSITORY
// ============================================================================

export class PrismaBookClubSessionRepository implements BookClubSessionRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, session: BookClubSession): Promise<BookClubSession> {
    const row = await this.prisma.bookClubSession.create({
      data: {
        id: session.id,
        tenantId,
        bookClubId: session.bookClubId,
        title: session.title,
        description: session.description,
        sessionType: toPrismaEnum(session.sessionType),
        scheduledAt: session.scheduledAt,
        durationMinutes: session.durationMinutes,
        sortOrder: session.sortOrder,
        readingId: session.readingId,
        meetingUrl: session.meetingUrl,
        facilitatorNotes: session.facilitatorNotes,
        status: session.status,
      },
    });

    return this.mapFromPrisma(row);
  }

  async findById(tenantId: string, id: string): Promise<BookClubSession | null> {
    const row = await this.prisma.bookClubSession.findFirst({
      where: { id, tenantId },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findByClub(tenantId: string, bookClubId: string): Promise<BookClubSession[]> {
    const rows = await this.prisma.bookClubSession.findMany({
      where: { tenantId, bookClubId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(r => this.mapFromPrisma(r));
  }

  async findUpcoming(tenantId: string, bookClubId: string, limit?: number): Promise<BookClubSession[]> {
    const rows = await this.prisma.bookClubSession.findMany({
      where: {
        tenantId,
        bookClubId,
        scheduledAt: { gte: new Date() },
        status: { not: 'completed' },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit || 10,
    });
    return rows.map(r => this.mapFromPrisma(r));
  }

  async update(_tenantId: string, id: string, updates: StrictPartial<BookClubSession>): Promise<BookClubSession> {
    const data: Record<string, unknown> = {};

    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.scheduledAt !== undefined) data.scheduledAt = updates.scheduledAt;
    if (updates.durationMinutes !== undefined) data.durationMinutes = updates.durationMinutes;
    if (updates.meetingUrl !== undefined) data.meetingUrl = updates.meetingUrl;
    if (updates.facilitatorNotes !== undefined) data.facilitatorNotes = updates.facilitatorNotes;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.isCompleted !== undefined) data.status = updates.isCompleted ? 'completed' : 'scheduled';
    if (updates.attendeeCount !== undefined) data.attendeeCount = updates.attendeeCount;

    const row = await this.prisma.bookClubSession.update({
      where: { id },
      data,
    });

    return this.mapFromPrisma(row);
  }

  private mapFromPrisma(row: Record<string, unknown>): BookClubSession {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      bookClubId: row.bookClubId as string,
      title: row.title as string,
      description: row.description as string | undefined,
      sessionType: fromPrismaEnumToSnake(row.sessionType as string) as BookClubSession['sessionType'],
      scheduledAt: row.scheduledAt as Date,
      durationMinutes: row.durationMinutes as number,
      sortOrder: row.sortOrder as number,
      readingId: row.readingId as string | undefined,
      meetingUrl: row.meetingUrl as string | undefined,
      facilitatorNotes: row.facilitatorNotes as string | undefined,
      status: row.status as string,
      isCompleted: (row.status as string) === 'completed',
      attendeeCount: (row.attendeeCount as number) ?? 0,
    };
  }
}

// ============================================================================
// BOOK CLUB READING REPOSITORY
// ============================================================================

export class PrismaBookClubReadingRepository implements BookClubReadingRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, reading: BookClubReading): Promise<BookClubReading> {
    const row = await this.prisma.bookClubReading.create({
      data: {
        id: reading.id,
        tenantId,
        bookClubId: reading.bookClubId,
        title: reading.title,
        author: reading.author,
        isbn: reading.isbn,
        coverImageUrl: reading.coverImageUrl,
        publicationId: reading.publicationId,
        sortOrder: reading.sortOrder,
        startDate: reading.startDate,
        endDate: reading.endDate ?? reading.readByDate,
        curriculumCode: reading.curriculumCode,
        learningObjectives: reading.learningObjectives,
      },
    });

    return this.mapFromPrisma(row);
  }

  async findById(tenantId: string, id: string): Promise<BookClubReading | null> {
    const row = await this.prisma.bookClubReading.findFirst({
      where: { id, tenantId },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findByClub(tenantId: string, bookClubId: string): Promise<BookClubReading[]> {
    const rows = await this.prisma.bookClubReading.findMany({
      where: { tenantId, bookClubId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(r => this.mapFromPrisma(r));
  }

  async update(_tenantId: string, id: string, updates: StrictPartial<BookClubReading>): Promise<BookClubReading> {
    const data: Record<string, unknown> = {};

    if (updates.title !== undefined) data.title = updates.title;
    if (updates.author !== undefined) data.author = updates.author;
    if (updates.sortOrder !== undefined) data.sortOrder = updates.sortOrder;
    if (updates.curriculumCode !== undefined) data.curriculumCode = updates.curriculumCode;
    if (updates.learningObjectives !== undefined) data.learningObjectives = updates.learningObjectives;

    const row = await this.prisma.bookClubReading.update({
      where: { id },
      data,
    });

    return this.mapFromPrisma(row);
  }

  private mapFromPrisma(row: Record<string, unknown>): BookClubReading {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      bookClubId: row.bookClubId as string,
      title: row.title as string,
      author: row.author as string | undefined,
      isbn: row.isbn as string | undefined,
      coverImageUrl: row.coverImageUrl as string | undefined,
      publicationId: row.publicationId as string | undefined,
      sortOrder: row.sortOrder as number,
      startDate: row.startDate as Date | undefined,
      endDate: row.endDate as Date | undefined,
      readByDate: row.endDate as Date | undefined,
      curriculumCode: row.curriculumCode as string | undefined,
      learningObjectives: jsonOrDefault(row.learningObjectives, [] as string[]),
      isComplete: false,
      completionRate: 0,
    };
  }
}

// ============================================================================
// BOOK CLUB MEMBER REPOSITORY
// ============================================================================

export class PrismaBookClubMemberRepository implements BookClubMemberRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, member: BookClubMember): Promise<BookClubMember> {
    const row = await this.prisma.bookClubMember.create({
      data: {
        id: member.id,
        tenantId,
        bookClubId: member.bookClubId,
        userId: member.userId,
        displayName: member.displayName || member.userName,
        role: member.role,
        sessionsAttended: member.sessionsAttended,
      },
    });

    return this.mapFromPrisma(row);
  }

  async findById(tenantId: string, id: string): Promise<BookClubMember | null> {
    const row = await this.prisma.bookClubMember.findFirst({
      where: { id, tenantId },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findByClub(tenantId: string, bookClubId: string): Promise<BookClubMember[]> {
    const rows = await this.prisma.bookClubMember.findMany({
      where: { tenantId, bookClubId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(r => this.mapFromPrisma(r));
  }

  async findByUser(tenantId: string, userId: string): Promise<BookClubMember[]> {
    const rows = await this.prisma.bookClubMember.findMany({
      where: { tenantId, userId },
    });
    return rows.map(r => this.mapFromPrisma(r));
  }

  async findByUserAndClub(tenantId: string, userId: string, bookClubId: string): Promise<BookClubMember | null> {
    const row = await this.prisma.bookClubMember.findFirst({
      where: { tenantId, userId, bookClubId },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async isMember(tenantId: string, bookClubId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.bookClubMember.count({
      where: { tenantId, bookClubId, userId },
    });
    return count > 0;
  }

  async update(_tenantId: string, id: string, updates: StrictPartial<BookClubMember>): Promise<BookClubMember> {
    const data: Record<string, unknown> = {};

    if (updates.role !== undefined) data.role = updates.role;
    if (updates.sessionsAttended !== undefined) data.sessionsAttended = updates.sessionsAttended;
    if (updates.displayName !== undefined) data.displayName = updates.displayName;
    if (updates.readingsCompleted !== undefined) data.readingsCompleted = updates.readingsCompleted;
    if (updates.engagementScore !== undefined) data.engagementScore = updates.engagementScore;
    if (updates.lastActiveAt !== undefined) data.lastActiveAt = updates.lastActiveAt;

    const row = await this.prisma.bookClubMember.update({
      where: { id },
      data,
    });

    return this.mapFromPrisma(row);
  }

  async deactivate(_tenantId: string, id: string): Promise<void> {
    // Prisma model doesn't have isActive — we delete the membership
    await this.prisma.bookClubMember.delete({ where: { id } });
  }

  async recordAttendance(tenantId: string, bookClubId: string, userId: string, _sessionId: string): Promise<void> {
    const member = await this.findByUserAndClub(tenantId, userId, bookClubId);
    if (member) {
      await this.prisma.bookClubMember.update({
        where: { id: member.id },
        data: {
          sessionsAttended: member.sessionsAttended + 1,
          lastActiveAt: new Date(),
        },
      });
    }
  }

  async remove(tenantId: string, bookClubId: string, userId: string): Promise<void> {
    const member = await this.findByUserAndClub(tenantId, userId, bookClubId);
    if (member) {
      await this.prisma.bookClubMember.delete({ where: { id: member.id } });
    }
  }

  private mapFromPrisma(row: Record<string, unknown>): BookClubMember {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      bookClubId: row.bookClubId as string,
      userId: row.userId as string,
      displayName: row.displayName as string,
      userName: row.displayName as string,
      role: row.role as BookClubMember['role'],
      isActive: true,
      readingsCompleted: (row.readingsCompleted as number) ?? 0,
      sessionsAttended: row.sessionsAttended as number,
      engagementScore: (row.engagementScore as number) ?? 0,
      lastActiveAt: row.lastActiveAt as Date | undefined,
    };
  }
}
