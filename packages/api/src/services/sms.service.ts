/**
 * SMS Service
 *
 * Orchestrates SMS delivery with provider selection per tenant,
 * rate limiting, template rendering, and delivery tracking.
 */

import type { ISmsProvider, SmsDeliveryResult, SmsDeliveryStatus } from '../infrastructure/sms-provider';
import { isValidE164 } from '../infrastructure/sms-provider';
import { createSmsProvider, type SmsProviderType } from '../infrastructure/sms-providers';
import { logger } from '../lib/logger';

interface SmsSendRequest {
  tenantId: string;
  to: string;
  body: string;
  from?: string;
  templateId?: string;
  templateData?: Record<string, string>;
  idempotencyKey?: string;
}

interface SmsServiceConfig {
  defaultProvider?: SmsProviderType;
  defaultCredentials?: Record<string, string>;
  rateLimitPerMinute?: number;
}

// Simple in-memory rate limiter (per tenant)
const rateLimitState = new Map<string, { count: number; resetAt: number }>();

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const IDEMPOTENCY_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

export class SmsService {
  private providerCache = new Map<string, ISmsProvider>();
  /** Maps idempotency key → expiry timestamp (ms since epoch) */
  private sentKeys = new Map<string, number>();
  private cleanupTimer: ReturnType<typeof setInterval>;
  private config: SmsServiceConfig;

  constructor(config: SmsServiceConfig = {}) {
    this.config = config;
    this.cleanupTimer = setInterval(() => this.pruneExpiredKeys(), IDEMPOTENCY_CLEANUP_INTERVAL_MS);
    // Allow the process to exit even if this timer is still active
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /** Stop the background cleanup timer (call on service shutdown / in tests). */
  destroy(): void {
    clearInterval(this.cleanupTimer);
  }

  /** Remove idempotency entries whose TTL has elapsed. */
  private pruneExpiredKeys(): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.sentKeys) {
      if (now >= expiresAt) {
        this.sentKeys.delete(key);
      }
    }
  }

  /**
   * Send an SMS message, resolving the provider from tenant configuration.
   */
  async send(request: SmsSendRequest): Promise<SmsDeliveryResult> {
    const { tenantId, to, body, from, idempotencyKey } = request;

    // Idempotency check
    const now = Date.now();
    if (idempotencyKey && (this.sentKeys.get(idempotencyKey) ?? 0) > now) {
      return {
        success: true,
        messageId: `dedup_${idempotencyKey}`,
        provider: 'cached',
        status: 'queued',
      };
    }

    // Validate phone
    if (!isValidE164(to)) {
      return {
        success: false,
        messageId: '',
        provider: 'none',
        status: 'failed',
        error: `Invalid phone number format. Expected E.164 (e.g., +61400000000): ${to}`,
      };
    }

    // Rate limiting
    if (!this.checkRateLimit(tenantId)) {
      return {
        success: false,
        messageId: '',
        provider: 'none',
        status: 'failed',
        error: 'Rate limit exceeded. Please try again later.',
      };
    }

    // Resolve template if specified
    let messageBody = body;
    if (request.templateId && request.templateData) {
      messageBody = this.renderTemplate(body, request.templateData);
    }

    // Truncate to SMS limits (160 chars for GSM-7, 70 for UCS-2)
    if (messageBody.length > 1600) {
      messageBody = messageBody.substring(0, 1597) + '...';
    }

    // Get provider for tenant
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) {
      return {
        success: false,
        messageId: '',
        provider: 'none',
        status: 'failed',
        error: 'No SMS provider configured for this tenant',
      };
    }

    // Send
    const result = await provider.send({ to, body: messageBody, from });

    // Track idempotency
    if (result.success && idempotencyKey) {
      this.sentKeys.set(idempotencyKey, now + IDEMPOTENCY_TTL_MS);
    }

    logger.info(`SMS ${result.success ? 'sent' : 'failed'} via ${provider.name} to ${to.substring(0, 6)}***`);
    return result;
  }

  /**
   * Query delivery status of a previously sent message.
   */
  async getDeliveryStatus(tenantId: string, messageId: string): Promise<SmsDeliveryStatus> {
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) {
      return {
        messageId,
        status: 'failed',
        timestamp: new Date().toISOString(),
        errorMessage: 'No SMS provider configured',
      };
    }
    return provider.getDeliveryStatus(messageId);
  }

  /**
   * Validate a phone number using the tenant's SMS provider.
   */
  async validatePhone(tenantId: string, phoneNumber: string): Promise<{ valid: boolean; carrier?: string; type?: string }> {
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) {
      return { valid: isValidE164(phoneNumber) };
    }
    return provider.validatePhone(phoneNumber);
  }

  private async getProviderForTenant(tenantId: string): Promise<ISmsProvider | null> {
    // Check cache first
    if (this.providerCache.has(tenantId)) {
      return this.providerCache.get(tenantId)!;
    }

    // TODO: In production, load from TenantIntegrationConfig via Prisma
    // For now, use default config if available
    if (this.config.defaultProvider && this.config.defaultCredentials) {
      const provider = createSmsProvider({
        provider: this.config.defaultProvider,
        credentials: this.config.defaultCredentials,
      });
      this.providerCache.set(tenantId, provider);
      return provider;
    }

    return null;
  }

  private checkRateLimit(tenantId: string): boolean {
    const limit = this.config.rateLimitPerMinute || 60;
    const now = Date.now();
    const state = rateLimitState.get(tenantId);

    if (!state || now > state.resetAt) {
      rateLimitState.set(tenantId, { count: 1, resetAt: now + 60_000 });
      return true;
    }

    if (state.count >= limit) {
      return false;
    }

    state.count++;
    return true;
  }

  private renderTemplate(template: string, data: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
  }
}
