/**
 * ============================================================================
 * Scholarly Platform — Stripe Connect Client (Ported from Érudits v2.10)
 * ============================================================================
 *
 * This module wraps the Stripe SDK to implement split-payment economics for
 * the tutor marketplace. When a student buys a $15 vocabulary booklet, this
 * client tells Stripe to route $12.75 to the tutor's connected account and
 * $2.25 to the platform — like a cash register that automatically splits
 * every sale between the shop owner and the mall.
 *
 * Stripe Connect uses "destination charges": the payment is created on the
 * platform account, and Stripe automatically transfers the tutor's share
 * minus the platform fee. Single charge, single refund path, clean
 * reconciliation.
 *
 * ## Port Notes (Érudits → Scholarly)
 *
 *   - Import paths updated from '../types/erudits.types' to Scholarly types
 *   - Metadata key changed: erudits_author_id → scholarly_tutor_id
 *   - ConnectedAccountRegistry backed by TutorProfile.stripeConnectedAccountId
 *   - StripeClient interface re-exported from this module (was in storefront)
 *   - Factory function signature unchanged — drop-in replacement
 *
 * ## Environment Variables
 *   STRIPE_SECRET_KEY          — Platform's Stripe secret key
 *   STRIPE_WEBHOOK_SECRET      — Webhook signing secret for event verification
 *   STRIPE_API_VERSION         — API version lock (default: '2025-01-27.acacia')
 *
 * @module scholarly/integrations/stripe-connect
 * @version 2.0.0 (ported from Érudits v1.0.0)
 */

// ============================================================================
// RESULT<T> MONAD — Matches Scholarly's existing pattern
// ============================================================================

/**
 * These types mirror the Scholarly platform's Result<T> monad defined in
 * packages/api/src/shared/result.ts. When integrating into the monorepo,
 * replace this section with:
 *
 *   import { Result, success, failure, Errors } from '@scholarly/shared/result';
 */

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ServiceError };

export interface ServiceError {
  code: string;
  message: string;
  httpStatus: number;
  details?: Record<string, unknown> | undefined;
}

export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<T>(error: ServiceError): Result<T> {
  return { success: false, error };
}

export const Errors = {
  validation: (message: string, details?: Record<string, unknown>): ServiceError => ({
    code: 'VALIDATION_ERROR', message, httpStatus: 400, ...(details ? { details } : {}),
  }),
  notFound: (entity: string, id: string): ServiceError => ({
    code: 'NOT_FOUND', message: `${entity} not found: ${id}`, httpStatus: 404,
  }),
  unauthorised: (message = 'Not authorised'): ServiceError => ({
    code: 'UNAUTHORISED', message, httpStatus: 401,
  }),
  forbidden: (message = 'Access denied'): ServiceError => ({
    code: 'FORBIDDEN', message, httpStatus: 403,
  }),
  conflict: (message: string): ServiceError => ({
    code: 'CONFLICT', message, httpStatus: 409,
  }),
  internal: (message: string): ServiceError => ({
    code: 'INTERNAL_ERROR', message, httpStatus: 500,
  }),
  external: (service: string, message: string): ServiceError => ({
    code: 'EXTERNAL_SERVICE_ERROR', message: `${service}: ${message}`, httpStatus: 502,
  }),
  rateLimited: (message = 'Too many requests'): ServiceError => ({
    code: 'RATE_LIMITED', message, httpStatus: 429,
  }),
};

// ============================================================================
// STRIPE SDK TYPE STUBS
// ============================================================================

/**
 * We type the Stripe SDK at the boundary rather than importing the full
 * @types/stripe package. This keeps the integration layer thin and avoids
 * pulling 10,000+ generated types into the compilation unit. The real
 * Stripe instance is injected via the factory function below.
 */
interface StripeSDK {
  paymentIntents: {
    create(params: Record<string, unknown>): Promise<StripePaymentIntent>;
    retrieve(id: string): Promise<StripePaymentIntent>;
    confirm(id: string, params?: Record<string, unknown>): Promise<StripePaymentIntent>;
  };
  refunds: {
    create(params: Record<string, unknown>): Promise<StripeRefund>;
  };
  accounts: {
    create(params: Record<string, unknown>): Promise<StripeAccount>;
    retrieve(id: string): Promise<StripeAccount>;
    update(id: string, params: Record<string, unknown>): Promise<StripeAccount>;
  };
  accountLinks: {
    create(params: Record<string, unknown>): Promise<StripeAccountLink>;
  };
  webhooks: {
    constructEvent(payload: string | Buffer, sig: string, secret: string): StripeWebhookEvent;
  };
}

interface StripePaymentIntent {
  id: string;
  client_secret: string;
  status: string;
  latest_charge?: string | { id: string } | null | undefined;
  metadata: Record<string, string>;
}

interface StripeRefund {
  id: string;
  amount: number;
  status: string;
  payment_intent: string;
}

interface StripeAccount {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  email?: string | null | undefined;
  country?: string | undefined;
  type?: string | undefined;
}

interface StripeAccountLink {
  url: string;
  created: number;
  expires_at: number;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

interface StripeError extends Error {
  type: string;
  code?: string | undefined;
  statusCode?: number | undefined;
  raw?: Record<string, unknown> | undefined;
}

// ============================================================================
// STRIPE CLIENT INTERFACE
// ============================================================================

/**
 * The StripeClient interface consumed by ResourceStorefrontService and
 * TutorOnboardingService. Defines the marketplace payment operations.
 *
 * In the Érudits codebase this lived in storefront.service.ts. Here we
 * co-locate it with the implementation for clarity and single-import usage.
 */
export interface StripeClient {
  createPaymentIntent(params: {
    amountCents: number;
    currency: string;
    customerId?: string | undefined;
    connectedAccountId: string;
    platformFeeCents: number;
    metadata: Record<string, string>;
  }): Promise<Result<{ paymentIntentId: string; clientSecret: string }>>;

  confirmPaymentIntent(paymentIntentId: string): Promise<Result<{
    status: 'succeeded' | 'failed' | 'requires_action';
    chargeId?: string | undefined;
  }>>;

  createRefund(params: {
    paymentIntentId: string;
    amountCents?: number;
    reason?: string | undefined;
  }): Promise<Result<{ refundId: string; amountCents: number }>>;

  getConnectedAccountId(authorId: string): Promise<string | null>;
}

// ============================================================================
// CONNECTED ACCOUNT REGISTRY
// ============================================================================

/**
 * Maps tutor profile IDs to Stripe connected account IDs.
 *
 * In Scholarly, this is backed by the TutorProfile model:
 *   TutorProfile.stripeConnectedAccountId (nullable String)
 *
 * The PrismaConnectedAccountRegistry implementation (below) reads/writes
 * this column directly.
 */
export interface ConnectedAccountRegistry {
  getAccountId(tutorProfileId: string): Promise<string | null>;
  setAccountId(tutorProfileId: string, stripeAccountId: string): Promise<void>;
}

// ============================================================================
// PRISMA-BACKED REGISTRY IMPLEMENTATION
// ============================================================================

/**
 * Minimal Prisma client interface — just the operations we need.
 * In the monorepo, replace with the real PrismaClient import.
 */
interface PrismaClientLike {
  tutorProfile: {
    findUnique(params: { where: { id: string }; select: Record<string, boolean> }): Promise<{
      stripeConnectedAccountId: string | null;
    } | null>;
    update(params: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
}

/**
 * Production ConnectedAccountRegistry backed by Prisma.
 *
 * Reads TutorProfile.stripeConnectedAccountId for lookups and writes
 * back on account creation. This is the bridge between the onboarding
 * flow (which creates the Stripe account) and the storefront (which
 * needs the account ID for payment routing).
 */
export class PrismaConnectedAccountRegistry implements ConnectedAccountRegistry {
  constructor(private readonly prisma: PrismaClientLike) {}

  async getAccountId(tutorProfileId: string): Promise<string | null> {
    const profile = await this.prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
      select: { stripeConnectedAccountId: true },
    });
    return profile?.stripeConnectedAccountId ?? null;
  }

  async setAccountId(tutorProfileId: string, stripeAccountId: string): Promise<void> {
    await this.prisma.tutorProfile.update({
      where: { id: tutorProfileId },
      data: { stripeConnectedAccountId: stripeAccountId },
    });
  }
}

// ============================================================================
// STRIPE CONNECT CLIENT IMPLEMENTATION
// ============================================================================

export class StripeConnectClient implements StripeClient {
  constructor(
    private readonly stripe: StripeSDK,
    private readonly accountRegistry: ConnectedAccountRegistry,
    private readonly webhookSecret: string,
  ) {}

  // ── Payment Intent Creation ──────────────────────────────────────────────

  async createPaymentIntent(params: {
    amountCents: number;
    currency: string;
    customerId?: string | undefined;
    connectedAccountId: string;
    platformFeeCents: number;
    metadata: Record<string, string>;
  }): Promise<Result<{ paymentIntentId: string; clientSecret: string }>> {
    try {
      const createParams: Record<string, unknown> = {
        amount: params.amountCents,
        currency: params.currency.toLowerCase(),
        application_fee_amount: params.platformFeeCents,
        transfer_data: {
          destination: params.connectedAccountId,
        },
        metadata: params.metadata,
        automatic_payment_methods: { enabled: true },
      };

      if (params.customerId) {
        createParams.customer = params.customerId;
      }

      const intent = await this.stripe.paymentIntents.create(createParams);

      return success({
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
      });
    } catch (err) {
      return failure(this.mapStripeError(err as StripeError));
    }
  }

  // ── Payment Intent Confirmation ──────────────────────────────────────────

  async confirmPaymentIntent(paymentIntentId: string): Promise<Result<{
    status: 'succeeded' | 'failed' | 'requires_action';
    chargeId?: string;
  }>> {
    try {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      const status = this.mapPaymentStatus(intent.status);
      const chargeId = this.extractChargeId(intent);

      return success({ status, ...(chargeId ? { chargeId } : {}) });
    } catch (err) {
      return failure(this.mapStripeError(err as StripeError));
    }
  }

  // ── Refund ───────────────────────────────────────────────────────────────

  async createRefund(params: {
    paymentIntentId: string;
    amountCents?: number | undefined;
    reason?: string | undefined;
  }): Promise<Result<{ refundId: string; amountCents: number }>> {
    try {
      const refundParams: Record<string, unknown> = {
        payment_intent: params.paymentIntentId,
        reverse_transfer: true,
        refund_application_fee: true,
      };

      if (params.amountCents !== undefined) {
        refundParams.amount = params.amountCents;
      }

      if (params.reason) {
        refundParams.reason = params.reason === 'duplicate' ? 'duplicate'
          : params.reason === 'fraudulent' ? 'fraudulent'
          : 'requested_by_customer';
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return success({
        refundId: refund.id,
        amountCents: refund.amount,
      });
    } catch (err) {
      return failure(this.mapStripeError(err as StripeError));
    }
  }

  // ── Connected Account Lookup ─────────────────────────────────────────────

  async getConnectedAccountId(tutorProfileId: string): Promise<string | null> {
    return this.accountRegistry.getAccountId(tutorProfileId);
  }

  // ── Connect Onboarding (used by TutorOnboardingService Step 5) ──────────

  /**
   * Create a new Stripe Connect Express account for a tutor.
   *
   * Express accounts are the right choice: Stripe handles identity
   * verification, tax forms, and payout management. The tutor completes
   * onboarding in Stripe's hosted UI, not ours.
   *
   * @param params.tutorProfileId - Scholarly TutorProfile ID (stored as metadata)
   * @param params.email - Tutor's email for the Stripe account
   * @param params.country - ISO 3166 country code (default: 'AU')
   * @param params.businessType - 'individual' or 'company' (default: 'individual')
   */
  async createConnectedAccount(params: {
    tutorProfileId: string;
    email: string;
    country?: string | undefined;
    businessType?: 'individual' | 'company' | undefined;
    metadata?: Record<string, string> | undefined;
  }): Promise<Result<{ stripeAccountId: string }>> {
    try {
      // Check if account already exists
      const existing = await this.accountRegistry.getAccountId(params.tutorProfileId);
      if (existing) {
        return success({ stripeAccountId: existing });
      }

      const createParams: Record<string, unknown> = {
        type: 'express',
        email: params.email,
        country: params.country ?? 'AU',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: params.businessType ?? 'individual',
        metadata: {
          scholarly_tutor_id: params.tutorProfileId,
          ...(params.metadata ?? {}),
        },
      };

      const account = await this.stripe.accounts.create(createParams);

      // Persist the mapping on TutorProfile
      await this.accountRegistry.setAccountId(params.tutorProfileId, account.id);

      return success({ stripeAccountId: account.id });
    } catch (err) {
      return failure(this.mapStripeError(err as StripeError));
    }
  }

  /**
   * Generate a Stripe-hosted onboarding link for the tutor.
   *
   * Links expire after ~5 minutes. If the tutor doesn't complete
   * onboarding, call this again — Stripe picks up where they left off.
   *
   * @param params.returnUrl - Where Stripe sends the tutor after success
   * @param params.refreshUrl - Where Stripe sends if the link expires
   */
  async createOnboardingLink(params: {
    stripeAccountId: string;
    returnUrl: string;
    refreshUrl: string;
  }): Promise<Result<{ url: string; expiresAt: number }>> {
    try {
      const link = await this.stripe.accountLinks.create({
        account: params.stripeAccountId,
        type: 'account_onboarding',
        return_url: params.returnUrl,
        refresh_url: params.refreshUrl,
      });

      return success({
        url: link.url,
        expiresAt: link.expires_at,
      });
    } catch (err) {
      return failure(this.mapStripeError(err as StripeError));
    }
  }

  /**
   * Check the onboarding status of a connected account.
   *
   * Three key flags:
   *   - details_submitted: tutor filled in the Stripe form
   *   - charges_enabled: Stripe has verified them for accepting payments
   *   - payouts_enabled: Stripe can send money to their bank account
   */
  async getAccountStatus(stripeAccountId: string): Promise<Result<{
    stripeAccountId: string;
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    status: 'not_started' | 'pending' | 'active' | 'restricted';
  }>> {
    try {
      const account = await this.stripe.accounts.retrieve(stripeAccountId);

      let status: 'not_started' | 'pending' | 'active' | 'restricted';
      if (!account.details_submitted) {
        status = 'not_started';
      } else if (account.charges_enabled && account.payouts_enabled) {
        status = 'active';
      } else if (account.details_submitted) {
        status = 'pending';
      } else {
        status = 'restricted';
      }

      return success({
        stripeAccountId: account.id,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        status,
      });
    } catch (err) {
      return failure(this.mapStripeError(err as StripeError));
    }
  }

  // ── Webhook Verification ─────────────────────────────────────────────────

  /**
   * Verify a Stripe webhook signature and return the parsed event.
   * Used by the webhook route handler, not by StripeClient consumers.
   */
  verifyWebhookEvent(
    payload: string | Buffer,
    signature: string,
  ): Result<StripeWebhookEvent> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
      return success(event);
    } catch (err) {
      return failure(Errors.unauthorised(
        `Webhook signature verification failed: ${(err as Error).message}`,
      ));
    }
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private mapPaymentStatus(
    stripeStatus: string,
  ): 'succeeded' | 'failed' | 'requires_action' {
    switch (stripeStatus) {
      case 'succeeded': return 'succeeded';
      case 'requires_action':
      case 'requires_confirmation':
      case 'requires_payment_method':
        return 'requires_action';
      default:
        return 'failed';
    }
  }

  private extractChargeId(intent: StripePaymentIntent): string | undefined {
    if (!intent.latest_charge) return undefined;
    if (typeof intent.latest_charge === 'string') return intent.latest_charge;
    return intent.latest_charge.id;
  }

  private mapStripeError(err: StripeError): ServiceError {
    const type = err.type || 'unknown';

    switch (type) {
      case 'StripeCardError':
        return Errors.validation(`Card error: ${err.message}`);
      case 'StripeInvalidRequestError':
        return Errors.validation(`Invalid request: ${err.message}`);
      case 'StripeRateLimitError':
        return Errors.rateLimited('Stripe rate limit exceeded');
      case 'StripeConnectionError':
      case 'StripeAPIError':
        return Errors.external('Stripe', err.message);
      case 'StripeAuthenticationError':
        return Errors.internal('Stripe authentication failed — check API keys');
      default:
        return Errors.external('Stripe', err.message || 'Unknown Stripe error');
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a production StripeConnectClient.
 *
 * Usage:
 *   import Stripe from 'stripe';
 *   const stripeSDK = new Stripe(process.env.STRIPE_SECRET_KEY!);
 *   const registry = new PrismaConnectedAccountRegistry(prisma);
 *   const client = createStripeConnectClient(stripeSDK, registry, webhookSecret);
 */
export function createStripeConnectClient(
  stripeSDK: StripeSDK,
  accountRegistry: ConnectedAccountRegistry,
  webhookSecret: string,
): StripeConnectClient {
  return new StripeConnectClient(stripeSDK, accountRegistry, webhookSecret);
}
