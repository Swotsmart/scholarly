/**
 * ============================================================================
 * Content Protection Routes — API Endpoints
 * ============================================================================
 *
 * REST API for the content protection system. Uses the established route
 * pattern: asyncHandler + requireAuth + requireTenantId + sendResult.
 *
 * @module erudits/routes/content-protection
 * @version 1.0.0
 */

import type { ContentProtectionServiceImpl } from '../services/content-protection.service';
import type { SetProtectionPolicyRequest, RegisterDeviceRequest } from '../types/content-protection.types';
import {
  RouteRequest, RouteResponse, NextFunction,
  requireAuth, requireTenantId, requireParam,
  sendResult, asyncHandler, parsePagination,
} from './shared';

export interface ProtectionRouteConfig {
  protectionService: ContentProtectionServiceImpl;
}

export function createProtectionRoutes(config: ProtectionRouteConfig) {
  const { protectionService } = config;

  const setPolicy = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as SetProtectionPolicyRequest;
    const result = await protectionService.setPolicy(tenantId, requireParam(req, 'resourceId'), body);
    sendResult(res, result, 200);
  });

  const getPolicy = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await protectionService.getPolicy(tenantId, requireParam(req, 'resourceId'));
    sendResult(res, result);
  });

  const registerDevice = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as RegisterDeviceRequest;
    const result = await protectionService.registerDevice(tenantId, requireParam(req, 'licenceId'), user.id, body);
    sendResult(res, result, 201);
  });

  const deregisterDevice = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await protectionService.deregisterDevice(
      tenantId, requireParam(req, 'licenceId'), requireParam(req, 'deviceId'), user.id,
    );
    sendResult(res, result, 204);
  });

  const listDevices = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await protectionService.listDevices(tenantId, requireParam(req, 'licenceId'));
    sendResult(res, result);
  });

  const prepareDownload = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await protectionService.prepareDownload(tenantId, {
      ...(req.body as any),
      userId: user.id,
    });
    sendResult(res, result);
  });

  const startSession = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await protectionService.startSession(tenantId, {
      ...(req.body as any),
      userId: user.id,
      ipAddress: (req.body as any).ipAddress ?? '0.0.0.0',
      userAgent: (req.body as any).userAgent ?? 'unknown',
    });
    sendResult(res, result, 201);
  });

  const heartbeat = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await protectionService.heartbeat(tenantId, requireParam(req, 'sessionId'));
    sendResult(res, result, 204);
  });

  const requestPage = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    requireAuth(req);
    const tenantId = requireTenantId(req);
    const pageNumber = parseInt(requireParam(req, 'pageNumber'), 10);
    const result = await protectionService.requestPage(tenantId, requireParam(req, 'sessionId'), pageNumber);
    sendResult(res, result);
  });

  const endSession = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await protectionService.endSession(tenantId, requireParam(req, 'sessionId'));
    sendResult(res, result, 204);
  });

  const reportViolation = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await protectionService.reportViolation(tenantId, {
      ...(req.body as any),
      reportedBy: user.id,
    });
    sendResult(res, result, 201);
  });

  const getViolations = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    requireAuth(req);
    const tenantId = requireTenantId(req);
    const pagination = parsePagination(req.query);
    const result = await protectionService.getViolations(tenantId, requireParam(req, 'resourceId'), pagination);
    sendResult(res, result);
  });

  const getProtectionSummary = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await protectionService.getProtectionSummary(tenantId, user.id);
    sendResult(res, result);
  });

  const getDownloadAudit = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    requireAuth(req);
    const tenantId = requireTenantId(req);
    const pagination = parsePagination(req.query);
    const result = await protectionService.getDownloadAudit(tenantId, requireParam(req, 'resourceId'), pagination);
    sendResult(res, result);
  });

  return {
    setPolicy, getPolicy,
    registerDevice, deregisterDevice, listDevices,
    prepareDownload,
    startSession, heartbeat, requestPage, endSession,
    reportViolation, getViolations,
    getProtectionSummary, getDownloadAudit,
  };
}
