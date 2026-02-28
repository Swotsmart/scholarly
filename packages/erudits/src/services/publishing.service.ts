/**
 * ============================================================================
 * Scholarly Platform — Publishing Engine Service
 * ============================================================================
 *
 * The service that transforms Scholarly from a teaching platform into a
 * teaching-and-publishing platform. Think of it as having a professional
 * publisher's entire operation — editor, typesetter, cover designer, and
 * distribution manager — available at the click of a button, but one that
 * understands educational content at its core.
 *
 * For Érudits, this replaces the fragmented KDP workflow:
 *   OLD: Write in Word → Format in Kindle Create → Design cover in Canva
 *        → Upload to KDP → Wait for review → Pray it passes
 *   NEW: Write in Scholarly Editor → Click "Format" → Click "Publish"
 *        → Live on Scholarly Direct + Amazon + IngramSpark simultaneously
 *
 * The service orchestrates four sub-systems:
 *   1. Manuscript Management — CRUD, versioning, collaboration
 *   2. Formatting Engine — EPUB, PDF (print + digital), DOCX generation
 *   3. Cover Designer — AI generation, templates, KDP validation
 *   4. Distribution — Multi-channel publishing with per-channel status
 *
 * ## Content Model
 *
 * Manuscript content is stored as ProseMirror JSON — the same format used
 * by Notion, Confluence, and the New York Times editor. This gives us:
 *   - Rich collaborative editing with operational transforms
 *   - Structured content extraction (headings, paragraphs, images, tables)
 *   - Curriculum-aware custom blocks (vocabulary lists, grammar tables,
 *     exercise blocks, comprehension questions)
 *   - Clean export to any output format via tree traversal
 *
 * ## Version Control
 *
 * Every save creates an immutable version snapshot. Authors can:
 *   - Compare any two versions (diff view)
 *   - Roll back to any previous version
 *   - Branch editions (2025 vs 2026 edition of the same book)
 *   - Tag versions with labels ("Post-Review", "Final Draft")
 *
 * @module erudits/services/publishing
 * @version 1.0.0
 */

import {
  Result, success, failure, Errors, strip,
  Manuscript, ManuscriptChapter, ManuscriptVersion,
  BookPublication, PublicationChannelRecord, BookCover,
  SalesRecord,
  ManuscriptStatus, PublicationFormat, DistributionChannel,
  ChannelPublicationStatus,
  CreateManuscriptRequest, UpdateManuscriptRequest,
  GenerateCoverRequest, PublishRequest, FormatManuscriptRequest,
  EventBus, Cache, ScholarlyConfig, FileStorage, AIService,
  ManuscriptRepository, ManuscriptVersionRepository,
  PublicationRepository, CoverRepository, SalesRepository,
  KDP_SPECS,
  ERUDITS_EVENTS,
StrictPartial,
} from '../types/erudits.types';

// ============================================================================
// FORMATTING ENGINE INTERFACE
// ============================================================================

/**
 * The formatting engine converts manuscript content into publication-ready
 * files. Each format has its own adapter that knows the target specification.
 *
 * Injected as a dependency so the service doesn't couple to specific
 * rendering libraries (WeasyPrint, Pandoc, Puppeteer, docx-js).
 */
export interface FormattingEngine {
  /**
   * Generate a formatted file from manuscript content.
   *
   * Returns the file as a Buffer along with metadata about the output.
   */
  format(params: {
    content: Record<string, unknown>;     // ProseMirror JSON document
    format: PublicationFormat;
    metadata: {
      title: string;
      subtitle?: string | undefined;
      author: string;
      language: string;
      isbn?: string | undefined;
      description?: string | undefined;
    };
    printSpec?: {
      trimWidth: number;                  // Inches
      trimHeight: number;                 // Inches
      paperType: 'white' | 'cream';
      inkType: 'black' | 'standard_color' | 'premium_color';
      hasBleed: boolean;
      pageCount?: number;                 // If known from a previous render
    };
  }): Promise<Result<{
    buffer: Buffer;
    mimeType: string;
    fileExtension: string;
    pageCount: number;
    fileSizeBytes: number;
  }>>;

  /**
   * Estimate page count without doing a full render.
   * Used for spine width calculation before cover generation.
   */
  estimatePageCount(params: {
    content: Record<string, unknown>;
    trimWidth: number;
    trimHeight: number;
    fontSize?: number | undefined;
  }): Promise<number>;
}

// ============================================================================
// SERVICE DEPENDENCIES
// ============================================================================

interface PublishingDeps {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
  fileStorage: FileStorage;
  ai: AIService;
  formatter: FormattingEngine;
  manuscriptRepo: ManuscriptRepository;
  versionRepo: ManuscriptVersionRepository;
  publicationRepo: PublicationRepository;
  coverRepo: CoverRepository;
  salesRepo: SalesRepository;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class PublishingEngineService {
  private readonly serviceName = 'PublishingEngineService';

  constructor(private readonly deps: PublishingDeps) {}

  // ──────────────────────────────────────────────────────────────────────────
  // MANUSCRIPT LIFECYCLE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Create a new manuscript.
   *
   * Initialises with an empty ProseMirror document and the author's
   * chosen print specifications. Defaults to US Trade (6"×9") which
   * is the most common trim size for educational books.
   */
  async createManuscript(
    tenantId: string,
    authorId: string,
    authorName: string,
    request: CreateManuscriptRequest,
  ): Promise<Result<Manuscript>> {
    const slug = this.generateSlug(request.title);

    const existing = await this.deps.manuscriptRepo.findBySlug(tenantId, slug);
    if (existing) {
      return failure(Errors.conflict(`A manuscript with slug "${slug}" already exists`));
    }

    // Default to US Trade trim size if not specified
    const trimWidth = request.trimWidth || KDP_SPECS.trimSizes.us_trade.width;
    const trimHeight = request.trimHeight || KDP_SPECS.trimSizes.us_trade.height;

    const manuscript: Manuscript = {
      id: this.generateId('ms'),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId,
      authorName,
      collaboratorIds: [],
      title: request.title,
      subtitle: request.subtitle,
      slug,
      description: request.description,
      language: request.language || 'en',
      secondaryLanguage: request.secondaryLanguage,
      content: this.createEmptyDocument(request.title),
      wordCount: 0,
      pageCountEstimate: 0,
      chapters: [],
      genre: request.genre,
      subjectArea: request.subjectArea,
      yearLevels: request.yearLevels || [],
      curriculumTags: [],
      trimWidth,
      trimHeight,
      paperType: request.paperType || 'white',
      inkType: request.inkType || 'standard_color',
      bindingType: request.bindingType || 'paperback',
      hasBleed: false,
      status: 'draft',
    };

    const saved = await this.deps.manuscriptRepo.save(tenantId, manuscript);

    // Create initial version (v1)
    await this.saveVersion(tenantId, saved.id, authorId, 'Initial draft', saved.content, 0);

    await this.deps.eventBus.publish(ERUDITS_EVENTS.MANUSCRIPT_CREATED, {
      tenantId, manuscriptId: saved.id, authorId, title: saved.title,
    });

    return success(saved);
  }

  /**
   * Update manuscript content and/or metadata.
   *
   * When content changes, we recalculate word count and page estimate.
   * A new version is NOT automatically saved — the author explicitly
   * saves versions when they want a checkpoint.
   */
  async updateManuscript(
    tenantId: string,
    manuscriptId: string,
    userId: string,
    request: UpdateManuscriptRequest,
  ): Promise<Result<Manuscript>> {
    const manuscript = await this.deps.manuscriptRepo.findById(tenantId, manuscriptId);
    if (!manuscript) {
      return failure(Errors.notFound('Manuscript', manuscriptId));
    }

    if (!this.canEdit(manuscript, userId)) {
      return failure(Errors.forbidden('You do not have edit access to this manuscript'));
    }

    if (manuscript.status === 'published' || manuscript.status === 'archived') {
      return failure(Errors.validation(
        `Cannot edit a ${manuscript.status} manuscript. Create a new version or duplicate it.`
      ));
    }

    const updates: StrictPartial<Manuscript> = strip({ ...request, updatedAt: new Date() });

    // Recalculate word count if content changed
    if (request.content) {
      updates.wordCount = this.countWords(request.content);
      updates.pageCountEstimate = await this.deps.formatter.estimatePageCount({
        content: request.content,
        trimWidth: request.trimWidth || manuscript.trimWidth || 6.0,
        trimHeight: request.trimHeight || manuscript.trimHeight || 9.0,
      });
    }

    const updated = await this.deps.manuscriptRepo.update(tenantId, manuscriptId, updates);

    await this.deps.cache.del(`manuscript:${tenantId}:${manuscriptId}`);

    return success(updated);
  }

  /**
   * Save a named version snapshot of the manuscript.
   *
   * Think of this as "git commit" — it creates an immutable record
   * of the manuscript at this point in time. The author can return
   * to any version later.
   */
  async saveVersion(
    tenantId: string,
    manuscriptId: string,
    userId: string,
    label?: string,
    contentOverride?: Record<string, unknown>,
    wordCountOverride?: number,
  ): Promise<Result<ManuscriptVersion>> {
    const manuscript = await this.deps.manuscriptRepo.findById(tenantId, manuscriptId);
    if (!manuscript) {
      return failure(Errors.notFound('Manuscript', manuscriptId));
    }

    if (!this.canEdit(manuscript, userId)) {
      return failure(Errors.forbidden('You do not have edit access to this manuscript'));
    }

    // Determine next version number
    const latestVersion = await this.deps.versionRepo.findLatest(tenantId, manuscriptId);
    const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    const content = contentOverride || manuscript.content;
    const wordCount = wordCountOverride ?? this.countWords(content);

    const version: ManuscriptVersion = {
      id: this.generateId('mv'),
      tenantId,
      createdAt: new Date(),
      manuscriptId,
      versionNumber: nextVersionNumber,
      label: label || `Version ${nextVersionNumber}`,
      content,
      wordCount,
      changeDescription: label,
      createdBy: userId,
    };

    const saved = await this.deps.versionRepo.save(tenantId, version);

    // Update manuscript's current version pointer
    await this.deps.manuscriptRepo.update(tenantId, manuscriptId, {
      currentVersionId: saved.id,
      updatedAt: new Date(),
    });

    await this.deps.eventBus.publish(ERUDITS_EVENTS.MANUSCRIPT_VERSION_SAVED, {
      tenantId, manuscriptId, versionId: saved.id,
      versionNumber: nextVersionNumber, userId,
    });

    return success(saved);
  }

  /**
   * Restore a manuscript to a previous version.
   *
   * This doesn't delete the current content — it creates a new version
   * that's a copy of the target version. History is preserved.
   */
  async restoreVersion(
    tenantId: string,
    manuscriptId: string,
    versionId: string,
    userId: string,
  ): Promise<Result<ManuscriptVersion>> {
    const version = await this.deps.versionRepo.findById(tenantId, versionId);
    if (!version || version.manuscriptId !== manuscriptId) {
      return failure(Errors.notFound('Version', versionId));
    }

    // Update manuscript content to the restored version
    await this.deps.manuscriptRepo.update(tenantId, manuscriptId, {
      content: version.content,
      wordCount: version.wordCount,
      updatedAt: new Date(),
    });

    // Save as a new version with restoration note
    return this.saveVersion(
      tenantId, manuscriptId, userId,
      `Restored from ${version.label || `v${version.versionNumber}`}`,
      version.content, version.wordCount,
    );
  }

  /**
   * List all versions of a manuscript.
   */
  async listVersions(
    tenantId: string,
    manuscriptId: string,
  ): Promise<Result<ManuscriptVersion[]>> {
    const versions = await this.deps.versionRepo.findByManuscript(tenantId, manuscriptId);
    return success(versions);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CHAPTER MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Add a chapter to the manuscript's table of contents.
   *
   * Chapters are metadata overlays on the ProseMirror content — they
   * mark where chapter boundaries are in the content tree and carry
   * curriculum alignment metadata.
   */
  async addChapter(
    tenantId: string,
    manuscriptId: string,
    userId: string,
    chapter: {
      title: string;
      curriculumCode?: string | undefined;
      learningObjectives?: string[] | undefined;
    },
  ): Promise<Result<ManuscriptChapter>> {
    const manuscript = await this.deps.manuscriptRepo.findById(tenantId, manuscriptId);
    if (!manuscript) {
      return failure(Errors.notFound('Manuscript', manuscriptId));
    }
    if (!this.canEdit(manuscript, userId)) {
      return failure(Errors.forbidden('No edit access'));
    }

    const newChapter: ManuscriptChapter = {
      id: this.generateId('ch'),
      tenantId,
      manuscriptId,
      title: chapter.title,
      sortOrder: manuscript.chapters.length,
      wordCount: 0,
      curriculumCode: chapter.curriculumCode,
      learningObjectives: chapter.learningObjectives || [],
    };

    manuscript.chapters.push(newChapter);
    await this.deps.manuscriptRepo.update(tenantId, manuscriptId, {
      chapters: manuscript.chapters,
      updatedAt: new Date(),
    });

    return success(newChapter);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FORMATTING
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generate a formatted file from the manuscript.
   *
   * This is where the magic happens. The author clicks "Format as EPUB"
   * and the formatting engine converts the ProseMirror content tree into
   * a publication-ready file that passes KDP's quality review.
   *
   * For print formats, the engine calculates margins based on page count
   * (KDP requires wider gutters for thicker books), adds bleed areas if
   * the book has edge-to-edge images, and embeds all fonts.
   */
  async formatManuscript(
    tenantId: string,
    _userId: string,
    request: FormatManuscriptRequest,
  ): Promise<Result<{
    fileUrl: string;
    format: PublicationFormat;
    pageCount: number;
    fileSizeBytes: number;
    spineWidthInches?: number;
  }>> {
    const manuscript = await this.deps.manuscriptRepo.findById(tenantId, request.manuscriptId);
    if (!manuscript) {
      return failure(Errors.notFound('Manuscript', request.manuscriptId));
    }

    // Get the specific version content
    const version = await this.deps.versionRepo.findById(tenantId, request.versionId);
    if (!version || version.manuscriptId !== request.manuscriptId) {
      return failure(Errors.notFound('Version', request.versionId));
    }

    await this.deps.eventBus.publish(ERUDITS_EVENTS.MANUSCRIPT_FORMATTING, {
      tenantId, manuscriptId: manuscript.id, format: request.format,
    });

    // Resolve print specifications
    const trimWidth = request.options?.trimWidth || manuscript.trimWidth || 6.0;
    const trimHeight = request.options?.trimHeight || manuscript.trimHeight || 9.0;
    const paperType = (request.options?.paperType || manuscript.paperType || 'white') as 'white' | 'cream';
    const inkType = (request.options?.inkType || manuscript.inkType || 'standard_color') as 'black' | 'standard_color' | 'premium_color';
    const hasBleed = request.options?.hasBleed ?? manuscript.hasBleed;

    // Determine ISBN based on format
    let isbn: string | undefined;
    if (request.options?.includeIsbn !== false) {
      isbn = this.getIsbnForFormat(manuscript, request.format);
    }

    // Run the formatting engine
    const formatResult = await this.deps.formatter.format(strip({
      content: version.content,
      format: request.format,
      metadata: strip({
        title: manuscript.title,
        subtitle: manuscript.subtitle,
        author: manuscript.authorName,
        language: manuscript.language,
        isbn,
        description: manuscript.description,
      }),
      ...(this.isPrintFormat(request.format) ? {
        printSpec: {
          trimWidth,
          trimHeight,
          paperType,
          inkType,
          hasBleed,
        },
      } : {}),
    }));

    if (!formatResult.success) {
      return failure(formatResult.error);
    }

    const { buffer, mimeType, fileExtension, pageCount, fileSizeBytes } = formatResult.data;

    // Validate against KDP specs for print formats
    if (this.isPrintFormat(request.format)) {
      const validationErrors = this.validateKdpCompliance(pageCount, fileSizeBytes, request.format);
      if (validationErrors.length > 0) {
        return failure(Errors.validation('KDP compliance check failed', { errors: validationErrors }));
      }
    }

    // Upload the formatted file
    const storageKey = `publications/${tenantId}/${manuscript.id}/${request.format}/${Date.now()}.${fileExtension}`;
    const fileUrl = await this.deps.fileStorage.upload(storageKey, buffer, mimeType);

    // Calculate spine width for print formats
    let spineWidthInches: number | undefined;
    if (this.isPrintFormat(request.format)) {
      spineWidthInches = KDP_SPECS.spineWidth(pageCount, paperType);
    }

    this.log('info', 'Manuscript formatted successfully', {
      tenantId, manuscriptId: manuscript.id, format: request.format,
      pageCount, fileSizeBytes, spineWidthInches,
    });

    return success({
      fileUrl,
      format: request.format,
      pageCount,
      fileSizeBytes,
      ...(spineWidthInches !== undefined ? { spineWidthInches } : {}),
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // COVER DESIGN
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generate a book cover using AI.
   *
   * The author describes their vision and the AI generates options.
   * Covers are automatically sized to KDP specifications based on the
   * manuscript's trim size and estimated page count (for spine width).
   */
  async generateCover(
    tenantId: string,
    userId: string,
    request: GenerateCoverRequest,
  ): Promise<Result<BookCover>> {
    const manuscript = await this.deps.manuscriptRepo.findById(tenantId, request.manuscriptId);
    if (!manuscript) {
      return failure(Errors.notFound('Manuscript', request.manuscriptId));
    }
    if (!this.canEdit(manuscript, userId)) {
      return failure(Errors.forbidden('No edit access'));
    }

    // Calculate cover dimensions from manuscript specs
    const trimWidth = manuscript.trimWidth || 6.0;
    const trimHeight = manuscript.trimHeight || 9.0;
    const paperType = (manuscript.paperType || 'white') as 'white' | 'cream';
    const pageCount = manuscript.pageCountEstimate || 100;

    const coverDims = KDP_SPECS.coverDimensions(
      trimWidth, trimHeight, pageCount, paperType, manuscript.hasBleed,
    );

    // Build the AI prompt with technical constraints
    const enhancedPrompt = this.buildCoverPrompt(request.prompt, manuscript, coverDims, request.style);

    // Generate the front cover
    const frontResult = await this.deps.ai.generateImage({
      prompt: enhancedPrompt,
      size: `${Math.min(coverDims.widthPx, 4096)}x${Math.min(coverDims.heightPx, 4096)}`,
      model: 'gpt-image-1',
      quality: 'hd',
    });

    if (!frontResult.imageUrl) {
      return failure(Errors.external('GPT Image', 'Failed to generate cover image'));
    }

    // Upload the generated cover
    // In production: download AI image, re-host to our storage
    // const storageKey = `covers/${tenantId}/${manuscript.id}/${Date.now()}_front.png`;

    // Download the AI-generated image and upload to our storage
    // In production: fetch from AI service URL, then upload to S3
    const frontCoverUrl = frontResult.imageUrl; // Simplified — production fetches and re-hosts

    // If full cover requested (front + spine + back), generate separately
    let fullCoverUrl: string | undefined;
    if (request.includeBackCover) {
      // In production: generate back cover, composite with front + spine
      // const backPrompt = `Book back cover for "${manuscript.title}" by ${manuscript.authorName}. ` +
      //   `Include a book blurb area and barcode space at bottom right. ` +
      //   `Style should match the front cover. ${request.style || ''}`;
      // For now, we track that a full cover is needed
      fullCoverUrl = undefined; // Would be composited in production
    }

    // Generate thumbnail
    const thumbnailUrl = frontCoverUrl; // In production: resize to 300px wide

    const cover: BookCover = {
      id: this.generateId('cov'),
      tenantId,
      createdAt: new Date(),
      manuscriptId: manuscript.id,
      source: 'ai_generated',
      frontCoverUrl,
      fullCoverUrl,
      thumbnailUrl,
      widthPx: coverDims.widthPx,
      heightPx: coverDims.heightPx,
      dpiResolution: 300,
      colourSpace: 'RGB', // KDP accepts RGB; they convert to CMYK
      spineWidthInches: KDP_SPECS.spineWidth(pageCount, paperType),
      aiPrompt: request.prompt,
      aiModel: 'gpt-image-1',
      aiGenerationCost: frontResult.cost,
      isKdpCompliant: false, // Will be validated
      isSelected: false,
    };

    // Validate KDP compliance
    const validationErrors = this.validateCoverCompliance(cover, trimWidth, trimHeight);
    cover.isKdpCompliant = validationErrors.length === 0;
    cover.validationErrors = validationErrors.length > 0
      ? validationErrors.map(e => ({ message: e }))
      : undefined;

    const saved = await this.deps.coverRepo.save(tenantId, cover);

    await this.deps.eventBus.publish(ERUDITS_EVENTS.COVER_GENERATED, {
      tenantId, manuscriptId: manuscript.id, coverId: saved.id,
      source: 'ai_generated', isKdpCompliant: saved.isKdpCompliant,
    });

    return success(saved);
  }

  /**
   * Upload a custom cover image.
   */
  async uploadCover(
    tenantId: string,
    manuscriptId: string,
    userId: string,
    file: { data: Buffer; fileName: string; mimeType: string },
  ): Promise<Result<BookCover>> {
    const manuscript = await this.deps.manuscriptRepo.findById(tenantId, manuscriptId);
    if (!manuscript) {
      return failure(Errors.notFound('Manuscript', manuscriptId));
    }
    if (!this.canEdit(manuscript, userId)) {
      return failure(Errors.forbidden('No edit access'));
    }

    const storageKey = `covers/${tenantId}/${manuscriptId}/${Date.now()}_${file.fileName}`;
    const fileUrl = await this.deps.fileStorage.upload(storageKey, file.data, file.mimeType);

    // In production: extract image dimensions and DPI from the file buffer
    // using sharp or jimp. For now, we leave them to be validated manually.
    const cover: BookCover = {
      id: this.generateId('cov'),
      tenantId,
      createdAt: new Date(),
      manuscriptId,
      source: 'uploaded',
      frontCoverUrl: fileUrl,
      thumbnailUrl: fileUrl,
      isKdpCompliant: false, // Needs validation
      isSelected: false,
    };

    const saved = await this.deps.coverRepo.save(tenantId, cover);
    return success(saved);
  }

  /**
   * Select a cover for the manuscript — the one that will be used
   * in all publications.
   */
  async selectCover(
    tenantId: string,
    manuscriptId: string,
    coverId: string,
    userId: string,
  ): Promise<Result<BookCover>> {
    const manuscript = await this.deps.manuscriptRepo.findById(tenantId, manuscriptId);
    if (!manuscript) {
      return failure(Errors.notFound('Manuscript', manuscriptId));
    }
    if (!this.canEdit(manuscript, userId)) {
      return failure(Errors.forbidden('No edit access'));
    }

    const cover = await this.deps.coverRepo.findById(tenantId, coverId);
    if (!cover || cover.manuscriptId !== manuscriptId) {
      return failure(Errors.notFound('Cover', coverId));
    }

    await this.deps.coverRepo.setSelected(tenantId, manuscriptId, coverId);

    return success({ ...cover, isSelected: true });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLICATION & DISTRIBUTION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Publish a manuscript to one or more channels.
   *
   * This creates BookPublication records for each format and submits
   * to each requested distribution channel. The heavy lifting of
   * actually formatting the files has already been done via
   * formatManuscript() — this method uses those pre-generated files.
   */
  async publish(
    tenantId: string,
    userId: string,
    request: PublishRequest,
  ): Promise<Result<BookPublication[]>> {
    const manuscript = await this.deps.manuscriptRepo.findById(tenantId, request.manuscriptId);
    if (!manuscript) {
      return failure(Errors.notFound('Manuscript', request.manuscriptId));
    }
    if (manuscript.authorId !== userId) {
      return failure(Errors.forbidden('Only the manuscript author can publish'));
    }

    // Verify version exists
    const version = await this.deps.versionRepo.findById(tenantId, request.versionId);
    if (!version || version.manuscriptId !== manuscript.id) {
      return failure(Errors.notFound('Version', request.versionId));
    }

    // Verify a cover is selected
    const selectedCover = await this.deps.coverRepo.findSelected(tenantId, manuscript.id);
    if (!selectedCover) {
      return failure(Errors.validation('Please select a cover before publishing'));
    }

    const publications: BookPublication[] = [];

    for (const format of request.formats) {
      // Format the manuscript if not already done
      const formatResult = await this.formatManuscript(tenantId, userId, {
        manuscriptId: manuscript.id,
        versionId: request.versionId,
        format,
      });

      if (!formatResult.success) {
        return failure(Errors.internal(
          `Failed to format ${format}: ${formatResult.error.message}`
        ));
      }

      const formatted = formatResult.data;

      // Create publication record
      const publication: BookPublication = {
        id: this.generateId('pub'),
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
        manuscriptId: manuscript.id,
        versionId: request.versionId,
        format,
        fileUrl: formatted.fileUrl,
        fileSizeBytes: formatted.fileSizeBytes,
        pageCount: formatted.pageCount,
        spineWidthInches: formatted.spineWidthInches,
        coverId: selectedCover.id,
        pricing: request.pricing,
        channels: [],
        totalSales: 0,
        totalRevenueCents: 0,
        averageRating: 0,
      };

      // Create channel records for each requested distribution channel
      for (const channel of request.channels) {
        // Only certain formats go to certain channels
        if (!this.isFormatValidForChannel(format, channel)) continue;

        const channelRecord: PublicationChannelRecord = {
          id: this.generateId('pch'),
          tenantId,
          publicationId: publication.id,
          channel,
          status: 'not_submitted',
          listPriceCents: request.pricing[channel]?.priceCents,
          currency: request.pricing[channel]?.currency || 'AUD',
          royaltyPercent: this.getExpectedRoyalty(channel, request.pricing[channel]?.priceCents || 0),
        };

        publication.channels.push(channelRecord);
      }

      const saved = await this.deps.publicationRepo.save(tenantId, publication);
      publications.push(saved);

      await this.deps.eventBus.publish(ERUDITS_EVENTS.PUBLICATION_CREATED, {
        tenantId, publicationId: saved.id, manuscriptId: manuscript.id,
        format, channels: request.channels,
      });
    }

    // Update manuscript status
    await this.deps.manuscriptRepo.update(tenantId, manuscript.id, {
      status: 'published' as ManuscriptStatus,
      updatedAt: new Date(),
    });

    // Kick off channel submissions asynchronously
    for (const pub of publications) {
      for (const channel of pub.channels) {
        this.submitToChannel(tenantId, pub, channel).catch(err => {
          this.log('error', `Channel submission failed: ${channel.channel}`, {
            publicationId: pub.id, error: String(err),
          });
        });
      }
    }

    return success(publications);
  }

  /**
   * Submit a publication to a specific distribution channel.
   *
   * Each channel has its own submission process:
   *   - Scholarly Direct: Instantly live (just creates the listing)
   *   - Amazon KDP: Uploads via KDP API, enters review queue
   *   - IngramSpark: Uploads via IngramSpark API, enters review queue
   */
  private async submitToChannel(
    tenantId: string,
    publication: BookPublication,
    channel: PublicationChannelRecord,
  ): Promise<void> {
    this.log('info', `Submitting to ${channel.channel}`, {
      publicationId: publication.id,
    });

    try {
      switch (channel.channel) {
        case 'scholarly_direct':
        case 'scholarly_marketplace':
          // Scholarly channels are instant — the publication is immediately live
          await this.deps.publicationRepo.update(tenantId, publication.id, {
            channels: publication.channels.map(c =>
              c.id === channel.id
                ? { ...c, status: 'live' as ChannelPublicationStatus, submittedAt: new Date(), approvedAt: new Date() }
                : c
            ),
          });
          break;

        case 'amazon_kdp':
          // In production: call KDP Content API to upload manuscript + cover + metadata
          // For now: mark as submitted (pending review)
          await this.deps.publicationRepo.update(tenantId, publication.id, {
            channels: publication.channels.map(c =>
              c.id === channel.id
                ? { ...c, status: 'pending_review' as ChannelPublicationStatus, submittedAt: new Date() }
                : c
            ),
          });
          break;

        case 'ingram_spark':
          // In production: call IngramSpark API
          await this.deps.publicationRepo.update(tenantId, publication.id, {
            channels: publication.channels.map(c =>
              c.id === channel.id
                ? { ...c, status: 'pending_review' as ChannelPublicationStatus, submittedAt: new Date() }
                : c
            ),
          });
          break;

        case 'school_direct':
          // School orders are handled through the storefront, not submitted
          break;
      }

      await this.deps.eventBus.publish(ERUDITS_EVENTS.PUBLICATION_SUBMITTED, {
        tenantId, publicationId: publication.id, channel: channel.channel,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log('error', `Channel submission error: ${channel.channel}`, {
        publicationId: publication.id, error: message,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SALES & ANALYTICS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Record a sale from any channel.
   *
   * For Scholarly Direct: called when Stripe payment succeeds.
   * For KDP/IngramSpark: called when sales reports are synced.
   */
  async recordSale(
    tenantId: string,
    params: {
      publicationId: string;
      channel: DistributionChannel;
      buyerId?: string | undefined;
      buyerEmail?: string | undefined;
      institutionId?: string | undefined;
      quantitySold: number;
      unitPriceCents: number;
      currency?: string | undefined;
      stripePaymentIntentId?: string | undefined;
      externalTransactionId?: string | undefined;
      countryCode?: string | undefined;
    },
  ): Promise<Result<SalesRecord>> {
    const publication = await this.deps.publicationRepo.findById(tenantId, params.publicationId);
    if (!publication) {
      return failure(Errors.notFound('Publication', params.publicationId));
    }

    const totalPriceCents = params.unitPriceCents * params.quantitySold;
    const channelFeeCents = this.calculateChannelFee(params.channel, totalPriceCents);
    const platformFeeCents = this.calculatePlatformPublishingFee(params.channel, totalPriceCents);
    const authorEarningsCents = totalPriceCents - channelFeeCents - platformFeeCents;

    const record: SalesRecord = {
      id: this.generateId('sale'),
      tenantId,
      createdAt: new Date(),
      publicationId: params.publicationId,
      channel: params.channel,
      buyerId: params.buyerId,
      buyerEmail: params.buyerEmail,
      institutionId: params.institutionId,
      quantitySold: params.quantitySold,
      unitPriceCents: params.unitPriceCents,
      totalPriceCents,
      platformFeeCents,
      channelFeeCents,
      authorEarningsCents,
      currency: params.currency || 'AUD',
      stripePaymentIntentId: params.stripePaymentIntentId,
      externalTransactionId: params.externalTransactionId,
      countryCode: params.countryCode,
      isRefunded: false,
    };

    const saved = await this.deps.salesRepo.save(tenantId, record);

    // Update publication metrics
    await this.deps.publicationRepo.update(tenantId, params.publicationId, {
      totalSales: publication.totalSales + params.quantitySold,
      totalRevenueCents: publication.totalRevenueCents + totalPriceCents,
    });

    await this.deps.eventBus.publish(ERUDITS_EVENTS.SALE_RECORDED, {
      tenantId, salesRecordId: saved.id, publicationId: params.publicationId,
      channel: params.channel, totalPriceCents, authorEarningsCents,
    });

    return success(saved);
  }

  /**
   * Get publishing analytics for an author.
   */
  async getPublishingAnalytics(
    tenantId: string,
    authorId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<Result<PublishingAnalytics>> {
    const manuscripts = await this.deps.manuscriptRepo.findByAuthor(tenantId, authorId, {
      page: 1, pageSize: 1000,
    });

    const revenueByChannel = await this.deps.salesRepo.getRevenueByChannel(
      tenantId, authorId, fromDate, toDate,
    );

    const totalRevenue = await this.deps.salesRepo.getTotalRevenue(
      tenantId, authorId, fromDate, toDate,
    );

    return success({
      authorId,
      period: { from: fromDate, to: toDate },
      totalManuscripts: manuscripts.total,
      publishedManuscripts: manuscripts.items.filter(m => m.status === 'published').length,
      totalRevenueCents: totalRevenue,
      revenueByChannel,
      manuscripts: manuscripts.items.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        wordCount: m.wordCount,
        pageCountEstimate: m.pageCountEstimate,
      })),
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AI WRITING ASSISTANT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * AI-assisted content generation for the manuscript editor.
   *
   * This powers the in-editor AI assistant. Érudits can say:
   *   "Generate 10 example sentences using passé composé with être verbs,
   *    suitable for Year 11 Unit 2"
   * and the AI produces curriculum-aligned content in her writing style.
   */
  async aiAssist(
    tenantId: string,
    manuscriptId: string,
    _userId: string,
    prompt: string,
    context?: {
      chapterTitle?: string | undefined;
      curriculumCode?: string | undefined;
      targetLanguage?: string | undefined;
      contentType?: 'vocabulary_list' | 'grammar_table' | 'exercise' | 'comprehension' | 'narrative' | undefined;
    },
  ): Promise<Result<{ generatedContent: string; tokensUsed: number }>> {
    const manuscript = await this.deps.manuscriptRepo.findById(tenantId, manuscriptId);
    if (!manuscript) {
      return failure(Errors.notFound('Manuscript', manuscriptId));
    }

    const systemPrompt = this.buildWritingAssistantPrompt(manuscript, context);

    const result = await this.deps.ai.complete({
      systemPrompt,
      userPrompt: prompt,
      maxTokens: this.deps.config.aiMaxTokens,
      temperature: 0.7,
    });

    return success({
      generatedContent: result.text,
      tokensUsed: result.tokensUsed,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  private canEdit(manuscript: Manuscript, userId: string): boolean {
    return manuscript.authorId === userId || manuscript.collaboratorIds.includes(userId);
  }

  private createEmptyDocument(title: string): Record<string, unknown> {
    return {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: title }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '' }],
        },
      ],
    };
  }

  private countWords(content: Record<string, unknown>): number {
    const text = this.extractText(content);
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  private extractText(node: Record<string, unknown>): string {
    if (node.type === 'text' && typeof node.text === 'string') {
      return node.text;
    }
    if (Array.isArray(node.content)) {
      return node.content.map((child: Record<string, unknown>) => this.extractText(child)).join(' ');
    }
    return '';
  }

  private getIsbnForFormat(manuscript: Manuscript, format: PublicationFormat): string | undefined {
    switch (format) {
      case 'ebook_epub':
      case 'ebook_kpf':
        return manuscript.isbnEbook;
      case 'paperback':
      case 'print_pdf':
        return manuscript.isbnPaperback;
      case 'hardcover':
        return manuscript.isbnHardcover;
      default:
        return undefined;
    }
  }

  private isPrintFormat(format: PublicationFormat): boolean {
    return ['paperback', 'hardcover', 'print_pdf'].includes(format);
  }

  private isFormatValidForChannel(format: PublicationFormat, channel: DistributionChannel): boolean {
    const validCombinations: Record<string, string[]> = {
      scholarly_direct: ['ebook_epub', 'digital_pdf', 'docx_modifiable'],
      scholarly_marketplace: ['ebook_epub', 'digital_pdf'],
      amazon_kdp: ['ebook_epub', 'ebook_kpf', 'paperback', 'hardcover'],
      ingram_spark: ['paperback', 'hardcover'],
      school_direct: ['digital_pdf', 'docx_modifiable', 'print_pdf'],
    };
    return (validCombinations[channel] || []).includes(format);
  }

  private getExpectedRoyalty(channel: DistributionChannel, priceCents: number): number {
    switch (channel) {
      case 'scholarly_direct': return 85;
      case 'scholarly_marketplace': return 75;
      case 'amazon_kdp':
        // KDP: 50% for paperback; 35% or 70% for ebook depending on price
        return priceCents <= 999 ? 50 : 60; // Simplified
      case 'ingram_spark': return 55; // Varies significantly
      case 'school_direct': return 90; // Negotiated directly
      default: return 50;
    }
  }

  private calculateChannelFee(channel: DistributionChannel, totalCents: number): number {
    switch (channel) {
      case 'scholarly_direct':
      case 'scholarly_marketplace':
        // Stripe processing fee only: 2.9% + $0.30
        return Math.round(totalCents * 0.029) + 30;
      case 'amazon_kdp':
        return Math.round(totalCents * 0.40); // ~40% retained by Amazon
      case 'ingram_spark':
        return Math.round(totalCents * 0.45); // ~45% print + distribution
      case 'school_direct':
        return Math.round(totalCents * 0.029) + 30; // Just Stripe fees
      default:
        return 0;
    }
  }

  private calculatePlatformPublishingFee(channel: DistributionChannel, totalCents: number): number {
    // Scholarly takes a smaller fee on publishing than on resource marketplace
    // because the author has already done significant work creating the book
    switch (channel) {
      case 'scholarly_direct': return Math.round(totalCents * 0.10); // 10%
      case 'scholarly_marketplace': return Math.round(totalCents * 0.15); // 15%
      case 'amazon_kdp':
      case 'ingram_spark':
        return 0; // No additional Scholarly fee on external channels
      case 'school_direct': return Math.round(totalCents * 0.05); // 5%
      default: return 0;
    }
  }

  private validateKdpCompliance(
    pageCount: number,
    fileSizeBytes: number,
    format: PublicationFormat,
  ): string[] {
    const errors: string[] = [];

    if (pageCount < KDP_SPECS.minPages) {
      errors.push(`Page count (${pageCount}) is below KDP minimum (${KDP_SPECS.minPages})`);
    }

    const maxPages = format === 'hardcover'
      ? KDP_SPECS.maxPagesHardcover
      : KDP_SPECS.maxPagesPaperback;

    if (pageCount > maxPages) {
      errors.push(`Page count (${pageCount}) exceeds KDP maximum for ${format} (${maxPages})`);
    }

    if (fileSizeBytes > KDP_SPECS.maxFileSizeBytes) {
      errors.push(`File size (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB) exceeds KDP maximum (650MB)`);
    }

    return errors;
  }

  private validateCoverCompliance(
    cover: BookCover,
    trimWidth: number,
    trimHeight: number,
  ): string[] {
    const errors: string[] = [];

    if (cover.dpiResolution && cover.dpiResolution < KDP_SPECS.minDpi) {
      errors.push(`Cover resolution (${cover.dpiResolution} DPI) is below KDP minimum (${KDP_SPECS.minDpi} DPI)`);
    }

    // Minimum dimensions check
    const minWidthPx = Math.ceil(trimWidth * KDP_SPECS.minDpi);
    const minHeightPx = Math.ceil(trimHeight * KDP_SPECS.minDpi);

    if (cover.widthPx && cover.widthPx < minWidthPx) {
      errors.push(`Cover width (${cover.widthPx}px) is below minimum for this trim size (${minWidthPx}px)`);
    }
    if (cover.heightPx && cover.heightPx < minHeightPx) {
      errors.push(`Cover height (${cover.heightPx}px) is below minimum for this trim size (${minHeightPx}px)`);
    }

    return errors;
  }

  private buildCoverPrompt(
    userPrompt: string,
    manuscript: Manuscript,
    dims: { widthPx: number; heightPx: number },
    style?: string,
  ): string {
    return [
      `Professional book cover design for an educational publication.`,
      `Book: "${manuscript.title}"${manuscript.subtitle ? ` — ${manuscript.subtitle}` : ''}`,
      `Author: ${manuscript.authorName}`,
      `Subject: ${manuscript.subjectArea || 'Education'}`,
      `Target audience: ${manuscript.yearLevels.join(', ') || 'Students'}`,
      `Style: ${style || 'Clean, modern, professional educational book cover'}`,
      `Language: ${manuscript.language === 'fr' ? 'French' : manuscript.language}`,
      ``,
      `Author's vision: ${userPrompt}`,
      ``,
      `Technical: Output dimensions ${dims.widthPx}×${dims.heightPx}px at 300 DPI.`,
      `Include clear space for title text at top and author name at bottom.`,
      `No text in the image — text will be overlaid programmatically.`,
    ].join('\n');
  }

  private buildWritingAssistantPrompt(
    manuscript: Manuscript,
    context?: {
      chapterTitle?: string | undefined;
      curriculumCode?: string | undefined;
      targetLanguage?: string | undefined;
      contentType?: string | undefined;
    },
  ): string {
    const parts = [
      `You are an AI writing assistant helping create educational content.`,
      `Book: "${manuscript.title}" by ${manuscript.authorName}`,
      `Subject: ${manuscript.subjectArea || 'Education'}`,
      `Primary language: ${manuscript.language}`,
    ];

    if (manuscript.secondaryLanguage) {
      parts.push(`Bilingual: ${manuscript.language}/${manuscript.secondaryLanguage}`);
    }
    if (context?.chapterTitle) {
      parts.push(`Current chapter: ${context.chapterTitle}`);
    }
    if (context?.curriculumCode) {
      parts.push(`Curriculum: ${context.curriculumCode}`);
    }
    if (context?.targetLanguage) {
      parts.push(`Target language for generated content: ${context.targetLanguage}`);
    }
    if (context?.contentType) {
      parts.push(`Content type requested: ${context.contentType}`);
    }

    parts.push(
      ``,
      `Generate content that is:`,
      `- Appropriate for the target year level`,
      `- Aligned with the specified curriculum`,
      `- Consistent with the book's existing style and terminology`,
      `- Ready to be inserted into the manuscript`,
    );

    return parts.join('\n');
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${timestamp}${random}`;
  }

  private log(level: string, message: string, data?: Record<string, unknown>): void {
    const entry = { timestamp: new Date().toISOString(), service: this.serviceName, level, message, ...data };
    if (level === 'error') console.error(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
  }
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface PublishingAnalytics {
  authorId: string;
  period: { from: Date; to: Date };
  totalManuscripts: number;
  publishedManuscripts: number;
  totalRevenueCents: number;
  revenueByChannel: Record<string, number>;
  manuscripts: Array<{
    id: string;
    title: string;
    status: ManuscriptStatus;
    wordCount: number;
    pageCountEstimate: number;
  }>;
}
