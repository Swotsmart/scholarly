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
  providerUserId?: string;
  providerEmail?: string;
  additionalData?: Record<string, unknown>;
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
  credentials?: OAuthCredentials;
  apiKey?: string;
  connectedAt: Date;
  lastUsedAt?: Date;
  lastSyncAt?: Date;
  errorMessage?: string;
  errorAt?: Date;
  settings: IntegrationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationSettings {
  autoSync: boolean;
  syncFrequencyMinutes?: number;
  notifyOnSync: boolean;
  notifyOnError: boolean;
  providerSettings: Record<string, unknown>;
}

/**
 * Webhook event from external provider
 */
export interface IntegrationWebhook {
  id: string;
  provider: IntegrationProvider;
  eventType: string;
  payload: Record<string, unknown>;
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
  retryAfter?: number;
  details?: Record<string, unknown>;
}

// ============================================================================
// CANVA TYPES
// ============================================================================

export interface CanvaIntegration {
  provider: 'canva';
  canvaUserId: string;
  canvaTeamId?: string;
  permissions: CanvaPermission[];
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

export interface CanvaCreateDesignRequest {
  type: CanvaDesignType;
  title: string;
  templateId?: string;
  width?: number;
  height?: number;
  brandKitId?: string;
  folderId?: string;
  initialContent?: {
    title?: string;
    subtitle?: string;
    bodyText?: string;
    images?: string[];
  };
  tags?: string[];
  description?: string;
}

export interface CanvaDesign {
  id: string;
  title: string;
  type: CanvaDesignType;
  editUrl: string;
  viewUrl: string;
  thumbnailUrl: string;
  exportUrls?: {
    pdf?: string;
    png?: string;
    jpg?: string;
    pptx?: string;
  };
  width: number;
  height: number;
  ownerId: string;
  folderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface GoogleClassroomIntegration {
  provider: 'google_classroom';
  googleUserId: string;
  email: string;
  permissions: GoogleClassroomPermission[];
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

export interface GoogleClassroomCourse {
  id: string;
  name: string;
  section?: string;
  description?: string;
  room?: string;
  ownerId: string;
  ownerEmail: string;
  courseState: 'active' | 'archived' | 'provisioned' | 'declined' | 'suspended';
  enrollmentCode?: string;
  createdAt: Date;
  updatedAt: Date;
  scholarlyClassroomId?: string;
}

export interface GoogleClassroomAssignment {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  workType: 'assignment' | 'short_answer_question' | 'multiple_choice_question';
  dueDate?: Date;
  dueTime?: string;
  maxPoints?: number;
  materials: GoogleClassroomMaterial[];
  state: 'published' | 'draft' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  scholarlyActivityId?: string;
}

export interface GoogleClassroomMaterial {
  type: 'drive_file' | 'youtube_video' | 'link' | 'form';
  driveFile?: {
    id: string;
    title: string;
    alternateLink: string;
    thumbnailUrl?: string;
    shareMode: 'view' | 'edit' | 'student_copy';
  };
  youtubeVideo?: {
    id: string;
    title: string;
    alternateLink: string;
    thumbnailUrl?: string;
  };
  link?: {
    url: string;
    title?: string;
    thumbnailUrl?: string;
  };
  form?: {
    formUrl: string;
    title: string;
    thumbnailUrl?: string;
  };
}

export interface GoogleClassroomSubmission {
  id: string;
  courseId: string;
  courseWorkId: string;
  userId: string;
  state: 'new' | 'created' | 'turned_in' | 'returned' | 'reclaimed_by_student';
  assignedGrade?: number;
  draftGrade?: number;
  attachments: GoogleClassroomMaterial[];
  createdAt: Date;
  updatedAt: Date;
  turnedInAt?: Date;
  returnedAt?: Date;
  late: boolean;
}

export interface GoogleClassroomSyncRequest {
  courseId: string;
  scholarlyClassroomId: string;
  syncStudents: boolean;
  syncTeachers: boolean;
  syncAssignments: boolean;
  syncSubmissions: boolean;
  syncAnnouncements: boolean;
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

export interface EmailMessage {
  id: string;
  provider: 'gmail' | 'outlook_365' | 'zimbra';
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments?: EmailAttachment[];
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
  headers?: Record<string, string>;
  sentAt?: Date;
  receivedAt?: Date;
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
  contentId?: string;
  data?: string;
  url?: string;
}

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
    data: string;
  }[];
  inReplyTo?: string;
  threadId?: string;
  scheduledSendTime?: Date;
  trackOpens?: boolean;
  trackClicks?: boolean;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

export interface SendEmailResult {
  messageId: string;
  threadId?: string;
  status: 'sent' | 'queued' | 'scheduled';
  sentAt?: Date;
  scheduledFor?: Date;
}

export interface GmailIntegration {
  provider: 'gmail';
  googleUserId: string;
  email: string;
  scholarlyLabels: {
    parents: string;
    teachers: string;
    students: string;
    notifications: string;
  };
  watchExpiration?: Date;
  historyId?: string;
}

export interface Outlook365Integration {
  provider: 'outlook_365';
  microsoftUserId: string;
  email: string;
  tenantId?: string;
  calendarEnabled: boolean;
  defaultCalendarId?: string;
  scholarlyFolderId?: string;
}

export interface OutlookCalendarEvent {
  id: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  timeZone: string;
  location?: {
    displayName: string;
    address?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  isOnlineMeeting: boolean;
  onlineMeetingUrl?: string;
  onlineMeetingProvider?: 'teams' | 'skype';
  attendees: {
    email: string;
    name?: string;
    type: 'required' | 'optional' | 'resource';
    responseStatus: 'none' | 'organizer' | 'tentative' | 'accepted' | 'declined';
  }[];
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    daysOfWeek?: (
      | 'sunday'
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
    )[];
    endDate?: Date;
    occurrences?: number;
  };
  reminders: {
    minutesBefore: number;
    method: 'popup' | 'email';
  }[];
  scholarlyEventId?: string;
}

export interface ZimbraIntegration {
  provider: 'zimbra';
  serverUrl: string;
  zimbraAccountId: string;
  email: string;
  authMethod: 'password' | 'preauth' | 'oauth';
  scholarlyFolderId?: string;
}

// ============================================================================
// PAYMENT TYPES (PayPal, PayID)
// ============================================================================

export interface PayPalIntegration {
  provider: 'paypal';
  payPalAccountId: string;
  payPalEmail: string;
  merchantId?: string;
  capabilities: PayPalCapability[];
  webhookId?: string;
}

export type PayPalCapability =
  | 'receive_payments'
  | 'send_payments'
  | 'subscriptions'
  | 'invoicing'
  | 'payouts';

export interface PayPalPaymentRequest {
  amount: number;
  currency: string;
  description: string;
  invoiceNumber?: string;
  recipientEmail?: string;
  recipientPayPalId?: string;
  paymentType: 'payment' | 'subscription' | 'payout';
  subscriptionPlan?: {
    name: string;
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount: number;
    cycles?: number;
  };
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface PayPalPayment {
  id: string;
  status: 'created' | 'approved' | 'completed' | 'cancelled' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  fee?: number;
  netAmount?: number;
  payerEmail?: string;
  payerId?: string;
  approvalUrl?: string;
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  scholarlyPaymentId?: string;
}

export interface PayPalSubscription {
  id: string;
  status:
    | 'approval_pending'
    | 'approved'
    | 'active'
    | 'suspended'
    | 'cancelled'
    | 'expired';
  planId: string;
  planName: string;
  subscriberEmail: string;
  subscriberId?: string;
  amount: number;
  currency: string;
  nextBillingDate?: Date;
  startedAt?: Date;
  createdAt: Date;
  scholarlySubscriptionId?: string;
}

export interface PayIDIntegration {
  provider: 'payid';
  payId: string;
  payIdType: 'email' | 'phone' | 'abn' | 'organisation_id';
  bsb: string;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
  verifiedAt?: Date;
  verificationMethod: 'micro_deposit' | 'bank_statement' | 'manual';
}

export interface PayIDPaymentRequest {
  recipientPayId: string;
  amount: number;
  currency: 'AUD';
  reference: string;
  endToEndId?: string;
  description?: string;
}

export interface PayIDPayment {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'returned';
  amount: number;
  currency: 'AUD';
  reference: string;
  recipientPayId: string;
  recipientName?: string;
  initiatedAt: Date;
  completedAt?: Date;
  nppTransactionId?: string;
  nppSettlementDate?: string;
  failureReason?: string;
  returnReason?: string;
  scholarlyPaymentId?: string;
}

// ============================================================================
// SYNC & WEBHOOK TYPES
// ============================================================================

export interface SyncJob {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  connectionId: string;
  syncType: string;
  scheduleType: 'manual' | 'scheduled' | 'webhook_triggered';
  cronExpression?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastResult?: SyncJobResult;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncJobResult {
  jobId: string;
  runId: string;
  status: 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsFailed: number;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  errors: {
    recordId?: string;
    error: string;
  }[];
  warnings: string[];
}

export interface WebhookConfig {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  connectionId: string;
  webhookUrl: string;
  secret?: string;
  events: string[];
  active: boolean;
  providerWebhookId?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitConfig {
  provider: IntegrationProvider;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  currentMinuteUsage: number;
  currentHourUsage: number;
  currentDayUsage: number;
  minuteResetAt: Date;
  hourResetAt: Date;
  dayResetAt: Date;
}

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

export interface IntegrationsConfig {
  canva?: {
    clientId: string;
    clientSecret: string;
    webhookSecret?: string;
  };
  google?: {
    clientId: string;
    clientSecret: string;
  };
  microsoft?: {
    clientId: string;
    clientSecret: string;
    tenantId?: string;
  };
  paypal?: {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'production';
    webhookId?: string;
  };
  payid?: {
    bankCode: string;
    apiKey: string;
    apiSecret: string;
    environment: 'test' | 'production';
  };
  zimbra?: {
    serverUrl: string;
    adminUser?: string;
    adminPassword?: string;
  };
  appUrl: string;
  // Index signature for service compatibility
  [key: string]: unknown;
}

export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
  defaultScopes: string[];
  webhookSecret?: string;
  webhookId?: string;
}
