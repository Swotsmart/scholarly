/**
 * Prisma-based Booking Repository Implementation
 */

import { PrismaClient } from '@prisma/client';
import { SessionType } from '@scholarly/shared/types/scholarly-types';
import { Booking, BookingPricing, BookingRepository } from '../services/tutor-booking.service';

export class PrismaBookingRepository implements BookingRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(tenantId: string, id: string): Promise<Booking | null> {
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
      include: {
        tutor: true,
        bookedByUser: true
      }
    });

    if (!booking) return null;
    return this.mapToBooking(booking);
  }

  async findByUser(tenantId: string, userId: string, status?: string): Promise<Booking[]> {
    const bookings = await this.prisma.booking.findMany({
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

  async save(tenantId: string, booking: Booking): Promise<Booking> {
    const created = await this.prisma.booking.create({
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
        subjectName: booking.subjectName || '',
        topicsNeedingHelp: booking.topicsNeedingHelp,
        learnerNotes: booking.learnerNotes,
        isGroupSession: booking.isGroupSession,
        openToOthers: booking.openToOthers,
        maxGroupSize: booking.maxGroupSize,
        pricing: booking.pricing as any,
        status: booking.status
      },
      include: {
        tutor: true,
        bookedByUser: true
      }
    });

    return this.mapToBooking(created);
  }

  async update(tenantId: string, id: string, updates: Partial<Booking>): Promise<Booking> {
    const updateData: any = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.scheduledStart) updateData.scheduledStart = updates.scheduledStart;
    if (updates.scheduledEnd) updateData.scheduledEnd = updates.scheduledEnd;
    if (updates.learnerNotes !== undefined) updateData.learnerNotes = updates.learnerNotes;
    if (updates.pricing) updateData.pricing = updates.pricing;

    const updated = await this.prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        tutor: true,
        bookedByUser: true
      }
    });

    return this.mapToBooking(updated);
  }

  private mapToBooking(record: any): Booking {
    const pricing = record.pricing as BookingPricing;

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
      subjectName: record.subjectName,
      topicsNeedingHelp: record.topicsNeedingHelp || [],
      learnerNotes: record.learnerNotes,
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
        tutorEarnings: 51
      },
      status: record.status,
      createdAt: record.createdAt
    };
  }
}
