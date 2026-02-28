/**
 * ============================================================================
 * Resource Marketplace Repositories — Prisma Implementation
 * ============================================================================
 *
 * Data access for digital resources, purchases, and licences.
 *
 * @module erudits/repositories/marketplace
 */

import type {
  DigitalResource, ResourceFile, ResourcePurchase, ResourceLicence,
  ResourceRepository, PurchaseRepository, LicenceRepository,
  ResourceSearchRequest,
  ListFilter, PaginatedResult,
StrictPartial,
} from '../types/erudits.types';

import {
  PrismaClientLike,
  toPrismaEnum, fromPrismaEnumToSnake,
  paginationArgs, paginatedResult,
  jsonOrDefault,
} from './shared';

// ============================================================================
// DIGITAL RESOURCE REPOSITORY
// ============================================================================

export class PrismaResourceRepository implements ResourceRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, resource: DigitalResource): Promise<DigitalResource> {
    const row = await this.prisma.digitalResource.create({
      data: {
        id: resource.id,
        tenantId,
        authorId: resource.authorId,
        authorName: resource.authorName,
        title: resource.title,
        slug: resource.slug,
        description: resource.description,
        shortDescription: resource.shortDescription,
        coverImageUrl: resource.coverImageUrl,
        priceIndividualCents: resource.priceIndividualCents,
        priceSingleSchoolCents: resource.priceSingleSchoolCents,
        priceMultiSchoolCents: resource.priceMultiSchoolCents,
        currency: resource.currency,
        format: toPrismaEnum(resource.format),
        status: toPrismaEnum(resource.status),
        subjectArea: resource.subjectArea,
        yearLevels: resource.yearLevels,
        tags: resource.tags,
        featured: resource.featured,
        totalPurchases: resource.totalPurchases,
        totalRevenueCents: resource.totalRevenueCents,
        averageRating: resource.averageRating,
        ratingCount: resource.ratingCount,
        moderationStatus: resource.moderationStatus,
        previewPageCount: resource.previewPageCount,
        sampleFileUrl: resource.sampleFileUrl,
      },
    });

    return this.mapFromPrisma(row);
  }

  async findById(tenantId: string, id: string): Promise<DigitalResource | null> {
    const row = await this.prisma.digitalResource.findFirst({
      where: { id, tenantId },
      include: { files: true },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<DigitalResource | null> {
    const row = await this.prisma.digitalResource.findFirst({
      where: { tenantId, slug },
      include: { files: true },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findByAuthor(tenantId: string, authorId: string, filter: ListFilter): Promise<PaginatedResult<DigitalResource>> {
    const { skip, take, page, pageSize } = paginationArgs(filter);
    const where = { tenantId, authorId };

    const [rows, total] = await Promise.all([
      this.prisma.digitalResource.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { files: true } }),
      this.prisma.digitalResource.count({ where }),
    ]);

    return paginatedResult(rows.map(r => this.mapFromPrisma(r)), total, page, pageSize);
  }

  async search(tenantId: string, filter: ResourceSearchRequest): Promise<PaginatedResult<DigitalResource>> {
    const { skip, take, page, pageSize } = paginationArgs(filter);
    const where: Record<string, unknown> = { tenantId };

    if (filter.status) where.status = toPrismaEnum(filter.status);
    if (filter.format) where.format = toPrismaEnum(filter.format);
    if (filter.subjectArea) where.subjectArea = filter.subjectArea;
    if (filter.authorId) where.authorId = filter.authorId;
    if (filter.featured !== undefined) where.featured = filter.featured;
    if (filter.yearLevels && filter.yearLevels.length > 0) {
      where.yearLevels = { hasSome: filter.yearLevels };
    }
    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { tags: { hasSome: [filter.search] } },
      ];
    }

    // Sort
    let orderBy: Record<string, unknown> = { createdAt: 'desc' };
    if (filter.sortBy === 'totalPurchases') orderBy = { totalPurchases: filter.sortOrder || 'desc' };
    if (filter.sortBy === 'averageRating') orderBy = { averageRating: filter.sortOrder || 'desc' };
    if (filter.sortBy === 'priceIndividualCents') orderBy = { priceIndividualCents: filter.sortOrder || 'asc' };

    const [rows, total] = await Promise.all([
      this.prisma.digitalResource.findMany({ where, skip, take, orderBy, include: { files: true } }),
      this.prisma.digitalResource.count({ where }),
    ]);

    return paginatedResult(rows.map(r => this.mapFromPrisma(r)), total, page, pageSize);
  }

  async update(_tenantId: string, id: string, updates: StrictPartial<DigitalResource>): Promise<DigitalResource> {
    const data: Record<string, unknown> = {};

    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.shortDescription !== undefined) data.shortDescription = updates.shortDescription;
    if (updates.coverImageUrl !== undefined) data.coverImageUrl = updates.coverImageUrl;
    if (updates.priceIndividualCents !== undefined) data.priceIndividualCents = updates.priceIndividualCents;
    if (updates.priceSingleSchoolCents !== undefined) data.priceSingleSchoolCents = updates.priceSingleSchoolCents;
    if (updates.priceMultiSchoolCents !== undefined) data.priceMultiSchoolCents = updates.priceMultiSchoolCents;
    if (updates.status !== undefined) data.status = toPrismaEnum(updates.status);
    if (updates.format !== undefined) data.format = toPrismaEnum(updates.format);
    if (updates.subjectArea !== undefined) data.subjectArea = updates.subjectArea;
    if (updates.yearLevels !== undefined) data.yearLevels = updates.yearLevels;
    if (updates.tags !== undefined) data.tags = updates.tags;
    if (updates.featured !== undefined) data.featured = updates.featured;
    if (updates.moderationStatus !== undefined) data.moderationStatus = updates.moderationStatus;
    if (updates.previewPageCount !== undefined) data.previewPageCount = updates.previewPageCount;
    if (updates.sampleFileUrl !== undefined) data.sampleFileUrl = updates.sampleFileUrl;
    if (updates.averageRating !== undefined) data.averageRating = updates.averageRating;
    if (updates.ratingCount !== undefined) data.ratingCount = updates.ratingCount;
    if (updates.totalPurchases !== undefined) data.totalPurchases = updates.totalPurchases;
    if (updates.totalRevenueCents !== undefined) data.totalRevenueCents = updates.totalRevenueCents;

    const row = await this.prisma.digitalResource.update({
      where: { id },
      data,
    });

    return this.mapFromPrisma(row);
  }

  async delete(_tenantId: string, id: string): Promise<void> {
    await this.prisma.digitalResource.delete({ where: { id } });
  }

  async incrementPurchaseCount(_tenantId: string, id: string, amountCents: number): Promise<void> {
    await this.prisma.digitalResource.update({
      where: { id },
      data: {
        totalPurchases: { increment: 1 },
        totalRevenueCents: { increment: amountCents },
      },
    });
  }

  async updateRating(_tenantId: string, id: string, averageRating: number, ratingCount: number): Promise<void> {
    await this.prisma.digitalResource.update({
      where: { id },
      data: { averageRating, ratingCount },
    });
  }

  // ── Mapper ──

  private mapFromPrisma(row: Record<string, unknown>): DigitalResource {
    const files = Array.isArray(row.files) ? (row.files as Array<Record<string, unknown>>).map(this.mapFileFromPrisma) : [];

    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
      authorId: row.authorId as string,
      authorName: row.authorName as string,
      title: row.title as string,
      slug: row.slug as string,
      description: (row.description as string) || '',
      shortDescription: row.shortDescription as string | undefined,
      coverImageUrl: row.coverImageUrl as string | undefined,
      files,
      priceIndividualCents: row.priceIndividualCents as number,
      priceSingleSchoolCents: row.priceSingleSchoolCents as number | undefined,
      priceMultiSchoolCents: row.priceMultiSchoolCents as number | undefined,
      currency: row.currency as string,
      format: fromPrismaEnumToSnake(row.format as string) as DigitalResource['format'],
      status: fromPrismaEnumToSnake(row.status as string) as DigitalResource['status'],
      subjectArea: row.subjectArea as string | undefined,
      yearLevels: jsonOrDefault(row.yearLevels, [] as string[]),
      curriculumTags: [],
      tags: jsonOrDefault(row.tags, [] as string[]),
      featured: row.featured as boolean,
      totalPurchases: row.totalPurchases as number,
      totalRevenueCents: row.totalRevenueCents as number,
      averageRating: row.averageRating as number,
      ratingCount: row.ratingCount as number,
      moderationStatus: row.moderationStatus as string,
      previewPageCount: row.previewPageCount as number | undefined,
      sampleFileUrl: row.sampleFileUrl as string | undefined,
    };
  }

  private mapFileFromPrisma(row: Record<string, unknown>): ResourceFile {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      resourceId: row.resourceId as string,
      fileName: row.fileName as string,
      fileUrl: row.fileUrl as string,
      fileSizeBytes: row.fileSizeBytes as number,
      mimeType: row.mimeType as string,
      format: fromPrismaEnumToSnake(row.format as string) as ResourceFile['format'],
      label: row.label as string | undefined,
      sortOrder: row.sortOrder as number,
      pageCount: row.pageCount as number | undefined,
      durationSeconds: row.durationSeconds as number | undefined,
      watermarkEnabled: row.watermarkEnabled as boolean,
    };
  }
}

// ============================================================================
// PURCHASE REPOSITORY
// ============================================================================

export class PrismaPurchaseRepository implements PurchaseRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, purchase: ResourcePurchase): Promise<ResourcePurchase> {
    const row = await this.prisma.resourcePurchase.create({
      data: {
        id: purchase.id,
        tenantId,
        resourceId: purchase.resourceId,
        buyerId: purchase.buyerId,
        buyerEmail: purchase.buyerEmail,
        buyerName: purchase.buyerName,
        amountCents: purchase.amountCents,
        currency: purchase.currency,
        platformFeeCents: purchase.platformFeeCents,
        authorEarningsCents: purchase.authorEarningsCents,
        stripePaymentIntentId: purchase.stripePaymentIntentId,
        stripeChargeId: purchase.stripeChargeId,
        licenceScope: toPrismaEnum(purchase.licenceScope),
        status: purchase.status,
        downloadCount: purchase.downloadCount,
      },
    });

    return this.mapFromPrisma(row);
  }

  async findById(tenantId: string, id: string): Promise<ResourcePurchase | null> {
    const row = await this.prisma.resourcePurchase.findFirst({
      where: { id, tenantId },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findByBuyer(tenantId: string, buyerId: string, filter: ListFilter): Promise<PaginatedResult<ResourcePurchase>> {
    const { skip, take, page, pageSize } = paginationArgs(filter);
    const where = { tenantId, buyerId };

    const [rows, total] = await Promise.all([
      this.prisma.resourcePurchase.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.resourcePurchase.count({ where }),
    ]);

    return paginatedResult(rows.map(r => this.mapFromPrisma(r)), total, page, pageSize);
  }

  async findByResource(tenantId: string, resourceId: string, filter: ListFilter): Promise<PaginatedResult<ResourcePurchase>> {
    const { skip, take, page, pageSize } = paginationArgs(filter);
    const where = { tenantId, resourceId };

    const [rows, total] = await Promise.all([
      this.prisma.resourcePurchase.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.resourcePurchase.count({ where }),
    ]);

    return paginatedResult(rows.map(r => this.mapFromPrisma(r)), total, page, pageSize);
  }

  async findByStripePaymentIntent(stripePaymentIntentId: string): Promise<ResourcePurchase | null> {
    const row = await this.prisma.resourcePurchase.findFirst({
      where: { stripePaymentIntentId },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async hasBuyerPurchased(tenantId: string, buyerId: string, resourceId: string): Promise<boolean> {
    const count = await this.prisma.resourcePurchase.count({
      where: { tenantId, buyerId, resourceId, status: 'completed' },
    });
    return count > 0;
  }

  async incrementDownloadCount(_tenantId: string, id: string): Promise<void> {
    await this.prisma.resourcePurchase.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
  }

  // ── Mapper ──

  private mapFromPrisma(row: Record<string, unknown>): ResourcePurchase {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      resourceId: row.resourceId as string,
      buyerId: row.buyerId as string,
      buyerEmail: row.buyerEmail as string,
      buyerName: row.buyerName as string,
      amountCents: row.amountCents as number,
      currency: row.currency as string,
      platformFeeCents: row.platformFeeCents as number,
      authorEarningsCents: row.authorEarningsCents as number,
      stripePaymentIntentId: row.stripePaymentIntentId as string | undefined,
      stripeChargeId: row.stripeChargeId as string | undefined,
      licenceScope: fromPrismaEnumToSnake(row.licenceScope as string) as ResourcePurchase['licenceScope'],
      status: row.status as string,
      downloadCount: row.downloadCount as number,
    };
  }
}

// ============================================================================
// LICENCE REPOSITORY
// ============================================================================

export class PrismaLicenceRepository implements LicenceRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, licence: ResourceLicence): Promise<ResourceLicence> {
    const row = await this.prisma.resourceLicence.create({
      data: {
        id: licence.id,
        tenantId,
        purchaseId: licence.purchaseId,
        scope: toPrismaEnum(licence.scope),
        institutionId: licence.institutionId,
        institutionName: licence.institutionName,
        maxUsers: licence.maxUsers,
        activeUsers: licence.activeUsers,
        isActive: licence.isActive,
      },
    });

    return this.mapFromPrisma(row);
  }

  async findById(tenantId: string, id: string): Promise<ResourceLicence | null> {
    const row = await this.prisma.resourceLicence.findFirst({
      where: { id, tenantId },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findActiveByInstitution(tenantId: string, institutionId: string): Promise<ResourceLicence[]> {
    const rows = await this.prisma.resourceLicence.findMany({
      where: { tenantId, institutionId, isActive: true },
    });
    return rows.map(r => this.mapFromPrisma(r));
  }

  async findByPurchase(tenantId: string, purchaseId: string): Promise<ResourceLicence | null> {
    const row = await this.prisma.resourceLicence.findFirst({
      where: { tenantId, purchaseId },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async deactivate(_tenantId: string, id: string, _reason: string): Promise<void> {
    await this.prisma.resourceLicence.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── Mapper ──

  private mapFromPrisma(row: Record<string, unknown>): ResourceLicence {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
      purchaseId: row.purchaseId as string,
      scope: fromPrismaEnumToSnake(row.scope as string) as ResourceLicence['scope'],
      institutionId: row.institutionId as string | undefined,
      institutionName: row.institutionName as string | undefined,
      maxUsers: row.maxUsers as number | undefined,
      activeUsers: row.activeUsers as number,
      isActive: row.isActive as boolean,
    };
  }
}
