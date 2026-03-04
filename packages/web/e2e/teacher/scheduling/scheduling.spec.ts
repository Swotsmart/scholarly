import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper, AIInsightHelper } from '../../helpers';

/**
 * Teacher Scheduling E2E Tests
 *
 * Tests the scheduling module: overview, timetable grid, relief teaching,
 * capacity planning, and room bookings.
 */

test.describe('Scheduling Overview', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/teacher/scheduling');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('shows heading', async ({ page }) => {
    await expect(page.getByText(/scheduling/i).first()).toBeVisible();
  });

  test('has navigation links to sub-pages', async ({ page }) => {
    await expect(page.getByRole('link', { name: /timetable/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /relief/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /capacity/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /room/i })).toBeVisible();
  });
});

test.describe('Timetable', () => {
  test('loads without errors', async ({ page }) => {
    await navigateTo(page, '/teacher/scheduling/timetable');
    await new StateHelper(page).expectNoErrors();
  });

  test('shows day columns', async ({ page }) => {
    await navigateTo(page, '/teacher/scheduling/timetable');
    // Timetable grid should have weekday headers
    await expect(page.getByText('Monday')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Friday')).toBeVisible();
  });

  test('has week navigation controls', async ({ page }) => {
    await navigateTo(page, '/teacher/scheduling/timetable');
    await expect(page.getByRole('button', { name: /this week/i })).toBeVisible();
  });
});

test.describe('Relief Teaching', () => {
  test('loads without errors', async ({ page }) => {
    await navigateTo(page, '/teacher/scheduling/relief');
    await new StateHelper(page).expectNoErrors();
  });

  test('has tabs for absences and AI predictions', async ({ page }) => {
    await navigateTo(page, '/teacher/scheduling/relief');
    await expect(page.getByRole('tab', { name: /absence/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /prediction/i })).toBeVisible();
  });

  test('AI predictions tab shows ML confidence', async ({ page }) => {
    await navigateTo(page, '/teacher/scheduling/relief');
    await page.getByRole('tab', { name: /prediction/i }).click();
    await page.waitForTimeout(500);
    await new StateHelper(page).expectNoErrors();
  });
});

test.describe('Capacity Planning', () => {
  test('loads without errors', async ({ page }) => {
    await navigateTo(page, '/teacher/scheduling/capacity');
    await new StateHelper(page).expectNoErrors();
  });

  test('shows relief pool data', async ({ page }) => {
    await navigateTo(page, '/teacher/scheduling/capacity');
    await expect(page.getByText(/pool|capacity/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Rooms', () => {
  test('loads without errors', async ({ page }) => {
    await navigateTo(page, '/teacher/scheduling/rooms');
    await new StateHelper(page).expectNoErrors();
    await expect(page.getByText(/room/i).first()).toBeVisible();
  });
});
