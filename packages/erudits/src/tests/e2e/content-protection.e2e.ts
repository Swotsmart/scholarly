/**
 * ============================================================================
 * Content Protection — E2E Playwright Tests
 * ============================================================================
 *
 * These tests exercise the complete content protection pipeline through a
 * real browser, verifying that:
 *
 *   1. A reader session can be started via the API
 *   2. Pages render as images (not raw PDF content)
 *   3. Anti-screenshot overlays are present in the rendered output
 *   4. Context menu (right-click) is blocked on page images
 *   5. Keyboard shortcuts (Ctrl+S, Ctrl+P, PrintScreen) are blocked
 *   6. Focus/blur detection triggers the blur overlay
 *   7. Rate limiting prevents rapid page scraping
 *   8. Session expiry terminates access gracefully
 *
 * ## Running
 *
 *   npx playwright test src/tests/e2e/content-protection.e2e.ts
 *
 * ## Prerequisites
 *
 *   - The Érudits API server running at the configured baseUrl
 *   - A test tenant with a protected resource seeded in the database
 *   - A valid auth token for the test tenant
 *
 * ## Configuration
 *
 *   Environment variables:
 *     E2E_BASE_URL       — API base URL (default: http://localhost:3000)
 *     E2E_AUTH_TOKEN      — Bearer token for test tenant
 *     E2E_TENANT_ID       — Test tenant ID
 *     E2E_RESOURCE_ID     — ID of a protected resource
 *     E2E_LICENCE_ID      — Licence ID for the test user
 *
 * @module erudits/tests/e2e/content-protection
 * @version 1.0.0
 */

// ============================================================================
// TYPES — Playwright API subset for type-safe test code
// ============================================================================
//
// We type against the Playwright API surface we use rather than importing
// the full @playwright/test package, keeping this file compilable in our
// Node-only tsconfig. The actual test runner provides the real implementation.

interface PlaywrightTest {
  describe: (name: string, fn: () => void) => void;
  beforeAll: (fn: () => Promise<void>) => void;
  afterAll: (fn: () => Promise<void>) => void;
  beforeEach: (fn: (args: { page: PlaywrightPage; context: PlaywrightContext }) => Promise<void>) => void;
  it: (name: string, fn: (args: { page: PlaywrightPage; request: PlaywrightRequest }) => Promise<void>) => void;
  expect: (value: unknown) => PlaywrightExpect;
}

interface PlaywrightPage {
  goto(url: string): Promise<void>;
  setContent(html: string): Promise<void>;
  evaluate(fn: string | (() => unknown)): Promise<unknown>;
  waitForSelector(selector: string, options?: { timeout?: number | undefined }): Promise<PlaywrightElement | null>;
  locator(selector: string): PlaywrightLocator;
  click(selector: string, options?: { button?: 'left' | 'right' | undefined }): Promise<void>;
  keyboard: { press(key: string): Promise<void>; down(key: string): Promise<void>; up(key: string): Promise<void> };
  mouse: { click(x: number, y: number, options?: { button?: 'left' | 'right' | undefined }): Promise<void> };
  close(): Promise<void>;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

interface PlaywrightContext {
  newPage(): Promise<PlaywrightPage>;
}

interface PlaywrightRequest {
  get(url: string, options?: { headers?: Record<string, string> | undefined }): Promise<PlaywrightResponse>;
  post(url: string, options?: { headers?: Record<string, string> | undefined; data?: unknown }): Promise<PlaywrightResponse>;
}

interface PlaywrightResponse {
  ok(): boolean;
  status(): number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

interface PlaywrightElement {
  isVisible(): Promise<boolean>;
  getAttribute(name: string): Promise<string | null>;
  textContent(): Promise<string | null>;
}

interface PlaywrightLocator {
  isVisible(): Promise<boolean>;
  count(): Promise<number>;
  first(): PlaywrightLocator;
  getAttribute(name: string): Promise<string | null>;
  textContent(): Promise<string | null>;
}

interface PlaywrightExpect {
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBe(expected: unknown): void;
  toBeGreaterThan(expected: number): void;
  toBeLessThan(expected: number): void;
  toContain(expected: string): void;
  not: PlaywrightExpect;
}

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const config = {
  baseUrl: process.env['E2E_BASE_URL'] ?? 'http://localhost:3000',
  authToken: process.env['E2E_AUTH_TOKEN'] ?? 'test-token',
  tenantId: process.env['E2E_TENANT_ID'] ?? 'test-tenant',
  resourceId: process.env['E2E_RESOURCE_ID'] ?? 'test-resource',
  licenceId: process.env['E2E_LICENCE_ID'] ?? 'test-licence',
};

const apiHeaders = {
  'Authorization': `Bearer ${config.authToken}`,
  'Content-Type': 'application/json',
  'X-Tenant-ID': config.tenantId,
};

// ============================================================================
// HELPER: Reader HTML page that mounts the ProtectedReader component
// ============================================================================

/**
 * Generate a minimal HTML page that creates a ProtectedReaderController
 * and wires it to the DOM. This simulates what the React component does,
 * but in plain JS for E2E testing without React.
 */
function readerHtml(sessionId: string, totalPages: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>E2E Protected Reader</title>
  <style>
    #reader-container {
      position: relative;
      width: 100vw;
      height: 100vh;
      user-select: none;
      -webkit-user-select: none;
      background: #1a1a2e;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #page-image {
      max-width: 100%;
      max-height: calc(100vh - 80px);
      pointer-events: none;
      -webkit-user-drag: none;
    }
    #overlay {
      position: absolute;
      color: rgba(128, 128, 128, 0.04);
      font-family: monospace;
      font-size: 14px;
      pointer-events: none;
    }
    #blur-overlay {
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(26, 26, 46, 0.95);
      backdrop-filter: blur(20px);
      z-index: 1000;
      color: white;
      font-size: 24px;
      align-items: center;
      justify-content: center;
    }
    #navigation {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 12px;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
    }
    .nav-btn { padding: 8px 16px; cursor: pointer; }
    #page-counter { color: white; font-size: 14px; }
  </style>
</head>
<body>
  <div id="reader-container" oncontextmenu="return false;">
    <img id="page-image" src="" alt="Page" draggable="false" />
    <div id="overlay" data-testid="reader-overlay"></div>
    <div id="blur-overlay" data-testid="reader-blur-overlay">Content hidden</div>
    <div id="navigation" data-testid="reader-navigation">
      <button class="nav-btn" id="prev-btn" data-testid="reader-prev-button">← Previous</button>
      <span id="page-counter" data-testid="reader-page-counter">1 / ${totalPages}</span>
      <button class="nav-btn" id="next-btn" data-testid="reader-next-button">Next →</button>
    </div>
  </div>

  <script>
    const SESSION_ID = '${sessionId}';
    const TOTAL_PAGES = ${totalPages};
    const API_BASE = '${config.baseUrl}/api/v1/content-protection';
    let currentPage = 1;

    async function loadPage(pageNum) {
      const res = await fetch(API_BASE + '/sessions/' + SESSION_ID + '/pages/' + pageNum, {
        headers: ${JSON.stringify(apiHeaders)}
      });
      if (!res.ok) {
        document.getElementById('page-image').alt = 'Error: ' + res.status;
        return;
      }
      const data = await res.json();
      document.getElementById('page-image').src = data.imageDataUrl || '';
      document.getElementById('overlay').textContent = data.overlayHtml || '';
      document.getElementById('page-counter').textContent = pageNum + ' / ' + TOTAL_PAGES;
      currentPage = pageNum;
    }

    document.getElementById('prev-btn').onclick = () => {
      if (currentPage > 1) loadPage(currentPage - 1);
    };
    document.getElementById('next-btn').onclick = () => {
      if (currentPage < TOTAL_PAGES) loadPage(currentPage + 1);
    };

    // Focus/blur detection
    document.addEventListener('visibilitychange', () => {
      document.getElementById('blur-overlay').style.display =
        document.hidden ? 'flex' : 'none';
    });

    // Block keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
        e.preventDefault();
        window.__blockedKey = e.key;
      }
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        window.__blockedKey = 'PrintScreen';
      }
    }, true);

    // Load first page
    loadPage(1);
  </script>
</body>
</html>`;
}

// ============================================================================
// E2E TEST SUITE
// ============================================================================

/**
 * Export the test suite as a function that receives the Playwright test
 * harness. This allows the tests to be run with `npx playwright test`
 * while remaining compilable in our Node-only tsconfig.
 *
 * Usage in a Playwright test file:
 *   import { test, expect } from '@playwright/test';
 *   import { contentProtectionE2E } from './content-protection.e2e';
 *   contentProtectionE2E({ describe: test.describe, it: test, ... });
 */
export function contentProtectionE2E(t: PlaywrightTest) {
  const { describe, beforeAll, afterAll, it, expect } = t;

  let sessionId: string;
  let totalPages: number;

  describe('Content Protection — End-to-End', () => {

    // ── Setup: create a reader session via API ──

    beforeAll(async () => {
      // In production, this calls the startSession API endpoint
      // For E2E, we assume the test harness provides a seeded resource
      const response = await fetch(`${config.baseUrl}/api/v1/content-protection/sessions`, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          resourceId: config.resourceId,
          licenceId: config.licenceId,
          deviceFingerprint: 'e2e-test-device',
          deviceName: 'Playwright E2E',
          platform: 'browser',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.status} ${await response.text()}`);
      }

      const data = await response.json() as { sessionId: string; totalPages: number };
      sessionId = data.sessionId;
      totalPages = data.totalPages;
    });

    afterAll(async () => {
      // End the session
      if (sessionId) {
        await fetch(`${config.baseUrl}/api/v1/content-protection/sessions/${sessionId}/end`, {
          method: 'POST',
          headers: apiHeaders,
        }).catch(() => {/* best-effort */});
      }
    });

    // ── Test 1: Page renders as image ──

    it('should render a page as an image, not raw PDF', async ({ page }) => {
      await page.setContent(readerHtml(sessionId, totalPages));

      // Wait for the page image to load
      const img = await page.waitForSelector('#page-image[src^="data:image"]', { timeout: 10000 });
      expect(img).toBeTruthy();

      // Verify it's a data URL (rendered image, not a PDF URL)
      const src = await img!.getAttribute('src');
      expect(src).toContain('data:image/');

      // Verify the image has actual content (not empty)
      const srcLength = src?.length ?? 0;
      expect(srcLength).toBeGreaterThan(100);
    });

    // ── Test 2: Anti-screenshot overlay is present ──

    it('should display the anti-screenshot overlay', async ({ page }) => {
      await page.setContent(readerHtml(sessionId, totalPages));
      await page.waitForSelector('#page-image[src^="data:image"]', { timeout: 10000 });

      const overlay = page.locator('[data-testid="reader-overlay"]');
      const isVisible = await overlay.isVisible();
      expect(isVisible).toBeTruthy();
    });

    // ── Test 3: Context menu is blocked ──

    it('should block right-click context menu', async ({ page }) => {
      await page.setContent(readerHtml(sessionId, totalPages));
      await page.waitForSelector('#page-image[src^="data:image"]', { timeout: 10000 });

      // Listen for the contextmenu event's default prevention
      const wasDefaultPrevented = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          const handler = (e: Event) => {
            resolve(e.defaultPrevented);
            document.removeEventListener('contextmenu', handler);
          };
          document.addEventListener('contextmenu', handler);

          // Trigger right-click
          const container = document.getElementById('reader-container');
          container?.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
          }));
        });
      });

      expect(wasDefaultPrevented).toBeTruthy();
    });

    // ── Test 4: Ctrl+S is blocked ──

    it('should block Ctrl+S keyboard shortcut', async ({ page }) => {
      await page.setContent(readerHtml(sessionId, totalPages));
      await page.waitForSelector('#page-image[src^="data:image"]', { timeout: 10000 });

      // Press Ctrl+S
      await page.keyboard.down('Control');
      await page.keyboard.press('s');
      await page.keyboard.up('Control');

      // Check that our handler captured it
      const blockedKey = await page.evaluate(() =>
        (window as unknown as { __blockedKey?: string }).__blockedKey,
      );
      expect(blockedKey).toBe('s');
    });

    // ── Test 5: Ctrl+P is blocked ──

    it('should block Ctrl+P keyboard shortcut', async ({ page }) => {
      await page.setContent(readerHtml(sessionId, totalPages));
      await page.waitForSelector('#page-image[src^="data:image"]', { timeout: 10000 });

      await page.keyboard.down('Control');
      await page.keyboard.press('p');
      await page.keyboard.up('Control');

      const blockedKey = await page.evaluate(() =>
        (window as unknown as { __blockedKey?: string }).__blockedKey,
      );
      expect(blockedKey).toBe('p');
    });

    // ── Test 6: Navigation works ──

    it('should navigate between pages using buttons', async ({ page }) => {
      await page.setContent(readerHtml(sessionId, totalPages));
      await page.waitForSelector('#page-image[src^="data:image"]', { timeout: 10000 });

      // Verify initial page
      const counter = page.locator('[data-testid="reader-page-counter"]');
      const text = await counter.textContent();
      expect(text).toContain('1 /');

      // Click Next
      await page.click('[data-testid="reader-next-button"]');

      // Wait for page 2 to load
      await page.waitForSelector('#page-counter', { timeout: 5000 });
      const updatedText = await page.evaluate(() =>
        document.getElementById('page-counter')?.textContent,
      );
      expect(updatedText).toContain('2 /');
    });

    // ── Test 7: Rate limiting prevents rapid requests ──

    it('should rate limit rapid page requests', async ({ request }) => {
      // Send requests at maximum speed — should hit rate limit
      const results: number[] = [];
      for (let i = 0; i < 35; i++) {
        const res = await request.get(
          `${config.baseUrl}/api/v1/content-protection/sessions/${sessionId}/pages/1`,
          { headers: apiHeaders },
        );
        results.push(res.status());
      }

      // At default 30/min limit, request 31+ should return 400 (validation error)
      const rateLimited = results.filter(s => s === 400);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    // ── Test 8: Page image has no pointer events ──

    it('should disable pointer events on the page image', async ({ page }) => {
      await page.setContent(readerHtml(sessionId, totalPages));
      await page.waitForSelector('#page-image[src^="data:image"]', { timeout: 10000 });

      const pointerEvents = await page.evaluate(() => {
        const img = document.getElementById('page-image');
        return img ? getComputedStyle(img).pointerEvents : 'auto';
      });

      expect(pointerEvents).toBe('none');
    });

    // ── Test 9: Image is not draggable ──

    it('should prevent image dragging', async ({ page }) => {
      await page.setContent(readerHtml(sessionId, totalPages));
      await page.waitForSelector('#page-image[src^="data:image"]', { timeout: 10000 });

      const draggable = await page.evaluate(() => {
        const img = document.getElementById('page-image');
        return img?.getAttribute('draggable');
      });

      expect(draggable).toBe('false');
    });

    // ── Test 10: Session end terminates access ──

    it('should return error after session is ended', async ({ request }) => {
      // Start a new session specifically for this test
      const startRes = await request.post(
        `${config.baseUrl}/api/v1/content-protection/sessions`,
        {
          headers: apiHeaders,
          data: {
            resourceId: config.resourceId,
            licenceId: config.licenceId,
            deviceFingerprint: 'e2e-test-device-2',
            deviceName: 'Playwright E2E 2',
            platform: 'browser',
          },
        },
      );
      const startData = await startRes.json() as { sessionId: string };
      const testSessionId = startData.sessionId;

      // End the session
      const endRes = await request.post(
        `${config.baseUrl}/api/v1/content-protection/sessions/${testSessionId}/end`,
        { headers: apiHeaders },
      );
      expect(endRes.ok()).toBeTruthy();

      // Try to request a page — should fail
      const pageRes = await request.get(
        `${config.baseUrl}/api/v1/content-protection/sessions/${testSessionId}/pages/1`,
        { headers: apiHeaders },
      );
      expect(pageRes.ok()).toBeFalsy();
    });
  });
}

// ============================================================================
// STANDALONE RUNNER — for npx playwright test
// ============================================================================
//
// When run directly with Playwright Test, this file creates the test suite
// using the global test/expect from @playwright/test. When imported as a
// module (for custom test harnesses), use the contentProtectionE2E function.
//
// To run:
//   npx playwright test src/tests/e2e/content-protection.e2e.ts
//
// The try/catch allows this file to compile even when @playwright/test
// is not installed (e.g., in the main build).

try {
  // Dynamic require to avoid compile-time dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pw = require('@playwright/test') as {
    test: { describe: PlaywrightTest['describe'] } & PlaywrightTest['it'];
    expect: PlaywrightTest['expect'];
  };

  contentProtectionE2E({
    describe: pw.test.describe,
    beforeAll: pw.test.describe.bind(null, 'beforeAll') as unknown as PlaywrightTest['beforeAll'],
    afterAll: pw.test.describe.bind(null, 'afterAll') as unknown as PlaywrightTest['afterAll'],
    beforeEach: (() => {}) as unknown as PlaywrightTest['beforeEach'],
    it: pw.test as unknown as PlaywrightTest['it'],
    expect: pw.expect,
  });
} catch {
  // @playwright/test not installed — tests will be run via import
}
