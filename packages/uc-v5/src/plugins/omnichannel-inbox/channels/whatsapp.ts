/**
 * WhatsApp Channel Adapter — Meta Business Cloud API
 *
 * Translates between the Omnichannel Inbox's universal message model
 * and WhatsApp's specific API format. WhatsApp has the richest message
 * type support of any channel: text, images, documents, audio, video,
 * stickers, locations, contacts, interactive buttons, list messages,
 * and template (HSM) messages.
 *
 * Inbound: Webhooks from Meta → parseInboundWebhook → OmniMessage[]
 * Outbound: OmniMessage → sendMessage → WhatsApp Cloud API POST
 */

import type {
  ChannelAdapter, ChannelCapabilities, ChannelConfig, OutboundMessage,
  InboundWebhookResult, MessageMedia, MessageTemplate, MessageStatus,
  WhatsAppCredentials,
} from '../types';
import * as crypto from 'crypto';

const WA_API_BASE = 'https://graph.facebook.com';

export class WhatsAppAdapter implements ChannelAdapter {
  readonly channel = 'WHATSAPP' as const;
  readonly capabilities: ChannelCapabilities = {
    channel: 'WHATSAPP',
    supportsMedia: true,
    supportsTemplates: true,
    supportsReactions: true,
    supportsReadReceipts: true,
    supportsTypingIndicators: false, // WhatsApp doesn't have a typing API
    maxMessageLength: 4096,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/ogg', 'audio/mp4', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxMediaSizeMb: 100,
    supportsRichText: false,
    supportsButtons: true,
  };

  private config!: ChannelConfig;
  private creds!: WhatsAppCredentials;
  private apiVersion = 'v18.0';

  async initialize(config: ChannelConfig): Promise<void> {
    this.config = config;
    this.creds = config.credentials as WhatsAppCredentials;
    if (this.creds.apiVersion) this.apiVersion = this.creds.apiVersion;
  }

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const resp = await this.waRequest('GET', `/${this.creds.phoneNumberId}`);
      return { connected: true };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }

  async sendMessage(message: OutboundMessage): Promise<{ channelMessageId: string; status: MessageStatus }> {
    let body: any;

    if (message.media?.length) {
      const media = message.media[0];
      const mediaType = media.type.toLowerCase(); // image, video, audio, document
      body = {
        messaging_product: 'whatsapp',
        to: message.recipientId,
        type: mediaType,
        [mediaType]: {
          link: media.url,
          caption: message.text || media.caption,
          filename: media.filename,
        },
      };
    } else if (message.interactive) {
      body = {
        messaging_product: 'whatsapp',
        to: message.recipientId,
        type: 'interactive',
        interactive: this.buildInteractive(message.interactive),
      };
    } else {
      body = {
        messaging_product: 'whatsapp',
        to: message.recipientId,
        type: 'text',
        text: { body: message.text || '' },
      };
    }

    const result = await this.waRequest('POST', `/${this.creds.phoneNumberId}/messages`, body);
    const msgId = result?.messages?.[0]?.id || '';
    return { channelMessageId: msgId, status: 'SENT' };
  }

  async sendTemplate(recipientId: string, template: MessageTemplate): Promise<{ channelMessageId: string; status: MessageStatus }> {
    const components: any[] = [];
    const paramEntries = Object.entries(template.parameters);
    if (paramEntries.length > 0) {
      components.push({
        type: 'body',
        parameters: paramEntries.map(([, value]) => ({ type: 'text', text: value })),
      });
    }

    const body = {
      messaging_product: 'whatsapp',
      to: recipientId,
      type: 'template',
      template: {
        name: template.name,
        language: { code: template.language },
        components,
      },
    };

    const result = await this.waRequest('POST', `/${this.creds.phoneNumberId}/messages`, body);
    return { channelMessageId: result?.messages?.[0]?.id || '', status: 'SENT' };
  }

  async markRead(channelMessageId: string): Promise<void> {
    await this.waRequest('POST', `/${this.creds.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: channelMessageId,
    });
  }

  parseInboundWebhook(payload: any): InboundWebhookResult {
    try {
      const messages: InboundWebhookResult['messages'] = [];
      const statusUpdates: InboundWebhookResult['statusUpdates'] = [];

      const entries = payload?.entry || [];
      for (const entry of entries) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (!value) continue;

          // Messages
          for (const msg of value.messages || []) {
            const contact = (value.contacts || []).find((c: any) => c.wa_id === msg.from);
            messages.push({
              channel: 'WHATSAPP',
              direction: 'INBOUND',
              status: 'DELIVERED',
              type: this.mapWaMessageType(msg.type),
              senderId: msg.from,
              senderName: contact?.profile?.name,
              recipientId: value.metadata?.display_phone_number || '',
              text: msg.text?.body || msg.caption,
              media: this.extractMedia(msg),
              location: msg.location ? {
                latitude: msg.location.latitude,
                longitude: msg.location.longitude,
                name: msg.location.name,
                address: msg.location.address,
              } : undefined,
              interactive: msg.interactive ? {
                type: 'BUTTONS', body: '',
                actions: [{ type: 'BUTTON', id: msg.interactive.button_reply?.id || msg.interactive.list_reply?.id || '', label: msg.interactive.button_reply?.title || msg.interactive.list_reply?.title || '' }],
              } : undefined,
              channelMessageId: msg.id,
              isAutomated: false,
              metadata: { timestamp: msg.timestamp, context: msg.context },
            });
          }

          // Status updates
          for (const status of value.statuses || []) {
            statusUpdates.push({
              channelMessageId: status.id,
              status: this.mapWaStatus(status.status),
              timestamp: new Date(parseInt(status.timestamp) * 1000),
            });
          }
        }
      }

      return { success: true, messages, statusUpdates };
    } catch (err: any) {
      return { success: false, messages: [], error: err.message };
    }
  }

  validateWebhookSignature(payload: any, signature: string): boolean {
    if (!this.creds.webhookVerifyToken) return true;
    const expected = crypto.createHmac('sha256', this.creds.webhookVerifyToken)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    return `sha256=${expected}` === signature;
  }

  async shutdown(): Promise<void> {}

  // ─── Helpers ──────────────────────────────────────────────────────

  private async waRequest(method: string, path: string, body?: any): Promise<any> {
    const url = `${WA_API_BASE}/${this.apiVersion}${path}`;
    const resp = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`WhatsApp API ${resp.status}: ${err}`);
    }
    return resp.status === 204 ? {} : resp.json();
  }

  private mapWaMessageType(waType: string): 'TEXT' | 'MEDIA' | 'LOCATION' | 'CONTACT_CARD' | 'INTERACTIVE' {
    const map: Record<string, any> = {
      text: 'TEXT', image: 'MEDIA', video: 'MEDIA', audio: 'MEDIA',
      document: 'MEDIA', sticker: 'MEDIA', location: 'LOCATION',
      contacts: 'CONTACT_CARD', interactive: 'INTERACTIVE', button: 'INTERACTIVE',
    };
    return map[waType] || 'TEXT';
  }

  private mapWaStatus(waStatus: string): MessageStatus {
    const map: Record<string, MessageStatus> = { sent: 'SENT', delivered: 'DELIVERED', read: 'READ', failed: 'FAILED' };
    return map[waStatus] || 'SENT';
  }

  private extractMedia(msg: any): MessageMedia[] | undefined {
    for (const type of ['image', 'video', 'audio', 'document', 'sticker']) {
      if (msg[type]) {
        return [{
          id: msg[type].id || '',
          type: type === 'sticker' ? 'IMAGE' : type.toUpperCase() as any,
          mimeType: msg[type].mime_type || '',
          url: '', // Media URL requires a separate download call
          filename: msg[type].filename,
          caption: msg[type].caption,
        }];
      }
    }
    return undefined;
  }

  private buildInteractive(inter: any): any {
    if (inter.type === 'BUTTONS') {
      return {
        type: 'button',
        body: { text: inter.body },
        header: inter.header ? { type: 'text', text: inter.header } : undefined,
        footer: inter.footer ? { text: inter.footer } : undefined,
        action: {
          buttons: inter.actions.slice(0, 3).map((a: any) => ({
            type: 'reply', reply: { id: a.id, title: a.label.slice(0, 20) },
          })),
        },
      };
    }
    if (inter.type === 'LIST') {
      return {
        type: 'list',
        body: { text: inter.body },
        action: {
          button: 'Options',
          sections: [{ title: 'Options', rows: inter.actions.map((a: any) => ({ id: a.id, title: a.label, description: a.description })) }],
        },
      };
    }
    return { type: 'button', body: { text: inter.body }, action: { buttons: [] } };
  }
}

export default WhatsAppAdapter;
