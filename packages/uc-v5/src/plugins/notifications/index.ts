/**
 * Chekd Unified Communications 3.0 — Notifications & Delivery Plugin
 *
 * Currently, the platform's event bus is like a town crier shouting in the
 * marketplace — if you happen to be standing there, you hear it. But step away
 * and you miss everything. This plugin is the postal service: it catches the
 * high-signal events and delivers them to users through their preferred channels,
 * even when they're offline.
 *
 * Delivery channels:
 *   - In-App Toast — real-time WebSocket push for active sessions
 *   - Email — transactional via SendGrid/AWS SES/SMTP
 *   - Push Notification — mobile via FCM (Android) and APNs (iOS)
 *   - SMS — via the existing Twilio Telephony plugin (reusing its infrastructure)
 *
 * The plugin watches for "high-signal" events — not everything deserves a
 * notification. A message in a channel you've muted? Silent. Someone @mentions
 * you? That cuts through. A recording just finished transcribing? Email digest.
 * An IC call is starting in 5 minutes? Push + SMS.
 *
 * Per-user preferences control:
 *   - Which channels receive which notification types
 *   - Quiet hours (no notifications between 10pm-8am)
 *   - Digest frequency (real-time, hourly, daily)
 *   - Muted channels/rooms
 *
 * Bus events emitted: notification:*
 *   notification:queued, notification:delivered, notification:failed,
 *   notification:preferences-updated, notification:digest-scheduled
 *
 * Bus events consumed (triggers):
 *   chat:message-sent (when user is @mentioned)
 *   room:participant-joined (when an expected attendee joins)
 *   call:initiated (inbound calls)
 *   cloud:file-shared (files shared with user)
 *   transcription:completed (recording transcripts ready)
 *   meeting:reminder-sent (from scheduling plugin)
 *   compliance:hold-applied (legal holds affecting user's content)
 *
 * REST endpoints (mounted at /api/notifications):
 *   GET  /                              — list user's notifications (paginated)
 *   GET  /:id                           — get single notification
 *   POST /:id/read                      — mark notification as read
 *   POST /read-all                      — mark all as read
 *   GET  /unread-count                  — get unread count
 *   GET  /preferences/:userId           — get user's notification preferences
 *   PUT  /preferences/:userId           — update preferences
 *   POST /send                          — manually send a notification (admin)
 *   GET  /digests                       — list scheduled digests
 *   GET  /stats                         — notification delivery statistics
 */

import { Router } from 'express';
import type { UCPlugin, PluginContext, PluginHealth } from '../../core/plugin-interface';

// ─── Notification Types ─────────────────────────────────────────

type NotificationChannel = 'in-app' | 'email' | 'push' | 'sms';
type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';
type NotificationType =
  | 'mention' | 'direct-message' | 'room-invite' | 'call-incoming'
  | 'file-shared' | 'transcription-ready' | 'meeting-reminder'
  | 'legal-hold' | 'system' | 'custom';

interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  sourcePlugin: string;
  sourceEvent: string;
  metadata: Record<string, unknown>;
  channels: NotificationChannel[];
  deliveryStatus: Record<NotificationChannel, 'pending' | 'delivered' | 'failed'>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

interface UserNotificationPreferences {
  userId: string;
  channels: {
    'in-app': { enabled: boolean; types: NotificationType[] };
    email: { enabled: boolean; types: NotificationType[]; digestFrequency: 'realtime' | 'hourly' | 'daily' };
    push: { enabled: boolean; types: NotificationType[] };
    sms: { enabled: boolean; types: NotificationType[] };
  };
  quietHours: { enabled: boolean; startHour: number; endHour: number; timezone: string };
  mutedChannels: string[];
  mutedRooms: string[];
}

interface DigestRecord {
  id: string;
  userId: string;
  frequency: 'hourly' | 'daily';
  notifications: NotificationRecord[];
  scheduledFor: Date;
  sentAt?: Date;
}

// ─── Delivery Channel Adapters ──────────────────────────────────

interface DeliveryAdapter {
  readonly channel: NotificationChannel;
  deliver(notification: NotificationRecord): Promise<boolean>;
  healthCheck(): Promise<boolean>;
}

/**
 * In-App Toast — pushes via WebSocket to active browser sessions.
 * The lightest channel — no external dependencies, instant delivery.
 */
class InAppDeliveryAdapter implements DeliveryAdapter {
  readonly channel: NotificationChannel = 'in-app';
  private wsConnections: Map<string, Set<(msg: unknown) => void>> = new Map();

  registerConnection(userId: string, send: (msg: unknown) => void): () => void {
    if (!this.wsConnections.has(userId)) this.wsConnections.set(userId, new Set());
    this.wsConnections.get(userId)!.add(send);
    return () => this.wsConnections.get(userId)?.delete(send);
  }

  async deliver(notification: NotificationRecord): Promise<boolean> {
    const connections = this.wsConnections.get(notification.userId);
    if (!connections || connections.size === 0) return false;

    const payload = {
      type: 'notification',
      data: {
        id: notification.id, type: notification.type,
        title: notification.title, body: notification.body,
        priority: notification.priority, createdAt: notification.createdAt,
      },
    };

    for (const send of connections) {
      try { send(payload); } catch { /* stale connection */ }
    }
    return true;
  }

  async healthCheck() { return true; }

  getActiveUserCount(): number { return this.wsConnections.size; }
}

/**
 * Email Delivery — transactional emails via configurable provider.
 * In production: SendGrid, AWS SES, or raw SMTP.
 * Template-based with HTML and plain text variants.
 */
class EmailDeliveryAdapter implements DeliveryAdapter {
  readonly channel: NotificationChannel = 'email';
  private provider: string;
  private fromAddress: string;
  private deliveryLog: Map<string, Date> = new Map();

  constructor(config: Record<string, unknown>) {
    this.provider = (config.emailProvider as string) || 'mock';
    this.fromAddress = (config.emailFrom as string) || 'notifications@chekd.app';
  }

  async deliver(notification: NotificationRecord): Promise<boolean> {
    // In production: resolve userId → email address from user store,
    // render HTML template, send via configured provider
    //
    // SendGrid: POST https://api.sendgrid.com/v3/mail/send
    // SES: ses.sendEmail({ Source, Destination, Message })
    // SMTP: transporter.sendMail({ from, to, subject, html })

    this.deliveryLog.set(notification.id, new Date());
    return true;
  }

  async healthCheck() { return this.provider !== ''; }
}

/**
 * Push Notification — mobile push via FCM (Android) and APNs (iOS).
 * Requires device tokens stored per-user. Falls back gracefully
 * when no device tokens are registered.
 */
class PushDeliveryAdapter implements DeliveryAdapter {
  readonly channel: NotificationChannel = 'push';
  private deviceTokens: Map<string, { platform: 'fcm' | 'apns'; token: string }[]> = new Map();

  constructor(_config: Record<string, unknown>) {}

  registerDeviceToken(userId: string, platform: 'fcm' | 'apns', token: string): void {
    if (!this.deviceTokens.has(userId)) this.deviceTokens.set(userId, []);
    const tokens = this.deviceTokens.get(userId)!;
    if (!tokens.find(t => t.token === token)) tokens.push({ platform, token });
  }

  removeDeviceToken(userId: string, token: string): void {
    const tokens = this.deviceTokens.get(userId);
    if (tokens) {
      const idx = tokens.findIndex(t => t.token === token);
      if (idx >= 0) tokens.splice(idx, 1);
    }
  }

  async deliver(notification: NotificationRecord): Promise<boolean> {
    const tokens = this.deviceTokens.get(notification.userId) || [];
    if (tokens.length === 0) return false;

    // In production:
    // FCM: POST https://fcm.googleapis.com/v1/projects/{id}/messages:send
    // APNs: HTTP/2 POST to api.push.apple.com/3/device/{deviceToken}
    return true;
  }

  async healthCheck() { return true; }
}

/**
 * SMS Delivery — leverages the existing Twilio Telephony plugin.
 * Sends SMS via Twilio REST API. Reserved for urgent notifications
 * only (incoming calls, IC meeting about to start).
 */
class SMSDeliveryAdapter implements DeliveryAdapter {
  readonly channel: NotificationChannel = 'sms';
  private twilioAccountSid: string;
  private twilioAuthToken: string;

  constructor(config: Record<string, unknown>) {
    this.twilioAccountSid = (config.twilioAccountSid as string) || process.env.TWILIO_ACCOUNT_SID || '';
    this.twilioAuthToken = (config.twilioAuthToken as string) || process.env.TWILIO_AUTH_TOKEN || '';
  }

  async deliver(notification: NotificationRecord): Promise<boolean> {
    // In production: use the Twilio REST API to send SMS
    // POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json
    // Body: { To: userPhone, From: twilioNumber, Body: notification.body }
    return !!this.twilioAccountSid;
  }

  async healthCheck() { return !!this.twilioAccountSid; }
}

// ─── Notification Rules Engine ──────────────────────────────────

/**
 * Determines which bus events should trigger notifications and for whom.
 * Each rule maps a bus event pattern to a notification template.
 * Think of this as the "editorial policy" — it decides what's newsworthy.
 */
interface NotificationRule {
  eventPattern: string;
  type: NotificationType;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  extractUserId: (data: any) => string | string[] | null;
  buildTitle: (data: any) => string;
  buildBody: (data: any) => string;
  shouldNotify?: (data: any) => boolean;
}

const DEFAULT_RULES: NotificationRule[] = [
  {
    eventPattern: 'chat:message-sent',
    type: 'mention',
    priority: 'high',
    channels: ['in-app', 'push'],
    extractUserId: (data) => {
      // Only notify if message contains @mentions
      if (!data.content?.includes('@')) return null;
      // In production: parse @mentions and resolve to userIds
      return null;
    },
    buildTitle: (data) => `${data.senderName} mentioned you`,
    buildBody: (data) => data.content?.slice(0, 100) || 'New mention',
    shouldNotify: (data) => data.messageType !== 'SYSTEM' && data.content?.includes('@'),
  },
  {
    eventPattern: 'chat:message-sent',
    type: 'direct-message',
    priority: 'high',
    channels: ['in-app', 'push', 'email'],
    extractUserId: (data) => {
      // DM channels have a sorted participant key format: userId1::userId2
      if (data.channelId?.includes('::')) {
        const parts = data.channelId.split('::');
        return parts.filter((id: string) => id !== data.senderId);
      }
      return null;
    },
    buildTitle: (data) => `Message from ${data.senderName}`,
    buildBody: (data) => data.content?.slice(0, 100) || 'New direct message',
  },
  {
    eventPattern: 'call:initiated',
    type: 'call-incoming',
    priority: 'urgent',
    channels: ['in-app', 'push', 'sms'],
    extractUserId: (data) => data.to ? [data.to] : null,
    buildTitle: () => 'Incoming call',
    buildBody: (data) => `Call from ${data.from}`,
  },
  {
    eventPattern: 'cloud:file-shared',
    type: 'file-shared',
    priority: 'normal',
    channels: ['in-app', 'email'],
    extractUserId: (data) => data.sharedWith || null,
    buildTitle: (data) => `${data.sharedBy} shared a file`,
    buildBody: (data) => `${data.fileName} was shared with you`,
  },
  {
    eventPattern: 'transcription:completed',
    type: 'transcription-ready',
    priority: 'normal',
    channels: ['in-app', 'email'],
    extractUserId: (data) => data.requestedBy || null,
    buildTitle: () => 'Transcription complete',
    buildBody: (data) => `Meeting transcription ready (${data.wordCount} words)`,
  },
  {
    eventPattern: 'meeting:reminder-sent',
    type: 'meeting-reminder',
    priority: 'high',
    channels: ['in-app', 'push'],
    extractUserId: (data) => data.userId,
    buildTitle: () => 'Meeting starting soon',
    buildBody: (data) => `Your meeting starts in ${data.minutesBefore} minutes`,
  },
  {
    eventPattern: 'compliance:hold-applied',
    type: 'legal-hold',
    priority: 'urgent',
    channels: ['in-app', 'email'],
    extractUserId: (data) => data.affectedUsers || null,
    buildTitle: () => 'Legal hold applied',
    buildBody: (data) => `A legal hold has been placed: ${data.reason}`,
  },
];

// ─── Plugin Implementation ──────────────────────────────────────

export class NotificationsPlugin implements UCPlugin {
  readonly id = 'notifications';
  readonly name = 'Notifications & Delivery';
  readonly version = '3.0.0';
  readonly dependencies: string[] = [];

  private ctx!: PluginContext;
  private notifications: Map<string, NotificationRecord> = new Map();
  private preferences: Map<string, UserNotificationPreferences> = new Map();
  private digests: Map<string, DigestRecord> = new Map();
  private rules: NotificationRule[] = [...DEFAULT_RULES];
  private adapters: Map<NotificationChannel, DeliveryAdapter> = new Map();
  private inAppAdapter!: InAppDeliveryAdapter;
  private deliveryStats = { total: 0, delivered: 0, failed: 0 };

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    const pluginConfig = ctx.config.plugins['notifications'] || {};

    // Initialize delivery adapters
    this.inAppAdapter = new InAppDeliveryAdapter();
    this.adapters.set('in-app', this.inAppAdapter);
    this.adapters.set('email', new EmailDeliveryAdapter(pluginConfig));
    this.adapters.set('push', new PushDeliveryAdapter(pluginConfig));
    this.adapters.set('sms', new SMSDeliveryAdapter(pluginConfig));

    ctx.logger.info(`Notifications plugin initializing with ${this.adapters.size} delivery channels`);

    // Subscribe to all notification-triggering events
    for (const rule of this.rules) {
      ctx.bus.on(rule.eventPattern, async (data: any) => {
        await this.processRule(rule, data);
      }, 'notifications');
    }

    // Also listen via wildcard for the transcription and meeting domains
    // (in case those plugins are registered after us)
    ctx.bus.onPattern('transcription:*', async (data: any) => {
      // Already handled by specific rules, but wildcard catches future events
    }, 'notifications');

    ctx.bus.onPattern('meeting:*', async (data: any) => {
      // Handled by specific rules
    }, 'notifications');

    ctx.logger.info(`Subscribed to ${this.rules.length} notification rules ✓`);
  }

  // ─── Rule Processing ──────────────────────────────────────────

  private async processRule(rule: NotificationRule, eventData: any): Promise<void> {
    // Check shouldNotify guard
    if (rule.shouldNotify && !rule.shouldNotify(eventData)) return;

    // Extract target user(s)
    const userIds = rule.extractUserId(eventData);
    if (!userIds) return;

    const targetUsers = Array.isArray(userIds) ? userIds : [userIds];

    for (const userId of targetUsers) {
      await this.createAndDeliver(userId, rule, eventData);
    }
  }

  private async createAndDeliver(userId: string, rule: NotificationRule, eventData: any): Promise<void> {
    const prefs = this.getUserPreferences(userId);

    // Check quiet hours
    if (this.isInQuietHours(prefs)) {
      // Queue for digest instead of immediate delivery
      this.queueForDigest(userId, rule, eventData);
      return;
    }

    // Check muted channels/rooms
    if (eventData.channelId && prefs.mutedChannels.includes(eventData.channelId)) return;
    if (eventData.roomId && prefs.mutedRooms.includes(eventData.roomId)) return;

    // Determine delivery channels based on user preferences
    const channels = rule.channels.filter(ch => {
      const channelPrefs = prefs.channels[ch];
      return channelPrefs.enabled && channelPrefs.types.includes(rule.type);
    });

    if (channels.length === 0) return;

    const notification: NotificationRecord = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      type: rule.type,
      priority: rule.priority,
      title: rule.buildTitle(eventData),
      body: rule.buildBody(eventData),
      sourcePlugin: eventData.__sourcePluginId || 'unknown',
      sourceEvent: rule.eventPattern,
      metadata: eventData,
      channels,
      deliveryStatus: {} as any,
      isRead: false,
      createdAt: new Date(),
    };

    // Initialize delivery status
    for (const ch of channels) {
      notification.deliveryStatus[ch] = 'pending';
    }

    this.notifications.set(notification.id, notification);
    await this.ctx.storage.set('notifications', notification.id, notification);

    this.ctx.bus.emit('notification:queued', {
      notificationId: notification.id, userId, channel: channels.join(','),
      type: rule.type, priority: rule.priority,
    }, 'notifications');

    // Deliver through each channel
    for (const channel of channels) {
      const adapter = this.adapters.get(channel);
      if (!adapter) continue;

      try {
        const success = await adapter.deliver(notification);
        notification.deliveryStatus[channel] = success ? 'delivered' : 'failed';
        this.deliveryStats.total++;
        if (success) {
          this.deliveryStats.delivered++;
          this.ctx.bus.emit('notification:delivered', {
            notificationId: notification.id, userId, channel,
            deliveredAt: new Date().toISOString(),
          }, 'notifications');
        } else {
          this.deliveryStats.failed++;
          this.ctx.bus.emit('notification:failed', {
            notificationId: notification.id, userId, channel,
            error: 'Delivery returned false',
          }, 'notifications');
        }
      } catch (error) {
        notification.deliveryStatus[channel] = 'failed';
        this.deliveryStats.total++;
        this.deliveryStats.failed++;
        this.ctx.bus.emit('notification:failed', {
          notificationId: notification.id, userId, channel,
          error: String(error),
        }, 'notifications');
      }
    }

    await this.ctx.storage.set('notifications', notification.id, notification);
  }

  // ─── Preferences ──────────────────────────────────────────────

  private getUserPreferences(userId: string): UserNotificationPreferences {
    if (this.preferences.has(userId)) return this.preferences.get(userId)!;

    // Default preferences: everything enabled except SMS (reserved for urgent)
    const defaults: UserNotificationPreferences = {
      userId,
      channels: {
        'in-app': { enabled: true, types: ['mention', 'direct-message', 'room-invite', 'call-incoming', 'file-shared', 'transcription-ready', 'meeting-reminder', 'legal-hold', 'system', 'custom'] },
        email: { enabled: true, types: ['direct-message', 'file-shared', 'transcription-ready', 'legal-hold'], digestFrequency: 'realtime' },
        push: { enabled: true, types: ['mention', 'direct-message', 'call-incoming', 'meeting-reminder'] },
        sms: { enabled: false, types: ['call-incoming'] },
      },
      quietHours: { enabled: false, startHour: 22, endHour: 8, timezone: 'UTC' },
      mutedChannels: [],
      mutedRooms: [],
    };

    this.preferences.set(userId, defaults);
    return defaults;
  }

  private isInQuietHours(prefs: UserNotificationPreferences): boolean {
    if (!prefs.quietHours.enabled) return false;
    const now = new Date();
    const hour = now.getUTCHours(); // Simplified — production would use timezone
    const { startHour, endHour } = prefs.quietHours;
    if (startHour > endHour) {
      // Wraps midnight (e.g., 22:00 → 08:00)
      return hour >= startHour || hour < endHour;
    }
    return hour >= startHour && hour < endHour;
  }

  private queueForDigest(userId: string, rule: NotificationRule, eventData: any): void {
    const prefs = this.getUserPreferences(userId);
    const emailPrefs = prefs.channels.email;
    const frequency = emailPrefs.digestFrequency === 'realtime' ? 'hourly' : emailPrefs.digestFrequency;

    const digestId = `digest-${userId}-${frequency}`;
    let digest = this.digests.get(digestId);
    if (!digest) {
      const nextDelivery = new Date();
      if (frequency === 'hourly') nextDelivery.setHours(nextDelivery.getHours() + 1, 0, 0, 0);
      else nextDelivery.setDate(nextDelivery.getDate() + 1); // daily
      nextDelivery.setHours(8, 0, 0, 0);

      digest = {
        id: digestId,
        userId,
        frequency,
        notifications: [],
        scheduledFor: nextDelivery,
      };
      this.digests.set(digestId, digest);

      this.ctx.bus.emit('notification:digest-scheduled', {
        digestId, userId, frequency, nextDeliveryAt: nextDelivery.toISOString(),
      }, 'notifications');
    }

    // Add a lightweight notification record to the digest
    digest.notifications.push({
      id: `notif-digest-${Date.now()}`,
      userId,
      type: rule.type,
      priority: rule.priority,
      title: rule.buildTitle(eventData),
      body: rule.buildBody(eventData),
      sourcePlugin: 'digest',
      sourceEvent: rule.eventPattern,
      metadata: {},
      channels: ['email'],
      deliveryStatus: { email: 'pending' } as any,
      isRead: false,
      createdAt: new Date(),
    });
  }

  // ─── WebSocket Handler ────────────────────────────────────────

  async handleWebSocketMessage(
    socketId: string, userId: string, _roomId: string | undefined,
    messageType: string, data: unknown,
    reply: (msg: unknown) => void,
    _broadcast: (roomId: string, msg: unknown, excludeSocketId?: string) => void,
  ): Promise<boolean> {
    if (!messageType.startsWith('notification-')) return false;

    switch (messageType) {
      case 'notification-subscribe': {
        const unsubscribe = this.inAppAdapter.registerConnection(userId, reply);
        reply({ type: 'notification-subscribed', data: { ok: true } });
        return true;
      }
      case 'notification-mark-read': {
        const { notificationId } = data as any;
        const notif = this.notifications.get(notificationId);
        if (notif && notif.userId === userId) {
          notif.isRead = true;
          notif.readAt = new Date();
        }
        reply({ type: 'notification-read', data: { notificationId, ok: true } });
        return true;
      }
      default:
        return false;
    }
  }

  // ─── REST Routes ──────────────────────────────────────────────

  getRoutes(): Router {
    const router = Router();

    // List user's notifications
    router.get('/', (req, res) => {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId query param required' });

      const limit = parseInt(req.query.limit as string || '50', 10);
      const offset = parseInt(req.query.offset as string || '0', 10);
      const unreadOnly = req.query.unreadOnly === 'true';

      let results = [...this.notifications.values()]
        .filter(n => n.userId === userId)
        .filter(n => !unreadOnly || !n.isRead)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = results.length;
      results = results.slice(offset, offset + limit);

      res.json({ total, offset, limit, notifications: results });
    });

    // Get single notification
    router.get('/:id', (req, res) => {
      const notif = this.notifications.get(req.params.id);
      if (!notif) return res.status(404).json({ error: 'Notification not found' });
      res.json(notif);
    });

    // Mark notification as read
    router.post('/:id/read', (req, res) => {
      const notif = this.notifications.get(req.params.id);
      if (!notif) return res.status(404).json({ error: 'Notification not found' });
      notif.isRead = true;
      notif.readAt = new Date();
      res.json({ ok: true });
    });

    // Mark all as read
    router.post('/read-all', (req, res) => {
      const userId = req.body.userId;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      let count = 0;
      for (const notif of this.notifications.values()) {
        if (notif.userId === userId && !notif.isRead) {
          notif.isRead = true;
          notif.readAt = new Date();
          count++;
        }
      }
      res.json({ markedRead: count });
    });

    // Unread count
    router.get('/unread-count', (req, res) => {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const count = [...this.notifications.values()]
        .filter(n => n.userId === userId && !n.isRead).length;
      res.json({ userId, unreadCount: count });
    });

    // Get user preferences
    router.get('/preferences/:userId', (req, res) => {
      res.json(this.getUserPreferences(req.params.userId));
    });

    // Update user preferences
    router.put('/preferences/:userId', async (req, res) => {
      const userId = req.params.userId;
      const existing = this.getUserPreferences(userId);
      const updated = { ...existing, ...req.body, userId };
      this.preferences.set(userId, updated);
      await this.ctx.storage.set('notification-preferences', userId, updated);
      this.ctx.bus.emit('notification:preferences-updated', {
        userId, channels: Object.keys(updated.channels).filter(
          ch => updated.channels[ch as NotificationChannel]?.enabled
        ),
      }, 'notifications');
      res.json(updated);
    });

    // Manually send notification (admin)
    router.post('/send', async (req, res) => {
      const { userId, type, title, body, channels, priority } = req.body;
      if (!userId || !title || !body) {
        return res.status(400).json({ error: 'userId, title, and body required' });
      }
      const notification: NotificationRecord = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId, type: type || 'custom', priority: priority || 'normal',
        title, body, sourcePlugin: 'admin', sourceEvent: 'manual',
        metadata: req.body.metadata || {}, channels: channels || ['in-app'],
        deliveryStatus: {} as any, isRead: false, createdAt: new Date(),
      };
      for (const ch of notification.channels) notification.deliveryStatus[ch] = 'pending';
      this.notifications.set(notification.id, notification);

      for (const ch of notification.channels) {
        const adapter = this.adapters.get(ch);
        if (adapter) {
          const ok = await adapter.deliver(notification);
          notification.deliveryStatus[ch] = ok ? 'delivered' : 'failed';
        }
      }

      res.json(notification);
    });

    // List digests
    router.get('/digests', (req, res) => {
      const userId = req.query.userId as string;
      let results = [...this.digests.values()];
      if (userId) results = results.filter(d => d.userId === userId);
      res.json(results.map(d => ({
        id: d.id, userId: d.userId, frequency: d.frequency,
        notificationCount: d.notifications.length,
        scheduledFor: d.scheduledFor, sentAt: d.sentAt,
      })));
    });

    // Stats
    router.get('/stats', (_req, res) => {
      const all = [...this.notifications.values()];
      res.json({
        total: all.length,
        unread: all.filter(n => !n.isRead).length,
        delivery: this.deliveryStats,
        byType: this.countByField(all, 'type'),
        byPriority: this.countByField(all, 'priority'),
        activeConnections: this.inAppAdapter.getActiveUserCount(),
        pendingDigests: this.digests.size,
      });
    });

    return router;
  }

  private countByField(items: NotificationRecord[], field: keyof NotificationRecord): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const key = String(item[field]);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }

  async shutdown(): Promise<void> {
    this.notifications.clear();
    this.preferences.clear();
    this.digests.clear();
    this.ctx.logger.info('Notifications plugin shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    const channelHealth: Record<string, boolean> = {};
    for (const [ch, adapter] of this.adapters) {
      channelHealth[ch] = await adapter.healthCheck();
    }
    const allHealthy = Object.values(channelHealth).every(h => h);
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      details: {
        channels: channelHealth,
        totalNotifications: this.notifications.size,
        activeConnections: this.inAppAdapter.getActiveUserCount(),
        deliveryStats: this.deliveryStats,
      },
    };
  }
}

export default NotificationsPlugin;
