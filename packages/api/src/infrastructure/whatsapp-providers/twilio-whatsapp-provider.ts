/**
 * Twilio WhatsApp Provider
 *
 * Implements IWhatsAppProvider using Twilio's WhatsApp Business API.
 */

import type {
  IWhatsAppProvider, WhatsAppMessage, WhatsAppDeliveryResult,
  WhatsAppDeliveryStatus, WhatsAppTemplate,
} from '../whatsapp-provider';
import { logger } from '../../lib/logger';

interface TwilioWhatsAppConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;  // e.g., "whatsapp:+14155238886"
  statusCallbackUrl?: string;
}

export class TwilioWhatsAppProvider implements IWhatsAppProvider {
  readonly name = 'twilio-whatsapp';
  private config: TwilioWhatsAppConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: TwilioWhatsAppConfig) {
    this.config = config;
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`;
    this.authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  }

  async send(message: WhatsAppMessage): Promise<WhatsAppDeliveryResult> {
    try {
      const to = message.to.startsWith('whatsapp:')
        ? message.to
        : `whatsapp:${message.to}`;

      const params = new URLSearchParams({
        To: to,
        From: this.config.fromNumber,
        Body: message.body,
      });

      if (message.mediaUrl) {
        params.set('MediaUrl', message.mediaUrl);
      }

      if (this.config.statusCallbackUrl) {
        params.set('StatusCallback', this.config.statusCallbackUrl);
      }

      const response = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        logger.error(`Twilio WhatsApp send failed: ${data.message}`);
        return {
          success: false,
          messageId: '',
          provider: this.name,
          status: 'failed',
          error: (data.message as string) || 'Twilio WhatsApp API error',
        };
      }

      return {
        success: true,
        messageId: data.sid as string,
        provider: this.name,
        status: 'queued',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Twilio WhatsApp provider error: ${msg}`);
      return {
        success: false,
        messageId: '',
        provider: this.name,
        status: 'failed',
        error: msg,
      };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<WhatsAppDeliveryStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/Messages/${messageId}.json`, {
        headers: { 'Authorization': this.authHeader },
      });

      const data = await response.json() as Record<string, unknown>;

      const statusMap: Record<string, WhatsAppDeliveryStatus['status']> = {
        queued: 'queued',
        sending: 'sent',
        sent: 'sent',
        delivered: 'delivered',
        read: 'read',
        undelivered: 'failed',
        failed: 'failed',
      };

      return {
        messageId,
        status: statusMap[data.status as string] || 'queued',
        timestamp: (data.date_updated as string) || new Date().toISOString(),
        errorCode: data.error_code != null ? String(data.error_code) : undefined,
        errorMessage: data.error_message as string | undefined,
      };
    } catch {
      return {
        messageId,
        status: 'failed',
        timestamp: new Date().toISOString(),
        errorMessage: 'Failed to fetch delivery status',
      };
    }
  }

  async listTemplates(): Promise<WhatsAppTemplate[]> {
    // Twilio WhatsApp templates are managed via the Twilio Console.
    // The API for listing content templates is via Content API v1.
    // For now, return an empty list.
    return [];
  }
}
