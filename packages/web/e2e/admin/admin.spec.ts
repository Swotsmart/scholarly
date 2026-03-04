import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper, CardHelper, TableHelper } from '../helpers';

/**
 * Admin Module E2E Tests
 *
 * Pre-authenticated as: admin@scholarly.app (Platform Admin)
 * 22 pages covering: dashboard, user management, interoperability,
 * scheduling, marketplace, ML, governance, settings.
 */

// =============================================================================
// Dashboard & Core
// =============================================================================

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/admin/dashboard');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('shows admin heading', async ({ page }) => {
    await expect(page.getByText(/dashboard|admin/i).first()).toBeVisible();
  });

  test('shows platform stats', async ({ page }) => {
    const cards = new CardHelper(page);
    expect(await cards.cards.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('User Management', () => {
  test('loads without errors', async ({ page }) => {
    await navigateTo(page, '/admin/users');
    await new StateHelper(page).expectNoErrors();
  });

  test('shows user table or list', async ({ page }) => {
    await navigateTo(page, '/admin/users');
    await waitForPageReady(page);
    // Either a table or card list
    const hasTable = await page.locator('table').count() > 0;
    const hasCards = await new CardHelper(page).cards.count() > 0;
    expect(hasTable || hasCards).toBeTruthy();
  });
});

// =============================================================================
// Interoperability (6 pages — some with real API calls)
// =============================================================================

test.describe('Interoperability', () => {
  const interopPages = [
    { path: '/admin/interoperability', name: 'overview' },
    { path: '/admin/interoperability/edfi', name: 'Ed-Fi' },
    { path: '/admin/interoperability/lti', name: 'LTI' },
    { path: '/admin/interoperability/oneroster', name: 'OneRoster' },
    { path: '/admin/interoperability/badges', name: 'badges' },
    { path: '/admin/interoperability/case', name: 'CASE' },
  ];

  for (const p of interopPages) {
    test(`${p.name} page loads without errors`, async ({ page }) => {
      await navigateTo(page, p.path);
      await new StateHelper(page).expectNoErrors();
    });
  }
});

// =============================================================================
// Scheduling (4 pages)
// =============================================================================

test.describe('Admin Scheduling', () => {
  const schedulingPages = [
    { path: '/admin/scheduling/timetable', name: 'timetable' },
    { path: '/admin/scheduling/relief', name: 'relief' },
    { path: '/admin/scheduling/rooms', name: 'rooms' },
    { path: '/admin/scheduling/constraints', name: 'constraints' },
  ];

  for (const p of schedulingPages) {
    test(`${p.name} page loads without errors`, async ({ page }) => {
      await navigateTo(page, p.path);
      await new StateHelper(page).expectNoErrors();
    });
  }
});

// =============================================================================
// Other Admin Pages
// =============================================================================

test.describe('Other Admin Pages', () => {
  const pages = [
    { path: '/admin/settings', name: 'settings' },
    { path: '/admin/marketplace', name: 'marketplace' },
    { path: '/admin/ml', name: 'ML pipeline' },
    { path: '/admin/reports', name: 'reports' },
    { path: '/admin/payments', name: 'payments' },
    { path: '/admin/governance', name: 'governance' },
    { path: '/admin/micro-schools', name: 'micro-schools' },
    { path: '/admin/standards', name: 'standards' },
    { path: '/admin/menu-analytics', name: 'menu analytics' },
    { path: '/admin/menu-management', name: 'menu management' },
  ];

  for (const p of pages) {
    test(`${p.name} loads without errors`, async ({ page }) => {
      await navigateTo(page, p.path);
      await new StateHelper(page).expectNoErrors();
    });
  }
});
