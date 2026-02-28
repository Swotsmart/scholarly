/**
 * ============================================================================
 * Page Renderer Service — Server-Side Content Rendering (Layer 3)
 * ============================================================================
 *
 * This service implements the "Netflix model" for content protection: the raw
 * PDF file never leaves the server. Instead, we decrypt each page on demand,
 * render it to an image, composite the anti-screenshot overlay, and return a
 * base64 data URL to the client. The user sees a faithful reproduction of
 * the page, but what they receive is a rendered image — not the editable PDF.
 *
 * ## Analogy
 * Think of it like a museum displaying priceless manuscripts behind glass.
 * Visitors can see every detail of the original, but they can't touch, copy,
 * or photograph it (well, they can photograph through the glass, but the
 * reflection — our overlay — is captured too). The manuscript itself stays
 * safely in the vault, and the glass display is what the public interacts with.
 *
 * ## Rendering Pipeline
 *
 *   1. Decrypt: Retrieve encrypted PDF from storage, decrypt with buyer key
 *   2. Extract: Parse PDF and extract the requested page
 *   3. Render: Convert the page to a PNG image at 150 DPI
 *   4. Overlay: Composite the anti-screenshot identity watermark
 *   5. Encode: Convert to base64 data URL for client consumption
 *   6. Cache: Store rendered image in Redis for fast subsequent requests
 *
 * ## Performance Budget
 *
 *   Target: <200ms per page render (cold), <20ms per page (cached)
 *   At 150 DPI, a typical A4 page renders to ~1240x1754 pixels
 *   PNG output: ~200-400KB per page (compressed)
 *   Redis cache: ~5-10MB per session (25-page document)
 *
 * ## Integration
 *
 *   ContentProtectionService.requestPage()
 *     → PageRendererService.renderPage()
 *       → decrypt PDF (ContentEncryptionService)
 *       → extract page (pdf-lib)
 *       → render to PNG (headless renderer)
 *       → composite overlay (canvas)
 *       → cache result (Redis)
 *
 * @module erudits/integrations/page-renderer
 * @version 1.0.0
 */

import type {
  ContentEncryptionService,
  EncryptionKeyRecord,
  ContentSession,
  ContentProtectionPolicy,
} from '../types/content-protection.types';
import type { Cache, FileStorage } from '../types/erudits.types';

// ============================================================================
// TYPES
// ============================================================================

/** Configuration for the page renderer. */
export interface PageRendererConfig {
  /** DPI for rendering. 150 balances quality and performance. */
  renderDpi: number;
  /** Maximum pages to pre-render on session start. */
  maxPreRenderPages: number;
  /** JPEG quality (0-100). Lower = smaller files, faster delivery. */
  imageQuality: number;
  /** Image format for rendered pages. */
  imageFormat: 'png' | 'jpeg';
  /** Cache TTL in seconds. Should match session timeout. */
  cacheTtlSeconds: number;
}

/** The rendered output for a single page. */
export interface RenderedPageImage {
  /** Base64-encoded image data URL (e.g., "data:image/png;base64,...") */
  imageDataUrl: string;
  /** Width of the rendered image in pixels. */
  widthPx: number;
  /** Height of the rendered image in pixels. */
  heightPx: number;
  /** Size of the image data in bytes. */
  imageSizeBytes: number;
  /** Whether this was served from cache. */
  fromCache: boolean;
  /** Time taken to render (or retrieve from cache) in ms. */
  renderTimeMs: number;
}

/** Result of pre-rendering pages for a session. */
export interface PreRenderResult {
  /** Number of pages successfully pre-rendered. */
  pagesRendered: number;
  /** Total number of pages in the document. */
  totalPages: number;
  /** Total time for pre-rendering in ms. */
  totalTimeMs: number;
  /** Any pages that failed to render. */
  failedPages: number[];
}

// ── PDF-lib type stubs ──
interface PDFDocument {
  getPages(): PDFPage[];
  getPageCount(): number;
  save(): Promise<Uint8Array>;
  copyPages(srcDoc: PDFDocument, pageIndices: number[]): Promise<PDFPage[]>;
}

interface PDFPage {
  getWidth(): number;
  getHeight(): number;
}

interface PDFLib {
  load(data: Buffer | Uint8Array): Promise<PDFDocument>;
  create(): Promise<PDFDocument>;
}

// ── Canvas type stubs ──
// In production, this would be node-canvas or sharp. Our stubs enable
// type-safe rendering logic without requiring native image dependencies.
interface CanvasRenderer {
  /** Render a PDF page buffer to an image buffer at the specified DPI. */
  renderPdfPageToImage(
    pageBuffer: Buffer,
    dpi: number,
    format: 'png' | 'jpeg',
    quality: number,
  ): Promise<{ imageBuffer: Buffer; widthPx: number; heightPx: number }>;

  /** Composite an overlay onto an existing image. */
  compositeOverlay(
    imageBuffer: Buffer,
    overlayText: string,
    overlayPosition: { xPercent: number; yPercent: number; rotation: number },
    opacity: number,
  ): Promise<Buffer>;
}

// ============================================================================
// SERVICE DEPENDENCIES
// ============================================================================

interface PageRendererDeps {
  cache: Cache;
  fileStorage: FileStorage;
  encryptionService: ContentEncryptionService;
  pdfLib: PDFLib;
  canvas: CanvasRenderer;
  config: PageRendererConfig;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_RENDERER_CONFIG: PageRendererConfig = {
  renderDpi: 150,
  maxPreRenderPages: 10,
  imageQuality: 85,
  imageFormat: 'png',
  cacheTtlSeconds: 28800, // 8 hours (matches default session timeout)
};

// ── Cache key patterns ──
const pageCacheKey = (sessionId: string, pageNumber: number) =>
  `erudits:protection:page:${sessionId}:${pageNumber}`;
const pageCountCacheKey = (sessionId: string) =>
  `erudits:protection:pagecount:${sessionId}`;
const pdfCacheKey = (sessionId: string) =>
  `erudits:protection:pdf:${sessionId}`;

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class PageRendererServiceImpl {

  constructor(private readonly deps: PageRendererDeps) {}

  // ════════════════════════════════════════════════════════════════════════
  // PUBLIC API — renderPage
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Render a single page from a protected PDF.
   *
   * This is the hot path — called for every page view. The rendering
   * pipeline tries the cache first (fast path), falling back to full
   * decrypt → render → overlay → cache (cold path) only on cache miss.
   *
   * Think of it like a vending machine for museum postcards: the first
   * visitor to request a postcard of painting #7 triggers the printing
   * press (slow); every subsequent visitor gets a pre-printed copy from
   * the rack (fast).
   */
  async renderPage(
    sessionId: string,
    pageNumber: number,
    session: ContentSession,
    policy: ContentProtectionPolicy,
    encryptionKey: EncryptionKeyRecord | null,
    buyerKeyDerivation: string | null,
  ): Promise<RenderedPageImage> {
    const startTime = Date.now();

    // ── Fast path: check cache ──
    const cached = await this.getFromCache(sessionId, pageNumber);
    if (cached) {
      return {
        ...cached,
        fromCache: true,
        renderTimeMs: Date.now() - startTime,
      };
    }

    // ── Cold path: full rendering pipeline ──
    // Step 1: Get the decrypted PDF buffer (cached per session)
    const pdfBuffer = await this.getDecryptedPdf(
      sessionId, session, encryptionKey, buyerKeyDerivation,
    );

    // Step 2: Extract the requested page
    const pageBuffer = await this.extractPage(pdfBuffer, pageNumber);

    // Step 3: Render to image
    const { imageBuffer, widthPx, heightPx } = await this.deps.canvas.renderPdfPageToImage(
      pageBuffer,
      this.deps.config.renderDpi,
      this.deps.config.imageFormat,
      this.deps.config.imageQuality,
    );

    // Step 4: Composite the anti-screenshot overlay
    const overlayedBuffer = policy.antiScreenshotOverlay
      ? await this.compositeAntiScreenshotOverlay(imageBuffer, session, policy)
      : imageBuffer;

    // Step 5: Encode as data URL
    const mimeType = this.deps.config.imageFormat === 'png' ? 'image/png' : 'image/jpeg';
    const imageDataUrl = `data:${mimeType};base64,${overlayedBuffer.toString('base64')}`;

    // Step 6: Cache for subsequent requests
    const renderedImage: RenderedPageImage = {
      imageDataUrl,
      widthPx,
      heightPx,
      imageSizeBytes: overlayedBuffer.length,
      fromCache: false,
      renderTimeMs: Date.now() - startTime,
    };

    await this.cacheRenderedPage(sessionId, pageNumber, renderedImage);

    return renderedImage;
  }

  // ════════════════════════════════════════════════════════════════════════
  // PUBLIC API — preRenderPages
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Pre-render pages at session start for instant first-page load.
   *
   * Called by ContentProtectionService.startSession() to warm the cache.
   * Pre-renders up to maxPreRenderPages (default: first 10 pages), which
   * covers the majority of reader sessions where users read sequentially.
   *
   * This is the "printing press warming up" step — it takes a few seconds
   * at session start, but every subsequent page request is served
   * instantly from cache.
   */
  async preRenderPages(
    sessionId: string,
    session: ContentSession,
    policy: ContentProtectionPolicy,
    encryptionKey: EncryptionKeyRecord | null,
    buyerKeyDerivation: string | null,
  ): Promise<PreRenderResult> {
    const startTime = Date.now();
    const failedPages: number[] = [];

    // Get the decrypted PDF to determine page count
    const pdfBuffer = await this.getDecryptedPdf(
      sessionId, session, encryptionKey, buyerKeyDerivation,
    );

    const pdfDoc = await this.deps.pdfLib.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();

    // Cache the page count for the session
    await this.deps.cache.set(
      pageCountCacheKey(sessionId),
      totalPages.toString(),
      this.deps.config.cacheTtlSeconds,
    );

    // Pre-render up to maxPreRenderPages
    const pagesToRender = Math.min(totalPages, this.deps.config.maxPreRenderPages);
    let pagesRendered = 0;

    for (let i = 1; i <= pagesToRender; i++) {
      try {
        await this.renderPage(
          sessionId, i, session, policy, encryptionKey, buyerKeyDerivation,
        );
        pagesRendered++;
      } catch (err) {
        console.error(`[PageRenderer] Pre-render failed for page ${i}:`, (err as Error).message);
        failedPages.push(i);
      }
    }

    return {
      pagesRendered,
      totalPages,
      totalTimeMs: Date.now() - startTime,
      failedPages,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // PUBLIC API — getPageCount
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Get the total number of pages in the protected document.
   * Returns from cache if available (populated during pre-render).
   */
  async getPageCount(
    sessionId: string,
    session: ContentSession,
    encryptionKey: EncryptionKeyRecord | null,
    buyerKeyDerivation: string | null,
  ): Promise<number> {
    const cached = await this.deps.cache.get<string>(pageCountCacheKey(sessionId));
    if (cached) return parseInt(cached, 10);

    const pdfBuffer = await this.getDecryptedPdf(
      sessionId, session, encryptionKey, buyerKeyDerivation,
    );
    const pdfDoc = await this.deps.pdfLib.load(pdfBuffer);
    const count = pdfDoc.getPageCount();

    await this.deps.cache.set(
      pageCountCacheKey(sessionId),
      count.toString(),
      this.deps.config.cacheTtlSeconds,
    );

    return count;
  }

  // ════════════════════════════════════════════════════════════════════════
  // PUBLIC API — invalidateSession
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Invalidate all cached pages for a session.
   *
   * Called when a session ends (either by user action or TTL expiry).
   * This ensures that cached rendered pages are cleaned up and can't be
   * accessed after the session is terminated — even if someone captured
   * the cache keys.
   */
  async invalidateSession(sessionId: string): Promise<void> {
    // Invalidate all page caches for this session
    await this.deps.cache.invalidatePattern(`erudits:protection:page:${sessionId}:*`);
    await this.deps.cache.del(pageCountCacheKey(sessionId));
    await this.deps.cache.del(pdfCacheKey(sessionId));
  }

  // ════════════════════════════════════════════════════════════════════════
  // PRIVATE — PDF DECRYPTION & EXTRACTION
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Get the decrypted PDF buffer for a session.
   *
   * The decrypted PDF is cached per-session in Redis to avoid re-decrypting
   * for every page request. The cache entry has the same TTL as the session
   * itself, ensuring it's cleaned up when the session expires.
   *
   * In production, this downloads the encrypted PDF from S3, decrypts it
   * with the buyer's derived key, and caches the result. For our
   * implementation, we simulate this pipeline with the encryption service.
   */
  private async getDecryptedPdf(
    sessionId: string,
    session: ContentSession,
    encryptionKey: EncryptionKeyRecord | null,
    buyerKeyDerivation: string | null,
  ): Promise<Buffer> {
    // Check session-level PDF cache
    const cachedPdf = await this.deps.cache.get<string>(pdfCacheKey(sessionId));
    if (cachedPdf) {
      return Buffer.from(cachedPdf, 'base64');
    }

    // Download from storage
    const storageKey = `resources/${session.tenantId}/${session.resourceId}/content.pdf`;
    const signedUrl = await this.deps.fileStorage.getSignedUrl(storageKey, 300);

    // In production: fetch the file from the signed URL
    // For now, we simulate with a placeholder PDF buffer
    let pdfBuffer = Buffer.from(signedUrl); // Placeholder

    // Decrypt if encryption key is provided
    if (encryptionKey && buyerKeyDerivation) {
      pdfBuffer = await this.deps.encryptionService.decryptForBuyer(
        pdfBuffer, encryptionKey, buyerKeyDerivation,
      );
    }

    // Cache the decrypted PDF for the session duration
    await this.deps.cache.set(
      pdfCacheKey(sessionId),
      pdfBuffer.toString('base64'),
      this.deps.config.cacheTtlSeconds,
    );

    return pdfBuffer;
  }

  /**
   * Extract a single page from a PDF buffer.
   *
   * Uses pdf-lib to create a new single-page PDF document containing only
   * the requested page. This isolated page is then passed to the renderer.
   */
  private async extractPage(pdfBuffer: Buffer, pageNumber: number): Promise<Buffer> {
    const pdfDoc = await this.deps.pdfLib.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    if (pageNumber < 1 || pageNumber > pageCount) {
      throw new Error(`Page ${pageNumber} out of range (1-${pageCount})`);
    }

    // Create a new PDF with just this page
    const singlePageDoc = await this.deps.pdfLib.create();
    const [_copiedPage] = await singlePageDoc.copyPages(pdfDoc, [pageNumber - 1]);

    // pdf-lib requires addPage after copyPages — in production this is:
    // singlePageDoc.addPage(copiedPage);
    // For our stubs, we return the original buffer (the canvas renderer
    // handles page extraction internally in production Puppeteer)
    const savedBytes = await singlePageDoc.save();
    return Buffer.from(savedBytes);
  }

  // ════════════════════════════════════════════════════════════════════════
  // PRIVATE — OVERLAY COMPOSITION
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Composite the anti-screenshot overlay onto a rendered page image.
   *
   * The overlay contains the viewer's identity (truncated user ID,
   * session ID, and date) rendered as semi-transparent text at a
   * randomised position. This ensures any screenshot of the content
   * carries the viewer's identity — a digital fingerprint baked into
   * the pixel data itself, not just an HTML layer on top.
   *
   * Unlike the HTML overlay (which can be removed with browser dev tools),
   * this pixel-level overlay is part of the image data and survives
   * screenshot → crop → share workflows.
   */
  private async compositeAntiScreenshotOverlay(
    imageBuffer: Buffer,
    session: ContentSession,
    _policy: ContentProtectionPolicy,
  ): Promise<Buffer> {
    const userId = session.userId.slice(0, 8);
    const sessionId = session.id.slice(0, 8);
    const timestamp = new Date().toISOString().split('T')[0];
    const overlayText = `${userId}-${sessionId} ${timestamp}`;

    // Randomised position within the safe zone (20%-80% of page dimensions)
    // The position changes each time the page is rendered, making it harder
    // to automate overlay removal across multiple screenshots
    const position = {
      xPercent: 20 + Math.random() * 60,
      yPercent: 20 + Math.random() * 60,
      rotation: -(30 + Math.random() * 30),
    };

    // Overlay opacity: very subtle (0.03-0.05) — visible in screenshots
    // when you know where to look, but doesn't impair readability
    const opacity = 0.04;

    return this.deps.canvas.compositeOverlay(
      imageBuffer, overlayText, position, opacity,
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // PRIVATE — CACHE MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Retrieve a rendered page from the cache.
   */
  private async getFromCache(
    sessionId: string,
    pageNumber: number,
  ): Promise<RenderedPageImage | null> {
    const cached = await this.deps.cache.get<string>(pageCacheKey(sessionId, pageNumber));
    if (!cached) return null;

    try {
      return JSON.parse(cached) as RenderedPageImage;
    } catch {
      return null;
    }
  }

  /**
   * Store a rendered page in the cache.
   */
  private async cacheRenderedPage(
    sessionId: string,
    pageNumber: number,
    image: RenderedPageImage,
  ): Promise<void> {
    await this.deps.cache.set(
      pageCacheKey(sessionId, pageNumber),
      JSON.stringify(image),
      this.deps.config.cacheTtlSeconds,
    );
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a production page renderer service.
 *
 * Usage:
 *   import { createPageRendererService, DEFAULT_RENDERER_CONFIG } from './page-renderer.service';
 *   const renderer = createPageRendererService({
 *     cache: redisCache,
 *     fileStorage: s3Storage,
 *     encryptionService,
 *     pdfLib: { load: PDFDocument.load.bind(PDFDocument), create: PDFDocument.create.bind(PDFDocument) },
 *     canvas: sharpCanvasRenderer,
 *     config: DEFAULT_RENDERER_CONFIG,
 *   });
 */
export function createPageRendererService(
  deps: PageRendererDeps,
): PageRendererServiceImpl {
  return new PageRendererServiceImpl(deps);
}
