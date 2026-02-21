/**
 * WhatsApp Service
 *
 * Orchestrates WhatsApp message delivery with provider selection per tenant,
 * template management, and delivery tracking.
 */

import type { IWhatsAppProvider, WhatsAppDeliveryResult, WhatsAppDeliveryStatus, WhatsAppTemplate } from '../infrastructure/whatsapp-provider';
import { createWhatsAppProvider, type WhatsAppProviderType } from '../infrastructure/whatsapp-providers';
import { isValidE164 } from '../infrastructure/sms-provider';
import { logger } from '../lib/logger';

interface WhatsAppSendRequest {
  tenantId: string;
  to: string;
  body: string;
  templateName?: string;
  templateParams?: string[];
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'video' | 'audio';
  idempotencyKey?: string;
}

interface WhatsAppServiceConfig {
  defaultProvider?: WhatsAppProviderType;
  defaultCredentials?: Record<string, string>;
}

export class WhatsAppService {
  private providerCache = new Map<string, IWhatsAppProvider>();
  private sentKeys = new Set<string>();
  private config: WhatsAppServiceConfig;

  constructor(config: WhatsAppServiceConfig = {}) {
    this.config = config;
  }

  /**
   * Send a WhatsApp message, resolving the provider from tenant configuration.
   */
  async send(request: WhatsAppSendRequest): Promise<WhatsAppDeliveryResult> {
    const { tenantId, to, body, idempotencyKey } = request;

    // Idempotency
    if (idempotencyKey && this.sentKeys.has(idempotencyKey)) {
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

    // Get provider
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) {
      return {
        success: false,
        messageId: '',
        provider: 'none',
        status: 'failed',
        error: 'No WhatsApp provider configured for this tenant',
      };
    }

    // Send
    const result = await provider.send({
      to,
      body,
      templateName: request.templateName,
      templateParams: request.templateParams,
      mediaUrl: request.mediaUrl,
      mediaType: request.mediaType,
    });

    // Track idempotency
    if (result.success && idempotencyKey) {
      this.sentKeys.add(idempotencyKey);
      setTimeout(() => this.sentKeys.delete(idempotencyKey), 24 * 60 * 60 * 1000);
    }

    logger.info(`WhatsApp ${result.success ? 'sent' : 'failed'} via ${provider.name} to ${to.substring(0, 6)}***`);
    return result;
  }

  /**
   * Query delivery status of a previously sent message.
   */
  async getDeliveryStatus(tenantId: string, messageId: string): Promise<WhatsAppDeliveryStatus> {
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) {
      return {
        messageId,
        status: 'failed',
        timestamp: new Date().toISOString(),
        errorMessage: 'No WhatsApp provider configured',
      };
    }
    return provider.getDeliveryStatus(messageId);
  }

  /**
   * List approved WhatsApp message templates for a tenant.
   */
  async listTemplates(tenantId: string): Promise<WhatsAppTemplate[]> {
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) return [];
    return provider.listTemplates();
  }

  private async getProviderForTenant(tenantId: string): Promise<IWhatsAppProvider | null> {
    if (this.providerCache.has(tenantId)) {
      return this.providerCache.get(tenantId)!;
    }

    // TODO: Load from TenantIntegrationConfig via Prisma
    if (this.config.defaultProvider && this.config.defaultCredentials) {
      const provider = createWhatsAppProvider({
        provider: this.config.defaultProvider,
        credentials: this.config.defaultCredentials,
      });
      this.providerCache.set(tenantId, provider);
      return provider;
    }

    return null;
  }
}
