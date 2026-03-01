import type {
  RequestContext,
  GatewayDeps,
  ExpressRequest,
  ExpressResponse,
  ExpressNextFunction,
  RouteHandler,
} from '../services/sr/sr-api-gateway';

import { createRouteHandlers } from '../services/sr/sr-api-gateway';

/**
 * Create an Express router with all S&R API routes mounted.
 *
 * Usage in index.ts:
 *   import { createSRRouter } from './routes/sr.routes';
 *   app.use('/api/v1/sr', createSRRouter(srDeps));
 *
 * This mounts the following endpoints (all under /api/v1/sr):
 *   POST   /workflows              — Save workflow
 *   GET    /workflows/:id          — Load workflow
 *   GET    /workflows              — List workflows
 *   DELETE /workflows/:id          — Delete workflow
 *   POST   /workflows/:id/execute  — Execute workflow
 *   POST   /runs/:id/resume        — Resume paused run
 *   POST   /runs/:id/cancel        — Cancel run
 *   GET    /runs/:id               — Get run status
 *   GET    /runs                   — List runs
 *   GET    /registry/catalogue     — Node type catalogue
 *   POST   /ai/workflow-explain    — AI explanation
 *   POST   /ai/run-explain         — AI output analysis
 *
 * Authentication is handled by the parent server's auth middleware.
 * Tenant isolation is enforced via the X-Tenant-Id header, which the
 * auth middleware injects after JWT validation.
 */
export function createSRRouter(deps: GatewayDeps): {
  /** Express-compatible route definitions for mounting. */
  routes: Array<{ method: string; path: string; handler: RouteHandler }>;
  /** WebSocket manager for real-time run streaming. */
  wsManager: ReturnType<typeof createRouteHandlers>['wsManager'];
} {
  const { routes, wsManager, config } = createRouteHandlers(deps);

  // Rewrite route paths: remove the /api/v1 prefix since the
  // main server mounts us at /api/v1/sr already.
  // /api/v1/workflows → /workflows
  const rewrittenRoutes = routes.map(route => ({
    ...route,
    path: route.path.replace(/^\/api\/v1/, ''),
  }));

  return { routes: rewrittenRoutes, wsManager };
}

/**
 * Mount S&R routes onto an Express-compatible app.
 *
 * This is the all-in-one function for index.ts:
 *
 *   import { mountSRRoutes } from './routes/sr.routes';
 *   mountSRRoutes(app, srDeps);
 *
 * It mounts all routes under /api/v1/sr/* and sets up the WebSocket
 * upgrade handler for /api/v1/sr/runs/:id/stream.
 */
export function mountSRRoutes(
  app: {
    get: (path: string, handler: Function) => void;
    post: (path: string, handler: Function) => void;
    put: (path: string, handler: Function) => void;
    delete: (path: string, handler: Function) => void;
  },
  deps: GatewayDeps,
): { wsManager: ReturnType<typeof createRouteHandlers>['wsManager'] } {
  const { routes, wsManager } = createSRRouter(deps);

  const prefix = '/api/v1/sr';

  for (const route of routes) {
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
    const fullPath = `${prefix}${route.path}`;
    (app as any)[method](fullPath, route.handler);
  }

  // Health endpoint for the SR subsystem
  app.get(`${prefix}/health`, (_req: unknown, res: { json: (b: unknown) => void }) => {
    res.json({
      status: 'healthy',
      service: 'sr-canvas',
      timestamp: new Date().toISOString(),
      routes: routes.length,
    });
  });

  console.log(`[SR] Mounted ${routes.length} routes at ${prefix}/*`);
  return { wsManager };
}
