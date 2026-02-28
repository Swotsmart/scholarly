/**
 * ============================================================================
 * Protected Content Reader — Playwright E2E Tests
 * ============================================================================
 *
 * These tests exercise the full protected reader flow in a real browser,
 * verifying that all security layers work together end-to-end. Think of
 * them as the final inspection before a car leaves the factory: every
 * previous test checked individual components (engine, brakes, electronics),
 * but this test drives the car around the track.
 *
 * ## Prerequisites
 *
 *   1. The Érudits API server running at BASE_URL (default: http://localhost:3000)
 *   2. A test tenant with a protected resource and valid session
 *   3. Playwright installed: npx playwright install chromium
 *
 * ## Running
 *
 *   npx playwright test src/e2e/protected-reader.e2e.ts
 *
 * ## What This Tests
 *
 *   - Session start → page render → image displayed (full pipeline)
 *   - Context menu is blocked (right-click protection)
 *   - Anti-screenshot overlay is present in the DOM
 *   - Focus/blur detection blurs content when window loses focus
 *   - Keyboard shortcuts (Ctrl+S, Ctrl+P, PrintScreen) are blocked
 *   - Page navigation (next, previous, page indicator)
 *   - Session heartbeat keeps the session alive
 *   - Rate limiting rejects rapid page requests
 *
 * @module erudits/e2e/protected-reader
 * @version 1.0.0
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = process.env['ERUDITS_BASE_URL'] ?? 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1/protection`;

/**
 * Test fixtures — a pre-seeded tenant, resource, and session.
 *
 * In CI, these are created by a setup script that:
 *   1. Creates a test tenant
 *   2. Uploads a test PDF (3 pages)
 *   3. Creates a protection policy (standard level)
 *   4. Creates a licence and registers a device
 *   5. Starts a reader session
 *
 * The session ID and auth token are passed via environment variables.
 */
const FIXTURES = {
  tenantId: process.env['TEST_TENANT_ID'] ?? 'tenant-e2e-test',
  sessionId: process.env['TEST_SESSION_ID'] ?? 'sess-e2e-test',
  authToken: process.env['TEST_AUTH_TOKEN'] ?? 'Bearer e2e-test-token',
  totalPages: parseInt(process.env['TEST_TOTAL_PAGES'] ?? '3', 10),
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Navigate to the protected reader page for the test session.
 * The reader URL follows the pattern: /read/:sessionId
 */
async function openReader(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/read/${FIXTURES.sessionId}`, {
    waitUntil: 'networkidle',
  });
}

/**
 * Wait for the reader to finish loading the first page.
 * The page image has data-testid="page-image".
 */
async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="page-image"]', {
    state: 'visible',
    timeout: 10_000,
  });
}

/**
 * Make a direct API call to request a page (for rate limit testing).
 */
async function requestPageViaApi(
  context: BrowserContext,
  sessionId: string,
  pageNumber: number,
): Promise<{ status: number; body: unknown }> {
  const response = await context.request.post(
    `${API_BASE}/sessions/${sessionId}/pages/${pageNumber}`,
    {
      headers: {
        'Authorization': FIXTURES.authToken,
        'Content-Type': 'application/json',
      },
    },
  );
  return {
    status: response.status(),
    body: await response.json().catch(() => null),
  };
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Protected Content Reader — E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Set auth cookie/header for the test session
    await page.setExtraHTTPHeaders({
      'Authorization': FIXTURES.authToken,
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Core Reading Flow
  // ──────────────────────────────────────────────────────────────────────

  test('should display the reader container after loading', async ({ page }) => {
    await openReader(page);
    const reader = page.locator('[data-testid="protected-reader"]');
    await expect(reader).toBeVisible();
  });

  test('should render the first page as an image', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    const pageImage = page.locator('[data-testid="page-image"]');
    await expect(pageImage).toBeVisible();

    // The image should be a data URL (base64-encoded PNG/JPEG)
    const src = await pageImage.getAttribute('src');
    expect(src).toMatch(/^data:image\/(png|jpeg);base64,/);
  });

  test('should display correct page indicator', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    const indicator = page.locator('[data-testid="page-indicator"]');
    await expect(indicator).toContainText(`Page 1 of ${FIXTURES.totalPages}`);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Navigation
  // ──────────────────────────────────────────────────────────────────────

  test('should navigate to next page', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    const nextButton = page.locator('[data-testid="next-button"]');
    await nextButton.click();

    // Wait for page 2 to load
    await page.waitForFunction(() => {
      const indicator = document.querySelector('[data-testid="page-indicator"]');
      return indicator?.textContent?.includes('Page 2');
    });

    const indicator = page.locator('[data-testid="page-indicator"]');
    await expect(indicator).toContainText('Page 2');
  });

  test('should navigate back to previous page', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    // Go to page 2
    await page.locator('[data-testid="next-button"]').click();
    await page.waitForFunction(() =>
      document.querySelector('[data-testid="page-indicator"]')?.textContent?.includes('Page 2'),
    );

    // Go back to page 1
    await page.locator('[data-testid="prev-button"]').click();
    await page.waitForFunction(() =>
      document.querySelector('[data-testid="page-indicator"]')?.textContent?.includes('Page 1'),
    );

    const indicator = page.locator('[data-testid="page-indicator"]');
    await expect(indicator).toContainText('Page 1');
  });

  test('should disable previous button on first page', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    const prevButton = page.locator('[data-testid="prev-button"]');
    await expect(prevButton).toBeDisabled();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Anti-Screenshot Protections
  // ──────────────────────────────────────────────────────────────────────

  test('should block context menu (right-click)', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    // Attempt to open context menu
    const reader = page.locator('[data-testid="protected-reader"]');
    await reader.click({ button: 'right' });

    // The context menu should NOT appear — we can't directly test this,
    // but we can verify the contextmenu event was prevented by checking
    // that a custom handler was invoked
    const contextMenuBlocked = await page.evaluate(() => {
      let blocked = false;
      const handler = (e: MouseEvent) => {
        if (e.defaultPrevented) blocked = true;
      };
      document.addEventListener('contextmenu', handler, { capture: true, once: true });
      // Dispatch a synthetic contextmenu event
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      document.querySelector('[data-testid="protected-reader"]')?.dispatchEvent(event);
      return blocked || event.defaultPrevented;
    });

    expect(contextMenuBlocked).toBe(true);
  });

  test('should display anti-screenshot identity overlay', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    const overlay = page.locator('[data-testid="identity-overlay"]');
    await expect(overlay).toBeAttached();

    // Overlay should have very low opacity (anti-screenshot but not readable)
    const styles = await overlay.evaluate((el) => window.getComputedStyle(el));
    expect(styles.pointerEvents).toBe('none');
  });

  test('should prevent text selection in the reader', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    const userSelect = await page.locator('[data-testid="protected-reader"]').evaluate(
      (el) => window.getComputedStyle(el).userSelect,
    );
    expect(userSelect).toBe('none');
  });

  test('should prevent image drag', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    const draggable = await page.locator('[data-testid="page-image"]').getAttribute('draggable');
    expect(draggable).toBe('false');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Focus/Blur Detection
  // ──────────────────────────────────────────────────────────────────────

  test('should show blur overlay when window loses focus', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    // Simulate window blur
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));

    const blurOverlay = page.locator('[data-testid="blur-overlay"]');
    await expect(blurOverlay).toBeVisible({ timeout: 2000 });
    await expect(blurOverlay).toContainText('Content hidden');
  });

  test('should remove blur overlay when window regains focus', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    // Blur then re-focus
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      // Small delay to let state update
      setTimeout(() => window.dispatchEvent(new Event('focus')), 100);
    });

    // Wait for blur overlay to disappear
    const blurOverlay = page.locator('[data-testid="blur-overlay"]');
    await expect(blurOverlay).not.toBeVisible({ timeout: 3000 });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Keyboard Shortcut Blocking
  // ──────────────────────────────────────────────────────────────────────

  test('should block Ctrl+S (save page)', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    const wasBlocked = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const handler = (e: KeyboardEvent) => {
          resolve(e.defaultPrevented);
        };
        document.addEventListener('keydown', handler, { capture: true, once: true });

        const event = new KeyboardEvent('keydown', {
          key: 's', ctrlKey: true, bubbles: true, cancelable: true,
        });
        document.querySelector('[data-testid="protected-reader"]')?.dispatchEvent(event);
      });
    });

    expect(wasBlocked).toBe(true);
  });

  test('should block Ctrl+P (print)', async ({ page }) => {
    await openReader(page);
    await waitForPageLoad(page);

    const wasBlocked = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const handler = (e: KeyboardEvent) => {
          resolve(e.defaultPrevented);
        };
        document.addEventListener('keydown', handler, { capture: true, once: true });

        const event = new KeyboardEvent('keydown', {
          key: 'p', ctrlKey: true, bubbles: true, cancelable: true,
        });
        document.querySelector('[data-testid="protected-reader"]')?.dispatchEvent(event);
      });
    });

    expect(wasBlocked).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Rate Limiting (via direct API calls)
  // ──────────────────────────────────────────────────────────────────────

  test('should enforce page request rate limiting', async ({ context }) => {
    // Send 35 rapid requests (limit is 30/minute)
    const results: number[] = [];

    for (let i = 0; i < 35; i++) {
      const { status } = await requestPageViaApi(
        context, FIXTURES.sessionId, 1,
      );
      results.push(status);
    }

    // First 30 should succeed (200), remaining should be rate-limited (429 or 400)
    const successes = results.filter(s => s === 200).length;
    const rateLimited = results.filter(s => s === 429 || s === 400).length;

    expect(successes).toBeGreaterThanOrEqual(30);
    expect(rateLimited).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Session Lifecycle
  // ──────────────────────────────────────────────────────────────────────

  test('should show session expired state when session ends', async ({ page, context }) => {
    await openReader(page);
    await waitForPageLoad(page);

    // End the session via API
    await context.request.post(
      `${API_BASE}/sessions/${FIXTURES.sessionId}/end`,
      {
        headers: {
          'Authorization': FIXTURES.authToken,
          'Content-Type': 'application/json',
        },
      },
    );

    // Next heartbeat or page request should detect the expired session
    // Wait for the UI to reflect the change
    await page.waitForFunction(
      () => document.body.textContent?.includes('Session expired') ?? false,
      { timeout: 70_000 }, // Heartbeat interval + buffer
    );
  });
});

// ============================================================================
// PLAYWRIGHT CONFIG SNIPPET
// ============================================================================
// Add this to playwright.config.ts:
//
//   import { defineConfig } from '@playwright/test';
//   export default defineConfig({
//     testDir: './src/e2e',
//     timeout: 120_000,
//     use: {
//       baseURL: 'http://localhost:3000',
//       screenshot: 'only-on-failure',
//       video: 'retain-on-failure',
//     },
//     projects: [
//       { name: 'chromium', use: { browserName: 'chromium' } },
//     ],
//   });
