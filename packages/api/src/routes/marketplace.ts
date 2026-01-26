/**
 * Marketplace Routes
 *
 * API endpoints for the Developer Marketplace (app store) and
 * Virtual Language Immersion experiences.
 */

import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { log } from '../lib/logger';
import { isFailure } from '../services/base.service';
import { getDeveloperMarketplaceService } from '../services/developer-marketplace.service';
import { getLanguageImmersionService } from '../services/language-immersion.service';

export const marketplaceRouter: Router = Router();
marketplaceRouter.use(authMiddleware);

// ============================================================================
// Helper
// ============================================================================

function errorStatus(code: string): number {
  if (code === 'VALIDATION_ERROR') return 400;
  if (code === 'NOT_FOUND') return 404;
  if (code === 'AUTHORIZATION_ERROR') return 403;
  return 500;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const registerDeveloperSchema = z.object({
  name: z.string().min(2).max(100),
  displayName: z.string().min(2).max(100),
  description: z.string().min(10).max(2000),
  accountType: z.enum(['INDIVIDUAL', 'COMPANY', 'EDUCATIONAL_INSTITUTION', 'NON_PROFIT', 'STRATEGIC_PARTNER']),
  supportEmail: z.string().email(),
  websiteUrl: z.string().url().optional(),
});

const createAppSchema = z.object({
  name: z.string().min(2).max(100),
  tagline: z.string().min(5).max(200),
  description: z.string().min(20).max(10000),
  category: z.enum([
    'LANGUAGE_LEARNING', 'MATH_SCIENCE', 'LITERACY_READING', 'ARTS_CREATIVITY',
    'STEM', 'SOCIAL_STUDIES', 'TEST_PREP', 'VR_EXPERIENCES', 'AR_EXPERIENCES',
    'SIMULATIONS', 'VIRTUAL_FIELD_TRIPS', 'CLASSROOM_MANAGEMENT', 'ASSESSMENT_TOOLS',
    'LESSON_PLANNING', 'PARENT_COMMUNICATION', 'SCHEDULING', 'REPORTING_ANALYTICS',
    'COMPLIANCE', 'PEER_LEARNING', 'TUTORING', 'STUDY_GROUPS', 'ACCESSIBILITY_TOOLS',
    'TRANSLATION', 'UTILITIES', 'INTEGRATIONS', 'OTHER'
  ]),
  appType: z.enum([
    'WEB_APP', 'NATIVE_INTEGRATION', 'LTI_TOOL', 'API_SERVICE',
    'CONTENT_PACK', 'IMMERSIVE_EXPERIENCE', 'WIDGET', 'THEME', 'BOT'
  ]),
  iconUrl: z.string().url(),
  screenshotUrls: z.array(z.string().url()).min(1).max(10),
  pricingModel: z.object({
    type: z.enum(['free', 'paid', 'freemium', 'subscription', 'pay_per_use']),
    oneTimePrice: z.string().optional(),
    subscriptionRequired: z.boolean().optional(),
    usageUnit: z.string().optional(),
    pricePerUnit: z.string().optional(),
  }),
});

const searchAppsSchema = z.object({
  query: z.string().max(200).optional(),
  category: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

const installAppSchema = z.object({
  installScope: z.enum(['user', 'classroom', 'school', 'district']),
  scopeId: z.string().min(1),
  grantedPermissions: z.array(z.string()),
});

const submitReviewSchema = z.object({
  reviewerName: z.string().min(1).max(100),
  reviewerRole: z.enum(['learner', 'educator', 'parent', 'administrator']),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(5000),
});

const createRequestSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(10000),
  category: z.enum([
    'LANGUAGE_LEARNING', 'MATH_SCIENCE', 'LITERACY_READING', 'ARTS_CREATIVITY',
    'STEM', 'SOCIAL_STUDIES', 'TEST_PREP', 'VR_EXPERIENCES', 'AR_EXPERIENCES',
    'SIMULATIONS', 'VIRTUAL_FIELD_TRIPS', 'CLASSROOM_MANAGEMENT', 'ASSESSMENT_TOOLS',
    'LESSON_PLANNING', 'PARENT_COMMUNICATION', 'SCHEDULING', 'REPORTING_ANALYTICS',
    'COMPLIANCE', 'PEER_LEARNING', 'TUTORING', 'STUDY_GROUPS', 'ACCESSIBILITY_TOOLS',
    'TRANSLATION', 'UTILITIES', 'INTEGRATIONS', 'OTHER'
  ]),
  requirements: z.array(z.object({
    id: z.string(),
    description: z.string(),
    priority: z.enum(['must_have', 'should_have', 'nice_to_have']),
    category: z.enum(['functional', 'technical', 'design', 'accessibility', 'performance']),
  })),
  targetAudience: z.object({
    roles: z.array(z.enum(['learner', 'educator', 'parent', 'administrator', 'tutor'])),
    educationLevels: z.array(z.enum(['early_years', 'primary', 'secondary', 'higher_ed', 'professional', 'lifelong'])),
    contexts: z.array(z.enum(['homeschool', 'traditional_school', 'micro_school', 'tutoring', 'self_directed'])),
  }),
  fundingGoal: z.string().min(1),
  fundingDeadline: z.string().datetime().optional(),
});

const pledgeSchema = z.object({
  amount: z.string().min(1),
});

const claimBountySchema = z.object({
  developerId: z.string().min(1),
  developerName: z.string().min(1),
  proposal: z.string().min(20).max(10000),
  estimatedDeliveryDate: z.string().datetime(),
  proposedMilestones: z.array(z.object({
    title: z.string(),
    description: z.string(),
    deliverables: z.array(z.string()),
    dueDate: z.string().datetime(),
    paymentPercent: z.number().min(0).max(100),
  })),
  relevantExperience: z.string(),
  portfolioLinks: z.array(z.string().url()),
});

const browseImmersionSchema = z.object({
  language: z.string().optional(),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  category: z.string().optional(),
  tier: z.enum(['TIER_2D', 'TIER_3D', 'TIER_AR', 'TIER_VR', 'TIER_MR']).optional(),
  query: z.string().max(200).optional(),
  limit: z.number().min(1).max(100).optional(),
});

const startSessionSchema = z.object({
  scenarioId: z.string().min(1),
  tier: z.enum(['TIER_2D', 'TIER_3D', 'TIER_AR', 'TIER_VR', 'TIER_MR']),
  deviceCapabilities: z.object({
    hasWebGL: z.boolean().optional(),
    hasWebGL2: z.boolean().optional(),
    hasWebGPU: z.boolean().optional(),
    hasWebXR: z.boolean().optional(),
    xrSessionModes: z.array(z.string()).optional(),
    hasSpeechRecognition: z.boolean().optional(),
    hasSpeechSynthesis: z.boolean().optional(),
    supportedVoices: z.array(z.string()).optional(),
    hasGamepad: z.boolean().optional(),
    hasTouchscreen: z.boolean().optional(),
    hasGyroscope: z.boolean().optional(),
    estimatedPerformanceTier: z.enum(['low', 'medium', 'high', 'ultra']).optional(),
  }),
});

const processSpeechSchema = z.object({
  audioData: z.string().min(1),
  expectedText: z.string().optional(),
});

// ============================================================================
// Developer Marketplace Routes
// ============================================================================

/**
 * POST /marketplace/developers
 * Register as a developer
 */
marketplaceRouter.post('/developers', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = registerDeveloperSchema.parse(req.body);

    const service = getDeveloperMarketplaceService();
    const result = await service.registerDeveloper(tenantId, {
      userId,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      accountType: data.accountType as any,
      supportEmail: data.supportEmail,
      websiteUrl: data.websiteUrl,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Developer registered', { tenantId, userId, developerId: result.data.id });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /marketplace/apps
 * Create a new app listing
 */
marketplaceRouter.post('/apps', async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = createAppSchema.parse(req.body);

    const service = getDeveloperMarketplaceService();
    const result = await service.createApp(tenantId, {
      developerId: req.body.developerId,
      name: data.name,
      tagline: data.tagline,
      description: data.description,
      category: data.category as any,
      appType: data.appType as any,
      iconUrl: data.iconUrl,
      screenshotUrls: data.screenshotUrls,
      pricingModel: {
        type: data.pricingModel.type,
        oneTimePrice: data.pricingModel.oneTimePrice ? BigInt(data.pricingModel.oneTimePrice) : undefined,
        subscriptionRequired: data.pricingModel.subscriptionRequired,
        usageUnit: data.pricingModel.usageUnit,
        pricePerUnit: data.pricingModel.pricePerUnit ? BigInt(data.pricingModel.pricePerUnit) : undefined,
      } as any,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('App created', { tenantId, appId: result.data.id, name: data.name });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /marketplace/apps
 * Search and browse apps
 */
marketplaceRouter.get('/apps', async (req, res) => {
  const tenantId = req.user!.tenantId;

  const query = req.query.query as string | undefined;
  const category = req.query.category as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const service = getDeveloperMarketplaceService();
  const result = await service.searchApps(tenantId, {
    query,
    category: category as any,
    limit,
    offset,
  });

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.json({ success: true, data: result.data });
});

/**
 * POST /marketplace/apps/:id/install
 * Install an app
 */
marketplaceRouter.post('/apps/:id/install', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const appId = req.params.id;

  try {
    const data = installAppSchema.parse(req.body);

    const service = getDeveloperMarketplaceService();
    const result = await service.installApp(tenantId, {
      appId,
      userId,
      installScope: data.installScope,
      scopeId: data.scopeId,
      grantedPermissions: data.grantedPermissions,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('App installed', { tenantId, userId, appId });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /marketplace/apps/:id/reviews
 * Submit a review for an app
 */
marketplaceRouter.post('/apps/:id/reviews', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const appId = req.params.id;

  try {
    const data = submitReviewSchema.parse(req.body);

    const service = getDeveloperMarketplaceService();
    const result = await service.submitAppReview(tenantId, {
      appId,
      reviewerId: userId,
      reviewerName: data.reviewerName,
      reviewerRole: data.reviewerRole,
      rating: data.rating as 1 | 2 | 3 | 4 | 5,
      title: data.title,
      content: data.content,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('App review submitted', { tenantId, userId, appId, rating: data.rating });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

// ============================================================================
// Community Request & Bounty Routes
// ============================================================================

/**
 * POST /marketplace/community-requests
 * Create a community request for a new app/feature
 */
marketplaceRouter.post('/community-requests', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = createRequestSchema.parse(req.body);

    const service = getDeveloperMarketplaceService();
    const result = await service.createCommunityRequest(tenantId, {
      requesterId: userId,
      requesterName: req.body.requesterName || 'Anonymous',
      title: data.title,
      description: data.description,
      category: data.category as any,
      requirements: data.requirements as any,
      targetAudience: data.targetAudience as any,
      fundingGoal: BigInt(data.fundingGoal),
      fundingDeadline: data.fundingDeadline ? new Date(data.fundingDeadline) : undefined,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Community request created', { tenantId, userId, requestId: result.data.id });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /marketplace/community-requests/:id/pledge
 * Pledge funding to a community request
 */
marketplaceRouter.post('/community-requests/:id/pledge', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const requestId = req.params.id;

  try {
    const data = pledgeSchema.parse(req.body);

    const service = getDeveloperMarketplaceService();
    const result = await service.pledgeToRequest(tenantId, {
      requestId,
      pledgerId: userId,
      pledgerName: req.body.pledgerName || 'Anonymous',
      amount: BigInt(data.amount),
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Pledge created', { tenantId, userId, requestId, amount: data.amount });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /marketplace/bounties/:id/claim
 * Claim a bounty (developer submits proposal to build)
 */
marketplaceRouter.post('/bounties/:id/claim', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const requestId = req.params.id;

  try {
    const data = claimBountySchema.parse(req.body);

    const service = getDeveloperMarketplaceService();
    const result = await service.claimBounty(tenantId, {
      requestId,
      developerId: data.developerId,
      developerName: data.developerName,
      proposal: data.proposal,
      estimatedDeliveryDate: new Date(data.estimatedDeliveryDate),
      proposedMilestones: data.proposedMilestones.map(m => ({
        ...m,
        dueDate: new Date(m.dueDate),
      })) as any,
      relevantExperience: data.relevantExperience,
      portfolioLinks: data.portfolioLinks,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Bounty claimed', { tenantId, requestId, developerId: data.developerId });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

// ============================================================================
// Language Immersion Routes
// ============================================================================

/**
 * GET /marketplace/immersion/scenarios
 * Browse available immersion scenarios
 */
marketplaceRouter.get('/immersion/scenarios', async (req, res) => {
  const tenantId = req.user!.tenantId;

  const language = req.query.language as string | undefined;
  const level = req.query.level as string | undefined;
  const category = req.query.category as string | undefined;
  const tier = req.query.tier as string | undefined;
  const query = req.query.query as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const service = getLanguageImmersionService();
  const result = await service.browseScenarios(tenantId, {
    language: language as any,
    level: level as any,
    category: category as any,
    tier: tier as any,
    query,
    limit,
  });

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.json({ success: true, data: result.data });
});

/**
 * POST /marketplace/immersion/sessions
 * Start a new immersion session
 */
marketplaceRouter.post('/immersion/sessions', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = startSessionSchema.parse(req.body);

    const service = getLanguageImmersionService();
    const result = await service.startSession(tenantId, {
      learnerId: userId,
      scenarioId: data.scenarioId,
      tier: data.tier as any,
      deviceCapabilities: data.deviceCapabilities as any,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Immersion session started', { tenantId, userId, scenarioId: data.scenarioId, tier: data.tier });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /marketplace/immersion/sessions/:id/speech
 * Process learner speech input
 */
marketplaceRouter.post('/immersion/sessions/:id/speech', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const sessionId = req.params.id;

  try {
    const data = processSpeechSchema.parse(req.body);

    // Decode base64 audio data
    const audioBuffer = Buffer.from(data.audioData, 'base64');

    const service = getLanguageImmersionService();
    const result = await service.processLearnerSpeech(tenantId, {
      sessionId,
      audioData: audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength),
      expectedText: data.expectedText,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Speech processed', { tenantId, sessionId });

    res.json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /marketplace/immersion/sessions/:id/complete
 * Complete an immersion session and get results
 */
marketplaceRouter.post('/immersion/sessions/:id/complete', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const sessionId = req.params.id;

  const service = getLanguageImmersionService();
  const result = await service.completeSession(tenantId, sessionId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  log.info('Immersion session completed', { tenantId, sessionId });

  res.json({ success: true, data: result.data });
});

/**
 * GET /marketplace/immersion/progress
 * Get learner's language immersion progress
 */
marketplaceRouter.get('/immersion/progress', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const language = req.query.language as string;

  if (!language) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'language query parameter is required' } });
  }

  const service = getLanguageImmersionService();
  const result = await service.getLearnerProgress(tenantId, userId, language as any);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.json({ success: true, data: result.data });
});
