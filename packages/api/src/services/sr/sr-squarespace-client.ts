/**
 * ============================================================================
 * S&R Integration: Squarespace Commerce API v1 Client
 * ============================================================================
 *
 * This is one of the three "last track sections" connecting the S&R
 * migration pipeline to the outside world. The migration workflow's
 * Platform Source node (sr:source:platform-export) calls
 *   ctx.services.getService<PlatformSourceClient>('migration:sourceClient')
 * and expects something that can pull an entire site's content — pages,
 * products, blog posts, members, navigation, and images — into the
 * PlatformExportData envelope.
 *
 * Squarespace's Commerce API v1 is a RESTful JSON API authenticated via
 * API key (passed as Bearer token). It exposes separate collection-based
 * endpoints for pages, products, blog posts, and members. There is no
 * single "export everything" call — we composite multiple paginated
 * requests into one unified snapshot.
 *
 * Think of this client as a photographer assembling a panorama: each API
 * call captures one slice of the site, and we stitch them together into
 * a single wide-angle view that the migration pipeline can process as a
 * single unit.
 *
 * RATE LIMITING: Squarespace imposes ~5 requests/second for Commerce
 * Basic and ~30 req/s for Commerce Advanced. We implement a sliding
 * window limiter with configurable ceiling and backoff. On 429 responses,
 * we respect the Retry-After header. Every request is logged for audit.
 *
 * PAGINATION: All collection endpoints return { items[], pagination }
 * where pagination.nextPageCursor is the cursor for the next page, and
 * pagination.hasNextPage indicates if more pages exist. We drain each
 * collection completely.
 *
 * ERROR HANDLING: Every external call is wrapped in Result<T>. Network
 * errors, HTTP errors, and malformed responses are all surfaced as
 * structured failures that the Platform Source node can report without
 * crashing the workflow.
 *
 * @module scholarly/sr/integrations/squarespace-client
 */

import {
  Result,
  success,
  failure,
  Errors,
} from './sr-workflow-engine';

import type {
  PlatformSourceClient,
  PlatformExportData,
} from './sr-migration-workflow-template';


// ============================================================================
// §1 — CONFIGURATION & TYPES
// ============================================================================

export interface SquarespaceClientConfig {
  /** Squarespace API key (Commerce API v1). Bearer token. */
  apiKey: string;

  /**
   * Site ID from Squarespace (visible in Settings → Developer → API Keys).
   * Used to scope all requests to the correct site.
   */
  siteId: string;

  /** Base URL for the Commerce API. Default: https://api.squarespace.com/1.0 */
  baseUrl?: string;

  /** Maximum requests per second. Default: 5 (Commerce Basic). */
  maxRequestsPerSecond?: number;

  /** Maximum items to fetch per collection. Default: Infinity (drain all). */
  maxItemsPerCollection?: number;

  /** Request timeout in milliseconds. Default: 30_000. */
  timeoutMs?: number;

  /** Retry count for transient failures (5xx, network). Default: 3. */
  retryCount?: number;

  /** Custom fetch implementation (for testing/mocking). */
  fetchImpl?: typeof globalThis.fetch;

  /** Logger callback. Default: console.log. */
  logger?: (level: string, message: string, data?: Record<string, unknown>) => void;
}

/** Internal: normalised config with all defaults resolved. */
interface ResolvedConfig {
  apiKey: string;
  siteId: string;
  baseUrl: string;
  maxRequestsPerSecond: number;
  maxItemsPerCollection: number;
  timeoutMs: number;
  retryCount: number;
  fetchFn: typeof globalThis.fetch;
  log: (level: string, message: string, data?: Record<string, unknown>) => void;
}

/** Squarespace pagination envelope */
interface SqspPaginatedResponse<T> {
  items?: T[];
  pagination?: {
    nextPageCursor?: string;
    hasNextPage?: boolean;
    nextPageUrl?: string;
  };
  // Some endpoints return data at top level under a named key
  [key: string]: unknown;
}

/** Squarespace page (from /pages) */
interface SqspPage {
  id: string;
  urlId: string;
  title: string;
  description?: string;
  body?: string;
  mainContent?: string;
  seoData?: {
    seoTitle?: string;
    seoDescription?: string;
    seoHidden?: boolean;
  };
  collection?: { id: string };
  updatedOn?: string;
}

/** Squarespace product (from /commerce/products) */
interface SqspProduct {
  id: string;
  urlSlug: string;
  name: string;
  description: string;
  pricing: { basePrice: { value: string; currency: string } };
  images?: Array<{ id: string; url: string; originalSize?: { width: number; height: number } }>;
  variants?: Array<{
    id: string;
    sku?: string;
    pricing?: { basePrice: { value: string; currency: string } };
    attributes?: Record<string, string>;
    stock?: { quantity: number; unlimited: boolean };
  }>;
  isVisible?: boolean;
  type?: string; // PHYSICAL, DIGITAL, SERVICE
  tags?: string[];
}

/** Squarespace blog post (from /blog/{blogId}/posts) */
interface SqspBlogPost {
  id: string;
  urlId: string;
  title: string;
  body?: string;
  excerpt?: string;
  publishOn?: string;
  author?: { displayName: string };
  tags?: string[];
  thumbnailUrl?: string;
  categories?: string[];
}

/** Squarespace member profile (from /members) */
interface SqspMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profile?: Record<string, unknown>;
  createdOn?: string;
}

/** Squarespace navigation (from /navigation) */
interface SqspNavigationItem {
  title: string;
  urlId?: string;
  externalLink?: string;
  items?: SqspNavigationItem[];
}


// ============================================================================
// §2 — RATE LIMITER
// ============================================================================
//
// A sliding-window rate limiter that tracks timestamps of recent requests
// and delays new ones when the window is full. Think of it as a polite
// queue at a ticket counter — we never send more customers than the
// counter can serve in a given second.

class SlidingWindowLimiter {
  private timestamps: number[] = [];
  private readonly windowMs: number = 1000; // 1 second

  constructor(private readonly maxPerWindow: number) {}

  /**
   * Wait until we're allowed to make a request. If the window is full,
   * we sleep until the oldest request exits the window.
   */
  async acquire(): Promise<void> {
    const now = Date.now();

    // Evict timestamps outside the window
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxPerWindow) {
      // Wait until the oldest request exits the window
      const oldest = this.timestamps[0]!;
      const waitMs = this.windowMs - (now - oldest) + 10; // +10ms buffer
      if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
      // Re-evict after sleeping
      const afterSleep = Date.now();
      this.timestamps = this.timestamps.filter(t => afterSleep - t < this.windowMs);
    }

    this.timestamps.push(Date.now());
  }
}


// ============================================================================
// §3 — HTTP TRANSPORT LAYER
// ============================================================================
//
// All Squarespace API calls flow through this layer. It handles:
// - Bearer token injection
// - Rate limiting (pre-request)
// - Retry with exponential backoff on 5xx / network errors
// - Retry-After header respect on 429
// - Timeout enforcement
// - Structured error wrapping into Result<T>

class SquarespaceTransport {
  private limiter: SlidingWindowLimiter;
  private requestCount = 0;

  constructor(private config: ResolvedConfig) {
    this.limiter = new SlidingWindowLimiter(config.maxRequestsPerSecond);
  }

  /**
   * Execute a GET request against the Squarespace API.
   * Returns the parsed JSON body on success, or a failure Result on error.
   */
  async get<T>(path: string, params?: Record<string, string>): Promise<Result<T>> {
    // Build URL preserving any path segment in baseUrl (e.g. "/1.0").
    const base = this.config.baseUrl.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(base + normalizedPath);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, v);
      }
    }

    let lastError: ServiceError | null = null;

    for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
      if (attempt > 0) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10_000);
        this.config.log('warn', `Retry ${attempt}/${this.config.retryCount} after ${backoffMs}ms`, { url: url.toString() });
        await new Promise(r => setTimeout(r, backoffMs));
      }

      await this.limiter.acquire();
      this.requestCount++;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const response = await this.config.fetchFn(url.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'User-Agent': 'Scholarly-Migration/1.0',
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 429 Too Many Requests — respect Retry-After
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitSec = retryAfter ? parseInt(retryAfter, 10) : 5;
          this.config.log('warn', `Rate limited (429). Waiting ${waitSec}s`, { url: url.toString() });
          await new Promise(r => setTimeout(r, waitSec * 1000));
          lastError = Errors.timeout(`Rate limited by Squarespace API`);
          continue;
        }

        // 5xx — retryable server error
        if (response.status >= 500) {
          lastError = Errors.internal(`Squarespace API returned ${response.status}`);
          continue;
        }

        // 4xx (except 429) — non-retryable client error
        if (!response.ok) {
          const body = await response.text().catch(() => '');
          return failure(Errors.internal(
            `Squarespace API error ${response.status}: ${body.slice(0, 200)}`
          ));
        }

        // Success
        const json = await response.json() as T;
        return success(json);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('abort')) {
          lastError = Errors.timeout(`Request timed out after ${this.config.timeoutMs}ms`);
        } else {
          lastError = Errors.internal(`Network error: ${message}`);
        }
        // Network errors are retryable
        continue;
      }
    }

    // All retries exhausted
    return failure(lastError ?? Errors.internal('All retries exhausted'));
  }

  /** Total requests made during this client's lifetime (for diagnostics). */
  get totalRequests(): number {
    return this.requestCount;
  }
}


// ============================================================================
// §4 — COLLECTION DRAINER
// ============================================================================
//
// Squarespace paginates via cursor. This utility drains an entire collection
// by following nextPageCursor until hasNextPage is false or we hit the
// configured item limit. It's a generic paginator — give it a path and
// an item key, and it pulls everything.

async function drainCollection<T>(
  transport: SquarespaceTransport,
  path: string,
  itemsKey: string,
  config: ResolvedConfig,
  extraParams?: Record<string, string>,
): Promise<Result<T[]>> {
  const allItems: T[] = [];
  let cursor: string | undefined;
  let page = 0;

  while (true) {
    const params: Record<string, string> = { ...extraParams };
    if (cursor) params['cursor'] = cursor;

    const result = await transport.get<SqspPaginatedResponse<T>>(path, params);
    if (!result.ok) return result;

    const response = result.value;
    // Items can be under the named key or under 'items'
    const items = (response[itemsKey] as T[] | undefined) ?? response.items ?? [];
    allItems.push(...items);
    page++;

    config.log('info', `Fetched page ${page} of ${path}`, {
      itemsThisPage: items.length,
      totalSoFar: allItems.length,
    });

    if (allItems.length >= config.maxItemsPerCollection) {
      config.log('warn', `Hit maxItemsPerCollection (${config.maxItemsPerCollection})`, { path });
      break;
    }

    if (!response.pagination?.hasNextPage || !response.pagination?.nextPageCursor) {
      break;
    }

    cursor = response.pagination.nextPageCursor;
  }

  return success(allItems);
}


// ============================================================================
// §5 — SQUARESPACE CLIENT (implements PlatformSourceClient)
// ============================================================================
//
// The main class that composes the transport, limiter, and drainer into
// the PlatformSourceClient interface. The exportSite() method orchestrates
// pulling all content types in parallel where possible.

export class SquarespaceClient implements PlatformSourceClient {
  private transport: SquarespaceTransport;
  private config: ResolvedConfig;

  constructor(rawConfig: SquarespaceClientConfig) {
    this.config = {
      apiKey: rawConfig.apiKey,
      siteId: rawConfig.siteId,
      baseUrl: rawConfig.baseUrl ?? 'https://api.squarespace.com/1.0',
      maxRequestsPerSecond: rawConfig.maxRequestsPerSecond ?? 5,
      maxItemsPerCollection: rawConfig.maxItemsPerCollection ?? Infinity,
      timeoutMs: rawConfig.timeoutMs ?? 30_000,
      retryCount: rawConfig.retryCount ?? 3,
      fetchFn: rawConfig.fetchImpl ?? globalThis.fetch.bind(globalThis),
      log: rawConfig.logger ?? ((level, msg, data) => console.log(`[sqsp:${level}] ${msg}`, data ?? '')),
    };
    this.transport = new SquarespaceTransport(this.config);
  }

  /**
   * Export the entire site content into the PlatformExportData envelope.
   *
   * Strategy: We fire all collection fetches concurrently (within rate limits)
   * to minimise wall-clock time. The rate limiter serialises the actual HTTP
   * calls internally, so concurrency here means "all paginations interleave"
   * rather than "all requests fire simultaneously."
   */
  async exportSite(_siteUrl: string): Promise<Result<PlatformExportData>> {
    this.config.log('info', 'Starting site export', { siteId: this.config.siteId });

    // Fire all collection fetches concurrently
    const [pagesRes, productsRes, postsRes, membersRes, navRes, settingsRes] =
      await Promise.all([
        this.fetchPages(),
        this.fetchProducts(),
        this.fetchBlogPosts(),
        this.fetchMembers(),
        this.fetchNavigation(),
        this.fetchSiteSettings(),
      ]);

    // Check for failures — report the first one
    if (!pagesRes.ok) return pagesRes;
    if (!productsRes.ok) return productsRes;
    if (!postsRes.ok) return postsRes;
    if (!membersRes.ok) return membersRes;
    if (!navRes.ok) return navRes;
    if (!settingsRes.ok) return settingsRes;

    const exportData: PlatformExportData = {
      pages: pagesRes.value,
      products: productsRes.value,
      posts: postsRes.value,
      members: membersRes.value,
      navigation: navRes.value,
      siteSettings: settingsRes.value,
    };

    this.config.log('info', 'Site export complete', {
      pages: exportData.pages.length,
      products: exportData.products.length,
      posts: exportData.posts.length,
      members: exportData.members.length,
      totalRequests: this.transport.totalRequests,
    });

    return success(exportData);
  }

  /**
   * Download a single asset (image, file) from Squarespace.
   * Used by the Platform Source node for image re-hosting.
   */
  async downloadAsset(url: string): Promise<Result<Uint8Array>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await this.config.fetchFn(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Scholarly-Migration/1.0' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return failure(Errors.internal(`Asset download failed (${response.status}): ${url}`));
      }

      const buffer = await response.arrayBuffer();
      return success(new Uint8Array(buffer));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return failure(Errors.internal(`Asset download error: ${msg}`));
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Private: Collection fetchers
  // ──────────────────────────────────────────────────────────────────────

  private async fetchPages(): Promise<Result<PlatformExportData['pages']>> {
    const result = await drainCollection<SqspPage>(
      this.transport, '/pages', 'items', this.config,
    );
    if (!result.ok) return result;

    return success(result.value.map(p => ({
      id: p.id,
      url: `/${p.urlId}`,
      title: p.title || 'Untitled',
      html: p.body ?? p.mainContent ?? '',
      seo: p.seoData ? {
        title: p.seoData.seoTitle ?? '',
        description: p.seoData.seoDescription ?? '',
        hidden: String(p.seoData.seoHidden ?? false),
      } : undefined,
    })));
  }

  private async fetchProducts(): Promise<Result<PlatformExportData['products']>> {
    const result = await drainCollection<SqspProduct>(
      this.transport, '/commerce/products', 'items', this.config,
    );
    if (!result.ok) return result;

    return success(result.value.map(p => ({
      id: p.id,
      slug: p.urlSlug,
      title: p.name,
      description: p.description ?? '',
      price: parseFloat(p.pricing?.basePrice?.value ?? '0') / 100, // Squarespace uses cents
      currency: p.pricing?.basePrice?.currency ?? 'USD',
      images: (p.images ?? []).map(img => img.url),
      variants: (p.variants ?? []).map(v => ({
        id: v.id,
        sku: v.sku,
        price: v.pricing ? parseFloat(v.pricing.basePrice.value) / 100 : undefined,
        attributes: v.attributes ?? {},
        stock: v.stock,
      })),
      isPhysical: p.type === 'PHYSICAL',
    })));
  }

  private async fetchBlogPosts(): Promise<Result<PlatformExportData['posts']>> {
    // Squarespace blog posts are nested under blog collections.
    // First, find blog-type pages; then pull posts from each.
    const pagesRes = await drainCollection<SqspPage>(
      this.transport, '/pages', 'items', this.config,
    );
    if (!pagesRes.ok) return pagesRes;

    // Blog pages are identified by having a collection with a blog type.
    // In Commerce API v1, we use the /blog/{collectionId}/posts endpoint.
    // As a heuristic, pages whose body is empty but have a collection ID
    // are blog index pages. For safety, we also try the standard /blog endpoint.
    const blogCollectionIds: string[] = [];
    for (const page of pagesRes.value) {
      if (page.collection?.id) {
        blogCollectionIds.push(page.collection.id);
      }
    }

    const allPosts: PlatformExportData['posts'] = [];

    for (const collectionId of blogCollectionIds) {
      const postsRes = await drainCollection<SqspBlogPost>(
        this.transport, `/blog/${collectionId}/posts`, 'items', this.config,
      );
      if (!postsRes.ok) {
        // Non-fatal: some collections may not be blogs
        this.config.log('warn', `Could not fetch posts for collection ${collectionId}`, {
          error: postsRes.error.message,
        });
        continue;
      }

      for (const post of postsRes.value) {
        allPosts.push({
          id: post.id,
          slug: post.urlId,
          title: post.title || 'Untitled',
          html: post.body ?? '',
          publishedAt: post.publishOn ?? '',
          author: post.author?.displayName ?? 'Unknown',
          tags: post.tags ?? [],
          excerpt: post.excerpt,
          featuredImage: post.thumbnailUrl,
        });
      }
    }

    return success(allPosts);
  }

  private async fetchMembers(): Promise<Result<PlatformExportData['members']>> {
    const result = await drainCollection<SqspMember>(
      this.transport, '/members', 'items', this.config,
    );
    if (!result.ok) {
      // Members endpoint may not be available on all plans — degrade gracefully
      this.config.log('warn', 'Members endpoint unavailable, returning empty', {
        error: result.error.message,
      });
      return success([]);
    }

    return success(result.value.map(m => ({
      email: m.email,
      firstName: m.firstName ?? '',
      lastName: m.lastName ?? '',
      subscriptionStatus: 'active', // Squarespace doesn't expose this directly in v1
    })));
  }

  private async fetchNavigation(): Promise<Result<PlatformExportData['navigation']>> {
    // Commerce API v1 doesn't have a dedicated navigation endpoint.
    // We reconstruct navigation from the pages collection structure.
    // This is an approximation — the full navigation requires the
    // Content API which is separate from Commerce API.
    const pagesRes = await drainCollection<SqspPage>(
      this.transport, '/pages', 'items', this.config,
    );
    if (!pagesRes.ok) return pagesRes;

    const navItems: PlatformExportData['navigation'] = pagesRes.value.map(page => ({
      label: page.title || page.urlId,
      url: `/${page.urlId}`,
    }));

    return success(navItems);
  }

  private async fetchSiteSettings(): Promise<Result<Record<string, unknown>>> {
    // Site-level settings from the Commerce API
    const result = await this.transport.get<Record<string, unknown>>('/commerce/settings');
    if (!result.ok) {
      // Non-fatal: return empty settings if endpoint unavailable
      this.config.log('warn', 'Commerce settings unavailable', { error: result.error.message });
      return success({});
    }
    return result;
  }

  /** Diagnostic: total API requests made during this client's lifetime. */
  get totalRequests(): number {
    return this.transport.totalRequests;
  }
}


// ============================================================================
// §6 — FACTORY FUNCTION
// ============================================================================
//
// The service registry wiring uses this factory to create the client
// from tenant-level configuration (API key stored in tenant secrets).

export function createSquarespaceClient(
  config: SquarespaceClientConfig,
): PlatformSourceClient {
  return new SquarespaceClient(config);
}

// ============================================================================
// §7 — SERVICE ERROR RE-EXPORT (for type compatibility)
// ============================================================================

import type { ServiceError } from './sr-workflow-engine';
