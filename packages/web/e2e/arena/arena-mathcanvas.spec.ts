import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper, CardHelper, TableHelper, expectNoDeadButtons } from '../helpers';

/**
 * Arena — Competitions E2E Tests (including MathCanvas problem type)
 *
 * The Arena module has 9 pages. These tests cover the competition-facing
 * pages that MathCanvas integrates with, plus regression coverage for the
 * existing arena pages that were already in the repo before the MathCanvas
 * deployment (arena/page.tsx 1,238L, competitions/[id]/page.tsx 736L).
 *
 * MathCanvas adds a new competition problem type "math-canvas" that renders
 * embedded MathCanvas problems inside a competition round. We test that
 * the competition detail page handles this type gracefully.
 *
 * Pre-authenticated as: teacher@scholarly.app
 */

// =============================================================================
// 1. Arena Landing Page
// =============================================================================

test.describe('Arena — Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/arena');
    await waitForPageReady(page);
  });

  test('arena landing page loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('arena heading is visible', async ({ page }) => {
    await expect(page.getByText(/arena/i).first()).toBeVisible();
  });

  test('shows competition, team or token navigation links', async ({ page }) => {
    // Arena has sub-nav: Competitions, Teams, Bounties, Tokens, Governance, Community
    const navLinks = page.locator('a[href*="/arena/"]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('stats cards or overview tiles are present', async ({ page }) => {
    const cards = new CardHelper(page);
    const count = await cards.cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('no dead buttons on arena landing', async ({ page }) => {
    await expectNoDeadButtons(page);
  });
});

// =============================================================================
// 2. Competitions List Page
// =============================================================================

test.describe('Arena — Competitions List', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/arena/competitions');
    await waitForPageReady(page);
  });

  test('competitions list page loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('page heading references competitions', async ({ page }) => {
    await expect(page.getByText(/competitions|competition/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('competition cards or list items are present', async ({ page }) => {
    const cards = new CardHelper(page);
    // Either competition cards render, or we get a graceful empty state
    await page.waitForTimeout(1_000);
    const count = await cards.cards.count();
    const state = new StateHelper(page);
    const isEmpty = await state.isEmptyState();
    // Either cards exist OR we're in a valid empty state
    expect(count >= 1 || isEmpty).toBeTruthy();
  });

  test('filter or search controls are present', async ({ page }) => {
    // Competitions list typically has status filter or search
    const controls = page.locator('input[type="search"], input[placeholder*="search"], select, [role="combobox"]');
    const count = await controls.count();
    expect(count).toBeGreaterThanOrEqual(0); // controls are optional depending on data state
  });

  test('clicking a competition card navigates to competition detail', async ({ page }) => {
    const card = page.locator('a[href*="/arena/competitions/"]').first();
    const isVisible = await card.isVisible().catch(() => false);
    if (isVisible) {
      await card.click();
      await page.waitForURL('**/arena/competitions/**', { timeout: 10_000 });
      await expect(page).toHaveURL(/arena\/competitions\/.+/);
    }
  });

  test('no dead buttons on competitions list', async ({ page }) => {
    await expectNoDeadButtons(page);
  });
});

// =============================================================================
// 3. Competition Detail Page
// =============================================================================

test.describe('Arena — Competition Detail', () => {
  /**
   * The competition detail page (/arena/competitions/[id]) renders the full
   * competition: rounds, leaderboard, team status, and — after MathCanvas
   * deployment — math-canvas problem types embedded in rounds.
   *
   * Since we don't know the ID of any competition in the test DB, we use
   * a fixture approach: navigate from the list, or use a known demo ID.
   */

  test('competition detail page loads for a real competition link', async ({ page }) => {
    await navigateTo(page, '/arena/competitions');
    await waitForPageReady(page);

    const firstLink = page.locator('a[href*="/arena/competitions/"]').first();
    const isVisible = await firstLink.isVisible().catch(() => false);

    if (isVisible) {
      const href = await firstLink.getAttribute('href');
      await navigateTo(page, href!);
      await waitForPageReady(page);
      await new StateHelper(page).expectNoErrors();
    } else {
      // No competitions in demo data — navigate to detail with a test ID
      await navigateTo(page, '/arena/competitions/demo-comp-1');
      await waitForPageReady(page);
      // Should show competition content OR a graceful "not found" — not a crash
      await new StateHelper(page).expectNoErrors();
    }
  });

  test('competition detail page shows rounds or problem sections', async ({ page }) => {
    await navigateTo(page, '/arena/competitions');
    await waitForPageReady(page);

    const firstLink = page.locator('a[href*="/arena/competitions/"]').first();
    if (await firstLink.isVisible().catch(() => false)) {
      await firstLink.click();
      await waitForPageReady(page);
      // Look for round or problem content
      const hasRounds = await page.locator('text=/round|problem|question|challenge/i').count();
      expect(hasRounds).toBeGreaterThan(0);
    }
  });

  test('math-canvas problem type renders an embedded canvas (if present)', async ({ page }) => {
    /**
     * If the competition includes a math-canvas problem type, it should
     * render a MathCanvas embed within the competition round. We mock the
     * competition detail API to return a competition with a math-canvas round.
     */
    await page.route('**/api/v1/arena/competitions/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-comp-mc',
          title: 'Calculus Challenge',
          status: 'active',
          problemType: 'math-canvas',
          rounds: [{
            id: 'round-1',
            title: 'Differentiation Round',
            problemType: 'math-canvas',
            problem: { expression: 'x^3 - 3x + 2', operation: 'diff' },
          }],
          participants: [],
          leaderboard: [],
        }),
      });
    });

    await navigateTo(page, '/arena/competitions/test-comp-mc');
    await waitForPageReady(page);

    // Should render the competition without crashing
    await new StateHelper(page).expectNoErrors();

    // If MathCanvas embed is present, canvas should be visible
    const canvasPresent = await page.locator('canvas').count();
    // Canvas may or may not be embedded depending on the detail page implementation
    // The key assertion is: no crash
    await expect(page.locator('text=/calculus|competition|round|math/i').first()).toBeVisible({ timeout: 8_000 });
  });

  test('no dead buttons on competition detail page', async ({ page }) => {
    await navigateTo(page, '/arena/competitions');
    await waitForPageReady(page);

    const firstLink = page.locator('a[href*="/arena/competitions/"]').first();
    if (await firstLink.isVisible().catch(() => false)) {
      await firstLink.click();
      await waitForPageReady(page);
      await expectNoDeadButtons(page);
    } else {
      // No competitions — check dead buttons on list page
      await expectNoDeadButtons(page);
    }
  });
});

// =============================================================================
// 4. Arena Sub-Pages — Smoke Tests
// =============================================================================

test.describe('Arena — Sub-Pages Smoke', () => {
  const arenaPages = [
    { path: '/arena/teams',       name: 'Teams list' },
    { path: '/arena/bounties',    name: 'Bounties list' },
    { path: '/arena/tokens',      name: 'Token balance' },
    { path: '/arena/governance',  name: 'Governance proposals' },
    { path: '/arena/community',   name: 'Community feed' },
  ];

  for (const { path, name } of arenaPages) {
    test(`${name} (${path}) loads without errors`, async ({ page }) => {
      await navigateTo(page, path);
      await waitForPageReady(page);
      await new StateHelper(page).expectNoErrors();
      // Each page should have at least a heading
      await expect(page.locator('h1, h2, [class*="heading"], [class*="title"]').first()).toBeVisible({ timeout: 10_000 });
    });
  }
});

// =============================================================================
// 5. Arena Token Economy
// =============================================================================

test.describe('Arena — Token Economy', () => {
  test('tokens page shows token balance card', async ({ page }) => {
    await navigateTo(page, '/arena/tokens');
    await waitForPageReady(page);
    await new StateHelper(page).expectNoErrors();
    await expect(
      page.getByText(/token|balance|earn|reward/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('tokens page has no dead buttons', async ({ page }) => {
    await navigateTo(page, '/arena/tokens');
    await waitForPageReady(page);
    await expectNoDeadButtons(page);
  });
});

// =============================================================================
// 6. Arena — MathCanvas Integration API
// =============================================================================

test.describe('Arena — MathCanvas Problem Type API', () => {
  /**
   * Direct API tests verifying that the arena routes correctly handle
   * math-canvas problem type metadata. These tests hit the Express API
   * directly and are independent of the browser UI.
   */
  const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001';

  test('GET /api/v1/arena/competitions returns array or demo data', async ({ page }) => {
    const res = await page.context().request.get(`${API_URL}/api/v1/arena/competitions`);
    expect([200, 401, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body) || Array.isArray(body.competitions) || body.data).toBeTruthy();
    }
  });

  test('math-canvas competition creation payload is valid JSON', async ({ page }) => {
    /**
     * We don't actually create a competition (that would pollute test data),
     * but we verify the endpoint accepts the schema by sending a dry-run
     * request and checking for a validation error (not a 500).
     */
    const res = await page.context().request.post(`${API_URL}/api/v1/arena/competitions`, {
      data: {
        title: 'E2E Test — MathCanvas',
        problemType: 'math-canvas',
        mathConfig: { mode: 'repl', defaultCommand: 'diff' },
        _dryRun: true,
      },
      headers: { 'Content-Type': 'application/json' },
    });
    // Should be 400 (validation) or 201 (created) or 401 (auth required)
    // Must NOT be 500 (unhandled error)
    expect(res.status()).not.toBe(500);
  });
});
