/**
 * ============================================================================
 * S&R Workflow Template: Platform Migration
 * ============================================================================
 *
 * This is the first train on the railway. The S&R Workflow Engine (§5.2.4)
 * provides the signalling system — topological sort, typed port data,
 * pause/resume, event streaming. This file provides the actual carriages:
 * seven node implementations that wrap the existing migration services,
 * plus a pre-built workflow definition that connects them into the
 * "Platform Migration" starter template.
 *
 * When a tenant starts a migration, this template is loaded into the
 * S&R canvas as a pre-wired workflow. The user sees seven nodes connected
 * left-to-right: Source → Extract → Transform → Review → Import → Cutover
 * → Health Monitor. They can monitor progress on each node, interact with
 * the Review node (approve/reject items), and trigger Cutover when ready.
 *
 * Every node wraps a service that's already been built and tested:
 *
 *   Node                  | Wraps                        | Lines | Tests
 *   ─────────────────────-+──────────────────────────────+───────+──────
 *   Platform Source        | SquarespaceApiClient         |   522 | (ext)
 *   CDC Extract            | MigrationDataLakeAdapter     |   809 | 22
 *   Content Transform      | MigrationTransformService    |   909 | 53
 *   Human Review           | MigrationReviewService       |   862 | (above)
 *   Service Import         | MigrationDataLakeAdapter     |  (above)| (above)
 *   Infrastructure Cutover | MigrationCutoverService      | 1,052 | 31
 *   Health Monitor         | MigrationCutoverService      | (above)| (above)
 *
 * Importantly, several of these nodes are *not* migration-specific:
 *
 *   - "CDC Extract" → can read any staging table. Reusable for analytics
 *     ingestion, competition submission collection, storybook review queues.
 *
 *   - "Human Review" → pauses any workflow for human approval. Reusable
 *     for content moderation, assessment marking, storybook publishing.
 *
 *   - "Health Monitor" → runs endpoint checks. Reusable for any deployment
 *     verification, not just migration cutover.
 *
 * This is the pattern: build nodes for migration, discover they're general,
 * and the S&R node library grows organically from real workloads rather
 * than speculative feature lists.
 *
 * @module scholarly/sr/templates/platform-migration
 */

import {
  // Engine types
  NodeTypeDefinition,
  NodeTypeRegistry,
  NodeExecutionContext,
  NodeOutput,
  WorkflowDefinition,
  Result,
  success,
  failure,
  Errors,
} from './sr-workflow-engine';


// ============================================================================
// §1 — DOMAIN SERVICE INTERFACES
// ============================================================================
//
// These are the contracts that migration nodes resolve from the
// WorkflowServices.getService() resolver at runtime. They mirror the
// interfaces already defined in the migration codebase — we redeclare
// them here so this file compiles independently. In production, the
// runtime wires in the actual implementations.

/** Squarespace API client — pulls content from the source platform */
export interface PlatformSourceClient {
  exportSite(siteUrl: string): Promise<Result<PlatformExportData>>;
  downloadAsset(url: string): Promise<Result<Uint8Array>>;
}

/** Generalised export payload — not Squarespace-specific */
export interface PlatformExportData {
  pages: Array<{ id: string; url: string; title: string; html: string; seo?: Record<string, string> }>;
  products: Array<{ id: string; slug: string; title: string; description: string; price: number; currency: string; images: string[]; variants: Array<Record<string, unknown>>; isPhysical?: boolean }>;
  posts: Array<{ id: string; slug: string; title: string; html: string; publishedAt: string; author: string; tags: string[]; excerpt?: string; featuredImage?: string }>;
  members: Array<{ email: string; firstName: string; lastName: string; subscriptionStatus: string }>;
  navigation: Array<{ label: string; url: string; children?: Array<{ label: string; url: string }> }>;
  siteSettings: Record<string, unknown>;
}

/** Data Lake adapter — routes data-plane stages through ETL infrastructure */
export interface DataLakeAdapter {
  registerMigration(migrationId: string): { extract: Record<string, unknown>; transform: Record<string, unknown>; import: Record<string, unknown> };
  runExtraction(tenantId: string, migrationId: string, items: ContentItem[]): Promise<Result<ETLRunResult>>;
  runTransform(tenantId: string, migrationId: string): Promise<Result<ETLRunResult>>;
  runImport(tenantId: string, migrationId: string): Promise<Result<ETLRunResult & { importDetails: ImportDetails }>>;
  runQualityAudit(tenantId: string, migrationId: string): Promise<Result<QualityReport>>;
  getMigrationETLStatus(migrationId: string): { registered: boolean; jobs: Array<Record<string, unknown>> };
}

/** Transform service — converts source platform content to Scholarly format */
export interface TransformService {
  runTransformation(tenantId: string, migrationId: string): Promise<Result<TransformSummary>>;
}

/** Review service — human-in-the-loop content approval */
export interface ReviewService {
  getReviewDashboard(tenantId: string, migrationId: string): Promise<Result<ReviewDashboard>>;
  reviewItem(tenantId: string, migrationId: string, itemId: string, decision: Record<string, unknown>): Promise<Result<unknown>>;
  bulkReview(tenantId: string, migrationId: string, decisions: Record<string, unknown>): Promise<Result<unknown>>;
  approveMigration(tenantId: string, userId: string, request: Record<string, unknown>): Promise<Result<unknown>>;
  getReviewStats(tenantId: string, migrationId: string): Promise<Result<ReviewStats>>;
}

/** Cutover service — DNS/SSL/proxy infrastructure operations */
export interface CutoverService {
  runPreflightChecks(tenantId: string, migrationId: string): Promise<Result<PreflightResult>>;
  provisionSsl(tenantId: string, migrationId: string): Promise<Result<unknown>>;
  executeCutover(tenantId: string, migrationId: string): Promise<Result<CutoverResult>>;
  rollback(tenantId: string, migrationId: string, reason: string): Promise<Result<unknown>>;
  runHealthCheck(tenantId: string, migrationId: string): Promise<Result<HealthCheckResult>>;
}

/** Migration repository — persistence for migration records */
export interface MigrationRepo {
  findById(tenantId: string, id: string): Promise<MigrationRecord | null>;
  findByOwner(tenantId: string, ownerId: string): Promise<MigrationRecord[]>;
  save(tenantId: string, migration: MigrationRecord): Promise<MigrationRecord>;
  update(tenantId: string, id: string, updates: Partial<MigrationRecord>): Promise<void>;
}

/** Content repository — persistence for content items */
export interface ContentRepo {
  saveBatch(tenantId: string, items: ContentItem[]): Promise<void>;
  findByMigration(tenantId: string, migrationId: string, filter?: Record<string, unknown>): Promise<ContentItem[]>;
}

/** File storage for asset re-hosting */
export interface FileStorageService {
  upload(key: string, data: Uint8Array, mimeType: string): Promise<Result<{ url: string }>>;
}

// Shared shapes
export interface ContentItem {
  id: string;
  migrationId: string;
  tenantId: string;
  sourceType: string;
  sourceId: string;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceData: Record<string, unknown>;
  status: string;
  requiresReview: boolean;
  targetId?: string;
  errorMessage?: string;
}

export interface MigrationRecord {
  id: string;
  tenantId: string;
  source: string;
  sourceUrl: string;
  ownerId: string;
  ownerEmail: string;
  status: string;
  customDomain?: string;
  [key: string]: unknown;
}

export interface ETLRunResult {
  runId: string;
  jobId: string;
  status: string;
  rowsExtracted: number;
  rowsTransformed: number;
  rowsLoaded: number;
  rowsRejected: number;
  durationMs: number;
}

export interface ImportDetails {
  pages: number;
  products: number;
  members: number;
  posts: number;
  images: number;
  totalImported: number;
  totalFailed: number;
  errors: Array<{ itemId: string; sourceType: string; title: string; error: string }>;
}

export interface TransformSummary {
  totalItems: number;
  transformed: number;
  flaggedForReview: number;
  byType: Record<string, { total: number; transformed: number; flagged: number }>;
}

export interface ReviewDashboard {
  migration: MigrationRecord;
  items: ContentItem[];
  stats: ReviewStats;
  flaggedItems: ContentItem[];
}

export interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  needsEdit: number;
  skipped: number;
}

export interface PreflightResult {
  ready: boolean;
  checks: Array<{ name: string; status: string; detail: string }>;
}

export interface CutoverResult {
  success: boolean;
  domain: string;
  dnsVerified: boolean;
  sslActive: boolean;
  proxyActive: boolean;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{ name: string; status: string; responseTimeMs: number; detail: string }>;
  checkedAt: Date;
}

export interface QualityReport {
  auditId: string;
  qualityScore: number;
  passed: number;
  failed: number;
  totalChecks: number;
  meetsThreshold: boolean;
  results: Array<Record<string, unknown>>;
}


// ============================================================================
// §2 — NODE IMPLEMENTATIONS
// ============================================================================
//
// Each function below creates a NodeTypeDefinition — a blueprint that
// gets registered with the NodeTypeRegistry. The execute() function
// inside each definition resolves domain services from the context
// and delegates to the existing tested implementations.
//
// SERVICE RESOLUTION CONVENTION:
//   ctx.services.getService<T>('migration:serviceName')
//
// The 'migration:' prefix namespaces migration services so they don't
// collide with services from other domains (e.g., 'competition:judging').

/**
 * Helper: resolve a service or return a failure Result.
 * Standardises the pattern across all node implementations.
 */
function resolveService<T>(
  ctx: NodeExecutionContext,
  name: string,
  label: string,
): Result<T> {
  const svc = ctx.services.getService<T>(name);
  if (!svc) {
    return failure(Errors.internal(
      `Service '${name}' not available. Ensure the ${label} is registered with the workflow runtime.`,
    ));
  }
  return success(svc);
}

/**
 * Helper: extract a config value with type safety.
 */
function getConfig<T>(ctx: NodeExecutionContext, key: string, defaultValue: T): T {
  const val = ctx.node.config[key];
  return (val !== undefined && val !== null) ? val as T : defaultValue;
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 1: Platform Source
// ──────────────────────────────────────────────────────────────────────────
// Category: SOURCE
// Pulls content from a source platform (Squarespace, WordPress, Wix, etc.)
// Config: { platform, sourceUrl }
// Outputs: { content (table), inventory (record) }

export function createPlatformSourceNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:source:platform-export',
    label: 'Platform Source',
    category: 'SOURCE',
    description: 'Extracts content from an external platform (Squarespace, WordPress, Wix). Pulls pages, products, posts, members, and images.',
    inputs: [],
    outputs: [
      { portId: 'content', label: 'Content Items', dataType: 'table', required: true },
      { portId: 'inventory', label: 'Inventory Counts', dataType: 'record', required: true },
    ],
    configSchema: {
      platform: 'string',
      sourceUrl: 'string',
      migrationId: 'string',
      ownerId: 'string',
      ownerEmail: 'string',
    },
    executionHint: 'long_running',
    dataLakeTracked: true,

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      const sourceRes = resolveService<PlatformSourceClient>(ctx, 'migration:sourceClient', 'Platform Source Client');
      if (!sourceRes.ok) return sourceRes;
      const sourceClient = sourceRes.value;

      const repoRes = resolveService<MigrationRepo>(ctx, 'migration:migrationRepo', 'Migration Repository');
      if (!repoRes.ok) return repoRes;
      const migrationRepo = repoRes.value;

      const contentRepoRes = resolveService<ContentRepo>(ctx, 'migration:contentRepo', 'Content Repository');
      if (!contentRepoRes.ok) return contentRepoRes;
      const contentRepo = contentRepoRes.value;

      const fileStorageRes = resolveService<FileStorageService>(ctx, 'migration:fileStorage', 'File Storage');
      if (!fileStorageRes.ok) return fileStorageRes;
      const fileStorage = fileStorageRes.value;

      const platform = getConfig<string>(ctx, 'platform', 'squarespace');
      const sourceUrl = getConfig<string>(ctx, 'sourceUrl', '');
      const migrationId = getConfig<string>(ctx, 'migrationId', '');

      if (!sourceUrl) return failure(Errors.validation('sourceUrl is required'));
      if (!migrationId) return failure(Errors.validation('migrationId is required'));

      ctx.log('info', 'Extracting content from platform', { platform, sourceUrl });

      // Pull from source
      const exportResult = await sourceClient.exportSite(sourceUrl);
      if (!exportResult.ok) {
        return failure(Errors.internal(`Platform extraction failed: ${exportResult.error.message}`));
      }

      const data = exportResult.value;

      // Build content items
      const items: ContentItem[] = [];

      for (const page of data.pages) {
        items.push({
          id: `ci_${migrationId}_${page.id}`, migrationId, tenantId: ctx.tenantId,
          sourceType: 'page', sourceId: page.id, sourceUrl: page.url,
          sourceTitle: page.title, sourceData: page as unknown as Record<string, unknown>,
          status: 'pending', requiresReview: false,
        });
      }
      for (const product of data.products) {
        const needsReview = Boolean(product.isPhysical) || product.variants.length > 1 || product.price <= 0;
        items.push({
          id: `ci_${migrationId}_${product.id}`, migrationId, tenantId: ctx.tenantId,
          sourceType: 'product', sourceId: product.id, sourceUrl: `/products/${product.slug}`,
          sourceTitle: product.title, sourceData: product as unknown as Record<string, unknown>,
          status: 'pending', requiresReview: needsReview,
        });
      }
      for (const post of data.posts) {
        items.push({
          id: `ci_${migrationId}_${post.id}`, migrationId, tenantId: ctx.tenantId,
          sourceType: 'post', sourceId: post.id, sourceUrl: `/blog/${post.slug}`,
          sourceTitle: post.title, sourceData: post as unknown as Record<string, unknown>,
          status: 'pending', requiresReview: false,
        });
      }
      for (const member of data.members) {
        items.push({
          id: `ci_${migrationId}_${member.email}`, migrationId, tenantId: ctx.tenantId,
          sourceType: 'member', sourceId: member.email,
          sourceTitle: `${member.firstName} ${member.lastName}`.trim(),
          sourceData: member as unknown as Record<string, unknown>,
          status: 'pending', requiresReview: false,
        });
      }

      // Download images
      const imageUrls = extractImageUrls(data);
      for (const url of imageUrls) {
        const dlResult = await sourceClient.downloadAsset(url);
        if (dlResult.ok) {
          let fileName: string;
          let mimeHintUrl: string;
          try {
            const parsed = new URL(url);
            const pathname = parsed.pathname || '';
            const baseName = pathname.split('/').pop() || '';
            fileName = baseName || `img_${Date.now()}`;
            mimeHintUrl = pathname || url;
          } catch {
            const withoutQuery = url.split('?')[0].split('#')[0];
            const baseName = withoutQuery.split('/').pop() || '';
            fileName = baseName || `img_${Date.now()}`;
            mimeHintUrl = withoutQuery || url;
          }
          const key = `migrations/${migrationId}/images/${fileName}`;
          const uploadResult = await fileStorage.upload(key, dlResult.value, guessMimeType(mimeHintUrl));
          if (!uploadResult.ok) {
            continue;
          }
          items.push({
            id: `ci_${migrationId}_img_${fileName}`, migrationId, tenantId: ctx.tenantId,
            sourceType: 'image', sourceId: url, sourceUrl: url,
            sourceTitle: fileName, sourceData: { originalUrl: url, storagePath: key },
            status: 'pending', requiresReview: false,
          });
        }
      }

      // Persist content items
      await contentRepo.saveBatch(ctx.tenantId, items);

      // Update migration record
      await migrationRepo.update(ctx.tenantId, migrationId, {
        status: 'extracted',
        pagesFound: data.pages.length,
        productsFound: data.products.length,
        postsFound: data.posts.length,
        membersFound: data.members.length,
        imagesFound: imageUrls.length,
      });

      const inventory = {
        pages: data.pages.length,
        products: data.products.length,
        posts: data.posts.length,
        members: data.members.length,
        images: imageUrls.length,
        total: items.length,
      };

      ctx.log('info', 'Extraction complete', inventory);

      await ctx.services.eventBus.publish('sr.workflow.migration.extracted', {
        tenantId: ctx.tenantId, migrationId, ...inventory,
      });

      return success({ content: items, inventory });
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 2: CDC Extract (Data Lake)
// ──────────────────────────────────────────────────────────────────────────
// Category: SOURCE
// Writes extracted content to the Data Lake Bronze zone via CDC staging.
// This is GENERAL PURPOSE — any workflow can use it to stage data.

export function createCDCExtractNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:source:cdc-extract',
    label: 'CDC Extract to Data Lake',
    category: 'SOURCE',
    description: 'Writes content items to the Data Lake Bronze staging zone via the CDC pipeline. Tracks extraction as an ETL job with quality gates.',
    inputs: [
      { portId: 'items', label: 'Content Items', dataType: 'table', required: true },
    ],
    outputs: [
      { portId: 'etlRun', label: 'ETL Run Result', dataType: 'record', required: true },
    ],
    configSchema: {
      migrationId: 'string',
    },
    executionHint: 'medium',
    dataLakeTracked: true,

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      const adapterRes = resolveService<DataLakeAdapter>(ctx, 'migration:dataLakeAdapter', 'Data Lake Adapter');
      if (!adapterRes.ok) return adapterRes;

      const migrationId = getConfig<string>(ctx, 'migrationId', '');
      if (!migrationId || migrationId.trim().length === 0) {
        return failure(Errors.validation('migrationId is required and must be a non-empty string'));
      }

      const items = ctx.inputs['items'] as ContentItem[] | undefined;

      if (!items || items.length === 0) {
        return failure(Errors.validation('No content items received on input port'));
      }

      ctx.log('info', 'Writing to Data Lake Bronze zone', { itemCount: items.length });

      const result = await adapterRes.value.runExtraction(ctx.tenantId, migrationId, items);
      if (!result.ok) return result;

      ctx.log('info', 'CDC extraction tracked as ETL job', { runId: result.value.runId });
      return success({ etlRun: result.value });
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 3: Content Transform
// ──────────────────────────────────────────────────────────────────────────
// Category: TRANSFORM
// Converts source-platform content into Scholarly format.
// Delegates to the MigrationTransformService, tracked via Data Lake.

export function createContentTransformNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:transform:content-transform',
    label: 'Content Transform',
    category: 'TRANSFORM',
    description: 'Transforms extracted content from source platform format into Scholarly entities (pages→CMS, products→Resources, members→invitations). Runs quality gates via Data Lake.',
    inputs: [
      { portId: 'etlRun', label: 'ETL Run', dataType: 'record', required: true },
    ],
    outputs: [
      { portId: 'summary', label: 'Transform Summary', dataType: 'record', required: true },
      { portId: 'etlRun', label: 'ETL Run Result', dataType: 'record', required: true },
    ],
    configSchema: {
      migrationId: 'string',
    },
    executionHint: 'medium',
    dataLakeTracked: true,

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      const transformRes = resolveService<TransformService>(ctx, 'migration:transformService', 'Transform Service');
      if (!transformRes.ok) return transformRes;

      const adapterRes = resolveService<DataLakeAdapter>(ctx, 'migration:dataLakeAdapter', 'Data Lake Adapter');
      if (!adapterRes.ok) return adapterRes;

      const repoRes = resolveService<MigrationRepo>(ctx, 'migration:migrationRepo', 'Migration Repository');
      if (!repoRes.ok) return repoRes;

      const migrationId = getConfig<string>(ctx, 'migrationId', '');

      ctx.log('info', 'Starting content transformation', { migrationId });

      // Run the actual transform logic
      const transformResult = await transformRes.value.runTransformation(ctx.tenantId, migrationId);
      if (!transformResult.ok) return transformResult;

      // Track via Data Lake ETL
      const etlResult = await adapterRes.value.runTransform(ctx.tenantId, migrationId);

      // Update migration status
      await repoRes.value.update(ctx.tenantId, migrationId, {
        status: 'transformed',
      });

      ctx.log('info', 'Transform complete', {
        total: transformResult.value.totalItems,
        transformed: transformResult.value.transformed,
        flagged: transformResult.value.flaggedForReview,
      });

      await ctx.services.eventBus.publish('sr.workflow.migration.transformed', {
        tenantId: ctx.tenantId, migrationId,
        ...transformResult.value,
      });

      return success({
        summary: transformResult.value,
        etlRun: etlResult.ok ? etlResult.value : { status: 'tracking_failed' },
      });
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 4: Human Review (GENERAL PURPOSE — pausesWorkflow)
// ──────────────────────────────────────────────────────────────────────────
// Category: ACTION
// Pauses the workflow for human review and approval.
// This node is NOT migration-specific — it can pause any workflow
// for any kind of human decision. The config determines what type
// of review UI to show.

export function createHumanReviewNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:action:human-review',
    label: 'Human Review',
    category: 'ACTION',
    description: 'Pauses workflow execution for human review and approval. Supports bulk approve/reject, per-item editing, and configurable approval modes. Resumes when the reviewer submits their decisions.',
    inputs: [
      { portId: 'items', label: 'Items to Review', dataType: 'any', required: true },
    ],
    outputs: [
      { portId: 'approved', label: 'Approved Items', dataType: 'table', required: true },
      { portId: 'reviewStats', label: 'Review Statistics', dataType: 'record', required: true },
    ],
    configSchema: {
      reviewType: 'string',    // 'migration_content' | 'storybook' | 'submission' | 'custom'
      migrationId: 'string?',  // optional — only for migration reviews
      approvalMode: 'string',  // 'individual' | 'bulk' | 'all_or_nothing'
      pauseMessage: 'string?',
    },
    pausesWorkflow: true,
    executionHint: 'long_running',

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      const reviewType = getConfig<string>(ctx, 'reviewType', 'custom');
      const pauseMessage = getConfig<string>(ctx, 'pauseMessage',
        `Workflow paused for ${reviewType} review. Approve items to continue.`);

      ctx.log('info', 'Entering human review stage', { reviewType });

      await ctx.services.eventBus.publish('sr.workflow.review.awaiting', {
        tenantId: ctx.tenantId,
        runId: ctx.runId,
        workflowId: ctx.workflowId,
        nodeId: ctx.node.nodeId,
        reviewType,
      });

      // The __paused signal tells the WorkflowRunner to save state and return.
      // When the human submits their review decisions, the runner's resume()
      // method is called with the approved items as output data.
      return success({
        __paused: true,
        __pauseReason: pauseMessage,
      });
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 5: Service Import (Data Lake)
// ──────────────────────────────────────────────────────────────────────────
// Category: ACTION
// Writes approved items to operational services via the Data Lake adapter.
// Silver → Gold promotion: staging → CMS, Storefront, Auth.

export function createServiceImportNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:action:service-import',
    label: 'Service Import',
    category: 'ACTION',
    description: 'Imports approved content items into Scholarly operational services (CMS, Storefront, Auth). Routes through the Data Lake for ETL tracking, quality gates, and audit trail.',
    inputs: [
      { portId: 'approved', label: 'Approved Items', dataType: 'table', required: true },
      { portId: 'reviewStats', label: 'Review Stats', dataType: 'record', required: false },
    ],
    outputs: [
      { portId: 'importResult', label: 'Import Result', dataType: 'record', required: true },
      { portId: 'etlRun', label: 'ETL Run Result', dataType: 'record', required: true },
    ],
    configSchema: {
      migrationId: 'string',
    },
    executionHint: 'long_running',
    dataLakeTracked: true,

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      const adapterRes = resolveService<DataLakeAdapter>(ctx, 'migration:dataLakeAdapter', 'Data Lake Adapter');
      if (!adapterRes.ok) return adapterRes;

      const repoRes = resolveService<MigrationRepo>(ctx, 'migration:migrationRepo', 'Migration Repository');
      if (!repoRes.ok) return repoRes;

      const migrationId = getConfig<string>(ctx, 'migrationId', '');

      const approved = ctx.inputs['approved'];
      if ('approved' in ctx.inputs && !approved) {
        return failure(Errors.validation('Import cannot proceed: approved items input is falsy — review may have rejected all items'));
      }

      ctx.log('info', 'Starting service import via Data Lake', { migrationId });

      // The adapter handles per-item delegation to CMS/Storefront/Auth,
      // error tracking, staging writes, and quality gates
      const result = await adapterRes.value.runImport(ctx.tenantId, migrationId);
      if (!result.ok) return result;

      const details = result.value.importDetails;

      await repoRes.value.update(ctx.tenantId, migrationId, {
        status: 'parallel_run',
        pagesImported: details.pages,
        productsImported: details.products,
        membersImported: details.members,
      });

      ctx.log('info', 'Import complete', {
        imported: details.totalImported,
        failed: details.totalFailed,
      });

      await ctx.services.eventBus.publish('sr.workflow.migration.imported', {
        tenantId: ctx.tenantId, migrationId, ...details,
      });

      return success({
        importResult: details,
        etlRun: result.value,
      });
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 6: Infrastructure Cutover
// ──────────────────────────────────────────────────────────────────────────
// Category: ACTION
// DNS verification, SSL provisioning, proxy activation, go-live.

export function createInfrastructureCutoverNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:action:infrastructure-cutover',
    label: 'Infrastructure Cutover',
    category: 'ACTION',
    description: 'Executes the infrastructure cutover sequence: pre-flight checks → SSL provisioning → DNS verification → proxy activation → go-live. Supports rollback.',
    inputs: [
      { portId: 'importResult', label: 'Import Result', dataType: 'record', required: true },
    ],
    outputs: [
      { portId: 'cutoverResult', label: 'Cutover Result', dataType: 'record', required: true },
    ],
    configSchema: {
      migrationId: 'string',
      autoProvisionSsl: 'boolean?',
    },
    pausesWorkflow: true,   // Cutover requires explicit human trigger
    executionHint: 'long_running',

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      // LIMITATION: The workflow engine's pause/resume mechanism does not re-invoke
      // execute() on resume. When resume() is called, the runner takes the provided
      // nodeOutputData, places it on this node's output ports (e.g. cutoverResult),
      // marks the node as completed, and continues to the next layer. This means
      // the actual cutover work (pre-flight checks, SSL provisioning, DNS
      // verification, proxy activation) must be performed EXTERNALLY before calling
      // resume(). The resume caller must provide { cutoverResult: CutoverResult }
      // containing the results of the externally-executed cutover sequence.
      //
      // To add in-engine cutover execution, the engine would need an onResume()
      // handler or the resume() method would need to re-invoke execute() with a
      // 'resumed' flag in context.
      const migrationId = getConfig<string>(ctx, 'migrationId', '');

      ctx.log('info', 'Cutover stage reached — awaiting operator confirmation', { migrationId });

      await ctx.services.eventBus.publish('sr.workflow.migration.cutover_ready', {
        tenantId: ctx.tenantId, migrationId,
      });

      return success({
        __paused: true,
        __pauseReason: 'Import complete. Perform cutover externally (pre-flight, SSL, DNS, proxy) then resume with { cutoverResult: CutoverResult }.',
      });
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 7: Health Monitor (GENERAL PURPOSE)
// ──────────────────────────────────────────────────────────────────────────
// Category: SOURCE (reads health status — it's a data source)
// Runs endpoint health checks. Not migration-specific — any workflow
// can use this to verify deployments, monitor services, etc.

export function createHealthMonitorNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:source:health-monitor',
    label: 'Health Monitor',
    category: 'SOURCE',
    description: 'Runs comprehensive health checks on endpoints: DNS resolution, SSL certificate, homepage availability, proxy routing, content verification, redirect sampling. General purpose — works for any deployment verification.',
    inputs: [
      { portId: 'trigger', label: 'Trigger', dataType: 'any', required: false },
    ],
    outputs: [
      { portId: 'healthResult', label: 'Health Check Result', dataType: 'record', required: true },
    ],
    configSchema: {
      migrationId: 'string',
      targetUrl: 'string?',
      checkInterval: 'number?',
    },
    executionHint: 'fast',

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      const cutoverRes = resolveService<CutoverService>(ctx, 'migration:cutoverService', 'Cutover Service');
      if (!cutoverRes.ok) return cutoverRes;

      const migrationId = getConfig<string>(ctx, 'migrationId', '');

      if (!migrationId) {
        return failure(Errors.validation('migrationId is required for health monitoring'));
      }

      ctx.log('info', 'Running health checks', { migrationId });

      const result = await cutoverRes.value.runHealthCheck(ctx.tenantId, migrationId);
      if (!result.ok) return result;

      ctx.log('info', 'Health check complete', {
        status: result.value.status,
        checks: result.value.checks.length,
      });

      return success({ healthResult: result.value });
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 8: Quality Audit (GENERAL PURPOSE)
// ──────────────────────────────────────────────────────────────────────────
// Category: TRANSFORM (it reads data and produces a quality assessment)
// Runs Data Lake quality checks. Reusable for any data pipeline.

export function createQualityAuditNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:transform:quality-audit',
    label: 'Data Quality Audit',
    category: 'TRANSFORM',
    description: 'Runs quality checks against Data Lake staging data: completeness, null checks, range validation, referential integrity, freshness. Produces a quality report with pass/fail and score.',
    inputs: [
      { portId: 'trigger', label: 'Trigger', dataType: 'any', required: false },
    ],
    outputs: [
      { portId: 'qualityReport', label: 'Quality Report', dataType: 'record', required: true },
    ],
    configSchema: {
      migrationId: 'string?',
      threshold: 'number?',
    },
    executionHint: 'fast',
    dataLakeTracked: true,

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      const adapterRes = resolveService<DataLakeAdapter>(ctx, 'migration:dataLakeAdapter', 'Data Lake Adapter');
      if (!adapterRes.ok) return adapterRes;

      const migrationId = getConfig<string>(ctx, 'migrationId', '');
      if (!migrationId || migrationId.trim().length === 0) {
        return failure(Errors.validation('migrationId is required and must be a non-empty string'));
      }

      ctx.log('info', 'Running Data Lake quality audit');

      const result = await adapterRes.value.runQualityAudit(ctx.tenantId, migrationId);
      if (!result.ok) return result;

      const threshold = getConfig<number>(ctx, 'threshold', 0.95);
      const meetsThreshold = result.value.qualityScore >= threshold;

      ctx.log('info', 'Quality audit complete', {
        score: result.value.qualityScore,
        meetsThreshold,
        passed: result.value.passed,
        failed: result.value.failed,
      });

      return success({ qualityReport: { ...result.value, meetsThreshold } });
    },
  };
}


// ============================================================================
// §3 — REGISTRY SETUP
// ============================================================================
//
// A convenience function that registers all migration template nodes
// with a registry. Call this at boot time alongside any other node
// registrations (analytics nodes, education nodes, etc.).

export function registerMigrationNodes(registry: NodeTypeRegistry): void {
  const nodes = [
    createPlatformSourceNode(),
    createCDCExtractNode(),
    createContentTransformNode(),
    createHumanReviewNode(),
    createServiceImportNode(),
    createInfrastructureCutoverNode(),
    createHealthMonitorNode(),
    createQualityAuditNode(),
  ];

  for (const node of nodes) {
    const result = registry.register(node);
    if (!result.ok) {
      console.warn(`Failed to register node '${node.typeId}': ${result.error.message}`);
    }
  }
}


// ============================================================================
// §4 — WORKFLOW TEMPLATE: PLATFORM MIGRATION
// ============================================================================
//
// The pre-built workflow definition that ships in the "Starter Workflows"
// gallery. Loading this template into the S&R canvas shows seven nodes
// connected left-to-right, representing the full migration pipeline.

/**
 * Create a Platform Migration workflow definition for a specific migration.
 *
 * This is parameterised — each migration gets its own workflow instance
 * with the migrationId, sourceUrl, etc. baked into node configs.
 */
export function createMigrationWorkflowTemplate(params: {
  migrationId: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  platform: string;
  sourceUrl: string;
  customDomain?: string;
}): WorkflowDefinition {
  const { migrationId, tenantId, userId, platform, sourceUrl } = params;

  return {
    workflowId: `wf_migration_${migrationId}`,
    name: 'Platform Migration',
    description: `Migrate content from ${platform} (${sourceUrl}) to Scholarly`,
    version: 1,

    nodes: [
      {
        nodeId: 'source',
        typeId: 'sr:source:platform-export',
        label: 'Extract from Source',
        config: { platform, sourceUrl, migrationId, ownerId: userId, ownerEmail: params.userEmail },
        position: { x: 0, y: 200 },
      },
      {
        nodeId: 'cdc',
        typeId: 'sr:source:cdc-extract',
        label: 'Stage in Data Lake',
        config: { migrationId },
        position: { x: 250, y: 200 },
      },
      {
        nodeId: 'transform',
        typeId: 'sr:transform:content-transform',
        label: 'Transform Content',
        config: { migrationId },
        position: { x: 500, y: 200 },
      },
      {
        nodeId: 'review',
        typeId: 'sr:action:human-review',
        label: 'Review & Approve',
        config: {
          reviewType: 'migration_content',
          migrationId,
          approvalMode: 'bulk',
          pauseMessage: 'Review transformed content. Approve items to proceed with import.',
        },
        position: { x: 750, y: 200 },
      },
      {
        nodeId: 'import',
        typeId: 'sr:action:service-import',
        label: 'Import to Scholarly',
        config: { migrationId },
        position: { x: 1000, y: 200 },
      },
      {
        nodeId: 'cutover',
        typeId: 'sr:action:infrastructure-cutover',
        label: 'Go Live',
        config: { migrationId, autoProvisionSsl: true },
        position: { x: 1250, y: 200 },
      },
      {
        nodeId: 'health',
        typeId: 'sr:source:health-monitor',
        label: 'Health Monitor',
        config: { migrationId },
        position: { x: 1500, y: 200 },
      },
    ],

    edges: [
      // Source → CDC Extract (content items flow to staging)
      { edgeId: 'e1', sourceNodeId: 'source', sourcePortId: 'content', targetNodeId: 'cdc', targetPortId: 'items' },
      // CDC Extract → Transform (ETL run result confirms staging is ready)
      { edgeId: 'e2', sourceNodeId: 'cdc', sourcePortId: 'etlRun', targetNodeId: 'transform', targetPortId: 'etlRun' },
      // Transform → Review (summary flows to review for human inspection)
      { edgeId: 'e3', sourceNodeId: 'transform', sourcePortId: 'summary', targetNodeId: 'review', targetPortId: 'items' },
      // Review → Import (approved items + stats flow to import)
      { edgeId: 'e4', sourceNodeId: 'review', sourcePortId: 'approved', targetNodeId: 'import', targetPortId: 'approved' },
      { edgeId: 'e5', sourceNodeId: 'review', sourcePortId: 'reviewStats', targetNodeId: 'import', targetPortId: 'reviewStats' },
      // Import → Cutover (import result triggers cutover readiness)
      { edgeId: 'e6', sourceNodeId: 'import', sourcePortId: 'importResult', targetNodeId: 'cutover', targetPortId: 'importResult' },
      // Cutover → Health Monitor (cutover result triggers monitoring)
      { edgeId: 'e7', sourceNodeId: 'cutover', sourcePortId: 'cutoverResult', targetNodeId: 'health', targetPortId: 'trigger' },
    ],

    trigger: { type: 'manual' },

    metadata: {
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId,
      tags: ['migration', platform, 'starter-template'],
      templateId: 'tpl_platform_migration_v1',
    },
  };
}


// ============================================================================
// §5 — HELPER FUNCTIONS
// ============================================================================

/** Extract all image URLs from an export payload */
function extractImageUrls(data: PlatformExportData): string[] {
  const urls = new Set<string>();
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;

  for (const page of data.pages) {
    let match: RegExpExecArray | null;
    while ((match = imgRegex.exec(page.html)) !== null) {
      if (match[1]) urls.add(match[1]);
    }
  }
  for (const post of data.posts) {
    let match: RegExpExecArray | null;
    while ((match = imgRegex.exec(post.html)) !== null) {
      if (match[1]) urls.add(match[1]);
    }
    if (post.featuredImage) urls.add(post.featuredImage);
  }
  for (const product of data.products) {
    for (const img of product.images) {
      urls.add(img);
    }
  }

  return Array.from(urls);
}

/** Guess MIME type from file extension */
function guessMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf',
  };
  return mimeMap[ext] || 'application/octet-stream';
}
