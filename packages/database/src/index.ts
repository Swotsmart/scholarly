/**
 * @scholarly/database
 * Database client and utilities for Scholarly Platform
 */

import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Models that support soft delete (have deletedAt column)
 */
const SOFT_DELETE_MODELS = [
  'Tenant',
  'User',
  'TutorProfile',
  'Content',
  'HomeschoolFamily',
  'HomeschoolCoop',
  'MicroSchool',
  'ReliefTeacher',
] as const;

type SoftDeleteModel = typeof SOFT_DELETE_MODELS[number];

function isSoftDeleteModel(model: string | undefined): model is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes(model as SoftDeleteModel);
}

// Extend PrismaClient with custom methods
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }).$extends({
    query: {
      $allModels: {
        // Default ordering by createdAt desc
        async findMany({ model, operation, args, query }) {
          args.orderBy = args.orderBy ?? { createdAt: 'desc' };

          // Filter out soft-deleted records unless explicitly requested
          if (isSoftDeleteModel(model)) {
            if (!args.where) args.where = {};
            // Only filter if deletedAt is not explicitly set in the query
            if ((args.where as any).deletedAt === undefined) {
              (args.where as any).deletedAt = null;
            }
          }

          return query(args);
        },

        // Filter soft-deleted on findFirst
        async findFirst({ model, operation, args, query }) {
          if (isSoftDeleteModel(model)) {
            if (!args.where) args.where = {};
            if ((args.where as any).deletedAt === undefined) {
              (args.where as any).deletedAt = null;
            }
          }
          return query(args);
        },

        // Filter soft-deleted on findUnique
        async findUnique({ model, operation, args, query }) {
          if (isSoftDeleteModel(model)) {
            // Convert to findFirst to allow deletedAt filter
            const result = await query(args);
            if (result && (result as any).deletedAt != null) {
              return null;
            }
            return result;
          }
          return query(args);
        },

        // Convert delete to soft delete
        async delete({ model, operation, args, query }) {
          if (isSoftDeleteModel(model)) {
            // Convert to update with deletedAt
            return (query as any)({
              ...args,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },

        // Convert deleteMany to soft delete
        async deleteMany({ model, operation, args, query }) {
          if (isSoftDeleteModel(model)) {
            return (query as any)({
              ...args,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },

        // Filter soft-deleted on count
        async count({ model, operation, args, query }) {
          if (isSoftDeleteModel(model)) {
            if (!args.where) args.where = {};
            if ((args.where as any).deletedAt === undefined) {
              (args.where as any).deletedAt = null;
            }
          }
          return query(args);
        },

        // Filter soft-deleted on aggregate
        async aggregate({ model, operation, args, query }) {
          if (isSoftDeleteModel(model)) {
            if (!args.where) args.where = {};
            if ((args.where as any).deletedAt === undefined) {
              (args.where as any).deletedAt = null;
            }
          }
          return query(args);
        },
      },
    },
    model: {
      // Add restore method for soft-deleted records
      $allModels: {
        async restore<T>(this: T, where: Prisma.Args<T, 'update'>['where']): Promise<Prisma.Result<T, { where: typeof where }, 'update'>> {
          const context = Prisma.getExtensionContext(this);
          return (context as any).update({
            where,
            data: { deletedAt: null },
          });
        },

        async hardDelete<T>(this: T, where: Prisma.Args<T, 'delete'>['where']): Promise<Prisma.Result<T, { where: typeof where }, 'delete'>> {
          const context = Prisma.getExtensionContext(this);
          // Bypass soft delete by using raw delete
          const modelName = (context as any).name;
          const client = (context as any).$parent;
          return client.$queryRawUnsafe(
            `DELETE FROM "${modelName}" WHERE id = $1`,
            (where as any).id
          );
        },

        async findWithDeleted<T>(this: T, args?: Prisma.Args<T, 'findMany'>): Promise<Prisma.Result<T, typeof args, 'findMany'>> {
          const context = Prisma.getExtensionContext(this);
          // Explicitly include deleted records
          const argsWithDeleted = {
            ...args,
            where: {
              ...(args?.where || {}),
              deletedAt: undefined, // Clear the filter
            },
          };
          return (context as any).findMany(argsWithDeleted);
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
export const activeFilter = { deletedAt: null };
export const withDeletedFilter = { deletedAt: undefined }; // Includes soft-deleted
export const onlyDeletedFilter = { deletedAt: { not: null } };

// Helper to check if a model supports soft delete
export function supportsSoftDelete(model: string): boolean {
  return SOFT_DELETE_MODELS.includes(model as any);
}

// Get list of soft delete models
export function getSoftDeleteModels(): readonly string[] {
  return SOFT_DELETE_MODELS;
}

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
