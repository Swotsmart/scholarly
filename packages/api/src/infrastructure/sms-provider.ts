/**
 * SMS Provider Interface
 *
 * Gateway-agnostic abstraction for SMS delivery, allowing tenants
 * to choose between Twilio and Vonage without changing application code.
 */

export interface SmsMessage {
  to: string;       // E.164 format: +61400000000
  body: string;
  from?: string;    // Override default from number
  callbackUrl?: string;
}

export interface SmsDeliveryResult {
  success: boolean;
  messageId: string;
  provider: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  cost?: number;
  error?: string;
}

export interface SmsDeliveryStatus {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface ISmsProvider {
  readonly name: string;

  /** Send a single SMS */
  send(message: SmsMessage): Promise<SmsDeliveryResult>;

  /** Query delivery status of a sent message */
  getDeliveryStatus(messageId: string): Promise<SmsDeliveryStatus>;

  /** Validate a phone number is reachable via SMS */
  validatePhone(phoneNumber: string): Promise<{ valid: boolean; carrier?: string; type?: string }>;
}

/**
 * Validate E.164 phone format
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}
