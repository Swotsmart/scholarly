import { defineConfig, devices } from '@playwright/test';

/**
 * Scholarly Platform — Playwright E2E Configuration
 *
 * Multi-project setup: each user role gets its own test project with
 * pre-authenticated storage state, so role-specific tests skip the
 * login flow on every test. A shared "setup" project handles login
 * once per role and saves the session cookie to a fixture file.
 *
 * Projects:
 *   setup        → logs in as each role, saves auth state
 *   auth         → unauthenticated flows (login, register, forgot-password)
 *   teacher      → teacher dashboard, students, grading, scheduling, ML
 *   parent       → parent dashboard, children, tutoring bookings
 *   admin        → admin dashboard, user management, settings
 *   tutor        → tutor scheduling, sessions, earnings
 *   common       → shared flows (profile, settings, notifications, early-years)
 *   storybook    → storybook pages (create, library, review, marketplace)   [NEW]
 *   golden-path  → golden path engine pages (adaptation, curiosity, optimizer) [NEW]
 *   homeschool   → homeschool pages (children, co-op, curriculum, resources) [NEW]
 *   hosting      → hosting pages (theme, domains, tours, offerings, settings) [NEW]
 *   notifications → notification page + header bell                          [NEW]
 *   mobile       → mobile viewport regression
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI
    ? [['html', { open: 'never' }], ['github'], ['json', { outputFile: 'test-results/results.json' }]]
    : [['html', { open: 'on-failure' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: CI ? 'retain-on-failure' : 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Accept self-signed certs in dev
    ignoreHTTPSErrors: true,
  },

  /* Start the Next.js dev server before tests if not already running */
  webServer: [
    {
      command: 'cd packages/web && pnpm dev',
      url: BASE_URL,
      reuseExistingServer: !CI,
      timeout: 120_000,
      cwd: '../../', // monorepo root
    },
  ],

  projects: [
    /* === Auth setup (runs first, saves session state) === */
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },

    /* === Unauthenticated flows === */
    {
      name: 'auth',
      testMatch: /e2e\/auth\/.*/,
      use: { ...devices['Desktop Chrome'] },
    },

    /* === Teacher role === */
    {
      name: 'teacher',
      testMatch: /e2e\/teacher\/.*/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/fixtures/.auth-teacher.json',
      },
    },

    /* === Parent role === */
    {
      name: 'parent',
      testMatch: /e2e\/parent\/.*/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/fixtures/.auth-parent.json',
      },
    },

    /* === Admin role === */
    {
      name: 'admin',
      testMatch: /e2e\/admin\/.*/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/fixtures/.auth-admin.json',
      },
    },

    /* === Tutor role === */
    {
      name: 'tutor',
      testMatch: /e2e\/tutoring\/.*/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/fixtures/.auth-tutor.json',
      },
    },

    /* === Cross-role / common flows === */
    {
      name: 'common',
      testMatch: /e2e\/common\/.*/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/fixtures/.auth-teacher.json', // default to teacher
      },
    },

    /* === Storybook module (NEW) === */
    {
      name: 'storybook',
      testMatch: /e2e\/storybook\/.*/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/fixtures/.auth-teacher.json',
      },
    },

    /* === Golden Path module (NEW) === */
    {
      name: 'golden-path',
      testMatch: /e2e\/golden-path\/.*/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/fixtures/.auth-teacher.json',
      },
    },

    /* === Homeschool module (NEW) === */
    {
      name: 'homeschool',
      testMatch: /e2e\/homeschool\/.*/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/fixtures/.auth-parent.json', // homeschool is parent-adjacent
      },
    },

    /* === Hosting module (NEW) === */
    {
      name: 'hosting',
      testMatch: /e2e\/hosting\/.*/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/fixtures/.auth-teacher.json',
      },
    },

    /* === Notifications (NEW) === */
    {
      name: 'notifications',
      testMatch: /e2e\/notifications\/.*/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/fixtures/.auth-teacher.json',
      },
    },

    /* === Mobile viewport (teacher) === */
    {
      name: 'mobile',
      testMatch: /e2e\/teacher\/dashboard\/.*/,
      dependencies: ['setup'],
      use: {
        ...devices['iPhone 14'],
        storageState: 'e2e/fixtures/.auth-teacher.json',
      },
    },

    /* === API Hardening (no auth needed) === */
    {
      name: 'hardening',
      testMatch: /e2e\/common\/hardening\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    /* === Security Regression (no auth needed) === */
    {
      name: 'security',
      testMatch: /e2e\/common\/security-regression\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
