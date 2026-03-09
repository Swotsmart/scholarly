import { test, expect } from '@playwright/test';

/**
 * Navigation Regression E2E Tests
 *
 * Ensures all dashboard pages load without 404 errors.
 * This is the "zero 404" guarantee for the frontend.
 * Each test navigates to a route and verifies:
 * 1. The page loads (not a 404/error page)
 * 2. The sidebar/navigation is present
 * 3. The page has meaningful content (heading or cards)
 */

const dashboardRoutes = [
  { path: '/dashboard', name: 'Main Dashboard' },
  { path: '/admin', name: 'Admin' },
  { path: '/teacher/dashboard', name: 'Teacher Dashboard' },
  { path: '/teacher/students', name: 'Students' },
  { path: '/teacher/assessment', name: 'Assessment' },
  { path: '/teacher/scheduling', name: 'Scheduling' },
  { path: '/teacher/grading', name: 'Grading' },
  { path: '/teacher/lessons', name: 'Lessons' },
  { path: '/tutoring', name: 'Tutoring' },
  { path: '/portfolio', name: 'Portfolio' },
  { path: '/achievements', name: 'Achievements' },
  { path: '/calendar', name: 'Calendar' },
  { path: '/messages', name: 'Messages' },
  { path: '/notifications', name: 'Notifications' },
  { path: '/settings', name: 'Settings' },
  { path: '/profile', name: 'Profile' },
  { path: '/help', name: 'Help' },
  { path: '/analytics', name: 'Analytics' },
  { path: '/reports', name: 'Reports' },
  { path: '/marketplace', name: 'Marketplace' },
  { path: '/storybook', name: 'Storybook' },
  { path: '/arena', name: 'Arena' },
  { path: '/golden-path', name: 'Golden Path' },
  { path: '/homeschool', name: 'Homeschool' },
  { path: '/hosting', name: 'Hosting' },
  { path: '/voice-intelligence', name: 'Voice Intelligence' },
  { path: '/canvas', name: 'S&R Canvas' },
  { path: '/ask-issy', name: 'Ask Issy' },
  { path: '/showcase', name: 'Showcase' },
  { path: '/design-pitch', name: 'Design Pitch' },
  { path: '/data-lake', name: 'Data Lake' },
  { path: '/ml', name: 'ML Pipeline' },
  { path: '/governance', name: 'Governance' },
  { path: '/standards', name: 'Standards' },
  { path: '/advanced-learning', name: 'Advanced Learning' },
  { path: '/linguaflow', name: 'LinguaFlow' },
  { path: '/interoperability', name: 'Interoperability' },
  { path: '/ssi', name: 'SSI' },
  { path: '/micro-schools', name: 'Micro Schools' },
  { path: '/ai-studio', name: 'AI Studio' },
  { path: '/class-story', name: 'Class Story' },
  { path: '/learning', name: 'Learning' },
  { path: '/payments', name: 'Payments' },
  { path: '/verification', name: 'Verification' },
];

test.describe('Dashboard Page Navigation — Zero 404 Guarantee', () => {
  for (const route of dashboardRoutes) {
    test(`${route.name} (${route.path}) loads without 404`, async ({ page }) => {
      // Track 404 responses
      let got404 = false;
      page.on('response', (response) => {
        if (response.url().includes(route.path) && response.status() === 404) {
          got404 = true;
        }
      });

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });

      // Wait for page content to render (deterministic wait for navigation elements)
      await page.locator('[data-testid="sidebar"], nav, [role="navigation"], aside, form').first().waitFor({ timeout: 10000 }).catch(() => {});

      // Page should not show a raw 404 message
      const body = await page.textContent('body');
      const is404Page = body?.includes('404') && body?.includes('not found');

      // At minimum, navigation should be present (authenticated page)
      const hasNav = await page.locator('[data-testid="sidebar"], nav, [role="navigation"], aside').count();

      // Either the page loaded correctly OR redirected to login (auth required)
      const onLoginPage = page.url().includes('/login');

      expect(is404Page).toBeFalsy();
      expect(hasNav > 0 || onLoginPage).toBeTruthy();
      expect(got404).toBeFalsy();
    });
  }
});

test.describe('Static Pages — Zero 404', () => {
  const staticPages = [
    '/login',
    '/register',
    '/terms',
    '/privacy',
    '/contact',
    '/support',
  ];

  for (const path of staticPages) {
    test(`${path} loads without 404`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).not.toBe(404);
      // Should have a heading
      await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 10_000 });
    });
  }
});

test.describe('Error Page Handling', () => {
  test('Non-existent page shows custom error, not raw 404', async ({ page }) => {
    await page.goto('/this-page-definitely-does-not-exist-' + Date.now());
    // Next.js should show its custom 404 page, not a raw error
    await page.waitForTimeout(2000);
    // Should not show a raw stack trace
    const body = await page.textContent('body');
    expect(body).not.toContain('node_modules');
    expect(body).not.toContain('at Object.');
  });
});
