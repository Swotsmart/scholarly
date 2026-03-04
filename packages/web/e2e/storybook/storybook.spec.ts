import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper, CardHelper } from '../helpers';

/**
 * Storybook Module E2E Tests
 *
 * 8 new pages introduced in the mega-session tarball under /(dashboard)/storybook/.
 * All pages consume useStorybook hook with DEMO_MODE fallback. The backend
 * services (26,336L in packages/api/src/services/storybook/) are not yet
 * wired to tsconfig — these tests validate the frontend rendering only.
 *
 * Pre-authenticated as: teacher@scholarly.app
 */

test.describe('Storybook — Main Pages', () => {
  test('landing page loads and shows library overview', async ({ page }) => {
    await navigateTo(page, '/storybook');
    await waitForPageReady(page);
    await new StateHelper(page).expectNoErrors();
    // Should show heading and at least one content section
    await expect(page.getByText(/storybook|library|stories/i).first()).toBeVisible();
  });

  test('create page loads with generation form', async ({ page }) => {
    await navigateTo(page, '/storybook/create');
    await waitForPageReady(page);
    await new StateHelper(page).expectNoErrors();
    // The create page should have input fields or a form-like UI
    await expect(page.getByText(/create|generate|new story/i).first()).toBeVisible();
  });

  test('library page loads and shows book grid', async ({ page }) => {
    await navigateTo(page, '/storybook/library');
    await waitForPageReady(page);
    await new StateHelper(page).expectNoErrors();
    await expect(page.getByText(/library|browse|collection/i).first()).toBeVisible();
  });

  test('review page loads with review queue', async ({ page }) => {
    await navigateTo(page, '/storybook/review');
    await waitForPageReady(page);
    await new StateHelper(page).expectNoErrors();
    await expect(page.getByText(/review|queue|pending/i).first()).toBeVisible();
  });

  test('moderation page loads', async ({ page }) => {
    await navigateTo(page, '/storybook/moderation');
    await waitForPageReady(page);
    await new StateHelper(page).expectNoErrors();
  });
});

test.describe('Storybook — Marketplace', () => {
  test('marketplace landing loads', async ({ page }) => {
    await navigateTo(page, '/storybook/marketplace');
    await waitForPageReady(page);
    await new StateHelper(page).expectNoErrors();
    await expect(page.getByText(/marketplace|community/i).first()).toBeVisible();
  });

  test('bounties page loads', async ({ page }) => {
    await navigateTo(page, '/storybook/marketplace/bounties');
    await waitForPageReady(page);
    await new StateHelper(page).expectNoErrors();
    await expect(page.getByText(/bount|request/i).first()).toBeVisible();
  });

  test('creators page loads', async ({ page }) => {
    await navigateTo(page, '/storybook/marketplace/creators');
    await waitForPageReady(page);
    await new StateHelper(page).expectNoErrors();
    await expect(page.getByText(/creator|contributor/i).first()).toBeVisible();
  });
});
