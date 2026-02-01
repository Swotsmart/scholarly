/**
 * Scholarly Payment Service
 *
 * Core financial service handling accounts, invoices, payments, payouts, and refunds.
 * Integrates with Stripe Connect for marketplace payments to tutors and schools.
 *
 * @module ScholarlyPayment
 * @version 2.0.0
 */

import Stripe from 'stripe';
import { log } from '../lib/logger';
import {
  Result,
  success,
  failure,
  ScholarlyError,
  ScholarlyBaseService,
} from './base.service';
import {
  FinancialAccount,
  Invoice,
  InvoicePayment,
  Payout,
  Refund,
  CreateAccountInput,
  CreateInvoiceInput,
  ProcessPaymentInput,
  CreatePayoutInput,
  CreateRefundInput,
  AccountStatus,
  InvoiceStatus,
  PayoutStatus,
  AccountBalances,
  StripeConnectDetails,
  AccountSettings,
  AccountStatistics,
  PaymentAuditInfo,
  Currency,
  PaymentEventType,
} from './payment-types';

// ============================================================================
// STRIPE CONFIGURATION
// ============================================================================

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  platformFeePercent: number;
  currency: string;
}

export interface CheckoutSessionInput {
  customerId?: string;
  customerEmail?: string;
  lineItems: {
    name: string;
    description?: string;
    amount: number; // in cents
    quantity: number;
  }[];
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  connectedAccountId?: string; // For Connect payments
  applicationFeeAmount?: number; // Platform fee in cents
}

export interface SubscriptionInput {
  customerId: string;
  priceId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
  connectedAccountId?: string;
}

export interface WebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class PaymentService extends ScholarlyBaseService {
  private stripe: Stripe | null = null;
  private config: StripeConfig;

  constructor(config?: Partial<StripeConfig>) {
    super('PaymentService');
    this.config = {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      platformFeePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT || '5'),
      currency: 'aud',
      ...config,
    };

    if (this.config.secretKey && this.config.secretKey !== 'PLACEHOLDER-ADD-VIA-PORTAL') {
      this.stripe = new Stripe(this.config.secretKey, {
        apiVersion: '2024-04-10',
        typescript: true,
      });
    }
  }

  // ==========================================================================
  // STRIPE CHECKOUT SESSIONS
  // ==========================================================================

  /**
   * Create a Stripe Checkout Session for one-time payments
   */
  async createCheckoutSession(input: CheckoutSessionInput): Promise<Result<{ sessionId: string; url: string }>> {
    return this.withTiming('createCheckoutSession', async () => {
      if (!this.stripe) {
        return failure({
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Stripe is not configured. Add STRIPE_SECRET_KEY to environment.',
        });
      }

      try {
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
          payment_method_types: ['card'],
          line_items: input.lineItems.map(item => ({
            price_data: {
              currency: this.config.currency,
              product_data: {
                name: item.name,
                description: item.description,
              },
              unit_amount: item.amount,
            },
            quantity: item.quantity,
          })),
          mode: 'payment',
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: input.metadata,
          ...(input.customerEmail && { customer_email: input.customerEmail }),
          ...(input.customerId && { customer: input.customerId }),
        };

        // Handle Connect payments with platform fee
        if (input.connectedAccountId) {
          sessionParams.payment_intent_data = {
            application_fee_amount: input.applicationFeeAmount ||
              Math.round(input.lineItems.reduce((sum, item) => sum + item.amount * item.quantity, 0) * this.config.platformFeePercent / 100),
            transfer_data: {
              destination: input.connectedAccountId,
            },
          };
        }

        const session = await this.stripe.checkout.sessions.create(sessionParams);

        log.info('Checkout session created', {
          sessionId: session.id,
          amount: input.lineItems.reduce((sum, item) => sum + item.amount * item.quantity, 0),
        });

        await this.publishEvent('payment.checkout.created', 'system', {
          sessionId: session.id,
          url: session.url,
        });

        return success({
          sessionId: session.id,
          url: session.url!,
        });
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError;
        log.error('Failed to create checkout session', stripeError);
        return failure({
          code: 'STRIPE_ERROR',
          message: stripeError.message,
          details: { type: stripeError.type, code: stripeError.code },
        });
      }
    });
  }

  /**
   * Retrieve a checkout session by ID
   */
  async getCheckoutSession(sessionId: string): Promise<Result<Stripe.Checkout.Session>> {
    if (!this.stripe) {
      return failure({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured',
      });
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'customer'],
      });
      return success(session);
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      return failure({
        code: 'STRIPE_ERROR',
        message: stripeError.message,
      });
    }
  }

  // ==========================================================================
  // STRIPE SUBSCRIPTIONS
  // ==========================================================================

  /**
   * Create a subscription for a customer
   */
  async createSubscription(input: SubscriptionInput): Promise<Result<Stripe.Subscription>> {
    return this.withTiming('createSubscription', async () => {
      if (!this.stripe) {
        return failure({
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Stripe is not configured',
        });
      }

      try {
        const subscriptionParams: Stripe.SubscriptionCreateParams = {
          customer: input.customerId,
          items: [{ price: input.priceId }],
          metadata: input.metadata,
          payment_behavior: 'default_incomplete',
          payment_settings: {
            save_default_payment_method: 'on_subscription',
          },
          expand: ['latest_invoice.payment_intent'],
        };

        if (input.trialDays) {
          subscriptionParams.trial_period_days = input.trialDays;
        }

        // Handle Connect subscriptions with application fee
        if (input.connectedAccountId) {
          subscriptionParams.application_fee_percent = this.config.platformFeePercent;
          subscriptionParams.transfer_data = {
            destination: input.connectedAccountId,
          };
        }

        const subscription = await this.stripe.subscriptions.create(subscriptionParams);

        log.info('Subscription created', {
          subscriptionId: subscription.id,
          customerId: input.customerId,
          priceId: input.priceId,
        });

        await this.publishEvent('payment.subscription.created', 'system', {
          subscriptionId: subscription.id,
          customerId: input.customerId,
          status: subscription.status,
        });

        return success(subscription);
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError;
        log.error('Failed to create subscription', stripeError);
        return failure({
          code: 'STRIPE_ERROR',
          message: stripeError.message,
        });
      }
    });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelImmediately = false
  ): Promise<Result<Stripe.Subscription>> {
    if (!this.stripe) {
      return failure({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured',
      });
    }

    try {
      const subscription = cancelImmediately
        ? await this.stripe.subscriptions.cancel(subscriptionId)
        : await this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
          });

      log.info('Subscription cancelled', {
        subscriptionId,
        cancelImmediately,
        cancelAt: subscription.cancel_at,
      });

      await this.publishEvent('payment.subscription.cancelled', 'system', {
        subscriptionId,
        cancelImmediately,
      });

      return success(subscription);
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      return failure({
        code: 'STRIPE_ERROR',
        message: stripeError.message,
      });
    }
  }

  // ==========================================================================
  // STRIPE CONNECT
  // ==========================================================================

  /**
   * Create a Stripe Connect Express account for a tutor or school
   */
  async createConnectAccount(
    email: string,
    metadata: Record<string, string>
  ): Promise<Result<{ accountId: string; onboardingUrl: string }>> {
    return this.withTiming('createConnectAccount', async () => {
      if (!this.stripe) {
        return failure({
          code: 'STRIPE_NOT_CONFIGURED',
          message: 'Stripe is not configured',
        });
      }

      try {
        // Create Express account
        const account = await this.stripe.accounts.create({
          type: 'express',
          country: 'AU',
          email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          metadata,
        });

        // Generate onboarding link
        const accountLink = await this.stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${process.env.APP_URL}/onboarding/refresh?account=${account.id}`,
          return_url: `${process.env.APP_URL}/onboarding/complete?account=${account.id}`,
          type: 'account_onboarding',
        });

        log.info('Connect account created', {
          accountId: account.id,
          email,
        });

        await this.publishEvent('payment.connect.created', 'system', {
          accountId: account.id,
          email,
        });

        return success({
          accountId: account.id,
          onboardingUrl: accountLink.url,
        });
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError;
        log.error('Failed to create Connect account', stripeError);
        return failure({
          code: 'STRIPE_ERROR',
          message: stripeError.message,
        });
      }
    });
  }

  /**
   * Get Connect account onboarding status
   */
  async getConnectAccountStatus(accountId: string): Promise<Result<{
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirements: string[];
  }>> {
    if (!this.stripe) {
      return failure({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured',
      });
    }

    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      return success({
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements?.currently_due || [],
      });
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      return failure({
        code: 'STRIPE_ERROR',
        message: stripeError.message,
      });
    }
  }

  /**
   * Create a payout to a Connect account
   */
  async createConnectPayout(
    accountId: string,
    amount: number,
    currency = 'aud'
  ): Promise<Result<Stripe.Payout>> {
    if (!this.stripe) {
      return failure({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured',
      });
    }

    try {
      const payout = await this.stripe.payouts.create(
        {
          amount,
          currency,
        },
        {
          stripeAccount: accountId,
        }
      );

      log.info('Connect payout created', {
        payoutId: payout.id,
        accountId,
        amount,
      });

      await this.publishEvent('payment.payout.created', 'system', {
        payoutId: payout.id,
        accountId,
        amount,
      });

      return success(payout);
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      log.error('Failed to create payout', stripeError);
      return failure({
        code: 'STRIPE_ERROR',
        message: stripeError.message,
      });
    }
  }

  // ==========================================================================
  // WEBHOOK HANDLING
  // ==========================================================================

  /**
   * Verify and parse Stripe webhook event
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Result<Stripe.Event> {
    if (!this.stripe) {
      return failure({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured',
      });
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );
      return success(event);
    } catch (error) {
      const err = error as Error;
      log.error('Webhook signature verification failed', err);
      return failure({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: err.message,
      });
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<Result<{ handled: boolean }>> {
    return this.withTiming('handleWebhookEvent', async () => {
      try {
        log.info('Processing webhook event', { type: event.type, id: event.id });

        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            await this.handleCheckoutCompleted(session);
            break;
          }

          case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            await this.handlePaymentSucceeded(paymentIntent);
            break;
          }

          case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            await this.handlePaymentFailed(paymentIntent);
            break;
          }

          case 'customer.subscription.created':
          case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;
            await this.handleSubscriptionUpdated(subscription);
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            await this.handleSubscriptionCancelled(subscription);
            break;
          }

          case 'invoice.paid': {
            const invoice = event.data.object as Stripe.Invoice;
            await this.handleInvoicePaid(invoice);
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice;
            await this.handleInvoicePaymentFailed(invoice);
            break;
          }

          case 'account.updated': {
            const account = event.data.object as Stripe.Account;
            await this.handleConnectAccountUpdated(account);
            break;
          }

          case 'payout.paid': {
            const payout = event.data.object as Stripe.Payout;
            await this.handlePayoutCompleted(payout);
            break;
          }

          case 'payout.failed': {
            const payout = event.data.object as Stripe.Payout;
            await this.handlePayoutFailed(payout);
            break;
          }

          default:
            log.info('Unhandled webhook event type', { type: event.type });
        }

        return success({ handled: true });
      } catch (error) {
        log.error('Webhook handler error', error as Error);
        return failure({
          code: 'WEBHOOK_HANDLER_ERROR',
          message: (error as Error).message,
        });
      }
    });
  }

  // Webhook event handlers
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    log.info('Checkout completed', {
      sessionId: session.id,
      customerId: session.customer,
      amount: session.amount_total,
    });

    await this.publishEvent('payment.checkout.completed', 'system', {
      sessionId: session.id,
      customerId: session.customer,
      amount: session.amount_total,
      metadata: session.metadata,
    });
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    log.info('Payment succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
    });

    await this.publishEvent('payment.succeeded', 'system', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      metadata: paymentIntent.metadata,
    });
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    log.warn('Payment failed', {
      paymentIntentId: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message,
    });

    await this.publishEvent('payment.failed', 'system', {
      paymentIntentId: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message,
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    log.info('Subscription updated', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });

    await this.publishEvent('payment.subscription.updated', 'system', {
      subscriptionId: subscription.id,
      status: subscription.status,
      customerId: subscription.customer,
    });
  }

  private async handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
    log.info('Subscription cancelled', {
      subscriptionId: subscription.id,
    });

    await this.publishEvent('payment.subscription.cancelled', 'system', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    log.info('Invoice paid', {
      invoiceId: invoice.id,
      amount: invoice.amount_paid,
    });

    await this.publishEvent('payment.invoice.paid', 'system', {
      invoiceId: invoice.id,
      amount: invoice.amount_paid,
      customerId: invoice.customer,
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    log.warn('Invoice payment failed', {
      invoiceId: invoice.id,
    });

    await this.publishEvent('payment.invoice.failed', 'system', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
    });
  }

  private async handleConnectAccountUpdated(account: Stripe.Account): Promise<void> {
    log.info('Connect account updated', {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });

    await this.publishEvent('payment.connect.updated', 'system', {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  }

  private async handlePayoutCompleted(payout: Stripe.Payout): Promise<void> {
    log.info('Payout completed', {
      payoutId: payout.id,
      amount: payout.amount,
    });

    await this.publishEvent('payment.payout.completed', 'system', {
      payoutId: payout.id,
      amount: payout.amount,
    });
  }

  private async handlePayoutFailed(payout: Stripe.Payout): Promise<void> {
    log.error('Payout failed', {
      payoutId: payout.id,
      failureCode: payout.failure_code,
      failureMessage: payout.failure_message,
    });

    await this.publishEvent('payment.payout.failed', 'system', {
      payoutId: payout.id,
      failureCode: payout.failure_code,
      failureMessage: payout.failure_message,
    });
  }

  // ==========================================================================
  // STRIPE CUSTOMERS
  // ==========================================================================

  /**
   * Create or retrieve a Stripe customer
   */
  async getOrCreateCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<Result<Stripe.Customer>> {
    if (!this.stripe) {
      return failure({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured',
      });
    }

    try {
      // Check for existing customer
      const existingCustomers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return success(existingCustomers.data[0]);
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata,
      });

      log.info('Customer created', { customerId: customer.id, email });

      return success(customer);
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      return failure({
        code: 'STRIPE_ERROR',
        message: stripeError.message,
      });
    }
  }

  // ==========================================================================
  // REFUNDS
  // ==========================================================================

  /**
   * Create a refund for a payment
   */
  async createStripeRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ): Promise<Result<Stripe.Refund>> {
    if (!this.stripe) {
      return failure({
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe is not configured',
      });
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
        reason,
      });

      log.info('Refund created', {
        refundId: refund.id,
        paymentIntentId,
        amount: refund.amount,
      });

      await this.publishEvent('payment.refund.created', 'system', {
        refundId: refund.id,
        paymentIntentId,
        amount: refund.amount,
      });

      return success(refund);
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError;
      log.error('Failed to create refund', stripeError);
      return failure({
        code: 'STRIPE_ERROR',
        message: stripeError.message,
      });
    }
  }

  // ==========================================================================
  // ACCOUNT OPERATIONS
  // ==========================================================================

  /**
   * Create a new financial account for a tutor, school, or other entity
   */
  async createAccount(input: CreateAccountInput): Promise<Result<FinancialAccount>> {
    return this.withTiming('createAccount', async () => {
      try {
        // Validate required fields
        if (!input.ownerType || !input.ownerId || !input.ownerName || !input.ownerEmail) {
          return failure({
            code: 'VALIDATION_ERROR',
            message: 'Missing required account fields',
            details: { required: ['ownerType', 'ownerId', 'ownerName', 'ownerEmail'] },
          });
        }

        // Validate ABN if provided (Australian Business Number)
        if (input.legalEntity.abn) {
          if (!this.validateABN(input.legalEntity.abn)) {
            return failure({
              code: 'VALIDATION_ERROR',
              message: 'Invalid ABN format or checksum',
              details: { field: 'abn' },
            });
          }
        }

        const now = new Date();
        const account: FinancialAccount = {
          id: this.generateId('acc'),
          tenantId: input.tenantId,
          createdAt: now,
          updatedAt: now,
          ownerType: input.ownerType,
          ownerId: input.ownerId,
          ownerName: input.ownerName,
          ownerEmail: input.ownerEmail,
          legalEntity: {
            type: input.legalEntity.type,
            legalName: input.legalEntity.legalName,
            tradingName: input.legalEntity.tradingName || null,
            abn: input.legalEntity.abn || null,
            acn: input.legalEntity.acn || null,
            gstRegistered: input.legalEntity.gstRegistered || false,
            taxFileNumber: null,
            vatNumber: null,
            einNumber: null,
            legalAddress: null,
            legalContact: null,
          },
          balances: {
            available: 0,
            pending: 0,
            reserved: 0,
            tokenBalance: 0,
            lastUpdatedAt: now,
          },
          stripeConnect: {
            accountId: null,
            accountType: 'express',
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
            onboardingComplete: false,
            onboardingUrl: null,
            requirements: [],
            capabilities: {
              cardPayments: 'inactive',
              transfers: 'inactive',
              auBecsDebit: 'inactive',
            },
          },
          xeroIntegration: null,
          payoutMethod: null,
          settings: this.createDefaultSettings(input.settings),
          stats: this.createDefaultStats(),
          status: 'pending_setup',
          statusReason: null,
          statusChangedAt: now,
          verificationLevel: 'unverified',
          kycStatus: {
            status: 'not_started',
            submittedAt: null,
            reviewedAt: null,
            rejectionReason: null,
            documentsRequired: ['identity', 'address'],
            documentsSubmitted: [],
          },
          audit: {
            createdBy: 'system',
            updatedBy: 'system',
            createdAt: now,
            updatedAt: now,
          },
        };

        // In production, save to database
        log.info('Financial account created', {
          accountId: account.id,
          tenantId: input.tenantId,
          ownerType: input.ownerType,
        });

        await this.publishEvent('payment.account.created', input.tenantId, {
          accountId: account.id,
          ownerType: input.ownerType,
          ownerId: input.ownerId,
        });

        return success(account);
      } catch (error) {
        log.error('Failed to create account', error as Error);
        return failure({
          code: 'INTERNAL_ERROR',
          message: 'Failed to create financial account',
          details: { error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId: string): Promise<Result<FinancialAccount>> {
    return this.withTiming('getAccount', async () => {
      // In production, fetch from database
      // For now, return not found as this is a demo service
      return failure({
        code: 'NOT_FOUND',
        message: `Account not found: ${accountId}`,
      });
    });
  }

  /**
   * Start Stripe Connect onboarding for an account
   */
  async startOnboarding(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<Result<{ url: string }>> {
    return this.withTiming('startOnboarding', async () => {
      try {
        // In production, this would:
        // 1. Create Stripe Connect Express account
        // 2. Generate onboarding link
        // 3. Update account with Stripe account ID

        const mockOnboardingUrl = `https://connect.stripe.com/express/onboarding?account=${accountId}&return_url=${encodeURIComponent(returnUrl)}&refresh_url=${encodeURIComponent(refreshUrl)}`;

        log.info('Onboarding started', { accountId });

        return success({ url: mockOnboardingUrl });
      } catch (error) {
        log.error('Failed to start onboarding', error as Error);
        return failure({
          code: 'STRIPE_ERROR',
          message: 'Failed to start Stripe onboarding',
          details: { error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Complete onboarding after Stripe redirect
   */
  async completeOnboarding(accountId: string): Promise<Result<FinancialAccount>> {
    return this.withTiming('completeOnboarding', async () => {
      // In production, this would:
      // 1. Verify Stripe account is fully onboarded
      // 2. Update account status to 'active'
      // 3. Enable payouts

      return failure({
        code: 'NOT_FOUND',
        message: `Account not found: ${accountId}`,
      });
    });
  }

  // ==========================================================================
  // INVOICE OPERATIONS
  // ==========================================================================

  /**
   * Create a new invoice
   */
  async createInvoice(input: CreateInvoiceInput): Promise<Result<Invoice>> {
    return this.withTiming('createInvoice', async () => {
      try {
        // Validate required fields
        if (!input.issuerId || !input.recipientDetails || !input.lineItems?.length) {
          return failure({
            code: 'VALIDATION_ERROR',
            message: 'Missing required invoice fields',
            details: { required: ['issuerId', 'recipientDetails', 'lineItems'] },
          });
        }

        const now = new Date();
        const invoiceNumber = this.generateInvoiceNumber('INV', 1);

        // Calculate totals
        const { subtotal, discountTotal, taxTotal, total } = this.calculateInvoiceTotals(
          input.lineItems.map((item, index) => ({
            id: this.generateId('li'),
            description: item.description,
            feeStructureId: item.feeStructureId || null,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            periodStart: null,
            periodEnd: null,
            taxRate: item.taxRate || 10, // Default 10% GST
            taxAmount: 0,
            taxCode: null,
            discountPercentage: item.discountPercentage || null,
            discountAmount: null,
            discountReason: item.discountReason || null,
            accountCode: null,
            trackingCategories: null,
            metadata: null,
          }))
        );

        const invoice: Invoice = {
          id: this.generateId('inv'),
          tenantId: input.tenantId,
          createdAt: now,
          updatedAt: now,
          issuerId: input.issuerId,
          issuerAccountId: input.issuerId,
          issuerDetails: {
            name: 'Scholarly Platform',
            email: 'billing@scholarly.edu.au',
            phone: null,
            address: null,
            abn: null,
          },
          recipientId: input.recipientId || this.generateId('rec'),
          recipientType: input.recipientType,
          recipientDetails: {
            name: input.recipientDetails.name,
            email: input.recipientDetails.email,
            phone: input.recipientDetails.phone || null,
            address: input.recipientDetails.address || null,
            abn: null,
          },
          studentId: input.studentId || null,
          studentName: input.studentName || null,
          enrollmentId: input.enrollmentId || null,
          invoiceNumber,
          reference: null,
          purchaseOrderNumber: input.purchaseOrderNumber || null,
          issueDate: now,
          dueDate: input.dueDate,
          periodStart: input.periodStart || null,
          periodEnd: input.periodEnd || null,
          lineItems: input.lineItems.map((item, index) => ({
            id: this.generateId('li'),
            description: item.description,
            feeStructureId: item.feeStructureId || null,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            periodStart: null,
            periodEnd: null,
            taxRate: item.taxRate || 10,
            taxAmount: Math.round((item.quantity * item.unitPrice) * (item.taxRate || 10) / 100),
            taxCode: null,
            discountPercentage: item.discountPercentage || null,
            discountAmount: item.discountPercentage
              ? Math.round((item.quantity * item.unitPrice) * item.discountPercentage / 100)
              : null,
            discountReason: item.discountReason || null,
            accountCode: null,
            trackingCategories: null,
            metadata: null,
          })),
          subtotal,
          discountTotal,
          taxTotal,
          total,
          amountPaid: 0,
          amountDue: total,
          currency: 'AUD',
          status: 'draft',
          statusHistory: [
            {
              status: 'draft',
              changedAt: now,
              changedBy: 'system',
              reason: 'Invoice created',
            },
          ],
          payments: [],
          paymentPlan: null,
          reminders: [],
          notes: input.notes || null,
          internalNotes: null,
          terms: 'Payment due within 14 days',
          xeroSync: null,
          stripeInvoiceId: null,
          stripePaymentIntentId: null,
          viewUrl: null,
          pdfUrl: null,
          metadata: {},
          audit: {
            createdBy: 'system',
            updatedBy: 'system',
            createdAt: now,
            updatedAt: now,
          },
        };

        log.info('Invoice created', {
          invoiceId: invoice.id,
          invoiceNumber,
          tenantId: input.tenantId,
          total,
        });

        await this.publishEvent('payment.invoice.created', input.tenantId, {
          invoiceId: invoice.id,
          invoiceNumber,
          total,
          recipientEmail: input.recipientDetails.email,
        });

        return success(invoice);
      } catch (error) {
        log.error('Failed to create invoice', error as Error);
        return failure({
          code: 'INTERNAL_ERROR',
          message: 'Failed to create invoice',
          details: { error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Result<Invoice>> {
    return this.withTiming('getInvoice', async () => {
      return failure({
        code: 'NOT_FOUND',
        message: `Invoice not found: ${invoiceId}`,
      });
    });
  }

  /**
   * Send invoice to recipient
   */
  async sendInvoice(invoiceId: string): Promise<Result<Invoice>> {
    return this.withTiming('sendInvoice', async () => {
      // In production, this would:
      // 1. Update invoice status to 'sent'
      // 2. Send email notification
      // 3. Generate payment link

      return failure({
        code: 'NOT_FOUND',
        message: `Invoice not found: ${invoiceId}`,
      });
    });
  }

  /**
   * Process a payment for an invoice
   */
  async processPayment(input: ProcessPaymentInput): Promise<Result<InvoicePayment>> {
    return this.withTiming('processPayment', async () => {
      try {
        // Validate input
        if (!input.invoiceId || !input.amount || !input.method) {
          return failure({
            code: 'VALIDATION_ERROR',
            message: 'Missing required payment fields',
            details: { required: ['invoiceId', 'amount', 'method'] },
          });
        }

        const now = new Date();
        const payment: InvoicePayment = {
          id: this.generateId('pay'),
          amount: input.amount,
          currency: 'AUD',
          method: input.method,
          stripePaymentIntentId: null,
          stripeChargeId: null,
          cardBrand: null,
          cardLast4: null,
          status: 'succeeded',
          failureReason: null,
          paidAt: now,
          processedAt: now,
          receiptUrl: null,
          receiptNumber: this.generateId('rcpt'),
          createdBy: 'system',
          createdAt: now,
        };

        log.info('Payment processed', {
          paymentId: payment.id,
          invoiceId: input.invoiceId,
          amount: input.amount,
          method: input.method,
        });

        return success(payment);
      } catch (error) {
        log.error('Failed to process payment', error as Error);
        return failure({
          code: 'PAYMENT_FAILED',
          message: 'Failed to process payment',
          details: { error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // PAYOUT OPERATIONS
  // ==========================================================================

  /**
   * Create a payout to a tutor or school
   */
  async createPayout(input: CreatePayoutInput): Promise<Result<Payout>> {
    return this.withTiming('createPayout', async () => {
      try {
        if (!input.accountId) {
          return failure({
            code: 'VALIDATION_ERROR',
            message: 'Account ID is required',
          });
        }

        const now = new Date();
        const amount = input.amount || 10000; // Default $100 for demo

        const payout: Payout = {
          id: this.generateId('pyt'),
          tenantId: 'demo',
          createdAt: now,
          updatedAt: now,
          accountId: input.accountId,
          amount,
          currency: 'AUD',
          breakdown: {
            grossEarnings: Math.round(amount * 1.05), // 5% platform fee
            platformFees: Math.round(amount * 0.05),
            paymentProcessingFees: Math.round(amount * 0.015),
            refundsDeducted: 0,
            adjustments: 0,
            taxWithheld: 0,
            netPayout: amount,
          },
          transactions: [],
          stripePayoutId: null,
          stripeTransferId: null,
          destinationBankName: 'Demo Bank',
          destinationLast4: '1234',
          status: 'pending',
          statusHistory: [
            { status: 'pending', at: now, reason: 'Payout created' },
          ],
          scheduledFor: input.scheduledFor || null,
          initiatedAt: null,
          estimatedArrival: null,
          arrivedAt: null,
          failureCode: null,
          failureReason: null,
          retryCount: 0,
          lastRetryAt: null,
          statementDescriptor: 'SCHOLARLY PAYOUT',
          statementPeriod: {
            from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            to: now,
          },
          xeroPaymentId: null,
          xeroSyncStatus: 'pending',
          audit: {
            createdBy: 'system',
            updatedBy: 'system',
            createdAt: now,
            updatedAt: now,
          },
        };

        log.info('Payout created', {
          payoutId: payout.id,
          accountId: input.accountId,
          amount,
        });

        return success(payout);
      } catch (error) {
        log.error('Failed to create payout', error as Error);
        return failure({
          code: 'PAYOUT_FAILED',
          message: 'Failed to create payout',
          details: { error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // REFUND OPERATIONS
  // ==========================================================================

  /**
   * Process a refund for a payment
   */
  async processRefund(input: CreateRefundInput): Promise<Result<Refund>> {
    return this.withTiming('processRefund', async () => {
      try {
        if (!input.invoiceId || !input.paymentId || !input.amount) {
          return failure({
            code: 'VALIDATION_ERROR',
            message: 'Missing required refund fields',
            details: { required: ['invoiceId', 'paymentId', 'amount'] },
          });
        }

        const now = new Date();
        const refund: Refund = {
          id: this.generateId('ref'),
          tenantId: 'demo',
          createdAt: now,
          updatedAt: now,
          invoiceId: input.invoiceId,
          paymentId: input.paymentId,
          accountId: 'demo',
          amount: input.amount,
          currency: 'AUD',
          reason: input.reason,
          reasonDescription: input.reasonDescription || null,
          stripeRefundId: null,
          stripeStatus: null,
          status: 'succeeded',
          processedAt: now,
          failureReason: null,
          deductedFromPayoutId: null,
          audit: {
            createdBy: 'system',
            updatedBy: 'system',
            createdAt: now,
            updatedAt: now,
          },
        };

        log.info('Refund processed', {
          refundId: refund.id,
          invoiceId: input.invoiceId,
          amount: input.amount,
        });

        return success(refund);
      } catch (error) {
        log.error('Failed to process refund', error as Error);
        return failure({
          code: 'INTERNAL_ERROR',
          message: 'Failed to process refund',
          details: { error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private validateABN(abn: string): boolean {
    const cleanABN = abn.replace(/\s/g, '');
    if (!/^\d{11}$/.test(cleanABN)) return false;

    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    const digits = cleanABN.split('').map(Number);
    digits[0] -= 1;

    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += digits[i] * weights[i];
    }

    return sum % 89 === 0;
  }

  private generateInvoiceNumber(prefix: string, sequence: number): string {
    const year = new Date().getFullYear();
    const paddedSequence = sequence.toString().padStart(5, '0');
    return `${prefix}-${year}-${paddedSequence}`;
  }

  private calculateInvoiceTotals(lineItems: { amount: number; taxRate: number; discountPercentage: number | null }[]): {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
  } {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    for (const item of lineItems) {
      const lineAmount = item.amount;
      const discount = item.discountPercentage
        ? Math.round(lineAmount * item.discountPercentage / 100)
        : 0;
      const afterDiscount = lineAmount - discount;
      const tax = Math.round(afterDiscount * item.taxRate / 100);

      subtotal += afterDiscount;
      discountTotal += discount;
      taxTotal += tax;
    }

    return {
      subtotal,
      discountTotal,
      taxTotal,
      total: subtotal + taxTotal,
    };
  }

  private createDefaultSettings(overrides?: Partial<AccountSettings>): AccountSettings {
    return {
      autoPayoutEnabled: true,
      payoutSchedule: 'weekly',
      payoutThreshold: 5000, // $50 minimum
      payoutCurrency: 'AUD',
      currency: 'AUD',
      invoicePrefix: 'INV',
      invoiceNumberSequence: 1,
      defaultPaymentTerms: 14,
      lateFeeEnabled: false,
      lateFeePercentage: null,
      lateFeeGraceDays: 7,
      sendReminders: true,
      reminderSchedule: [-7, -3, -1, 1, 3, 7],
      reminderChannels: ['email'],
      defaultTaxRate: 10, // GST
      taxInclusive: true,
      emailOnPaymentReceived: true,
      emailOnPayoutProcessed: true,
      emailOnInvoiceViewed: false,
      timezone: 'Australia/Sydney',
      ...overrides,
    };
  }

  private createDefaultStats(): AccountStatistics {
    return {
      lifetimeReceived: 0,
      lifetimePaid: 0,
      lifetimeFees: 0,
      lifetimeRefunded: 0,
      invoicesIssued: 0,
      invoicesPaid: 0,
      invoicesOverdue: 0,
      averagePaymentDays: 0,
      onTimePaymentRate: 100,
      payoutsProcessed: 0,
      averagePayoutAmount: 0,
      disputeCount: 0,
      disputeRate: 0,
      lastTransactionAt: null,
      lastPayoutAt: null,
    };
  }
}

// ============================================================================
// SINGLETON MANAGEMENT
// ============================================================================

let paymentService: PaymentService | null = null;

export function initializePaymentService(): PaymentService {
  paymentService = new PaymentService();
  return paymentService;
}

export function getPaymentService(): PaymentService {
  if (!paymentService) {
    paymentService = new PaymentService();
  }
  return paymentService;
}
