import { test, expect, request } from '@playwright/test';

/**
 * API Endpoint Smoke Tests
 *
 * Validates that all mounted API routes respond with valid HTTP status
 * codes (not 500). These test the Express backend at API_URL, not the
 * Next.js frontend. They run without browser context for speed.
 *
 * Updated for mega-session: added notification dashboard routes,
 * parent portal routes, and storybook routes.
 */

const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

test.describe('API Health', () => {
  test('API server is reachable', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/health');
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });
});

test.describe('Auth Endpoints', () => {
  test('POST /api/v1/auth/login accepts request', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.post('/api/v1/auth/login', {
      data: { email: 'teacher@scholarly.app', password: 'demo123' },
    });
    // Should return 200 (success) or 401 (bad creds) — never 500
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });
});

test.describe('Content Endpoints', () => {
  test('GET /api/v1/content responds', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/content');
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });
});

test.describe('Curriculum Endpoints', () => {
  test('GET /api/v1/curriculum/standards responds', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/curriculum/standards');
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });

  test('GET /api/v1/curriculum/lesson-plans responds', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/curriculum/lesson-plans');
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });
});

test.describe('Analytics Endpoints', () => {
  test('GET /api/v1/analytics responds', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/analytics');
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });
});

test.describe('User Endpoints', () => {
  test('GET /api/v1/users responds', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/users');
    // May return 401 without auth — that's fine, not 500
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });
});

test.describe('Relief Endpoints', () => {
  test('GET /api/v1/relief/teachers responds', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/relief/teachers');
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });

  test('GET /api/v1/relief/stats responds', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/relief/stats');
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });
});

test.describe('Collaboration Endpoints', () => {
  test('GET /api/v1/collaboration/lesson-plans responds', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/collaboration/lesson-plans');
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });
});

test.describe('Storybook Endpoints', () => {
  test('GET /api/v1/storybook route responds', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/storybook');
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });
});

test.describe('Developer Portal Endpoints', () => {
  test('GET /api/v1/developer-portal responds', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/developer-portal');
    expect(res.status()).toBeLessThan(500);
    await ctx.dispose();
  });
});

// =============================================================================
// NEW — Notification Dashboard Routes (mega-session)
// =============================================================================

test.describe('Notification Dashboard Endpoints', () => {
  const endpoints = [
    { method: 'GET', path: '/api/v1/dashboard/notifications', name: 'list notifications' },
    { method: 'GET', path: '/api/v1/dashboard/notifications/count', name: 'notification count' },
    { method: 'GET', path: '/api/v1/dashboard/notifications/preferences', name: 'notification prefs' },
    { method: 'POST', path: '/api/v1/dashboard/notifications/ai-digest', name: 'AI digest' },
    { method: 'POST', path: '/api/v1/dashboard/notifications/ai-insights', name: 'AI insights' },
  ];

  for (const ep of endpoints) {
    test(`${ep.method} ${ep.path} responds (${ep.name})`, async ({ }) => {
      const ctx = await request.newContext({ baseURL: API_URL });
      let res;
      if (ep.method === 'GET') {
        res = await ctx.get(ep.path);
      } else {
        res = await ctx.post(ep.path, { data: {} });
      }
      // 401/403 for unauthenticated is acceptable; 404 means route isn't mounted; 500 is a bug
      expect(res.status()).toBeLessThan(500);
      await ctx.dispose();
    });
  }
});

// =============================================================================
// NEW — Parent Portal Endpoints (mega-session)
// =============================================================================

test.describe('Parent Portal Endpoints', () => {
  const endpoints = [
    '/api/v1/parent-portal/family',
    '/api/v1/parent-portal/progress',
    '/api/v1/parent-portal/messages',
    '/api/v1/parent-portal/calendar',
    '/api/v1/parent-portal/payments',
    '/api/v1/parent-portal/tutoring',
  ];

  for (const path of endpoints) {
    test(`GET ${path} responds`, async ({ }) => {
      const ctx = await request.newContext({ baseURL: API_URL });
      const res = await ctx.get(path);
      expect(res.status()).toBeLessThan(500);
      await ctx.dispose();
    });
  }
});

// =============================================================================
// NEW — Voice TTS Endpoint (mega-session)
// =============================================================================

test.describe('Voice TTS Endpoint', () => {
  test('POST /api/v1/early-years/tts responds', async ({ }) => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.post('/api/v1/early-years/tts', {
      data: { text: 'hello', voicePersona: 'pip' },
    });
    // Kokoro may not be running in test env — 503 is acceptable, 500 is not
    expect([200, 401, 403, 404, 503]).toContain(res.status());
    await ctx.dispose();
  });
});
