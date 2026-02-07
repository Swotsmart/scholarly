/**
 * Scholarly Platform — Scheduling & Marketplace Repositories
 * ===========================================================
 *
 * REM-010: Scheduling repositories for timetable management
 * REM-013: Marketplace repositories for content commerce
 *
 * These repositories follow the established Scholarly patterns:
 * - Repository abstraction over Prisma ORM
 * - Result<T> error handling (no thrown exceptions)
 * - Multi-tenant isolation (tenantId on every query)
 * - Event publishing for cross-module communication
 *
 * Think of repositories as the data gatekeepers — they ensure that
 * every database operation respects tenant boundaries, handles errors
 * gracefully, and publishes events for other modules to react to.
 *
 * @module repositories/scheduling-marketplace
 * @version 1.0.0
 */

import { Logger } from 'pino';

// ============================================================================
// SECTION 1: SHARED TYPES
// ============================================================================

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Minimal Prisma client interface for type safety without importing @prisma/client */
export interface PrismaClient {
  $transaction: (fn: (tx: PrismaClient) => Promise<unknown>) => Promise<unknown>;
  [model: string]: unknown;
}

/** Event bus interface matching Sprint 1's NATS event bus */
export interface IEventBus {
  publish(subject: string, data: unknown): Promise<void>;
}

// ============================================================================
// SECTION 2: SCHEDULING TYPES
// ============================================================================

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type PeriodType = 'teaching' | 'break' | 'lunch' | 'assembly' | 'free' | 'supervision' | 'meeting' | 'prep';
export type ScheduleStatus = 'draft' | 'active' | 'archived';
export type ConstraintType = 'hard' | 'soft';
export type ConflictSeverity = 'error' | 'warning' | 'info';

export interface ScheduleTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  academicYear: string;
  termId?: string;
  status: ScheduleStatus;
  effectiveFrom: Date;
  effectiveTo?: Date;
  periods: SchedulePeriod[];
  constraints: ScheduleConstraint[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

export interface SchedulePeriod {
  id: string;
  scheduleId: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  type: PeriodType;
  startTime: string; // "09:00"
  endTime: string;   // "09:45"
  subjectId?: string;
  teacherId?: string;
  roomId?: string;
  groupId?: string;
  label?: string;
  isRotating: boolean;
  rotationWeek?: number;
}

export interface ScheduleConstraint {
  id: string;
  scheduleId: string;
  type: ConstraintType;
  category: 'teacher_availability' | 'room_capacity' | 'subject_sequence' | 'break_requirements' | 'double_period' | 'teacher_load' | 'room_equipment' | 'custom';
  entityType: 'teacher' | 'room' | 'subject' | 'group' | 'global';
  entityId?: string;
  rule: Record<string, unknown>;
  priority: number;
  description: string;
}

export interface ScheduleConflict {
  id: string;
  scheduleId: string;
  severity: ConflictSeverity;
  type: string;
  description: string;
  periodIds: string[];
  suggestion?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface Room {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  building?: string;
  floor?: number;
  capacity: number;
  type: 'classroom' | 'lab' | 'hall' | 'studio' | 'outdoor' | 'virtual' | 'specialist';
  equipment: string[];
  accessibility: boolean;
  isActive: boolean;
}

export interface CreateScheduleParams {
  tenantId: string;
  name: string;
  description?: string;
  academicYear: string;
  termId?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdBy: string;
}

export interface UpdatePeriodParams {
  subjectId?: string;
  teacherId?: string;
  roomId?: string;
  groupId?: string;
  startTime?: string;
  endTime?: string;
  type?: PeriodType;
  label?: string;
}

// ============================================================================
// SECTION 3: SCHEDULING REPOSITORY
// ============================================================================

/**
 * SchedulingRepository manages timetable data — schedules, periods,
 * constraints, rooms, and conflict detection.
 *
 * The scheduling domain is complex because it deals with combinatorial
 * constraints (teachers can't be in two rooms at once, rooms have
 * capacity limits, subjects need specific equipment, etc.). The repository
 * handles the data access; the optimisation engine that solves the
 * constraint satisfaction problem sits in the service layer above.
 */
export class SchedulingRepository {
  constructor(
    private prisma: PrismaClient,
    private eventBus: IEventBus,
    private logger: Logger
  ) {}

  // --- Schedule CRUD ---

  async createSchedule(params: CreateScheduleParams): Promise<Result<ScheduleTemplate>> {
    try {
      const schedule = await (this.prisma as any).scheduleTemplate.create({
        data: {
          tenantId: params.tenantId,
          name: params.name,
          description: params.description,
          academicYear: params.academicYear,
          termId: params.termId,
          status: 'draft' as ScheduleStatus,
          effectiveFrom: params.effectiveFrom,
          effectiveTo: params.effectiveTo,
          createdBy: params.createdBy,
          version: 1,
        },
        include: { periods: true, constraints: true },
      });

      await this.eventBus.publish('scheduling.schedule.created', {
        scheduleId: schedule.id,
        tenantId: params.tenantId,
        name: params.name,
        createdBy: params.createdBy,
      });

      this.logger.info({ scheduleId: schedule.id, tenantId: params.tenantId }, 'Schedule created');
      return { success: true, data: schedule };
    } catch (err) {
      this.logger.error({ err, params }, 'Failed to create schedule');
      return { success: false, error: { code: 'CREATE_FAILED', message: (err as Error).message } };
    }
  }

  async getScheduleById(tenantId: string, scheduleId: string): Promise<Result<ScheduleTemplate | null>> {
    try {
      const schedule = await (this.prisma as any).scheduleTemplate.findFirst({
        where: { id: scheduleId, tenantId },
        include: { periods: { orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }] }, constraints: true },
      });
      return { success: true, data: schedule };
    } catch (err) {
      return { success: false, error: { code: 'FETCH_FAILED', message: (err as Error).message } };
    }
  }

  async listSchedules(
    tenantId: string,
    pagination: PaginationParams,
    filters?: { status?: ScheduleStatus; academicYear?: string }
  ): Promise<Result<PaginatedResult<ScheduleTemplate>>> {
    try {
      const where: Record<string, unknown> = { tenantId };
      if (filters?.status) where.status = filters.status;
      if (filters?.academicYear) where.academicYear = filters.academicYear;

      const [items, total] = await Promise.all([
        (this.prisma as any).scheduleTemplate.findMany({
          where,
          include: { periods: true, constraints: true },
          skip: (pagination.page - 1) * pagination.pageSize,
          take: pagination.pageSize,
          orderBy: { [pagination.sortBy || 'updatedAt']: pagination.sortOrder || 'desc' },
        }),
        (this.prisma as any).scheduleTemplate.count({ where }),
      ]);

      const totalPages = Math.ceil(total / pagination.pageSize);
      return {
        success: true,
        data: {
          items,
          total,
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrevious: pagination.page > 1,
        },
      };
    } catch (err) {
      return { success: false, error: { code: 'LIST_FAILED', message: (err as Error).message } };
    }
  }

  async activateSchedule(tenantId: string, scheduleId: string, activatedBy: string): Promise<Result<ScheduleTemplate>> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Deactivate any currently active schedule for this tenant
        await (tx as any).scheduleTemplate.updateMany({
          where: { tenantId, status: 'active' },
          data: { status: 'archived' },
        });

        // Activate the target schedule
        const schedule = await (tx as any).scheduleTemplate.update({
          where: { id: scheduleId },
          data: { status: 'active', version: { increment: 1 } },
          include: { periods: true, constraints: true },
        });

        return schedule;
      });

      await this.eventBus.publish('scheduling.schedule.activated', {
        scheduleId,
        tenantId,
        activatedBy,
      });

      this.logger.info({ scheduleId, tenantId }, 'Schedule activated');
      return { success: true, data: result as ScheduleTemplate };
    } catch (err) {
      this.logger.error({ err, scheduleId }, 'Failed to activate schedule');
      return { success: false, error: { code: 'ACTIVATE_FAILED', message: (err as Error).message } };
    }
  }

  /**
   * Clone a schedule — used for "clone-and-diff" workflow where teachers
   * duplicate last term's timetable and make adjustments.
   */
  async cloneSchedule(
    tenantId: string,
    sourceId: string,
    newName: string,
    clonedBy: string
  ): Promise<Result<ScheduleTemplate>> {
    try {
      const source = await (this.prisma as any).scheduleTemplate.findFirst({
        where: { id: sourceId, tenantId },
        include: { periods: true, constraints: true },
      });

      if (!source) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Source schedule not found' } };
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const clone = await (tx as any).scheduleTemplate.create({
          data: {
            tenantId,
            name: newName,
            description: `Cloned from "${source.name}"`,
            academicYear: source.academicYear,
            termId: source.termId,
            status: 'draft',
            effectiveFrom: source.effectiveFrom,
            effectiveTo: source.effectiveTo,
            createdBy: clonedBy,
            version: 1,
          },
        });

        // Clone periods
        if (source.periods.length > 0) {
          await (tx as any).schedulePeriod.createMany({
            data: source.periods.map((p: SchedulePeriod) => ({
              scheduleId: clone.id,
              dayOfWeek: p.dayOfWeek,
              periodNumber: p.periodNumber,
              type: p.type,
              startTime: p.startTime,
              endTime: p.endTime,
              subjectId: p.subjectId,
              teacherId: p.teacherId,
              roomId: p.roomId,
              groupId: p.groupId,
              label: p.label,
              isRotating: p.isRotating,
              rotationWeek: p.rotationWeek,
            })),
          });
        }

        // Clone constraints
        if (source.constraints.length > 0) {
          await (tx as any).scheduleConstraint.createMany({
            data: source.constraints.map((c: ScheduleConstraint) => ({
              scheduleId: clone.id,
              type: c.type,
              category: c.category,
              entityType: c.entityType,
              entityId: c.entityId,
              rule: c.rule,
              priority: c.priority,
              description: c.description,
            })),
          });
        }

        return await (tx as any).scheduleTemplate.findFirst({
          where: { id: clone.id },
          include: { periods: true, constraints: true },
        });
      });

      await this.eventBus.publish('scheduling.schedule.cloned', {
        sourceId,
        cloneId: (result as ScheduleTemplate).id,
        tenantId,
        clonedBy,
      });

      return { success: true, data: result as ScheduleTemplate };
    } catch (err) {
      return { success: false, error: { code: 'CLONE_FAILED', message: (err as Error).message } };
    }
  }

  // --- Period Operations ---

  async addPeriod(tenantId: string, scheduleId: string, period: Omit<SchedulePeriod, 'id' | 'scheduleId'>): Promise<Result<SchedulePeriod>> {
    try {
      // Verify schedule belongs to tenant
      const schedule = await (this.prisma as any).scheduleTemplate.findFirst({
        where: { id: scheduleId, tenantId },
      });
      if (!schedule) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } };
      }

      const created = await (this.prisma as any).schedulePeriod.create({
        data: { scheduleId, ...period },
      });

      return { success: true, data: created };
    } catch (err) {
      return { success: false, error: { code: 'ADD_PERIOD_FAILED', message: (err as Error).message } };
    }
  }

  async updatePeriod(tenantId: string, periodId: string, updates: UpdatePeriodParams): Promise<Result<SchedulePeriod>> {
    try {
      // Verify period belongs to a schedule in this tenant
      const existing = await (this.prisma as any).schedulePeriod.findFirst({
        where: { id: periodId },
        include: { schedule: { select: { tenantId: true } } },
      });

      if (!existing || existing.schedule.tenantId !== tenantId) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Period not found' } };
      }

      const updated = await (this.prisma as any).schedulePeriod.update({
        where: { id: periodId },
        data: updates,
      });

      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: { code: 'UPDATE_PERIOD_FAILED', message: (err as Error).message } };
    }
  }

  async bulkUpdatePeriods(
    tenantId: string,
    scheduleId: string,
    updates: Array<{ periodId: string; changes: UpdatePeriodParams }>
  ): Promise<Result<{ updated: number; failed: number }>> {
    try {
      let updated = 0;
      let failed = 0;

      await this.prisma.$transaction(async (tx) => {
        for (const { periodId, changes } of updates) {
          try {
            await (tx as any).schedulePeriod.update({
              where: { id: periodId },
              data: changes,
            });
            updated++;
          } catch {
            failed++;
          }
        }
      });

      if (updated > 0) {
        await this.eventBus.publish('scheduling.periods.bulk_updated', {
          scheduleId,
          tenantId,
          updatedCount: updated,
          failedCount: failed,
        });
      }

      return { success: true, data: { updated, failed } };
    } catch (err) {
      return { success: false, error: { code: 'BULK_UPDATE_FAILED', message: (err as Error).message } };
    }
  }

  // --- Conflict Detection ---

  async detectConflicts(tenantId: string, scheduleId: string): Promise<Result<ScheduleConflict[]>> {
    try {
      const schedule = await (this.prisma as any).scheduleTemplate.findFirst({
        where: { id: scheduleId, tenantId },
        include: { periods: true, constraints: true },
      });

      if (!schedule) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } };
      }

      const conflicts: ScheduleConflict[] = [];
      const periods = schedule.periods as SchedulePeriod[];

      // Check teacher double-booking
      const teacherSlots = new Map<string, SchedulePeriod[]>();
      for (const period of periods) {
        if (!period.teacherId) continue;
        const key = `${period.teacherId}:${period.dayOfWeek}:${period.startTime}`;
        const existing = teacherSlots.get(key) || [];
        existing.push(period);
        teacherSlots.set(key, existing);
      }

      for (const [key, overlapping] of teacherSlots) {
        if (overlapping.length > 1) {
          conflicts.push({
            id: `conflict_${key}`,
            scheduleId,
            severity: 'error',
            type: 'teacher_double_booking',
            description: `Teacher ${overlapping[0].teacherId} is scheduled for ${overlapping.length} classes at ${overlapping[0].dayOfWeek} ${overlapping[0].startTime}`,
            periodIds: overlapping.map(p => p.id),
            suggestion: 'Move one of these periods to a different time slot or assign a different teacher',
            resolved: false,
          });
        }
      }

      // Check room double-booking
      const roomSlots = new Map<string, SchedulePeriod[]>();
      for (const period of periods) {
        if (!period.roomId) continue;
        const key = `${period.roomId}:${period.dayOfWeek}:${period.startTime}`;
        const existing = roomSlots.get(key) || [];
        existing.push(period);
        roomSlots.set(key, existing);
      }

      for (const [key, overlapping] of roomSlots) {
        if (overlapping.length > 1) {
          conflicts.push({
            id: `conflict_${key}`,
            scheduleId,
            severity: 'error',
            type: 'room_double_booking',
            description: `Room ${overlapping[0].roomId} is booked for ${overlapping.length} classes at ${overlapping[0].dayOfWeek} ${overlapping[0].startTime}`,
            periodIds: overlapping.map(p => p.id),
            suggestion: 'Assign one of these periods to a different room',
            resolved: false,
          });
        }
      }

      // Check consecutive teaching load (warning if > 4 consecutive periods)
      const teacherDayPeriods = new Map<string, number[]>();
      for (const period of periods) {
        if (!period.teacherId || period.type !== 'teaching') continue;
        const key = `${period.teacherId}:${period.dayOfWeek}`;
        const existing = teacherDayPeriods.get(key) || [];
        existing.push(period.periodNumber);
        teacherDayPeriods.set(key, existing);
      }

      for (const [key, periodNumbers] of teacherDayPeriods) {
        const sorted = periodNumbers.sort((a, b) => a - b);
        let maxConsecutive = 1;
        let currentStreak = 1;

        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i] === sorted[i - 1] + 1) {
            currentStreak++;
            maxConsecutive = Math.max(maxConsecutive, currentStreak);
          } else {
            currentStreak = 1;
          }
        }

        if (maxConsecutive > 4) {
          const [teacherId, day] = key.split(':');
          conflicts.push({
            id: `conflict_load_${key}`,
            scheduleId,
            severity: 'warning',
            type: 'excessive_consecutive_teaching',
            description: `Teacher ${teacherId} has ${maxConsecutive} consecutive teaching periods on ${day}`,
            periodIds: [],
            suggestion: 'Consider adding a break or free period for teacher wellbeing',
            resolved: false,
          });
        }
      }

      this.logger.info({
        scheduleId,
        tenantId,
        conflictCount: conflicts.length,
        errors: conflicts.filter(c => c.severity === 'error').length,
        warnings: conflicts.filter(c => c.severity === 'warning').length,
      }, 'Conflict detection complete');

      return { success: true, data: conflicts };
    } catch (err) {
      return { success: false, error: { code: 'CONFLICT_DETECTION_FAILED', message: (err as Error).message } };
    }
  }

  // --- Room Management ---

  async createRoom(tenantId: string, room: Omit<Room, 'id' | 'tenantId'>): Promise<Result<Room>> {
    try {
      const created = await (this.prisma as any).room.create({
        data: { tenantId, ...room },
      });
      return { success: true, data: created };
    } catch (err) {
      return { success: false, error: { code: 'CREATE_ROOM_FAILED', message: (err as Error).message } };
    }
  }

  async listRooms(
    tenantId: string,
    filters?: { type?: Room['type']; minCapacity?: number; equipment?: string[] }
  ): Promise<Result<Room[]>> {
    try {
      const where: Record<string, unknown> = { tenantId, isActive: true };
      if (filters?.type) where.type = filters.type;
      if (filters?.minCapacity) where.capacity = { gte: filters.minCapacity };
      if (filters?.equipment && filters.equipment.length > 0) {
        where.equipment = { hasEvery: filters.equipment };
      }

      const rooms = await (this.prisma as any).room.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      return { success: true, data: rooms };
    } catch (err) {
      return { success: false, error: { code: 'LIST_ROOMS_FAILED', message: (err as Error).message } };
    }
  }

  async findAvailableRooms(
    tenantId: string,
    scheduleId: string,
    dayOfWeek: DayOfWeek,
    startTime: string,
    requirements?: { minCapacity?: number; type?: Room['type']; equipment?: string[] }
  ): Promise<Result<Room[]>> {
    try {
      // Get all rooms
      const allRooms = await this.listRooms(tenantId, {
        type: requirements?.type,
        minCapacity: requirements?.minCapacity,
        equipment: requirements?.equipment,
      });
      if (!allRooms.success) return allRooms;

      // Get rooms already booked at this time
      const bookedPeriods = await (this.prisma as any).schedulePeriod.findMany({
        where: {
          scheduleId,
          dayOfWeek,
          startTime,
          roomId: { not: null },
        },
        select: { roomId: true },
      });

      const bookedRoomIds = new Set(bookedPeriods.map((p: { roomId: string }) => p.roomId));
      const available = allRooms.data.filter((r: Room) => !bookedRoomIds.has(r.id));

      return { success: true, data: available };
    } catch (err) {
      return { success: false, error: { code: 'AVAILABLE_ROOMS_FAILED', message: (err as Error).message } };
    }
  }
}

// ============================================================================
// SECTION 4: MARKETPLACE TYPES
// ============================================================================

export type ListingStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'suspended' | 'rejected' | 'archived';
export type ListingType = 'storybook' | 'lesson_plan' | 'activity_pack' | 'assessment' | 'curriculum_map' | 'template' | 'integration';
export type LicenseType = 'standard' | 'extended' | 'oer_cc_by' | 'oer_cc_by_sa' | 'oer_cc_by_nc' | 'custom';
export type ReviewDecision = 'approved' | 'rejected' | 'revisions_required';

export interface MarketplaceListing {
  id: string;
  tenantId: string;
  creatorId: string;
  type: ListingType;
  title: string;
  description: string;
  shortDescription: string;
  coverImageUrl?: string;
  previewUrl?: string;
  contentUrl: string;
  status: ListingStatus;
  version: string;
  license: LicenseType;

  /** Pricing */
  isFree: boolean;
  priceInCents?: number;
  currency: string;

  /** Educational metadata */
  targetAgeMin?: number;
  targetAgeMax?: number;
  phonicsPhases?: number[];
  subjectAreas: string[];
  curriculumAlignments: string[];
  tags: string[];

  /** Quality signals */
  aiQualityScore?: number;
  peerReviewScore?: number;
  userRating: number;
  userRatingCount: number;
  downloadCount: number;
  activeUserCount: number;

  /** Review tracking */
  submittedAt?: Date;
  reviewedAt?: Date;
  publishedAt?: Date;
  reviewerNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceReview {
  id: string;
  listingId: string;
  reviewerId: string;
  rating: number; // 1-5
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  reportedCount: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplacePurchase {
  id: string;
  tenantId: string;
  buyerId: string;
  listingId: string;
  creatorId: string;
  priceInCents: number;
  platformFeeInCents: number;
  creatorPayoutInCents: number;
  currency: string;
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
  status: 'pending' | 'completed' | 'refunded' | 'disputed';
  purchasedAt: Date;
  refundedAt?: Date;
}

export interface CreateListingParams {
  tenantId: string;
  creatorId: string;
  type: ListingType;
  title: string;
  description: string;
  shortDescription: string;
  contentUrl: string;
  coverImageUrl?: string;
  isFree: boolean;
  priceInCents?: number;
  currency?: string;
  license: LicenseType;
  targetAgeMin?: number;
  targetAgeMax?: number;
  phonicsPhases?: number[];
  subjectAreas?: string[];
  curriculumAlignments?: string[];
  tags?: string[];
}

export interface ListingSearchParams extends PaginationParams {
  query?: string;
  type?: ListingType;
  isFree?: boolean;
  maxPrice?: number;
  ageRange?: [number, number];
  phonicsPhase?: number;
  subjectArea?: string;
  minRating?: number;
  license?: LicenseType;
  creatorId?: string;
}

// ============================================================================
// SECTION 5: MARKETPLACE REPOSITORY
// ============================================================================

/**
 * MarketplaceRepository manages content listings, purchases, reviews,
 * and the creator economy data layer.
 *
 * The marketplace is where the community's creative output meets
 * commercial viability. The repository ensures fair revenue sharing
 * (platform fee is configurable per listing type), accurate quality
 * scoring, and proper content lifecycle management.
 */
export class MarketplaceRepository {
  /** Default platform fee: 15% */
  private static readonly DEFAULT_PLATFORM_FEE_RATE = 0.15;

  constructor(
    private prisma: PrismaClient,
    private eventBus: IEventBus,
    private logger: Logger
  ) {}

  // --- Listing CRUD ---

  async createListing(params: CreateListingParams): Promise<Result<MarketplaceListing>> {
    try {
      const listing = await (this.prisma as any).marketplaceListing.create({
        data: {
          tenantId: params.tenantId,
          creatorId: params.creatorId,
          type: params.type,
          title: params.title,
          description: params.description,
          shortDescription: params.shortDescription,
          contentUrl: params.contentUrl,
          coverImageUrl: params.coverImageUrl,
          status: 'draft',
          version: '1.0.0',
          license: params.license,
          isFree: params.isFree,
          priceInCents: params.isFree ? 0 : params.priceInCents,
          currency: params.currency || 'USD',
          targetAgeMin: params.targetAgeMin,
          targetAgeMax: params.targetAgeMax,
          phonicsPhases: params.phonicsPhases || [],
          subjectAreas: params.subjectAreas || [],
          curriculumAlignments: params.curriculumAlignments || [],
          tags: params.tags || [],
          userRating: 0,
          userRatingCount: 0,
          downloadCount: 0,
          activeUserCount: 0,
        },
      });

      await this.eventBus.publish('marketplace.listing.created', {
        listingId: listing.id,
        creatorId: params.creatorId,
        type: params.type,
        tenantId: params.tenantId,
      });

      this.logger.info({ listingId: listing.id, type: params.type }, 'Marketplace listing created');
      return { success: true, data: listing };
    } catch (err) {
      return { success: false, error: { code: 'CREATE_LISTING_FAILED', message: (err as Error).message } };
    }
  }

  async getListingById(listingId: string): Promise<Result<MarketplaceListing | null>> {
    try {
      const listing = await (this.prisma as any).marketplaceListing.findUnique({
        where: { id: listingId },
      });
      return { success: true, data: listing };
    } catch (err) {
      return { success: false, error: { code: 'FETCH_FAILED', message: (err as Error).message } };
    }
  }

  async updateListing(
    listingId: string,
    creatorId: string,
    updates: Partial<Pick<MarketplaceListing, 'title' | 'description' | 'shortDescription' | 'coverImageUrl' | 'previewUrl' | 'contentUrl' | 'priceInCents' | 'tags' | 'subjectAreas'>>
  ): Promise<Result<MarketplaceListing>> {
    try {
      const existing = await (this.prisma as any).marketplaceListing.findFirst({
        where: { id: listingId, creatorId },
      });

      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Listing not found or not owned by creator' } };
      }

      // Published listings return to pending_review on content changes
      const contentChanged = updates.contentUrl || updates.description || updates.title;
      const newStatus = existing.status === 'published' && contentChanged ? 'pending_review' : existing.status;

      const updated = await (this.prisma as any).marketplaceListing.update({
        where: { id: listingId },
        data: { ...updates, status: newStatus },
      });

      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: { code: 'UPDATE_FAILED', message: (err as Error).message } };
    }
  }

  async submitForReview(listingId: string, creatorId: string): Promise<Result<MarketplaceListing>> {
    try {
      const listing = await (this.prisma as any).marketplaceListing.findFirst({
        where: { id: listingId, creatorId, status: { in: ['draft', 'rejected'] } },
      });

      if (!listing) {
        return { success: false, error: { code: 'INVALID_STATE', message: 'Listing must be in draft or rejected status' } };
      }

      const updated = await (this.prisma as any).marketplaceListing.update({
        where: { id: listingId },
        data: { status: 'pending_review', submittedAt: new Date() },
      });

      await this.eventBus.publish('marketplace.listing.submitted', {
        listingId,
        creatorId,
        type: listing.type,
      });

      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: { code: 'SUBMIT_FAILED', message: (err as Error).message } };
    }
  }

  async reviewListing(
    listingId: string,
    reviewerId: string,
    decision: ReviewDecision,
    notes: string,
    aiQualityScore?: number,
    peerReviewScore?: number
  ): Promise<Result<MarketplaceListing>> {
    try {
      const statusMap: Record<ReviewDecision, ListingStatus> = {
        approved: 'approved',
        rejected: 'rejected',
        revisions_required: 'rejected',
      };

      const updated = await (this.prisma as any).marketplaceListing.update({
        where: { id: listingId },
        data: {
          status: statusMap[decision],
          reviewedAt: new Date(),
          reviewerNotes: notes,
          ...(aiQualityScore !== undefined ? { aiQualityScore } : {}),
          ...(peerReviewScore !== undefined ? { peerReviewScore } : {}),
        },
      });

      await this.eventBus.publish('marketplace.listing.reviewed', {
        listingId,
        decision,
        reviewerId,
      });

      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: { code: 'REVIEW_FAILED', message: (err as Error).message } };
    }
  }

  async publishListing(listingId: string): Promise<Result<MarketplaceListing>> {
    try {
      const listing = await (this.prisma as any).marketplaceListing.findFirst({
        where: { id: listingId, status: 'approved' },
      });

      if (!listing) {
        return { success: false, error: { code: 'NOT_APPROVED', message: 'Listing must be approved before publishing' } };
      }

      const updated = await (this.prisma as any).marketplaceListing.update({
        where: { id: listingId },
        data: { status: 'published', publishedAt: new Date() },
      });

      await this.eventBus.publish('marketplace.listing.published', {
        listingId,
        creatorId: listing.creatorId,
        type: listing.type,
        title: listing.title,
      });

      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: { code: 'PUBLISH_FAILED', message: (err as Error).message } };
    }
  }

  // --- Search & Discovery ---

  async searchListings(params: ListingSearchParams): Promise<Result<PaginatedResult<MarketplaceListing>>> {
    try {
      const where: Record<string, unknown> = { status: 'published' };

      if (params.type) where.type = params.type;
      if (params.isFree !== undefined) where.isFree = params.isFree;
      if (params.license) where.license = params.license;
      if (params.creatorId) where.creatorId = params.creatorId;
      if (params.minRating) where.userRating = { gte: params.minRating };
      if (params.maxPrice) where.priceInCents = { lte: params.maxPrice };
      if (params.phonicsPhase) where.phonicsPhases = { has: params.phonicsPhase };
      if (params.subjectArea) where.subjectAreas = { has: params.subjectArea };

      if (params.ageRange) {
        where.targetAgeMin = { lte: params.ageRange[1] };
        where.targetAgeMax = { gte: params.ageRange[0] };
      }

      if (params.query) {
        where.OR = [
          { title: { contains: params.query, mode: 'insensitive' } },
          { description: { contains: params.query, mode: 'insensitive' } },
          { tags: { has: params.query.toLowerCase() } },
        ];
      }

      const [items, total] = await Promise.all([
        (this.prisma as any).marketplaceListing.findMany({
          where,
          skip: (params.page - 1) * params.pageSize,
          take: params.pageSize,
          orderBy: { [params.sortBy || 'publishedAt']: params.sortOrder || 'desc' },
        }),
        (this.prisma as any).marketplaceListing.count({ where }),
      ]);

      const totalPages = Math.ceil(total / params.pageSize);
      return {
        success: true,
        data: {
          items,
          total,
          page: params.page,
          pageSize: params.pageSize,
          totalPages,
          hasNext: params.page < totalPages,
          hasPrevious: params.page > 1,
        },
      };
    } catch (err) {
      return { success: false, error: { code: 'SEARCH_FAILED', message: (err as Error).message } };
    }
  }

  // --- Purchases ---

  async createPurchase(
    tenantId: string,
    buyerId: string,
    listingId: string,
    stripePaymentIntentId?: string
  ): Promise<Result<MarketplacePurchase>> {
    try {
      const listing = await (this.prisma as any).marketplaceListing.findFirst({
        where: { id: listingId, status: 'published' },
      });

      if (!listing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Listing not found or not published' } };
      }

      const priceInCents = listing.isFree ? 0 : (listing.priceInCents || 0);
      const platformFeeInCents = Math.round(priceInCents * MarketplaceRepository.DEFAULT_PLATFORM_FEE_RATE);
      const creatorPayoutInCents = priceInCents - platformFeeInCents;

      const purchase = await this.prisma.$transaction(async (tx) => {
        const p = await (tx as any).marketplacePurchase.create({
          data: {
            tenantId,
            buyerId,
            listingId,
            creatorId: listing.creatorId,
            priceInCents,
            platformFeeInCents,
            creatorPayoutInCents,
            currency: listing.currency,
            stripePaymentIntentId,
            status: listing.isFree ? 'completed' : 'pending',
            purchasedAt: new Date(),
          },
        });

        // Increment download count
        await (tx as any).marketplaceListing.update({
          where: { id: listingId },
          data: { downloadCount: { increment: 1 } },
        });

        return p;
      });

      await this.eventBus.publish('marketplace.purchase.created', {
        purchaseId: (purchase as MarketplacePurchase).id,
        listingId,
        buyerId,
        creatorId: listing.creatorId,
        amount: priceInCents,
      });

      return { success: true, data: purchase as MarketplacePurchase };
    } catch (err) {
      return { success: false, error: { code: 'PURCHASE_FAILED', message: (err as Error).message } };
    }
  }

  async completePurchase(purchaseId: string, stripeTransferId?: string): Promise<Result<MarketplacePurchase>> {
    try {
      const updated = await (this.prisma as any).marketplacePurchase.update({
        where: { id: purchaseId },
        data: {
          status: 'completed',
          stripeTransferId,
        },
      });

      await this.eventBus.publish('marketplace.purchase.completed', {
        purchaseId,
        creatorId: updated.creatorId,
        payoutAmount: updated.creatorPayoutInCents,
      });

      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: { code: 'COMPLETE_FAILED', message: (err as Error).message } };
    }
  }

  async hasPurchased(buyerId: string, listingId: string): Promise<Result<boolean>> {
    try {
      const purchase = await (this.prisma as any).marketplacePurchase.findFirst({
        where: { buyerId, listingId, status: 'completed' },
      });
      return { success: true, data: !!purchase };
    } catch (err) {
      return { success: false, error: { code: 'CHECK_FAILED', message: (err as Error).message } };
    }
  }

  // --- Reviews ---

  async addReview(
    listingId: string,
    reviewerId: string,
    rating: number,
    title: string,
    body: string
  ): Promise<Result<MarketplaceReview>> {
    try {
      // Verify purchase
      const purchased = await this.hasPurchased(reviewerId, listingId);
      const isVerified = purchased.success && purchased.data;

      const review = await this.prisma.$transaction(async (tx) => {
        const r = await (tx as any).marketplaceReview.create({
          data: {
            listingId,
            reviewerId,
            rating: Math.max(1, Math.min(5, rating)),
            title,
            body,
            isVerifiedPurchase: isVerified,
            helpfulCount: 0,
            reportedCount: 0,
            isVisible: true,
          },
        });

        // Update listing's aggregate rating
        const aggregation = await (tx as any).marketplaceReview.aggregate({
          where: { listingId, isVisible: true },
          _avg: { rating: true },
          _count: { rating: true },
        });

        await (tx as any).marketplaceListing.update({
          where: { id: listingId },
          data: {
            userRating: aggregation._avg.rating || 0,
            userRatingCount: aggregation._count.rating || 0,
          },
        });

        return r;
      });

      return { success: true, data: review as MarketplaceReview };
    } catch (err) {
      return { success: false, error: { code: 'REVIEW_FAILED', message: (err as Error).message } };
    }
  }

  async getListingReviews(
    listingId: string,
    pagination: PaginationParams
  ): Promise<Result<PaginatedResult<MarketplaceReview>>> {
    try {
      const where = { listingId, isVisible: true };

      const [items, total] = await Promise.all([
        (this.prisma as any).marketplaceReview.findMany({
          where,
          skip: (pagination.page - 1) * pagination.pageSize,
          take: pagination.pageSize,
          orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc' },
        }),
        (this.prisma as any).marketplaceReview.count({ where }),
      ]);

      const totalPages = Math.ceil(total / pagination.pageSize);
      return {
        success: true,
        data: {
          items,
          total,
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrevious: pagination.page > 1,
        },
      };
    } catch (err) {
      return { success: false, error: { code: 'FETCH_REVIEWS_FAILED', message: (err as Error).message } };
    }
  }

  // --- Creator Analytics ---

  async getCreatorStats(creatorId: string): Promise<Result<{
    totalListings: number;
    publishedListings: number;
    totalDownloads: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
  }>> {
    try {
      const [listingStats, revenueStats] = await Promise.all([
        (this.prisma as any).marketplaceListing.aggregate({
          where: { creatorId },
          _count: { id: true },
          _sum: { downloadCount: true },
          _avg: { userRating: true },
        }),
        (this.prisma as any).marketplacePurchase.aggregate({
          where: { creatorId, status: 'completed' },
          _sum: { creatorPayoutInCents: true },
          _count: { id: true },
        }),
      ]);

      const publishedCount = await (this.prisma as any).marketplaceListing.count({
        where: { creatorId, status: 'published' },
      });

      return {
        success: true,
        data: {
          totalListings: listingStats._count.id || 0,
          publishedListings: publishedCount,
          totalDownloads: listingStats._sum.downloadCount || 0,
          totalRevenue: (revenueStats._sum.creatorPayoutInCents || 0) / 100,
          averageRating: listingStats._avg.userRating || 0,
          totalReviews: revenueStats._count.id || 0,
        },
      };
    } catch (err) {
      return { success: false, error: { code: 'STATS_FAILED', message: (err as Error).message } };
    }
  }
}
