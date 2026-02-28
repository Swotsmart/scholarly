/**
 * Tutor Onboarding API Routes
 *
 * Endpoints for the 7-step tutor onboarding flow.
 * All routes require authentication via authMiddleware.
 */

import { Router, Request, Response } from 'express';
import { getTutorOnboardingService } from '../services/tutor-onboarding/bootstrap';

export const tutorOnboardingRouter: Router = Router();

// POST /api/v1/onboarding — Start a new onboarding session
tutorOnboardingRouter.post('/', async (req: Request, res: Response) => {
  const service = getTutorOnboardingService();
  const { personaType } = req.body;
  const session = await service.createSession(personaType);
  res.status(201).json(session);
});

// GET /api/v1/onboarding/user/:userId — Get session by user ID
tutorOnboardingRouter.get('/user/:userId', async (req: Request, res: Response) => {
  const service = getTutorOnboardingService();
  const session = await service.getSessionByUserId(req.params.userId);
  if (!session) {
    return res.status(404).json({ error: 'No onboarding session found for this user' });
  }
  res.json(session);
});

// POST /api/v1/onboarding/:sessionId/resume — Resume an existing session
tutorOnboardingRouter.post('/:sessionId/resume', async (req: Request, res: Response) => {
  const service = getTutorOnboardingService();
  const session = await service.resumeSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// POST /api/v1/onboarding/:sessionId/step/identity — Complete Step 1
tutorOnboardingRouter.post('/:sessionId/step/identity', async (req: Request, res: Response) => {
  const service = getTutorOnboardingService();
  const result = await service.completeIdentity(req.params.sessionId, req.body);
  res.json(result);
});

// POST /api/v1/onboarding/:sessionId/step/branding — Complete Step 2
tutorOnboardingRouter.post('/:sessionId/step/branding', async (req: Request, res: Response) => {
  const service = getTutorOnboardingService();
  const result = await service.completeBranding(req.params.sessionId, req.body);
  res.json(result);
});

// POST /api/v1/onboarding/:sessionId/step/calendar — Complete Step 3
tutorOnboardingRouter.post('/:sessionId/step/calendar', async (req: Request, res: Response) => {
  const service = getTutorOnboardingService();
  const result = await service.completeCalendar(req.params.sessionId, req.body);
  res.json(result);
});

// POST /api/v1/onboarding/:sessionId/step/domain — Complete Step 4
tutorOnboardingRouter.post('/:sessionId/step/domain', async (req: Request, res: Response) => {
  const service = getTutorOnboardingService();
  const result = await service.completeDomain(req.params.sessionId, req.body);
  res.json(result);
});

// POST /api/v1/onboarding/:sessionId/step/payments — Complete Step 5
tutorOnboardingRouter.post('/:sessionId/step/payments', async (req: Request, res: Response) => {
  const service = getTutorOnboardingService();
  const result = await service.completePayments(req.params.sessionId, req.body);
  res.json(result);
});

// POST /api/v1/onboarding/:sessionId/step/profile — Complete Step 6
tutorOnboardingRouter.post('/:sessionId/step/profile', async (req: Request, res: Response) => {
  const service = getTutorOnboardingService();
  const result = await service.completeProfile(req.params.sessionId, req.body);
  res.json(result);
});

// POST /api/v1/onboarding/:sessionId/step/go-live — Complete Step 7
tutorOnboardingRouter.post('/:sessionId/step/go-live', async (req: Request, res: Response) => {
  const service = getTutorOnboardingService();
  const result = await service.completeGoLive(req.params.sessionId, req.body);
  res.json(result);
});

// POST /api/v1/onboarding/:sessionId/abandon — Mark session as abandoned
tutorOnboardingRouter.post('/:sessionId/abandon', async (req: Request, res: Response) => {
  const service = getTutorOnboardingService();
  await service.markAbandoned(req.params.sessionId);
  res.json({ status: 'abandoned' });
});
