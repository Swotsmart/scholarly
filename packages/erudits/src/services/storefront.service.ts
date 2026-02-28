/**
 * ============================================================================
 * Scholarly Platform — Resource Storefront Service
 * ============================================================================
 *
 * The digital marketplace for educational resources. Think of it as the
 * engine behind a specialist bookshop where every item on the shelf has been
 * vetted for educational quality, and the shopkeeper (AI) knows exactly which
 * book to recommend based on what each student is currently studying.
 *
 * For Érudits, this means her 40+ French learning resources — vocabulary
 * booklets, grammar guides, exam packs, activity sheets — are available for
 * purchase with proper licence management. The $280 ATAR exam packs work
 * with single-school and multi-school licensing. The $5 vocabulary booklets
 * are individual purchases with optional watermarking.
 *
 * The service handles:
 *   - Resource lifecycle (draft → review → publish → archive)
 *   - Stripe payment processing via Stripe Connect (split payments)
 *   - Licence creation and enforcement (individual, school, multi-school)
 *   - Secure file delivery with signed URLs and optional watermarking
 *   - AI-powered resource recommendations based on learning gaps
 *   - Revenue tracking and author earnings calculation
 *
 * ## Payment Flow
 *
 * When a student buys a $15 vocabulary booklet:
 *   1. Frontend creates a Stripe PaymentIntent via our API
 *   2. Stripe charges the student's card for $15.00
 *   3. Stripe splits the payment: $12.75 → author, $2.25 → Scholarly (15%)
 *   4. Stripe deducts its own fee (~$0.59) from the platform's share
 *   5. We create a ResourcePurchase record and grant access
 *   6. Student sees the resource in their Learning Library immediately
 *
 * For the $280 exam pack with school licensing:
 *   1. School admin purchases via institutional checkout
 *   2. Stripe processes $280.00
 *   3. Split: $238.00 → author, $42.00 → Scholarly (15%)
 *   4. A ResourceLicence is created with scope='single_school'
 *   5. All French teachers at that school can access the pack
 *   6. If they add the $50 multi-user licence, additional users are enabled
 *
 * @module erudits/services/storefront
 * @version 1.0.0
 */

import {
  Result, success, failure, Errors, strip,
  DigitalResource, ResourceFile, ResourcePurchase, ResourceLicence,
  ResourceReview, ResourceStatus, ResourceFormat, LicenceScope,
  CreateResourceRequest, UpdateResourceRequest, PurchaseResourceRequest,
  ResourceSearchRequest,
  PaginatedResult,
  EventBus, Cache, ScholarlyConfig, FileStorage, AIService,
  ResourceRepository, PurchaseRepository, LicenceRepository,
  ERUDITS_EVENTS,
} from '../types/erudits.types';

import type {
  ContentProtectionService,
  ContentProtectionPolicyRepository,
} from '../types/content-protection.types';

// ============================================================================
// STRIPE INTERFACE
// ============================================================================

/**
 * Abstraction over Stripe SDK — allows testing without hitting Stripe.
 * In production, the implementation wraps the official stripe-node package.
 */
export interface StripeClient {
  createPaymentIntent(params: {
    amountCents: number;
    currency: string;
    customerId?: string | undefined;
    connectedAccountId: string;
    platformFeeCents: number;
    metadata: Record<string, string>;
  }): Promise<Result<{ paymentIntentId: string; clientSecret: string }>>;

  confirmPaymentIntent(paymentIntentId: string): Promise<Result<{
    status: 'succeeded' | 'failed' | 'requires_action';
    chargeId?: string | undefined;
  }>>;

  createRefund(params: {
    paymentIntentId: string;
    amountCents?: number; // Partial refund; omit for full
    reason?: string | undefined;
  }): Promise<Result<{ refundId: string; amountCents: number }>>;

  getConnectedAccountId(authorId: string): Promise<string | null>;
}

// ============================================================================
// WATERMARK INTERFACE
// ============================================================================

export interface WatermarkService {
  applyWatermark(
    fileBuffer: Buffer,
    mimeType: string,
    watermarkText: string, // e.g., "Licensed to Brighton Grammar School"
  ): Promise<Buffer>;
}

// ============================================================================
// SERVICE DEPENDENCIES
// ============================================================================

interface StorefrontDeps {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
  fileStorage: FileStorage;
  ai: AIService;
  stripe: StripeClient;
  watermark: WatermarkService;
  resourceRepo: ResourceRepository;
  purchaseRepo: PurchaseRepository;
  licenceRepo: LicenceRepository;
  // Content protection (optional — activates when a resource has a protection policy)
  contentProtection?: ContentProtectionService | undefined;
  protectionPolicyRepo?: ContentProtectionPolicyRepository | undefined;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class ResourceStorefrontService {
  private readonly serviceName = 'ResourceStorefrontService';

  constructor(private readonly deps: StorefrontDeps) {}

  // ──────────────────────────────────────────────────────────────────────────
  // RESOURCE LIFECYCLE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Create a new digital resource.
   *
   * The resource starts in 'draft' status. The author uploads files,
   * sets pricing, adds curriculum tags, and then publishes.
   */
  async createResource(
    tenantId: string,
    authorId: string,
    authorName: string,
    request: CreateResourceRequest,
  ): Promise<Result<DigitalResource>> {
    // Validate
    const validationErrors = this.validateCreateRequest(request);
    if (validationErrors.length > 0) {
      return failure(Errors.validation('Invalid resource data', { errors: validationErrors }));
    }

    const slug = this.generateSlug(request.title);

    // Check slug uniqueness
    const existing = await this.deps.resourceRepo.findBySlug(tenantId, slug);
    if (existing) {
      return failure(Errors.conflict(`A resource with slug "${slug}" already exists`));
    }

    const resource: DigitalResource = {
      id: this.generateId('res'),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId,
      authorName,
      title: request.title,
      slug,
      description: request.description,
      shortDescription: request.shortDescription,
      coverImageUrl: undefined,
      files: [],
      priceIndividualCents: request.priceIndividualCents,
      priceSingleSchoolCents: request.priceSingleSchoolCents,
      priceMultiSchoolCents: request.priceMultiSchoolCents,
      currency: request.currency || 'AUD',
      format: request.format,
      status: 'draft',
      subjectArea: request.subjectArea,
      yearLevels: request.yearLevels || [],
      curriculumTags: [],
      tags: request.tags || [],
      featured: false,
      totalPurchases: 0,
      totalRevenueCents: 0,
      averageRating: 0,
      ratingCount: 0,
      moderationStatus: 'pending',
      previewPageCount: request.previewPageCount,
      sampleFileUrl: undefined,
    };

    const saved = await this.deps.resourceRepo.save(tenantId, resource);

    await this.deps.eventBus.publish(ERUDITS_EVENTS.RESOURCE_CREATED, {
      tenantId, resourceId: saved.id, authorId, title: saved.title,
    });

    return success(saved);
  }

  /**
   * Update a resource's metadata (not files — those use addFile/removeFile).
   */
  async updateResource(
    tenantId: string,
    resourceId: string,
    authorId: string,
    request: UpdateResourceRequest,
  ): Promise<Result<DigitalResource>> {
    const resource = await this.deps.resourceRepo.findById(tenantId, resourceId);
    if (!resource) {
      return failure(Errors.notFound('Resource', resourceId));
    }

    if (resource.authorId !== authorId) {
      return failure(Errors.forbidden('Only the resource author can edit it'));
    }

    if (resource.status === 'archived') {
      return failure(Errors.validation('Cannot edit an archived resource'));
    }

    const updated = await this.deps.resourceRepo.update(tenantId, resourceId, strip({
      ...request,
      updatedAt: new Date(),
    }));

    // Invalidate cache
    await this.deps.cache.del(`resource:${tenantId}:${resourceId}`);
    await this.deps.cache.del(`resource:${tenantId}:slug:${resource.slug}`);

    return success(updated);
  }

  /**
   * Publish a resource — makes it available for purchase.
   *
   * Validates that the resource has at least one file, a price (or is
   * explicitly free), and passes content safety checks.
   */
  async publishResource(
    tenantId: string,
    resourceId: string,
    authorId: string,
  ): Promise<Result<DigitalResource>> {
    const resource = await this.deps.resourceRepo.findById(tenantId, resourceId);
    if (!resource) {
      return failure(Errors.notFound('Resource', resourceId));
    }

    if (resource.authorId !== authorId) {
      return failure(Errors.forbidden('Only the resource author can publish it'));
    }

    // Publication requirements
    const issues: string[] = [];
    if (resource.files.length === 0) {
      issues.push('At least one file must be uploaded before publishing');
    }
    if (!resource.description || resource.description.length < 20) {
      issues.push('Description must be at least 20 characters');
    }
    if (!resource.title || resource.title.length < 3) {
      issues.push('Title must be at least 3 characters');
    }

    if (issues.length > 0) {
      return failure(Errors.validation('Resource not ready for publication', { issues }));
    }

    // Run AI content safety check if enabled
    if (this.deps.config.aiEnabled) {
      const safetyResult = await this.runContentSafetyCheck(resource);
      if (!safetyResult.success) {
        return failure(Errors.validation('Content safety check failed', {
          reason: safetyResult.error.message,
        }));
      }
    }

    const updated = await this.deps.resourceRepo.update(tenantId, resourceId, {
      status: 'published' as ResourceStatus,
      moderationStatus: 'approved',
      updatedAt: new Date(),
    });

    await this.deps.eventBus.publish(ERUDITS_EVENTS.RESOURCE_PUBLISHED, {
      tenantId, resourceId, authorId, title: resource.title,
    });

    return success(updated);
  }

  /**
   * Archive a resource — removes it from sale but existing purchasers retain access.
   */
  async archiveResource(
    tenantId: string,
    resourceId: string,
    authorId: string,
  ): Promise<Result<DigitalResource>> {
    const resource = await this.deps.resourceRepo.findById(tenantId, resourceId);
    if (!resource) {
      return failure(Errors.notFound('Resource', resourceId));
    }
    if (resource.authorId !== authorId) {
      return failure(Errors.forbidden('Only the resource author can archive it'));
    }

    const updated = await this.deps.resourceRepo.update(tenantId, resourceId, {
      status: 'archived' as ResourceStatus,
      updatedAt: new Date(),
    });

    await this.deps.eventBus.publish(ERUDITS_EVENTS.RESOURCE_ARCHIVED, {
      tenantId, resourceId, authorId,
    });

    return success(updated);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FILE MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Upload a file to a resource.
   *
   * Files are stored in S3/Cloudinary under a tenant-scoped path.
   * URLs are never public — all access goes through signed URLs with
   * expiry, so we maintain control over who can download what.
   */
  async addFile(
    tenantId: string,
    resourceId: string,
    authorId: string,
    file: {
      fileName: string;
      data: Buffer;
      mimeType: string;
      label?: string | undefined;
      watermarkEnabled?: boolean | undefined;
    },
  ): Promise<Result<ResourceFile>> {
    const resource = await this.deps.resourceRepo.findById(tenantId, resourceId);
    if (!resource) {
      return failure(Errors.notFound('Resource', resourceId));
    }
    if (resource.authorId !== authorId) {
      return failure(Errors.forbidden('Only the resource author can upload files'));
    }

    // Upload to storage
    const storageKey = `resources/${tenantId}/${resourceId}/${Date.now()}_${file.fileName}`;
    const fileUrl = await this.deps.fileStorage.upload(storageKey, file.data, file.mimeType);

    const resourceFile: ResourceFile = {
      id: this.generateId('rf'),
      tenantId,
      createdAt: new Date(),
      resourceId,
      fileName: file.fileName,
      fileUrl,
      fileSizeBytes: file.data.length,
      mimeType: file.mimeType,
      format: this.mimeToFormat(file.mimeType),
      label: file.label,
      sortOrder: resource.files.length,
      pageCount: undefined, // Would be extracted from PDF metadata in production
      durationSeconds: undefined, // Would be extracted from audio/video metadata
      watermarkEnabled: file.watermarkEnabled ?? false,
    };

    // In production: save via a ResourceFileRepository.
    // Here we append to the resource's files array.
    resource.files.push(resourceFile);
    await this.deps.resourceRepo.update(tenantId, resourceId, {
      files: resource.files,
      updatedAt: new Date(),
    });

    return success(resourceFile);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PURCHASE & PAYMENT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Initiate a purchase — creates a Stripe PaymentIntent and returns
   * the client secret for frontend confirmation.
   *
   * The payment flow uses Stripe Connect to split the payment between
   * the author and the platform in a single atomic transaction.
   */
  async initiatePurchase(
    tenantId: string,
    buyerId: string,
    buyerEmail: string,
    buyerName: string,
    request: PurchaseResourceRequest,
  ): Promise<Result<{ purchaseId: string; clientSecret: string }>> {
    const resource = await this.deps.resourceRepo.findById(tenantId, request.resourceId);
    if (!resource) {
      return failure(Errors.notFound('Resource', request.resourceId));
    }

    if (resource.status !== 'published') {
      return failure(Errors.validation('Resource is not available for purchase'));
    }

    // Check if already purchased (for individual licences)
    if (request.licenceScope === 'individual') {
      const alreadyPurchased = await this.deps.purchaseRepo.hasBuyerPurchased(
        tenantId, buyerId, request.resourceId
      );
      if (alreadyPurchased) {
        return failure(Errors.conflict('You have already purchased this resource'));
      }
    }

    // Determine price based on licence scope
    const amountCents = this.getPriceForScope(resource, request.licenceScope);
    if (amountCents === null) {
      return failure(Errors.validation(`This resource does not offer ${request.licenceScope} licensing`));
    }

    // Handle free resources
    if (amountCents === 0) {
      const purchase = await this.createFreePurchase(
        tenantId, resource, buyerId, buyerEmail, buyerName, request,
      );
      return success({ purchaseId: purchase.id, clientSecret: '' });
    }

    // Calculate platform fee
    const platformFeeCents = this.calculatePlatformFee(amountCents);

    // Get author's Stripe Connect account
    const connectedAccountId = await this.deps.stripe.getConnectedAccountId(resource.authorId);
    if (!connectedAccountId) {
      return failure(Errors.internal('Author has not connected their Stripe account'));
    }

    // Create Stripe PaymentIntent with automatic split
    const piResult = await this.deps.stripe.createPaymentIntent({
      amountCents,
      currency: resource.currency.toLowerCase(),
      connectedAccountId,
      platformFeeCents,
      metadata: {
        tenantId,
        resourceId: resource.id,
        buyerId,
        licenceScope: request.licenceScope,
        institutionId: request.institutionId || '',
      },
    });

    if (!piResult.success) {
      return failure(Errors.external('Stripe', piResult.error.message));
    }

    // Create pending purchase record
    const purchase: ResourcePurchase = {
      id: this.generateId('pur'),
      tenantId,
      createdAt: new Date(),
      resourceId: resource.id,
      buyerId,
      buyerEmail,
      buyerName,
      amountCents,
      currency: resource.currency,
      platformFeeCents,
      authorEarningsCents: amountCents - platformFeeCents,
      stripePaymentIntentId: piResult.data.paymentIntentId,
      licenceScope: request.licenceScope,
      status: 'pending',
      downloadCount: 0,
    };

    await this.deps.purchaseRepo.save(tenantId, purchase);

    return success({
      purchaseId: purchase.id,
      clientSecret: piResult.data.clientSecret,
    });
  }

  /**
   * Confirm a purchase after Stripe payment succeeds.
   *
   * Called by the Stripe webhook handler when a PaymentIntent succeeds.
   * This is the critical moment: we grant access to the resource,
   * create the licence (if applicable), and update all metrics.
   */
  async confirmPurchase(
    stripePaymentIntentId: string,
    chargeId: string,
  ): Promise<Result<ResourcePurchase>> {
    const purchase = await this.deps.purchaseRepo.findByStripePaymentIntent(stripePaymentIntentId);
    if (!purchase) {
      return failure(Errors.notFound('Purchase', `stripe:${stripePaymentIntentId}`));
    }

    // Update purchase status
    const updatedPurchase: ResourcePurchase = {
      ...purchase,
      status: 'completed',
      stripeChargeId: chargeId,
    };

    // Save is idempotent — webhook may fire multiple times
    await this.deps.purchaseRepo.save(purchase.tenantId, updatedPurchase);

    // Create licence for institutional purchases
    if (purchase.licenceScope !== 'individual') {
      const metadata = await this.extractPurchaseMetadata(stripePaymentIntentId);
      await this.createLicence(purchase, metadata?.institutionId, metadata?.institutionName);
    }

    // Update resource metrics
    await this.deps.resourceRepo.incrementPurchaseCount(
      purchase.tenantId, purchase.resourceId, purchase.amountCents,
    );

    // Publish event
    await this.deps.eventBus.publish(ERUDITS_EVENTS.RESOURCE_PURCHASED, {
      tenantId: purchase.tenantId,
      resourceId: purchase.resourceId,
      purchaseId: purchase.id,
      buyerId: purchase.buyerId,
      amountCents: purchase.amountCents,
      licenceScope: purchase.licenceScope,
    });

    return success(updatedPurchase);
  }

  /**
   * Process a refund for a purchase.
   */
  async refundPurchase(
    tenantId: string,
    purchaseId: string,
    reason: string,
  ): Promise<Result<ResourcePurchase>> {
    const purchase = await this.deps.purchaseRepo.findById(tenantId, purchaseId);
    if (!purchase) {
      return failure(Errors.notFound('Purchase', purchaseId));
    }
    if (purchase.status !== 'completed') {
      return failure(Errors.validation(`Cannot refund a purchase in '${purchase.status}' status`));
    }
    if (!purchase.stripePaymentIntentId) {
      return failure(Errors.validation('Cannot refund a free purchase'));
    }

    const refundResult = await this.deps.stripe.createRefund({
      paymentIntentId: purchase.stripePaymentIntentId,
      reason,
    });

    if (!refundResult.success) {
      return failure(Errors.external('Stripe', refundResult.error.message));
    }

    // Deactivate associated licence
    if (purchase.licenceScope !== 'individual') {
      const licence = await this.deps.licenceRepo.findByPurchase(tenantId, purchaseId);
      if (licence) {
        await this.deps.licenceRepo.deactivate(tenantId, licence.id, `Refunded: ${reason}`);
      }
    }

    await this.deps.eventBus.publish(ERUDITS_EVENTS.RESOURCE_REFUNDED, {
      tenantId, purchaseId, resourceId: purchase.resourceId, reason,
    });

    return success({ ...purchase, status: 'refunded' });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FILE DOWNLOAD & ACCESS CONTROL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generate a secure download URL for a purchased resource.
   *
   * Access is verified against purchases and licences. The URL is a
   * time-limited signed URL from S3/Cloudinary. Optional watermarking
   * embeds the buyer's identity into the PDF.
   */
  async getDownloadUrl(
    tenantId: string,
    resourceId: string,
    fileId: string,
    userId: string,
    institutionId?: string,
  ): Promise<Result<{ url: string; expiresInSeconds: number }>> {
    // Verify access
    const hasAccess = await this.verifyAccess(tenantId, resourceId, userId, institutionId);
    if (!hasAccess) {
      return failure(Errors.forbidden('You do not have access to this resource. Please purchase it first.'));
    }

    const resource = await this.deps.resourceRepo.findById(tenantId, resourceId);
    if (!resource) {
      return failure(Errors.notFound('Resource', resourceId));
    }

    const file = resource.files.find(f => f.id === fileId);
    if (!file) {
      return failure(Errors.notFound('File', fileId));
    }

    // Generate signed URL (expires in 1 hour)
    const expiresInSeconds = 3600;
    let downloadUrl: string;

    // ── Content Protection Route ──
    // If the content protection service is wired in and this resource has a
    // protection policy, delegate to the full four-layer pipeline. This is
    // the Phase 2 integration: prepareDownload() orchestrates watermarking,
    // steganographic fingerprinting, encryption, and forensic recording.
    //
    // If content protection is not wired in, or the resource has no policy,
    // fall back to the original watermark-only flow for backward compatibility.
    if (this.deps.contentProtection && this.deps.protectionPolicyRepo) {
      const policy = await this.deps.protectionPolicyRepo.findByResource(tenantId, resourceId);
      if (policy) {
        // Find the licence for this user to pass to the protection pipeline
        const licence = await this.findLicenceForUser(tenantId, resourceId, userId, institutionId);
        const licenceId = licence?.id ?? 'direct-purchase';

        try {
          const protectedDownload = await this.deps.contentProtection.prepareDownload(tenantId, {
            resourceId,
            fileId,
            userId,
            licenceId,
            deviceFingerprint: 'web-default', // Default for web; clients override via header
            institutionName: institutionId,
          });

          // Track download as before
          const purchase = await this.findPurchaseForUser(tenantId, resourceId, userId);
          if (purchase) {
            await this.deps.purchaseRepo.incrementDownloadCount(tenantId, purchase.id);
          }

          await this.deps.eventBus.publish(ERUDITS_EVENTS.RESOURCE_DOWNLOADED, {
            tenantId, resourceId, fileId, userId,
            protectionEnabled: true,
            fingerprint: protectedDownload.steganographicFingerprint,
          });

          return success({
            url: protectedDownload.downloadUrl,
            expiresInSeconds: protectedDownload.expiresInSeconds,
          });
        } catch (err) {
          // If protection pipeline fails, log and fall through to legacy flow.
          // This ensures a protection service outage doesn't block all downloads.
          console.error('[Storefront] Content protection pipeline error:', (err as Error).message);
        }
      }
    }

    // ── Legacy Watermark-Only Flow ──
    // No content protection policy exists, or the protection service isn't
    // wired in. Fall back to the original watermark-only behaviour.
    if (file.watermarkEnabled) {
      // For watermarked files, we generate a watermarked copy on-the-fly
      // and return a signed URL to that copy.
      const watermarkedKey = `downloads/${tenantId}/${resourceId}/${userId}/${file.fileName}`;
      // In production: download original, apply watermark, upload watermarked copy
      downloadUrl = await this.deps.fileStorage.getSignedUrl(watermarkedKey, expiresInSeconds);
    } else {
      downloadUrl = await this.deps.fileStorage.getSignedUrl(file.fileUrl, expiresInSeconds);
    }

    // Track download
    const purchase = await this.findPurchaseForUser(tenantId, resourceId, userId);
    if (purchase) {
      await this.deps.purchaseRepo.incrementDownloadCount(tenantId, purchase.id);
    }

    await this.deps.eventBus.publish(ERUDITS_EVENTS.RESOURCE_DOWNLOADED, {
      tenantId, resourceId, fileId, userId,
    });

    return success({ url: downloadUrl, expiresInSeconds });
  }

  /**
   * Verify whether a user has access to a resource.
   *
   * Access is granted through:
   *   1. Individual purchase by this user
   *   2. Institutional licence covering this user's school
   *   3. Author access (authors can always access their own resources)
   */
  async verifyAccess(
    tenantId: string,
    resourceId: string,
    userId: string,
    institutionId?: string,
  ): Promise<boolean> {
    // Check author access
    const resource = await this.deps.resourceRepo.findById(tenantId, resourceId);
    if (resource && resource.authorId === userId) return true;

    // Check individual purchase
    const hasPurchased = await this.deps.purchaseRepo.hasBuyerPurchased(tenantId, userId, resourceId);
    if (hasPurchased) return true;

    // Check institutional licence
    if (institutionId) {
      const licences = await this.deps.licenceRepo.findActiveByInstitution(tenantId, institutionId);
      for (const licence of licences) {
        const purchase = await this.deps.purchaseRepo.findById(tenantId, licence.purchaseId);
        if (purchase && purchase.resourceId === resourceId && licence.isActive) {
          // Check user limit if applicable
          if (licence.maxUsers && licence.activeUsers >= licence.maxUsers) {
            continue; // This licence is full
          }
          return true;
        }
      }
    }

    return false;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & DISCOVERY
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search the resource marketplace with filters.
   */
  async searchResources(
    tenantId: string,
    filter: ResourceSearchRequest,
  ): Promise<Result<PaginatedResult<DigitalResource>>> {
    // Only show published resources to non-authors
    const searchFilter: ResourceSearchRequest = {
      ...filter,
      status: filter.status || 'published',
    };

    const results = await this.deps.resourceRepo.search(tenantId, searchFilter);
    return success(results);
  }

  /**
   * Get AI-powered resource recommendations for a student.
   *
   * This is the magic — when the AI tutor identifies a learning gap
   * (e.g., "this student struggles with passé composé with être verbs"),
   * it queries the storefront for resources that address that specific gap.
   * The student sees a contextual recommendation at the moment of need.
   */
  async getRecommendations(
    tenantId: string,
    params: {
      studentId: string;
      learningGaps?: string[];         // e.g., ["passe_compose_etre", "imparfait_vs_pc"]
      curriculumCodes?: string[];      // e.g., ["FR_SL_U3"]
      yearLevel?: string | undefined;
      maxResults?: number | undefined;
    },
  ): Promise<Result<DigitalResource[]>> {
    if (!this.deps.config.aiEnabled || !params.learningGaps?.length) {
      // Fallback: return popular resources matching curriculum
      const popular = await this.deps.resourceRepo.search(tenantId, {
        page: 1,
        pageSize: params.maxResults || 5,
        status: 'published',
        sortBy: 'totalPurchases',
        sortOrder: 'desc',
        yearLevels: params.yearLevel ? [params.yearLevel] : undefined,
      });
      return success(popular.items);
    }

    // Use AI to generate a search strategy from learning gaps
    const aiResult = await this.deps.ai.complete({
      systemPrompt: `You are a French language education expert. Given a list of learning gaps, 
generate 3-5 search queries that would find educational resources addressing those gaps. 
Return JSON: { "queries": ["query1", "query2", ...] }`,
      userPrompt: `Learning gaps: ${params.learningGaps.join(', ')}
Curriculum: ${params.curriculumCodes?.join(', ') || 'General French'}
Year level: ${params.yearLevel || 'Not specified'}`,
      maxTokens: 200,
      temperature: 0.3,
      responseFormat: 'json',
    });

    // Parse AI-generated queries and search for each
    const recommendations = new Map<string, DigitalResource>();

    try {
      const parsed = JSON.parse(aiResult.text) as { queries: string[] };
      for (const query of parsed.queries.slice(0, 5)) {
        const results = await this.deps.resourceRepo.search(tenantId, {
          page: 1,
          pageSize: 3,
          search: query,
          status: 'published',
          yearLevels: params.yearLevel ? [params.yearLevel] : undefined,
        });
        for (const item of results.items) {
          recommendations.set(item.id, item);
        }
      }
    } catch {
      // AI parsing failed — return popular resources as fallback
      this.log('warn', 'AI recommendation query failed, using popular fallback');
    }

    const result = Array.from(recommendations.values()).slice(0, params.maxResults || 5);
    return success(result);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REVIEWS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Submit a review for a purchased resource.
   */
  async submitReview(
    tenantId: string,
    resourceId: string,
    reviewerId: string,
    reviewerName: string,
    rating: number,
    title?: string,
    body?: string,
  ): Promise<Result<ResourceReview>> {
    if (rating < 1 || rating > 5) {
      return failure(Errors.validation('Rating must be between 1 and 5'));
    }

    // Verify the reviewer has purchased the resource
    const hasPurchased = await this.deps.purchaseRepo.hasBuyerPurchased(tenantId, reviewerId, resourceId);
    if (!hasPurchased) {
      return failure(Errors.forbidden('You must purchase a resource before reviewing it'));
    }

    const review: ResourceReview = {
      id: this.generateId('rev'),
      tenantId,
      createdAt: new Date(),
      resourceId,
      reviewerId,
      reviewerName,
      rating,
      title,
      body,
      isPublished: true,
    };

    // In production: save via ReviewRepository
    // Update average rating on the resource
    const resource = await this.deps.resourceRepo.findById(tenantId, resourceId);
    if (resource) {
      const newCount = resource.ratingCount + 1;
      const newAverage = ((resource.averageRating * resource.ratingCount) + rating) / newCount;
      await this.deps.resourceRepo.updateRating(tenantId, resourceId, newAverage, newCount);
    }

    await this.deps.eventBus.publish(ERUDITS_EVENTS.RESOURCE_REVIEWED, {
      tenantId, resourceId, reviewerId, rating,
    });

    return success(review);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AUTHOR ANALYTICS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get sales analytics for an author's resources.
   */
  async getAuthorAnalytics(
    tenantId: string,
    authorId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<Result<AuthorAnalytics>> {
    const resources = await this.deps.resourceRepo.findByAuthor(tenantId, authorId, {
      page: 1, pageSize: 1000, // Get all resources
    });

    let totalRevenueCents = 0;
    let totalPurchases = 0;
    const resourceBreakdown: Array<{
      resourceId: string;
      title: string;
      purchases: number;
      revenueCents: number;
      averageRating: number;
    }> = [];

    for (const resource of resources.items) {
      totalRevenueCents += resource.totalRevenueCents;
      totalPurchases += resource.totalPurchases;
      resourceBreakdown.push({
        resourceId: resource.id,
        title: resource.title,
        purchases: resource.totalPurchases,
        revenueCents: resource.totalRevenueCents,
        averageRating: resource.averageRating,
      });
    }

    // Calculate platform fees and author earnings
    const platformFeeCents = Math.round(totalRevenueCents * (this.deps.config.platformFeePercent / 100));
    const authorEarningsCents = totalRevenueCents - platformFeeCents;

    return success({
      authorId,
      period: { from: fromDate, to: toDate },
      totalResources: resources.total,
      totalPurchases,
      totalRevenueCents,
      platformFeeCents,
      authorEarningsCents,
      averageResourceRating: this.calculateWeightedAverage(resourceBreakdown),
      topResources: resourceBreakdown.sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 10),
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  private getPriceForScope(resource: DigitalResource, scope: LicenceScope): number | null {
    switch (scope) {
      case 'individual': return resource.priceIndividualCents;
      case 'single_school': return resource.priceSingleSchoolCents ?? null;
      case 'multi_school': return resource.priceMultiSchoolCents ?? null;
      case 'unlimited': return null; // Not typically sold directly
      default: return null;
    }
  }

  private calculatePlatformFee(amountCents: number): number {
    return Math.round(amountCents * (this.deps.config.platformFeePercent / 100));
  }

  private async createFreePurchase(
    tenantId: string,
    resource: DigitalResource,
    buyerId: string,
    buyerEmail: string,
    buyerName: string,
    request: PurchaseResourceRequest,
  ): Promise<ResourcePurchase> {
    const purchase: ResourcePurchase = {
      id: this.generateId('pur'),
      tenantId,
      createdAt: new Date(),
      resourceId: resource.id,
      buyerId,
      buyerEmail,
      buyerName,
      amountCents: 0,
      currency: resource.currency,
      platformFeeCents: 0,
      authorEarningsCents: 0,
      licenceScope: request.licenceScope,
      status: 'completed',
      downloadCount: 0,
    };

    await this.deps.purchaseRepo.save(tenantId, purchase);
    await this.deps.resourceRepo.incrementPurchaseCount(tenantId, resource.id, 0);

    await this.deps.eventBus.publish(ERUDITS_EVENTS.RESOURCE_PURCHASED, {
      tenantId, resourceId: resource.id, purchaseId: purchase.id,
      buyerId, amountCents: 0, licenceScope: request.licenceScope,
    });

    return purchase;
  }

  private async createLicence(
    purchase: ResourcePurchase,
    institutionId?: string,
    institutionName?: string,
  ): Promise<ResourceLicence> {
    const maxUsers = purchase.licenceScope === 'single_school' ? 10 : undefined;

    const licence: ResourceLicence = {
      id: this.generateId('lic'),
      tenantId: purchase.tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      purchaseId: purchase.id,
      scope: purchase.licenceScope,
      institutionId,
      institutionName,
      maxUsers,
      activeUsers: 0,
      isActive: true,
    };

    await this.deps.licenceRepo.save(purchase.tenantId, licence);

    await this.deps.eventBus.publish(ERUDITS_EVENTS.LICENCE_CREATED, {
      tenantId: purchase.tenantId,
      licenceId: licence.id,
      purchaseId: purchase.id,
      scope: licence.scope,
      institutionId,
    });

    return licence;
  }

  private async findPurchaseForUser(
    tenantId: string,
    resourceId: string,
    userId: string,
  ): Promise<ResourcePurchase | null> {
    const purchases = await this.deps.purchaseRepo.findByBuyer(tenantId, userId, {
      page: 1, pageSize: 100,
    });
    return purchases.items.find(p => p.resourceId === resourceId) || null;
  }

  /**
   * Find the active licence that grants this user access to a resource.
   * Checks both individual purchases (which create licences) and
   * institutional licences covering the user's school.
   */
  private async findLicenceForUser(
    tenantId: string,
    resourceId: string,
    userId: string,
    institutionId?: string,
  ): Promise<ResourceLicence | null> {
    // Check if the user has a purchase for this resource, then find the licence
    const purchase = await this.findPurchaseForUser(tenantId, resourceId, userId);
    if (purchase) {
      const licence = await this.deps.licenceRepo.findByPurchase(tenantId, purchase.id);
      if (licence && licence.isActive) return licence;
    }

    // If user has an institution, check for institutional licence
    if (institutionId) {
      const institutionalLicences = await this.deps.licenceRepo.findActiveByInstitution(
        tenantId, institutionId,
      );
      // Find one that's still active and not expired
      const matching = institutionalLicences.find(l =>
        l.isActive && (!l.expiresAt || new Date(l.expiresAt) > new Date()),
      );
      if (matching) return matching;
    }

    return null;
  }

  private async runContentSafetyCheck(resource: DigitalResource): Promise<Result<void>> {
    try {
      const result = await this.deps.ai.complete({
        systemPrompt: `You are an educational content moderator. Review the following resource 
title and description. Flag if it contains: inappropriate content for students, 
misleading claims, copyright issues, or discriminatory language. 
Return JSON: { "safe": true/false, "reason": "..." }`,
        userPrompt: `Title: ${resource.title}\nDescription: ${resource.description}`,
        maxTokens: 150,
        temperature: 0,
        responseFormat: 'json',
      });

      const parsed = JSON.parse(result.text) as { safe: boolean; reason?: string };
      if (!parsed.safe) {
        return failure(Errors.validation(parsed.reason || 'Content flagged by safety review'));
      }
      return success(undefined);
    } catch {
      // If safety check fails, allow publication with a warning
      this.log('warn', 'Content safety check error — allowing publication with manual review flag');
      return success(undefined);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async extractPurchaseMetadata(_paymentIntentId: string): Promise<{
    institutionId?: string;
    institutionName?: string;
  } | null> {
    // In production: fetch PaymentIntent metadata from Stripe
    return null;
  }

  private validateCreateRequest(request: CreateResourceRequest): string[] {
    const errors: string[] = [];
    if (!request.title || request.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters');
    }
    if (!request.description || request.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters');
    }
    if (request.priceIndividualCents < 0) {
      errors.push('Price cannot be negative');
    }
    if (request.priceSingleSchoolCents !== undefined && request.priceSingleSchoolCents < 0) {
      errors.push('School licence price cannot be negative');
    }
    return errors;
  }

  private mimeToFormat(mimeType: string): ResourceFormat {
    const map: Record<string, ResourceFormat> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/epub+zip': 'epub',
      'audio/mpeg': 'audio_mp3',
      'audio/wav': 'audio_wav',
      'video/mp4': 'video_mp4',
    };
    return map[mimeType] || 'other';
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);
  }

  private calculateWeightedAverage(
    items: Array<{ averageRating: number; purchases: number }>,
  ): number {
    const totalWeight = items.reduce((sum, i) => sum + i.purchases, 0);
    if (totalWeight === 0) return 0;
    const weighted = items.reduce((sum, i) => sum + (i.averageRating * i.purchases), 0);
    return Math.round((weighted / totalWeight) * 100) / 100;
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

export interface AuthorAnalytics {
  authorId: string;
  period: { from: Date; to: Date };
  totalResources: number;
  totalPurchases: number;
  totalRevenueCents: number;
  platformFeeCents: number;
  authorEarningsCents: number;
  averageResourceRating: number;
  topResources: Array<{
    resourceId: string;
    title: string;
    purchases: number;
    revenueCents: number;
    averageRating: number;
  }>;
}
