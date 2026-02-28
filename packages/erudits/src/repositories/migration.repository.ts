/**
 * ============================================================================
 * Migration Repositories — Prisma Implementation
 * ============================================================================
 *
 * Data access for the Squarespace → Scholarly migration pipeline.
 *
 * Two models:
 *   PlatformMigration — the migration job itself (status, progress, DNS)
 *   MigrationContentItem — individual pages, products, posts being migrated
 *
 * @module erudits/repositories/migration
 */

import type {
  PlatformMigration, MigrationContentItem,
  MigrationRepository, MigrationContentRepository,
  MigrationError, MigrationWarning,
StrictPartial,
} from '../types/erudits.types';

import {
  PrismaClientLike,
  toPrismaEnum, fromPrismaEnumToSnake,
  jsonOrUndefined,
} from './shared';

// ============================================================================
// PLATFORM MIGRATION REPOSITORY
// ============================================================================

export class PrismaMigrationRepository implements MigrationRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, migration: PlatformMigration): Promise<PlatformMigration> {
    const row = await this.prisma.platformMigration.create({
      data: {
        id: migration.id,
        tenantId,
        source: toPrismaEnum(migration.source),
        sourceUrl: migration.sourceUrl,
        sourceSiteId: migration.sourceSiteId,
        ownerId: migration.ownerId,
        ownerEmail: migration.ownerEmail,
        status: toPrismaEnum(migration.status),
        currentStep: migration.currentStep,
        progressPercent: migration.progressPercent,
        pagesFound: migration.pagesFound,
        productsFound: migration.productsFound,
        membersFound: migration.membersFound,
        imagesFound: migration.imagesFound,
        postsFound: migration.postsFound,
        pagesImported: migration.pagesImported,
        productsImported: migration.productsImported,
        membersImported: migration.membersImported,
        imagesImported: migration.imagesImported,
        postsImported: migration.postsImported,
        urlMappings: migration.urlMappings ?? undefined,
        customDomain: migration.customDomain,
        dnsVerified: migration.dnsVerified,
        sslProvisioned: migration.sslProvisioned,
        extractionStartedAt: migration.extractionStartedAt,
        extractionCompletedAt: migration.extractionCompletedAt,
        importStartedAt: migration.importStartedAt,
        importCompletedAt: migration.importCompletedAt,
        cutoverAt: migration.cutoverAt,
        errors: migration.errors ?? undefined,
        warnings: migration.warnings ?? undefined,
      },
    });

    return this.mapFromPrisma(row);
  }

  async findById(tenantId: string, id: string): Promise<PlatformMigration | null> {
    const row = await this.prisma.platformMigration.findFirst({
      where: { id, tenantId },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findByOwner(tenantId: string, ownerId: string): Promise<PlatformMigration[]> {
    const rows = await this.prisma.platformMigration.findMany({
      where: { tenantId, ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.mapFromPrisma(r));
  }

  async update(_tenantId: string, id: string, updates: StrictPartial<PlatformMigration>): Promise<PlatformMigration> {
    const data: Record<string, unknown> = {};

    // Map each field, converting enums where needed
    if (updates.status !== undefined) data.status = toPrismaEnum(updates.status);
    if (updates.currentStep !== undefined) data.currentStep = updates.currentStep;
    if (updates.progressPercent !== undefined) data.progressPercent = updates.progressPercent;
    if (updates.pagesFound !== undefined) data.pagesFound = updates.pagesFound;
    if (updates.productsFound !== undefined) data.productsFound = updates.productsFound;
    if (updates.membersFound !== undefined) data.membersFound = updates.membersFound;
    if (updates.imagesFound !== undefined) data.imagesFound = updates.imagesFound;
    if (updates.postsFound !== undefined) data.postsFound = updates.postsFound;
    if (updates.pagesImported !== undefined) data.pagesImported = updates.pagesImported;
    if (updates.productsImported !== undefined) data.productsImported = updates.productsImported;
    if (updates.membersImported !== undefined) data.membersImported = updates.membersImported;
    if (updates.imagesImported !== undefined) data.imagesImported = updates.imagesImported;
    if (updates.postsImported !== undefined) data.postsImported = updates.postsImported;
    if (updates.urlMappings !== undefined) data.urlMappings = updates.urlMappings;
    if (updates.customDomain !== undefined) data.customDomain = updates.customDomain;
    if (updates.dnsVerified !== undefined) data.dnsVerified = updates.dnsVerified;
    if (updates.sslProvisioned !== undefined) data.sslProvisioned = updates.sslProvisioned;
    if (updates.extractionStartedAt !== undefined) data.extractionStartedAt = updates.extractionStartedAt;
    if (updates.extractionCompletedAt !== undefined) data.extractionCompletedAt = updates.extractionCompletedAt;
    if (updates.importStartedAt !== undefined) data.importStartedAt = updates.importStartedAt;
    if (updates.importCompletedAt !== undefined) data.importCompletedAt = updates.importCompletedAt;
    if (updates.cutoverAt !== undefined) data.cutoverAt = updates.cutoverAt;
    if (updates.errors !== undefined) data.errors = updates.errors;
    if (updates.warnings !== undefined) data.warnings = updates.warnings;

    const row = await this.prisma.platformMigration.update({
      where: { id },
      data,
    });

    return this.mapFromPrisma(row);
  }

  // ── Mapper ──

  private mapFromPrisma(row: Record<string, unknown>): PlatformMigration {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
      source: fromPrismaEnumToSnake(row.source as string) as PlatformMigration['source'],
      sourceUrl: row.sourceUrl as string,
      sourceSiteId: row.sourceSiteId as string | undefined,
      ownerId: row.ownerId as string,
      ownerEmail: row.ownerEmail as string,
      status: fromPrismaEnumToSnake(row.status as string) as PlatformMigration['status'],
      currentStep: row.currentStep as string | undefined,
      progressPercent: row.progressPercent as number,
      pagesFound: row.pagesFound as number,
      productsFound: row.productsFound as number,
      membersFound: row.membersFound as number,
      imagesFound: row.imagesFound as number,
      postsFound: row.postsFound as number,
      pagesImported: row.pagesImported as number,
      productsImported: row.productsImported as number,
      membersImported: row.membersImported as number,
      imagesImported: row.imagesImported as number,
      postsImported: row.postsImported as number,
      urlMappings: jsonOrUndefined<Record<string, string>>(row.urlMappings),
      customDomain: row.customDomain as string | undefined,
      dnsVerified: row.dnsVerified as boolean,
      sslProvisioned: row.sslProvisioned as boolean,
      extractionStartedAt: row.extractionStartedAt as Date | undefined,
      extractionCompletedAt: row.extractionCompletedAt as Date | undefined,
      importStartedAt: row.importStartedAt as Date | undefined,
      importCompletedAt: row.importCompletedAt as Date | undefined,
      cutoverAt: row.cutoverAt as Date | undefined,
      errors: jsonOrUndefined<MigrationError[]>(row.errors),
      warnings: jsonOrUndefined<MigrationWarning[]>(row.warnings),
    };
  }
}

// ============================================================================
// MIGRATION CONTENT REPOSITORY
// ============================================================================

export class PrismaMigrationContentRepository implements MigrationContentRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async saveBatch(tenantId: string, items: MigrationContentItem[]): Promise<MigrationContentItem[]> {
    // Prisma createMany doesn't return records, so we use a transaction
    // with individual creates for reasonable batch sizes.
    const results = await this.prisma.$transaction(async (tx) => {
      const saved: Array<Record<string, unknown>> = [];
      for (const item of items) {
        const row = await tx.migrationContentItem.create({
          data: {
            id: item.id,
            tenantId,
            migrationId: item.migrationId,
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            sourceUrl: item.sourceUrl,
            sourceTitle: item.sourceTitle,
            sourceData: item.sourceData ?? undefined,
            targetType: item.targetType,
            targetId: item.targetId,
            targetUrl: item.targetUrl,
            status: item.status,
            errorMessage: item.errorMessage,
            requiresReview: item.requiresReview,
            reviewNotes: item.reviewNotes,
          },
        });
        saved.push(row);
      }
      return saved;
    }) as Array<Record<string, unknown>>;

    return results.map(r => this.mapFromPrisma(r));
  }

  async findByMigration(
    tenantId: string,
    migrationId: string,
    filter?: { sourceType?: string; status?: string },
  ): Promise<MigrationContentItem[]> {
    const where: Record<string, unknown> = { tenantId, migrationId };
    if (filter?.sourceType) where.sourceType = filter.sourceType;
    if (filter?.status) where.status = filter.status;

    const rows = await this.prisma.migrationContentItem.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return rows.map(r => this.mapFromPrisma(r));
  }

  async update(_tenantId: string, id: string, updates: StrictPartial<MigrationContentItem>): Promise<MigrationContentItem> {
    const data: Record<string, unknown> = {};

    if (updates.targetType !== undefined) data.targetType = updates.targetType;
    if (updates.targetId !== undefined) data.targetId = updates.targetId;
    if (updates.targetUrl !== undefined) data.targetUrl = updates.targetUrl;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.errorMessage !== undefined) data.errorMessage = updates.errorMessage;
    if (updates.requiresReview !== undefined) data.requiresReview = updates.requiresReview;
    if (updates.reviewNotes !== undefined) data.reviewNotes = updates.reviewNotes;
    if (updates.sourceData !== undefined) data.sourceData = updates.sourceData;

    const row = await this.prisma.migrationContentItem.update({
      where: { id },
      data,
    });

    return this.mapFromPrisma(row);
  }

  async updateBatch(
    _tenantId: string,
    updates: Array<{ id: string; updates: StrictPartial<MigrationContentItem> }>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const { id, updates: itemUpdates } of updates) {
        const data: Record<string, unknown> = {};
        if (itemUpdates.status !== undefined) data.status = itemUpdates.status;
        if (itemUpdates.targetType !== undefined) data.targetType = itemUpdates.targetType;
        if (itemUpdates.targetId !== undefined) data.targetId = itemUpdates.targetId;
        if (itemUpdates.targetUrl !== undefined) data.targetUrl = itemUpdates.targetUrl;
        if (itemUpdates.errorMessage !== undefined) data.errorMessage = itemUpdates.errorMessage;
        if (itemUpdates.requiresReview !== undefined) data.requiresReview = itemUpdates.requiresReview;

        if (Object.keys(data).length > 0) {
          await tx.migrationContentItem.update({ where: { id }, data });
        }
      }
    });
  }

  // ── Mapper ──

  private mapFromPrisma(row: Record<string, unknown>): MigrationContentItem {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      migrationId: row.migrationId as string,
      sourceType: row.sourceType as MigrationContentItem['sourceType'],
      sourceId: row.sourceId as string | undefined,
      sourceUrl: row.sourceUrl as string | undefined,
      sourceTitle: row.sourceTitle as string | undefined,
      sourceData: jsonOrUndefined<Record<string, unknown>>(row.sourceData),
      targetType: row.targetType as MigrationContentItem['targetType'],
      targetId: row.targetId as string | undefined,
      targetUrl: row.targetUrl as string | undefined,
      status: row.status as MigrationContentItem['status'],
      errorMessage: row.errorMessage as string | undefined,
      requiresReview: row.requiresReview as boolean,
      reviewNotes: row.reviewNotes as string | undefined,
    };
  }
}
