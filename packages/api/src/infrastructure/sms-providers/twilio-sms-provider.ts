/**
 * Twilio SMS Provider
 *
 * Wraps the existing Twilio integration from notification-service.ts into
 * the ISmsProvider interface for gateway-agnostic SMS delivery.
 */

import type { ISmsProvider, SmsMessage, SmsDeliveryResult, SmsDeliveryStatus } from '../sms-provider';
import { isValidE164 } from '../sms-provider';
import { logger } from '../../lib/logger';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;          // Default sender phone or Messaging Service SID
  statusCallbackUrl?: string;  // Webhook URL for delivery receipts
}

export class TwilioSmsProvider implements ISmsProvider {
  readonly name = 'twilio';
  private config: TwilioConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: TwilioConfig) {
    this.config = config;
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}`;
    this.authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  }

  async send(message: SmsMessage): Promise<SmsDeliveryResult> {
    if (!isValidE164(message.to)) {
      return {
        success: false,
        messageId: '',
        provider: this.name,
        status: 'failed',
        error: `Invalid E.164 phone number: ${message.to}`,
      };
    }

    try {
      const params = new URLSearchParams({
        To: message.to,
        Body: message.body,
      });

      // Use Messaging Service SID if from starts with "MG", otherwise use phone number
      const from = message.from || this.config.fromNumber;
      if (from.startsWith('MG')) {
        params.set('MessagingServiceSid', from);
      } else {
        params.set('From', from);
      }

      if (message.callbackUrl || this.config.statusCallbackUrl) {
        params.set('StatusCallback', message.callbackUrl || this.config.statusCallbackUrl!);
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
        logger.error(`Twilio SMS send failed: ${data.message}`);
        return {
          success: false,
          messageId: '',
          provider: this.name,
          status: 'failed',
          error: (data.message as string) || 'Twilio API error',
        };
      }

      return {
        success: true,
        messageId: data.sid as string,
        provider: this.name,
        status: 'queued',
        cost: data.price ? Math.abs(parseFloat(data.price as string)) : undefined,
      };
    } catch (error) {
      const message_ = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Twilio SMS provider error: ${message_}`);
      return {
        success: false,
        messageId: '',
        provider: this.name,
        status: 'failed',
        error: message_,
      };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<SmsDeliveryStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/Messages/${messageId}.json`, {
        headers: { 'Authorization': this.authHeader },
      });

      const data = await response.json() as Record<string, unknown>;

      const statusMap: Record<string, SmsDeliveryStatus['status']> = {
        queued: 'queued',
        sending: 'sent',
        sent: 'sent',
        delivered: 'delivered',
        undelivered: 'undelivered',
        failed: 'failed',
      };

      return {
        messageId,
        status: statusMap[data.status as string] || 'queued',
        timestamp: (data.date_updated as string) || new Date().toISOString(),
        errorCode: data.error_code != null ? String(data.error_code) : undefined,
        errorMessage: data.error_message as string | undefined,
      };
    } catch (error) {
      return {
        messageId,
        status: 'failed',
        timestamp: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validatePhone(phoneNumber: string): Promise<{ valid: boolean; carrier?: string; type?: string }> {
    if (!isValidE164(phoneNumber)) {
      return { valid: false };
    }

    try {
      const response = await fetch(
        `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phoneNumber)}?Fields=line_type_intelligence`,
        { headers: { 'Authorization': this.authHeader } }
      );

      if (!response.ok) {
        return { valid: false };
      }

      const data = await response.json() as Record<string, unknown>;
      const lineInfo = data.line_type_intelligence as Record<string, string> | undefined;
      return {
        valid: (data.valid as boolean) ?? true,
        carrier: lineInfo?.carrier_name,
        type: lineInfo?.type,
      };
    } catch {
      // If lookup fails, assume valid (don't block sends on lookup failure)
      return { valid: true };
    }
  }
}
