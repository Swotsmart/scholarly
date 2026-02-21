/**
 * Vonage (Nexmo) SMS Provider
 *
 * Implements ISmsProvider using the Vonage SMS REST API.
 */

import type { ISmsProvider, SmsMessage, SmsDeliveryResult, SmsDeliveryStatus } from '../sms-provider';
import { isValidE164 } from '../sms-provider';
import { logger } from '../../lib/logger';

interface VonageConfig {
  apiKey: string;
  apiSecret: string;
  fromNumber: string;          // Default sender ID or phone
  statusCallbackUrl?: string;
}

export class VonageSmsProvider implements ISmsProvider {
  readonly name = 'vonage';
  private config: VonageConfig;

  constructor(config: VonageConfig) {
    this.config = config;
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
      const payload = {
        from: message.from || this.config.fromNumber,
        to: message.to.replace('+', ''), // Vonage doesn't want the + prefix
        text: message.body,
        api_key: this.config.apiKey,
        api_secret: this.config.apiSecret,
        ...(message.callbackUrl || this.config.statusCallbackUrl
          ? { callback: message.callbackUrl || this.config.statusCallbackUrl }
          : {}),
      };

      const response = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as Record<string, unknown>;
      const messages = data.messages as Array<Record<string, unknown>> | undefined;
      const msg = messages?.[0];

      if (!msg || msg.status !== '0') {
        const errorText = (msg?.['error-text'] as string) || 'Unknown Vonage error';
        logger.error(`Vonage SMS send failed: ${errorText}`);
        return {
          success: false,
          messageId: '',
          provider: this.name,
          status: 'failed',
          error: errorText,
        };
      }

      return {
        success: true,
        messageId: msg['message-id'] as string,
        provider: this.name,
        status: 'queued',
        cost: msg['message-price'] ? parseFloat(msg['message-price'] as string) : undefined,
      };
    } catch (error) {
      const message_ = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Vonage SMS provider error: ${message_}`);
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
    // Vonage delivery receipts are push-based (webhooks), not pull-based.
    // For polling, we'd need to search the Messages API which requires the Messages API (v2).
    // For now, return a pending status — actual delivery status comes via webhook.
    return {
      messageId,
      status: 'queued',
      timestamp: new Date().toISOString(),
      errorMessage: 'Vonage uses webhook-based delivery receipts. Check your callback URL.',
    };
  }

  async validatePhone(phoneNumber: string): Promise<{ valid: boolean; carrier?: string; type?: string }> {
    if (!isValidE164(phoneNumber)) {
      return { valid: false };
    }

    try {
      const params = new URLSearchParams({
        api_key: this.config.apiKey,
        api_secret: this.config.apiSecret,
        number: phoneNumber.replace('+', ''),
      });

      const response = await fetch(
        `https://api.nexmo.com/ni/basic/json?${params}`
      );

      if (!response.ok) {
        return { valid: true }; // Assume valid if lookup fails
      }

      const data = await response.json() as Record<string, unknown>;
      const carrier = data.current_carrier as Record<string, string> | undefined;
      return {
        valid: data.status === 0,
        carrier: carrier?.name,
        type: carrier?.network_type,
      };
    } catch {
      return { valid: true };
    }
  }
}
