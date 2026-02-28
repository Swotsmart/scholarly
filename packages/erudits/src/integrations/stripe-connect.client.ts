/**
 * ============================================================================
 * Stripe Connect Client — Production Integration
 * ============================================================================
 *
 * This module wraps the Stripe SDK (stripe) to implement the StripeClient
 * interface defined in storefront.service.ts. Think of it as the cash register
 * that handles the split-payment economics of the marketplace: when a student
 * buys a $15 vocabulary booklet, this client tells Stripe to route $12.75
 * to the author's connected account and $2.25 to the platform.
 *
 * Stripe Connect uses "destination charges" — the payment is created on the
 * platform account, and Stripe automatically transfers the author's share
 * to their connected account minus the platform fee. This gives us a single
 * charge, a single refund path, and clean reconciliation.
 *
 * ## Environment Variables
 *   STRIPE_SECRET_KEY          — Platform's Stripe secret key
 *   STRIPE_WEBHOOK_SECRET      — Webhook signing secret for event verification
 *   STRIPE_API_VERSION         — API version lock (default: '2025-01-27.acacia')
 *
 * ## Error Handling
 *   Every method returns Result<T>. Stripe SDK errors are caught and mapped
 *   to ServiceError with appropriate HTTP status codes:
 *     - StripeCardError          → 400 (buyer's card problem)
 *     - StripeInvalidRequestError → 400 (our code sent bad params)
 *     - StripeAPIError           → 502 (Stripe is down)
 *     - StripeRateLimitError     → 429 (we're calling too fast)
 *
 * @module erudits/integrations/stripe-connect
 * @version 1.0.0
 */

import type { Result, ServiceError } from '../types/erudits.types';
import { success, failure, Errors } from '../types/erudits.types';
import type { StripeClient } from '../services/storefront.service';

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

interface StripeWebhookEvent {
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
// CONNECTED ACCOUNT REGISTRY
// ============================================================================

/**
 * Maps author IDs to Stripe connected account IDs. In production this
 * comes from the database (a `stripe_connected_account_id` column on the
 * user/tutor profile). We define the interface here and inject the real
 * implementation via the factory.
 */
export interface ConnectedAccountRegistry {
  getAccountId(authorId: string): Promise<string | null>;
  setAccountId(authorId: string, stripeAccountId: string): Promise<void>;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

export class StripeConnectClient implements StripeClient {
  constructor(
    private readonly stripe: StripeSDK,
    private readonly accountRegistry: ConnectedAccountRegistry,
    private readonly webhookSecret: string,
  ) {}

  // ── Payment Intent Creation ──

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

  // ── Payment Intent Confirmation ──

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

  // ── Refund ──

  async createRefund(params: {
    paymentIntentId: string;
    amountCents?: number | undefined;
    reason?: string | undefined;
  }): Promise<Result<{ refundId: string; amountCents: number }>> {
    try {
      const refundParams: Record<string, unknown> = {
        payment_intent: params.paymentIntentId,
        reverse_transfer: true,         // Automatically reverses the Connect transfer
        refund_application_fee: true,    // Refunds the platform fee too
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

  // ── Connected Account Lookup ──

  async getConnectedAccountId(authorId: string): Promise<string | null> {
    return this.accountRegistry.getAccountId(authorId);
  }

  // ── Connect Onboarding ──

  /**
   * Create a new Stripe Connect Express account for a tutor/author.
   *
   * This is the first step in the onboarding flow. Think of it as
   * issuing a blank employee ID badge — the badge exists, but the
   * employee still needs to fill in their details (which happens via
   * the Account Link in the next step).
   *
   * Express accounts are the right choice for Érudits: Stripe handles
   * identity verification, tax forms, and payout management. The tutor
   * completes onboarding in Stripe's hosted UI, not ours.
   */
  async createConnectedAccount(params: {
    authorId: string;
    email: string;
    country?: string | undefined;
    businessType?: 'individual' | 'company' | undefined;
    metadata?: Record<string, string> | undefined;
  }): Promise<Result<{ stripeAccountId: string }>> {
    try {
      // Check if account already exists
      const existing = await this.accountRegistry.getAccountId(params.authorId);
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
          erudits_author_id: params.authorId,
          ...(params.metadata ?? {}),
        },
      };

      const account = await this.stripe.accounts.create(createParams);

      // Persist the mapping
      await this.accountRegistry.setAccountId(params.authorId, account.id);

      return success({ stripeAccountId: account.id });
    } catch (err) {
      return failure(this.mapStripeError(err as StripeError));
    }
  }

  /**
   * Generate a Stripe-hosted onboarding link for the tutor to complete
   * their account setup (identity verification, bank details, tax info).
   *
   * The link expires after a short window (typically ~5 minutes). If the
   * tutor doesn't complete onboarding, call this again to generate a
   * fresh link — Stripe picks up where they left off.
   *
   * returnUrl: where Stripe sends the tutor after successful onboarding
   * refreshUrl: where Stripe sends the tutor if the link expires (your
   *   page should call this method again and redirect to the new link)
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
   * This tells you whether the tutor has completed onboarding and can
   * receive payments. The three key flags are:
   *   - details_submitted: tutor filled in the Stripe form
   *   - charges_enabled: Stripe has verified them for accepting payments
   *   - payouts_enabled: Stripe can send money to their bank account
   *
   * A tutor who has submitted details but isn't yet verified is in
   * "pending" state — Stripe is reviewing their identity documents.
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

  // ── Webhook Verification ──

  /**
   * Verifies a Stripe webhook signature and returns the parsed event.
   * This is NOT part of the StripeClient interface (it's used by the
   * webhook route directly) but lives here because it needs the SDK.
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

  // ── Private Helpers ──

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
 *   const client = createStripeConnectClient(stripeSDK, accountRegistry);
 */
export function createStripeConnectClient(
  stripeSDK: StripeSDK,
  accountRegistry: ConnectedAccountRegistry,
  webhookSecret: string,
): StripeConnectClient {
  return new StripeConnectClient(stripeSDK, accountRegistry, webhookSecret);
}
