/**
 * Prisma-based Booking Repository Implementation
 *
 * Note: The TutorBookingService now uses Prisma directly with typed relations.
 * This repository is maintained for backwards compatibility and testing purposes.
 */

import { prisma, Prisma } from '@scholarly/database';
import { BookingPricing, SessionType } from '../services/tutor-booking.service';

// Legacy Booking type for backwards compatibility
export interface LegacyBooking {
  id: string;
  tenantId: string;
  tutorId: string;
  learnerIds: string[];
  bookedByUserId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  sessionType: SessionType;
  subjectId: string;
  subjectName?: string;
  topicsNeedingHelp: string[];
  learnerNotes?: string;
  isGroupSession: boolean;
  openToOthers: boolean;
  maxGroupSize: number;
  pricing: BookingPricing;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface LegacyBookingRepository {
  findById(tenantId: string, id: string): Promise<LegacyBooking | null>;
  findByUser(tenantId: string, userId: string, status?: string): Promise<LegacyBooking[]>;
  save(tenantId: string, booking: LegacyBooking): Promise<LegacyBooking>;
  update(tenantId: string, id: string, updates: Partial<LegacyBooking>): Promise<LegacyBooking>;
}

export class PrismaBookingRepository implements LegacyBookingRepository {
  async findById(tenantId: string, id: string): Promise<LegacyBooking | null> {
    const booking = await prisma.booking.findFirst({
      where: { id, tenantId },
      include: {
        tutor: true,
        bookedByUser: true
      }
    });

    if (!booking) return null;
    return this.mapToBooking(booking);
  }

  async findByUser(tenantId: string, userId: string, status?: string): Promise<LegacyBooking[]> {
    const bookings = await prisma.booking.findMany({
      where: {
        tenantId,
        OR: [
          { bookedByUserId: userId },
          { tutor: { userId: userId } },
          { learnerIds: { has: userId } }
        ],
        ...(status && { status: { in: status.split(',') } })
      },
      include: {
        tutor: true,
        bookedByUser: true
      },
      orderBy: { scheduledStart: 'desc' }
    });

    return bookings.map((b) => this.mapToBooking(b));
  }

  async save(tenantId: string, booking: LegacyBooking): Promise<LegacyBooking> {
    const created = await prisma.booking.create({
      data: {
        id: booking.id,
        tenantId,
        tutorId: booking.tutorId,
        bookedByUserId: booking.bookedByUserId,
        learnerIds: booking.learnerIds,
        scheduledStart: booking.scheduledStart,
        scheduledEnd: booking.scheduledEnd,
        sessionType: booking.sessionType,
        subjectId: booking.subjectId,
        topicsNeedingHelp: booking.topicsNeedingHelp,
        learnerNotes: booking.learnerNotes,
        isGroupSession: booking.isGroupSession,
        openToOthers: booking.openToOthers,
        maxGroupSize: booking.maxGroupSize,
        pricing: booking.pricing as unknown as Prisma.InputJsonValue,
        status: booking.status,
      },
      include: {
        tutor: true,
        bookedByUser: true
      }
    });

    return this.mapToBooking(created);
  }

  async update(tenantId: string, id: string, updates: Partial<LegacyBooking>): Promise<LegacyBooking> {
    const updateData: Prisma.BookingUpdateInput = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.scheduledStart) updateData.scheduledStart = updates.scheduledStart;
    if (updates.scheduledEnd) updateData.scheduledEnd = updates.scheduledEnd;
    if (updates.learnerNotes !== undefined) updateData.learnerNotes = updates.learnerNotes;
    if (updates.pricing) updateData.pricing = updates.pricing as unknown as Prisma.InputJsonValue;

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        tutor: true,
        bookedByUser: true
      }
    });

    return this.mapToBooking(updated);
  }

  private mapToBooking(record: Prisma.BookingGetPayload<{
    include: { tutor: true; bookedByUser: true };
  }>): LegacyBooking {
    const pricing = record.pricing as unknown as BookingPricing;

    return {
      id: record.id,
      tenantId: record.tenantId,
      tutorId: record.tutorId,
      learnerIds: record.learnerIds || [],
      bookedByUserId: record.bookedByUserId,
      scheduledStart: record.scheduledStart,
      scheduledEnd: record.scheduledEnd,
      sessionType: record.sessionType as SessionType,
      subjectId: record.subjectId,
      topicsNeedingHelp: record.topicsNeedingHelp || [],
      learnerNotes: record.learnerNotes || undefined,
      isGroupSession: record.isGroupSession,
      openToOthers: record.openToOthers,
      maxGroupSize: record.maxGroupSize,
      pricing: pricing || {
        baseRate: 60,
        duration: 60,
        groupDiscount: 0,
        subtotal: 60,
        platformFee: 9,
        total: 60,
        currency: 'AUD',
        tutorEarnings: 51,
      },
      status: record.status as LegacyBooking['status'],
      createdAt: record.createdAt,
    };
  }
}
