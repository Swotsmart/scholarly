/**
 * Storybook Engine Routes
 *
 * API endpoints for the AI-powered storybook creation, generation,
 * review pipeline, marketplace economics, and seed library.
 * Sprints: 2, 3, 4, 5, 7, 8, 9, 12, 16, 17
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { authMiddleware } from '../middleware/auth';

export const storybookRouter: Router = Router();
storybookRouter.use(authMiddleware);

// ============================================================================
// Zod Schemas
// ============================================================================

const generateStorySchema = z.object({
  title: z.string().min(1).max(200),
  phase: z.number().int().min(1).max(6),
  targetGPCs: z.array(z.string()).optional(),
  theme: z.string().optional(),
  pageCount: z.number().int().min(4).max(32).optional(),
  ageRange: z.object({ min: z.number(), max: z.number() }).optional(),
  language: z.string().default('en-AU'),
  artStyle: z.string().optional(),
});

const illustrateSchema = z.object({
  storyId: z.string(),
  artStyle: z.string().default('watercolour'),
  characterConsistency: z.boolean().default(true),
});

const narrateSchema = z.object({
  storyId: z.string(),
  voiceId: z.string().optional(),
  speed: z.number().min(0.5).max(2.0).default(1.0),
});

const reviewSubmitSchema = z.object({
  contentId: z.string().min(1),
});

const peerReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  topicsWellCovered: z.array(z.string()).optional(),
  topicsNeedMoreWork: z.array(z.string()).optional(),
  wouldRecommend: z.boolean().optional(),
});

const createBountySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.string().min(1),
  rewardTokens: z.number().int().positive(),
  rewardCurrency: z.number().positive().optional(),
  requirements: z.record(z.unknown()).optional(),
  rubric: z.record(z.unknown()).optional(),
  eligibleTiers: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  submissionDeadline: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date > new Date();
  }, { message: 'submissionDeadline must be a valid future date' }),
});

const moderationDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Default supported languages (reference data fallback)
const DEFAULT_LANGUAGES = [
  { code: 'en-AU', name: 'English (Australia)', phonicsPhases: 6 },
  { code: 'en-GB', name: 'English (UK)', phonicsPhases: 6 },
  { code: 'en-US', name: 'English (US)', phonicsPhases: 6 },
  { code: 'es-ES', name: 'Spanish (Spain)', phonicsPhases: 4 },
  { code: 'fr-FR', name: 'French (France)', phonicsPhases: 4 },
];

// ============================================================================
// Narrative Generation
// ============================================================================

/**
 * POST /generate
 * Create a story generation job.
 */
storybookRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const params = generateStorySchema.parse(req.body);

    const job = await prisma.storyGenerationJob.create({
      data: {
        tenantId: req.user!.tenantId,
        userId: req.user!.id,
        jobType: 'story',
        status: 'pending',
        progress: 0,
        config: params as any,
      },
    });

    res.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        jobType: job.jobType,
        progress: job.progress,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    console.error('POST /generate error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /generate/:storyId/status
 * Check the status of a story generation job.
 */
storybookRouter.get('/generate/:storyId/status', async (req: Request, res: Response) => {
  try {
    const job = await prisma.storyGenerationJob.findUnique({
      where: { id: req.params.storyId },
    });

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Story generation job not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        jobType: job.jobType,
        resultContentId: job.resultContentId,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (error) {
    console.error('GET /generate/:storyId/status error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Illustration Pipeline
// ============================================================================

/**
 * POST /illustrate
 * Create an illustration generation job.
 */
storybookRouter.post('/illustrate', async (req: Request, res: Response) => {
  try {
    const params = illustrateSchema.parse(req.body);

    const job = await prisma.storyGenerationJob.create({
      data: {
        tenantId: req.user!.tenantId,
        userId: req.user!.id,
        jobType: 'illustration',
        status: 'pending',
        progress: 0,
        config: params as any,
      },
    });

    res.json({
      success: true,
      data: {
        id: job.id,
        jobType: job.jobType,
        status: job.status,
        config: job.config,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    console.error('POST /illustrate error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Audio Narration
// ============================================================================

/**
 * POST /narrate
 * Create a narration generation job.
 */
storybookRouter.post('/narrate', async (req: Request, res: Response) => {
  try {
    const params = narrateSchema.parse(req.body);

    const job = await prisma.storyGenerationJob.create({
      data: {
        tenantId: req.user!.tenantId,
        userId: req.user!.id,
        jobType: 'narration',
        status: 'pending',
        progress: 0,
        config: params as any,
      },
    });

    res.json({
      success: true,
      data: {
        id: job.id,
        jobType: job.jobType,
        status: job.status,
        config: job.config,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    console.error('POST /narrate error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Library Search & Browse
// ============================================================================

/**
 * GET /library/recommendations
 * Get recommended stories based on quality score.
 * IMPORTANT: Registered BEFORE /library/:storyId to avoid route conflict.
 */
storybookRouter.get('/library/recommendations', async (req: Request, res: Response) => {
  try {
    const recommendations = await prisma.content.findMany({
      where: {
        tenantId: req.user!.tenantId,
        type: 'story',
        status: 'published',
        deletedAt: null,
      },
      orderBy: { qualityScore: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        qualityScore: true,
        averageRating: true,
        reviewCount: true,
        tags: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        recommendations,
        algorithm: 'quality-score-ranked',
      },
    });
  } catch (error) {
    console.error('GET /library/recommendations error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /library
 * Browse and search published stories with filters and pagination.
 */
storybookRouter.get('/library', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const { phase, theme, language, search } = req.query;

    const where: any = {
      tenantId: req.user!.tenantId,
      type: 'story',
      status: 'published',
      deletedAt: null,
    };

    // Filter by tags for phase, theme, language
    const tagFilters: string[] = [];
    if (phase && typeof phase === 'string') {
      tagFilters.push(phase);
    }
    if (theme && typeof theme === 'string') {
      tagFilters.push(theme);
    }
    if (language && typeof language === 'string') {
      tagFilters.push(language);
    }
    if (tagFilters.length > 0) {
      where.tags = { hasEvery: tagFilters };
    }

    // Search by title
    if (search && typeof search === 'string') {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          qualityScore: true,
          averageRating: true,
          reviewCount: true,
          downloadCount: true,
          tags: true,
          publishedAt: true,
          createdAt: true,
          creator: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.content.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        filters: { phase, theme, language, search },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    console.error('GET /library error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /library/:storyId
 * Get a single story with reviews and creator info.
 */
storybookRouter.get('/library/:storyId', async (req: Request, res: Response) => {
  try {
    const story = await prisma.content.findUnique({
      where: { id: req.params.storyId },
      include: {
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!story) {
      res.status(404).json({
        success: false,
        error: 'Story not found',
      });
      return;
    }

    res.json({
      success: true,
      data: story,
    });
  } catch (error) {
    console.error('GET /library/:storyId error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Review Pipeline (5-stage)
// ============================================================================

/**
 * POST /review/submit
 * Submit content for review. Creates a ContentReview at the AUTOMATED_VALIDATION stage.
 */
storybookRouter.post('/review/submit', async (req: Request, res: Response) => {
  try {
    const { contentId } = reviewSubmitSchema.parse(req.body);

    // Verify the content exists
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      res.status(404).json({
        success: false,
        error: 'Content not found',
      });
      return;
    }

    const review = await prisma.contentReview.create({
      data: {
        contentId,
        reviewerId: req.user!.id,
        rating: 0, // Will be set during actual review
        title: 'AUTOMATED_VALIDATION', // Using title to track stage
        comment: null,
      },
    });

    res.json({
      success: true,
      data: {
        reviewId: review.id,
        contentId: review.contentId,
        stage: 'AUTOMATED_VALIDATION',
        status: 'in_progress',
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    console.error('POST /review/submit error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /review/:reviewId
 * Get the status of a content review.
 */
storybookRouter.get('/review/:reviewId', async (req: Request, res: Response) => {
  try {
    const review = await prisma.contentReview.findUnique({
      where: { id: req.params.reviewId },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!review) {
      res.status(404).json({
        success: false,
        error: 'Review not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: review.id,
        contentId: review.contentId,
        reviewerId: review.reviewerId,
        rating: review.rating,
        stage: review.title, // Stage stored in title field
        comment: review.comment,
        topicsWellCovered: review.topicsWellCovered,
        topicsNeedMoreWork: review.topicsNeedMoreWork,
        wouldRecommend: review.wouldRecommend,
        verified: review.verified,
        content: review.content,
        reviewer: review.reviewer,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      },
    });
  } catch (error) {
    console.error('GET /review/:reviewId error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /review/:reviewId/peer-review
 * Submit peer review data for an existing review.
 */
storybookRouter.post('/review/:reviewId/peer-review', async (req: Request, res: Response) => {
  try {
    const peerData = peerReviewSchema.parse(req.body);

    // Verify the review exists
    const existing = await prisma.contentReview.findUnique({
      where: { id: req.params.reviewId },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Review not found',
      });
      return;
    }

    const updated = await prisma.contentReview.update({
      where: { id: req.params.reviewId },
      data: {
        rating: peerData.rating,
        comment: peerData.comment ?? existing.comment,
        title: 'PEER_REVIEW', // Update stage to PEER_REVIEW
        topicsWellCovered: peerData.topicsWellCovered ?? existing.topicsWellCovered,
        topicsNeedMoreWork: peerData.topicsNeedMoreWork ?? existing.topicsNeedMoreWork,
        wouldRecommend: peerData.wouldRecommend ?? existing.wouldRecommend,
      },
    });

    res.json({
      success: true,
      data: {
        reviewId: updated.id,
        stage: 'PEER_REVIEW',
        rating: updated.rating,
        comment: updated.comment,
        topicsWellCovered: updated.topicsWellCovered,
        topicsNeedMoreWork: updated.topicsNeedMoreWork,
        wouldRecommend: updated.wouldRecommend,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    console.error('POST /review/:reviewId/peer-review error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Seed Library
// ============================================================================

/**
 * GET /seed-library
 * Retrieve all seed library stories, grouped by phase and series tags.
 */
storybookRouter.get('/seed-library', async (req: Request, res: Response) => {
  try {
    const items = await prisma.content.findMany({
      where: {
        tenantId: req.user!.tenantId,
        type: 'story',
        tags: { has: 'seed-library' },
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        tags: true,
        qualityScore: true,
        averageRating: true,
        createdAt: true,
      },
    });

    // Group by phase and series tags
    const phases: Record<string, typeof items> = {};
    const seriesSet = new Set<string>();

    for (const item of items) {
      // Extract phase tags (e.g. "phase-2", "phase-3")
      const phaseTag = item.tags.find((t) => t.startsWith('phase-'));
      const phase = phaseTag || 'unassigned';
      if (!phases[phase]) phases[phase] = [];
      phases[phase].push(item);

      // Extract series tags (e.g. "series:Finn the Fox Adventures")
      const seriesTag = item.tags.find((t) => t.startsWith('series:'));
      if (seriesTag) {
        seriesSet.add(seriesTag.replace('series:', ''));
      }
    }

    res.json({
      success: true,
      data: {
        totalBooks: items.length,
        phases,
        series: Array.from(seriesSet),
        items,
      },
    });
  } catch (error) {
    console.error('GET /seed-library error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /seed-library/generate
 * Create a seed library generation job.
 */
storybookRouter.post('/seed-library/generate', async (req: Request, res: Response) => {
  try {
    const job = await prisma.storyGenerationJob.create({
      data: {
        tenantId: req.user!.tenantId,
        userId: req.user!.id,
        jobType: 'seed-generation',
        status: 'pending',
        progress: 0,
        config: req.body ?? {},
      },
    });

    res.json({
      success: true,
      data: {
        id: job.id,
        jobType: job.jobType,
        status: job.status,
        config: job.config,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    console.error('POST /seed-library/generate error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Marketplace Economics
// ============================================================================

/**
 * GET /marketplace/creators
 * List creator profiles with pagination, ordered by total earnings.
 */
storybookRouter.get('/marketplace/creators', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const [creators, total] = await Promise.all([
      prisma.creatorProfile.findMany({
        skip,
        take: limit,
        orderBy: { totalEarnings: 'desc' },
        select: {
          id: true,
          userId: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          tier: true,
          totalContent: true,
          totalSales: true,
          totalDownloads: true,
          averageRating: true,
          totalReviews: true,
          totalEarnings: true,
          totalPublished: true,
          level: true,
          badges: true,
          subjects: true,
          yearLevels: true,
          isVerifiedEducator: true,
          createdAt: true,
        },
      }),
      prisma.creatorProfile.count(),
    ]);

    res.json({
      success: true,
      data: {
        creators,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    console.error('GET /marketplace/creators error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /marketplace/creators/:creatorId
 * Get a single creator profile with their content count.
 */
storybookRouter.get('/marketplace/creators/:creatorId', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.creatorProfile.findUnique({
      where: { id: req.params.creatorId },
      select: {
        id: true,
        userId: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        websiteUrl: true,
        tier: true,
        level: true,
        badges: true,
        totalContent: true,
        totalSales: true,
        totalDownloads: true,
        averageRating: true,
        totalReviews: true,
        totalEarnings: true,
        totalPublished: true,
        totalDrafts: true,
        avgEngagement: true,
        subjects: true,
        yearLevels: true,
        specialisations: true,
        isVerifiedEducator: true,
        verificationStatus: true,
        featuredSince: true,
        createdAt: true,
      },
    });

    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Creator profile not found',
      });
      return;
    }

    // Count actual published content for this creator
    const publishedContentCount = await prisma.content.count({
      where: {
        creatorId: profile.userId,
        status: 'published',
        deletedAt: null,
      },
    });

    res.json({
      success: true,
      data: {
        ...profile,
        publishedContentCount,
      },
    });
  } catch (error) {
    console.error('GET /marketplace/creators/:creatorId error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /marketplace/bounties
 * List content bounties with pagination and submission counts.
 */
storybookRouter.get('/marketplace/bounties', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const [bounties, total] = await Promise.all([
      prisma.contentBounty.findMany({
        where: {
          tenantId: req.user!.tenantId,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { submissions: true },
          },
          creator: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.contentBounty.count({
        where: { tenantId: req.user!.tenantId },
      }),
    ]);

    res.json({
      success: true,
      data: {
        bounties,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    console.error('GET /marketplace/bounties error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /marketplace/bounties
 * Create a new content bounty.
 */
storybookRouter.post('/marketplace/bounties', async (req: Request, res: Response) => {
  try {
    const params = createBountySchema.parse(req.body);

    const bounty = await prisma.contentBounty.create({
      data: {
        tenantId: req.user!.tenantId,
        creatorId: req.user!.id,
        title: params.title,
        description: params.description,
        category: params.category,
        status: 'OPEN',
        reward: {
          tokens: params.rewardTokens,
          currency: params.rewardCurrency ?? null,
        },
        requirements: params.requirements ?? {},
        eligibleTiers: params.eligibleTiers ?? [],
        tags: params.tags ?? [],
        submissionDeadline: new Date(params.submissionDeadline),
      },
    });

    res.status(201).json({
      success: true,
      data: bounty,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    console.error('POST /marketplace/bounties error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Content Moderation Queue
// ============================================================================

/**
 * GET /moderation/next
 * Get the next content item pending moderation.
 */
storybookRouter.get('/moderation/next', async (req: Request, res: Response) => {
  try {
    const item = await prisma.content.findFirst({
      where: {
        tenantId: req.user!.tenantId,
        status: { in: ['pending_review', 'pending_moderation'] },
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        thumbnailUrl: true,
        status: true,
        tags: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!item) {
      res.json({
        success: true,
        data: null,
        message: 'No items pending moderation',
      });
      return;
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('GET /moderation/next error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /moderation/:itemId/review
 * Approve or reject a content item.
 */
storybookRouter.post('/moderation/:itemId/review', async (req: Request, res: Response) => {
  try {
    const { decision, reason } = moderationDecisionSchema.parse(req.body);

    // Verify the content exists
    const content = await prisma.content.findUnique({
      where: { id: req.params.itemId },
    });

    if (!content) {
      res.status(404).json({
        success: false,
        error: 'Content not found',
      });
      return;
    }

    const newStatus = decision === 'approve' ? 'published' : 'rejected';

    // Update content status and create audit log in a transaction
    const [updatedContent, auditLog] = await prisma.$transaction([
      prisma.content.update({
        where: { id: req.params.itemId },
        data: {
          status: newStatus,
          publishedAt: decision === 'approve' ? new Date() : undefined,
        },
      }),
      prisma.auditLog.create({
        data: {
          tenantId: req.user!.tenantId,
          userId: req.user!.id,
          userEmail: req.user!.email,
          userRole: req.user!.roles[0] ?? null,
          action: `moderation_${decision}`,
          entityType: 'Content',
          entityId: req.params.itemId,
          changes: {
            before: { status: content.status },
            after: { status: newStatus },
          },
          metadata: { reason: reason ?? null },
          ipAddress: req.ip ?? null,
          userAgent: req.get('user-agent') ?? null,
          sensitivity: 'normal',
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        itemId: updatedContent.id,
        decision,
        previousStatus: content.status,
        newStatus: updatedContent.status,
        publishedAt: updatedContent.publishedAt,
        auditLogId: auditLog.id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    console.error('POST /moderation/:itemId/review error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /moderation/metrics
 * Get content moderation metrics grouped by status.
 */
storybookRouter.get('/moderation/metrics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const [pendingReview, pendingModeration, published, rejected] = await Promise.all([
      prisma.content.count({
        where: { tenantId, status: 'pending_review', deletedAt: null },
      }),
      prisma.content.count({
        where: { tenantId, status: 'pending_moderation', deletedAt: null },
      }),
      prisma.content.count({
        where: { tenantId, status: 'published', deletedAt: null },
      }),
      prisma.content.count({
        where: { tenantId, status: 'rejected', deletedAt: null },
      }),
    ]);

    res.json({
      success: true,
      data: {
        pending: pendingReview + pendingModeration,
        pendingReview,
        pendingModeration,
        published,
        rejected,
      },
    });
  } catch (error) {
    console.error('GET /moderation/metrics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Multilingual Support
// ============================================================================

/**
 * GET /languages
 * Get supported languages. Queries distinct language tags from published stories,
 * falls back to default reference data if none found.
 */
storybookRouter.get('/languages', async (req: Request, res: Response) => {
  try {
    // Query published stories to find distinct language tags
    const stories = await prisma.content.findMany({
      where: {
        type: 'story',
        status: 'published',
        deletedAt: null,
      },
      select: {
        tags: true,
      },
    });

    // Extract language tags (tags starting with "lang:")
    const languageSet = new Set<string>();
    for (const story of stories) {
      for (const tag of story.tags) {
        if (tag.startsWith('lang:')) {
          languageSet.add(tag.replace('lang:', ''));
        }
      }
    }

    if (languageSet.size === 0) {
      // Return default supported languages as reference data
      res.json({
        success: true,
        data: {
          supported: DEFAULT_LANGUAGES,
          source: 'default',
        },
      });
      return;
    }

    // Map language codes to full language info
    const languageMap: Record<string, { code: string; name: string; phonicsPhases: number }> = {};
    for (const lang of DEFAULT_LANGUAGES) {
      languageMap[lang.code] = lang;
    }

    const supported = Array.from(languageSet).map((code) => {
      if (languageMap[code]) {
        return languageMap[code];
      }
      return { code, name: code, phonicsPhases: 0 };
    });

    res.json({
      success: true,
      data: {
        supported,
        source: 'database',
      },
    });
  } catch (error) {
    console.error('GET /languages error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
