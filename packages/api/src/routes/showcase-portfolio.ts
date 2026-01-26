/**
 * Showcase Portfolio API Routes
 *
 * Terminal phase of Design & Pitch journey. Enables learners to transform
 * their iterative process into professional narratives for external stakeholders.
 *
 * Endpoints:
 * - Portfolio CRUD and publishing
 * - Item curation with reflections
 * - Access control and sharing
 * - Guestbook management
 * - AI assistance (skills, summary, suggestions)
 * - Analytics
 * - Public/External viewer endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ShowcasePortfolioService,
  getShowcasePortfolioService,
  initializeShowcasePortfolioService,
  PublishSettings,
  AddItemInput,
  ReflectionInput,
  AccessLinkConfig,
  GuestbookEntryInput,
  ViewerLocation
} from '../services/showcase-portfolio.service';
import { authMiddleware } from '../middleware/auth';
import { Result, ScholarlyError } from '../services/base.service';
import { Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();

// Helper to extract error message from failed Result
function getErrorMessage<T>(result: Result<T>): string {
  if (result.success === false) {
    return result.error?.message || 'Unknown error';
  }
  return 'Unknown error';
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createShowcaseSchema = z.object({
  journeyId: z.string().uuid(),
  title: z.string().min(1).max(200),
  headline: z.string().max(500).optional(),
  preferredSlug: z.string().min(3).max(100).optional(),
  theme: z.object({
    layout: z.enum(['timeline', 'grid', 'magazine', 'story', 'minimal']).optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    fontFamily: z.string().optional(),
    headerStyle: z.enum(['minimal', 'hero', 'split']).optional(),
    cardStyle: z.enum(['flat', 'elevated', 'bordered', 'glass']).optional(),
    showGrowthTimeline: z.boolean().optional()
  }).optional()
});

const updateShowcaseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  headline: z.string().max(500).optional().nullable(),
  themeConfig: z.object({
    layout: z.enum(['timeline', 'grid', 'magazine', 'story', 'minimal']).optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    fontFamily: z.string().optional(),
    headerStyle: z.enum(['minimal', 'hero', 'split']).optional(),
    cardStyle: z.enum(['flat', 'elevated', 'bordered', 'glass']).optional(),
    showGrowthTimeline: z.boolean().optional()
  }).optional(),
  seoSettings: z.object({
    metaTitle: z.string().max(60).optional(),
    metaDescription: z.string().max(160).optional(),
    ogImage: z.string().url().optional(),
    noIndex: z.boolean().optional(),
    keywords: z.array(z.string()).optional()
  }).optional(),
  guestbookEnabled: z.boolean().optional()
});

const publishSettingsSchema = z.object({
  isPublic: z.boolean(),
  password: z.string().min(6).optional(),
  expiresAt: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  allowedEmails: z.array(z.string().email()).optional(),
  allowIndexing: z.boolean().optional()
});

const addItemSchema = z.object({
  artifactId: z.string().uuid(),
  version: z.number().int().positive().optional(),
  isFeatured: z.boolean().optional(),
  showBeforeAfter: z.boolean().optional(),
  beforeArtifactId: z.string().uuid().optional()
});

const updateReflectionSchema = z.object({
  content: z.string().min(10).max(5000),
  promptUsed: z.string().optional(),
  sentiment: z.enum(['growth', 'challenge', 'insight', 'achievement']).optional(),
  learningOutcomes: z.array(z.string()).optional(),
  peerFeedbackInfluence: z.string().max(1000).optional(),
  keyTakeaways: z.array(z.string()).optional()
});

const reorderItemsSchema = z.object({
  itemOrder: z.array(z.string().uuid())
});

const pitchDeckEmbedSchema = z.object({
  deckId: z.string().uuid(),
  autoPlay: z.boolean().optional(),
  showControls: z.boolean().optional(),
  allowFullscreen: z.boolean().optional(),
  slideTransition: z.enum(['slide', 'fade', 'none']).optional(),
  viewerTheme: z.enum(['light', 'dark', 'auto']).optional()
});

const accessLinkSchema = z.object({
  type: z.enum(['public', 'password', 'email', 'time_limited']),
  password: z.string().min(6).optional(),
  allowedEmails: z.array(z.string().email()).optional(),
  expiresAt: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  maxUses: z.number().int().positive().optional()
});

const updateSlugSchema = z.object({
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/)
});

const guestbookEntrySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  organization: z.string().max(200).optional(),
  role: z.string().max(100).optional(),
  message: z.string().min(10).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
  impressionTags: z.array(z.string()).optional()
});

const moderateEntrySchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional()
});

const seoSettingsSchema = z.object({
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  ogImage: z.string().url().optional(),
  noIndex: z.boolean().optional(),
  canonicalUrl: z.string().url().optional(),
  keywords: z.array(z.string()).optional()
});

const trackViewSchema = z.object({
  source: z.string().optional(),
  referrer: z.string().optional(),
  fingerprint: z.string().optional(),
  userAgent: z.string().optional(),
  itemsViewed: z.array(z.string()).optional(),
  pitchDeckWatched: z.boolean().optional(),
  pitchDeckProgress: z.number().min(0).max(100).optional(),
  duration: z.number().int().positive().optional(),
  location: z.object({
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string(),
    timezone: z.string().optional()
  }).optional()
});

const publicAccessSchema = z.object({
  password: z.string().optional(),
  email: z.string().email().optional()
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getService(): ShowcasePortfolioService {
  const service = getShowcasePortfolioService();
  if (!service) {
    throw new Error('ShowcasePortfolioService not initialized');
  }
  return service;
}

function getTenantId(req: Request): string {
  return (req as any).tenantId || 'default';
}

function getUserId(req: Request): string {
  return (req as any).user?.id || (req as any).userId;
}

// ============================================================================
// PORTFOLIO MANAGEMENT ROUTES
// ============================================================================

/**
 * POST /showcase
 * Create a new showcase portfolio from a Design & Pitch journey
 */
router.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = createShowcaseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();
    const result = await service.createShowcase(
      getTenantId(req),
      getUserId(req),
      validation.data.journeyId,
      {
        title: validation.data.title,
        headline: validation.data.headline,
        preferredSlug: validation.data.preferredSlug,
        theme: validation.data.theme
      }
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /showcase/:portfolioId
 * Get a showcase portfolio by ID
 */
router.get('/:portfolioId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = getService();
    const result = await service.getShowcase(
      getTenantId(req),
      req.params.portfolioId,
      getUserId(req)
    );

    if (!result.success) {
      return res.status(404).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /showcase/:portfolioId
 * Update showcase settings
 */
router.put('/:portfolioId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = updateShowcaseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();
    const result = await service.updateShowcase(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId,
      validation.data
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /showcase/:portfolioId/publish
 * Publish the portfolio
 */
router.post('/:portfolioId/publish', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = publishSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();
    const result = await service.publishShowcase(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId,
      validation.data as PublishSettings
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ITEM CURATION ROUTES
// ============================================================================

/**
 * POST /showcase/:portfolioId/items
 * Add an artifact to the showcase ("Push to Showcase")
 */
router.post('/:portfolioId/items', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = addItemSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();
    const result = await service.addItemToShowcase(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId,
      validation.data as AddItemInput
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /showcase/:portfolioId/items/:itemId/reflection
 * Update the reflection for an item
 */
router.put('/:portfolioId/items/:itemId/reflection', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = updateReflectionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();
    const result = await service.updateItemReflection(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId,
      req.params.itemId,
      validation.data as ReflectionInput
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /showcase/:portfolioId/items/:itemId/reflection-prompt
 * Get AI-generated reflection prompt for an item
 */
router.get('/:portfolioId/items/:itemId/reflection-prompt', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = getService();
    const result = await service.generateReflectionPrompt(
      getTenantId(req),
      req.params.portfolioId,
      req.params.itemId
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /showcase/:portfolioId/items/reorder
 * Reorder items in the showcase
 */
router.put('/:portfolioId/items/reorder', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = reorderItemsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();
    const result = await service.reorderItems(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId,
      validation.data.itemOrder
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /showcase/:portfolioId/items/:itemId
 * Remove an item from the showcase
 */
router.delete('/:portfolioId/items/:itemId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = getService();
    const result = await service.removeItem(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId,
      req.params.itemId
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, message: 'Item removed' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PITCH DECK EMBEDDING ROUTES
// ============================================================================

/**
 * POST /showcase/:portfolioId/pitch-deck
 * Configure pitch deck embed
 */
router.post('/:portfolioId/pitch-deck', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = pitchDeckEmbedSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();
    const result = await service.configurePitchDeckEmbed(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId,
      validation.data.deckId,
      validation.data
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ACCESS CONTROL & SHARING ROUTES
// ============================================================================

/**
 * POST /showcase/:portfolioId/access-links
 * Generate a shareable access link
 */
router.post('/:portfolioId/access-links', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = accessLinkSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();
    const result = await service.generateAccessLink(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId,
      validation.data as AccessLinkConfig
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /showcase/:portfolioId/slug
 * Update custom vanity URL slug
 */
router.put('/:portfolioId/slug', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = updateSlugSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();
    const result = await service.updateCustomSlug(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId,
      validation.data.slug
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GUESTBOOK ROUTES
// ============================================================================

/**
 * GET /showcase/:portfolioId/guestbook
 * Get approved guestbook entries (authenticated - owner view)
 */
router.get('/:portfolioId/guestbook', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = getService();
    const portfolioResult = await service.getShowcase(
      getTenantId(req),
      req.params.portfolioId,
      getUserId(req)
    );

    if (!portfolioResult.success) {
      return res.status(404).json({ success: false, error: getErrorMessage(portfolioResult) });
    }

    // Owner sees all entries
    res.json({ success: true, data: portfolioResult.data!.guestbookEntries });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /showcase/:portfolioId/guestbook/:entryId/moderate
 * Moderate a guestbook entry (approve/reject)
 */
router.put('/:portfolioId/guestbook/:entryId/moderate', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = moderateEntrySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();
    const result = await service.moderateGuestbookEntry(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId,
      req.params.entryId,
      validation.data.action,
      validation.data.reason
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// AI ASSISTANT ROUTES
// ============================================================================

/**
 * POST /showcase/:portfolioId/ai/skill-tags
 * Generate AI skill tags for the portfolio
 */
router.post('/:portfolioId/ai/skill-tags', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = getService();
    const result = await service.generateSkillTags(
      getTenantId(req),
      req.params.portfolioId
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /showcase/:portfolioId/ai/executive-summary
 * Generate AI executive summary
 */
router.post('/:portfolioId/ai/executive-summary', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = getService();
    const result = await service.generateExecutiveSummary(
      getTenantId(req),
      req.params.portfolioId
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /showcase/:portfolioId/ai/curation-suggestions
 * Get AI curation suggestions
 */
router.get('/:portfolioId/ai/curation-suggestions', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = getService();
    const result = await service.getCurationSuggestions(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /showcase/:portfolioId/ai/growth-analysis
 * Get AI growth analysis
 */
router.get('/:portfolioId/ai/growth-analysis', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = getService();
    const result = await service.analyzeGrowth(
      getTenantId(req),
      req.params.portfolioId
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SEO ROUTES
// ============================================================================

/**
 * PUT /showcase/:portfolioId/seo
 * Update SEO settings
 */
router.put('/:portfolioId/seo', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = seoSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();
    const result = await service.updateSEOSettings(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId,
      validation.data
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * GET /showcase/:portfolioId/analytics
 * Get portfolio analytics
 */
router.get('/:portfolioId/analytics', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = getService();
    const result = await service.getAnalytics(
      getTenantId(req),
      getUserId(req),
      req.params.portfolioId
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PUBLIC / EXTERNAL VIEWER ROUTES (No Auth Required)
// ============================================================================

/**
 * GET /showcase/public/:slug
 * Get public portfolio by vanity URL slug
 */
router.get('/public/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = publicAccessSchema.safeParse(req.query);
    const service = getService();

    const result = await service.getShowcaseBySlug(
      req.params.slug,
      undefined,
      validation.success ? validation.data.password : undefined
    );

    if (!result.success) {
      const statusCode = getErrorMessage(result).includes('Password') ? 401 :
                         getErrorMessage(result).includes('not found') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: getErrorMessage(result),
        requiresPassword: getErrorMessage(result).includes('Password')
      });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /showcase/public/:slug/access
 * Validate access with password/email
 */
router.post('/public/:slug/access', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = publicAccessSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();
    const result = await service.getShowcaseBySlug(
      req.params.slug,
      undefined,
      validation.data.password
    );

    if (!result.success) {
      return res.status(401).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /showcase/public/:slug/guestbook
 * Get approved guestbook entries for public view
 */
router.get('/public/:slug/guestbook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = getService();

    // First validate access to portfolio
    const portfolioResult = await service.getShowcaseBySlug(req.params.slug);
    if (!portfolioResult.success) {
      return res.status(404).json({ success: false, error: 'Portfolio not found' });
    }

    const result = await service.getPublicGuestbook(portfolioResult.data!.id);

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /showcase/public/:slug/guestbook
 * Submit a guestbook entry (external viewer)
 */
router.post('/public/:slug/guestbook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = guestbookEntrySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const service = getService();

    // First get portfolio ID from slug
    const portfolioResult = await service.getShowcaseBySlug(req.params.slug);
    if (!portfolioResult.success) {
      return res.status(404).json({ success: false, error: 'Portfolio not found' });
    }

    // Extract viewer context from request
    const viewerContext = {
      location: req.body.location,
      fingerprint: req.headers['x-visitor-id'] as string,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer
    };

    const result = await service.submitGuestbookEntry(
      portfolioResult.data!.id,
      validation.data as GuestbookEntryInput,
      viewerContext
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.status(201).json({
      success: true,
      data: result.data,
      message: 'Your feedback has been submitted and is pending approval.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /showcase/public/:slug/seo
 * Get SEO metadata for public portfolio
 */
router.get('/public/:slug/seo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = getService();

    // Get portfolio ID from slug
    const portfolioResult = await service.getShowcaseBySlug(req.params.slug);
    if (!portfolioResult.success) {
      return res.status(404).json({ success: false, error: 'Portfolio not found' });
    }

    const result = await service.generateSEOMetadata(portfolioResult.data!.id);

    if (!result.success) {
      return res.status(400).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /showcase/public/:slug/track
 * Track a portfolio view (analytics)
 */
router.post('/public/:slug/track', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = trackViewSchema.safeParse(req.body);

    const service = getService();

    // Get portfolio ID from slug
    const portfolioResult = await service.getShowcaseBySlug(req.params.slug);
    if (!portfolioResult.success) {
      // Silent fail for tracking
      return res.status(200).json({ success: true });
    }

    await service.trackView(portfolioResult.data!.id, {
      source: validation.success ? validation.data.source : 'direct',
      referrer: validation.success ? validation.data.referrer : req.headers.referer,
      viewerFingerprint: validation.success ? validation.data.fingerprint : undefined,
      userAgent: req.headers['user-agent'],
      itemsViewed: validation.success ? validation.data.itemsViewed : undefined,
      pitchDeckWatched: validation.success ? validation.data.pitchDeckWatched : undefined,
      pitchDeckProgress: validation.success ? validation.data.pitchDeckProgress : undefined,
      duration: validation.success ? validation.data.duration : undefined,
      location: validation.success ? validation.data.location as ViewerLocation : undefined,
      viewedAt: new Date()
    });

    res.json({ success: true });
  } catch (error) {
    // Silent fail for tracking
    res.json({ success: true });
  }
});

/**
 * POST /showcase/access/validate
 * Validate an access token/link
 */
router.post('/access/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password, email } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const service = getService();
    const result = await service.validateAccessLink(token, password, email);

    if (!result.success) {
      return res.status(401).json({ success: false, error: getErrorMessage(result) });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

export { router as showcasePortfolioRouter };
