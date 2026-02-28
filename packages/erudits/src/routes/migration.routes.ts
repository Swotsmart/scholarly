/**
 * ============================================================================
 * Migration Routes
 * ============================================================================
 *
 * @module erudits/routes/migration
 */

import type { SquarespaceMigrationService } from '../services/migration.service';
import type { ApproveMigrationRequest, MigrationSource } from '../types/erudits.types';
import {
  RouteRequest, RouteResponse, NextFunction,
  requireAuth, requireTenantId, requireParam,
  sendResult, asyncHandler,
} from './shared';

export interface MigrationRouteConfig {
  migrationService: SquarespaceMigrationService;
}

export function createMigrationRoutes(config: MigrationRouteConfig) {
  const { migrationService } = config;

  const startMigration = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as { source: MigrationSource; sourceUrl: string; customDomain?: string };

    const result = await migrationService.startMigration(tenantId, user.id, user.email, {
      sourceUrl: body.sourceUrl, source: body.source, customDomain: body.customDomain,
    });
    sendResult(res, result, 201);
  });

  const getMigration = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const tenantId = requireTenantId(req);
    const result = await migrationService.getMigrationStatus(tenantId, requireParam(req, 'id'));
    sendResult(res, result);
  });

  const getMigrationContent = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const tenantId = requireTenantId(req);
    const result = await migrationService.getMigrationContent(tenantId, requireParam(req, 'id'), {
      ...(req.query.sourceType ? { sourceType: req.query.sourceType as string } : {}),
      ...(req.query.status ? { status: req.query.status as string } : {}),
    });
    sendResult(res, result);
  });

  const approveMigration = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as { approvedItems: string[]; skippedItems: string[]; notes?: string };

    const request: ApproveMigrationRequest = {
      migrationId: requireParam(req, 'id'),
      approvedItems: body.approvedItems,
      skippedItems: body.skippedItems,
      notes: body.notes,
    };
    const result = await migrationService.approveMigration(tenantId, user.id, request);
    sendResult(res, result);
  });

  const executeImport = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const tenantId = requireTenantId(req);
    const result = await migrationService.executeImport(tenantId, requireParam(req, 'id'));
    sendResult(res, result);
  });

  const executeCutover = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const tenantId = requireTenantId(req);
    const result = await migrationService.executeCutover(tenantId, requireParam(req, 'id'));
    sendResult(res, result);
  });

  const rollback = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const tenantId = requireTenantId(req);
    const reason = (req.body.reason as string) || 'Manual rollback';
    const result = await migrationService.rollback(tenantId, requireParam(req, 'id'), reason);
    sendResult(res, result);
  });

  return { startMigration, getMigration, getMigrationContent, approveMigration, executeImport, executeCutover, rollback };
}
