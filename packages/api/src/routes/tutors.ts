/**
 * Tutors Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { ApiError } from '../middleware/error-handler';

export const tutorsRouter: Router = Router();

// Search tutors
tutorsRouter.get('/search', async (req, res) => {
  const { tenantId } = req;
  const {
    subject,
    yearLevel,
    sessionType,
    maxPrice,
    minRating,
    page = '1',
    pageSize = '20',
  } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  // Build where clause
  const where: Record<string, unknown> = {
    verificationStatus: 'verified',
    user: {
      tenantId,
      status: 'active',
    },
  };

  const tutorProfiles = await prisma.tutorProfile.findMany({
    where,
    skip,
    take,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          trustScore: true,
        },
      },
      subjects: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  type TutorProfileWithRelations = typeof tutorProfiles[number];

  // Filter and score matches
  let matches = tutorProfiles.map((profile: TutorProfileWithRelations) => {
    let matchScore = 70; // Base score
    const matchReasons: string[] = [];
    const metrics = profile.metrics as Record<string, number>;
    const profileSubjects = (profile as any).subjects || [];
    const profileUser = (profile as any).user || {};

    // Subject match
    if (subject) {
      const hasSubject = profileSubjects.some((s: any) =>
        s.subjectId === subject || s.subjectName?.toLowerCase().includes((subject as string).toLowerCase())
      );
      if (hasSubject) {
        matchScore += 15;
        matchReasons.push('Teaches requested subject');
      } else {
        matchScore -= 30;
      }
    }

    // Year level match
    if (yearLevel && profile.yearLevelsTeaching.includes(yearLevel as string)) {
      matchScore += 10;
      matchReasons.push(`Teaches ${yearLevel}`);
    }

    // Rating
    if (metrics.averageRating >= 4.5) {
      matchScore += 10;
      matchReasons.push('Highly rated');
    }

    // Price match
    if (maxPrice) {
      const pricing = (profile as any).pricing as { hourlyRate1to1: number };
      if (pricing?.hourlyRate1to1 <= parseFloat(maxPrice as string)) {
        matchScore += 5;
        matchReasons.push('Within budget');
      }
    }

    return {
      tutorId: profile.userId,
      profileId: profile.id,
      name: profileUser.displayName,
      avatarUrl: profileUser.avatarUrl,
      bio: profileUser.bio,
      trustScore: profileUser.trustScore,
      subjects: profileSubjects,
      yearLevels: profile.yearLevelsTeaching,
      sessionTypes: (profile as any).sessionTypes,
      pricing: (profile as any).pricing,
      metrics: (profile as any).metrics,
      matchScore: Math.min(100, Math.max(0, matchScore)),
      matchReasons,
    };
  });

  // Apply filters
  if (minRating) {
    matches = matches.filter(m => {
      const metrics = m.metrics as Record<string, number>;
      return metrics.averageRating >= parseFloat(minRating as string);
    });
  }

  // Sort by match score
  matches.sort((a, b) => b.matchScore - a.matchScore);

  res.json({
    tutors: matches,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total: matches.length,
    },
  });
});

// Get tutor by ID
tutorsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req;

  const profile = await prisma.tutorProfile.findFirst({
    where: {
      OR: [
        { id },
        { userId: id },
      ],
      user: { tenantId },
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          bio: true,
          trustScore: true,
          createdAt: true,
        },
      },
      subjects: true,
      qualifications: true,
      safeguardingChecks: {
        where: { status: 'valid' },
      },
    },
  });

  if (!profile) {
    throw ApiError.notFound('Tutor', id);
  }

  res.json({ tutor: profile });
});

// Get tutor availability
tutorsRouter.get('/:id/availability', async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req;
  const { startDate, endDate } = req.query;

  const profile = await prisma.tutorProfile.findFirst({
    where: {
      OR: [{ id }, { userId: id }],
      user: { tenantId },
    },
  });

  if (!profile) {
    throw ApiError.notFound('Tutor', id);
  }

  // Get existing bookings in date range
  const start = startDate ? new Date(startDate as string) : new Date();
  const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const existingBookings = await prisma.booking.findMany({
    where: {
      tutorId: id,
      scheduledStart: { gte: start },
      scheduledEnd: { lte: end },
      status: { in: ['pending', 'confirmed'] },
    },
    select: {
      scheduledStart: true,
      scheduledEnd: true,
    },
  });

  res.json({
    availability: (profile as any).availability,
    bookedSlots: existingBookings,
  });
});

// Update tutor profile
const updateTutorSchema = z.object({
  yearLevelsTeaching: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  sessionTypes: z.array(z.string()).optional(),
  maxStudentsPerGroup: z.number().min(1).max(10).optional(),
  teachingStyle: z.record(z.unknown()).optional(),
  availability: z.record(z.unknown()).optional(),
  pricing: z.record(z.unknown()).optional(),
});

tutorsRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { user: currentUser } = req;
  const data = updateTutorSchema.parse(req.body);

  // Get profile
  const profile = await prisma.tutorProfile.findFirst({
    where: {
      OR: [{ id }, { userId: id }],
    },
  });

  if (!profile) {
    throw ApiError.notFound('Tutor profile', id);
  }

  // Only allow tutor to update own profile or admin
  if (profile.userId !== currentUser?.id && !currentUser?.roles.includes('platform_admin')) {
    throw ApiError.forbidden();
  }

  const updated = await prisma.tutorProfile.update({
    where: { id: profile.id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  res.json({ tutor: updated });
});

// Get tutor reviews
tutorsRouter.get('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const { page = '1', pageSize = '10' } = req.query;

  // In a real app, reviews would be in a separate tutor_reviews table
  // For now, return session feedback
  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const sessions = await prisma.tutoringSession.findMany({
    where: {
      OR: [
        { tutorProfileId: id },
        { tutorUserId: id },
      ],
      status: 'completed',
      learnerFeedback: { not: null },
    },
    skip,
    take,
    select: {
      id: true,
      learnerFeedback: true,
      actualEnd: true,
      subjectId: true,
    },
    orderBy: { actualEnd: 'desc' },
  });

  const reviews = sessions
    .filter(s => s.learnerFeedback)
    .map(s => ({
      sessionId: s.id,
      feedback: s.learnerFeedback,
      subject: s.subjectId,
      date: s.actualEnd,
    }));

  res.json({ reviews });
});
