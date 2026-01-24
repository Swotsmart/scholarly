/**
 * AI Buddy Routes
 *
 * API endpoints for the AI learning buddy functionality.
 */

import { Router } from 'express';
import { z } from 'zod';
import { ScholarlyApiError } from '../errors/scholarly-error';
import { authMiddleware } from '../middleware/auth';
import { getAIBuddyService, type BuddyRole } from '../services';
import { log } from '../lib/logger';

export const aiBuddyRouter: Router = Router();

// All routes require authentication
aiBuddyRouter.use(authMiddleware);

// ============================================================================
// Validation Schemas
// ============================================================================

const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(10000),
  context: z.object({
    yearLevel: z.string().optional(),
    subjects: z.array(z.string()).optional(),
    currentTopic: z.string().optional(),
    currentLesson: z.string().optional(),
    learningGoals: z.array(z.string()).optional(),
  }).optional(),
});

const feedbackSchema = z.object({
  messageId: z.string(),
  helpful: z.boolean(),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});

const settingsSchema = z.object({
  responseStyle: z.enum(['encouraging', 'direct', 'socratic', 'playful']).optional(),
  verbosityLevel: z.enum(['concise', 'detailed', 'comprehensive']).optional(),
  useEmojis: z.boolean().optional(),
  includeExamples: z.boolean().optional(),
  provideChallenges: z.boolean().optional(),
  reminderFrequency: z.enum(['none', 'daily', 'weekly']).optional(),
  parentNotifications: z.boolean().optional(),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/v1/ai-buddy/message
 * Send a message to the AI Buddy
 */
aiBuddyRouter.post('/message', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = sendMessageSchema.parse(req.body);

    // Determine role from user's roles
    const userRoles = req.user!.roles as string[];
    let role: BuddyRole = 'student';
    if (userRoles.includes('teacher') || userRoles.includes('tutor')) {
      role = 'teacher';
    } else if (userRoles.includes('parent')) {
      role = 'parent';
    }

    const buddyService = getAIBuddyService();
    const result = await buddyService.sendMessage(tenantId, userId, role, {
      conversationId: data.conversationId,
      message: data.message,
      context: data.context,
    });

    if (!result.success) {
      const error = new ScholarlyApiError('AI_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('AI Buddy message sent', { userId, conversationId: result.data.conversationId });

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
 * GET /api/v1/ai-buddy/conversations
 * List user's conversations
 */
aiBuddyRouter.get('/conversations', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  const status = req.query.status as 'active' | 'archived' | undefined;

  const buddyService = getAIBuddyService();
  const result = await buddyService.listConversations(tenantId, userId, {
    status,
    limit,
    offset,
  });

  if (!result.success) {
    const error = new ScholarlyApiError('AI_002');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: result.data,
  });
});

/**
 * GET /api/v1/ai-buddy/conversations/:id
 * Get a specific conversation
 */
aiBuddyRouter.get('/conversations/:id', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const conversationId = req.params.id;

  const buddyService = getAIBuddyService();
  const conversation = await buddyService.getConversation(tenantId, conversationId);

  if (!conversation) {
    const error = ScholarlyApiError.notFound('Conversation', conversationId);
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  if (conversation.userId !== req.user!.id) {
    const error = ScholarlyApiError.insufficientPermissions();
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { conversation },
  });
});

/**
 * POST /api/v1/ai-buddy/conversations/:id/archive
 * Archive a conversation
 */
aiBuddyRouter.post('/conversations/:id/archive', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const conversationId = req.params.id;

  const buddyService = getAIBuddyService();
  const result = await buddyService.archiveConversation(tenantId, userId, conversationId);

  if (!result.success) {
    const error = ScholarlyApiError.notFound('Conversation', conversationId);
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({ success: true });
});

/**
 * POST /api/v1/ai-buddy/conversations/:conversationId/messages/:messageId/feedback
 * Provide feedback on a message
 */
aiBuddyRouter.post('/conversations/:conversationId/messages/:messageId/feedback', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { conversationId, messageId } = req.params;

  try {
    const data = feedbackSchema.parse({ messageId, ...req.body });

    const buddyService = getAIBuddyService();
    const result = await buddyService.provideFeedback(tenantId, userId, conversationId, messageId, {
      helpful: data.helpful,
      rating: data.rating,
      comment: data.comment,
    });

    if (!result.success) {
      const error = ScholarlyApiError.notFound('Message', messageId);
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * GET /api/v1/ai-buddy/settings
 * Get user's AI Buddy settings
 */
aiBuddyRouter.get('/settings', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const buddyService = getAIBuddyService();
  const settings = await buddyService.getBuddySettings(tenantId, userId);

  res.json({
    success: true,
    data: {
      settings: settings || {
        responseStyle: 'encouraging',
        verbosityLevel: 'concise',
        useEmojis: true,
        includeExamples: true,
        provideChallenges: true,
        reminderFrequency: 'none',
        parentNotifications: false,
      },
    },
  });
});

/**
 * PATCH /api/v1/ai-buddy/settings
 * Update user's AI Buddy settings
 */
aiBuddyRouter.patch('/settings', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = settingsSchema.parse(req.body);

    const buddyService = getAIBuddyService();
    const result = await buddyService.updateBuddySettings(tenantId, userId, data);

    if (!result.success) {
      const error = new ScholarlyApiError('AI_003');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { settings: result.data },
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
 * GET /api/v1/ai-buddy/profile
 * Get learner profile for AI personalization
 */
aiBuddyRouter.get('/profile', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const buddyService = getAIBuddyService();
  const profile = await buddyService.getLearnerProfile(tenantId, userId);

  res.json({
    success: true,
    data: { profile },
  });
});
