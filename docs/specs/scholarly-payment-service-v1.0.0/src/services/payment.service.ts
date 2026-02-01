/**
 * Scholarly Payment Service
 * 
 * The core service orchestrating all payment operations in the Scholarly ecosystem.
 * 
 * @module ScholarlyPayment/Services
 * @version 1.0.0
 */

import Stripe from 'stripe';
import {
  Result,
  success,
  failure,
  PaymentError,
  ValidationError,
  NotFoundError,
  InsufficientFundsError,
  StripeIntegrationError,
  FinancialAccount,
  AccountOwnerType,
  AccountStatus,
  AccountSettings,
  LegalEntityDetails,
  AccountBalances,
  StripeConnectDetails,
  KYCStatus,
  AuditInfo,
  Invoice,
  InvoiceStatus,
  InvoiceLineItem,
  InvoicePayment,
  CreateInvoiceInput,
  ProcessPaymentInput,
  Payout,
  PayoutStatus,
  PayoutBreakdown,
  CreatePayoutInput,
  Refund,
  CreateRefundInput,
  FeeCategory,
  Currency,
  CreateAccountInput
} from '../types';

import {
  logger,
  publishEvent,
  validators,
  generateId,
  generateInvoiceNumber,
  getConfig,
  calculatePlatformFee,
  calculateGST,
  addDays,
  formatMoney
} from '../infrastructure';

import {
  FinancialAccountRepository,
  getFinancialAccountRepository
} from '../repositories/account.repository';

import {
  InvoiceRepository,
  getInvoiceRepository
} from '../repositories/invoice.repository';

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class PaymentService {
  private readonly accountRepo: FinancialAccountRepository;
  private readonly invoiceRepo: InvoiceRepository;
  private readonly stripe: Stripe;
  private readonly log = logger.child({ service: 'PaymentService' });

  constructor(deps?: {
    accountRepository?: FinancialAccountRepository;
    invoiceRepository?: InvoiceRepository;
    stripe?: Stripe;
  }) {
    this.accountRepo = deps?.accountRepository ?? getFinancialAccountRepository();
    this.invoiceRepo = deps?.invoiceRepository ?? getInvoiceRepository();
    this.stripe = deps?.stripe ?? new Stripe(getConfig().stripeSecretKey, {
      apiVersion: '2023-10-16'
    });
  }

  // ==========================================================================
  // FINANCIAL ACCOUNT OPERATIONS
  // ==========================================================================

  /**
   * Create a new financial account
   */
  async createAccount(input: CreateAccountInput): Promise<Result<FinancialAccount>> {
    try {
      validators.tenantId(input.tenantId);
      validators.accountOwnerType(input.ownerType);
      validators.nonEmptyString(input.ownerName, 'ownerName');
      validators.email(input.ownerEmail);
      validators.legalEntityType(input.legalEntity.type);

      const existing = await this.accountRepo.findByTenantAndOwner(input.tenantId, input.ownerId);
      if (existing) {
        return failure(new ValidationError('Account already exists for this owner', 'ownerId'));
      }

      if (input.legalEntity.abn) {
        validators.abn(input.legalEntity.abn);
      }

      const config = getConfig();
      const now = new Date();

      const defaultSettings = this.getDefaultSettings(input.ownerType, config);
      const settings: AccountSettings = { ...defaultSettings, ...input.settings };

      const stripeConnect: StripeConnectDetails = {
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
          auBecsDebit: 'inactive'
        }
      };

      const balances: AccountBalances = {
        available: 0,
        pending: 0,
        reserved: 0,
        tokenBalance: 0,
        lastUpdatedAt: now
      };

      const legalEntity: LegalEntityDetails = {
        type: input.legalEntity.type,
        legalName: input.legalEntity.legalName,
        tradingName: input.legalEntity.tradingName || null,
        abn: input.legalEntity.abn || null,
        acn: input.legalEntity.acn || null,
        gstRegistered: input.legalEntity.gstRegistered ?? false,
        taxFileNumber: null,
        vatNumber: null,
        einNumber: null,
        legalAddress: null,
        legalContact: null
      };

      const kycStatus: KYCStatus = {
        status: 'not_started',
        submittedAt: null,
        reviewedAt: null,
        rejectionReason: null,
        documentsRequired: this.getRequiredDocuments(input.ownerType),
        documentsSubmitted: []
      };

      const audit: AuditInfo = {
        createdBy: 'system',
        updatedBy: 'system',
        createdAt: now,
        updatedAt: now
      };

      const account = await this.accountRepo.create({
        tenantId: input.tenantId,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        ownerName: input.ownerName,
        ownerEmail: input.ownerEmail,
        legalEntity,
        balances,
        stripeConnect,
        xeroIntegration: null,
        payoutMethod: null,
        settings,
        stats: {
          lifetimeReceived: 0,
          lifetimePaid: 0,
          lifetimeFees: 0,
          lifetimeRefunded: 0,
          invoicesIssued: 0,
          invoicesPaid: 0,
          invoicesOverdue: 0,
          averagePaymentDays: 0,
          onTimePaymentRate: 0,
          payoutsProcessed: 0,
          averagePayoutAmount: 0,
          disputeCount: 0,
          disputeRate: 0,
          lastTransactionAt: null,
          lastPayoutAt: null
        },
        status: 'pending_setup',
        statusReason: null,
        statusChangedAt: now,
        verificationLevel: 'unverified',
        kycStatus,
        audit
      });

      await publishEvent('account.created', input.tenantId, account.id, {
        ownerType: input.ownerType,
        ownerName: input.ownerName
      });

      this.log.info('Financial account created', {
        accountId: account.id,
        tenantId: input.tenantId,
        ownerType: input.ownerType
      });

      return success(account);
    } catch (error) {
      this.log.error('Failed to create account', error as Error);
      if (error instanceof PaymentError) {
        return failure(error);
      }
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  /**
   * Start Stripe Connect onboarding
   */
  async startOnboarding(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<Result<{ url: string }>> {
    try {
      validators.accountId(accountId);

      const account = await this.accountRepo.findById(accountId);
      if (!account) {
        return failure(new NotFoundError('Account', accountId));
      }

      let stripeAccountId = account.stripeConnect.accountId;
      
      if (!stripeAccountId) {
        const stripeAccount = await this.stripe.accounts.create({
          type: 'express',
          country: getConfig().stripeConnectAccountCountry,
          email: account.ownerEmail,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
            au_becs_debit_payments: { requested: true }
          },
          business_type: this.mapToStripeBusinessType(account.legalEntity.type),
          metadata: {
            scholarly_account_id: accountId,
            tenant_id: account.tenantId,
            owner_type: account.ownerType
          }
        });

        stripeAccountId = stripeAccount.id;

        await this.accountRepo.updateStripeConnect(accountId, {
          accountId: stripeAccountId,
          accountType: 'express'
        });
      }

      const accountLink = await this.stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });

      await this.accountRepo.updateStripeConnect(accountId, {
        onboardingUrl: accountLink.url
      });

      await this.accountRepo.update(accountId, {
        status: 'onboarding',
        statusChangedAt: new Date()
      });

      this.log.info('Onboarding started', { accountId, stripeAccountId });

      return success({ url: accountLink.url });
    } catch (error) {
      this.log.error('Failed to start onboarding', error as Error);
      if (error instanceof Stripe.errors.StripeError) {
        return failure(new StripeIntegrationError(error.message, error.code));
      }
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  /**
   * Complete Stripe onboarding - called after user returns from Stripe
   */
  async completeOnboarding(accountId: string): Promise<Result<FinancialAccount>> {
    try {
      const account = await this.accountRepo.findById(accountId);
      if (!account) {
        return failure(new NotFoundError('Account', accountId));
      }

      if (!account.stripeConnect.accountId) {
        return failure(new ValidationError('No Stripe account linked', 'stripeConnect'));
      }

      const stripeAccount = await this.stripe.accounts.retrieve(
        account.stripeConnect.accountId
      );

      const chargesEnabled = stripeAccount.charges_enabled ?? false;
      const payoutsEnabled = stripeAccount.payouts_enabled ?? false;
      const detailsSubmitted = stripeAccount.details_submitted ?? false;

      await this.accountRepo.updateStripeConnect(accountId, {
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
        onboardingComplete: chargesEnabled && payoutsEnabled,
        capabilities: {
          cardPayments: chargesEnabled ? 'active' : 'inactive',
          transfers: payoutsEnabled ? 'active' : 'inactive',
          auBecsDebit: stripeAccount.capabilities?.au_becs_debit_payments === 'active' 
            ? 'active' : 'inactive'
        }
      });

      if (chargesEnabled && payoutsEnabled) {
        await this.accountRepo.update(accountId, {
          status: 'active',
          statusChangedAt: new Date(),
          verificationLevel: 'identity_verified'
        });

        await publishEvent('account.onboarding_completed', account.tenantId, accountId, {
          stripeAccountId: account.stripeConnect.accountId
        });
      }

      const updatedAccount = await this.accountRepo.findById(accountId);
      this.log.info('Onboarding checked', { accountId, chargesEnabled, payoutsEnabled });

      return success(updatedAccount!);
    } catch (error) {
      this.log.error('Failed to complete onboarding', error as Error);
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId: string): Promise<Result<FinancialAccount>> {
    try {
      const account = await this.accountRepo.findById(accountId);
      if (!account) {
        return failure(new NotFoundError('Account', accountId));
      }
      return success(account);
    } catch (error) {
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  // ==========================================================================
  // INVOICE OPERATIONS
  // ==========================================================================

  /**
   * Create a new invoice
   */
  async createInvoice(input: CreateInvoiceInput): Promise<Result<Invoice>> {
    try {
      validators.tenantId(input.tenantId);
      validators.accountId(input.issuerId);

      const issuerAccount = await this.accountRepo.findById(input.issuerId);
      if (!issuerAccount) {
        return failure(new NotFoundError('Account', input.issuerId));
      }

      if (issuerAccount.status !== 'active') {
        return failure(new ValidationError('Issuer account is not active', 'issuerId'));
      }

      validators.nonEmptyString(input.recipientDetails.name, 'recipientDetails.name');
      validators.email(input.recipientDetails.email);
      validators.futureDate(input.dueDate, 'dueDate');

      if (!input.lineItems || input.lineItems.length === 0) {
        return failure(new ValidationError('At least one line item is required', 'lineItems'));
      }

      const config = getConfig();
      const now = new Date();

      // Generate invoice number
      const sequence = await this.invoiceRepo.getNextInvoiceNumber(input.issuerId);
      const invoiceNumber = generateInvoiceNumber(
        issuerAccount.settings.invoicePrefix,
        sequence
      );

      // Process line items
      const lineItems: InvoiceLineItem[] = input.lineItems.map((item, index) => {
        const amount = item.quantity * item.unitPrice;
        const discountAmount = item.discountPercentage 
          ? Math.round(amount * item.discountPercentage / 100) 
          : 0;
        const taxableAmount = amount - discountAmount;
        const taxRate = item.taxRate ?? (issuerAccount.legalEntity.gstRegistered ? config.defaultTaxRate : 0);
        const taxAmount = Math.round(taxableAmount * taxRate / 100);

        return {
          id: generateId('li'),
          description: item.description,
          feeStructureId: item.feeStructureId || null,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: taxableAmount,
          periodStart: null,
          periodEnd: null,
          taxRate,
          taxAmount,
          taxCode: issuerAccount.legalEntity.gstRegistered ? 'GST' : 'GST Free',
          discountPercentage: item.discountPercentage || null,
          discountAmount: discountAmount || null,
          discountReason: item.discountReason || null,
          accountCode: null,
          trackingCategories: null,
          metadata: null
        };
      });

      // Calculate totals
      const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
      const discountTotal = lineItems.reduce((sum, li) => sum + (li.discountAmount || 0), 0);
      const taxTotal = lineItems.reduce((sum, li) => sum + li.taxAmount, 0);
      const total = subtotal + taxTotal;

      const invoice = await this.invoiceRepo.create({
        tenantId: input.tenantId,
        issuerId: input.issuerId,
        issuerAccountId: issuerAccount.id,
        issuerDetails: {
          name: issuerAccount.ownerName,
          email: issuerAccount.ownerEmail,
          phone: null,
          address: issuerAccount.legalEntity.legalAddress,
          abn: issuerAccount.legalEntity.abn
        },
        recipientId: input.recipientId || null,
        recipientType: input.recipientType,
        recipientDetails: {
          name: input.recipientDetails.name,
          email: input.recipientDetails.email,
          phone: input.recipientDetails.phone || null,
          address: input.recipientDetails.address || null,
          abn: null
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
        lineItems,
        subtotal,
        discountTotal,
        taxTotal,
        total,
        amountPaid: 0,
        amountDue: total,
        currency: issuerAccount.settings.currency,
        status: 'draft',
        statusHistory: [{
          status: 'draft',
          changedAt: now,
          changedBy: 'system',
          reason: 'Invoice created'
        }],
        payments: [],
        paymentPlan: null,
        reminders: [],
        notes: input.notes || null,
        internalNotes: null,
        terms: issuerAccount.settings.defaultPaymentTerms 
          ? `Payment due within ${issuerAccount.settings.defaultPaymentTerms} days` 
          : null,
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
          updatedAt: now
        }
      });

      // Update account statistics
      await this.accountRepo.incrementStatistic(input.issuerId, 'invoicesIssued');

      await publishEvent('invoice.created', input.tenantId, input.issuerId, {
        invoiceId: invoice.id,
        invoiceNumber,
        total,
        recipientEmail: input.recipientDetails.email
      });

      this.log.info('Invoice created', {
        invoiceId: invoice.id,
        invoiceNumber,
        total: formatMoney(total)
      });

      // Send immediately if requested
      if (input.sendImmediately) {
        await this.sendInvoice(invoice.id);
      }

      return success(invoice);
    } catch (error) {
      this.log.error('Failed to create invoice', error as Error);
      if (error instanceof PaymentError) {
        return failure(error);
      }
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  /**
   * Send an invoice to the recipient
   */
  async sendInvoice(invoiceId: string): Promise<Result<Invoice>> {
    try {
      const invoice = await this.invoiceRepo.findById(invoiceId);
      if (!invoice) {
        return failure(new NotFoundError('Invoice', invoiceId));
      }

      if (invoice.status !== 'draft' && invoice.status !== 'pending') {
        return failure(new ValidationError('Invoice has already been sent', 'status'));
      }

      // Generate view URL (would integrate with frontend)
      const viewUrl = `https://pay.scholarly.io/invoice/${invoice.id}`;

      // Create Stripe PaymentIntent for card payments
      const issuerAccount = await this.accountRepo.findById(invoice.issuerId);
      if (!issuerAccount?.stripeConnect.accountId) {
        return failure(new ValidationError('Issuer has no Stripe account', 'issuerId'));
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: invoice.amountDue,
        currency: invoice.currency.toLowerCase(),
        payment_method_types: ['card', 'au_becs_debit'],
        application_fee_amount: calculatePlatformFee(
          invoice.amountDue,
          getConfig().platformFeePercentage,
          getConfig().minimumPlatformFee
        ),
        transfer_data: {
          destination: issuerAccount.stripeConnect.accountId
        },
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoiceNumber,
          tenant_id: invoice.tenantId
        }
      });

      // Update invoice
      const updatedInvoice = await this.invoiceRepo.update(invoiceId, {
        status: 'sent',
        stripePaymentIntentId: paymentIntent.id,
        viewUrl,
        statusHistory: [...invoice.statusHistory, {
          status: 'sent' as InvoiceStatus,
          changedAt: new Date(),
          changedBy: 'system',
          reason: 'Invoice sent to recipient'
        }]
      });

      // TODO: Send email notification to recipient

      await publishEvent('invoice.sent', invoice.tenantId, invoice.issuerId, {
        invoiceId,
        recipientEmail: invoice.recipientDetails.email
      });

      this.log.info('Invoice sent', { invoiceId, recipientEmail: invoice.recipientDetails.email });

      return success(updatedInvoice);
    } catch (error) {
      this.log.error('Failed to send invoice', error as Error);
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  /**
   * Process a payment for an invoice
   */
  async processPayment(input: ProcessPaymentInput): Promise<Result<InvoicePayment>> {
    try {
      const invoice = await this.invoiceRepo.findById(input.invoiceId);
      if (!invoice) {
        return failure(new NotFoundError('Invoice', input.invoiceId));
      }

      if (invoice.status === 'paid') {
        return failure(new PaymentError('INVOICE_ALREADY_PAID', 'Invoice has already been paid'));
      }

      if (invoice.status === 'void' || invoice.status === 'written_off') {
        return failure(new ValidationError('Invoice is no longer payable', 'status'));
      }

      if (input.amount > invoice.amountDue) {
        return failure(new ValidationError('Payment amount exceeds amount due', 'amount'));
      }

      const now = new Date();

      // Handle card payments via Stripe
      if (input.method === 'card' && input.paymentMethodId) {
        if (!invoice.stripePaymentIntentId) {
          return failure(new ValidationError('No payment intent for this invoice', 'paymentIntentId'));
        }

        // Confirm the payment
        const paymentIntent = await this.stripe.paymentIntents.confirm(
          invoice.stripePaymentIntentId,
          {
            payment_method: input.paymentMethodId
          }
        );

        if (paymentIntent.status !== 'succeeded') {
          return failure(new PaymentError('PAYMENT_FAILED', 
            `Payment failed: ${paymentIntent.status}`));
        }

        const payment: Omit<InvoicePayment, 'id'> = {
          amount: input.amount,
          currency: invoice.currency,
          method: 'card',
          stripePaymentIntentId: paymentIntent.id,
          stripeChargeId: paymentIntent.latest_charge as string || null,
          cardBrand: null, // Would extract from payment method
          cardLast4: null,
          status: 'succeeded',
          failureReason: null,
          paidAt: now,
          processedAt: now,
          receiptUrl: null,
          receiptNumber: null,
          createdBy: 'customer',
          createdAt: now
        };

        const savedPayment = await this.invoiceRepo.addPayment(input.invoiceId, payment);

        // Credit the tutor/school's pending balance
        const issuerAccount = await this.accountRepo.findById(invoice.issuerId);
        if (issuerAccount) {
          const platformFee = calculatePlatformFee(
            input.amount,
            getConfig().platformFeePercentage,
            getConfig().minimumPlatformFee
          );
          const netAmount = input.amount - platformFee;
          
          await this.accountRepo.addToBalance(invoice.issuerId, 'pending', netAmount);
        }

        await publishEvent('payment.succeeded', invoice.tenantId, invoice.issuerId, {
          invoiceId: input.invoiceId,
          paymentId: savedPayment.id,
          amount: input.amount,
          method: 'card'
        });

        this.log.info('Payment processed', {
          invoiceId: input.invoiceId,
          paymentId: savedPayment.id,
          amount: formatMoney(input.amount)
        });

        return success(savedPayment);
      }

      // Handle manual payments (cash, cheque, bank transfer)
      const payment: Omit<InvoicePayment, 'id'> = {
        amount: input.amount,
        currency: invoice.currency,
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
        receiptNumber: null,
        createdBy: 'admin',
        createdAt: now
      };

      const savedPayment = await this.invoiceRepo.addPayment(input.invoiceId, payment);

      await publishEvent('payment.succeeded', invoice.tenantId, invoice.issuerId, {
        invoiceId: input.invoiceId,
        paymentId: savedPayment.id,
        amount: input.amount,
        method: input.method
      });

      return success(savedPayment);
    } catch (error) {
      this.log.error('Failed to process payment', error as Error);
      if (error instanceof Stripe.errors.StripeError) {
        return failure(new StripeIntegrationError(error.message, error.code));
      }
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Result<Invoice>> {
    try {
      const invoice = await this.invoiceRepo.findById(invoiceId);
      if (!invoice) {
        return failure(new NotFoundError('Invoice', invoiceId));
      }
      return success(invoice);
    } catch (error) {
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  // ==========================================================================
  // PAYOUT OPERATIONS
  // ==========================================================================

  /**
   * Create and process a payout to a tutor/school
   */
  async createPayout(input: CreatePayoutInput): Promise<Result<Payout>> {
    try {
      const account = await this.accountRepo.findById(input.accountId);
      if (!account) {
        return failure(new NotFoundError('Account', input.accountId));
      }

      if (account.status !== 'active') {
        return failure(new ValidationError('Account is not active', 'status'));
      }

      if (!account.stripeConnect.payoutsEnabled) {
        return failure(new ValidationError('Payouts are not enabled for this account', 'payoutsEnabled'));
      }

      const payoutAmount = input.amount ?? account.balances.available;
      
      if (payoutAmount <= 0) {
        return failure(new ValidationError('No funds available for payout', 'amount'));
      }

      if (payoutAmount > account.balances.available) {
        return failure(new InsufficientFundsError(
          input.accountId,
          payoutAmount,
          account.balances.available
        ));
      }

      const config = getConfig();
      if (payoutAmount < config.minimumPayoutAmount) {
        return failure(new ValidationError(
          `Minimum payout amount is ${formatMoney(config.minimumPayoutAmount)}`,
          'amount'
        ));
      }

      const now = new Date();
      const payoutId = generateId('pyt');

      // Calculate breakdown (platform fees already deducted during payment)
      const breakdown: PayoutBreakdown = {
        grossEarnings: payoutAmount,
        platformFees: 0, // Already deducted
        paymentProcessingFees: 0,
        refundsDeducted: 0,
        adjustments: 0,
        taxWithheld: 0,
        netPayout: payoutAmount
      };

      // Create Stripe payout
      const stripePayout = await this.stripe.transfers.create({
        amount: payoutAmount,
        currency: account.settings.payoutCurrency.toLowerCase(),
        destination: account.stripeConnect.accountId!,
        metadata: {
          scholarly_payout_id: payoutId,
          account_id: input.accountId,
          tenant_id: account.tenantId
        }
      });

      // Deduct from available balance
      await this.accountRepo.addToBalance(input.accountId, 'available', -payoutAmount);

      // Create payout record
      const payout: Payout = {
        id: payoutId,
        tenantId: account.tenantId,
        createdAt: now,
        updatedAt: now,
        accountId: input.accountId,
        amount: payoutAmount,
        currency: account.settings.payoutCurrency,
        breakdown,
        transactions: [], // Would be populated with the invoices included
        stripePayoutId: null,
        stripeTransferId: stripePayout.id,
        destinationBankName: account.payoutMethod?.bankName || null,
        destinationLast4: account.payoutMethod?.accountNumber || '****',
        status: 'processing',
        statusHistory: [{ status: 'processing' as PayoutStatus, at: now, reason: null }],
        scheduledFor: input.scheduledFor || null,
        initiatedAt: now,
        estimatedArrival: addDays(now, 2),
        arrivedAt: null,
        failureCode: null,
        failureReason: null,
        retryCount: 0,
        lastRetryAt: null,
        statementDescriptor: 'Scholarly Payout',
        statementPeriod: {
          from: addDays(now, -30),
          to: now
        },
        xeroPaymentId: null,
        xeroSyncStatus: 'pending',
        audit: {
          createdBy: 'system',
          updatedBy: 'system',
          createdAt: now,
          updatedAt: now
        }
      };

      // Update account statistics
      await this.accountRepo.incrementStatistic(input.accountId, 'payoutsProcessed');
      await this.accountRepo.updateStatistics(input.accountId, {
        lastPayoutAt: now
      });

      await publishEvent('payout.initiated', account.tenantId, input.accountId, {
        payoutId,
        amount: payoutAmount,
        stripeTransferId: stripePayout.id
      });

      this.log.info('Payout created', {
        payoutId,
        accountId: input.accountId,
        amount: formatMoney(payoutAmount)
      });

      return success(payout);
    } catch (error) {
      this.log.error('Failed to create payout', error as Error);
      if (error instanceof Stripe.errors.StripeError) {
        return failure(new StripeIntegrationError(error.message, error.code));
      }
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  // ==========================================================================
  // REFUND OPERATIONS
  // ==========================================================================

  /**
   * Process a refund
   */
  async processRefund(input: CreateRefundInput): Promise<Result<Refund>> {
    try {
      const invoice = await this.invoiceRepo.findById(input.invoiceId);
      if (!invoice) {
        return failure(new NotFoundError('Invoice', input.invoiceId));
      }

      const payment = invoice.payments.find(p => p.id === input.paymentId);
      if (!payment) {
        return failure(new NotFoundError('Payment', input.paymentId));
      }

      if (payment.status !== 'succeeded') {
        return failure(new ValidationError('Can only refund successful payments', 'paymentStatus'));
      }

      if (input.amount > payment.amount) {
        return failure(new PaymentError('REFUND_EXCEEDS_PAYMENT', 
          'Refund amount exceeds payment amount'));
      }

      const now = new Date();
      const refundId = generateId('ref');

      let stripeRefundId: string | null = null;
      let stripeStatus: 'pending' | 'succeeded' | 'failed' = 'pending';

      // Process Stripe refund if payment was via Stripe
      if (payment.stripePaymentIntentId) {
        const stripeRefund = await this.stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          amount: input.amount,
          reason: this.mapRefundReasonToStripe(input.reason),
          metadata: {
            scholarly_refund_id: refundId,
            invoice_id: input.invoiceId,
            reason_description: input.reasonDescription || ''
          }
        });

        stripeRefundId = stripeRefund.id;
        stripeStatus = stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending';
      } else {
        stripeStatus = 'succeeded'; // Manual refunds are immediately "successful"
      }

      const refund: Refund = {
        id: refundId,
        tenantId: invoice.tenantId,
        createdAt: now,
        updatedAt: now,
        invoiceId: input.invoiceId,
        paymentId: input.paymentId,
        accountId: invoice.issuerId,
        amount: input.amount,
        currency: invoice.currency,
        reason: input.reason,
        reasonDescription: input.reasonDescription || null,
        stripeRefundId,
        stripeStatus,
        status: stripeStatus === 'succeeded' ? 'succeeded' : 'processing',
        processedAt: stripeStatus === 'succeeded' ? now : null,
        failureReason: null,
        deductedFromPayoutId: null,
        audit: {
          createdBy: 'admin',
          updatedBy: 'admin',
          createdAt: now,
          updatedAt: now
        }
      };

      // Update invoice
      await this.invoiceRepo.updatePayment(input.invoiceId, input.paymentId, {
        status: input.amount === payment.amount ? 'refunded' : 'succeeded'
      });

      // Deduct from issuer's pending balance
      await this.accountRepo.addToBalance(invoice.issuerId, 'pending', -input.amount);

      await publishEvent('payment.refunded', invoice.tenantId, invoice.issuerId, {
        refundId,
        invoiceId: input.invoiceId,
        paymentId: input.paymentId,
        amount: input.amount,
        reason: input.reason
      });

      this.log.info('Refund processed', {
        refundId,
        invoiceId: input.invoiceId,
        amount: formatMoney(input.amount)
      });

      return success(refund);
    } catch (error) {
      this.log.error('Failed to process refund', error as Error);
      if (error instanceof Stripe.errors.StripeError) {
        return failure(new StripeIntegrationError(error.message, error.code));
      }
      return failure(new PaymentError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private getDefaultSettings(ownerType: AccountOwnerType, config: any): AccountSettings {
    const baseSettings: AccountSettings = {
      autoPayoutEnabled: true,
      payoutSchedule: config.defaultPayoutSchedule,
      payoutThreshold: config.minimumPayoutAmount,
      payoutCurrency: config.defaultCurrency,
      currency: config.defaultCurrency,
      invoicePrefix: 'INV-',
      invoiceNumberSequence: 1,
      defaultPaymentTerms: config.defaultPaymentTerms,
      lateFeeEnabled: false,
      lateFeePercentage: null,
      lateFeeGraceDays: 7,
      sendReminders: true,
      reminderSchedule: config.reminderSchedule,
      reminderChannels: ['email'],
      defaultTaxRate: config.defaultTaxRate,
      taxInclusive: true,
      emailOnPaymentReceived: true,
      emailOnPayoutProcessed: true,
      emailOnInvoiceViewed: false,
      timezone: config.defaultTimezone
    };

    // Customize based on owner type
    switch (ownerType) {
      case 'school':
      case 'micro_school':
        return {
          ...baseSettings,
          invoicePrefix: 'SCH-',
          lateFeeEnabled: true,
          lateFeePercentage: 2
        };
      case 'tutor':
        return {
          ...baseSettings,
          invoicePrefix: 'TUT-',
          payoutSchedule: 'weekly'
        };
      case 'tutoring_centre':
        return {
          ...baseSettings,
          invoicePrefix: 'TC-',
          lateFeeEnabled: true,
          lateFeePercentage: 1.5
        };
      default:
        return baseSettings;
    }
  }

  private getRequiredDocuments(ownerType: AccountOwnerType): string[] {
    const baseDocuments = ['identity_document'];
    
    switch (ownerType) {
      case 'school':
      case 'micro_school':
        return [...baseDocuments, 'business_registration', 'abn_certificate'];
      case 'tutor':
        return [...baseDocuments, 'wwcc'];
      case 'tutoring_centre':
        return [...baseDocuments, 'business_registration', 'abn_certificate', 'wwcc'];
      default:
        return baseDocuments;
    }
  }

  private mapToStripeBusinessType(legalType: string): 'individual' | 'company' | 'non_profit' {
    switch (legalType) {
      case 'individual':
      case 'sole_trader':
        return 'individual';
      case 'non_profit':
        return 'non_profit';
      default:
        return 'company';
    }
  }

  private mapRefundReasonToStripe(reason: string): 'duplicate' | 'fraudulent' | 'requested_by_customer' {
    switch (reason) {
      case 'duplicate_payment':
        return 'duplicate';
      case 'fraudulent':
        return 'fraudulent';
      default:
        return 'requested_by_customer';
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let service: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (!service) {
    service = new PaymentService();
  }
  return service;
}
