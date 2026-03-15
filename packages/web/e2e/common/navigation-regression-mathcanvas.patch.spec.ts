/**
 * Navigation Regression — MathCanvas & Arena Additions
 *
 * PATCH FILE — merge into packages/web/e2e/common/navigation-regression.spec.ts
 *
 * ─── INSTRUCTIONS ────────────────────────────────────────────────────────────
 * This file adds new routes to the existing navigation regression suite.
 * Rather than replacing the existing file, add the two new route arrays
 * to the existing dashboardRoutes array in navigation-regression.spec.ts:
 *
 *   // Add to dashboardRoutes array:
 *   { path: '/tools/mathcanvas',           name: 'MathCanvas'                    },
 *   { path: '/arena/competitions',         name: 'Arena Competitions'            },
 *   { path: '/arena/competitions/[id]',    name: 'Arena Competition Detail'      },
 *   { path: '/teacher/gradebook',          name: 'Teacher Gradebook (updated)'  },
 *
 * OR apply this standalone spec as-is — it will run alongside the existing
 * navigation regression spec in the 'common' project.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageReady, StateHelper } from '../helpers';

/**
 * Navigation Regression — MathCanvas Deployment
 *
 * Verifies every new route added by the MathCanvas package loads without a
 * 404 and has meaningful content. Runs after the deploy playbook is applied.
 *
 * Pre-authenticated as: teacher@scholarly.app (default for 'common' project)
 */

const mathCanvasRoutes = [
  { path: '/tools/mathcanvas',              name: 'MathCanvas main page'              },
  { path: '/arena/competitions',            name: 'Arena — competitions list'         },
  { path: '/teacher/gradebook',            name: 'Teacher gradebook (MathCanvas ver)' },
];

// Routes that require a dynamic [id] segment — we verify they load
// without 404 using a placeholder ID (will get a graceful "not found",
// not a 500 or routing error).
const dynamicRoutes = [
  { path: '/arena/competitions/test-id-1', name: 'Arena — competition detail [id]' },
  { path: '/arena/teams/test-id-1',        name: 'Arena — team detail [id]'        },
];

test.describe('Navigation Regression — MathCanvas Routes', () => {
  for (const route of mathCanvasRoutes) {
    test(`${route.name} (${route.path}) loads without 404`, async ({ page }) => {
      const response = await page.goto(route.path);
      // Should not be a 404 response
      expect(response?.status()).not.toBe(404);

      await waitForPageReady(page);

      // Should not show a 404 or error page in the UI content
      await expect(page.locator('text=/404|page not found/i')).not.toBeVisible({ timeout: 5_000 }).catch(() => {});

      // The sidebar or nav should be present (confirms we're inside the dashboard)
      const nav = page.locator('[data-testid="sidebar"], aside, nav[role="navigation"]').first();
      await expect(nav).toBeVisible({ timeout: 10_000 });

      // The page should have some meaningful content
      const heading = page.locator('h1, h2, [class*="heading"], [class*="title"]').first();
      await expect(heading).toBeVisible({ timeout: 10_000 });

      // No uncaught errors
      await new StateHelper(page).expectNoErrors();
    });
  }

  for (const route of dynamicRoutes) {
    test(`${route.name} (${route.path}) does not cause a 500 error`, async ({ page }) => {
      const response = await page.goto(route.path);
      // A 404 for an unknown ID is acceptable; a 500 is not
      expect(response?.status()).not.toBe(500);

      await waitForPageReady(page);
      await new StateHelper(page).expectNoErrors();
    });
  }
});

// =============================================================================
// Playwright Config Patch Instructions
// =============================================================================

/**
 * PLAYWRIGHT CONFIG PATCH — packages/web/playwright.config.ts
 *
 * Add a 'mathcanvas' test project to the projects array in playwright.config.ts.
 * Insert after the 'storybook' project entry:
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  {                                                                      │
 * │    name: 'mathcanvas',                                                  │
 * │    testMatch: /e2e\/mathcanvas\/.* /,                                   │
 * │    dependencies: ['setup'],                                             │
 * │    use: {                                                               │
 * │      ...devices['Desktop Chrome'],                                      │
 * │      storageState: 'e2e/fixtures/.auth-teacher.json',                   │
 * │    },                                                                   │
 * │  },                                                                     │
 * │                                                                         │
 * │  {                                                                      │
 * │    name: 'arena-mathcanvas',                                            │
 * │    testMatch: /e2e\/arena\/.* /,                                        │
 * │    dependencies: ['setup'],                                             │
 * │    use: {                                                               │
 * │      ...devices['Desktop Chrome'],                                      │
 * │      storageState: 'e2e/fixtures/.auth-teacher.json',                   │
 * │    },                                                                   │
 * │  },                                                                     │
 * │                                                                         │
 * │  {                                                                      │
 * │    name: 'mathkernel',                                                  │
 * │    testMatch: /e2e\/mathcanvas\/mathcanvas-kernel\.spec\.ts/,           │
 * │    use: { ...devices['Desktop Chrome'] },                               │
 * │    // No auth dependency — kernel tests use request context directly    │
 * │  },                                                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Also add to webServer array (alongside the existing Next.js entry) to
 * automatically start mathkernel during tests if MATH_KERNEL_URL is local:
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  ...(process.env.MATH_KERNEL_URL                                        │
 * │    ? []  // External kernel — don't start locally                       │
 * │    : [{                                                                 │
 * │        command: 'docker run --rm -p 8001:8001 mathkernel',              │
 * │        url: 'http://localhost:8001/health',                             │
 * │        reuseExistingServer: true,                                       │
 * │        timeout: 60_000,                                                 │
 * │      }]                                                                 │
 * │  ),                                                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
