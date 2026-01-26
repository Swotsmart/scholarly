/**
 * Scholarly Platform - Database Client
 * 
 * Singleton Prisma client with:
 * - Connection pooling
 * - Graceful shutdown
 * - Query logging in development
 * - Error handling wrapper
 * 
 * @module @scholarly/database
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { ScholarlyError, DatabaseError } from '@scholarly/shared';

// =============================================================================
// PRISMA CLIENT SINGLETON
// =============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const client = new PrismaClient({
    log: isProduction
      ? [{ level: 'error', emit: 'event' }]
      : [
          { level: 'query', emit: 'event' },
          { level: 'info', emit: 'event' },
          { level: 'warn', emit: 'event' },
          { level: 'error', emit: 'event' },
        ],
    errorFormat: isProduction ? 'minimal' : 'pretty',
  });

  // Log queries in development
  if (!isProduction) {
    client.$on('query' as never, (e: Prisma.QueryEvent) => {
      console.log(`[Prisma Query] ${e.query} - ${e.duration}ms`);
    });
  }

  // Log errors
  client.$on('error' as never, (e: { message: string }) => {
    console.error(`[Prisma Error] ${e.message}`);
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

let isConnected = false;

/**
 * Connect to the database
 */
export async function connectDatabase(): Promise<void> {
  if (isConnected) return;
  
  try {
    await prisma.$connect();
    isConnected = true;
    console.log('[Database] Connected successfully');
  } catch (error) {
    console.error('[Database] Connection failed:', error);
    throw new DatabaseError('Failed to connect to database', error as Error);
  }
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  
  try {
    await prisma.$disconnect();
    isConnected = false;
    console.log('[Database] Disconnected successfully');
  } catch (error) {
    console.error('[Database] Disconnect failed:', error);
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Wrap a database operation with error handling
 */
export async function withDatabase<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw handlePrismaError(error, context);
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new DatabaseError(
        `Validation error${context ? ` in ${context}` : ''}: ${error.message}`
      );
    }
    if (error instanceof ScholarlyError) {
      throw error;
    }
    throw new DatabaseError(
      `Database operation failed${context ? ` in ${context}` : ''}`,
      error as Error
    );
  }
}

/**
 * Convert Prisma errors to application errors
 */
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError,
  context?: string
): ScholarlyError {
  const prefix = context ? `${context}: ` : '';
  
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (error.meta?.target as string[])?.join(', ') || 'field';
      return new DatabaseError(`${prefix}Duplicate value for ${target}`);
    }
    case 'P2003': {
      // Foreign key constraint
      const field = error.meta?.field_name as string || 'field';
      return new DatabaseError(`${prefix}Invalid reference for ${field}`);
    }
    case 'P2025': {
      // Record not found
      return new DatabaseError(`${prefix}Record not found`);
    }
    case 'P2014': {
      // Required relation violation
      return new DatabaseError(`${prefix}Required relation violated`);
    }
    default:
      return new DatabaseError(
        `${prefix}Database error: ${error.code}`,
        error
      );
  }
}

// =============================================================================
// TRANSACTION HELPER
// =============================================================================

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Execute operations in a transaction
 */
export async function withTransaction<T>(
  operation: (tx: TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  }
): Promise<T> {
  return prisma.$transaction(operation, {
    maxWait: options?.maxWait ?? 5000,
    timeout: options?.timeout ?? 10000,
    isolationLevel: options?.isolationLevel ?? Prisma.TransactionIsolationLevel.ReadCommitted,
  });
}

// =============================================================================
// SOFT DELETE HELPERS
// =============================================================================

/**
 * Add soft delete filter to where clause
 */
export function excludeDeleted<T extends { deletedAt?: Date | null }>(
  where: T
): T & { deletedAt: null } {
  return { ...where, deletedAt: null };
}

/**
 * Mark a record as deleted
 */
export function softDeleteData(): { deletedAt: Date } {
  return { deletedAt: new Date() };
}

// =============================================================================
// PAGINATION HELPERS
// =============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function paginationToSkipTake(params: PaginationParams): {
  skip: number;
  take: number;
} {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  };
}

export function buildOrderBy(
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): Record<string, 'asc' | 'desc'> | undefined {
  if (!sortBy) return undefined;
  return { [sortBy]: sortOrder };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { Prisma, PrismaClient };
export type {
  Tenant,
  User,
  RefreshToken,
  AuditLog,
  EarlyYearsFamily,
  EarlyYearsChild,
  EarlyYearsPicturePassword,
  EarlyYearsPhonicsProgress,
  EarlyYearsNumeracyProgress,
  EarlyYearsSession,
  EarlyYearsActivity,
  LanguageLearnerProfile,
  LanguageVocabularyProgress,
  LanguageVocabularyItem,
  LanguageHeritagePathway,
  LanguageConversation,
  LanguageAchievement,
  LanguageLearnerAchievement,
  LanguageOfflinePackage,
  LearningEvent,
  MLPrediction,
} from '@prisma/client';
