/**
 * ============================================================================
 * SCHOLARLY PLATFORM — Migration Transform Service (Stage 3)
 * ============================================================================
 *
 * The translator between two worlds. If the Squarespace extraction (Stage 2)
 * produced a detailed inventory of everything in the old house, this service
 * is the interior designer who walks through each item and decides: "This
 * Squarespace page becomes a Scholarly CMS block. This product becomes a
 * digital resource in the storefront. This member becomes an invitation to
 * join the new platform."
 *
 * The critical difference between this and a naive copy is curriculum
 * awareness. For Érudits, a Squarespace product called "VCE French Exam
 * Pack" doesn't just become a generic digital resource — it gets tagged
 * with the 'vce-french' curriculum code, mapped to the 'exam-prep'
 * category, and flagged for dual licensing (individual + school). This
 * enrichment is what makes the storefront searchable by curriculum
 * framework on day one.
 *
 * ## Port Source
 *
 * This service adapts the Stage 3 logic from:
 *   erudits/src/services/migration.service.ts (lines 310–807)
 *
 * Key adaptations from Érudits → Scholarly:
 *   - Returns Result<T> instead of void (error handling convention)
 *   - Uses DI constructor instead of flat deps object
 *   - Publishes NATS events for each transform phase
 *   - Accepts tenant-specific category mappings via deps
 *   - Adds retransformItem() for review-edit-resubmit workflow
 *   - Validates migration status before transforming (state machine)
 *
 * @module scholarly/migrations/migration-transform.service
 * @version 1.0.0
 */

import type {
  Result,
  StrictPartial,
  PlatformMigration,
  MigrationContentItem,
  ContentSourceType,
  SquarespacePage,
  SquarespaceProduct,
  SquarespacePost,
  SquarespaceMember,
  TransformedCmsPage,
  TransformedDigitalResource,
  TransformedUserInvitation,
  CmsBlock,
  IMigrationTransformService,
  TransformResult,
  TransformServiceDeps,
  ProductCategoryMapping,
} from './migration-transform.types';

import {
  success,
  failure,
  Errors,
  MIGRATION_EVENTS,
  ERUDITS_CATEGORY_MAP,
} from './migration-transform.types';


// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class MigrationTransformService implements IMigrationTransformService {
  private readonly serviceName = 'MigrationTransformService';

  /** Product category mapping for the current tenant. */
  private readonly categoryMap: Record<string, ProductCategoryMapping>;

  constructor(private readonly deps: TransformServiceDeps) {
    this.categoryMap = deps.categoryMap ?? ERUDITS_CATEGORY_MAP;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Run the full transformation pipeline for a migration.
   *
   * This is the main entry point. It reads all extracted (pending) content
   * items, transforms each one to a Scholarly entity, writes the transform
   * results back, generates URL mappings for 301 redirects, and transitions
   * the migration to 'ready_for_review'.
   *
   * The method is idempotent: if called again on a migration that's already
   * been transformed, it will re-transform pending items and skip items
   * that are already mapped. This handles the case where a previous
   * transform run was interrupted.
   */
  async runTransformation(
    tenantId: string,
    migrationId: string,
  ): Promise<Result<TransformResult>> {
    this.log('info', 'Starting transformation', { tenantId, migrationId });

    // ── Validate migration state ──
    const migration = await this.deps.migrationRepo.findById(tenantId, migrationId);
    if (!migration) {
      return failure(Errors.notFound('Migration', migrationId));
    }

    // Transform is valid from 'extracting' (auto-triggered after extraction),
    // 'transforming' (resume after interruption), or 'ready_for_review'
    // (re-transform after edits).
    const validStatuses = ['extracting', 'transforming', 'ready_for_review'];
    if (!validStatuses.includes(migration.status)) {
      return failure(Errors.validation(
        `Migration is in '${migration.status}' state. ` +
        `Transform is only valid from: ${validStatuses.join(', ')}.`
      ));
    }

    // Transition to 'transforming'
    await this.updateMigration(tenantId, migrationId, {
      status: 'transforming',
      currentStep: 'Transforming pages into CMS content',
      progressPercent: 50,
    });

    await this.deps.eventBus.publish(MIGRATION_EVENTS.TRANSFORM_STARTED, {
      tenantId,
      migrationId,
    });

    // ── Load all content items ──
    const contentItems = await this.deps.contentRepo.findByMigration(tenantId, migrationId);

    // Track counts
    const transformed = { pages: 0, products: 0, posts: 0, members: 0, images: 0 };
    let flaggedForReview = 0;

    // ── Transform Pages ──
    const pageItems = contentItems.filter(i => i.sourceType === 'page' && i.status === 'pending');
    for (const item of pageItems) {
      const page = item.sourceData as unknown as SquarespacePage;
      if (!page || !page.slug) {
        await this.markItemFailed(tenantId, item.id, 'Missing page data or slug in source');
        continue;
      }

      const mapped = this.transformPage(page);

      await this.deps.contentRepo.update(tenantId, item.id, {
        targetType: 'cms_page',
        targetUrl: `/${page.slug}`,
        status: 'mapped',
        sourceData: { ...item.sourceData, transformed: mapped },
      });

      await this.deps.eventBus.publish(MIGRATION_EVENTS.ITEM_TRANSFORMED, {
        tenantId, migrationId, itemId: item.id, sourceType: 'page', targetType: 'cms_page',
      });

      transformed.pages++;
    }

    // ── Transform Products → DigitalResources ──
    await this.updateMigration(tenantId, migrationId, {
      currentStep: 'Transforming products into resources',
      progressPercent: 60,
    });

    const productItems = contentItems.filter(i => i.sourceType === 'product' && i.status === 'pending');
    for (const item of productItems) {
      const product = item.sourceData as unknown as SquarespaceProduct;
      if (!product || !product.slug) {
        await this.markItemFailed(tenantId, item.id, 'Missing product data or slug in source');
        continue;
      }

      const mapped = this.transformProduct(product);
      const needsReview = this.productNeedsReview(product);

      if (needsReview) {
        flaggedForReview++;
      }

      await this.deps.contentRepo.update(tenantId, item.id, {
        targetType: 'digital_resource',
        targetUrl: `/resources/${product.slug}`,
        status: 'mapped',
        requiresReview: needsReview,
        reviewNotes: needsReview ? this.getProductReviewNotes(product) : undefined,
        sourceData: { ...item.sourceData, transformed: mapped },
      });

      await this.deps.eventBus.publish(MIGRATION_EVENTS.ITEM_TRANSFORMED, {
        tenantId, migrationId, itemId: item.id, sourceType: 'product', targetType: 'digital_resource',
        flagged: needsReview,
      });

      transformed.products++;
    }

    // ── Transform Posts → CMS Blog Posts ──
    await this.updateMigration(tenantId, migrationId, {
      currentStep: 'Transforming blog posts',
      progressPercent: 70,
    });

    const postItems = contentItems.filter(i => i.sourceType === 'post' && i.status === 'pending');
    for (const item of postItems) {
      const post = item.sourceData as unknown as SquarespacePost;
      if (!post || !post.slug) {
        await this.markItemFailed(tenantId, item.id, 'Missing post data or slug in source');
        continue;
      }

      const mapped = this.transformPost(post);

      await this.deps.contentRepo.update(tenantId, item.id, {
        targetType: 'cms_page',
        targetUrl: `/blog/${post.slug}`,
        status: 'mapped',
        sourceData: { ...item.sourceData, transformed: mapped },
      });

      await this.deps.eventBus.publish(MIGRATION_EVENTS.ITEM_TRANSFORMED, {
        tenantId, migrationId, itemId: item.id, sourceType: 'post', targetType: 'cms_page',
      });

      transformed.posts++;
    }

    // ── Transform Members → User Invitations ──
    await this.updateMigration(tenantId, migrationId, {
      currentStep: 'Processing member accounts',
      progressPercent: 80,
    });

    const memberItems = contentItems.filter(i => i.sourceType === 'member' && i.status === 'pending');
    for (const item of memberItems) {
      const member = item.sourceData as unknown as SquarespaceMember;
      if (!member || !member.email) {
        await this.markItemFailed(tenantId, item.id, 'Missing member data or email in source');
        continue;
      }

      const mapped = this.transformMember(member);

      await this.deps.contentRepo.update(tenantId, item.id, {
        targetType: 'user',
        status: 'mapped',
        sourceData: { ...item.sourceData, transformed: mapped },
      });

      await this.deps.eventBus.publish(MIGRATION_EVENTS.ITEM_TRANSFORMED, {
        tenantId, migrationId, itemId: item.id, sourceType: 'member', targetType: 'user',
      });

      transformed.members++;
    }

    // ── Count image items (already downloaded, no transform needed) ──
    const imageItems = contentItems.filter(i => i.sourceType === 'image');
    transformed.images = imageItems.length;
    // Mark image items as mapped (they pass through without transformation)
    for (const item of imageItems.filter(i => i.status === 'pending')) {
      await this.deps.contentRepo.update(tenantId, item.id, {
        targetType: 'media',
        status: 'mapped',
      });
    }

    // ── Generate URL Mapping for 301 Redirects ──
    //
    // URL mappings are critical for SEO. When a site moves from Squarespace
    // to Scholarly, every old URL needs a 301 redirect to the new URL so
    // Google transfers the ranking authority. Think of it as a mail forwarding
    // service: every letter sent to the old address gets automatically
    // redirected to the new one.
    const urlMappings: Record<string, string> = {};
    const allMapped = await this.deps.contentRepo.findByMigration(
      tenantId, migrationId, { status: 'mapped' },
    );
    for (const item of allMapped) {
      if (item.sourceUrl && item.targetUrl) {
        urlMappings[item.sourceUrl] = item.targetUrl;
      }
    }

    // ── Transition to ready_for_review ──
    await this.updateMigration(tenantId, migrationId, {
      status: 'ready_for_review',
      currentStep: 'Ready for your review',
      progressPercent: 85,
      urlMappings,
    });

    await this.deps.eventBus.publish(MIGRATION_EVENTS.TRANSFORM_COMPLETED, {
      tenantId,
      migrationId,
      transformed,
      flaggedForReview,
      urlMappingCount: Object.keys(urlMappings).length,
    });

    this.log('info', 'Transformation complete, awaiting review', {
      tenantId, migrationId, ...transformed, flaggedForReview,
    });

    const updatedMigration = await this.deps.migrationRepo.findById(tenantId, migrationId);

    return success({
      migration: updatedMigration!,
      transformed,
      flaggedForReview,
      urlMappings,
    });
  }

  /**
   * Re-transform a single item after the tutor edits it.
   *
   * When the tutor marks an item as 'needs_edit' and submits changes via
   * the review dashboard, this method applies the edits to the source data,
   * re-runs the appropriate transform, and moves the item back to 'mapped'
   * so it can be reviewed again.
   *
   * Think of it as a tailor taking back a garment after the fitting: the
   * customer said "the sleeves are too long," so the tailor adjusts and
   * presents it again for approval.
   */
  async retransformItem(
    tenantId: string,
    migrationId: string,
    itemId: string,
    edits: Record<string, unknown>,
  ): Promise<Result<MigrationContentItem>> {
    const item = await this.deps.contentRepo.findById(tenantId, itemId);
    if (!item) {
      return failure(Errors.notFound('MigrationContentItem', itemId));
    }

    if (item.migrationId !== migrationId) {
      return failure(Errors.validation(
        `Item ${itemId} belongs to migration ${item.migrationId}, not ${migrationId}`
      ));
    }

    if (item.status !== 'needs_edit' && item.status !== 'mapped') {
      return failure(Errors.validation(
        `Item is in '${item.status}' state. Retransform requires 'needs_edit' or 'mapped'.`
      ));
    }

    // Merge edits into source data
    const updatedSourceData = {
      ...item.sourceData,
      ...edits,
    };

    // Re-run the appropriate transform
    let transformed: TransformedCmsPage | TransformedDigitalResource | TransformedUserInvitation;
    let targetUrl: string | undefined;
    let targetType = item.targetType;

    switch (item.sourceType) {
      case 'page': {
        const page = updatedSourceData as unknown as SquarespacePage;
        transformed = this.transformPage(page);
        targetUrl = `/${page.slug}`;
        targetType = 'cms_page';
        break;
      }
      case 'product': {
        const product = updatedSourceData as unknown as SquarespaceProduct;
        transformed = this.transformProduct(product);
        targetUrl = `/resources/${product.slug}`;
        targetType = 'digital_resource';
        break;
      }
      case 'post': {
        const post = updatedSourceData as unknown as SquarespacePost;
        transformed = this.transformPost(post);
        targetUrl = `/blog/${post.slug}`;
        targetType = 'cms_page';
        break;
      }
      case 'member': {
        const member = updatedSourceData as unknown as SquarespaceMember;
        transformed = this.transformMember(member);
        targetType = 'user';
        break;
      }
      default: {
        return failure(Errors.validation(`Cannot retransform source type: ${item.sourceType}`));
      }
    }

    const updated = await this.deps.contentRepo.update(tenantId, itemId, {
      targetType,
      targetUrl,
      status: 'mapped',
      reviewNotes: undefined, // Clear previous review notes
      sourceData: { ...updatedSourceData, transformed: transformed as unknown as Record<string, unknown> },
    });

    this.log('info', 'Item retransformed after edit', {
      tenantId, migrationId, itemId, sourceType: item.sourceType,
    });

    return success(updated);
  }


  // ═══════════════════════════════════════════════════════════════════════
  // TRANSFORM METHODS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Transform a Squarespace page into a Scholarly CMS page.
   *
   * Squarespace pages are HTML blobs. We parse the HTML into a structured
   * block format that the Scholarly CMS can render and edit. SEO metadata
   * (title, description) is carefully preserved so Google rankings survive
   * the transition — losing page rank during a migration is one of the
   * costliest mistakes a business can make.
   */
  private transformPage(page: SquarespacePage): TransformedCmsPage {
    return {
      type: 'cms_page',
      slug: page.slug,
      title: page.title,
      seoTitle: page.seoTitle || page.title,
      seoDescription: page.seoDescription || '',
      content: this.htmlToBlocks(page.content),
      isEnabled: page.isEnabled,
      sourceUrl: page.url,
      migratedAt: new Date().toISOString(),
    };
  }

  /**
   * Transform a Squarespace product into a Scholarly DigitalResource.
   *
   * Key decisions:
   *   - Price is converted from dollars to cents (integer arithmetic avoids
   *     floating-point rounding errors — the bane of financial software).
   *   - Category mapping enriches the product with Scholarly curriculum tags
   *     and licence types using the tenant-specific category map.
   *   - Digital products map directly; physical products are flagged for
   *     review because they can't be automatically migrated to a digital
   *     storefront.
   */
  private transformProduct(product: SquarespaceProduct): TransformedDigitalResource {
    const categoryMatch = this.findCategoryMapping(product.categories, product.tags);

    return {
      title: product.title,
      slug: product.slug,
      description: this.stripHtml(product.description),
      priceIndividualCents: Math.round(product.price * 100),
      currency: product.currency || 'AUD',
      format: this.inferResourceFormat(product),
      tags: [...product.tags, ...product.categories],
      coverImageUrl: product.images[0],
      sourceProductId: product.id,
      scholarlyCategory: categoryMatch?.scholarlyCategory,
      curriculumTag: categoryMatch?.curriculumTag,
      licenceType: categoryMatch?.licenceType,
    };
  }

  /**
   * Transform a Squarespace blog post into a Scholarly CMS blog entry.
   *
   * Blog posts carry additional metadata (publish date, author, excerpt)
   * that CMS pages don't have. The block content conversion is identical,
   * but the wrapper includes the blog-specific fields so the Scholarly
   * blog engine can display them with proper attribution and chronology.
   */
  private transformPost(post: SquarespacePost): TransformedCmsPage {
    return {
      type: 'blog_post',
      slug: post.slug,
      title: post.title,
      seoTitle: post.title,
      seoDescription: post.excerpt || '',
      content: this.htmlToBlocks(post.content),
      isEnabled: true,
      sourceUrl: `/blog/${post.slug}`,
      migratedAt: new Date().toISOString(),
      publishedAt: post.publishedAt,
      author: post.author,
      tags: post.tags,
      excerpt: post.excerpt,
      featuredImageUrl: post.featuredImageUrl,
    };
  }

  /**
   * Transform a Squarespace member into a Scholarly user invitation.
   *
   * This doesn't create an account — it creates an invitation that will
   * be emailed during import (Stage 5). The member must opt in to the
   * new platform by clicking the invitation link and setting a password.
   * This respects privacy and avoids the surprise of discovering your
   * account has been moved without your consent.
   */
  private transformMember(member: SquarespaceMember): TransformedUserInvitation {
    return {
      type: 'user_invitation',
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      role: 'student', // Default role; tutor can adjust during review
      subscriptionStatus: member.subscriptionStatus,
      migratedAt: new Date().toISOString(),
    };
  }


  // ═══════════════════════════════════════════════════════════════════════
  // HTML → BLOCKS PARSER
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Convert HTML content to a Scholarly CMS block structure.
   *
   * This is the heart of the page transformation. Squarespace stores page
   * content as free-form HTML. Scholarly's CMS uses a structured block
   * format (similar to EditorJS or Notion's block model) where each
   * element is independently addressable and editable.
   *
   * The parser handles the most common HTML patterns found in Squarespace
   * pages. Think of it as a translator who can handle everyday conversation
   * fluently — the occasional unusual idiom might not translate perfectly,
   * but 95% of the content comes through correctly.
   *
   * Supported elements:
   *   <h1>–<h6>     → heading block
   *   <p>            → paragraph block
   *   <img>          → image block
   *   <ul>, <ol>     → list block
   *   <blockquote>   → callout block
   *
   * Unsupported elements fall back to paragraph blocks with the text
   * content extracted.
   */
  htmlToBlocks(html: string): CmsBlock[] {
    if (!html) return [];

    // Strip script and style tags — these are never part of the visible
    // content and can contain harmful code.
    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    const blocks: CmsBlock[] = [];

    // Split on block-level elements. This regex finds the start of each
    // block-level HTML element and splits the content into segments,
    // each starting with a block-level tag.
    const segments = cleaned.split(
      /(?=<(?:h[1-6]|p|div|ul|ol|table|blockquote|img)[^>]*>)/i
    );

    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;

      // ── Headings ──
      const headingMatch = trimmed.match(/^<h([1-6])[^>]*>(.*?)<\/h[1-6]>/is);
      if (headingMatch) {
        const level = parseInt(headingMatch[1]!, 10) as 1 | 2 | 3 | 4 | 5 | 6;
        const text = this.stripHtml(headingMatch[2]!);
        if (text.length > 0) {
          blocks.push({ type: 'heading', level, text });
        }
        continue;
      }

      // ── Images ──
      const imgSrcMatch = trimmed.match(/<img[^>]*src=["']([^"']+)["']/i);
      if (imgSrcMatch) {
        const altMatch = trimmed.match(/alt=["']([^"']*)["']/i);
        blocks.push({
          type: 'image',
          src: imgSrcMatch[1]!,
          alt: altMatch ? altMatch[1]! : '',
        });
        continue;
      }

      // ── Unordered Lists ──
      const ulMatch = trimmed.match(/^<ul[^>]*>([\s\S]*?)<\/ul>/i);
      if (ulMatch) {
        const items = this.extractListItems(ulMatch[1]!);
        if (items.length > 0) {
          blocks.push({ type: 'list', style: 'unordered', items });
        }
        continue;
      }

      // ── Ordered Lists ──
      const olMatch = trimmed.match(/^<ol[^>]*>([\s\S]*?)<\/ol>/i);
      if (olMatch) {
        const items = this.extractListItems(olMatch[1]!);
        if (items.length > 0) {
          blocks.push({ type: 'list', style: 'ordered', items });
        }
        continue;
      }

      // ── Blockquotes → Callout ──
      const bqMatch = trimmed.match(/^<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
      if (bqMatch) {
        const text = this.stripHtml(bqMatch[1]!);
        if (text.length > 0) {
          blocks.push({ type: 'callout', text });
        }
        continue;
      }

      // ── Tables ──
      const tableMatch = trimmed.match(/^<table[^>]*>([\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const tableBlock = this.parseTable(tableMatch[1]!);
        if (tableBlock) {
          blocks.push(tableBlock);
        }
        continue;
      }

      // ── Default: Paragraph ──
      const text = this.stripHtml(trimmed);
      if (text.length > 0) {
        blocks.push({ type: 'paragraph', text });
      }
    }

    return blocks;
  }

  /**
   * Extract text items from a <ul> or <ol> inner HTML.
   */
  private extractListItems(listHtml: string): string[] {
    const items: string[] = [];
    const liMatches = listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    for (const match of liMatches) {
      const text = this.stripHtml(match[1]!);
      if (text.length > 0) {
        items.push(text);
      }
    }
    return items;
  }

  /**
   * Parse an HTML table into a CmsTableBlock.
   * Returns null if the table has no meaningful content.
   */
  private parseTable(tableHtml: string): CmsBlock | null {
    const headers: string[] = [];
    const rows: string[][] = [];

    // Extract header cells from <th> elements
    const thMatches = tableHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi);
    for (const match of thMatches) {
      headers.push(this.stripHtml(match[1]!));
    }

    // Extract rows from <tr> elements (skip the header row if we found headers)
    const trMatches = tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    let isFirstRow = true;
    for (const trMatch of trMatches) {
      // Skip first row if we already extracted headers from it
      if (isFirstRow && headers.length > 0) {
        isFirstRow = false;
        continue;
      }
      isFirstRow = false;

      const cells: string[] = [];
      const tdMatches = trMatch[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      for (const tdMatch of tdMatches) {
        cells.push(this.stripHtml(tdMatch[1]!));
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (headers.length === 0 && rows.length === 0) {
      return null;
    }

    return { type: 'table', headers, rows };
  }


  // ═══════════════════════════════════════════════════════════════════════
  // PRODUCT CLASSIFICATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Find the best category mapping for a product based on its Squarespace
   * categories and tags.
   *
   * The matching is deliberately fuzzy: if a product is in the "VCE French"
   * category, it matches 'VCE French' in the mapping. But it also matches
   * if "VCE" or "French" appears as a tag or partial category match. This
   * handles the common case where Squarespace categories don't exactly
   * match the mapping keys — like a mail sorting machine that can read
   * handwriting, not just printed labels.
   */
  private findCategoryMapping(
    categories: string[],
    tags: string[],
  ): ProductCategoryMapping | undefined {
    // First pass: exact category match
    for (const category of categories) {
      if (this.categoryMap[category]) {
        return this.categoryMap[category];
      }
    }

    // Second pass: partial match on categories
    for (const category of categories) {
      for (const [key, mapping] of Object.entries(this.categoryMap)) {
        if (
          category.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(category.toLowerCase())
        ) {
          return mapping;
        }
      }
    }

    // Third pass: tag-based match
    for (const tag of tags) {
      for (const [key, mapping] of Object.entries(this.categoryMap)) {
        if (
          tag.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(tag.toLowerCase())
        ) {
          return mapping;
        }
      }
    }

    return undefined;
  }

  /**
   * Infer the resource format from a Squarespace product.
   *
   * Most Érudits resources are PDFs (vocabulary booklets, exam packs),
   * but the inference engine checks the file extension to handle the
   * occasional audio file, video, or presentation.
   */
  private inferResourceFormat(product: SquarespaceProduct): string {
    if (!product.isDigital) return 'other';

    const fileUrl = product.fileUrl?.toLowerCase() || '';
    if (fileUrl.endsWith('.pdf')) return 'pdf';
    if (fileUrl.endsWith('.docx') || fileUrl.endsWith('.doc')) return 'docx';
    if (fileUrl.endsWith('.pptx') || fileUrl.endsWith('.ppt')) return 'pptx';
    if (fileUrl.endsWith('.epub')) return 'epub';
    if (fileUrl.endsWith('.mp3')) return 'audio_mp3';
    if (fileUrl.endsWith('.wav')) return 'audio_wav';
    if (fileUrl.endsWith('.mp4')) return 'video_mp4';

    // Default: most Érudits resources are PDFs
    return 'pdf';
  }

  /**
   * Determine if a product needs human review before import.
   *
   * Products are flagged when the automated transform can't guarantee a
   * correct result. Like a customs officer flagging unusual packages for
   * manual inspection, this catches the edge cases where a human eye
   * is needed.
   */
  private productNeedsReview(product: SquarespaceProduct): boolean {
    // Physical products can't be auto-migrated to a digital storefront
    if (!product.isDigital) return true;

    // Multi-variant products have complex pricing that needs verification
    if (product.variants.length > 1) return true;

    // Zero-price products might be free or misconfigured
    if (product.price === 0) return true;

    // Hidden products might be intentionally unlisted or accidentally hidden
    if (!product.isVisible) return true;

    return false;
  }

  /**
   * Generate human-readable review notes explaining why a product was
   * flagged for review. These appear in the review dashboard so Marie
   * knows exactly what to check.
   */
  private getProductReviewNotes(product: SquarespaceProduct): string {
    const notes: string[] = [];

    if (!product.isDigital) {
      notes.push(
        'This is a physical product — the storefront only supports digital resources. ' +
        'Please verify if a digital equivalent exists or if this product should be excluded.'
      );
    }

    if (product.variants.length > 1) {
      notes.push(
        `This product has ${product.variants.length} variants. ` +
        'Please review pricing for each licence type (individual vs school).'
      );
    }

    if (product.price === 0) {
      notes.push(
        'This product has no price set. ' +
        'Please confirm if it should be free or if pricing needs to be configured.'
      );
    }

    if (!product.isVisible) {
      notes.push(
        'This product is hidden on Squarespace. ' +
        'Please confirm if it should be published or remain hidden on the new platform.'
      );
    }

    return notes.join(' ');
  }


  // ═══════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Strip HTML tags from a string, normalise whitespace, and decode
   * common HTML entities.
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Mark a content item as failed with an error message.
   */
  private async markItemFailed(
    tenantId: string,
    itemId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.deps.contentRepo.update(tenantId, itemId, {
      status: 'failed',
      errorMessage,
    });
    this.log('warn', 'Item transform failed', { tenantId, itemId, errorMessage });
  }

  /**
   * Update a migration record with partial fields.
   */
  private async updateMigration(
    tenantId: string,
    migrationId: string,
    updates: StrictPartial<PlatformMigration>,
  ): Promise<void> {
    await this.deps.migrationRepo.update(tenantId, migrationId, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * Structured log output matching the Scholarly logging convention.
   */
  private log(level: string, message: string, data?: Record<string, unknown>): void {
    const entry = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      level,
      message,
      ...data,
    };
    if (level === 'error' || level === 'warn') {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }
}
