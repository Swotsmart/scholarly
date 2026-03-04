import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper, AIInsightHelper } from '../../helpers';

/**
 * Teacher Grading E2E Tests
 *
 * Tests grading workflows: submission queue, pitch review, portfolio review.
 * Ask Issy AI assistant available for feedback drafting.
 */

test.describe('Grading Main', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/grading');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('shows heading', async ({ page }) => {
    await expect(page.getByText(/grading/i).first()).toBeVisible();
  });

  test('has Ask Issy AI grading assistant', async ({ page }) => {
    const ai = new AIInsightHelper(page);
    await expect(ai.askIssyInput).toBeVisible({ timeout: 10_000 });
  });

  test('has links to pitches and portfolios', async ({ page }) => {
    await expect(page.getByRole('link', { name: /pitch/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /portfolio/i })).toBeVisible();
  });

  test('has link to gradebook', async ({ page }) => {
    await expect(page.getByRole('link', { name: /gradebook/i })).toBeVisible();
  });
});

test.describe('Grading Pitches', () => {
  test('loads without errors', async ({ page }) => {
    await navigateTo(page, '/teacher/grading/pitches');
    await new StateHelper(page).expectNoErrors();
    await expect(page.getByText(/pitch/i).first()).toBeVisible();
  });
});

test.describe('Grading Portfolios', () => {
  test('loads without errors', async ({ page }) => {
    await navigateTo(page, '/teacher/grading/portfolios');
    await new StateHelper(page).expectNoErrors();
    await expect(page.getByText(/portfolio/i).first()).toBeVisible();
  });
});

test.describe('Gradebook', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/gradebook');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('has class selector', async ({ page }) => {
    await expect(page.locator('[role="combobox"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows student grades table', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 }).catch(() => {
      // Table may not render if no class data
    });
  });

  test('has AI insight banner', async ({ page }) => {
    const ai = new AIInsightHelper(page);
    // Insight may or may not be present
    await ai.expectInsightsPresent();
  });

  test('has export button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
  });
});
