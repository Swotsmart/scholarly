import { test as setup, expect } from '@playwright/test';

/**
 * Global Setup — Authenticate as Each Role
 *
 * Runs once before all test projects. Logs in as each demo user
 * and saves the authenticated browser state (cookies, localStorage)
 * to fixture files. Role-specific test projects then load this
 * state so every test starts pre-authenticated.
 *
 * Demo accounts (from demo-accounts page):
 *   admin@scholarly.app    → Platform Admin
 *   teacher@scholarly.app  → Teacher (Dr. James Wilson)
 *   tutor@scholarly.app    → Tutor (Sarah Chen)
 *   parent@scholarly.app   → Parent (David Smith)
 *
 * All use password: demo123
 */

const DEMO_PASSWORD = 'demo123';

const accounts = [
  { email: 'teacher@scholarly.app', role: 'teacher', path: 'e2e/fixtures/.auth-teacher.json', dashboard: '/teacher/dashboard' },
  { email: 'parent@scholarly.app', role: 'parent', path: 'e2e/fixtures/.auth-parent.json', dashboard: '/parent/dashboard' },
  { email: 'admin@scholarly.app', role: 'admin', path: 'e2e/fixtures/.auth-admin.json', dashboard: '/admin/dashboard' },
  { email: 'tutor@scholarly.app', role: 'tutor', path: 'e2e/fixtures/.auth-tutor.json', dashboard: '/tutoring' },
];

for (const account of accounts) {
  setup(`authenticate as ${account.role}`, async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill credentials
    await page.getByLabel(/email/i).fill(account.email);
    await page.getByLabel(/password/i).fill(DEMO_PASSWORD);

    // Submit
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Wait for redirect to role-specific dashboard
    await page.waitForURL(`**${account.dashboard}**`, { timeout: 15_000 });

    // Verify we landed on an authenticated page (sidebar should be present)
    await expect(page.locator('[data-testid="sidebar"], nav, [role="navigation"]').first()).toBeVisible({ timeout: 10_000 });

    // Save authenticated state
    await page.context().storageState({ path: account.path });
  });
}
