/**
 * ============================================================================
 * Scholarly Platform — Repository Infrastructure
 * ============================================================================
 *
 * Shared utilities for all Prisma repository implementations.
 *
 * The core challenge: Prisma enums are UPPER_CASE (DRAFT, PUBLISHED)
 * while our TypeScript types use lowercase ('draft', 'published').
 * Rather than scattering conversions across every repository, we
 * centralise the mapping here — one place to maintain, one place
 * that can break, one place to test.
 *
 * Think of this as the adapter between the database dialect and the
 * application dialect. The database speaks SQL/Prisma; the application
 * speaks TypeScript domain types. This file translates between them.
 *
 * @module erudits/repositories/shared
 * @version 1.0.0
 */

import type { ListFilter, PaginatedResult } from '../types/erudits.types';

// ============================================================================
// PRISMA CLIENT TYPE
// ============================================================================

/**
 * We don't import PrismaClient directly — that would couple every
 * repository to a specific Prisma version. Instead, we define the
 * shape we need and let the DI container provide the real client.
 *
 * In production, the container creates one PrismaClient instance
 * and passes it to every repository constructor.
 */
export interface PrismaClientLike {
  platformMigration: PrismaDelegate;
  migrationContentItem: PrismaDelegate;
  digitalResource: PrismaDelegate;
  resourceFile: PrismaDelegate;
  resourcePurchase: PrismaDelegate;
  resourceLicence: PrismaDelegate;
  resourceReview: PrismaDelegate;
  manuscript: PrismaDelegate;
  manuscriptChapter: PrismaDelegate;
  manuscriptVersion: PrismaDelegate;
  bookPublication: PrismaDelegate;
  publicationChannel: PrismaDelegate;
  bookCover: PrismaDelegate;
  salesRecord: PrismaDelegate;
  bookClub: PrismaDelegate;
  bookClubSession: PrismaDelegate;
  bookClubReading: PrismaDelegate;
  bookClubMember: PrismaDelegate;
  curriculumTag: PrismaDelegate;
  $transaction: (fn: (tx: PrismaClientLike) => Promise<unknown>) => Promise<unknown>;
}

/**
 * Generic Prisma model delegate shape. Every model on PrismaClient
 * exposes these methods. We type them loosely here because the real
 * types come from the generated Prisma client.
 */
export interface PrismaDelegate {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  findUnique(args: { where: Record<string, unknown>; include?: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  findFirst(args: { where: Record<string, unknown>; include?: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  findMany(args: {
    where?: Record<string, unknown> | undefined;
    include?: Record<string, unknown> | undefined;
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>> | undefined;
    skip?: number | undefined;
    take?: number | undefined;
  }): Promise<Array<Record<string, unknown>>>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  delete(args: { where: Record<string, unknown> }): Promise<Record<string, unknown>>;
  count(args?: { where?: Record<string, unknown> }): Promise<number>;
  createMany(args: { data: Array<Record<string, unknown>> }): Promise<{ count: number }>;
}

// ============================================================================
// ENUM MAPPERS
// ============================================================================

/**
 * Bidirectional enum mapping. Prisma uses UPPER_CASE; TypeScript uses lowercase.
 *
 *   toPrisma('draft')     → 'DRAFT'
 *   fromPrisma('DRAFT')   → 'draft'
 *
 * For enums where the Prisma value is just the uppercase version of the TS value,
 * generic helpers work. For irregular mappings (e.g., 'in_review' → 'IN_REVIEW'),
 * we use explicit lookup tables.
 */
export function toPrismaEnum(value: string): string {
  return value.toUpperCase();
}

export function fromPrismaEnum(value: string): string {
  return value.toLowerCase();
}

/**
 * For enum values with underscores that are already correctly cased
 * (e.g., 'single_school' → 'SINGLE_SCHOOL'), the generic helpers
 * work perfectly. But for display purposes we sometimes want the
 * lowercase_underscore format back.
 */
export function fromPrismaEnumToSnake(value: string): string {
  // READY_FOR_REVIEW → ready_for_review
  return value.toLowerCase();
}

// ============================================================================
// PAGINATION HELPER
// ============================================================================

/**
 * Convert a ListFilter into Prisma skip/take and produce a PaginatedResult.
 *
 * Usage in any repository:
 *   const { skip, take, page, pageSize } = paginationArgs(filter);
 *   const [items, total] = await Promise.all([
 *     prisma.model.findMany({ where, skip, take }),
 *     prisma.model.count({ where }),
 *   ]);
 *   return paginatedResult(items.map(mapFromPrisma), total, page, pageSize);
 */
export function paginationArgs(filter?: ListFilter): {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
} {
  const page = filter?.page ?? 1;
  const pageSize = Math.min(filter?.pageSize ?? 20, 100);
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================================
// JSON FIELD HELPERS
// ============================================================================

/**
 * Prisma stores JSON fields as `Prisma.JsonValue`. When reading,
 * we need to safely cast them to our TypeScript types.
 */
export function jsonOrUndefined<T>(value: unknown): T | undefined {
  if (value === null || value === undefined) return undefined;
  return value as T;
}

export function jsonOrDefault<T>(value: unknown, defaultValue: T): T {
  if (value === null || value === undefined) return defaultValue;
  return value as T;
}

export function jsonOrEmptyArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}
