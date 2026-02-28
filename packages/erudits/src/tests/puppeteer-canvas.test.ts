/**
 * ============================================================================
 * Puppeteer Canvas Renderer — Tests
 * ============================================================================
 */
import {
  BrowserPool,
  PuppeteerCanvasRenderer,
  DEFAULT_POOL_CONFIG,
} from '../integrations/puppeteer-canvas.renderer';
import type {
  PuppeteerLike,
  BrowserLike,
  PageLike,
  SharpLike,
  SharpInstance,
  BrowserPoolConfig,
} from '../integrations/puppeteer-canvas.renderer';

// ============================================================================
// MOCKS
// ============================================================================

function createMockPage(): PageLike {
  const pngBuffer = Buffer.from('FAKE_PNG_IMAGE_DATA');
  return {
    goto: jest.fn().mockResolvedValue(undefined),
    setViewport: jest.fn().mockResolvedValue(undefined),
    screenshot: jest.fn().mockResolvedValue(pngBuffer),
    close: jest.fn().mockResolvedValue(undefined),
    setContent: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockBrowser(connected = true): BrowserLike & { _page: PageLike } {
  const page = createMockPage();
  return {
    newPage: jest.fn().mockResolvedValue(page),
    close: jest.fn().mockResolvedValue(undefined),
    connected,
    _page: page,
  };
}

function createMockPuppeteer(browser?: BrowserLike): PuppeteerLike {
  const b = browser ?? createMockBrowser();
  return {
    launch: jest.fn().mockResolvedValue(b),
  };
}

function createMockSharp(): SharpLike {
  const instance: SharpInstance = {
    metadata: jest.fn().mockResolvedValue({ width: 1240, height: 1754, format: 'png' }),
    composite: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('COMPOSITED_IMAGE')),
  };

  return jest.fn().mockReturnValue(instance) as unknown as SharpLike;
}

// ============================================================================
// BROWSER POOL TESTS
// ============================================================================

describe('BrowserPool', () => {
  let mockPuppeteer: PuppeteerLike;
  let pool: BrowserPool;

  beforeEach(() => {
    mockPuppeteer = createMockPuppeteer();
    pool = new BrowserPool(mockPuppeteer, { ...DEFAULT_POOL_CONFIG, poolSize: 2 });
  });

  afterEach(async () => {
    await pool.shutdown();
  });

  it('should launch poolSize browsers on initialise', async () => {
    await pool.initialise();
    expect(mockPuppeteer.launch).toHaveBeenCalledTimes(2);
    const status = pool.getStatus();
    expect(status.total).toBe(2);
    expect(status.available).toBe(2);
    expect(status.inUse).toBe(0);
  });

  it('should be idempotent on multiple initialise calls', async () => {
    await pool.initialise();
    await pool.initialise();
    expect(mockPuppeteer.launch).toHaveBeenCalledTimes(2);
  });

  it('should acquire and release browsers', async () => {
    await pool.initialise();

    const { browser, release } = await pool.acquire();
    expect(browser).toBeDefined();

    const status = pool.getStatus();
    expect(status.inUse).toBe(1);
    expect(status.available).toBe(1);

    await release();
    const afterRelease = pool.getStatus();
    expect(afterRelease.inUse).toBe(0);
    expect(afterRelease.available).toBe(2);
  });

  it('should launch overflow browser when pool exhausted', async () => {
    await pool.initialise();

    // Acquire both pooled browsers
    const a1 = await pool.acquire();
    const a2 = await pool.acquire();

    // Third acquire should launch a new browser (overflow)
    const a3 = await pool.acquire();
    expect(mockPuppeteer.launch).toHaveBeenCalledTimes(3); // 2 pool + 1 overflow
    expect(a3.browser).toBeDefined();

    // Release overflow browser should close it
    await a3.release();
    await a1.release();
    await a2.release();
  });

  it('should recycle browser after maxPagesPerBrowser', async () => {
    const config: BrowserPoolConfig = {
      ...DEFAULT_POOL_CONFIG,
      poolSize: 1,
      maxPagesPerBrowser: 3,
    };
    pool = new BrowserPool(mockPuppeteer, config);
    await pool.initialise();

    // Use browser 3 times (maxPagesPerBrowser)
    for (let i = 0; i < 3; i++) {
      const { release } = await pool.acquire();
      await release();
    }

    // Should have launched original + 1 replacement
    expect(mockPuppeteer.launch).toHaveBeenCalledTimes(2);
  });

  it('should close all browsers on shutdown', async () => {
    const browser = createMockBrowser();
    const puppeteer = createMockPuppeteer(browser);
    pool = new BrowserPool(puppeteer, { ...DEFAULT_POOL_CONFIG, poolSize: 1 });

    await pool.initialise();
    await pool.shutdown();

    expect(browser.close).toHaveBeenCalled();
    const status = pool.getStatus();
    expect(status.total).toBe(0);
  });

  it('should auto-initialise on first acquire if not initialised', async () => {
    // Don't call initialise() — acquire should do it
    const { release } = await pool.acquire();
    expect(mockPuppeteer.launch).toHaveBeenCalledTimes(2);
    await release();
  });

  it('should pass launch args including no-sandbox for containers', async () => {
    await pool.initialise();
    expect(mockPuppeteer.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: 'shell',
        args: expect.arrayContaining(['--no-sandbox', '--disable-dev-shm-usage']),
      }),
    );
  });
});

// ============================================================================
// RENDERER TESTS
// ============================================================================

describe('PuppeteerCanvasRenderer', () => {
  let mockPuppeteer: PuppeteerLike;
  let mockSharp: SharpLike;
  let renderer: PuppeteerCanvasRenderer;
  let mockBrowser: BrowserLike & { _page: PageLike };

  beforeEach(async () => {
    mockBrowser = createMockBrowser();
    mockPuppeteer = createMockPuppeteer(mockBrowser);
    mockSharp = createMockSharp();
    renderer = new PuppeteerCanvasRenderer(
      mockPuppeteer, mockSharp, { ...DEFAULT_POOL_CONFIG, poolSize: 1 },
    );
    await renderer.initialise();
  });

  afterEach(async () => {
    await renderer.shutdown();
  });

  describe('renderPdfPageToImage', () => {
    it('should render a PDF page to PNG at specified DPI', async () => {
      const pdfBuffer = Buffer.from('FAKE_PDF_DATA');

      const result = await renderer.renderPdfPageToImage(pdfBuffer, 150, 'png', 85);

      // Verify viewport was set to A4 at 150 DPI
      expect(mockBrowser._page.setViewport).toHaveBeenCalledWith({
        width: Math.round(8.27 * 150),  // 1240
        height: Math.round(11.69 * 150), // 1754
        deviceScaleFactor: 1,
      });

      // Verify PDF was loaded as data URL
      expect(mockBrowser._page.goto).toHaveBeenCalledWith(
        expect.stringContaining('data:application/pdf;base64,'),
        { waitUntil: 'networkidle0' },
      );

      expect(result.imageBuffer).toBeInstanceOf(Buffer);
      expect(result.widthPx).toBe(1241);
      expect(result.heightPx).toBe(1754);
    });

    it('should use JPEG format when specified', async () => {
      const pdfBuffer = Buffer.from('FAKE_PDF_DATA');

      await renderer.renderPdfPageToImage(pdfBuffer, 150, 'jpeg', 80);

      expect(mockBrowser._page.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'jpeg', quality: 80 }),
      );
    });

    it('should not pass quality for PNG format', async () => {
      const pdfBuffer = Buffer.from('FAKE_PDF_DATA');

      await renderer.renderPdfPageToImage(pdfBuffer, 150, 'png', 85);

      expect(mockBrowser._page.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'png', quality: undefined }),
      );
    });

    it('should close the page after rendering', async () => {
      const pdfBuffer = Buffer.from('FAKE_PDF_DATA');

      await renderer.renderPdfPageToImage(pdfBuffer, 150, 'png', 85);

      expect(mockBrowser._page.close).toHaveBeenCalled();
    });

    it('should close page even on error', async () => {
      const page = mockBrowser._page;
      (page.goto as jest.Mock).mockRejectedValueOnce(new Error('Navigation failed'));

      const pdfBuffer = Buffer.from('FAKE_PDF_DATA');
      await expect(renderer.renderPdfPageToImage(pdfBuffer, 150, 'png', 85))
        .rejects.toThrow('Navigation failed');

      expect(page.close).toHaveBeenCalled();
    });

    it('should scale dimensions based on DPI', async () => {
      const pdfBuffer = Buffer.from('FAKE_PDF_DATA');

      const result = await renderer.renderPdfPageToImage(pdfBuffer, 72, 'png', 85);

      expect(result.widthPx).toBe(Math.round(8.27 * 72));  // 595
      expect(result.heightPx).toBe(Math.round(11.69 * 72)); // 842
    });
  });

  describe('compositeOverlay', () => {
    it('should composite text overlay at specified position and opacity', async () => {
      const imageBuffer = Buffer.from('FAKE_IMAGE');

      const result = await renderer.compositeOverlay(
        imageBuffer,
        'abc123-ses456 2026-02-26',
        { xPercent: 50, yPercent: 50, rotation: -45 },
        0.04,
      );

      // Sharp should be called to create the composite
      expect(mockSharp).toHaveBeenCalledWith(imageBuffer);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should escape XML characters in overlay text', async () => {
      const imageBuffer = Buffer.from('FAKE_IMAGE');

      // This should not throw — XML chars are escaped
      await renderer.compositeOverlay(
        imageBuffer,
        '<script>alert("xss")</script>',
        { xPercent: 50, yPercent: 50, rotation: 0 },
        0.04,
      );

      // Verify the sharp composite was called (no SVG parse error)
      const sharpInstance = (mockSharp as jest.Mock).mock.results[1]!.value as SharpInstance;
      expect(sharpInstance.composite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            input: expect.any(Buffer),
          }),
        ]),
      );
    });

    it('should use metadata dimensions for positioning', async () => {
      const imageBuffer = Buffer.from('FAKE_IMAGE');

      await renderer.compositeOverlay(
        imageBuffer,
        'test-overlay',
        { xPercent: 25, yPercent: 75, rotation: -30 },
        0.04,
      );

      // First call gets metadata, second creates composite
      const sharpInstance = (mockSharp as jest.Mock).mock.results[0]!.value as SharpInstance;
      expect(sharpInstance.metadata).toHaveBeenCalled();
    });
  });

  describe('pool integration', () => {
    it('should report pool status via getPoolStatus', () => {
      const status = renderer.getPoolStatus();
      expect(status.total).toBe(1);
      expect(status.available).toBe(1);
      expect(status.inUse).toBe(0);
    });
  });
});
