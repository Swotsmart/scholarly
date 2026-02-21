/**
 * SMS Provider Factory
 *
 * Creates the appropriate ISmsProvider based on tenant configuration.
 */

import type { ISmsProvider } from '../sms-provider';
import { TwilioSmsProvider } from './twilio-sms-provider';
import { VonageSmsProvider } from './vonage-sms-provider';

export type SmsProviderType = 'twilio' | 'vonage';

interface SmsProviderConfig {
  provider: SmsProviderType;
  credentials: Record<string, string>;
}

/**
 * Create an SMS provider instance from tenant configuration.
 */
export function createSmsProvider(config: SmsProviderConfig): ISmsProvider {
  switch (config.provider) {
    case 'twilio':
      return new TwilioSmsProvider({
        accountSid: config.credentials.accountSid,
        authToken: config.credentials.authToken,
        fromNumber: config.credentials.fromNumber,
        statusCallbackUrl: config.credentials.statusCallbackUrl,
      });

    case 'vonage':
      return new VonageSmsProvider({
        apiKey: config.credentials.apiKey,
        apiSecret: config.credentials.apiSecret,
        fromNumber: config.credentials.fromNumber,
        statusCallbackUrl: config.credentials.statusCallbackUrl,
      });

    default:
      throw new Error(`Unknown SMS provider: ${config.provider}`);
  }
}

export { TwilioSmsProvider } from './twilio-sms-provider';
export { VonageSmsProvider } from './vonage-sms-provider';
