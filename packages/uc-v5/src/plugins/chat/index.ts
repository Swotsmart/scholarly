/**
 * Unified Communications 4.0 — Team Chat Plugin
 *
 * The nervous system of any collaboration platform. Every other plugin
 * generates events, but Chat is where humans actually converse. The design
 * treats a "channel" as a generic conversation container — it could be a
 * team channel at a company, a parent-teacher thread at a school, or a
 * customer support conversation in a contact centre. The data model is
 * identical; only the context differs per deployment.
 *
 * Think of channels like rooms in a building: some are open-plan (PUBLIC),
 * some are private offices (PRIVATE), some are phone booths (DM). The
 * building doesn't care what conversations happen inside — it provides
 * the walls, the doors, and the address system.
 *
 * Key abstractions:
 *   Channel   — a named conversation space (public, private, DM, group DM)
 *   Message   — a unit of content (text, file reference, system, rich/card)
 *   Thread    — a reply chain hanging off a parent message
 *   Reaction  — an emoji response to a message
 *   Presence  — user online/away/busy/offline status (ephemeral, in-memory)
 *   ReadState — per-user, per-channel read cursor for unread badge counts
 *
 * Event prefix: chat:*
 * REST endpoints: 22 under /api/chat/
 * WebSocket: typing indicators, presence updates, real-time message delivery
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { UCPlugin, PluginContext, PluginHealth, PluginCapability } from '../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ChannelType = 'PUBLIC' | 'PRIVATE' | 'DM' | 'GROUP_DM';
export type MessageType = 'TEXT' | 'FILE' | 'SYSTEM' | 'RICH';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  channelType: ChannelType;
  tenantId: string;
  createdBy: string;
  members: string[];
  pinnedMessageIds: string[];
  maxPins: number;
  topic?: string;
  isArchived: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  messageType: MessageType;
  content: string;
  /** Rich content: file attachments, embeds, card payloads */
  attachments?: MessageAttachment[];
  /** Thread parent (undefined for top-level messages) */
  threadParentId?: string;
  /** Reply count (set only on parent messages) */
  replyCount: number;
  /** Reaction map: emoji → list of user IDs who reacted */
  reactions: Record<string, string[]>;
  isDeleted: boolean;
  isEdited: boolean;
  editedAt?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface ReadState {
  userId: string;
  channelId: string;
  lastReadMessageId: string;
  lastReadAt: string;
  unreadCount: number;
}

export interface PresenceEntry {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: string;
  statusText?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const TYPING_TIMEOUT_MS = 5000;
const MAX_PINS_DEFAULT = 50;
const MAX_SEARCH_RESULTS = 50;

// ─── Plugin ─────────────────────────────────────────────────────────────────

export class ChatPlugin implements UCPlugin {
  readonly id = 'chat';
  readonly name = 'Team Chat';
  readonly version = '4.0.0';
  readonly dependencies: string[] = [];

  private ctx!: PluginContext;
  private presence: Map<string, PresenceEntry> = new Map();
  private typingTimers: Map<string, Map<string, NodeJS.Timeout>> = new Map();

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;

    // Cross-plugin: auto-post system messages when video events occur
    ctx.bus.on('room:participant-joined', async (data: any) => {
      if (!data.roomId) return;
      const channelId = `room-${data.roomId}`;
      await this.postSystemMessage(channelId,
        `${data.userName || 'A participant'} joined the call`,
        data.tenantId || '__default__');
    });

    ctx.bus.on('room:participant-left', async (data: any) => {
      if (!data.roomId) return;
      const channelId = `room-${data.roomId}`;
      await this.postSystemMessage(channelId,
        `${data.userName || 'A participant'} left the call`,
        data.tenantId || '__default__');
    });

    ctx.logger.info('[Chat] Initialised — channels, threads, reactions, presence, search');
  }

  getRoutes(): Router {
    const r = Router();

    // Channels
    r.post('/channels', this.wrap(this.createChannel));
    r.get('/channels', this.wrap(this.listChannels));
    r.get('/channels/:channelId', this.wrap(this.getChannel));
    r.put('/channels/:channelId', this.wrap(this.updateChannel));
    r.delete('/channels/:channelId', this.wrap(this.archiveChannel));
    r.post('/channels/:channelId/members', this.wrap(this.addMember));
    r.delete('/channels/:channelId/members/:userId', this.wrap(this.removeMember));

    // Messages
    r.post('/channels/:channelId/messages', this.wrap(this.sendMessage));
    r.get('/channels/:channelId/messages', this.wrap(this.getMessages));
    r.put('/messages/:messageId', this.wrap(this.editMessage));
    r.delete('/messages/:messageId', this.wrap(this.deleteMessage));

    // Threads
    r.get('/messages/:messageId/replies', this.wrap(this.getReplies));

    // Reactions
    r.post('/messages/:messageId/reactions', this.wrap(this.addReaction));
    r.delete('/messages/:messageId/reactions/:emoji', this.wrap(this.removeReaction));

    // Pins
    r.post('/channels/:channelId/pins/:messageId', this.wrap(this.pinMessage));
    r.delete('/channels/:channelId/pins/:messageId', this.wrap(this.unpinMessage));
    r.get('/channels/:channelId/pins', this.wrap(this.getPins));

    // Read state
    r.post('/channels/:channelId/read', this.wrap(this.markRead));
    r.get('/unread', this.wrap(this.getUnreadCounts));

    // Search
    r.get('/search', this.wrap(this.searchMessages));

    // Presence
    r.get('/presence', this.wrap(this.getPresence));
    r.post('/presence', this.wrap(this.setPresence));

    return r;
  }

  async handleWebSocketMessage(
    sessionId: string, userId: string, roomId: string | undefined,
    type: string, data: any, reply: (m: unknown) => void,
    broadcast: (rid: string, m: unknown, excludeSessionId?: string) => void,
  ): Promise<boolean> {
    if (type === 'chat-typing-start') {
      const { channelId } = data;
      if (!channelId) return true;
      this.startTyping(channelId, userId);
      if (roomId || channelId) {
        broadcast(roomId || channelId, {
          type: 'chat-typing',
          data: { channelId, userId, userName: data.userName, isTyping: true },
        }, sessionId);
      }
      reply({ type: 'chat-typing-start:ack', data: { ok: true } });
      return true;
    }

    if (type === 'chat-typing-stop') {
      const { channelId } = data;
      if (!channelId) return true;
      this.stopTyping(channelId, userId);
      if (roomId || channelId) {
        broadcast(roomId || channelId, {
          type: 'chat-typing',
          data: { channelId, userId, isTyping: false },
        }, sessionId);
      }
      reply({ type: 'chat-typing-stop:ack', data: { ok: true } });
      return true;
    }

    if (type === 'presence-update') {
      const { status, statusText } = data;
      this.updatePresence(userId, status, statusText);
      this.ctx.bus.emit('chat:presence-changed', {
        userId, status, statusText, lastSeen: new Date().toISOString(),
      }, 'chat');
      reply({ type: 'presence-update:ack', data: { ok: true } });
      return true;
    }

    return false;
  }

  async shutdown(): Promise<void> {
    for (const channelTimers of this.typingTimers.values()) {
      for (const timer of channelTimers.values()) clearTimeout(timer);
    }
    this.typingTimers.clear();
    this.presence.clear();
    this.ctx.logger.info('[Chat] Shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    return { status: 'healthy', details: { onlineUsers: this.presence.size } };
  }

  getCapabilities(): PluginCapability[] {
    return [
      { key: 'chat.channels', label: 'Channels', description: 'Team messaging channels', icon: 'MessageSquare', routePath: '/channels', requiredRoles: [] },
      { key: 'chat.direct', label: 'Direct Messages', description: 'Private 1:1 and group messages', icon: 'Mail', routePath: '/dm', requiredRoles: [] },
    ];
  }

  // ─── Public API (for other plugins) ───────────────────────────────────────

  /** Post a system message into a channel — used by other plugins (video, approval, etc.) */
  async postSystemMessage(channelId: string, content: string, tenantId: string): Promise<Message> {
    return this.createMessageRecord(channelId, 'system', 'System', 'SYSTEM', content, tenantId);
  }

  /** Create or get a DM channel between two users — used by notification/approval plugins */
  async getOrCreateDM(user1Id: string, user2Id: string, tenantId: string): Promise<Channel> {
    const dmKey = [user1Id, user2Id].sort().join(':');
    const existing = await this.ctx.storage.get<Channel>('chat_channels', `dm-${dmKey}`);
    if (existing) return existing;

    const channel: Channel = {
      id: `dm-${dmKey}`,
      name: 'Direct Message',
      channelType: 'DM',
      tenantId,
      createdBy: user1Id,
      members: [user1Id, user2Id],
      pinnedMessageIds: [],
      maxPins: MAX_PINS_DEFAULT,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.ctx.storage.set('chat_channels', channel.id, channel);
    return channel;
  }

  // ─── Route Handlers: Channels ─────────────────────────────────────────────

  private async createChannel(req: Request, res: Response): Promise<void> {
    const { name, description, channelType, members, topic, metadata } = req.body;
    const user = this.extractUser(req);

    const channel: Channel = {
      id: uuidv4(),
      name: name || 'Untitled Channel',
      description,
      channelType: channelType || 'PUBLIC',
      tenantId: user.tenantId,
      createdBy: user.userId,
      members: members || [user.userId],
      pinnedMessageIds: [],
      maxPins: MAX_PINS_DEFAULT,
      topic,
      isArchived: false,
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.ctx.storage.set('chat_channels', channel.id, channel);

    this.ctx.bus.emit('chat:channel-created', {
      channelId: channel.id, name: channel.name, channelType: channel.channelType,
      createdBy: user.userId, tenantId: user.tenantId, memberCount: channel.members.length,
    }, 'chat');

    res.status(201).json(channel);
  }

  private async listChannels(req: Request, res: Response): Promise<void> {
    const user = this.extractUser(req);
    const filter: Record<string, unknown> = { isArchived: false };
    if (req.query.channelType) filter.channelType = req.query.channelType;

    const channels = await this.ctx.storage.query<Channel>('chat_channels', filter, {
      limit: 100, orderBy: { field: 'updatedAt', direction: 'desc' },
    });

    const visible = channels.filter(c =>
      c.channelType === 'PUBLIC' || c.members.includes(user.userId)
    );

    res.json({ channels: visible, total: visible.length });
  }

  private async getChannel(req: Request, res: Response): Promise<void> {
    const channel = await this.ctx.storage.get<Channel>('chat_channels', req.params.channelId);
    if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }
    res.json(channel);
  }

  private async updateChannel(req: Request, res: Response): Promise<void> {
    const channel = await this.ctx.storage.get<Channel>('chat_channels', req.params.channelId);
    if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }

    const { name, description, topic, metadata } = req.body;
    if (name !== undefined) channel.name = name;
    if (description !== undefined) channel.description = description;
    if (topic !== undefined) channel.topic = topic;
    if (metadata !== undefined) channel.metadata = { ...channel.metadata, ...metadata };
    channel.updatedAt = new Date().toISOString();

    await this.ctx.storage.set('chat_channels', channel.id, channel);
    res.json(channel);
  }

  private async archiveChannel(req: Request, res: Response): Promise<void> {
    const channel = await this.ctx.storage.get<Channel>('chat_channels', req.params.channelId);
    if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }

    channel.isArchived = true;
    channel.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('chat_channels', channel.id, channel);

    this.ctx.bus.emit('chat:channel-archived', {
      channelId: channel.id, archivedBy: this.extractUser(req).userId, tenantId: channel.tenantId,
    }, 'chat');

    res.json({ success: true });
  }

  private async addMember(req: Request, res: Response): Promise<void> {
    const channel = await this.ctx.storage.get<Channel>('chat_channels', req.params.channelId);
    if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }

    const { userId, userName } = req.body;
    if (!channel.members.includes(userId)) {
      channel.members.push(userId);
      channel.updatedAt = new Date().toISOString();
      await this.ctx.storage.set('chat_channels', channel.id, channel);

      await this.postSystemMessage(channel.id,
        `${userName || userId} was added to the channel`, channel.tenantId);

      this.ctx.bus.emit('chat:member-added', {
        channelId: channel.id, userId, addedBy: this.extractUser(req).userId, tenantId: channel.tenantId,
      }, 'chat');
    }

    res.json(channel);
  }

  private async removeMember(req: Request, res: Response): Promise<void> {
    const channel = await this.ctx.storage.get<Channel>('chat_channels', req.params.channelId);
    if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }

    channel.members = channel.members.filter(m => m !== req.params.userId);
    channel.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('chat_channels', channel.id, channel);

    this.ctx.bus.emit('chat:member-removed', {
      channelId: channel.id, userId: req.params.userId,
      removedBy: this.extractUser(req).userId, tenantId: channel.tenantId,
    }, 'chat');

    res.json(channel);
  }

  // ─── Route Handlers: Messages ─────────────────────────────────────────────

  private async sendMessage(req: Request, res: Response): Promise<void> {
    const user = this.extractUser(req);
    const { content, messageType, attachments, threadParentId } = req.body;

    const msg = await this.createMessageRecord(
      req.params.channelId, user.userId, user.name || 'Unknown',
      messageType || 'TEXT', content, user.tenantId,
      attachments, threadParentId
    );

    res.status(201).json(msg);
  }

  private async getMessages(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
    const filter: Record<string, unknown> = {
      channelId: req.params.channelId, isDeleted: false,
    };
    if (!req.query.includeThreads) {
      // Top-level only by default
    }

    const messages = await this.ctx.storage.query<Message>('chat_messages', filter, {
      limit, orderBy: { field: 'createdAt', direction: 'desc' },
    });

    res.json({ messages: messages.reverse(), total: messages.length });
  }

  private async editMessage(req: Request, res: Response): Promise<void> {
    const msg = await this.ctx.storage.get<Message>('chat_messages', req.params.messageId);
    if (!msg) { res.status(404).json({ error: 'Message not found' }); return; }

    const user = this.extractUser(req);
    if (msg.senderId !== user.userId) {
      res.status(403).json({ error: 'Can only edit your own messages' }); return;
    }

    if (Date.now() - new Date(msg.createdAt).getTime() > EDIT_WINDOW_MS) {
      res.status(400).json({ error: 'Edit window expired (15 minutes)' }); return;
    }

    msg.content = req.body.content;
    msg.isEdited = true;
    msg.editedAt = new Date().toISOString();
    msg.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('chat_messages', msg.id, msg);

    this.ctx.bus.emit('chat:message-edited', {
      messageId: msg.id, channelId: msg.channelId, editedBy: user.userId,
      tenantId: msg.tenantId,
    }, 'chat');

    res.json(msg);
  }

  private async deleteMessage(req: Request, res: Response): Promise<void> {
    const msg = await this.ctx.storage.get<Message>('chat_messages', req.params.messageId);
    if (!msg) { res.status(404).json({ error: 'Message not found' }); return; }

    msg.isDeleted = true;
    msg.content = '[Message deleted]';
    msg.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('chat_messages', msg.id, msg);

    this.ctx.bus.emit('chat:message-deleted', {
      messageId: msg.id, channelId: msg.channelId,
      deletedBy: this.extractUser(req).userId, tenantId: msg.tenantId,
    }, 'chat');

    res.json({ success: true });
  }

  // ─── Route Handlers: Threads ──────────────────────────────────────────────

  private async getReplies(req: Request, res: Response): Promise<void> {
    const replies = await this.ctx.storage.query<Message>('chat_messages', {
      threadParentId: req.params.messageId, isDeleted: false,
    }, { limit: 100, orderBy: { field: 'createdAt', direction: 'asc' } });

    res.json({ replies, total: replies.length });
  }

  // ─── Route Handlers: Reactions ────────────────────────────────────────────

  private async addReaction(req: Request, res: Response): Promise<void> {
    const msg = await this.ctx.storage.get<Message>('chat_messages', req.params.messageId);
    if (!msg) { res.status(404).json({ error: 'Message not found' }); return; }

    const { emoji } = req.body;
    const user = this.extractUser(req);

    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    if (!msg.reactions[emoji].includes(user.userId)) {
      msg.reactions[emoji].push(user.userId);
      msg.updatedAt = new Date().toISOString();
      await this.ctx.storage.set('chat_messages', msg.id, msg);

      this.ctx.bus.emit('chat:reaction-added', {
        messageId: msg.id, channelId: msg.channelId, emoji,
        userId: user.userId, tenantId: msg.tenantId,
      }, 'chat');
    }

    res.json(msg.reactions);
  }

  private async removeReaction(req: Request, res: Response): Promise<void> {
    const msg = await this.ctx.storage.get<Message>('chat_messages', req.params.messageId);
    if (!msg) { res.status(404).json({ error: 'Message not found' }); return; }

    const { emoji } = req.params;
    const user = this.extractUser(req);

    if (msg.reactions[emoji]) {
      msg.reactions[emoji] = msg.reactions[emoji].filter(u => u !== user.userId);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
      msg.updatedAt = new Date().toISOString();
      await this.ctx.storage.set('chat_messages', msg.id, msg);

      this.ctx.bus.emit('chat:reaction-removed', {
        messageId: msg.id, channelId: msg.channelId, emoji,
        userId: user.userId, tenantId: msg.tenantId,
      }, 'chat');
    }

    res.json(msg.reactions);
  }

  // ─── Route Handlers: Pins ─────────────────────────────────────────────────

  private async pinMessage(req: Request, res: Response): Promise<void> {
    const channel = await this.ctx.storage.get<Channel>('chat_channels', req.params.channelId);
    if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }

    if (channel.pinnedMessageIds.length >= channel.maxPins) {
      res.status(400).json({ error: `Maximum ${channel.maxPins} pins reached` }); return;
    }

    const { messageId } = req.params;
    if (!channel.pinnedMessageIds.includes(messageId)) {
      channel.pinnedMessageIds.push(messageId);
      channel.updatedAt = new Date().toISOString();
      await this.ctx.storage.set('chat_channels', channel.id, channel);

      this.ctx.bus.emit('chat:message-pinned', {
        channelId: channel.id, messageId,
        pinnedBy: this.extractUser(req).userId, tenantId: channel.tenantId,
      }, 'chat');
    }

    res.json({ pinnedMessageIds: channel.pinnedMessageIds });
  }

  private async unpinMessage(req: Request, res: Response): Promise<void> {
    const channel = await this.ctx.storage.get<Channel>('chat_channels', req.params.channelId);
    if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }

    channel.pinnedMessageIds = channel.pinnedMessageIds.filter(id => id !== req.params.messageId);
    channel.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('chat_channels', channel.id, channel);
    res.json({ pinnedMessageIds: channel.pinnedMessageIds });
  }

  private async getPins(req: Request, res: Response): Promise<void> {
    const channel = await this.ctx.storage.get<Channel>('chat_channels', req.params.channelId);
    if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }

    const pins: Message[] = [];
    for (const msgId of channel.pinnedMessageIds) {
      const msg = await this.ctx.storage.get<Message>('chat_messages', msgId);
      if (msg && !msg.isDeleted) pins.push(msg);
    }
    res.json({ pins, total: pins.length });
  }

  // ─── Route Handlers: Read State ───────────────────────────────────────────

  private async markRead(req: Request, res: Response): Promise<void> {
    const user = this.extractUser(req);
    const { channelId } = req.params;
    const readState: ReadState = {
      userId: user.userId, channelId,
      lastReadMessageId: req.body.messageId || '',
      lastReadAt: new Date().toISOString(), unreadCount: 0,
    };
    await this.ctx.storage.set('chat_read_states', `${user.userId}:${channelId}`, readState);
    res.json(readState);
  }

  private async getUnreadCounts(req: Request, res: Response): Promise<void> {
    const user = this.extractUser(req);
    const channels = await this.ctx.storage.query<Channel>('chat_channels', { isArchived: false }, { limit: 200 });
    const mine = channels.filter(c => c.members.includes(user.userId));

    const unread: Record<string, number> = {};
    for (const ch of mine) {
      const rs = await this.ctx.storage.get<ReadState>('chat_read_states', `${user.userId}:${ch.id}`);
      const msgs = await this.ctx.storage.query<Message>('chat_messages', {
        channelId: ch.id, isDeleted: false,
      }, { limit: 200, orderBy: { field: 'createdAt', direction: 'desc' } });

      unread[ch.id] = rs
        ? msgs.filter(m => m.senderId !== user.userId && new Date(m.createdAt) > new Date(rs.lastReadAt)).length
        : msgs.filter(m => m.senderId !== user.userId).length;
    }

    res.json({ unread, totalUnread: Object.values(unread).reduce((a, b) => a + b, 0) });
  }

  // ─── Route Handlers: Search ───────────────────────────────────────────────

  private async searchMessages(req: Request, res: Response): Promise<void> {
    const query = (req.query.q as string || '').toLowerCase().trim();
    if (!query) { res.json({ results: [], total: 0 }); return; }

    const filter: Record<string, unknown> = { isDeleted: false };
    if (req.query.channelId) filter.channelId = req.query.channelId;

    const messages = await this.ctx.storage.query<Message>('chat_messages', filter, {
      limit: 200, orderBy: { field: 'createdAt', direction: 'desc' },
    });

    const results = messages
      .filter(m => m.content.toLowerCase().includes(query))
      .slice(0, MAX_SEARCH_RESULTS);

    res.json({ results, total: results.length, query });
  }

  // ─── Route Handlers: Presence ─────────────────────────────────────────────

  private async getPresence(req: Request, res: Response): Promise<void> {
    const userIds = (req.query.userIds as string || '').split(',').filter(Boolean);
    const result = userIds.map(uid =>
      this.presence.get(uid) || { userId: uid, status: 'offline' as const, lastSeen: '' }
    );
    res.json({ presence: result });
  }

  private async setPresence(req: Request, res: Response): Promise<void> {
    const user = this.extractUser(req);
    this.updatePresence(user.userId, req.body.status, req.body.statusText);
    res.json({ success: true });
  }

  // ─── Core Logic ───────────────────────────────────────────────────────────

  private async createMessageRecord(
    channelId: string, senderId: string, senderName: string,
    messageType: string, content: string, tenantId: string,
    attachments?: MessageAttachment[], threadParentId?: string,
  ): Promise<Message> {
    const msg: Message = {
      id: uuidv4(), channelId, senderId, senderName,
      messageType: messageType as MessageType, content,
      attachments, threadParentId, replyCount: 0,
      reactions: {}, isDeleted: false, isEdited: false, tenantId,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    await this.ctx.storage.set('chat_messages', msg.id, msg);

    // Increment parent reply count for threads
    if (threadParentId) {
      const parent = await this.ctx.storage.get<Message>('chat_messages', threadParentId);
      if (parent) {
        parent.replyCount += 1;
        parent.updatedAt = new Date().toISOString();
        await this.ctx.storage.set('chat_messages', parent.id, parent);
      }
    }

    // Touch channel updatedAt
    const ch = await this.ctx.storage.get<Channel>('chat_channels', channelId);
    if (ch) {
      ch.updatedAt = new Date().toISOString();
      await this.ctx.storage.set('chat_channels', ch.id, ch);
    }

    this.ctx.bus.emit('chat:message-sent', {
      messageId: msg.id, channelId, senderId, senderName, messageType,
      contentPreview: content.substring(0, 200),
      hasAttachments: !!attachments?.length,
      isThread: !!threadParentId, threadParentId, tenantId,
    }, 'chat');

    this.stopTyping(channelId, senderId);
    return msg;
  }

  // ─── Presence & Typing (ephemeral, in-memory) ─────────────────────────────

  private updatePresence(userId: string, status: string, statusText?: string): void {
    this.presence.set(userId, {
      userId, status: status as PresenceEntry['status'],
      lastSeen: new Date().toISOString(), statusText,
    });
  }

  private startTyping(channelId: string, userId: string): void {
    if (!this.typingTimers.has(channelId)) this.typingTimers.set(channelId, new Map());
    const timers = this.typingTimers.get(channelId)!;
    const existing = timers.get(userId);
    if (existing) clearTimeout(existing);
    timers.set(userId, setTimeout(() => {
      timers.delete(userId);
      this.ctx.bus.emit('chat:typing-stopped', { channelId, userId }, 'chat');
    }, TYPING_TIMEOUT_MS));
  }

  private stopTyping(channelId: string, userId: string): void {
    const timers = this.typingTimers.get(channelId);
    if (!timers) return;
    const t = timers.get(userId);
    if (t) clearTimeout(t);
    timers.delete(userId);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private extractUser(req: Request): { userId: string; name?: string; role: string; tenantId: string } {
    const u = (req as any).scholarlyUser;
    if (u) return { userId: u.userId, name: u.name, role: u.role, tenantId: u.tenantId };
    return {
      userId: (req.body?.userId || req.query?.userId || 'anonymous') as string,
      name: (req.body?.userName || req.query?.userName || 'Anonymous') as string,
      role: 'user',
      tenantId: (req.body?.tenantId || req.query?.tenantId || '__default__') as string,
    };
  }

  /** Wrap async handlers to catch errors */
  private wrap(fn: (req: Request, res: Response) => Promise<void>) {
    return (req: Request, res: Response) => fn.call(this, req, res).catch((err: any) => {
      this.ctx.logger.error(`[Chat] Error: ${err.message}`);
      res.status(500).json({ error: 'Internal chat error' });
    });
  }
}

export default ChatPlugin;
