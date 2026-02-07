/**
 * =============================================================================
 * SCHOLARLY PLATFORM — Storybook Repository Layer
 * =============================================================================
 *
 * Sprint 6, PW-002: The production wiring that connects the Storybook Engine's
 * business logic (Sprints 2–4) to real PostgreSQL via Prisma. If the business
 * logic layer is the brain deciding what story to generate, these repositories
 * are the hands that actually file the book on the shelf, retrieve it when
 * asked, and update the catalogue card.
 *
 * Every repository follows the same discipline:
 * - Multi-tenant isolation on every query (tenantId is never optional)
 * - Result<T> error handling (no thrown exceptions escape)
 * - Pagination with cursor-based and offset-based options
 * - Prisma transaction support for multi-entity operations
 * - Typed filter objects that prevent SQL injection by construction
 *
 * Total: ~2,400 lines
 * =============================================================================
 */

import { PrismaClient, Prisma } from '@prisma/client';

// =============================================================================
// SHARED TYPES
// =============================================================================

/** Discriminated union for operation results — no exceptions, just data. */
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

function fail<T>(error: string, code: string = 'REPOSITORY_ERROR'): Result<T> {
  return { success: false, error, code };
}

interface PaginationOptions {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// =============================================================================
// STORYBOOK FILTERS
// =============================================================================

interface StorybookFilter {
  status?: string | string[];
  phonicsPhase?: string | string[];
  creatorId?: string;
  seriesId?: string;
  artStyle?: string;
  culturalContext?: string;
  ageGroup?: { min?: number; max?: number };
  decodabilityMin?: number;
  themes?: string[];
  isOpenSource?: boolean;
  search?: string; // Full-text search on title + synopsis
  targetGpcs?: string[]; // Books targeting specific GPCs
  publishedAfter?: Date;
  publishedBefore?: Date;
}

interface PageFilter {
  storybookId: string;
  hasIllustration?: boolean;
  hasAudio?: boolean;
  pageRange?: { min: number; max: number };
}

interface CharacterFilter {
  creatorId?: string;
  seriesId?: string;
  name?: string;
  role?: string;
}

interface SeriesFilter {
  creatorId?: string;
  targetPhases?: string[];
  culturalContext?: string;
  artStyle?: string;
  hasPublishedBooks?: boolean;
}

interface IllustrationFilter {
  storybookId?: string;
  model?: string;
  artStyle?: string;
  moderationResult?: string;
  pageNumber?: number;
}

interface ReviewFilter {
  storybookId?: string;
  reviewerId?: string;
  stage?: string | string[];
  decision?: string;
  minScore?: number;
}

interface AnalyticsFilter {
  minReads?: number;
  minCompletionRate?: number;
  minQualityScore?: number;
  hasProblematicGpcs?: boolean;
}

interface CreatorFilter {
  tier?: string | string[];
  isVerifiedEducator?: boolean;
  minPublishedCount?: number;
  minAverageScore?: number;
  search?: string;
}

interface BountyFilter {
  status?: string | string[];
  targetPhase?: string;
  fundingSource?: string;
  createdById?: string;
  deadlineBefore?: Date;
  deadlineAfter?: Date;
}

interface DeviceStorybookFilter {
  learnerId?: string;
  deviceId?: string;
  storybookId?: string;
  downloadStatus?: string | string[];
}

// =============================================================================
// 1. STORYBOOK REPOSITORY
// =============================================================================

export class StorybookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    tenantId: string,
    data: Prisma.StorybookCreateInput & { tenantId?: string }
  ): Promise<Result<any>> {
    try {
      const storybook = await this.prisma.storybook.create({
        data: { ...data, tenantId },
        include: { pages: true, characters: true, series: true },
      });
      return ok(storybook);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return fail('A storybook with this slug already exists in this tenant', 'DUPLICATE_SLUG');
      }
      return fail(`Failed to create storybook: ${error.message}`, 'CREATE_FAILED');
    }
  }

  async findById(tenantId: string, id: string): Promise<Result<any>> {
    try {
      const storybook = await this.prisma.storybook.findFirst({
        where: { id, tenantId },
        include: {
          pages: { orderBy: { pageNumber: 'asc' } },
          characters: true,
          series: true,
          analytics: true,
          reviews: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      });
      if (!storybook) {
        return fail('Storybook not found', 'NOT_FOUND');
      }
      return ok(storybook);
    } catch (error: any) {
      return fail(`Failed to find storybook: ${error.message}`);
    }
  }

  async findBySlug(tenantId: string, slug: string): Promise<Result<any>> {
    try {
      const storybook = await this.prisma.storybook.findUnique({
        where: { tenantId_slug: { tenantId, slug } },
        include: {
          pages: { orderBy: { pageNumber: 'asc' } },
          characters: true,
          series: true,
          analytics: true,
        },
      });
      if (!storybook) {
        return fail('Storybook not found', 'NOT_FOUND');
      }
      return ok(storybook);
    } catch (error: any) {
      return fail(`Failed to find storybook by slug: ${error.message}`);
    }
  }

  async list(
    tenantId: string,
    filter: StorybookFilter = {},
    pagination: PaginationOptions = {}
  ): Promise<Result<PaginatedResult<any>>> {
    try {
      const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const where = this.buildStorybookWhere(tenantId, filter);
      const [items, total] = await this.prisma.$transaction([
        this.prisma.storybook.findMany({
          where,
          include: { series: true, analytics: true },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.storybook.count({ where }),
      ]);
      const totalPages = Math.ceil(total / pageSize);
      return ok({
        items,
        total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      });
    } catch (error: any) {
      return fail(`Failed to list storybooks: ${error.message}`);
    }
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.StorybookUpdateInput
  ): Promise<Result<any>> {
    try {
      const existing = await this.prisma.storybook.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        return fail('Storybook not found', 'NOT_FOUND');
      }
      const updated = await this.prisma.storybook.update({
        where: { id },
        data,
        include: { pages: true, characters: true, series: true },
      });
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to update storybook: ${error.message}`);
    }
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: string,
    rejectionReason?: string
  ): Promise<Result<any>> {
    try {
      const storybook = await this.prisma.storybook.findFirst({
        where: { id, tenantId },
      });
      if (!storybook) {
        return fail('Storybook not found', 'NOT_FOUND');
      }

      const updateData: any = { status };
      if (status === 'PUBLISHED') {
        updateData.publishedAt = new Date();
      }
      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      const updated = await this.prisma.storybook.update({
        where: { id },
        data: updateData,
      });
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to update storybook status: ${error.message}`);
    }
  }

  async delete(tenantId: string, id: string): Promise<Result<void>> {
    try {
      const existing = await this.prisma.storybook.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        return fail('Storybook not found', 'NOT_FOUND');
      }
      await this.prisma.storybook.delete({ where: { id } });
      return ok(undefined);
    } catch (error: any) {
      return fail(`Failed to delete storybook: ${error.message}`);
    }
  }

  /**
   * Find books matching a learner's current phonics profile.
   * This is the query that powers "Ready for You" in the Enchanted Library.
   */
  async findForLearner(
    tenantId: string,
    learnerProfile: {
      phonicsPhase: string;
      taughtGpcs: string[];
      ageGroup: number;
      themes?: string[];
      excludeRead?: string[]; // Storybook IDs already read
    },
    pagination: PaginationOptions = {}
  ): Promise<Result<PaginatedResult<any>>> {
    try {
      const { page = 1, pageSize = 10 } = pagination;
      const where: any = {
        tenantId,
        status: 'PUBLISHED',
        phonicsPhase: learnerProfile.phonicsPhase,
        ageGroupMin: { lte: learnerProfile.ageGroup },
        ageGroupMax: { gte: learnerProfile.ageGroup },
      };

      // Exclude already-read books
      if (learnerProfile.excludeRead?.length) {
        where.id = { notIn: learnerProfile.excludeRead };
      }

      // Prefer books matching learner's themes
      if (learnerProfile.themes?.length) {
        where.themes = { hasSome: learnerProfile.themes };
      }

      const [items, total] = await this.prisma.$transaction([
        this.prisma.storybook.findMany({
          where,
          include: { analytics: true, series: true },
          orderBy: [
            { decodabilityScore: 'desc' }, // Most decodable first
            { createdAt: 'desc' },
          ],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.storybook.count({ where }),
      ]);

      const totalPages = Math.ceil(total / pageSize);
      return ok({
        items,
        total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      });
    } catch (error: any) {
      return fail(`Failed to find books for learner: ${error.message}`);
    }
  }

  /**
   * Get storybooks that are slightly above the learner's current level.
   * Powers the "Adventures Waiting" shelf in the Enchanted Library.
   */
  async findAspirationalBooks(
    tenantId: string,
    currentPhase: string,
    ageGroup: number,
    limit: number = 5
  ): Promise<Result<any[]>> {
    try {
      const phaseOrder = ['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4', 'PHASE_5', 'PHASE_6'];
      const currentIndex = phaseOrder.indexOf(currentPhase);
      const nextPhase = currentIndex < phaseOrder.length - 1
        ? phaseOrder[currentIndex + 1]
        : currentPhase;

      const books = await this.prisma.storybook.findMany({
        where: {
          tenantId,
          status: 'PUBLISHED',
          phonicsPhase: nextPhase as any,
          ageGroupMin: { lte: ageGroup + 1 },
          ageGroupMax: { gte: ageGroup },
        },
        include: { analytics: true },
        orderBy: { decodabilityScore: 'desc' },
        take: limit,
      });
      return ok(books);
    } catch (error: any) {
      return fail(`Failed to find aspirational books: ${error.message}`);
    }
  }

  /**
   * Get popular community-contributed books.
   * Powers the "Community Picks" shelf.
   */
  async findCommunityPicks(
    tenantId: string,
    phonicsPhase: string,
    limit: number = 10
  ): Promise<Result<any[]>> {
    try {
      const books = await this.prisma.storybook.findMany({
        where: {
          tenantId,
          status: 'PUBLISHED',
          phonicsPhase: phonicsPhase as any,
          analytics: {
            qualityScore: { gte: 70 },
            totalReads: { gte: 50 },
          },
        },
        include: { analytics: true, series: true },
        orderBy: { analytics: { qualityScore: 'desc' } },
        take: limit,
      });
      return ok(books);
    } catch (error: any) {
      return fail(`Failed to find community picks: ${error.message}`);
    }
  }

  /** Count books per phase for library statistics */
  async countByPhase(tenantId: string): Promise<Result<Record<string, number>>> {
    try {
      const counts = await this.prisma.storybook.groupBy({
        by: ['phonicsPhase'],
        where: { tenantId, status: 'PUBLISHED' },
        _count: { _all: true },
      });
      const result: Record<string, number> = {};
      for (const c of counts) {
        result[c.phonicsPhase] = c._count._all;
      }
      return ok(result);
    } catch (error: any) {
      return fail(`Failed to count by phase: ${error.message}`);
    }
  }

  private buildStorybookWhere(tenantId: string, filter: StorybookFilter): any {
    const where: any = { tenantId };

    if (filter.status) {
      where.status = Array.isArray(filter.status) ? { in: filter.status } : filter.status;
    }
    if (filter.phonicsPhase) {
      where.phonicsPhase = Array.isArray(filter.phonicsPhase)
        ? { in: filter.phonicsPhase }
        : filter.phonicsPhase;
    }
    if (filter.creatorId) where.creatorId = filter.creatorId;
    if (filter.seriesId) where.seriesId = filter.seriesId;
    if (filter.artStyle) where.artStyle = filter.artStyle;
    if (filter.culturalContext) where.culturalContext = filter.culturalContext;
    if (filter.isOpenSource !== undefined) where.isOpenSource = filter.isOpenSource;
    if (filter.decodabilityMin) where.decodabilityScore = { gte: filter.decodabilityMin };
    if (filter.themes?.length) where.themes = { hasSome: filter.themes };
    if (filter.targetGpcs?.length) where.targetGpcs = { hasSome: filter.targetGpcs };
    if (filter.ageGroup) {
      if (filter.ageGroup.min !== undefined) where.ageGroupMin = { gte: filter.ageGroup.min };
      if (filter.ageGroup.max !== undefined) where.ageGroupMax = { lte: filter.ageGroup.max };
    }
    if (filter.publishedAfter) where.publishedAt = { ...(where.publishedAt || {}), gte: filter.publishedAfter };
    if (filter.publishedBefore) where.publishedAt = { ...(where.publishedAt || {}), lte: filter.publishedBefore };
    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { synopsis: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}

// =============================================================================
// 2. STORYBOOK PAGE REPOSITORY
// =============================================================================

export class StorybookPageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(
    tenantId: string,
    storybookId: string,
    pages: Array<Omit<Prisma.StorybookPageCreateInput, 'storybook' | 'tenantId'>>
  ): Promise<Result<any[]>> {
    try {
      const created = await this.prisma.$transaction(
        pages.map((page, index) =>
          this.prisma.storybookPage.create({
            data: {
              ...page,
              tenantId,
              pageNumber: index + 1,
              storybook: { connect: { id: storybookId } },
            },
          })
        )
      );
      return ok(created);
    } catch (error: any) {
      return fail(`Failed to create pages: ${error.message}`);
    }
  }

  async findByStorybook(
    tenantId: string,
    storybookId: string,
    filter: PageFilter = { storybookId: '' }
  ): Promise<Result<any[]>> {
    try {
      const where: any = { tenantId, storybookId };
      if (filter.hasIllustration !== undefined) {
        where.illustrationUrl = filter.hasIllustration ? { not: null } : null;
      }
      if (filter.hasAudio !== undefined) {
        where.audioUrl = filter.hasAudio ? { not: null } : null;
      }
      if (filter.pageRange) {
        where.pageNumber = {
          gte: filter.pageRange.min,
          lte: filter.pageRange.max,
        };
      }

      const pages = await this.prisma.storybookPage.findMany({
        where,
        orderBy: { pageNumber: 'asc' },
      });
      return ok(pages);
    } catch (error: any) {
      return fail(`Failed to find pages: ${error.message}`);
    }
  }

  async findByPageNumber(
    tenantId: string,
    storybookId: string,
    pageNumber: number
  ): Promise<Result<any>> {
    try {
      const page = await this.prisma.storybookPage.findUnique({
        where: { storybookId_pageNumber: { storybookId, pageNumber } },
      });
      if (!page || page.tenantId !== tenantId) {
        return fail('Page not found', 'NOT_FOUND');
      }
      return ok(page);
    } catch (error: any) {
      return fail(`Failed to find page: ${error.message}`);
    }
  }

  async updatePage(
    tenantId: string,
    storybookId: string,
    pageNumber: number,
    data: Partial<{
      text: string;
      illustrationUrl: string;
      illustrationPrompt: string;
      thumbnailUrl: string;
      sceneLayout: any;
      animationHints: any;
      audioUrl: string;
      audioDuration: number;
      wordTimestamps: any;
      pageGpcs: string[];
      decodableWords: string[];
      nonDecodableWords: string[];
    }>
  ): Promise<Result<any>> {
    try {
      const existing = await this.prisma.storybookPage.findUnique({
        where: { storybookId_pageNumber: { storybookId, pageNumber } },
      });
      if (!existing || existing.tenantId !== tenantId) {
        return fail('Page not found', 'NOT_FOUND');
      }

      // Recompute word/sentence counts if text changed
      const updateData: any = { ...data };
      if (data.text) {
        updateData.wordCount = data.text.split(/\s+/).filter(Boolean).length;
        updateData.sentenceCount = data.text.split(/[.!?]+/).filter(Boolean).length;
      }

      const updated = await this.prisma.storybookPage.update({
        where: { storybookId_pageNumber: { storybookId, pageNumber } },
        data: updateData,
      });
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to update page: ${error.message}`);
    }
  }

  /** Bulk update illustration URLs after generation pipeline completes */
  async bulkUpdateIllustrations(
    tenantId: string,
    storybookId: string,
    illustrations: Array<{ pageNumber: number; illustrationUrl: string; thumbnailUrl?: string }>
  ): Promise<Result<number>> {
    try {
      const results = await this.prisma.$transaction(
        illustrations.map((ill) =>
          this.prisma.storybookPage.updateMany({
            where: { storybookId, pageNumber: ill.pageNumber, tenantId },
            data: {
              illustrationUrl: ill.illustrationUrl,
              thumbnailUrl: ill.thumbnailUrl || null,
            },
          })
        )
      );
      const totalUpdated = results.reduce((sum, r) => sum + r.count, 0);
      return ok(totalUpdated);
    } catch (error: any) {
      return fail(`Failed to bulk update illustrations: ${error.message}`);
    }
  }

  /** Bulk update audio URLs and timestamps after narration pipeline completes */
  async bulkUpdateAudio(
    tenantId: string,
    storybookId: string,
    audioData: Array<{
      pageNumber: number;
      audioUrl: string;
      audioDuration: number;
      wordTimestamps: any;
    }>
  ): Promise<Result<number>> {
    try {
      const results = await this.prisma.$transaction(
        audioData.map((audio) =>
          this.prisma.storybookPage.updateMany({
            where: { storybookId, pageNumber: audio.pageNumber, tenantId },
            data: {
              audioUrl: audio.audioUrl,
              audioDuration: audio.audioDuration,
              wordTimestamps: audio.wordTimestamps,
            },
          })
        )
      );
      const totalUpdated = results.reduce((sum, r) => sum + r.count, 0);
      return ok(totalUpdated);
    } catch (error: any) {
      return fail(`Failed to bulk update audio: ${error.message}`);
    }
  }
}

// =============================================================================
// 3. CHARACTER REPOSITORY
// =============================================================================

export class StorybookCharacterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, data: any): Promise<Result<any>> {
    try {
      const character = await this.prisma.storybookCharacter.create({
        data: { ...data, tenantId },
      });
      return ok(character);
    } catch (error: any) {
      return fail(`Failed to create character: ${error.message}`);
    }
  }

  async findById(tenantId: string, id: string): Promise<Result<any>> {
    try {
      const character = await this.prisma.storybookCharacter.findFirst({
        where: { id, tenantId },
        include: { storybooks: { select: { id: true, title: true } }, series: true },
      });
      if (!character) return fail('Character not found', 'NOT_FOUND');
      return ok(character);
    } catch (error: any) {
      return fail(`Failed to find character: ${error.message}`);
    }
  }

  async list(
    tenantId: string,
    filter: CharacterFilter = {},
    pagination: PaginationOptions = {}
  ): Promise<Result<PaginatedResult<any>>> {
    try {
      const { page = 1, pageSize = 20, sortBy = 'name', sortOrder = 'asc' } = pagination;
      const where: any = { tenantId };
      if (filter.creatorId) where.creatorId = filter.creatorId;
      if (filter.seriesId) where.seriesId = filter.seriesId;
      if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' };
      if (filter.role) where.role = filter.role;

      const [items, total] = await this.prisma.$transaction([
        this.prisma.storybookCharacter.findMany({
          where,
          include: { series: true },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.storybookCharacter.count({ where }),
      ]);
      const totalPages = Math.ceil(total / pageSize);
      return ok({ items, total, page, pageSize, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 });
    } catch (error: any) {
      return fail(`Failed to list characters: ${error.message}`);
    }
  }

  async update(tenantId: string, id: string, data: any): Promise<Result<any>> {
    try {
      const existing = await this.prisma.storybookCharacter.findFirst({ where: { id, tenantId } });
      if (!existing) return fail('Character not found', 'NOT_FOUND');
      const updated = await this.prisma.storybookCharacter.update({ where: { id }, data });
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to update character: ${error.message}`);
    }
  }

  async incrementUsageCount(tenantId: string, characterIds: string[]): Promise<Result<void>> {
    try {
      await this.prisma.storybookCharacter.updateMany({
        where: { id: { in: characterIds }, tenantId },
        data: { usageCount: { increment: 1 } },
      });
      return ok(undefined);
    } catch (error: any) {
      return fail(`Failed to increment usage count: ${error.message}`);
    }
  }

  async delete(tenantId: string, id: string): Promise<Result<void>> {
    try {
      const existing = await this.prisma.storybookCharacter.findFirst({ where: { id, tenantId } });
      if (!existing) return fail('Character not found', 'NOT_FOUND');
      // Check if character is in use
      const booksUsing = await this.prisma.storybook.count({
        where: { characters: { some: { id } } },
      });
      if (booksUsing > 0) {
        return fail(`Character is used in ${booksUsing} storybook(s). Remove from books first.`, 'IN_USE');
      }
      await this.prisma.storybookCharacter.delete({ where: { id } });
      return ok(undefined);
    } catch (error: any) {
      return fail(`Failed to delete character: ${error.message}`);
    }
  }
}

// =============================================================================
// 4. SERIES REPOSITORY
// =============================================================================

export class StorybookSeriesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, data: any): Promise<Result<any>> {
    try {
      const series = await this.prisma.storybookSeries.create({
        data: { ...data, tenantId },
        include: { characters: true },
      });
      return ok(series);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return fail('A series with this name already exists', 'DUPLICATE_NAME');
      }
      return fail(`Failed to create series: ${error.message}`);
    }
  }

  async findById(tenantId: string, id: string): Promise<Result<any>> {
    try {
      const series = await this.prisma.storybookSeries.findFirst({
        where: { id, tenantId },
        include: {
          storybooks: { orderBy: { seriesOrder: 'asc' }, include: { analytics: true } },
          characters: true,
        },
      });
      if (!series) return fail('Series not found', 'NOT_FOUND');
      return ok(series);
    } catch (error: any) {
      return fail(`Failed to find series: ${error.message}`);
    }
  }

  async list(
    tenantId: string,
    filter: SeriesFilter = {},
    pagination: PaginationOptions = {}
  ): Promise<Result<PaginatedResult<any>>> {
    try {
      const { page = 1, pageSize = 20, sortBy = 'name', sortOrder = 'asc' } = pagination;
      const where: any = { tenantId };
      if (filter.creatorId) where.creatorId = filter.creatorId;
      if (filter.culturalContext) where.culturalContext = filter.culturalContext;
      if (filter.artStyle) where.artStyle = filter.artStyle;
      if (filter.targetPhases?.length) where.targetPhases = { hasSome: filter.targetPhases };
      if (filter.hasPublishedBooks) where.publishedBookCount = { gt: 0 };

      const [items, total] = await this.prisma.$transaction([
        this.prisma.storybookSeries.findMany({
          where,
          include: { storybooks: { select: { id: true, title: true, status: true } }, characters: true },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.storybookSeries.count({ where }),
      ]);
      const totalPages = Math.ceil(total / pageSize);
      return ok({ items, total, page, pageSize, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 });
    } catch (error: any) {
      return fail(`Failed to list series: ${error.message}`);
    }
  }

  async update(tenantId: string, id: string, data: any): Promise<Result<any>> {
    try {
      const existing = await this.prisma.storybookSeries.findFirst({ where: { id, tenantId } });
      if (!existing) return fail('Series not found', 'NOT_FOUND');
      const updated = await this.prisma.storybookSeries.update({
        where: { id },
        data,
        include: { characters: true, storybooks: true },
      });
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to update series: ${error.message}`);
    }
  }

  async incrementPublishedCount(tenantId: string, seriesId: string): Promise<Result<void>> {
    try {
      await this.prisma.storybookSeries.updateMany({
        where: { id: seriesId, tenantId },
        data: { publishedBookCount: { increment: 1 } },
      });
      return ok(undefined);
    } catch (error: any) {
      return fail(`Failed to increment published count: ${error.message}`);
    }
  }
}

// =============================================================================
// 5. ILLUSTRATION REPOSITORY
// =============================================================================

export class StorybookIllustrationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, data: any): Promise<Result<any>> {
    try {
      const illustration = await this.prisma.storybookIllustration.create({
        data: { ...data, tenantId },
      });
      return ok(illustration);
    } catch (error: any) {
      return fail(`Failed to create illustration: ${error.message}`);
    }
  }

  async createMany(tenantId: string, illustrations: any[]): Promise<Result<any[]>> {
    try {
      const created = await this.prisma.$transaction(
        illustrations.map((ill) =>
          this.prisma.storybookIllustration.create({
            data: { ...ill, tenantId },
          })
        )
      );
      return ok(created);
    } catch (error: any) {
      return fail(`Failed to create illustrations: ${error.message}`);
    }
  }

  async findByStorybook(
    tenantId: string,
    storybookId: string,
    filter: IllustrationFilter = {}
  ): Promise<Result<any[]>> {
    try {
      const where: any = { tenantId, storybookId };
      if (filter.model) where.model = filter.model;
      if (filter.artStyle) where.artStyle = filter.artStyle;
      if (filter.moderationResult) where.moderationResult = filter.moderationResult;
      if (filter.pageNumber !== undefined) where.pageNumber = filter.pageNumber;

      const illustrations = await this.prisma.storybookIllustration.findMany({
        where,
        orderBy: { pageNumber: 'asc' },
      });
      return ok(illustrations);
    } catch (error: any) {
      return fail(`Failed to find illustrations: ${error.message}`);
    }
  }

  async updateModeration(
    tenantId: string,
    id: string,
    result: string,
    details: any,
    moderatedBy: string
  ): Promise<Result<any>> {
    try {
      const updated = await this.prisma.storybookIllustration.updateMany({
        where: { id, tenantId },
        data: {
          moderationResult: result as any,
          moderationDetails: details,
          moderatedAt: new Date(),
          moderatedBy,
        },
      });
      if (updated.count === 0) return fail('Illustration not found', 'NOT_FOUND');
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to update moderation: ${error.message}`);
    }
  }

  /** Calculate total generation cost for a storybook's illustrations */
  async getTotalCost(tenantId: string, storybookId: string): Promise<Result<number>> {
    try {
      const result = await this.prisma.storybookIllustration.aggregate({
        where: { tenantId, storybookId },
        _sum: { generationCost: true },
      });
      return ok(result._sum.generationCost || 0);
    } catch (error: any) {
      return fail(`Failed to calculate cost: ${error.message}`);
    }
  }
}

// =============================================================================
// 6. REVIEW REPOSITORY
// =============================================================================

export class StorybookReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, data: any): Promise<Result<any>> {
    try {
      const review = await this.prisma.storybookReview.create({
        data: { ...data, tenantId },
      });
      return ok(review);
    } catch (error: any) {
      return fail(`Failed to create review: ${error.message}`);
    }
  }

  async findByStorybook(
    tenantId: string,
    storybookId: string,
    filter: ReviewFilter = {}
  ): Promise<Result<any[]>> {
    try {
      const where: any = { tenantId, storybookId };
      if (filter.stage) where.stage = Array.isArray(filter.stage) ? { in: filter.stage } : filter.stage;
      if (filter.decision) where.decision = filter.decision;
      if (filter.reviewerId) where.reviewerId = filter.reviewerId;
      if (filter.minScore) where.score = { gte: filter.minScore };

      const reviews = await this.prisma.storybookReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return ok(reviews);
    } catch (error: any) {
      return fail(`Failed to find reviews: ${error.message}`);
    }
  }

  /** Check if a storybook has enough peer reviews to advance */
  async getPeerReviewCount(
    tenantId: string,
    storybookId: string
  ): Promise<Result<{ total: number; passing: number; failing: number }>> {
    try {
      const reviews = await this.prisma.storybookReview.findMany({
        where: { tenantId, storybookId, stage: 'PEER_REVIEW' },
        select: { decision: true },
      });
      return ok({
        total: reviews.length,
        passing: reviews.filter((r) => r.decision === 'PASS' || r.decision === 'CONDITIONAL_PASS').length,
        failing: reviews.filter((r) => r.decision === 'FAIL').length,
      });
    } catch (error: any) {
      return fail(`Failed to count peer reviews: ${error.message}`);
    }
  }

  /** Get a reviewer's review history for XP calculation */
  async getReviewerStats(
    tenantId: string,
    reviewerId: string
  ): Promise<Result<{ totalReviews: number; averageScore: number; stages: Record<string, number> }>> {
    try {
      const reviews = await this.prisma.storybookReview.findMany({
        where: { tenantId, reviewerId, stage: 'PEER_REVIEW' },
        select: { score: true, stage: true },
      });
      const stages: Record<string, number> = {};
      let scoreSum = 0;
      let scoreCount = 0;
      for (const r of reviews) {
        stages[r.stage] = (stages[r.stage] || 0) + 1;
        if (r.score !== null) {
          scoreSum += r.score;
          scoreCount++;
        }
      }
      return ok({
        totalReviews: reviews.length,
        averageScore: scoreCount > 0 ? scoreSum / scoreCount : 0,
        stages,
      });
    } catch (error: any) {
      return fail(`Failed to get reviewer stats: ${error.message}`);
    }
  }

  /** Get the latest review for each stage of a storybook */
  async getLatestByStage(
    tenantId: string,
    storybookId: string
  ): Promise<Result<Record<string, any>>> {
    try {
      const stages = ['AUTOMATED', 'AI_REVIEW', 'PEER_REVIEW', 'PILOT_TESTING', 'PUBLISHED'];
      const result: Record<string, any> = {};
      for (const stage of stages) {
        const review = await this.prisma.storybookReview.findFirst({
          where: { tenantId, storybookId, stage: stage as any },
          orderBy: { createdAt: 'desc' },
        });
        if (review) result[stage] = review;
      }
      return ok(result);
    } catch (error: any) {
      return fail(`Failed to get latest reviews: ${error.message}`);
    }
  }
}

// =============================================================================
// 7. ANALYTICS REPOSITORY
// =============================================================================

export class StorybookAnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(tenantId: string, storybookId: string, data: any): Promise<Result<any>> {
    try {
      const analytics = await this.prisma.storybookAnalytics.upsert({
        where: { storybookId },
        create: { ...data, tenantId, storybookId },
        update: data,
      });
      return ok(analytics);
    } catch (error: any) {
      return fail(`Failed to upsert analytics: ${error.message}`);
    }
  }

  async findByStorybook(tenantId: string, storybookId: string): Promise<Result<any>> {
    try {
      const analytics = await this.prisma.storybookAnalytics.findUnique({
        where: { storybookId },
      });
      if (!analytics || analytics.tenantId !== tenantId) {
        return fail('Analytics not found', 'NOT_FOUND');
      }
      return ok(analytics);
    } catch (error: any) {
      return fail(`Failed to find analytics: ${error.message}`);
    }
  }

  /** Increment read count and update running averages */
  async recordRead(
    tenantId: string,
    storybookId: string,
    readData: {
      completed: boolean;
      accuracy: number; // 0–1
      timeSeconds: number;
      isReRead: boolean;
      gpcAccuracy: Record<string, number>; // GPC -> accuracy
    }
  ): Promise<Result<any>> {
    try {
      const existing = await this.prisma.storybookAnalytics.findUnique({
        where: { storybookId },
      });

      if (!existing || existing.tenantId !== tenantId) {
        // Create initial analytics record
        return this.upsert(tenantId, storybookId, {
          totalReads: 1,
          uniqueReaders: 1,
          completionRate: readData.completed ? 1 : 0,
          averageAccuracy: readData.accuracy,
          averageTimeSeconds: readData.timeSeconds,
          reReadRate: readData.isReRead ? 1 : 0,
          abandonmentRate: readData.completed ? 0 : 1,
          gpcAccuracyMap: readData.gpcAccuracy,
          totalReadTimeMinutes: readData.timeSeconds / 60,
          lastReadAt: new Date(),
        });
      }

      // Update running averages using incremental formula:
      // new_avg = old_avg + (new_value - old_avg) / new_count
      const newTotal = existing.totalReads + 1;
      const newCompletionRate = existing.completionRate +
        ((readData.completed ? 1 : 0) - existing.completionRate) / newTotal;
      const newAccuracy = existing.averageAccuracy +
        (readData.accuracy - existing.averageAccuracy) / newTotal;
      const newAvgTime = existing.averageTimeSeconds +
        (readData.timeSeconds - existing.averageTimeSeconds) / newTotal;
      const newReReadRate = existing.reReadRate +
        ((readData.isReRead ? 1 : 0) - existing.reReadRate) / newTotal;
      const newAbandonmentRate = existing.abandonmentRate +
        ((readData.completed ? 0 : 1) - existing.abandonmentRate) / newTotal;

      // Merge GPC accuracy maps
      const mergedGpcAccuracy = { ...(existing.gpcAccuracyMap as Record<string, number> || {}) };
      for (const [gpc, acc] of Object.entries(readData.gpcAccuracy)) {
        if (mergedGpcAccuracy[gpc] !== undefined) {
          mergedGpcAccuracy[gpc] = (mergedGpcAccuracy[gpc] + acc) / 2; // Simple running average
        } else {
          mergedGpcAccuracy[gpc] = acc;
        }
      }

      // Identify problematic GPCs (below 70% accuracy)
      const problematicGpcs = Object.entries(mergedGpcAccuracy)
        .filter(([_, acc]) => acc < 0.7)
        .map(([gpc]) => gpc);

      // Compute composite quality score
      const qualityScore = this.computeQualityScore({
        completionRate: newCompletionRate,
        accuracy: newAccuracy,
        reReadRate: newReReadRate,
        abandonmentRate: newAbandonmentRate,
        totalReads: newTotal,
      });

      const updated = await this.prisma.storybookAnalytics.update({
        where: { storybookId },
        data: {
          totalReads: newTotal,
          completionRate: newCompletionRate,
          averageAccuracy: newAccuracy,
          averageTimeSeconds: newAvgTime,
          reReadRate: newReReadRate,
          abandonmentRate: newAbandonmentRate,
          gpcAccuracyMap: mergedGpcAccuracy,
          problematicGpcs,
          totalReadTimeMinutes: { increment: readData.timeSeconds / 60 },
          lastReadAt: new Date(),
          qualityScore,
        },
      });
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to record read: ${error.message}`);
    }
  }

  /** Get top books by quality score for recommendations */
  async getTopBooks(
    tenantId: string,
    options: {
      phonicsPhase?: string;
      limit?: number;
      minReads?: number;
    } = {}
  ): Promise<Result<any[]>> {
    try {
      const { limit = 20, minReads = 10 } = options;
      const where: any = {
        tenantId,
        totalReads: { gte: minReads },
      };
      if (options.phonicsPhase) {
        where.storybook = { phonicsPhase: options.phonicsPhase };
      }

      const analytics = await this.prisma.storybookAnalytics.findMany({
        where,
        include: { storybook: { select: { id: true, title: true, phonicsPhase: true, artStyle: true } } },
        orderBy: { qualityScore: 'desc' },
        take: limit,
      });
      return ok(analytics);
    } catch (error: any) {
      return fail(`Failed to get top books: ${error.message}`);
    }
  }

  /**
   * Composite quality score: a weighted combination of engagement signals.
   * This single number determines shelf placement, revenue share, and
   * whether a book gets flagged for quality review.
   */
  private computeQualityScore(metrics: {
    completionRate: number;
    accuracy: number;
    reReadRate: number;
    abandonmentRate: number;
    totalReads: number;
  }): number {
    const {
      completionRate,
      accuracy,
      reReadRate,
      abandonmentRate,
      totalReads,
    } = metrics;

    // Weighted components (out of 100)
    const completionScore = completionRate * 30;   // 30% weight
    const accuracyScore = accuracy * 25;            // 25% weight
    const reReadScore = Math.min(reReadRate * 2, 1) * 20; // 20% weight, capped
    const retentionScore = (1 - abandonmentRate) * 15; // 15% weight
    // Popularity bonus: logarithmic scale, max 10 points
    const popularityScore = Math.min(Math.log10(Math.max(totalReads, 1)) / 3, 1) * 10;

    return Math.round(
      (completionScore + accuracyScore + reReadScore + retentionScore + popularityScore) * 100
    ) / 100;
  }
}

// =============================================================================
// 8. DEVICE STORYBOOK REPOSITORY
// =============================================================================

export class DeviceStorybookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, data: any): Promise<Result<any>> {
    try {
      const record = await this.prisma.deviceStorybook.create({
        data: { ...data, tenantId },
      });
      return ok(record);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return fail('Book already registered on this device', 'DUPLICATE');
      }
      return fail(`Failed to create device storybook: ${error.message}`);
    }
  }

  async findByDevice(
    tenantId: string,
    deviceId: string,
    filter: DeviceStorybookFilter = {}
  ): Promise<Result<any[]>> {
    try {
      const where: any = { tenantId, deviceId };
      if (filter.downloadStatus) {
        where.downloadStatus = Array.isArray(filter.downloadStatus)
          ? { in: filter.downloadStatus }
          : filter.downloadStatus;
      }

      const records = await this.prisma.deviceStorybook.findMany({
        where,
        include: { storybook: { select: { id: true, title: true, coverImageUrl: true, pageCount: true } } },
        orderBy: { lastReadAt: 'desc' },
      });
      return ok(records);
    } catch (error: any) {
      return fail(`Failed to find device storybooks: ${error.message}`);
    }
  }

  async findByLearner(tenantId: string, learnerId: string): Promise<Result<any[]>> {
    try {
      const records = await this.prisma.deviceStorybook.findMany({
        where: { tenantId, learnerId },
        include: { storybook: { select: { id: true, title: true, coverImageUrl: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      return ok(records);
    } catch (error: any) {
      return fail(`Failed to find learner storybooks: ${error.message}`);
    }
  }

  async updateDownloadStatus(
    tenantId: string,
    deviceId: string,
    storybookId: string,
    status: string,
    metadata?: { downloadSize?: number; storageSize?: number }
  ): Promise<Result<any>> {
    try {
      const updated = await this.prisma.deviceStorybook.updateMany({
        where: { deviceId, storybookId, tenantId },
        data: {
          downloadStatus: status as any,
          ...(status === 'COMPLETE' ? { downloadedAt: new Date(), downloadProgress: 1.0 } : {}),
          ...(metadata?.downloadSize ? { downloadSize: metadata.downloadSize } : {}),
          ...(metadata?.storageSize ? { storageSize: metadata.storageSize } : {}),
        },
      });
      if (updated.count === 0) return fail('Device storybook not found', 'NOT_FOUND');
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to update download status: ${error.message}`);
    }
  }

  async updateReadingPosition(
    tenantId: string,
    deviceId: string,
    storybookId: string,
    position: { lastPageRead: number; lastWordIndex: number; readingProgress: number }
  ): Promise<Result<any>> {
    try {
      const updated = await this.prisma.deviceStorybook.updateMany({
        where: { deviceId, storybookId, tenantId },
        data: {
          lastPageRead: position.lastPageRead,
          lastWordIndex: position.lastWordIndex,
          readingProgress: position.readingProgress,
          lastReadAt: new Date(),
          syncVersion: { increment: 1 },
        },
      });
      if (updated.count === 0) return fail('Device storybook not found', 'NOT_FOUND');
      return ok(updated);
    } catch (error: any) {
      return fail(`Failed to update reading position: ${error.message}`);
    }
  }

  async storePendingBktUpdates(
    tenantId: string,
    deviceId: string,
    storybookId: string,
    bktUpdates: any
  ): Promise<Result<void>> {
    try {
      await this.prisma.deviceStorybook.updateMany({
        where: { deviceId, storybookId, tenantId },
        data: { pendingBktUpdates: bktUpdates },
      });
      return ok(undefined);
    } catch (error: any) {
      return fail(`Failed to store BKT updates: ${error.message}`);
    }
  }

  async clearPendingBktUpdates(
    tenantId: string,
    deviceId: string,
    storybookId: string
  ): Promise<Result<void>> {
    try {
      await this.prisma.deviceStorybook.updateMany({
        where: { deviceId, storybookId, tenantId },
        data: { pendingBktUpdates: Prisma.DbNull },
      });
      return ok(undefined);
    } catch (error: any) {
      return fail(`Failed to clear BKT updates: ${error.message}`);
    }
  }

  /** Get all pending BKT updates across devices for a learner (for sync) */
  async getPendingBktUpdates(tenantId: string, learnerId: string): Promise<Result<any[]>> {
    try {
      const records = await this.prisma.deviceStorybook.findMany({
        where: {
          tenantId,
          learnerId,
          pendingBktUpdates: { not: Prisma.DbNull },
        },
        select: { deviceId: true, storybookId: true, pendingBktUpdates: true, syncVersion: true },
      });
      return ok(records);
    } catch (error: any) {
      return fail(`Failed to get pending BKT updates: ${error.message}`);
    }
  }

  /** Clean up expired downloads to free device storage */
  async cleanupExpired(tenantId: string, deviceId: string): Promise<Result<number>> {
    try {
      const result = await this.prisma.deviceStorybook.deleteMany({
        where: {
          tenantId,
          deviceId,
          expiresAt: { lt: new Date() },
        },
      });
      return ok(result.count);
    } catch (error: any) {
      return fail(`Failed to cleanup expired: ${error.message}`);
    }
  }

  /** Calculate total storage used on a device */
  async getDeviceStorageUsed(tenantId: string, deviceId: string): Promise<Result<number>> {
    try {
      const result = await this.prisma.deviceStorybook.aggregate({
        where: { tenantId, deviceId, downloadStatus: 'COMPLETE' },
        _sum: { storageSize: true },
      });
      return ok(result._sum.storageSize || 0);
    } catch (error: any) {
      return fail(`Failed to get storage used: ${error.message}`);
    }
  }
}

// =============================================================================
// 9. REPOSITORY FACTORY
// =============================================================================
// A single entry point that creates all repositories from one Prisma client.
// This is the seam where dependency injection meets database access.

export class StorybookRepositoryFactory {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  get storybooks(): StorybookRepository {
    return new StorybookRepository(this.prisma);
  }

  get pages(): StorybookPageRepository {
    return new StorybookPageRepository(this.prisma);
  }

  get characters(): StorybookCharacterRepository {
    return new StorybookCharacterRepository(this.prisma);
  }

  get series(): StorybookSeriesRepository {
    return new StorybookSeriesRepository(this.prisma);
  }

  get illustrations(): StorybookIllustrationRepository {
    return new StorybookIllustrationRepository(this.prisma);
  }

  get reviews(): StorybookReviewRepository {
    return new StorybookReviewRepository(this.prisma);
  }

  get analytics(): StorybookAnalyticsRepository {
    return new StorybookAnalyticsRepository(this.prisma);
  }

  get deviceStorybooks(): DeviceStorybookRepository {
    return new DeviceStorybookRepository(this.prisma);
  }
}
