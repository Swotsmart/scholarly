/**
 * Scholarly Unified Communications 4.0 — Omnichannel Inbox Plugin
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE SORTING OFFICE THAT NEVER SLEEPS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every message from every channel flows through this plugin. It's the
 * central nervous system for customer communication — the sorting office
 * where every letter, telegram, and carrier pigeon is opened, read,
 * sorted, and delivered to the right desk.
 *
 * The flow:
 *
 *   1. INBOUND: Channel webhook → Channel adapter parses → OmniMessage
 *      → Find/create conversation → Route through CC queue → Agent
 *      gets screen pop + conversation assignment
 *
 *   2. AGENT REPLY: Agent types reply → OmniMessage created →
 *      Channel adapter sends through originating channel → Status
 *      tracked (sent → delivered → read)
 *
 *   3. RESOLUTION: Agent resolves conversation → Activity logged to
 *      CRM → Conversation closed → SLA metrics recorded
 *
 * REST endpoints (mounted at /api/omnichannel/):
 *
 *   ── Channel Management ──
 *   POST   /channels                      Configure a channel
 *   GET    /channels                      List configured channels
 *   PUT    /channels/:id                  Update channel config
 *   DELETE /channels/:id                  Remove channel
 *   POST   /channels/:id/test             Test channel connectivity
 *
 *   ── Webhooks (per channel) ──
 *   POST   /webhooks/whatsapp             WhatsApp webhook
 *   GET    /webhooks/whatsapp             WhatsApp verification
 *   POST   /webhooks/sms                  SMS webhook (Twilio)
 *   POST   /webhooks/email                Email webhook (SendGrid)
 *   POST   /webhooks/webchat              Web chat messages
 *
 *   ── Conversations ──
 *   GET    /conversations                 List conversations (filterable)
 *   GET    /conversations/:id             Get conversation details
 *   GET    /conversations/:id/messages    Get messages in a conversation
 *   POST   /conversations/:id/reply       Agent sends a reply
 *   POST   /conversations/:id/note        Agent adds internal note
 *   GET    /conversations/:id/notes       Get internal notes
 *   POST   /conversations/:id/assign      Assign to agent
 *   POST   /conversations/:id/transfer    Transfer to queue or agent
 *   POST   /conversations/:id/resolve     Resolve conversation
 *   POST   /conversations/:id/close       Close conversation
 *   PUT    /conversations/:id/priority    Update priority
 *   PUT    /conversations/:id/tags        Update tags
 *
 *   ── Agent Desktop ──
 *   GET    /desktop/:agentId              Get agent's inbox state
 *   GET    /desktop/:agentId/unread       Get unread count
 *
 *   ── Templates ──
 *   POST   /templates/send                Send a template message
 *
 * Event prefix: omni:*
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { UCPlugin, PluginContext, PluginHealth, PluginCapability } from '../../core/plugin-interface';
import type {
  OmniChannel, OmniMessage, OmniConversation, ConversationStatus,
  ConversationPriority, ChannelAdapter, ChannelConfig, OutboundMessage,
  AgentDesktopState, AgentConversationSlot, InboundWebhookResult,
  MessageMedia, EmailFields, MessageInteractive, MessageStatus,
} from './types';
import { WhatsAppAdapter } from './channels/whatsapp';
import { SmsAdapter, EmailAdapter, WebChatAdapter } from './channels/sms-email-webchat';

// ─── Adapter Registry ───────────────────────────────────────────────

const ADAPTER_FACTORIES: Record<string, () => ChannelAdapter> = {
  WHATSAPP: () => new WhatsAppAdapter(),
  SMS: () => new SmsAdapter(),
  EMAIL: () => new EmailAdapter(),
  WEB_CHAT: () => new WebChatAdapter(),
};

// ─── Internal Note ──────────────────────────────────────────────────

interface InternalNote {
  id: string;
  agentId: string;
  agentName?: string;
  text: string;
  createdAt: Date;
}

// ─── Plugin ─────────────────────────────────────────────────────────

export class OmnichannelInboxPlugin implements UCPlugin {
  readonly id = 'omnichannel-inbox';
  readonly name = 'Omnichannel Inbox';
  readonly version = '4.0.0';
  readonly dependencies = ['telephony', 'crm-connector'];

  private ctx!: PluginContext;
  private channels: Map<string, { config: ChannelConfig & { id: string }; adapter: ChannelAdapter }> = new Map();
  private channelsByType: Map<OmniChannel, string> = new Map();
  private conversations: Map<string, OmniConversation> = new Map();
  private messages: Map<string, OmniMessage[]> = new Map();
  private customerConversations: Map<string, string> = new Map();
  private agentAssignments: Map<string, Set<string>> = new Map();
  private internalNotes: Map<string, InternalNote[]> = new Map();
  private slaWarningSeconds = 300;
  private slaCheckInterval?: ReturnType<typeof setInterval>;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    this.subscribeToEvents();
    this.slaCheckInterval = setInterval(() => this.checkSlaBreach(), 30000);
    ctx.logger.info('[Omnichannel] Initialised — unified inbox ready for all channels');
  }

  getRoutes(): Router { return this.createRouter(); }

  async shutdown(): Promise<void> {
    if (this.slaCheckInterval) clearInterval(this.slaCheckInterval);
    for (const { adapter } of this.channels.values()) await adapter.shutdown();
    this.channels.clear();
    this.ctx.logger.info('[Omnichannel] Shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    const active = [...this.conversations.values()].filter(c => c.status === 'ACTIVE' || c.status === 'QUEUED').length;
    return {
      status: 'healthy',
      details: { channels: this.channels.size, activeConversations: active, totalConversations: this.conversations.size },
    };
  }

  getCapabilities(): PluginCapability[] {
    return [
      { key: 'omni.inbox', label: 'Omnichannel Inbox', description: 'Unified messaging across all channels', icon: 'MessageSquare', routePath: '/inbox', requiredRoles: [] },
      { key: 'omni.channels', label: 'Channel Management', description: 'Configure messaging channels', icon: 'Settings', routePath: '/channels', requiredRoles: ['admin'] },
    ];
  }

  // ─── Event Subscriptions ──────────────────────────────────────────

  private subscribeToEvents(): void {
    this.ctx.bus.on('queue:entry-connected', (evt: any) => {
      for (const conv of this.conversations.values()) {
        if (conv.queueEntryId === evt.entryId) {
          this.assignConversation(conv.id, evt.agentId);
          break;
        }
      }
    });
  }

  // ─── Channel Management ───────────────────────────────────────────

  async configureChannel(config: ChannelConfig & { id?: string }): Promise<{ id: string; connected: boolean; error?: string }> {
    const id = config.id || uuidv4();
    const factory = ADAPTER_FACTORIES[config.channel];
    if (!factory) return { id, connected: false, error: `Unknown channel: ${config.channel}` };

    const adapter = factory();
    try {
      await adapter.initialize(config);
      const test = await adapter.testConnection();
      if (test.connected) {
        this.channels.set(id, { config: { ...config, id }, adapter });
        this.channelsByType.set(config.channel, id);
        this.ctx.bus.emit('omni:channel-connected', { channel: config.channel, tenantId: config.tenantId } as any);
        return { id, connected: true };
      }
      return { id, connected: false, error: test.error };
    } catch (err: any) {
      return { id, connected: false, error: err.message };
    }
  }

  // ─── Inbound Message Processing ───────────────────────────────────

  async processInboundWebhook(channel: OmniChannel, payload: any, headers?: Record<string, string>): Promise<{ processed: number; errors: number }> {
    const channelId = this.channelsByType.get(channel);
    if (!channelId) return { processed: 0, errors: 1 };

    const { adapter, config } = this.channels.get(channelId)!;

    const signature = headers?.['x-hub-signature-256'] || headers?.['x-twilio-signature'] || '';
    if (!adapter.validateWebhookSignature(payload, signature, headers)) {
      this.ctx.logger.warn(`[Omnichannel] Invalid webhook signature for ${channel}`);
      return { processed: 0, errors: 1 };
    }

    const result = adapter.parseInboundWebhook(payload, headers);
    if (!result.success) {
      this.ctx.bus.emit('omni:channel-error', { channel, error: result.error || 'Parse failed', tenantId: config.tenantId } as any);
      return { processed: 0, errors: 1 };
    }

    let processed = 0, errors = 0;

    for (const rawMsg of result.messages) {
      try {
        await this.handleInboundMessage(rawMsg, config);
        processed++;
      } catch (err: any) {
        this.ctx.logger.error(`[Omnichannel] Error processing inbound: ${err.message}`);
        errors++;
      }
    }

    if (result.statusUpdates) {
      for (const update of result.statusUpdates) {
        this.updateMessageStatus(update.channelMessageId, update.status, update.timestamp);
      }
    }

    return { processed, errors };
  }

  private async handleInboundMessage(
    rawMsg: Omit<OmniMessage, 'id' | 'conversationId' | 'tenantId' | 'createdAt'>,
    config: ChannelConfig & { id: string },
  ): Promise<void> {
    const customerKey = `${rawMsg.senderId}:${rawMsg.channel}`;
    let conversationId = this.customerConversations.get(customerKey);
    let conversation: OmniConversation | undefined;
    let isNewConversation = false;

    if (conversationId) {
      conversation = this.conversations.get(conversationId);
      if (conversation && (conversation.status === 'CLOSED' || conversation.status === 'RESOLVED')) {
        conversationId = undefined;
        conversation = undefined;
      }
    }

    if (!conversationId || !conversation) {
      conversation = this.createConversation(rawMsg, config);
      conversationId = conversation.id;
      this.customerConversations.set(customerKey, conversationId);
      isNewConversation = true;
    }

    const message: OmniMessage = {
      ...rawMsg,
      id: uuidv4(),
      conversationId,
      tenantId: config.tenantId,
      createdAt: new Date(),
    };

    if (!this.messages.has(conversationId)) this.messages.set(conversationId, []);
    this.messages.get(conversationId)!.push(message);

    conversation.messageCount++;
    conversation.unreadCount++;
    conversation.lastMessagePreview = message.text?.slice(0, 100) || `[${message.type}]`;
    conversation.lastMessageAt = message.createdAt;
    conversation.updatedAt = new Date();
    if (conversation.status === 'WAITING_CUSTOMER') conversation.status = 'WAITING_AGENT';

    this.ctx.bus.emit('omni:message-received', {
      conversationId, messageId: message.id, channel: message.channel,
      senderId: message.senderId, tenantId: config.tenantId,
    } as any);

    if (isNewConversation) {
      await this.routeToQueue(conversation, config);
      if (config.autoResponse?.enabled) {
        setTimeout(() => this.sendAutoResponse(conversation!, config), (config.autoResponse.delaySeconds || 1) * 1000);
      }
    }
  }

  private createConversation(rawMsg: any, config: ChannelConfig & { id: string }): OmniConversation {
    const conv: OmniConversation = {
      id: uuidv4(),
      channel: rawMsg.channel,
      customerId: rawMsg.senderId,
      customerName: rawMsg.senderName,
      customerAddress: rawMsg.senderId,
      status: 'QUEUED',
      priority: config.defaultPriority || 'NORMAL',
      subject: rawMsg.emailFields?.subject,
      tags: [],
      messageCount: 0,
      unreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: config.tenantId,
    };

    if (rawMsg.channel === 'EMAIL') {
      conv.customerEmail = rawMsg.senderId;
      conv.customerName = rawMsg.senderName || rawMsg.senderId;
    } else if (rawMsg.channel === 'SMS' || rawMsg.channel === 'WHATSAPP') {
      conv.customerPhone = rawMsg.senderId;
    }

    this.conversations.set(conv.id, conv);
    this.ctx.bus.emit('omni:conversation-created', {
      conversationId: conv.id, channel: conv.channel,
      customerId: conv.customerId, tenantId: conv.tenantId,
    } as any);

    return conv;
  }

  private async routeToQueue(conv: OmniConversation, config: ChannelConfig): Promise<void> {
    this.ctx.bus.emit('omni:route-to-queue', {
      conversationId: conv.id,
      queueId: config.defaultQueueId,
      caller: {
        identifier: conv.customerAddress,
        displayName: conv.customerName || conv.customerAddress,
        crmContactId: conv.crmContactId,
        channel: conv.channel,
        context: { conversationId: conv.id, subject: conv.subject, channel: conv.channel },
      },
      priority: conv.priority,
      interactionId: conv.id,
      tags: [`channel:${conv.channel}`, ...conv.tags],
      tenantId: conv.tenantId,
    } as any);

    if (conv.customerPhone) {
      this.ctx.bus.emit('crm:screen-pop-requested', { lookupKey: conv.customerPhone, lookupType: 'PHONE', agentId: '', tenantId: conv.tenantId } as any);
    } else if (conv.customerEmail) {
      this.ctx.bus.emit('crm:screen-pop-requested', { lookupKey: conv.customerEmail, lookupType: 'EMAIL', agentId: '', tenantId: conv.tenantId } as any);
    }
  }

  private async sendAutoResponse(conv: OmniConversation, config: ChannelConfig): Promise<void> {
    if (!config.autoResponse?.message) return;
    await this.sendReply(conv.id, { text: config.autoResponse.message, isAutomated: true });
  }

  // ─── Outbound (Agent Reply) ───────────────────────────────────────

  async sendReply(conversationId: string, options: {
    text?: string; html?: string; media?: MessageMedia[];
    interactive?: MessageInteractive; emailFields?: Partial<EmailFields>;
    agentUserId?: string; agentName?: string; isAutomated?: boolean;
  }): Promise<OmniMessage | null> {
    const conv = this.conversations.get(conversationId);
    if (!conv) return null;

    const channelId = this.channelsByType.get(conv.channel);
    if (!channelId) return null;
    const { adapter, config } = this.channels.get(channelId)!;

    const outbound: OutboundMessage = {
      recipientId: conv.customerAddress,
      text: options.text,
      html: options.html,
      media: options.media,
      interactive: options.interactive,
    };

    // Email threading
    if (conv.channel === 'EMAIL' && options.emailFields) {
      const msgs = this.messages.get(conversationId) || [];
      const lastInbound = [...msgs].reverse().find(m => m.direction === 'INBOUND');
      outbound.emailFields = {
        subject: options.emailFields.subject || `Re: ${conv.subject || 'Your inquiry'}`,
        from: (config.credentials as any)?.fromAddress || '',
        to: [conv.customerAddress],
        cc: options.emailFields.cc,
        inReplyTo: lastInbound?.channelMessageId,
        references: lastInbound?.emailFields?.references,
      };
    }

    try {
      const result = await adapter.sendMessage(outbound);

      const message: OmniMessage = {
        id: uuidv4(),
        conversationId,
        channel: conv.channel,
        direction: 'OUTBOUND',
        status: result.status,
        type: options.media?.length ? 'MEDIA' : 'TEXT',
        senderId: options.agentUserId || 'system',
        senderName: options.agentName || 'Agent',
        recipientId: conv.customerAddress,
        text: options.text,
        html: options.html,
        media: options.media,
        interactive: options.interactive,
        emailFields: outbound.emailFields as any,
        channelMessageId: result.channelMessageId,
        agentUserId: options.agentUserId,
        agentName: options.agentName,
        isAutomated: options.isAutomated || false,
        createdAt: new Date(),
        sentAt: new Date(),
        tenantId: conv.tenantId,
      };

      if (!this.messages.has(conversationId)) this.messages.set(conversationId, []);
      this.messages.get(conversationId)!.push(message);

      conv.messageCount++;
      conv.lastMessagePreview = message.text?.slice(0, 100) || `[${message.type}]`;
      conv.lastMessageAt = message.createdAt;
      conv.updatedAt = new Date();

      if (conv.status === 'WAITING_AGENT' && !options.isAutomated) {
        conv.status = 'WAITING_CUSTOMER';
        if (!conv.firstResponseAt) {
          conv.firstResponseAt = new Date();
          conv.firstResponseTimeSeconds = (conv.firstResponseAt.getTime() - conv.createdAt.getTime()) / 1000;
        }
      }

      this.ctx.bus.emit('omni:message-sent', {
        conversationId, messageId: message.id, channel: conv.channel,
        agentId: options.agentUserId || 'system', tenantId: conv.tenantId,
      } as any);

      return message;
    } catch (err: any) {
      this.ctx.bus.emit('omni:message-failed', {
        conversationId, messageId: '', channel: conv.channel,
        error: err.message, tenantId: conv.tenantId,
      } as any);
      return null;
    }
  }

  // ─── Conversation Lifecycle ───────────────────────────────────────

  assignConversation(conversationId: string, agentId: string, agentName?: string): boolean {
    const conv = this.conversations.get(conversationId);
    if (!conv) return false;

    conv.assignedAgentId = agentId;
    conv.assignedAgentName = agentName;
    conv.status = 'ACTIVE';
    conv.updatedAt = new Date();

    if (!this.agentAssignments.has(agentId)) this.agentAssignments.set(agentId, new Set());
    this.agentAssignments.get(agentId)!.add(conversationId);

    this.ctx.bus.emit('omni:conversation-assigned', {
      conversationId, agentId, channel: conv.channel, tenantId: conv.tenantId,
    } as any);
    return true;
  }

  transferConversation(conversationId: string, fromAgentId: string, toAgentId?: string, toQueueId?: string): boolean {
    const conv = this.conversations.get(conversationId);
    if (!conv) return false;

    this.agentAssignments.get(fromAgentId)?.delete(conversationId);

    if (toAgentId) {
      this.assignConversation(conversationId, toAgentId);
    } else {
      conv.assignedAgentId = undefined;
      conv.assignedAgentName = undefined;
      conv.status = 'QUEUED';
      conv.queueId = toQueueId || conv.queueId;
    }

    this.ctx.bus.emit('omni:conversation-transferred', {
      conversationId, fromAgentId, toAgentId, toQueueId, tenantId: conv.tenantId,
    } as any);
    return true;
  }

  resolveConversation(conversationId: string, disposition?: string, notes?: string): boolean {
    const conv = this.conversations.get(conversationId);
    if (!conv) return false;

    conv.status = 'RESOLVED';
    conv.disposition = disposition;
    conv.resolutionNotes = notes;
    conv.resolvedAt = new Date();
    conv.updatedAt = new Date();

    const handleTime = (conv.resolvedAt.getTime() - conv.createdAt.getTime()) / 1000;

    if (conv.assignedAgentId) this.agentAssignments.get(conv.assignedAgentId)?.delete(conversationId);

    this.ctx.bus.emit('omni:conversation-resolved', {
      conversationId, agentId: conv.assignedAgentId || '',
      handleTimeSeconds: Math.round(handleTime),
      messageCount: conv.messageCount, tenantId: conv.tenantId,
    } as any);
    return true;
  }

  closeConversation(conversationId: string, reason: string = 'manual'): boolean {
    const conv = this.conversations.get(conversationId);
    if (!conv) return false;

    conv.status = 'CLOSED';
    conv.closedAt = new Date();
    conv.updatedAt = new Date();

    const customerKey = `${conv.customerId}:${conv.channel}`;
    this.customerConversations.delete(customerKey);
    if (conv.assignedAgentId) this.agentAssignments.get(conv.assignedAgentId)?.delete(conversationId);

    this.ctx.bus.emit('omni:conversation-closed', { conversationId, reason, tenantId: conv.tenantId } as any);
    return true;
  }

  // ─── Message Status Updates ───────────────────────────────────────

  private updateMessageStatus(channelMessageId: string, status: MessageStatus, timestamp: Date): void {
    for (const msgs of this.messages.values()) {
      const msg = msgs.find(m => m.channelMessageId === channelMessageId);
      if (msg) {
        msg.status = status;
        if (status === 'DELIVERED') msg.deliveredAt = timestamp;
        if (status === 'READ') msg.readAt = timestamp;
        if (status === 'FAILED') msg.failedAt = timestamp;

        const eventName = status === 'DELIVERED' ? 'omni:message-delivered'
          : status === 'READ' ? 'omni:message-read' : null;
        if (eventName) {
          this.ctx.bus.emit(eventName, {
            conversationId: msg.conversationId, messageId: msg.id,
            channel: msg.channel, tenantId: msg.tenantId,
          } as any);
        }
        break;
      }
    }
  }

  // ─── Agent Desktop State ──────────────────────────────────────────

  getAgentDesktop(agentId: string): AgentDesktopState {
    const assignedIds = this.agentAssignments.get(agentId) || new Set();
    const slots: AgentConversationSlot[] = [];
    let totalUnread = 0;

    for (const convId of assignedIds) {
      const conv = this.conversations.get(convId);
      if (!conv || conv.status === 'CLOSED') continue;

      const waitingSeconds = conv.lastMessageAt ? (Date.now() - conv.lastMessageAt.getTime()) / 1000 : 0;
      slots.push({
        conversationId: conv.id,
        channel: conv.channel,
        customerName: conv.customerName || conv.customerAddress,
        status: conv.status,
        unreadCount: conv.unreadCount,
        lastMessageAt: conv.lastMessageAt,
        waitingSeconds: Math.round(waitingSeconds),
        needsAttention: conv.status === 'WAITING_AGENT' || conv.status === 'ACTIVE',
      });
      totalUnread += conv.unreadCount;
    }

    slots.sort((a, b) => {
      if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
      return (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0);
    });

    return { agentId, activeConversations: slots, maxConcurrent: 5, availableSlots: Math.max(0, 5 - slots.length), totalUnread };
  }

  // ─── SLA Monitoring ───────────────────────────────────────────────

  private checkSlaBreach(): void {
    const now = Date.now();
    for (const conv of this.conversations.values()) {
      if (conv.status !== 'WAITING_AGENT' && conv.status !== 'ACTIVE') continue;

      const msgs = this.messages.get(conv.id) || [];
      const lastCustomerMsg = [...msgs].reverse().find(m => m.direction === 'INBOUND');
      const lastAgentMsg = [...msgs].reverse().find(m => m.direction === 'OUTBOUND' && !m.isAutomated);

      if (lastCustomerMsg && (!lastAgentMsg || lastAgentMsg.createdAt < lastCustomerMsg.createdAt)) {
        const waitingSeconds = (now - lastCustomerMsg.createdAt.getTime()) / 1000;
        if (waitingSeconds > this.slaWarningSeconds) {
          this.ctx.bus.emit('omni:sla-warning', {
            conversationId: conv.id, waitingSeconds: Math.round(waitingSeconds),
            threshold: this.slaWarningSeconds, tenantId: conv.tenantId,
          } as any);
        }
      }
    }
  }

  // ─── Query Methods ────────────────────────────────────────────────

  listConversations(options?: {
    status?: ConversationStatus; channel?: OmniChannel; agentId?: string;
    priority?: ConversationPriority; offset?: number; limit?: number;
  }): { total: number; conversations: OmniConversation[] } {
    let convs = [...this.conversations.values()];
    if (options?.status) convs = convs.filter(c => c.status === options.status);
    if (options?.channel) convs = convs.filter(c => c.channel === options.channel);
    if (options?.agentId) convs = convs.filter(c => c.assignedAgentId === options.agentId);
    if (options?.priority) convs = convs.filter(c => c.priority === options.priority);
    convs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    return { total: convs.length, conversations: convs.slice(offset, offset + limit) };
  }

  getConversation(id: string): OmniConversation | undefined { return this.conversations.get(id); }

  getMessages(conversationId: string, opts?: { offset?: number; limit?: number }): OmniMessage[] {
    const msgs = this.messages.get(conversationId) || [];
    return msgs.slice(opts?.offset || 0, (opts?.offset || 0) + (opts?.limit || 50));
  }

  // ─── REST Router ──────────────────────────────────────────────────

  private createRouter(): Router {
    const r = Router();

    // ── Channel Management ─────────────────────────────────────────
    r.post('/channels', async (req: Request, res: Response) => {
      try {
        const result = await this.configureChannel(req.body);
        res.status(result.connected ? 201 : 400).json(result);
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });

    r.get('/channels', (_req: Request, res: Response) => {
      const channels = [...this.channels.values()].map(({ config }) => ({
        id: config.id, channel: config.channel, isActive: config.isActive,
        tenantId: config.tenantId, defaultQueueId: config.defaultQueueId,
      }));
      res.json({ channels });
    });

    r.put('/channels/:id', async (req: Request, res: Response) => {
      const existing = this.channels.get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Channel not found' });
      await existing.adapter.shutdown();
      this.channels.delete(req.params.id);
      const result = await this.configureChannel({ ...existing.config, ...req.body, id: req.params.id });
      res.json(result);
    });

    r.delete('/channels/:id', async (req: Request, res: Response) => {
      const ch = this.channels.get(req.params.id);
      if (!ch) return res.status(404).json({ error: 'Channel not found' });
      await ch.adapter.shutdown();
      this.channels.delete(req.params.id);
      this.channelsByType.delete(ch.config.channel);
      res.json({ removed: true });
    });

    r.post('/channels/:id/test', async (req: Request, res: Response) => {
      const ch = this.channels.get(req.params.id);
      if (!ch) return res.status(404).json({ error: 'Channel not found' });
      const result = await ch.adapter.testConnection();
      res.json(result);
    });

    // ── Webhooks ───────────────────────────────────────────────────
    r.post('/webhooks/whatsapp', async (req: Request, res: Response) => {
      const result = await this.processInboundWebhook('WHATSAPP', req.body, req.headers as any);
      res.json(result);
    });

    r.get('/webhooks/whatsapp', (req: Request, res: Response) => {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      const chId = this.channelsByType.get('WHATSAPP');
      if (chId) {
        const creds = this.channels.get(chId)?.config.credentials as any;
        if (mode === 'subscribe' && token === creds?.webhookVerifyToken) return res.status(200).send(challenge);
      }
      res.status(403).send('Forbidden');
    });

    r.post('/webhooks/sms', async (req: Request, res: Response) => {
      await this.processInboundWebhook('SMS', req.body, req.headers as any);
      res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    });

    r.post('/webhooks/email', async (req: Request, res: Response) => {
      const result = await this.processInboundWebhook('EMAIL', req.body, req.headers as any);
      res.json(result);
    });

    r.post('/webhooks/webchat', async (req: Request, res: Response) => {
      const result = await this.processInboundWebhook('WEB_CHAT', req.body, req.headers as any);
      res.json(result);
    });

    // ── Conversations ──────────────────────────────────────────────
    r.get('/conversations', (req: Request, res: Response) => {
      const result = this.listConversations({
        status: req.query.status as any, channel: req.query.channel as any,
        agentId: req.query.agentId as string, priority: req.query.priority as any,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      });
      res.json(result);
    });

    r.get('/conversations/:id', (req: Request, res: Response) => {
      const conv = this.getConversation(req.params.id);
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });
      res.json(conv);
    });

    r.get('/conversations/:id/messages', (req: Request, res: Response) => {
      const messages = this.getMessages(req.params.id, {
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      });
      res.json({ conversationId: req.params.id, messages, total: messages.length });
    });

    r.post('/conversations/:id/reply', async (req: Request, res: Response) => {
      const { text, html, media, interactive, emailFields, agentUserId, agentName } = req.body;
      const msg = await this.sendReply(req.params.id, { text, html, media, interactive, emailFields, agentUserId, agentName });
      if (!msg) return res.status(400).json({ error: 'Failed to send reply' });
      res.json(msg);
    });

    r.post('/conversations/:id/note', (req: Request, res: Response) => {
      const { agentId, agentName, text } = req.body;
      if (!agentId || !text) return res.status(400).json({ error: 'agentId and text required' });
      if (!this.internalNotes.has(req.params.id)) this.internalNotes.set(req.params.id, []);
      const note: InternalNote = { id: uuidv4(), agentId, agentName, text, createdAt: new Date() };
      this.internalNotes.get(req.params.id)!.push(note);
      res.status(201).json(note);
    });

    r.get('/conversations/:id/notes', (req: Request, res: Response) => {
      res.json({ notes: this.internalNotes.get(req.params.id) || [] });
    });

    r.post('/conversations/:id/assign', (req: Request, res: Response) => {
      const { agentId, agentName } = req.body;
      if (!agentId) return res.status(400).json({ error: 'agentId required' });
      if (!this.assignConversation(req.params.id, agentId, agentName)) return res.status(404).json({ error: 'Conversation not found' });
      res.json({ assigned: true });
    });

    r.post('/conversations/:id/transfer', (req: Request, res: Response) => {
      const { fromAgentId, toAgentId, toQueueId } = req.body;
      if (!fromAgentId) return res.status(400).json({ error: 'fromAgentId required' });
      if (!this.transferConversation(req.params.id, fromAgentId, toAgentId, toQueueId)) return res.status(404).json({ error: 'Conversation not found' });
      res.json({ transferred: true });
    });

    r.post('/conversations/:id/resolve', (req: Request, res: Response) => {
      const { disposition, notes } = req.body;
      if (!this.resolveConversation(req.params.id, disposition, notes)) return res.status(404).json({ error: 'Conversation not found' });
      res.json({ resolved: true });
    });

    r.post('/conversations/:id/close', (req: Request, res: Response) => {
      const { reason } = req.body;
      if (!this.closeConversation(req.params.id, reason)) return res.status(404).json({ error: 'Conversation not found' });
      res.json({ closed: true });
    });

    r.put('/conversations/:id/priority', (req: Request, res: Response) => {
      const conv = this.conversations.get(req.params.id);
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });
      conv.priority = req.body.priority;
      conv.updatedAt = new Date();
      res.json({ priority: conv.priority });
    });

    r.put('/conversations/:id/tags', (req: Request, res: Response) => {
      const conv = this.conversations.get(req.params.id);
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });
      conv.tags = req.body.tags || [];
      conv.updatedAt = new Date();
      res.json({ tags: conv.tags });
    });

    // ── Agent Desktop ──────────────────────────────────────────────
    r.get('/desktop/:agentId', (req: Request, res: Response) => {
      res.json(this.getAgentDesktop(req.params.agentId));
    });

    r.get('/desktop/:agentId/unread', (req: Request, res: Response) => {
      const desktop = this.getAgentDesktop(req.params.agentId);
      res.json({ agentId: req.params.agentId, totalUnread: desktop.totalUnread });
    });

    // ── Template Messages ──────────────────────────────────────────
    r.post('/templates/send', async (req: Request, res: Response) => {
      const { channel, recipientId, template, conversationId } = req.body;
      if (!channel || !recipientId || !template) return res.status(400).json({ error: 'channel, recipientId, and template required' });

      const channelId = this.channelsByType.get(channel);
      if (!channelId) return res.status(400).json({ error: `Channel ${channel} not configured` });

      const { adapter } = this.channels.get(channelId)!;
      if (!adapter.sendTemplate) return res.status(400).json({ error: `Channel ${channel} does not support templates` });

      try {
        const result = await adapter.sendTemplate(recipientId, template);
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    return r;
  }
}

export default OmnichannelInboxPlugin;
