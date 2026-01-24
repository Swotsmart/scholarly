/**
 * Relief Marketplace Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { ApiError } from '../middleware/error-handler';

export const reliefRouter: Router = Router();

// Get relief teachers
reliefRouter.get('/teachers', async (req, res) => {
  const { tenantId } = req;
  const { subject, yearLevel, available, page = '1', pageSize = '20' } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const where: Record<string, unknown> = {
    tenantId,
    status: 'available',
  };

  if (subject) where.subjects = { has: subject as string };
  if (yearLevel) where.yearLevels = { has: yearLevel as string };

  const [teachers, total] = await Promise.all([
    prisma.reliefTeacher.findMany({
      where,
      skip,
      take,
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.reliefTeacher.count({ where }),
  ]);

  res.json({
    teachers,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    },
  });
});

// Get teacher by ID
reliefRouter.get('/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req;

  const teacher = await prisma.reliefTeacher.findFirst({
    where: {
      OR: [{ id }, { userId: id }],
      tenantId,
    },
    include: {
      user: {
        select: { id: true, displayName: true, avatarUrl: true, bio: true },
      },
      poolMemberships: {
        include: {
          pool: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!teacher) {
    throw ApiError.notFound('Relief teacher', id);
  }

  res.json({ teacher });
});

// Report absence
const absenceSchema = z.object({
  schoolId: z.string(),
  teacherId: z.string(),
  teacherName: z.string(),
  date: z.string().datetime(),
  startTime: z.string(),
  endTime: z.string(),
  isFullDay: z.boolean(),
  reason: z.string(),
  notes: z.string().optional(),
  coverageRequired: z.array(z.object({
    period: z.number(),
    periodName: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    classId: z.string(),
    className: z.string(),
    yearLevel: z.string(),
    subject: z.string(),
    room: z.string(),
    lessonPlan: z.string().optional(),
    specialInstructions: z.string().optional(),
  })),
});

reliefRouter.post('/absences', async (req, res) => {
  const { tenantId, user } = req;
  const data = absenceSchema.parse(req.body);

  const absence = await prisma.teacherAbsence.create({
    data: {
      tenantId,
      schoolId: data.schoolId,
      teacherId: data.teacherId,
      teacherName: data.teacherName,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      isFullDay: data.isFullDay,
      reason: data.reason,
      notes: data.notes,
      coverageRequired: data.coverageRequired.map(c => ({
        ...c,
        status: 'pending',
      })),
      status: 'reported',
      reportedBy: user!.id,
    },
  });

  res.status(201).json({ absence });
});

// Get absences
reliefRouter.get('/absences', async (req, res) => {
  const { tenantId } = req;
  const { schoolId, date, status, page = '1', pageSize = '20' } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const where: Record<string, unknown> = { tenantId };

  if (schoolId) where.schoolId = schoolId;
  if (status) where.status = status;
  if (date) {
    const targetDate = new Date(date as string);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    where.date = {
      gte: targetDate,
      lt: nextDay,
    };
  }

  const [absences, total] = await Promise.all([
    prisma.teacherAbsence.findMany({
      where,
      skip,
      take,
      include: {
        assignments: {
          include: {
            reliefTeacher: {
              select: { name: true, tier: true },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.teacherAbsence.count({ where }),
  ]);

  res.json({
    absences,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    },
  });
});

// Request relief for absence
reliefRouter.post('/absences/:id/request-relief', async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req;
  const { strategy = 'balanced', coverageRequirementIds } = req.body;

  const absence = await prisma.teacherAbsence.findFirst({
    where: { id, tenantId },
  });

  if (!absence) {
    throw ApiError.notFound('Absence', id);
  }

  // Get relief pool for the school
  const pool = await prisma.reliefPool.findFirst({
    where: { tenantId, schoolId: absence.schoolId },
    include: {
      members: {
        where: { reliefTeacher: { status: 'available' } },
        include: {
          reliefTeacher: true,
        },
        orderBy: [{ tier: 'desc' }, { priority: 'asc' }],
      },
    },
  });

  if (!pool || pool.members.length === 0) {
    throw ApiError.badRequest('No relief teachers available in pool');
  }

  // Create assignments (in production, would send notifications)
  const member = pool.members[0];

  const assignment = await prisma.reliefAssignment.create({
    data: {
      absenceId: id,
      reliefTeacherId: member.reliefTeacherId,
      coverageRequirementIds: coverageRequirementIds || [],
      status: 'offered',
    },
    include: {
      reliefTeacher: {
        select: { name: true, email: true },
      },
    },
  });

  // Update absence status
  await prisma.teacherAbsence.update({
    where: { id },
    data: { status: 'seeking_relief' },
  });

  res.json({ assignment });
});

// Accept relief assignment
reliefRouter.post('/assignments/:id/accept', async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  const assignment = await prisma.reliefAssignment.findUnique({
    where: { id },
    include: { reliefTeacher: true },
  });

  if (!assignment) {
    throw ApiError.notFound('Assignment', id);
  }

  if (assignment.reliefTeacher.userId !== user?.id) {
    throw ApiError.forbidden();
  }

  if (assignment.status !== 'offered') {
    throw ApiError.badRequest('Assignment cannot be accepted in current status');
  }

  const updated = await prisma.reliefAssignment.update({
    where: { id },
    data: {
      status: 'accepted',
      respondedAt: new Date(),
    },
  });

  // Update absence
  await prisma.teacherAbsence.update({
    where: { id: assignment.absenceId },
    data: { status: 'covered' },
  });

  res.json({ assignment: updated });
});

// Get relief pools
reliefRouter.get('/pools', async (req, res) => {
  const { tenantId } = req;
  const { schoolId } = req.query;

  const where: Record<string, unknown> = { tenantId };
  if (schoolId) where.schoolId = schoolId;

  const pools = await prisma.reliefPool.findMany({
    where,
    include: {
      members: {
        include: {
          reliefTeacher: {
            select: { name: true, tier: true, metrics: true },
          },
        },
      },
    },
  });

  res.json({ pools });
});

// Get predictions
reliefRouter.get('/predictions', async (req, res) => {
  const { tenantId } = req;
  const { schoolId, startDate, endDate } = req.query;

  if (!schoolId || !startDate) {
    throw ApiError.badRequest('schoolId and startDate are required');
  }

  const start = new Date(startDate as string);
  const end = endDate ? new Date(endDate as string) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const predictions = await prisma.absencePrediction.findMany({
    where: {
      tenantId,
      schoolId: schoolId as string,
      date: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { date: 'asc' },
  });

  res.json({ predictions });
});

// Get dashboard stats
reliefRouter.get('/stats', async (req, res) => {
  const { tenantId } = req;
  const { schoolId } = req.query;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const where: Record<string, unknown> = { tenantId };
  if (schoolId) where.schoolId = schoolId;

  const [
    todayAbsences,
    pendingRequests,
    coveredToday,
    availableTeachers,
  ] = await Promise.all([
    prisma.teacherAbsence.count({
      where: {
        ...where,
        date: { gte: today, lt: tomorrow },
      },
    }),
    prisma.teacherAbsence.count({
      where: {
        ...where,
        status: { in: ['reported', 'seeking_relief'] },
      },
    }),
    prisma.teacherAbsence.count({
      where: {
        ...where,
        date: { gte: today, lt: tomorrow },
        status: 'covered',
      },
    }),
    prisma.reliefTeacher.count({
      where: {
        tenantId,
        status: 'available',
      },
    }),
  ]);

  res.json({
    stats: {
      todayAbsences,
      pendingRequests,
      coveredToday,
      availableTeachers,
      fillRate: todayAbsences > 0 ? Math.round((coveredToday / todayAbsences) * 100) : 100,
    },
  });
});
