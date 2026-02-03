/**
 * OneDrive Integration API Routes
 *
 * REST endpoints for the OneDrive Integration Service including
 * OAuth flow, file operations, search, sharing, and SharePoint integration.
 *
 * @module OneDriveRoutes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRoles } from '../middleware/auth';
import {
  getOneDriveService,
  OneDriveSearchQuery,
  OneDriveSharingRequest,
  OneDriveEducationalContext,
} from '../services/onedrive-integration.service';
import { isFailure } from '../services/base.service';

const router: Router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const InitiateOAuthSchema = z.object({
  role: z.string().min(1),
  redirectUri: z.string().url(),
});

const OAuthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  redirectUri: z.string().url().optional(),
});

const UploadFileSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  parentFolderId: z.string().optional(),
  educationalContext: z
    .object({
      fileType: z.string(),
      subjectId: z.string().optional(),
      yearLevel: z.string().optional(),
      curriculumCodes: z.array(z.string()).optional(),
      termId: z.string().optional(),
      assignmentId: z.string().optional(),
      assessmentType: z.string().optional(),
      submissionStatus: z.string().optional(),
      tags: z.array(z.string()).default([]),
    })
    .optional(),
});

const SearchSchema = z.object({
  query: z.string().optional(),
  mimeTypes: z.array(z.string()).optional(),
  modifiedAfter: z.string().datetime().optional(),
  modifiedBefore: z.string().datetime().optional(),
  inFolder: z.string().optional(),
  subjectId: z.string().optional(),
  yearLevel: z.string().optional(),
  fileType: z.string().optional(),
  assignmentId: z.string().optional(),
  siteId: z.string().optional(),
  libraryId: z.string().optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  skipToken: z.string().optional(),
});

const ShareItemSchema = z.object({
  itemId: z.string().min(1),
  recipients: z.array(
    z.object({
      email: z.string().email(),
      scholarlyRole: z.string().optional(),
    })
  ).min(1),
  role: z.enum(['read', 'write']),
  sendNotification: z.boolean().default(true),
  message: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  password: z.string().optional(),
});

const ConnectSharePointSchema = z.object({
  siteId: z.string().min(1),
  libraryId: z.string().min(1),
});

const ProvisionFoldersSchema = z.object({
  role: z.string().min(1),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getTenantId = (req: Request): string => {
  return (req as any).tenantId || (req.headers['x-tenant-id'] as string) || '';
};

const getUserId = (req: Request): string => {
  return (req as any).user?.id || '';
};

const handleError = (res: Response, error: unknown, requestId: string): void => {
  if ((error as any).name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: (error as any).errors.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      requestId,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: (error as Error).message || 'Internal server error',
    requestId,
  });
};

// ============================================================================
// OAUTH ROUTES
// ============================================================================

/**
 * POST /integrations/onedrive/oauth/initiate
 * Initiate OAuth flow with Microsoft
 */
router.post('/oauth/initiate', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const body = InitiateOAuthSchema.parse(req.body);

    const service = getOneDriveService();
    const result = await service.initiateOAuthFlow(
      tenantId,
      userId,
      body.role,
      body.redirectUri
    );

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        requestId,
      });
    } else {
      res.json({ success: true, data: result.data });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * POST /integrations/onedrive/oauth/callback
 * Handle OAuth callback from Microsoft
 */
router.post('/oauth/callback', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const body = OAuthCallbackSchema.parse(req.body);

    const service = getOneDriveService();
    const result = await service.handleOAuthCallback(
      tenantId,
      body.code,
      body.state,
      body.redirectUri || ''
    );

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        requestId,
      });
    } else {
      res.status(201).json({ success: true, data: result.data });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// CONNECTION ROUTES
// ============================================================================

/**
 * GET /integrations/onedrive/connections
 * Get user's OneDrive connections
 */
router.get('/connections', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    const service = getOneDriveService();
    const result = await service.getUserConnections(tenantId, userId);

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        requestId,
      });
    } else {
      res.json({ success: true, data: result.data });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * GET /integrations/onedrive/connections/:connectionId
 * Get a specific connection
 */
router.get('/connections/:connectionId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;

    const service = getOneDriveService();
    const result = await service.getConnection(tenantId, connectionId);

    if (isFailure(result)) {
      res.status(404).json({
        success: false,
        error: result.error.message,
        requestId,
      });
    } else {
      res.json({ success: true, data: result.data });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * DELETE /integrations/onedrive/connections/:connectionId
 * Disconnect a OneDrive account
 */
router.delete('/connections/:connectionId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;

    const service = getOneDriveService();
    const result = await service.disconnect(tenantId, connectionId);

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        requestId,
      });
    } else {
      res.json({ success: true, message: 'Connection disconnected' });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * POST /integrations/onedrive/connections/:connectionId/refresh
 * Refresh access token
 */
router.post('/connections/:connectionId/refresh', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;

    const service = getOneDriveService();
    const result = await service.refreshAccessToken(tenantId, connectionId);

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        requestId,
      });
    } else {
      res.json({ success: true, message: 'Token refreshed' });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// FOLDER ROUTES
// ============================================================================

/**
 * POST /integrations/onedrive/connections/:connectionId/folders/provision
 * Provision educational folder structure
 */
router.post(
  '/connections/:connectionId/folders/provision',
  authMiddleware,
  async (req: Request, res: Response) => {
    const requestId = (req as any).id || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const { connectionId } = req.params;
      const body = ProvisionFoldersSchema.parse(req.body);

      const service = getOneDriveService();
      const result = await service.provisionFolderStructure(
        tenantId,
        connectionId,
        body.role
      );

      if (isFailure(result)) {
        res.status(400).json({
          success: false,
          error: result.error.message,
          requestId,
        });
      } else {
        res.status(201).json({ success: true, data: result.data });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

// ============================================================================
// FILE ROUTES
// ============================================================================

/**
 * GET /integrations/onedrive/connections/:connectionId/files
 * List files in folder
 */
router.get('/connections/:connectionId/files', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;
    const folderId = req.query.folderId as string | undefined;

    const service = getOneDriveService();
    const result = await service.listFolderItems(tenantId, connectionId, folderId);

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        requestId,
      });
    } else {
      res.json({ success: true, data: result.data });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * POST /integrations/onedrive/connections/:connectionId/files
 * Upload a file
 */
router.post('/connections/:connectionId/files', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;

    // Parse metadata from request body
    const body = UploadFileSchema.parse(req.body);

    // File content should be base64 encoded in the request
    const content = req.body.content
      ? Buffer.from(req.body.content, 'base64')
      : Buffer.alloc(0);

    const service = getOneDriveService();
    const result = await service.uploadFile(tenantId, connectionId, {
      name: body.name,
      mimeType: body.mimeType,
      content,
      parentFolderId: body.parentFolderId,
      educationalContext: body.educationalContext as OneDriveEducationalContext,
    });

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        requestId,
      });
    } else {
      res.status(201).json({ success: true, data: result.data });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * POST /integrations/onedrive/connections/:connectionId/search
 * Search files
 */
router.post('/connections/:connectionId/search', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;
    const body = SearchSchema.parse(req.body);

    const query: OneDriveSearchQuery = {
      ...body,
      modifiedAfter: body.modifiedAfter ? new Date(body.modifiedAfter) : undefined,
      modifiedBefore: body.modifiedBefore ? new Date(body.modifiedBefore) : undefined,
    };

    const service = getOneDriveService();
    const result = await service.searchItems(tenantId, connectionId, query);

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        requestId,
      });
    } else {
      res.json({ success: true, data: result.data });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// SHARING ROUTES
// ============================================================================

/**
 * POST /integrations/onedrive/connections/:connectionId/share
 * Share a file or folder
 */
router.post('/connections/:connectionId/share', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;
    const body = ShareItemSchema.parse(req.body);

    const request = {
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    } as OneDriveSharingRequest;

    const service = getOneDriveService();
    const result = await service.shareItem(tenantId, connectionId, request);

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        requestId,
      });
    } else {
      res.status(201).json({ success: true, data: result.data });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// SYNC ROUTES
// ============================================================================

/**
 * POST /integrations/onedrive/connections/:connectionId/sync
 * Process delta changes (sync with OneDrive)
 */
router.post('/connections/:connectionId/sync', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;

    const service = getOneDriveService();
    const result = await service.processDeltaChanges(tenantId, connectionId);

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        requestId,
      });
    } else {
      res.json({ success: true, data: result.data });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// SHAREPOINT ROUTES
// ============================================================================

/**
 * GET /integrations/onedrive/connections/:connectionId/sharepoint/sites
 * Discover SharePoint sites
 */
router.get(
  '/connections/:connectionId/sharepoint/sites',
  authMiddleware,
  async (req: Request, res: Response) => {
    const requestId = (req as any).id || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const { connectionId } = req.params;
      const searchQuery = req.query.q as string | undefined;

      const service = getOneDriveService();
      const result = await service.discoverSharePointSites(
        tenantId,
        connectionId,
        searchQuery
      );

      if (isFailure(result)) {
        res.status(400).json({
          success: false,
          error: result.error.message,
          requestId,
        });
      } else {
        res.json({ success: true, data: result.data });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

/**
 * POST /integrations/onedrive/connections/:connectionId/sharepoint/connect
 * Connect a SharePoint document library
 */
router.post(
  '/connections/:connectionId/sharepoint/connect',
  authMiddleware,
  async (req: Request, res: Response) => {
    const requestId = (req as any).id || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const { connectionId } = req.params;
      const body = ConnectSharePointSchema.parse(req.body);

      const service = getOneDriveService();
      const result = await service.connectSharePointLibrary(
        tenantId,
        connectionId,
        body.siteId,
        body.libraryId
      );

      if (isFailure(result)) {
        res.status(400).json({
          success: false,
          error: result.error.message,
          requestId,
        });
      } else {
        res.status(201).json({ success: true, data: result.data });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

// ============================================================================
// VERSION HISTORY ROUTES
// ============================================================================

/**
 * GET /integrations/onedrive/connections/:connectionId/files/:itemId/versions
 * Get version history for a file
 */
router.get(
  '/connections/:connectionId/files/:itemId/versions',
  authMiddleware,
  async (req: Request, res: Response) => {
    const requestId = (req as any).id || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const { connectionId, itemId } = req.params;

      const service = getOneDriveService();
      const result = await service.getVersionHistory(tenantId, connectionId, itemId);

      if (isFailure(result)) {
        res.status(400).json({
          success: false,
          error: result.error.message,
          requestId,
        });
      } else {
        res.json({ success: true, data: result.data });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

export default router;
