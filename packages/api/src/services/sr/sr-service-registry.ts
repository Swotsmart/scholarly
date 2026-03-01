/**
 * ============================================================================
 * S&R Integration: Migration Service Registry
 * ============================================================================
 *
 * This is the junction box — the place where all the track sections
 * connect to the main network. Every migration workflow node resolves
 * its dependencies via:
 *   ctx.services.getService<T>('migration:serviceName')
 *
 * This module constructs all the service implementations, wires their
 * dependencies, and registers them in a Map<string, unknown> that the
 * WorkflowRunner's `services.getService()` resolver can query.
 *
 * WIRING TOPOLOGY:
 *
 *   ┌─────────────────────┐
 *   │  HealthProber        │ ← standalone, no deps
 *   └─────────┬───────────┘
 *             │ injected into
 *   ┌─────────▼───────────┐
 *   │  CutoverService      │ ← also needs CutoverStore, shell exec
 *   └─────────┬───────────┘
 *             │ registered as 'migration:cutoverService'
 *   ┌─────────▼───────────┐
 *   │  SquarespaceClient   │ ← needs API key from tenant secrets
 *   └─────────┬───────────┘
 *             │ registered as 'migration:sourceClient'
 *   ┌─────────▼───────────┐
 *   │  Service Map          │ → passed to WorkflowRunner as services
 *   └─────────────────────┘
 *
 * TENANT ISOLATION: Each migration gets its own service instances,
 * constructed with tenant-specific credentials. The registry factory
 * takes a tenant context and returns a fully-wired service map.
 *
 * @module scholarly/sr/integrations/service-registry
 */

import { createSquarespaceClient } from './sr-squarespace-client';
import { createCutoverService } from './sr-cutover-service';
import { createHealthProber } from './sr-health-prober';

import type { SquarespaceClientConfig } from './sr-squarespace-client';
import type { CutoverServiceConfig, CutoverStore } from './sr-cutover-service';
import type {
  PlatformSourceClient,
  CutoverService,
  DataLakeAdapter,
  TransformService,
  ReviewService,
  MigrationRepo,
  ContentRepo,
  FileStorageService,
} from './sr-migration-workflow-template';


// ============================================================================
// §1 — REGISTRY CONFIGURATION
// ============================================================================

export interface MigrationRegistryConfig {
  /** Tenant ID — scopes all service instances. */
  tenantId: string;

  /** Squarespace API credentials for this tenant's source site. */
  squarespace: {
    apiKey: string;
    siteId: string;
    /** Override base URL (for staging/testing). */
    baseUrl?: string;
    /** Rate limit ceiling. Default: 5. */
    maxRequestsPerSecond?: number;
  };

  /** Infrastructure cutover configuration. */
  cutover: {
    provider: 'terraform' | 'azure' | 'mock';
    terraformDir?: string;
    azureResourceGroup?: string;
    azureContainerApp?: string;
  };

  /**
   * External service implementations that already exist in the platform.
   * These were built in prior sprints and are injected here rather than
   * re-implemented. The registry wires them into the service map alongside
   * the new integration services.
   */
  existingServices: {
    /** Data Lake adapter (Sprint 14). */
    dataLakeAdapter: DataLakeAdapter;
    /** Content transform service (Érudits Tier 1). */
    transformService: TransformService;
    /** Human review service (Érudits Tier 1). */
    reviewService: ReviewService;
    /** Migration repository (Érudits Tier 1, Prisma-backed). */
    migrationRepo: MigrationRepo;
    /** Content repository (Érudits Tier 1, Prisma-backed). */
    contentRepo: ContentRepo;
    /** File storage (S3/Azure Blob). */
    fileStorage: FileStorageService;
    /** Cutover state persistence (Prisma-backed). */
    cutoverStore: CutoverStore;
  };

  /** Logger callback. Default: console.log. */
  logger?: (level: string, message: string, data?: Record<string, unknown>) => void;
}


// ============================================================================
// §2 — REGISTRY BUILDER
// ============================================================================

/**
 * Build the complete migration service map for a tenant.
 *
 * Returns a Map<string, unknown> that should be passed to the
 * WorkflowRunner constructor as the `services` parameter's getService
 * resolver:
 *
 *   const serviceMap = buildMigrationServiceMap(config);
 *   const runner = new WorkflowRunner({
 *     registry, runStore,
 *     services: {
 *       eventBus,
 *       dataLake: null,
 *       cache: null,
 *       getService: (key) => serviceMap.get(key) ?? null,
 *     },
 *   });
 */
export function buildMigrationServiceMap(
  config: MigrationRegistryConfig,
): Map<string, unknown> {
  const log = config.logger ?? ((level: string, msg: string, data?: Record<string, unknown>) =>
    console.log(`[registry:${level}] ${msg}`, data ?? ''));

  log('info', 'Building migration service map', { tenantId: config.tenantId });

  const serviceMap = new Map<string, unknown>();

  // ── 1. Health Prober (no dependencies) ───────────────────────────────
  const healthProber = createHealthProber();

  // ── 2. Cutover Service (depends on HealthProber + CutoverStore) ──────
  const cutoverConfig: CutoverServiceConfig = {
    provider: config.cutover.provider,
    terraformDir: config.cutover.terraformDir,
    azureResourceGroup: config.cutover.azureResourceGroup,
    azureContainerApp: config.cutover.azureContainerApp,
    healthProber,
    cutoverStore: config.existingServices.cutoverStore,
    logger: (level, msg, data) => log(level, `[cutover] ${msg}`, data),
  };
  const cutoverService = createCutoverService(cutoverConfig);

  // ── 3. Squarespace Client (standalone) ───────────────────────────────
  const sqspConfig: SquarespaceClientConfig = {
    apiKey: config.squarespace.apiKey,
    siteId: config.squarespace.siteId,
    baseUrl: config.squarespace.baseUrl,
    maxRequestsPerSecond: config.squarespace.maxRequestsPerSecond,
    logger: (level, msg, data) => log(level, `[sqsp] ${msg}`, data),
  };
  const sourceClient = createSquarespaceClient(sqspConfig);

  // ── 4. Register everything ───────────────────────────────────────────
  //
  // Service key convention: 'migration:{serviceName}'
  // These keys match what the node implementations resolve via
  // resolveService<T>(ctx, 'migration:...', '...')

  serviceMap.set('migration:sourceClient', sourceClient);
  serviceMap.set('migration:cutoverService', cutoverService);
  serviceMap.set('migration:dataLakeAdapter', config.existingServices.dataLakeAdapter);
  serviceMap.set('migration:transformService', config.existingServices.transformService);
  serviceMap.set('migration:reviewService', config.existingServices.reviewService);
  serviceMap.set('migration:migrationRepo', config.existingServices.migrationRepo);
  serviceMap.set('migration:contentRepo', config.existingServices.contentRepo);
  serviceMap.set('migration:fileStorage', config.existingServices.fileStorage);

  log('info', 'Migration service map built', {
    services: Array.from(serviceMap.keys()),
    provider: config.cutover.provider,
    tenantId: config.tenantId,
  });

  return serviceMap;
}


// ============================================================================
// §3 — CONVENIENCE: MOCK REGISTRY FOR TESTING
// ============================================================================
//
// A pre-wired registry with no-op implementations for all services.
// Used by the engine test suite and canvas development mode.

export function buildMockServiceMap(tenantId: string = 'test-tenant'): Map<string, unknown> {
  const noop = async () => ({ ok: true as const, value: {} as any });
  const noopResult = <T>(value: T) => async () => ({ ok: true as const, value });

  const mockDataLake: DataLakeAdapter = {
    registerMigration: () => ({ extract: {}, transform: {}, import: {} }),
    runExtraction: noopResult({ runId: 'mock', jobId: 'mock', status: 'complete', rowsExtracted: 0, rowsTransformed: 0, rowsLoaded: 0, rowsRejected: 0, durationMs: 0 }),
    runTransform: noopResult({ runId: 'mock', jobId: 'mock', status: 'complete', rowsExtracted: 0, rowsTransformed: 0, rowsLoaded: 0, rowsRejected: 0, durationMs: 0 }),
    runImport: noopResult({ runId: 'mock', jobId: 'mock', status: 'complete', rowsExtracted: 0, rowsTransformed: 0, rowsLoaded: 0, rowsRejected: 0, durationMs: 0, importDetails: { pages: 0, products: 0, members: 0, posts: 0, images: 0, totalImported: 0, totalFailed: 0, errors: [] } }),
    runQualityAudit: noopResult({ auditId: 'mock', qualityScore: 1.0, passed: 10, failed: 0, totalChecks: 10, meetsThreshold: true, results: [] }),
    getMigrationETLStatus: () => ({ registered: true, jobs: [] }),
  };

  const mockTransform: TransformService = {
    runTransformation: noopResult({ totalItems: 0, transformed: 0, flaggedForReview: 0, byType: {} }),
  };

  const mockReview: ReviewService = {
    getReviewDashboard: noop as any,
    reviewItem: noop as any,
    bulkReview: noop as any,
    approveMigration: noop as any,
    getReviewStats: noopResult({ total: 0, pending: 0, approved: 0, rejected: 0, needsEdit: 0, skipped: 0 }),
  };

  const mockMigrationRepo: MigrationRepo = {
    findById: async () => null,
    findByOwner: async () => [],
    save: async (_t, m) => m,
    update: async () => {},
  };

  const mockContentRepo: ContentRepo = {
    saveBatch: async () => {},
    findByMigration: async () => [],
  };

  const mockFileStorage: FileStorageService = {
    upload: async (key) => ({ ok: true as const, value: { url: `https://mock-storage/${key}` } }),
  };

  const mockCutoverStore: CutoverStore = {
    save: async () => {},
    findByMigration: async () => ({
      migrationId: 'mock', tenantId, domain: 'mock.example.com',
      previousDnsRecords: [], newDnsRecords: [],
      sslProvisioned: false, proxyActivated: false, status: 'pending' as const,
    }),
    update: async () => {},
  };

  return buildMigrationServiceMap({
    tenantId,
    squarespace: { apiKey: 'mock-key', siteId: 'mock-site' },
    cutover: { provider: 'mock' },
    existingServices: {
      dataLakeAdapter: mockDataLake,
      transformService: mockTransform,
      reviewService: mockReview,
      migrationRepo: mockMigrationRepo,
      contentRepo: mockContentRepo,
      fileStorage: mockFileStorage,
      cutoverStore: mockCutoverStore,
    },
    logger: (level, msg) => console.log(`[mock:${level}] ${msg}`),
  });
}
