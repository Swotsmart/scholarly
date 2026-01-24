/**
 * Users Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { ApiError } from '../middleware/error-handler';

export const usersRouter: Router = Router();

// Get all users in tenant
usersRouter.get('/', async (req, res) => {
  const { tenantId } = req;
  const { role, search, page = '1', pageSize = '20' } = req.query;

  const where: Record<string, unknown> = { tenantId };

  if (role) {
    where.roles = { has: role as string };
  }

  if (search) {
    where.OR = [
      { displayName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        roles: true,
        jurisdiction: true,
        trustScore: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    users,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    },
  });
});

// Get user by ID
usersRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req;

  const user = await prisma.user.findFirst({
    where: { id, tenantId },
    include: {
      learnerProfile: {
        include: { subjects: true },
      },
      parentProfile: true,
      tutorProfile: {
        include: {
          subjects: true,
          qualifications: true,
          safeguardingChecks: true,
        },
      },
      creatorProfile: true,
    },
  });

  if (!user) {
    throw ApiError.notFound('User', id);
  }

  res.json({ user });
});

// Update user
const updateUserSchema = z.object({
  displayName: z.string().min(2).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

usersRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user: currentUser } = req;
  const data = updateUserSchema.parse(req.body);

  // Users can only update themselves unless admin
  if (id !== currentUser?.id && !currentUser?.roles.includes('platform_admin')) {
    throw ApiError.forbidden('Cannot update other users');
  }

  const user = await prisma.user.update({
    where: { id, tenantId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  res.json({ user });
});

// Get user's token balance and history
usersRouter.get('/:id/tokens', async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req;

  const user = await prisma.user.findFirst({
    where: { id, tenantId },
    select: {
      tokenBalance: true,
    },
  });

  if (!user) {
    throw ApiError.notFound('User', id);
  }

  // In a real app, you'd have a token transactions table
  res.json({
    balance: user.tokenBalance,
    transactions: [], // Would come from token_transactions table
  });
});
