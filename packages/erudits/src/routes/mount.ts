/**
 * ============================================================================
 * Route Mounting — Bridging Handlers to Express
 * ============================================================================
 *
 * The route factories in routes/*.ts return plain objects of handler functions.
 * This module bridges them into Express Router instances with proper HTTP
 * method and path bindings. Think of it as the directory on the lobby wall
 * that maps "Storefront Department" to "Floor 3, turn left" — the handlers
 * know what to DO, this module knows WHERE to put them.
 *
 * This separation exists by design: the handler factories are testable
 * without Express (you can call them directly with mock req/res), while
 * this module handles the Express-specific wiring.
 *
 * @module erudits/routes/mount
 * @version 1.0.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { RouteHandler, RouteRequest, RouteResponse } from './shared';

// ── Services ──
import { ResourceStorefrontService } from '../services/storefront.service';
import { PublishingEngineService } from '../services/publishing.service';
import { SquarespaceMigrationService } from '../services/migration.service';
import { BookClubService } from '../services/bookclub.service';

// ── Route Factories ──
import { createStorefrontRoutes } from './storefront.routes';
import { createPublishingRoutes } from './publishing.routes';
import { createMigrationRoutes } from './migration.routes';
import { createBookClubRoutes } from './bookclub.routes';

// ============================================================================
// EXPRESS ADAPTER
// ============================================================================

/**
 * Wraps a route handler (which uses our RouteRequest/RouteResponse types)
 * into an Express-compatible handler. The route layer was designed with
 * its own request/response interfaces for testability; this adapter
 * bridges them to the real Express types.
 */
function adapt(handler: RouteHandler) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req as unknown as RouteRequest, res as unknown as RouteResponse, next);
    } catch (err) {
      next(err);
    }
  };
}

// ============================================================================
// STOREFRONT ROUTES
// ============================================================================

export function mountStorefrontRoutes(service: ResourceStorefrontService): Router {
  const router = Router();
  const handlers = createStorefrontRoutes({ storefrontService: service });

  // Resource CRUD
  router.post('/resources', adapt(handlers.createResource));
  router.put('/resources/:id', adapt(handlers.updateResource));
  router.post('/resources/:id/publish', adapt(handlers.publishResource));
  router.post('/resources/:id/archive', adapt(handlers.archiveResource));
  router.post('/resources/:id/files', adapt(handlers.addFile));

  // Purchase flow
  router.post('/resources/:id/purchase', adapt(handlers.initiatePurchase));
  router.post('/purchases/:id/confirm', adapt(handlers.confirmPurchase));
  router.post('/purchases/:id/refund', adapt(handlers.refundPurchase));
  router.get('/purchases/:id/download', adapt(handlers.getDownloadUrl));

  // Discovery
  router.get('/resources/search', adapt(handlers.searchResources));
  router.get('/resources/recommendations', adapt(handlers.getRecommendations));

  // Reviews & Analytics
  router.post('/resources/:id/reviews', adapt(handlers.submitReview));
  router.get('/analytics', adapt(handlers.getAuthorAnalytics));

  return router;
}

// ============================================================================
// PUBLISHING ROUTES
// ============================================================================

export function mountPublishingRoutes(service: PublishingEngineService): Router {
  const router = Router();
  const handlers = createPublishingRoutes({ publishingService: service });

  // Manuscript CRUD
  router.post('/manuscripts', adapt(handlers.createManuscript));
  router.put('/manuscripts/:id', adapt(handlers.updateManuscript));

  // Version management
  router.post('/manuscripts/:id/versions', adapt(handlers.saveVersion));
  router.get('/manuscripts/:id/versions', adapt(handlers.listVersions));
  router.post('/manuscripts/:id/versions/:versionId/restore', adapt(handlers.restoreVersion));

  // Chapters
  router.post('/manuscripts/:id/chapters', adapt(handlers.addChapter));

  // Formatting
  router.post('/manuscripts/:id/format', adapt(handlers.formatManuscript));

  // Cover design
  router.post('/manuscripts/:id/covers/generate', adapt(handlers.generateCover));
  router.post('/manuscripts/:id/covers/upload', adapt(handlers.uploadCover));
  router.post('/manuscripts/:id/covers/:coverId/select', adapt(handlers.selectCover));

  // Publishing
  router.post('/manuscripts/:id/publish', adapt(handlers.publish));

  // AI assistance
  router.post('/manuscripts/:id/ai/assist', adapt(handlers.aiAssist));

  // Analytics
  router.get('/analytics', adapt(handlers.getAnalytics));

  return router;
}

// ============================================================================
// MIGRATION ROUTES
// ============================================================================

export function mountMigrationRoutes(service: SquarespaceMigrationService): Router {
  const router = Router();
  const handlers = createMigrationRoutes({ migrationService: service });

  router.post('/migrations', adapt(handlers.startMigration));
  router.get('/migrations/:id', adapt(handlers.getMigration));
  router.get('/migrations/:id/content', adapt(handlers.getMigrationContent));
  router.post('/migrations/:id/approve', adapt(handlers.approveMigration));
  router.post('/migrations/:id/import', adapt(handlers.executeImport));
  router.post('/migrations/:id/cutover', adapt(handlers.executeCutover));
  router.post('/migrations/:id/rollback', adapt(handlers.rollback));

  return router;
}

// ============================================================================
// BOOK CLUB ROUTES
// ============================================================================

export function mountBookClubRoutes(service: BookClubService): Router {
  const router = Router();
  const handlers = createBookClubRoutes({ bookClubService: service });

  // Club CRUD
  router.post('/clubs', adapt(handlers.createClub));
  router.put('/clubs/:id', adapt(handlers.updateClub));

  // Readings
  router.post('/clubs/:id/readings', adapt(handlers.addReading));
  router.get('/clubs/:id/readings', adapt(handlers.getReadingList));

  // Sessions
  router.post('/clubs/:id/sessions', adapt(handlers.scheduleSession));
  router.post('/sessions/:id/complete', adapt(handlers.completeSession));
  router.get('/clubs/:id/sessions/upcoming', adapt(handlers.getUpcomingSessions));

  // Membership
  router.post('/clubs/:id/join', adapt(handlers.joinClub));
  router.post('/clubs/:id/leave', adapt(handlers.leaveClub));
  router.get('/clubs/:id/members', adapt(handlers.getMembers));

  // AI features
  router.post('/clubs/:clubId/readings/:readingId/questions', adapt(handlers.generateDiscussionQuestions));
  router.post('/sessions/:id/guide', adapt(handlers.generateFacilitatorGuide));

  // Progress & Analytics
  router.post('/clubs/:clubId/readings/:readingId/progress', adapt(handlers.markReadingComplete));
  router.get('/clubs/:id/analytics', adapt(handlers.getAnalytics));

  return router;
}

/**
 * Mount content protection routes at /api/v1/protection/*
 * Covers policy management, device registration, download preparation,
 * reader sessions, forensics, and the author protection dashboard.
 */
export function mountProtectionRoutes(
  handlers: ReturnType<typeof import('./content-protection.routes').createProtectionRoutes>,
): Router {
  const router = Router();

  // Policy management
  router.put('/resources/:resourceId/policy', adapt(handlers.setPolicy));
  router.get('/resources/:resourceId/policy', adapt(handlers.getPolicy));

  // Device management
  router.post('/licences/:licenceId/devices', adapt(handlers.registerDevice));
  router.delete('/licences/:licenceId/devices/:deviceId', adapt(handlers.deregisterDevice));
  router.get('/licences/:licenceId/devices', adapt(handlers.listDevices));

  // Protected downloads
  router.post('/downloads/prepare', adapt(handlers.prepareDownload));

  // Reader sessions
  router.post('/sessions', adapt(handlers.startSession));
  router.post('/sessions/:sessionId/heartbeat', adapt(handlers.heartbeat));
  router.get('/sessions/:sessionId/pages/:pageNumber', adapt(handlers.requestPage));
  router.post('/sessions/:sessionId/end', adapt(handlers.endSession));

  // Forensics
  router.post('/violations', adapt(handlers.reportViolation));
  router.get('/resources/:resourceId/violations', adapt(handlers.getViolations));

  // Analytics / Dashboard
  router.get('/summary', adapt(handlers.getProtectionSummary));
  router.get('/resources/:resourceId/audit', adapt(handlers.getDownloadAudit));

  return router;
}
