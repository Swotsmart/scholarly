/**
 * Subscription Engine Routes
 *
 * API endpoints for plans, subscriptions, trials, seats, members,
 * entitlements, invoices, and subscription analytics.
 */

import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error-handler';

export const subscriptionsRouter: Router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const subscribeSchema = z.object({
  planId: z.string().min(1),
  options: z.object({
    billingCycle: z.enum(['monthly', 'quarterly', 'annual']).optional(),
    seats: z.number().int().min(1).optional(),
    couponCode: z.string().optional(),
    trialDays: z.number().int().min(0).optional(),
    paymentMethodId: z.string().optional(),
    metadata: z.record(z.string()).optional(),
  }).optional(),
});

const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().optional(),
  reason: z.string().max(500).optional(),
  feedback: z.string().max(2000).optional(),
});

const changePlanSchema = z.object({
  newPlanId: z.string().min(1),
  proration: z.enum(['immediate', 'next_cycle', 'none']).optional(),
});

const addSeatSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  label: z.string().max(100).optional(),
});

const assignSeatSchema = z.object({
  userId: z.string().min(1),
  role: z.string().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email().optional(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
});

const payInvoiceSchema = z.object({
  paymentMethodId: z.string().optional(),
  amount: z.number().positive().optional(),
  reference: z.string().optional(),
});

const checkEntitlementSchema = z.object({
  context: z.record(z.unknown()).optional(),
});

// ============================================================================
// Helper: extract user info
// ============================================================================

function getUserInfo(req: any): { tenantId: string; userId: string } {
  const tenantId = req.tenantId || req.user?.tenantId;
  const userId = req.user?.id;
  if (!tenantId || !userId) {
    throw ApiError.unauthorized('Authentication required');
  }
  return { tenantId, userId };
}

// ============================================================================
// Plans
// ============================================================================

/**
 * GET /subscriptions/plans
 * List all public subscription plans
 */
subscriptionsRouter.get('/plans', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);

    const plans = [
      {
        id: 'plan_starter_au',
        name: 'Starter',
        slug: 'starter',
        description: 'Perfect for individual learners and small families getting started with Scholarly.',
        tier: 'starter',
        currency: 'AUD',
        prices: [
          { billingCycle: 'monthly', amount: 0, displayAmount: 'Free' },
        ],
        features: [
          { key: 'max_learners', label: 'Learners', value: 2 },
          { key: 'ai_buddy_messages', label: 'AI Buddy messages/month', value: 50 },
          { key: 'portfolio_storage_mb', label: 'Portfolio storage', value: 500 },
          { key: 'curriculum_access', label: 'Australian Curriculum access', value: true },
        ],
        entitlements: ['basic_curriculum', 'ai_buddy_limited', 'portfolio_basic'],
        isPublic: true,
        trialDays: 0,
        tenantId,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-06-01T00:00:00.000Z',
      },
      {
        id: 'plan_family_au',
        name: 'Family',
        slug: 'family',
        description: 'Ideal for homeschool families needing full curriculum support, NESA compliance, and AI tutoring.',
        tier: 'family',
        currency: 'AUD',
        prices: [
          { billingCycle: 'monthly', amount: 2900, displayAmount: '$29.00/mo' },
          { billingCycle: 'annual', amount: 29000, displayAmount: '$290.00/yr' },
        ],
        features: [
          { key: 'max_learners', label: 'Learners', value: 6 },
          { key: 'ai_buddy_messages', label: 'AI Buddy messages/month', value: 500 },
          { key: 'portfolio_storage_mb', label: 'Portfolio storage', value: 5000 },
          { key: 'curriculum_access', label: 'Full Australian Curriculum + IB', value: true },
          { key: 'homeschool_compliance', label: 'NESA/VRQA homeschool compliance', value: true },
          { key: 'relief_teacher_access', label: 'Relief teacher marketplace', value: true },
        ],
        entitlements: [
          'full_curriculum', 'ai_buddy_standard', 'portfolio_full',
          'homeschool_compliance', 'relief_marketplace', 'linguaflow_basic',
        ],
        isPublic: true,
        trialDays: 14,
        tenantId,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-06-01T00:00:00.000Z',
      },
      {
        id: 'plan_school_au',
        name: 'School',
        slug: 'school',
        description: 'For registered schools and micro-schools. Full platform access with ACARA alignment and AITSL PD tracking.',
        tier: 'school',
        currency: 'AUD',
        prices: [
          { billingCycle: 'annual', amount: 599000, displayAmount: '$5,990.00/yr' },
        ],
        features: [
          { key: 'max_learners', label: 'Learners', value: 500 },
          { key: 'max_educators', label: 'Educators', value: 50 },
          { key: 'ai_buddy_messages', label: 'AI Buddy messages/month', value: 'unlimited' },
          { key: 'portfolio_storage_mb', label: 'Portfolio storage', value: 50000 },
          { key: 'eduscrum', label: 'EduScrum orchestration', value: true },
          { key: 'analytics_dashboard', label: 'Advanced analytics', value: true },
          { key: 'lti_integration', label: 'LTI 1.3 integration', value: true },
          { key: 'ssi_credentials', label: 'Verifiable Credentials', value: true },
        ],
        entitlements: [
          'full_curriculum', 'ai_buddy_unlimited', 'portfolio_full',
          'eduscrum', 'analytics_advanced', 'lti_integration',
          'ssi_credentials', 'relief_marketplace', 'linguaflow_full',
          'design_pitch', 'showcase_portfolio',
        ],
        isPublic: true,
        trialDays: 30,
        tenantId,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-06-01T00:00:00.000Z',
      },
      {
        id: 'plan_district_au',
        name: 'District',
        slug: 'district',
        description: 'Enterprise plan for education districts, state departments, and large organisations. Custom pricing.',
        tier: 'enterprise',
        currency: 'AUD',
        prices: [
          { billingCycle: 'annual', amount: null, displayAmount: 'Contact us' },
        ],
        features: [
          { key: 'max_learners', label: 'Learners', value: 'unlimited' },
          { key: 'max_educators', label: 'Educators', value: 'unlimited' },
          { key: 'sla', label: 'SLA', value: '99.95%' },
          { key: 'dedicated_support', label: 'Dedicated support', value: true },
          { key: 'data_residency', label: 'Australian data residency', value: true },
          { key: 'sso', label: 'SSO/SAML integration', value: true },
          { key: 'api_access', label: 'Full API access', value: true },
          { key: 'custom_branding', label: 'Custom branding', value: true },
        ],
        entitlements: ['all'],
        isPublic: true,
        trialDays: 0,
        tenantId,
        createdAt: '2025-01-15T00:00:00.000Z',
        updatedAt: '2025-06-01T00:00:00.000Z',
      },
    ];

    res.json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch plans');
  }
});

/**
 * GET /subscriptions/plans/:planId
 * Get plan details
 */
subscriptionsRouter.get('/plans/:planId', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { planId } = req.params;

    const planMap: Record<string, any> = {
      plan_starter_au: {
        id: 'plan_starter_au',
        name: 'Starter',
        slug: 'starter',
        tier: 'starter',
        currency: 'AUD',
        description: 'Perfect for individual learners and small families.',
        prices: [{ billingCycle: 'monthly', amount: 0, displayAmount: 'Free' }],
        features: [
          { key: 'max_learners', label: 'Learners', value: 2 },
          { key: 'ai_buddy_messages', label: 'AI Buddy messages/month', value: 50 },
        ],
        entitlements: ['basic_curriculum', 'ai_buddy_limited', 'portfolio_basic'],
        isPublic: true,
        trialDays: 0,
        tenantId,
      },
      plan_family_au: {
        id: 'plan_family_au',
        name: 'Family',
        slug: 'family',
        tier: 'family',
        currency: 'AUD',
        description: 'Ideal for homeschool families needing full curriculum support.',
        prices: [
          { billingCycle: 'monthly', amount: 2900, displayAmount: '$29.00/mo' },
          { billingCycle: 'annual', amount: 29000, displayAmount: '$290.00/yr' },
        ],
        features: [
          { key: 'max_learners', label: 'Learners', value: 6 },
          { key: 'homeschool_compliance', label: 'NESA/VRQA compliance', value: true },
        ],
        entitlements: ['full_curriculum', 'ai_buddy_standard', 'homeschool_compliance'],
        isPublic: true,
        trialDays: 14,
        tenantId,
      },
    };

    const plan = planMap[planId];
    if (!plan) {
      throw ApiError.notFound('Plan', planId);
    }

    res.json({
      success: true,
      data: { plan },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch plan details');
  }
});

// ============================================================================
// Subscriptions
// ============================================================================

/**
 * POST /subscriptions/subscribe
 * Subscribe to a plan
 */
subscriptionsRouter.post('/subscribe', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const data = subscribeSchema.parse(req.body);

    const now = new Date().toISOString();
    const trialEnd = data.options?.trialDays
      ? new Date(Date.now() + data.options.trialDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      userId,
      planId: data.planId,
      status: trialEnd ? 'trialing' : 'active',
      billingCycle: data.options?.billingCycle || 'monthly',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      trialStart: trialEnd ? now : null,
      trialEnd,
      seats: data.options?.seats || 1,
      metadata: data.options?.metadata || {},
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };

    res.status(201).json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid subscription request', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to create subscription');
  }
});

/**
 * GET /subscriptions/my-subscriptions
 * Get current user's active subscriptions
 */
subscriptionsRouter.get('/my-subscriptions', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);

    const subscriptions = [
      {
        id: 'sub_demo_family_001',
        tenantId,
        userId,
        planId: 'plan_family_au',
        planName: 'Family',
        status: 'active',
        billingCycle: 'annual',
        currentPeriodStart: '2025-09-01T00:00:00.000Z',
        currentPeriodEnd: '2026-09-01T00:00:00.000Z',
        trialStart: null,
        trialEnd: null,
        seats: 4,
        usedSeats: 3,
        cancelAtPeriodEnd: false,
        metadata: { jurisdiction: 'NSW', homeschoolRegNo: 'NESA-HS-2025-1234' },
        createdAt: '2025-08-15T10:00:00.000Z',
        updatedAt: '2025-09-01T00:00:00.000Z',
      },
    ];

    res.json({
      success: true,
      data: { subscriptions },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch subscriptions');
  }
});

/**
 * GET /subscriptions/:subscriptionId
 * Get subscription details
 */
subscriptionsRouter.get('/:subscriptionId', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { subscriptionId } = req.params;

    const subscription = {
      id: subscriptionId,
      tenantId,
      userId,
      planId: 'plan_family_au',
      planName: 'Family',
      status: 'active',
      billingCycle: 'annual',
      currentPeriodStart: '2025-09-01T00:00:00.000Z',
      currentPeriodEnd: '2026-09-01T00:00:00.000Z',
      trialStart: null,
      trialEnd: null,
      seats: 4,
      usedSeats: 3,
      members: [
        { userId: 'user_parent_001', email: 'sarah@example.com', role: 'owner', joinedAt: '2025-08-15T10:00:00.000Z' },
        { userId: 'user_child_001', email: null, role: 'member', joinedAt: '2025-08-15T10:05:00.000Z' },
        { userId: 'user_child_002', email: null, role: 'member', joinedAt: '2025-08-15T10:06:00.000Z' },
      ],
      entitlements: [
        'full_curriculum', 'ai_buddy_standard', 'portfolio_full',
        'homeschool_compliance', 'relief_marketplace', 'linguaflow_basic',
      ],
      cancelAtPeriodEnd: false,
      metadata: { jurisdiction: 'NSW', homeschoolRegNo: 'NESA-HS-2025-1234' },
      createdAt: '2025-08-15T10:00:00.000Z',
      updatedAt: '2025-09-01T00:00:00.000Z',
    };

    res.json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch subscription');
  }
});

/**
 * POST /subscriptions/:subscriptionId/cancel
 * Cancel a subscription
 */
subscriptionsRouter.post('/:subscriptionId/cancel', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { subscriptionId } = req.params;
    const data = cancelSubscriptionSchema.parse(req.body);

    const subscription = {
      id: subscriptionId,
      tenantId,
      userId,
      planId: 'plan_family_au',
      status: data.immediate ? 'cancelled' : 'active',
      cancelAtPeriodEnd: !data.immediate,
      cancelledAt: new Date().toISOString(),
      cancellationReason: data.reason || null,
      cancellationFeedback: data.feedback || null,
      effectiveCancelDate: data.immediate
        ? new Date().toISOString()
        : '2026-09-01T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid cancellation request', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to cancel subscription');
  }
});

/**
 * POST /subscriptions/:subscriptionId/pause
 * Pause a subscription
 */
subscriptionsRouter.post('/:subscriptionId/pause', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { subscriptionId } = req.params;

    const subscription = {
      id: subscriptionId,
      tenantId,
      userId,
      planId: 'plan_family_au',
      status: 'paused',
      pausedAt: new Date().toISOString(),
      resumeAt: null,
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to pause subscription');
  }
});

/**
 * POST /subscriptions/:subscriptionId/resume
 * Resume a paused subscription
 */
subscriptionsRouter.post('/:subscriptionId/resume', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { subscriptionId } = req.params;

    const subscription = {
      id: subscriptionId,
      tenantId,
      userId,
      planId: 'plan_family_au',
      status: 'active',
      pausedAt: null,
      resumedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to resume subscription');
  }
});

/**
 * POST /subscriptions/:subscriptionId/change-plan
 * Change subscription plan
 */
subscriptionsRouter.post('/:subscriptionId/change-plan', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { subscriptionId } = req.params;
    const data = changePlanSchema.parse(req.body);

    const subscription = {
      id: subscriptionId,
      tenantId,
      userId,
      previousPlanId: 'plan_family_au',
      planId: data.newPlanId,
      status: 'active',
      proration: data.proration || 'immediate',
      prorationAmount: data.proration === 'none' ? 0 : 1500,
      prorationCurrency: 'AUD',
      planChangedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid plan change request', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to change plan');
  }
});

// ============================================================================
// Trials
// ============================================================================

/**
 * GET /subscriptions/:subscriptionId/trial-progress
 * Get trial progress for a subscription
 */
subscriptionsRouter.get('/:subscriptionId/trial-progress', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { subscriptionId } = req.params;

    const trialProgress = {
      subscriptionId,
      tenantId,
      userId,
      planId: 'plan_family_au',
      trialStart: '2025-11-01T00:00:00.000Z',
      trialEnd: '2025-11-15T00:00:00.000Z',
      daysRemaining: 7,
      daysElapsed: 7,
      totalDays: 14,
      percentComplete: 50,
      usage: {
        aiMessages: { used: 120, limit: 500, percentUsed: 24 },
        portfolioStorage: { usedMb: 450, limitMb: 5000, percentUsed: 9 },
        learnersAdded: { used: 2, limit: 6, percentUsed: 33 },
        lessonsCompleted: 15,
        homeschoolReportsGenerated: 2,
      },
      conversionLikelihood: 'high',
      conversionRecommendation: 'The family has actively used homeschool compliance features - emphasise NESA reporting in conversion offer.',
    };

    res.json({
      success: true,
      data: { trialProgress },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch trial progress');
  }
});

/**
 * POST /subscriptions/:subscriptionId/convert-trial
 * Convert a trial to a paid subscription
 */
subscriptionsRouter.post('/:subscriptionId/convert-trial', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { subscriptionId } = req.params;

    const subscription = {
      id: subscriptionId,
      tenantId,
      userId,
      planId: 'plan_family_au',
      status: 'active',
      previousStatus: 'trialing',
      convertedAt: new Date().toISOString(),
      billingCycle: 'annual',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      firstInvoiceId: `inv_${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to convert trial');
  }
});

// ============================================================================
// Seats
// ============================================================================

/**
 * POST /subscriptions/:subscriptionId/seats
 * Add a seat to the subscription
 */
subscriptionsRouter.post('/:subscriptionId/seats', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { subscriptionId } = req.params;
    const data = addSeatSchema.parse(req.body);

    const seat = {
      id: `seat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      subscriptionId,
      tenantId,
      label: data.label || null,
      status: 'available',
      assignedUserId: null,
      assignedAt: null,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: {
        seat,
        totalSeats: 5,
        usedSeats: 3,
        availableSeats: 2,
        prorationCharge: { amount: 725, currency: 'AUD', description: 'Prorated seat addition' },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid seat request', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to add seat');
  }
});

/**
 * PUT /subscriptions/:subscriptionId/seats/:seatId/assign
 * Assign a seat to a user
 */
subscriptionsRouter.put('/:subscriptionId/seats/:seatId/assign', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { subscriptionId, seatId } = req.params;
    const data = assignSeatSchema.parse(req.body);

    const seat = {
      id: seatId,
      subscriptionId,
      tenantId,
      status: 'assigned',
      assignedUserId: data.userId,
      assignedRole: data.role || 'member',
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { seat },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid seat assignment', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to assign seat');
  }
});

/**
 * DELETE /subscriptions/:subscriptionId/seats/:seatId
 * Remove a seat from the subscription
 */
subscriptionsRouter.delete('/:subscriptionId/seats/:seatId', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { subscriptionId, seatId } = req.params;

    res.json({
      success: true,
      data: {
        removed: true,
        seatId,
        subscriptionId,
        tenantId,
        totalSeats: 3,
        usedSeats: 2,
        availableSeats: 1,
        creditAmount: { amount: 725, currency: 'AUD', description: 'Prorated seat removal credit' },
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to remove seat');
  }
});

// ============================================================================
// Members
// ============================================================================

/**
 * POST /subscriptions/:subscriptionId/members
 * Add a member to the subscription
 */
subscriptionsRouter.post('/:subscriptionId/members', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { subscriptionId } = req.params;
    const data = addMemberSchema.parse(req.body);

    const member = {
      id: `member_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      subscriptionId,
      tenantId,
      userId: data.userId,
      email: data.email || null,
      role: data.role || 'member',
      status: 'active',
      joinedAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: { member },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid member request', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to add member');
  }
});

/**
 * DELETE /subscriptions/:subscriptionId/members/:memberId
 * Remove a member from the subscription
 */
subscriptionsRouter.delete('/:subscriptionId/members/:memberId', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { subscriptionId, memberId } = req.params;

    res.json({
      success: true,
      data: {
        removed: true,
        memberId,
        subscriptionId,
        tenantId,
        removedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to remove member');
  }
});

// ============================================================================
// Entitlements
// ============================================================================

/**
 * GET /subscriptions/entitlements
 * Get current user's entitlements across all active subscriptions
 */
subscriptionsRouter.get('/entitlements', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);

    const entitlements = {
      userId,
      tenantId,
      activeSubscriptions: ['sub_demo_family_001'],
      effectivePlan: 'family',
      entitlements: [
        {
          key: 'full_curriculum',
          label: 'Full Australian Curriculum Access',
          granted: true,
          source: 'plan_family_au',
        },
        {
          key: 'ai_buddy_standard',
          label: 'AI Buddy - Standard',
          granted: true,
          source: 'plan_family_au',
          limits: { messagesPerMonth: 500, currentUsage: 127 },
        },
        {
          key: 'portfolio_full',
          label: 'Full Portfolio Features',
          granted: true,
          source: 'plan_family_au',
          limits: { storageMb: 5000, currentUsageMb: 1250 },
        },
        {
          key: 'homeschool_compliance',
          label: 'NESA/VRQA Homeschool Compliance',
          granted: true,
          source: 'plan_family_au',
        },
        {
          key: 'relief_marketplace',
          label: 'Relief Teacher Marketplace',
          granted: true,
          source: 'plan_family_au',
        },
        {
          key: 'linguaflow_basic',
          label: 'LinguaFlow Basic',
          granted: true,
          source: 'plan_family_au',
          limits: { languagesAvailable: 3, immersionMinutesPerMonth: 120, currentUsage: 45 },
        },
        {
          key: 'eduscrum',
          label: 'EduScrum Orchestration',
          granted: false,
          requiredPlan: 'school',
        },
        {
          key: 'analytics_advanced',
          label: 'Advanced Analytics',
          granted: false,
          requiredPlan: 'school',
        },
      ],
      evaluatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { entitlements },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch entitlements');
  }
});

/**
 * GET /subscriptions/entitlements/:key/check
 * Check a specific entitlement
 */
subscriptionsRouter.get('/entitlements/:key/check', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { key } = req.params;

    const grantedEntitlements: Record<string, any> = {
      full_curriculum: {
        key: 'full_curriculum',
        granted: true,
        label: 'Full Australian Curriculum Access',
        source: 'plan_family_au',
      },
      ai_buddy_standard: {
        key: 'ai_buddy_standard',
        granted: true,
        label: 'AI Buddy - Standard',
        source: 'plan_family_au',
        limits: { messagesPerMonth: 500, currentUsage: 127 },
        withinLimits: true,
      },
      homeschool_compliance: {
        key: 'homeschool_compliance',
        granted: true,
        label: 'NESA/VRQA Homeschool Compliance',
        source: 'plan_family_au',
      },
      eduscrum: {
        key: 'eduscrum',
        granted: false,
        label: 'EduScrum Orchestration',
        requiredPlan: 'school',
        upgradeUrl: '/subscriptions/plans/plan_school_au',
      },
    };

    const entitlement = grantedEntitlements[key] || {
      key,
      granted: false,
      label: key,
      requiredPlan: 'school',
      upgradeUrl: '/subscriptions/plans/plan_school_au',
    };

    res.json({
      success: true,
      data: {
        entitlement,
        userId,
        tenantId,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to check entitlement');
  }
});

// ============================================================================
// Invoices
// ============================================================================

/**
 * GET /subscriptions/:subscriptionId/invoices
 * Get invoices for a subscription
 */
subscriptionsRouter.get('/:subscriptionId/invoices', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { subscriptionId } = req.params;

    const invoices = [
      {
        id: 'inv_2025_09_001',
        subscriptionId,
        tenantId,
        userId,
        status: 'paid',
        currency: 'AUD',
        subtotal: 29000,
        tax: 2900,
        taxRate: 10,
        taxLabel: 'GST',
        total: 31900,
        displayTotal: '$319.00',
        billingPeriodStart: '2025-09-01T00:00:00.000Z',
        billingPeriodEnd: '2026-09-01T00:00:00.000Z',
        lineItems: [
          {
            description: 'Family Plan - Annual',
            quantity: 1,
            unitPrice: 29000,
            amount: 29000,
          },
        ],
        paidAt: '2025-09-01T00:05:00.000Z',
        paymentMethod: 'Visa ending 4242',
        invoiceUrl: `https://billing.scholarly.app/invoices/inv_2025_09_001`,
        createdAt: '2025-09-01T00:00:00.000Z',
      },
      {
        id: 'inv_2025_11_seat',
        subscriptionId,
        tenantId,
        userId,
        status: 'paid',
        currency: 'AUD',
        subtotal: 725,
        tax: 73,
        taxRate: 10,
        taxLabel: 'GST',
        total: 798,
        displayTotal: '$7.98',
        billingPeriodStart: '2025-11-15T00:00:00.000Z',
        billingPeriodEnd: '2026-09-01T00:00:00.000Z',
        lineItems: [
          {
            description: 'Additional seat (prorated)',
            quantity: 1,
            unitPrice: 725,
            amount: 725,
          },
        ],
        paidAt: '2025-11-15T14:20:00.000Z',
        paymentMethod: 'Visa ending 4242',
        invoiceUrl: `https://billing.scholarly.app/invoices/inv_2025_11_seat`,
        createdAt: '2025-11-15T14:15:00.000Z',
      },
    ];

    res.json({
      success: true,
      data: { invoices },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch invoices');
  }
});

/**
 * POST /subscriptions/:subscriptionId/invoices/:invoiceId/pay
 * Record payment for an invoice
 */
subscriptionsRouter.post('/:subscriptionId/invoices/:invoiceId/pay', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { subscriptionId, invoiceId } = req.params;
    const data = payInvoiceSchema.parse(req.body);

    const payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      invoiceId,
      subscriptionId,
      tenantId,
      userId,
      amount: data.amount || 31900,
      currency: 'AUD',
      status: 'succeeded',
      paymentMethodId: data.paymentMethodId || 'pm_default',
      reference: data.reference || null,
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { payment },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid payment request', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to process payment');
  }
});

// ============================================================================
// Analytics (admin)
// ============================================================================

/**
 * GET /subscriptions/analytics
 * Get subscription analytics (admin only)
 */
subscriptionsRouter.get('/analytics', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);

    const analytics = {
      tenantId,
      period: req.query.period || 'last_30_days',
      generatedAt: new Date().toISOString(),
      summary: {
        totalSubscriptions: 1247,
        activeSubscriptions: 1089,
        trialingSubscriptions: 98,
        pausedSubscriptions: 23,
        cancelledThisPeriod: 37,
        newThisPeriod: 142,
      },
      mrr: {
        current: 4523700,
        previous: 4198200,
        growthPercent: 7.75,
        currency: 'AUD',
        displayCurrent: '$45,237.00',
      },
      arr: {
        current: 54284400,
        currency: 'AUD',
        displayCurrent: '$542,844.00',
      },
      churn: {
        rate: 2.97,
        previousRate: 3.45,
        voluntaryChurn: 2.1,
        involuntaryChurn: 0.87,
      },
      trialConversion: {
        rate: 72.4,
        averageTrialDays: 11.3,
        topConversionPlan: 'Family',
      },
      planDistribution: [
        { planId: 'plan_starter_au', planName: 'Starter', count: 412, percent: 33.0 },
        { planId: 'plan_family_au', planName: 'Family', count: 534, percent: 42.8 },
        { planId: 'plan_school_au', planName: 'School', count: 127, percent: 10.2 },
        { planId: 'plan_district_au', planName: 'District', count: 16, percent: 1.3 },
      ],
      revenueByJurisdiction: [
        { jurisdiction: 'NSW', revenue: 1582000, percent: 35.0 },
        { jurisdiction: 'VIC', revenue: 1131000, percent: 25.0 },
        { jurisdiction: 'QLD', revenue: 905000, percent: 20.0 },
        { jurisdiction: 'WA', revenue: 452000, percent: 10.0 },
        { jurisdiction: 'SA', revenue: 271000, percent: 6.0 },
        { jurisdiction: 'Other', revenue: 182700, percent: 4.0 },
      ],
      topFeatureUsage: [
        { feature: 'ai_buddy', usagePercent: 89.2 },
        { feature: 'portfolio', usagePercent: 76.5 },
        { feature: 'curriculum_browser', usagePercent: 71.3 },
        { feature: 'homeschool_compliance', usagePercent: 48.7 },
        { feature: 'linguaflow', usagePercent: 34.2 },
      ],
    };

    res.json({
      success: true,
      data: { analytics },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch analytics');
  }
});
