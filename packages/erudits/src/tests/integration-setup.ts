/**
 * ============================================================================
 * Integration Test Infrastructure
 * ============================================================================
 *
 * Sets up a real Express application with real services, real route
 * mounting, and real middleware — but with mock repositories and
 * external dependencies. Think of it as a test drive in a real car
 * on a closed course: the engine, transmission, and steering are
 * real; the road conditions are controlled.
 *
 * This catches a category of bugs that unit tests miss:
 *   - Route-to-service wiring errors (wrong param extraction)
 *   - Middleware ordering issues (auth before JSON parse)
 *   - HTTP method/path mismatches
 *   - Response serialisation problems
 *   - Error handler integration
 *
 * @module erudits/tests/integration
 * @version 1.0.0
 */

import request from 'supertest';
import express from 'express';
import { createApp } from '../app';

// ── Services ──
import { ResourceStorefrontService } from '../services/storefront.service';
import { PublishingEngineService } from '../services/publishing.service';
import { FormattingEngineImpl } from '../services/formatting.service';
import { SquarespaceMigrationService } from '../services/migration.service';
import { BookClubService } from '../services/bookclub.service';

// ── Route mounting ──
import { mountStorefrontRoutes, mountPublishingRoutes, mountMigrationRoutes, mountBookClubRoutes } from '../routes/mount';

// ── Test helpers ──
import {
  mockEventBus, mockCache, mockAIService,
  mockFileStorage, mockStripeClient, mockWatermarkService,
  mockConfig,
  mockResourceRepo, mockPurchaseRepo, mockLicenceRepo,
  mockManuscriptRepo, mockVersionRepo, mockPublicationRepo,
  mockCoverRepo, mockSalesRepo,
  mockMigrationRepo, mockMigrationContentRepo,
  mockBookClubRepo, mockSessionRepo, mockReadingRepo, mockMemberRepo,
} from './helpers';

// ============================================================================
// TEST APP FACTORY
// ============================================================================

const DEV_TOKEN = 'dev:test-user:test-tenant';

export function createTestApp() {
  const eventBus = mockEventBus();
  const cache = mockCache();
  const ai = mockAIService();
  const fileStorage = mockFileStorage();
  const config = mockConfig();
  const stripe = mockStripeClient();
  const watermark = mockWatermarkService();

  // Repos
  const resourceRepo = mockResourceRepo();
  const purchaseRepo = mockPurchaseRepo();
  const licenceRepo = mockLicenceRepo();
  const manuscriptRepo = mockManuscriptRepo();
  const versionRepo = mockVersionRepo();
  const publicationRepo = mockPublicationRepo();
  const coverRepo = mockCoverRepo();
  const salesRepo = mockSalesRepo();
  const migrationRepo = mockMigrationRepo();
  const contentRepo = mockMigrationContentRepo();
  const clubRepo = mockBookClubRepo();
  const sessionRepo = mockSessionRepo();
  const readingRepo = mockReadingRepo();
  const memberRepo = mockMemberRepo();

  // Services
  const storefrontService = new ResourceStorefrontService({
    eventBus, cache, config, fileStorage, ai, stripe, watermark,
    resourceRepo, purchaseRepo, licenceRepo,
  });

  const formatter = new FormattingEngineImpl();
  const publishingService = new PublishingEngineService({
    eventBus, cache, config, fileStorage, ai, formatter,
    manuscriptRepo, versionRepo, publicationRepo, coverRepo, salesRepo,
  });

  const sqClient = {
    exportSite: async () => ({
      success: true as const,
      data: { pages: [], products: [], posts: [], members: [], navigation: [], settings: { title: '', description: '', socialLinks: {} } },
    }),
    downloadAsset: async () => ({ success: true as const, data: Buffer.from('') }),
  };
  const migrationService = new SquarespaceMigrationService(
    { eventBus, cache, config, fileStorage, migrationRepo, contentRepo },
    sqClient,
  );

  const bookclubService = new BookClubService({
    eventBus, cache, config, ai,
    clubRepo, sessionRepo, readingRepo, memberRepo,
  });

  // Mount routes into Express Routers
  const app = createApp({
    storefrontRoutes: mountStorefrontRoutes(storefrontService),
    publishingRoutes: mountPublishingRoutes(publishingService),
    migrationRoutes: mountMigrationRoutes(migrationService),
    bookclubRoutes: mountBookClubRoutes(bookclubService),
    stripeWebhookHandler: async (_req, res) => { res.json({ received: true }); },
    verifyToken: async (token: string) => {
      if (token === DEV_TOKEN) {
        return { id: 'test-user', tenantId: 'test-tenant', email: 'test@scholarly.dev', roles: ['tutor', 'author'], name: 'Test User' };
      }
      return null;
    },
    corsOrigins: ['http://localhost:3000'],
  });

  return {
    app,
    mocks: {
      eventBus, cache, ai, fileStorage, config, stripe, watermark,
      resourceRepo, purchaseRepo, licenceRepo,
      manuscriptRepo, versionRepo, publicationRepo, coverRepo, salesRepo,
      migrationRepo, contentRepo,
      clubRepo, sessionRepo, readingRepo, memberRepo,
    },
  };
}

/**
 * Helper to make authenticated requests. Injects the dev Bearer token
 * so every request passes the auth middleware.
 */
export function authRequest(app: express.Application) {
  return {
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${DEV_TOKEN}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${DEV_TOKEN}`),
    put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${DEV_TOKEN}`),
    patch: (url: string) => request(app).patch(url).set('Authorization', `Bearer ${DEV_TOKEN}`),
    delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${DEV_TOKEN}`),
  };
}
