/**
 * ============================================================================
 * Integration Tests — Full HTTP Stack
 * ============================================================================
 *
 * These tests send real HTTP requests through the Express application and
 * verify responses. Unlike unit tests which test service methods in isolation,
 * these tests verify:
 *   - Auth middleware blocks unauthenticated requests
 *   - Routes extract parameters correctly from URL/body/query
 *   - Services receive the right arguments
 *   - Results are serialised to proper HTTP responses
 *   - Error responses have the correct format and status codes
 *   - The Stripe webhook bypass works (raw body, no auth)
 *
 * @module erudits/tests/integration
 * @version 1.0.0
 */

import request from 'supertest';
import { createTestApp, authRequest } from './integration-setup';
import { fixtures } from './helpers';

// ============================================================================
// HEALTH & AUTH
// ============================================================================

describe('Health & Authentication', () => {
  const { app } = createTestApp();

  it('returns healthy status on /health without auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.version).toBeDefined();
  });

  it('rejects unauthenticated API requests with 401', async () => {
    const res = await request(app).get('/api/v1/storefront/resources/search');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORISED');
  });

  it('rejects invalid Bearer tokens with 401', async () => {
    const res = await request(app)
      .get('/api/v1/storefront/resources/search')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  it('accepts valid dev tokens', async () => {
    const { app: testApp, mocks } = createTestApp();
    mocks.resourceRepo.search.mockResolvedValue({
      items: [], total: 0, page: 1, pageSize: 20, totalPages: 0,
    });

    const res = await authRequest(testApp).get('/api/v1/storefront/resources/search');
    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await authRequest(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ============================================================================
// STOREFRONT ROUTES
// ============================================================================

describe('Storefront Integration', () => {
  it('POST /api/v1/storefront/resources creates a resource', async () => {
    const { app, mocks } = createTestApp();
    const resource = fixtures.resource();

    mocks.resourceRepo.findBySlug.mockResolvedValue(null);
    mocks.resourceRepo.save.mockResolvedValue(resource);

    const res = await authRequest(app)
      .post('/api/v1/storefront/resources')
      .send({
        title: 'French Vocab Booklet',
        description: 'A comprehensive vocabulary guide',
        format: 'pdf',
        priceIndividualCents: 500,
        currency: 'AUD',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(mocks.resourceRepo.save).toHaveBeenCalled();
    expect(mocks.eventBus.publish).toHaveBeenCalled();
  });

  it('GET /api/v1/storefront/resources/search returns paginated results', async () => {
    const { app, mocks } = createTestApp();
    mocks.resourceRepo.search.mockResolvedValue({
      items: [fixtures.resource()],
      total: 1, page: 1, pageSize: 20, totalPages: 1,
    });

    const res = await authRequest(app)
      .get('/api/v1/storefront/resources/search?page=1&pageSize=20');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it('POST /api/v1/storefront/resources/:id/publish enforces preconditions', async () => {
    const { app, mocks } = createTestApp();
    // authorId must match the authenticated user ('test-user')
    const resource = fixtures.resource({ status: 'draft', files: [], authorId: 'test-user' });
    mocks.resourceRepo.findById.mockResolvedValue(resource);

    const res = await authRequest(app)
      .post(`/api/v1/storefront/resources/${resource.id}/publish`);

    // Should fail — no files uploaded yet (400 VALIDATION_ERROR)
    expect([400, 422]).toContain(res.status);
  });
});

// ============================================================================
// PUBLISHING ROUTES
// ============================================================================

describe('Publishing Integration', () => {
  it('POST /api/v1/publishing/manuscripts creates a manuscript', async () => {
    const { app, mocks } = createTestApp();
    const manuscript = fixtures.manuscript();

    mocks.manuscriptRepo.findBySlug.mockResolvedValue(null);
    mocks.manuscriptRepo.save.mockResolvedValue(manuscript);

    const res = await authRequest(app)
      .post('/api/v1/publishing/manuscripts')
      .send({
        title: 'French Grammar Guide',
        description: 'A comprehensive grammar reference',
        language: 'fr',
      });

    expect(res.status).toBe(201);
    expect(mocks.manuscriptRepo.save).toHaveBeenCalled();
    expect(mocks.eventBus.publish).toHaveBeenCalled();
  });

  it('POST /api/v1/publishing/manuscripts/:id/versions creates a snapshot', async () => {
    const { app, mocks } = createTestApp();
    const manuscript = fixtures.manuscript({ authorId: 'test-user' });

    mocks.manuscriptRepo.findById.mockResolvedValue(manuscript);
    mocks.versionRepo.findByManuscript.mockResolvedValue([]);
    mocks.versionRepo.save.mockResolvedValue({
      id: 'ver_001', tenantId: 'test-tenant', createdAt: new Date(), updatedAt: new Date(),
      manuscriptId: manuscript.id, versionNumber: 1, label: 'First draft',
      content: manuscript.content, wordCount: manuscript.wordCount,
    } as any);

    const res = await authRequest(app)
      .post(`/api/v1/publishing/manuscripts/${manuscript.id}/versions`)
      .send({ label: 'First draft' });

    expect(res.status).toBe(201);
    expect(mocks.versionRepo.save).toHaveBeenCalled();
  });
});

// ============================================================================
// MIGRATION ROUTES
// ============================================================================

describe('Migration Integration', () => {
  it('POST /api/v1/migration/migrations starts a migration job', async () => {
    const { app, mocks } = createTestApp();
    const migration = fixtures.migration();

    mocks.migrationRepo.findByOwner.mockResolvedValue([]);
    mocks.migrationRepo.save.mockResolvedValue(migration);
    mocks.contentRepo.saveBatch.mockResolvedValue([]);
    mocks.migrationRepo.findById.mockResolvedValue(migration);

    const res = await authRequest(app)
      .post('/api/v1/migration/migrations')
      .send({
        source: 'squarespace',
        sourceUrl: 'https://erudits.com',
      });

    expect(res.status).toBe(201);
    expect(mocks.migrationRepo.save).toHaveBeenCalled();
  });

  it('rejects invalid URLs', async () => {
    const { app } = createTestApp();

    const res = await authRequest(app)
      .post('/api/v1/migration/migrations')
      .send({
        source: 'squarespace',
        sourceUrl: 'not-a-url',
      });

    expect([400, 422]).toContain(res.status);
  });
});

// ============================================================================
// BOOK CLUB ROUTES
// ============================================================================

describe('Book Club Integration', () => {
  it('POST /api/v1/bookclub/clubs creates a book club', async () => {
    const { app, mocks } = createTestApp();
    const club = fixtures.bookClub();

    mocks.clubRepo.findBySlug.mockResolvedValue(null);
    mocks.clubRepo.save.mockResolvedValue(club);

    const res = await authRequest(app)
      .post('/api/v1/bookclub/clubs')
      .send({
        name: 'French Literature Circle',
        description: 'Monthly French reading group',
        language: 'fr',
      });

    expect(res.status).toBe(201);
    expect(mocks.clubRepo.save).toHaveBeenCalled();
    expect(mocks.eventBus.publish).toHaveBeenCalled();
  });

  it('rejects club names that are too short', async () => {
    const { app } = createTestApp();

    const res = await authRequest(app)
      .post('/api/v1/bookclub/clubs')
      .send({ name: 'AB' });

    expect([400, 422]).toContain(res.status);
  });
});

// ============================================================================
// STRIPE WEBHOOK
// ============================================================================

describe('Stripe Webhook', () => {
  it('POST /api/v1/webhooks/stripe accepts raw body without auth', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'test-sig')
      .send(JSON.stringify({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } },
      }));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('processes webhooks without auth middleware (raw body path)', async () => {
    const { app } = createTestApp();

    // Verify the webhook endpoint is accessible without Bearer token
    // (Stripe authenticates via signature, not JWT)
    const res = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'test-sig')
      .send(JSON.stringify({ type: 'charge.updated', data: { object: { id: 'ch_test' } } }));

    expect(res.status).toBe(200);
  });
});
