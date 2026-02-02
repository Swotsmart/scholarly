/**
 * Knowledge Workspace API Routes
 *
 * REST endpoints for the Knowledge Workspace Integration Service (AFFiNE).
 * Provides workspace CRUD, page/whiteboard management, sharing, templates,
 * and activity analytics.
 *
 * @module KnowledgeWorkspaceRoutes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRoles } from '../middleware/auth';
import {
  knowledgeWorkspaceService,
  WorkspaceType,
  WorkspacePurpose,
  EducationalPageType,
  TemplateCategory,
} from '../services/knowledge-workspace.service';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ProvisionUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(200),
  role: z.string().min(1),
  preferredTheme: z.enum(['light', 'dark', 'system']).optional(),
});

const CreatePersonalNotebookSchema = z.object({
  displayName: z.string().min(1).max(200),
});

const CreateClassroomWorkspaceSchema = z.object({
  classroomId: z.string().min(1),
  className: z.string().min(1).max(200),
  subjectId: z.string().min(1),
  yearLevel: z.string().min(1),
  termId: z.string().optional(),
  studentIds: z.array(z.string()).default([]),
  templateId: z.string().optional(),
});

const CreateTutorSessionWorkspaceSchema = z.object({
  tutorId: z.string().min(1),
  studentId: z.string().min(1),
  subjectName: z.string().min(1).max(200),
});

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'archived', 'locked']).optional(),
});

const AddMemberSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(['admin', 'editor', 'viewer']),
  scholarlyRole: z.string().min(1),
});

const CreatePageSchema = z.object({
  title: z.string().min(1).max(500),
  mode: z.enum(['page', 'edgeless']).optional(),
  pageType: z.nativeEnum(EducationalPageType),
  subjectId: z.string().optional(),
  curriculumCodes: z.array(z.string()).optional(),
  assignmentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const UpdatePageSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  tags: z.array(z.string()).optional(),
  curriculumCodes: z.array(z.string()).optional(),
});

const SearchContentSchema = z.object({
  text: z.string().optional(),
  pageType: z.nativeEnum(EducationalPageType).optional(),
  subjectId: z.string().optional(),
  curriculumCodes: z.array(z.string()).optional(),
  workspaceType: z.nativeEnum(WorkspaceType).optional(),
  tags: z.array(z.string()).optional(),
});

const ActivityPeriodSchema = z.object({
  start: z.string().datetime().transform(s => new Date(s)),
  end: z.string().datetime().transform(s => new Date(s)),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getTenantId = (req: Request): string => {
  return req.tenantId || (req.headers['x-tenant-id'] as string) || 'default';
};

const getUserId = (req: Request): string => {
  return req.user?.id || '';
};

const handleError = (res: Response, error: unknown, requestId: string): void => {
  if (error && typeof error === 'object' && 'name' in error) {
    const err = error as { name: string; errors?: Array<{ path: string[]; message: string }> };
    if (err.name === 'ZodError' && err.errors) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
        requestId,
      });
      return;
    }
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  res.status(500).json({
    success: false,
    error: message,
    requestId,
  });
};

// ============================================================================
// USER PROVISIONING ROUTES
// ============================================================================

/**
 * POST /workspace/users/provision
 * Provision an AFFiNE user account for a Scholarly user
 */
router.post(
  '/users/provision',
  authMiddleware,
  requireRoles('platform_admin', 'school_admin'),
  async (req: Request, res: Response) => {
    const requestId = (req as Record<string, unknown>).id as string || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const body = ProvisionUserSchema.parse(req.body);
      const scholarlyUserId = req.body.scholarlyUserId || getUserId(req);

      const result = await knowledgeWorkspaceService.provisionUser(
        tenantId,
        scholarlyUserId,
        body
      );

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(400).json({
          success: false,
          error: result.error?.message,
          requestId,
        });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

// ============================================================================
// WORKSPACE ROUTES
// ============================================================================

/**
 * POST /workspace/personal
 * Create a personal learning notebook
 */
router.post('/personal', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as Record<string, unknown>).id as string || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const body = CreatePersonalNotebookSchema.parse(req.body);

    const result = await knowledgeWorkspaceService.createPersonalNotebook(
      tenantId,
      userId,
      body.displayName
    );

    if (result.success) {
      res.status(201).json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * POST /workspace/classroom
 * Create a classroom workspace
 */
router.post(
  '/classroom',
  authMiddleware,
  requireRoles('teacher', 'school_admin', 'platform_admin'),
  async (req: Request, res: Response) => {
    const requestId = (req as Record<string, unknown>).id as string || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const teacherId = getUserId(req);
      const body = CreateClassroomWorkspaceSchema.parse(req.body);

      const result = await knowledgeWorkspaceService.createClassroomWorkspace(
        tenantId,
        teacherId,
        body
      );

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(400).json({
          success: false,
          error: result.error?.message,
          requestId,
        });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

/**
 * POST /workspace/tutor-session
 * Create a tutor session workspace
 */
router.post(
  '/tutor-session',
  authMiddleware,
  requireRoles('tutor', 'platform_admin'),
  async (req: Request, res: Response) => {
    const requestId = (req as Record<string, unknown>).id as string || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const body = CreateTutorSessionWorkspaceSchema.parse(req.body);

      const result = await knowledgeWorkspaceService.createTutorSessionWorkspace(
        tenantId,
        body.tutorId,
        body.studentId,
        body.subjectName
      );

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(400).json({
          success: false,
          error: result.error?.message,
          requestId,
        });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

/**
 * GET /workspace
 * List workspaces for the current user
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as Record<string, unknown>).id as string || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    const filters: { type?: WorkspaceType; status?: 'active' | 'archived' | 'locked' } = {};
    if (req.query.type) {
      filters.type = req.query.type as WorkspaceType;
    }
    if (req.query.status) {
      filters.status = req.query.status as 'active' | 'archived' | 'locked';
    }

    const result = await knowledgeWorkspaceService.listWorkspaces(
      tenantId,
      userId,
      filters
    );

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * GET /workspace/:workspaceId
 * Get a workspace by ID
 */
router.get('/:workspaceId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as Record<string, unknown>).id as string || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { workspaceId } = req.params;

    const result = await knowledgeWorkspaceService.getWorkspace(
      tenantId,
      workspaceId
    );

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(404).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * PATCH /workspace/:workspaceId
 * Update a workspace
 */
router.patch('/:workspaceId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as Record<string, unknown>).id as string || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { workspaceId } = req.params;
    const body = UpdateWorkspaceSchema.parse(req.body);

    const result = await knowledgeWorkspaceService.updateWorkspace(
      tenantId,
      workspaceId,
      body
    );

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// WORKSPACE MEMBER ROUTES
// ============================================================================

/**
 * POST /workspace/:workspaceId/members
 * Add a member to a workspace
 */
router.post(
  '/:workspaceId/members',
  authMiddleware,
  async (req: Request, res: Response) => {
    const requestId = (req as Record<string, unknown>).id as string || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const { workspaceId } = req.params;
      const body = AddMemberSchema.parse(req.body);

      const result = await knowledgeWorkspaceService.addWorkspaceMember(
        tenantId,
        workspaceId,
        body.memberId,
        body.role,
        body.scholarlyRole
      );

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(400).json({
          success: false,
          error: result.error?.message,
          requestId,
        });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

/**
 * DELETE /workspace/:workspaceId/members/:memberId
 * Remove a member from a workspace
 */
router.delete(
  '/:workspaceId/members/:memberId',
  authMiddleware,
  async (req: Request, res: Response) => {
    const requestId = (req as Record<string, unknown>).id as string || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const { workspaceId, memberId } = req.params;

      const result = await knowledgeWorkspaceService.removeWorkspaceMember(
        tenantId,
        workspaceId,
        memberId
      );

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(400).json({
          success: false,
          error: result.error?.message,
          requestId,
        });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

// ============================================================================
// PAGE ROUTES
// ============================================================================

/**
 * POST /workspace/:workspaceId/pages
 * Create a page in a workspace
 */
router.post(
  '/:workspaceId/pages',
  authMiddleware,
  async (req: Request, res: Response) => {
    const requestId = (req as Record<string, unknown>).id as string || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const { workspaceId } = req.params;
      const body = CreatePageSchema.parse(req.body);

      const result = await knowledgeWorkspaceService.createPage(
        tenantId,
        workspaceId,
        userId,
        body
      );

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(400).json({
          success: false,
          error: result.error?.message,
          requestId,
        });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

/**
 * GET /workspace/:workspaceId/pages
 * List pages in a workspace
 */
router.get(
  '/:workspaceId/pages',
  authMiddleware,
  async (req: Request, res: Response) => {
    const requestId = (req as Record<string, unknown>).id as string || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const { workspaceId } = req.params;

      const filters: { pageType?: EducationalPageType; mode?: 'page' | 'edgeless' } = {};
      if (req.query.pageType) {
        filters.pageType = req.query.pageType as EducationalPageType;
      }
      if (req.query.mode) {
        filters.mode = req.query.mode as 'page' | 'edgeless';
      }

      const result = await knowledgeWorkspaceService.listPages(
        tenantId,
        workspaceId,
        filters
      );

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(400).json({
          success: false,
          error: result.error?.message,
          requestId,
        });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

/**
 * GET /workspace/pages/:pageId
 * Get a page by ID
 */
router.get('/pages/:pageId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as Record<string, unknown>).id as string || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { pageId } = req.params;

    const result = await knowledgeWorkspaceService.getPage(tenantId, pageId);

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(404).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * PATCH /workspace/pages/:pageId
 * Update a page
 */
router.patch('/pages/:pageId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as Record<string, unknown>).id as string || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { pageId } = req.params;
    const body = UpdatePageSchema.parse(req.body);

    const result = await knowledgeWorkspaceService.updatePage(
      tenantId,
      pageId,
      body
    );

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * DELETE /workspace/pages/:pageId
 * Delete a page
 */
router.delete('/pages/:pageId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as Record<string, unknown>).id as string || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const { pageId } = req.params;

    const result = await knowledgeWorkspaceService.deletePage(tenantId, pageId);

    if (result.success) {
      res.json({ success: true, message: 'Page deleted' });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// SEARCH ROUTES
// ============================================================================

/**
 * POST /workspace/search
 * Search across all accessible workspaces
 */
router.post('/search', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as Record<string, unknown>).id as string || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const body = SearchContentSchema.parse(req.body);

    const result = await knowledgeWorkspaceService.searchContent(
      tenantId,
      userId,
      body
    );

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// TEMPLATE ROUTES
// ============================================================================

/**
 * GET /workspace/templates
 * List available templates
 */
router.get('/templates', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as Record<string, unknown>).id as string || 'unknown';
  try {
    const tenantId = getTenantId(req);

    const filters: { category?: TemplateCategory; isPublic?: boolean } = {};
    if (req.query.category) {
      filters.category = req.query.category as TemplateCategory;
    }
    if (req.query.isPublic) {
      filters.isPublic = req.query.isPublic === 'true';
    }

    const result = await knowledgeWorkspaceService.listTemplates(
      tenantId,
      filters
    );

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * POST /workspace/:workspaceId/apply-template
 * Apply a template to a workspace
 */
router.post(
  '/:workspaceId/apply-template',
  authMiddleware,
  async (req: Request, res: Response) => {
    const requestId = (req as Record<string, unknown>).id as string || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const { workspaceId } = req.params;
      const { templateId } = req.body;

      if (!templateId) {
        res.status(400).json({
          success: false,
          error: 'templateId is required',
          requestId,
        });
        return;
      }

      const result = await knowledgeWorkspaceService.applyTemplate(
        tenantId,
        workspaceId,
        templateId
      );

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(400).json({
          success: false,
          error: result.error?.message,
          requestId,
        });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * POST /workspace/:workspaceId/activity
 * Get workspace activity analytics
 */
router.post(
  '/:workspaceId/activity',
  authMiddleware,
  async (req: Request, res: Response) => {
    const requestId = (req as Record<string, unknown>).id as string || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const { workspaceId } = req.params;
      const period = ActivityPeriodSchema.parse(req.body);

      const result = await knowledgeWorkspaceService.getWorkspaceActivity(
        tenantId,
        workspaceId,
        period
      );

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(400).json({
          success: false,
          error: result.error?.message,
          requestId,
        });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

/**
 * GET /workspace/students/:studentId/learning-profile
 * Get a student's learning profile derived from workspace behavior
 */
router.get(
  '/students/:studentId/learning-profile',
  authMiddleware,
  async (req: Request, res: Response) => {
    const requestId = (req as Record<string, unknown>).id as string || 'unknown';
    try {
      const tenantId = getTenantId(req);
      const { studentId } = req.params;

      const result = await knowledgeWorkspaceService.deriveStudentLearningProfile(
        tenantId,
        studentId
      );

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(400).json({
          success: false,
          error: result.error?.message,
          requestId,
        });
      }
    } catch (error) {
      handleError(res, error, requestId);
    }
  }
);

// ============================================================================
// HEALTH CHECK ROUTE
// ============================================================================

/**
 * GET /workspace/health
 * Check the health of the AFFiNE connection
 */
router.get('/health', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as Record<string, unknown>).id as string || 'unknown';
  try {
    const tenantId = getTenantId(req);

    const result = await knowledgeWorkspaceService.checkHealth(tenantId);

    if (result.success) {
      const statusCode = result.data.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({ success: true, data: result.data });
    } else {
      res.status(503).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

export default router;
