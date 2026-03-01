/**
 * ============================================================================
 * S&R Integration Tests: Squarespace Client + Cutover Service + Health Prober
 * ============================================================================
 *
 * Tests for the three "last track sections" that wire the migration
 * pipeline to external systems. Every test uses injected mocks — no
 * real HTTP calls, no real DNS lookups, no real Terraform executions.
 *
 * Test organisation:
 *   §1 — Squarespace Client (exportSite, downloadAsset, pagination, errors)
 *   §2 — Health Prober (DNS, SSL, HTTP, content match, aggregate status)
 *   §3 — Cutover Service (preflight, SSL, cutover, rollback, health delegation)
 *   §4 — Service Registry (wiring, mock registry, getService resolution)
 *
 * @module scholarly/sr/integrations/tests
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// We import types only — the actual module resolution happens at test time.
// For this test file, we inline the minimal type stubs needed since the
// test runs against the source files directly.

import {
  success,
  failure,
  Errors,
  type Result,
} from '../sr-workflow-engine';

import type {
  PlatformExportData,
  HealthCheckResult,
  CutoverService,
  PreflightResult,
  CutoverResult,
} from '../sr-migration-workflow-template';


// ============================================================================
// §0 — TEST UTILITIES
// ============================================================================

/** Create a mock fetch that returns canned responses keyed by URL pattern. */
function createMockFetch(routes: Record<string, { status: number; body: unknown; headers?: Record<string, string> }>): typeof globalThis.fetch {
  return (async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    for (const [pattern, response] of Object.entries(routes)) {
      if (url.includes(pattern)) {
        return {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          headers: new Map(Object.entries(response.headers ?? {})) as any,
          json: async () => response.body,
          text: async () => JSON.stringify(response.body),
          arrayBuffer: async () => new ArrayBuffer(8),
        } as Response;
      }
    }

    // Default: 404
    return {
      ok: false,
      status: 404,
      headers: new Map() as any,
      json: async () => ({ error: 'not found' }),
      text: async () => 'not found',
    } as Response;
  }) as typeof globalThis.fetch;
}

/** Create a mock shell executor with canned outputs. */
function createMockShell(responses: Record<string, { stdout: string; stderr: string; exitCode: number }>): (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return async (cmd: string) => {
    for (const [pattern, response] of Object.entries(responses)) {
      if (cmd.includes(pattern)) return response;
    }
    return { stdout: '', stderr: 'command not found', exitCode: 127 };
  };
}


// ============================================================================
// §1 — SQUARESPACE CLIENT TESTS
// ============================================================================

describe('SquarespaceClient', () => {
  // We import dynamically to avoid module resolution issues in test context
  let SquarespaceClient: any;
  let createSquarespaceClient: any;

  beforeEach(async () => {
    const mod = await import('./sr-squarespace-client');
    SquarespaceClient = mod.SquarespaceClient;
    createSquarespaceClient = mod.createSquarespaceClient;
  });

  describe('exportSite', () => {
    it('should aggregate pages, products, and posts into PlatformExportData', async () => {
      const mockFetch = createMockFetch({
        '/pages': {
          status: 200,
          body: {
            items: [
              { id: 'p1', urlId: 'about', title: 'About Us', body: '<p>Hello</p>' },
              { id: 'p2', urlId: 'contact', title: 'Contact', body: '<p>Email us</p>', collection: { id: 'blog1' } },
            ],
            pagination: { hasNextPage: false },
          },
        },
        '/commerce/products': {
          status: 200,
          body: {
            items: [
              {
                id: 'prod1', urlSlug: 'french-workbook', name: 'French Workbook',
                description: 'A workbook', pricing: { basePrice: { value: '2500', currency: 'EUR' } },
                images: [{ id: 'img1', url: 'https://images.sqsp.com/book.jpg' }],
                variants: [], type: 'DIGITAL',
              },
            ],
            pagination: { hasNextPage: false },
          },
        },
        '/blog/blog1/posts': {
          status: 200,
          body: {
            items: [
              { id: 'post1', urlId: 'first-post', title: 'Welcome', body: '<p>Bienvenue</p>', publishOn: '2026-01-15', author: { displayName: 'Marie' }, tags: ['french'] },
            ],
            pagination: { hasNextPage: false },
          },
        },
        '/members': {
          status: 200,
          body: { items: [{ id: 'm1', email: 'student@example.com', firstName: 'Jean', lastName: 'Dupont' }], pagination: { hasNextPage: false } },
        },
        '/commerce/settings': {
          status: 200,
          body: { currency: 'EUR', measurementStandard: 'METRIC' },
        },
      });

      const client = new SquarespaceClient({
        apiKey: 'test-key',
        siteId: 'test-site',
        fetchImpl: mockFetch,
        logger: () => {},
      });

      const result = await client.exportSite('https://marie-tutoring.squarespace.com');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const data = result.value;
      expect(data.pages.length).toBe(2);
      expect(data.pages[0]!.title).toBe('About Us');
      expect(data.products.length).toBe(1);
      expect(data.products[0]!.price).toBe(25); // 2500 cents → 25 EUR
      expect(data.products[0]!.currency).toBe('EUR');
      expect(data.posts.length).toBe(1);
      expect(data.posts[0]!.author).toBe('Marie');
      expect(data.members.length).toBe(1);
      expect(data.members[0]!.email).toBe('student@example.com');
    });

    it('should handle pagination by draining all pages', async () => {
      let callCount = 0;
      const mockFetch = createMockFetch({});
      // Override with a stateful mock
      const statefulFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/pages') || url.includes('/commerce/products') || url.includes('/members') || url.includes('/commerce/settings')) {
          if (url.includes('/commerce/products')) {
            callCount++;
            if (callCount === 1) {
              return {
                ok: true, status: 200,
                headers: new Map() as any,
                json: async () => ({
                  items: [{ id: 'prod1', urlSlug: 'p1', name: 'P1', description: '', pricing: { basePrice: { value: '100', currency: 'EUR' } }, images: [], variants: [], type: 'DIGITAL' }],
                  pagination: { hasNextPage: true, nextPageCursor: 'cursor2' },
                }),
                text: async () => '',
              } as Response;
            } else {
              return {
                ok: true, status: 200,
                headers: new Map() as any,
                json: async () => ({
                  items: [{ id: 'prod2', urlSlug: 'p2', name: 'P2', description: '', pricing: { basePrice: { value: '200', currency: 'EUR' } }, images: [], variants: [], type: 'DIGITAL' }],
                  pagination: { hasNextPage: false },
                }),
                text: async () => '',
              } as Response;
            }
          }
          // Default empty for other endpoints
          return {
            ok: true, status: 200,
            headers: new Map() as any,
            json: async () => ({ items: [], pagination: { hasNextPage: false } }),
            text: async () => '',
          } as Response;
        }

        return { ok: false, status: 404, headers: new Map() as any, json: async () => ({}), text: async () => '' } as Response;
      }) as typeof globalThis.fetch;

      const client = new SquarespaceClient({
        apiKey: 'test-key', siteId: 'test-site',
        fetchImpl: statefulFetch, logger: () => {},
      });

      const result = await client.exportSite('https://test.squarespace.com');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.products.length).toBe(2);
    });

    it('should return failure on API error', async () => {
      const mockFetch = createMockFetch({
        '/pages': { status: 401, body: { error: 'unauthorized' } },
      });

      const client = new SquarespaceClient({
        apiKey: 'bad-key', siteId: 'test-site',
        fetchImpl: mockFetch, retryCount: 0, logger: () => {},
      });

      const result = await client.exportSite('https://test.squarespace.com');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('401');
    });

    it('should degrade gracefully when members endpoint is unavailable', async () => {
      const mockFetch = createMockFetch({
        '/pages': { status: 200, body: { items: [], pagination: { hasNextPage: false } } },
        '/commerce/products': { status: 200, body: { items: [], pagination: { hasNextPage: false } } },
        '/members': { status: 403, body: { error: 'forbidden' } },
        '/commerce/settings': { status: 200, body: {} },
      });

      const client = new SquarespaceClient({
        apiKey: 'test-key', siteId: 'test-site',
        fetchImpl: mockFetch, retryCount: 0, logger: () => {},
      });

      const result = await client.exportSite('https://test.squarespace.com');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.members).toEqual([]);
    });
  });

  describe('downloadAsset', () => {
    it('should download binary content', async () => {
      const mockFetch = createMockFetch({
        'book.jpg': { status: 200, body: {} },
      });

      const client = new SquarespaceClient({
        apiKey: 'test-key', siteId: 'test-site',
        fetchImpl: mockFetch, logger: () => {},
      });

      const result = await client.downloadAsset('https://images.sqsp.com/book.jpg');
      expect(result.ok).toBe(true);
    });

    it('should return failure on 404', async () => {
      const mockFetch = createMockFetch({});
      const client = new SquarespaceClient({
        apiKey: 'test-key', siteId: 'test-site',
        fetchImpl: mockFetch, logger: () => {},
      });

      const result = await client.downloadAsset('https://images.sqsp.com/missing.jpg');
      expect(result.ok).toBe(false);
    });
  });

  describe('factory', () => {
    it('should create a PlatformSourceClient via factory', () => {
      const client = createSquarespaceClient({
        apiKey: 'key', siteId: 'site', logger: () => {},
      });
      expect(client).toBeDefined();
      expect(typeof client.exportSite).toBe('function');
      expect(typeof client.downloadAsset).toBe('function');
    });
  });
});


// ============================================================================
// §2 — HEALTH PROBER TESTS
// ============================================================================

describe('HealthProber', () => {
  let HealthProber: any;
  let createHealthProber: any;

  beforeEach(async () => {
    const mod = await import('./sr-health-prober');
    HealthProber = mod.HealthProber;
    createHealthProber = mod.createHealthProber;
  });

  it('should return healthy when all checks pass', async () => {
    const mockFetch = createMockFetch({
      'https://test.example.com': { status: 200, body: 'Welcome to Scholarly' },
    });

    const mockShell = createMockShell({
      'dig': { stdout: '1.2.3.4\n', stderr: '', exitCode: 0 },
      'openssl': { stdout: 'notAfter=Dec 31 23:59:59 2027 GMT\n', stderr: '', exitCode: 0 },
    });

    const prober = new HealthProber({ fetchImpl: mockFetch, shellExec: mockShell });
    const result = await prober.probe({
      targetUrl: 'https://test.example.com',
      domain: 'test.example.com',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('healthy');
    expect(result.value.checks.length).toBe(3); // DNS + SSL + HTTP
    expect(result.value.checks.every((c: any) => c.status === 'pass')).toBe(true);
  });

  it('should return unhealthy when DNS fails', async () => {
    const mockFetch = createMockFetch({
      'https://test.example.com': { status: 200, body: '' },
    });

    const mockShell = createMockShell({
      'dig': { stdout: '', stderr: '', exitCode: 1 },
      'openssl': { stdout: 'notAfter=Dec 31 23:59:59 2027 GMT\n', stderr: '', exitCode: 0 },
    });

    const prober = new HealthProber({ fetchImpl: mockFetch, shellExec: mockShell });
    const result = await prober.probe({
      targetUrl: 'https://test.example.com',
      domain: 'test.example.com',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('unhealthy');
  });

  it('should return degraded when SSL expires soon', async () => {
    const almostExpired = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();

    const mockFetch = createMockFetch({
      'https://test.example.com': { status: 200, body: '' },
    });

    const mockShell = createMockShell({
      'dig': { stdout: '1.2.3.4\n', stderr: '', exitCode: 0 },
      'openssl': { stdout: `notAfter=${almostExpired}\n`, stderr: '', exitCode: 0 },
    });

    const prober = new HealthProber({ fetchImpl: mockFetch, shellExec: mockShell });
    const result = await prober.probe({
      targetUrl: 'https://test.example.com',
      domain: 'test.example.com',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('degraded');
  });

  it('should check content match when specified', async () => {
    const mockFetch = (async (input: RequestInfo | URL) => {
      return {
        ok: true, status: 200,
        headers: new Map() as any,
        json: async () => ({}),
        text: async () => '<html><body>Érudits Learning Platform</body></html>',
        arrayBuffer: async () => new ArrayBuffer(0),
      } as Response;
    }) as typeof globalThis.fetch;

    const mockShell = createMockShell({
      'dig': { stdout: '1.2.3.4\n', stderr: '', exitCode: 0 },
      'openssl': { stdout: 'notAfter=Dec 31 23:59:59 2027 GMT\n', stderr: '', exitCode: 0 },
    });

    const prober = new HealthProber({ fetchImpl: mockFetch, shellExec: mockShell });
    const result = await prober.probe({
      targetUrl: 'https://test.example.com',
      domain: 'test.example.com',
      contentMatch: 'Érudits Learning Platform',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('healthy');
    expect(result.value.checks.length).toBe(4); // DNS + SSL + HTTP + Content
  });

  it('should fail content match when string not found', async () => {
    const mockFetch = (async () => ({
      ok: true, status: 200,
      headers: new Map() as any,
      text: async () => '<html><body>Wrong site</body></html>',
    })) as any;

    const mockShell = createMockShell({
      'dig': { stdout: '1.2.3.4\n', stderr: '', exitCode: 0 },
      'openssl': { stdout: 'notAfter=Dec 31 23:59:59 2027 GMT\n', stderr: '', exitCode: 0 },
    });

    const prober = new HealthProber({ fetchImpl: mockFetch, shellExec: mockShell });
    const result = await prober.probe({
      targetUrl: 'https://test.example.com',
      domain: 'test.example.com',
      contentMatch: 'Érudits',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('unhealthy');
  });

  it('should skip DNS/SSL checks when disabled', async () => {
    const mockFetch = createMockFetch({
      'https://test.example.com': { status: 200, body: '' },
    });

    const prober = new HealthProber({ fetchImpl: mockFetch, shellExec: createMockShell({}) });
    const result = await prober.probe({
      targetUrl: 'https://test.example.com',
      domain: 'test.example.com',
      checkDns: false,
      checkSsl: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.checks.length).toBe(1); // HTTP only
  });

  it('should be creatable via factory', () => {
    const prober = createHealthProber();
    expect(prober).toBeDefined();
    expect(typeof prober.probe).toBe('function');
  });
});


// ============================================================================
// §3 — CUTOVER SERVICE TESTS
// ============================================================================

describe('MigrationCutoverService', () => {
  let createCutoverService: any;

  const mockCutoverStore = {
    save: vi.fn(async () => {}),
    findByMigration: vi.fn(async () => ({
      migrationId: 'mig-1', tenantId: 'tenant-1', domain: 'erudits.marie.com',
      previousDnsRecords: [{ type: 'A', name: '@', value: '1.2.3.4', ttl: 300 }],
      newDnsRecords: [{ type: 'CNAME', name: '@', value: 'scholarly.app', ttl: 300 }],
      sslProvisioned: false, proxyActivated: false, status: 'pending' as const,
    })),
    update: vi.fn(async () => {}),
  };

  const mockHealthProber = {
    probe: vi.fn(async () => success({
      status: 'healthy' as const,
      checks: [{ name: 'http_availability', status: 'pass', responseTimeMs: 150, detail: 'HTTP 200' }],
      checkedAt: new Date(),
    })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./sr-cutover-service');
    createCutoverService = mod.createCutoverService;
  });

  describe('runPreflightChecks', () => {
    it('should pass when record exists and provider is mock', async () => {
      const svc = createCutoverService({
        provider: 'mock',
        healthProber: mockHealthProber,
        cutoverStore: mockCutoverStore,
        logger: () => {},
      });

      const result = await svc.runPreflightChecks('tenant-1', 'mig-1');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.ready).toBe(true);
      expect(result.value.checks.length).toBeGreaterThanOrEqual(3);
    });

    it('should fail when no cutover record exists', async () => {
      const emptyStore = { ...mockCutoverStore, findByMigration: vi.fn(async () => null) };

      const svc = createCutoverService({
        provider: 'mock',
        healthProber: mockHealthProber,
        cutoverStore: emptyStore,
        logger: () => {},
      });

      const result = await svc.runPreflightChecks('tenant-1', 'mig-1');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.ready).toBe(false);
    });
  });

  describe('provisionSsl (mock)', () => {
    it('should log dry run and update store', async () => {
      const svc = createCutoverService({
        provider: 'mock',
        healthProber: mockHealthProber,
        cutoverStore: mockCutoverStore,
        logger: () => {},
      });

      const result = await svc.provisionSsl('tenant-1', 'mig-1');
      expect(result.ok).toBe(true);
      expect(mockCutoverStore.update).toHaveBeenCalledWith('tenant-1', 'mig-1', { sslProvisioned: true });
    });
  });

  describe('executeCutover (mock)', () => {
    it('should succeed in mock mode', async () => {
      const svc = createCutoverService({
        provider: 'mock',
        healthProber: mockHealthProber,
        cutoverStore: mockCutoverStore,
        logger: () => {},
      });

      const result = await svc.executeCutover('tenant-1', 'mig-1');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.success).toBe(true);
      expect(result.value.domain).toBe('erudits.marie.com');
      expect(mockCutoverStore.update).toHaveBeenCalledWith(
        'tenant-1', 'mig-1',
        expect.objectContaining({ status: 'active', proxyActivated: true }),
      );
    });
  });

  describe('rollback', () => {
    it('should rollback an active cutover', async () => {
      const activeStore = {
        ...mockCutoverStore,
        findByMigration: vi.fn(async () => ({
          migrationId: 'mig-1', tenantId: 'tenant-1', domain: 'erudits.marie.com',
          previousDnsRecords: [], newDnsRecords: [],
          sslProvisioned: true, proxyActivated: true, status: 'active' as const,
        })),
      };

      const svc = createCutoverService({
        provider: 'mock',
        healthProber: mockHealthProber,
        cutoverStore: activeStore,
        logger: () => {},
      });

      const result = await svc.rollback('tenant-1', 'mig-1', 'Content errors found');
      expect(result.ok).toBe(true);
      expect(activeStore.update).toHaveBeenCalledWith(
        'tenant-1', 'mig-1',
        expect.objectContaining({ status: 'rolled_back' }),
      );
    });

    it('should reject rollback when not in active state', async () => {
      const svc = createCutoverService({
        provider: 'mock',
        healthProber: mockHealthProber,
        cutoverStore: mockCutoverStore, // status: 'pending'
        logger: () => {},
      });

      const result = await svc.rollback('tenant-1', 'mig-1', 'oops');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('pending');
    });
  });

  describe('runHealthCheck', () => {
    it('should delegate to health prober', async () => {
      const svc = createCutoverService({
        provider: 'mock',
        healthProber: mockHealthProber,
        cutoverStore: mockCutoverStore,
        logger: () => {},
      });

      const result = await svc.runHealthCheck('tenant-1', 'mig-1');
      expect(result.ok).toBe(true);
      expect(mockHealthProber.probe).toHaveBeenCalledWith(
        expect.objectContaining({ domain: 'erudits.marie.com' }),
      );
    });
  });
});


// ============================================================================
// §4 — SERVICE REGISTRY TESTS
// ============================================================================

describe('MigrationServiceRegistry', () => {
  let buildMigrationServiceMap: any;
  let buildMockServiceMap: any;

  beforeEach(async () => {
    const mod = await import('./sr-service-registry');
    buildMigrationServiceMap = mod.buildMigrationServiceMap;
    buildMockServiceMap = mod.buildMockServiceMap;
  });

  describe('buildMockServiceMap', () => {
    it('should return a map with all required service keys', () => {
      const map = buildMockServiceMap('test-tenant');

      expect(map.get('migration:sourceClient')).toBeDefined();
      expect(map.get('migration:cutoverService')).toBeDefined();
      expect(map.get('migration:dataLakeAdapter')).toBeDefined();
      expect(map.get('migration:transformService')).toBeDefined();
      expect(map.get('migration:reviewService')).toBeDefined();
      expect(map.get('migration:migrationRepo')).toBeDefined();
      expect(map.get('migration:contentRepo')).toBeDefined();
      expect(map.get('migration:fileStorage')).toBeDefined();
    });

    it('should have 8 registered services', () => {
      const map = buildMockServiceMap();
      expect(map.size).toBe(8);
    });

    it('should create a sourceClient with exportSite method', () => {
      const map = buildMockServiceMap();
      const client = map.get('migration:sourceClient') as any;
      expect(typeof client.exportSite).toBe('function');
      expect(typeof client.downloadAsset).toBe('function');
    });

    it('should create a cutoverService with all required methods', () => {
      const map = buildMockServiceMap();
      const svc = map.get('migration:cutoverService') as any;
      expect(typeof svc.runPreflightChecks).toBe('function');
      expect(typeof svc.provisionSsl).toBe('function');
      expect(typeof svc.executeCutover).toBe('function');
      expect(typeof svc.rollback).toBe('function');
      expect(typeof svc.runHealthCheck).toBe('function');
    });
  });

  describe('buildMigrationServiceMap', () => {
    it('should wire all services with real implementations', () => {
      const noop = async () => ({ ok: true as const, value: {} as any });

      const map = buildMigrationServiceMap({
        tenantId: 'tenant-1',
        squarespace: { apiKey: 'key', siteId: 'site' },
        cutover: { provider: 'mock' },
        existingServices: {
          dataLakeAdapter: { registerMigration: () => ({ extract: {}, transform: {}, import: {} }), runExtraction: noop, runTransform: noop, runImport: noop, runQualityAudit: noop, getMigrationETLStatus: () => ({ registered: true, jobs: [] }) } as any,
          transformService: { runTransformation: noop } as any,
          reviewService: { getReviewDashboard: noop, reviewItem: noop, bulkReview: noop, approveMigration: noop, getReviewStats: noop } as any,
          migrationRepo: { findById: noop, findByOwner: noop, save: noop, update: noop } as any,
          contentRepo: { saveBatch: noop, findByMigration: noop } as any,
          fileStorage: { upload: noop } as any,
          cutoverStore: { save: noop, findByMigration: noop, update: noop } as any,
        },
        logger: () => {},
      });

      expect(map.size).toBe(8);
      expect(map.get('migration:sourceClient')).toBeDefined();
      expect(map.get('migration:cutoverService')).toBeDefined();
    });
  });
});
