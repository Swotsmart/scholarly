/**
 * Meta Cloud API WhatsApp Provider
 *
 * Implements IWhatsAppProvider using Meta's WhatsApp Cloud API.
 */

import type {
  IWhatsAppProvider, WhatsAppMessage, WhatsAppDeliveryResult,
  WhatsAppDeliveryStatus, WhatsAppTemplate,
} from '../whatsapp-provider';
import { logger } from '../../lib/logger';

interface MetaCloudConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  apiVersion?: string;
}

export class MetaCloudProvider implements IWhatsAppProvider {
  readonly name = 'meta-cloud';
  private config: MetaCloudConfig;
  private apiVersion: string;

  constructor(config: MetaCloudConfig) {
    this.config = config;
    this.apiVersion = config.apiVersion || 'v18.0';
  }

  private get baseUrl() {
    return `https://graph.facebook.com/${this.apiVersion}/${this.config.phoneNumberId}`;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async send(message: WhatsAppMessage): Promise<WhatsAppDeliveryResult> {
    try {
      // Strip the + prefix for Meta API
      const to = message.to.replace('+', '');

      let payload: Record<string, unknown>;

      if (message.templateName) {
        // Template message
        payload = {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: message.templateName,
            language: { code: 'en' },
            components: message.templateParams?.length
              ? [{
                  type: 'body',
                  parameters: message.templateParams.map((text) => ({ type: 'text', text })),
                }]
              : undefined,
          },
        };
      } else if (message.mediaUrl) {
        // Media message
        const mediaType = message.mediaType || 'image';
        payload = {
          messaging_product: 'whatsapp',
          to,
          type: mediaType,
          [mediaType]: {
            link: message.mediaUrl,
            caption: message.body || undefined,
          },
        };
      } else {
        // Text message
        payload = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message.body },
        };
      }

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json() as Record<string, unknown>;
      const error_ = data.error as Record<string, unknown> | undefined;

      if (!response.ok || error_) {
        const errorMsg = (error_?.message as string) || 'Meta Cloud API error';
        logger.error(`Meta WhatsApp send failed: ${errorMsg}`);
        return {
          success: false,
          messageId: '',
          provider: this.name,
          status: 'failed',
          error: errorMsg,
        };
      }

      const messages = data.messages as Array<Record<string, string>> | undefined;
      const messageId = messages?.[0]?.id || '';
      return {
        success: true,
        messageId,
        provider: this.name,
        status: 'queued',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Meta WhatsApp provider error: ${msg}`);
      return {
        success: false,
        messageId: '',
        provider: this.name,
        status: 'failed',
        error: msg,
      };
    }
  }

  async getDeliveryStatus(_messageId: string): Promise<WhatsAppDeliveryStatus> {
    // Meta Cloud API uses webhooks for delivery status, not polling.
    // Status updates come via the registered webhook endpoint.
    return {
      messageId: _messageId,
      status: 'queued',
      timestamp: new Date().toISOString(),
      errorMessage: 'Meta Cloud API uses webhook-based delivery status. Configure your webhook endpoint.',
    };
  }

  async listTemplates(): Promise<WhatsAppTemplate[]> {
    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${this.config.businessAccountId}/message_templates`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.config.accessToken}` },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json() as Record<string, unknown>;
      return ((data.data as Array<Record<string, unknown>>) || []).map((t): WhatsAppTemplate => ({
        name: t.name as string,
        language: (t.language as string) || 'en',
        status: t.status as WhatsAppTemplate['status'],
        category: (t.category as string) || 'UTILITY',
        components: (t.components as WhatsAppTemplate['components']) || [],
      }));
    } catch {
      return [];
    }
  }
}
