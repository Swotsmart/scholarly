/**
 * Collaboration Routes
 *
 * API endpoints for collaborative story creation, teacher collaboration,
 * shared lesson planning, and resource exchange.
 * Sprints: 11, 14
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { authMiddleware } from '../middleware/auth';

export const collaborationRouter: Router = Router();
collaborationRouter.use(authMiddleware);

// ============================================================================
// Shared Schemas
// ============================================================================

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Collaborative Story Creation
// ============================================================================

const createStorySchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  sessionType: z.string().default('story'),
});

collaborationRouter.post('/stories', async (req: Request, res: Response) => {
  try {
    const parsed = createStorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      });
      return;
    }

    const { title, description, sessionType } = parsed.data;

    const session = await prisma.collaborativeSession.create({
      data: {
        tenantId: req.tenantId!,
        creatorId: req.user!.id,
        title,
        description: description || null,
        sessionType,
        participants: [
          { userId: req.user!.id, role: 'creator', joinedAt: new Date() },
        ],
      },
    });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create collaborative session' },
    });
  }
});

collaborationRouter.get('/stories', async (req: Request, res: Response) => {
  try {
    const pagination = paginationSchema.safeParse(req.query);
    if (!pagination.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid pagination parameters', details: pagination.error.flatten().fieldErrors },
      });
      return;
    }

    const { page, limit } = pagination.data;
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {
      tenantId: req.tenantId!,
    };

    if (status) {
      where.status = status;
    }

    const [sessions, total] = await Promise.all([
      prisma.collaborativeSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { contributions: true } },
        },
      }),
      prisma.collaborativeSession.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        sessions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch collaborative sessions' },
    });
  }
});

const contributeSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  metadata: z.record(z.unknown()).optional(),
});

collaborationRouter.post('/stories/:sessionId/contribute', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const parsed = contributeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      });
      return;
    }

    const { text, metadata } = parsed.data;

    const session = await prisma.collaborativeSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: { message: 'Collaborative session not found' },
      });
      return;
    }

    if (session.status !== 'active') {
      res.status(400).json({
        success: false,
        error: { message: `Session is not active (current status: ${session.status})` },
      });
      return;
    }

    // Get the max sequence number for this session
    const maxSequence = await prisma.sessionContribution.aggregate({
      where: { sessionId },
      _max: { sequence: true },
    });

    const nextSequence = (maxSequence._max.sequence ?? 0) + 1;

    const contribution = await prisma.sessionContribution.create({
      data: {
        sessionId,
        userId: req.user!.id,
        text,
        sequence: nextSequence,
        metadata: metadata || null,
      },
    });

    res.status(201).json({
      success: true,
      data: contribution,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add contribution' },
    });
  }
});

// ============================================================================
// Teacher Lesson Plans
// ============================================================================

const createLessonPlanSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().default(''),
  subject: z.string().min(1, 'Subject is required'),
  yearLevel: z.string().min(1, 'Year level is required'),
  duration: z.number().int().min(15).max(180),
  learningIntentions: z.array(z.string()).default([]),
  successCriteria: z.array(z.string()).default([]),
  generalCapabilities: z.array(z.string()).default([]),
  crossCurriculumPriorities: z.array(z.string()).default([]),
  sections: z.any().default([]),
  differentiation: z.any().default({}),
  resources: z.any().default([]),
  assessmentOpportunities: z.any().default([]),
  crossCurricularConnections: z.any().default([]),
  generatedBy: z.string().default('manual'),
  generationPrompt: z.string().optional(),
});

collaborationRouter.post('/lesson-plans', async (req: Request, res: Response) => {
  try {
    const parsed = createLessonPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      });
      return;
    }

    const data = parsed.data;

    const lessonPlan = await prisma.lessonPlan.create({
      data: {
        tenantId: req.tenantId!,
        createdBy: req.user!.id,
        title: data.title,
        description: data.description,
        subject: data.subject,
        yearLevel: data.yearLevel,
        duration: data.duration,
        learningIntentions: data.learningIntentions,
        successCriteria: data.successCriteria,
        generalCapabilities: data.generalCapabilities,
        crossCurriculumPriorities: data.crossCurriculumPriorities,
        sections: data.sections,
        differentiation: data.differentiation,
        resources: data.resources,
        assessmentOpportunities: data.assessmentOpportunities,
        crossCurricularConnections: data.crossCurricularConnections,
        generatedBy: data.generatedBy,
        generationPrompt: data.generationPrompt || null,
      },
    });

    res.status(201).json({
      success: true,
      data: lessonPlan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create lesson plan' },
    });
  }
});

collaborationRouter.get('/lesson-plans', async (req: Request, res: Response) => {
  try {
    const pagination = paginationSchema.safeParse(req.query);
    if (!pagination.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid pagination parameters', details: pagination.error.flatten().fieldErrors },
      });
      return;
    }

    const { page, limit } = pagination.data;
    const skip = (page - 1) * limit;
    const subject = req.query.subject as string | undefined;
    const yearLevel = req.query.yearLevel as string | undefined;

    const where: Record<string, unknown> = {
      tenantId: req.tenantId!,
    };

    if (subject) {
      where.subject = subject;
    }
    if (yearLevel) {
      where.yearLevel = yearLevel;
    }

    const [lessonPlans, total] = await Promise.all([
      prisma.lessonPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          standards: true,
          _count: true,
        },
      }),
      prisma.lessonPlan.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        lessonPlans,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch lesson plans' },
    });
  }
});

collaborationRouter.get('/lesson-plans/:planId', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: planId },
      include: {
        standards: true,
      },
    });

    if (!lessonPlan) {
      res.status(404).json({
        success: false,
        error: { message: 'Lesson plan not found' },
      });
      return;
    }

    const comments = await prisma.lessonPlanComment.findMany({
      where: { lessonPlanId: planId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: {
        ...lessonPlan,
        comments,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch lesson plan' },
    });
  }
});

collaborationRouter.post('/lesson-plans/:planId/fork', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    const original = await prisma.lessonPlan.findUnique({
      where: { id: planId },
    });

    if (!original) {
      res.status(404).json({
        success: false,
        error: { message: 'Lesson plan not found' },
      });
      return;
    }

    const forked = await prisma.lessonPlan.create({
      data: {
        tenantId: req.tenantId!,
        createdBy: req.user!.id,
        title: `Fork of: ${original.title}`,
        description: original.description,
        subject: original.subject,
        yearLevel: original.yearLevel,
        duration: original.duration,
        learningIntentions: original.learningIntentions,
        successCriteria: original.successCriteria,
        generalCapabilities: original.generalCapabilities,
        crossCurriculumPriorities: original.crossCurriculumPriorities,
        sections: original.sections as any,
        differentiation: original.differentiation as any,
        resources: original.resources as any,
        assessmentOpportunities: original.assessmentOpportunities as any,
        crossCurricularConnections: original.crossCurricularConnections as any,
        generatedBy: 'manual',
        generationPrompt: `Forked from ${planId}`,
        status: 'draft',
      },
    });

    res.status(201).json({
      success: true,
      data: forked,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fork lesson plan' },
    });
  }
});

const createCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required'),
  type: z.enum(['comment', 'suggestion', 'approval']).default('comment'),
  parentId: z.string().optional(),
});

collaborationRouter.post('/lesson-plans/:planId/comments', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      });
      return;
    }

    const { text, type, parentId } = parsed.data;

    // Verify the lesson plan exists
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!lessonPlan) {
      res.status(404).json({
        success: false,
        error: { message: 'Lesson plan not found' },
      });
      return;
    }

    const comment = await prisma.lessonPlanComment.create({
      data: {
        lessonPlanId: planId,
        userId: req.user!.id,
        text,
        type,
        parentId: parentId || null,
      },
    });

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create comment' },
    });
  }
});

// ============================================================================
// Resource Exchange
// ============================================================================

collaborationRouter.get('/resources', async (req: Request, res: Response) => {
  try {
    const pagination = paginationSchema.safeParse(req.query);
    if (!pagination.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid pagination parameters', details: pagination.error.flatten().fieldErrors },
      });
      return;
    }

    const { page, limit } = pagination.data;
    const skip = (page - 1) * limit;
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {
      tenantId: req.tenantId!,
    };

    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }

    const [resources, total] = await Promise.all([
      prisma.sharedResource.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sharedResource.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        resources,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch resources' },
    });
  }
});

const createResourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(500),
  type: z.enum(['document', 'template', 'worksheet', 'media', 'link']),
  url: z.string().url().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

collaborationRouter.post('/resources', async (req: Request, res: Response) => {
  try {
    const parsed = createResourceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      });
      return;
    }

    const { name, type, url, description, tags, metadata } = parsed.data;

    const resource = await prisma.sharedResource.create({
      data: {
        tenantId: req.tenantId!,
        creatorId: req.user!.id,
        name,
        type,
        url: url || null,
        description: description || null,
        tags,
        metadata: metadata || null,
      },
    });

    res.status(201).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create resource' },
    });
  }
});
