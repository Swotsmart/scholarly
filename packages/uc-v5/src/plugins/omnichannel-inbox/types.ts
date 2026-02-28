/**
 * Scholarly Unified Communications 4.0 — Omnichannel Inbox Type System
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ONE INBOX, EVERY CONVERSATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Think of a postal sorting office in the 1900s: letters, telegrams,
 * and parcels all arrive through different doors, but they're all sorted
 * onto the same shelves, addressed with the same format, and delivered
 * by the same carriers. The sorting office doesn't care whether the
 * message arrived by horse or by train — it cares about who it's for
 * and where it needs to go.
 *
 * The Omnichannel Inbox is that sorting office. Messages arrive from
 * WhatsApp, SMS, email, web chat, and social channels through their
 * respective adapters. Each adapter translates the channel-specific
 * format into a universal OmniMessage. From that point on, the platform
 * treats every message identically: it's routed through the Contact
 * Centre queue, matched to an agent, displayed in the unified
 * conversation view, and replies are sent back through the originating
 * channel's adapter.
 *
 * Key types:
 *   OmniChannel      — Which channel a message came from
 *   OmniMessage      — The universal message unit (text, media, template)
 *   OmniConversation — A thread of messages between a customer and agent(s)
 *   ChannelAdapter    — The contract any channel must implement
 *   AgentDesktopState — What the agent's unified inbox looks like
 */

// ─── Channels ───────────────────────────────────────────────────────

export type OmniChannel = 'WHATSAPP' | 'SMS' | 'WEB_CHAT' | 'EMAIL' | 'FACEBOOK' | 'INSTAGRAM' | 'TWITTER' | 'LINE' | 'TELEGRAM';

/** Channel capabilities — not all channels support all message types */
export interface ChannelCapabilities {
  channel: OmniChannel;
  supportsMedia: boolean;
  supportsTemplates: boolean;
  supportsReactions: boolean;
  supportsReadReceipts: boolean;
  supportsTypingIndicators: boolean;
  maxMessageLength: number;
  supportedMediaTypes: string[]; // MIME types
  maxMediaSizeMb: number;
  supportsRichText: boolean; // HTML formatting
  supportsButtons: boolean; // Interactive buttons/quick replies
}

// ─── Messages ───────────────────────────────────────────────────────

export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
export type MessageType = 'TEXT' | 'MEDIA' | 'TEMPLATE' | 'INTERACTIVE' | 'LOCATION' | 'CONTACT_CARD' | 'SYSTEM';

export interface OmniMessage {
  id: string;
  conversationId: string;
  channel: OmniChannel;
  direction: MessageDirection;
  status: MessageStatus;
  type: MessageType;
  /** Sender identifier (phone number, email, user ID) */
  senderId: string;
  senderName?: string;
  /** Recipient identifier */
  recipientId: string;
  /** Text content (for TEXT, or caption for MEDIA) */
  text?: string;
  /** HTML content (for EMAIL or rich-text channels) */
  html?: string;
  /** Media attachments */
  media?: MessageMedia[];
  /** Template message (WhatsApp HSM, etc.) */
  template?: MessageTemplate;
  /** Interactive elements (buttons, quick replies, lists) */
  interactive?: MessageInteractive;
  /** Location data */
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  /** Contact card */
  contactCard?: { name: string; phone?: string; email?: string };
  /** Email-specific fields */
  emailFields?: EmailFields;
  /** Channel-native message ID (for status tracking) */
  channelMessageId?: string;
  /** Agent who sent this (for outbound messages) */
  agentUserId?: string;
  agentName?: string;
  /** Automated / bot message flag */
  isAutomated: boolean;
  /** Metadata from the channel */
  metadata?: Record<string, unknown>;
  /** Timestamps */
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  tenantId: string;
}

export interface MessageMedia {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER';
  mimeType: string;
  url: string;
  filename?: string;
  sizeBytes?: number;
  caption?: string;
  /** Thumbnail URL for images/videos */
  thumbnailUrl?: string;
}

export interface MessageTemplate {
  /** Template name (registered with channel provider) */
  name: string;
  /** Language code (e.g., 'en_US') */
  language: string;
  /** Template parameters */
  parameters: Record<string, string>;
  /** Category (WhatsApp: UTILITY, MARKETING, AUTHENTICATION) */
  category?: string;
}

export interface MessageInteractive {
  type: 'BUTTONS' | 'QUICK_REPLIES' | 'LIST';
  /** Header text */
  header?: string;
  /** Body text */
  body: string;
  /** Footer text */
  footer?: string;
  /** Buttons or quick reply options */
  actions: InteractiveAction[];
}

export interface InteractiveAction {
  type: 'BUTTON' | 'URL' | 'PHONE' | 'LIST_ITEM';
  id: string;
  label: string;
  /** URL for URL type */
  url?: string;
  /** Phone number for PHONE type */
  phone?: string;
  /** Description for LIST_ITEM type */
  description?: string;
}

export interface EmailFields {
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  inReplyTo?: string;
  references?: string[];
  threadId?: string;
}

// ─── Conversations ──────────────────────────────────────────────────

export type ConversationStatus = 'QUEUED' | 'ACTIVE' | 'WAITING_CUSTOMER' | 'WAITING_AGENT' | 'RESOLVED' | 'CLOSED';
export type ConversationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface OmniConversation {
  id: string;
  /** Primary channel (the channel the customer initiated on) */
  channel: OmniChannel;
  /** Customer identifier */
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  /** Customer's channel-specific address (WhatsApp number, email, etc.) */
  customerAddress: string;
  /** Assigned agent */
  assignedAgentId?: string;
  assignedAgentName?: string;
  /** Queue this conversation is in (if queued) */
  queueId?: string;
  /** CC queue entry ID (links to Contact Centre) */
  queueEntryId?: string;
  /** CRM contact ID (from screen pop) */
  crmContactId?: string;
  /** Status */
  status: ConversationStatus;
  priority: ConversationPriority;
  /** Subject (for email) or first message preview */
  subject?: string;
  /** Tags for categorisation */
  tags: string[];
  /** Message count */
  messageCount: number;
  /** Unread count (for agent) */
  unreadCount: number;
  /** Last message preview */
  lastMessagePreview?: string;
  lastMessageAt?: Date;
  /** SLA tracking */
  firstResponseAt?: Date;
  firstResponseTimeSeconds?: number;
  /** Disposition/resolution category */
  disposition?: string;
  resolutionNotes?: string;
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  /** Tenant */
  tenantId: string;
  /** Conversation metadata */
  metadata?: Record<string, unknown>;
}

// ─── Agent Desktop State ────────────────────────────────────────────

export interface AgentDesktopState {
  agentId: string;
  /** Active conversations the agent is handling */
  activeConversations: AgentConversationSlot[];
  /** Maximum concurrent conversations (from CC agent config) */
  maxConcurrent: number;
  /** Available capacity */
  availableSlots: number;
  /** Total unread messages across all conversations */
  totalUnread: number;
}

export interface AgentConversationSlot {
  conversationId: string;
  channel: OmniChannel;
  customerName: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageAt?: Date;
  /** Time since customer's last message (for SLA tracking) */
  waitingSeconds: number;
  /** Whether this conversation needs attention (customer waiting) */
  needsAttention: boolean;
}

// ─── Channel Adapter Contract ───────────────────────────────────────

/**
 * The contract that every channel adapter implements. Like the CRM
 * provider interface, this is the USB-C spec for messaging channels.
 * The framework handles routing and agent assignment; the adapter
 * handles the channel-specific wire protocol.
 */
export interface ChannelAdapter {
  /** Channel identifier */
  readonly channel: OmniChannel;
  /** Channel capabilities */
  readonly capabilities: ChannelCapabilities;

  /** Initialise the adapter (set up webhooks, connect to APIs) */
  initialize(config: ChannelConfig): Promise<void>;

  /** Test connectivity */
  testConnection(): Promise<{ connected: boolean; error?: string }>;

  /** Send a message through this channel */
  sendMessage(message: OutboundMessage): Promise<{ channelMessageId: string; status: MessageStatus }>;

  /** Send a template message (WhatsApp HSM, etc.) */
  sendTemplate?(recipientId: string, template: MessageTemplate): Promise<{ channelMessageId: string; status: MessageStatus }>;

  /** Mark a message as read (if supported) */
  markRead?(channelMessageId: string): Promise<void>;

  /** Send typing indicator (if supported) */
  sendTypingIndicator?(recipientId: string): Promise<void>;

  /** Get message delivery status */
  getMessageStatus?(channelMessageId: string): Promise<MessageStatus>;

  /** Parse an inbound webhook payload into an OmniMessage */
  parseInboundWebhook(payload: any, headers?: Record<string, string>): InboundWebhookResult;

  /** Validate webhook signature (security) */
  validateWebhookSignature(payload: any, signature: string, headers?: Record<string, string>): boolean;

  /** Shutdown */
  shutdown(): Promise<void>;
}

export interface OutboundMessage {
  recipientId: string;
  text?: string;
  html?: string;
  media?: MessageMedia[];
  interactive?: MessageInteractive;
  emailFields?: EmailFields;
  metadata?: Record<string, unknown>;
}

export interface InboundWebhookResult {
  /** Whether the payload was parsed successfully */
  success: boolean;
  /** The parsed message(s) — some webhooks batch multiple */
  messages: Omit<OmniMessage, 'id' | 'conversationId' | 'tenantId' | 'createdAt'>[];
  /** Status updates for previously sent messages */
  statusUpdates?: { channelMessageId: string; status: MessageStatus; timestamp: Date }[];
  /** Error if parsing failed */
  error?: string;
}

// ─── Channel Configuration ──────────────────────────────────────────

export interface ChannelConfig {
  channel: OmniChannel;
  isActive: boolean;
  tenantId: string;
  /** Channel-specific credentials */
  credentials: WhatsAppCredentials | SmsCredentials | EmailCredentials | WebChatCredentials | Record<string, unknown>;
  /** Queue to route inbound messages to */
  defaultQueueId: string;
  /** Default priority for inbound messages */
  defaultPriority: ConversationPriority;
  /** Auto-response when a conversation starts (before agent assignment) */
  autoResponse?: { enabled: boolean; message: string; delaySeconds?: number };
  /** Business hours — outside hours, send a different auto-response */
  businessHours?: { timezone: string; schedule: Record<number, { open: string; close: string }> };
  afterHoursResponse?: { enabled: boolean; message: string };
  /** Maximum conversation age before auto-close (hours) */
  autoCloseAfterHours?: number;
}

export interface WhatsAppCredentials {
  type: 'whatsapp';
  /** Meta Business API */
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
  businessAccountId?: string;
  apiVersion?: string;
}

export interface SmsCredentials {
  type: 'sms';
  provider: 'twilio' | 'vonage' | 'messagebird';
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  apiSecret?: string;
  fromNumber: string;
  webhookUrl?: string;
}

export interface EmailCredentials {
  type: 'email';
  provider: 'sendgrid' | 'ses' | 'smtp' | 'postmark';
  fromAddress: string;
  fromName: string;
  apiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  /** Inbound parsing webhook URL (SendGrid/Postmark) */
  inboundWebhookUrl?: string;
}

export interface WebChatCredentials {
  type: 'web_chat';
  /** Widget configuration */
  widgetId: string;
  /** Allowed origins for CORS */
  allowedOrigins: string[];
  /** Theme customisation */
  theme?: { primaryColor: string; headerText: string; avatarUrl?: string };
  /** Pre-chat form fields */
  preChatForm?: { fields: { name: string; label: string; type: string; required: boolean }[] };
}

// ─── Events ─────────────────────────────────────────────────────────

export interface OmniEventPayloads {
  'omni:message-received': { conversationId: string; messageId: string; channel: OmniChannel; senderId: string; tenantId: string };
  'omni:message-sent': { conversationId: string; messageId: string; channel: OmniChannel; agentId: string; tenantId: string };
  'omni:message-delivered': { conversationId: string; messageId: string; channel: OmniChannel; tenantId: string };
  'omni:message-read': { conversationId: string; messageId: string; channel: OmniChannel; tenantId: string };
  'omni:message-failed': { conversationId: string; messageId: string; channel: OmniChannel; error: string; tenantId: string };
  'omni:conversation-created': { conversationId: string; channel: OmniChannel; customerId: string; tenantId: string };
  'omni:conversation-assigned': { conversationId: string; agentId: string; channel: OmniChannel; tenantId: string };
  'omni:conversation-resolved': { conversationId: string; agentId: string; handleTimeSeconds: number; messageCount: number; tenantId: string };
  'omni:conversation-closed': { conversationId: string; reason: string; tenantId: string };
  'omni:conversation-transferred': { conversationId: string; fromAgentId: string; toAgentId?: string; toQueueId?: string; tenantId: string };
  'omni:channel-connected': { channel: OmniChannel; tenantId: string };
  'omni:channel-error': { channel: OmniChannel; error: string; tenantId: string };
  'omni:customer-typing': { conversationId: string; customerId: string; tenantId: string };
  'omni:sla-warning': { conversationId: string; waitingSeconds: number; threshold: number; tenantId: string };
}
