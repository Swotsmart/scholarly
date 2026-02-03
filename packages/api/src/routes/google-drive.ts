/**
 * Google Drive Integration API Routes
 *
 * REST endpoints for the Google Drive Integration Service including
 * OAuth flow, file operations, folder management, sync, and analytics.
 *
 * @module GoogleDriveRoutes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRoles } from '../middleware/auth';
import {
  googleDriveIntegrationService,
  EducationalFileType,
} from '../services/google-drive-integration.service';
import { isFailure } from '../services/base.service';

const router: Router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const InitiateOAuthSchema = z.object({
  redirectUri: z.string().url(),
  role: z.string().optional(),
});

const OAuthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  redirectUri: z.string().url(),
});

const UploadFileSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  parentFolderId: z.string().optional(),
  educationalContext: z
    .object({
      fileType: z.nativeEnum(EducationalFileType),
      subjectId: z.string().optional(),
      yearLevel: z.string().optional(),
      curriculumCodes: z.array(z.string()).optional(),
      termId: z.string().optional(),
      unitId: z.string().optional(),
      lessonId: z.string().optional(),
      assignmentId: z.string().optional(),
      assessmentType: z.enum(['formative', 'summative', 'diagnostic', 'portfolio']).optional(),
      submissionStatus: z.enum(['draft', 'submitted', 'reviewed', 'returned']).optional(),
      learnerIds: z.array(z.string()).optional(),
      tutorSessionId: z.string().optional(),
      tags: z.array(z.string()).default([]),
    })
    .optional(),
});

const SearchFilesSchema = z.object({
  query: z.string().optional(),
  mimeTypes: z.array(z.string()).optional(),
  modifiedAfter: z.string().datetime().optional(),
  modifiedBefore: z.string().datetime().optional(),
  ownedByMe: z.boolean().optional(),
  sharedWithMe: z.boolean().optional(),
  inFolder: z.string().optional(),
  subjectId: z.string().optional(),
  yearLevel: z.string().optional(),
  curriculumCodes: z.array(z.string()).optional(),
  fileType: z.nativeEnum(EducationalFileType).optional(),
  assignmentId: z.string().optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  pageToken: z.string().optional(),
  orderBy: z.enum(['name', 'modifiedTime', 'createdTime', 'folder']).optional(),
});

const DistributeToClassroomSchema = z.object({
  templateFileId: z.string().min(1),
  recipientIds: z.array(z.string().min(1)).min(1),
  distributionMode: z.enum(['copy_per_student', 'shared_view', 'shared_edit']),
  folderStrategy: z.enum(['student_folders', 'single_folder', 'assignment_folder']),
  namingPattern: z.string().min(1),
});

const EnsureSubjectFolderSchema = z.object({
  subjectId: z.string().min(1),
  subjectName: z.string().min(1),
});

const AnalyticsPeriodSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

const WebhookPayloadSchema = z.object({
  kind: z.string(),
  id: z.string(),
  resourceId: z.string(),
  resourceUri: z.string(),
  token: z.string(),
  expiration: z.string(),
  type: z.string(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getTenantId = (req: Request): string => {
  return (req as any).tenantId || (req.headers['x-tenant-id'] as string) || 'default';
};

const getUserId = (req: Request): string => {
  return (req as any).user?.id || '';
};

const getUserRole = (req: Request): string => {
  return (req as any).user?.role || 'student';
};

const handleError = (res: Response, error: any, requestId: string): void => {
  if (error.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.errors.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      requestId,
    });
    return;
  }

  const statusCode = error.code === 'NOT_FOUND' ? 404 : error.code === 'AUTHORIZATION_ERROR' ? 403 : 500;

  res.status(statusCode).json({
    success: false,
    error: error.message || 'Internal server error',
    code: error.code,
    requestId,
  });
};

// ============================================================================
// OAUTH ROUTES
// ============================================================================

/**
 * POST /integrations/google-drive/oauth/initiate
 * Initiate the OAuth 2.0 authorization flow
 */
router.post('/oauth/initiate', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const body = InitiateOAuthSchema.parse(req.body);

    const result = await googleDriveIntegrationService.initiateOAuthFlow(
      tenantId,
      userId,
      body.role || getUserRole(req),
      body.redirectUri
    );

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        code: result.error.code,
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
 * POST /integrations/google-drive/oauth/callback
 * Handle the OAuth 2.0 callback
 */
router.post('/oauth/callback', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const body = OAuthCallbackSchema.parse(req.body);

    const result = await googleDriveIntegrationService.handleOAuthCallback(
      tenantId,
      body.code,
      body.state,
      body.redirectUri
    );

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        code: result.error.code,
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
 * GET /integrations/google-drive/connections
 * Get all Drive connections for the current user
 */
router.get('/connections', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    const result = await googleDriveIntegrationService.getConnectionStatus(tenantId, userId);

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        code: result.error.code,
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
 * GET /integrations/google-drive/connections/:connectionId
 * Get a specific Drive connection
 */
router.get('/connections/:connectionId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;

    const result = await googleDriveIntegrationService.getConnection(tenantId, connectionId);

    if (isFailure(result)) {
      res.status(result.error.code === 'NOT_FOUND' ? 404 : 400).json({
        success: false,
        error: result.error.message,
        code: result.error.code,
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
 * DELETE /integrations/google-drive/connections/:connectionId
 * Disconnect a Google Drive account
 */
router.delete('/connections/:connectionId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;

    const result = await googleDriveIntegrationService.disconnect(tenantId, connectionId);

    if (isFailure(result)) {
      res.status(result.error.code === 'NOT_FOUND' ? 404 : 400).json({
        success: false,
        error: result.error.message,
        code: result.error.code,
        requestId,
      });
    } else {
      res.json({ success: true, message: 'Connection disconnected successfully' });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * POST /integrations/google-drive/connections/:connectionId/refresh
 * Refresh the access token for a connection
 */
router.post('/connections/:connectionId/refresh', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;

    const result = await googleDriveIntegrationService.refreshAccessToken(tenantId, connectionId);

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        code: result.error.code,
        requestId,
      });
    } else {
      res.json({ success: true, data: { expiresAt: result.data.expiresAt } });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// FOLDER ROUTES
// ============================================================================

/**
 * POST /integrations/google-drive/connections/:connectionId/folders/subject
 * Ensure a subject folder exists
 */
router.post(
  '/connections/:connectionId/folders/subject',
  authMiddleware,
  async (req: Request, res: Response) => {
    const requestId = (req as any).id || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const { connectionId } = req.params;
      const body = EnsureSubjectFolderSchema.parse(req.body);

      const result = await googleDriveIntegrationService.ensureSubjectFolder(
        tenantId,
        connectionId,
        body.subjectId,
        body.subjectName
      );

      if (isFailure(result)) {
        res.status(400).json({
          success: false,
          error: result.error.message,
          code: result.error.code,
          requestId,
        });
      } else {
        res.json({ success: true, data: { folderId: result.data } });
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
 * POST /integrations/google-drive/connections/:connectionId/files
 * Upload a file to Google Drive
 */
router.post('/connections/:connectionId/files', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;

    // For file upload, we expect the file content to be in the body as base64
    // In production, you might use multer or similar middleware
    const metadata = UploadFileSchema.parse(req.body);

    const content = req.body.content ? Buffer.from(req.body.content, 'base64') : Buffer.alloc(0);

    const result = await googleDriveIntegrationService.uploadFile(tenantId, connectionId, {
      name: metadata.name,
      mimeType: metadata.mimeType,
      content,
      parentFolderId: metadata.parentFolderId,
      educationalContext: metadata.educationalContext as any,
    });

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        code: result.error.code,
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
 * POST /integrations/google-drive/connections/:connectionId/files/search
 * Search files in Google Drive
 */
router.post('/connections/:connectionId/files/search', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;
    const query = SearchFilesSchema.parse(req.body);

    const result = await googleDriveIntegrationService.searchFiles(tenantId, connectionId, {
      ...query,
      modifiedAfter: query.modifiedAfter ? new Date(query.modifiedAfter) : undefined,
      modifiedBefore: query.modifiedBefore ? new Date(query.modifiedBefore) : undefined,
    });

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        code: result.error.code,
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
// CLASSROOM DISTRIBUTION ROUTES
// ============================================================================

/**
 * POST /integrations/google-drive/connections/:connectionId/distribute
 * Distribute a file to an entire classroom
 */
router.post(
  '/connections/:connectionId/distribute',
  authMiddleware,
  requireRoles('teacher', 'admin', 'tutor'),
  async (req: Request, res: Response) => {
    const requestId = (req as any).id || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const { connectionId } = req.params;
      const distribution = DistributeToClassroomSchema.parse(req.body);

      const result = await googleDriveIntegrationService.distributeToClassroom(
        tenantId,
        connectionId,
        distribution as any
      );

      if (isFailure(result)) {
        res.status(400).json({
          success: false,
          error: result.error.message,
          code: result.error.code,
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
// SYNC ROUTES
// ============================================================================

/**
 * POST /integrations/google-drive/connections/:connectionId/sync
 * Process Drive changes and sync to Scholarly's index
 */
router.post('/connections/:connectionId/sync', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;

    const result = await googleDriveIntegrationService.processDriveChanges(tenantId, connectionId);

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        code: result.error.code,
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
 * POST /integrations/google-drive/webhooks
 * Handle incoming webhooks from Google Drive
 * Note: This route does NOT require auth as it's called by Google
 */
router.post('/webhooks', async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    // Extract tenant ID from webhook channel token (set during watch creation)
    const tenantId = req.headers['x-goog-channel-token'] as string;
    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Missing channel token',
        requestId,
      });
      return;
    }

    const payload = WebhookPayloadSchema.parse({
      kind: req.headers['x-goog-message-number'] ? 'drive#change' : 'sync',
      id: req.headers['x-goog-channel-id'] as string,
      resourceId: req.headers['x-goog-resource-id'] as string,
      resourceUri: req.headers['x-goog-resource-uri'] as string,
      token: tenantId,
      expiration: req.headers['x-goog-channel-expiration'] as string,
      type: req.headers['x-goog-resource-state'] as string,
    });

    const result = await googleDriveIntegrationService.handleWebhook(tenantId, payload as any);

    if (isFailure(result)) {
      // Log the error but still return 200 to prevent Google from retrying
      console.error('Webhook processing failed:', result.error);
      res.status(200).send();
    } else {
      // Google expects a 200 response with empty body
      res.status(200).send();
    }
  } catch (error) {
    // Log but return 200 to prevent retries
    console.error('Webhook error:', error);
    res.status(200).send();
  }
});

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * POST /integrations/google-drive/connections/:connectionId/analytics
 * Get usage analytics for a Drive connection
 */
router.post('/connections/:connectionId/analytics', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { connectionId } = req.params;
    const period = AnalyticsPeriodSchema.parse(req.body);

    const result = await googleDriveIntegrationService.getUsageAnalytics(tenantId, connectionId, {
      start: new Date(period.start),
      end: new Date(period.end),
    });

    if (isFailure(result)) {
      res.status(400).json({
        success: false,
        error: result.error.message,
        code: result.error.code,
        requestId,
      });
    } else {
      res.json({ success: true, data: result.data });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

export { router as googleDriveRouter };
