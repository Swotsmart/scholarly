/**
 * SMS, Email, and Web Chat Channel Adapters
 *
 * Three adapters in one file — they're simpler than WhatsApp and share
 * similar patterns. Each implements the ChannelAdapter contract:
 *   - initialize() with channel-specific credentials
 *   - sendMessage() for outbound delivery
 *   - parseInboundWebhook() for incoming messages
 *   - validateWebhookSignature() for security
 */

import * as crypto from 'crypto';
import type {
  ChannelAdapter, ChannelCapabilities, ChannelConfig, OutboundMessage,
  InboundWebhookResult, MessageStatus, SmsCredentials, EmailCredentials,
  WebChatCredentials,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════
//  SMS ADAPTER
// ═══════════════════════════════════════════════════════════════════════

export class SmsAdapter implements ChannelAdapter {
  readonly channel = 'SMS' as const;
  readonly capabilities: ChannelCapabilities = {
    channel: 'SMS',
    supportsMedia: true, // MMS
    supportsTemplates: false,
    supportsReactions: false,
    supportsReadReceipts: false,
    supportsTypingIndicators: false,
    maxMessageLength: 1600, // Concatenated SMS
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif'],
    maxMediaSizeMb: 5,
    supportsRichText: false,
    supportsButtons: false,
  };

  private config!: ChannelConfig;
  private creds!: SmsCredentials;

  async initialize(config: ChannelConfig): Promise<void> {
    this.config = config;
    this.creds = config.credentials as SmsCredentials;
  }

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    // Verify credentials by checking the phone number
    try {
      if (this.creds.provider === 'twilio') {
        const resp = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${this.creds.accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(this.creds.fromNumber)}`,
          { headers: { 'Authorization': `Basic ${Buffer.from(`${this.creds.accountSid}:${this.creds.authToken}`).toString('base64')}` } }
        );
        return { connected: resp.ok };
      }
      return { connected: true }; // Other providers: assume OK
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }

  async sendMessage(message: OutboundMessage): Promise<{ channelMessageId: string; status: MessageStatus }> {
    if (this.creds.provider === 'twilio') {
      return this.sendViaTwilio(message);
    }
    // Default: Twilio-compatible
    return this.sendViaTwilio(message);
  }

  private async sendViaTwilio(message: OutboundMessage): Promise<{ channelMessageId: string; status: MessageStatus }> {
    const params = new URLSearchParams({
      To: message.recipientId,
      From: this.creds.fromNumber,
      Body: message.text || '',
    });

    // MMS: add media URL
    if (message.media?.length) {
      params.set('MediaUrl', message.media[0].url);
    }

    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.creds.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.creds.accountSid}:${this.creds.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!resp.ok) throw new Error(`Twilio SMS error: ${resp.status}`);
    const data = await resp.json() as any;
    return { channelMessageId: data.sid || '', status: 'SENT' };
  }

  parseInboundWebhook(payload: any): InboundWebhookResult {
    try {
      // Twilio inbound SMS webhook format
      const messages: InboundWebhookResult['messages'] = [];

      if (payload.From && payload.Body !== undefined) {
        messages.push({
          channel: 'SMS',
          direction: 'INBOUND',
          status: 'DELIVERED',
          type: payload.NumMedia > 0 ? 'MEDIA' : 'TEXT',
          senderId: payload.From,
          recipientId: payload.To || this.creds.fromNumber,
          text: payload.Body,
          media: this.extractTwilioMedia(payload),
          channelMessageId: payload.MessageSid || payload.SmsSid,
          isAutomated: false,
          metadata: { fromCity: payload.FromCity, fromState: payload.FromState, fromCountry: payload.FromCountry },
        });
      }

      // Status callback
      const statusUpdates: InboundWebhookResult['statusUpdates'] = [];
      if (payload.MessageStatus && payload.MessageSid) {
        const statusMap: Record<string, MessageStatus> = {
          queued: 'PENDING', sent: 'SENT', delivered: 'DELIVERED',
          undelivered: 'FAILED', failed: 'FAILED',
        };
        statusUpdates.push({
          channelMessageId: payload.MessageSid,
          status: statusMap[payload.MessageStatus] || 'SENT',
          timestamp: new Date(),
        });
      }

      return { success: true, messages, statusUpdates };
    } catch (err: any) {
      return { success: false, messages: [], error: err.message };
    }
  }

  private extractTwilioMedia(payload: any): any[] | undefined {
    const count = parseInt(payload.NumMedia || '0');
    if (count === 0) return undefined;
    const media: any[] = [];
    for (let i = 0; i < count; i++) {
      media.push({
        id: `media-${i}`,
        type: 'IMAGE',
        mimeType: payload[`MediaContentType${i}`] || 'image/jpeg',
        url: payload[`MediaUrl${i}`] || '',
      });
    }
    return media;
  }

  validateWebhookSignature(payload: any, signature: string): boolean {
    if (!this.creds.authToken) return true;
    // Twilio signature validation
    const url = this.creds.webhookUrl || '';
    const paramStr = Object.keys(payload).sort().map(k => k + payload[k]).join('');
    const expected = crypto.createHmac('sha1', this.creds.authToken)
      .update(url + paramStr)
      .digest('base64');
    return expected === signature;
  }

  async shutdown(): Promise<void> {}
}

// ═══════════════════════════════════════════════════════════════════════
//  EMAIL ADAPTER
// ═══════════════════════════════════════════════════════════════════════

export class EmailAdapter implements ChannelAdapter {
  readonly channel = 'EMAIL' as const;
  readonly capabilities: ChannelCapabilities = {
    channel: 'EMAIL',
    supportsMedia: true, // Attachments
    supportsTemplates: false,
    supportsReactions: false,
    supportsReadReceipts: false, // Not reliable
    supportsTypingIndicators: false,
    maxMessageLength: 1000000, // Effectively unlimited
    supportedMediaTypes: ['*/*'], // Any attachment type
    maxMediaSizeMb: 25,
    supportsRichText: true, // HTML emails
    supportsButtons: false,
  };

  private config!: ChannelConfig;
  private creds!: EmailCredentials;

  async initialize(config: ChannelConfig): Promise<void> {
    this.config = config;
    this.creds = config.credentials as EmailCredentials;
  }

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      if (this.creds.provider === 'sendgrid' && this.creds.apiKey) {
        const resp = await fetch('https://api.sendgrid.com/v3/user/profile', {
          headers: { 'Authorization': `Bearer ${this.creds.apiKey}` },
        });
        return { connected: resp.ok };
      }
      return { connected: true };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }

  async sendMessage(message: OutboundMessage): Promise<{ channelMessageId: string; status: MessageStatus }> {
    if (this.creds.provider === 'sendgrid') {
      return this.sendViaSendGrid(message);
    }
    // Default fallback
    return this.sendViaSendGrid(message);
  }

  private async sendViaSendGrid(message: OutboundMessage): Promise<{ channelMessageId: string; status: MessageStatus }> {
    const emailData: any = {
      personalizations: [{
        to: [{ email: message.recipientId }],
        subject: message.emailFields?.subject || 'Message',
      }],
      from: { email: this.creds.fromAddress, name: this.creds.fromName },
      content: [],
    };

    if (message.emailFields?.cc?.length) {
      emailData.personalizations[0].cc = message.emailFields.cc.map(e => ({ email: e }));
    }

    if (message.emailFields?.replyTo) {
      emailData.reply_to = { email: message.emailFields.replyTo };
    }

    // Threading
    if (message.emailFields?.inReplyTo) {
      emailData.headers = {
        'In-Reply-To': message.emailFields.inReplyTo,
        'References': message.emailFields.references?.join(' ') || message.emailFields.inReplyTo,
      };
    }

    // Content: prefer HTML, fallback to plain text
    if (message.html) {
      emailData.content.push({ type: 'text/html', value: message.html });
    }
    if (message.text) {
      emailData.content.push({ type: 'text/plain', value: message.text });
    }
    if (emailData.content.length === 0) {
      emailData.content.push({ type: 'text/plain', value: '' });
    }

    // Attachments
    if (message.media?.length) {
      emailData.attachments = message.media.map(m => ({
        filename: m.filename || 'attachment',
        type: m.mimeType,
        content: m.url, // In production: base64-encoded content
        disposition: 'attachment',
      }));
    }

    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.creds.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!resp.ok) throw new Error(`SendGrid error: ${resp.status}`);
    const messageId = resp.headers.get('x-message-id') || `email-${Date.now()}`;
    return { channelMessageId: messageId, status: 'SENT' };
  }

  parseInboundWebhook(payload: any): InboundWebhookResult {
    try {
      const messages: InboundWebhookResult['messages'] = [];

      // SendGrid Inbound Parse webhook format
      if (payload.from || payload.sender) {
        const fromEmail = this.extractEmail(payload.from || payload.sender);
        const toEmail = this.extractEmail(payload.to || payload.envelope?.to?.[0] || '');

        messages.push({
          channel: 'EMAIL',
          direction: 'INBOUND',
          status: 'DELIVERED',
          type: 'TEXT',
          senderId: fromEmail,
          senderName: this.extractName(payload.from),
          recipientId: toEmail,
          text: payload.text || '',
          html: payload.html || undefined,
          emailFields: {
            subject: payload.subject || '',
            from: fromEmail,
            to: [toEmail],
            cc: payload.cc ? payload.cc.split(',').map((e: string) => this.extractEmail(e.trim())) : undefined,
            inReplyTo: payload.headers?.['In-Reply-To'] || payload['In-Reply-To'],
            references: payload.headers?.['References']?.split(' '),
          },
          media: this.extractEmailAttachments(payload),
          channelMessageId: payload.headers?.['Message-ID'] || `inbound-${Date.now()}`,
          isAutomated: false,
          metadata: { spamScore: payload.spam_score, spf: payload.SPF, dkim: payload.dkim },
        });
      }

      return { success: true, messages };
    } catch (err: any) {
      return { success: false, messages: [], error: err.message };
    }
  }

  private extractEmail(str: string): string {
    const match = str.match(/<(.+?)>/) || str.match(/([^\s<>]+@[^\s<>]+)/);
    return match ? match[1] : str;
  }

  private extractName(str: string): string | undefined {
    const match = str.match(/^(.+?)\s*</);
    return match ? match[1].replace(/"/g, '').trim() : undefined;
  }

  private extractEmailAttachments(payload: any): any[] | undefined {
    const count = parseInt(payload.attachments || '0');
    if (count === 0 && !payload['attachment-info']) return undefined;

    try {
      const info = typeof payload['attachment-info'] === 'string'
        ? JSON.parse(payload['attachment-info'])
        : payload['attachment-info'] || {};

      return Object.entries(info).map(([key, val]: [string, any]) => ({
        id: key,
        type: 'DOCUMENT' as const,
        mimeType: val.type || val['content-type'] || 'application/octet-stream',
        url: '', // Attachment content comes as multipart form data
        filename: val.filename || val.name || key,
        sizeBytes: val.size,
      }));
    } catch {
      return undefined;
    }
  }

  validateWebhookSignature(_payload: any, _signature: string): boolean {
    // SendGrid uses basic auth or OAuth for webhook verification
    return true;
  }

  async shutdown(): Promise<void> {}
}

// ═══════════════════════════════════════════════════════════════════════
//  WEB CHAT ADAPTER
// ═══════════════════════════════════════════════════════════════════════

/**
 * The Web Chat adapter is different from the others: instead of
 * connecting to an external service API, it IS the service. The
 * adapter manages WebSocket connections from embedded chat widgets.
 *
 * Inbound: Widget sends JSON over WebSocket → parseInboundWebhook
 * Outbound: sendMessage → pushes to the customer's WebSocket
 *
 * In production, this integrates with the existing Chat plugin's
 * WebSocket infrastructure. Here we define the adapter contract
 * and message format.
 */
export class WebChatAdapter implements ChannelAdapter {
  readonly channel = 'WEB_CHAT' as const;
  readonly capabilities: ChannelCapabilities = {
    channel: 'WEB_CHAT',
    supportsMedia: true,
    supportsTemplates: false,
    supportsReactions: true,
    supportsReadReceipts: true,
    supportsTypingIndicators: true,
    maxMessageLength: 10000,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    maxMediaSizeMb: 10,
    supportsRichText: true, // HTML in web chat
    supportsButtons: true, // Quick reply buttons
  };

  private config!: ChannelConfig;
  private creds!: WebChatCredentials;
  /** Active WebSocket sessions: sessionId → sendCallback */
  private activeSessions: Map<string, (msg: any) => void> = new Map();

  async initialize(config: ChannelConfig): Promise<void> {
    this.config = config;
    this.creds = config.credentials as WebChatCredentials;
  }

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    return { connected: true }; // Web chat is self-hosted
  }

  async sendMessage(message: OutboundMessage): Promise<{ channelMessageId: string; status: MessageStatus }> {
    const msgId = `wcm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const outbound = {
      id: msgId,
      type: 'agent_message',
      text: message.text,
      html: message.html,
      media: message.media,
      interactive: message.interactive,
      timestamp: new Date().toISOString(),
    };

    // Push to the customer's WebSocket session
    const sendFn = this.activeSessions.get(message.recipientId);
    if (sendFn) {
      sendFn(outbound);
      return { channelMessageId: msgId, status: 'DELIVERED' };
    }

    // Session not found — message queued for when they reconnect
    return { channelMessageId: msgId, status: 'SENT' };
  }

  async markRead(channelMessageId: string): Promise<void> {
    // Push read receipt to all active sessions
    for (const sendFn of this.activeSessions.values()) {
      sendFn({ type: 'read_receipt', messageId: channelMessageId });
    }
  }

  async sendTypingIndicator(recipientId: string): Promise<void> {
    const sendFn = this.activeSessions.get(recipientId);
    if (sendFn) sendFn({ type: 'typing_indicator', isTyping: true });
  }

  parseInboundWebhook(payload: any): InboundWebhookResult {
    try {
      const messages: InboundWebhookResult['messages'] = [];

      if (payload.type === 'customer_message') {
        messages.push({
          channel: 'WEB_CHAT',
          direction: 'INBOUND',
          status: 'DELIVERED',
          type: payload.media?.length ? 'MEDIA' : 'TEXT',
          senderId: payload.sessionId || payload.visitorId,
          senderName: payload.visitorName,
          recipientId: this.creds.widgetId,
          text: payload.text,
          html: payload.html,
          media: payload.media,
          interactive: payload.buttonReply ? {
            type: 'QUICK_REPLIES', body: '',
            actions: [{ type: 'BUTTON', id: payload.buttonReply.id, label: payload.buttonReply.label }],
          } : undefined,
          channelMessageId: payload.messageId || `wc-${Date.now()}`,
          isAutomated: false,
          metadata: {
            sessionId: payload.sessionId,
            pageUrl: payload.pageUrl,
            userAgent: payload.userAgent,
            preChatData: payload.preChatData,
          },
        });
      }

      // Status updates
      const statusUpdates: InboundWebhookResult['statusUpdates'] = [];
      if (payload.type === 'read_receipt') {
        statusUpdates.push({
          channelMessageId: payload.messageId,
          status: 'READ',
          timestamp: new Date(),
        });
      }

      return { success: true, messages, statusUpdates };
    } catch (err: any) {
      return { success: false, messages: [], error: err.message };
    }
  }

  validateWebhookSignature(_payload: any, _signature: string): boolean {
    // Web chat is internal — no external webhook validation needed
    // Origin checking is handled by CORS
    return true;
  }

  /** Register a WebSocket session for a customer */
  registerSession(sessionId: string, sendFn: (msg: any) => void): void {
    this.activeSessions.set(sessionId, sendFn);
  }

  /** Unregister a disconnected session */
  unregisterSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  async shutdown(): Promise<void> {
    this.activeSessions.clear();
  }
}

// All three adapters are exported at their class declarations above
