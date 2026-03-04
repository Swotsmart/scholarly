import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper } from '../helpers';

/**
 * Common E2E Tests — Cross-Role Pages
 *
 * Pages accessible to multiple roles: profile, settings, notifications,
 * ai-buddy, analytics, design-pitch, portfolio, and other shared modules.
 *
 * Pre-authenticated as: teacher@scholarly.app (default)
 */

// =============================================================================
// Profile & Settings
// =============================================================================

test.describe('Profile & Settings', () => {
  test('profile page loads', async ({ page }) => {
    await navigateTo(page, '/profile');
    await new StateHelper(page).expectNoErrors();
  });

  test('settings page loads', async ({ page }) => {
    await navigateTo(page, '/settings');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// AI & Intelligence
// =============================================================================

test.describe('AI Pages', () => {
  test('AI buddy loads', async ({ page }) => {
    await navigateTo(page, '/ai-buddy');
    await new StateHelper(page).expectNoErrors();
  });

  test('AI studio loads', async ({ page }) => {
    await navigateTo(page, '/ai-studio');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// Analytics & Reports
// =============================================================================

test.describe('Analytics & Reports', () => {
  test('analytics loads', async ({ page }) => {
    await navigateTo(page, '/analytics');
    await new StateHelper(page).expectNoErrors();
  });

  test('reports loads', async ({ page }) => {
    await navigateTo(page, '/reports');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// Arena
// =============================================================================

test.describe('Arena', () => {
  const arenaPages = [
    '/arena',
  ];

  for (const path of arenaPages) {
    test(`${path} loads without errors`, async ({ page }) => {
      await navigateTo(page, path);
      await new StateHelper(page).expectNoErrors();
    });
  }
});

// =============================================================================
// Comprehensive Smoke — Every Remaining Module
// =============================================================================

test.describe('Module Smoke Tests', () => {
  const modules = [
    { path: '/dashboard', name: 'main dashboard' },
    { path: '/achievements', name: 'achievements' },
    { path: '/calendar', name: 'calendar' },
    { path: '/canvas', name: 'canvas' },
    { path: '/class-story', name: 'class story' },
    { path: '/data-lake', name: 'data lake' },
    { path: '/help', name: 'help' },
    { path: '/messages', name: 'messages' },
    { path: '/notifications', name: 'notifications' },
    { path: '/payments', name: 'payments' },
    { path: '/verification', name: 'verification' },
  ];

  for (const m of modules) {
    test(`${m.name} loads without errors`, async ({ page }) => {
      await navigateTo(page, m.path);
      await new StateHelper(page).expectNoErrors();
    });
  }
});

// =============================================================================
// Design Pitch (7 pages)
// =============================================================================

test.describe('Design Pitch', () => {
  test('landing page loads', async ({ page }) => {
    await navigateTo(page, '/design-pitch');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// Golden Path (4 pages)
// =============================================================================

test.describe('Golden Path', () => {
  test('landing page loads', async ({ page }) => {
    await navigateTo(page, '/golden-path');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// Homeschool (9 pages)
// =============================================================================

test.describe('Homeschool', () => {
  test('landing page loads', async ({ page }) => {
    await navigateTo(page, '/homeschool');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// Hosting (9 pages)
// =============================================================================

test.describe('Hosting', () => {
  test('landing page loads', async ({ page }) => {
    await navigateTo(page, '/hosting');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// LinguaFlow (12 pages)
// =============================================================================

test.describe('LinguaFlow', () => {
  test('landing page loads', async ({ page }) => {
    await navigateTo(page, '/linguaflow');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// Marketplace (5 pages)
// =============================================================================

test.describe('Marketplace', () => {
  test('landing page loads', async ({ page }) => {
    await navigateTo(page, '/marketplace');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// Portfolio (6 pages)
// =============================================================================

test.describe('Portfolio', () => {
  test('landing page loads', async ({ page }) => {
    await navigateTo(page, '/portfolio');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// Advanced Learning (8 pages)
// =============================================================================

test.describe('Advanced Learning', () => {
  test('landing page loads', async ({ page }) => {
    await navigateTo(page, '/advanced-learning');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// Governance (6 pages)
// =============================================================================

test.describe('Governance', () => {
  test('landing page loads', async ({ page }) => {
    await navigateTo(page, '/governance');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// SSI (4 pages)
// =============================================================================

test.describe('SSI', () => {
  test('landing page loads', async ({ page }) => {
    await navigateTo(page, '/ssi');
    await new StateHelper(page).expectNoErrors();
  });
});

// =============================================================================
// Micro-Schools (5 pages)
// =============================================================================

test.describe('Micro-Schools', () => {
  test('landing page loads', async ({ page }) => {
    await navigateTo(page, '/micro-schools');
    await new StateHelper(page).expectNoErrors();
  });
});
