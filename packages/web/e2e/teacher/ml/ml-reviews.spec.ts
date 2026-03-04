import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper, AIInsightHelper, CardHelper } from '../../helpers';

/**
 * Teacher ML & Reviews E2E Tests
 *
 * ML overview, model management, predictions engine,
 * peer review queue, and remaining pages.
 */

test.describe('ML Overview', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/ml');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('shows active model count', async ({ page }) => {
    await expect(page.getByText(/model|ML/i).first()).toBeVisible();
  });

  test('has stat cards for models, detections, insights', async ({ page }) => {
    const cards = new CardHelper(page);
    expect(await cards.cards.count()).toBeGreaterThanOrEqual(1);
  });

  test('has links to models and predictions sub-pages', async ({ page }) => {
    await expect(page.getByRole('link', { name: /model/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /prediction/i })).toBeVisible();
  });

  test('shows live AI insights when available', async ({ page }) => {
    const ai = new AIInsightHelper(page);
    // Non-blocking — insights depend on data
    await ai.expectInsightsPresent();
  });
});

test.describe('ML Models', () => {
  test('loads without errors', async ({ page }) => {
    await navigateTo(page, '/teacher/ml/models');
    await new StateHelper(page).expectNoErrors();
    await expect(page.getByText(/model/i).first()).toBeVisible();
  });

  test('model cards have retrain button', async ({ page }) => {
    await navigateTo(page, '/teacher/ml/models');
    await waitForPageReady(page);
    // Retrain buttons exist if models exist
    const retrainBtn = page.getByRole('button', { name: /retrain/i }).first();
    const isEmpty = await new StateHelper(page).isEmptyState();
    if (!isEmpty) {
      await expect(retrainBtn).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe('ML Predictions', () => {
  test('loads without errors', async ({ page }) => {
    await navigateTo(page, '/teacher/ml/predictions');
    await new StateHelper(page).expectNoErrors();
  });

  test('has student ID input for risk prediction', async ({ page }) => {
    await navigateTo(page, '/teacher/ml/predictions');
    await expect(page.getByPlaceholder(/student/i)).toBeVisible();
  });

  test('has predict button', async ({ page }) => {
    await navigateTo(page, '/teacher/ml/predictions');
    await expect(page.getByRole('button', { name: /predict/i })).toBeVisible();
  });
});

test.describe('Reviews', () => {
  test('list page loads', async ({ page }) => {
    await navigateTo(page, '/teacher/reviews');
    await new StateHelper(page).expectNoErrors();
    await expect(page.getByText(/review/i).first()).toBeVisible();
  });

  test('assignments page loads', async ({ page }) => {
    await navigateTo(page, '/teacher/reviews/assignments');
    await new StateHelper(page).expectNoErrors();
    await expect(page.getByText(/assignment/i).first()).toBeVisible();
  });
});

test.describe('Remaining Teacher Pages', () => {
  test('settings loads', async ({ page }) => {
    await navigateTo(page, '/teacher/settings');
    await new StateHelper(page).expectNoErrors();
  });

  test('reports loads', async ({ page }) => {
    await navigateTo(page, '/teacher/reports');
    await new StateHelper(page).expectNoErrors();
  });

  test('classes loads', async ({ page }) => {
    await navigateTo(page, '/teacher/classes');
    await new StateHelper(page).expectNoErrors();
  });

  test('journeys loads', async ({ page }) => {
    await navigateTo(page, '/teacher/journeys');
    await new StateHelper(page).expectNoErrors();
  });

  test('help-requests loads', async ({ page }) => {
    await navigateTo(page, '/teacher/help-requests');
    await new StateHelper(page).expectNoErrors();
  });
});
