/**
 * Scheduling Routes — Rooms, Periods, Timetable, Constraints
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { ApiError } from '../middleware/error-handler';

export const schedulingRouter: Router = Router();

// ============================================================================
// ROOMS
// ============================================================================

schedulingRouter.get('/rooms', async (req, res) => {
  const { tenantId } = req;
  const { type, status, search } = req.query;

  const where: Record<string, unknown> = { tenantId };
  if (type && type !== 'all') where.type = type;
  if (status && status !== 'all') where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { building: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const rooms = await prisma.room.findMany({
    where,
    orderBy: [{ building: 'asc' }, { name: 'asc' }],
  });

  res.json({ success: true, data: { rooms } });
});

schedulingRouter.get('/rooms/:id', async (req, res) => {
  const { tenantId } = req;
  const room = await prisma.room.findFirst({
    where: { id: req.params.id, tenantId },
  });
  if (!room) throw ApiError.notFound('Room', req.params.id);
  res.json({ success: true, data: room });
});

const roomSchema = z.object({
  name: z.string().min(1),
  type: z.string().default('classroom'),
  capacity: z.number().int().positive().default(30),
  building: z.string().optional(),
  floor: z.number().int().optional(),
  equipment: z.array(z.string()).default([]),
  status: z.string().default('available'),
});

schedulingRouter.post('/rooms', async (req, res) => {
  const { tenantId } = req;
  const data = roomSchema.parse(req.body);

  const room = await prisma.room.create({
    data: {
      tenantId,
      name: data.name,
      type: data.type,
      capacity: data.capacity,
      building: data.building,
      floor: data.floor,
      equipment: data.equipment,
      status: data.status,
    },
  });

  res.status(201).json({ success: true, data: room });
});

schedulingRouter.put('/rooms/:id', async (req, res) => {
  const { tenantId } = req;
  const data = roomSchema.partial().parse(req.body);

  const room = await prisma.room.updateMany({
    where: { id: req.params.id, tenantId },
    data: { ...data } as Record<string, unknown>,
  });
  if (room.count === 0) throw ApiError.notFound('Room', req.params.id);

  const updated = await prisma.room.findFirst({ where: { id: req.params.id } });
  res.json({ success: true, data: updated });
});

schedulingRouter.delete('/rooms/:id', async (req, res) => {
  const { tenantId } = req;
  const result = await prisma.room.deleteMany({
    where: { id: req.params.id, tenantId },
  });
  if (result.count === 0) throw ApiError.notFound('Room', req.params.id);
  res.json({ success: true });
});

// ============================================================================
// PERIODS
// ============================================================================

schedulingRouter.get('/periods', async (req, res) => {
  const { tenantId } = req;
  const periods = await prisma.schoolPeriod.findMany({
    where: { tenantId },
    orderBy: { periodNumber: 'asc' },
  });
  res.json({ success: true, data: { periods } });
});

const periodSchema = z.object({
  periodNumber: z.number().int().positive(),
  name: z.string().min(1),
  startTime: z.string(),
  endTime: z.string(),
  type: z.string().default('teaching'),
});

schedulingRouter.post('/periods', async (req, res) => {
  const { tenantId } = req;
  const data = periodSchema.parse(req.body);
  const period = await prisma.schoolPeriod.create({
    data: {
      tenantId,
      periodNumber: data.periodNumber,
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      type: data.type,
    },
  });
  res.status(201).json({ success: true, data: period });
});

schedulingRouter.put('/periods/:id', async (req, res) => {
  const { tenantId } = req;
  const data = periodSchema.partial().parse(req.body);
  const period = await prisma.schoolPeriod.updateMany({
    where: { id: req.params.id, tenantId },
    data: { ...data } as Record<string, unknown>,
  });
  if (period.count === 0) throw ApiError.notFound('Period', req.params.id);
  const updated = await prisma.schoolPeriod.findFirst({ where: { id: req.params.id } });
  res.json({ success: true, data: updated });
});

// ============================================================================
// TIMETABLE
// ============================================================================

schedulingRouter.get('/timetable', async (req, res) => {
  const { tenantId } = req;
  const { teacherId, roomId, yearLevel, term } = req.query;

  const where: Record<string, unknown> = { tenantId };
  if (teacherId) where.teacherId = teacherId;
  if (roomId) where.roomId = roomId;
  if (yearLevel) where.yearLevel = yearLevel;
  if (term) where.term = term;

  const slots = await prisma.timetableSlot.findMany({
    where,
    include: {
      period: true,
      subject: { select: { id: true, name: true, code: true, learningArea: true } },
      teacher: { select: { id: true, displayName: true, firstName: true, lastName: true } },
      room: { select: { id: true, name: true, type: true, building: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { period: { periodNumber: 'asc' } }],
  });

  res.json({ success: true, data: { slots } });
});

const timetableSlotSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(5),
  periodId: z.string(),
  classCode: z.string().optional(),
  subjectId: z.string().optional(),
  teacherId: z.string().optional(),
  roomId: z.string().optional(),
  yearLevel: z.string().optional(),
  term: z.string().optional(),
});

schedulingRouter.post('/timetable', async (req, res) => {
  const { tenantId } = req;
  const data = timetableSlotSchema.parse(req.body);
  const slot = await prisma.timetableSlot.create({
    data: {
      tenantId,
      dayOfWeek: data.dayOfWeek,
      periodId: data.periodId,
      classCode: data.classCode,
      subjectId: data.subjectId,
      teacherId: data.teacherId,
      roomId: data.roomId,
      yearLevel: data.yearLevel,
      term: data.term,
    },
    include: {
      period: true,
      subject: { select: { id: true, name: true, code: true } },
      teacher: { select: { id: true, displayName: true } },
      room: { select: { id: true, name: true } },
    },
  });
  res.status(201).json({ success: true, data: slot });
});

schedulingRouter.put('/timetable/:id', async (req, res) => {
  const { tenantId } = req;
  const data = timetableSlotSchema.partial().parse(req.body);
  const slot = await prisma.timetableSlot.updateMany({
    where: { id: req.params.id, tenantId },
    data: { ...data } as Record<string, unknown>,
  });
  if (slot.count === 0) throw ApiError.notFound('TimetableSlot', req.params.id);
  const updated = await prisma.timetableSlot.findFirst({
    where: { id: req.params.id },
    include: {
      period: true,
      subject: { select: { id: true, name: true, code: true } },
      teacher: { select: { id: true, displayName: true } },
      room: { select: { id: true, name: true } },
    },
  });
  res.json({ success: true, data: updated });
});

schedulingRouter.delete('/timetable/:id', async (req, res) => {
  const { tenantId } = req;
  const result = await prisma.timetableSlot.deleteMany({
    where: { id: req.params.id, tenantId },
  });
  if (result.count === 0) throw ApiError.notFound('TimetableSlot', req.params.id);
  res.json({ success: true });
});

// ============================================================================
// CONSTRAINTS
// ============================================================================

schedulingRouter.get('/constraints', async (req, res) => {
  const { tenantId } = req;
  const { category, enabled } = req.query;

  const where: Record<string, unknown> = { tenantId };
  if (category && category !== 'all') where.category = category;
  if (enabled !== undefined) where.enabled = enabled === 'true';

  const constraints = await prisma.schedulingConstraint.findMany({
    where,
    orderBy: [{ category: 'asc' }, { priority: 'asc' }, { name: 'asc' }],
  });

  res.json({ success: true, data: { constraints } });
});

const constraintSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['teacher', 'room', 'time']),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  enabled: z.boolean().default(true),
  rules: z.record(z.unknown()).default({}),
});

schedulingRouter.post('/constraints', async (req, res) => {
  const { tenantId } = req;
  const data = constraintSchema.parse(req.body);
  const constraint = await prisma.schedulingConstraint.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      category: data.category,
      priority: data.priority,
      enabled: data.enabled,
      rules: data.rules,
    },
  });
  res.status(201).json({ success: true, data: constraint });
});

schedulingRouter.put('/constraints/:id', async (req, res) => {
  const { tenantId } = req;
  const data = constraintSchema.partial().parse(req.body);
  const result = await prisma.schedulingConstraint.updateMany({
    where: { id: req.params.id, tenantId },
    data: { ...data } as Record<string, unknown>,
  });
  if (result.count === 0) throw ApiError.notFound('Constraint', req.params.id);
  const updated = await prisma.schedulingConstraint.findFirst({ where: { id: req.params.id } });
  res.json({ success: true, data: updated });
});

schedulingRouter.delete('/constraints/:id', async (req, res) => {
  const { tenantId } = req;
  const result = await prisma.schedulingConstraint.deleteMany({
    where: { id: req.params.id, tenantId },
  });
  if (result.count === 0) throw ApiError.notFound('Constraint', req.params.id);
  res.json({ success: true });
});

// ============================================================================
// STATS
// ============================================================================

schedulingRouter.get('/stats', async (req, res) => {
  const { tenantId } = req;

  const [
    totalRooms,
    availableRooms,
    maintenanceRooms,
    totalPeriods,
    totalSlots,
    totalConstraints,
    enabledConstraints,
  ] = await Promise.all([
    prisma.room.count({ where: { tenantId } }),
    prisma.room.count({ where: { tenantId, status: 'available' } }),
    prisma.room.count({ where: { tenantId, status: 'maintenance' } }),
    prisma.schoolPeriod.count({ where: { tenantId } }),
    prisma.timetableSlot.count({ where: { tenantId } }),
    prisma.schedulingConstraint.count({ where: { tenantId } }),
    prisma.schedulingConstraint.count({ where: { tenantId, enabled: true } }),
  ]);

  res.json({
    success: true,
    data: {
      rooms: { total: totalRooms, available: availableRooms, maintenance: maintenanceRooms },
      periods: totalPeriods,
      timetableSlots: totalSlots,
      constraints: { total: totalConstraints, enabled: enabledConstraints },
    },
  });
});
