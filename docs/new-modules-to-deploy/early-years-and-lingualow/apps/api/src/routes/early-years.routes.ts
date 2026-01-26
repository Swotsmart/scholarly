/**
 * Scholarly Platform - Early Years Routes
 * 
 * API routes for the Early Years (Little Explorers) module:
 * - Family management
 * - Child enrollment and management
 * - Picture password authentication
 * - Learning sessions
 * - Progress tracking
 * 
 * @module @scholarly/api/routes/early-years
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { earlyYearsService } from '@scholarly/early-years';
import {
  createFamilySchema,
  enrollChildSchema,
  setupPicturePasswordSchema,
  verifyPicturePasswordSchema,
  startSessionSchema,
  recordActivitySchema,
  endSessionSchema,
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
  AuthenticatedRequest,
  requireRoles,
  requireTenantMatch,
} from '../middleware/index.js';

// =============================================================================
// ROUTER
// =============================================================================

export const earlyYearsRouter = Router();

// =============================================================================
// PARAMETER SCHEMAS
// =============================================================================

const familyIdParamSchema = z.object({
  familyId: idSchema,
});

const childIdParamSchema = z.object({
  childId: idSchema,
});

const sessionIdParamSchema = z.object({
  sessionId: idSchema,
});

// =============================================================================
// FAMILY ROUTES
// =============================================================================

/**
 * POST /api/v1/early-years/families
 * 
 * Create a new family account
 */
earlyYearsRouter.post(
  '/families',
  validateBody(createFamilySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId, userId } = authReq.context;
    
    const result = await earlyYearsService.createFamily(tenantId, userId!, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendCreated(res, result.data);
  })
);

/**
 * GET /api/v1/early-years/families/me
 * 
 * Get the current user's family
 */
earlyYearsRouter.get(
  '/families/me',
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId, userId } = authReq.context;
    
    const familyResult = await earlyYearsService.getFamilyByUser(tenantId, userId!);
    
    if (!familyResult.success) {
      throw familyResult.error;
    }
    
    const result = await earlyYearsService.getFamily(tenantId, familyResult.data.familyId);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

/**
 * GET /api/v1/early-years/families/:familyId
 * 
 * Get a specific family's details
 */
earlyYearsRouter.get(
  '/families/:familyId',
  validateParams(familyIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { familyId } = req.params;
    
    const result = await earlyYearsService.getFamily(tenantId, familyId);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

// =============================================================================
// CHILD ROUTES
// =============================================================================

/**
 * POST /api/v1/early-years/families/:familyId/children
 * 
 * Enroll a new child in a family
 */
earlyYearsRouter.post(
  '/families/:familyId/children',
  validateParams(familyIdParamSchema),
  validateBody(enrollChildSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { familyId } = req.params;
    
    const result = await earlyYearsService.enrollChild(tenantId, familyId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendCreated(res, result.data);
  })
);

/**
 * GET /api/v1/early-years/children/:childId
 * 
 * Get a child's dashboard (progress, stats, recommendations)
 */
earlyYearsRouter.get(
  '/children/:childId',
  validateParams(childIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { childId } = req.params;
    
    const result = await earlyYearsService.getChildDashboard(tenantId, childId);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

// =============================================================================
// PICTURE PASSWORD ROUTES
// =============================================================================

/**
 * POST /api/v1/early-years/children/:childId/picture-password
 * 
 * Set up picture password for a child
 */
earlyYearsRouter.post(
  '/children/:childId/picture-password',
  validateParams(childIdParamSchema),
  validateBody(setupPicturePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { childId } = req.params;
    
    const result = await earlyYearsService.setupPicturePassword(tenantId, childId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

/**
 * POST /api/v1/early-years/children/:childId/picture-password/verify
 * 
 * Verify a child's picture password
 */
earlyYearsRouter.post(
  '/children/:childId/picture-password/verify',
  validateParams(childIdParamSchema),
  validateBody(verifyPicturePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { childId } = req.params;
    
    const result = await earlyYearsService.verifyPicturePassword(tenantId, childId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

// =============================================================================
// SESSION ROUTES
// =============================================================================

/**
 * POST /api/v1/early-years/children/:childId/sessions
 * 
 * Start a new learning session for a child
 */
earlyYearsRouter.post(
  '/children/:childId/sessions',
  validateParams(childIdParamSchema),
  validateBody(startSessionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { childId } = req.params;
    
    const result = await earlyYearsService.startSession(tenantId, childId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendCreated(res, result.data);
  })
);

/**
 * POST /api/v1/early-years/sessions/:sessionId/activities
 * 
 * Record an activity within a session
 */
earlyYearsRouter.post(
  '/sessions/:sessionId/activities',
  validateParams(sessionIdParamSchema),
  validateBody(recordActivitySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { sessionId } = req.params;
    
    const result = await earlyYearsService.recordActivity(tenantId, sessionId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendCreated(res, result.data);
  })
);

/**
 * POST /api/v1/early-years/sessions/:sessionId/end
 * 
 * End a learning session
 */
earlyYearsRouter.post(
  '/sessions/:sessionId/end',
  validateParams(sessionIdParamSchema),
  validateBody(endSessionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { sessionId } = req.params;
    
    const result = await earlyYearsService.endSession(tenantId, sessionId, req.body);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

// =============================================================================
// PROGRESS ROUTES
// =============================================================================

/**
 * GET /api/v1/early-years/children/:childId/phonics
 * 
 * Get detailed phonics progress for a child
 */
earlyYearsRouter.get(
  '/children/:childId/phonics',
  validateParams(childIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { childId } = req.params;
    
    const result = await earlyYearsService.getPhonicsProgress(tenantId, childId);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);

/**
 * POST /api/v1/early-years/children/:childId/phonics/advance
 * 
 * Advance a child to the next phonics phase
 */
earlyYearsRouter.post(
  '/children/:childId/phonics/advance',
  validateParams(childIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { tenantId } = authReq.context;
    const { childId } = req.params;
    
    const result = await earlyYearsService.advancePhonicsPhase(tenantId, childId);
    
    if (!result.success) {
      throw result.error;
    }
    
    sendSuccess(res, result.data);
  })
);
