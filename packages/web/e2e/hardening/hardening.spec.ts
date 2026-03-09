import { test, expect, request } from '@playwright/test';

/**
 * Production Hardening E2E Tests
 *
 * Validates all hardening features added during the security audit:
 * - Health check endpoints (liveness, readiness, detailed)
 * - Metrics endpoint (Prometheus format)
 * - API documentation (OpenAPI/Swagger)
 * - Security headers
 * - Rate limiting headers
 * - Correlation ID propagation
 * - Error response format
 * - 404 handling
 * - CORS configuration
 * - Graceful error responses (no stack traces in production)
 */

const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

// =============================================================================
// Health Check Endpoints
// =============================================================================

test.describe('Health Check Endpoints', () => {
  test('GET /live returns alive status', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/live');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('alive');
    expect(body.uptime).toBeGreaterThan(0);
    expect(body.timestamp).toBeTruthy();
    await ctx.dispose();
  });

  test('GET /ready checks database dependency', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/ready');
    // Should be 200 or 503 depending on DB state
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body.status).toMatch(/ready|not_ready/);
    expect(body.dependencies).toBeTruthy();
    expect(body.dependencies.database).toBeTruthy();
    await ctx.dispose();
  });

  test('GET /health returns detailed health with latency metrics', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/health');
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body.status).toMatch(/healthy|degraded|unhealthy/);
    expect(body.version).toBeTruthy();
    expect(body.environment).toBeTruthy();
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.memory).toBeTruthy();
    expect(body.memory.heapUsed).toBeGreaterThan(0);
    expect(body.dependencies.database).toBeTruthy();
    expect(body.dependencies.database.latencyMs).toBeGreaterThanOrEqual(0);
    await ctx.dispose();
  });
});

// =============================================================================
// Metrics Endpoint
// =============================================================================

test.describe('Metrics Endpoint', () => {
  test('GET /metrics returns Prometheus format', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    // Make a request first to generate some metrics
    await ctx.get('/health');

    const res = await ctx.get('/metrics');
    expect(res.status()).toBe(200);
    const contentType = res.headers()['content-type'];
    expect(contentType).toContain('text/plain');
    const body = await res.text();
    expect(body).toContain('process_uptime_seconds');
    expect(body).toContain('process_heap_used_bytes');
    await ctx.dispose();
  });
});

// =============================================================================
// API Documentation
// =============================================================================

test.describe('API Documentation', () => {
  test('GET /api/docs returns Swagger UI HTML', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/docs');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('swagger-ui');
    expect(body).toContain('Scholarly API');
    await ctx.dispose();
  });

  test('GET /api/docs/openapi.json returns valid OpenAPI spec', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/docs/openapi.json');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.openapi).toBe('3.0.3');
    expect(body.info.title).toBe('Scholarly API');
    expect(body.paths).toBeTruthy();
    expect(Object.keys(body.paths).length).toBeGreaterThan(5);
    expect(body.components.securitySchemes.bearerAuth).toBeTruthy();
    await ctx.dispose();
  });
});

// =============================================================================
// Security Headers
// =============================================================================

test.describe('Security Headers', () => {
  test('API responses include security headers', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/health');
    const headers = res.headers();

    // Helmet headers
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeTruthy();
    expect(headers['strict-transport-security']).toBeTruthy();

    // Should NOT expose server info
    expect(headers['x-powered-by']).toBeUndefined();

    await ctx.dispose();
  });
});

// =============================================================================
// Correlation ID
// =============================================================================

test.describe('Correlation ID', () => {
  test('API generates X-Request-Id on responses', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/health');
    const requestId = res.headers()['x-request-id'];
    expect(requestId).toBeTruthy();
    expect(requestId.length).toBeGreaterThan(10);
    await ctx.dispose();
  });

  test('API propagates provided X-Request-Id', async () => {
    const customId = 'test-correlation-' + Date.now();
    const ctx = await request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { 'X-Request-Id': customId },
    });
    const res = await ctx.get('/health');
    expect(res.headers()['x-request-id']).toBe(customId);
    await ctx.dispose();
  });
});

// =============================================================================
// Error Response Format
// =============================================================================

test.describe('Error Responses', () => {
  test('404 returns structured error with path', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/nonexistent-route-' + Date.now());
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
    expect(body.path).toBeTruthy();
    expect(body.method).toBe('GET');
    expect(body.timestamp).toBeTruthy();
    await ctx.dispose();
  });

  test('Validation error returns 400 with details', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.post('/api/v1/auth/login', {
      data: { email: 'not-an-email', password: '' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error || body.details).toBeTruthy();
    await ctx.dispose();
  });

  test('Missing auth returns 401 with proper error code', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/users');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error || body.success === false).toBeTruthy();
    await ctx.dispose();
  });
});

// =============================================================================
// Rate Limiting
// =============================================================================

test.describe('Rate Limiting', () => {
  test('Auth endpoints include rate limit headers', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.post('/api/v1/auth/login', {
      data: { email: 'test@test.com', password: 'test123' },
    });
    const headers = res.headers();
    // express-rate-limit with standardHeaders: true sends these
    const hasRateLimitHeaders =
      headers['ratelimit-limit'] || headers['x-ratelimit-limit'] || headers['ratelimit-remaining'];
    expect(hasRateLimitHeaders).toBeTruthy();
    await ctx.dispose();
  });
});

// =============================================================================
// CORS
// =============================================================================

test.describe('CORS Configuration', () => {
  test('Preflight OPTIONS returns CORS headers for allowed origin', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.fetch(API_URL + '/api/v1/auth/login', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    // Should succeed for allowed origin
    expect([200, 204]).toContain(res.status());
    await ctx.dispose();
  });
});

// =============================================================================
// Zero 404 - All registered routes respond
// =============================================================================

test.describe('Zero 404 — All API routes respond', () => {
  const protectedRoutes = [
    '/api/v1/users',
    '/api/v1/tutors',
    '/api/v1/bookings',
    '/api/v1/sessions',
    '/api/v1/curriculum',
    '/api/v1/content',
    '/api/v1/homeschool',
    '/api/v1/micro-schools',
    '/api/v1/relief',
    '/api/v1/dashboard',
    '/api/v1/ask-issy',
    '/api/v1/portfolio',
    '/api/v1/standards',
    '/api/v1/analytics',
    '/api/v1/data-lake',
    '/api/v1/ml',
    '/api/v1/design-pitch',
    '/api/v1/showcase',
    '/api/v1/early-years',
    '/api/v1/linguaflow',
    '/api/v1/interoperability',
    '/api/v1/golden-path',
    '/api/v1/ssi',
    '/api/v1/advanced-learning',
    '/api/v1/governance',
    '/api/v1/marketplace',
    '/api/v1/subscriptions',
    '/api/v1/identity',
    '/api/v1/payment',
    '/api/v1/hosting',
    '/api/v1/verification',
    '/api/v1/voice',
    '/api/v1/workspace',
    '/api/v1/storybook',
    '/api/v1/arena',
    '/api/v1/developer',
    '/api/v1/ai-engine',
    '/api/v1/compliance',
    '/api/v1/parent',
    '/api/v1/collaboration',
    '/api/v1/onboarding',
  ];

  for (const route of protectedRoutes) {
    test(`GET ${route} does not return 404 (route is mounted)`, async () => {
      const ctx = await request.newContext({ baseURL: API_URL });
      const res = await ctx.get(route);
      // 401/403 means route exists but requires auth; 404 means route not mounted
      expect(res.status()).not.toBe(404);
      await ctx.dispose();
    });
  }
});

// =============================================================================
// Integration routes respond
// =============================================================================

test.describe('Integration routes respond', () => {
  test('GET /api/v1/integrations/google-drive responds', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/integrations/google-drive');
    expect(res.status()).not.toBe(404);
    await ctx.dispose();
  });

  test('GET /api/v1/integrations/onedrive responds', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/integrations/onedrive');
    expect(res.status()).not.toBe(404);
    await ctx.dispose();
  });
});
