/**
 * Gradebook API Routes
 * 
 * Express routes for the Gradebook service. All routes require authentication
 * and tenant context. Role-based access controls are enforced.
 * 
 * @module IntelligenceMesh/Gradebook/Routes
 * @version 1.5.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { GradebookService } from './gradebook.service';

// ============================================================================
// TYPES
// ============================================================================

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    name: string;
    tenantId: string;
    schoolId: string;
    roles: string[];
  };
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);

const requireRole = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user || !roles.some(role => authReq.user.roles.includes(role))) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
  }
  next();
};

// ============================================================================
// ROUTE FACTORY
// ============================================================================

export function createGradebookRoutes(service: GradebookService): Router {
  const router = Router();

  // ==========================================================================
  // GRADEBOOK MANAGEMENT
  // ==========================================================================

  /**
   * Create gradebook
   * POST /gradebooks
   */
  router.post('/', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, schoolId, id: userId } = req.user;
    const result = await service.createGradebook(tenantId, { ...req.body, schoolId, createdBy: userId });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result.data);
  }));

  /**
   * Get gradebook
   * GET /gradebooks/:id
   */
  router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.getGradebook(req.user.tenantId, req.params.id);
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Get teacher's gradebooks
   * GET /gradebooks/teacher/:teacherId
   */
  router.get('/teacher/:teacherId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, id: userId, roles } = req.user;
    const { teacherId } = req.params;

    if (!roles.includes('admin') && teacherId !== userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot view other teacher gradebooks' } });
    }

    const result = await service.getGradebooksForTeacher(tenantId, teacherId);
    res.json(result.data);
  }));

  // ==========================================================================
  // ITEMS & SCORES
  // ==========================================================================

  /**
   * Add item to gradebook
   * POST /gradebooks/:id/items
   */
  router.post('/:id/items', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.addItem(req.user.tenantId, {
      ...req.body,
      gradebookId: req.params.id,
      addedBy: req.user.id
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result.data);
  }));

  /**
   * Link assessment to gradebook item
   * PUT /gradebooks/items/:itemId/link-assessment
   */
  router.put('/items/:itemId/link-assessment', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.linkAssessmentToItem(
      req.user.tenantId,
      req.params.itemId,
      req.body.assessmentId,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Enter score for a student
   * PUT /gradebooks/items/:itemId/scores/:studentId
   */
  router.put('/items/:itemId/scores/:studentId', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.enterScore(req.user.tenantId, {
      itemId: req.params.itemId,
      studentId: req.params.studentId,
      ...req.body,
      enteredBy: req.user.id
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Bulk enter scores
   * POST /gradebooks/items/:itemId/scores/bulk
   */
  router.post('/items/:itemId/scores/bulk', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.bulkEnterScores(req.user.tenantId, {
      itemId: req.params.itemId,
      scores: req.body.scores,
      enteredBy: req.user.id
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Excuse score
   * POST /gradebooks/items/:itemId/scores/:studentId/excuse
   */
  router.post('/items/:itemId/scores/:studentId/excuse', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.excuseScore(
      req.user.tenantId,
      req.params.itemId,
      req.params.studentId,
      req.body.reason,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  // ==========================================================================
  // GRADE CALCULATION
  // ==========================================================================

  /**
   * Calculate student grade
   * GET /gradebooks/:gradebookId/students/:studentId/grade
   */
  router.get('/:gradebookId/students/:studentId/grade', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, id: userId, roles } = req.user;
    const { gradebookId, studentId } = req.params;

    if (!roles.includes('teacher') && !roles.includes('admin') && !roles.includes('parent') && studentId !== userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot view other student grades' } });
    }

    const result = await service.calculateStudentGrade(tenantId, gradebookId, studentId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Calculate all student grades
   * POST /gradebooks/:gradebookId/calculate
   */
  router.post('/:gradebookId/calculate', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.calculateAllStudentGrades(req.user.tenantId, req.params.gradebookId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  // ==========================================================================
  // REPORT CARDS
  // ==========================================================================

  /**
   * Generate report cards
   * POST /gradebooks/reports/generate
   */
  router.post('/reports/generate', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.generateReportCards(req.user.tenantId, {
      ...req.body,
      generatedBy: req.user.id
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Approve narrative
   * PUT /gradebooks/reports/:reportId/narratives/:narrativeId/approve
   */
  router.put('/reports/:reportId/narratives/:narrativeId/approve', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.approveNarrative(
      req.user.tenantId,
      req.params.reportId,
      req.params.narrativeId,
      req.body.content,
      req.user.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Submit report for review
   * POST /gradebooks/reports/:reportId/submit
   */
  router.post('/reports/:reportId/submit', requireRole('teacher'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.submitReportForReview(req.user.tenantId, req.params.reportId, req.user.id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Publish report
   * POST /gradebooks/reports/:reportId/publish
   */
  router.post('/reports/:reportId/publish', requireRole('admin', 'coordinator'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.publishReport(req.user.tenantId, req.params.reportId, req.user.id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  /**
   * Send missing work reminders
   * POST /gradebooks/:gradebookId/reminders
   */
  router.post('/:gradebookId/reminders', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.sendMissingWorkReminders(req.user.tenantId, req.params.gradebookId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ remindersSent: result.data });
  }));

  return router;
}
