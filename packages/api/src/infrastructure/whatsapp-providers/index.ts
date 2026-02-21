/**
 * WhatsApp Provider Factory
 *
 * Creates the appropriate IWhatsAppProvider based on tenant configuration.
 */

import type { IWhatsAppProvider } from '../whatsapp-provider';
import { TwilioWhatsAppProvider } from './twilio-whatsapp-provider';
import { MetaCloudProvider } from './meta-cloud-provider';

export type WhatsAppProviderType = 'twilio-whatsapp' | 'meta-cloud';

interface WhatsAppProviderConfig {
  provider: WhatsAppProviderType;
  credentials: Record<string, string>;
}

/**
 * Create a WhatsApp provider instance from tenant configuration.
 */
export function createWhatsAppProvider(config: WhatsAppProviderConfig): IWhatsAppProvider {
  switch (config.provider) {
    case 'twilio-whatsapp':
      return new TwilioWhatsAppProvider({
        accountSid: config.credentials.accountSid,
        authToken: config.credentials.authToken,
        fromNumber: config.credentials.fromNumber,
        statusCallbackUrl: config.credentials.statusCallbackUrl,
      });

    case 'meta-cloud':
      return new MetaCloudProvider({
        accessToken: config.credentials.accessToken,
        phoneNumberId: config.credentials.phoneNumberId,
        businessAccountId: config.credentials.businessAccountId,
      });

    default:
      throw new Error(`Unknown WhatsApp provider: ${config.provider}`);
  }
}

export { TwilioWhatsAppProvider } from './twilio-whatsapp-provider';
export { MetaCloudProvider } from './meta-cloud-provider';
