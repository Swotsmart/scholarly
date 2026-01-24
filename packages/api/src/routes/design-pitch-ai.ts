/**
 * Design & Pitch AI Routes
 *
 * API endpoints for the Design & Pitch AI pedagogical module
 * Supporting design thinking and entrepreneurial pitching with 4 phases:
 * 1. Empathize & Define
 * 2. Ideate & Prototype
 * 3. Iterate & Refine (Peer Review)
 * 4. Pitch & Present (10/20/30 Rule)
 */

import { Router } from 'express';
import { z } from 'zod';
import { ScholarlyApiError } from '../errors/scholarly-error';
import { authMiddleware } from '../middleware/auth';
import { getDesignPitchAIService } from '../services';
import { log } from '../lib/logger';

export const designPitchRouter: Router = Router();

// All routes require authentication
designPitchRouter.use(authMiddleware);

// ============================================================================
// Validation Schemas
// ============================================================================

const createChallengeSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string(),
  problemDomain: z.string(),
  learningObjectives: z.array(z.string()),
  constraints: z.object({
    maxTeamSize: z.number().min(1).max(10).default(5),
    minTeamSize: z.number().min(1).max(5).default(1),
    maxSlides: z.number().min(5).max(20).default(10),
    maxPitchMinutes: z.number().min(5).max(60).default(20),
    minFontSize: z.number().min(18).max(48).default(30),
    requiredArtifactTypes: z.array(z.enum([
      'sketch', 'wireframe', 'prototype', 'data_model', 'document', 'image', 'video', 'audio'
    ])).default([]),
    peerReviewsRequired: z.number().min(0).max(10).default(2),
  }),
  rubric: z.object({
    criteria: z.array(z.object({
      name: z.string(),
      description: z.string(),
      weight: z.number(),
      levels: z.array(z.object({
        score: z.number(),
        label: z.string(),
        description: z.string(),
      })),
    })),
  }),
  phases: z.array(z.object({
    phase: z.enum(['empathize_define', 'ideate_prototype', 'iterate_refine', 'pitch_present']),
    enabled: z.boolean(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    requirements: z.array(z.string()),
    aiAssistanceLevel: z.enum(['full', 'moderate', 'minimal', 'none']).default('moderate'),
  })),
  teamSettings: z.object({
    allowSoloProjects: z.boolean().default(true),
    teamFormation: z.enum(['instructor_assigned', 'self_select', 'random', 'ai_optimized']).default('self_select'),
    requireDiverseSkills: z.boolean().default(false),
  }),
  schedule: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    milestones: z.array(z.object({
      name: z.string(),
      phase: z.enum(['empathize_define', 'ideate_prototype', 'iterate_refine', 'pitch_present']),
      dueDate: z.string().datetime(),
      deliverables: z.array(z.string()),
      points: z.number(),
    })),
  }),
  courseId: z.string().optional(),
  ltiConfig: z.object({
    deploymentId: z.string(),
    clientId: z.string(),
    issuer: z.string(),
    deepLinkingEnabled: z.boolean(),
    gradesyncEnabled: z.boolean(),
  }).optional(),
});

const updateProblemStatementSchema = z.object({
  statement: z.string().optional(),
  targetUsers: z.string().optional(),
  painPoints: z.array(z.string()).optional(),
  desiredOutcome: z.string().optional(),
});

const createPersonaSchema = z.object({
  name: z.string(),
  demographics: z.string(),
  goals: z.array(z.string()),
  painPoints: z.array(z.string()),
  behaviors: z.array(z.string()),
  quote: z.string(),
  imageUrl: z.string().optional(),
  jobsToBeDone: z.array(z.object({
    job: z.string(),
    context: z.string(),
    desiredOutcome: z.string(),
    currentSolution: z.string(),
    frustrations: z.array(z.string()),
  })).default([]),
});

const addEvidenceSchema = z.object({
  type: z.enum(['interview', 'observation', 'survey', 'research', 'data', 'other']),
  title: z.string(),
  description: z.string(),
  fileUrl: z.string().optional(),
  fileType: z.string().optional(),
  insights: z.array(z.string()),
  linkedPersonas: z.array(z.string()).default([]),
});

const createArtifactSchema = z.object({
  type: z.enum(['sketch', 'wireframe', 'prototype', 'data_model', 'document', 'image', 'video', 'audio']),
  title: z.string(),
  description: z.string(),
  fileUrl: z.string(),
  fileType: z.string(),
  metadata: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    pages: z.number().optional(),
    duration: z.number().optional(),
    fileSize: z.number().optional(),
  }).optional(),
  tags: z.array(z.string()).default([]),
  linkedPersonas: z.array(z.string()).default([]),
});

const addVersionSchema = z.object({
  fileUrl: z.string(),
  fileType: z.string(),
  metadata: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    pages: z.number().optional(),
    duration: z.number().optional(),
    fileSize: z.number().optional(),
  }).optional(),
  changelog: z.string(),
});

const submitReviewSchema = z.object({
  rubricScores: z.array(z.object({
    criterionId: z.string(),
    score: z.number(),
    feedback: z.string(),
  })),
  feedbackText: z.string(),
  feedbackPins: z.array(z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    page: z.number().optional(),
    type: z.enum(['praise', 'question', 'suggestion', 'concern']),
    comment: z.string(),
  })),
  strengths: z.array(z.string()),
  growthAreas: z.array(z.string()),
  overallRating: z.number().min(1).max(5),
});

const addFeedbackPinSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  page: z.number().optional(),
  type: z.enum(['praise', 'question', 'suggestion', 'concern']),
  comment: z.string(),
});

const updateSlideSchema = z.object({
  title: z.string().optional(),
  type: z.enum([
    'title', 'problem', 'solution', 'demo', 'market',
    'business_model', 'traction', 'team', 'ask', 'closing', 'custom'
  ]).optional(),
  content: z.object({
    headline: z.string().optional(),
    bodyText: z.string().optional(),
    bulletPoints: z.array(z.string()).optional(),
    imageUrl: z.string().optional(),
    videoUrl: z.string().optional(),
    layout: z.enum(['full_text', 'text_image', 'image_text', 'full_image', 'two_column', 'chart']).optional(),
  }).optional(),
  speakerNotes: z.string().optional(),
  duration: z.number().optional(),
});

const gradePitchSchema = z.object({
  rubricScores: z.array(z.object({
    criterionId: z.string(),
    score: z.number(),
    feedback: z.string(),
  })),
  instructorFeedback: z.string(),
});

const createTeamSchema = z.object({
  name: z.string(),
  members: z.array(z.object({
    userId: z.string(),
    displayName: z.string(),
    email: z.string().email(),
    skills: z.array(z.string()).optional(),
  })),
});

// ============================================================================
// Challenge Management Routes
// ============================================================================

/**
 * GET /api/v1/design-pitch/challenges
 * List design challenges
 */
designPitchRouter.get('/challenges', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  const status = req.query.status as string | undefined;
  const instructorId = req.query.instructorId as string | undefined;
  const courseId = req.query.courseId as string | undefined;

  const service = getDesignPitchAIService();
  const result = await service.listChallenges(tenantId, { status, instructorId, courseId });

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { challenges: result.data },
  });
});

/**
 * GET /api/v1/design-pitch/challenges/:id
 * Get specific challenge
 */
designPitchRouter.get('/challenges/:id', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.getChallenge(tenantId, id);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { challenge: result.data },
  });
});

/**
 * POST /api/v1/design-pitch/challenges
 * Create new design challenge (Instructor only)
 */
designPitchRouter.post('/challenges', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const instructorId = req.user!.id;

  try {
    const data = createChallengeSchema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.createChallenge(tenantId, instructorId, {
      title: data.title,
      description: data.description,
      problemDomain: data.problemDomain,
      learningObjectives: data.learningObjectives,
      constraints: {
        maxTeamSize: data.constraints.maxTeamSize,
        minTeamSize: data.constraints.minTeamSize,
        maxSlides: data.constraints.maxSlides,
        maxPitchMinutes: data.constraints.maxPitchMinutes,
        minFontSize: data.constraints.minFontSize,
        requiredArtifactTypes: data.constraints.requiredArtifactTypes,
        peerReviewsRequired: data.constraints.peerReviewsRequired,
      },
      rubric: {
        id: `rubric-${Date.now()}`,
        criteria: data.rubric.criteria.map((c, i) => ({
          id: `criterion-${i}`,
          name: c.name,
          description: c.description,
          weight: c.weight,
          levels: c.levels.map(l => ({
            score: l.score,
            label: l.label,
            description: l.description,
          })),
        })),
        totalPoints: data.rubric.criteria.reduce((sum, c) =>
          sum + c.weight * Math.max(...c.levels.map(l => l.score)), 0
        ),
      },
      phases: data.phases.map(p => ({
        phase: p.phase,
        enabled: p.enabled,
        startDate: p.startDate ? new Date(p.startDate) : undefined,
        endDate: p.endDate ? new Date(p.endDate) : undefined,
        requirements: p.requirements,
        aiAssistanceLevel: p.aiAssistanceLevel,
      })),
      teamSettings: {
        allowSoloProjects: data.teamSettings.allowSoloProjects,
        teamFormation: data.teamSettings.teamFormation,
        requireDiverseSkills: data.teamSettings.requireDiverseSkills,
      },
      schedule: {
        startDate: new Date(data.schedule.startDate),
        endDate: new Date(data.schedule.endDate),
        milestones: data.schedule.milestones.map((m, i) => ({
          id: `milestone-${i}`,
          name: m.name,
          phase: m.phase,
          dueDate: new Date(m.dueDate),
          deliverables: m.deliverables,
          points: m.points,
        })),
      },
      courseId: data.courseId,
      ltiConfig: data.ltiConfig ? {
        deploymentId: data.ltiConfig.deploymentId,
        clientId: data.ltiConfig.clientId,
        issuer: data.ltiConfig.issuer,
        deepLinkingEnabled: data.ltiConfig.deepLinkingEnabled,
        gradesyncEnabled: data.ltiConfig.gradesyncEnabled,
      } : undefined,
    });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Design challenge created', { tenantId, challengeId: result.data.id });

    res.status(201).json({
      success: true,
      data: { challenge: result.data },
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
 * POST /api/v1/design-pitch/challenges/:id/activate
 * Activate a design challenge
 */
designPitchRouter.post('/challenges/:id/activate', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.activateChallenge(tenantId, id);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  log.info('Design challenge activated', { tenantId, challengeId: id });

  res.json({
    success: true,
    data: { challenge: result.data },
  });
});

/**
 * GET /api/v1/design-pitch/challenges/:id/analytics
 * Get challenge analytics
 */
designPitchRouter.get('/challenges/:id/analytics', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.getChallengeAnalytics(tenantId, id);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { analytics: result.data },
  });
});

// ============================================================================
// Learner Journey Routes (Phase 1: Empathize & Define)
// ============================================================================

/**
 * POST /api/v1/design-pitch/challenges/:challengeId/journeys
 * Start a new learner journey
 */
designPitchRouter.post('/challenges/:challengeId/journeys', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const learnerId = req.user!.id;
  const { challengeId } = req.params;
  const teamId = req.body.teamId as string | undefined;

  const service = getDesignPitchAIService();
  const result = await service.startJourney(tenantId, challengeId, learnerId, teamId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  log.info('Learner journey started', { tenantId, journeyId: result.data.id, challengeId });

  res.status(201).json({
    success: true,
    data: { journey: result.data },
  });
});

/**
 * PUT /api/v1/design-pitch/journeys/:journeyId/problem-statement
 * Update problem statement
 */
designPitchRouter.put('/journeys/:journeyId/problem-statement', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { journeyId } = req.params;

  try {
    const data = updateProblemStatementSchema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.updateProblemStatement(tenantId, journeyId, data);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

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

/**
 * POST /api/v1/design-pitch/journeys/:journeyId/problem-statement/validate
 * Validate problem statement with AI
 */
designPitchRouter.post('/journeys/:journeyId/problem-statement/validate', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { journeyId } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.validateProblemStatement(tenantId, journeyId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { validation: result.data },
  });
});

/**
 * POST /api/v1/design-pitch/journeys/:journeyId/learning-goals
 * Add learning goal
 */
designPitchRouter.post('/journeys/:journeyId/learning-goals', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { journeyId } = req.params;

  const schema = z.object({
    goal: z.string(),
    category: z.enum(['knowledge', 'skill', 'mindset']),
    targetDate: z.string().datetime().optional(),
  });

  try {
    const data = schema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.addLearningGoal(tenantId, journeyId, {
      goal: data.goal,
      category: data.category,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
    } as { goal: string; category: 'knowledge' | 'skill' | 'mindset'; targetDate?: Date });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

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
 * POST /api/v1/design-pitch/journeys/:journeyId/personas
 * Create user persona
 */
designPitchRouter.post('/journeys/:journeyId/personas', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { journeyId } = req.params;

  try {
    const data = createPersonaSchema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.createUserPersona(tenantId, journeyId, {
      name: data.name,
      demographics: data.demographics,
      goals: data.goals,
      painPoints: data.painPoints,
      behaviors: data.behaviors,
      quote: data.quote,
      imageUrl: data.imageUrl,
      jobsToBeDone: data.jobsToBeDone.map((j, i) => ({
        id: `job-${i}`,
        job: j.job,
        context: j.context,
        desiredOutcome: j.desiredOutcome,
        currentSolution: j.currentSolution,
        frustrations: j.frustrations,
      })),
    });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.status(201).json({
      success: true,
      data: { persona: result.data },
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
 * GET /api/v1/design-pitch/journeys/:journeyId/personas/suggestions
 * Get AI-generated persona suggestions
 */
designPitchRouter.get('/journeys/:journeyId/personas/suggestions', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { journeyId } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.generatePersonaSuggestions(tenantId, journeyId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { suggestions: result.data },
  });
});

/**
 * POST /api/v1/design-pitch/journeys/:journeyId/evidence
 * Add evidence to evidence locker
 */
designPitchRouter.post('/journeys/:journeyId/evidence', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { journeyId } = req.params;

  try {
    const data = addEvidenceSchema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.addEvidence(tenantId, journeyId, {
      type: data.type,
      title: data.title,
      description: data.description,
      insights: data.insights,
      linkedPersonas: data.linkedPersonas,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
    } as { type: 'interview' | 'observation' | 'survey' | 'research' | 'data' | 'other'; title: string; description: string; insights: string[]; linkedPersonas: string[]; fileUrl?: string; fileType?: string });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.status(201).json({
      success: true,
      data: { evidence: result.data },
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
// Artifact Routes (Phase 2: Ideate & Prototype)
// ============================================================================

/**
 * POST /api/v1/design-pitch/journeys/:journeyId/artifacts
 * Create new artifact
 */
designPitchRouter.post('/journeys/:journeyId/artifacts', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { journeyId } = req.params;

  try {
    const data = createArtifactSchema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.createArtifact(tenantId, journeyId, {
      type: data.type,
      title: data.title,
      description: data.description,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      metadata: data.metadata,
      tags: data.tags,
      linkedPersonas: data.linkedPersonas,
    });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Artifact created', { tenantId, artifactId: result.data.id, journeyId });

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
 * POST /api/v1/design-pitch/artifacts/:artifactId/versions
 * Add new version to artifact
 */
designPitchRouter.post('/artifacts/:artifactId/versions', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { artifactId } = req.params;

  try {
    const data = addVersionSchema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.addArtifactVersion(tenantId, artifactId, {
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      metadata: data.metadata,
      changelog: data.changelog,
    });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

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
 * GET /api/v1/design-pitch/journeys/:journeyId/artifacts/:artifactId/coaching
 * Get AI pre-pitch coaching for artifact
 */
designPitchRouter.get('/journeys/:journeyId/artifacts/:artifactId/coaching', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { journeyId, artifactId } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.getPrePitchCoaching(tenantId, journeyId, artifactId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { coaching: result.data },
  });
});

/**
 * POST /api/v1/design-pitch/artifacts/:artifactId/analyze
 * Get AI analysis of artifact
 */
designPitchRouter.post('/artifacts/:artifactId/analyze', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { artifactId } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.analyzeArtifact(tenantId, artifactId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { analysis: result.data },
  });
});

// ============================================================================
// Peer Review Routes (Phase 3: Iterate & Refine)
// ============================================================================

/**
 * POST /api/v1/design-pitch/artifacts/:artifactId/submit-for-review
 * Submit artifact for peer review
 */
designPitchRouter.post('/artifacts/:artifactId/submit-for-review', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { artifactId } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.submitForReview(tenantId, artifactId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { artifact: result.data },
  });
});

/**
 * POST /api/v1/design-pitch/artifacts/:artifactId/assign-reviewer
 * Assign peer reviewer (Double-blind support)
 */
designPitchRouter.post('/artifacts/:artifactId/assign-reviewer', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { artifactId } = req.params;

  const schema = z.object({
    reviewerId: z.string(),
    isAnonymous: z.boolean().default(true),
  });

  try {
    const data = schema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.assignPeerReview(tenantId, artifactId, data.reviewerId, data.isAnonymous);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.status(201).json({
      success: true,
      data: { review: result.data },
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
 * PUT /api/v1/design-pitch/reviews/:reviewId
 * Submit peer review with feedback pins
 */
designPitchRouter.put('/reviews/:reviewId', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { reviewId } = req.params;

  try {
    const data = submitReviewSchema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.submitPeerReview(tenantId, reviewId, {
      rubricScores: data.rubricScores.map(s => ({
        criterionId: s.criterionId,
        score: s.score,
        feedback: s.feedback,
      })),
      feedbackText: data.feedbackText,
      feedbackPins: data.feedbackPins.map(p => ({
        x: p.x,
        y: p.y,
        page: p.page,
        type: p.type,
        comment: p.comment,
      })),
      strengths: data.strengths,
      growthAreas: data.growthAreas,
      overallRating: data.overallRating,
    });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Peer review submitted', { tenantId, reviewId });

    res.json({
      success: true,
      data: { review: result.data },
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
 * POST /api/v1/design-pitch/reviews/:reviewId/pins
 * Add feedback pin (inline annotation)
 */
designPitchRouter.post('/reviews/:reviewId/pins', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { reviewId } = req.params;

  try {
    const data = addFeedbackPinSchema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.addFeedbackPin(tenantId, reviewId, {
      x: data.x,
      y: data.y,
      page: data.page,
      type: data.type,
      comment: data.comment,
    });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.status(201).json({
      success: true,
      data: { pin: result.data },
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
 * POST /api/v1/design-pitch/reviews/:reviewId/pins/:pinId/resolve
 * Resolve feedback pin
 */
designPitchRouter.post('/reviews/:reviewId/pins/:pinId/resolve', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { reviewId, pinId } = req.params;

  const schema = z.object({
    resolution: z.string(),
  });

  try {
    const data = schema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.resolveFeedbackPin(tenantId, reviewId, pinId, data.resolution);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { pin: result.data },
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
 * POST /api/v1/design-pitch/artifacts/:artifactId/synthesize-feedback
 * AI synthesis of peer feedback into actionable growth areas
 */
designPitchRouter.post('/artifacts/:artifactId/synthesize-feedback', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { artifactId } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.synthesizeFeedback(tenantId, artifactId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { synthesis: result.data },
  });
});

// ============================================================================
// Pitch Deck Routes (Phase 4: Pitch & Present - 10/20/30 Rule)
// ============================================================================

/**
 * POST /api/v1/design-pitch/journeys/:journeyId/pitch-deck
 * Create pitch deck with 10/20/30 constraints
 */
designPitchRouter.post('/journeys/:journeyId/pitch-deck', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { journeyId } = req.params;

  const schema = z.object({
    title: z.string(),
  });

  try {
    const data = schema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.createPitchDeck(tenantId, journeyId, data.title);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Pitch deck created', { tenantId, pitchDeckId: result.data.id, journeyId });

    res.status(201).json({
      success: true,
      data: { pitchDeck: result.data },
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
 * PUT /api/v1/design-pitch/pitch-decks/:pitchDeckId/slides/:slideId
 * Update pitch slide
 */
designPitchRouter.put('/pitch-decks/:pitchDeckId/slides/:slideId', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { pitchDeckId, slideId } = req.params;

  try {
    const data = updateSlideSchema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.updateSlide(tenantId, pitchDeckId, slideId, {
      title: data.title,
      type: data.type,
      content: data.content ? {
        layout: data.content.layout!,
        headline: data.content.headline,
        bodyText: data.content.bodyText,
        bulletPoints: data.content.bulletPoints,
        imageUrl: data.content.imageUrl,
        videoUrl: data.content.videoUrl,
      } : undefined,
      speakerNotes: data.speakerNotes,
      duration: data.duration,
    });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { slide: result.data },
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
 * POST /api/v1/design-pitch/pitch-decks/:pitchDeckId/slides
 * Add new slide (enforces max slide limit)
 */
designPitchRouter.post('/pitch-decks/:pitchDeckId/slides', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { pitchDeckId } = req.params;

  const schema = z.object({
    order: z.number(),
    type: z.enum([
      'title', 'problem', 'solution', 'demo', 'market',
      'business_model', 'traction', 'team', 'ask', 'closing', 'custom'
    ]),
    title: z.string(),
    content: z.object({
      headline: z.string().optional(),
      bodyText: z.string().optional(),
      bulletPoints: z.array(z.string()).optional(),
      layout: z.enum(['full_text', 'text_image', 'image_text', 'full_image', 'two_column', 'chart']),
    }),
    speakerNotes: z.string().default(''),
    afterSlideId: z.string().optional(),
  });

  try {
    const data = schema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.addSlide(
      tenantId,
      pitchDeckId,
      {
        order: data.order,
        type: data.type,
        title: data.title,
        content: {
          layout: data.content.layout,
          headline: data.content.headline,
          bodyText: data.content.bodyText,
          bulletPoints: data.content.bulletPoints,
        },
        speakerNotes: data.speakerNotes,
        transitions: [{ type: 'fade', duration: 300 }],
      },
      data.afterSlideId
    );

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.status(201).json({
      success: true,
      data: { pitchDeck: result.data },
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
 * DELETE /api/v1/design-pitch/pitch-decks/:pitchDeckId/slides/:slideId
 * Remove slide
 */
designPitchRouter.delete('/pitch-decks/:pitchDeckId/slides/:slideId', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { pitchDeckId, slideId } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.removeSlide(tenantId, pitchDeckId, slideId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { pitchDeck: result.data },
  });
});

/**
 * POST /api/v1/design-pitch/pitch-decks/:pitchDeckId/practice
 * Start practice run with timer
 */
designPitchRouter.post('/pitch-decks/:pitchDeckId/practice', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { pitchDeckId } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.startPracticeRun(tenantId, pitchDeckId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.status(201).json({
    success: true,
    data: { practiceRun: result.data },
  });
});

/**
 * PUT /api/v1/design-pitch/pitch-decks/:pitchDeckId/practice/:practiceRunId
 * End practice run and get AI feedback
 */
designPitchRouter.put('/pitch-decks/:pitchDeckId/practice/:practiceRunId', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { pitchDeckId, practiceRunId } = req.params;

  const schema = z.object({
    slideTimings: z.array(z.object({
      slideId: z.string(),
      duration: z.number(),
    })),
  });

  try {
    const data = schema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.endPracticeRun(tenantId, pitchDeckId, practiceRunId, data.slideTimings.map(t => ({
      slideId: t.slideId,
      duration: t.duration,
    })));

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { practiceRun: result.data },
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
// Grading & LMS Integration Routes
// ============================================================================

/**
 * POST /api/v1/design-pitch/journeys/:journeyId/grade
 * Grade pitch (Instructor only)
 */
designPitchRouter.post('/journeys/:journeyId/grade', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const gradedBy = req.user!.id;
  const { journeyId } = req.params;

  try {
    const data = gradePitchSchema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.gradePitch(tenantId, journeyId, {
      rubricScores: data.rubricScores.map(s => ({
        criterionId: s.criterionId,
        score: s.score,
        feedback: s.feedback,
      })),
      instructorFeedback: data.instructorFeedback,
      gradedBy,
    });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Pitch graded', { tenantId, journeyId, gradedBy });

    res.json({
      success: true,
      data: { score: result.data },
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
 * POST /api/v1/design-pitch/journeys/:journeyId/sync-lms
 * Sync grade to LMS via LTI AGS
 */
designPitchRouter.post('/journeys/:journeyId/sync-lms', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { journeyId } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.syncGradeToLMS(tenantId, journeyId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  log.info('Grade synced to LMS', { tenantId, journeyId, synced: result.data.synced });

  res.json({
    success: true,
    data: result.data,
  });
});

/**
 * GET /api/v1/design-pitch/journeys/:journeyId/analytics
 * Get journey analytics
 */
designPitchRouter.get('/journeys/:journeyId/analytics', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { journeyId } = req.params;

  const service = getDesignPitchAIService();
  const result = await service.getJourneyAnalytics(tenantId, journeyId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { analytics: result.data },
  });
});

// ============================================================================
// Team Management Routes
// ============================================================================

/**
 * POST /api/v1/design-pitch/challenges/:challengeId/teams
 * Create team for challenge
 */
designPitchRouter.post('/challenges/:challengeId/teams', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { challengeId } = req.params;

  try {
    const data = createTeamSchema.parse(req.body);

    const service = getDesignPitchAIService();
    const result = await service.createTeam(tenantId, challengeId, data.name, data.members.map(m => ({
      userId: m.userId,
      displayName: m.displayName,
      email: m.email,
      skills: m.skills,
    })));

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Team created', { tenantId, teamId: result.data.id, challengeId });

    res.status(201).json({
      success: true,
      data: { team: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});
