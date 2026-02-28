/**
 * ============================================================================
 * SCHOLARLY PLATFORM — Migration Transform & Review Types
 * ============================================================================
 *
 * The type system for Stages 3 (Transform) and 4 (Review) of the Squarespace
 * migration pipeline. If Stage 2 (Extract) is the removalists photographing
 * everything in the old house, Stage 3 is the interior designer figuring out
 * where each piece goes in the new house, and Stage 4 is the owner walking
 * through the new layout saying "yes, yes, no, move that left a bit."
 *
 * ## How This Connects to the Existing Codebase
 *
 * The PlatformMigration and MigrationContentItem tables are already deployed
 * (Sprint 2 SQL migration in erudits-provisioning.ts). This file adds:
 *
 *   1. Transform result types — the output shapes produced when Squarespace
 *      entities are converted to Scholarly entities.
 *
 *   2. Review types — the DTOs for the review dashboard where the tutor
 *      approves, rejects, or edits each transformed item.
 *
 *   3. Extended content item statuses — the original Érudits code used five
 *      statuses (pending, mapped, imported, failed, skipped). The review
 *      workflow adds three more (approved, rejected, needs_edit) to track
 *      human decisions before import.
 *
 *   4. Repository interfaces — the persistence contracts for the transform
 *      and review services, following the same DI-via-constructor pattern
 *      used by OnboardingSessionRepository.
 *
 *   5. NATS event topics — extending the scholarly.migration.* namespace
 *      with transform and review stage events.
 *
 * ## Status Lifecycle
 *
 * A MigrationContentItem progresses through statuses like a parcel through
 * a customs inspection:
 *
 *   pending ──→ mapped ──→ approved ──→ imported
 *                  │            │
 *                  │            ├──→ failed (import error)
 *                  │            │
 *                  │       needs_edit ──→ approved (after edit)
 *                  │
 *                  └──→ rejected ──→ (excluded from import)
 *                  └──→ skipped  ──→ (excluded from import)
 *
 *   - pending:    Extracted from Squarespace, awaiting transformation
 *   - mapped:     Transformed to Scholarly format, awaiting review
 *   - approved:   Tutor approved, ready for import
 *   - rejected:   Tutor rejected, will not be imported
 *   - needs_edit: Tutor flagged for changes, awaiting re-submission
 *   - imported:   Successfully written to Scholarly database
 *   - failed:     Import attempted but errored
 *   - skipped:    Tutor chose to skip (soft exclude)
 *
 * @module scholarly/migrations/migration-transform.types
 * @version 1.0.0
 */

// ============================================================================
// §1 — RE-EXPORTS FROM ÉRUDITS TYPES
// ============================================================================

/**
 * The core migration entities are defined in the Érudits types file and
 * backed by the deployed SQL tables. We re-export them here so that
 * consumers of the transform/review modules have a single import path.
 *
 * In production, these would come from the generated Prisma client.
 * During the migration sprint, we define them locally to avoid depending
 * on the full Érudits type bundle.
 */

// ── Result<T> Pattern ──────────────────────────────────────────────────
// Every service method in Sprint 3 returns Result<T> instead of throwing.
// The caller is forced by the type system to handle both branches.

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ServiceError };

export type StrictPartial<T> = {
  [P in keyof T]?: T[P] | undefined;
};

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
  details?: Record<string, unknown> | undefined;
}

export const Errors = {
  validation: (message: string, details?: Record<string, unknown>): ServiceError => ({
    code: 'VALIDATION_ERROR', message, httpStatus: 400, ...(details ? { details } : {}),
  }),
  notFound: (entity: string, id: string): ServiceError => ({
    code: 'NOT_FOUND', message: `${entity} not found: ${id}`, httpStatus: 404,
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
};


// ============================================================================
// §2 — CONTENT ITEM STATUS
// ============================================================================

/**
 * The full lifecycle of a migration content item.
 *
 * This extends the original Érudits five-status set with three review
 * statuses. The SQL column is TEXT, so no schema migration is needed —
 * the type system enforces correctness at the application layer.
 */
export type ContentItemStatus =
  | 'pending'       // Extracted, awaiting transform
  | 'mapped'        // Transformed, awaiting review
  | 'approved'      // Tutor approved, ready for import
  | 'rejected'      // Tutor rejected, excluded
  | 'needs_edit'    // Tutor flagged for changes
  | 'imported'      // Successfully imported to Scholarly
  | 'failed'        // Import failed
  | 'skipped';      // Tutor skipped (soft exclude)

/**
 * The subset of statuses that represent "terminal" states — items in
 * these statuses won't appear in the review dashboard's active queue.
 */
export const TERMINAL_STATUSES: ContentItemStatus[] = [
  'imported', 'failed', 'skipped', 'rejected',
];

/**
 * Statuses that count toward the "ready for import" tally.
 */
export const IMPORTABLE_STATUSES: ContentItemStatus[] = [
  'approved',
];

/**
 * Statuses that indicate the item is awaiting human action.
 */
export const REVIEWABLE_STATUSES: ContentItemStatus[] = [
  'mapped', 'needs_edit',
];


// ============================================================================
// §3 — MIGRATION ENTITY (matches deployed PlatformMigration table)
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


// ============================================================================
// §4 — MIGRATION CONTENT ITEM (matches deployed MigrationContentItem table)
// ============================================================================

export type ContentSourceType = 'page' | 'product' | 'post' | 'image' | 'member';
export type ContentTargetType = 'cms_page' | 'digital_resource' | 'user' | 'media';

export interface MigrationContentItem {
  id: string;
  tenantId: string;
  migrationId: string;
  sourceType: ContentSourceType;
  sourceId?: string | undefined;
  sourceUrl?: string | undefined;
  sourceTitle?: string | undefined;
  sourceData?: Record<string, unknown> | undefined;
  targetType?: ContentTargetType | undefined;
  targetId?: string | undefined;
  targetUrl?: string | undefined;
  status: ContentItemStatus;
  errorMessage?: string | undefined;
  requiresReview: boolean;
  reviewNotes?: string | undefined;
}


// ============================================================================
// §5 — SQUARESPACE SOURCE TYPES
// ============================================================================

/**
 * Types representing Squarespace-side entities as extracted during Stage 2.
 * These are the "old house" inventory — the raw data pulled from the
 * Squarespace XML export and API.
 */

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
// §6 — TRANSFORM RESULT TYPES
// ============================================================================

/**
 * These are the "Scholarly-side" output shapes produced by the transform
 * stage. Each one describes a Scholarly entity that will be created during
 * the import stage. They're stored in the MigrationContentItem.sourceData
 * field under the 'transformed' key.
 *
 * Think of them as the architect's drawings: they describe exactly what
 * will be built, but nothing has been constructed yet. The tutor reviews
 * these drawings during Stage 4 (Review) and the builder (Stage 5: Import)
 * uses them to create the actual entities.
 */

/**
 * A CMS page in the Scholarly content management system.
 * Produced by transforming a SquarespacePage or SquarespacePost.
 */
export interface TransformedCmsPage {
  type: 'cms_page' | 'blog_post';
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  content: CmsBlock[];
  isEnabled: boolean;
  sourceUrl: string;
  /** ISO timestamp of transformation */
  migratedAt: string;
  /** Blog-specific fields (only present when type === 'blog_post') */
  publishedAt?: string | undefined;
  author?: string | undefined;
  tags?: string[] | undefined;
  excerpt?: string | undefined;
  featuredImageUrl?: string | undefined;
}

/**
 * A block in the Scholarly CMS block editor. The block format is similar
 * to EditorJS or ProseMirror block nodes — each block has a type and
 * type-specific data.
 *
 * The htmlToBlocks parser in the transform service converts Squarespace
 * HTML into this structure. Think of it as translating a paragraph of
 * French prose into a sequence of labelled grammar cards: each card
 * identifies whether it's a heading, a paragraph, an image, or a list,
 * making the content machine-readable and independently editable.
 */
export type CmsBlock =
  | CmsHeadingBlock
  | CmsParagraphBlock
  | CmsImageBlock
  | CmsListBlock
  | CmsCalloutBlock
  | CmsTableBlock;

export interface CmsHeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export interface CmsParagraphBlock {
  type: 'paragraph';
  text: string;
}

export interface CmsImageBlock {
  type: 'image';
  src: string;
  alt: string;
}

export interface CmsListBlock {
  type: 'list';
  style: 'ordered' | 'unordered';
  items: string[];
}

export interface CmsCalloutBlock {
  type: 'callout';
  text: string;
}

export interface CmsTableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

/**
 * A digital resource in the Scholarly storefront.
 * Produced by transforming a SquarespaceProduct.
 *
 * This is the transform output that the review dashboard shows alongside
 * the original Squarespace product. Marie sees her "VCE French Exam Pack"
 * on the left (Squarespace) and the Scholarly resource listing on the
 * right, with price converted to cents, category mapped, and format
 * inferred from the file extension.
 */
export interface TransformedDigitalResource {
  title: string;
  slug: string;
  description: string;
  priceIndividualCents: number;
  currency: string;
  format: string;
  tags: string[];
  coverImageUrl?: string | undefined;
  sourceProductId: string;
  /** Scholarly category (mapped from Squarespace category via ERUDITS_PRODUCT_MAPPING) */
  scholarlyCategory?: string | undefined;
  /** Curriculum tag (e.g., 'vce-french', 'delf') if the category maps to a framework */
  curriculumTag?: string | undefined;
  /** Licence type inferred from the category mapping */
  licenceType?: 'individual' | 'school' | 'both' | undefined;
}

/**
 * A user invitation for a migrated Squarespace member.
 * During import, this generates an invitation email rather than
 * creating the account directly — the member must opt in to the
 * new platform.
 */
export interface TransformedUserInvitation {
  type: 'user_invitation';
  email: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  role: string;
  subscriptionStatus?: string | undefined;
  migratedAt: string;
}


// ============================================================================
// §7 — REVIEW DASHBOARD TYPES
// ============================================================================

/**
 * The review decision made by the tutor for a single content item.
 */
export type ReviewDecision = 'approved' | 'rejected' | 'needs_edit';

/**
 * Input for reviewing a single item.
 */
export interface ReviewItemInput {
  decision: ReviewDecision;
  /** Optional notes explaining the decision (required for needs_edit) */
  notes?: string | undefined;
  /** Optional edits to the transformed data (for needs_edit items) */
  edits?: Record<string, unknown> | undefined;
}

/**
 * Input for bulk review operations.
 */
export interface BulkReviewInput {
  /** Items to approve (IDs) */
  approve?: string[] | undefined;
  /** Items to reject (IDs) */
  reject?: string[] | undefined;
  /** Items to skip (IDs) */
  skip?: string[] | undefined;
}

/**
 * Input for the final migration approval.
 * Adapted from the Érudits ApproveMigrationRequest with an explicit
 * field for items that need re-review after edits.
 */
export interface ApproveMigrationInput {
  /** Confirm that all items have been reviewed */
  confirmReviewed: boolean;
  /** Optional notes from the tutor (stored on the migration record) */
  notes?: string | undefined;
}

/**
 * The complete review dashboard payload returned by getReviewDashboard().
 *
 * This is everything the React review component needs to render the
 * side-by-side comparison view: original Squarespace content on the left,
 * transformed Scholarly preview on the right, with approve/reject/edit
 * controls for each item.
 */
export interface ReviewDashboard {
  /** The migration record with current status and progress */
  migration: PlatformMigration;
  /** Summary statistics for the review */
  stats: ReviewStats;
  /** Content items grouped by source type */
  groups: ReviewGroup[];
  /** Items flagged for attention (needs_edit, requiresReview, or failed) */
  flagged: ReviewContentItem[];
  /** URL mappings generated during transform (old URL → new URL) */
  urlMappings: Record<string, string>;
}

/**
 * Summary statistics for the review dashboard header.
 */
export interface ReviewStats {
  /** Total content items in this migration */
  total: number;
  /** Items awaiting review (mapped + needs_edit) */
  pendingReview: number;
  /** Items approved by the tutor */
  approved: number;
  /** Items rejected by the tutor */
  rejected: number;
  /** Items skipped by the tutor */
  skipped: number;
  /** Items flagged for attention */
  flagged: number;
  /** Whether all reviewable items have been reviewed */
  allReviewed: boolean;
  /** Whether the migration can proceed to import (all items reviewed, ≥1 approved) */
  canApprove: boolean;
}

/**
 * A group of content items by source type (pages, products, posts, members).
 * The review dashboard renders one section per group.
 */
export interface ReviewGroup {
  sourceType: ContentSourceType;
  label: string;
  items: ReviewContentItem[];
  stats: {
    total: number;
    approved: number;
    rejected: number;
    needsEdit: number;
    pending: number;
  };
}

/**
 * An enriched content item for the review dashboard.
 * Extends MigrationContentItem with the parsed transform output
 * so the frontend doesn't need to dig into sourceData.transformed.
 */
export interface ReviewContentItem {
  /** The underlying content item */
  item: MigrationContentItem;
  /** The parsed transform result (from sourceData.transformed) */
  transformed: TransformedCmsPage | TransformedDigitalResource | TransformedUserInvitation | null;
  /** Human-readable summary of what changed */
  changeSummary: string;
  /** Whether this item was auto-flagged for review */
  autoFlagged: boolean;
  /** The reason it was flagged (if autoFlagged) */
  flagReason?: string | undefined;
}


// ============================================================================
// §8 — TRANSFORM SERVICE INTERFACE
// ============================================================================

/**
 * The contract for the migration transform service.
 *
 * The transform service sits between extraction (Stage 2) and review
 * (Stage 4). It reads the extracted Squarespace content items, converts
 * each one to a Scholarly entity, and writes the results back to the
 * content items table. It then transitions the migration to
 * 'ready_for_review' status.
 */
export interface IMigrationTransformService {
  /**
   * Run the full transformation pipeline for a migration.
   * Reads all 'pending' content items, transforms each one, and updates
   * their status to 'mapped'. Transitions migration to 'ready_for_review'.
   *
   * @param tenantId - Multi-tenant isolation key
   * @param migrationId - The migration to transform
   * @returns The updated migration record, or an error if transform fails
   */
  runTransformation(tenantId: string, migrationId: string): Promise<Result<TransformResult>>;

  /**
   * Re-transform a single item after the tutor edits it.
   * Used when an item is in 'needs_edit' status and the tutor submits
   * changes via the review dashboard.
   *
   * @param tenantId - Multi-tenant isolation key
   * @param migrationId - The parent migration
   * @param itemId - The content item to re-transform
   * @param edits - The tutor's modifications to the source data
   * @returns The updated content item
   */
  retransformItem(
    tenantId: string,
    migrationId: string,
    itemId: string,
    edits: Record<string, unknown>,
  ): Promise<Result<MigrationContentItem>>;
}

/**
 * The result of a full transformation run.
 */
export interface TransformResult {
  migration: PlatformMigration;
  /** Number of items transformed by type */
  transformed: {
    pages: number;
    products: number;
    posts: number;
    members: number;
    images: number;
  };
  /** Number of items auto-flagged for review */
  flaggedForReview: number;
  /** URL mappings generated (source URL → target URL) */
  urlMappings: Record<string, string>;
}


// ============================================================================
// §9 — REVIEW SERVICE INTERFACE
// ============================================================================

/**
 * The contract for the migration review service.
 *
 * The review service powers the dashboard where the tutor (Marie, in the
 * Érudits case) inspects each transformed content item side by side with
 * the original and decides whether to approve, reject, or request changes.
 *
 * Think of it as the quality inspection desk at the end of the assembly
 * line: every item that passed through the transform stage stops here for
 * a human to check before it moves to the next stage (import).
 */
export interface IMigrationReviewService {
  /**
   * Get the full review dashboard payload for a migration.
   */
  getReviewDashboard(tenantId: string, migrationId: string): Promise<Result<ReviewDashboard>>;

  /**
   * Review a single content item.
   */
  reviewItem(
    tenantId: string,
    migrationId: string,
    itemId: string,
    input: ReviewItemInput,
  ): Promise<Result<MigrationContentItem>>;

  /**
   * Bulk review: approve, reject, or skip multiple items at once.
   */
  bulkReview(
    tenantId: string,
    migrationId: string,
    input: BulkReviewInput,
  ): Promise<Result<ReviewStats>>;

  /**
   * Get current review statistics for a migration.
   */
  getReviewStats(tenantId: string, migrationId: string): Promise<Result<ReviewStats>>;

  /**
   * Final approval: the tutor confirms all items are reviewed and
   * the migration should proceed to import.
   */
  approveMigration(
    tenantId: string,
    userId: string,
    migrationId: string,
    input: ApproveMigrationInput,
  ): Promise<Result<PlatformMigration>>;
}


// ============================================================================
// §10 — REPOSITORY INTERFACES
// ============================================================================

/**
 * Persistence layer for migration records.
 *
 * Follows the same pattern as OnboardingSessionRepository: services never
 * call Prisma directly, they interact through this typed interface. For
 * tests, an in-memory implementation suffices.
 */
export interface MigrationRepository {
  save(tenantId: string, migration: PlatformMigration): Promise<PlatformMigration>;
  findById(tenantId: string, id: string): Promise<PlatformMigration | null>;
  findByOwner(tenantId: string, ownerId: string): Promise<PlatformMigration[]>;
  update(tenantId: string, id: string, updates: StrictPartial<PlatformMigration>): Promise<PlatformMigration>;
}

/**
 * Persistence layer for migration content items.
 *
 * This extends the Érudits MigrationContentRepository with additional
 * query methods needed by the review dashboard: filtering by review status,
 * counting by status group, and fetching flagged items.
 */
export interface MigrationContentRepository {
  /** Save a batch of newly extracted content items. */
  saveBatch(tenantId: string, items: MigrationContentItem[]): Promise<MigrationContentItem[]>;

  /** Find a single content item by ID. */
  findById(tenantId: string, id: string): Promise<MigrationContentItem | null>;

  /** Find all items for a migration, optionally filtered by source type and/or status. */
  findByMigration(
    tenantId: string,
    migrationId: string,
    filter?: { sourceType?: ContentSourceType; status?: ContentItemStatus },
  ): Promise<MigrationContentItem[]>;

  /** Find items in reviewable statuses (mapped, needs_edit). */
  findPendingReview(tenantId: string, migrationId: string): Promise<MigrationContentItem[]>;

  /** Find items that were auto-flagged for review (requiresReview === true). */
  findFlagged(tenantId: string, migrationId: string): Promise<MigrationContentItem[]>;

  /** Update a single content item. */
  update(tenantId: string, id: string, updates: StrictPartial<MigrationContentItem>): Promise<MigrationContentItem>;

  /** Batch update content items (used by bulk review and transform). */
  updateBatch(
    tenantId: string,
    updates: Array<{ id: string; updates: StrictPartial<MigrationContentItem> }>,
  ): Promise<void>;

  /**
   * Get counts of items by status for a migration.
   * Returns a map like { mapped: 12, approved: 8, rejected: 2, ... }.
   */
  countByStatus(tenantId: string, migrationId: string): Promise<Record<ContentItemStatus, number>>;

  /**
   * Get counts of items by source type for a migration.
   * Returns a map like { page: 12, product: 40, post: 5, member: 20 }.
   */
  countBySourceType(tenantId: string, migrationId: string): Promise<Record<ContentSourceType, number>>;
}


// ============================================================================
// §11 — DEPENDENCY INTERFACES
// ============================================================================

/**
 * Event bus for publishing NATS events. Same interface as used by the
 * Érudits migration service and the onboarding service.
 */
export interface EventBus {
  publish(topic: string, payload: Record<string, unknown>): Promise<void>;
}

/**
 * Cache interface for Redis. Same as the Érudits Cache interface.
 */
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

/**
 * File storage interface for S3-compatible storage.
 */
export interface FileStorage {
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

/**
 * Platform configuration.
 */
export interface ScholarlyConfig {
  environment: 'development' | 'staging' | 'production';
  platformFeePercent: number;
}


// ============================================================================
// §12 — NATS EVENT TOPICS
// ============================================================================

/**
 * NATS event topics for the migration transform and review stages.
 *
 * These extend the existing scholarly.migration.* namespace defined in
 * the Érudits types. The naming convention follows the Scholarly pattern:
 *   scholarly.{domain}.{entity}.{action}
 *
 * Downstream subscribers (analytics, notifications, audit log) can listen
 * on 'scholarly.migration.>' to receive all migration events.
 */
export const MIGRATION_EVENTS = {
  // ── Stage 3: Transform ──
  /** Fired when transformation begins for a migration. */
  TRANSFORM_STARTED:    'scholarly.migration.transform.started',
  /** Fired for each individual item that is transformed. */
  ITEM_TRANSFORMED:     'scholarly.migration.item.transformed',
  /** Fired when all items in a migration have been transformed. */
  TRANSFORM_COMPLETED:  'scholarly.migration.transform.completed',
  /** Fired if the transformation stage fails. */
  TRANSFORM_FAILED:     'scholarly.migration.transform.failed',

  // ── Stage 4: Review ──
  /** Fired when the migration enters the review stage. */
  REVIEW_STARTED:       'scholarly.migration.review.started',
  /** Fired when a tutor reviews (approve/reject/edit) a single item. */
  ITEM_REVIEWED:        'scholarly.migration.item.reviewed',
  /** Fired when a bulk review operation completes. */
  BULK_REVIEW_DONE:     'scholarly.migration.review.bulk_completed',
  /** Fired when the tutor gives final approval for import. */
  MIGRATION_APPROVED:   'scholarly.migration.approved',

  // ── Existing events (from Érudits, for reference) ──
  MIGRATION_CREATED:         'scholarly.migration.created',
  EXTRACTION_COMPLETED:      'scholarly.migration.extraction_completed',
  IMPORT_COMPLETED:          'scholarly.migration.import_completed',
  MIGRATION_LIVE:            'scholarly.migration.live',
  MIGRATION_FAILED:          'scholarly.migration.failed',
  MIGRATION_ROLLED_BACK:     'scholarly.migration.rolled_back',
} as const;


// ============================================================================
// §13 — ÉRUDITS PRODUCT CATEGORY MAPPING
// ============================================================================

/**
 * Maps Squarespace product categories to Scholarly resource categories.
 *
 * This is imported from erudits-provisioning.ts (ERUDITS_PRODUCT_MAPPING)
 * and used during the transform stage to enrich products with curriculum
 * tags and licence types. Re-defined here as a type so the transform
 * service can accept any tenant's mapping, not just Érudits.
 */
export interface ProductCategoryMapping {
  scholarlyCategory: string;
  curriculumTag?: string | undefined;
  licenceType: 'individual' | 'school' | 'both';
}

/**
 * The Érudits-specific category mapping.
 * Matches the ERUDITS_PRODUCT_MAPPING in erudits-provisioning.ts.
 */
export const ERUDITS_CATEGORY_MAP: Record<string, ProductCategoryMapping> = {
  'VCE French': {
    scholarlyCategory: 'exam-prep',
    curriculumTag: 'vce-french',
    licenceType: 'both',
  },
  'IB French': {
    scholarlyCategory: 'exam-prep',
    curriculumTag: 'ib-french-b',
    licenceType: 'both',
  },
  'DELF': {
    scholarlyCategory: 'exam-prep',
    curriculumTag: 'delf',
    licenceType: 'individual',
  },
  'Vocabulary': {
    scholarlyCategory: 'vocabulary',
    licenceType: 'both',
  },
  'Grammar': {
    scholarlyCategory: 'grammar',
    licenceType: 'both',
  },
  'Reading Comprehension': {
    scholarlyCategory: 'reading',
    licenceType: 'both',
  },
  'Listening': {
    scholarlyCategory: 'listening',
    licenceType: 'individual',
  },
  'Writing': {
    scholarlyCategory: 'writing',
    licenceType: 'both',
  },
};


// ============================================================================
// §14 — TRANSFORM SERVICE DEPENDENCIES
// ============================================================================

/**
 * The full set of dependencies injected into the MigrationTransformService
 * constructor. Follows the same pattern as the Érudits MigrationDeps but
 * adds the product category mapping for tenant-specific transforms.
 */
export interface TransformServiceDeps {
  migrationRepo: MigrationRepository;
  contentRepo: MigrationContentRepository;
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
  /** Product category mapping for the tenant (defaults to ERUDITS_CATEGORY_MAP) */
  categoryMap?: Record<string, ProductCategoryMapping> | undefined;
}

/**
 * The full set of dependencies injected into the MigrationReviewService.
 */
export interface ReviewServiceDeps {
  migrationRepo: MigrationRepository;
  contentRepo: MigrationContentRepository;
  eventBus: EventBus;
  cache: Cache;
}


// ============================================================================
// §15 — ROUTE DTOs (Request/Response shapes for Express endpoints)
// ============================================================================

/**
 * Response wrapper for API endpoints. Consistent with the Scholarly
 * API response format used across all services.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T | undefined;
  error?: { code: string; message: string; details?: Record<string, unknown> } | undefined;
}

/**
 * Query parameters for the review dashboard endpoint.
 *   GET /api/v1/migrations/:id/review?sourceType=product&status=mapped
 */
export interface ReviewDashboardQuery {
  sourceType?: ContentSourceType | undefined;
  status?: ContentItemStatus | undefined;
}

/**
 * Request body for single item review.
 *   PATCH /api/v1/migrations/:id/items/:itemId/review
 */
export interface ReviewItemRequest {
  decision: ReviewDecision;
  notes?: string | undefined;
  edits?: Record<string, unknown> | undefined;
}

/**
 * Request body for bulk review.
 *   POST /api/v1/migrations/:id/review/bulk
 */
export interface BulkReviewRequest {
  approve?: string[] | undefined;
  reject?: string[] | undefined;
  skip?: string[] | undefined;
}

/**
 * Request body for final migration approval.
 *   POST /api/v1/migrations/:id/approve
 */
export interface ApproveMigrationRequest {
  confirmReviewed: boolean;
  notes?: string | undefined;
}
