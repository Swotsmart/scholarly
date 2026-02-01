/**
 * Assessment API Routes
 * 
 * Express routes for the Assessment service. All routes require authentication
 * and tenant context. Role-based access controls are enforced.
 * 
 * @module IntelligenceMesh/Assessment/Routes
 * @version 1.5.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AssessmentService } from './assessment.service';
import { AssessmentPurpose, AIPolicy, QuestionType, AccommodationType } from './assessment.types';

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

export function createAssessmentRoutes(service: AssessmentService): Router {
  const router = Router();

  // ==========================================================================
  // ASSESSMENT DEFINITIONS
  // ==========================================================================

  /**
   * Create assessment
   * POST /assessments
   */
  router.post('/', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, schoolId, id: userId } = req.user;
    const result = await service.createAssessment(tenantId, { ...req.body, schoolId, createdBy: userId });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result.data);
  }));

  /**
   * Get assessment
   * GET /assessments/:id
   */
  router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.getAssessment(req.user.tenantId, req.params.id);
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Search assessments
   * GET /assessments
   */
  router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.searchAssessments(req.user.tenantId, req.query as any);
    res.json(result.data);
  }));

  /**
   * Add section
   * POST /assessments/:id/sections
   */
  router.post('/:id/sections', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.addSection(req.user.tenantId, req.params.id, { ...req.body, addedBy: req.user.id });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Add question
   * POST /assessments/:id/sections/:sectionId/questions
   */
  router.post('/:id/sections/:sectionId/questions', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.addQuestion(req.user.tenantId, req.params.id, req.params.sectionId, { ...req.body, addedBy: req.user.id });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Publish assessment
   * POST /assessments/:id/publish
   */
  router.post('/:id/publish', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.publishAssessment(req.user.tenantId, req.params.id, { ...req.body, publishedBy: req.user.id });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  // ==========================================================================
  // ATTEMPTS
  // ==========================================================================

  /**
   * Start attempt
   * POST /assessments/:id/attempts
   */
  router.post('/:id/attempts', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, id: userId } = req.user;
    const studentId = req.body.studentId || userId;
    
    const result = await service.startAttempt(tenantId, {
      assessmentId: req.params.id,
      studentId,
      accommodations: req.body.accommodations
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result.data);
  }));

  /**
   * Save response
   * PUT /assessments/attempts/:attemptId/responses/:questionId
   */
  router.put('/attempts/:attemptId/responses/:questionId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.saveResponse(req.user.tenantId, {
      attemptId: req.params.attemptId,
      questionId: req.params.questionId,
      response: req.body.response,
      studentId: req.user.id
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Submit attempt
   * POST /assessments/attempts/:attemptId/submit
   */
  router.post('/attempts/:attemptId/submit', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.submitAttempt(req.user.tenantId, req.params.attemptId, req.user.id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Mark attempt
   * POST /assessments/attempts/:attemptId/mark
   */
  router.post('/attempts/:attemptId/mark', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.markAttempt(req.user.tenantId, {
      attemptId: req.params.attemptId,
      markerId: req.user.id,
      responses: req.body.responses,
      overallFeedback: req.body.overallFeedback
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  /**
   * Return attempt
   * POST /assessments/attempts/:attemptId/return
   */
  router.post('/attempts/:attemptId/return', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.returnAttempt(req.user.tenantId, req.params.attemptId, {
      teacherId: req.user.id,
      teacherComments: req.body.teacherComments
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  /**
   * Generate analytics
   * POST /assessments/:id/analytics
   */
  router.post('/:id/analytics', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.generateAnalytics(req.user.tenantId, req.params.id, req.body.classId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  // ==========================================================================
  // PEER REVIEW
  // ==========================================================================

  /**
   * Assign peer reviews
   * POST /assessments/:id/peer-reviews/assign
   */
  router.post('/:id/peer-reviews/assign', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await service.assignPeerReviews(req.user.tenantId, req.params.id, req.user.id);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  }));

  return router;
} (!authReq.user || !roles.some(role => authReq.user.roles.includes(role))) {
    return res.status(403).json({ 
      success: false, 
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } 
    });
  }
  next();
};

// ============================================================================
// ROUTE FACTORY
// ============================================================================

export function createAssessmentRoutes(service: AssessmentService): Router {
  const router = Router();

  // ==========================================================================
  // ASSESSMENT DEFINITION ROUTES
  // ==========================================================================

  /**
   * Create a new assessment
   * POST /assessments
   * Roles: teacher, admin
   */
  router.post('/', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, schoolId, id: userId } = req.user;
    const { title, description, purpose, format, yearLevels, subjects, curriculumCodes, totalMarks, duration, aiPolicy } = req.body;

    const result = await service.createAssessment(tenantId, {
      schoolId,
      title,
      description,
      purpose: purpose as AssessmentPurpose,
      format,
      yearLevels: yearLevels || [],
      subjects: subjects || [],
      curriculumCodes: curriculumCodes || [],
      totalMarks,
      duration,
      aiPolicy: aiPolicy as AIPolicy,
      createdBy: userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  }));

  /**
   * Get assessment by ID
   * GET /assessments/:id
   */
  router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.user;
    const { id } = req.params;

    const result = await service.getAssessment(tenantId, id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  }));

  /**
   * Search assessments
   * GET /assessments
   */
  router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.user;
    const { status, purpose, format, subjects, yearLevels, teacherId, searchText, page, pageSize, sortBy, sortOrder } = req.query;

    const result = await service.searchAssessments(tenantId, {
      status: status ? (status as string).split(',') as any[] : undefined,
      purpose: purpose ? (purpose as string).split(',') as AssessmentPurpose[] : undefined,
      format: format ? (format as string).split(',') : undefined,
      subjects: subjects ? (subjects as string).split(',') : undefined,
      yearLevels: yearLevels ? (yearLevels as string).split(',') : undefined,
      teacherId: teacherId as string,
      searchText: searchText as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any
    });

    res.json(result);
  }));

  /**
   * Add section to assessment
   * POST /assessments/:id/sections
   * Roles: teacher, admin
   */
  router.post('/:id/sections', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, id: userId } = req.user;
    const { id: assessmentId } = req.params;
    const { title, instructions, timeLimit, shuffleQuestions } = req.body;

    const result = await service.addSection(tenantId, assessmentId, {
      title,
      instructions,
      timeLimit,
      shuffleQuestions,
      addedBy: userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  }));

  /**
   * Add question to section
   * POST /assessments/:id/sections/:sectionId/questions
   * Roles: teacher, admin
   */
  router.post('/:id/sections/:sectionId/questions', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, id: userId } = req.user;
    const { id: assessmentId, sectionId } = req.params;
    const { type, stem, marks, options, correctAnswer, aiMarkingEnabled, curriculumCodes, difficulty } = req.body;

    const result = await service.addQuestion(tenantId, assessmentId, sectionId, {
      type: type as QuestionType,
      stem,
      marks,
      options,
      correctAnswer,
      aiMarkingEnabled,
      curriculumCodes,
      difficulty,
      addedBy: userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  }));

  /**
   * Publish assessment
   * POST /assessments/:id/publish
   * Roles: teacher, admin
   */
  router.post('/:id/publish', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, id: userId } = req.user;
    const { id: assessmentId } = req.params;
    const { availableFrom, availableTo } = req.body;

    const result = await service.publishAssessment(tenantId, assessmentId, {
      availableFrom: availableFrom ? new Date(availableFrom) : undefined,
      availableTo: availableTo ? new Date(availableTo) : undefined,
      publishedBy: userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  }));

  // ==========================================================================
  // ATTEMPT ROUTES
  // ==========================================================================

  /**
   * Start an assessment attempt
   * POST /assessments/:id/attempts
   */
  router.post('/:id/attempts', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, id: userId } = req.user;
    const { id: assessmentId } = req.params;
    const { studentId, accommodations } = req.body;

    const effectiveStudentId = studentId || userId;

    const result = await service.startAttempt(tenantId, {
      assessmentId,
      studentId: effectiveStudentId,
      accommodations: accommodations as AccommodationType[]
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  }));

  /**
   * Save response to a question
   * PUT /assessments/attempts/:attemptId/responses/:questionId
   */
  router.put('/attempts/:attemptId/responses/:questionId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, id: userId } = req.user;
    const { attemptId, questionId } = req.params;
    const { response } = req.body;

    const result = await service.saveResponse(tenantId, {
      attemptId,
      questionId,
      response,
      studentId: userId
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  }));

  /**
   * Submit an attempt
   * POST /assessments/attempts/:attemptId/submit
   */
  router.post('/attempts/:attemptId/submit', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, id: userId } = req.user;
    const { attemptId } = req.params;

    const result = await service.submitAttempt(tenantId, attemptId, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  }));

  /**
   * Mark an attempt (teacher)
   * POST /assessments/attempts/:attemptId/mark
   * Roles: teacher, admin
   */
  router.post('/attempts/:attemptId/mark', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, id: userId } = req.user;
    const { attemptId } = req.params;
    const { responses, overallFeedback } = req.body;

    const result = await service.markAttempt(tenantId, {
      attemptId,
      markerId: userId,
      responses,
      overallFeedback
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  }));

  /**
   * Return attempt to student
   * POST /assessments/attempts/:attemptId/return
   * Roles: teacher, admin
   */
  router.post('/attempts/:attemptId/return', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, id: userId } = req.user;
    const { attemptId } = req.params;
    const { teacherComments } = req.body;

    const result = await service.returnAttempt(tenantId, attemptId, {
      teacherId: userId,
      teacherComments
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  }));

  // ==========================================================================
  // ANALYTICS ROUTES
  // ==========================================================================

  /**
   * Generate assessment analytics
   * POST /assessments/:id/analytics
   * Roles: teacher, admin
   */
  router.post('/:id/analytics', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId } = req.user;
    const { id: assessmentId } = req.params;
    const { classId } = req.body;

    const result = await service.generateAnalytics(tenantId, assessmentId, classId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  }));

  // ==========================================================================
  // PEER REVIEW ROUTES
  // ==========================================================================

  /**
   * Assign peer reviews
   * POST /assessments/:id/peer-reviews/assign
   * Roles: teacher, admin
   */
  router.post('/:id/peer-reviews/assign', requireRole('teacher', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, id: userId } = req.user;
    const { id: assessmentId } = req.params;

    const result = await service.assignPeerReviews(tenantId, assessmentId, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  }));

  return router;
}

export default createAssessmentRoutes;
