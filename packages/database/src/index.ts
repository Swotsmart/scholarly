/**
 * @scholarly/database
 * Database client and utilities for Scholarly Platform
 */

import { PrismaClient } from '@prisma/client';

// Extend PrismaClient with custom methods
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }).$extends({
    query: {
      $allModels: {
        async findMany({ model, operation, args, query }) {
          // Add default ordering by createdAt desc if not specified
          args.orderBy = args.orderBy ?? { createdAt: 'desc' };
          return query(args);
        },
      },
    },
  });
};

declare global {
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export { PrismaClient };

// Re-export generated types
export * from '@prisma/client';

// Database utilities
export async function withTransaction<T>(
  fn: (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn);
}

export async function checkConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

// Pagination utilities
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function getPaginationArgs(params: PaginationParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { skip, take, page, pageSize };
}

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// Soft delete helpers
export const activeFilter = { status: { not: 'deleted' } };

// Common query helpers
export const userSelect = {
  id: true,
  tenantId: true,
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
};

export const contentSelect = {
  id: true,
  title: true,
  description: true,
  type: true,
  thumbnailUrl: true,
  subjects: true,
  yearLevels: true,
  pricing: true,
  averageRating: true,
  reviewCount: true,
  purchaseCount: true,
  status: true,
  publishedAt: true,
  creator: {
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
    },
  },
};

export const standardSelect = {
  id: true,
  framework: true,
  code: true,
  type: true,
  learningArea: true,
  subject: true,
  strand: true,
  substrand: true,
  yearLevels: true,
  title: true,
  description: true,
  generalCapabilities: true,
};
