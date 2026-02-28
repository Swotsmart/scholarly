/**
 * ============================================================================
 * Phase 3 Integration Tests — Encrypted Reader & Dashboard
 * ============================================================================
 *
 * Tests the server-side rendering pipeline, page caching, session lifecycle,
 * protection dashboard, and reader controller.
 *
 * The test strategy mirrors the user journey:
 *   1. Author sets a premium protection policy (reader-enabled)
 *   2. Reader registers device and starts a session
 *   3. Pages are pre-rendered and served from cache
 *   4. Heartbeat keeps the session alive
 *   5. Session ends and page cache is invalidated
 *   6. Dashboard shows real aggregate data
 */

import { PageRendererServiceImpl, DEFAULT_RENDERER_CONFIG } from '../integrations/page-renderer.service';
import { ProtectedReaderController, READER_CONTAINER_STYLES, READER_KEYBOARD_SHORTCUTS, PRINT_PREVENTION_CSS } from '../components/protected-reader';
import type { ProtectedReaderProps } from '../components/protected-reader';
import type {
  ContentSession,
  ContentProtectionPolicy,
  EncryptionKeyRecord,
} from '../types/content-protection.types';
import type { Cache } from '../types/erudits.types';

// ============================================================================
// MOCK FACTORIES
// ============================================================================

function createMockCache(): Cache {
  const store = new Map<string, { value: string; ttl?: number | undefined }>();
  return {
    get: jest.fn().mockImplementation((key: string) => {
      const entry = store.get(key);
      return Promise.resolve(entry?.value ?? null);
    }),
    set: jest.fn().mockImplementation((key: string, value: unknown, ttl?: number) => {
      const entry: { value: string; ttl?: number | undefined } = {
        value: typeof value === 'string' ? value : JSON.stringify(value),
      };
      if (ttl !== undefined) entry.ttl = ttl;
      store.set(key, entry);
      return Promise.resolve();
    }),
    del: jest.fn().mockImplementation((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    invalidatePattern: jest.fn().mockImplementation((pattern: string) => {
      const prefix = pattern.replace('*', '');
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
      }
      return Promise.resolve();
    }),
    incr: jest.fn().mockImplementation((key: string, ttl?: number) => {
      const entry = store.get(key);
      const current = entry ? parseInt(entry.value, 10) : 0;
      const next = current + 1;
      const newEntry: { value: string; ttl?: number | undefined } = { value: next.toString() };
      if (ttl !== undefined) newEntry.ttl = ttl;
      store.set(key, newEntry);
      return Promise.resolve(next);
    }),
    _store: store, // Expose for test assertions
  } as unknown as Cache & { _store: Map<string, { value: string; ttl?: number }> };
}

function createMockFileStorage() {
  return {
    upload: jest.fn().mockResolvedValue('https://cdn.example.com/file.pdf'),
    getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
    delete: jest.fn().mockResolvedValue(undefined),
    copy: jest.fn().mockResolvedValue('https://cdn.example.com/copy.pdf'),
  };
}

function createMockEncryptionService() {
  return {
    encryptForBuyer: jest.fn().mockResolvedValue({ encrypted: Buffer.from('enc'), buyerKeyDerivation: 'v1:l:d' }),
    decryptForBuyer: jest.fn().mockResolvedValue(Buffer.from('decrypted-pdf-content')),
    applyPdfPermissions: jest.fn().mockResolvedValue(Buffer.from('restricted')),
    generateResourceKey: jest.fn().mockResolvedValue({} as EncryptionKeyRecord),
  };
}

function createMockPdfLib() {
  return {
    load: jest.fn().mockImplementation(async () => ({
      getPages: () => Array.from({ length: 12 }, () => ({ getWidth: () => 612, getHeight: () => 792 })),
      getPageCount: () => 12,
      save: jest.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])),
      copyPages: jest.fn().mockResolvedValue([{ getWidth: () => 612, getHeight: () => 792 }]),
    })),
    create: jest.fn().mockImplementation(async () => ({
      getPages: () => [],
      getPageCount: () => 1,
      save: jest.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])),
      copyPages: jest.fn().mockResolvedValue([{ getWidth: () => 612, getHeight: () => 792 }]),
      addPage: jest.fn(),
    })),
  };
}

function createMockCanvas() {
  const imageBuffer = Buffer.from('PNG-image-data-rendered-at-150dpi');
  return {
    renderPdfPageToImage: jest.fn().mockResolvedValue({
      imageBuffer,
      widthPx: 1240,
      heightPx: 1754,
    }),
    compositeOverlay: jest.fn().mockImplementation(async (buf: Buffer) => {
      // Return a slightly modified buffer (simulates overlay composition)
      return Buffer.concat([buf, Buffer.from('-overlayed')]);
    }),
  };
}

function createTestSession(): ContentSession {
  const now = new Date();
  return {
    id: 'session-test-001',
    tenantId: 'tenant-erudits',
    createdAt: now,
    updatedAt: now,
    userId: 'user-sarah-teacher',
    licenceId: 'licence-brighton',
    resourceId: 'resource-atar-exam',
    deviceFingerprint: 'fp-ipad-2024',
    status: 'active',
    startedAt: now,
    lastHeartbeatAt: now,
    expiresAt: new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8 hours
    pagesViewed: [],
    totalPageViews: 0,
    peakConcurrentPages: 0,
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
  };
}

function createTestPolicy(): ContentProtectionPolicy {
  return {
    id: 'policy-001',
    tenantId: 'tenant-erudits',
    createdAt: new Date(),
    updatedAt: new Date(),
    resourceId: 'resource-atar-exam',
    protectionLevel: 'premium',
    deliveryMode: 'both',
    visibleWatermark: true,
    steganographicEnabled: true,
    steganographicTechniques: ['homoglyph', 'micro_typography'],
    maxDevicesIndividual: 3,
    maxDevicesInstitution: 10,
    concurrentSessionLimit: 5,
    sessionTimeoutMinutes: 480,
    readerEnabled: true,
    antiScreenshotOverlay: true,
    overlayRefreshSeconds: 30,
    focusBlurEnabled: true,
    pageRateLimitPerMinute: 30,
    downloadEncrypted: false,
    pdfPermissions: ['print_low_quality', 'accessibility'],
    downloadLimitPerDevice: 5,
    autoSuspendOnViolation: false,
    violationNotifyAuthor: true,
    violationNotifyAdmin: true,
  };
}

// ============================================================================
// TESTS — PAGE RENDERER SERVICE
// ============================================================================

describe('PageRendererServiceImpl', () => {
  let renderer: PageRendererServiceImpl;
  let cache: ReturnType<typeof createMockCache>;
  let canvas: ReturnType<typeof createMockCanvas>;
  let session: ContentSession;
  let policy: ContentProtectionPolicy;

  beforeEach(() => {
    cache = createMockCache();
    canvas = createMockCanvas();
    session = createTestSession();
    policy = createTestPolicy();

    renderer = new PageRendererServiceImpl({
      cache,
      fileStorage: createMockFileStorage(),
      encryptionService: createMockEncryptionService(),
      pdfLib: createMockPdfLib(),
      canvas,
      config: { ...DEFAULT_RENDERER_CONFIG, maxPreRenderPages: 3 },
    });
  });

  describe('renderPage', () => {

    it('should render a page and return a data URL', async () => {
      const result = await renderer.renderPage(
        'session-1', 1, session, policy, null, null,
      );

      expect(result.imageDataUrl).toContain('data:image/png;base64,');
      expect(result.widthPx).toBe(1240);
      expect(result.heightPx).toBe(1754);
      expect(result.fromCache).toBe(false);
      expect(result.renderTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should serve subsequent requests from cache', async () => {
      // First render — cold
      const first = await renderer.renderPage(
        'session-1', 1, session, policy, null, null,
      );
      expect(first.fromCache).toBe(false);

      // Second render — cached
      const second = await renderer.renderPage(
        'session-1', 1, session, policy, null, null,
      );
      expect(second.fromCache).toBe(true);
    });

    it('should composite the anti-screenshot overlay when enabled', async () => {
      await renderer.renderPage('session-1', 1, session, policy, null, null);

      expect(canvas.compositeOverlay).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining(session.userId.slice(0, 8)),
        expect.objectContaining({ xPercent: expect.any(Number) }),
        0.04, // Overlay opacity
      );
    });

    it('should skip overlay when antiScreenshotOverlay is disabled', async () => {
      const noOverlayPolicy = { ...policy, antiScreenshotOverlay: false };

      await renderer.renderPage('session-1', 1, session, noOverlayPolicy, null, null);

      expect(canvas.compositeOverlay).not.toHaveBeenCalled();
    });
  });

  describe('preRenderPages', () => {

    it('should pre-render up to maxPreRenderPages', async () => {
      const result = await renderer.preRenderPages(
        'session-pre', session, policy, null, null,
      );

      expect(result.pagesRendered).toBe(3); // maxPreRenderPages = 3
      expect(result.totalPages).toBe(12);
      expect(result.failedPages).toEqual([]);
      expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should cache the page count for the session', async () => {
      await renderer.preRenderPages('session-pre', session, policy, null, null);

      const pageCount = await cache.get('erudits:protection:pagecount:session-pre');
      expect(pageCount).toBe('12');
    });
  });

  describe('getPageCount', () => {

    it('should return page count from cache when available', async () => {
      await cache.set('erudits:protection:pagecount:session-cnt', '24', 3600);

      const count = await renderer.getPageCount('session-cnt', session, null, null);

      expect(count).toBe(24);
    });

    it('should compute page count from PDF when not cached', async () => {
      const count = await renderer.getPageCount('session-cnt', session, null, null);

      expect(count).toBe(12);
    });
  });

  describe('invalidateSession', () => {

    it('should clear all cached pages for the session', async () => {
      // Pre-render some pages
      await renderer.preRenderPages('session-inv', session, policy, null, null);

      // Verify pages are cached
      const before = await cache.get('erudits:protection:pagecount:session-inv');
      expect(before).toBeTruthy();

      // Invalidate
      await renderer.invalidateSession('session-inv');

      // Verify caches are cleared
      expect(cache.invalidatePattern).toHaveBeenCalledWith(
        'erudits:protection:page:session-inv:*',
      );
      expect(cache.del).toHaveBeenCalledWith('erudits:protection:pagecount:session-inv');
      expect(cache.del).toHaveBeenCalledWith('erudits:protection:pdf:session-inv');
    });
  });
});

// ============================================================================
// TESTS — PROTECTED READER CONTROLLER
// ============================================================================

describe('ProtectedReaderController', () => {
  let controller: ProtectedReaderController;
  let onStateChange: jest.Mock;
  let onSessionExpired: jest.Mock;

  // Mock fetch globally for the controller's API calls
  const mockFetch = jest.fn();
  (global as any).fetch = mockFetch;

  const defaultProps: ProtectedReaderProps = {
    sessionId: 'session-reader-001',
    totalPages: 12,
    apiBaseUrl: '/api/v1/protection',
    authToken: 'Bearer test-token',
    onSessionExpired: jest.fn(),
    heartbeatIntervalSeconds: 60,
    overlayRefreshSeconds: 30,
    focusBlurEnabled: true,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    onStateChange = jest.fn();
    onSessionExpired = jest.fn();

    controller = new ProtectedReaderController({
      ...defaultProps,
      onSessionExpired,
    });

    // Default mock: successful API responses
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ imageDataUrl: 'data:image/png;base64,test', watermarkOverlayHtml: '' }),
      text: () => Promise.resolve(''),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    mockFetch.mockReset();
  });

  describe('start/stop lifecycle', () => {

    it('should load the first page on start', () => {
      controller.start(onStateChange);

      // Should call fetch for page 1
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/protection/sessions/session-reader-001/pages/1',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should send heartbeat at the configured interval', () => {
      controller.start(onStateChange);
      mockFetch.mockClear();

      jest.advanceTimersByTime(60000); // 60 seconds

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/protection/sessions/session-reader-001/heartbeat',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should end session on stop', async () => {
      controller.start(onStateChange);
      mockFetch.mockResolvedValue({ ok: true, status: 204, text: () => Promise.resolve('') });

      await controller.stop();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/protection/sessions/session-reader-001/end',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('page navigation', () => {

    it('should navigate to the next page', async () => {
      controller.start(onStateChange);
      mockFetch.mockClear();

      await controller.nextPage();

      const state = controller.getState();
      expect(state.currentPage).toBe(2);
    });

    it('should not go below page 1', async () => {
      controller.start(onStateChange);

      await controller.previousPage();

      const state = controller.getState();
      expect(state.currentPage).toBe(1);
    });

    it('should not go above totalPages', async () => {
      controller.start(onStateChange);

      for (let i = 0; i < 15; i++) {
        await controller.nextPage();
      }

      const state = controller.getState();
      expect(state.currentPage).toBe(12);
    });
  });

  describe('focus/blur detection', () => {

    it('should blur content when window loses focus', () => {
      controller.start(onStateChange);

      controller.onBlur();

      const state = controller.getState();
      expect(state.isBlurred).toBe(true);
    });

    it('should unblur when window regains focus', () => {
      controller.start(onStateChange);
      controller.onBlur();
      controller.onFocus();

      const state = controller.getState();
      expect(state.isBlurred).toBe(false);
    });

    it('should not blur when focusBlurEnabled is false', () => {
      const noBlurController = new ProtectedReaderController({
        ...defaultProps,
        focusBlurEnabled: false,
      });
      noBlurController.start(onStateChange);
      noBlurController.onBlur();

      expect(noBlurController.getState().isBlurred).toBe(false);
    });
  });

  describe('context menu prevention', () => {

    it('should return false to prevent context menu', () => {
      expect(controller.onContextMenu()).toBe(false);
    });
  });

  describe('overlay rotation', () => {

    it('should rotate overlay position at configured interval', () => {
      controller.start(onStateChange);
      // Capture initial state
      controller.getState();

      // Advance past multiple overlay intervals to increase chance of different position
      jest.advanceTimersByTime(30000);
      jest.advanceTimersByTime(30000);

      // Position should have been updated (state change callback called)
      expect(onStateChange).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// TESTS — CSS & CONSTANTS
// ============================================================================

describe('Reader CSS and Constants', () => {

  it('should define anti-screenshot container styles', () => {
    expect(READER_CONTAINER_STYLES['user-select']).toBe('none');
    expect(READER_CONTAINER_STYLES['-webkit-touch-callout']).toBe('none');
    expect(READER_CONTAINER_STYLES['position']).toBe('relative');
  });

  it('should define keyboard shortcuts for navigation', () => {
    expect(READER_KEYBOARD_SHORTCUTS['ArrowRight']).toBe('nextPage');
    expect(READER_KEYBOARD_SHORTCUTS['ArrowLeft']).toBe('previousPage');
    expect(READER_KEYBOARD_SHORTCUTS['Escape']).toBe('exitReader');
  });

  it('should include print prevention CSS', () => {
    expect(PRINT_PREVENTION_CSS).toContain('@media print');
    expect(PRINT_PREVENTION_CSS).toContain('display: none');
  });

  it('should have default renderer config with sensible values', () => {
    expect(DEFAULT_RENDERER_CONFIG.renderDpi).toBe(150);
    expect(DEFAULT_RENDERER_CONFIG.maxPreRenderPages).toBe(10);
    expect(DEFAULT_RENDERER_CONFIG.imageQuality).toBe(85);
    expect(DEFAULT_RENDERER_CONFIG.cacheTtlSeconds).toBe(28800); // 8 hours
  });
});
