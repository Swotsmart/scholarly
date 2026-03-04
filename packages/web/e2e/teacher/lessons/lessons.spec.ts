import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper, AIInsightHelper } from '../../helpers';

/**
 * Teacher Lessons & Standards E2E Tests
 *
 * Lesson planner, new lesson creation (with AI generation),
 * curriculum standards browser, challenges.
 */

test.describe('Lesson Planner', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/lesson-planner');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('has Ask Issy panel for lesson planning', async ({ page }) => {
    const ai = new AIInsightHelper(page);
    await expect(ai.askIssyInput).toBeVisible({ timeout: 10_000 });
  });

  test('has search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('has tabs for my plans and shared', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /my plan/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /shared/i })).toBeVisible();
  });

  test('has link to create new lesson', async ({ page }) => {
    await expect(page.getByRole('link', { name: /new/i })).toBeVisible();
  });

  test('can switch between tabs', async ({ page }) => {
    await page.getByRole('tab', { name: /shared/i }).click();
    // Tab content should update (no error)
    await page.waitForTimeout(500);
    await new StateHelper(page).expectNoErrors();
  });
});

test.describe('New Lesson', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/lessons/new');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('has AI lesson generator button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /generate/i })).toBeVisible();
  });

  test('has lesson detail form fields', async ({ page }) => {
    await expect(page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i))).toBeVisible();
    await expect(page.getByLabel(/subject/i).or(page.getByPlaceholder(/subject/i))).toBeVisible();
  });

  test('has back link to planner', async ({ page }) => {
    await expect(page.getByRole('link', { name: /back/i })).toBeVisible();
  });
});

test.describe('Standards', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/standards');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('shows heading with count', async ({ page }) => {
    await expect(page.getByText(/standard/i).first()).toBeVisible();
  });

  test('has search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });
});

test.describe('Challenges', () => {
  test('list page loads', async ({ page }) => {
    await navigateTo(page, '/teacher/challenges');
    await new StateHelper(page).expectNoErrors();
    await expect(page.getByText(/challenge/i).first()).toBeVisible();
  });

  test('create page loads with AI assistance', async ({ page }) => {
    await navigateTo(page, '/teacher/challenges/create');
    await new StateHelper(page).expectNoErrors();
    const ai = new AIInsightHelper(page);
    await expect(ai.askIssyInput).toBeVisible({ timeout: 10_000 });
  });
});
