/**
 * Sessions Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { ApiError } from '../middleware/error-handler';

export const sessionsRouter: Router = Router();

// Get sessions
sessionsRouter.get('/', async (req, res) => {
  const { tenantId, user } = req;
  const { status, upcoming, page = '1', pageSize = '20' } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const where: Record<string, unknown> = {
    tenantId,
    OR: [
      { tutorUserId: user?.id },
      { participants: { some: { learnerProfile: { userId: user?.id } } } },
    ],
  };

  if (status) {
    where.status = status;
  }

  if (upcoming === 'true') {
    where.scheduledStart = { gte: new Date() };
  }

  const [sessions, total] = await Promise.all([
    prisma.tutoringSession.findMany({
      where,
      skip,
      take,
      include: {
        tutorUser: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        participants: {
          include: {
            learnerProfile: {
              include: {
                user: {
                  select: { id: true, displayName: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
      orderBy: { scheduledStart: 'desc' },
    }),
    prisma.tutoringSession.count({ where }),
  ]);

  res.json({
    sessions,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    },
  });
});

// Get session by ID
sessionsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req;

  const session = await prisma.tutoringSession.findFirst({
    where: { id, tenantId },
    include: {
      booking: true,
      tutorProfile: {
        include: {
          user: {
            select: { id: true, displayName: true, avatarUrl: true, email: true },
          },
        },
      },
      participants: {
        include: {
          learnerProfile: {
            include: {
              user: {
                select: { id: true, displayName: true, avatarUrl: true },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    throw ApiError.notFound('Session', id);
  }

  res.json({ session });
});

// Start session
sessionsRouter.post('/:id/start', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;

  const session = await prisma.tutoringSession.findFirst({
    where: { id, tenantId },
  });

  if (!session) {
    throw ApiError.notFound('Session', id);
  }

  if (session.tutorUserId !== user?.id) {
    throw ApiError.forbidden('Only the tutor can start the session');
  }

  if (session.status !== 'confirmed') {
    throw ApiError.badRequest('Session must be confirmed to start');
  }

  const updated = await prisma.tutoringSession.update({
    where: { id },
    data: {
      status: 'in_progress',
      actualStart: new Date(),
    },
  });

  res.json({ session: updated });
});

// Complete session
const completeSessionSchema = z.object({
  sessionNotes: z.string().optional(),
  homeworkAssigned: z.string().optional(),
  resourcesShared: z.array(z.string()).optional(),
});

sessionsRouter.post('/:id/complete', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;
  const data = completeSessionSchema.parse(req.body);

  const session = await prisma.tutoringSession.findFirst({
    where: { id, tenantId },
  });

  if (!session) {
    throw ApiError.notFound('Session', id);
  }

  if (session.tutorUserId !== user?.id) {
    throw ApiError.forbidden('Only the tutor can complete the session');
  }

  if (session.status !== 'in_progress') {
    throw ApiError.badRequest('Session must be in progress to complete');
  }

  const updated = await prisma.tutoringSession.update({
    where: { id },
    data: {
      status: 'completed',
      actualEnd: new Date(),
      sessionNotes: data.sessionNotes,
      homeworkAssigned: data.homeworkAssigned,
      resourcesShared: data.resourcesShared || [],
      billingStatus: 'charged',
    },
  });

  // Update booking status
  await prisma.booking.update({
    where: { id: session.bookingId },
    data: { status: 'completed' },
  });

  res.json({
    session: updated,
    tutorEarnings: updated.tutorEarnings,
    tokenRewards: updated.tokenRewards,
  });
});

// Submit feedback
const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  topicsWellCovered: z.array(z.string()).optional(),
  topicsNeedMoreWork: z.array(z.string()).optional(),
  wouldRecommend: z.boolean().optional(),
  privateNoteToTutor: z.string().optional(),
});

sessionsRouter.post('/:id/feedback', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;
  const data = feedbackSchema.parse(req.body);

  const session = await prisma.tutoringSession.findFirst({
    where: { id, tenantId },
  });

  if (!session) {
    throw ApiError.notFound('Session', id);
  }

  if (session.status !== 'completed') {
    throw ApiError.badRequest('Can only submit feedback for completed sessions');
  }

  const feedback = {
    ...data,
    submittedAt: new Date(),
  };

  // Determine which feedback field to update
  const isTutor = session.tutorUserId === user?.id;

  const updateData: Record<string, unknown> = {};
  if (isTutor) {
    updateData.tutorFeedback = feedback;
  } else {
    updateData.learnerFeedback = feedback;

    // Update tutor metrics
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { id: session.tutorProfileId },
    });

    if (tutorProfile) {
      const metrics = tutorProfile.metrics as Record<string, number>;
      const newRatingCount = (metrics.ratingCount || 0) + 1;
      const newAverageRating =
        ((metrics.averageRating || 0) * (metrics.ratingCount || 0) + data.rating) / newRatingCount;

      await prisma.tutorProfile.update({
        where: { id: session.tutorProfileId },
        data: {
          metrics: {
            ...metrics,
            ratingCount: newRatingCount,
            averageRating: Math.round(newAverageRating * 10) / 10,
          },
        },
      });
    }
  }

  const updated = await prisma.tutoringSession.update({
    where: { id },
    data: updateData,
  });

  res.json({ session: updated });
});
