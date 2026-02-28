/**
 * ============================================================================
 * SCHOLARLY PLATFORM — Migration Review Service (Stage 4)
 * ============================================================================
 *
 * The quality inspection desk at the end of the transform assembly line.
 * Every item that passed through Stage 3 (Transform) stops here for human
 * review before proceeding to Stage 5 (Import).
 *
 * For Érudits, this means Marie Dupont sees a dashboard with two columns:
 * her Squarespace site on the left, the Scholarly preview on the right.
 * She walks through each page, product, blog post, and member, clicking
 * "approve", "reject", or "needs changes" on each one. Items she flagged
 * for changes go back through the transform with her edits applied. Only
 * when she's reviewed everything and clicked "Approve Migration" does the
 * pipeline proceed to import.
 *
 * Think of it as the final walk-through before moving day: the removalists
 * have staged everything in the new house according to the plan, and now
 * the owner checks that the sofa is where she wanted it, the paintings
 * are on the right walls, and the kitchen is stocked correctly.
 *
 * ## Port Source
 *
 * This service adapts the Stage 4 logic from:
 *   erudits/src/services/migration.service.ts (lines 406–453)
 *
 * The Érudits version had a single approveMigration() method. This
 * Scholarly version adds granular item-level review, bulk operations,
 * a full dashboard payload, and statistics — everything the React
 * review component needs to render an interactive review experience.
 *
 * @module scholarly/migrations/migration-review.service
 * @version 1.0.0
 */

import type {
  Result,
  PlatformMigration,
  MigrationContentItem,
  ContentItemStatus,
  ContentSourceType,
  ReviewDashboard,
  ReviewStats,
  ReviewGroup,
  ReviewContentItem,
  ReviewItemInput,
  BulkReviewInput,
  ApproveMigrationInput,
  TransformedCmsPage,
  TransformedDigitalResource,
  TransformedUserInvitation,
  IMigrationReviewService,
  ReviewServiceDeps,
  ApiResponse,
  ReviewItemRequest,
  BulkReviewRequest,
  ApproveMigrationRequest,
} from './migration-transform.types';

import {
  success,
  failure,
  Errors,
  MIGRATION_EVENTS,
  REVIEWABLE_STATUSES,
  IMPORTABLE_STATUSES,
} from './migration-transform.types';


// ============================================================================
// SOURCE TYPE LABELS
// ============================================================================

/**
 * Human-readable labels for content source types.
 * Used in the review dashboard section headers.
 */
const SOURCE_TYPE_LABELS: Record<ContentSourceType, string> = {
  page: 'Pages',
  product: 'Digital Resources',
  post: 'Blog Posts',
  member: 'Member Accounts',
  image: 'Images & Media',
};

/**
 * Display order for source type groups in the dashboard.
 */
const SOURCE_TYPE_ORDER: ContentSourceType[] = [
  'page', 'product', 'post', 'member', 'image',
];


// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class MigrationReviewService implements IMigrationReviewService {
  private readonly serviceName = 'MigrationReviewService';

  constructor(private readonly deps: ReviewServiceDeps) {}

  // ═══════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get the full review dashboard payload for a migration.
   *
   * This is the single API call that powers the entire review UI. It
   * returns the migration status, summary statistics, all content items
   * grouped by type with their transform previews, and the list of
   * items that need special attention.
   *
   * The frontend renders this as a multi-section page: a header with
   * stats and a progress bar, then one accordion section per content
   * type (Pages, Products, Posts, Members), each containing a list of
   * side-by-side comparison cards.
   */
  async getReviewDashboard(
    tenantId: string,
    migrationId: string,
  ): Promise<Result<ReviewDashboard>> {
    const migration = await this.deps.migrationRepo.findById(tenantId, migrationId);
    if (!migration) {
      return failure(Errors.notFound('Migration', migrationId));
    }

    // Load all content items for this migration
    const allItems = await this.deps.contentRepo.findByMigration(tenantId, migrationId);

    // Build stats
    const stats = this.computeStats(allItems);

    // Build groups
    const groups = this.buildGroups(allItems);

    // Build flagged items list
    const flagged = allItems
      .filter(item => item.requiresReview || item.status === 'needs_edit' || item.status === 'failed')
      .map(item => this.enrichContentItem(item));

    return success({
      migration,
      stats,
      groups,
      flagged,
      urlMappings: migration.urlMappings || {},
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ITEM-LEVEL REVIEW
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Review a single content item: approve, reject, or flag for editing.
   *
   * When the tutor clicks one of the three buttons on a review card,
   * this method processes the decision and updates the item's status.
   * For 'needs_edit', the tutor's notes are stored so she can remember
   * what needs changing when she comes back to it.
   */
  async reviewItem(
    tenantId: string,
    migrationId: string,
    itemId: string,
    input: ReviewItemInput,
  ): Promise<Result<MigrationContentItem>> {
    // Validate migration exists and is in review state
    const migration = await this.deps.migrationRepo.findById(tenantId, migrationId);
    if (!migration) {
      return failure(Errors.notFound('Migration', migrationId));
    }

    if (migration.status !== 'ready_for_review') {
      return failure(Errors.validation(
        `Migration is in '${migration.status}' state. Item review requires 'ready_for_review'.`
      ));
    }

    // Validate item exists and belongs to this migration
    const item = await this.deps.contentRepo.findById(tenantId, itemId);
    if (!item) {
      return failure(Errors.notFound('MigrationContentItem', itemId));
    }

    if (item.migrationId !== migrationId) {
      return failure(Errors.validation(
        `Item ${itemId} belongs to migration ${item.migrationId}, not ${migrationId}.`
      ));
    }

    // Validate the item is in a reviewable state
    const reviewableStatuses: ContentItemStatus[] = ['mapped', 'needs_edit', 'approved', 'rejected'];
    if (!reviewableStatuses.includes(item.status)) {
      return failure(Errors.validation(
        `Item is in '${item.status}' state and cannot be reviewed. ` +
        `Reviewable statuses: ${reviewableStatuses.join(', ')}.`
      ));
    }

    // Validate notes are provided for needs_edit
    if (input.decision === 'needs_edit' && !input.notes) {
      return failure(Errors.validation(
        'Notes are required when flagging an item for editing. ' +
        'Please describe what needs to be changed.'
      ));
    }

    // Apply the decision
    const statusMap: Record<string, ContentItemStatus> = {
      approved: 'approved',
      rejected: 'rejected',
      needs_edit: 'needs_edit',
    };

    const updated = await this.deps.contentRepo.update(tenantId, itemId, {
      status: statusMap[input.decision]!,
      reviewNotes: input.notes,
    });

    // Publish review event
    await this.deps.eventBus.publish(MIGRATION_EVENTS.ITEM_REVIEWED, {
      tenantId,
      migrationId,
      itemId,
      decision: input.decision,
      sourceType: item.sourceType,
    });

    this.log('info', 'Item reviewed', {
      tenantId, migrationId, itemId,
      decision: input.decision, sourceType: item.sourceType,
    });

    // Invalidate cached stats
    await this.deps.cache.del(`migration:stats:${migrationId}`);

    return success(updated);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BULK REVIEW
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Bulk review: approve, reject, or skip multiple items at once.
   *
   * This powers the "Select All" and "Approve All Pages" shortcuts in
   * the review dashboard. For a migration with 40+ products, reviewing
   * each one individually would be tedious — bulk operations let Marie
   * approve all the straightforward ones and focus her attention on the
   * flagged items.
   */
  async bulkReview(
    tenantId: string,
    migrationId: string,
    input: BulkReviewInput,
  ): Promise<Result<ReviewStats>> {
    const migration = await this.deps.migrationRepo.findById(tenantId, migrationId);
    if (!migration) {
      return failure(Errors.notFound('Migration', migrationId));
    }

    if (migration.status !== 'ready_for_review') {
      return failure(Errors.validation(
        `Migration is in '${migration.status}' state. Bulk review requires 'ready_for_review'.`
      ));
    }

    const updates: Array<{ id: string; updates: { status: ContentItemStatus } }> = [];

    if (input.approve) {
      for (const id of input.approve) {
        updates.push({ id, updates: { status: 'approved' } });
      }
    }

    if (input.reject) {
      for (const id of input.reject) {
        updates.push({ id, updates: { status: 'rejected' } });
      }
    }

    if (input.skip) {
      for (const id of input.skip) {
        updates.push({ id, updates: { status: 'skipped' } });
      }
    }

    if (updates.length === 0) {
      return failure(Errors.validation(
        'No items specified for bulk review. ' +
        'Provide at least one of: approve, reject, skip.'
      ));
    }

    await this.deps.contentRepo.updateBatch(tenantId, updates);

    // Publish bulk review event
    await this.deps.eventBus.publish(MIGRATION_EVENTS.BULK_REVIEW_DONE, {
      tenantId,
      migrationId,
      approved: input.approve?.length || 0,
      rejected: input.reject?.length || 0,
      skipped: input.skip?.length || 0,
    });

    this.log('info', 'Bulk review completed', {
      tenantId, migrationId,
      approved: input.approve?.length || 0,
      rejected: input.reject?.length || 0,
      skipped: input.skip?.length || 0,
    });

    // Invalidate cached stats
    await this.deps.cache.del(`migration:stats:${migrationId}`);

    // Return fresh stats
    return this.getReviewStats(tenantId, migrationId);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get current review statistics for a migration.
   *
   * This is used by the dashboard header to show progress ("12 of 54 items
   * reviewed") and by the "Approve Migration" button to determine if all
   * items have been reviewed.
   */
  async getReviewStats(
    tenantId: string,
    migrationId: string,
  ): Promise<Result<ReviewStats>> {
    const migration = await this.deps.migrationRepo.findById(tenantId, migrationId);
    if (!migration) {
      return failure(Errors.notFound('Migration', migrationId));
    }

    const allItems = await this.deps.contentRepo.findByMigration(tenantId, migrationId);
    return success(this.computeStats(allItems));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FINAL APPROVAL
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Final approval: the tutor confirms all items are reviewed and the
   * migration should proceed to import.
   *
   * This is the "flip the switch" moment. Once Marie clicks "Approve
   * Migration", there's no going back to the review stage (though
   * individual items can still be modified before import begins).
   *
   * Guards:
   *   - Must be in 'ready_for_review' status
   *   - All reviewable items must have been reviewed (no 'mapped' items)
   *   - At least one item must be approved
   *   - The user must be the migration owner
   *   - The confirmReviewed flag must be true (explicit consent)
   */
  async approveMigration(
    tenantId: string,
    userId: string,
    migrationId: string,
    input: ApproveMigrationInput,
  ): Promise<Result<PlatformMigration>> {
    const migration = await this.deps.migrationRepo.findById(tenantId, migrationId);
    if (!migration) {
      return failure(Errors.notFound('Migration', migrationId));
    }

    if (migration.ownerId !== userId) {
      return failure(Errors.forbidden(
        'Only the migration owner can approve it. ' +
        'Please ask the account owner to complete this step.'
      ));
    }

    if (migration.status !== 'ready_for_review') {
      return failure(Errors.validation(
        `Migration is in '${migration.status}' state, not 'ready_for_review'. ` +
        `Final approval requires the migration to be in the review stage.`
      ));
    }

    if (!input.confirmReviewed) {
      return failure(Errors.validation(
        'You must confirm that all items have been reviewed before approving. ' +
        'Set confirmReviewed to true to proceed.'
      ));
    }

    // Check that all reviewable items have been reviewed
    const allItems = await this.deps.contentRepo.findByMigration(tenantId, migrationId);
    const stats = this.computeStats(allItems);

    if (!stats.allReviewed) {
      return failure(Errors.validation(
        `${stats.pendingReview} items still need review. ` +
        'Please approve, reject, or skip all items before approving the migration.'
      ));
    }

    if (!stats.canApprove) {
      return failure(Errors.validation(
        'At least one item must be approved before the migration can proceed. ' +
        'Currently no items are approved for import.'
      ));
    }

    // Transition to 'approved'
    await this.deps.migrationRepo.update(tenantId, migrationId, {
      status: 'approved',
      currentStep: 'Approved — ready to import',
      progressPercent: 90,
      updatedAt: new Date(),
    });

    // Publish approval event
    await this.deps.eventBus.publish(MIGRATION_EVENTS.MIGRATION_APPROVED, {
      tenantId,
      migrationId,
      approvedItems: stats.approved,
      rejectedItems: stats.rejected,
      skippedItems: stats.skipped,
      notes: input.notes,
    });

    this.log('info', 'Migration approved for import', {
      tenantId, migrationId,
      approved: stats.approved, rejected: stats.rejected, skipped: stats.skipped,
    });

    const updatedMigration = await this.deps.migrationRepo.findById(tenantId, migrationId);
    return success(updatedMigration!);
  }


  // ═══════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Compute review statistics from the full list of content items.
   */
  private computeStats(items: MigrationContentItem[]): ReviewStats {
    const total = items.length;
    const pendingReview = items.filter(i =>
      REVIEWABLE_STATUSES.includes(i.status)
    ).length;
    const approved = items.filter(i => i.status === 'approved').length;
    const rejected = items.filter(i => i.status === 'rejected').length;
    const skipped = items.filter(i => i.status === 'skipped').length;
    const flagged = items.filter(i =>
      i.requiresReview || i.status === 'needs_edit' || i.status === 'failed'
    ).length;

    const allReviewed = pendingReview === 0;
    const canApprove = allReviewed && approved > 0;

    return {
      total,
      pendingReview,
      approved,
      rejected,
      skipped,
      flagged,
      allReviewed,
      canApprove,
    };
  }

  /**
   * Build review groups from content items, sorted by source type display order.
   */
  private buildGroups(items: MigrationContentItem[]): ReviewGroup[] {
    const groups: ReviewGroup[] = [];

    for (const sourceType of SOURCE_TYPE_ORDER) {
      const typeItems = items.filter(i => i.sourceType === sourceType);
      if (typeItems.length === 0) continue;

      groups.push({
        sourceType,
        label: SOURCE_TYPE_LABELS[sourceType],
        items: typeItems.map(item => this.enrichContentItem(item)),
        stats: {
          total: typeItems.length,
          approved: typeItems.filter(i => i.status === 'approved').length,
          rejected: typeItems.filter(i => i.status === 'rejected').length,
          needsEdit: typeItems.filter(i => i.status === 'needs_edit').length,
          pending: typeItems.filter(i => REVIEWABLE_STATUSES.includes(i.status)).length,
        },
      });
    }

    return groups;
  }

  /**
   * Enrich a content item with its parsed transform result and a
   * human-readable change summary.
   *
   * This extracts the 'transformed' key from sourceData and presents
   * it as a typed object so the frontend can render a preview without
   * parsing JSON.
   */
  private enrichContentItem(item: MigrationContentItem): ReviewContentItem {
    const sourceData = item.sourceData || {};
    const transformed = (sourceData as Record<string, unknown>).transformed as
      | TransformedCmsPage
      | TransformedDigitalResource
      | TransformedUserInvitation
      | null
      | undefined;

    return {
      item,
      transformed: transformed || null,
      changeSummary: this.buildChangeSummary(item),
      autoFlagged: item.requiresReview,
      flagReason: item.requiresReview ? item.reviewNotes : undefined,
    };
  }

  /**
   * Build a human-readable summary of what changed during transformation.
   *
   * These summaries appear in the review card subtitle so the tutor can
   * quickly scan the list without opening each item: "Page → CMS Page at
   * /about-us", "Product → Digital Resource at /resources/vce-exam-pack",
   * "Member → User invitation for student@example.com".
   */
  private buildChangeSummary(item: MigrationContentItem): string {
    const source = item.sourceTitle || item.sourceId || 'Unknown';

    switch (item.sourceType) {
      case 'page':
        return `Page "${source}" → CMS page at ${item.targetUrl || '/unknown'}`;
      case 'product':
        return `Product "${source}" → Digital resource at ${item.targetUrl || '/unknown'}`;
      case 'post':
        return `Blog post "${source}" → CMS blog entry at ${item.targetUrl || '/unknown'}`;
      case 'member': {
        const email = item.sourceId || 'unknown';
        return `Member ${email} → User invitation`;
      }
      case 'image':
        return `Image → Media asset`;
      default:
        return `${item.sourceType} "${source}" → ${item.targetType || 'unknown'}`;
    }
  }

  /**
   * Structured log output.
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


// ============================================================================
// EXPRESS ROUTE HANDLERS
// ============================================================================

/**
 * Express route factory for the migration review API.
 *
 * These routes provide the backend API that the React review dashboard
 * calls. They follow the standard Scholarly API response format and
 * extract tenantId from the authenticated request context.
 *
 * In production, these would be registered in the Express router via:
 *   const reviewRoutes = createMigrationReviewRoutes(reviewService, transformService);
 *   app.use('/api/v1/migrations', reviewRoutes);
 *
 * For Sprint 3, we export the handler functions so they can be wired
 * into the existing Express app without introducing a router dependency.
 *
 * ## Endpoint Summary
 *
 *   GET    /api/v1/migrations/:id/review           → getReviewDashboard
 *   PATCH  /api/v1/migrations/:id/items/:itemId     → reviewItem
 *   POST   /api/v1/migrations/:id/review/bulk       → bulkReview
 *   GET    /api/v1/migrations/:id/review/stats      → getReviewStats
 *   POST   /api/v1/migrations/:id/approve           → approveMigration
 *   POST   /api/v1/migrations/:id/items/:itemId/retransform → retransformItem
 */

/** Minimal Express-compatible request type (avoids importing express). */
interface RouteRequest {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: Record<string, unknown>;
  /** Authenticated user context — set by auth middleware. */
  user?: { id: string; tenantId: string } | undefined;
}

/** Minimal Express-compatible response type. */
interface RouteResponse {
  status(code: number): RouteResponse;
  json(body: unknown): void;
}

/**
 * Extract the authenticated user's tenantId and userId from the request.
 * Returns null if the user is not authenticated.
 */
function extractAuth(req: RouteRequest): { tenantId: string; userId: string } | null {
  if (!req.user?.tenantId || !req.user?.id) return null;
  return { tenantId: req.user.tenantId, userId: req.user.id };
}

/**
 * Standard error response helper.
 */
function errorResponse(res: RouteResponse, error: { code: string; message: string; httpStatus: number }): void {
  res.status(error.httpStatus).json({
    success: false,
    error: { code: error.code, message: error.message },
  } satisfies ApiResponse<never>);
}

/**
 * Standard success response helper.
 */
function successResponse<T>(res: RouteResponse, data: T, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  } satisfies ApiResponse<T>);
}

// Import the transform service type for the retransform endpoint
import type { IMigrationTransformService } from './migration-transform.types';


/**
 * Create route handler functions for the migration review API.
 *
 * Returns an object of handler functions that can be wired into Express:
 *
 *   const handlers = createReviewRouteHandlers(reviewService, transformService);
 *   router.get('/:id/review', handlers.getDashboard);
 *   router.patch('/:id/items/:itemId', handlers.reviewItem);
 *   router.post('/:id/review/bulk', handlers.bulkReview);
 *   router.get('/:id/review/stats', handlers.getStats);
 *   router.post('/:id/approve', handlers.approve);
 *   router.post('/:id/items/:itemId/retransform', handlers.retransform);
 */
export function createReviewRouteHandlers(
  reviewService: IMigrationReviewService,
  transformService: IMigrationTransformService,
) {
  return {
    /**
     * GET /api/v1/migrations/:id/review
     *
     * Returns the full review dashboard payload for the given migration.
     */
    getDashboard: async (req: RouteRequest, res: RouteResponse): Promise<void> => {
      const auth = extractAuth(req);
      if (!auth) {
        errorResponse(res, { code: 'UNAUTHORISED', message: 'Authentication required', httpStatus: 401 });
        return;
      }

      const migrationId = req.params['id']!;
      const result = await reviewService.getReviewDashboard(auth.tenantId, migrationId);

      if (!result.success) {
        errorResponse(res, result.error);
        return;
      }

      successResponse(res, result.data);
    },

    /**
     * PATCH /api/v1/migrations/:id/items/:itemId
     *
     * Review a single content item (approve, reject, or flag for editing).
     */
    reviewItem: async (req: RouteRequest, res: RouteResponse): Promise<void> => {
      const auth = extractAuth(req);
      if (!auth) {
        errorResponse(res, { code: 'UNAUTHORISED', message: 'Authentication required', httpStatus: 401 });
        return;
      }

      const migrationId = req.params['id']!;
      const itemId = req.params['itemId']!;
      const body = req.body as unknown as ReviewItemRequest;

      if (!body.decision || !['approved', 'rejected', 'needs_edit'].includes(body.decision)) {
        errorResponse(res, {
          code: 'VALIDATION_ERROR',
          message: 'Invalid decision. Must be one of: approved, rejected, needs_edit.',
          httpStatus: 400,
        });
        return;
      }

      const result = await reviewService.reviewItem(auth.tenantId, migrationId, itemId, {
        decision: body.decision,
        notes: body.notes,
        edits: body.edits,
      });

      if (!result.success) {
        errorResponse(res, result.error);
        return;
      }

      successResponse(res, result.data);
    },

    /**
     * POST /api/v1/migrations/:id/review/bulk
     *
     * Bulk review: approve, reject, or skip multiple items.
     */
    bulkReview: async (req: RouteRequest, res: RouteResponse): Promise<void> => {
      const auth = extractAuth(req);
      if (!auth) {
        errorResponse(res, { code: 'UNAUTHORISED', message: 'Authentication required', httpStatus: 401 });
        return;
      }

      const migrationId = req.params['id']!;
      const body = req.body as BulkReviewRequest;

      const result = await reviewService.bulkReview(auth.tenantId, migrationId, {
        approve: body.approve,
        reject: body.reject,
        skip: body.skip,
      });

      if (!result.success) {
        errorResponse(res, result.error);
        return;
      }

      successResponse(res, result.data);
    },

    /**
     * GET /api/v1/migrations/:id/review/stats
     *
     * Get current review statistics.
     */
    getStats: async (req: RouteRequest, res: RouteResponse): Promise<void> => {
      const auth = extractAuth(req);
      if (!auth) {
        errorResponse(res, { code: 'UNAUTHORISED', message: 'Authentication required', httpStatus: 401 });
        return;
      }

      const migrationId = req.params['id']!;
      const result = await reviewService.getReviewStats(auth.tenantId, migrationId);

      if (!result.success) {
        errorResponse(res, result.error);
        return;
      }

      successResponse(res, result.data);
    },

    /**
     * POST /api/v1/migrations/:id/approve
     *
     * Final migration approval — proceed to import.
     */
    approve: async (req: RouteRequest, res: RouteResponse): Promise<void> => {
      const auth = extractAuth(req);
      if (!auth) {
        errorResponse(res, { code: 'UNAUTHORISED', message: 'Authentication required', httpStatus: 401 });
        return;
      }

      const migrationId = req.params['id']!;
      const body = req.body as unknown as ApproveMigrationRequest;

      const result = await reviewService.approveMigration(
        auth.tenantId,
        auth.userId,
        migrationId,
        {
          confirmReviewed: body.confirmReviewed === true,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
        },
      );

      if (!result.success) {
        errorResponse(res, result.error);
        return;
      }

      successResponse(res, result.data);
    },

    /**
     * POST /api/v1/migrations/:id/items/:itemId/retransform
     *
     * Re-transform an item after the tutor edits its source data.
     * This is called when the tutor edits a 'needs_edit' item and
     * submits the changes for re-processing.
     */
    retransform: async (req: RouteRequest, res: RouteResponse): Promise<void> => {
      const auth = extractAuth(req);
      if (!auth) {
        errorResponse(res, { code: 'UNAUTHORISED', message: 'Authentication required', httpStatus: 401 });
        return;
      }

      const migrationId = req.params['id']!;
      const itemId = req.params['itemId']!;
      const edits = req.body as Record<string, unknown>;

      if (!edits || Object.keys(edits).length === 0) {
        errorResponse(res, {
          code: 'VALIDATION_ERROR',
          message: 'Request body must contain the edited source data fields.',
          httpStatus: 400,
        });
        return;
      }

      const result = await transformService.retransformItem(
        auth.tenantId, migrationId, itemId, edits,
      );

      if (!result.success) {
        errorResponse(res, result.error);
        return;
      }

      successResponse(res, result.data);
    },
  };
}
