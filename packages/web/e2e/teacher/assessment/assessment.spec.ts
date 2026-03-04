import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper, CardHelper, AIInsightHelper } from '../../helpers';

/**
 * Teacher Assessment E2E Tests
 *
 * Tests assessment management: listing, creation, library browsing.
 * All data comes from /content?type=assessment endpoints.
 */

test.describe('Assessment List', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/assessment');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('shows heading with count', async ({ page }) => {
    await expect(page.getByText(/assessment/i).first()).toBeVisible();
  });

  test('has search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('has link to create new assessment', async ({ page }) => {
    await expect(page.getByRole('link', { name: /create|new/i })).toBeVisible();
  });

  test('has link to assessment library', async ({ page }) => {
    await expect(page.getByRole('link', { name: /library/i })).toBeVisible();
  });

  test('shows assessment cards or empty state', async ({ page }) => {
    const isEmpty = await new StateHelper(page).isEmptyState();
    const cards = await new CardHelper(page).cards.count();
    expect(isEmpty || cards > 0).toBeTruthy();
  });
});

test.describe('Assessment Builder', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/assessment/builder');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('has Ask Issy panel for AI assistance', async ({ page }) => {
    const ai = new AIInsightHelper(page);
    await expect(ai.askIssyInput).toBeVisible({ timeout: 10_000 });
  });

  test('has title input field', async ({ page }) => {
    await expect(page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i))).toBeVisible();
  });

  test('has type selector', async ({ page }) => {
    await expect(page.locator('[role="combobox"]').first()).toBeVisible();
  });

  test('has back link to assessment list', async ({ page }) => {
    await expect(page.getByRole('link', { name: /back/i })).toBeVisible();
  });
});

test.describe('Assessment Library', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/assessment/library');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('has search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('shows library grid or empty state', async ({ page }) => {
    const isEmpty = await new StateHelper(page).isEmptyState();
    const cards = await new CardHelper(page).cards.count();
    expect(isEmpty || cards > 0).toBeTruthy();
  });
});
