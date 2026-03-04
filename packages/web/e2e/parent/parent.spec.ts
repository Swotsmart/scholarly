import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper, CardHelper, AIInsightHelper, DemoDataHelper, expectNoDeadButtons } from '../helpers';

/**
 * Parent Module E2E Tests
 *
 * Pre-authenticated as: parent@scholarly.app (David Smith)
 * 17 pages wired to /api/v1/parent/* via useParent hook.
 * DEMO_MODE renders Patterson family WA data.
 *
 * Updated for mega-session: added Patterson family data checks
 * and dead button regression assertions.
 */

// =============================================================================
// Dashboard & Core
// =============================================================================

test.describe('Parent Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/parent/dashboard');
    await waitForPageReady(page);
  });

  test('loads without errors', async ({ page }) => {
    await new StateHelper(page).expectNoErrors();
  });

  test('shows heading', async ({ page }) => {
    await expect(page.getByText(/dashboard|welcome/i).first()).toBeVisible();
  });

  test('shows children summary or family stats', async ({ page }) => {
    const cards = new CardHelper(page);
    expect(await cards.cards.count()).toBeGreaterThanOrEqual(1);
  });

  test('DEMO_MODE shows Patterson family data', async ({ page }) => {
    await new DemoDataHelper(page).expectPattersonFamily();
  });
});

test.describe('Parent Landing', () => {
  test('loads without errors', async ({ page }) => {
    await navigateTo(page, '/parent');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// Children
// =============================================================================

test.describe('Children', () => {
  test('loads without errors', async ({ page }) => {
    await navigateTo(page, '/parent/children');
    await new StateHelper(page).expectNoErrors();
  });

  test('shows child cards or empty state', async ({ page }) => {
    await navigateTo(page, '/parent/children');
    await waitForPageReady(page);
    const isEmpty = await new StateHelper(page).isEmptyState();
    const cards = await new CardHelper(page).cards.count();
    expect(isEmpty || cards > 0).toBeTruthy();
  });

  test('has no dead buttons', async ({ page }) => {
    await navigateTo(page, '/parent/children');
    await waitForPageReady(page);
    await expectNoDeadButtons(page);
  });
});

// =============================================================================
// Progress (4 pages)
// =============================================================================

test.describe('Progress', () => {
  const progressPages = [
    { path: '/parent/progress', name: 'overview' },
    { path: '/parent/progress/attendance', name: 'attendance' },
    { path: '/parent/progress/grades', name: 'grades' },
    { path: '/parent/progress/learning', name: 'learning' },
  ];

  for (const p of progressPages) {
    test(`${p.name} loads without errors`, async ({ page }) => {
      await navigateTo(page, p.path);
      await new StateHelper(page).expectNoErrors();
    });
  }
});

// =============================================================================
// Messages (3 pages)
// =============================================================================

test.describe('Messages', () => {
  test('inbox loads', async ({ page }) => {
    await navigateTo(page, '/parent/messages');
    await new StateHelper(page).expectNoErrors();
  });

  test('teacher messages loads', async ({ page }) => {
    await navigateTo(page, '/parent/messages/teachers');
    await new StateHelper(page).expectNoErrors();
  });

  test('tutor messages loads', async ({ page }) => {
    await navigateTo(page, '/parent/messages/tutors');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// Payments (3 pages)
// =============================================================================

test.describe('Payments', () => {
  const paymentPages = [
    { path: '/parent/payments', name: 'overview' },
    { path: '/parent/payments/history', name: 'history' },
    { path: '/parent/payments/subscriptions', name: 'subscriptions' },
  ];

  for (const p of paymentPages) {
    test(`${p.name} loads without errors`, async ({ page }) => {
      await navigateTo(page, p.path);
      await new StateHelper(page).expectNoErrors();
    });
  }
});

// =============================================================================
// Tutoring (3 pages)
// =============================================================================

test.describe('Tutoring', () => {
  const tutoringPages = [
    { path: '/parent/tutoring', name: 'overview' },
    { path: '/parent/tutoring/bookings', name: 'bookings' },
    { path: '/parent/tutoring/search', name: 'search' },
  ];

  for (const p of tutoringPages) {
    test(`${p.name} loads without errors`, async ({ page }) => {
      await navigateTo(page, p.path);
      await new StateHelper(page).expectNoErrors();
    });
  }
});

// =============================================================================
// Other
// =============================================================================

test.describe('Other Parent Pages', () => {
  test('portfolio loads', async ({ page }) => {
    await navigateTo(page, '/parent/portfolio');
    await new StateHelper(page).expectNoErrors();
  });

  test('calendar loads', async ({ page }) => {
    await navigateTo(page, '/parent/calendar');
    await new StateHelper(page).expectNoErrors();
  });
});
