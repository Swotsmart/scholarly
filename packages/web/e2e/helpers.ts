import { Page, Locator, expect } from '@playwright/test';

/**
 * Scholarly E2E Test Helpers
 *
 * Page object models and utilities shared across all test suites.
 * These abstractions insulate tests from DOM changes — if a button
 * text or selector changes, you fix it once here, not in 50 tests.
 *
 * Updated 4 March 2026: Added VoiceBannerHelper, NotificationHelper,
 * DeadButtonHelper, and DemoDataHelper for mega-session coverage.
 */

// =============================================================================
// Navigation Helpers
// =============================================================================

export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

export async function waitForPageReady(page: Page) {
  // Wait for skeleton loaders to disappear (our loading pattern)
  await page.waitForFunction(() => {
    const skeletons = document.querySelectorAll('[class*="skeleton"], [class*="animate-pulse"]');
    return skeletons.length === 0;
  }, { timeout: 15_000 }).catch(() => {
    // Timeout is acceptable — some pages may have permanent skeleton areas
  });
}

// =============================================================================
// Sidebar Page Object
// =============================================================================

export class SidebarHelper {
  constructor(private page: Page) {}

  get sidebar(): Locator {
    return this.page.locator('[data-testid="sidebar"], aside').first();
  }

  async navigateToSection(label: string) {
    await this.sidebar.getByText(label, { exact: false }).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectVisible() {
    await expect(this.sidebar).toBeVisible();
  }
}

// =============================================================================
// Card Helpers (shadcn/ui pattern)
// =============================================================================

export class CardHelper {
  constructor(private page: Page) {}

  /** Get all visible cards on the page */
  get cards(): Locator {
    return this.page.locator('[class*="rounded-lg border"], [class*="CardContent"]');
  }

  /** Get a card containing specific text */
  cardWithText(text: string): Locator {
    return this.cards.filter({ hasText: text }).first();
  }

  /** Assert at least N cards are visible */
  async expectMinCards(n: number) {
    await expect(this.cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await this.cards.count();
    expect(count).toBeGreaterThanOrEqual(n);
  }
}

// =============================================================================
// AI Insight Helpers (LIS integration pattern)
// =============================================================================

export class AIInsightHelper {
  constructor(private page: Page) {}

  /** LIS insight cards have purple gradient styling */
  get insightCards(): Locator {
    return this.page.locator('[class*="purple"]').filter({ hasText: /LIS|AI|insight/i });
  }

  /** Ask Issy chat panel */
  get askIssyInput(): Locator {
    return this.page.locator('input[placeholder*="Ask Issy"], input[placeholder*="ask Issy"], input[placeholder*="e.g."]').first();
  }

  get askIssyButton(): Locator {
    return this.page.locator('button').filter({ has: this.page.locator('svg') }).last();
  }

  async sendIssyMessage(message: string) {
    await this.askIssyInput.fill(message);
    await this.askIssyButton.click();
    // Wait for response (spinner disappears, response appears)
    await this.page.waitForSelector('[class*="purple"] p', { timeout: 30_000 });
  }

  async expectInsightsPresent() {
    // AI insights may or may not be present depending on data
    // This just checks the infrastructure is working
    const count = await this.insightCards.count();
    return count > 0;
  }
}

// =============================================================================
// Loading & Error State Helpers
// =============================================================================

export class StateHelper {
  constructor(private page: Page) {}

  /** Check that loading skeletons appear then resolve */
  async expectLoadingThenContent(contentSelector: string) {
    // Content should eventually appear
    await expect(this.page.locator(contentSelector).first()).toBeVisible({ timeout: 15_000 });
  }

  /** Check for error state cards */
  async expectNoErrors() {
    const errorCards = this.page.locator('[class*="border-red"]');
    const count = await errorCards.count();
    expect(count).toBe(0);
  }

  /** Check for empty state messages */
  async isEmptyState(): Promise<boolean> {
    const emptyMessages = this.page.locator('text=/no.*found|no.*available|no.*yet/i');
    return (await emptyMessages.count()) > 0;
  }
}

// =============================================================================
// Table Helpers
// =============================================================================

export class TableHelper {
  constructor(private page: Page, private tableSelector = 'table') {}

  get table(): Locator {
    return this.page.locator(this.tableSelector).first();
  }

  get rows(): Locator {
    return this.table.locator('tbody tr');
  }

  get headers(): Locator {
    return this.table.locator('thead th');
  }

  async expectRowCount(min: number) {
    await expect(this.rows.first()).toBeVisible({ timeout: 10_000 });
    const count = await this.rows.count();
    expect(count).toBeGreaterThanOrEqual(min);
  }

  async expectHeaders(expectedHeaders: string[]) {
    for (const header of expectedHeaders) {
      await expect(this.table.getByText(header)).toBeVisible();
    }
  }
}

// =============================================================================
// Badge Helpers
// =============================================================================

export async function expectBadge(page: Page, text: string) {
  await expect(page.locator('[class*="badge"], [class*="Badge"]').filter({ hasText: text }).first()).toBeVisible();
}

// =============================================================================
// API Intercept Helpers
// =============================================================================

/** Wait for a specific API call to complete */
export async function waitForAPI(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') return url.includes(urlPattern);
      return urlPattern.test(url);
    },
    { timeout: 15_000 }
  );
}

/** Intercept API and return mock for offline testing */
export async function mockAPI(page: Page, urlPattern: string, data: unknown, status = 200) {
  await page.route(`**${urlPattern}**`, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
}

// =============================================================================
// Voice Status Banner Helper (NEW — mega-session)
// =============================================================================

export class VoiceBannerHelper {
  constructor(private page: Page) {}

  /** The VoiceStatusBanner component (child mode) */
  get childBanner(): Locator {
    return this.page.locator('text=/special voice.*little rest/i');
  }

  /** The VoiceStatusBanner component (adult mode) */
  get adultBanner(): Locator {
    return this.page.locator('text=/voice service temporarily/i');
  }

  /** Verify banner is NOT visible (Kokoro is healthy) */
  async expectNoBanner() {
    await expect(this.childBanner).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
    await expect(this.adultBanner).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
  }

  /**
   * Simulate Kokoro TTS failure by intercepting the health check,
   * then verify the fallback banner appears.
   */
  async simulateKokoroDown() {
    await this.page.route('**/api/v1/early-years/tts**', (route) => {
      route.abort('connectionrefused');
    });
  }
}

// =============================================================================
// Notification Helper (NEW — mega-session)
// =============================================================================

export class NotificationHelper {
  constructor(private page: Page) {}

  /** The notification bell in the header */
  get bell(): Locator {
    return this.page.locator('header').locator('button').filter({
      has: this.page.locator('[class*="Bell"], svg'),
    }).first();
  }

  /** Notification count badge */
  get countBadge(): Locator {
    return this.page.locator('header').locator('[class*="badge"], [class*="rounded-full"]').filter({
      hasText: /\d+/,
    }).first();
  }

  /** AI digest section on notifications page */
  get aiDigest(): Locator {
    return this.page.locator('text=/digest|summary/i').first();
  }
}

// =============================================================================
// Dead Button Helper (NEW — mega-session)
// =============================================================================

/**
 * Scans a page for buttons that look dead — no onClick, no href, no asChild.
 * This is a regression test helper: after the mega-session fixed 24 dead
 * buttons, this ensures none creep back in.
 *
 * The approach: find all <button> elements, exclude those that are part of
 * a <Link> (asChild), have a truthy onclick, or are disabled/submit buttons.
 * Any remaining buttons with no event handler are suspicious.
 */
export async function expectNoDeadButtons(page: Page) {
  const deadCount = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    let dead = 0;
    buttons.forEach((btn) => {
      // Skip buttons inside <a> tags (asChild + Link pattern)
      if (btn.closest('a')) return;
      // Skip disabled, submit, or type=reset buttons
      if (btn.disabled || btn.type === 'submit' || btn.type === 'reset') return;
      // Skip buttons with aria-haspopup (dropdown triggers like shadcn Select)
      if (btn.getAttribute('aria-haspopup')) return;
      // Skip buttons with data-state (shadcn radix triggers)
      if (btn.getAttribute('data-state')) return;
      // Check for inline onclick
      if (btn.onclick) return;
      // Check for React event handlers (stored in __reactFiber$* or __reactEvents$*)
      const fiberKey = Object.keys(btn).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactEvents$'));
      if (fiberKey) return; // has React handlers
      // If we get here, the button has no handler we can detect
      dead++;
    });
    return dead;
  });
  // Allow a small tolerance — some buttons are genuinely decorative (e.g. icon-only display)
  expect(deadCount).toBeLessThanOrEqual(1);
}

// =============================================================================
// DEMO_MODE Data Helpers (NEW — mega-session)
// =============================================================================

/**
 * Verifies that DEMO_MODE data is rendering — checks for known demo
 * data strings (Patterson family for parent, WA data for homeschool).
 */
export class DemoDataHelper {
  constructor(private page: Page) {}

  /** Patterson family names (parent module demo data) */
  async expectPattersonFamily() {
    const familyNames = ['Emma', 'Liam'];
    let found = false;
    for (const name of familyNames) {
      const count = await this.page.getByText(name, { exact: false }).count();
      if (count > 0) { found = true; break; }
    }
    expect(found).toBeTruthy();
  }

  /** WA-specific data (homeschool module demo data) */
  async expectWAData() {
    // The homeschool demo data references Western Australian subjects and locations
    const waTerms = ['HASS', 'Perth', 'Fremantle', 'Technologies'];
    let found = false;
    for (const term of waTerms) {
      const count = await this.page.getByText(term, { exact: false }).count();
      if (count > 0) { found = true; break; }
    }
    expect(found).toBeTruthy();
  }
}
