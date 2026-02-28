/**
 * ============================================================================
 * Squarespace API Client — Production Integration
 * ============================================================================
 *
 * Implements the SquarespaceApiClient interface defined in migration.service.ts.
 * This is the moving truck: it connects to a Squarespace site, inventories
 * everything that needs to come with us, and loads it onto the Scholarly platform.
 *
 * Squarespace exposes two useful APIs:
 *   1. Commerce API (api.squarespace.com/1.0/commerce) — Products, orders, inventory
 *   2. Content Export — JSON export of pages, blog posts, and site structure
 *
 * For sites where API access isn't available (the tutor hasn't connected their
 * Squarespace API key), we fall back to structured scraping of the public site
 * using the Squarespace JSON endpoints that every Squarespace site exposes at
 * /{page-slug}?format=json.
 *
 * ## Environment Variables
 *   SQUARESPACE_API_KEY  — API key for authenticated access (optional)
 *   HTTP_TIMEOUT_MS      — HTTP request timeout (default: 30000)
 *
 * @module erudits/integrations/squarespace-client
 * @version 1.0.0
 */

import type { Result } from '../types/erudits.types';
import { success, failure, Errors } from '../types/erudits.types';

// ── Types ──

/**
 * The complete export data from a Squarespace site. This is the "moving
 * inventory" — every page, product, blog post, and media asset that the
 * migration service needs to process.
 */
export interface SquarespaceExportData {
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  pages: SquarespacePage[];
  products: SquarespaceProduct[];
  blogPosts: SquarespaceBlogPost[];
  mediaAssets: SquarespaceMediaAsset[];
  navigation: SquarespaceNavItem[];
  memberCount?: number | undefined;
}

export interface SquarespacePage {
  id: string;
  title: string;
  slug: string;
  content: string;          // HTML body
  seoTitle?: string | undefined;
  seoDescription?: string | undefined;
  updatedAt: string;
}

export interface SquarespaceProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  images: string[];
  tags: string[];
  isDigital: boolean;
  fileUrl?: string;         // For digital downloads
  variants: Array<{
    id: string;
    label: string;
    priceCents: number;
  }>;
}

export interface SquarespaceBlogPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt?: string | undefined;
  publishedAt: string;
  categories: string[];
  tags: string[];
  featuredImage?: string | undefined;
}

export interface SquarespaceMediaAsset {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number | undefined;
  context: 'page' | 'product' | 'blog' | 'gallery';
  sourceEntityId: string;
}

export interface SquarespaceNavItem {
  title: string;
  slug: string;
  type: 'page' | 'link' | 'folder';
  children?: SquarespaceNavItem[] | undefined;
}

// ── HTTP Client Interface ──

interface HttpClient {
  get<T>(url: string, options?: { headers?: Record<string, string>; timeout?: number }): Promise<{ status: number; data: T }>;
  getBuffer(url: string, options?: { timeout?: number }): Promise<{ status: number; data: Buffer }>;
}

// ── Implementation ──

export class SquarespaceApiClientImpl {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKey?: string,
    private readonly timeoutMs: number = 30_000,
  ) {}

  /**
   * Export all content from a Squarespace site.
   *
   * Strategy:
   *   1. If API key is provided, use the Commerce API for products
   *   2. Crawl the site's JSON endpoints for pages and blog posts
   *   3. Extract all media URLs referenced in content
   *   4. Build the navigation tree from the site header
   */
  async exportSite(siteUrl: string): Promise<Result<SquarespaceExportData>> {
    try {
      const baseUrl = this.normaliseUrl(siteUrl);

      // Fetch site metadata via the universal JSON endpoint
      const siteData = await this.fetchSiteJson(baseUrl);
      if (!siteData.success) return siteData;

      // Fetch pages
      const pages = await this.fetchPages(baseUrl, siteData.data.navigation);

      // Fetch products (Commerce API or JSON endpoint)
      const products = this.apiKey
        ? await this.fetchProductsViaApi(baseUrl)
        : await this.fetchProductsViaJson(baseUrl);

      // Fetch blog posts
      const blogPosts = await this.fetchBlogPosts(baseUrl);

      // Extract all media assets from pages, products, and blog posts
      const mediaAssets = this.extractMediaAssets(pages, products, blogPosts);

      return success({
        siteTitle: siteData.data.siteTitle,
        siteDescription: siteData.data.siteDescription,
        siteUrl: baseUrl,
        pages,
        products,
        blogPosts,
        mediaAssets,
        navigation: siteData.data.navigation,
      });
    } catch (err) {
      return failure(Errors.external('Squarespace', `Export failed: ${(err as Error).message}`));
    }
  }

  /**
   * Download a single asset from the Squarespace CDN.
   * Used during the import phase to copy media to our S3 bucket.
   */
  async downloadAsset(url: string): Promise<Result<Buffer>> {
    try {
      const response = await this.http.getBuffer(url, { timeout: this.timeoutMs });
      if (response.status !== 200) {
        return failure(Errors.external('Squarespace', `Asset download returned ${response.status}`));
      }
      return success(response.data);
    } catch (err) {
      return failure(Errors.external('Squarespace', `Asset download failed: ${(err as Error).message}`));
    }
  }

  // ── Private Helpers ──

  private normaliseUrl(url: string): string {
    // Strip trailing slashes and ensure https
    let normalised = url.trim().replace(/\/+$/, '');
    if (!normalised.startsWith('http')) {
      normalised = `https://${normalised}`;
    }
    return normalised;
  }

  private async fetchSiteJson(baseUrl: string): Promise<Result<{
    siteTitle: string;
    siteDescription: string;
    navigation: SquarespaceNavItem[];
  }>> {
    try {
      const response = await this.http.get<Record<string, unknown>>(
        `${baseUrl}/?format=json`,
        { timeout: this.timeoutMs },
      );

      const data = response.data;
      const website = (data.website || data) as Record<string, unknown>;

      return success({
        siteTitle: (website.siteTitle as string) || '',
        siteDescription: (website.siteDescription as string) || '',
        navigation: this.parseNavigation(website.navigation as unknown[]),
      });
    } catch (err) {
      return failure(Errors.external('Squarespace', `Site JSON fetch failed: ${(err as Error).message}`));
    }
  }

  private async fetchPages(
    baseUrl: string,
    navigation: SquarespaceNavItem[],
  ): Promise<SquarespacePage[]> {
    const pages: SquarespacePage[] = [];
    const slugs = this.flattenNavSlugs(navigation);

    for (const slug of slugs) {
      try {
        const response = await this.http.get<Record<string, unknown>>(
          `${baseUrl}/${slug}?format=json`,
          { timeout: this.timeoutMs },
        );

        const collection = response.data.collection as Record<string, unknown> | undefined;
        if (collection) {
          pages.push({
            id: (collection.id as string) || slug,
            title: (collection.title as string) || slug,
            slug,
            content: (collection.mainContent as string) || '',
            seoTitle: collection.seoTitle as string | undefined,
            seoDescription: collection.seoDescription as string | undefined,
            updatedAt: (collection.updatedOn as string) || new Date().toISOString(),
          });
        }
      } catch {
        // Some nav items may not be fetchable (external links, etc.)
        continue;
      }
    }

    return pages;
  }

  private async fetchProductsViaApi(_baseUrl: string): Promise<SquarespaceProduct[]> {
    // Commerce API: GET https://api.squarespace.com/1.0/commerce/products
    // Requires API key authentication
    try {
      const response = await this.http.get<{ products: Array<Record<string, unknown>> }>(
        'https://api.squarespace.com/1.0/commerce/products',
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'User-Agent': 'Scholarly-Migration/1.0',
          },
          timeout: this.timeoutMs,
        },
      );

      return (response.data.products || []).map((p) => this.mapApiProduct(p));
    } catch {
      return [];
    }
  }

  private async fetchProductsViaJson(baseUrl: string): Promise<SquarespaceProduct[]> {
    // Fallback: try the /shop or /store JSON endpoint
    for (const shopSlug of ['shop', 'store', 'products', 'resources']) {
      try {
        const response = await this.http.get<Record<string, unknown>>(
          `${baseUrl}/${shopSlug}?format=json`,
          { timeout: this.timeoutMs },
        );

        const items = response.data.items as Array<Record<string, unknown>> | undefined;
        if (items && items.length > 0) {
          return items.map((item) => this.mapJsonProduct(item));
        }
      } catch {
        continue;
      }
    }
    return [];
  }

  private async fetchBlogPosts(baseUrl: string): Promise<SquarespaceBlogPost[]> {
    // Try common blog slugs
    for (const blogSlug of ['blog', 'news', 'articles', 'snapshots', 'updates']) {
      try {
        const response = await this.http.get<Record<string, unknown>>(
          `${baseUrl}/${blogSlug}?format=json`,
          { timeout: this.timeoutMs },
        );

        const items = response.data.items as Array<Record<string, unknown>> | undefined;
        if (items && items.length > 0) {
          return items.map((item) => this.mapBlogPost(item));
        }
      } catch {
        continue;
      }
    }
    return [];
  }

  private extractMediaAssets(
    pages: SquarespacePage[],
    products: SquarespaceProduct[],
    blogPosts: SquarespaceBlogPost[],
  ): SquarespaceMediaAsset[] {
    const assets: SquarespaceMediaAsset[] = [];
    const seen = new Set<string>();

    // Extract from page content
    for (const page of pages) {
      const urls = this.extractImageUrls(page.content);
      for (const url of urls) {
        if (!seen.has(url)) {
          seen.add(url);
          assets.push({
            id: this.hashUrl(url),
            url,
            fileName: this.fileNameFromUrl(url),
            mimeType: this.guessMimeType(url),
            context: 'page',
            sourceEntityId: page.id,
          });
        }
      }
    }

    // Extract from product images
    for (const product of products) {
      for (const imageUrl of product.images) {
        if (!seen.has(imageUrl)) {
          seen.add(imageUrl);
          assets.push({
            id: this.hashUrl(imageUrl),
            url: imageUrl,
            fileName: this.fileNameFromUrl(imageUrl),
            mimeType: this.guessMimeType(imageUrl),
            context: 'product',
            sourceEntityId: product.id,
          });
        }
      }
    }

    // Extract from blog post content and featured images
    for (const post of blogPosts) {
      if (post.featuredImage && !seen.has(post.featuredImage)) {
        seen.add(post.featuredImage);
        assets.push({
          id: this.hashUrl(post.featuredImage),
          url: post.featuredImage,
          fileName: this.fileNameFromUrl(post.featuredImage),
          mimeType: this.guessMimeType(post.featuredImage),
          context: 'blog',
          sourceEntityId: post.id,
        });
      }

      const urls = this.extractImageUrls(post.body);
      for (const url of urls) {
        if (!seen.has(url)) {
          seen.add(url);
          assets.push({
            id: this.hashUrl(url),
            url,
            fileName: this.fileNameFromUrl(url),
            mimeType: this.guessMimeType(url),
            context: 'blog',
            sourceEntityId: post.id,
          });
        }
      }
    }

    return assets;
  }

  // ── Mapping Helpers ──

  private mapApiProduct(p: Record<string, unknown>): SquarespaceProduct {
    const variants = (p.variants as Array<Record<string, unknown>> || []).map((v) => ({
      id: (v.id as string) || '',
      label: (v.sku as string) || '',
      priceCents: Math.round(((v.priceMoney as Record<string, unknown>)?.value as number || 0) * 100),
    }));

    return {
      id: (p.id as string) || '',
      name: (p.name as string) || '',
      slug: (p.urlSlug as string) || '',
      description: (p.description as string) || '',
      priceCents: Math.round(((p.pricing as Record<string, unknown>)?.basePrice as Record<string, unknown>)?.value as number || 0),
      currency: 'AUD',
      images: ((p.images as Array<Record<string, unknown>>) || []).map((img) => (img.url as string) || ''),
      tags: (p.tags as string[]) || [],
      isDigital: (p.isDigital as boolean) || false,
      variants,
    };
  }

  private mapJsonProduct(item: Record<string, unknown>): SquarespaceProduct {
    return {
      id: (item.id as string) || '',
      name: (item.title as string) || '',
      slug: (item.urlId as string) || '',
      description: (item.body as string) || (item.excerpt as string) || '',
      priceCents: Math.round(((item.structuredContent as Record<string, unknown>)?.priceCents as number) || 0),
      currency: 'AUD',
      images: ((item.items as Array<Record<string, unknown>>) || [])
        .map((img) => (img.assetUrl as string) || '')
        .filter(Boolean),
      tags: (item.tags as string[]) || [],
      isDigital: true, // Assume digital for resource storefront context
      variants: [],
    };
  }

  private mapBlogPost(item: Record<string, unknown>): SquarespaceBlogPost {
    return {
      id: (item.id as string) || '',
      title: (item.title as string) || '',
      slug: (item.urlId as string) || '',
      body: (item.body as string) || '',
      excerpt: (item.excerpt as string) || undefined,
      publishedAt: (item.publishOn as string) || new Date().toISOString(),
      categories: (item.categories as string[]) || [],
      tags: (item.tags as string[]) || [],
      featuredImage: (item.assetUrl as string) || undefined,
    };
  }

  private parseNavigation(items: unknown[]): SquarespaceNavItem[] {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const nav = item as Record<string, unknown>;
      return {
        title: (nav.title as string) || '',
        slug: (nav.urlId as string) || (nav.slug as string) || '',
        type: (nav.type === 'folder' ? 'folder' : nav.externalLink ? 'link' : 'page') as 'page' | 'link' | 'folder',
        children: nav.items ? this.parseNavigation(nav.items as unknown[]) : undefined,
      };
    });
  }

  private flattenNavSlugs(items: SquarespaceNavItem[]): string[] {
    const slugs: string[] = [];
    for (const item of items) {
      if (item.type === 'page' && item.slug) {
        slugs.push(item.slug);
      }
      if (item.children) {
        slugs.push(...this.flattenNavSlugs(item.children));
      }
    }
    return slugs;
  }

  // ── Utility Helpers ──

  private extractImageUrls(html: string): string[] {
    const urls: string[] = [];
    const regex = /(?:src|data-src)=["']([^"']+\.(?:jpg|jpeg|png|gif|webp|svg)[^"']*)["']/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (match[1]) urls.push(match[1]);
    }
    return urls;
  }

  private hashUrl(url: string): string {
    // Simple hash for deduplication — not cryptographic
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit int
    }
    return `sqsp_${Math.abs(hash).toString(36)}`;
  }

  private fileNameFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      return pathname.split('/').pop() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private guessMimeType(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
      pdf: 'application/pdf', mp4: 'video/mp4', mp3: 'audio/mpeg',
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
  }
}

// ── Factory ──

export function createSquarespaceApiClient(
  http: HttpClient,
  apiKey?: string,
  timeoutMs?: number,
): SquarespaceApiClientImpl {
  return new SquarespaceApiClientImpl(http, apiKey, timeoutMs);
}
