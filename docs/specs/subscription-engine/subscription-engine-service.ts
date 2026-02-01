/**
 * Universal Subscription Service - Part 2
 * 
 * Continuation of the subscription service with:
 * - Trial conversion
 * - Payment processing
 * - Invoice management
 * - Entitlement management
 * - Credential handling
 * - Analytics
 * - Helper methods
 */

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
  SeatStatus,
  SubscriptionPlan,
  PlanPricing,
  PlanEntitlement,
  PlanKycRequirements,
  TrialConfig,
  Subscription,
  SubscriptionSeat,
  SubscriptionInvoice,
  RevenueShare,
  GrantedEntitlement,
  SubscriptionAnalytics,
  KycCheckResult,
  TrialIntent,
  SubscriptionType,
} from './types';

// This would be merged with the main service file
// Showing the remaining methods that continue from Part 1

export class UniversalSubscriptionServicePart2 {

  // ==========================================================================
  // TRIAL CONVERSION (continued)
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
        nextPaymentAt: now
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
        trialMetrics: sub.trialMetrics
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
        externalTransactionId: paymentResult.transactionId
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
        dunningStatus: DunningStatus.NONE
      });

      // Update plan revenue
      await this.repo.incrementPlanRevenue(plan.id, grossAmount);

      await this.publishEvent('payment.succeeded', subscription.tenantId, {
        subscriptionId: subscription.id,
        amount: grossAmount,
        vendorAmount,
        platformFee,
        transactionId: paymentResult.transactionId
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
    const sub = await this.repo.getSubscriptionById(subscriptionId);
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
      lastDunningActionAt: new Date()
    });

    await this.publishEvent('payment.failed', sub.tenantId, {
      subscriptionId,
      failedCount,
      status,
      dunningStatus,
      error: errorMessage
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
          taxAmount
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
        remindersSent: []
      });

      await this.publishEvent('invoice.created', tenantId, {
        subscriptionId,
        invoiceId: invoice.id,
        invoiceNumber,
        amount: invoice.totalAmount
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
        status: InvoiceStatus.SENT
      });

      await this.publishEvent('invoice.sent', tenantId, {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount
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
        paidAt: newStatus === InvoiceStatus.PAID ? new Date() : undefined
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
            periodEnd: sub.currentPeriodEnd
          });

          await this.repo.incrementPlanRevenue(plan.id, invoice.subtotal);
        }

        await this.publishEvent('invoice.paid', tenantId, {
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount
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
            requiredCredential: entitlement.requiredCredential
          });
          continue;
        }

        if (entitlement.credentialMustBeValid && credential.status !== CredentialStatus.VALID) {
          await this.publishEvent('entitlement.blocked', tenantId, {
            userId,
            subscriptionId,
            entitlementKey: entitlement.key,
            reason: 'credential_invalid',
            credentialStatus: credential.status
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
        isActive: true
      });

      // Publish to the relevant module
      const moduleTarget = entitlement.module || this.config.platformId;
      await this.eventBus.publish(`${moduleTarget}.entitlement_granted`, tenantId, {
        userId,
        subscriptionId,
        entitlement: entitlement.key,
        value: entitlement.value,
        type: entitlement.type
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
        entitlement: entitlement.key
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
          source: entitlement.subscriptionId
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
            reason: `credential_${newStatus}`
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
          affectedEntitlements: affectedEntitlements.map(e => e.key)
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
      expiredCredentials: []
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
        plans
      ] = await Promise.all([
        this.repo.getSubscriberCounts(tenantId, vendorId),
        this.repo.calculateMRR(tenantId, vendorId),
        this.repo.calculateChurnRate(tenantId, vendorId),
        this.repo.calculateTrialConversionRate(tenantId),
        this.repo.listPlans(tenantId, vendorId)
      ]);

      const activeSubscribers = subscriberCounts[SubscriptionStatus.ACTIVE] || 0;
      const arr = mrr * 12;
      const arpu = activeSubscribers > 0 ? mrr / activeSubscribers : 0;

      const revenueByPlan = plans.map(p => ({
        planId: p.id,
        planName: p.name,
        revenue: p.totalRevenue,
        subscribers: p.subscriberCount
      }));

      // Growth metrics would require historical data
      const growth = {
        newSubscribers: 0,  // Would query from events
        churned: 0,
        netGrowth: 0,
        growthRate: 0
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
        growth
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
      return analyticsResult;
    }

    const unsettledShares = await this.repo.getUnsettledRevenue(vendorId);
    const unsettledRevenue = unsettledShares.reduce((sum, s) => sum + s.vendorAmount, 0);

    return success({
      ...analyticsResult.data,
      unsettledRevenue
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
      case BillingInterval.MONTH:
        const monthDate = new Date(start);
        monthDate.setMonth(monthDate.getMonth() + multiplier);
        return monthDate;
      case BillingInterval.QUARTER:
        const quarterDate = new Date(start);
        quarterDate.setMonth(quarterDate.getMonth() + (multiplier * 3));
        return quarterDate;
      case BillingInterval.YEAR:
        const yearDate = new Date(start);
        yearDate.setFullYear(yearDate.getFullYear() + multiplier);
        return yearDate;
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

      case PricingModel.PER_SEAT:
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

      case PricingModel.BASE_PLUS_SEAT:
        const baseAmount = pricing.amount;
        const extraSeats = Math.max(0, (subscription.seatCount || 0) - (pricing.seatConfig?.includedSeats || 0));
        const extraSeatAmount = extraSeats * (pricing.seatConfig?.pricePerSeat || 0);
        return baseAmount + extraSeatAmount;

      case PricingModel.USAGE:
        const usage = subscription.currentUsage || 0;
        const usageConfig = pricing.usageConfig!;
        const billableUsage = Math.max(0, usage - usageConfig.includedUnits);
        return pricing.amount + (billableUsage * usageConfig.pricePerUnit);

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
        requiredKycLevel: KycLevel.EMAIL_VERIFIED
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
        seatType
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
      year: 'numeric'
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
      [CredentialType.SECURITY_LICENSE]: 'Security License'
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
      ...data
    });

    // Also record in event log
    if (data.subscriptionId) {
      await this.repo.createEvent({
        subscriptionId: data.subscriptionId,
        tenantId,
        type,
        data
      });
    }
  }
}

// Type helpers for external use
export type { Result };
export { success, failure };
