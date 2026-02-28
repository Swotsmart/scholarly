/**
 * ============================================================================
 * Scholarly Platform — Érudits Ecosystem Types & Events
 * ============================================================================
 *
 * The type system for the four domains that power the Érudits partnership
 * and every tutor-author who follows. Think of this file as the architectural
 * blueprints: every service, repository, route, and test file references these
 * types. Change a type here and the compiler tells you every place that needs
 * to adapt — that's the entire point of TypeScript.
 *
 * ## Domain Organisation
 *
 *   §1 — Shared Infrastructure (Result<T>, base service, validators)
 *   §2 — Resource Marketplace (digital goods, purchases, licences)
 *   §3 — Publishing Engine (manuscripts, formatting, covers, distribution)
 *   §4 — Book Club (reading programmes, sessions, members)
 *   §5 — Migration (Squarespace import, content mapping)
 *   §6 — NATS Event Taxonomy
 *   §7 — API DTOs (request/response shapes for routes)
 *
 * @module erudits/types
 * @version 1.0.0
 */

// ============================================================================
// §1 — SHARED INFRASTRUCTURE
// ============================================================================

/**
 * The Result<T> monad: every service method returns this instead of throwing.
 * The caller is forced by the type system to handle both branches.
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ServiceError };

/**
 * Like Partial<T> but adds `| undefined` to each property, making it
 * compatible with exactOptionalPropertyTypes.
 */
export type StrictPartial<T> = {
  [P in keyof T]?: T[P] | undefined;
};

export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<T>(error: ServiceError): Result<T> {
  return { success: false, error };
}

/** Strip undefined values from an object for exactOptionalPropertyTypes compliance. */
export function strip<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value;
  }
  return result as T;
}

/** Structured error with machine-readable code and HTTP status mapping. */
export interface ServiceError {
  code: string;
  message: string;
  httpStatus: number;
  details?: Record<string, unknown> | undefined;
}

/** Standard error constructors. */
export const Errors = {
  validation: (message: string, details?: Record<string, unknown>): ServiceError => ({
    code: 'VALIDATION_ERROR', message, httpStatus: 400, ...(details ? { details } : {}),
  }),
  notFound: (entity: string, id: string): ServiceError => ({
    code: 'NOT_FOUND', message: `${entity} not found: ${id}`, httpStatus: 404,
  }),
  unauthorised: (message = 'Not authorised'): ServiceError => ({
    code: 'UNAUTHORISED', message, httpStatus: 401,
  }),
  forbidden: (message = 'Access denied'): ServiceError => ({
    code: 'FORBIDDEN', message, httpStatus: 403,
  }),
  conflict: (message: string): ServiceError => ({
    code: 'CONFLICT', message, httpStatus: 409,
  }),
  internal: (message: string): ServiceError => ({
    code: 'INTERNAL_ERROR', message, httpStatus: 500,
  }),
  external: (service: string, message: string): ServiceError => ({
    code: 'EXTERNAL_SERVICE_ERROR', message: `${service}: ${message}`, httpStatus: 502,
  }),
  rateLimited: (message = 'Too many requests'): ServiceError => ({
    code: 'RATE_LIMITED', message, httpStatus: 429,
  }),
};

/** Paginated query parameters. */
export interface ListFilter {
  page: number;
  pageSize: number;
  sortBy?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
  search?: string | undefined;
}

/** Paginated response wrapper. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Dependency interfaces for constructor injection. */
export interface EventBus {
  publish(topic: string, payload: Record<string, unknown>): Promise<void>;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
  /**
   * Atomic increment. Returns the value after incrementing.
   * If the key doesn't exist, initialises to 0 before incrementing.
   * Optionally sets a TTL on the key (only applied on first creation).
   *
   * In Redis, this maps to: INCR key; IF ttl THEN EXPIRE key ttl
   * The atomicity of INCR guarantees no race conditions under concurrent
   * requests — unlike a get-then-set pattern which can double-count.
   */
  incr(key: string, ttlSeconds?: number): Promise<number>;
}

export interface AIService {
  complete(params: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
    temperature: number;
    responseFormat?: 'json' | 'text' | undefined;
  }): Promise<{ text: string; tokensUsed: number; cost: number }>;

  generateImage(params: {
    prompt: string;
    size: string;
    model: string;
    quality?: string | undefined;
  }): Promise<{ imageUrl: string; cost: number }>;
}

export interface FileStorage {
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
  copy(sourceKey: string, destKey: string): Promise<string>;
}

export interface ScholarlyConfig {
  aiEnabled: boolean;
  aiModel: string;
  aiMaxTokens: number;
  defaultPageSize: number;
  maxPageSize: number;
  environment: 'development' | 'staging' | 'production';
  platformFeePercent: number;       // Default platform commission (e.g., 15)
  stripeFeeFixedCents: number;      // Stripe's per-transaction fixed fee
  stripeFeePercent: number;         // Stripe's percentage fee
}

// ============================================================================
// §2 — RESOURCE MARKETPLACE TYPES
// ============================================================================

export type ResourceStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived' | 'rejected';
export type ResourceFormat = 'pdf' | 'docx' | 'pptx' | 'epub' | 'audio_mp3' | 'audio_wav' | 'video_mp4' | 'image_set' | 'interactive' | 'other';
export type LicenceScope = 'individual' | 'single_school' | 'multi_school' | 'unlimited';

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
  priceIndividualCents: number;
  priceSingleSchoolCents?: number | undefined;
  priceMultiSchoolCents?: number | undefined;
  currency: string;
  format: ResourceFormat;
  status: ResourceStatus;
  subjectArea?: string | undefined;
  yearLevels: string[];
  curriculumTags: CurriculumTag[];
  tags: string[];
  featured: boolean;
  totalPurchases: number;
  totalRevenueCents: number;
  averageRating: number;
  ratingCount: number;
  moderationStatus: string;
  previewPageCount?: number | undefined;
  sampleFileUrl?: string | undefined;
}

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
  status: string;
  downloadCount: number;
  lastDownloadedAt?: Date | undefined;
}

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

// ============================================================================
// §3 — PUBLISHING ENGINE TYPES
// ============================================================================

export type ManuscriptStatus = 'draft' | 'in_review' | 'revision_requested' | 'approved' | 'formatting' | 'published' | 'archived';
export type PublicationFormat = 'ebook_epub' | 'ebook_kpf' | 'paperback' | 'hardcover' | 'digital_pdf' | 'print_pdf' | 'docx_modifiable';
export type DistributionChannel = 'scholarly_direct' | 'amazon_kdp' | 'ingram_spark' | 'scholarly_marketplace' | 'school_direct';
export type ChannelPublicationStatus = 'not_submitted' | 'pending_review' | 'live' | 'suspended' | 'removed';
export type CoverSource = 'ai_generated' | 'template' | 'uploaded' | 'professional';

export interface Manuscript {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  authorName: string;
  collaboratorIds: string[];
  title: string;
  subtitle?: string | undefined;
  slug: string;
  description?: string | undefined;
  language: string;
  secondaryLanguage?: string | undefined;
  content: Record<string, unknown>;   // ProseMirror JSON
  wordCount: number;
  pageCountEstimate: number;
  chapters: ManuscriptChapter[];
  frontMatter?: Record<string, unknown> | undefined;
  backMatter?: Record<string, unknown> | undefined;
  genre?: string | undefined;
  subjectArea?: string | undefined;
  yearLevels: string[];
  curriculumTags: CurriculumTag[];
  trimWidth?: number | undefined;
  trimHeight?: number | undefined;
  paperType?: string | undefined;
  inkType?: string | undefined;
  bindingType?: string | undefined;
  hasBleed: boolean;
  isbnEbook?: string | undefined;
  isbnPaperback?: string | undefined;
  isbnHardcover?: string | undefined;
  status: ManuscriptStatus;
  currentVersionId?: string | undefined;
}

export interface ManuscriptChapter {
  id: string;
  tenantId: string;
  manuscriptId: string;
  title: string;
  sortOrder: number;
  wordCount: number;
  pageStart?: number | undefined;
  curriculumCode?: string | undefined;
  learningObjectives: string[];
  contentNodeId?: string | undefined;
}

export interface ManuscriptVersion {
  id: string;
  tenantId: string;
  createdAt: Date;
  manuscriptId: string;
  versionNumber: number;
  label?: string | undefined;
  content: Record<string, unknown>;
  wordCount: number;
  changeDescription?: string | undefined;
  createdBy: string;
}

export interface BookPublication {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  manuscriptId: string;
  versionId: string;
  format: PublicationFormat;
  fileUrl?: string | undefined;
  fileSizeBytes?: number | undefined;
  pageCount?: number | undefined;
  spineWidthInches?: number | undefined;
  coverId?: string | undefined;
  pricing: Record<string, ChannelPricing>;
  channels: PublicationChannelRecord[];
  totalSales: number;
  totalRevenueCents: number;
  averageRating: number;
  kdpAsin?: string | undefined;
  kdpStatus?: string | undefined;
  ingramTitleId?: string | undefined;
  ingramStatus?: string | undefined;
}

export interface ChannelPricing {
  priceCents: number;
  currency: string;
  royaltyPercent?: number | undefined;
}

export interface PublicationChannelRecord {
  id: string;
  tenantId: string;
  publicationId: string;
  channel: DistributionChannel;
  status: ChannelPublicationStatus;
  externalId?: string | undefined;
  listPriceCents?: number | undefined;
  currency: string;
  royaltyPercent?: number | undefined;
  submittedAt?: Date | undefined;
  approvedAt?: Date | undefined;
  rejectedAt?: Date | undefined;
  rejectionReason?: string | undefined;
  lastSyncAt?: Date | undefined;
}

export interface BookCover {
  id: string;
  tenantId: string;
  createdAt: Date;
  manuscriptId: string;
  source: CoverSource;
  frontCoverUrl?: string | undefined;
  fullCoverUrl?: string | undefined;
  thumbnailUrl?: string | undefined;
  widthPx?: number | undefined;
  heightPx?: number | undefined;
  dpiResolution?: number | undefined;
  colourSpace?: string | undefined;
  spineWidthInches?: number | undefined;
  aiPrompt?: string | undefined;
  aiModel?: string | undefined;
  aiGenerationCost?: number | undefined;
  templateId?: string | undefined;
  templateCustomisations?: Record<string, unknown> | undefined;
  isKdpCompliant: boolean;
  validationErrors?: Record<string, unknown>[] | undefined;
  isSelected: boolean;
}

export interface SalesRecord {
  id: string;
  tenantId: string;
  createdAt: Date;
  publicationId?: string | undefined;
  resourceId?: string | undefined;
  channel: DistributionChannel;
  buyerId?: string | undefined;
  buyerEmail?: string | undefined;
  institutionId?: string | undefined;
  quantitySold: number;
  unitPriceCents: number;
  totalPriceCents: number;
  platformFeeCents: number;
  channelFeeCents: number;
  authorEarningsCents: number;
  currency: string;
  stripePaymentIntentId?: string | undefined;
  externalTransactionId?: string | undefined;
  payoutId?: string | undefined;
  reconciledAt?: Date | undefined;
  countryCode?: string | undefined;
  isRefunded: boolean;
}

// ── KDP Specifications ──
// These constants encode Amazon's print specifications so the formatting
// engine can produce compliant files without authors needing to know the rules.

export const KDP_SPECS = {
  /** Common trim sizes in inches [width, height]. */
  trimSizes: {
    'us_trade':       { width: 6.0,  height: 9.0 },
    'us_letter':      { width: 8.5,  height: 11.0 },
    'digest':         { width: 5.5,  height: 8.5 },
    'a5':             { width: 5.83, height: 8.27 },
    'royal':          { width: 6.14, height: 9.21 },
    'small_square':   { width: 7.5,  height: 7.5 },
    'pocket':         { width: 4.25, height: 6.87 },
  } as const,

  /** Minimum margins in inches based on page count ranges. */
  margins: (pageCount: number): { inside: number; outside: number; top: number; bottom: number } => {
    // KDP requires wider inside (gutter) margins for thicker books.
    const inside = pageCount <= 150 ? 0.375 : pageCount <= 400 ? 0.5 : pageCount <= 600 ? 0.625 : 0.875;
    return { inside, outside: 0.25, top: 0.25, bottom: 0.25 };
  },

  /** Spine width calculation: page count × paper thickness. */
  spineWidth: (pageCount: number, paperType: 'white' | 'cream'): number => {
    // White paper: 0.002252 inches per page. Cream: 0.002347 inches per page.
    const factor = paperType === 'white' ? 0.002252 : 0.002347;
    return pageCount * factor;
  },

  /** Bleed settings for books with edge-to-edge images. */
  bleed: {
    top: 0.125,     // 0.125" (3.2mm) beyond trim on top
    bottom: 0.125,
    outside: 0.125,
    inside: 0,       // No bleed on the spine side
  } as const,

  /** Minimum DPI for print images. */
  minDpi: 300,

  /** Maximum file size in bytes (650 MB). */
  maxFileSizeBytes: 650 * 1024 * 1024,

  /** Minimum and maximum page counts. */
  minPages: 24,
  maxPagesPaperback: 828,
  maxPagesHardcover: 550,

  /** Cover dimensions calculator. */
  coverDimensions: (
    trimWidth: number, trimHeight: number,
    pageCount: number, paperType: 'white' | 'cream',
    hasBleed: boolean
  ): { widthInches: number; heightInches: number; widthPx: number; heightPx: number } => {
    const spine = pageCount * (paperType === 'white' ? 0.002252 : 0.002347);
    const bleedW = hasBleed ? 0.125 : 0;
    const bleedH = hasBleed ? 0.125 : 0;
    const widthInches = trimWidth + spine + trimWidth + (2 * bleedW);
    const heightInches = trimHeight + (2 * bleedH);
    return {
      widthInches,
      heightInches,
      widthPx: Math.ceil(widthInches * 300),
      heightPx: Math.ceil(heightInches * 300),
    };
  },
} as const;

// ============================================================================
// §4 — BOOK CLUB TYPES
// ============================================================================

export type BookClubSessionType = 'reading_assignment' | 'discussion' | 'activity' | 'assessment' | 'guest_speaker';

export interface BookClub {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  organiserId: string;
  organiserName: string;
  name: string;
  slug: string;
  description?: string | undefined;
  coverImageUrl?: string | undefined;
  language: string;
  maxParticipants?: number | undefined;
  isPublic: boolean;
  requiresApproval: boolean;
  subscriptionRequired: boolean;
  subjectArea?: string | undefined;
  yearLevels: string[];
  curriculumTags: CurriculumTag[];
  /** Curriculum codes for quick filtering (derived from curriculumTags). */
  curriculumCodes: string[];
  /** Flat year level targets for session generation. */
  targetYearLevels: string[];
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  meetingFrequency?: string | undefined;
  meetingDay?: string | undefined;
  meetingTime?: string | undefined;
  timezone: string;
  isActive: boolean;
  participantCount: number;
  /** Denormalised metrics for dashboard display. */
  memberCount: number;
  sessionCount: number;
  readingCount: number;
  completionRate: number;
  maxMembers?: number | undefined;
}

export interface BookClubSession {
  id: string;
  tenantId: string;
  createdAt: Date;
  bookClubId: string;
  title: string;
  description?: string | undefined;
  sessionType: BookClubSessionType;
  scheduledAt: Date;
  durationMinutes: number;
  sortOrder: number;
  readingId?: string | undefined;
  chaptersFrom?: string | undefined;
  chaptersTo?: string | undefined;
  pagesFrom?: number | undefined;
  pagesTo?: number | undefined;
  meetingUrl?: string | undefined;
  location?: string | undefined;
  discussionPrompts?: string[] | undefined;
  materials?: Record<string, unknown>[] | undefined;
  facilitatorNotes?: string | undefined;
  status: string;
  isCompleted: boolean;
  attendeeCount: number;
}

export interface BookClubReading {
  id: string;
  tenantId: string;
  createdAt: Date;
  bookClubId: string;
  title: string;
  author?: string | undefined;
  isbn?: string | undefined;
  coverImageUrl?: string | undefined;
  storybookId?: string | undefined;
  publicationId?: string | undefined;
  externalUrl?: string | undefined;
  sortOrder: number;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  readByDate?: Date | undefined;
  curriculumCode?: string | undefined;
  learningObjectives: string[];
  isComplete: boolean;
  completionRate: number;
}

export interface BookClubMember {
  id: string;
  tenantId: string;
  createdAt: Date;
  bookClubId: string;
  userId: string;
  displayName: string;
  userName: string;
  role: 'member' | 'moderator' | 'organiser' | 'student' | 'facilitator';
  isActive: boolean;
  readingsCompleted: number;
  sessionsAttended: number;
  engagementScore: number;
  lastActiveAt?: Date | undefined;
}

// ============================================================================
// §5 — MIGRATION TYPES
// ============================================================================

export type MigrationSource = 'squarespace' | 'wordpress' | 'wix' | 'shopify' | 'teacherspayteachers' | 'custom';
export type MigrationStatus =
  | 'created' | 'extracting' | 'transforming' | 'validating'
  | 'ready_for_review' | 'approved' | 'importing'
  | 'parallel_run' | 'cutover_ready' | 'live' | 'failed' | 'rolled_back';

export interface PlatformMigration {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  source: MigrationSource;
  sourceUrl: string;
  sourceSiteId?: string | undefined;
  ownerId: string;
  ownerEmail: string;
  status: MigrationStatus;
  currentStep?: string | undefined;
  progressPercent: number;
  pagesFound: number;
  productsFound: number;
  membersFound: number;
  imagesFound: number;
  postsFound: number;
  pagesImported: number;
  productsImported: number;
  membersImported: number;
  imagesImported: number;
  postsImported: number;
  urlMappings?: Record<string, string> | undefined;
  customDomain?: string | undefined;
  dnsVerified: boolean;
  sslProvisioned: boolean;
  extractionStartedAt?: Date | undefined;
  extractionCompletedAt?: Date | undefined;
  importStartedAt?: Date | undefined;
  importCompletedAt?: Date | undefined;
  cutoverAt?: Date | undefined;
  errors?: MigrationError[] | undefined;
  warnings?: MigrationWarning[] | undefined;
}

export interface MigrationContentItem {
  id: string;
  tenantId: string;
  migrationId: string;
  sourceType: 'page' | 'product' | 'post' | 'image' | 'member';
  sourceId?: string | undefined;
  sourceUrl?: string | undefined;
  sourceTitle?: string | undefined;
  sourceData?: Record<string, unknown> | undefined;
  targetType?: 'cms_page' | 'digital_resource' | 'user' | 'media' | undefined;
  targetId?: string | undefined;
  targetUrl?: string | undefined;
  status: 'pending' | 'mapped' | 'imported' | 'failed' | 'skipped';
  errorMessage?: string | undefined;
  requiresReview: boolean;
  reviewNotes?: string | undefined;
}

export interface MigrationError {
  step: string;
  message: string;
  details?: Record<string, unknown> | undefined;
  timestamp: Date;
}

export interface MigrationWarning {
  step: string;
  message: string;
  details?: Record<string, unknown> | undefined;
  timestamp: Date;
}

/** Squarespace-specific extraction types. */
export interface SquarespaceExportData {
  pages: SquarespacePage[];
  products: SquarespaceProduct[];
  posts: SquarespacePost[];
  members: SquarespaceMember[];
  navigation: SquarespaceNavItem[];
  settings: SquarespaceSiteSettings;
}

export interface SquarespacePage {
  id: string;
  title: string;
  slug: string;
  content: string;        // HTML content
  seoTitle?: string | undefined;
  seoDescription?: string | undefined;
  url: string;
  updatedAt: string;
  isEnabled: boolean;
}

export interface SquarespaceProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  tags: string[];
  categories: string[];
  isDigital: boolean;
  fileUrl?: string | undefined;
  variants: Array<{ name: string; price: number; sku?: string }>;
  isVisible: boolean;
}

export interface SquarespacePost {
  id: string;
  title: string;
  slug: string;
  content: string;
  publishedAt: string;
  author?: string | undefined;
  tags: string[];
  excerpt?: string | undefined;
  featuredImageUrl?: string | undefined;
}

export interface SquarespaceMember {
  email: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  createdAt: string;
  subscriptionStatus?: string | undefined;
}

export interface SquarespaceNavItem {
  title: string;
  url: string;
  children?: SquarespaceNavItem[] | undefined;
}

export interface SquarespaceSiteSettings {
  title: string;
  description: string;
  logoUrl?: string | undefined;
  faviconUrl?: string | undefined;
  socialLinks: Record<string, string>;
}

// ============================================================================
// §6 — CURRICULUM TAG
// ============================================================================

export interface CurriculumTag {
  id: string;
  tenantId: string;
  framework: string;
  code: string;
  label: string;
  description?: string | undefined;
  parentId?: string | undefined;
  level: number;
}

// ── Predefined Frameworks ──
// These are the frameworks Érudits needs immediately. Others are added as
// new tutors onboard with different curriculum requirements.
export const CURRICULUM_FRAMEWORKS = {
  WACE_ATAR: {
    name: 'Western Australian Certificate of Education — ATAR',
    country: 'AU',
    state: 'WA',
    codes: {
      FR_SL_U1: 'French Second Language ATAR Unit 1',
      FR_SL_U2: 'French Second Language ATAR Unit 2',
      FR_SL_U3: 'French Second Language ATAR Unit 3',
      FR_SL_U4: 'French Second Language ATAR Unit 4',
    },
  },
  CEFR: {
    name: 'Common European Framework of Reference for Languages',
    country: 'INTL',
    codes: {
      A1: 'Breakthrough / Beginner',
      A2: 'Waystage / Elementary',
      B1: 'Threshold / Intermediate',
      B2: 'Vantage / Upper Intermediate',
      C1: 'Effective Operational Proficiency / Advanced',
      C2: 'Mastery / Proficiency',
    },
  },
  IB: {
    name: 'International Baccalaureate',
    country: 'INTL',
    codes: {
      IB_AB_INITIO: 'Language ab initio',
      IB_LANG_B_SL: 'Language B — Standard Level',
      IB_LANG_B_HL: 'Language B — Higher Level',
    },
  },
} as const;

// ============================================================================
// §7 — NATS EVENT TAXONOMY
// ============================================================================

/**
 * Every significant state change in the Érudits ecosystem emits a NATS event.
 * Other services subscribe to events they care about — the Intelligence Mesh
 * uses these to build cross-domain insights, and the analytics pipeline
 * aggregates them for reporting dashboards.
 */
export const ERUDITS_EVENTS = {
  // ── Resource Marketplace ──
  RESOURCE_CREATED:           'scholarly.resource.created',
  RESOURCE_PUBLISHED:         'scholarly.resource.published',
  RESOURCE_ARCHIVED:          'scholarly.resource.archived',
  RESOURCE_PURCHASED:         'scholarly.resource.purchased',
  RESOURCE_DOWNLOADED:        'scholarly.resource.downloaded',
  RESOURCE_REVIEWED:          'scholarly.resource.reviewed',
  RESOURCE_REFUNDED:          'scholarly.resource.refunded',
  LICENCE_CREATED:            'scholarly.licence.created',
  LICENCE_ACTIVATED:          'scholarly.licence.activated',
  LICENCE_EXPIRED:            'scholarly.licence.expired',

  // ── Publishing Engine ──
  MANUSCRIPT_CREATED:         'scholarly.manuscript.created',
  MANUSCRIPT_VERSION_SAVED:   'scholarly.manuscript.version_saved',
  MANUSCRIPT_SUBMITTED:       'scholarly.manuscript.submitted',
  MANUSCRIPT_APPROVED:        'scholarly.manuscript.approved',
  MANUSCRIPT_FORMATTING:      'scholarly.manuscript.formatting',
  PUBLICATION_CREATED:        'scholarly.publication.created',
  PUBLICATION_SUBMITTED:      'scholarly.publication.channel_submitted',
  PUBLICATION_LIVE:           'scholarly.publication.live',
  COVER_GENERATED:            'scholarly.cover.generated',
  COVER_VALIDATED:            'scholarly.cover.validated',
  SALE_RECORDED:              'scholarly.sale.recorded',

  // ── Book Club ──
  BOOKCLUB_CREATED:           'scholarly.bookclub.created',
  BOOKCLUB_SESSION_SCHEDULED: 'scholarly.bookclub.session_scheduled',
  BOOKCLUB_MEMBER_JOINED:     'scholarly.bookclub.member_joined',
  BOOKCLUB_READING_ASSIGNED:  'scholarly.bookclub.reading_assigned',
  BOOKCLUB_SESSION_COMPLETED: 'scholarly.bookclub.session_completed',

  // ── Migration ──
  MIGRATION_CREATED:          'scholarly.migration.created',
  MIGRATION_EXTRACTION_DONE:  'scholarly.migration.extraction_completed',
  MIGRATION_IMPORT_DONE:      'scholarly.migration.import_completed',
  MIGRATION_CUTOVER:          'scholarly.migration.cutover',
  MIGRATION_LIVE:             'scholarly.migration.live',
  MIGRATION_FAILED:           'scholarly.migration.failed',
  MIGRATION_ROLLED_BACK:      'scholarly.migration.rolled_back',
} as const;

// ============================================================================
// §8 — API DTOs (Request / Response Shapes)
// ============================================================================

// ── Resource Marketplace DTOs ──

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

// ── Publishing Engine DTOs ──

export interface CreateManuscriptRequest {
  title: string;
  subtitle?: string | undefined;
  description?: string | undefined;
  language?: string | undefined;
  secondaryLanguage?: string | undefined;
  genre?: string | undefined;
  subjectArea?: string | undefined;
  yearLevels?: string[] | undefined;
  trimWidth?: number | undefined;
  trimHeight?: number | undefined;
  paperType?: string | undefined;
  inkType?: string | undefined;
  bindingType?: string | undefined;
  curriculumTagIds?: string[] | undefined;
}

export interface UpdateManuscriptRequest {
  title?: string | undefined;
  subtitle?: string | undefined;
  description?: string | undefined;
  content?: Record<string, unknown> | undefined;
  trimWidth?: number | undefined;
  trimHeight?: number | undefined;
  paperType?: string | undefined;
  inkType?: string | undefined;
  bindingType?: string | undefined;
}

export interface GenerateCoverRequest {
  manuscriptId: string;
  prompt: string;
  style?: string | undefined;
  colourPalette?: string[] | undefined;
  includeBackCover?: boolean | undefined;
}

export interface PublishRequest {
  manuscriptId: string;
  versionId: string;
  formats: PublicationFormat[];
  channels: DistributionChannel[];
  pricing: Record<string, ChannelPricing>;
}

export interface FormatManuscriptRequest {
  manuscriptId: string;
  versionId: string;
  format: PublicationFormat;
  options?: {
    trimWidth?: number | undefined;
    trimHeight?: number | undefined;
    paperType?: string | undefined;
    inkType?: string | undefined;
    hasBleed?: boolean | undefined;
    includeIsbn?: boolean | undefined;
  };
}

// ── Migration DTOs ──

export interface StartMigrationRequest {
  source: MigrationSource;
  sourceUrl: string;
  customDomain?: string | undefined;
}

export interface ApproveMigrationRequest {
  migrationId: string;
  approvedItems: string[];     // IDs of content items approved for import
  skippedItems: string[];      // IDs of content items to skip
  notes?: string | undefined;
}

// ── Book Club DTOs ──

export interface CreateBookClubRequest {
  name: string;
  description?: string | undefined;
  language?: string | undefined;
  maxParticipants?: number | undefined;
  isPublic?: boolean | undefined;
  requiresApproval?: boolean | undefined;
  subjectArea?: string | undefined;
  yearLevels?: string[] | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  meetingFrequency?: string | undefined;
  meetingDay?: string | undefined;
  meetingTime?: string | undefined;
  timezone?: string | undefined;
}

export interface AddReadingRequest {
  bookClubId: string;
  title: string;
  author: string;
  isbn?: string | undefined;
  coverImageUrl?: string | undefined;
  publicationId?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  curriculumCode?: string | undefined;
  learningObjectives?: string[] | undefined;
}

export interface ScheduleSessionRequest {
  bookClubId: string;
  title: string;
  description?: string | undefined;
  sessionType: BookClubSessionType;
  scheduledAt: string;
  durationMinutes?: number | undefined;
  readingId?: string | undefined;
  chaptersFrom?: string | undefined;
  chaptersTo?: string | undefined;
  meetingUrl?: string | undefined;
  location?: string | undefined;
  discussionPrompts?: string[] | undefined;
}

// ============================================================================
// §9 — REPOSITORY INTERFACES
// ============================================================================

/** Resource Marketplace Repositories */
export interface ResourceRepository {
  save(tenantId: string, resource: DigitalResource): Promise<DigitalResource>;
  findById(tenantId: string, id: string): Promise<DigitalResource | null>;
  findBySlug(tenantId: string, slug: string): Promise<DigitalResource | null>;
  findByAuthor(tenantId: string, authorId: string, filter: ListFilter): Promise<PaginatedResult<DigitalResource>>;
  search(tenantId: string, filter: ResourceSearchRequest): Promise<PaginatedResult<DigitalResource>>;
  update(tenantId: string, id: string, updates: StrictPartial<DigitalResource>): Promise<DigitalResource>;
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

/** Publishing Engine Repositories */
export interface ManuscriptRepository {
  save(tenantId: string, manuscript: Manuscript): Promise<Manuscript>;
  findById(tenantId: string, id: string): Promise<Manuscript | null>;
  findBySlug(tenantId: string, slug: string): Promise<Manuscript | null>;
  findByAuthor(tenantId: string, authorId: string, filter: ListFilter): Promise<PaginatedResult<Manuscript>>;
  update(tenantId: string, id: string, updates: StrictPartial<Manuscript>): Promise<Manuscript>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface ManuscriptVersionRepository {
  save(tenantId: string, version: ManuscriptVersion): Promise<ManuscriptVersion>;
  findById(tenantId: string, id: string): Promise<ManuscriptVersion | null>;
  findByManuscript(tenantId: string, manuscriptId: string): Promise<ManuscriptVersion[]>;
  findLatest(tenantId: string, manuscriptId: string): Promise<ManuscriptVersion | null>;
}

export interface PublicationRepository {
  save(tenantId: string, publication: BookPublication): Promise<BookPublication>;
  findById(tenantId: string, id: string): Promise<BookPublication | null>;
  findByManuscript(tenantId: string, manuscriptId: string): Promise<BookPublication[]>;
  findByChannel(tenantId: string, channel: DistributionChannel, filter: ListFilter): Promise<PaginatedResult<BookPublication>>;
  update(tenantId: string, id: string, updates: StrictPartial<BookPublication>): Promise<BookPublication>;
}

export interface CoverRepository {
  save(tenantId: string, cover: BookCover): Promise<BookCover>;
  findById(tenantId: string, id: string): Promise<BookCover | null>;
  findByManuscript(tenantId: string, manuscriptId: string): Promise<BookCover[]>;
  findSelected(tenantId: string, manuscriptId: string): Promise<BookCover | null>;
  setSelected(tenantId: string, manuscriptId: string, coverId: string): Promise<void>;
}

export interface SalesRepository {
  save(tenantId: string, record: SalesRecord): Promise<SalesRecord>;
  findByPublication(tenantId: string, publicationId: string, filter: ListFilter): Promise<PaginatedResult<SalesRecord>>;
  findByAuthor(tenantId: string, authorId: string, filter: ListFilter): Promise<PaginatedResult<SalesRecord>>;
  getRevenueByChannel(tenantId: string, authorId: string, fromDate: Date, toDate: Date): Promise<Record<string, number>>;
  getTotalRevenue(tenantId: string, authorId: string, fromDate: Date, toDate: Date): Promise<number>;
}

/** Migration Repositories */
export interface MigrationRepository {
  save(tenantId: string, migration: PlatformMigration): Promise<PlatformMigration>;
  findById(tenantId: string, id: string): Promise<PlatformMigration | null>;
  findByOwner(tenantId: string, ownerId: string): Promise<PlatformMigration[]>;
  update(tenantId: string, id: string, updates: StrictPartial<PlatformMigration>): Promise<PlatformMigration>;
}

export interface MigrationContentRepository {
  saveBatch(tenantId: string, items: MigrationContentItem[]): Promise<MigrationContentItem[]>;
  findByMigration(tenantId: string, migrationId: string, filter?: { sourceType?: string; status?: string }): Promise<MigrationContentItem[]>;
  update(tenantId: string, id: string, updates: StrictPartial<MigrationContentItem>): Promise<MigrationContentItem>;
  updateBatch(tenantId: string, updates: Array<{ id: string; updates: StrictPartial<MigrationContentItem> }>): Promise<void>;
}

/** Book Club Repositories */
export interface BookClubRepository {
  save(tenantId: string, club: BookClub): Promise<BookClub>;
  findById(tenantId: string, id: string): Promise<BookClub | null>;
  findBySlug(tenantId: string, slug: string): Promise<BookClub | null>;
  findByOrganiser(tenantId: string, organiserId: string): Promise<BookClub[]>;
  findPublic(tenantId: string, filter: ListFilter): Promise<PaginatedResult<BookClub>>;
  update(tenantId: string, id: string, updates: StrictPartial<BookClub>): Promise<BookClub>;
}

export interface BookClubSessionRepository {
  save(tenantId: string, session: BookClubSession): Promise<BookClubSession>;
  findById(tenantId: string, id: string): Promise<BookClubSession | null>;
  findByClub(tenantId: string, bookClubId: string): Promise<BookClubSession[]>;
  findUpcoming(tenantId: string, bookClubId: string, limit?: number): Promise<BookClubSession[]>;
  update(tenantId: string, id: string, updates: StrictPartial<BookClubSession>): Promise<BookClubSession>;
}

export interface BookClubReadingRepository {
  save(tenantId: string, reading: BookClubReading): Promise<BookClubReading>;
  findById(tenantId: string, id: string): Promise<BookClubReading | null>;
  findByClub(tenantId: string, bookClubId: string): Promise<BookClubReading[]>;
  update(tenantId: string, id: string, updates: StrictPartial<BookClubReading>): Promise<BookClubReading>;
}

export interface BookClubMemberRepository {
  save(tenantId: string, member: BookClubMember): Promise<BookClubMember>;
  findById(tenantId: string, id: string): Promise<BookClubMember | null>;
  findByClub(tenantId: string, bookClubId: string): Promise<BookClubMember[]>;
  findByUser(tenantId: string, userId: string): Promise<BookClubMember[]>;
  findByUserAndClub(tenantId: string, userId: string, bookClubId: string): Promise<BookClubMember | null>;
  isMember(tenantId: string, bookClubId: string, userId: string): Promise<boolean>;
  update(tenantId: string, id: string, updates: StrictPartial<BookClubMember>): Promise<BookClubMember>;
  deactivate(tenantId: string, id: string): Promise<void>;
  recordAttendance(tenantId: string, bookClubId: string, userId: string, sessionId: string): Promise<void>;
  remove(tenantId: string, bookClubId: string, userId: string): Promise<void>;
}
