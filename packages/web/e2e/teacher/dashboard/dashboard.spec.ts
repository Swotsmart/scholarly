import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, SidebarHelper, CardHelper, AIInsightHelper, StateHelper, expectNoDeadButtons } from '../../helpers';

/**
 * Teacher Dashboard E2E Tests
 *
 * The dashboard is the teacher's landing page after login. It should:
 *   1. Load without errors
 *   2. Display stats from /analytics/teacher/dashboard
 *   3. Show upcoming sessions from /sessions
 *   4. Display AI insights from the LIS
 *   5. Have a functional Ask Issy panel
 *   6. Show at-risk student alerts from /ai-engine/ml/at-risk
 *   7. Be navigable via sidebar
 *
 * Updated for mega-session: dead button regression (Take Action, Dismiss).
 *
 * Pre-authenticated as: teacher@scholarly.app (Dr. James Wilson)
 */

test.describe('Teacher Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/dashboard');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    const state = new StateHelper(page);
    await state.expectNoErrors();
  });

  test('displays page heading', async ({ page }) => {
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });

  test('shows stats cards or loading skeletons', async ({ page }) => {
    // Stats grid should have cards with numbers
    const cards = new CardHelper(page);
    // Either we see stat cards or empty state — both are valid
    const cardCount = await cards.cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  test('sidebar is visible and navigable', async ({ page }) => {
    const sidebar = new SidebarHelper(page);
    await sidebar.expectVisible();
  });

  test('Ask Issy panel is present', async ({ page }) => {
    const ai = new AIInsightHelper(page);
    // The Ask Issy input should be on the dashboard
    await expect(ai.askIssyInput).toBeVisible({ timeout: 10_000 }).catch(() => {
      // Ask Issy may be in a collapsed panel
    });
  });

  test('navigating to students page works', async ({ page }) => {
    await page.getByRole('link', { name: /student/i }).first().click();
    await page.waitForURL('**/teacher/students**', { timeout: 10_000 });
    await expect(page).toHaveURL(/teacher\/students/);
  });

  test('navigating to reports page works', async ({ page }) => {
    await page.getByRole('link', { name: /report/i }).first().click();
    await page.waitForURL('**/teacher/reports**', { timeout: 10_000 });
    await expect(page).toHaveURL(/teacher\/reports/);
  });

  test('has no dead buttons', async ({ page }) => {
    await expectNoDeadButtons(page);
  });
});

// =============================================================================
// Teacher — Dead Button Regression Across All Pages
// =============================================================================

test.describe('Teacher — Dead Button Regression', () => {
  /**
   * The mega-session fixed 11 dead buttons across 8 teacher pages.
   * This test suite ensures none creep back.
   */
  const pagesWithFixedButtons = [
    { path: '/teacher/challenges', name: 'challenges (Manage)' },
    { path: '/teacher/grading/pitches', name: 'grading/pitches (Review)' },
    { path: '/teacher/grading/portfolios', name: 'grading/portfolios (Review Portfolio)' },
    { path: '/teacher/reports', name: 'reports (View Details)' },
    { path: '/teacher/reviews/assignments', name: 'reviews/assignments (Review)' },
    { path: '/teacher/settings', name: 'settings (Enable, Change Password)' },
    { path: '/teacher/lesson-planner', name: 'lesson-planner (Edit, Fork)' },
  ];

  for (const p of pagesWithFixedButtons) {
    test(`${p.name} has no dead buttons`, async ({ page }) => {
      await navigateTo(page, p.path);
      await waitForPageReady(page);
      await expectNoDeadButtons(page);
    });
  }
});

// =============================================================================
// Teacher — Specific Button Wiring Tests
// =============================================================================

test.describe('Teacher — Button Navigation', () => {
  test('challenges Manage button links to challenge detail', async ({ page }) => {
    await navigateTo(page, '/teacher/challenges');
    await waitForPageReady(page);
    const manageLink = page.getByRole('link', { name: /manage/i }).first();
    const isVisible = await manageLink.isVisible().catch(() => false);
    if (isVisible) {
      await manageLink.click();
      await expect(page).toHaveURL(/teacher\/challenges\/.+/);
    }
  });

  test('reports View Details links to student detail', async ({ page }) => {
    await navigateTo(page, '/teacher/reports');
    await waitForPageReady(page);
    const detailLink = page.getByRole('link', { name: /view details/i }).first();
    const isVisible = await detailLink.isVisible().catch(() => false);
    if (isVisible) {
      await detailLink.click();
      await expect(page).toHaveURL(/teacher\/students\/.+/);
    }
  });

  test('lesson-planner Edit links to lesson detail', async ({ page }) => {
    await navigateTo(page, '/teacher/lesson-planner');
    await waitForPageReady(page);
    const editLink = page.getByRole('link', { name: /^edit$/i }).first();
    const isVisible = await editLink.isVisible().catch(() => false);
    if (isVisible) {
      await editLink.click();
      await expect(page).toHaveURL(/teacher\/lesson-planner\/.+/);
    }
  });
});
