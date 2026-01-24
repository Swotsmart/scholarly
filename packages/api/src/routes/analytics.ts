/**
 * Analytics & Reporting Routes
 *
 * API endpoints for persona-specific dashboards, reports, and insights
 */

import { Router } from 'express';
import { z } from 'zod';
import { ScholarlyApiError } from '../errors/scholarly-error';
import { authMiddleware } from '../middleware/auth';
import { getAnalyticsReportingService, getMLPipelineService } from '../services';
import { log } from '../lib/logger';

export const analyticsRouter: Router = Router();

// All routes require authentication
analyticsRouter.use(authMiddleware);

// ============================================================================
// Validation Schemas
// ============================================================================

const createDashboardSchema = z.object({
  persona: z.enum(['teacher', 'administrator', 'student', 'parent', 'analyst']),
  name: z.string(),
  description: z.string(),
  isDefault: z.boolean().optional(),
});

const createReportSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.enum([
    'student_progress',
    'class_performance',
    'attendance',
    'engagement',
    'compliance',
    'risk_assessment',
    'intervention_tracking',
    'resource_utilization',
    'learning_outcomes',
    'custom',
  ]),
  persona: z.enum(['teacher', 'administrator', 'student', 'parent', 'analyst']),
});

const generateReportSchema = z.object({
  parameters: z.record(z.unknown()).optional(),
});

const dashboardFiltersSchema = z.object({
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
  classId: z.string().optional(),
  schoolId: z.string().optional(),
  studentId: z.string().optional(),
});

// ============================================================================
// Dashboard Routes
// ============================================================================

/**
 * GET /api/v1/analytics/dashboards
 * List user's dashboards
 */
analyticsRouter.get('/dashboards', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const analyticsService = getAnalyticsReportingService();

    // For now, return default dashboard based on user role
    const persona = req.user!.role as any;
    const result = await analyticsService.getDefaultDashboard(tenantId, persona);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { dashboards: [result.data] },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/v1/analytics/dashboards/:id
 * Get specific dashboard
 */
analyticsRouter.get('/dashboards/:id', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const analyticsService = getAnalyticsReportingService();
  const result = await analyticsService.getDashboard(tenantId, id);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { dashboard: result.data },
  });
});

/**
 * POST /api/v1/analytics/dashboards
 * Create new dashboard
 */
analyticsRouter.post('/dashboards', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = createDashboardSchema.parse(req.body);

    const analyticsService = getAnalyticsReportingService();
    const result = await analyticsService.createDashboard(tenantId, userId, {
      persona: data.persona,
      name: data.name,
      description: data.description,
      layout: { columns: 12, rowHeight: 50, positions: [] },
      widgets: [],
      filters: [],
      isDefault: data.isDefault || false,
      sharing: { visibility: 'private', allowExport: true, allowCopy: false },
    });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info({ tenantId, dashboardId: result.data.id }, 'Dashboard created');

    res.status(201).json({
      success: true,
      data: { dashboard: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

// ============================================================================
// Dashboard Data Routes (Persona-Specific)
// ============================================================================

/**
 * GET /api/v1/analytics/teacher/dashboard
 * Get teacher dashboard data
 */
analyticsRouter.get('/teacher/dashboard', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const filters = dashboardFiltersSchema.parse(req.query);

    const analyticsService = getAnalyticsReportingService();
    const result = await analyticsService.getTeacherDashboardData(tenantId, userId, filters);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: result.data,
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
 * GET /api/v1/analytics/admin/dashboard
 * Get administrator dashboard data
 */
analyticsRouter.get('/admin/dashboard', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const filters = dashboardFiltersSchema.parse(req.query);

    const analyticsService = getAnalyticsReportingService();
    const result = await analyticsService.getAdminDashboardData(tenantId, userId, filters);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: result.data,
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
 * GET /api/v1/analytics/student/dashboard
 * Get student dashboard data
 */
analyticsRouter.get('/student/dashboard', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const filters = dashboardFiltersSchema.parse(req.query);

    const analyticsService = getAnalyticsReportingService();
    const result = await analyticsService.getStudentDashboardData(tenantId, userId, filters);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: result.data,
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
 * GET /api/v1/analytics/parent/dashboard
 * Get parent dashboard data
 */
analyticsRouter.get('/parent/dashboard', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const filters = dashboardFiltersSchema.parse(req.query);

    const analyticsService = getAnalyticsReportingService();
    const result = await analyticsService.getParentDashboardData(tenantId, userId, filters);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

// ============================================================================
// Report Routes
// ============================================================================

/**
 * GET /api/v1/analytics/reports
 * List available reports
 */
analyticsRouter.get('/reports', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  res.json({
    success: true,
    data: { reports: [] },
  });
});

/**
 * POST /api/v1/analytics/reports
 * Create new report template
 */
analyticsRouter.post('/reports', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = createReportSchema.parse(req.body);

    const analyticsService = getAnalyticsReportingService();
    const result = await analyticsService.createReport(tenantId, {
      name: data.name,
      description: data.description,
      type: data.type,
      persona: data.persona,
      template: {
        sections: [],
        styling: {
          theme: 'professional',
          primaryColor: '#1a56db',
          font: 'Inter',
          pageSize: 'A4',
          orientation: 'portrait',
        },
      },
    });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info({ tenantId, reportId: result.data.id }, 'Report template created');

    res.status(201).json({
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
 * POST /api/v1/analytics/reports/:id/generate
 * Generate report
 */
analyticsRouter.post('/reports/:id/generate', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  try {
    const data = generateReportSchema.parse(req.body);

    const analyticsService = getAnalyticsReportingService();
    const result = await analyticsService.generateReport(tenantId, id, data.parameters);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info({ tenantId, reportId: id, generatedId: result.data.id }, 'Report generated');

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

// ============================================================================
// ML Predictions Routes
// ============================================================================

/**
 * GET /api/v1/analytics/predictions/student-risk/:studentId
 * Get student risk prediction
 */
analyticsRouter.get('/predictions/student-risk/:studentId', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { studentId } = req.params;

  const mlService = getMLPipelineService();
  const result = await mlService.predictStudentRisk(tenantId, studentId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { prediction: result.data },
  });
});

/**
 * GET /api/v1/analytics/predictions/performance/:entityId
 * Get performance prediction
 */
analyticsRouter.get('/predictions/performance/:entityId', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { entityId } = req.params;
  const entityType = (req.query.entityType as 'student' | 'class' | 'school') || 'student';
  const metric = (req.query.metric as string) || 'academic_score';

  const mlService = getMLPipelineService();
  const result = await mlService.predictPerformance(tenantId, entityId, entityType, metric);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { prediction: result.data },
  });
});

/**
 * GET /api/v1/analytics/predictions/engagement/:userId
 * Get engagement prediction
 */
analyticsRouter.get('/predictions/engagement/:userId', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { userId } = req.params;
  const userType = (req.query.userType as 'student' | 'teacher' | 'parent') || 'student';

  const mlService = getMLPipelineService();
  const result = await mlService.predictEngagement(tenantId, userId, userType);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { prediction: result.data },
  });
});

/**
 * POST /api/v1/analytics/predictions/learning-path
 * Get learning path recommendation
 */
analyticsRouter.post('/predictions/learning-path', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  const schema = z.object({
    studentId: z.string(),
    targetSkills: z.array(z.string()),
  });

  try {
    const data = schema.parse(req.body);

    const mlService = getMLPipelineService();
    const result = await mlService.recommendLearningPath(tenantId, data.studentId, data.targetSkills);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { recommendation: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

// ============================================================================
// Metrics Routes
// ============================================================================

/**
 * GET /api/v1/analytics/metrics
 * List available metrics
 */
analyticsRouter.get('/metrics', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const category = req.query.category as string | undefined;

  const analyticsService = getAnalyticsReportingService();
  const result = await analyticsService.getMetrics(tenantId, category as any);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { metrics: result.data },
  });
});

/**
 * GET /api/v1/analytics/metrics/:id/calculate
 * Calculate metric value
 */
analyticsRouter.get('/metrics/:id/calculate', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const analyticsService = getAnalyticsReportingService();
  const result = await analyticsService.calculateMetric(tenantId, id, req.query as Record<string, unknown>);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: result.data,
  });
});

// ============================================================================
// Export Routes
// ============================================================================

/**
 * POST /api/v1/analytics/dashboards/:id/export
 * Export dashboard data
 */
analyticsRouter.post('/dashboards/:id/export', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const format = (req.body.format as 'csv' | 'json' | 'excel') || 'json';

  const analyticsService = getAnalyticsReportingService();
  const result = await analyticsService.exportDashboardData(tenantId, id, format);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: result.data,
  });
});
