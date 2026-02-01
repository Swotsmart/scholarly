/**
 * Scholarly Payment Routes
 *
 * RESTful API endpoints for the payment service including accounts,
 * invoices, payments, payouts, refunds, and the AI profile builder.
 *
 * @module ScholarlyPayment/Routes
 * @version 1.0.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { log } from '../lib/logger';
import { isFailure } from '../services/base.service';
import {
  PaymentService,
  getPaymentService,
} from '../services/payment.service';
import {
  AIProfileBuilderService,
  getAIProfileBuilderService,
} from '../services/profile-builder.service';
import type {
  CreateAccountInput,
  CreateInvoiceInput,
  ProcessPaymentInput,
  CreatePayoutInput,
  CreateRefundInput,
} from '../services/payment-types';
import type {
  StartProfileSessionInput,
  AnswerQuestionInput,
  GenerateDraftsInput,
  SelectDraftInput,
  PublishProfileInput,
  ProfileBuilderSession,
} from '../services/profile-builder-types';

// ============================================================================
// MIDDLEWARE
// ============================================================================

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const validateTenant = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    return res.status(400).json({ error: 'Missing X-Tenant-ID header' });
  }
  (req as Request & { tenantId: string }).tenantId = tenantId;
  next();
};

const profileSessions = new Map<string, ProfileBuilderSession>();

// ============================================================================
// ACCOUNT ROUTES
// ============================================================================

export function createAccountRoutes(paymentService?: PaymentService): Router {
  const router = Router();
  const service = paymentService ?? getPaymentService();

  router.post(
    '/',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = (req as Request & { tenantId: string }).tenantId;
      const input: CreateAccountInput = { tenantId, ...req.body };
      const result = await service.createAccount(input);

      if (isFailure(result)) {
        const status = result.error.code === 'VALIDATION_ERROR' ? 400 :
                       result.error.code === 'NOT_FOUND' ? 404 : 500;
        return res.status(status).json({ error: result.error.message, code: result.error.code });
      }
      res.status(201).json(result.data);
    })
  );

  router.get(
    '/:accountId',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const result = await service.getAccount(req.params.accountId);
      if (isFailure(result)) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
        return res.status(status).json({ error: result.error.message });
      }
      res.json(result.data);
    })
  );

  router.post(
    '/:accountId/onboarding',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const { returnUrl, refreshUrl } = req.body;
      if (!returnUrl || !refreshUrl) {
        return res.status(400).json({ error: 'returnUrl and refreshUrl are required' });
      }
      const result = await service.startOnboarding(req.params.accountId, returnUrl, refreshUrl);
      if (isFailure(result)) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
        return res.status(status).json({ error: result.error.message });
      }
      res.json(result.data);
    })
  );

  router.post(
    '/:accountId/onboarding/complete',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const result = await service.completeOnboarding(req.params.accountId);
      if (isFailure(result)) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
        return res.status(status).json({ error: result.error.message });
      }
      res.json(result.data);
    })
  );

  return router;
}

// ============================================================================
// INVOICE ROUTES
// ============================================================================

export function createInvoiceRoutes(paymentService?: PaymentService): Router {
  const router = Router();
  const service = paymentService ?? getPaymentService();

  router.post(
    '/',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = (req as Request & { tenantId: string }).tenantId;
      const input: CreateInvoiceInput = { tenantId, ...req.body };
      const result = await service.createInvoice(input);

      if (isFailure(result)) {
        const status = result.error.code === 'VALIDATION_ERROR' ? 400 :
                       result.error.code === 'NOT_FOUND' ? 404 : 500;
        return res.status(status).json({ error: result.error.message, code: result.error.code });
      }
      res.status(201).json(result.data);
    })
  );

  router.get(
    '/:invoiceId',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const result = await service.getInvoice(req.params.invoiceId);
      if (isFailure(result)) {
        const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
        return res.status(status).json({ error: result.error.message });
      }
      res.json(result.data);
    })
  );

  router.post(
    '/:invoiceId/send',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const result = await service.sendInvoice(req.params.invoiceId);
      if (isFailure(result)) {
        const status = result.error.code === 'VALIDATION_ERROR' ? 400 :
                       result.error.code === 'NOT_FOUND' ? 404 : 500;
        return res.status(status).json({ error: result.error.message });
      }
      res.json(result.data);
    })
  );

  router.post(
    '/:invoiceId/pay',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const input: ProcessPaymentInput = { invoiceId: req.params.invoiceId, ...req.body };
      const result = await service.processPayment(input);

      if (isFailure(result)) {
        const status = result.error.code === 'VALIDATION_ERROR' ? 400 :
                       result.error.code === 'NOT_FOUND' ? 404 :
                       result.error.code === 'INVOICE_ALREADY_PAID' ? 409 :
                       result.error.code === 'PAYMENT_FAILED' ? 402 : 500;
        return res.status(status).json({ error: result.error.message, code: result.error.code });
      }
      res.json(result.data);
    })
  );

  return router;
}

// ============================================================================
// PAYOUT ROUTES
// ============================================================================

export function createPayoutRoutes(paymentService?: PaymentService): Router {
  const router = Router();
  const service = paymentService ?? getPaymentService();

  router.post(
    '/',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const input: CreatePayoutInput = req.body;
      const result = await service.createPayout(input);

      if (isFailure(result)) {
        const status = result.error.code === 'VALIDATION_ERROR' ? 400 :
                       result.error.code === 'NOT_FOUND' ? 404 :
                       result.error.code === 'INSUFFICIENT_FUNDS' ? 402 : 500;
        return res.status(status).json({ error: result.error.message, code: result.error.code });
      }
      res.status(201).json(result.data);
    })
  );

  return router;
}

// ============================================================================
// REFUND ROUTES
// ============================================================================

export function createRefundRoutes(paymentService?: PaymentService): Router {
  const router = Router();
  const service = paymentService ?? getPaymentService();

  router.post(
    '/',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const input: CreateRefundInput = req.body;
      const result = await service.processRefund(input);

      if (isFailure(result)) {
        const status = result.error.code === 'VALIDATION_ERROR' ? 400 :
                       result.error.code === 'NOT_FOUND' ? 404 :
                       result.error.code === 'REFUND_EXCEEDS_PAYMENT' ? 400 : 500;
        return res.status(status).json({ error: result.error.message, code: result.error.code });
      }
      res.status(201).json(result.data);
    })
  );

  return router;
}

// ============================================================================
// PROFILE BUILDER ROUTES
// ============================================================================

export function createProfileBuilderRoutes(profileService?: AIProfileBuilderService): Router {
  const router = Router();
  const service = profileService ?? getAIProfileBuilderService();

  router.post(
    '/sessions',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = (req as Request & { tenantId: string }).tenantId;
      const input: StartProfileSessionInput = { tenantId, tutorId: req.body.tutorId };
      const result = await service.startSession(input);

      if (isFailure(result)) {
        return res.status(500).json({ error: result.error.message });
      }

      profileSessions.set(result.data.id, result.data);
      res.status(201).json({
        sessionId: result.data.id,
        stage: result.data.stage,
        progress: result.data.progressPercentage,
        welcomeMessage: result.data.conversationHistory[0]?.content,
      });
    })
  );

  router.get(
    '/sessions/:sessionId',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const session = profileSessions.get(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json({
        sessionId: session.id,
        stage: session.stage,
        progress: session.progressPercentage,
        questionsCompleted: session.questionsCompleted,
        totalQuestions: session.totalQuestions,
      });
    })
  );

  router.post(
    '/sessions/:sessionId/answer',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const session = profileSessions.get(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const input: AnswerQuestionInput = {
        sessionId: req.params.sessionId,
        questionId: req.body.questionId,
        answer: req.body.answer,
      };
      const result = await service.processAnswer(session, input);

      if (isFailure(result)) {
        const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
        return res.status(status).json({ error: result.error.message });
      }

      profileSessions.set(req.params.sessionId, result.data.session);
      res.json({
        response: result.data.output.aiResponse,
        nextQuestion: result.data.output.nextQuestion,
        progress: result.data.output.progress,
        stage: result.data.output.stage,
        insights: result.data.output.extractedInsights,
      });
    })
  );

  router.post(
    '/sessions/:sessionId/generate',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const session = profileSessions.get(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const input: GenerateDraftsInput = {
        sessionId: req.params.sessionId,
        styles: req.body.styles,
        focusAreas: req.body.focusAreas,
      };
      const result = await service.generateDrafts(session, input);

      if (isFailure(result)) {
        return res.status(500).json({ error: result.error.message });
      }

      profileSessions.set(req.params.sessionId, result.data.session);
      res.json({
        drafts: {
          headlines: result.data.drafts.headlines,
          shortBios: result.data.drafts.shortBios,
          taglines: result.data.drafts.taglines,
          parentPitches: result.data.drafts.parentPitches,
        },
      });
    })
  );

  router.post(
    '/sessions/:sessionId/select',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const session = profileSessions.get(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const input: SelectDraftInput = {
        sessionId: req.params.sessionId,
        field: req.body.field,
        selectedText: req.body.selectedText,
        customEdit: req.body.customEdit,
      };
      const result = await service.selectDraft(session, input);

      if (isFailure(result)) {
        return res.status(500).json({ error: result.error.message });
      }

      profileSessions.set(req.params.sessionId, result.data);
      res.json({ success: true, selections: result.data.selections });
    })
  );

  router.post(
    '/sessions/:sessionId/publish',
    validateTenant,
    asyncHandler(async (req: Request, res: Response) => {
      const session = profileSessions.get(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const input: PublishProfileInput = {
        sessionId: req.params.sessionId,
        tutorId: session.tutorId,
      };
      const result = await service.publishProfile(session, input);

      if (isFailure(result)) {
        const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
        return res.status(status).json({ error: result.error.message });
      }

      profileSessions.delete(req.params.sessionId);
      res.json({
        profileId: result.data.id,
        status: result.data.status,
        completenessScore: result.data.aiContent.completenessScore,
      });
    })
  );

  return router;
}

// ============================================================================
// WEBHOOK ROUTES
// ============================================================================

export function createWebhookRoutes(): Router {
  const router = Router();

  router.post('/stripe', asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).json({ error: 'Missing Stripe signature' });
    }
    log.info('Received Stripe webhook', { type: req.body?.type, id: req.body?.id });
    res.json({ received: true });
  }));

  router.post('/xero', asyncHandler(async (req: Request, res: Response) => {
    log.info('Received Xero webhook', { payload: req.body });
    res.json({ received: true });
  }));

  return router;
}

// ============================================================================
// MAIN ROUTER
// ============================================================================

export function createPaymentRouter(): Router {
  const router = Router();
  router.use('/accounts', createAccountRoutes());
  router.use('/invoices', createInvoiceRoutes());
  router.use('/payouts', createPayoutRoutes());
  router.use('/refunds', createRefundRoutes());
  router.use('/profile-builder', createProfileBuilderRoutes());
  router.use('/webhooks', createWebhookRoutes());
  return router;
}

export default createPaymentRouter;
