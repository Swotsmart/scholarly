/**
 * Little Explorers - API Routes
 * 
 * RESTful API endpoints for the Little Explorers platform.
 * Built with Express.js and follows REST conventions.
 * 
 * ## Authentication
 * 
 * All routes require authentication via JWT tokens. The middleware extracts:
 * - `tenantId` - Organization isolation
 * - `userId` - Current user
 * - `userRole` - teacher, parent, admin, student
 * 
 * ## Rate Limiting
 * 
 * Different limits per endpoint type:
 * - Read operations: 100/minute
 * - Write operations: 30/minute
 * - AI operations: 10/minute
 * 
 * @module LittleExplorers/API
 * @version 1.0.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { BehaviourService } from '../services/behaviour-service';
import { CommunicationService } from '../services/communication-service';
import { PortfolioService } from '../services/portfolio-service';
import { Result, ValidationError, NotFoundError } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user: {
    tenantId: string;
    userId: string;
    userRole: 'teacher' | 'parent' | 'admin' | 'student';
    schoolId?: string;
    classroomIds?: string[];
  };
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
}

type AsyncHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Wrap async handlers to catch errors
 */
const asyncHandler = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
};

/**
 * Authentication middleware (simplified - would use JWT in production)
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' }
    });
  }

  // In production, decode JWT and verify
  // For now, extract from a mock token structure
  try {
    const token = authHeader.substring(7);
    // Mock decoded token - would be JWT verification
    const decoded = JSON.parse(Buffer.from(token.split('.')[1] || '{}', 'base64').toString());
    
    (req as AuthenticatedRequest).user = {
      tenantId: decoded.tenantId || 'default',
      userId: decoded.userId || decoded.sub,
      userRole: decoded.role || 'teacher',
      schoolId: decoded.schoolId,
      classroomIds: decoded.classroomIds
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' }
    });
  }
};

/**
 * Role-based access control
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    
    if (!roles.includes(authReq.user.userRole)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
      });
    }
    
    next();
  };
};

/**
 * Validate classroom access
 */
export const requireClassroomAccess = (paramName: string = 'classroomId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const classroomId = req.params[paramName] || req.body[paramName];
    
    if (!classroomId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CLASSROOM', message: 'Classroom ID required' }
      });
    }

    // Teachers must be assigned to classroom
    if (authReq.user.userRole === 'teacher' && authReq.user.classroomIds) {
      if (!authReq.user.classroomIds.includes(classroomId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'CLASSROOM_ACCESS_DENIED', message: 'Not assigned to this classroom' }
        });
      }
    }
    
    next();
  };
};

/**
 * Format Result to API response
 */
function formatResult<T>(result: Result<T>, res: Response, successStatus: number = 200): void {
  if (result.success) {
    res.status(successStatus).json({
      success: true,
      data: result.data
    });
  } else {
    const error = result.error;
    let status = 500;
    
    if (error instanceof ValidationError) {
      status = 400;
    } else if (error instanceof NotFoundError) {
      status = 404;
    } else if (error.name === 'ConsentRequiredError') {
      status = 403;
    }
    
    res.status(status).json({
      success: false,
      error: {
        code: error.name || 'INTERNAL_ERROR',
        message: error.message,
        details: (error as any).details
      }
    });
  }
}

// ============================================================================
// BEHAVIOUR ROUTES
// ============================================================================

export function createBehaviourRoutes(service: BehaviourService): Router {
  const router = Router();

  /**
   * POST /points
   * Award points to students
   */
  router.post('/points', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { schoolId, classroomId, studentIds, skillId, points, description, tags, location } = req.body;

    const result = await service.awardPoints({
      tenantId,
      schoolId,
      classroomId,
      awardedBy: userId,
      studentIds,
      skillId,
      points,
      description,
      tags,
      location
    });

    formatResult(result, res, 201);
  }));

  /**
   * POST /points/quick
   * Quick single point award
   */
  router.post('/points/quick', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { classroomId, studentId, skillId } = req.body;

    const result = await service.quickAward(tenantId, classroomId, studentId, skillId, userId);
    formatResult(result, res, 201);
  }));

  /**
   * POST /points/group
   * Award points to a table group
   */
  router.post('/points/group', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { classroomId, groupId, skillId, reason } = req.body;

    const result = await service.awardGroupPoints(tenantId, classroomId, groupId, skillId, userId, reason);
    formatResult(result, res, 201);
  }));

  /**
   * POST /points/class
   * Award points to whole class
   */
  router.post('/points/class', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { classroomId, skillId, reason } = req.body;

    const result = await service.awardWholeClass(tenantId, classroomId, skillId, userId, reason);
    formatResult(result, res, 201);
  }));

  /**
   * GET /classrooms/:classroomId/skills
   * Get available skills for classroom
   */
  router.get('/classrooms/:classroomId/skills', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { classroomId } = req.params;
    const { activeOnly } = req.query;

    const result = await service.getClassroomSkills(tenantId, classroomId, activeOnly !== 'false');
    formatResult(result, res);
  }));

  /**
   * POST /classrooms/:classroomId/skills
   * Create custom skill
   */
  router.post('/classrooms/:classroomId/skills', asyncHandler(async (req, res) => {
    const { tenantId, userId, schoolId } = req.user;
    const { classroomId } = req.params;
    const { name, emoji, description, category, defaultPoints, isPositive } = req.body;

    const result = await service.createCustomSkill(
      tenantId, schoolId!, classroomId, userId,
      { name, emoji, description, category, defaultPoints, isPositive }
    );
    formatResult(result, res, 201);
  }));

  /**
   * POST /suggestions/generate
   * Generate AI suggestions
   */
  router.post('/suggestions/generate', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { classroomId, trigger, observationText, studentIds } = req.body;

    const result = await service.generateAISuggestions({
      tenantId,
      classroomId,
      trigger: trigger || 'manual',
      observationText,
      studentIds
    });
    formatResult(result, res);
  }));

  /**
   * GET /classrooms/:classroomId/suggestions
   * Get pending suggestions
   */
  router.get('/classrooms/:classroomId/suggestions', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { classroomId } = req.params;

    const result = await service.getPendingSuggestions(tenantId, classroomId);
    formatResult(result, res);
  }));

  /**
   * POST /suggestions/:suggestionId/accept
   * Accept an AI suggestion
   */
  router.post('/suggestions/:suggestionId/accept', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { suggestionId } = req.params;
    const { modifications } = req.body;

    const result = await service.acceptSuggestion(tenantId, suggestionId, userId, modifications);
    formatResult(result, res);
  }));

  /**
   * POST /suggestions/:suggestionId/reject
   * Reject an AI suggestion
   */
  router.post('/suggestions/:suggestionId/reject', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { suggestionId } = req.params;
    const { reason } = req.body;

    const result = await service.rejectSuggestion(tenantId, suggestionId, userId, reason);
    formatResult(result, res);
  }));

  /**
   * GET /students/:studentId/analytics
   * Get student behaviour analytics
   */
  router.get('/students/:studentId/analytics', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    const dateRange = {
      start: new Date(startDate as string || Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(endDate as string || Date.now())
    };

    const result = await service.getStudentAnalytics(tenantId, studentId, dateRange);
    formatResult(result, res);
  }));

  /**
   * GET /students/:studentId/insights
   * Get AI-generated student insights
   */
  router.get('/students/:studentId/insights', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { studentId } = req.params;
    const { days } = req.query;

    const result = await service.getStudentInsights(tenantId, studentId, parseInt(days as string) || 30);
    formatResult(result, res);
  }));

  /**
   * GET /classrooms/:classroomId/analytics
   * Get classroom behaviour analytics
   */
  router.get('/classrooms/:classroomId/analytics', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { classroomId } = req.params;
    const { startDate, endDate } = req.query;

    const dateRange = {
      start: new Date(startDate as string || Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(endDate as string || Date.now())
    };

    const result = await service.getClassroomAnalytics(tenantId, classroomId, dateRange);
    formatResult(result, res);
  }));

  /**
   * GET /classrooms/:classroomId/insights
   * Get AI-generated classroom insights
   */
  router.get('/classrooms/:classroomId/insights', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { classroomId } = req.params;
    const { days } = req.query;

    const result = await service.getClassroomInsights(tenantId, classroomId, parseInt(days as string) || 7);
    formatResult(result, res);
  }));

  /**
   * GET /students/:studentId/celebrations
   * Get student celebrations
   */
  router.get('/students/:studentId/celebrations', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { studentId } = req.params;

    const result = await service.getStudentCelebrations(tenantId, studentId);
    formatResult(result, res);
  }));

  /**
   * GET /students/:studentId/streak
   * Get student streak info
   */
  router.get('/students/:studentId/streak', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { studentId } = req.params;

    const result = await service.getStudentStreak(tenantId, studentId);
    formatResult(result, res);
  }));

  return router;
}

// ============================================================================
// COMMUNICATION ROUTES
// ============================================================================

export function createCommunicationRoutes(service: CommunicationService): Router {
  const router = Router();

  /**
   * POST /stories
   * Create a story post
   */
  router.post('/stories', asyncHandler(async (req, res) => {
    const { tenantId, userId, schoolId } = req.user;
    const { classroomId, content, taggedStudentIds, visibility, scheduledFor, useAICaption } = req.body;

    const result = await service.createStoryPost({
      tenantId,
      schoolId: schoolId!,
      classroomId,
      authorId: userId,
      content,
      taggedStudentIds,
      visibility,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      useAICaption
    });
    formatResult(result, res, 201);
  }));

  /**
   * GET /classrooms/:classroomId/stories
   * Get classroom story feed
   */
  router.get('/classrooms/:classroomId/stories', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { classroomId } = req.params;
    const { page, pageSize } = req.query;

    const result = await service.getClassroomFeed(tenantId, classroomId, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      viewerId: userId
    });
    formatResult(result, res);
  }));

  /**
   * GET /parents/:parentId/feed
   * Get personalized parent feed
   */
  router.get('/parents/:parentId/feed', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { parentId } = req.params;
    const { page, pageSize } = req.query;

    const result = await service.getParentFeed(tenantId, parentId, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20
    });
    formatResult(result, res);
  }));

  /**
   * POST /stories/:storyId/reactions
   * React to a story
   */
  router.post('/stories/:storyId/reactions', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { storyId } = req.params;
    const { type, userName } = req.body;

    const result = await service.reactToStory(tenantId, storyId, userId, userName, type);
    formatResult(result, res, 201);
  }));

  /**
   * POST /stories/:storyId/comments
   * Comment on a story
   */
  router.post('/stories/:storyId/comments', asyncHandler(async (req, res) => {
    const { tenantId, userId, userRole } = req.user;
    const { storyId } = req.params;
    const { content, userName, parentCommentId } = req.body;

    const result = await service.commentOnStory(
      tenantId, storyId, userId, userName, userRole, content, parentCommentId
    );
    formatResult(result, res, 201);
  }));

  /**
   * POST /conversations
   * Start a conversation
   */
  router.post('/conversations', asyncHandler(async (req, res) => {
    const { tenantId, userId, schoolId } = req.user;
    const { classroomId, participantIds, relatedStudentId, subject } = req.body;

    const result = await service.startConversation(
      tenantId, schoolId!, classroomId, userId, participantIds, relatedStudentId, subject
    );
    formatResult(result, res, 201);
  }));

  /**
   * GET /conversations
   * Get user's conversations
   */
  router.get('/conversations', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { page, pageSize, status } = req.query;

    const result = await service.getUserConversations(tenantId, userId, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      status: status as string
    });
    formatResult(result, res);
  }));

  /**
   * POST /conversations/:conversationId/messages
   * Send a message
   */
  router.post('/conversations/:conversationId/messages', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { conversationId } = req.params;
    const { content, useAIDraft, translationLanguages } = req.body;

    const result = await service.sendMessage({
      tenantId,
      conversationId,
      senderId: userId,
      content,
      useAIDraft,
      translationLanguages
    });
    formatResult(result, res, 201);
  }));

  /**
   * GET /conversations/:conversationId/drafts
   * Get AI message drafts
   */
  router.get('/conversations/:conversationId/drafts', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { conversationId } = req.params;
    const { purpose, context } = req.query;

    const result = await service.getMessageDrafts(
      tenantId, conversationId, purpose as string, context as string
    );
    formatResult(result, res);
  }));

  /**
   * POST /conversations/:conversationId/read
   * Mark messages as read
   */
  router.post('/conversations/:conversationId/read', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { conversationId } = req.params;
    const { upToMessageId } = req.body;

    const result = await service.markMessagesRead(tenantId, conversationId, userId, upToMessageId);
    formatResult(result, res);
  }));

  /**
   * POST /events
   * Create calendar event
   */
  router.post('/events', asyncHandler(async (req, res) => {
    const { tenantId, userId, schoolId } = req.user;
    const { classroomId, title, description, type, startDate, endDate, allDay, location, rsvpEnabled, rsvpDeadline } = req.body;

    const result = await service.createEvent({
      tenantId,
      schoolId: schoolId!,
      classroomId,
      createdBy: userId,
      title,
      description,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allDay,
      location,
      rsvpEnabled,
      rsvpDeadline: rsvpDeadline ? new Date(rsvpDeadline) : undefined
    });
    formatResult(result, res, 201);
  }));

  /**
   * GET /events
   * Get upcoming events
   */
  router.get('/events', asyncHandler(async (req, res) => {
    const { tenantId, schoolId } = req.user;
    const { classroomId, days } = req.query;

    const result = await service.getUpcomingEvents(
      tenantId,
      { schoolId, classroomId: classroomId as string },
      parseInt(days as string) || 30
    );
    formatResult(result, res);
  }));

  /**
   * POST /events/:eventId/rsvp
   * RSVP to event
   */
  router.post('/events/:eventId/rsvp', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { eventId } = req.params;
    const { response, userName, studentIds, notes } = req.body;

    const result = await service.rsvpToEvent(tenantId, eventId, userId, userName, response, studentIds, notes);
    formatResult(result, res);
  }));

  /**
   * POST /alerts
   * Send emergency alert
   */
  router.post('/alerts', requireRole('admin', 'teacher'), asyncHandler(async (req, res) => {
    const { tenantId, userId, schoolId } = req.user;
    const { type, severity, title, message, instructions, targetClassroomIds, channels, requiresAcknowledgement } = req.body;

    const result = await service.sendEmergencyAlert({
      tenantId,
      schoolId: schoolId!,
      createdBy: userId,
      type,
      severity,
      title,
      message,
      instructions,
      targetClassroomIds,
      channels,
      requiresAcknowledgement
    });
    formatResult(result, res, 201);
  }));

  /**
   * POST /alerts/:alertId/acknowledge
   * Acknowledge alert
   */
  router.post('/alerts/:alertId/acknowledge', asyncHandler(async (req, res) => {
    const { tenantId, userId, userRole } = req.user;
    const { alertId } = req.params;
    const { userName } = req.body;

    const result = await service.acknowledgeAlert(tenantId, alertId, userId, userName, userRole);
    formatResult(result, res);
  }));

  /**
   * POST /translate
   * Translate content
   */
  router.post('/translate', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { content, targetLanguage, sourceLanguage } = req.body;

    const result = await service.translateForUser(tenantId, content, targetLanguage, sourceLanguage);
    formatResult(result, res);
  }));

  /**
   * GET /notifications
   * Get user notifications
   */
  router.get('/notifications', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { page, pageSize, unreadOnly } = req.query;

    const result = await service.getUserNotifications(tenantId, userId, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 50,
      unreadOnly: unreadOnly === 'true'
    });
    formatResult(result, res);
  }));

  /**
   * POST /notifications/:notificationId/read
   * Mark notification read
   */
  router.post('/notifications/:notificationId/read', asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { notificationId } = req.params;

    const result = await service.markNotificationRead(tenantId, notificationId, userId);
    formatResult(result, res);
  }));

  return router;
}

// ============================================================================
// PORTFOLIO ROUTES
// ============================================================================

export function createPortfolioRoutes(service: PortfolioService): Router {
  const router = Router();

  /**
   * POST /items
   * Create portfolio item
   */
  router.post('/items', asyncHandler(async (req, res) => {
    const { tenantId, userId, schoolId } = req.user;
    const { classroomId, studentId, type, title, description, content, capturedAt, useAIAnalysis, curriculumFrameworks, autoApprove } = req.body;

    const result = await service.createPortfolioItem({
      tenantId,
      schoolId: schoolId!,
      classroomId,
      studentId,
      createdBy: userId,
      type,
      title,
      description,
      content,
      capturedAt: capturedAt ? new Date(capturedAt) : undefined,
      useAIAnalysis,
      curriculumFrameworks,
      autoApprove
    });
    formatResult(result, res, 201);
  }));

  /**
   * GET /students/:studentId/portfolio
   * Get student portfolio
   */
  router.get('/students/:studentId/portfolio', asyncHandler(async (req, res) => {
    const { tenantId, userId, userRole } = req.user;
    const { studentId } = req.params;
    const { page, pageSize, types, approvalStatus, startDate, endDate } = req.query;

    const result = await service.getStudentPortfolio(tenantId, studentId, {
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      types: types ? (types as string).split(',') as any[] : undefined,
      approvalStatus: approvalStatus as any,
      dateRange: startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined,
      viewerId: userId,
      viewerRole: userRole
    });
    formatResult(result, res);
  }));

  /**
   * POST /items/:itemId/approve
   * Approve portfolio item
   */
  router.post('/items/:itemId/approve', requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { itemId } = req.params;
    const { makeVisible } = req.body;

    const result = await service.approveItem(tenantId, itemId, userId, makeVisible !== false);
    formatResult(result, res);
  }));

  /**
   * POST /items/:itemId/highlight
   * Mark as highlight
   */
  router.post('/items/:itemId/highlight', requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { itemId } = req.params;
    const { reason } = req.body;

    const result = await service.markAsHighlight(tenantId, itemId, userId, reason);
    formatResult(result, res);
  }));

  /**
   * POST /items/:itemId/reactions
   * Add parent reaction
   */
  router.post('/items/:itemId/reactions', requireRole('parent'), asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { itemId } = req.params;
    const { type, emoji, comment } = req.body;

    const result = await service.addParentReaction(tenantId, itemId, userId, {
      type,
      emoji,
      comment,
      reactedAt: new Date()
    });
    formatResult(result, res, 201);
  }));

  /**
   * POST /activities
   * Create activity
   */
  router.post('/activities', requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
    const { tenantId, userId, schoolId } = req.user;
    const { classroomId, title, description, instructions, type, responseTypes, content, targetAgeGroups, targetStudentIds, dueDate, estimatedMinutes, settings, curriculumFrameworks } = req.body;

    const result = await service.createActivity({
      tenantId,
      schoolId: schoolId!,
      classroomId,
      createdBy: userId,
      title,
      description,
      instructions,
      type,
      responseTypes,
      content,
      targetAgeGroups,
      targetStudentIds,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedMinutes,
      settings,
      curriculumFrameworks
    });
    formatResult(result, res, 201);
  }));

  /**
   * POST /activities/:activityId/publish
   * Publish activity
   */
  router.post('/activities/:activityId/publish', requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { activityId } = req.params;

    const result = await service.publishActivity(tenantId, activityId);
    formatResult(result, res);
  }));

  /**
   * POST /activities/:activityId/responses
   * Submit activity response
   */
  router.post('/activities/:activityId/responses', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { activityId } = req.params;
    const { studentId, responseType, content } = req.body;

    const result = await service.submitActivityResponse(tenantId, activityId, studentId, responseType, content);
    formatResult(result, res, 201);
  }));

  /**
   * POST /responses/:responseId/feedback
   * Add teacher feedback
   */
  router.post('/responses/:responseId/feedback', requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
    const { tenantId, userId } = req.user;
    const { responseId } = req.params;
    const { comment, rating, stamp, voiceNoteUrl } = req.body;

    const result = await service.addTeacherFeedback(tenantId, responseId, userId, {
      comment,
      rating,
      stamp,
      voiceNoteUrl
    });
    formatResult(result, res);
  }));

  /**
   * POST /observations
   * Create observation
   */
  router.post('/observations', requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
    const { tenantId, userId, schoolId } = req.user;
    const { classroomId, studentIds, observation, type, context, mediaUrls, useAIEnhancement } = req.body;

    const result = await service.createObservation({
      tenantId,
      schoolId: schoolId!,
      classroomId,
      observedBy: userId,
      studentIds,
      observation,
      type,
      context,
      mediaUrls,
      useAIEnhancement
    });
    formatResult(result, res, 201);
  }));

  /**
   * POST /observations/:observationId/convert
   * Convert to portfolio item
   */
  router.post('/observations/:observationId/convert', requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { observationId } = req.params;
    const { studentId, title } = req.body;

    const result = await service.convertObservationToPortfolioItem(tenantId, observationId, studentId, title);
    formatResult(result, res, 201);
  }));

  /**
   * POST /milestones/:milestoneId/record
   * Record milestone achievement
   */
  router.post('/milestones/:milestoneId/record', requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { milestoneId } = req.params;
    const { studentId, status, evidence } = req.body;

    const result = await service.recordMilestoneAchievement(tenantId, studentId, milestoneId, status, evidence);
    formatResult(result, res);
  }));

  /**
   * GET /students/:studentId/milestones
   * Get student milestones
   */
  router.get('/students/:studentId/milestones', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { studentId } = req.params;
    const { framework, area } = req.query;

    const result = await service.getStudentMilestones(tenantId, studentId, {
      framework: framework as any,
      area: area as any
    });
    formatResult(result, res);
  }));

  /**
   * POST /students/:studentId/reports
   * Generate progress report
   */
  router.post('/students/:studentId/reports', requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { studentId } = req.params;
    const { period, startDate, endDate, includePortfolioItems, includeBehaviour, includeMilestones, audience, tone } = req.body;

    const result = await service.generateProgressReport({
      tenantId,
      studentId,
      period,
      dateRange: {
        start: new Date(startDate),
        end: new Date(endDate)
      },
      includePortfolioItems,
      includeBehaviour,
      includeMilestones,
      audience,
      tone
    });
    formatResult(result, res, 201);
  }));

  /**
   * POST /reports/:reportId/pdf
   * Generate PDF report
   */
  router.post('/reports/:reportId/pdf', requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { reportId } = req.params;

    const result = await service.generateReportPDF(tenantId, reportId);
    formatResult(result, res);
  }));

  /**
   * POST /students/:studentId/access
   * Setup student access
   */
  router.post('/students/:studentId/access', requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { studentId } = req.params;
    const { loginType } = req.body;

    const result = await service.setupStudentAccess(tenantId, studentId, loginType);
    formatResult(result, res, 201);
  }));

  /**
   * POST /students/:studentId/access/verify
   * Verify student login
   */
  router.post('/students/:studentId/access/verify', asyncHandler(async (req, res) => {
    const { tenantId } = req.user;
    const { studentId } = req.params;
    const { code, pictureSequence } = req.body;

    const result = await service.verifyStudentLogin(tenantId, studentId, { code, pictureSequence });
    formatResult(result, res);
  }));

  return router;
}

// ============================================================================
// MAIN ROUTER FACTORY
// ============================================================================

export interface RouterDependencies {
  behaviourService: BehaviourService;
  communicationService: CommunicationService;
  portfolioService: PortfolioService;
}

export function createAPIRouter(deps: RouterDependencies): Router {
  const router = Router();

  // Apply authentication to all routes
  router.use(authenticate);

  // Mount service routes
  router.use('/behaviour', createBehaviourRoutes(deps.behaviourService));
  router.use('/communication', createCommunicationRoutes(deps.communicationService));
  router.use('/portfolio', createPortfolioRoutes(deps.portfolioService));

  // Health check (unauthenticated would be separate)
  router.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  return router;
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error('API Error:', err);

  if (err instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message, details: (err as any).details }
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: err.message }
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  });
}
