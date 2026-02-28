/**
 * ============================================================================
 * Publishing Engine Repositories — Prisma Implementation
 * ============================================================================
 *
 * Data access for manuscripts, versions, publications, covers, and sales.
 *
 * @module erudits/repositories/publishing
 */

import type {
  Manuscript, ManuscriptVersion,
  BookPublication, BookCover, SalesRecord,
  PublicationChannelRecord,
  ManuscriptRepository, ManuscriptVersionRepository,
  PublicationRepository, CoverRepository, SalesRepository,
  DistributionChannel, CurriculumTag,
  ListFilter, PaginatedResult,
StrictPartial,
} from '../types/erudits.types';

import {
  PrismaClientLike,
  toPrismaEnum, fromPrismaEnumToSnake,
  paginationArgs, paginatedResult,
  jsonOrDefault, jsonOrUndefined,
} from './shared';

// ============================================================================
// MANUSCRIPT REPOSITORY
// ============================================================================

export class PrismaManuscriptRepository implements ManuscriptRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, manuscript: Manuscript): Promise<Manuscript> {
    const row = await this.prisma.manuscript.create({
      data: {
        id: manuscript.id,
        tenantId,
        authorId: manuscript.authorId,
        authorName: manuscript.authorName,
        collaboratorIds: manuscript.collaboratorIds,
        title: manuscript.title,
        subtitle: manuscript.subtitle,
        slug: manuscript.slug,
        description: manuscript.description,
        language: manuscript.language,
        secondaryLanguage: manuscript.secondaryLanguage,
        content: manuscript.content,
        wordCount: manuscript.wordCount,
        pageCountEstimate: manuscript.pageCountEstimate,
        frontMatter: manuscript.frontMatter ?? undefined,
        backMatter: manuscript.backMatter ?? undefined,
        genre: manuscript.genre,
        subjectArea: manuscript.subjectArea,
        yearLevels: manuscript.yearLevels,
        trimWidth: manuscript.trimWidth,
        trimHeight: manuscript.trimHeight,
        paperType: manuscript.paperType,
        inkType: manuscript.inkType,
        bindingType: manuscript.bindingType,
        hasBleed: manuscript.hasBleed,
        isbnEbook: manuscript.isbnEbook,
        isbnPaperback: manuscript.isbnPaperback,
        isbnHardcover: manuscript.isbnHardcover,
        status: toPrismaEnum(manuscript.status),
        currentVersionId: manuscript.currentVersionId,
      },
    });

    return this.mapFromPrisma(row);
  }

  async findById(tenantId: string, id: string): Promise<Manuscript | null> {
    const row = await this.prisma.manuscript.findFirst({
      where: { id, tenantId },
      include: { chapters: true },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<Manuscript | null> {
    const row = await this.prisma.manuscript.findFirst({
      where: { tenantId, slug },
      include: { chapters: true },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findByAuthor(tenantId: string, authorId: string, filter: ListFilter): Promise<PaginatedResult<Manuscript>> {
    const { skip, take, page, pageSize } = paginationArgs(filter);
    const where = { tenantId, authorId };

    const [rows, total] = await Promise.all([
      this.prisma.manuscript.findMany({ where, skip, take, orderBy: { updatedAt: 'desc' }, include: { chapters: true } }),
      this.prisma.manuscript.count({ where }),
    ]);

    return paginatedResult(rows.map(r => this.mapFromPrisma(r)), total, page, pageSize);
  }

  async update(_tenantId: string, id: string, updates: StrictPartial<Manuscript>): Promise<Manuscript> {
    const data: Record<string, unknown> = {};

    if (updates.title !== undefined) data.title = updates.title;
    if (updates.subtitle !== undefined) data.subtitle = updates.subtitle;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.content !== undefined) data.content = updates.content;
    if (updates.wordCount !== undefined) data.wordCount = updates.wordCount;
    if (updates.pageCountEstimate !== undefined) data.pageCountEstimate = updates.pageCountEstimate;
    if (updates.language !== undefined) data.language = updates.language;
    if (updates.secondaryLanguage !== undefined) data.secondaryLanguage = updates.secondaryLanguage;
    if (updates.genre !== undefined) data.genre = updates.genre;
    if (updates.subjectArea !== undefined) data.subjectArea = updates.subjectArea;
    if (updates.yearLevels !== undefined) data.yearLevels = updates.yearLevels;
    if (updates.trimWidth !== undefined) data.trimWidth = updates.trimWidth;
    if (updates.trimHeight !== undefined) data.trimHeight = updates.trimHeight;
    if (updates.paperType !== undefined) data.paperType = updates.paperType;
    if (updates.inkType !== undefined) data.inkType = updates.inkType;
    if (updates.hasBleed !== undefined) data.hasBleed = updates.hasBleed;
    if (updates.status !== undefined) data.status = toPrismaEnum(updates.status);
    if (updates.currentVersionId !== undefined) data.currentVersionId = updates.currentVersionId;
    if (updates.isbnEbook !== undefined) data.isbnEbook = updates.isbnEbook;
    if (updates.isbnPaperback !== undefined) data.isbnPaperback = updates.isbnPaperback;
    if (updates.isbnHardcover !== undefined) data.isbnHardcover = updates.isbnHardcover;

    const row = await this.prisma.manuscript.update({
      where: { id },
      data,
    });

    return this.mapFromPrisma(row);
  }

  async delete(_tenantId: string, id: string): Promise<void> {
    await this.prisma.manuscript.delete({ where: { id } });
  }

  private mapFromPrisma(row: Record<string, unknown>): Manuscript {
    const chapters = Array.isArray(row.chapters)
      ? (row.chapters as Array<Record<string, unknown>>).map(this.mapChapterFromPrisma)
      : [];

    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
      authorId: row.authorId as string,
      authorName: row.authorName as string,
      collaboratorIds: jsonOrDefault(row.collaboratorIds, [] as string[]),
      title: row.title as string,
      subtitle: row.subtitle as string | undefined,
      slug: row.slug as string,
      description: row.description as string | undefined,
      language: row.language as string,
      secondaryLanguage: row.secondaryLanguage as string | undefined,
      content: jsonOrDefault(row.content, {} as Record<string, unknown>),
      wordCount: row.wordCount as number,
      pageCountEstimate: row.pageCountEstimate as number,
      chapters,
      frontMatter: jsonOrUndefined(row.frontMatter),
      backMatter: jsonOrUndefined(row.backMatter),
      genre: row.genre as string | undefined,
      subjectArea: row.subjectArea as string | undefined,
      yearLevels: jsonOrDefault(row.yearLevels, [] as string[]),
      curriculumTags: [] as CurriculumTag[],
      trimWidth: row.trimWidth as number | undefined,
      trimHeight: row.trimHeight as number | undefined,
      paperType: row.paperType as string | undefined,
      inkType: row.inkType as string | undefined,
      bindingType: row.bindingType as string | undefined,
      hasBleed: row.hasBleed as boolean,
      isbnEbook: row.isbnEbook as string | undefined,
      isbnPaperback: row.isbnPaperback as string | undefined,
      isbnHardcover: row.isbnHardcover as string | undefined,
      status: fromPrismaEnumToSnake(row.status as string) as Manuscript['status'],
      currentVersionId: row.currentVersionId as string | undefined,
    };
  }

  private mapChapterFromPrisma(row: Record<string, unknown>): Manuscript['chapters'][0] {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      manuscriptId: row.manuscriptId as string,
      title: row.title as string,
      sortOrder: row.sortOrder as number,
      wordCount: row.wordCount as number,
      pageStart: row.pageStart as number | undefined,
      curriculumCode: row.curriculumCode as string | undefined,
      learningObjectives: jsonOrDefault(row.learningObjectives, [] as string[]),
      contentNodeId: row.contentNodeId as string | undefined,
    };
  }
}

// ============================================================================
// MANUSCRIPT VERSION REPOSITORY
// ============================================================================

export class PrismaManuscriptVersionRepository implements ManuscriptVersionRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, version: ManuscriptVersion): Promise<ManuscriptVersion> {
    const row = await this.prisma.manuscriptVersion.create({
      data: {
        id: version.id,
        tenantId,
        manuscriptId: version.manuscriptId,
        versionNumber: version.versionNumber,
        label: version.label,
        content: version.content,
        wordCount: version.wordCount,
        changeDescription: version.changeDescription,
        createdBy: version.createdBy,
      },
    });

    return this.mapFromPrisma(row);
  }

  async findById(tenantId: string, id: string): Promise<ManuscriptVersion | null> {
    const row = await this.prisma.manuscriptVersion.findFirst({
      where: { id, tenantId },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findByManuscript(tenantId: string, manuscriptId: string): Promise<ManuscriptVersion[]> {
    const rows = await this.prisma.manuscriptVersion.findMany({
      where: { tenantId, manuscriptId },
      orderBy: { versionNumber: 'desc' },
    });
    return rows.map(r => this.mapFromPrisma(r));
  }

  async findLatest(tenantId: string, manuscriptId: string): Promise<ManuscriptVersion | null> {
    const row = await this.prisma.manuscriptVersion.findFirst({
      where: { tenantId, manuscriptId },
      orderBy: { versionNumber: 'desc' },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  private mapFromPrisma(row: Record<string, unknown>): ManuscriptVersion {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      manuscriptId: row.manuscriptId as string,
      versionNumber: row.versionNumber as number,
      label: row.label as string | undefined,
      content: jsonOrDefault(row.content, {} as Record<string, unknown>),
      wordCount: row.wordCount as number,
      changeDescription: row.changeDescription as string | undefined,
      createdBy: row.createdBy as string,
    };
  }
}

// ============================================================================
// PUBLICATION REPOSITORY
// ============================================================================

export class PrismaPublicationRepository implements PublicationRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, publication: BookPublication): Promise<BookPublication> {
    const row = await this.prisma.bookPublication.create({
      data: {
        id: publication.id,
        tenantId,
        manuscriptId: publication.manuscriptId,
        versionId: publication.versionId,
        format: toPrismaEnum(publication.format),
        fileUrl: publication.fileUrl,
        fileSizeBytes: publication.fileSizeBytes,
        pageCount: publication.pageCount,
        spineWidthInches: publication.spineWidthInches,
        coverId: publication.coverId,
        pricing: publication.pricing,
        totalSales: publication.totalSales,
        totalRevenueCents: publication.totalRevenueCents,
        averageRating: publication.averageRating,
      },
    });

    // Save channel records
    for (const channel of publication.channels) {
      await this.prisma.publicationChannel.create({
        data: {
          id: channel.id,
          tenantId,
          publicationId: publication.id,
          channel: toPrismaEnum(channel.channel),
          status: toPrismaEnum(channel.status),
          externalId: channel.externalId,
          listPriceCents: channel.listPriceCents,
          currency: channel.currency,
          royaltyPercent: channel.royaltyPercent,
          submittedAt: channel.submittedAt,
          approvedAt: channel.approvedAt,
          rejectedAt: channel.rejectedAt,
          rejectionReason: channel.rejectionReason,
        },
      });
    }

    return this.mapFromPrisma(row, publication.channels);
  }

  async findById(tenantId: string, id: string): Promise<BookPublication | null> {
    const row = await this.prisma.bookPublication.findFirst({
      where: { id, tenantId },
      include: { channels: true },
    });
    if (!row) return null;

    const channels = Array.isArray(row.channels) ? row.channels as Array<Record<string, unknown>> : [];
    return this.mapFromPrisma(row, channels.map(c => this.mapChannelFromPrisma(c)));
  }

  async findByManuscript(tenantId: string, manuscriptId: string): Promise<BookPublication[]> {
    const rows = await this.prisma.bookPublication.findMany({
      where: { tenantId, manuscriptId },
      include: { channels: true },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(r => {
      const channels = Array.isArray(r.channels) ? (r.channels as Array<Record<string, unknown>>).map(c => this.mapChannelFromPrisma(c)) : [];
      return this.mapFromPrisma(r, channels);
    });
  }

  async findByChannel(tenantId: string, channel: DistributionChannel, filter: ListFilter): Promise<PaginatedResult<BookPublication>> {
    const { skip, take, page, pageSize } = paginationArgs(filter);

    // Find publications that have at least one channel matching
    const channelRows = await this.prisma.publicationChannel.findMany({
      where: { tenantId, channel: toPrismaEnum(channel) },
    });
    const pubIds = [...new Set(channelRows.map(c => c.publicationId as string))];

    if (pubIds.length === 0) {
      return paginatedResult([], 0, page, pageSize);
    }

    const where = { tenantId, id: { in: pubIds } };
    const [rows, total] = await Promise.all([
      this.prisma.bookPublication.findMany({ where, skip, take, include: { channels: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.bookPublication.count({ where }),
    ]);

    const items = rows.map(r => {
      const channels = Array.isArray(r.channels) ? (r.channels as Array<Record<string, unknown>>).map(c => this.mapChannelFromPrisma(c)) : [];
      return this.mapFromPrisma(r, channels);
    });

    return paginatedResult(items, total, page, pageSize);
  }

  async update(tenantId: string, id: string, updates: StrictPartial<BookPublication>): Promise<BookPublication> {
    const data: Record<string, unknown> = {};

    if (updates.fileUrl !== undefined) data.fileUrl = updates.fileUrl;
    if (updates.fileSizeBytes !== undefined) data.fileSizeBytes = updates.fileSizeBytes;
    if (updates.pageCount !== undefined) data.pageCount = updates.pageCount;
    if (updates.spineWidthInches !== undefined) data.spineWidthInches = updates.spineWidthInches;
    if (updates.totalSales !== undefined) data.totalSales = updates.totalSales;
    if (updates.totalRevenueCents !== undefined) data.totalRevenueCents = updates.totalRevenueCents;
    if (updates.averageRating !== undefined) data.averageRating = updates.averageRating;
    if (updates.pricing !== undefined) data.pricing = updates.pricing;

    await this.prisma.bookPublication.update({
      where: { id },
      data,
    });

    // Update channels if provided
    if (updates.channels) {
      for (const channel of updates.channels) {
        const channelData: Record<string, unknown> = {};
        if (channel.status) channelData.status = toPrismaEnum(channel.status);
        if (channel.submittedAt) channelData.submittedAt = channel.submittedAt;
        if (channel.approvedAt) channelData.approvedAt = channel.approvedAt;
        if (channel.rejectedAt) channelData.rejectedAt = channel.rejectedAt;
        if (channel.rejectionReason) channelData.rejectionReason = channel.rejectionReason;
        if (channel.externalId) channelData.externalId = channel.externalId;

        if (Object.keys(channelData).length > 0) {
          await this.prisma.publicationChannel.update({
            where: { id: channel.id },
            data: channelData,
          });
        }
      }
    }

    // Re-fetch with channels
    const full = await this.findById(tenantId, id);
    return full!;
  }

  private mapFromPrisma(row: Record<string, unknown>, channels: PublicationChannelRecord[]): BookPublication {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
      manuscriptId: row.manuscriptId as string,
      versionId: row.versionId as string,
      format: fromPrismaEnumToSnake(row.format as string) as BookPublication['format'],
      fileUrl: row.fileUrl as string | undefined,
      fileSizeBytes: row.fileSizeBytes as number | undefined,
      pageCount: row.pageCount as number | undefined,
      spineWidthInches: row.spineWidthInches as number | undefined,
      coverId: row.coverId as string | undefined,
      pricing: jsonOrDefault(row.pricing, {} as Record<string, unknown>) as BookPublication['pricing'],
      channels,
      totalSales: row.totalSales as number,
      totalRevenueCents: row.totalRevenueCents as number,
      averageRating: row.averageRating as number,
      kdpAsin: row.kdpAsin as string | undefined,
      kdpStatus: row.kdpStatus as string | undefined,
      ingramTitleId: row.ingramTitleId as string | undefined,
      ingramStatus: row.ingramStatus as string | undefined,
    };
  }

  private mapChannelFromPrisma(row: Record<string, unknown>): PublicationChannelRecord {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      publicationId: row.publicationId as string,
      channel: fromPrismaEnumToSnake(row.channel as string) as PublicationChannelRecord['channel'],
      status: fromPrismaEnumToSnake(row.status as string) as PublicationChannelRecord['status'],
      externalId: row.externalId as string | undefined,
      listPriceCents: row.listPriceCents as number | undefined,
      currency: row.currency as string,
      royaltyPercent: row.royaltyPercent as number | undefined,
      submittedAt: row.submittedAt as Date | undefined,
      approvedAt: row.approvedAt as Date | undefined,
      rejectedAt: row.rejectedAt as Date | undefined,
      rejectionReason: row.rejectionReason as string | undefined,
      lastSyncAt: row.lastSyncAt as Date | undefined,
    };
  }
}

// ============================================================================
// COVER REPOSITORY
// ============================================================================

export class PrismaCoverRepository implements CoverRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, cover: BookCover): Promise<BookCover> {
    const row = await this.prisma.bookCover.create({
      data: {
        id: cover.id,
        tenantId,
        manuscriptId: cover.manuscriptId,
        source: toPrismaEnum(cover.source),
        frontCoverUrl: cover.frontCoverUrl,
        fullCoverUrl: cover.fullCoverUrl,
        thumbnailUrl: cover.thumbnailUrl,
        widthPx: cover.widthPx,
        heightPx: cover.heightPx,
        dpiResolution: cover.dpiResolution,
        colourSpace: cover.colourSpace,
        spineWidthInches: cover.spineWidthInches,
        aiPrompt: cover.aiPrompt,
        aiModel: cover.aiModel,
        aiGenerationCost: cover.aiGenerationCost,
        templateId: cover.templateId,
        templateCustomisations: cover.templateCustomisations ?? undefined,
        isKdpCompliant: cover.isKdpCompliant,
        validationErrors: cover.validationErrors ?? undefined,
        isSelected: cover.isSelected,
      },
    });

    return this.mapFromPrisma(row);
  }

  async findById(tenantId: string, id: string): Promise<BookCover | null> {
    const row = await this.prisma.bookCover.findFirst({
      where: { id, tenantId },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async findByManuscript(tenantId: string, manuscriptId: string): Promise<BookCover[]> {
    const rows = await this.prisma.bookCover.findMany({
      where: { tenantId, manuscriptId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.mapFromPrisma(r));
  }

  async findSelected(tenantId: string, manuscriptId: string): Promise<BookCover | null> {
    const row = await this.prisma.bookCover.findFirst({
      where: { tenantId, manuscriptId, isSelected: true },
    });
    return row ? this.mapFromPrisma(row) : null;
  }

  async setSelected(tenantId: string, manuscriptId: string, coverId: string): Promise<void> {
    // Deselect all covers for this manuscript, then select the chosen one
    await this.prisma.bookCover.updateMany({
      where: { tenantId, manuscriptId },
      data: { isSelected: false },
    });
    await this.prisma.bookCover.update({
      where: { id: coverId },
      data: { isSelected: true },
    });
  }

  private mapFromPrisma(row: Record<string, unknown>): BookCover {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      manuscriptId: row.manuscriptId as string,
      source: fromPrismaEnumToSnake(row.source as string) as BookCover['source'],
      frontCoverUrl: row.frontCoverUrl as string | undefined,
      fullCoverUrl: row.fullCoverUrl as string | undefined,
      thumbnailUrl: row.thumbnailUrl as string | undefined,
      widthPx: row.widthPx as number | undefined,
      heightPx: row.heightPx as number | undefined,
      dpiResolution: row.dpiResolution as number | undefined,
      colourSpace: row.colourSpace as string | undefined,
      spineWidthInches: row.spineWidthInches as number | undefined,
      aiPrompt: row.aiPrompt as string | undefined,
      aiModel: row.aiModel as string | undefined,
      aiGenerationCost: row.aiGenerationCost as number | undefined,
      templateId: row.templateId as string | undefined,
      templateCustomisations: jsonOrUndefined(row.templateCustomisations),
      isKdpCompliant: row.isKdpCompliant as boolean,
      validationErrors: jsonOrUndefined<Record<string, unknown>[]>(row.validationErrors),
      isSelected: row.isSelected as boolean,
    };
  }
}

// ============================================================================
// SALES REPOSITORY
// ============================================================================

export class PrismaSalesRepository implements SalesRepository {

  constructor(private readonly prisma: PrismaClientLike) {}

  async save(tenantId: string, record: SalesRecord): Promise<SalesRecord> {
    const row = await this.prisma.salesRecord.create({
      data: {
        id: record.id,
        tenantId,
        publicationId: record.publicationId,
        resourceId: record.resourceId,
        channel: toPrismaEnum(record.channel),
        buyerId: record.buyerId,
        buyerEmail: record.buyerEmail,
        institutionId: record.institutionId,
        quantitySold: record.quantitySold,
        unitPriceCents: record.unitPriceCents,
        totalPriceCents: record.totalPriceCents,
        platformFeeCents: record.platformFeeCents,
        channelFeeCents: record.channelFeeCents,
        authorEarningsCents: record.authorEarningsCents,
        currency: record.currency,
        stripePaymentIntentId: record.stripePaymentIntentId,
        externalTransactionId: record.externalTransactionId,
        countryCode: record.countryCode,
        isRefunded: record.isRefunded,
      },
    });

    return this.mapFromPrisma(row);
  }

  async findByPublication(tenantId: string, publicationId: string, filter: ListFilter): Promise<PaginatedResult<SalesRecord>> {
    const { skip, take, page, pageSize } = paginationArgs(filter);
    const where = { tenantId, publicationId };

    const [rows, total] = await Promise.all([
      this.prisma.salesRecord.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.salesRecord.count({ where }),
    ]);

    return paginatedResult(rows.map(r => this.mapFromPrisma(r)), total, page, pageSize);
  }

  async findByAuthor(tenantId: string, authorId: string, filter: ListFilter): Promise<PaginatedResult<SalesRecord>> {
    // Sales don't have authorId directly — join through publication → manuscript
    // For now, we use a simpler approach: find all publication IDs for the author,
    // then filter sales by those IDs.
    const manuscripts = await this.prisma.manuscript.findMany({
      where: { tenantId, authorId },
    });
    const msIds = manuscripts.map(m => m.id as string);

    const publications = await this.prisma.bookPublication.findMany({
      where: { tenantId, manuscriptId: { in: msIds } },
    });
    const pubIds = publications.map(p => p.id as string);

    if (pubIds.length === 0) {
      return paginatedResult([], 0, filter.page ?? 1, filter.pageSize ?? 20);
    }

    const { skip, take, page, pageSize } = paginationArgs(filter);
    const where = { tenantId, publicationId: { in: pubIds } };

    const [rows, total] = await Promise.all([
      this.prisma.salesRecord.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.salesRecord.count({ where }),
    ]);

    return paginatedResult(rows.map(r => this.mapFromPrisma(r)), total, page, pageSize);
  }

  async getRevenueByChannel(
    tenantId: string,
    authorId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<Record<string, number>> {
    // Get all sales for this author in the date range
    const manuscripts = await this.prisma.manuscript.findMany({
      where: { tenantId, authorId },
    });
    const msIds = manuscripts.map(m => m.id as string);

    const publications = await this.prisma.bookPublication.findMany({
      where: { tenantId, manuscriptId: { in: msIds } },
    });
    const pubIds = publications.map(p => p.id as string);

    if (pubIds.length === 0) return {};

    const sales = await this.prisma.salesRecord.findMany({
      where: {
        tenantId,
        publicationId: { in: pubIds },
        createdAt: { gte: fromDate, lte: toDate },
        isRefunded: false,
      },
    });

    const byChannel: Record<string, number> = {};
    for (const sale of sales) {
      const channel = fromPrismaEnumToSnake(sale.channel as string);
      byChannel[channel] = (byChannel[channel] || 0) + (sale.authorEarningsCents as number);
    }

    return byChannel;
  }

  async getTotalRevenue(
    tenantId: string,
    authorId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    const byChannel = await this.getRevenueByChannel(tenantId, authorId, fromDate, toDate);
    return Object.values(byChannel).reduce((sum, v) => sum + v, 0);
  }

  private mapFromPrisma(row: Record<string, unknown>): SalesRecord {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      createdAt: row.createdAt as Date,
      publicationId: row.publicationId as string | undefined,
      resourceId: row.resourceId as string | undefined,
      channel: fromPrismaEnumToSnake(row.channel as string) as SalesRecord['channel'],
      buyerId: row.buyerId as string | undefined,
      buyerEmail: row.buyerEmail as string | undefined,
      institutionId: row.institutionId as string | undefined,
      quantitySold: row.quantitySold as number,
      unitPriceCents: row.unitPriceCents as number,
      totalPriceCents: row.totalPriceCents as number,
      platformFeeCents: row.platformFeeCents as number,
      channelFeeCents: row.channelFeeCents as number,
      authorEarningsCents: row.authorEarningsCents as number,
      currency: row.currency as string,
      stripePaymentIntentId: row.stripePaymentIntentId as string | undefined,
      externalTransactionId: row.externalTransactionId as string | undefined,
      payoutId: row.payoutId as string | undefined,
      reconciledAt: row.reconciledAt as Date | undefined,
      countryCode: row.countryCode as string | undefined,
      isRefunded: row.isRefunded as boolean,
    };
  }
}
