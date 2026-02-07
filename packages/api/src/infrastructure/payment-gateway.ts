/**
 * Scholarly Platform — Payment Infrastructure
 * =============================================
 *
 * REM-002 / REM-006 / REM-008: The current payment system passes null as any
 * for both Stripe and Xero, meaning every payment operation crashes immediately.
 * This module provides the complete payment pipeline: Stripe Connect for
 * marketplace payments, subscription management, webhook handling, and
 * Xero integration for accounting reconciliation.
 *
 * ## Architecture
 *
 * Payment flow follows a three-layer pattern:
 *
 *   API Routes → PaymentService → { StripeGateway, XeroClient, PaymentRepositories }
 *
 * The PaymentService orchestrates business logic. The StripeGateway handles
 * all Stripe API communication. The XeroClient syncs invoices and payments
 * to the accounting system. The repositories persist local records.
 *
 * ## Stripe Connect Model
 *
 * Scholarly uses Stripe Connect in "destination charges" mode:
 * - The platform creates charges on behalf of connected accounts (creators)
 * - Platform fee is deducted before funds reach the creator
 * - Parents pay Scholarly; Scholarly pays creators minus platform fee
 *
 * @module infrastructure/payment
 * @version 1.0.0
 */

import Stripe from 'stripe';
import { Logger } from 'pino';
import { logAuditEvent } from './logger';

// ============================================================================
// SECTION 1: TYPE DEFINITIONS
// ============================================================================

export interface PaymentConfig {
  stripe: {
    secretKey: string;
    webhookSecret: string;
    connectEnabled: boolean;
    currency: string;
    taxBehavior: 'exclusive' | 'inclusive' | 'unspecified';
  };
  xero?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string;
    tenantId?: string;
  };
  logger: Logger;
}

// -- Subscription types --

export interface SubscriptionPlan {
  id: string;
  name: string;
  stripePriceId: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  features: string[];
  maxLearners: number;
  aiRequestsPerMonth: number;
  storybookDownloads: number;
}

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  planId: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  userId: string;
  stripePaymentIntentId: string;
  amountCents: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  description: string;
  metadata: Record<string, string>;
  createdAt: Date;
}

export interface ConnectedAccountRecord {
  id: string;
  tenantId: string;
  userId: string;
  stripeAccountId: string;
  status: 'pending' | 'active' | 'restricted' | 'disabled';
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  country: string;
  defaultCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceRecord {
  id: string;
  tenantId: string;
  userId: string;
  stripeInvoiceId: string;
  amountCents: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  pdfUrl?: string;
  xeroInvoiceId?: string;
  createdAt: Date;
}

// -- Repository interfaces --

export interface SubscriptionRepository {
  findByTenantAndUser(tenantId: string, userId: string): Promise<SubscriptionRecord | null>;
  findByStripeId(stripeSubscriptionId: string): Promise<SubscriptionRecord | null>;
  create(record: Omit<SubscriptionRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionRecord>;
  update(id: string, updates: Partial<SubscriptionRecord>): Promise<SubscriptionRecord>;
  listByTenant(tenantId: string): Promise<SubscriptionRecord[]>;
}

export interface PaymentRepository {
  create(record: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<PaymentRecord>;
  findByStripeId(stripePaymentIntentId: string): Promise<PaymentRecord | null>;
  listByTenant(tenantId: string, options?: { limit?: number; offset?: number }): Promise<PaymentRecord[]>;
  update(id: string, updates: Partial<PaymentRecord>): Promise<PaymentRecord>;
}

export interface ConnectedAccountRepository {
  findByUserId(tenantId: string, userId: string): Promise<ConnectedAccountRecord | null>;
  findByStripeAccountId(stripeAccountId: string): Promise<ConnectedAccountRecord | null>;
  create(record: Omit<ConnectedAccountRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConnectedAccountRecord>;
  update(id: string, updates: Partial<ConnectedAccountRecord>): Promise<ConnectedAccountRecord>;
}

export interface InvoiceRepository {
  create(record: Omit<InvoiceRecord, 'id' | 'createdAt'>): Promise<InvoiceRecord>;
  findByStripeId(stripeInvoiceId: string): Promise<InvoiceRecord | null>;
  update(id: string, updates: Partial<InvoiceRecord>): Promise<InvoiceRecord>;
  listByTenant(tenantId: string, options?: { limit?: number; offset?: number }): Promise<InvoiceRecord[]>;
}

// ============================================================================
// SECTION 2: STRIPE GATEWAY
// ============================================================================

export class StripeGateway {
  private readonly stripe: Stripe;
  private readonly config: PaymentConfig;
  private readonly logger: Logger;

  constructor(config: PaymentConfig) {
    this.config = config;
    this.logger = config.logger.child({ module: 'StripeGateway' });
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
      typescript: true,
      maxNetworkRetries: 3,
      timeout: 30000,
    });
  }

  // -- Customer Management --

  async createCustomer(params: {
    email: string;
    name: string;
    tenantId: string;
    userId: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        tenantId: params.tenantId,
        userId: params.userId,
        ...params.metadata,
      },
    });
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    const customer = await this.stripe.customers.retrieve(customerId);
    if (customer.deleted) throw new Error(`Customer ${customerId} has been deleted`);
    return customer as Stripe.Customer;
  }

  // -- Subscription Management --

  async createSubscription(params: {
    customerId: string;
    priceId: string;
    trialDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      trial_period_days: params.trialDays,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: params.metadata,
    });
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true): Promise<Stripe.Subscription> {
    if (atPeriodEnd) {
      return this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    }
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  async updateSubscription(subscriptionId: string, priceId: string): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    return this.stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: priceId,
      }],
      proration_behavior: 'create_prorations',
    });
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice'],
    });
  }

  // -- Stripe Connect --

  async createConnectedAccount(params: {
    email: string;
    country: string;
    type?: Stripe.AccountCreateParams.Type;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Account> {
    return this.stripe.accounts.create({
      type: params.type ?? 'express',
      email: params.email,
      country: params.country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: params.metadata,
    });
  }

  async createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<Stripe.AccountLink> {
    return this.stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: 'account_onboarding',
    });
  }

  async createTransfer(params: {
    amountCents: number;
    currency: string;
    destinationAccountId: string;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Transfer> {
    return this.stripe.transfers.create({
      amount: params.amountCents,
      currency: params.currency,
      destination: params.destinationAccountId,
      description: params.description,
      metadata: params.metadata,
    });
  }

  // -- Checkout --

  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      subscription_data: {
        trial_period_days: params.trialDays,
        metadata: params.metadata,
      },
    });
  }

  async createBillingPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  // -- Webhook Verification --

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.config.stripe.webhookSecret,
    );
  }

  // -- Invoices --

  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return this.stripe.invoices.retrieve(invoiceId);
  }

  async listInvoices(customerId: string, limit: number = 10): Promise<Stripe.ApiList<Stripe.Invoice>> {
    return this.stripe.invoices.list({ customer: customerId, limit });
  }
}

// ============================================================================
// SECTION 3: XERO CLIENT
// ============================================================================

/**
 * Xero accounting integration for invoice and payment reconciliation.
 * Uses the Xero OAuth 2.0 API to create and sync invoices.
 */
export class XeroClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private readonly config: NonNullable<PaymentConfig['xero']>;
  private readonly logger: Logger;

  constructor(config: NonNullable<PaymentConfig['xero']>, logger: Logger) {
    this.config = config;
    this.logger = logger.child({ module: 'XeroClient' });
  }

  /**
   * Initiates the OAuth 2.0 authorization flow.
   * Returns the URL the user should be redirected to for authorization.
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes,
      state,
    });
    return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
  }

  /**
   * Exchanges an authorization code for access and refresh tokens.
   */
  async exchangeCode(code: string): Promise<void> {
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Xero token exchange failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as { access_token: string; refresh_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    this.logger.info('Xero tokens obtained');
  }

  /**
   * Refreshes the access token using the refresh token.
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) throw new Error('No Xero refresh token available');

    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Xero token refresh failed: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; refresh_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  }

  /**
   * Gets a valid access token, refreshing if necessary.
   */
  private async getValidToken(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiresAt || new Date() >= this.tokenExpiresAt) {
      await this.refreshAccessToken();
    }
    return this.accessToken!;
  }

  /**
   * Creates an invoice in Xero for a subscription payment.
   */
  async createInvoice(params: {
    contactName: string;
    contactEmail: string;
    description: string;
    amountCents: number;
    currency: string;
    reference: string;
    dueDate: Date;
  }): Promise<{ invoiceId: string; invoiceNumber: string }> {
    const token = await this.getValidToken();
    const tenantId = this.config.tenantId;
    if (!tenantId) throw new Error('Xero tenant ID not configured');

    const body = {
      Invoices: [{
        Type: 'ACCREC',
        Contact: { Name: params.contactName, EmailAddress: params.contactEmail },
        LineItems: [{
          Description: params.description,
          Quantity: 1,
          UnitAmount: params.amountCents / 100,
          AccountCode: '200', // Revenue account
        }],
        CurrencyCode: params.currency.toUpperCase(),
        Reference: params.reference,
        DueDateString: params.dueDate.toISOString().split('T')[0],
        Status: 'AUTHORISED',
      }],
    };

    const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Xero-tenant-id': tenantId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error({ status: response.status, body: errText }, 'Xero invoice creation failed');
      throw new Error(`Xero invoice creation failed: ${response.status}`);
    }

    const data = await response.json() as { Invoices: Array<{ InvoiceID: string; InvoiceNumber: string }> };
    const invoice = data.Invoices[0];

    this.logger.info({ invoiceId: invoice.InvoiceID, invoiceNumber: invoice.InvoiceNumber }, 'Xero invoice created');
    return { invoiceId: invoice.InvoiceID, invoiceNumber: invoice.InvoiceNumber };
  }

  /**
   * Records a payment against an existing Xero invoice.
   */
  async recordPayment(params: {
    invoiceId: string;
    amountCents: number;
    date: Date;
    reference: string;
  }): Promise<string> {
    const token = await this.getValidToken();
    const tenantId = this.config.tenantId;
    if (!tenantId) throw new Error('Xero tenant ID not configured');

    const body = {
      Invoice: { InvoiceID: params.invoiceId },
      Account: { Code: '090' }, // Bank account
      Amount: params.amountCents / 100,
      Date: params.date.toISOString().split('T')[0],
      Reference: params.reference,
    };

    const response = await fetch('https://api.xero.com/api.xro/2.0/Payments', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Xero-tenant-id': tenantId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Xero payment recording failed: ${response.status}`);
    }

    const data = await response.json() as { Payments: Array<{ PaymentID: string }> };
    this.logger.info({ paymentId: data.Payments[0].PaymentID }, 'Xero payment recorded');
    return data.Payments[0].PaymentID;
  }

  /** Sets stored tokens (e.g., loaded from database on startup). */
  setTokens(accessToken: string, refreshToken: string, expiresAt: Date): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = expiresAt;
  }

  /** Gets current tokens for persistence. */
  getTokens(): { accessToken: string | null; refreshToken: string | null; expiresAt: Date | null } {
    return { accessToken: this.accessToken, refreshToken: this.refreshToken, expiresAt: this.tokenExpiresAt };
  }
}

// ============================================================================
// SECTION 4: WEBHOOK HANDLER
// ============================================================================

export interface WebhookHandlerDeps {
  stripe: StripeGateway;
  subscriptionRepo: SubscriptionRepository;
  paymentRepo: PaymentRepository;
  connectedAccountRepo: ConnectedAccountRepository;
  invoiceRepo: InvoiceRepository;
  xero?: XeroClient;
  eventBus: { publish: (subject: string, data: unknown, context: { tenantId: string; source: string }) => Promise<void> };
  logger: Logger;
}

/**
 * Handles Stripe webhook events. Each event type maps to a specific
 * handler that updates local records and publishes domain events.
 */
export class StripeWebhookHandler {
  private readonly deps: WebhookHandlerDeps;
  private readonly logger: Logger;

  constructor(deps: WebhookHandlerDeps) {
    this.deps = deps;
    this.logger = deps.logger.child({ module: 'StripeWebhookHandler' });
  }

  async handleEvent(event: Stripe.Event): Promise<void> {
    this.logger.info({ eventType: event.type, eventId: event.id }, 'Processing Stripe webhook');

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'account.updated':
        await this.handleConnectedAccountUpdate(event.data.object as Stripe.Account);
        break;

      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        this.logger.debug({ eventType: event.type }, 'Unhandled webhook event type');
    }
  }

  private async handleSubscriptionUpdate(sub: Stripe.Subscription): Promise<void> {
    const existing = await this.deps.subscriptionRepo.findByStripeId(sub.id);
    const tenantId = sub.metadata?.tenantId ?? existing?.tenantId ?? 'unknown';

    const updates = {
      status: sub.status as SubscriptionRecord['status'],
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };

    if (existing) {
      await this.deps.subscriptionRepo.update(existing.id, updates);
    } else {
      await this.deps.subscriptionRepo.create({
        tenantId,
        userId: sub.metadata?.userId ?? 'unknown',
        stripeSubscriptionId: sub.id,
        stripeCustomerId: sub.customer as string,
        planId: sub.items.data[0]?.price?.id ?? 'unknown',
        ...updates,
      });
    }

    await this.deps.eventBus.publish('scholarly.payment.subscription.updated', {
      subscriptionId: sub.id,
      status: sub.status,
      tenantId,
    }, { tenantId, source: 'StripeWebhookHandler' });
  }

  private async handleSubscriptionCanceled(sub: Stripe.Subscription): Promise<void> {
    const existing = await this.deps.subscriptionRepo.findByStripeId(sub.id);
    if (existing) {
      await this.deps.subscriptionRepo.update(existing.id, { status: 'canceled' });
    }

    const tenantId = existing?.tenantId ?? sub.metadata?.tenantId ?? 'unknown';
    await this.deps.eventBus.publish('scholarly.payment.subscription.canceled', {
      subscriptionId: sub.id,
      tenantId,
    }, { tenantId, source: 'StripeWebhookHandler' });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const tenantId = invoice.metadata?.tenantId ?? 'unknown';
    const existing = await this.deps.invoiceRepo.findByStripeId(invoice.id);

    if (existing) {
      await this.deps.invoiceRepo.update(existing.id, {
        status: 'paid',
        pdfUrl: invoice.invoice_pdf ?? undefined,
      });
    } else {
      await this.deps.invoiceRepo.create({
        tenantId,
        userId: invoice.metadata?.userId ?? 'unknown',
        stripeInvoiceId: invoice.id,
        amountCents: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        pdfUrl: invoice.invoice_pdf ?? undefined,
      });
    }

    // Sync to Xero if configured
    if (this.deps.xero && invoice.amount_paid > 0) {
      try {
        const xeroResult = await this.deps.xero.createInvoice({
          contactName: invoice.customer_name ?? 'Unknown',
          contactEmail: invoice.customer_email ?? '',
          description: `Scholarly subscription - ${invoice.lines.data.map((l) => l.description).join(', ')}`,
          amountCents: invoice.amount_paid,
          currency: invoice.currency,
          reference: invoice.id,
          dueDate: new Date(),
        });

        if (existing) {
          await this.deps.invoiceRepo.update(existing.id, { xeroInvoiceId: xeroResult.invoiceId });
        }

        // Record payment in Xero
        await this.deps.xero.recordPayment({
          invoiceId: xeroResult.invoiceId,
          amountCents: invoice.amount_paid,
          date: new Date(),
          reference: invoice.id,
        });
      } catch (xeroErr) {
        this.logger.error({ xeroErr, invoiceId: invoice.id }, 'Failed to sync invoice to Xero');
        // Non-fatal: Xero sync failure shouldn't block the payment flow
      }
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const tenantId = invoice.metadata?.tenantId ?? 'unknown';
    await this.deps.eventBus.publish('scholarly.payment.invoice.failed', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amountCents: invoice.amount_due,
      tenantId,
    }, { tenantId, source: 'StripeWebhookHandler' });
  }

  private async handleConnectedAccountUpdate(account: Stripe.Account): Promise<void> {
    const existing = await this.deps.connectedAccountRepo.findByStripeAccountId(account.id);
    if (existing) {
      await this.deps.connectedAccountRepo.update(existing.id, {
        payoutsEnabled: account.payouts_enabled ?? false,
        chargesEnabled: account.charges_enabled ?? false,
        status: account.charges_enabled ? 'active' : 'restricted',
      });
    }
  }

  private async handlePaymentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
    const tenantId = pi.metadata?.tenantId ?? 'unknown';
    await this.deps.paymentRepo.create({
      tenantId,
      userId: pi.metadata?.userId ?? 'unknown',
      stripePaymentIntentId: pi.id,
      amountCents: pi.amount,
      currency: pi.currency,
      status: 'succeeded',
      description: pi.description ?? 'Payment',
      metadata: pi.metadata ?? {},
    });
  }
}
