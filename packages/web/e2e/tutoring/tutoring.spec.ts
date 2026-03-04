import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper, CardHelper } from '../helpers';

/**
 * Tutoring Module E2E Tests
 *
 * Pre-authenticated as: tutor@scholarly.app (Sarah Chen)
 * 17 pages covering: dashboard, sessions, bookings, earnings,
 * availability, resources, reviews, students, profile.
 */

test.describe('Tutor Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/tutoring');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('shows heading', async ({ page }) => {
    await expect(page.getByText(/tutor|dashboard/i).first()).toBeVisible();
  });
});

test.describe('Sessions', () => {
  test('sessions list loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/sessions');
    await new StateHelper(page).expectNoErrors();
  });

  test('upcoming sessions loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/sessions/upcoming');
    await new StateHelper(page).expectNoErrors();
  });

  test('session history loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/sessions/history');
    await new StateHelper(page).expectNoErrors();
  });
});

test.describe('Bookings & Availability', () => {
  test('bookings page loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/bookings');
    await new StateHelper(page).expectNoErrors();
  });

  test('availability page loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/availability');
    await new StateHelper(page).expectNoErrors();
  });

  test('booking page loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/book');
    await new StateHelper(page).expectNoErrors();
  });

  test('search page loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/search');
    await new StateHelper(page).expectNoErrors();
  });
});

test.describe('Earnings', () => {
  test('earnings overview loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/earnings/overview');
    await new StateHelper(page).expectNoErrors();
  });

  test('payouts page loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/earnings/payouts');
    await new StateHelper(page).expectNoErrors();
  });
});

test.describe('Resources', () => {
  test('materials page loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/resources/materials');
    await new StateHelper(page).expectNoErrors();
  });

  test('shared resources loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/resources/shared');
    await new StateHelper(page).expectNoErrors();
  });
});

test.describe('Other Tutor Pages', () => {
  test('students list loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/students');
    await new StateHelper(page).expectNoErrors();
  });

  test('reviews loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/reviews');
    await new StateHelper(page).expectNoErrors();
  });

  test('profile loads', async ({ page }) => {
    await navigateTo(page, '/tutoring/profile');
    await new StateHelper(page).expectNoErrors();
  });
});
