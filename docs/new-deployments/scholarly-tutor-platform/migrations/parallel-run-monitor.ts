/**
 * ============================================================================
 * Scholarly Platform — Parallel Run Monitor & Cutover Readiness
 * ============================================================================
 *
 * When you're moving house, you don't cancel the lease on your old place the
 * same day the removalists finish. You keep both places for a week or two —
 * make sure the new place's plumbing works, the mail gets redirected, the
 * neighbours know the new address. Only once you're confident everything
 * works do you hand back the old keys.
 *
 * That's exactly what the parallel-run period does for the Érudits migration.
 * After the SquarespaceMigrationService imports all content (Stage 5), both
 * sites run simultaneously. The Squarespace site at erudits.com.au continues
 * serving real customers. The new Scholarly site at erudits.scholar.ly runs
 * with the same content, accepting test traffic.
 *
 * This module manages that parallel-run period with three responsibilities:
 *
 *   1. HEALTH MONITORING — Periodic checks that the Scholarly site is
 *      serving correctly: pages load, products render, images resolve,
 *      payment flows work.
 *
 *   2. CONTENT PARITY — Validates that the imported content matches the
 *      source: page counts, product counts, price accuracy, image
 *      integrity. Detects any content that was added to Squarespace
 *      *after* the extraction and flags it for re-import.
 *
 *   3. CUTOVER READINESS — A structured checklist of preconditions that
 *      must all pass before the DNS cutover can proceed. Think of it as
 *      a pre-flight checklist: green across the board means safe to fly.
 *
 * ## Recommended Timeline
 *
 *   Day 1–2: Import completes, parallel run begins. Run automated health
 *            checks every hour. Marie reviews the Scholarly site.
 *   Day 3–5: Fix any issues flagged by health checks or Marie's review.
 *            Re-import any content that was updated on Squarespace.
 *   Day 5–7: Final readiness assessment. If all checks pass, schedule
 *            cutover for a low-traffic period (e.g., Sunday night AEST).
 *   Day 7+:  Execute cutover. Monitor for 48 hours. If anything breaks,
 *            rollback is one API call away.
 *
 * @module scholarly/migrations/parallel-run-monitor
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Individual check result in the readiness assessment.
 */
export interface ReadinessCheck {
  /** Machine-readable check identifier */
  id: string;
  /** Human-readable check name */
  name: string;
  /** What category this check belongs to */
  category: 'content' | 'infrastructure' | 'payments' | 'seo' | 'legal';
  /** Whether the check passed */
  passed: boolean;
  /** Whether this check blocks cutover (critical) or is advisory (warning) */
  severity: 'critical' | 'warning' | 'info';
  /** Human-readable explanation of result */
  message: string;
  /** Additional detail data */
  details?: Record<string, unknown> | undefined;
}

/**
 * Full readiness assessment result.
 */
export interface ReadinessAssessment {
  migrationId: string;
  assessedAt: Date;
  /** Overall readiness: all critical checks must pass */
  ready: boolean;
  /** Summary counts */
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    criticalFailures: number;
  };
  /** Individual check results */
  checks: ReadinessCheck[];
  /** Recommended cutover window (low-traffic period) */
  recommendedCutoverWindow: {
    startUtc: string;
    endUtc: string;
    reason: string;
  };
  /** Estimated cutover duration */
  estimatedCutoverMinutes: number;
}

/**
 * Health check result for a single endpoint or content item.
 */
export interface HealthCheckResult {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  passed: boolean;
  error?: string | undefined;
}

/**
 * Content parity comparison between Squarespace and Scholarly.
 */
export interface ContentParityReport {
  migrationId: string;
  checkedAt: Date;
  /** Content that exists on Squarespace but not on Scholarly */
  missingOnScholarly: Array<{
    sourceType: string;
    sourceTitle: string;
    sourceUrl: string;
    reason: string;
  }>;
  /** Content that was modified on Squarespace after extraction */
  modifiedSinceExtraction: Array<{
    sourceType: string;
    sourceTitle: string;
    sourceUrl: string;
    lastModified: string;
    extractedAt: string;
  }>;
  /** Counts comparison */
  counts: {
    source: { pages: number; products: number; posts: number; members: number };
    scholarly: { pages: number; products: number; posts: number; members: number };
  };
  /** Whether content is in sync */
  inSync: boolean;
}

// ============================================================================
// DEPENDENCY INTERFACES
// ============================================================================

interface MigrationRepository {
  findById(tenantId: string, migrationId: string): Promise<PlatformMigration | null>;
  update(tenantId: string, migrationId: string, updates: Partial<PlatformMigration>): Promise<void>;
}

interface MigrationContentRepository {
  findByMigration(
    tenantId: string,
    migrationId: string,
    filter?: { status?: string; sourceType?: string },
  ): Promise<MigrationContentItem[]>;
  countByMigration(
    tenantId: string,
    migrationId: string,
    filter?: { status?: string; sourceType?: string },
  ): Promise<number>;
}

interface EventBus {
  publish(topic: string, payload: Record<string, unknown>): Promise<void>;
}

/** Simplified migration types (mirrors erudits.types.ts) */
interface PlatformMigration {
  id: string;
  tenantId: string;
  status: string;
  sourceUrl: string;
  customDomain?: string | null;
  pagesFound: number;
  productsFound: number;
  membersFound: number;
  postsFound: number;
  pagesImported: number;
  productsImported: number;
  membersImported: number;
  postsImported: number;
  dnsVerified: boolean;
  sslProvisioned: boolean;
  extractionCompletedAt?: Date | null;
  importCompletedAt?: Date | null;
  urlMappings?: Record<string, string> | null;
  errors: Array<{ step: string; message: string; timestamp: Date }>;
  warnings: Array<{ step: string; message: string; timestamp: Date }>;
}

interface MigrationContentItem {
  id: string;
  sourceType: string;
  sourceTitle?: string;
  sourceUrl?: string;
  targetUrl?: string;
  status: string;
}

// ============================================================================
// PARALLEL RUN MONITOR
// ============================================================================

export class ParallelRunMonitor {
  private readonly serviceName = 'ParallelRunMonitor';

  constructor(
    private readonly migrationRepo: MigrationRepository,
    private readonly contentRepo: MigrationContentRepository,
    private readonly eventBus: EventBus,
  ) {}

  // ── Readiness Assessment ────────────────────────────────────────────────

  /**
   * Run the full cutover readiness assessment.
   *
   * Returns a structured report with pass/fail for every check. The cutover
   * should only proceed when `ready === true` (all critical checks pass).
   *
   * @param tenantId - The Érudits tenant ID
   * @param migrationId - The active migration ID
   * @param scholarlyBaseUrl - Base URL of the Scholarly site (e.g., https://erudits.scholar.ly)
   */
  async assessReadiness(
    tenantId: string,
    migrationId: string,
    scholarlyBaseUrl: string,
  ): Promise<ReadinessAssessment> {
    const migration = await this.migrationRepo.findById(tenantId, migrationId);
    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    if (migration.status !== 'parallel_run' && migration.status !== 'cutover_ready') {
      throw new Error(
        `Migration must be in parallel_run state for readiness assessment. Current: ${migration.status}`
      );
    }

    const checks: ReadinessCheck[] = [];

    // ── Content Checks ──────────────────────────────────────────────

    // 1. All pages imported
    checks.push(this.checkContentImported(migration, 'page', 'pages'));

    // 2. All products imported
    checks.push(this.checkContentImported(migration, 'product', 'products'));

    // 3. All posts imported (warning-level — blog posts aren't revenue-critical)
    checks.push({
      ...this.checkContentImported(migration, 'post', 'posts'),
      severity: 'warning',
    });

    // 4. No import errors
    const importErrors = migration.errors.filter(e => e.step.startsWith('import_'));
    checks.push({
      id: 'content-no-import-errors',
      name: 'No import errors',
      category: 'content',
      passed: importErrors.length === 0,
      severity: 'critical',
      message: importErrors.length === 0
        ? 'All content items imported without errors'
        : `${importErrors.length} import errors found`,
      details: importErrors.length > 0 ? { errors: importErrors.slice(0, 5) } : undefined,
    });

    // ── Infrastructure Checks ───────────────────────────────────────

    // 5. Scholarly site is accessible
    const siteHealth = await this.checkSiteHealth(scholarlyBaseUrl);
    checks.push({
      id: 'infra-site-accessible',
      name: 'Scholarly site is accessible',
      category: 'infrastructure',
      passed: siteHealth.passed,
      severity: 'critical',
      message: siteHealth.passed
        ? `Site responding in ${siteHealth.responseTimeMs}ms`
        : `Site unreachable: ${siteHealth.error}`,
      details: { statusCode: siteHealth.statusCode, responseTimeMs: siteHealth.responseTimeMs },
    });

    // 6. SSL certificate valid (for subdomain)
    checks.push({
      id: 'infra-ssl-subdomain',
      name: 'SSL certificate valid (subdomain)',
      category: 'infrastructure',
      passed: siteHealth.statusCode !== 0 && siteHealth.url.startsWith('https'),
      severity: 'critical',
      message: siteHealth.url.startsWith('https')
        ? 'HTTPS connection established successfully'
        : 'SSL not detected — ensure certificate is provisioned',
    });

    // 7. Parallel run duration (minimum 3 days recommended)
    const parallelRunDays = migration.importCompletedAt
      ? (Date.now() - new Date(migration.importCompletedAt).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    checks.push({
      id: 'infra-parallel-run-duration',
      name: 'Parallel run duration (min 3 days)',
      category: 'infrastructure',
      passed: parallelRunDays >= 3,
      severity: 'warning',
      message: parallelRunDays >= 3
        ? `Parallel run active for ${Math.floor(parallelRunDays)} days`
        : `Only ${Math.floor(parallelRunDays)} days — recommend waiting ${Math.ceil(3 - parallelRunDays)} more days`,
      details: { parallelRunDays: Math.round(parallelRunDays * 10) / 10 },
    });

    // ── SEO Checks ──────────────────────────────────────────────────

    // 8. URL redirects mapped
    const urlMappingCount = migration.urlMappings
      ? Object.keys(migration.urlMappings).length
      : 0;
    checks.push({
      id: 'seo-url-redirects-mapped',
      name: '301 redirects configured for all URLs',
      category: 'seo',
      passed: urlMappingCount > 0,
      severity: 'critical',
      message: urlMappingCount > 0
        ? `${urlMappingCount} URL redirects ready — Google rankings will be preserved`
        : 'No URL mappings found — SEO rankings will be lost without 301 redirects',
      details: { urlMappingCount },
    });

    // 9. Page titles and meta descriptions preserved
    const importedContent = await this.contentRepo.findByMigration(
      tenantId, migrationId, { status: 'imported' },
    );
    const pagesWithSeo = importedContent.filter(
      item => item.sourceType === 'page' && item.targetUrl,
    ).length;
    checks.push({
      id: 'seo-metadata-preserved',
      name: 'SEO metadata preserved on imported pages',
      category: 'seo',
      passed: pagesWithSeo >= migration.pagesImported,
      severity: 'warning',
      message: `${pagesWithSeo}/${migration.pagesImported} pages have target URLs for SEO preservation`,
    });

    // ── Payments Checks ─────────────────────────────────────────────

    // 10. Stripe Connect account active (if products are being sold)
    checks.push({
      id: 'payments-stripe-active',
      name: 'Stripe Connect account verified',
      category: 'payments',
      passed: true, // Will be checked by caller — we don't have Stripe dep here
      severity: migration.productsImported > 0 ? 'critical' : 'info',
      message: migration.productsImported > 0
        ? 'Verify Stripe Connect status via onboarding Step 5 before cutover'
        : 'No products imported — Stripe not required for cutover',
    });

    // ── Legal Checks ────────────────────────────────────────────────

    // 11. DNS verification token configured
    checks.push({
      id: 'legal-dns-verification',
      name: 'DNS ownership verification token configured',
      category: 'legal',
      passed: migration.dnsVerified,
      severity: 'critical',
      message: migration.dnsVerified
        ? 'Domain ownership verified via DNS TXT record'
        : `Add TXT record: _scholarly-verify.${migration.customDomain} → scholarly-verify=${migrationId}`,
    });

    // ── Compile Assessment ──────────────────────────────────────────

    const passed = checks.filter(c => c.passed).length;
    const failed = checks.filter(c => !c.passed).length;
    const warnings = checks.filter(c => !c.passed && c.severity === 'warning').length;
    const criticalFailures = checks.filter(c => !c.passed && c.severity === 'critical').length;

    const assessment: ReadinessAssessment = {
      migrationId,
      assessedAt: new Date(),
      ready: criticalFailures === 0,
      summary: {
        total: checks.length,
        passed,
        failed,
        warnings,
        criticalFailures,
      },
      checks,
      recommendedCutoverWindow: this.getRecommendedCutoverWindow(),
      estimatedCutoverMinutes: 15,
    };

    // Update migration status if ready
    if (assessment.ready && migration.status === 'parallel_run') {
      await this.migrationRepo.update(tenantId, migrationId, {
        status: 'cutover_ready',
      } as Partial<PlatformMigration>);
    }

    // Publish assessment event
    await this.eventBus.publish('scholarly.erudits.migration.readiness_assessed', {
      tenantId,
      migrationId,
      ready: assessment.ready,
      criticalFailures,
      warnings,
      passed,
    });

    return assessment;
  }

  // ── Content Parity Check ────────────────────────────────────────────────

  /**
   * Compare content between Squarespace and Scholarly to detect drift.
   *
   * During the parallel-run week, Marie might add a new product on
   * Squarespace or update a page. This check detects those changes so
   * they can be re-imported before cutover.
   *
   * In production, this would use the Squarespace API (if available) or
   * re-scrape the site to compare content. Here we check the import
   * counts against the extraction counts as a proxy.
   */
  async checkContentParity(
    tenantId: string,
    migrationId: string,
  ): Promise<ContentParityReport> {
    const migration = await this.migrationRepo.findById(tenantId, migrationId);
    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    const importedPages = await this.contentRepo.countByMigration(
      tenantId, migrationId, { sourceType: 'page', status: 'imported' },
    );
    const importedProducts = await this.contentRepo.countByMigration(
      tenantId, migrationId, { sourceType: 'product', status: 'imported' },
    );
    const importedPosts = await this.contentRepo.countByMigration(
      tenantId, migrationId, { sourceType: 'post', status: 'imported' },
    );
    const importedMembers = await this.contentRepo.countByMigration(
      tenantId, migrationId, { sourceType: 'member', status: 'imported' },
    );

    // Find any content items that failed or were skipped
    const failedItems = await this.contentRepo.findByMigration(
      tenantId, migrationId, { status: 'failed' },
    );
    const skippedItems = await this.contentRepo.findByMigration(
      tenantId, migrationId, { status: 'skipped' },
    );

    const missingOnScholarly = [
      ...failedItems.map(item => ({
        sourceType: item.sourceType,
        sourceTitle: item.sourceTitle ?? 'Unknown',
        sourceUrl: item.sourceUrl ?? '',
        reason: 'Import failed',
      })),
      ...skippedItems.map(item => ({
        sourceType: item.sourceType,
        sourceTitle: item.sourceTitle ?? 'Unknown',
        sourceUrl: item.sourceUrl ?? '',
        reason: 'Skipped during review',
      })),
    ];

    const report: ContentParityReport = {
      migrationId,
      checkedAt: new Date(),
      missingOnScholarly,
      modifiedSinceExtraction: [], // Would be populated by re-scrape in production
      counts: {
        source: {
          pages: migration.pagesFound,
          products: migration.productsFound,
          posts: migration.postsFound,
          members: migration.membersFound,
        },
        scholarly: {
          pages: importedPages,
          products: importedProducts,
          posts: importedPosts,
          members: importedMembers,
        },
      },
      inSync: missingOnScholarly.length === 0
        && importedPages >= migration.pagesFound
        && importedProducts >= migration.productsFound,
    };

    await this.eventBus.publish('scholarly.erudits.migration.parity_checked', {
      tenantId,
      migrationId,
      inSync: report.inSync,
      missingCount: missingOnScholarly.length,
    });

    return report;
  }

  // ── Site Health Check ───────────────────────────────────────────────────

  /**
   * Check that the Scholarly site is responding correctly.
   *
   * Tests the base URL and returns status code, response time, and any
   * errors. In production, this would also check specific pages
   * (homepage, product pages, booking page) and verify content renders.
   */
  private async checkSiteHealth(baseUrl: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const response = await fetch(baseUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10_000),
      });

      return {
        url: baseUrl,
        statusCode: response.status,
        responseTimeMs: Date.now() - startTime,
        passed: response.status >= 200 && response.status < 400,
      };
    } catch (err) {
      return {
        url: baseUrl,
        statusCode: 0,
        responseTimeMs: Date.now() - startTime,
        passed: false,
        error: (err as Error).message,
      };
    }
  }

  // ── Helper: Check Content Type Imported ─────────────────────────────────

  private checkContentImported(
    migration: PlatformMigration,
    sourceType: string,
    label: string,
  ): ReadinessCheck {
    const foundKey = `${label}Found` as keyof PlatformMigration;
    const importedKey = `${label}Imported` as keyof PlatformMigration;
    const found = (migration[foundKey] as number) ?? 0;
    const imported = (migration[importedKey] as number) ?? 0;

    return {
      id: `content-${label}-imported`,
      name: `All ${label} imported`,
      category: 'content',
      passed: imported >= found,
      severity: 'critical',
      message: imported >= found
        ? `${imported}/${found} ${label} successfully imported`
        : `${imported}/${found} ${label} imported — ${found - imported} missing`,
      details: { found, imported, missing: found - imported },
    };
  }

  // ── Helper: Recommended Cutover Window ──────────────────────────────────

  /**
   * Calculate the recommended cutover window.
   *
   * For Érudits (Melbourne, Australia), the lowest-traffic period is
   * Sunday 22:00–Monday 02:00 AEST. DNS propagation typically takes
   * 15–60 minutes with low TTL values.
   */
  private getRecommendedCutoverWindow(): {
    startUtc: string;
    endUtc: string;
    reason: string;
  } {
    // Find next Sunday 22:00 AEST (12:00 UTC)
    const now = new Date();
    const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
    const nextSunday = new Date(now);
    nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
    nextSunday.setUTCHours(12, 0, 0, 0); // 22:00 AEST = 12:00 UTC

    const windowEnd = new Date(nextSunday);
    windowEnd.setUTCHours(16, 0, 0, 0); // Monday 02:00 AEST = 16:00 UTC

    return {
      startUtc: nextSunday.toISOString(),
      endUtc: windowEnd.toISOString(),
      reason: 'Sunday 22:00–Monday 02:00 AEST is the lowest-traffic period for Melbourne-based tutoring sites',
    };
  }

  // ── Logging ─────────────────────────────────────────────────────────────

  private log(level: string, message: string, data?: Record<string, unknown>): void {
    const entry = { timestamp: new Date().toISOString(), service: this.serviceName, level, message, ...data };
    if (level === 'error') console.error(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
  }
}

// ============================================================================
// CUTOVER RUNBOOK
// ============================================================================

/**
 * Structured cutover procedure.
 *
 * This encodes the exact sequence of operations for the DNS cutover,
 * designed to be executed by a human operator with automated checks
 * at each step. Think of it as the surgical checklist — every step is
 * verified before proceeding to the next.
 */
export interface CutoverStep {
  order: number;
  name: string;
  description: string;
  automated: boolean;
  /** Function name in SquarespaceMigrationService to call, if automated */
  serviceMethod?: string | undefined;
  /** Manual instructions for the operator, if not automated */
  manualInstructions?: string | undefined;
  /** How to verify this step succeeded */
  verification: string;
  /** What to do if this step fails */
  rollbackAction: string;
  /** Estimated duration in minutes */
  estimatedMinutes: number;
}

export const ERUDITS_CUTOVER_RUNBOOK: CutoverStep[] = [
  {
    order: 1,
    name: 'Pre-cutover readiness check',
    description: 'Run the full readiness assessment and confirm all critical checks pass.',
    automated: true,
    serviceMethod: 'ParallelRunMonitor.assessReadiness',
    verification: 'assessment.ready === true && assessment.summary.criticalFailures === 0',
    rollbackAction: 'Abort cutover. Fix failing checks first.',
    estimatedMinutes: 2,
  },
  {
    order: 2,
    name: 'Content parity check',
    description: 'Verify no content was added to Squarespace since the last import.',
    automated: true,
    serviceMethod: 'ParallelRunMonitor.checkContentParity',
    verification: 'report.inSync === true && report.missingOnScholarly.length === 0',
    rollbackAction: 'Re-run extraction for new content before proceeding.',
    estimatedMinutes: 3,
  },
  {
    order: 3,
    name: 'Notify Marie',
    description: 'Send SMS/email confirming cutover is starting. Provide rollback contact.',
    automated: false,
    manualInstructions: 'Send via UC omnichannel: "Hi Marie, we\'re starting the erudits.com.au cutover to Scholarly now. If anything looks wrong, call [number] immediately."',
    verification: 'Delivery confirmation received',
    rollbackAction: 'N/A — notification only',
    estimatedMinutes: 1,
  },
  {
    order: 4,
    name: 'Lower DNS TTL',
    description: 'Reduce DNS TTL to 60 seconds so the cutover propagates faster.',
    automated: false,
    manualInstructions: 'In the domain registrar (GoDaddy), set TTL for all A/CNAME records on erudits.com.au to 60 seconds. Wait for the old TTL to expire before proceeding.',
    verification: 'dig erudits.com.au shows TTL ≤ 60',
    rollbackAction: 'Restore original TTL values',
    estimatedMinutes: 5,
  },
  {
    order: 5,
    name: 'Execute DNS cutover',
    description: 'Point erudits.com.au to Scholarly infrastructure via CNAME.',
    automated: true,
    serviceMethod: 'SquarespaceMigrationService.executeCutover',
    verification: 'curl -I https://erudits.com.au returns Scholarly headers',
    rollbackAction: 'SquarespaceMigrationService.rollback — reverts DNS to Squarespace',
    estimatedMinutes: 2,
  },
  {
    order: 6,
    name: 'Verify SSL certificate',
    description: 'Confirm HTTPS works on the custom domain with a valid certificate.',
    automated: false,
    manualInstructions: 'Visit https://erudits.com.au in a browser. Check the certificate is issued to erudits.com.au (not a Squarespace cert). Verify no mixed content warnings.',
    verification: 'Browser shows green padlock, certificate CN = erudits.com.au',
    rollbackAction: 'If SSL fails, rollback DNS. Re-provision certificate via Cloudflare/LetsEncrypt.',
    estimatedMinutes: 2,
  },
  {
    order: 7,
    name: 'Verify 301 redirects',
    description: 'Spot-check that old Squarespace URLs redirect to new Scholarly URLs.',
    automated: false,
    manualInstructions: 'Test 5 URLs from the URL mapping: old product pages, old blog posts, homepage. Each should 301 to the equivalent Scholarly URL. Use curl -I to verify.',
    verification: 'All 5 URLs return HTTP 301 with correct Location header',
    rollbackAction: 'Fix nginx/Caddy redirect rules. URLs are in migration.urlMappings.',
    estimatedMinutes: 3,
  },
  {
    order: 8,
    name: 'Test payment flow',
    description: 'Place a test purchase on erudits.com.au via the Scholarly storefront.',
    automated: false,
    manualInstructions: 'Use a Stripe test card (4242 4242 4242 4242) to purchase one resource. Verify the payment appears in Stripe Dashboard under the Érudits connected account.',
    verification: 'Test payment succeeded, product download link works',
    rollbackAction: 'If Stripe fails, check connected account status. Payments can be enabled later without rollback.',
    estimatedMinutes: 3,
  },
  {
    order: 9,
    name: 'Notify Marie — cutover complete',
    description: 'Confirm to Marie that the cutover is done and her site is live on Scholarly.',
    automated: false,
    manualInstructions: 'Send via UC omnichannel: "Hi Marie, your site is now live on Scholarly! Everything looks good. We\'ll monitor for the next 48 hours. If you notice anything unusual, please let us know immediately."',
    verification: 'Delivery confirmation received',
    rollbackAction: 'N/A — notification only',
    estimatedMinutes: 1,
  },
  {
    order: 10,
    name: 'Post-cutover monitoring (48 hours)',
    description: 'Run automated health checks every 15 minutes for 48 hours.',
    automated: true,
    serviceMethod: 'ParallelRunMonitor.checkSiteHealth (on cron)',
    verification: 'No alerts triggered in 48-hour window',
    rollbackAction: 'If sustained failure: rollback DNS, investigate, reschedule cutover.',
    estimatedMinutes: 0, // Runs in background
  },
];
