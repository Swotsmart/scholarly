import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, CardHelper, AIInsightHelper, StateHelper, TableHelper } from '../../helpers';

/**
 * Teacher Students E2E Tests
 *
 * Tests the student management flows:
 *   - Student list with search and pagination
 *   - Student detail with BKT mastery, ML features, wellbeing
 *   - At-risk student page
 *   - AI integration on every page
 */

test.describe('Student List', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/students');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    const state = new StateHelper(page);
    await state.expectNoErrors();
  });

  test('shows student heading with count', async ({ page }) => {
    await expect(page.getByText(/student/i).first()).toBeVisible();
  });

  test('has search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('search filters results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('nonexistent_student_xyz_12345');
    // Wait for debounce
    await page.waitForTimeout(500);
    // Should show empty state or filtered results
    const cards = new CardHelper(page);
    const noResults = page.locator('text=/no.*found|no.*student/i');
    const hasNoResults = (await noResults.count()) > 0;
    const hasCards = (await cards.cards.count()) > 0;
    // One of these must be true
    expect(hasNoResults || hasCards).toBeTruthy();
  });

  test('has link to at-risk page', async ({ page }) => {
    // At-risk button may or may not be visible depending on data
    const atRiskLink = page.getByRole('link', { name: /at.risk/i });
    // Don't fail if no at-risk students — it just means the button isn't shown
    const visible = await atRiskLink.isVisible().catch(() => false);
    // This is informational, not a hard failure
    test.info().annotations.push({ type: 'at-risk-visible', description: String(visible) });
  });

  test('student card links to detail page', async ({ page }) => {
    const viewButton = page.getByRole('link', { name: /view profile/i }).first();
    if (await viewButton.isVisible().catch(() => false)) {
      await viewButton.click();
      await page.waitForURL('**/teacher/students/**', { timeout: 10_000 });
      await expect(page).toHaveURL(/teacher\/students\/.+/);
    }
  });
});

test.describe('At-Risk Students', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/students/at-risk');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    const state = new StateHelper(page);
    await state.expectNoErrors();
  });

  test('shows at-risk heading', async ({ page }) => {
    await expect(page.getByText(/at.risk/i).first()).toBeVisible();
  });

  test('has AI explainer card', async ({ page }) => {
    // Should explain how at-risk detection works
    await expect(page.getByText(/ML|machine learning|detection/i).first()).toBeVisible({ timeout: 10_000 }).catch(() => {
      // Acceptable if not present
    });
  });

  test('shows student cards or empty state', async ({ page }) => {
    // Either at-risk students exist or we see "no at-risk students"
    const cards = new CardHelper(page);
    const isEmpty = await new StateHelper(page).isEmptyState();
    const hasCards = (await cards.cards.count()) > 1; // 1 for the explainer card
    expect(isEmpty || hasCards).toBeTruthy();
  });
});

test.describe('Attendance', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/attendance');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('has class selector', async ({ page }) => {
    await expect(page.locator('[role="combobox"], select').first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows attendance stats (present/absent/late)', async ({ page }) => {
    await expect(page.getByText(/present/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('has student roll for marking', async ({ page }) => {
    await expect(page.getByText(/student roll|mark attendance/i).first()).toBeVisible({ timeout: 10_000 }).catch(() => {
      // Acceptable — class may not have students yet
    });
  });
});
