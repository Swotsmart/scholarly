/**
 * Universal Subscription Engine Service
 *
 * A comprehensive subscription management service handling the full lifecycle
 * of subscriptions across multiple platforms (Chekd-ID, Scholarly, and future products).
 *
 * Capabilities:
 * - Multi-tenant, multi-vendor subscription management
 * - KYC-gated plan access with credential requirements
 * - Seat-based pricing for institutional customers
 * - Intent-based trial system with conversion tracking
 * - Family/group subscription support
 * - Institutional billing (invoicing, PO support)
 * - Credential-linked entitlements with expiry handling
 * - Payment processing with dunning and retry
 * - Revenue share mechanics
 * - Subscription analytics
 *
 * @version 2.0.0
 * @author Chekd Platform Team
 */

import { log } from '../lib/logger';

import {
  SubscriptionStatus,
  PricingModel,
  BillingInterval,
  BillingType,
  InvoiceStatus,
  InvoiceTerms,
  EntitlementType,
  KycLevel,
  CredentialType,
  CredentialStatus,
  DunningStatus,
  ProrationBehavior,
  SeatStatus,
  SubscriptionType,
  SubscriptionPlan,
  PlanPricing,
  PlanEntitlement,
  PlanKycRequirements,
  TrialConfig,
  TrialProgress,
  Subscription,
  SubscriptionSeat,
  SubscriptionMember,
  SubscriptionInvoice,
  RevenueShare,
  GrantedEntitlement,
  SubscriptionAnalytics,
  SubscribeOptions,
  PlanChangeResult,
  KycCheckResult,
  TrialIntent,
  SubscriptionEventType,
  SubscriptionRepository,
  KycServiceInterface,
  PaymentServiceInterface,
} from './subscription-engine-types';

// ============================================================================
// LOCAL RESULT TYPE
// ============================================================================

/**
 * Local Result type to avoid conflicts with base.service Result (which uses ScholarlyError).
 * This service uses its own error classes that extend Error directly.
 */
export type SubscriptionResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

type Result<T> = SubscriptionResult<T>;

function success<T>(data: T): Result<T> {
  return { success: true, data };
}

function failure<T>(error: Error): Result<T> {
  return { success: false, error };
}

export { success as subscriptionSuccess, failure as subscriptionFailure };

// ============================================================================
// EXTERNAL SERVICE INTERFACES
// ============================================================================

/**
 * Logger interface for the subscription service
 */
interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

/**
 * Event bus interface for publishing subscription events
 */
interface EventBus {
  publish(topic: string, tenantId: string, data: Record<string, any>): Promise<void>;
}

/**
 * OTP service interface for verification codes
 */
interface OtpService {
  sendOtp(userId: string, channel: string): Promise<void>;
  verifyOtp(userId: string, code: string): Promise<boolean>;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base subscription error
 */
export class SubscriptionError extends Error {
  public readonly code: string;
  public readonly details?: string;

  constructor(message: string, code: string, details?: string) {
    super(message);
    this.name = 'SubscriptionError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Subscription not found error
 */
export class SubscriptionNotFoundError extends SubscriptionError {
  constructor(subscriptionId: string) {
    super(
      `Subscription '${subscriptionId}' not found`,
      'SUBSCRIPTION_NOT_FOUND',
      subscriptionId
    );
    this.name = 'SubscriptionNotFoundError';
  }
}

/**
 * Plan not found error
 */
export class PlanNotFoundError extends SubscriptionError {
  constructor(planId: string) {
    super(`Plan '${planId}' not found`, 'PLAN_NOT_FOUND', planId);
    this.name = 'PlanNotFoundError';
  }
}

/**
 * Invalid state transition error
 */
export class InvalidStateError extends SubscriptionError {
  public readonly currentState: string;
  public readonly allowedStates: string[];

  constructor(message: string, currentState: string, allowedStates: string[]) {
    super(
      message,
      'INVALID_STATE',
      `Current: ${currentState}, Allowed: ${allowedStates.join(', ')}`
    );
    this.name = 'InvalidStateError';
    this.currentState = currentState;
    this.allowedStates = allowedStates;
  }
}

/**
 * KYC requirements not met error
 */
export class KycRequiredError extends SubscriptionError {
  public readonly kycResult: KycCheckResult;

  constructor(kycResult: KycCheckResult) {
    super(
      'KYC requirements not met',
      'KYC_REQUIRED',
      kycResult.instructions
    );
    this.name = 'KycRequiredError';
    this.kycResult = kycResult;
  }
}

/**
 * Credentials required error
 */
export class CredentialsRequiredError extends SubscriptionError {
  public readonly missingCredentials: CredentialType[];

  constructor(missingCredentials: CredentialType[]) {
    super(
      'Required credentials are missing',
      'CREDENTIALS_REQUIRED',
      `Missing: ${missingCredentials.join(', ')}`
    );
    this.name = 'CredentialsRequiredError';
    this.missingCredentials = missingCredentials;
  }
}

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

/**
 * Configuration for the subscription service
 */
export interface SubscriptionServiceConfig {
  /** Platform identifier (e.g., 'scholarly', 'chekd') */
  platformId: string;
  /** Maximum retry attempts for failed payments */
  maxRetryAttempts: number;
  /** Days before credential expiry to send warning */
  credentialExpiryWarningDays: number;
  /** Hours between dunning retry attempts */
  dunningRetryIntervalHours: number;
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

/**
 * Universal Subscription Service
 *
 * Manages the full lifecycle of subscriptions including creation, billing,
 * trial management, seat allocation, entitlements, and analytics.
 */
export class UniversalSubscriptionService {
  private readonly repo: SubscriptionRepository;
  private readonly kycService: KycServiceInterface;
  private readonly paymentService: PaymentServiceInterface;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly config: SubscriptionServiceConfig;

  constructor(
    repo: SubscriptionRepository,
    kycService: KycServiceInterface,
    paymentService: PaymentServiceInterface,
    eventBus: EventBus,
    logger: Logger,
    config: SubscriptionServiceConfig
  ) {
    this.repo = repo;
    this.kycService = kycService;
    this.paymentService = paymentService;
    this.eventBus = eventBus;
    this.logger = logger;
    this.config = config;
  }

  // ==========================================================================
  // SUBSCRIPTION LIFECYCLE - Part 1
  // ==========================================================================

  /**
   * Create a new subscription
   *
   * Handles KYC checks, trial setup, seat allocation, and entitlement granting.
   */
  async subscribe(
    tenantId: string,
    customerId: string,
    planId: string,
    options: SubscribeOptions = {}
  ): Promise<Result<Subscription>> {
    try {
      this.logger.info('Creating subscription', { tenantId, customerId, planId });

      // Fetch plan
      const plan = await this.repo.getPlan(tenantId, planId);
      if (!plan) {
        return failure(new PlanNotFoundError(planId));
      }

      // Verify plan is active
      if (plan.status !== 'active') {
        return failure(new SubscriptionError(
          `Plan '${planId}' is not active (status: ${plan.status})`,
          'PLAN_NOT_ACTIVE'
        ));
      }

      // Check max subscribers
      if (plan.limits?.maxSubscribers && plan.subscriberCount >= plan.limits.maxSubscribers) {
        return failure(new SubscriptionError(
          'Plan has reached maximum subscriber limit',
          'PLAN_CAPACITY_REACHED'
        ));
      }

      // Check KYC requirements
      if (plan.kycRequirements) {
        const kycResult = await this.checkKycRequirements(tenantId, customerId, plan.kycRequirements);
        if (!kycResult.passed) {
          return failure(new KycRequiredError(kycResult));
        }
      }

      // Check for existing subscription to this plan
      const existing = await this.repo.getSubscriptionByCustomer(tenantId, customerId, planId);
      if (existing && [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING].includes(existing.status)) {
        return failure(new SubscriptionError(
          'Customer already has an active subscription to this plan',
          'DUPLICATE_SUBSCRIPTION'
        ));
      }

      // Determine trial config
      const trialConfig = this.getTrialConfig(plan, options);
      const isTrialing = !!trialConfig;

      // Determine subscription type
      const subType = this.determineSubscriptionType(plan, options);

      const now = new Date();
      let periodEnd: Date;
      let trialEnd: Date | undefined;

      if (isTrialing) {
        trialEnd = new Date(now.getTime() + trialConfig!.durationDays * 24 * 60 * 60 * 1000);
        periodEnd = trialEnd;
      } else {
        periodEnd = this.calculatePeriodEnd(now, plan.pricing);
      }

      // Create subscription record
      const subscription = await this.repo.createSubscription({
        tenantId,
        planId,
        vendorId: plan.vendorId,
        customerId,
        type: subType,
        status: isTrialing ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialStart: isTrialing ? now : undefined,
        trialEnd,
        trialIntent: options.trialIntent,
        trialMetrics: isTrialing ? {} : undefined,
        trialLimitsUsed: isTrialing ? {} : undefined,
        seatCount: options.initialSeatCount || (plan.pricing.seatConfig?.minSeats),
        purchaseOrderNumber: options.purchaseOrderNumber,
        autoRenew: true,
        dunningStatus: DunningStatus.NONE,
        failedPaymentCount: 0,
        metadata: options.metadata,
        acquisitionSource: options.acquisitionSource,
        promoCode: options.promoCode,
      });

      // Handle seat-based plans
      if (plan.pricing.seatConfig && options.initialSeatCount) {
        await this.createInitialSeats(
          subscription.id,
          options.initialSeatCount,
          plan.pricing.seatConfig.seatType
        );
      }

      // Handle initial members (family/team)
      if (options.initialMembers && options.initialMembers.length > 0) {
        for (const member of options.initialMembers) {
          await this.repo.addMember({
            subscriptionId: subscription.id,
            userId: member.userId,
            role: member.role,
            joinedAt: now,
            addedBy: customerId,
            isActive: true,
          });
        }
      }

      // Grant entitlements
      if (isTrialing && trialConfig!.trialEntitlements) {
        await this.grantEntitlements(tenantId, customerId, subscription.id, trialConfig!.trialEntitlements, plan);
      } else {
        await this.grantEntitlements(tenantId, customerId, subscription.id, plan.entitlements, plan);
      }

      // Increment subscriber count
      await this.repo.incrementSubscriberCount(planId);

      // Publish event
      const eventType = isTrialing ? 'subscription.trial_started' : 'subscription.created';
      await this.publishEvent(eventType, tenantId, {
        subscriptionId: subscription.id,
        customerId,
        planId,
        type: subType,
        trialIntent: options.trialIntent,
      });

      // Process initial payment for non-trial, immediate billing
      if (!isTrialing && plan.pricing.billingType === BillingType.IMMEDIATE) {
        await this.processPayment(subscription, plan);
      } else if (!isTrialing && plan.pricing.billingType === BillingType.INVOICE) {
        await this.generateInvoice(tenantId, subscription.id);
      }

      this.logger.info('Subscription created successfully', {
        subscriptionId: subscription.id,
        status: subscription.status,
      });

      return success(subscription);
    } catch (error) {
      this.logger.error('Failed to create subscription', {
        tenantId,
        customerId,
        planId,
        error: (error as Error).message,
      });
      return failure(error as Error);
    }
  }

  /**
   * Cancel a subscription
   *
   * Can be scheduled (cancel at period end) or immediate.
   */
  async cancelSubscription(
    tenantId: string,
    subscriptionId: string,
    cancelImmediately: boolean = false
  ): Promise<Result<Subscription>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      const cancellableStatuses = [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIALING,
        SubscriptionStatus.PAST_DUE,
        SubscriptionStatus.PAUSED,
      ];

      if (!cancellableStatuses.includes(sub.status)) {
        return failure(new InvalidStateError(
          'Subscription cannot be canceled in its current state',
          sub.status,
          cancellableStatuses
        ));
      }

      const now = new Date();
      const updates: Partial<Subscription> = {
        canceledAt: now,
      };

      if (cancelImmediately) {
        updates.status = SubscriptionStatus.CANCELED;
        updates.endedAt = now;
        updates.cancelAt = now;

        // Revoke entitlements immediately
        const plan = await this.repo.getPlan(tenantId, sub.planId);
        if (plan) {
          await this.revokeAllEntitlements(tenantId, sub.customerId, subscriptionId, plan.entitlements);
        }

        // Decrement subscriber count
        await this.repo.decrementSubscriberCount(sub.planId);
      } else {
        // Schedule cancellation at period end
        updates.status = SubscriptionStatus.CANCELED;
        updates.cancelAt = sub.currentPeriodEnd;
      }

      const updated = await this.repo.updateSubscription(subscriptionId, updates);

      await this.publishEvent('subscription.canceled', tenantId, {
        subscriptionId,
        customerId: sub.customerId,
        planId: sub.planId,
        cancelImmediately,
        cancelAt: updates.cancelAt,
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(
    tenantId: string,
    subscriptionId: string
  ): Promise<Result<Subscription>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      if (sub.status !== SubscriptionStatus.ACTIVE) {
        return failure(new InvalidStateError(
          'Only active subscriptions can be paused',
          sub.status,
          [SubscriptionStatus.ACTIVE]
        ));
      }

      const updated = await this.repo.updateSubscription(subscriptionId, {
        status: SubscriptionStatus.PAUSED,
      });

      await this.publishEvent('subscription.paused', tenantId, {
        subscriptionId,
        customerId: sub.customerId,
        planId: sub.planId,
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(
    tenantId: string,
    subscriptionId: string
  ): Promise<Result<Subscription>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      if (sub.status !== SubscriptionStatus.PAUSED) {
        return failure(new InvalidStateError(
          'Only paused subscriptions can be resumed',
          sub.status,
          [SubscriptionStatus.PAUSED]
        ));
      }

      const updated = await this.repo.updateSubscription(subscriptionId, {
        status: SubscriptionStatus.ACTIVE,
      });

      await this.publishEvent('subscription.resumed', tenantId, {
        subscriptionId,
        customerId: sub.customerId,
        planId: sub.planId,
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Change subscription plan with proration support
   */
  async changePlan(
    tenantId: string,
    subscriptionId: string,
    newPlanId: string,
    proration: ProrationBehavior = ProrationBehavior.IMMEDIATE_PRORATE
  ): Promise<Result<PlanChangeResult>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      if (sub.status !== SubscriptionStatus.ACTIVE) {
        return failure(new InvalidStateError(
          'Only active subscriptions can change plans',
          sub.status,
          [SubscriptionStatus.ACTIVE]
        ));
      }

      const oldPlan = await this.repo.getPlan(tenantId, sub.planId);
      const newPlan = await this.repo.getPlan(tenantId, newPlanId);

      if (!oldPlan) {
        return failure(new PlanNotFoundError(sub.planId));
      }
      if (!newPlan) {
        return failure(new PlanNotFoundError(newPlanId));
      }

      // Check KYC requirements for new plan
      if (newPlan.kycRequirements) {
        const kycResult = await this.checkKycRequirements(tenantId, sub.customerId, newPlan.kycRequirements);
        if (!kycResult.passed) {
          return failure(new KycRequiredError(kycResult));
        }
      }

      const now = new Date();
      let effectiveAt = now;
      let proratedAmount: number | undefined;
      let creditApplied: number | undefined;

      // Calculate proration
      if (proration === ProrationBehavior.NEXT_CYCLE) {
        effectiveAt = sub.currentPeriodEnd;
      } else if (proration === ProrationBehavior.IMMEDIATE_PRORATE) {
        const totalPeriodMs = sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime();
        const elapsedMs = now.getTime() - sub.currentPeriodStart.getTime();
        const remainingRatio = Math.max(0, 1 - (elapsedMs / totalPeriodMs));

        const oldAmount = this.calculatePaymentAmount(sub, oldPlan);
        const newAmount = this.calculatePaymentAmount(sub, newPlan);

        const unusedCredit = oldAmount * remainingRatio;
        const newProratedCost = newAmount * remainingRatio;

        proratedAmount = Math.round((newProratedCost - unusedCredit) * 100) / 100;
        if (proratedAmount < 0) {
          creditApplied = Math.abs(proratedAmount);
          proratedAmount = 0;
        }
      } else if (proration === ProrationBehavior.CREATE_CREDIT) {
        const totalPeriodMs = sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime();
        const elapsedMs = now.getTime() - sub.currentPeriodStart.getTime();
        const remainingRatio = Math.max(0, 1 - (elapsedMs / totalPeriodMs));

        const oldAmount = this.calculatePaymentAmount(sub, oldPlan);
        creditApplied = Math.round(oldAmount * remainingRatio * 100) / 100;
      }

      // Update entitlements
      const oldEntitlementKeys = oldPlan.entitlements.map(e => e.key);
      const newEntitlementKeys = newPlan.entitlements.map(e => e.key);

      const entitlementsToRemove = oldPlan.entitlements.filter(e => !newEntitlementKeys.includes(e.key));
      const entitlementsToAdd = newPlan.entitlements.filter(e => !oldEntitlementKeys.includes(e.key));

      if (effectiveAt.getTime() === now.getTime()) {
        // Revoke old entitlements not in new plan
        await this.revokeAllEntitlements(tenantId, sub.customerId, subscriptionId, entitlementsToRemove);
        // Grant new entitlements not in old plan
        await this.grantEntitlements(tenantId, sub.customerId, subscriptionId, entitlementsToAdd, newPlan);
      }

      // Determine if upgrade or downgrade
      const isUpgrade = newPlan.pricing.amount > oldPlan.pricing.amount;
      const eventType = isUpgrade ? 'subscription.upgraded' : 'subscription.downgraded';

      // Update subscription
      const updates: Partial<Subscription> = {
        planId: newPlanId,
      };

      if (proration !== ProrationBehavior.NEXT_CYCLE) {
        const newPeriodEnd = this.calculatePeriodEnd(now, newPlan.pricing);
        updates.currentPeriodStart = now;
        updates.currentPeriodEnd = newPeriodEnd;
        updates.nextPaymentAt = newPeriodEnd;
      }

      const updated = await this.repo.updateSubscription(subscriptionId, updates);

      await this.publishEvent(eventType, tenantId, {
        subscriptionId,
        customerId: sub.customerId,
        fromPlanId: sub.planId,
        toPlanId: newPlanId,
        proration,
        proratedAmount,
        creditApplied,
      });

      return success({
        subscription: updated,
        proratedAmount,
        creditApplied,
        effectiveAt,
        entitlementsAdded: entitlementsToAdd.map(e => e.key),
        entitlementsRemoved: entitlementsToRemove.map(e => e.key),
      });
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Get a subscription by ID
   */
  async getSubscription(
    tenantId: string,
    subscriptionId: string
  ): Promise<Result<Subscription>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }
      return success(sub);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Get all active subscriptions for a customer
   */
  async getActiveSubscriptions(
    tenantId: string,
    customerId: string
  ): Promise<Result<Subscription[]>> {
    try {
      const subs = await this.repo.getActiveSubscriptions(tenantId, customerId);
      return success(subs);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // SEAT MANAGEMENT
  // ==========================================================================

  /**
   * Add a seat to a seat-based subscription
   */
  async addSeat(
    tenantId: string,
    subscriptionId: string,
    seatType: string,
    assignToUserId?: string
  ): Promise<Result<SubscriptionSeat>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      const plan = await this.repo.getPlan(tenantId, sub.planId);
      if (!plan || !plan.pricing.seatConfig) {
        return failure(new SubscriptionError(
          'Plan does not support seat-based pricing',
          'SEATS_NOT_SUPPORTED'
        ));
      }

      // Check max seats
      if (plan.pricing.seatConfig.maxSeats) {
        const currentSeats = await this.repo.getSeats(subscriptionId);
        if (currentSeats.length >= plan.pricing.seatConfig.maxSeats) {
          return failure(new SubscriptionError(
            'Maximum seat limit reached',
            'MAX_SEATS_REACHED'
          ));
        }
      }

      // Check mid-cycle additions
      if (!plan.pricing.seatConfig.allowMidCycleAdditions) {
        return failure(new SubscriptionError(
          'Mid-cycle seat additions are not allowed for this plan',
          'MID_CYCLE_NOT_ALLOWED'
        ));
      }

      const seat = await this.repo.createSeat({
        subscriptionId,
        status: assignToUserId ? SeatStatus.ASSIGNED : SeatStatus.AVAILABLE,
        seatType,
        userId: assignToUserId,
        assignedAt: assignToUserId ? new Date() : undefined,
      });

      // Update seat count
      await this.repo.updateSubscription(subscriptionId, {
        seatCount: (sub.seatCount || 0) + 1,
      });

      await this.publishEvent('seat.added', tenantId, {
        subscriptionId,
        seatId: seat.id,
        seatType,
        assignedTo: assignToUserId,
      });

      return success(seat);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Assign a seat to a user
   */
  async assignSeat(
    tenantId: string,
    subscriptionId: string,
    seatId: string,
    userId: string
  ): Promise<Result<SubscriptionSeat>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      const seat = await this.repo.getSeat(subscriptionId, seatId);
      if (!seat) {
        return failure(new SubscriptionError('Seat not found', 'SEAT_NOT_FOUND'));
      }

      if (seat.status === SeatStatus.ASSIGNED) {
        return failure(new SubscriptionError(
          'Seat is already assigned',
          'SEAT_ALREADY_ASSIGNED'
        ));
      }

      const updated = await this.repo.updateSeat(seatId, {
        userId,
        status: SeatStatus.ASSIGNED,
        assignedAt: new Date(),
      });

      // Grant entitlements to the assigned user
      const plan = await this.repo.getPlan(tenantId, sub.planId);
      if (plan) {
        await this.grantEntitlements(tenantId, userId, subscriptionId, plan.entitlements, plan);
      }

      await this.publishEvent('seat.assigned', tenantId, {
        subscriptionId,
        seatId,
        userId,
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Remove a seat from a subscription
   */
  async removeSeat(
    tenantId: string,
    subscriptionId: string,
    seatId: string
  ): Promise<Result<void>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      const seat = await this.repo.getSeat(subscriptionId, seatId);
      if (!seat) {
        return failure(new SubscriptionError('Seat not found', 'SEAT_NOT_FOUND'));
      }

      const plan = await this.repo.getPlan(tenantId, sub.planId);

      // Check minimum seats
      if (plan?.pricing.seatConfig) {
        const currentSeats = await this.repo.getSeats(subscriptionId);
        if (currentSeats.length <= plan.pricing.seatConfig.minSeats) {
          return failure(new SubscriptionError(
            'Cannot go below minimum seat count',
            'MIN_SEATS_REACHED'
          ));
        }
      }

      // Revoke entitlements if seat was assigned
      if (seat.userId && plan) {
        await this.revokeAllEntitlements(tenantId, seat.userId, subscriptionId, plan.entitlements);
      }

      await this.repo.deleteSeat(seatId);

      // Update seat count
      await this.repo.updateSubscription(subscriptionId, {
        seatCount: Math.max(0, (sub.seatCount || 1) - 1),
      });

      await this.publishEvent('seat.removed', tenantId, {
        subscriptionId,
        seatId,
        previousUserId: seat.userId,
      });

      return success(undefined);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // MEMBER MANAGEMENT
  // ==========================================================================

  /**
   * Add a member to a family/team subscription
   */
  async addMember(
    tenantId: string,
    subscriptionId: string,
    userId: string,
    role: SubscriptionMember['role']
  ): Promise<Result<SubscriptionMember>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      // Check max members
      if (sub.maxMembers) {
        const members = await this.repo.getMembers(subscriptionId);
        if (members.length >= sub.maxMembers) {
          return failure(new SubscriptionError(
            'Maximum member limit reached',
            'MAX_MEMBERS_REACHED'
          ));
        }
      }

      // Check if already a member
      const existingMember = await this.repo.getMemberByUserId(subscriptionId, userId);
      if (existingMember) {
        return failure(new SubscriptionError(
          'User is already a member of this subscription',
          'DUPLICATE_MEMBER'
        ));
      }

      const member = await this.repo.addMember({
        subscriptionId,
        userId,
        role,
        joinedAt: new Date(),
        addedBy: sub.customerId,
        isActive: true,
      });

      // Grant entitlements to new member
      const plan = await this.repo.getPlan(tenantId, sub.planId);
      if (plan) {
        // Filter entitlements based on member scope
        const memberEntitlements = plan.entitlements.filter(e => {
          if (!e.memberScope || e.memberScope === 'all_members') return true;
          if (e.memberScope === 'primary_only') return false;
          if (e.memberScope === 'children_only') return role === 'child';
          if (e.memberScope === 'adults_only') return role !== 'child';
          return true;
        });
        await this.grantEntitlements(tenantId, userId, subscriptionId, memberEntitlements, plan);
      }

      await this.publishEvent('member.added', tenantId, {
        subscriptionId,
        memberId: member.id,
        userId,
        role,
      });

      return success(member);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Remove a member from a subscription
   */
  async removeMember(
    tenantId: string,
    subscriptionId: string,
    memberId: string
  ): Promise<Result<void>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      const members = await this.repo.getMembers(subscriptionId);
      const member = members.find(m => m.id === memberId);
      if (!member) {
        return failure(new SubscriptionError('Member not found', 'MEMBER_NOT_FOUND'));
      }

      // Cannot remove primary member
      if (member.role === 'primary') {
        return failure(new SubscriptionError(
          'Cannot remove the primary subscription holder',
          'CANNOT_REMOVE_PRIMARY'
        ));
      }

      // Revoke entitlements
      const plan = await this.repo.getPlan(tenantId, sub.planId);
      if (plan) {
        await this.revokeAllEntitlements(tenantId, member.userId, subscriptionId, plan.entitlements);
      }

      await this.repo.removeMember(subscriptionId, memberId);

      await this.publishEvent('member.removed', tenantId, {
        subscriptionId,
        memberId,
        userId: member.userId,
      });

      return success(undefined);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // TRIAL MANAGEMENT
  // ==========================================================================

  /**
   * Get trial progress for a subscription
   */
  async getTrialProgress(
    tenantId: string,
    subscriptionId: string
  ): Promise<Result<TrialProgress>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      if (sub.status !== SubscriptionStatus.TRIALING) {
        return failure(new InvalidStateError(
          'Subscription is not in trial',
          sub.status,
          [SubscriptionStatus.TRIALING]
        ));
      }

      const plan = await this.repo.getPlan(tenantId, sub.planId);
      if (!plan) {
        return failure(new PlanNotFoundError(sub.planId));
      }

      const trialConfig = plan.trialConfigs?.[sub.trialIntent || 'default'] || plan.defaultTrialConfig;

      const now = new Date();
      const trialStart = sub.trialStart || sub.currentPeriodStart;
      const trialEnd = sub.trialEnd || sub.currentPeriodEnd;
      const totalDuration = trialEnd.getTime() - trialStart.getTime();
      const elapsed = now.getTime() - trialStart.getTime();
      const remaining = Math.max(0, trialEnd.getTime() - now.getTime());

      const daysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));
      const percentComplete = Math.min(100, Math.round((elapsed / totalDuration) * 100));

      // Calculate metrics
      const metrics = (trialConfig?.successMetrics || []).map(metric => {
        const current = sub.trialMetrics?.[metric.key] || 0;
        return {
          key: metric.key,
          name: metric.name,
          current,
          target: metric.target,
          achieved: metric.target ? current >= metric.target : false,
        };
      });

      // Calculate limits usage
      const limitsUsage = (trialConfig?.trialLimits || []).map(limit => {
        const used = sub.trialLimitsUsed?.[limit.key] || 0;
        return {
          key: limit.key,
          used,
          limit: limit.limit,
          percentUsed: Math.round((used / limit.limit) * 100),
        };
      });

      // Calculate conversion readiness
      const achievedCount = metrics.filter(m => m.achieved).length;
      const totalConversionMetrics = metrics.filter(m =>
        trialConfig?.successMetrics?.find(sm => sm.key === m.key)?.conversionIndicator
      ).length;
      const conversionReadinessScore = totalConversionMetrics > 0
        ? Math.round((achievedCount / totalConversionMetrics) * 100)
        : 0;

      // Check conversion triggers
      const activeConversionTriggers = (trialConfig?.conversionTriggers || [])
        .filter(trigger => {
          const current = sub.trialMetrics?.[trigger.metric] || 0;
          return current >= trigger.threshold;
        })
        .map(trigger => ({
          metric: trigger.metric,
          message: trigger.message,
          suggestedPlanId: trigger.suggestedPlanId,
        }));

      // Suggested actions
      const suggestedActions: string[] = [];
      if (daysRemaining <= 3 && daysRemaining > 0) {
        suggestedActions.push('Your trial is ending soon. Consider upgrading to continue access.');
      }
      if (conversionReadinessScore >= 80) {
        suggestedActions.push('You have explored most trial features. Upgrade now to unlock full access.');
      }
      const unusedMetrics = metrics.filter(m => m.current === 0);
      if (unusedMetrics.length > 0) {
        suggestedActions.push(`Try out: ${unusedMetrics.map(m => m.name).join(', ')}`);
      }

      return success({
        subscriptionId,
        intent: sub.trialIntent || 'default',
        daysRemaining,
        percentComplete,
        metrics,
        limitsUsage,
        conversionReadinessScore,
        activeConversionTriggers,
        suggestedActions,
      });
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Update a trial metric
   */
  async updateTrialMetric(
    tenantId: string,
    subscriptionId: string,
    metricKey: string,
    value: number
  ): Promise<Result<void>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      if (sub.status !== SubscriptionStatus.TRIALING) {
        return failure(new InvalidStateError(
          'Subscription is not in trial',
          sub.status,
          [SubscriptionStatus.TRIALING]
        ));
      }

      const updatedMetrics = { ...sub.trialMetrics, [metricKey]: value };

      await this.repo.updateSubscription(subscriptionId, {
        trialMetrics: updatedMetrics,
      });

      return success(undefined);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // TRIAL CONVERSION
  // ==========================================================================

  /**
   * Convert a trial to paid subscription
   */
  async convertTrial(
    tenantId: string,
    subscriptionId: string,
    targetPlanId?: string
  ): Promise<Result<Subscription>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      if (sub.status !== SubscriptionStatus.TRIALING) {
        return failure(new InvalidStateError(
          'Can only convert trialing subscriptions',
          sub.status,
          [SubscriptionStatus.TRIALING]
        ));
      }

      const finalPlanId = targetPlanId || sub.planId;
      const plan = await this.repo.getPlan(tenantId, finalPlanId);
      if (!plan) {
        return failure(new PlanNotFoundError(finalPlanId));
      }

      const now = new Date();
      const periodEnd = this.calculatePeriodEnd(now, plan.pricing);

      // Update subscription
      const updates: Partial<Subscription> = {
        status: SubscriptionStatus.ACTIVE,
        planId: finalPlanId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEnd: now,
        nextPaymentAt: now,
      };

      // If converting to different plan, update entitlements
      if (targetPlanId && targetPlanId !== sub.planId) {
        const oldPlan = await this.repo.getPlan(tenantId, sub.planId);
        if (oldPlan) {
          await this.revokeAllEntitlements(tenantId, sub.customerId, subscriptionId, oldPlan.entitlements);
        }
        await this.grantEntitlements(tenantId, sub.customerId, subscriptionId, plan.entitlements, plan);
      } else {
        // Replace trial entitlements with full entitlements
        const trialConfig = plan.trialConfigs?.[sub.trialIntent || 'default'] || plan.defaultTrialConfig;
        if (trialConfig?.trialEntitlements) {
          await this.revokeAllEntitlements(tenantId, sub.customerId, subscriptionId, trialConfig.trialEntitlements);
        }
        await this.grantEntitlements(tenantId, sub.customerId, subscriptionId, plan.entitlements, plan);
      }

      const updated = await this.repo.updateSubscription(subscriptionId, updates);

      await this.publishEvent('subscription.trial_converted', tenantId, {
        subscriptionId,
        customerId: sub.customerId,
        fromPlanId: sub.planId,
        toPlanId: finalPlanId,
        trialIntent: sub.trialIntent,
        trialMetrics: sub.trialMetrics,
      });

      // Process first payment
      if (plan.pricing.billingType === BillingType.IMMEDIATE) {
        await this.processPayment(updated, plan);
      } else {
        await this.generateInvoice(tenantId, subscriptionId);
      }

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // PAYMENT PROCESSING
  // ==========================================================================

  /**
   * Process a subscription payment
   */
  async processPayment(
    subscription: Subscription,
    plan: SubscriptionPlan
  ): Promise<Result<RevenueShare>> {
    try {
      // Calculate amount based on pricing model
      let grossAmount = this.calculatePaymentAmount(subscription, plan);

      // Apply any discounts
      if (subscription.discountPercent) {
        grossAmount = grossAmount * (1 - subscription.discountPercent / 100);
      }

      // Calculate revenue share
      const platformFee = Math.round(grossAmount * (plan.platformFeePercent / 100));
      const vendorAmount = grossAmount - platformFee;

      // Attempt payment
      const paymentResult = await this.paymentService.chargeSubscription(
        subscription.id,
        grossAmount,
        plan.pricing.currency
      );

      if (!paymentResult.success) {
        await this.handlePaymentFailed(subscription.id, paymentResult.error);
        return failure(new SubscriptionError('Payment failed', 'PAYMENT_FAILED', paymentResult.error));
      }

      // Create revenue share record
      const share = await this.repo.createRevenueShare({
        subscriptionId: subscription.id,
        planId: plan.id,
        vendorId: plan.vendorId,
        tenantId: subscription.tenantId,
        grossAmount,
        platformFee,
        platformFeePercent: plan.platformFeePercent,
        vendorAmount,
        currency: plan.pricing.currency,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        externalTransactionId: paymentResult.transactionId,
      });

      // Update subscription
      const nextPeriodEnd = this.calculatePeriodEnd(subscription.currentPeriodEnd, plan.pricing);
      await this.repo.updateSubscription(subscription.id, {
        lastPaymentAt: new Date(),
        lastPaymentAmount: grossAmount,
        currentPeriodStart: subscription.currentPeriodEnd,
        currentPeriodEnd: nextPeriodEnd,
        nextPaymentAt: nextPeriodEnd,
        failedPaymentCount: 0,
        dunningStatus: DunningStatus.NONE,
      });

      // Update plan revenue
      await this.repo.incrementPlanRevenue(plan.id, grossAmount);

      await this.publishEvent('payment.succeeded', subscription.tenantId, {
        subscriptionId: subscription.id,
        amount: grossAmount,
        vendorAmount,
        platformFee,
        transactionId: paymentResult.transactionId,
      });

      return success(share);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Handle a failed payment
   */
  async handlePaymentFailed(
    subscriptionId: string,
    errorMessage?: string
  ): Promise<void> {
    // Look up subscription without tenantId (internal method)
    // We use a broader query approach here
    let sub: Subscription | null = null;

    // Try to find via available context
    try {
      // The repo may support lookup by subscription ID only for internal operations
      const allTenantSubs = await this.repo.getSubscription('', subscriptionId);
      sub = allTenantSubs;
    } catch {
      // If direct lookup fails, log and return
      this.logger.error('Failed to find subscription for payment failure handling', { subscriptionId });
      return;
    }

    if (!sub) return;

    const failedCount = sub.failedPaymentCount + 1;
    let status = sub.status;
    let dunningStatus: DunningStatus = DunningStatus.PAST_DUE;

    if (failedCount === 2) {
      dunningStatus = DunningStatus.GRACE_PERIOD;
      await this.publishEvent('dunning.grace_period_started', sub.tenantId, { subscriptionId });
    } else if (failedCount === this.config.maxRetryAttempts - 1) {
      dunningStatus = DunningStatus.FINAL_NOTICE;
      await this.publishEvent('dunning.final_notice', sub.tenantId, { subscriptionId });
    } else if (failedCount >= this.config.maxRetryAttempts) {
      status = SubscriptionStatus.UNPAID;
      dunningStatus = DunningStatus.UNPAID;

      // Revoke entitlements
      const plan = await this.repo.getPlan(sub.tenantId, sub.planId);
      if (plan) {
        await this.revokeAllEntitlements(sub.tenantId, sub.customerId, subscriptionId, plan.entitlements);
      }

      await this.publishEvent('dunning.completed', sub.tenantId, { subscriptionId, outcome: 'unpaid' });
    }

    await this.repo.updateSubscription(subscriptionId, {
      failedPaymentCount: failedCount,
      status,
      dunningStatus,
      lastDunningActionAt: new Date(),
    });

    await this.publishEvent('payment.failed', sub.tenantId, {
      subscriptionId,
      failedCount,
      status,
      dunningStatus,
      error: errorMessage,
    });
  }

  /**
   * Retry a failed payment
   */
  async retryPayment(tenantId: string, subscriptionId: string): Promise<Result<RevenueShare>> {
    const sub = await this.repo.getSubscription(tenantId, subscriptionId);
    if (!sub) {
      return failure(new SubscriptionNotFoundError(subscriptionId));
    }

    if (sub.dunningStatus === DunningStatus.NONE) {
      return failure(new SubscriptionError('No payment to retry', 'NO_RETRY_NEEDED'));
    }

    const plan = await this.repo.getPlan(tenantId, sub.planId);
    if (!plan) {
      return failure(new PlanNotFoundError(sub.planId));
    }

    return this.processPayment(sub, plan);
  }

  // ==========================================================================
  // INVOICE MANAGEMENT
  // ==========================================================================

  /**
   * Generate an invoice for a subscription
   */
  async generateInvoice(
    tenantId: string,
    subscriptionId: string
  ): Promise<Result<SubscriptionInvoice>> {
    try {
      const sub = await this.repo.getSubscription(tenantId, subscriptionId);
      if (!sub) {
        return failure(new SubscriptionNotFoundError(subscriptionId));
      }

      const plan = await this.repo.getPlan(tenantId, sub.planId);
      if (!plan) {
        return failure(new PlanNotFoundError(sub.planId));
      }

      const invoiceNumber = await this.repo.getNextInvoiceNumber(tenantId);
      const amount = this.calculatePaymentAmount(sub, plan);
      const taxRate = 0.10; // Would come from tax service
      const taxAmount = Math.round(amount * taxRate * 100) / 100;

      const terms = plan.pricing.invoiceTerms || InvoiceTerms.NET_30;
      const dueDate = this.calculateInvoiceDueDate(new Date(), terms);

      const invoice = await this.repo.createInvoice({
        subscriptionId,
        tenantId,
        invoiceNumber,
        status: InvoiceStatus.DRAFT,
        lineItems: [{
          description: `${plan.name} - ${this.formatPeriod(sub.currentPeriodStart, sub.currentPeriodEnd)}`,
          quantity: sub.seatCount || 1,
          unitPrice: plan.pricing.seatConfig?.pricePerSeat || plan.pricing.amount,
          amount,
          taxRate,
          taxAmount,
        }],
        subtotal: amount,
        taxAmount,
        totalAmount: amount + taxAmount,
        amountPaid: 0,
        amountDue: amount + taxAmount,
        currency: plan.pricing.currency,
        issuedAt: new Date(),
        dueAt: dueDate,
        terms,
        purchaseOrderNumber: sub.purchaseOrderNumber,
        remindersSent: [],
      });

      await this.publishEvent('invoice.created', tenantId, {
        subscriptionId,
        invoiceId: invoice.id,
        invoiceNumber,
        amount: invoice.totalAmount,
      });

      return success(invoice);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Send an invoice
   */
  async sendInvoice(
    tenantId: string,
    invoiceId: string
  ): Promise<Result<SubscriptionInvoice>> {
    try {
      const invoice = await this.repo.getInvoice(tenantId, invoiceId);
      if (!invoice) {
        return failure(new SubscriptionError('Invoice not found', 'INVOICE_NOT_FOUND'));
      }

      const updated = await this.repo.updateInvoice(invoiceId, {
        status: InvoiceStatus.SENT,
      });

      await this.publishEvent('invoice.sent', tenantId, {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Record a payment against an invoice
   */
  async recordInvoicePayment(
    tenantId: string,
    invoiceId: string,
    amount: number,
    paymentMethod: string,
    reference?: string
  ): Promise<Result<SubscriptionInvoice>> {
    try {
      const invoice = await this.repo.getInvoice(tenantId, invoiceId);
      if (!invoice) {
        return failure(new SubscriptionError('Invoice not found', 'INVOICE_NOT_FOUND'));
      }

      const newAmountPaid = invoice.amountPaid + amount;
      const newAmountDue = invoice.totalAmount - newAmountPaid;

      let newStatus = invoice.status;
      if (newAmountDue <= 0) {
        newStatus = InvoiceStatus.PAID;
      } else if (newAmountPaid > 0) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      const updated = await this.repo.updateInvoice(invoiceId, {
        amountPaid: newAmountPaid,
        amountDue: Math.max(0, newAmountDue),
        status: newStatus,
        paidAt: newStatus === InvoiceStatus.PAID ? new Date() : undefined,
      });

      // If fully paid, update subscription and create revenue share
      if (newStatus === InvoiceStatus.PAID) {
        const sub = await this.repo.getSubscription(tenantId, invoice.subscriptionId);
        const plan = sub ? await this.repo.getPlan(tenantId, sub.planId) : null;

        if (sub && plan) {
          const platformFee = Math.round(invoice.subtotal * (plan.platformFeePercent / 100));
          const vendorAmount = invoice.subtotal - platformFee;

          await this.repo.createRevenueShare({
            subscriptionId: invoice.subscriptionId,
            planId: plan.id,
            vendorId: plan.vendorId,
            tenantId,
            grossAmount: invoice.subtotal,
            platformFee,
            platformFeePercent: plan.platformFeePercent,
            vendorAmount,
            currency: invoice.currency,
            periodStart: sub.currentPeriodStart,
            periodEnd: sub.currentPeriodEnd,
          });

          await this.repo.incrementPlanRevenue(plan.id, invoice.subtotal);
        }

        await this.publishEvent('invoice.paid', tenantId, {
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
        });
      }

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(tenantId: string): Promise<Result<SubscriptionInvoice[]>> {
    try {
      const invoices = await this.repo.getOverdueInvoices(tenantId);
      return success(invoices);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // ENTITLEMENT MANAGEMENT
  // ==========================================================================

  /**
   * Grant entitlements to a user
   */
  private async grantEntitlements(
    tenantId: string,
    userId: string,
    subscriptionId: string,
    entitlements: PlanEntitlement[],
    plan: SubscriptionPlan
  ): Promise<void> {
    for (const entitlement of entitlements) {
      // Check credential requirements
      if (entitlement.requiredCredential) {
        const credential = await this.kycService.getCredential(
          tenantId,
          userId,
          entitlement.requiredCredential
        );

        if (!credential) {
          await this.publishEvent('entitlement.blocked', tenantId, {
            userId,
            subscriptionId,
            entitlementKey: entitlement.key,
            reason: 'missing_credential',
            requiredCredential: entitlement.requiredCredential,
          });
          continue;
        }

        if (entitlement.credentialMustBeValid && credential.status !== CredentialStatus.VALID) {
          await this.publishEvent('entitlement.blocked', tenantId, {
            userId,
            subscriptionId,
            entitlementKey: entitlement.key,
            reason: 'credential_invalid',
            credentialStatus: credential.status,
          });
          continue;
        }
      }

      // Grant the entitlement
      await this.repo.grantEntitlement({
        userId,
        subscriptionId,
        entitlementKey: entitlement.key,
        type: entitlement.type,
        value: entitlement.value,
        module: entitlement.module,
        grantedAt: new Date(),
        isActive: true,
      });

      // Publish to the relevant module
      const moduleTarget = entitlement.module || this.config.platformId;
      await this.eventBus.publish(`${moduleTarget}.entitlement_granted`, tenantId, {
        userId,
        subscriptionId,
        entitlement: entitlement.key,
        value: entitlement.value,
        type: entitlement.type,
      });
    }
  }

  /**
   * Revoke all entitlements from a user for a subscription
   */
  private async revokeAllEntitlements(
    tenantId: string,
    userId: string,
    subscriptionId: string,
    entitlements: PlanEntitlement[]
  ): Promise<void> {
    for (const entitlement of entitlements) {
      await this.repo.revokeEntitlement(userId, entitlement.key);

      const moduleTarget = entitlement.module || this.config.platformId;
      await this.eventBus.publish(`${moduleTarget}.entitlement_revoked`, tenantId, {
        userId,
        subscriptionId,
        entitlement: entitlement.key,
      });
    }
  }

  /**
   * Check if a user has a specific entitlement
   */
  async checkEntitlement(
    tenantId: string,
    userId: string,
    entitlementKey: string
  ): Promise<Result<{ hasEntitlement: boolean; value?: any; source?: string }>> {
    try {
      const entitlement = await this.repo.checkEntitlement(userId, entitlementKey);

      if (entitlement && entitlement.isActive) {
        return success({
          hasEntitlement: true,
          value: entitlement.value,
          source: entitlement.subscriptionId,
        });
      }

      return success({ hasEntitlement: false });
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Get all entitlements for a user
   */
  async getUserEntitlements(
    tenantId: string,
    userId: string
  ): Promise<Result<GrantedEntitlement[]>> {
    try {
      const entitlements = await this.repo.getGrantedEntitlements(userId);
      return success(entitlements.filter(e => e.isActive));
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // CREDENTIAL HANDLING
  // ==========================================================================

  /**
   * Handle credential status change (expiry, revocation, etc.)
   */
  async handleCredentialChange(
    tenantId: string,
    userId: string,
    credentialType: CredentialType,
    newStatus: CredentialStatus
  ): Promise<void> {
    this.logger.info('Handling credential change', { tenantId, userId, credentialType, newStatus });

    // Get user's active subscriptions
    const subscriptions = await this.repo.getActiveSubscriptions(tenantId, userId);

    for (const sub of subscriptions) {
      const plan = await this.repo.getPlan(tenantId, sub.planId);
      if (!plan) continue;

      // Find entitlements that depend on this credential
      const affectedEntitlements = plan.entitlements.filter(e =>
        e.requiredCredential === credentialType && e.credentialMustBeValid
      );

      if (affectedEntitlements.length === 0) continue;

      if (newStatus === CredentialStatus.VALID) {
        // Re-grant previously blocked entitlements
        await this.grantEntitlements(tenantId, userId, sub.id, affectedEntitlements, plan);
      } else {
        // Revoke entitlements
        for (const entitlement of affectedEntitlements) {
          await this.repo.revokeEntitlement(userId, entitlement.key);

          const moduleTarget = entitlement.module || this.config.platformId;
          await this.eventBus.publish(`${moduleTarget}.entitlement_revoked`, tenantId, {
            userId,
            subscriptionId: sub.id,
            entitlement: entitlement.key,
            reason: `credential_${newStatus}`,
          });
        }

        // Publish credential event
        const eventType = newStatus === CredentialStatus.EXPIRED
          ? 'credential.expired'
          : 'credential.revoked';

        await this.publishEvent(eventType, tenantId, {
          userId,
          subscriptionId: sub.id,
          credentialType,
          affectedEntitlements: affectedEntitlements.map(e => e.key),
        });
      }
    }
  }

  /**
   * Check credentials expiring soon
   */
  async checkExpiringCredentials(): Promise<void> {
    // This would be called by a scheduled job
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + this.config.credentialExpiryWarningDays);

    // Would query for users with credentials expiring before warningDate
    // and send notifications
  }

  // ==========================================================================
  // KYC CHECKING
  // ==========================================================================

  /**
   * Check KYC requirements for a plan
   */
  async checkKycRequirements(
    tenantId: string,
    userId: string,
    requirements: PlanKycRequirements
  ): Promise<KycCheckResult> {
    const userKyc = await this.kycService.getUserKycStatus(tenantId, userId);

    const result: KycCheckResult = {
      passed: true,
      currentLevel: userKyc.level,
      requiredLevel: requirements.minimumLevel,
      missingCredentials: [],
      expiredCredentials: [],
    };

    // Check KYC level
    if (userKyc.level < requirements.minimumLevel) {
      result.passed = false;
      result.instructions = `Please complete identity verification (Level ${requirements.minimumLevel} required)`;
      result.verificationUrl = await this.kycService.getVerificationUrl(tenantId, userId, requirements.minimumLevel);
    }

    // Check required credentials
    if (requirements.requiredCredentials) {
      for (const requiredCred of requirements.requiredCredentials) {
        const userCred = userKyc.credentials.find(c => c.type === requiredCred);

        if (!userCred) {
          result.passed = false;
          result.missingCredentials.push(requiredCred);
        } else if (requirements.credentialsMustBeValid && userCred.status !== CredentialStatus.VALID) {
          result.passed = false;
          if (userCred.status === CredentialStatus.EXPIRED) {
            result.expiredCredentials.push(requiredCred);
          } else {
            result.missingCredentials.push(requiredCred);
          }
        }
      }

      if (result.missingCredentials.length > 0 || result.expiredCredentials.length > 0) {
        const missing = result.missingCredentials.map(c => this.formatCredentialName(c));
        const expired = result.expiredCredentials.map(c => this.formatCredentialName(c));

        const parts = [];
        if (missing.length > 0) parts.push(`Missing: ${missing.join(', ')}`);
        if (expired.length > 0) parts.push(`Expired: ${expired.join(', ')}`);

        result.instructions = parts.join('. ');
      }
    }

    return result;
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  /**
   * Get subscription analytics for a tenant/vendor
   */
  async getAnalytics(
    tenantId: string,
    vendorId?: string
  ): Promise<Result<SubscriptionAnalytics>> {
    try {
      const [
        subscriberCounts,
        mrr,
        churnRate,
        trialConversionRate,
        plans,
      ] = await Promise.all([
        this.repo.getSubscriberCounts(tenantId, vendorId),
        this.repo.calculateMRR(tenantId, vendorId),
        this.repo.calculateChurnRate(tenantId, vendorId),
        this.repo.calculateTrialConversionRate(tenantId),
        this.repo.listPlans(tenantId, vendorId),
      ]);

      const activeSubscribers = subscriberCounts[SubscriptionStatus.ACTIVE] || 0;
      const arr = mrr * 12;
      const arpu = activeSubscribers > 0 ? mrr / activeSubscribers : 0;

      const revenueByPlan = plans.map(p => ({
        planId: p.id,
        planName: p.name,
        revenue: p.totalRevenue,
        subscribers: p.subscriberCount,
      }));

      // Growth metrics would require historical data
      const growth = {
        newSubscribers: 0,  // Would query from events
        churned: 0,
        netGrowth: 0,
        growthRate: 0,
      };

      return success({
        activeSubscribers,
        subscribersByStatus: subscriberCounts,
        mrr,
        arr,
        arpu,
        churnRate,
        trialConversionRate,
        revenueByPlan,
        growth,
      });
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Get vendor analytics (for marketplace vendors)
   */
  async getVendorAnalytics(
    tenantId: string,
    vendorId: string
  ): Promise<Result<SubscriptionAnalytics & { unsettledRevenue: number }>> {
    const analyticsResult = await this.getAnalytics(tenantId, vendorId);
    if (!analyticsResult.success) {
      return analyticsResult as Result<SubscriptionAnalytics & { unsettledRevenue: number }>;
    }

    const unsettledShares = await this.repo.getUnsettledRevenue(vendorId);
    const unsettledRevenue = unsettledShares.reduce((sum, s) => sum + s.vendorAmount, 0);

    return success({
      ...analyticsResult.data,
      unsettledRevenue,
    });
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Calculate the end of a billing period
   */
  private calculatePeriodEnd(start: Date, pricing: PlanPricing): Date {
    const multiplier = pricing.intervalCount || 1;
    const startTime = start.getTime();

    switch (pricing.interval) {
      case BillingInterval.DAY:
        return new Date(startTime + multiplier * 24 * 60 * 60 * 1000);
      case BillingInterval.WEEK:
        return new Date(startTime + multiplier * 7 * 24 * 60 * 60 * 1000);
      case BillingInterval.MONTH: {
        const monthDate = new Date(start);
        monthDate.setMonth(monthDate.getMonth() + multiplier);
        return monthDate;
      }
      case BillingInterval.QUARTER: {
        const quarterDate = new Date(start);
        quarterDate.setMonth(quarterDate.getMonth() + (multiplier * 3));
        return quarterDate;
      }
      case BillingInterval.YEAR: {
        const yearDate = new Date(start);
        yearDate.setFullYear(yearDate.getFullYear() + multiplier);
        return yearDate;
      }
      default:
        return new Date(startTime + 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Calculate payment amount based on pricing model
   */
  private calculatePaymentAmount(subscription: Subscription, plan: SubscriptionPlan): number {
    const pricing = plan.pricing;

    switch (pricing.model) {
      case PricingModel.RECURRING:
      case PricingModel.ONE_TIME:
        return pricing.amount;

      case PricingModel.PER_SEAT: {
        const seatCount = subscription.seatCount || 1;
        const seatConfig = pricing.seatConfig!;
        let seatAmount = seatConfig.pricePerSeat * seatCount;

        // Apply volume discounts
        if (seatConfig.volumeDiscounts) {
          const applicableDiscount = seatConfig.volumeDiscounts
            .filter(d => seatCount >= d.minQuantity && (!d.maxQuantity || seatCount <= d.maxQuantity))
            .sort((a, b) => b.discountPercent - a.discountPercent)[0];

          if (applicableDiscount) {
            seatAmount = seatAmount * (1 - applicableDiscount.discountPercent / 100);
          }
        }
        return seatAmount;
      }

      case PricingModel.BASE_PLUS_SEAT: {
        const baseAmount = pricing.amount;
        const extraSeats = Math.max(0, (subscription.seatCount || 0) - (pricing.seatConfig?.includedSeats || 0));
        const extraSeatAmount = extraSeats * (pricing.seatConfig?.pricePerSeat || 0);
        return baseAmount + extraSeatAmount;
      }

      case PricingModel.USAGE: {
        const usage = subscription.currentUsage || 0;
        const usageConfig = pricing.usageConfig!;
        const billableUsage = Math.max(0, usage - usageConfig.includedUnits);
        return pricing.amount + (billableUsage * usageConfig.pricePerUnit);
      }

      case PricingModel.TIERED:
        // Would implement tiered pricing calculation
        return pricing.amount;

      default:
        return pricing.amount;
    }
  }

  /**
   * Determine subscription type based on plan and options
   */
  private determineSubscriptionType(
    plan: SubscriptionPlan,
    options: SubscribeOptions
  ): SubscriptionType {
    if (options.initialMembers && options.initialMembers.length > 0) {
      return options.initialMembers.some(m => m.role === 'child')
        ? SubscriptionType.FAMILY
        : SubscriptionType.TEAM;
    }

    if (plan.pricing.seatConfig) {
      return SubscriptionType.INSTITUTIONAL;
    }

    return SubscriptionType.INDIVIDUAL;
  }

  /**
   * Get trial configuration
   */
  private getTrialConfig(plan: SubscriptionPlan, options: SubscribeOptions): TrialConfig | undefined {
    if (options.skipTrial) return undefined;

    if (options.trialIntent && plan.trialConfigs?.[options.trialIntent]) {
      return plan.trialConfigs[options.trialIntent];
    }

    if (plan.defaultTrialConfig) {
      return plan.defaultTrialConfig;
    }

    // Fallback to simple trial from pricing
    if (plan.pricing.trialDays) {
      return {
        intent: 'default',
        durationDays: plan.pricing.trialDays,
        trialEntitlements: plan.entitlements,
        successMetrics: [],
        requirePaymentMethod: false,
        requiredKycLevel: KycLevel.EMAIL_VERIFIED,
      };
    }

    return undefined;
  }

  /**
   * Create initial seats for a seat-based subscription
   */
  private async createInitialSeats(
    subscriptionId: string,
    count: number,
    seatType: string
  ): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.repo.createSeat({
        subscriptionId,
        status: SeatStatus.AVAILABLE,
        seatType,
      });
    }
  }

  /**
   * Calculate invoice due date based on terms
   */
  private calculateInvoiceDueDate(issueDate: Date, terms: InvoiceTerms): Date {
    const dueDate = new Date(issueDate);

    switch (terms) {
      case InvoiceTerms.DUE_ON_RECEIPT:
        return dueDate;
      case InvoiceTerms.NET_7:
        dueDate.setDate(dueDate.getDate() + 7);
        return dueDate;
      case InvoiceTerms.NET_15:
        dueDate.setDate(dueDate.getDate() + 15);
        return dueDate;
      case InvoiceTerms.NET_30:
        dueDate.setDate(dueDate.getDate() + 30);
        return dueDate;
      case InvoiceTerms.NET_45:
        dueDate.setDate(dueDate.getDate() + 45);
        return dueDate;
      case InvoiceTerms.NET_60:
        dueDate.setDate(dueDate.getDate() + 60);
        return dueDate;
      case InvoiceTerms.NET_90:
        dueDate.setDate(dueDate.getDate() + 90);
        return dueDate;
      default:
        dueDate.setDate(dueDate.getDate() + 30);
        return dueDate;
    }
  }

  /**
   * Format a billing period for display
   */
  private formatPeriod(start: Date, end: Date): string {
    const formatDate = (d: Date) => d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${formatDate(start)} - ${formatDate(end)}`;
  }

  /**
   * Format credential type for display
   */
  private formatCredentialName(type: CredentialType): string {
    const names: Record<CredentialType, string> = {
      [CredentialType.WWCC]: 'Working With Children Check',
      [CredentialType.DBS]: 'DBS Check',
      [CredentialType.PVG]: 'PVG Scheme',
      [CredentialType.TEACHING_REGISTRATION]: 'Teaching Registration',
      [CredentialType.FIRST_AID]: 'First Aid Certificate',
      [CredentialType.BUSINESS_REGISTRATION]: 'Business Registration',
      [CredentialType.PROFESSIONAL_INSURANCE]: 'Professional Insurance',
      [CredentialType.DRIVERS_LICENSE]: "Driver's License",
      [CredentialType.FOOD_SAFETY]: 'Food Safety Certificate',
      [CredentialType.RSA]: 'RSA Certificate',
      [CredentialType.SECURITY_LICENSE]: 'Security License',
    };
    return names[type] || type;
  }

  /**
   * Publish an event
   */
  private async publishEvent(
    type: SubscriptionEventType | string,
    tenantId: string,
    data: Record<string, any>
  ): Promise<void> {
    const topic = `subscription.${type}`;
    await this.eventBus.publish(topic, tenantId, {
      type,
      timestamp: new Date().toISOString(),
      ...data,
    });

    // Also record in event log
    if (data.subscriptionId) {
      await this.repo.createEvent({
        subscriptionId: data.subscriptionId,
        tenantId,
        type: type as SubscriptionEventType,
        data,
      });
    }
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let subscriptionServiceInstance: UniversalSubscriptionService | null = null;

export function initializeSubscriptionService(
  repo: SubscriptionRepository,
  kycService: KycServiceInterface,
  paymentService: PaymentServiceInterface,
  eventBus: EventBus,
  logger: Logger,
  config: SubscriptionServiceConfig
): UniversalSubscriptionService {
  subscriptionServiceInstance = new UniversalSubscriptionService(
    repo,
    kycService,
    paymentService,
    eventBus,
    logger,
    config
  );
  return subscriptionServiceInstance;
}

export function getSubscriptionService(): UniversalSubscriptionService {
  if (!subscriptionServiceInstance) {
    throw new Error('SubscriptionService not initialized. Call initializeSubscriptionService first.');
  }
  return subscriptionServiceInstance;
}
