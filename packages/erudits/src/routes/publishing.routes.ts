/**
 * ============================================================================
 * Publishing Routes
 * ============================================================================
 *
 * @module erudits/routes/publishing
 */

import type { PublishingEngineService } from '../services/publishing.service';
import type {
  CreateManuscriptRequest, UpdateManuscriptRequest,
  GenerateCoverRequest, PublishRequest, FormatManuscriptRequest,
} from '../types/erudits.types';
import {
  RouteRequest, RouteResponse, NextFunction,
  requireAuth, requireTenantId, requireParam,
  sendResult, asyncHandler,
} from './shared';

export interface PublishingRouteConfig {
  publishingService: PublishingEngineService;
}

export function createPublishingRoutes(config: PublishingRouteConfig) {
  const { publishingService } = config;

  // createManuscript(tenantId, authorId, authorName, request)
  const createManuscript = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as CreateManuscriptRequest;
    const result = await publishingService.createManuscript(tenantId, user.id, user.name, body);
    sendResult(res, result, 201);
  });

  // updateManuscript(tenantId, manuscriptId, userId, request)
  const updateManuscript = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as UpdateManuscriptRequest;
    const result = await publishingService.updateManuscript(tenantId, requireParam(req, 'id'), user.id, body);
    sendResult(res, result);
  });

  // saveVersion(tenantId, manuscriptId, userId, label?, contentOverride?)
  const saveVersion = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as { label?: string };
    const result = await publishingService.saveVersion(tenantId, requireParam(req, 'id'), user.id, body.label);
    sendResult(res, result, 201);
  });

  // listVersions(tenantId, manuscriptId)
  const listVersions = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const tenantId = requireTenantId(req);
    const result = await publishingService.listVersions(tenantId, requireParam(req, 'id'));
    sendResult(res, result);
  });

  // restoreVersion(tenantId, manuscriptId, versionId, userId)
  const restoreVersion = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await publishingService.restoreVersion(tenantId, requireParam(req, 'id'), requireParam(req, 'vid'), user.id);
    sendResult(res, result);
  });

  // addChapter(tenantId, manuscriptId, userId, chapter)
  const addChapter = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as {
      title: string; sortOrder: number; curriculumCode?: string; learningObjectives?: string[];
    };
    const result = await publishingService.addChapter(tenantId, requireParam(req, 'id'), user.id, body);
    sendResult(res, result, 201);
  });

  // formatManuscript(tenantId, userId, request)
  const formatManuscript = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as FormatManuscriptRequest;
    const result = await publishingService.formatManuscript(tenantId, user.id, body);
    sendResult(res, result);
  });

  // generateCover(tenantId, userId, request)
  const generateCover = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as GenerateCoverRequest;
    const result = await publishingService.generateCover(tenantId, user.id, body);
    sendResult(res, result, 201);
  });

  // uploadCover(tenantId, manuscriptId, userId, file)
  const uploadCover = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as { data: Buffer; fileName: string; mimeType: string };
    const result = await publishingService.uploadCover(tenantId, requireParam(req, 'id'), user.id, body);
    sendResult(res, result, 201);
  });

  // selectCover(tenantId, manuscriptId, coverId, userId)
  const selectCover = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await publishingService.selectCover(tenantId, requireParam(req, 'id'), requireParam(req, 'cid'), user.id);
    sendResult(res, result);
  });

  // publish(tenantId, userId, request)
  const publish = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as PublishRequest;
    const result = await publishingService.publish(tenantId, user.id, body);
    sendResult(res, result, 201);
  });

  // aiAssist(tenantId, manuscriptId, userId, prompt, context?)
  const aiAssist = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as {
      prompt: string; chapterTitle?: string; curriculumCode?: string;
      targetLanguage?: string; contentType?: 'vocabulary_list' | 'grammar_table' | 'exercise' | 'comprehension' | 'narrative' | undefined;
    };
    const { prompt, ...contextFields } = body;
    const context = Object.keys(contextFields).length > 0 ? contextFields : undefined;
    const result = await publishingService.aiAssist(tenantId, requireParam(req, 'id'), user.id, prompt, context);
    sendResult(res, result);
  });

  // getPublishingAnalytics(tenantId, authorId, fromDate, toDate)
  const getAnalytics = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 86400000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();
    const result = await publishingService.getPublishingAnalytics(tenantId, user.id, from, to);
    sendResult(res, result);
  });

  return {
    createManuscript, updateManuscript, saveVersion, listVersions, restoreVersion,
    addChapter, formatManuscript, generateCover, uploadCover, selectCover,
    publish, aiAssist, getAnalytics,
  };
}
