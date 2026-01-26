/**
 * Scholarly Platform - LinguaFlow Routes
 * 
 * API routes for the LinguaFlow language learning module:
 * - Profile management
 * - Vocabulary learning with SM-2 spaced repetition
 * - AI conversation practice
 * - Heritage speaker pathways
 * - IB curriculum alignment
 * - Offline learning support
 * 
 * @module @scholarly/api/routes/linguaflow
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { linguaFlowService } from '@scholarly/linguaflow';
import {
  createLanguageProfileSchema,
  updateCefrLevelSchema,
  createHeritagePathwaySchema,
  addVocabularySchema,
  reviewVocabularySchema,
  startConversationSchema,
  addConversationMessageSchema,
  endConversationSchema,
  createOfflinePackageSchema,
  syncOfflineProgressSchema,
  alignIbCriteriaSchema,
  idSchema,
  paginationSchema,
} from '@scholarly/validation';

import {
  validateBody,
  validateParams,
  validateQuery,
  asyncHandler,
  sendSuccess,
  sendCreated,
  sendNoContent,
  AuthenticatedRequest,
} from '../middleware/index.js';

// =============================================================================
// ROUTER
// =============================================================================

export const linguaFlowRouter = Router();

// =============================================================================
// PARAMETER SCHEMAS
// =============================================================================

const profileIdParamSchema = z.object({
  profileId: idSchema,
});

const conversationIdParamSchema = z.object({
  conversationId: idSchema,
});

const limitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// =============================================================================
// PROFILE ROUTES
// =============================================================================

/**
 * POST /api/v1/linguaflow/profiles
 * 
 * Create a new language learning profile
 */
linguaFlowRouter.post(
  '/profiles',
  validateBody(createLanguageProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId, userId } = authReq.context;
    
    const result = await linguaFlowService.createProfile(tenantId, userId!, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendCreated(res, result.data);
  })
);

/**
 * GET /api/v1/linguaflow/profiles/:profileId
 * 
 * Get profile dashboard with comprehensive stats
 */
linguaFlowRouter.get(
  '/profiles/:profileId',
  validateParams(profileIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { profileId } = req.params;
    
    const result = await linguaFlowService.getProfileDashboard(tenantId, profileId);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

/**
 * PUT /api/v1/linguaflow/profiles/:profileId/cefr
 * 
 * Update a specific CEFR skill level
 */
linguaFlowRouter.put(
  '/profiles/:profileId/cefr',
  validateParams(profileIdParamSchema),
  validateBody(updateCefrLevelSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { profileId } = req.params;
    
    const result = await linguaFlowService.updateCefrLevel(tenantId, profileId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

// =============================================================================
// HERITAGE SPEAKER ROUTES
// =============================================================================

/**
 * POST /api/v1/linguaflow/profiles/:profileId/heritage-pathway
 * 
 * Create heritage speaker pathway assessment
 */
linguaFlowRouter.post(
  '/profiles/:profileId/heritage-pathway',
  validateParams(profileIdParamSchema),
  validateBody(createHeritagePathwaySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { profileId } = req.params;
    
    const result = await linguaFlowService.createHeritagePathway(tenantId, profileId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendCreated(res, result.data);
  })
);

// =============================================================================
// VOCABULARY ROUTES
// =============================================================================

/**
 * POST /api/v1/linguaflow/profiles/:profileId/vocabulary
 * 
 * Add a new vocabulary word
 */
linguaFlowRouter.post(
  '/profiles/:profileId/vocabulary',
  validateParams(profileIdParamSchema),
  validateBody(addVocabularySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { profileId } = req.params;
    
    const result = await linguaFlowService.addVocabulary(tenantId, profileId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendCreated(res, result.data);
  })
);

/**
 * GET /api/v1/linguaflow/profiles/:profileId/vocabulary/review
 * 
 * Get vocabulary items due for review
 */
linguaFlowRouter.get(
  '/profiles/:profileId/vocabulary/review',
  validateParams(profileIdParamSchema),
  validateQuery(limitQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { profileId } = req.params;
    const { limit } = (req as any).validatedQuery;
    
    const result = await linguaFlowService.getVocabularyForReview(tenantId, profileId, limit);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, { vocabulary: result.data, count: result.data.length });
  })
);

/**
 * POST /api/v1/linguaflow/profiles/:profileId/vocabulary/review
 * 
 * Submit a vocabulary review (SM-2 algorithm)
 */
linguaFlowRouter.post(
  '/profiles/:profileId/vocabulary/review',
  validateParams(profileIdParamSchema),
  validateBody(reviewVocabularySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { profileId } = req.params;
    
    const result = await linguaFlowService.reviewVocabulary(tenantId, profileId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

/**
 * POST /api/v1/linguaflow/profiles/:profileId/vocabulary/review-session
 * 
 * Complete a batch vocabulary review session
 */
const reviewSessionSchema = z.object({
  reviews: z.array(z.object({
    wordId: z.string().min(1),
    quality: z.number().int().min(0).max(5),
  })).min(1),
});

linguaFlowRouter.post(
  '/profiles/:profileId/vocabulary/review-session',
  validateParams(profileIdParamSchema),
  validateBody(reviewSessionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { profileId } = req.params;
    const { reviews } = req.body;
    
    const result = await linguaFlowService.completeReviewSession(tenantId, profileId, reviews);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

// =============================================================================
// CONVERSATION ROUTES
// =============================================================================

/**
 * POST /api/v1/linguaflow/profiles/:profileId/conversations
 * 
 * Start a new AI conversation practice session
 */
linguaFlowRouter.post(
  '/profiles/:profileId/conversations',
  validateParams(profileIdParamSchema),
  validateBody(startConversationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { profileId } = req.params;
    
    const result = await linguaFlowService.startConversation(tenantId, profileId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendCreated(res, result.data);
  })
);

/**
 * POST /api/v1/linguaflow/conversations/:conversationId/messages
 * 
 * Add a message to an ongoing conversation
 */
linguaFlowRouter.post(
  '/conversations/:conversationId/messages',
  validateParams(conversationIdParamSchema),
  validateBody(addConversationMessageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { conversationId } = req.params;
    
    const result = await linguaFlowService.addConversationMessage(
      tenantId,
      conversationId,
      req.body
    );
    
    if (!result.success) {
      throw result.error;
    }
    
    sendCreated(res, result.data);
  })
);

/**
 * POST /api/v1/linguaflow/conversations/:conversationId/end
 * 
 * End a conversation and get summary
 */
linguaFlowRouter.post(
  '/conversations/:conversationId/end',
  validateParams(conversationIdParamSchema),
  validateBody(endConversationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { conversationId } = req.params;
    
    const result = await linguaFlowService.endConversation(tenantId, conversationId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

// =============================================================================
// IB CURRICULUM ROUTES
// =============================================================================

/**
 * POST /api/v1/linguaflow/profiles/:profileId/ib-criteria
 * 
 * Record an IB criteria score
 */
linguaFlowRouter.post(
  '/profiles/:profileId/ib-criteria',
  validateParams(profileIdParamSchema),
  validateBody(alignIbCriteriaSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { profileId } = req.params;
    
    const result = await linguaFlowService.alignIbCriteria(tenantId, profileId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

/**
 * GET /api/v1/linguaflow/myp-cefr/:phase
 * 
 * Get expected CEFR levels for an MYP phase
 */
linguaFlowRouter.get(
  '/myp-cefr/:phase',
  asyncHandler(async (req: Request, res: Response) => {
    const phase = parseInt(req.params.phase, 10);
    
    if (isNaN(phase) || phase < 1 || phase > 6) {
      throw new Error('Phase must be between 1 and 6');
    }
    
    const cefrLevels = linguaFlowService.getCefrForMypPhase(phase);
    
    sendSuccess(res, { phase, expectedCefrLevels: cefrLevels });
  })
);

// =============================================================================
// OFFLINE SUPPORT ROUTES
// =============================================================================

/**
 * POST /api/v1/linguaflow/profiles/:profileId/offline-packages
 * 
 * Create an offline learning package
 */
linguaFlowRouter.post(
  '/profiles/:profileId/offline-packages',
  validateParams(profileIdParamSchema),
  validateBody(createOfflinePackageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { profileId } = req.params;
    
    const result = await linguaFlowService.createOfflinePackage(tenantId, profileId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendCreated(res, result.data);
  })
);

/**
 * POST /api/v1/linguaflow/profiles/:profileId/sync
 * 
 * Sync offline progress back to server
 */
linguaFlowRouter.post(
  '/profiles/:profileId/sync',
  validateParams(profileIdParamSchema),
  validateBody(syncOfflineProgressSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { profileId } = req.params;
    
    const result = await linguaFlowService.syncOfflineProgress(tenantId, profileId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);
