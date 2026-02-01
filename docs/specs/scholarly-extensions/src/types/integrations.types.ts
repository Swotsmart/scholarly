/**
 * Scholarly Integrations Service - Type Definitions
 * 
 * Comprehensive types for integrating with external services:
 * - Canva (Design & Content Creation)
 * - Google Classroom (LMS)
 * - Gmail (Email)
 * - Outlook 365 (Email & Calendar)
 * - PayPal (Payments)
 * - PayID (Australian Instant Payments)
 * - Zimbra Mail (Email)
 * 
 * ## The Granny Explanation
 * 
 * Imagine Scholarly as a school building. But schools don't exist in isolation -
 * they need to connect to the outside world:
 * 
 * - Teachers want to create beautiful worksheets → Canva
 * - Schools already use Google Classroom → Need to sync assignments
 * - Parents want emails about their kids → Gmail/Outlook/Zimbra
 * - Tutors need to get paid → PayPal/PayID
 * 
 * This module is like the school's "connections department" - it handles all
 * the complexity of talking to these external systems, so the rest of Scholarly
 * just says "send an email" or "create a design" without worrying about the details.
 * 
 * ## Security Model
 * 
 * Each integration uses OAuth 2.0 where available, with tokens stored securely
 * and refreshed automatically. Credentials are never logged or exposed.
 * 
 * @module IntegrationsTypes
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * All supported integration providers
 */
export type IntegrationProvider = 
  | 'canva'
  | 'google_classroom'
  | 'gmail'
  | 'outlook_365'
  | 'paypal'
  | 'payid'
  | 'zimbra';

/**
 * Integration connection status
 */
export type ConnectionStatus = 
  | 'connected'
  | 'disconnected'
  | 'expired'
  | 'error'
  | 'pending_authorization';

/**
 * OAuth token storage
 */
export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: Date;
  scope: string[];
  
  // Provider-specific data
  providerUserId?: string;
  providerEmail?: string;
  additionalData?: Record<string, any>;
}

/**
 * Integration connection record
 */
export interface IntegrationConnection {
  id: string;
  tenantId: string;
  userId: string;
  
  provider: IntegrationProvider;
  status: ConnectionStatus;
  
  // Credentials (encrypted at rest)
  credentials?: OAuthCredentials;
  
  // API key based auth (for services without OAuth)
  apiKey?: string;
  
  // Connection metadata
  connectedAt: Date;
  lastUsedAt?: Date;
  lastSyncAt?: Date;
  errorMessage?: string;
  errorAt?: Date;
  
  // Settings
  settings: IntegrationSettings;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationSettings {
  // Sync settings
  autoSync: boolean;
  syncFrequencyMinutes?: number;
  
  // Notification settings
  notifyOnSync: boolean;
  notifyOnError: boolean;
  
  // Provider-specific settings
  providerSettings: Record<string, any>;
}

/**
 * Webhook event from external provider
 */
export interface IntegrationWebhook {
  id: string;
  provider: IntegrationProvider;
  eventType: string;
  payload: Record<string, any>;
  signature?: string;
  receivedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processed' | 'failed';
  error?: string;
}

/**
 * Generic operation result
 */
export interface IntegrationResult<T> {
  success: boolean;
  data?: T;
  error?: IntegrationError;
  warnings?: string[];
  metadata?: {
    requestId?: string;
    rateLimitRemaining?: number;
    processingTime?: number;
  };
}

export interface IntegrationError {
  code: string;
  message: string;
  provider: IntegrationProvider;
  recoverable: boolean;
  retryAfter?: number;  // seconds
  details?: Record<string, any>;
}

// ============================================================================
// CANVA TYPES
// ============================================================================

/**
 * Canva integration for design creation
 */
export interface CanvaIntegration {
  provider: 'canva';
  
  // User's Canva account info
  canvaUserId: string;
  canvaTeamId?: string;
  
  // Permissions
  permissions: CanvaPermission[];
  
  // Folders/projects
  defaultFolderId?: string;
  brandKitId?: string;
}

export type CanvaPermission = 
  | 'design:read'
  | 'design:write'
  | 'folder:read'
  | 'folder:write'
  | 'brand:read'
  | 'asset:read'
  | 'asset:write';

/**
 * Canva design types for education
 */
export type CanvaDesignType = 
  | 'presentation'
  | 'document'
  | 'worksheet'
  | 'certificate'
  | 'poster'
  | 'infographic'
  | 'social_media'
  | 'video'
  | 'whiteboard';

/**
 * Create design request
 */
export interface CanvaCreateDesignRequest {
  type: CanvaDesignType;
  title: string;
  
  // Template to start from
  templateId?: string;
  
  // Dimensions
  width?: number;
  height?: number;
  
  // Brand kit to use
  brandKitId?: string;
  
  // Folder to save to
  folderId?: string;
  
  // Initial content (AI-generated)
  initialContent?: {
    title?: string;
    subtitle?: string;
    bodyText?: string;
    images?: string[];  // URLs
  };
  
  // Metadata
  tags?: string[];
  description?: string;
}

export interface CanvaDesign {
  id: string;
  title: string;
  type: CanvaDesignType;
  
  // URLs
  editUrl: string;
  viewUrl: string;
  thumbnailUrl: string;
  
  // Export URLs (if generated)
  exportUrls?: {
    pdf?: string;
    png?: string;
    jpg?: string;
    pptx?: string;
  };
  
  // Dimensions
  width: number;
  height: number;
  
  // Ownership
  ownerId: string;
  folderId?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Canva template search
 */
export interface CanvaTemplateSearchRequest {
  query: string;
  type?: CanvaDesignType;
  category?: 'education' | 'business' | 'social' | 'marketing';
  limit?: number;
}

export interface CanvaTemplate {
  id: string;
  title: string;
  type: CanvaDesignType;
  thumbnailUrl: string;
  previewUrl: string;
  category: string;
  tags: string[];
}

// ============================================================================
// GOOGLE CLASSROOM TYPES
// ============================================================================

/**
 * Google Classroom integration
 */
export interface GoogleClassroomIntegration {
  provider: 'google_classroom';
  
  // Google account info
  googleUserId: string;
  email: string;
  
  // Permissions
  permissions: GoogleClassroomPermission[];
  
  // Synced courses
  syncedCourseIds: string[];
}

export type GoogleClassroomPermission = 
  | 'classroom.courses.readonly'
  | 'classroom.courses'
  | 'classroom.coursework.students.readonly'
  | 'classroom.coursework.students'
  | 'classroom.coursework.me.readonly'
  | 'classroom.coursework.me'
  | 'classroom.rosters.readonly'
  | 'classroom.rosters'
  | 'classroom.announcements.readonly'
  | 'classroom.announcements';

/**
 * Google Classroom course
 */
export interface GoogleClassroomCourse {
  id: string;
  name: string;
  section?: string;
  description?: string;
  room?: string;
  
  // Owner
  ownerId: string;
  ownerEmail: string;
  
  // Status
  courseState: 'active' | 'archived' | 'provisioned' | 'declined' | 'suspended';
  
  // Enrollment
  enrollmentCode?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Scholarly mapping
  scholarlyClassroomId?: string;
}

/**
 * Google Classroom assignment/coursework
 */
export interface GoogleClassroomAssignment {
  id: string;
  courseId: string;
  
  title: string;
  description?: string;
  
  // Type
  workType: 'assignment' | 'short_answer_question' | 'multiple_choice_question';
  
  // Due date
  dueDate?: Date;
  dueTime?: string;
  
  // Points
  maxPoints?: number;
  
  // Materials
  materials: GoogleClassroomMaterial[];
  
  // State
  state: 'published' | 'draft' | 'deleted';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  
  // Scholarly mapping
  scholarlyActivityId?: string;
}

export interface GoogleClassroomMaterial {
  type: 'drive_file' | 'youtube_video' | 'link' | 'form';
  
  // Drive file
  driveFile?: {
    id: string;
    title: string;
    alternateLink: string;
    thumbnailUrl?: string;
    shareMode: 'view' | 'edit' | 'student_copy';
  };
  
  // YouTube video
  youtubeVideo?: {
    id: string;
    title: string;
    alternateLink: string;
    thumbnailUrl?: string;
  };
  
  // Link
  link?: {
    url: string;
    title?: string;
    thumbnailUrl?: string;
  };
  
  // Form
  form?: {
    formUrl: string;
    title: string;
    thumbnailUrl?: string;
  };
}

/**
 * Google Classroom student submission
 */
export interface GoogleClassroomSubmission {
  id: string;
  courseId: string;
  courseWorkId: string;
  userId: string;
  
  // State
  state: 'new' | 'created' | 'turned_in' | 'returned' | 'reclaimed_by_student';
  
  // Grade
  assignedGrade?: number;
  draftGrade?: number;
  
  // Attachments
  attachments: GoogleClassroomMaterial[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  turnedInAt?: Date;
  returnedAt?: Date;
  
  // Late?
  late: boolean;
}

/**
 * Sync course request
 */
export interface GoogleClassroomSyncRequest {
  courseId: string;
  scholarlyClassroomId: string;
  
  // What to sync
  syncStudents: boolean;
  syncTeachers: boolean;
  syncAssignments: boolean;
  syncSubmissions: boolean;
  syncAnnouncements: boolean;
  
  // Direction
  direction: 'google_to_scholarly' | 'scholarly_to_google' | 'bidirectional';
}

export interface GoogleClassroomSyncResult {
  courseId: string;
  
  studentsAdded: number;
  studentsUpdated: number;
  
  teachersAdded: number;
  teachersUpdated: number;
  
  assignmentsCreated: number;
  assignmentsUpdated: number;
  
  submissionsSynced: number;
  
  errors: string[];
  warnings: string[];
  
  syncedAt: Date;
}

// ============================================================================
// EMAIL TYPES (Gmail, Outlook, Zimbra)
// ============================================================================

/**
 * Common email types shared across providers
 */
export interface EmailMessage {
  id: string;
  provider: 'gmail' | 'outlook_365' | 'zimbra';
  
  // Addresses
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  
  // Content
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  
  // Attachments
  attachments?: EmailAttachment[];
  
  // Threading
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
  
  // Metadata
  headers?: Record<string, string>;
  
  // Timestamps
  sentAt?: Date;
  receivedAt?: Date;
  
  // Status
  isRead?: boolean;
  isStarred?: boolean;
  labels?: string[];
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;  // For inline images
  data?: string;       // Base64 encoded content
  url?: string;        // Download URL
}

/**
 * Send email request
 */
export interface SendEmailRequest {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  
  attachments?: {
    filename: string;
    contentType: string;
    data: string;  // Base64
  }[];
  
  // Reply context
  inReplyTo?: string;
  threadId?: string;
  
  // Scheduling
  scheduledSendTime?: Date;
  
  // Tracking
  trackOpens?: boolean;
  trackClicks?: boolean;
  
  // Template
  templateId?: string;
  templateData?: Record<string, any>;
}

export interface SendEmailResult {
  messageId: string;
  threadId?: string;
  status: 'sent' | 'queued' | 'scheduled';
  sentAt?: Date;
  scheduledFor?: Date;
}

/**
 * Gmail-specific types
 */
export interface GmailIntegration {
  provider: 'gmail';
  googleUserId: string;
  email: string;
  
  // Labels we've created
  scholarlyLabels: {
    parents: string;
    teachers: string;
    students: string;
    notifications: string;
  };
  
  // Watch settings
  watchExpiration?: Date;
  historyId?: string;
}

/**
 * Outlook 365 types
 */
export interface Outlook365Integration {
  provider: 'outlook_365';
  microsoftUserId: string;
  email: string;
  
  // Tenant info
  tenantId?: string;
  
  // Calendar access
  calendarEnabled: boolean;
  defaultCalendarId?: string;
  
  // Folders
  scholarlyFolderId?: string;
}

/**
 * Outlook calendar event
 */
export interface OutlookCalendarEvent {
  id: string;
  
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  
  // Timing
  start: Date;
  end: Date;
  isAllDay: boolean;
  timeZone: string;
  
  // Location
  location?: {
    displayName: string;
    address?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  
  // Online meeting
  isOnlineMeeting: boolean;
  onlineMeetingUrl?: string;
  onlineMeetingProvider?: 'teams' | 'skype';
  
  // Attendees
  attendees: {
    email: string;
    name?: string;
    type: 'required' | 'optional' | 'resource';
    responseStatus: 'none' | 'organizer' | 'tentative' | 'accepted' | 'declined';
  }[];
  
  // Recurrence
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    daysOfWeek?: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[];
    endDate?: Date;
    occurrences?: number;
  };
  
  // Reminders
  reminders: {
    minutesBefore: number;
    method: 'popup' | 'email';
  }[];
  
  // Scholarly mapping
  scholarlyEventId?: string;
}

/**
 * Zimbra-specific types
 */
export interface ZimbraIntegration {
  provider: 'zimbra';
  
  // Server details
  serverUrl: string;
  
  // Account info
  zimbraAccountId: string;
  email: string;
  
  // Auth method
  authMethod: 'password' | 'preauth' | 'oauth';
  
  // Folders
  scholarlyFolderId?: string;
}

// ============================================================================
// PAYMENT TYPES (PayPal, PayID)
// ============================================================================

/**
 * PayPal integration
 */
export interface PayPalIntegration {
  provider: 'paypal';
  
  // PayPal account
  payPalAccountId: string;
  payPalEmail: string;
  
  // Merchant info
  merchantId?: string;
  
  // Capabilities
  capabilities: PayPalCapability[];
  
  // Webhook ID
  webhookId?: string;
}

export type PayPalCapability = 
  | 'receive_payments'
  | 'send_payments'
  | 'subscriptions'
  | 'invoicing'
  | 'payouts';

/**
 * PayPal payment request
 */
export interface PayPalPaymentRequest {
  // Amount
  amount: number;
  currency: string;  // ISO 4217
  
  // Description
  description: string;
  invoiceNumber?: string;
  
  // Recipient
  recipientEmail?: string;
  recipientPayPalId?: string;
  
  // Type
  paymentType: 'payment' | 'subscription' | 'payout';
  
  // For subscriptions
  subscriptionPlan?: {
    name: string;
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount: number;
    cycles?: number;  // 0 = infinite
  };
  
  // URLs
  returnUrl: string;
  cancelUrl: string;
  
  // Metadata
  metadata?: Record<string, string>;
}

export interface PayPalPayment {
  id: string;
  status: 'created' | 'approved' | 'completed' | 'cancelled' | 'failed' | 'refunded';
  
  // Amount
  amount: number;
  currency: string;
  
  // Fees
  fee?: number;
  netAmount?: number;
  
  // Payer
  payerEmail?: string;
  payerId?: string;
  
  // URLs
  approvalUrl?: string;
  
  // Timestamps
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  
  // Scholarly reference
  scholarlyPaymentId?: string;
}

export interface PayPalSubscription {
  id: string;
  status: 'approval_pending' | 'approved' | 'active' | 'suspended' | 'cancelled' | 'expired';
  
  // Plan
  planId: string;
  planName: string;
  
  // Subscriber
  subscriberEmail: string;
  subscriberId?: string;
  
  // Billing
  amount: number;
  currency: string;
  nextBillingDate?: Date;
  
  // Timestamps
  startedAt?: Date;
  createdAt: Date;
  
  // Scholarly reference
  scholarlySubscriptionId?: string;
}

/**
 * PayID integration (Australian NPP)
 */
export interface PayIDIntegration {
  provider: 'payid';
  
  // PayID details
  payId: string;
  payIdType: 'email' | 'phone' | 'abn' | 'organisation_id';
  
  // Bank details (for verification)
  bsb: string;
  accountNumber: string;
  accountName: string;
  
  // Bank
  bankCode: string;
  bankName: string;
  
  // Verification
  verifiedAt?: Date;
  verificationMethod: 'micro_deposit' | 'bank_statement' | 'manual';
}

/**
 * PayID payment request
 */
export interface PayIDPaymentRequest {
  // Recipient PayID
  recipientPayId: string;
  
  // Amount
  amount: number;  // In cents
  currency: 'AUD';
  
  // Reference
  reference: string;  // Max 280 chars
  
  // Optional end-to-end ID
  endToEndId?: string;
  
  // Metadata
  description?: string;
}

export interface PayIDPayment {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'returned';
  
  // Payment details
  amount: number;
  currency: 'AUD';
  reference: string;
  
  // Recipient
  recipientPayId: string;
  recipientName?: string;  // Returned by NPP
  
  // Timing
  initiatedAt: Date;
  completedAt?: Date;
  
  // NPP details
  nppTransactionId?: string;
  nppSettlementDate?: string;
  
  // Errors
  failureReason?: string;
  returnReason?: string;
  
  // Scholarly reference
  scholarlyPaymentId?: string;
}

// ============================================================================
// SYNC & WEBHOOK TYPES
// ============================================================================

/**
 * Sync job configuration
 */
export interface SyncJob {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  connectionId: string;
  
  // What to sync
  syncType: string;  // Provider-specific
  
  // Schedule
  scheduleType: 'manual' | 'scheduled' | 'webhook_triggered';
  cronExpression?: string;
  
  // Status
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRunAt?: Date;
  nextRunAt?: Date;
  
  // Results
  lastResult?: SyncJobResult;
  
  // Settings
  settings: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncJobResult {
  jobId: string;
  runId: string;
  
  status: 'success' | 'partial' | 'failed';
  
  // Counts
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsFailed: number;
  
  // Timing
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  
  // Errors
  errors: {
    recordId?: string;
    error: string;
  }[];
  
  // Warnings
  warnings: string[];
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  connectionId: string;
  
  // Webhook details
  webhookUrl: string;
  secret?: string;
  
  // Events to listen for
  events: string[];
  
  // Status
  active: boolean;
  
  // Provider-specific ID
  providerWebhookId?: string;
  
  // Verification
  verifiedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

export interface RateLimitConfig {
  provider: IntegrationProvider;
  
  // Limits
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  
  // Current usage
  currentMinuteUsage: number;
  currentHourUsage: number;
  currentDayUsage: number;
  
  // Reset times
  minuteResetAt: Date;
  hourResetAt: Date;
  dayResetAt: Date;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Common
  IntegrationProvider,
  ConnectionStatus,
  OAuthCredentials,
  IntegrationConnection,
  IntegrationSettings,
  IntegrationWebhook,
  IntegrationResult,
  IntegrationError,
  
  // Canva
  CanvaIntegration,
  CanvaPermission,
  CanvaDesignType,
  CanvaCreateDesignRequest,
  CanvaDesign,
  CanvaTemplateSearchRequest,
  CanvaTemplate,
  
  // Google Classroom
  GoogleClassroomIntegration,
  GoogleClassroomPermission,
  GoogleClassroomCourse,
  GoogleClassroomAssignment,
  GoogleClassroomMaterial,
  GoogleClassroomSubmission,
  GoogleClassroomSyncRequest,
  GoogleClassroomSyncResult,
  
  // Email
  EmailMessage,
  EmailAddress,
  EmailAttachment,
  SendEmailRequest,
  SendEmailResult,
  GmailIntegration,
  Outlook365Integration,
  OutlookCalendarEvent,
  ZimbraIntegration,
  
  // Payments
  PayPalIntegration,
  PayPalCapability,
  PayPalPaymentRequest,
  PayPalPayment,
  PayPalSubscription,
  PayIDIntegration,
  PayIDPaymentRequest,
  PayIDPayment,
  
  // Sync
  SyncJob,
  SyncJobResult,
  WebhookConfig,
  RateLimitConfig
};
