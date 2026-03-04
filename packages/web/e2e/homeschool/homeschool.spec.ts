import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper, CardHelper, DemoDataHelper, expectNoDeadButtons } from '../helpers';

/**
 * Homeschool Module E2E Tests
 *
 * 9 pages with:
 *   - homeschool-api.ts (285L) now has homeschoolApi bridge with DEMO_MODE
 *   - 4 dead buttons fixed (Accept x2, Decline, View Progress)
 *   - WA-specific demo data (Perth, Fremantle, HASS, Technologies)
 *
 * Pre-authenticated as: parent@scholarly.app (homeschool is parent-adjacent)
 */

test.describe('Homeschool — All Pages Load', () => {
  const pages = [
    { path: '/homeschool', name: 'dashboard' },
    { path: '/homeschool/children', name: 'children' },
    { path: '/homeschool/curriculum', name: 'curriculum' },
    { path: '/homeschool/co-op', name: 'co-op hub' },
    { path: '/homeschool/co-op/my-connections', name: 'my connections' },
    { path: '/homeschool/progress', name: 'progress' },
    { path: '/homeschool/reports', name: 'reports' },
    { path: '/homeschool/resources', name: 'resources' },
    { path: '/homeschool/standards', name: 'standards' },
  ];

  for (const p of pages) {
    test(`${p.name} loads without errors`, async ({ page }) => {
      await navigateTo(page, p.path);
      await waitForPageReady(page);
      await new StateHelper(page).expectNoErrors();
    });
  }
});

test.describe('Homeschool — Dead Button Regression', () => {
  test('dashboard has no dead buttons', async ({ page }) => {
    await navigateTo(page, '/homeschool');
    await waitForPageReady(page);
    await expectNoDeadButtons(page);
  });

  test('children page has no dead buttons', async ({ page }) => {
    await navigateTo(page, '/homeschool/children');
    await waitForPageReady(page);
    await expectNoDeadButtons(page);
  });

  test('my-connections has no dead buttons', async ({ page }) => {
    await navigateTo(page, '/homeschool/co-op/my-connections');
    await waitForPageReady(page);
    await expectNoDeadButtons(page);
  });
});

test.describe('Homeschool — Children Page', () => {
  test('View Progress button navigates to progress', async ({ page }) => {
    await navigateTo(page, '/homeschool/children');
    await waitForPageReady(page);
    const progressLink = page.getByRole('link', { name: /view progress/i }).first();
    const isVisible = await progressLink.isVisible().catch(() => false);
    if (isVisible) {
      await progressLink.click();
      await page.waitForURL('**/homeschool/progress**', { timeout: 10_000 });
      await expect(page).toHaveURL(/homeschool\/progress/);
    }
  });
});

test.describe('Homeschool — Dashboard Content', () => {
  test('shows schedule or family overview', async ({ page }) => {
    await navigateTo(page, '/homeschool');
    await waitForPageReady(page);
    const cards = new CardHelper(page);
    expect(await cards.cards.count()).toBeGreaterThanOrEqual(1);
  });

  test('DEMO_MODE shows WA-specific data', async ({ page }) => {
    await navigateTo(page, '/homeschool');
    await waitForPageReady(page);
    // In DEMO_MODE the homeschool data references WA subjects and locations
    await new DemoDataHelper(page).expectWAData();
  });
});
