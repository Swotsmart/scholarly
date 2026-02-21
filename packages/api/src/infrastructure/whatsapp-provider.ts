/**
 * WhatsApp Provider Interface
 *
 * Gateway-agnostic abstraction for WhatsApp Business API delivery,
 * supporting both Twilio WhatsApp and Meta Cloud API.
 */

export interface WhatsAppMessage {
  to: string;       // E.164 format: +61400000000
  body: string;
  templateName?: string;
  templateParams?: string[];
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'video' | 'audio';
}

export interface WhatsAppDeliveryResult {
  success: boolean;
  messageId: string;
  provider: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  error?: string;
}

export interface WhatsAppDeliveryStatus {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  category: string;
  components: Array<{
    type: string;
    text?: string;
    parameters?: Array<{ type: string; text?: string }>;
  }>;
}

export interface IWhatsAppProvider {
  readonly name: string;

  /** Send a text or template message */
  send(message: WhatsAppMessage): Promise<WhatsAppDeliveryResult>;

  /** Query delivery status */
  getDeliveryStatus(messageId: string): Promise<WhatsAppDeliveryStatus>;

  /** List approved message templates */
  listTemplates(): Promise<WhatsAppTemplate[]>;
}
