/**
 * ============================================================================
 * Storefront Routes
 * ============================================================================
 *
 * @module erudits/routes/storefront
 */

import type { ResourceStorefrontService } from '../services/storefront.service';
import type { CreateResourceRequest, UpdateResourceRequest, PurchaseResourceRequest, ResourceSearchRequest } from '../types/erudits.types';
import {
  RouteRequest, RouteResponse, NextFunction,
  requireAuth, requireTenantId, requireParam,
  sendResult, asyncHandler, parsePagination,
} from './shared';

export interface StorefrontRouteConfig {
  storefrontService: ResourceStorefrontService;
}

export function createStorefrontRoutes(config: StorefrontRouteConfig) {
  const { storefrontService } = config;

  // createResource(tenantId, authorId, authorName, request)
  const createResource = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as CreateResourceRequest;
    const result = await storefrontService.createResource(tenantId, user.id, user.name, body);
    sendResult(res, result, 201);
  });

  // updateResource(tenantId, resourceId, authorId, request)
  const updateResource = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as UpdateResourceRequest;
    const result = await storefrontService.updateResource(tenantId, requireParam(req, 'id'), user.id, body);
    sendResult(res, result);
  });

  // publishResource(tenantId, resourceId, authorId)
  const publishResource = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await storefrontService.publishResource(tenantId, requireParam(req, 'id'), user.id);
    sendResult(res, result);
  });

  // archiveResource(tenantId, resourceId, authorId)
  const archiveResource = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await storefrontService.archiveResource(tenantId, requireParam(req, 'id'), user.id);
    sendResult(res, result);
  });

  // addFile(tenantId, resourceId, authorId, file)
  const addFile = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as {
      fileName: string; data: Buffer; mimeType: string;
      label?: string; watermarkEnabled?: boolean | undefined;
    };
    const result = await storefrontService.addFile(tenantId, requireParam(req, 'id'), user.id, body);
    sendResult(res, result, 201);
  });

  // initiatePurchase(tenantId, buyerId, buyerEmail, buyerName, request)
  const initiatePurchase = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as PurchaseResourceRequest;
    const request: PurchaseResourceRequest = { ...body, resourceId: requireParam(req, 'id') };
    const result = await storefrontService.initiatePurchase(tenantId, user.id, user.email, user.name, request);
    sendResult(res, result, 201);
  });

  // confirmPurchase(stripePaymentIntentId, chargeId)
  const confirmPurchase = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const body = req.body as unknown as { stripePaymentIntentId: string; chargeId: string };
    const result = await storefrontService.confirmPurchase(body.stripePaymentIntentId, body.chargeId);
    sendResult(res, result);
  });

  // refundPurchase(tenantId, purchaseId, reason)
  const refundPurchase = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const tenantId = requireTenantId(req);
    const reason = (req.body.reason as string) || 'Refund requested';
    const result = await storefrontService.refundPurchase(tenantId, requireParam(req, 'id'), reason);
    sendResult(res, result);
  });

  // getDownloadUrl(tenantId, resourceId, fileId, userId, institutionId?)
  const getDownloadUrl = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const fileId = req.query.fileId as string;
    const institutionId = req.query.institutionId as string | undefined;
    const result = await storefrontService.getDownloadUrl(tenantId, requireParam(req, 'id'), fileId, user.id, institutionId);
    sendResult(res, result);
  });

  // searchResources(tenantId, filter)
  const searchResources = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const tenantId = requireTenantId(req);
    const { page, pageSize } = parsePagination(req.query);
    const filter: ResourceSearchRequest = {
      page, pageSize,
      search: req.query.search as string | undefined,
      subjectArea: req.query.subjectArea as string | undefined,
      authorId: req.query.authorId as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || undefined,
    };
    if (req.query.yearLevels) {
      filter.yearLevels = Array.isArray(req.query.yearLevels) ? req.query.yearLevels : [req.query.yearLevels as string];
    }
    const result = await storefrontService.searchResources(tenantId, filter);
    sendResult(res, result);
  });

  // getRecommendations(tenantId, params)
  const getRecommendations = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await storefrontService.getRecommendations(tenantId, {
      studentId: req.query.learnerId as string || user.id,
    });
    sendResult(res, result);
  });

  // submitReview(tenantId, resourceId, reviewerId, reviewerName, rating, title?, body?)
  const submitReview = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as { rating: number; title?: string; body?: string };
    const result = await storefrontService.submitReview(
      tenantId, requireParam(req, 'id'), user.id, user.name, body.rating, body.title, body.body,
    );
    sendResult(res, result, 201);
  });

  // getAuthorAnalytics(tenantId, authorId, fromDate, toDate)
  const getAuthorAnalytics = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 86400000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();
    const result = await storefrontService.getAuthorAnalytics(tenantId, user.id, from, to);
    sendResult(res, result);
  });

  return {
    createResource, updateResource, publishResource, archiveResource, addFile,
    initiatePurchase, confirmPurchase, refundPurchase, getDownloadUrl,
    searchResources, getRecommendations, submitReview, getAuthorAnalytics,
  };
}
