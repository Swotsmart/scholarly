/**
 * ============================================================================
 * Puppeteer Canvas Renderer — Production PDF→PNG Rendering
 * ============================================================================
 *
 * This module implements the CanvasRenderer interface from page-renderer.service.ts
 * using headless Chromium (via Puppeteer) for PDF rendering and sharp for image
 * composition.
 *
 * ## Why Puppeteer?
 *
 * PDF rendering is surprisingly hard. A PDF isn't just "text + images" — it's
 * a full page description language with transparency, colour spaces, font
 * subsetting, vector paths, and form fields. Libraries like pdf-lib can parse
 * and manipulate PDF structure, but they can't *render* it to pixels. For that,
 * you need a real layout engine.
 *
 * Chromium's PDF renderer (PDFium) is battle-tested across billions of documents.
 * Rather than reimplementing PDF rendering (poorly), we delegate to the best
 * renderer available and capture its output as a screenshot. Think of it as
 * hiring a professional photographer to take a picture of each page, rather
 * than trying to redraw the page yourself with crayons.
 *
 * ## Browser Pool
 *
 * Launching a Chromium instance per request would be like starting a car engine
 * every time you need to check the time on the dashboard clock. Instead, we
 * maintain a pool of warm browser instances that are reused across requests.
 * Each rendering job borrows a browser from the pool, opens a tab, does its
 * work, closes the tab, and returns the browser. The pool manages lifecycle,
 * health checks, and graceful shutdown.
 *
 * ## Sharp for Overlay
 *
 * The anti-screenshot overlay is composited using sharp (libvips), which is
 * dramatically faster than Puppeteer for image manipulation. Rendering the
 * PDF page uses Puppeteer; compositing the watermark onto the result uses
 * sharp. Right tool for each job.
 *
 * ## Dependencies
 *
 * Production:
 *   npm install puppeteer sharp
 *
 * The module exports a factory function that accepts the real puppeteer and
 * sharp modules as parameters, keeping the dependency injection pattern
 * consistent with the rest of the codebase and enabling testing with mocks.
 *
 * @module erudits/integrations/puppeteer-canvas
 * @version 1.0.0
 */

// ============================================================================
// TYPES — Dependency injection interfaces for puppeteer & sharp
// ============================================================================

/**
 * Minimal subset of the Puppeteer API we actually use.
 * This keeps our dependency surface small and mockable.
 */
export interface PuppeteerLike {
  launch(options?: PuppeteerLaunchOptions): Promise<BrowserLike>;
}

export interface PuppeteerLaunchOptions {
  headless?: boolean | 'shell' | undefined;
  args?: string[] | undefined;
  executablePath?: string | undefined;
}

export interface BrowserLike {
  newPage(): Promise<PageLike>;
  close(): Promise<void>;
  connected: boolean;
}

export interface PageLike {
  goto(url: string, options?: { waitUntil?: string | undefined }): Promise<unknown>;
  setViewport(viewport: { width: number; height: number; deviceScaleFactor?: number | undefined }): Promise<void>;
  screenshot(options?: ScreenshotOptions): Promise<Buffer>;
  close(): Promise<void>;
  setContent(html: string, options?: { waitUntil?: string | undefined }): Promise<void>;
}

interface ScreenshotOptions {
  type?: 'png' | 'jpeg' | undefined;
  quality?: number | undefined;
  fullPage?: boolean | undefined;
  encoding?: 'binary' | 'base64' | undefined;
}

/**
 * Minimal subset of the sharp API we use.
 */
export interface SharpLike {
  (input: Buffer): SharpInstance;
}

export interface SharpInstance {
  metadata(): Promise<SharpMetadata>;
  composite(overlays: SharpOverlay[]): SharpInstance;
  png(options?: { quality?: number | undefined }): SharpInstance;
  jpeg(options?: { quality?: number | undefined }): SharpInstance;
  toBuffer(): Promise<Buffer>;
}

interface SharpMetadata {
  width?: number | undefined;
  height?: number | undefined;
  format?: string | undefined;
}

interface SharpOverlay {
  input: Buffer;
  gravity?: string | undefined;
  top?: number | undefined;
  left?: number | undefined;
}

// ============================================================================
// BROWSER POOL
// ============================================================================

export interface BrowserPoolConfig {
  /** Number of browser instances to maintain. Default: 2 */
  poolSize: number;
  /** Max pages a browser handles before recycling. Default: 100 */
  maxPagesPerBrowser: number;
  /** Chromium launch args. Default: sandbox-disabled for containers */
  launchArgs: string[];
  /** Custom Chromium executable path (for Alpine/Docker). */
  executablePath?: string | undefined;
}

export const DEFAULT_POOL_CONFIG: BrowserPoolConfig = {
  poolSize: 2,
  maxPagesPerBrowser: 100,
  launchArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',    // Use /tmp instead of /dev/shm (Docker)
    '--disable-gpu',               // No GPU in containers
    '--disable-software-rasterizer',
    '--single-process',            // Reduce memory in constrained environments
  ],
};

interface PooledBrowser {
  browser: BrowserLike;
  pageCount: number;
  createdAt: number;
  inUse: boolean;
}

/**
 * Browser pool manager.
 *
 * Like a taxi rank at an airport: a fixed number of taxis (browsers) wait
 * for passengers (render jobs). When a passenger arrives, the first available
 * taxi is dispatched. After the trip (page render), the taxi returns to the
 * rank. If a taxi breaks down (browser crashes) or has done too many trips
 * (maxPagesPerBrowser), it's retired and a fresh one takes its place.
 */
export class BrowserPool {
  private pool: PooledBrowser[] = [];
  private initialised = false;

  constructor(
    private readonly puppeteer: PuppeteerLike,
    private readonly config: BrowserPoolConfig = DEFAULT_POOL_CONFIG,
  ) {}

  /**
   * Initialise the pool by launching browser instances.
   * Call once at service startup. Idempotent — safe to call multiple times.
   */
  async initialise(): Promise<void> {
    if (this.initialised) return;

    for (let i = 0; i < this.config.poolSize; i++) {
      const browser = await this.launchBrowser();
      this.pool.push({
        browser,
        pageCount: 0,
        createdAt: Date.now(),
        inUse: false,
      });
    }
    this.initialised = true;
  }

  /**
   * Acquire a browser from the pool for rendering work.
   * Returns the browser instance and a release function that MUST be called
   * when work is complete — like returning a library book.
   */
  async acquire(): Promise<{ browser: BrowserLike; release: () => Promise<void> }> {
    if (!this.initialised) {
      await this.initialise();
    }

    // Find an available browser
    const entry = this.pool.find(e => !e.inUse && e.browser.connected);

    if (!entry) {
      // All browsers busy or disconnected — launch a temporary one
      // This is the "surge pricing" case: demand exceeds pool size
      const browser = await this.launchBrowser();
      return {
        browser,
        release: async () => {
          await browser.close().catch(() => {/* swallow */});
        },
      };
    }

    entry.inUse = true;
    entry.pageCount++;

    return {
      browser: entry.browser,
      release: async () => {
        entry.inUse = false;

        // Recycle if over max pages (prevents memory leaks)
        if (entry.pageCount >= this.config.maxPagesPerBrowser) {
          await this.recycleBrowser(entry);
        }
      },
    };
  }

  /**
   * Shut down all browsers in the pool.
   * Call during graceful shutdown.
   */
  async shutdown(): Promise<void> {
    const closePromises = this.pool.map(entry =>
      entry.browser.close().catch(() => {/* swallow close errors */}),
    );
    await Promise.all(closePromises);
    this.pool = [];
    this.initialised = false;
  }

  /** Current pool status for monitoring. */
  getStatus(): { total: number; available: number; inUse: number } {
    const available = this.pool.filter(e => !e.inUse && e.browser.connected).length;
    const inUse = this.pool.filter(e => e.inUse).length;
    return { total: this.pool.length, available, inUse };
  }

  private async launchBrowser(): Promise<BrowserLike> {
    return this.puppeteer.launch({
      headless: 'shell',
      args: this.config.launchArgs,
      ...(this.config.executablePath ? { executablePath: this.config.executablePath } : {}),
    });
  }

  private async recycleBrowser(entry: PooledBrowser): Promise<void> {
    const idx = this.pool.indexOf(entry);
    if (idx === -1) return;

    // Close old browser
    await entry.browser.close().catch(() => {/* swallow */});

    // Launch replacement
    try {
      const newBrowser = await this.launchBrowser();
      this.pool[idx] = {
        browser: newBrowser,
        pageCount: 0,
        createdAt: Date.now(),
        inUse: false,
      };
    } catch (err) {
      // Remove from pool if we can't replace
      this.pool.splice(idx, 1);
      console.error('[BrowserPool] Failed to recycle browser:', (err as Error).message);
    }
  }
}

// ============================================================================
// PUPPETEER CANVAS RENDERER
// ============================================================================

/**
 * Production implementation of the CanvasRenderer interface.
 *
 * renderPdfPageToImage: Opens the single-page PDF in a headless Chromium tab,
 * captures a screenshot at the configured DPI, and returns the image buffer.
 *
 * compositeOverlay: Uses sharp to draw semi-transparent text onto the
 * rendered image. The text is rendered as an SVG overlay and composited
 * at the configured opacity.
 */
export class PuppeteerCanvasRenderer {
  private readonly pool: BrowserPool;

  constructor(
    puppeteer: PuppeteerLike,
    private readonly sharp: SharpLike,
    poolConfig: BrowserPoolConfig = DEFAULT_POOL_CONFIG,
  ) {
    this.pool = new BrowserPool(puppeteer, poolConfig);
  }

  /**
   * Initialise the browser pool. Call once at service startup.
   */
  async initialise(): Promise<void> {
    await this.pool.initialise();
  }

  /**
   * Shut down the browser pool. Call during graceful shutdown.
   */
  async shutdown(): Promise<void> {
    await this.pool.shutdown();
  }

  /** Pool status for health checks. */
  getPoolStatus(): { total: number; available: number; inUse: number } {
    return this.pool.getStatus();
  }

  /**
   * Render a single-page PDF buffer to an image.
   *
   * Pipeline:
   *   1. Acquire a browser from the pool
   *   2. Open a new tab with the PDF loaded as a data URL
   *   3. Set viewport to match the PDF page dimensions at target DPI
   *   4. Capture a screenshot of the rendered page
   *   5. Release the browser back to the pool
   *
   * The DPI controls quality: 150 DPI renders A4 (8.27" × 11.69") to
   * 1240 × 1754 pixels — enough for comfortable on-screen reading without
   * being large enough for high-quality print reproduction.
   */
  async renderPdfPageToImage(
    pageBuffer: Buffer,
    dpi: number,
    format: 'png' | 'jpeg',
    quality: number,
  ): Promise<{ imageBuffer: Buffer; widthPx: number; heightPx: number }> {
    const { browser, release } = await this.pool.acquire();

    try {
      const page = await browser.newPage();

      try {
        // A4 at target DPI: 8.27" × 11.69" (standard PDF page)
        const widthPx = Math.round(8.27 * dpi);
        const heightPx = Math.round(11.69 * dpi);

        // Set viewport to match target dimensions
        // deviceScaleFactor=1 ensures 1:1 pixel mapping (no retina scaling)
        await page.setViewport({
          width: widthPx,
          height: heightPx,
          deviceScaleFactor: 1,
        });

        // Load the PDF as a data URL — Chromium's built-in PDF viewer
        // renders it using PDFium, the same engine as Chrome desktop
        const pdfDataUrl = `data:application/pdf;base64,${pageBuffer.toString('base64')}`;
        await page.goto(pdfDataUrl, { waitUntil: 'networkidle0' });

        // Capture screenshot of the rendered PDF
        const imageBuffer = await page.screenshot({
          type: format,
          quality: format === 'jpeg' ? quality : undefined,
          fullPage: false,
          encoding: 'binary',
        });

        return {
          imageBuffer: Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer),
          widthPx,
          heightPx,
        };
      } finally {
        await page.close().catch(() => {/* swallow */});
      }
    } finally {
      await release();
    }
  }

  /**
   * Composite a semi-transparent text overlay onto an image.
   *
   * The overlay is rendered as an SVG text element positioned at the
   * specified coordinates with the specified rotation and opacity. Using
   * SVG gives us precise control over font rendering, rotation, and
   * anti-aliasing — and sharp composites it efficiently using libvips.
   *
   * The result is an image where the overlay text is baked into the pixels
   * at ~4% opacity — visible in bulk (e.g., when adjusting levels in
   * Photoshop) but imperceptible during normal reading. Like a UV
   * security thread in a banknote: you don't notice it, but it's there.
   */
  async compositeOverlay(
    imageBuffer: Buffer,
    overlayText: string,
    overlayPosition: { xPercent: number; yPercent: number; rotation: number },
    opacity: number,
  ): Promise<Buffer> {
    const image = this.sharp(imageBuffer);
    const metadata = await image.metadata();

    const width = metadata.width ?? 1240;
    const height = metadata.height ?? 1754;

    // Calculate pixel position from percentage
    const x = Math.round((overlayPosition.xPercent / 100) * width);
    const y = Math.round((overlayPosition.yPercent / 100) * height);
    const rotation = overlayPosition.rotation;

    // Font size: ~2% of page width — readable in screenshots, subtle in reading
    const fontSize = Math.round(width * 0.02);

    // Render the overlay as an SVG with precise positioning
    // The text colour is mid-grey at the specified opacity — this ensures
    // the overlay is visible on both light and dark backgrounds
    const svgOverlay = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <text
          x="${x}" y="${y}"
          font-family="monospace"
          font-size="${fontSize}"
          fill="rgba(128, 128, 128, ${opacity})"
          transform="rotate(${rotation}, ${x}, ${y})"
          text-anchor="middle"
        >${this.escapeXml(overlayText)}</text>
      </svg>
    `.trim());

    // Composite the SVG overlay onto the image
    return this.sharp(imageBuffer)
      .composite([{ input: svgOverlay, gravity: 'northwest', top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  /** Escape XML special characters to prevent SVG injection. */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a production Puppeteer canvas renderer.
 *
 * Usage:
 *   import puppeteer from 'puppeteer';
 *   import sharp from 'sharp';
 *   import { createPuppeteerRenderer } from './puppeteer-canvas.renderer';
 *
 *   const renderer = createPuppeteerRenderer(puppeteer, sharp);
 *   await renderer.initialise();
 *
 *   // Wire into PageRendererServiceImpl:
 *   const pageRenderer = createPageRendererService({
 *     ...otherDeps,
 *     canvas: renderer,  // ← the CanvasRenderer interface
 *   });
 */
export function createPuppeteerRenderer(
  puppeteer: PuppeteerLike,
  sharp: SharpLike,
  poolConfig?: BrowserPoolConfig,
): PuppeteerCanvasRenderer {
  return new PuppeteerCanvasRenderer(puppeteer, sharp, poolConfig);
}
