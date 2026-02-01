/**
 * Scholarly Payment Service - API Routes
 * 
 * RESTful API endpoints for the payment service.
 * All financial operations are exposed through these endpoints.
 * 
 * @module ScholarlyPayment/Routes
 * @version 1.0.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  PaymentService,
  getPaymentService
} from '../services/payment.service';
import {
  AIProfileBuilderService,
  getAIProfileBuilderService
} from '../services/profile-builder.service';
import {
  logger,
  validators
} from '../infrastructure';
import {
  CreateAccountInput,
  CreateInvoiceInput,
  ProcessPaymentInput,
  CreatePayoutInput,
  CreateRefundInput
} from '../types';
import {
  StartProfileSessionInput,
  AnswerQuestionInput,
  GenerateDraftsInput,
  SelectDraftInput,
  PublishProfileInput
} from '../types/profile-builder';

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Async handler wrapper to catch errors
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => 
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Request validation middleware
 */
const validateTenant = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    return res.status(400).json({ error: 'Missing X-Tenant-ID header' });
  }
  req.tenantId = tenantId;
  next();
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

// ============================================================================
// ACCOUNT ROUTES
// ============================================================================

export function createAccountRoutes(paymentService?: PaymentService): Router {
  const router = Router();
  const service = paymentService ?? getPaymentService();

  /**
   * Create a new financial account
   * POST /api/payment/accounts
   */
  router.post('/', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const input: CreateAccountInput = {
      tenantId: req.tenantId!,
      ...req.body
    };

    const result = await service.createAccount(input);

    if (!result.success) {
      const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 
                     result.error.code === 'NOT_FOUND' ? 404 : 500;
      return res.status(status).json({ error: result.error.message, code: result.error.code });
    }

    res.status(201).json(result.data);
  }));

  /**
   * Get account by ID
   * GET /api/payment/accounts/:accountId
   */
  router.get('/:accountId', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const result = await service.getAccount(req.params.accountId);

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
      return res.status(status).json({ error: result.error.message });
    }

    res.json(result.data);
  }));

  /**
   * Start Stripe onboarding
   * POST /api/payment/accounts/:accountId/onboarding
   */
  router.post('/:accountId/onboarding', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const { returnUrl, refreshUrl } = req.body;

    if (!returnUrl || !refreshUrl) {
      return res.status(400).json({ error: 'returnUrl and refreshUrl are required' });
    }

    const result = await service.startOnboarding(req.params.accountId, returnUrl, refreshUrl);

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
      return res.status(status).json({ error: result.error.message });
    }

    res.json(result.data);
  }));

  /**
   * Complete onboarding (called after Stripe redirect)
   * POST /api/payment/accounts/:accountId/onboarding/complete
   */
  router.post('/:accountId/onboarding/complete', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const result = await service.completeOnboarding(req.params.accountId);

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
      return res.status(status).json({ error: result.error.message });
    }

    res.json(result.data);
  }));

  return router;
}

// ============================================================================
// INVOICE ROUTES
// ============================================================================

export function createInvoiceRoutes(paymentService?: PaymentService): Router {
  const router = Router();
  const service = paymentService ?? getPaymentService();

  /**
   * Create a new invoice
   * POST /api/payment/invoices
   */
  router.post('/', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const input: CreateInvoiceInput = {
      tenantId: req.tenantId!,
      ...req.body
    };

    const result = await service.createInvoice(input);

    if (!result.success) {
      const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 
                     result.error.code === 'NOT_FOUND' ? 404 : 500;
      return res.status(status).json({ error: result.error.message, code: result.error.code });
    }

    res.status(201).json(result.data);
  }));

  /**
   * Get invoice by ID
   * GET /api/payment/invoices/:invoiceId
   */
  router.get('/:invoiceId', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const result = await service.getInvoice(req.params.invoiceId);

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
      return res.status(status).json({ error: result.error.message });
    }

    res.json(result.data);
  }));

  /**
   * Send invoice
   * POST /api/payment/invoices/:invoiceId/send
   */
  router.post('/:invoiceId/send', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const result = await service.sendInvoice(req.params.invoiceId);

    if (!result.success) {
      const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 
                     result.error.code === 'NOT_FOUND' ? 404 : 500;
      return res.status(status).json({ error: result.error.message });
    }

    res.json(result.data);
  }));

  /**
   * Process payment for invoice
   * POST /api/payment/invoices/:invoiceId/pay
   */
  router.post('/:invoiceId/pay', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const input: ProcessPaymentInput = {
      invoiceId: req.params.invoiceId,
      ...req.body
    };

    const result = await service.processPayment(input);

    if (!result.success) {
      const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 
                     result.error.code === 'NOT_FOUND' ? 404 :
                     result.error.code === 'INVOICE_ALREADY_PAID' ? 409 :
                     result.error.code === 'PAYMENT_FAILED' ? 402 : 500;
      return res.status(status).json({ error: result.error.message, code: result.error.code });
    }

    res.json(result.data);
  }));

  return router;
}

// ============================================================================
// PAYOUT ROUTES
// ============================================================================

export function createPayoutRoutes(paymentService?: PaymentService): Router {
  const router = Router();
  const service = paymentService ?? getPaymentService();

  /**
   * Create a payout
   * POST /api/payment/payouts
   */
  router.post('/', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const input: CreatePayoutInput = req.body;

    const result = await service.createPayout(input);

    if (!result.success) {
      const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 
                     result.error.code === 'NOT_FOUND' ? 404 :
                     result.error.code === 'INSUFFICIENT_FUNDS' ? 402 : 500;
      return res.status(status).json({ error: result.error.message, code: result.error.code });
    }

    res.status(201).json(result.data);
  }));

  return router;
}

// ============================================================================
// REFUND ROUTES
// ============================================================================

export function createRefundRoutes(paymentService?: PaymentService): Router {
  const router = Router();
  const service = paymentService ?? getPaymentService();

  /**
   * Create a refund
   * POST /api/payment/refunds
   */
  router.post('/', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const input: CreateRefundInput = req.body;

    const result = await service.processRefund(input);

    if (!result.success) {
      const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 
                     result.error.code === 'NOT_FOUND' ? 404 :
                     result.error.code === 'REFUND_EXCEEDS_PAYMENT' ? 400 : 500;
      return res.status(status).json({ error: result.error.message, code: result.error.code });
    }

    res.status(201).json(result.data);
  }));

  return router;
}

// ============================================================================
// PROFILE BUILDER ROUTES
// ============================================================================

export function createProfileBuilderRoutes(profileService?: AIProfileBuilderService): Router {
  const router = Router();
  const service = profileService ?? getAIProfileBuilderService();

  // In-memory session storage (use Redis in production)
  const sessions = new Map<string, any>();

  /**
   * Start a new profile building session
   * POST /api/payment/profile-builder/sessions
   */
  router.post('/sessions', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const input: StartProfileSessionInput = {
      tenantId: req.tenantId!,
      tutorId: req.body.tutorId
    };

    const result = await service.startSession(input);

    if (!result.success) {
      return res.status(500).json({ error: result.error.message });
    }

    // Store session
    sessions.set(result.data.id, result.data);

    res.status(201).json({
      sessionId: result.data.id,
      stage: result.data.stage,
      progress: result.data.progressPercentage,
      welcomeMessage: result.data.conversationHistory[0]?.content
    });
  }));

  /**
   * Get session status
   * GET /api/payment/profile-builder/sessions/:sessionId
   */
  router.get('/sessions/:sessionId', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const session = sessions.get(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.id,
      stage: session.stage,
      progress: session.progressPercentage,
      questionsCompleted: session.questionsCompleted,
      totalQuestions: session.totalQuestions
    });
  }));

  /**
   * Answer a question
   * POST /api/payment/profile-builder/sessions/:sessionId/answer
   */
  router.post('/sessions/:sessionId/answer', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const session = sessions.get(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const input: AnswerQuestionInput = {
      sessionId: req.params.sessionId,
      questionId: req.body.questionId,
      answer: req.body.answer
    };

    const result = await service.processAnswer(session, input);

    if (!result.success) {
      const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
      return res.status(status).json({ error: result.error.message });
    }

    // Update stored session
    sessions.set(req.params.sessionId, result.data.session);

    res.json({
      response: result.data.output.aiResponse,
      nextQuestion: result.data.output.nextQuestion,
      progress: result.data.output.progress,
      stage: result.data.output.stage,
      insights: result.data.output.extractedInsights
    });
  }));

  /**
   * Generate profile drafts
   * POST /api/payment/profile-builder/sessions/:sessionId/generate
   */
  router.post('/sessions/:sessionId/generate', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const session = sessions.get(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const input: GenerateDraftsInput = {
      sessionId: req.params.sessionId,
      styles: req.body.styles,
      focusAreas: req.body.focusAreas
    };

    const result = await service.generateDrafts(session, input);

    if (!result.success) {
      return res.status(500).json({ error: result.error.message });
    }

    // Update stored session
    sessions.set(req.params.sessionId, result.data.session);

    res.json({
      drafts: {
        headlines: result.data.drafts.headlines,
        shortBios: result.data.drafts.shortBios,
        taglines: result.data.drafts.taglines,
        parentPitches: result.data.drafts.parentPitches
      }
    });
  }));

  /**
   * Select a draft option
   * POST /api/payment/profile-builder/sessions/:sessionId/select
   */
  router.post('/sessions/:sessionId/select', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const session = sessions.get(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const input: SelectDraftInput = {
      sessionId: req.params.sessionId,
      field: req.body.field,
      selectedText: req.body.selectedText,
      customEdit: req.body.customEdit
    };

    const result = await service.selectDraft(session, input);

    if (!result.success) {
      return res.status(500).json({ error: result.error.message });
    }

    // Update stored session
    sessions.set(req.params.sessionId, result.data);

    res.json({ success: true, selections: result.data.selections });
  }));

  /**
   * Publish the profile
   * POST /api/payment/profile-builder/sessions/:sessionId/publish
   */
  router.post('/sessions/:sessionId/publish', validateTenant, asyncHandler(async (req: Request, res: Response) => {
    const session = sessions.get(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const input: PublishProfileInput = {
      sessionId: req.params.sessionId,
      tutorId: session.tutorId
    };

    const result = await service.publishProfile(session, input);

    if (!result.success) {
      const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
      return res.status(status).json({ error: result.error.message });
    }

    // Clean up session
    sessions.delete(req.params.sessionId);

    res.json({
      profileId: result.data.id,
      status: result.data.status,
      completenessScore: result.data.aiContent.completenessScore
    });
  }));

  return router;
}

// ============================================================================
// WEBHOOK ROUTES
// ============================================================================

export function createWebhookRoutes(): Router {
  const router = Router();

  /**
   * Stripe webhook handler
   * POST /api/payment/webhooks/stripe
   */
  router.post('/stripe', asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).json({ error: 'Missing Stripe signature' });
    }

    // In production, verify signature and process webhook
    logger.info('Received Stripe webhook', { 
      type: req.body.type,
      id: req.body.id
    });

    // TODO: Process webhook events
    // - payment_intent.succeeded -> update invoice
    // - transfer.paid -> update payout
    // - account.updated -> update account status

    res.json({ received: true });
  }));

  /**
   * Xero webhook handler
   * POST /api/payment/webhooks/xero
   */
  router.post('/xero', asyncHandler(async (req: Request, res: Response) => {
    logger.info('Received Xero webhook', { payload: req.body });

    // TODO: Process Xero webhook events
    // - invoice payment notifications
    // - bank feed updates

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
