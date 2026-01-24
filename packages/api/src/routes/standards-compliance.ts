/**
 * Standards Compliance Routes
 *
 * API endpoints for Australian education standards compliance:
 * - HES Framework (Higher Education)
 * - ACARA Curriculum
 * - ST4S Security
 * - AITSL Teacher Standards
 * - AI Ethics
 */

import { Router } from 'express';
import { z } from 'zod';
import { ScholarlyApiError } from '../errors/scholarly-error';
import { authMiddleware } from '../middleware/auth';
import { getStandardsComplianceService } from '../services';
import { log } from '../lib/logger';

export const standardsComplianceRouter: Router = Router();

// All routes require authentication
standardsComplianceRouter.use(authMiddleware);

// ============================================================================
// Validation Schemas
// ============================================================================

const runAuditSchema = z.object({
  frameworks: z.array(z.enum(['HES', 'ACARA', 'ST4S', 'AITSL', 'AI_ETHICS'])).optional(),
  entityTypes: z.array(z.string()).optional(),
  jurisdiction: z.string().optional(),
});

const alignToACARACurriculumSchema = z.object({
  contentId: z.string(),
  title: z.string(),
  description: z.string(),
  text: z.string(),
  yearLevel: z.string(),
  subject: z.string(),
  learningObjectives: z.array(z.string()),
});

const assessPrivacySchema = z.object({
  id: z.string(),
  description: z.string(),
  dataTypes: z.array(z.string()),
  purpose: z.string(),
  thirdParties: z.array(z.string()).optional(),
  crossBorder: z.boolean().optional(),
});

const assessTeacherStandardsSchema = z.object({
  teacherId: z.string(),
  evidence: z.array(z.object({
    focusAreaId: z.string(),
    type: z.string(),
    description: z.string(),
    date: z.string().datetime(),
  })),
});

const assessAIEthicsSchema = z.object({
  id: z.string(),
  name: z.string(),
  purpose: z.string(),
  description: z.string(),
  dataInputs: z.array(z.string()),
  decisionOutputs: z.array(z.string()),
  humanOversight: z.string(),
  targetUsers: z.array(z.string()),
});

const checkAIContentSafetySchema = z.object({
  id: z.string(),
  type: z.enum(['lesson', 'assessment', 'resource', 'ai_response']),
  text: z.string(),
  targetAge: z.number().optional(),
  subject: z.string().optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/v1/compliance/audit
 * Run comprehensive compliance audit
 */
standardsComplianceRouter.post('/audit', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = runAuditSchema.parse(req.body);

    const complianceService = getStandardsComplianceService();
    const result = await complianceService.runComplianceAudit(tenantId, data);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info({ tenantId, reportId: result.data.id }, 'Compliance audit completed');

    res.json({
      success: true,
      data: { report: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * POST /api/v1/compliance/acara/align
 * Align content to ACARA curriculum
 */
standardsComplianceRouter.post('/acara/align', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = alignToACARACurriculumSchema.parse(req.body);

    const complianceService = getStandardsComplianceService();
    const result = await complianceService.alignToACARACurriculum(tenantId, data.contentId, {
      title: data.title,
      description: data.description,
      text: data.text,
      yearLevel: data.yearLevel,
      subject: data.subject,
      learningObjectives: data.learningObjectives,
    });

    if (!result.success) {
      const error = new ScholarlyApiError('CURR_006');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { alignment: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * GET /api/v1/compliance/acara/codes
 * Get ACARA curriculum codes
 */
standardsComplianceRouter.get('/acara/codes', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  const learningArea = req.query.learningArea as string | undefined;
  const subject = req.query.subject as string | undefined;
  const yearLevel = req.query.yearLevel as string | undefined;
  const searchQuery = req.query.q as string | undefined;

  const complianceService = getStandardsComplianceService();
  const result = await complianceService.getCurriculumCodes(tenantId, {
    learningArea,
    subject,
    yearLevel,
    searchQuery,
  });

  if (!result.success) {
    const error = new ScholarlyApiError('CURR_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { codes: result.data },
  });
});

/**
 * POST /api/v1/compliance/st4s/privacy
 * Assess privacy compliance
 */
standardsComplianceRouter.post('/st4s/privacy', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = assessPrivacySchema.parse(req.body);

    const complianceService = getStandardsComplianceService();
    const result = await complianceService.assessPrivacyCompliance(tenantId, data);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { assessment: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * GET /api/v1/compliance/st4s/security
 * Verify security controls
 */
standardsComplianceRouter.get('/st4s/security', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  const complianceService = getStandardsComplianceService();
  const result = await complianceService.verifySecurityControls(tenantId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: result.data,
  });
});

/**
 * POST /api/v1/compliance/aitsl/assess
 * Assess teacher against AITSL standards
 */
standardsComplianceRouter.post('/aitsl/assess', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = assessTeacherStandardsSchema.parse(req.body);

    const complianceService = getStandardsComplianceService();
    const result = await complianceService.assessTeacherStandards(
      tenantId,
      data.teacherId,
      data.evidence.map(e => ({
        ...e,
        date: new Date(e.date),
      }))
    );

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info({ tenantId, teacherId: data.teacherId }, 'Teacher assessment completed');

    res.json({
      success: true,
      data: { assessment: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * POST /api/v1/compliance/ai-ethics/assess
 * Assess AI system ethics
 */
standardsComplianceRouter.post('/ai-ethics/assess', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = assessAIEthicsSchema.parse(req.body);

    const complianceService = getStandardsComplianceService();
    const result = await complianceService.assessAIEthics(tenantId, data);

    if (!result.success) {
      const error = new ScholarlyApiError('AI_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info({ tenantId, systemId: data.id }, 'AI ethics assessment completed');

    res.json({
      success: true,
      data: { assessment: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * POST /api/v1/compliance/ai-ethics/content-safety
 * Check AI-generated content safety
 */
standardsComplianceRouter.post('/ai-ethics/content-safety', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = checkAIContentSafetySchema.parse(req.body);

    const complianceService = getStandardsComplianceService();
    const result = await complianceService.checkAIContentSafety(tenantId, data);

    if (!result.success) {
      const error = new ScholarlyApiError('AI_006');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { safetyCheck: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});
