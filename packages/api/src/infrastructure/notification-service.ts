/**
 * Scholarly Platform — Notification Service
 * ==========================================
 *
 * REM-009: Multi-channel notification delivery with SendGrid (email),
 * Twilio (SMS), and Firebase Cloud Messaging (push notifications).
 *
 * Think of this service as a postal sorting office: messages arrive through
 * a single intake window (the NotificationService), get routed to the
 * correct delivery channel based on the recipient's preferences and the
 * notification type, and are tracked through every stage of their journey
 * from creation to confirmed delivery.
 *
 * ## Architecture
 *
 * NotificationService (orchestrator)
 *   ├── SendGridProvider  — Transactional email with template support
 *   ├── TwilioProvider    — SMS with international formatting
 *   ├── FCMProvider       — Push notifications (iOS APNs + Android FCM)
 *   ├── TemplateEngine    — Handlebars-based template rendering
 *   ├── PreferenceRouter  — Tenant + user preference-based channel selection
 *   └── DeliveryTracker   — Status tracking with retry orchestration
 *
 * Every notification publishes domain events on the NATS event bus so that
 * other modules (Parent Portal, Wellbeing, Analytics) can react to delivery
 * outcomes without polling.
 *
 * @module infrastructure/notification-service
 * @version 1.0.0
 */

import { Logger } from 'pino';

// ============================================================================
// SECTION 1: TYPE DEFINITIONS
// ============================================================================

/** Channels through which notifications can be delivered */
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

/** Urgency levels that affect delivery strategy */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

/** Lifecycle stages of a notification */
export type DeliveryStatus =
  | 'queued'       // Accepted but not yet sent
  | 'sending'      // Handed to provider
  | 'sent'         // Provider accepted
  | 'delivered'    // Confirmed delivery (webhook)
  | 'bounced'      // Hard bounce — permanent failure
  | 'failed'       // Soft failure — will retry
  | 'retrying'     // In retry cycle
  | 'dropped'      // Permanently abandoned after max retries
  | 'read';        // Recipient opened/read (where trackable)

/** Categories that drive template selection and preference routing */
export type NotificationType =
  | 'auth_verification'
  | 'auth_password_reset'
  | 'auth_login_alert'
  | 'payment_receipt'
  | 'payment_failed'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'subscription_renewal'
  | 'learning_progress'
  | 'learning_milestone'
  | 'learning_concern'
  | 'wellbeing_alert'
  | 'wellbeing_checkin_reminder'
  | 'parent_meeting_scheduled'
  | 'parent_report_available'
  | 'parent_consent_required'
  | 'storybook_published'
  | 'storybook_review_complete'
  | 'content_bounty_posted'
  | 'content_bounty_awarded'
  | 'creator_payout'
  | 'arena_challenge'
  | 'arena_result'
  | 'governance_proposal'
  | 'governance_vote_reminder'
  | 'system_maintenance'
  | 'system_announcement';

/** The payload for a single notification request */
export interface NotificationRequest {
  /** Unique idempotency key — prevents duplicate sends on retry */
  idempotencyKey: string;
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  priority: NotificationPriority;

  /** Template data merged into the notification template */
  data: Record<string, unknown>;

  /** Override the default channel selection */
  channelOverride?: NotificationChannel[];

  /** Schedule for future delivery (ISO 8601) */
  scheduledAt?: string;

  /** Metadata passed through to analytics */
  metadata?: Record<string, unknown>;
}

/** Recipient contact information resolved from the user profile */
export interface RecipientProfile {
  userId: string;
  tenantId: string;
  email?: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  fcmTokens: string[];
  preferredLanguage: string;
  timezone: string;

  /** Per-type channel preferences */
  channelPreferences: Partial<Record<NotificationType, NotificationChannel[]>>;

  /** Global quiet hours (local time) */
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "07:00"

  /** Types the user has explicitly muted */
  mutedTypes: NotificationType[];
}

/** A rendered notification ready for a specific channel */
export interface RenderedNotification {
  channel: NotificationChannel;
  subject?: string;      // Email only
  htmlBody?: string;     // Email only
  textBody: string;      // Email plaintext / SMS body / push body
  pushTitle?: string;    // Push only
  pushData?: Record<string, string>; // Push custom data
  pushImageUrl?: string; // Rich push notification image
}

/** Template definition stored in the template registry */
export interface NotificationTemplate {
  type: NotificationType;
  channel: NotificationChannel;
  locale: string;
  subject?: string;   // Handlebars template for subject
  html?: string;       // Handlebars template for HTML body
  text: string;        // Handlebars template for text body
  pushTitle?: string;  // Handlebars template for push title
  version: number;
}

/** Delivery record persisted per send attempt */
export interface DeliveryRecord {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  providerMessageId?: string;
  attemptCount: number;
  nextRetryAt?: Date;
  lastError?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  cost?: number; // Provider cost in USD
}

/** Configuration for the notification service */
export interface NotificationConfig {
  sendgrid: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
    /** SendGrid IP pool for transactional vs marketing */
    ipPool?: string;
    /** Sandbox mode for testing — accepts but doesn't deliver */
    sandbox: boolean;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    /** Messaging service SID for US/CA number pooling */
    messagingServiceSid?: string;
  };
  fcm: {
    /** Firebase service account credentials JSON */
    serviceAccountJson: string;
    /** Default notification icon URL */
    defaultIcon?: string;
  };
  delivery: {
    maxRetries: number;           // Default: 5
    retryBaseDelayMs: number;     // Default: 1000 (1s, then 2s, 4s, 8s, 16s)
    retryMaxDelayMs: number;      // Default: 300000 (5 minutes)
    batchSize: number;            // Default: 100
    rateLimitPerSecond: number;   // Default: 50
  };
}

/** Result type matching the platform's Result<T> pattern */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

// ============================================================================
// SECTION 2: TEMPLATE ENGINE
// ============================================================================

/**
 * TemplateEngine renders notification content from Handlebars templates.
 *
 * Templates are stored in a registry keyed by (type, channel, locale).
 * The engine falls back through locale → 'en' → raw data if no template
 * is found, ensuring notifications are never silently dropped due to
 * a missing template.
 */
export class TemplateEngine {
  private templates: Map<string, NotificationTemplate> = new Map();
  private compiledCache: Map<string, (data: Record<string, unknown>) => string> = new Map();

  /**
   * Build a cache key from template coordinates.
   * Like a library catalogue number: type.channel.locale uniquely
   * identifies every template variant.
   */
  private cacheKey(type: NotificationType, channel: NotificationChannel, locale: string): string {
    return `${type}:${channel}:${locale}`;
  }

  /**
   * Register a template in the engine. Overwrites any existing template
   * at the same coordinates.
   */
  registerTemplate(template: NotificationTemplate): void {
    const key = this.cacheKey(template.type, template.channel, template.locale);
    this.templates.set(key, template);
    // Invalidate compiled cache for this key
    for (const [k] of this.compiledCache) {
      if (k.startsWith(key)) {
        this.compiledCache.delete(k);
      }
    }
  }

  /**
   * Register multiple templates at once — typically called at startup
   * when loading templates from the database or config files.
   */
  registerBatch(templates: NotificationTemplate[]): void {
    for (const t of templates) {
      this.registerTemplate(t);
    }
  }

  /**
   * Compile a Handlebars template string into a render function.
   * Uses a simple Handlebars-compatible implementation that handles
   * {{variable}}, {{#if}}, {{#each}}, and {{#unless}} blocks.
   *
   * We avoid importing the full Handlebars library to keep the
   * notification service lightweight. This covers 95% of template needs.
   */
  private compile(templateStr: string): (data: Record<string, unknown>) => string {
    return (data: Record<string, unknown>): string => {
      let result = templateStr;

      // Handle {{#each items}}...{{/each}} blocks
      result = result.replace(
        /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
        (_match, key, body) => {
          const items = data[key];
          if (!Array.isArray(items)) return '';
          return items.map((item, index) => {
            let rendered = body as string;
            if (typeof item === 'object' && item !== null) {
              for (const [k, v] of Object.entries(item)) {
                rendered = rendered.replace(
                  new RegExp(`\\{\\{${k}\\}\\}`, 'g'),
                  String(v ?? '')
                );
              }
            }
            rendered = rendered.replace(/\{\{@index\}\}/g, String(index));
            rendered = rendered.replace(/\{\{this\}\}/g, String(item));
            return rendered;
          }).join('');
        }
      );

      // Handle {{#if condition}}...{{else}}...{{/if}} blocks
      result = result.replace(
        /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
        (_match, key, truthyBody, falsyBody) => {
          const value = data[key];
          if (value && value !== '' && value !== 0) {
            return truthyBody;
          }
          return falsyBody || '';
        }
      );

      // Handle {{#unless condition}}...{{/unless}} blocks
      result = result.replace(
        /\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
        (_match, key, body) => {
          const value = data[key];
          if (!value || value === '' || value === 0) {
            return body;
          }
          return '';
        }
      );

      // Handle simple {{variable}} substitution with HTML escaping
      result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path: string) => {
        const parts = path.split('.');
        let current: unknown = data;
        for (const part of parts) {
          if (current === null || current === undefined) return '';
          current = (current as Record<string, unknown>)[part];
        }
        return escapeHtml(String(current ?? ''));
      });

      // Handle triple-stache {{{variable}}} — unescaped HTML
      result = result.replace(/\{\{\{(\w+(?:\.\w+)*)\}\}\}/g, (_match, path: string) => {
        const parts = path.split('.');
        let current: unknown = data;
        for (const part of parts) {
          if (current === null || current === undefined) return '';
          current = (current as Record<string, unknown>)[part];
        }
        return String(current ?? '');
      });

      return result;
    };
  }

  /**
   * Render a notification for a specific channel and locale.
   *
   * Fallback chain: requested locale → 'en' → inline generation from data.
   * This ensures a notification is never lost because someone forgot to
   * add a Swahili translation of the payment receipt template.
   */
  render(
    type: NotificationType,
    channel: NotificationChannel,
    locale: string,
    data: Record<string, unknown>
  ): RenderedNotification {
    // Try exact locale, then 'en' fallback
    const key = this.cacheKey(type, channel, locale);
    const fallbackKey = this.cacheKey(type, channel, 'en');

    let template = this.templates.get(key) || this.templates.get(fallbackKey);

    if (!template) {
      // No template exists — generate a minimal notification from raw data
      return this.renderFallback(type, channel, data);
    }

    // Get or compile cached render functions
    const renderText = this.getCompiled(`${key}:text`, template.text);
    const renderHtml = template.html ? this.getCompiled(`${key}:html`, template.html) : undefined;
    const renderSubject = template.subject ? this.getCompiled(`${key}:subject`, template.subject) : undefined;
    const renderPushTitle = template.pushTitle ? this.getCompiled(`${key}:pushTitle`, template.pushTitle) : undefined;

    return {
      channel,
      textBody: renderText(data),
      htmlBody: renderHtml ? renderHtml(data) : undefined,
      subject: renderSubject ? renderSubject(data) : undefined,
      pushTitle: renderPushTitle ? renderPushTitle(data) : undefined,
      pushData: data.pushData as Record<string, string> | undefined,
      pushImageUrl: data.pushImageUrl as string | undefined,
    };
  }

  private getCompiled(cacheKey: string, templateStr: string): (data: Record<string, unknown>) => string {
    let fn = this.compiledCache.get(cacheKey);
    if (!fn) {
      fn = this.compile(templateStr);
      this.compiledCache.set(cacheKey, fn);
    }
    return fn;
  }

  /**
   * Generate a minimal notification when no template is registered.
   * Better to send an ugly notification than no notification at all.
   */
  private renderFallback(
    type: NotificationType,
    channel: NotificationChannel,
    data: Record<string, unknown>
  ): RenderedNotification {
    const title = humanizeType(type);
    const body = data.message ? String(data.message) : `You have a new notification: ${title}`;

    switch (channel) {
      case 'email':
        return {
          channel,
          subject: `Scholarly: ${title}`,
          htmlBody: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></div>`,
          textBody: body,
        };
      case 'push':
        return {
          channel,
          pushTitle: `Scholarly: ${title}`,
          textBody: body,
          pushData: { type, notificationId: String(data.notificationId || '') },
        };
      default:
        return { channel, textBody: body };
    }
  }
}

// ============================================================================
// SECTION 3: CHANNEL PROVIDERS
// ============================================================================

/**
 * Provider interface — each channel implements this contract.
 * The interface is intentionally slim: send a rendered notification
 * to a recipient, get back a provider-specific message ID or an error.
 */
export interface IChannelProvider {
  readonly channel: NotificationChannel;
  send(recipient: RecipientProfile, notification: RenderedNotification): Promise<Result<{ messageId: string; cost?: number }>>;
  validateRecipient(recipient: RecipientProfile): Result<void>;
}

// ---------------------------------------------------------------------------
// 3.1 SendGrid Email Provider
// ---------------------------------------------------------------------------

/**
 * SendGridProvider sends transactional email via the SendGrid v3 API.
 *
 * Uses the mail/send endpoint directly rather than the SendGrid Node SDK
 * to avoid the heavy dependency and maintain control over retry behaviour.
 * The API key authenticates via Bearer token in the Authorization header.
 */
export class SendGridProvider implements IChannelProvider {
  readonly channel: NotificationChannel = 'email';

  constructor(
    private config: NotificationConfig['sendgrid'],
    private logger: Logger
  ) {}

  validateRecipient(recipient: RecipientProfile): Result<void> {
    if (!recipient.email) {
      return { success: false, error: { code: 'NO_EMAIL', message: 'Recipient has no email address' } };
    }
    if (!recipient.emailVerified) {
      return { success: false, error: { code: 'EMAIL_UNVERIFIED', message: 'Recipient email is not verified' } };
    }
    if (!isValidEmail(recipient.email)) {
      return { success: false, error: { code: 'INVALID_EMAIL', message: `Invalid email format: ${recipient.email}` } };
    }
    return { success: true, data: undefined };
  }

  async send(
    recipient: RecipientProfile,
    notification: RenderedNotification
  ): Promise<Result<{ messageId: string; cost?: number }>> {
    const validation = this.validateRecipient(recipient);
    if (!validation.success) return validation as Result<{ messageId: string }>;

    const payload: Record<string, unknown> = {
      personalizations: [{
        to: [{ email: recipient.email }],
      }],
      from: {
        email: this.config.fromEmail,
        name: this.config.fromName,
      },
      subject: notification.subject || 'Scholarly Notification',
      content: [
        ...(notification.htmlBody ? [{ type: 'text/html', value: notification.htmlBody }] : []),
        { type: 'text/plain', value: notification.textBody },
      ],
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true },
      },
      mail_settings: {
        sandbox_mode: { enable: this.config.sandbox },
      },
    };

    if (this.config.ipPool) {
      payload.ip_pool_name = this.config.ipPool;
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 202 || response.status === 200) {
        const messageId = response.headers.get('X-Message-Id') || generateId();
        this.logger.info({
          channel: 'email',
          recipient: recipient.email,
          messageId,
          sandbox: this.config.sandbox,
        }, 'Email sent via SendGrid');

        return { success: true, data: { messageId, cost: 0.0001 } }; // ~$0.0001/email at scale
      }

      const errorBody = await response.text();
      this.logger.error({
        channel: 'email',
        status: response.status,
        error: errorBody,
        recipient: recipient.email,
      }, 'SendGrid API error');

      // 429 = rate limited, 5xx = server error — both retriable
      const retriable = response.status === 429 || response.status >= 500;
      return {
        success: false,
        error: {
          code: retriable ? 'SENDGRID_RETRIABLE' : 'SENDGRID_PERMANENT',
          message: `SendGrid returned ${response.status}`,
          details: { status: response.status, body: errorBody, retriable },
        },
      };
    } catch (err) {
      this.logger.error({ err, channel: 'email' }, 'SendGrid network error');
      return {
        success: false,
        error: {
          code: 'SENDGRID_NETWORK',
          message: err instanceof Error ? err.message : 'Network error',
          details: { retriable: true },
        },
      };
    }
  }
}

// ---------------------------------------------------------------------------
// 3.2 Twilio SMS Provider
// ---------------------------------------------------------------------------

/**
 * TwilioProvider sends SMS via the Twilio REST API.
 *
 * Uses Basic auth (accountSid:authToken) against the Messages resource.
 * Supports both direct from-number and Messaging Service SID for
 * US/CA number pooling and compliance.
 */
export class TwilioProvider implements IChannelProvider {
  readonly channel: NotificationChannel = 'sms';

  constructor(
    private config: NotificationConfig['twilio'],
    private logger: Logger
  ) {}

  validateRecipient(recipient: RecipientProfile): Result<void> {
    if (!recipient.phone) {
      return { success: false, error: { code: 'NO_PHONE', message: 'Recipient has no phone number' } };
    }
    if (!recipient.phoneVerified) {
      return { success: false, error: { code: 'PHONE_UNVERIFIED', message: 'Recipient phone is not verified' } };
    }
    if (!isValidE164(recipient.phone)) {
      return {
        success: false,
        error: { code: 'INVALID_PHONE', message: `Phone must be E.164 format: ${recipient.phone}` },
      };
    }
    return { success: true, data: undefined };
  }

  async send(
    recipient: RecipientProfile,
    notification: RenderedNotification
  ): Promise<Result<{ messageId: string; cost?: number }>> {
    const validation = this.validateRecipient(recipient);
    if (!validation.success) return validation as Result<{ messageId: string }>;

    // Twilio API uses form-encoded body
    const params = new URLSearchParams();
    params.set('To', recipient.phone!);
    params.set('Body', truncateSms(notification.textBody));

    if (this.config.messagingServiceSid) {
      params.set('MessagingServiceSid', this.config.messagingServiceSid);
    } else {
      params.set('From', this.config.fromNumber);
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
    const authHeader = 'Basic ' + Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const body = await response.json() as Record<string, unknown>;

      if (response.status === 201) {
        const messageId = body.sid as string;
        // Twilio provides price per message segment
        const cost = body.price ? Math.abs(parseFloat(body.price as string)) : 0.0075;

        this.logger.info({
          channel: 'sms',
          recipient: maskPhone(recipient.phone!),
          messageId,
          segments: body.num_segments,
        }, 'SMS sent via Twilio');

        return { success: true, data: { messageId, cost } };
      }

      const errorCode = body.code as number;
      const errorMessage = body.message as string;

      this.logger.error({
        channel: 'sms',
        status: response.status,
        twilioCode: errorCode,
        error: errorMessage,
      }, 'Twilio API error');

      // Error codes 20429 (rate limit), 30xxx (carrier errors) are retriable
      const retriable = errorCode === 20429 || (errorCode >= 30000 && errorCode < 40000);
      return {
        success: false,
        error: {
          code: retriable ? 'TWILIO_RETRIABLE' : 'TWILIO_PERMANENT',
          message: errorMessage,
          details: { twilioCode: errorCode, retriable },
        },
      };
    } catch (err) {
      this.logger.error({ err, channel: 'sms' }, 'Twilio network error');
      return {
        success: false,
        error: {
          code: 'TWILIO_NETWORK',
          message: err instanceof Error ? err.message : 'Network error',
          details: { retriable: true },
        },
      };
    }
  }
}

// ---------------------------------------------------------------------------
// 3.3 Firebase Cloud Messaging (FCM) Provider
// ---------------------------------------------------------------------------

/**
 * FCMProvider sends push notifications via Firebase Cloud Messaging v1 API.
 *
 * Uses a service account for OAuth 2.0 authentication. Each recipient
 * can have multiple FCM tokens (one per device), so a single notification
 * may result in multiple FCM sends.
 *
 * The v1 API (projects/{project}/messages:send) is used rather than the
 * legacy API for better error reporting and per-platform customisation.
 */
export class FCMProvider implements IChannelProvider {
  readonly channel: NotificationChannel = 'push';
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private projectId: string;

  constructor(
    private config: NotificationConfig['fcm'],
    private logger: Logger
  ) {
    // Extract project_id from service account JSON
    try {
      const sa = JSON.parse(config.serviceAccountJson);
      this.projectId = sa.project_id;
    } catch {
      this.projectId = '';
      this.logger.error('Invalid FCM service account JSON');
    }
  }

  validateRecipient(recipient: RecipientProfile): Result<void> {
    if (!recipient.fcmTokens || recipient.fcmTokens.length === 0) {
      return { success: false, error: { code: 'NO_FCM_TOKEN', message: 'Recipient has no push notification tokens' } };
    }
    return { success: true, data: undefined };
  }

  /**
   * Obtain an OAuth 2.0 access token from the service account credentials.
   * Tokens are cached until 5 minutes before expiry.
   *
   * In production, this would use google-auth-library's JWT client.
   * Here we implement the JWT assertion flow directly to avoid the
   * heavy dependency.
   */
  private async getAccessToken(): Promise<Result<string>> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 300000) {
      return { success: true, data: this.accessToken };
    }

    try {
      const sa = JSON.parse(this.config.serviceAccountJson);
      const now = Math.floor(Date.now() / 1000);

      // Build JWT assertion for Google OAuth
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      })).toString('base64url');

      // Sign with the service account private key
      const crypto = await import('crypto');
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(`${header}.${payload}`);
      const signature = sign.sign(sa.private_key, 'base64url');

      const assertion = `${header}.${payload}.${signature}`;

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${assertion}`,
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, error: { code: 'FCM_AUTH_FAILED', message: `OAuth token error: ${err}` } };
      }

      const tokenData = await response.json() as { access_token: string; expires_in: number };
      this.accessToken = tokenData.access_token;
      this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);

      return { success: true, data: this.accessToken };
    } catch (err) {
      return {
        success: false,
        error: { code: 'FCM_AUTH_ERROR', message: err instanceof Error ? err.message : 'Auth error' },
      };
    }
  }

  async send(
    recipient: RecipientProfile,
    notification: RenderedNotification
  ): Promise<Result<{ messageId: string; cost?: number }>> {
    const validation = this.validateRecipient(recipient);
    if (!validation.success) return validation as Result<{ messageId: string }>;

    const tokenResult = await this.getAccessToken();
    if (!tokenResult.success) return tokenResult as Result<{ messageId: string }>;

    const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
    const messageIds: string[] = [];
    const errors: string[] = [];

    // Send to all registered devices
    for (const fcmToken of recipient.fcmTokens) {
      const fcmPayload = {
        message: {
          token: fcmToken,
          notification: {
            title: notification.pushTitle || 'Scholarly',
            body: notification.textBody,
            ...(notification.pushImageUrl ? { image: notification.pushImageUrl } : {}),
          },
          data: notification.pushData || {},
          android: {
            priority: 'high' as const,
            notification: {
              icon: this.config.defaultIcon || 'ic_notification',
              channel_id: 'scholarly_default',
              click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
          },
          apns: {
            payload: {
              aps: {
                badge: 1,
                sound: 'default',
                'content-available': 1,
              },
            },
          },
          webpush: {
            headers: { Urgency: 'high' },
            notification: {
              icon: this.config.defaultIcon || '/icon-192.png',
              badge: '/badge-96.png',
            },
          },
        },
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenResult.data}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fcmPayload),
        });

        if (response.ok) {
          const body = await response.json() as { name: string };
          messageIds.push(body.name);
        } else {
          const body = await response.json() as { error?: { message?: string; code?: number } };
          const errorMsg = body.error?.message || `FCM ${response.status}`;

          // Token no longer valid — should be removed from user profile
          if (response.status === 404 || response.status === 410) {
            this.logger.warn({
              channel: 'push',
              fcmToken: fcmToken.substring(0, 10) + '...',
              action: 'token_expired',
            }, 'FCM token expired, should be removed');
          }

          errors.push(errorMsg);
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Network error');
      }
    }

    if (messageIds.length > 0) {
      this.logger.info({
        channel: 'push',
        recipientId: recipient.userId,
        messageIds,
        deviceCount: recipient.fcmTokens.length,
        successCount: messageIds.length,
        errorCount: errors.length,
      }, 'Push notifications sent via FCM');

      return {
        success: true,
        data: { messageId: messageIds[0], cost: 0 }, // FCM is free
      };
    }

    return {
      success: false,
      error: {
        code: 'FCM_ALL_FAILED',
        message: `All ${recipient.fcmTokens.length} FCM sends failed`,
        details: { errors, retriable: true },
      },
    };
  }
}

// ============================================================================
// SECTION 4: PREFERENCE ROUTER
// ============================================================================

/**
 * PreferenceRouter determines which channels to use for a given notification.
 *
 * The routing algorithm respects a hierarchy of decisions:
 *
 * 1. Critical priority → all available channels (override everything)
 * 2. Channel override on the request → use those channels
 * 3. User's per-type preference → use the user's chosen channels
 * 4. Default channel mapping → sensible defaults per notification type
 *
 * Quiet hours are enforced for non-critical notifications: if it's 2 AM
 * in the user's timezone, email and in-app are fine, but SMS and push
 * are deferred.
 */
export class PreferenceRouter {
  /** Default channels per notification type when user has no preference */
  private static readonly DEFAULT_CHANNELS: Partial<Record<NotificationType, NotificationChannel[]>> = {
    // Auth — email only (security sensitive, audit trail needed)
    auth_verification: ['email'],
    auth_password_reset: ['email'],
    auth_login_alert: ['email', 'push'],

    // Payment — email + push (needs receipt + immediacy)
    payment_receipt: ['email'],
    payment_failed: ['email', 'push'],
    subscription_created: ['email'],
    subscription_cancelled: ['email'],
    subscription_renewal: ['email'],

    // Learning — push + in-app (parent engagement)
    learning_progress: ['push', 'in_app'],
    learning_milestone: ['push', 'in_app'],
    learning_concern: ['email', 'push'],

    // Wellbeing — email + push (urgency varies)
    wellbeing_alert: ['email', 'push', 'sms'],
    wellbeing_checkin_reminder: ['push', 'in_app'],

    // Parent Portal — multi-channel
    parent_meeting_scheduled: ['email', 'push'],
    parent_report_available: ['email', 'push'],
    parent_consent_required: ['email', 'push', 'sms'],

    // Content — email + in-app
    storybook_published: ['email', 'in_app'],
    storybook_review_complete: ['email', 'push'],
    content_bounty_posted: ['email', 'in_app'],
    content_bounty_awarded: ['email', 'push'],
    creator_payout: ['email'],

    // Arena — push (time-sensitive)
    arena_challenge: ['push', 'in_app'],
    arena_result: ['push', 'in_app'],

    // Governance — email + push
    governance_proposal: ['email', 'push'],
    governance_vote_reminder: ['email', 'push'],

    // System — email
    system_maintenance: ['email'],
    system_announcement: ['email', 'push'],
  };

  /** Channels that respect quiet hours (SMS and push disturb; email doesn't) */
  private static readonly QUIET_SENSITIVE: Set<NotificationChannel> = new Set(['sms', 'push']);

  /**
   * Determine which channels to deliver a notification through.
   *
   * Returns only channels where the recipient has valid contact info
   * and hasn't muted the notification type.
   */
  route(
    request: NotificationRequest,
    recipient: RecipientProfile
  ): NotificationChannel[] {
    // Muted types are silently dropped (except critical)
    if (recipient.mutedTypes.includes(request.type) && request.priority !== 'critical') {
      return ['in_app']; // Always deliver in-app even if muted
    }

    // Determine raw channel list
    let channels: NotificationChannel[];

    if (request.priority === 'critical') {
      // Critical: all available channels
      channels = ['email', 'sms', 'push', 'in_app'];
    } else if (request.channelOverride && request.channelOverride.length > 0) {
      channels = [...request.channelOverride];
    } else if (recipient.channelPreferences[request.type]) {
      channels = [...recipient.channelPreferences[request.type]!];
    } else {
      channels = [...(PreferenceRouter.DEFAULT_CHANNELS[request.type] || ['email', 'in_app'])];
    }

    // Filter to channels with valid contact info
    channels = channels.filter(ch => this.hasValidContact(ch, recipient));

    // Apply quiet hours (defer disruptive channels during sleep)
    if (request.priority !== 'critical' && this.isQuietHours(recipient)) {
      channels = channels.filter(ch => !PreferenceRouter.QUIET_SENSITIVE.has(ch));
      // Ensure at least in_app survives
      if (!channels.includes('in_app')) {
        channels.push('in_app');
      }
    }

    // Always include in_app as a baseline
    if (!channels.includes('in_app')) {
      channels.push('in_app');
    }

    return [...new Set(channels)]; // Deduplicate
  }

  private hasValidContact(channel: NotificationChannel, recipient: RecipientProfile): boolean {
    switch (channel) {
      case 'email': return !!recipient.email && recipient.emailVerified;
      case 'sms': return !!recipient.phone && recipient.phoneVerified;
      case 'push': return recipient.fcmTokens.length > 0;
      case 'in_app': return true; // Always available
      default: return false;
    }
  }

  private isQuietHours(recipient: RecipientProfile): boolean {
    if (!recipient.quietHoursStart || !recipient.quietHoursEnd) return false;

    try {
      const now = new Date();
      // Simple local time check — in production, use the recipient's timezone
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = recipient.quietHoursStart.split(':').map(Number);
      const [endH, endM] = recipient.quietHoursEnd.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes <= endMinutes) {
        // Same day range: e.g., 08:00 - 17:00
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        // Overnight range: e.g., 22:00 - 07:00
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch {
      return false;
    }
  }
}

// ============================================================================
// SECTION 5: DELIVERY TRACKER
// ============================================================================

/**
 * DeliveryTracker manages the lifecycle of notification delivery attempts.
 *
 * Like a package tracking system, it maintains a record of every send
 * attempt, handles retries with exponential backoff, and publishes
 * status change events so that other systems can react.
 */
export class DeliveryTracker {
  private records: Map<string, DeliveryRecord> = new Map();
  private idempotencySet: Set<string> = new Set();

  constructor(
    private config: NotificationConfig['delivery'],
    private logger: Logger,
    private eventPublisher?: (subject: string, data: unknown) => Promise<void>
  ) {}

  /**
   * Check if a notification with this idempotency key has already been processed.
   * Prevents duplicate sends when the notification service restarts mid-batch.
   */
  isDuplicate(idempotencyKey: string): boolean {
    return this.idempotencySet.has(idempotencyKey);
  }

  /** Register an idempotency key as processed */
  markProcessed(idempotencyKey: string): void {
    this.idempotencySet.add(idempotencyKey);
  }

  /** Create a new delivery record when a send is initiated */
  createRecord(notificationId: string, channel: NotificationChannel): DeliveryRecord {
    const record: DeliveryRecord = {
      id: generateId(),
      notificationId,
      channel,
      status: 'queued',
      attemptCount: 0,
    };
    this.records.set(record.id, record);
    return record;
  }

  /** Update delivery status and publish event */
  async updateStatus(
    recordId: string,
    status: DeliveryStatus,
    details?: Partial<DeliveryRecord>
  ): Promise<void> {
    const record = this.records.get(recordId);
    if (!record) return;

    const previousStatus = record.status;
    record.status = status;

    if (details) {
      if (details.providerMessageId) record.providerMessageId = details.providerMessageId;
      if (details.lastError) record.lastError = details.lastError;
      if (details.cost !== undefined) record.cost = details.cost;
      if (status === 'sent') record.sentAt = new Date();
      if (status === 'delivered') record.deliveredAt = new Date();
      if (status === 'read') record.readAt = new Date();
    }

    this.logger.info({
      recordId,
      notificationId: record.notificationId,
      channel: record.channel,
      previousStatus,
      newStatus: status,
      attemptCount: record.attemptCount,
    }, 'Delivery status updated');

    // Publish event for other modules to consume
    if (this.eventPublisher) {
      await this.eventPublisher('notification.delivery.status', {
        recordId,
        notificationId: record.notificationId,
        channel: record.channel,
        status,
        previousStatus,
        timestamp: new Date().toISOString(),
      }).catch(err => {
        this.logger.error({ err }, 'Failed to publish delivery status event');
      });
    }
  }

  /**
   * Determine if a failed delivery should be retried.
   *
   * Exponential backoff with jitter: delay = min(base * 2^attempt + jitter, maxDelay)
   * This prevents thundering herds when a provider recovers from an outage.
   */
  shouldRetry(recordId: string): { retry: boolean; delayMs?: number } {
    const record = this.records.get(recordId);
    if (!record) return { retry: false };

    if (record.attemptCount >= this.config.maxRetries) {
      return { retry: false };
    }

    const baseDelay = this.config.retryBaseDelayMs * Math.pow(2, record.attemptCount);
    const jitter = Math.random() * this.config.retryBaseDelayMs;
    const delay = Math.min(baseDelay + jitter, this.config.retryMaxDelayMs);

    return { retry: true, delayMs: delay };
  }

  /** Increment attempt counter and schedule next retry */
  async scheduleRetry(recordId: string, delayMs: number): Promise<void> {
    const record = this.records.get(recordId);
    if (!record) return;

    record.attemptCount++;
    record.status = 'retrying';
    record.nextRetryAt = new Date(Date.now() + delayMs);

    this.logger.info({
      recordId,
      attemptCount: record.attemptCount,
      nextRetryAt: record.nextRetryAt.toISOString(),
      delayMs,
    }, 'Delivery retry scheduled');
  }

  /** Get all records for a notification (across channels) */
  getRecordsForNotification(notificationId: string): DeliveryRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.notificationId === notificationId);
  }

  /** Get records that are due for retry */
  getPendingRetries(): DeliveryRecord[] {
    const now = Date.now();
    return Array.from(this.records.values())
      .filter(r => r.status === 'retrying' && r.nextRetryAt && r.nextRetryAt.getTime() <= now);
  }
}

// ============================================================================
// SECTION 6: NOTIFICATION SERVICE (ORCHESTRATOR)
// ============================================================================

/**
 * NotificationService is the main entry point for sending notifications.
 *
 * It orchestrates the full delivery pipeline:
 *
 *   Request → Idempotency check → Recipient resolution → Preference routing
 *   → Template rendering → Channel dispatch → Delivery tracking → Event publishing
 *
 * The service processes notifications asynchronously. The send() method
 * returns immediately after validation; actual delivery happens in the
 * background. Callers can poll delivery status via getDeliveryStatus()
 * or subscribe to NATS events for real-time updates.
 */
export class NotificationService {
  private providers: Map<NotificationChannel, IChannelProvider> = new Map();
  private templateEngine: TemplateEngine;
  private preferenceRouter: PreferenceRouter;
  private deliveryTracker: DeliveryTracker;
  private recipientResolver: (userId: string, tenantId: string) => Promise<RecipientProfile | null>;

  constructor(
    config: NotificationConfig,
    private logger: Logger,
    recipientResolver: (userId: string, tenantId: string) => Promise<RecipientProfile | null>,
    eventPublisher?: (subject: string, data: unknown) => Promise<void>
  ) {
    this.templateEngine = new TemplateEngine();
    this.preferenceRouter = new PreferenceRouter();
    this.deliveryTracker = new DeliveryTracker(config.delivery, logger, eventPublisher);

    // Wire up channel providers
    this.providers.set('email', new SendGridProvider(config.sendgrid, logger));
    this.providers.set('sms', new TwilioProvider(config.twilio, logger));
    this.providers.set('push', new FCMProvider(config.fcm, logger));

    this.recipientResolver = recipientResolver;

    this.logger.info(
      { channels: Array.from(this.providers.keys()) },
      'NotificationService initialised'
    );
  }

  /** Register notification templates (typically called at startup) */
  registerTemplates(templates: NotificationTemplate[]): void {
    this.templateEngine.registerBatch(templates);
    this.logger.info({ count: templates.length }, 'Notification templates registered');
  }

  /**
   * Send a notification. Returns immediately after validation;
   * delivery happens asynchronously.
   *
   * The returned notificationId can be used to check delivery status.
   */
  async send(request: NotificationRequest): Promise<Result<{ notificationId: string }>> {
    // 1. Idempotency check
    if (this.deliveryTracker.isDuplicate(request.idempotencyKey)) {
      this.logger.info(
        { idempotencyKey: request.idempotencyKey },
        'Duplicate notification detected, skipping'
      );
      return {
        success: true,
        data: { notificationId: `dup:${request.idempotencyKey}` },
      };
    }

    // 2. Resolve recipient
    const recipient = await this.recipientResolver(request.recipientId, request.tenantId);
    if (!recipient) {
      return {
        success: false,
        error: {
          code: 'RECIPIENT_NOT_FOUND',
          message: `No profile found for user ${request.recipientId} in tenant ${request.tenantId}`,
        },
      };
    }

    // 3. Route to channels
    const channels = this.preferenceRouter.route(request, recipient);
    if (channels.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_CHANNELS',
          message: 'No valid delivery channels for this recipient and notification type',
        },
      };
    }

    // 4. Mark as processed for idempotency
    this.deliveryTracker.markProcessed(request.idempotencyKey);
    const notificationId = generateId();

    // 5. Dispatch to each channel asynchronously
    this.dispatchToChannels(notificationId, request, recipient, channels).catch(err => {
      this.logger.error({ err, notificationId }, 'Background dispatch failed');
    });

    return { success: true, data: { notificationId } };
  }

  /**
   * Internal dispatch — sends rendered notifications to all target channels.
   * Handles retries for retriable failures.
   */
  private async dispatchToChannels(
    notificationId: string,
    request: NotificationRequest,
    recipient: RecipientProfile,
    channels: NotificationChannel[]
  ): Promise<void> {
    for (const channel of channels) {
      // Skip in_app — handled separately by the frontend via WebSocket
      if (channel === 'in_app') {
        const record = this.deliveryTracker.createRecord(notificationId, channel);
        await this.deliveryTracker.updateStatus(record.id, 'delivered');
        continue;
      }

      const provider = this.providers.get(channel);
      if (!provider) {
        this.logger.warn({ channel }, 'No provider registered for channel');
        continue;
      }

      // Render notification for this channel
      const rendered = this.templateEngine.render(
        request.type,
        channel,
        recipient.preferredLanguage,
        { ...request.data, notificationId, recipientName: recipient.userId }
      );

      // Create delivery record and attempt send
      const record = this.deliveryTracker.createRecord(notificationId, channel);
      await this.deliveryTracker.updateStatus(record.id, 'sending');

      const result = await provider.send(recipient, rendered);

      if (result.success) {
        await this.deliveryTracker.updateStatus(record.id, 'sent', {
          providerMessageId: result.data.messageId,
          cost: result.data.cost,
        });
      } else {
        // Check if retriable
        const isRetriable = (result.error.details as { retriable?: boolean })?.retriable ?? false;

        if (isRetriable) {
          const retryDecision = this.deliveryTracker.shouldRetry(record.id);
          if (retryDecision.retry && retryDecision.delayMs) {
            await this.deliveryTracker.updateStatus(record.id, 'failed', {
              lastError: result.error.message,
            });
            await this.deliveryTracker.scheduleRetry(record.id, retryDecision.delayMs);

            // Schedule the retry (in production, this would use a job queue)
            setTimeout(() => {
              this.retryDelivery(record.id, provider, recipient, rendered).catch(err => {
                this.logger.error({ err, recordId: record.id }, 'Retry failed');
              });
            }, retryDecision.delayMs);
          } else {
            await this.deliveryTracker.updateStatus(record.id, 'dropped', {
              lastError: `Max retries exceeded: ${result.error.message}`,
            });
          }
        } else {
          await this.deliveryTracker.updateStatus(record.id, 'bounced', {
            lastError: result.error.message,
          });
        }
      }
    }
  }

  /** Retry a failed delivery attempt */
  private async retryDelivery(
    recordId: string,
    provider: IChannelProvider,
    recipient: RecipientProfile,
    notification: RenderedNotification
  ): Promise<void> {
    const result = await provider.send(recipient, notification);

    if (result.success) {
      await this.deliveryTracker.updateStatus(recordId, 'sent', {
        providerMessageId: result.data.messageId,
        cost: result.data.cost,
      });
    } else {
      const isRetriable = (result.error.details as { retriable?: boolean })?.retriable ?? false;
      const retryDecision = this.deliveryTracker.shouldRetry(recordId);

      if (isRetriable && retryDecision.retry && retryDecision.delayMs) {
        await this.deliveryTracker.scheduleRetry(recordId, retryDecision.delayMs);
        setTimeout(() => {
          this.retryDelivery(recordId, provider, recipient, notification).catch(err => {
            this.logger.error({ err, recordId }, 'Retry failed');
          });
        }, retryDecision.delayMs);
      } else {
        await this.deliveryTracker.updateStatus(recordId, 'dropped', {
          lastError: `Exhausted retries: ${result.error.message}`,
        });
      }
    }
  }

  /**
   * Send a batch of notifications efficiently.
   * Useful for bulk operations like report card distribution.
   */
  async sendBatch(requests: NotificationRequest[]): Promise<Result<{
    total: number;
    accepted: number;
    rejected: number;
    results: Array<{ idempotencyKey: string; result: Result<{ notificationId: string }> }>;
  }>> {
    const results: Array<{ idempotencyKey: string; result: Result<{ notificationId: string }> }> = [];
    let accepted = 0;
    let rejected = 0;

    // Process in chunks to respect rate limits
    const chunks = chunk(requests, this.deliveryTracker['config'].batchSize);

    for (const batch of chunks) {
      const batchResults = await Promise.allSettled(
        batch.map(req => this.send(req))
      );

      for (let i = 0; i < batchResults.length; i++) {
        const settled = batchResults[i];
        const request = batch[i];

        if (settled.status === 'fulfilled') {
          results.push({ idempotencyKey: request.idempotencyKey, result: settled.value });
          if (settled.value.success) accepted++;
          else rejected++;
        } else {
          rejected++;
          results.push({
            idempotencyKey: request.idempotencyKey,
            result: {
              success: false,
              error: { code: 'BATCH_ERROR', message: settled.reason?.message || 'Unknown error' },
            },
          });
        }
      }
    }

    this.logger.info({
      total: requests.length,
      accepted,
      rejected,
    }, 'Batch notification send complete');

    return {
      success: true,
      data: { total: requests.length, accepted, rejected, results },
    };
  }

  /** Get delivery status for a notification across all channels */
  getDeliveryStatus(notificationId: string): DeliveryRecord[] {
    return this.deliveryTracker.getRecordsForNotification(notificationId);
  }

  /** Process webhook callbacks from providers (SendGrid, Twilio) */
  async processWebhook(
    provider: 'sendgrid' | 'twilio',
    payload: Record<string, unknown>
  ): Promise<void> {
    // In production, this maps provider-specific webhook payloads
    // to delivery status updates using the providerMessageId as the lookup key
    this.logger.info({ provider, eventType: payload.event || payload.MessageStatus }, 'Webhook received');

    // SendGrid events: delivered, bounce, open, click, dropped, deferred
    // Twilio events: sent, delivered, undelivered, failed
    // These would look up the delivery record by providerMessageId
    // and update status accordingly
  }
}

// ============================================================================
// SECTION 7: UTILITY FUNCTIONS
// ============================================================================

/** Escape HTML entities for safe template rendering */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** Convert notification type enum to human-readable string */
function humanizeType(type: NotificationType): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Basic email validation */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate E.164 phone number format */
function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

/** Mask phone number for logging (show country code + last 4) */
function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  return phone.substring(0, 3) + '***' + phone.substring(phone.length - 4);
}

/** Truncate SMS to 1600 characters (10 segments max) */
function truncateSms(text: string): string {
  return text.length > 1600 ? text.substring(0, 1597) + '...' : text;
}

/** Generate a unique ID */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `ntf_${timestamp}_${random}`;
}

/** Split array into chunks */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ============================================================================
// SECTION 8: DEFAULT TEMPLATES
// ============================================================================

/**
 * Default notification templates for core notification types.
 * These are registered at startup and can be overridden per-tenant
 * via the admin interface.
 */
export const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  // --- Auth Templates ---
  {
    type: 'auth_verification',
    channel: 'email',
    locale: 'en',
    version: 1,
    subject: 'Verify your Scholarly account',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#1a73e8">Welcome to Scholarly!</h2>
      <p>Please verify your email address by clicking the button below:</p>
      <a href="{{verificationUrl}}" style="display:inline-block;padding:12px 24px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Verify Email</a>
      <p style="color:#666;font-size:14px">If you didn't create a Scholarly account, you can safely ignore this email.</p>
    </div>`,
    text: 'Welcome to Scholarly! Verify your email: {{verificationUrl}}',
  },
  {
    type: 'auth_password_reset',
    channel: 'email',
    locale: 'en',
    version: 1,
    subject: 'Reset your Scholarly password',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2>Password Reset</h2>
      <p>Click below to reset your password. This link expires in {{expiryMinutes}} minutes.</p>
      <a href="{{resetUrl}}" style="display:inline-block;padding:12px 24px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Reset Password</a>
      <p style="color:#666;font-size:14px">If you didn't request this, please ignore this email. Your password remains unchanged.</p>
    </div>`,
    text: 'Reset your Scholarly password (expires in {{expiryMinutes}} min): {{resetUrl}}',
  },

  // --- Payment Templates ---
  {
    type: 'payment_receipt',
    channel: 'email',
    locale: 'en',
    version: 1,
    subject: 'Scholarly Payment Receipt — {{amount}}',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2>Payment Receipt</h2>
      <p>Thank you for your payment of <strong>{{amount}}</strong> for {{planName}}.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Plan</td><td style="padding:8px;border-bottom:1px solid #eee">{{planName}}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Amount</td><td style="padding:8px;border-bottom:1px solid #eee">{{amount}}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Date</td><td style="padding:8px;border-bottom:1px solid #eee">{{date}}</td></tr>
        <tr><td style="padding:8px">Invoice #</td><td style="padding:8px">{{invoiceNumber}}</td></tr>
      </table>
      <a href="{{receiptUrl}}" style="color:#1a73e8">View full receipt</a>
    </div>`,
    text: 'Payment receipt: {{amount}} for {{planName}} on {{date}}. Invoice #{{invoiceNumber}}. View: {{receiptUrl}}',
  },
  {
    type: 'payment_failed',
    channel: 'email',
    locale: 'en',
    version: 1,
    subject: 'Action Required: Scholarly payment failed',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#e74c3c">Payment Failed</h2>
      <p>We were unable to process your payment of <strong>{{amount}}</strong> for {{planName}}.</p>
      <p>Please update your payment method to continue your subscription:</p>
      <a href="{{updateUrl}}" style="display:inline-block;padding:12px 24px;background:#e74c3c;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Update Payment Method</a>
      <p style="color:#666;font-size:14px">Your subscription will remain active for {{gracePeriodDays}} days.</p>
    </div>`,
    text: 'Payment of {{amount}} for {{planName}} failed. Update payment method: {{updateUrl}}. Grace period: {{gracePeriodDays}} days.',
  },
  {
    type: 'payment_failed',
    channel: 'push',
    locale: 'en',
    version: 1,
    pushTitle: 'Payment Failed',
    text: 'Your {{planName}} payment of {{amount}} could not be processed. Tap to update.',
  },

  // --- Learning Templates ---
  {
    type: 'learning_milestone',
    channel: 'push',
    locale: 'en',
    version: 1,
    pushTitle: '🎉 {{childName}} reached a milestone!',
    text: '{{childName}} has mastered {{milestoneName}}! Tap to see their progress.',
  },
  {
    type: 'learning_milestone',
    channel: 'email',
    locale: 'en',
    version: 1,
    subject: '🎉 {{childName}} reached a learning milestone!',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#27ae60">Milestone Achieved!</h2>
      <p><strong>{{childName}}</strong> has mastered <strong>{{milestoneName}}</strong>!</p>
      <p>{{milestoneDescription}}</p>
      <a href="{{progressUrl}}" style="display:inline-block;padding:12px 24px;background:#27ae60;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">View Progress</a>
    </div>`,
    text: '{{childName}} has mastered {{milestoneName}}! View progress: {{progressUrl}}',
  },
  {
    type: 'learning_concern',
    channel: 'email',
    locale: 'en',
    version: 1,
    subject: 'Learning Update for {{childName}}',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2>Learning Update</h2>
      <p>We've noticed {{childName}} may benefit from extra support in <strong>{{areaName}}</strong>.</p>
      <p>{{concernDescription}}</p>
      <p>Here's what you can do to help at home:</p>
      <p>{{homeSupport}}</p>
      <a href="{{detailsUrl}}" style="color:#1a73e8">View detailed progress report</a>
    </div>`,
    text: 'Learning update for {{childName}}: {{concernDescription}}. Home support: {{homeSupport}}',
  },

  // --- Wellbeing Templates ---
  {
    type: 'wellbeing_alert',
    channel: 'email',
    locale: 'en',
    version: 1,
    subject: 'Important: Wellbeing alert for {{childName}}',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#e74c3c">Wellbeing Alert</h2>
      <p>Our wellbeing monitoring system has flagged a concern for <strong>{{childName}}</strong>.</p>
      <p><strong>Area:</strong> {{domain}}</p>
      <p><strong>Summary:</strong> {{summary}}</p>
      <p>Please review the details and contact the school if you have any concerns:</p>
      <a href="{{detailsUrl}}" style="display:inline-block;padding:12px 24px;background:#e74c3c;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">View Details</a>
    </div>`,
    text: 'Wellbeing alert for {{childName}} — {{domain}}: {{summary}}. View: {{detailsUrl}}',
  },
  {
    type: 'wellbeing_alert',
    channel: 'push',
    locale: 'en',
    version: 1,
    pushTitle: 'Wellbeing Alert: {{childName}}',
    text: '{{domain}}: {{summary}}. Tap to view details.',
  },
  {
    type: 'wellbeing_alert',
    channel: 'sms',
    locale: 'en',
    version: 1,
    text: 'Scholarly: Wellbeing alert for {{childName}} — {{domain}}: {{summary}}. View: {{detailsUrl}}',
  },

  // --- Parent Portal Templates ---
  {
    type: 'parent_meeting_scheduled',
    channel: 'email',
    locale: 'en',
    version: 1,
    subject: 'Meeting Scheduled: {{meetingType}} for {{childName}}',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2>Meeting Scheduled</h2>
      <p>A <strong>{{meetingType}}</strong> meeting has been scheduled for {{childName}}.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Date</td><td style="padding:8px;border-bottom:1px solid #eee">{{date}}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Time</td><td style="padding:8px;border-bottom:1px solid #eee">{{time}}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Teacher</td><td style="padding:8px;border-bottom:1px solid #eee">{{teacherName}}</td></tr>
        <tr><td style="padding:8px">Location</td><td style="padding:8px">{{location}}</td></tr>
      </table>
      <a href="{{meetingUrl}}" style="display:inline-block;padding:12px 24px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">View Meeting Details</a>
    </div>`,
    text: '{{meetingType}} meeting for {{childName}} on {{date}} at {{time}} with {{teacherName}}. Location: {{location}}. Details: {{meetingUrl}}',
  },
  {
    type: 'parent_report_available',
    channel: 'push',
    locale: 'en',
    version: 1,
    pushTitle: '📊 Report card available',
    text: '{{childName}}\'s {{reportType}} report is ready. Tap to view.',
  },
  {
    type: 'parent_consent_required',
    channel: 'email',
    locale: 'en',
    version: 1,
    subject: 'Consent Required: {{consentType}} for {{childName}}',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2>Consent Required</h2>
      <p>Your consent is needed for <strong>{{consentType}}</strong> for {{childName}}.</p>
      <p>{{consentDescription}}</p>
      <p><strong>Response needed by:</strong> {{deadline}}</p>
      <a href="{{consentUrl}}" style="display:inline-block;padding:12px 24px;background:#f39c12;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Review & Respond</a>
    </div>`,
    text: 'Consent required for {{childName}}: {{consentType}}. Due: {{deadline}}. Respond: {{consentUrl}}',
  },

  // --- Storybook Templates ---
  {
    type: 'storybook_published',
    channel: 'email',
    locale: 'en',
    version: 1,
    subject: 'Your storybook "{{title}}" is now live!',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#27ae60">Published!</h2>
      <p>Great news — your storybook <strong>"{{title}}"</strong> has passed all quality checks and is now live in the Scholarly library!</p>
      <p>Learners at Phase {{phonicsPhase}} can now discover it.</p>
      <a href="{{bookUrl}}" style="display:inline-block;padding:12px 24px;background:#27ae60;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">View in Library</a>
    </div>`,
    text: 'Your storybook "{{title}}" is live! Phase {{phonicsPhase}} learners can now read it. View: {{bookUrl}}',
  },
  {
    type: 'storybook_review_complete',
    channel: 'email',
    locale: 'en',
    version: 1,
    subject: 'Review complete: "{{title}}"',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2>Review Complete</h2>
      <p>Your storybook <strong>"{{title}}"</strong> has been reviewed.</p>
      <p><strong>Result:</strong> {{reviewResult}}</p>
      {{#if feedback}}<p><strong>Feedback:</strong> {{feedback}}</p>{{/if}}
      <a href="{{reviewUrl}}" style="color:#1a73e8">View full review</a>
    </div>`,
    text: 'Review complete for "{{title}}": {{reviewResult}}. {{#if feedback}}Feedback: {{feedback}}. {{/if}}Details: {{reviewUrl}}',
  },

  // --- Creator Economy Templates ---
  {
    type: 'creator_payout',
    channel: 'email',
    locale: 'en',
    version: 1,
    subject: 'Payout Processed: {{amount}}',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#27ae60">Payout Processed</h2>
      <p>Your creator payout of <strong>{{amount}}</strong> has been processed and is on its way to your account.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Period</td><td style="padding:8px;border-bottom:1px solid #eee">{{period}}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Stories</td><td style="padding:8px;border-bottom:1px solid #eee">{{storyCount}} books</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Total Reads</td><td style="padding:8px;border-bottom:1px solid #eee">{{totalReads}}</td></tr>
        <tr><td style="padding:8px">Amount</td><td style="padding:8px"><strong>{{amount}}</strong></td></tr>
      </table>
      <a href="{{dashboardUrl}}" style="color:#1a73e8">View creator dashboard</a>
    </div>`,
    text: 'Creator payout: {{amount}} for {{period}} ({{storyCount}} books, {{totalReads}} reads). Dashboard: {{dashboardUrl}}',
  },
];
