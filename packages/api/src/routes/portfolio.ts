/**
 * Digital Portfolio Routes
 *
 * API endpoints for student digital portfolios and learning journeys.
 */

import { Router } from 'express';
import { z } from 'zod';
import { ScholarlyApiError } from '../errors/scholarly-error';
import { authMiddleware } from '../middleware/auth';
import { getDigitalPortfolioService, type ArtifactType } from '../services';
import { log } from '../lib/logger';

export const portfolioRouter: Router = Router();

// All routes require authentication
portfolioRouter.use(authMiddleware);

// ============================================================================
// Validation Schemas
// ============================================================================

const createPortfolioSchema = z.object({
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  visibility: z.enum(['private', 'parents', 'teachers', 'public']).optional(),
  theme: z.object({
    primaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    layout: z.enum(['grid', 'timeline', 'masonry']).optional(),
    fontFamily: z.string().optional(),
  }).optional(),
});

const updatePortfolioSchema = createPortfolioSchema.partial();

const addArtifactSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum([
    'document', 'image', 'video', 'audio', 'presentation',
    'code', 'project', 'assessment', 'certificate', 'badge',
    'reflection', 'goal', 'link'
  ] as const),
  content: z.object({
    url: z.string().url().optional(),
    text: z.string().optional(),
    embedCode: z.string().optional(),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    thumbnailUrl: z.string().url().optional(),
    duration: z.number().optional(),
  }),
  metadata: z.object({
    subject: z.string().optional(),
    yearLevel: z.string().optional(),
    assignmentId: z.string().optional(),
    lessonId: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  sectionId: z.string().optional(),
});

const addReflectionSchema = z.object({
  whatILearned: z.string().min(10).max(2000),
  challengesFaced: z.string().min(10).max(2000),
  howIOvercame: z.string().min(10).max(2000),
  connectionsToPrior: z.string().min(10).max(2000),
  nextSteps: z.string().min(10).max(2000),
  selfRating: z.number().min(1).max(5).optional(),
});

const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(2000),
  category: z.enum(['academic', 'skill', 'personal', 'project']),
  subject: z.string().optional(),
  targetDate: z.string().datetime().optional().transform(s => s ? new Date(s) : undefined),
  milestones: z.array(z.object({ title: z.string() })).optional(),
  curriculumCodes: z.array(z.string()).optional(),
});

const updateGoalSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed', 'abandoned']).optional(),
  progress: z.number().min(0).max(100).optional(),
  completedMilestoneId: z.string().optional(),
  linkedArtifactId: z.string().optional(),
});

const createJourneySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(2000),
  subject: z.string().optional(),
  goals: z.array(z.string()),
  curriculumCodes: z.array(z.string()).optional(),
});

const progressJourneySchema = z.object({
  nodeId: z.string(),
  evidence: z.object({
    artifactId: z.string().optional(),
    reflection: z.string().optional(),
  }).optional(),
});

// ============================================================================
// Portfolio Routes
// ============================================================================

/**
 * POST /api/v1/portfolio
 * Create a new portfolio
 */
portfolioRouter.post('/', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = createPortfolioSchema.parse(req.body);

    const portfolioService = getDigitalPortfolioService();
    const result = await portfolioService.createPortfolio(tenantId, userId, data as any);

    if (!result.success) {
      const error = new ScholarlyApiError('PORT_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Portfolio created', { userId, portfolioId: result.data.id });

    res.status(201).json({
      success: true,
      data: { portfolio: result.data },
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
 * GET /api/v1/portfolio
 * Get user's portfolio
 */
portfolioRouter.get('/', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const portfolioService = getDigitalPortfolioService();
  const result = await portfolioService.getPortfolio(tenantId, userId);

  if (!result.success) {
    // Portfolio doesn't exist yet - that's okay
    return res.json({
      success: true,
      data: { portfolio: null },
    });
  }

  res.json({
    success: true,
    data: { portfolio: result.data },
  });
});

/**
 * PATCH /api/v1/portfolio
 * Update portfolio settings
 */
portfolioRouter.patch('/', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = updatePortfolioSchema.parse(req.body);

    const portfolioService = getDigitalPortfolioService();
    const result = await portfolioService.updatePortfolio(tenantId, userId, data as any);

    if (!result.success) {
      const error = ScholarlyApiError.notFound('Portfolio', userId);
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { portfolio: result.data },
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
// Artifact Routes
// ============================================================================

/**
 * POST /api/v1/portfolio/artifacts
 * Add an artifact to the portfolio
 */
portfolioRouter.post('/artifacts', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = addArtifactSchema.parse(req.body);

    const portfolioService = getDigitalPortfolioService();
    const result = await portfolioService.addArtifact(tenantId, userId, {
      title: data.title,
      description: data.description,
      type: data.type as ArtifactType,
      content: data.content,
      metadata: data.metadata,
      tags: data.tags,
      sectionId: data.sectionId,
    });

    if (!result.success) {
      const error = new ScholarlyApiError('PORT_002');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Artifact added', { userId, artifactId: result.data.id });

    res.status(201).json({
      success: true,
      data: { artifact: result.data },
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
 * GET /api/v1/portfolio/artifacts
 * Get artifacts
 */
portfolioRouter.get('/artifacts', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  const type = req.query.type as ArtifactType | undefined;
  const status = req.query.status as 'draft' | 'published' | 'archived' | undefined;
  const subject = req.query.subject as string | undefined;

  const portfolioService = getDigitalPortfolioService();
  const result = await portfolioService.getArtifacts(tenantId, userId, {
    type,
    status,
    subject,
    limit,
    offset,
  });

  if (!result.success) {
    const error = new ScholarlyApiError('PORT_003');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: result.data,
  });
});

/**
 * POST /api/v1/portfolio/artifacts/:id/reflection
 * Add reflection to an artifact
 */
portfolioRouter.post('/artifacts/:id/reflection', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const artifactId = req.params.id;

  try {
    const data = addReflectionSchema.parse(req.body);

    const portfolioService = getDigitalPortfolioService();
    const result = await portfolioService.addReflection(tenantId, userId, artifactId, data as any);

    if (!result.success) {
      const error = ScholarlyApiError.notFound('Artifact', artifactId);
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Reflection added', { userId, artifactId });

    res.json({
      success: true,
      data: { artifact: result.data },
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
// Goal Routes
// ============================================================================

/**
 * POST /api/v1/portfolio/goals
 * Create a learning goal
 */
portfolioRouter.post('/goals', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = createGoalSchema.parse(req.body);

    const portfolioService = getDigitalPortfolioService();
    const result = await portfolioService.createGoal(tenantId, userId, data as any);

    if (!result.success) {
      const error = new ScholarlyApiError('PORT_004');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Goal created', { userId, goalId: result.data.id });

    res.status(201).json({
      success: true,
      data: { goal: result.data },
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
 * PATCH /api/v1/portfolio/goals/:id
 * Update goal progress
 */
portfolioRouter.patch('/goals/:id', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const goalId = req.params.id;

  try {
    const data = updateGoalSchema.parse(req.body);

    const portfolioService = getDigitalPortfolioService();
    const result = await portfolioService.updateGoalProgress(tenantId, userId, goalId, data);

    if (!result.success) {
      const error = ScholarlyApiError.notFound('Goal', goalId);
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Goal updated', { userId, goalId, status: data.status, progress: data.progress });

    res.json({
      success: true,
      data: { goal: result.data },
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
// Learning Journey Routes
// ============================================================================

/**
 * POST /api/v1/portfolio/journeys
 * Create a learning journey
 */
portfolioRouter.post('/journeys', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = createJourneySchema.parse(req.body);

    const portfolioService = getDigitalPortfolioService();
    const result = await portfolioService.createLearningJourney(tenantId, userId, data as any);

    if (!result.success) {
      const error = new ScholarlyApiError('PORT_005');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Learning journey created', { userId, journeyId: result.data.id });

    res.status(201).json({
      success: true,
      data: { journey: result.data },
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
 * GET /api/v1/portfolio/journeys
 * Get learning journeys
 */
portfolioRouter.get('/journeys', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const status = req.query.status as 'active' | 'completed' | 'paused' | undefined;
  const subject = req.query.subject as string | undefined;

  const portfolioService = getDigitalPortfolioService();
  const result = await portfolioService.getLearningJourneys(tenantId, userId, {
    status,
    subject,
  });

  if (!result.success) {
    const error = new ScholarlyApiError('PORT_006');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { journeys: result.data },
  });
});

/**
 * POST /api/v1/portfolio/journeys/:id/progress
 * Progress in a learning journey
 */
portfolioRouter.post('/journeys/:id/progress', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const journeyId = req.params.id;

  try {
    const data = progressJourneySchema.parse(req.body);

    const portfolioService = getDigitalPortfolioService();
    const result = await portfolioService.progressJourney(
      tenantId,
      userId,
      journeyId,
      data.nodeId,
      data.evidence
    );

    if (!result.success) {
      const error = ScholarlyApiError.notFound('Journey', journeyId);
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Journey progressed', { userId, journeyId, nodeId: data.nodeId });

    res.json({
      success: true,
      data: { journey: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});
