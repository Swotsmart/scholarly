/**
 * ============================================================================
 * Book Club Routes
 * ============================================================================
 *
 * @module erudits/routes/bookclub
 */

import type { BookClubService } from '../services/bookclub.service';
import type { AddReadingRequest, BookClubSessionType } from '../types/erudits.types';
import {
  RouteRequest, RouteResponse, NextFunction,
  requireAuth, requireTenantId, requireParam,
  sendResult, asyncHandler,
} from './shared';

export interface BookClubRouteConfig {
  bookClubService: BookClubService;
}

export function createBookClubRoutes(config: BookClubRouteConfig) {
  const { bookClubService } = config;

  // createClub(tenantId, organiserId, organiserName, params)
  const createClub = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as {
      name: string; description?: string; language: string;
      targetYearLevels: string[]; curriculumCodes?: string[];
      maxMembers?: number; isPublic?: boolean | undefined;
      startDate?: string; endDate?: string | undefined;
    };
    const result = await bookClubService.createClub(tenantId, user.id, user.name, {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
    sendResult(res, result, 201);
  });

  // updateClub(tenantId, clubId, userId, updates)
  const updateClub = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as {
      name?: string | undefined; description?: string | undefined; isPublic?: boolean | undefined;
      isActive?: boolean | undefined; maxMembers?: number | undefined; startDate?: Date | undefined; endDate?: Date | undefined;
    };
    const result = await bookClubService.updateClub(tenantId, requireParam(req, 'id'), user.id, body);
    sendResult(res, result);
  });

  // addReading(tenantId, userId, clubId, request)
  const addReading = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as Omit<AddReadingRequest, 'bookClubId'>;
    const request: AddReadingRequest = { ...body, bookClubId: requireParam(req, 'id') };
    const result = await bookClubService.addReading(tenantId, user.id, requireParam(req, 'id'), request);
    sendResult(res, result, 201);
  });

  // getReadingList(tenantId, clubId)
  const getReadingList = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const tenantId = requireTenantId(req);
    const result = await bookClubService.getReadingList(tenantId, requireParam(req, 'id'));
    sendResult(res, result);
  });

  // markReadingComplete(tenantId, userId, clubId, readingId)
  const markReadingComplete = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await bookClubService.markReadingComplete(tenantId, user.id, requireParam(req, 'id'), requireParam(req, 'rid'));
    sendResult(res, result);
  });

  // scheduleSession(tenantId, userId, clubId, params)
  const scheduleSession = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as {
      title: string; sessionType: BookClubSessionType;
      scheduledAt: string; durationMinutes?: number;
      readingId?: string; description?: string; facilitatorNotes?: string; meetingUrl?: string | undefined;
    };
    const result = await bookClubService.scheduleSession(tenantId, requireParam(req, 'id'), user.id, {
      ...body,
      scheduledAt: new Date(body.scheduledAt),
    });
    sendResult(res, result, 201);
  });

  // completeSession(tenantId, sessionId, userId, attendeeIds, notes?)
  const completeSession = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as { attendeeIds: string[]; notes?: string };
    const result = await bookClubService.completeSession(tenantId, requireParam(req, 'sid'), user.id, body.attendeeIds, body.notes);
    sendResult(res, result);
  });

  // getUpcomingSessions(tenantId, clubId, limit)
  const getUpcomingSessions = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const tenantId = requireTenantId(req);
    const limit = parseInt(String(req.query.limit ?? '10'), 10);
    const result = await bookClubService.getUpcomingSessions(tenantId, requireParam(req, 'id'), limit);
    sendResult(res, result);
  });

  // joinClub(tenantId, userId, clubId)
  const joinClub = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await bookClubService.joinClub(tenantId, requireParam(req, 'id'), user.id, user.name);
    sendResult(res, result, 201);
  });

  // leaveClub(tenantId, userId, clubId)
  const leaveClub = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const result = await bookClubService.leaveClub(tenantId, user.id, requireParam(req, 'id'));
    sendResult(res, result);
  });

  // getMembers(tenantId, clubId)
  const getMembers = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const tenantId = requireTenantId(req);
    const result = await bookClubService.getMembers(tenantId, requireParam(req, 'id'));
    sendResult(res, result);
  });

  // generateDiscussionQuestions(tenantId, clubId, readingId, userId, options?)
  const generateDiscussionQuestions = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as {
      readingId: string; questionCount?: number; difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
      focusAreas?: string[]; targetLanguage?: string; includeAnswerKey?: boolean | undefined;
    };
    const { readingId, ...options } = body;
    const result = await bookClubService.generateDiscussionQuestions(
      tenantId, requireParam(req, 'id'), readingId, user.id, options,
    );
    sendResult(res, result);
  });

  // generateFacilitatorGuide(tenantId, sessionId, userId)
  const generateFacilitatorGuide = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const user = requireAuth(req);
    const tenantId = requireTenantId(req);
    const body = req.body as unknown as { sessionId: string };
    const result = await bookClubService.generateFacilitatorGuide(tenantId, body.sessionId, user.id);
    sendResult(res, result);
  });

  // getClubAnalytics(tenantId, clubId)
  const getAnalytics = asyncHandler(async (req: RouteRequest, res: RouteResponse, _next: NextFunction) => {
    const tenantId = requireTenantId(req);
    const result = await bookClubService.getClubAnalytics(tenantId, requireParam(req, 'id'));
    sendResult(res, result);
  });

  return {
    createClub, updateClub, addReading, getReadingList, markReadingComplete,
    scheduleSession, completeSession, getUpcomingSessions,
    joinClub, leaveClub, getMembers,
    generateDiscussionQuestions, generateFacilitatorGuide, getAnalytics,
  };
}
