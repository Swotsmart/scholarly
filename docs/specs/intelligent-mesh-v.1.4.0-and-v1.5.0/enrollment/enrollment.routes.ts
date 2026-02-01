/**
 * Enrollment API Routes
 * 
 * Express router defining the REST API endpoints for the Enrollment module.
 * All endpoints require authentication and tenant context.
 * 
 * @module IntelligenceMesh/Enrollment/Routes
 * @version 1.4.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { EnrollmentService } from './enrollment.service';

// ============================================================================
// TYPES
// ============================================================================

interface AuthenticatedRequest extends Request {
  tenantId: string;
  userId: string;
  userRole: string;
}

type AsyncHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
};

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createEnrollmentRoutes(service: EnrollmentService): Router {
  const router = Router();

  // ==========================================================================
  // APPLICATION ENDPOINTS
  // ==========================================================================

  /**
   * POST /applications
   * Submit a new enrollment application
   */
  router.post('/applications', asyncHandler(async (req, res) => {
    const result = await service.submitApplication(req.tenantId, {
      student: req.body.student,
      guardians: req.body.guardians,
      previousSchooling: req.body.previousSchooling,
      requestedStartDate: new Date(req.body.requestedStartDate),
      requestedYearLevel: req.body.requestedYearLevel,
      preferredClassGroup: req.body.preferredClassGroup,
      submittedBy: req.userId
    });

    if (!result.success) {
      res.status(400).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * GET /applications/:id
   * Get application by ID
   */
  router.get('/applications/:id', asyncHandler(async (req, res) => {
    const result = await service.getApplication(req.tenantId, req.params.id);

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  /**
   * GET /applications
   * Search applications with filtering
   */
  router.get('/applications', asyncHandler(async (req, res) => {
    const result = await service.searchApplications(req.tenantId, {
      status: req.query.status ? (req.query.status as string).split(',') as any : undefined,
      yearLevel: req.query.yearLevel as string,
      submittedAfter: req.query.submittedAfter ? new Date(req.query.submittedAfter as string) : undefined,
      submittedBefore: req.query.submittedBefore ? new Date(req.query.submittedBefore as string) : undefined,
      guardianEmail: req.query.guardianEmail as string,
      studentName: req.query.studentName as string,
      hasAssessment: req.query.hasAssessment === 'true',
      hasDecision: req.query.hasDecision === 'true',
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined
    });

    if (!result.success) {
      res.status(400).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  /**
   * PATCH /applications/:id/status
   * Update application status
   */
  router.patch('/applications/:id/status', asyncHandler(async (req, res) => {
    const result = await service.updateApplicationStatus(
      req.tenantId,
      req.params.id,
      req.body.status,
      req.userId,
      req.body.reason
    );

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  // ==========================================================================
  // DOCUMENT ENDPOINTS
  // ==========================================================================

  /**
   * POST /applications/:id/documents
   * Upload a document for an application
   */
  router.post('/applications/:id/documents', asyncHandler(async (req, res) => {
    // In production, this would handle multipart form data
    const result = await service.uploadDocument(req.tenantId, req.params.id, {
      file: req.body.file, // Base64 or Buffer
      filename: req.body.filename,
      contentType: req.body.contentType,
      documentType: req.body.documentType,
      uploadedBy: req.userId
    });

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * POST /applications/:id/documents/analyze-reports
   * Analyze historical school reports for an application
   */
  router.post('/applications/:id/documents/analyze-reports', asyncHandler(async (req, res) => {
    const result = await service.analyzeHistoricalReports(req.tenantId, req.params.id);

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  // ==========================================================================
  // ASSESSMENT ENDPOINTS
  // ==========================================================================

  /**
   * POST /applications/:id/assessments
   * Schedule a diagnostic assessment
   */
  router.post('/applications/:id/assessments', asyncHandler(async (req, res) => {
    const result = await service.scheduleDiagnosticAssessment(req.tenantId, req.params.id, {
      assessmentDate: new Date(req.body.assessmentDate),
      assessor: req.body.assessor,
      assessmentType: req.body.assessmentType,
      domains: req.body.domains,
      scheduledBy: req.userId
    });

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * POST /assessments/:id/run
   * Run a diagnostic assessment with responses
   */
  router.post('/assessments/:id/run', asyncHandler(async (req, res) => {
    const result = await service.runDiagnosticAssessment(
      req.tenantId,
      req.params.id,
      req.body.responses,
      req.userId
    );

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  // ==========================================================================
  // TRANSITION PLAN ENDPOINTS
  // ==========================================================================

  /**
   * POST /applications/:id/transition-plan
   * Generate a transition plan
   */
  router.post('/applications/:id/transition-plan', asyncHandler(async (req, res) => {
    const result = await service.generateTransitionPlan(req.tenantId, req.params.id, req.userId);

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * POST /applications/:id/teacher-briefing
   * Generate a teacher briefing document
   */
  router.post('/applications/:id/teacher-briefing', asyncHandler(async (req, res) => {
    const result = await service.createTeacherBriefing(
      req.tenantId,
      req.params.id,
      req.body.assignedTeacher,
      req.userId
    );

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  // ==========================================================================
  // DECISION & ENROLLMENT ENDPOINTS
  // ==========================================================================

  /**
   * POST /applications/:id/decision
   * Make an enrollment decision
   */
  router.post('/applications/:id/decision', asyncHandler(async (req, res) => {
    const result = await service.makeDecision(req.tenantId, req.params.id, {
      decision: req.body.decision,
      decidedBy: req.userId,
      offerDetails: req.body.offerDetails ? {
        ...req.body.offerDetails,
        startDate: new Date(req.body.offerDetails.startDate),
        expiresAt: new Date(req.body.offerDetails.expiresAt)
      } : undefined,
      waitlistDetails: req.body.waitlistDetails,
      declineDetails: req.body.declineDetails
    });

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * POST /applications/:id/enroll
   * Complete enrollment and create student record
   */
  router.post('/applications/:id/enroll', asyncHandler(async (req, res) => {
    const result = await service.completeEnrollment(req.tenantId, req.params.id, {
      acceptedBy: req.userId,
      classGroup: req.body.classGroup,
      privacySettings: req.body.privacySettings
    });

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  // ==========================================================================
  // STATISTICS ENDPOINTS
  // ==========================================================================

  /**
   * GET /statistics
   * Get enrollment statistics
   */
  router.get('/statistics', asyncHandler(async (req, res) => {
    const result = await service.getEnrollmentStatistics(req.tenantId, {
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      yearLevel: req.query.yearLevel as string
    });

    if (!result.success) {
      res.status(400).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  return router;
}
