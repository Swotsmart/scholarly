/**
 * ============================================================================
 * Resource Storefront — Types, Entities & Repository Interfaces
 * ============================================================================
 *
 * The type system for Scholarly's digital resource marketplace. This file
 * defines every shape that passes through the storefront pipeline: from a
 * tutor creating a draft resource, through pricing and file upload, to
 * a student purchasing, downloading, and reviewing.
 *
 * Think of these types as the blueprint for the shop's inventory system.
 * The DigitalResource is the item on the shelf. The ResourcePurchase is
 * the receipt. The ResourceLicence is the key that unlocks the display
 * case. And the repository interfaces are the contracts between the
 * shopkeeper and the warehouse.
 *
 * ## Porting Notes
 *
 * Adapted from erudits/src/types/erudits.types.ts §2 (Resource Marketplace)
 * and §9 (Repository Interfaces). Key changes from the Érudits version:
 *
 *   - Result<T> monad uses the same pattern as migration-transform.types.ts
 *   - ScholarlyConfig extended with storefront-specific fields
 *   - NATS event topics follow scholarly.{domain}.{entity}.{action} format
 *   - AIService interface matches AIPAL capability contract
 *   - FileStorage matches S3/Azure Blob abstraction in deployed infra
 *   - Route DTOs use ApiResponse<T> wrapper for consistent HTTP responses
 *
 * @module scholarly/storefront/resource-storefront.types
 */

// ============================================================================
// §1 — RESULT MONAD & ERROR HANDLING
// ============================================================================

/**
 * The Result monad — identical to migration-transform.types.ts.
 * Duplicated here so the storefront module is self-contained and
 * can be deployed independently of the migration pipeline.
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ServiceError };

export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<T>(error: ServiceError): Result<T> {
  return { success: false, error };
}

export interface ServiceError {
  code: string;
  message: string;
  httpStatus: number;
  details?: Record<string, unknown>;
}

export const Errors = {
  validation: (message: string, details?: Record<string, unknown>): ServiceError =>
    ({ code: 'VALIDATION_ERROR', message, httpStatus: 400, details }),
  notFound: (entity: string, id: string): ServiceError =>
    ({ code: 'NOT_FOUND', message: `${entity} not found: ${id}`, httpStatus: 404 }),
  forbidden: (message: string): ServiceError =>
    ({ code: 'FORBIDDEN', message, httpStatus: 403 }),
  conflict: (message: string): ServiceError =>
    ({ code: 'CONFLICT', message, httpStatus: 409 }),
  internal: (message: string): ServiceError =>
    ({ code: 'INTERNAL_ERROR', message, httpStatus: 500 }),
  external: (service: string, message: string): ServiceError =>
    ({ code: 'EXTERNAL_ERROR', message: `${service}: ${message}`, httpStatus: 502 }),
};

/**
 * Strip undefined values from an object — prevents Prisma from
 * interpreting `undefined` as "set this field to null".
 */
export function strip<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}


// ============================================================================
// §2 — RESOURCE ENTITY & VALUE TYPES
// ============================================================================

/**
 * Resource lifecycle states.
 *
 *   draft → pending_review → approved → published → archived
 *                          ↘ rejected
 *
 * Resources start as drafts when created. Authors submit for review,
 * and after content safety checks pass, the resource becomes published
 * and visible in the marketplace. Archived resources are delisted but
 * existing purchasers retain access.
 */
export type ResourceStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'archived'
  | 'rejected';

/**
 * Supported file formats for digital resources.
 *
 * PDF is the overwhelmingly common format for Érudits (exam packs,
 * vocabulary booklets, grammar guides). Audio formats support
 * listening comprehension resources. Video supports recorded lessons.
 */
export type ResourceFormat =
  | 'pdf'
  | 'docx'
  | 'pptx'
  | 'epub'
  | 'audio_mp3'
  | 'audio_wav'
  | 'video_mp4'
  | 'image_set'
  | 'interactive'
  | 'other';

/**
 * Licence scope — determines who can access a purchased resource.
 *
 * For Érudits:
 *   - individual: One student buys a $15 vocabulary booklet
 *   - single_school: Brighton Grammar buys the $280 ATAR pack for all French teachers
 *   - multi_school: A school district buys for multiple campuses
 *   - unlimited: Enterprise/government — not typically sold directly
 */
export type LicenceScope =
  | 'individual'
  | 'single_school'
  | 'multi_school'
  | 'unlimited';


// ============================================================================
// §3 — CORE ENTITIES
// ============================================================================

/**
 * A digital resource in the marketplace.
 *
 * This is the central entity — the item on the shelf. It holds metadata
 * (title, description, pricing), files (the actual downloadable content),
 * and engagement metrics (purchases, ratings, revenue).
 */
export interface DigitalResource {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  authorName: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string | undefined;
  coverImageUrl?: string | undefined;
  files: ResourceFile[];

  /** Price in cents for individual purchase */
  priceIndividualCents: number;
  /** Price in cents for single-school licence (optional) */
  priceSingleSchoolCents?: number | undefined;
  /** Price in cents for multi-school licence (optional) */
  priceMultiSchoolCents?: number | undefined;
  currency: string;

  format: ResourceFormat;
  status: ResourceStatus;
  subjectArea?: string | undefined;
  yearLevels: string[];
  curriculumTags: CurriculumTag[];
  tags: string[];
  featured: boolean;

  /** Aggregate metrics */
  totalPurchases: number;
  totalRevenueCents: number;
  averageRating: number;
  ratingCount: number;

  moderationStatus: string;
  previewPageCount?: number | undefined;
  sampleFileUrl?: string | undefined;
}

/**
 * A file attached to a digital resource.
 *
 * Resources can have multiple files — e.g., an exam pack might include
 * a PDF question paper, a PDF answer key, and an MP3 listening component.
 */
export interface ResourceFile {
  id: string;
  tenantId: string;
  createdAt: Date;
  resourceId: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  format: ResourceFormat;
  label?: string | undefined;
  sortOrder: number;
  pageCount?: number | undefined;
  durationSeconds?: number | undefined;
  watermarkEnabled: boolean;
}

/**
 * A purchase record — the receipt.
 *
 * Links a buyer to a resource with payment details. The Stripe
 * PaymentIntent ID connects this record to the actual money movement.
 */
export interface ResourcePurchase {
  id: string;
  tenantId: string;
  createdAt: Date;
  resourceId: string;
  buyerId: string;
  buyerEmail: string;
  buyerName: string;
  amountCents: number;
  currency: string;
  platformFeeCents: number;
  authorEarningsCents: number;
  stripePaymentIntentId?: string | undefined;
  stripeChargeId?: string | undefined;
  licenceScope: LicenceScope;
  institutionId?: string | undefined;
  institutionName?: string | undefined;
  status: string; // 'pending' | 'completed' | 'refunded' | 'failed'
  downloadCount: number;
  lastDownloadedAt?: Date | undefined;
}

/**
 * A licence granting access to a resource.
 *
 * Individual purchases create a licence automatically. Institutional
 * purchases create a licence scoped to the school/district, with an
 * optional user limit. The licence is the "key" that the download
 * endpoint checks before granting access.
 */
export interface ResourceLicence {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  purchaseId: string;
  scope: LicenceScope;
  institutionId?: string | undefined;
  institutionName?: string | undefined;
  maxUsers?: number | undefined;
  activeUsers: number;
  expiresAt?: Date | undefined;
  isActive: boolean;
}

/**
 * A review submitted by a purchaser.
 *
 * Only users who have purchased a resource can review it. Reviews
 * contribute to the resource's average rating and surface social
 * proof in the marketplace.
 */
export interface ResourceReview {
  id: string;
  tenantId: string;
  createdAt: Date;
  resourceId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  title?: string | undefined;
  body?: string | undefined;
  isPublished: boolean;
}

/**
 * Curriculum tag — connects resources to educational frameworks.
 */
export interface CurriculumTag {
  id: string;
  framework: string;
  code: string;
  label: string;
  yearLevel?: string | undefined;
}


// ============================================================================
// §4 — DEPENDENCY INTERFACES
// ============================================================================

export interface EventBus {
  publish(topic: string, payload: Record<string, unknown>): Promise<void>;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

export interface FileStorage {
  upload(key: string, data: Buffer, mimeType: string): Promise<string>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

/**
 * AI service abstraction — maps to AIPAL's ITextCompletionProvider.
 *
 * Used for content safety checks and AI-powered recommendations.
 */
export interface AIService {
  complete(params: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
    temperature: number;
    responseFormat?: string | undefined;
  }): Promise<{ text: string }>;
}

/**
 * Platform configuration — extends the base config with storefront
 * and Stripe-specific fields.
 */
export interface ScholarlyConfig {
  environment: 'development' | 'staging' | 'production';
  platformFeePercent: number;
  aiEnabled: boolean;
  aiModel: string;
  aiMaxTokens: number;
  defaultPageSize: number;
  maxPageSize: number;
  stripeFeeFixedCents: number;
  stripeFeePercent: number;
}


// ============================================================================
// §5 — STRIPE ABSTRACTION
// ============================================================================

/**
 * Stripe Connect client abstraction.
 *
 * Wraps the Stripe SDK to enable testing without hitting Stripe's API.
 * In production, the implementation delegates to the official stripe-node
 * package. The split payment model (application_fee_amount) is baked
 * into createPaymentIntent — Stripe handles the money routing.
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
    amountCents?: number;
    reason?: string | undefined;
  }): Promise<Result<{ refundId: string; amountCents: number }>>;

  getConnectedAccountId(authorId: string): Promise<string | null>;
}

/**
 * Watermark service — applies buyer identity to downloaded files.
 *
 * Phase 1: Simple text watermark on PDFs ("Licensed to Brighton Grammar")
 * Phase 2: Steganographic fingerprinting via ContentProtectionService
 */
export interface WatermarkService {
  applyWatermark(
    fileBuffer: Buffer,
    mimeType: string,
    watermarkText: string,
  ): Promise<Buffer>;
}


// ============================================================================
// §6 — SERVICE DEPENDENCIES & INTERFACES
// ============================================================================

export interface StorefrontDeps {
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
}

export interface IResourceStorefrontService {
  // Resource lifecycle
  createResource(tenantId: string, authorId: string, authorName: string, request: CreateResourceRequest): Promise<Result<DigitalResource>>;
  updateResource(tenantId: string, resourceId: string, authorId: string, request: UpdateResourceRequest): Promise<Result<DigitalResource>>;
  publishResource(tenantId: string, resourceId: string, authorId: string): Promise<Result<DigitalResource>>;
  archiveResource(tenantId: string, resourceId: string, authorId: string): Promise<Result<DigitalResource>>;

  // Files
  addFile(tenantId: string, resourceId: string, authorId: string, file: FileUploadInput): Promise<Result<ResourceFile>>;

  // Purchase & payment
  initiatePurchase(tenantId: string, buyerId: string, buyerEmail: string, buyerName: string, request: PurchaseResourceRequest): Promise<Result<{ purchaseId: string; clientSecret: string }>>;
  confirmPurchase(stripePaymentIntentId: string, chargeId: string): Promise<Result<ResourcePurchase>>;
  refundPurchase(tenantId: string, purchaseId: string, reason: string): Promise<Result<ResourcePurchase>>;

  // Download
  getDownloadUrl(tenantId: string, resourceId: string, fileId: string, userId: string, institutionId?: string): Promise<Result<{ url: string; expiresInSeconds: number }>>;
  verifyAccess(tenantId: string, resourceId: string, userId: string, institutionId?: string): Promise<boolean>;

  // Search & discovery
  searchResources(tenantId: string, filter: ResourceSearchRequest): Promise<Result<PaginatedResult<DigitalResource>>>;
  getRecommendations(tenantId: string, params: RecommendationParams): Promise<Result<DigitalResource[]>>;

  // Reviews
  submitReview(tenantId: string, resourceId: string, reviewerId: string, reviewerName: string, rating: number, title?: string, body?: string): Promise<Result<ResourceReview>>;

  // Analytics
  getAuthorAnalytics(tenantId: string, authorId: string, fromDate: Date, toDate: Date): Promise<Result<AuthorAnalytics>>;
}


// ============================================================================
// §7 — NATS EVENT TOPICS
// ============================================================================

export const STOREFRONT_EVENTS = {
  RESOURCE_CREATED:    'scholarly.resource.created',
  RESOURCE_PUBLISHED:  'scholarly.resource.published',
  RESOURCE_ARCHIVED:   'scholarly.resource.archived',
  RESOURCE_PURCHASED:  'scholarly.resource.purchased',
  RESOURCE_DOWNLOADED: 'scholarly.resource.downloaded',
  RESOURCE_REVIEWED:   'scholarly.resource.reviewed',
  RESOURCE_REFUNDED:   'scholarly.resource.refunded',
  LICENCE_CREATED:     'scholarly.licence.created',
  LICENCE_ACTIVATED:   'scholarly.licence.activated',
  LICENCE_EXPIRED:     'scholarly.licence.expired',
} as const;


// ============================================================================
// §8 — API REQUEST / RESPONSE DTOs
// ============================================================================

export interface CreateResourceRequest {
  title: string;
  description: string;
  shortDescription?: string | undefined;
  format: ResourceFormat;
  priceIndividualCents: number;
  priceSingleSchoolCents?: number | undefined;
  priceMultiSchoolCents?: number | undefined;
  currency?: string | undefined;
  subjectArea?: string | undefined;
  yearLevels?: string[] | undefined;
  tags?: string[] | undefined;
  curriculumTagIds?: string[] | undefined;
  previewPageCount?: number | undefined;
}

export interface UpdateResourceRequest {
  title?: string | undefined;
  description?: string | undefined;
  shortDescription?: string | undefined;
  priceIndividualCents?: number | undefined;
  priceSingleSchoolCents?: number | undefined;
  priceMultiSchoolCents?: number | undefined;
  subjectArea?: string | undefined;
  yearLevels?: string[] | undefined;
  tags?: string[] | undefined;
  curriculumTagIds?: string[] | undefined;
  featured?: boolean | undefined;
  previewPageCount?: number | undefined;
}

export interface PurchaseResourceRequest {
  resourceId: string;
  licenceScope: LicenceScope;
  institutionId?: string | undefined;
  institutionName?: string | undefined;
  stripePaymentMethodId: string;
}

export interface ListFilter {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ResourceSearchRequest extends ListFilter {
  search?: string | undefined;
  subjectArea?: string | undefined;
  yearLevels?: string[] | undefined;
  format?: ResourceFormat | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  curriculumFramework?: string | undefined;
  curriculumCode?: string | undefined;
  authorId?: string | undefined;
  status?: ResourceStatus | undefined;
  featured?: boolean | undefined;
  sortBy?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

export interface FileUploadInput {
  fileName: string;
  data: Buffer;
  mimeType: string;
  label?: string | undefined;
  watermarkEnabled?: boolean | undefined;
}

export interface RecommendationParams {
  studentId: string;
  learningGaps?: string[] | undefined;
  curriculumCodes?: string[] | undefined;
  yearLevel?: string | undefined;
  maxResults?: number | undefined;
}


// ============================================================================
// §9 — ANALYTICS TYPES
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


// ============================================================================
// §10 — REPOSITORY INTERFACES
// ============================================================================

export interface ResourceRepository {
  save(tenantId: string, resource: DigitalResource): Promise<DigitalResource>;
  findById(tenantId: string, id: string): Promise<DigitalResource | null>;
  findBySlug(tenantId: string, slug: string): Promise<DigitalResource | null>;
  findByAuthor(tenantId: string, authorId: string, filter: ListFilter): Promise<PaginatedResult<DigitalResource>>;
  search(tenantId: string, filter: ResourceSearchRequest): Promise<PaginatedResult<DigitalResource>>;
  update(tenantId: string, id: string, updates: Partial<DigitalResource>): Promise<DigitalResource>;
  delete(tenantId: string, id: string): Promise<void>;
  incrementPurchaseCount(tenantId: string, id: string, amountCents: number): Promise<void>;
  updateRating(tenantId: string, id: string, averageRating: number, ratingCount: number): Promise<void>;
}

export interface PurchaseRepository {
  save(tenantId: string, purchase: ResourcePurchase): Promise<ResourcePurchase>;
  findById(tenantId: string, id: string): Promise<ResourcePurchase | null>;
  findByBuyer(tenantId: string, buyerId: string, filter: ListFilter): Promise<PaginatedResult<ResourcePurchase>>;
  findByResource(tenantId: string, resourceId: string, filter: ListFilter): Promise<PaginatedResult<ResourcePurchase>>;
  findByStripePaymentIntent(stripePaymentIntentId: string): Promise<ResourcePurchase | null>;
  hasBuyerPurchased(tenantId: string, buyerId: string, resourceId: string): Promise<boolean>;
  incrementDownloadCount(tenantId: string, id: string): Promise<void>;
}

export interface LicenceRepository {
  save(tenantId: string, licence: ResourceLicence): Promise<ResourceLicence>;
  findById(tenantId: string, id: string): Promise<ResourceLicence | null>;
  findActiveByInstitution(tenantId: string, institutionId: string): Promise<ResourceLicence[]>;
  findByPurchase(tenantId: string, purchaseId: string): Promise<ResourceLicence | null>;
  deactivate(tenantId: string, id: string, reason: string): Promise<void>;
}


// ============================================================================
// §11 — ROUTE HELPER TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
}
