/**
 * Bookings Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { ApiError } from '../middleware/error-handler';

export const bookingsRouter: Router = Router();

// Get bookings for current user
bookingsRouter.get('/', async (req, res) => {
  const { tenantId, user } = req;
  const { status, role = 'any', page = '1', pageSize = '20' } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const where: Record<string, unknown> = { tenantId };

  // Filter by role
  if (role === 'tutor') {
    where.tutor = { userId: user?.id };
  } else if (role === 'booker') {
    where.bookedByUserId = user?.id;
  } else if (role === 'learner') {
    where.learnerIds = { has: user?.id };
  } else {
    where.OR = [
      { tutor: { userId: user?.id } },
      { bookedByUserId: user?.id },
      { learnerIds: { has: user?.id } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take,
      include: {
        tutor: {
          include: {
            user: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
        },
        bookedByUser: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        session: {
          select: { id: true, status: true },
        },
      },
      orderBy: { scheduledStart: 'desc' },
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({
    bookings,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    },
  });
});

// Get upcoming bookings
bookingsRouter.get('/upcoming', async (req, res) => {
  const { tenantId, user } = req;
  const { limit = '5' } = req.query;

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      OR: [
        { tutor: { userId: user?.id } },
        { bookedByUserId: user?.id },
        { learnerIds: { has: user?.id } },
      ],
      scheduledStart: { gte: new Date() },
      status: { in: ['pending', 'confirmed'] },
    },
    take: parseInt(limit as string),
    include: {
      tutor: {
        include: {
          user: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      },
      session: true,
    },
    orderBy: { scheduledStart: 'asc' },
  });

  res.json({ bookings });
});

// Get booking by ID
bookingsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req;

  const booking = await prisma.booking.findFirst({
    where: { id, tenantId },
    include: {
      tutor: {
        include: {
          user: {
            select: { id: true, displayName: true, avatarUrl: true, email: true },
          },
          subjects: true,
        },
      },
      bookedByUser: {
        select: { id: true, displayName: true, avatarUrl: true, email: true },
      },
      session: true,
    },
  });

  if (!booking) {
    throw ApiError.notFound('Booking', id);
  }

  res.json({ booking });
});

// Create booking
const createBookingSchema = z.object({
  tutorId: z.string(),
  learnerIds: z.array(z.string()).min(1),
  scheduledStart: z.string().datetime(),
  duration: z.number().min(30).max(180),
  sessionType: z.string(),
  subjectId: z.string(),
  subjectName: z.string(),
  topicsNeedingHelp: z.array(z.string()).optional(),
  curriculumCodes: z.array(z.string()).optional(),
  learnerNotes: z.string().optional(),
  openToOthers: z.boolean().optional(),
  maxGroupSize: z.number().min(1).max(10).optional(),
});

bookingsRouter.post('/', async (req, res) => {
  const { tenantId, user } = req;
  const data = createBookingSchema.parse(req.body);

  // Get tutor profile
  const tutorProfile = await prisma.tutorProfile.findFirst({
    where: {
      OR: [{ id: data.tutorId }, { userId: data.tutorId }],
      user: { tenantId },
    },
    include: {
      user: true,
    },
  });

  if (!tutorProfile) {
    throw ApiError.notFound('Tutor', data.tutorId);
  }

  // Check availability
  const scheduledStart = new Date(data.scheduledStart);
  const scheduledEnd = new Date(scheduledStart.getTime() + data.duration * 60000);

  const conflicting = await prisma.booking.findFirst({
    where: {
      tutorId: tutorProfile.id,
      status: { in: ['pending', 'confirmed'] },
      OR: [
        {
          scheduledStart: { lte: scheduledStart },
          scheduledEnd: { gt: scheduledStart },
        },
        {
          scheduledStart: { lt: scheduledEnd },
          scheduledEnd: { gte: scheduledEnd },
        },
      ],
    },
  });

  if (conflicting) {
    throw ApiError.conflict('Tutor is not available at the requested time');
  }

  // Calculate pricing
  const pricing = tutorProfile.pricing as {
    hourlyRate1to1: number;
    hourlyRateGroup: number;
    commissionRate: number;
    currency: string;
  };

  const hours = data.duration / 60;
  const baseRate = data.learnerIds.length === 1 ? pricing.hourlyRate1to1 : pricing.hourlyRateGroup;
  const subtotal = baseRate * hours;
  const groupDiscount = data.learnerIds.length > 1 ? subtotal * 0.1 * (data.learnerIds.length - 1) : 0;
  const discounted = subtotal - groupDiscount;
  const platformFee = discounted * pricing.commissionRate;
  const tutorEarnings = discounted - platformFee;

  const bookingPricing = {
    baseRate,
    duration: data.duration,
    groupDiscount,
    subtotal: discounted,
    platformFee,
    total: discounted,
    currency: pricing.currency,
    tutorEarnings,
    tokenRewards: Math.round(discounted * 0.01),
  };

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      tenantId,
      tutorId: tutorProfile.id,
      bookedByUserId: user!.id,
      learnerIds: data.learnerIds,
      scheduledStart,
      scheduledEnd,
      timezone: 'Australia/Sydney',
      sessionType: data.sessionType,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      topicsNeedingHelp: data.topicsNeedingHelp || [],
      curriculumCodes: data.curriculumCodes || [],
      learnerNotes: data.learnerNotes,
      isGroupSession: data.learnerIds.length > 1,
      openToOthers: data.openToOthers || false,
      maxGroupSize: data.maxGroupSize || 1,
      pricing: bookingPricing,
      status: 'pending',
      paymentStatus: 'pending',
    },
    include: {
      tutor: {
        include: {
          user: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      },
    },
  });

  res.status(201).json({ booking });
});

// Confirm booking (tutor action)
bookingsRouter.post('/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;

  const booking = await prisma.booking.findFirst({
    where: { id, tenantId },
    include: { tutor: true },
  });

  if (!booking) {
    throw ApiError.notFound('Booking', id);
  }

  if (booking.tutor.userId !== user?.id && !user?.roles.includes('platform_admin')) {
    throw ApiError.forbidden('Only the tutor can confirm this booking');
  }

  if (booking.status !== 'pending') {
    throw ApiError.badRequest('Booking cannot be confirmed in current status');
  }

  // Update booking and create session
  const [updated] = await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data: { status: 'confirmed' },
    }),
    prisma.tutoringSession.create({
      data: {
        tenantId,
        bookingId: id,
        tutorProfileId: booking.tutorId,
        tutorUserId: booking.tutor.userId,
        scheduledStart: booking.scheduledStart,
        scheduledEnd: booking.scheduledEnd,
        timezone: booking.timezone,
        sessionType: booking.sessionType,
        isGroupSession: booking.isGroupSession,
        subjectId: booking.subjectId,
        subjectName: booking.subjectName,
        topicsFocus: booking.topicsNeedingHelp,
        curriculumCodes: booking.curriculumCodes,
        status: 'confirmed',
        billingStatus: 'pending',
        amountCharged: (booking.pricing as Record<string, number>).total,
        tutorEarnings: (booking.pricing as Record<string, number>).tutorEarnings,
        platformCommission: (booking.pricing as Record<string, number>).platformFee,
      },
    }),
  ]);

  res.json({ booking: updated });
});

// Cancel booking
bookingsRouter.post('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;
  const { reason } = req.body;

  const booking = await prisma.booking.findFirst({
    where: { id, tenantId },
    include: { tutor: true },
  });

  if (!booking) {
    throw ApiError.notFound('Booking', id);
  }

  // Check permissions
  const isTutor = booking.tutor.userId === user?.id;
  const isBooker = booking.bookedByUserId === user?.id;
  const isAdmin = user?.roles.includes('platform_admin');

  if (!isTutor && !isBooker && !isAdmin) {
    throw ApiError.forbidden();
  }

  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw ApiError.badRequest('Booking cannot be cancelled in current status');
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: 'cancelled',
      cancellationReason: reason,
      cancelledBy: user?.id,
      cancelledAt: new Date(),
    },
  });

  res.json({ booking: updated });
});
