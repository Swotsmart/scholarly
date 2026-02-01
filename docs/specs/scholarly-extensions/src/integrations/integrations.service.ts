/**
 * Scholarly Integrations Service
 * 
 * Comprehensive service for integrating with external platforms:
 * - Canva (Design & Content Creation) - CRITICAL
 * - Google Classroom (LMS)
 * - Gmail (Email)
 * - Outlook 365 (Email & Calendar)
 * - PayPal (Payments)
 * - PayID (Australian Instant Payments)
 * - Zimbra Mail (Email)
 * 
 * ## The Granny Explanation
 * 
 * Think of this service as a multilingual translator. Scholarly speaks its own
 * language, but it needs to communicate with many different systems - each with
 * their own language and customs:
 * 
 * - Canva speaks "design" - templates, colors, fonts
 * - Google Classroom speaks "education" - courses, assignments, grades
 * - PayPal speaks "money" - payments, subscriptions, refunds
 * - Email systems speak "messages" - to, from, subject, body
 * 
 * This service translates between Scholarly and all these systems, handling:
 * - Authentication (proving who we are)
 * - Data conversion (turning a Scholarly assignment into a Google assignment)
 * - Error handling (what to do when things go wrong)
 * - Rate limiting (not overwhelming external systems)
 * 
 * ## Architecture
 * 
 * ```
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                       INTEGRATIONS SERVICE                                 │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  ┌──────────────────────────────────────────────────────────────────────┐  │
 * │  │                     CONNECTION MANAGER                               │  │
 * │  │  OAuth Flow │ Token Refresh │ Credential Storage │ Health Check     │  │
 * │  └──────────────────────────────────────────────────────────────────────┘  │
 * │                                    │                                       │
 * │  ┌─────────────────────────────────┼─────────────────────────────────────┐ │
 * │  │                                 ▼                                     │ │
 * │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │ │
 * │  │  │  Canva  │  │ Google  │  │  Email  │  │ PayPal  │  │  PayID  │     │ │
 * │  │  │ Adapter │  │Classroom│  │ Adapter │  │ Adapter │  │ Adapter │     │ │
 * │  │  │         │  │ Adapter │  │         │  │         │  │         │     │ │
 * │  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘     │ │
 * │  │       │            │            │            │            │          │ │
 * │  │       ▼            ▼            ▼            ▼            ▼          │ │
 * │  │  ┌─────────────────────────────────────────────────────────────┐     │ │
 * │  │  │                    RATE LIMITER                            │     │ │
 * │  │  │      Per-Provider Throttling │ Retry Logic │ Queuing      │     │ │
 * │  │  └─────────────────────────────────────────────────────────────┘     │ │
 * │  │                                │                                     │ │
 * │  │                                ▼                                     │ │
 * │  │  ┌─────────────────────────────────────────────────────────────┐     │ │
 * │  │  │                    HTTP CLIENT                             │     │ │
 * │  │  │      Retries │ Timeouts │ Circuit Breaker │ Logging       │     │ │
 * │  │  └─────────────────────────────────────────────────────────────┘     │ │
 * │  └───────────────────────────────────────────────────────────────────────┘ │
 * │                                                                             │
 * │  ┌──────────────────────────────────────────────────────────────────────┐  │
 * │  │                       WEBHOOK HANDLER                               │  │
 * │  │  Signature Verification │ Event Processing │ Retry Queue           │  │
 * │  └──────────────────────────────────────────────────────────────────────┘  │
 * │                                                                             │
 * │  ┌──────────────────────────────────────────────────────────────────────┐  │
 * │  │                        SYNC ENGINE                                  │  │
 * │  │  Bidirectional Sync │ Conflict Resolution │ Delta Detection        │  │
 * │  └──────────────────────────────────────────────────────────────────────┘  │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * ```
 * 
 * ## Supported Integrations
 * 
 * | Provider | Category | Auth Method | Key Features |
 * |----------|----------|-------------|--------------|
 * | Canva | Design | OAuth 2.0 | Create designs, templates, export |
 * | Google Classroom | LMS | OAuth 2.0 | Courses, assignments, submissions |
 * | Gmail | Email | OAuth 2.0 | Send, receive, labels |
 * | Outlook 365 | Email/Calendar | OAuth 2.0 | Mail, calendar, Teams meetings |
 * | PayPal | Payments | OAuth 2.0 | Payments, subscriptions, payouts |
 * | PayID | Payments (AU) | API Key | Instant AUD transfers |
 * | Zimbra | Email | SOAP/REST | Enterprise email |
 * 
 * @module IntegrationsService
 * @version 1.0.0
 */

import * as crypto from 'crypto';

// ============================================================================
// TYPE IMPORTS (would be from separate file in production)
// ============================================================================

type IntegrationProvider = 
  | 'canva'
  | 'google_classroom'
  | 'gmail'
  | 'outlook_365'
  | 'paypal'
  | 'payid'
  | 'zimbra';

type ConnectionStatus = 
  | 'connected'
  | 'disconnected'
  | 'expired'
  | 'error'
  | 'pending_authorization';

interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: Date;
  scope: string[];
  providerUserId?: string;
  providerEmail?: string;
  additionalData?: Record<string, any>;
}

interface IntegrationConnection {
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

interface IntegrationSettings {
  autoSync: boolean;
  syncFrequencyMinutes?: number;
  notifyOnSync: boolean;
  notifyOnError: boolean;
  providerSettings: Record<string, any>;
}

interface IntegrationResult<T> {
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

interface IntegrationError {
  code: string;
  message: string;
  provider: IntegrationProvider;
  recoverable: boolean;
  retryAfter?: number;
  details?: Record<string, any>;
}

interface IntegrationWebhook {
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

// Canva types
type CanvaDesignType = 
  | 'presentation'
  | 'document'
  | 'worksheet'
  | 'certificate'
  | 'poster'
  | 'infographic'
  | 'social_media'
  | 'video'
  | 'whiteboard';

interface CanvaCreateDesignRequest {
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

interface CanvaDesign {
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

interface CanvaTemplateSearchRequest {
  query: string;
  type?: CanvaDesignType;
  category?: 'education' | 'business' | 'social' | 'marketing';
  limit?: number;
}

interface CanvaTemplate {
  id: string;
  title: string;
  type: CanvaDesignType;
  thumbnailUrl: string;
  previewUrl: string;
  category: string;
  tags: string[];
}

// Google Classroom types
interface GoogleClassroomCourse {
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

interface GoogleClassroomAssignment {
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

interface GoogleClassroomMaterial {
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

interface GoogleClassroomSyncRequest {
  courseId: string;
  scholarlyClassroomId: string;
  syncStudents: boolean;
  syncTeachers: boolean;
  syncAssignments: boolean;
  syncSubmissions: boolean;
  syncAnnouncements: boolean;
  direction: 'google_to_scholarly' | 'scholarly_to_google' | 'bidirectional';
}

interface GoogleClassroomSyncResult {
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

// Email types
interface EmailAddress {
  email: string;
  name?: string;
}

interface SendEmailRequest {
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
  templateData?: Record<string, any>;
}

interface SendEmailResult {
  messageId: string;
  threadId?: string;
  status: 'sent' | 'queued' | 'scheduled';
  sentAt?: Date;
  scheduledFor?: Date;
}

// Outlook Calendar types
interface OutlookCalendarEvent {
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
    daysOfWeek?: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[];
    endDate?: Date;
    occurrences?: number;
  };
  reminders: {
    minutesBefore: number;
    method: 'popup' | 'email';
  }[];
  scholarlyEventId?: string;
}

// PayPal types
interface PayPalPaymentRequest {
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

interface PayPalPayment {
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

interface PayPalSubscription {
  id: string;
  status: 'approval_pending' | 'approved' | 'active' | 'suspended' | 'cancelled' | 'expired';
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

// PayID types
interface PayIDPaymentRequest {
  recipientPayId: string;
  amount: number;
  currency: 'AUD';
  reference: string;
  endToEndId?: string;
  description?: string;
}

interface PayIDPayment {
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

// Sync types
interface SyncJob {
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
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface SyncJobResult {
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
  errors: { recordId?: string; error: string }[];
  warnings: string[];
}

interface WebhookConfig {
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

interface RateLimitConfig {
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
// REPOSITORY INTERFACES
// ============================================================================

export interface IntegrationConnectionRepository {
  findById(tenantId: string, id: string): Promise<IntegrationConnection | null>;
  findByProvider(tenantId: string, userId: string, provider: IntegrationProvider): Promise<IntegrationConnection | null>;
  findAllByUser(tenantId: string, userId: string): Promise<IntegrationConnection[]>;
  findAllByTenant(tenantId: string): Promise<IntegrationConnection[]>;
  save(tenantId: string, connection: IntegrationConnection): Promise<IntegrationConnection>;
  update(tenantId: string, id: string, updates: Partial<IntegrationConnection>): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface SyncJobRepository {
  findById(tenantId: string, id: string): Promise<SyncJob | null>;
  findByConnection(tenantId: string, connectionId: string): Promise<SyncJob[]>;
  findPending(): Promise<SyncJob[]>;
  save(tenantId: string, job: SyncJob): Promise<SyncJob>;
  update(tenantId: string, id: string, updates: Partial<SyncJob>): Promise<void>;
}

export interface WebhookRepository {
  findById(tenantId: string, id: string): Promise<WebhookConfig | null>;
  findByProvider(tenantId: string, provider: IntegrationProvider): Promise<WebhookConfig[]>;
  save(tenantId: string, webhook: WebhookConfig): Promise<WebhookConfig>;
  saveEvent(tenantId: string, event: IntegrationWebhook): Promise<void>;
}

export interface RateLimitRepository {
  getUsage(tenantId: string, provider: IntegrationProvider): Promise<RateLimitConfig>;
  incrementUsage(tenantId: string, provider: IntegrationProvider): Promise<void>;
  resetUsage(tenantId: string, provider: IntegrationProvider, period: 'minute' | 'hour' | 'day'): Promise<void>;
}

// ============================================================================
// CONFIGURATION
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
}

interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  apiBaseUrl: string;
  defaultScopes: string[];
  webhookSecret?: string;
  webhookId?: string;
}

interface EmailTemplate {
  id: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class IntegrationsService {
  private readonly connectionRepo: IntegrationConnectionRepository;
  private readonly syncJobRepo: SyncJobRepository;
  private readonly webhookRepo: WebhookRepository;
  private readonly rateLimitRepo: RateLimitRepository;
  private readonly config: IntegrationsConfig;
  
  private readonly providerConfigs: Map<IntegrationProvider, ProviderConfig>;
  private readonly rateLimits: Map<IntegrationProvider, RateLimitConfig>;

  constructor(deps: {
    connectionRepo: IntegrationConnectionRepository;
    syncJobRepo: SyncJobRepository;
    webhookRepo: WebhookRepository;
    rateLimitRepo: RateLimitRepository;
    config: IntegrationsConfig;
  }) {
    this.connectionRepo = deps.connectionRepo;
    this.syncJobRepo = deps.syncJobRepo;
    this.webhookRepo = deps.webhookRepo;
    this.rateLimitRepo = deps.rateLimitRepo;
    this.config = deps.config;
    
    this.providerConfigs = this.initializeProviderConfigs(deps.config);
    this.rateLimits = this.initializeRateLimits();
  }

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  /**
   * Start OAuth flow for a provider
   * 
   * Returns an authorization URL that the user should be redirected to.
   * After authorization, the provider will redirect back with a code.
   */
  async initiateConnection(
    tenantId: string,
    userId: string,
    provider: IntegrationProvider,
    options?: {
      scopes?: string[];
      redirectUri?: string;
    }
  ): Promise<IntegrationResult<{
    authorizationUrl: string;
    state: string;
  }>> {
    try {
      const config = this.providerConfigs.get(provider);
      if (!config) {
        return this.failure('PROVIDER_NOT_CONFIGURED', `Provider ${provider} is not configured`, provider);
      }

      // Generate state for CSRF protection
      const state = this.generateState(tenantId, userId, provider);
      
      // Get provider-specific scopes
      const scopes = options?.scopes || config.defaultScopes;
      
      // Build authorization URL
      const authorizationUrl = this.buildAuthorizationUrl(
        provider, 
        config, 
        state, 
        scopes, 
        options?.redirectUri
      );

      return this.success({ authorizationUrl, state });
    } catch (error) {
      return this.failure('AUTHORIZATION_FAILED', (error as Error).message, provider);
    }
  }

  /**
   * Complete OAuth flow after user authorization
   * 
   * Called when the provider redirects back with an authorization code.
   */
  async completeConnection(
    tenantId: string,
    userId: string,
    provider: IntegrationProvider,
    authorizationCode: string,
    state: string
  ): Promise<IntegrationResult<IntegrationConnection>> {
    try {
      // Validate state
      const stateData = this.validateState(state);
      if (!stateData || stateData.tenantId !== tenantId || stateData.userId !== userId) {
        return this.failure('INVALID_STATE', 'Invalid or expired state parameter', provider);
      }

      const config = this.providerConfigs.get(provider);
      if (!config) {
        return this.failure('PROVIDER_NOT_CONFIGURED', `Provider ${provider} is not configured`, provider);
      }

      // Exchange code for tokens
      const credentials = await this.exchangeAuthorizationCode(provider, config, authorizationCode);

      // Check for existing connection
      const existingConnection = await this.connectionRepo.findByProvider(tenantId, userId, provider);
      
      if (existingConnection) {
        // Update existing connection
        await this.connectionRepo.update(tenantId, existingConnection.id, {
          credentials,
          status: 'connected',
          connectedAt: new Date(),
          lastUsedAt: new Date(),
          errorMessage: undefined,
          errorAt: undefined,
          updatedAt: new Date()
        });
        
        const updatedConnection = await this.connectionRepo.findById(tenantId, existingConnection.id);
        return this.success(updatedConnection!);
      }

      // Create new connection record
      const connection: IntegrationConnection = {
        id: this.generateId('conn'),
        tenantId,
        userId,
        provider,
        status: 'connected',
        credentials,
        connectedAt: new Date(),
        lastUsedAt: new Date(),
        settings: {
          autoSync: true,
          syncFrequencyMinutes: 60,
          notifyOnSync: false,
          notifyOnError: true,
          providerSettings: {}
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save connection
      const savedConnection = await this.connectionRepo.save(tenantId, connection);

      // Setup webhooks if supported
      await this.setupProviderWebhooks(tenantId, savedConnection);

      return this.success(savedConnection);
    } catch (error) {
      return this.failure('CONNECTION_FAILED', (error as Error).message, provider);
    }
  }

  /**
   * Disconnect from a provider
   */
  async disconnectProvider(
    tenantId: string,
    connectionId: string
  ): Promise<IntegrationResult<void>> {
    try {
      const connection = await this.connectionRepo.findById(tenantId, connectionId);
      if (!connection) {
        return this.failure('CONNECTION_NOT_FOUND', 'Connection not found', 'canva');
      }

      // Revoke tokens if possible
      await this.revokeTokens(connection);

      // Remove webhooks
      await this.removeProviderWebhooks(tenantId, connection);

      // Delete connection
      await this.connectionRepo.delete(tenantId, connectionId);

      return this.success(undefined);
    } catch (error) {
      return this.failure('DISCONNECT_FAILED', (error as Error).message, 'canva');
    }
  }

  /**
   * Get all connections for a user
   */
  async getUserConnections(
    tenantId: string,
    userId: string
  ): Promise<IntegrationResult<IntegrationConnection[]>> {
    try {
      const connections = await this.connectionRepo.findAllByUser(tenantId, userId);
      
      // Check each connection's token status
      const updatedConnections: IntegrationConnection[] = [];
      for (const conn of connections) {
        if (conn.credentials?.expiresAt && conn.credentials.expiresAt < new Date()) {
          // Token expired - try to refresh
          const refreshResult = await this.refreshConnectionTokens(tenantId, conn.id);
          if (refreshResult.success && refreshResult.data) {
            updatedConnections.push(refreshResult.data);
          } else {
            // Mark as expired
            await this.connectionRepo.update(tenantId, conn.id, { status: 'expired' });
            conn.status = 'expired';
            updatedConnections.push(conn);
          }
        } else {
          updatedConnections.push(conn);
        }
      }

      return this.success(updatedConnections);
    } catch (error) {
      return this.failure('FETCH_CONNECTIONS_FAILED', (error as Error).message, 'canva');
    }
  }

  /**
   * Refresh tokens for a connection
   */
  async refreshConnectionTokens(
    tenantId: string,
    connectionId: string
  ): Promise<IntegrationResult<IntegrationConnection>> {
    try {
      const connection = await this.connectionRepo.findById(tenantId, connectionId);
      if (!connection) {
        return this.failure('CONNECTION_NOT_FOUND', 'Connection not found', 'canva');
      }

      if (!connection.credentials?.refreshToken) {
        return this.failure('NO_REFRESH_TOKEN', 'No refresh token available', connection.provider);
      }

      const config = this.providerConfigs.get(connection.provider);
      if (!config) {
        return this.failure('PROVIDER_NOT_CONFIGURED', 'Provider not configured', connection.provider);
      }

      // Refresh tokens
      const newCredentials = await this.refreshTokens(
        connection.provider, 
        config, 
        connection.credentials.refreshToken
      );

      // Update connection
      await this.connectionRepo.update(tenantId, connectionId, {
        credentials: newCredentials,
        status: 'connected',
        errorMessage: undefined,
        errorAt: undefined,
        updatedAt: new Date()
      });

      const updatedConnection = await this.connectionRepo.findById(tenantId, connectionId);
      return this.success(updatedConnection!);
    } catch (error) {
      // Mark connection as expired
      await this.connectionRepo.update(tenantId, connectionId, {
        status: 'expired',
        errorMessage: (error as Error).message,
        errorAt: new Date()
      });

      return this.failure('REFRESH_FAILED', (error as Error).message, 'canva');
    }
  }

  /**
   * Get connection status for a specific provider
   */
  async getConnectionStatus(
    tenantId: string,
    userId: string,
    provider: IntegrationProvider
  ): Promise<IntegrationResult<{
    connected: boolean;
    status: ConnectionStatus;
    connection?: IntegrationConnection;
  }>> {
    try {
      const connection = await this.connectionRepo.findByProvider(tenantId, userId, provider);
      
      if (!connection) {
        return this.success({
          connected: false,
          status: 'disconnected'
        });
      }

      // Check if tokens are expired
      if (connection.credentials?.expiresAt && connection.credentials.expiresAt < new Date()) {
        // Try to refresh
        const refreshResult = await this.refreshConnectionTokens(tenantId, connection.id);
        if (refreshResult.success && refreshResult.data) {
          return this.success({
            connected: true,
            status: 'connected',
            connection: refreshResult.data
          });
        } else {
          return this.success({
            connected: false,
            status: 'expired',
            connection
          });
        }
      }

      return this.success({
        connected: connection.status === 'connected',
        status: connection.status,
        connection
      });
    } catch (error) {
      return this.failure('STATUS_CHECK_FAILED', (error as Error).message, provider);
    }
  }

  // ==========================================================================
  // CANVA INTEGRATION
  // ==========================================================================

  /**
   * Create a design in Canva
   */
  async canvaCreateDesign(
    tenantId: string,
    userId: string,
    request: CanvaCreateDesignRequest
  ): Promise<IntegrationResult<CanvaDesign>> {
    return this.withConnection(tenantId, userId, 'canva', async (connection) => {
      await this.checkRateLimit(tenantId, 'canva');

      const requestBody: Record<string, any> = {
        design_type: this.mapCanvaDesignType(request.type),
        title: request.title
      };

      if (request.templateId) {
        requestBody.brand_template_id = request.templateId;
      }
      if (request.width && request.height) {
        requestBody.width = request.width;
        requestBody.height = request.height;
      }
      if (request.folderId) {
        requestBody.folder_id = request.folderId;
      }

      const response = await this.makeRequest<any>(
        'canva',
        connection.credentials!,
        'POST',
        '/v1/designs',
        requestBody
      );

      const design: CanvaDesign = {
        id: response.design.id,
        title: response.design.title,
        type: request.type,
        editUrl: response.design.urls.edit_url,
        viewUrl: response.design.urls.view_url,
        thumbnailUrl: response.design.thumbnail?.url || '',
        width: response.design.page_dimensions?.width || request.width || 1920,
        height: response.design.page_dimensions?.height || request.height || 1080,
        ownerId: response.design.owner?.user_id || userId,
        folderId: request.folderId,
        createdAt: new Date(response.design.created_at),
        updatedAt: new Date(response.design.updated_at)
      };

      // Update last used
      await this.connectionRepo.update(tenantId, connection.id, {
        lastUsedAt: new Date()
      });

      return this.success(design);
    });
  }

  /**
   * Search Canva templates for education
   */
  async canvaSearchTemplates(
    tenantId: string,
    userId: string,
    request: CanvaTemplateSearchRequest
  ): Promise<IntegrationResult<CanvaTemplate[]>> {
    return this.withConnection(tenantId, userId, 'canva', async (connection) => {
      await this.checkRateLimit(tenantId, 'canva');

      const params: Record<string, string> = {
        query: request.query,
        limit: String(request.limit || 20)
      };

      if (request.type) {
        params.design_type = this.mapCanvaDesignType(request.type);
      }

      const response = await this.makeRequest<{ items: any[] }>(
        'canva',
        connection.credentials!,
        'GET',
        '/v1/brand-templates',
        undefined,
        params
      );

      const templates: CanvaTemplate[] = (response.items || []).map(item => ({
        id: item.id,
        title: item.title,
        type: request.type || 'document',
        thumbnailUrl: item.thumbnail?.url || '',
        previewUrl: item.preview?.url || '',
        category: item.category || 'education',
        tags: item.tags || []
      }));

      return this.success(templates);
    });
  }

  /**
   * Export a Canva design to various formats
   */
  async canvaExportDesign(
    tenantId: string,
    userId: string,
    designId: string,
    format: 'pdf' | 'png' | 'jpg' | 'pptx'
  ): Promise<IntegrationResult<{ exportUrl: string; expiresAt: Date }>> {
    return this.withConnection(tenantId, userId, 'canva', async (connection) => {
      await this.checkRateLimit(tenantId, 'canva');

      // Create export job
      const jobResponse = await this.makeRequest<{ job: { id: string; status: string } }>(
        'canva',
        connection.credentials!,
        'POST',
        `/v1/designs/${designId}/exports`,
        {
          format: format.toUpperCase()
        }
      );

      // Poll for completion (max 30 seconds)
      let exportUrl: string | undefined;
      let attempts = 0;
      const maxAttempts = 30;

      while (!exportUrl && attempts < maxAttempts) {
        await this.sleep(1000);
        
        const statusResponse = await this.makeRequest<{
          job: {
            status: string;
            urls?: { url: string }[];
            error?: { message: string };
          };
        }>(
          'canva',
          connection.credentials!,
          'GET',
          `/v1/exports/${jobResponse.job.id}`
        );

        if (statusResponse.job.status === 'completed' && statusResponse.job.urls?.[0]) {
          exportUrl = statusResponse.job.urls[0].url;
        } else if (statusResponse.job.status === 'failed') {
          return this.failure(
            'EXPORT_FAILED', 
            statusResponse.job.error?.message || 'Canva export job failed', 
            'canva'
          );
        }

        attempts++;
      }

      if (!exportUrl) {
        return this.failure('EXPORT_TIMEOUT', 'Canva export timed out after 30 seconds', 'canva');
      }

      return this.success({
        exportUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)  // URLs expire in 24 hours
      });
    });
  }

  /**
   * Get Canva design details
   */
  async canvaGetDesign(
    tenantId: string,
    userId: string,
    designId: string
  ): Promise<IntegrationResult<CanvaDesign>> {
    return this.withConnection(tenantId, userId, 'canva', async (connection) => {
      await this.checkRateLimit(tenantId, 'canva');

      const response = await this.makeRequest<{ design: any }>(
        'canva',
        connection.credentials!,
        'GET',
        `/v1/designs/${designId}`
      );

      const design: CanvaDesign = {
        id: response.design.id,
        title: response.design.title,
        type: 'document',  // Would need to map from response
        editUrl: response.design.urls.edit_url,
        viewUrl: response.design.urls.view_url,
        thumbnailUrl: response.design.thumbnail?.url || '',
        width: response.design.page_dimensions?.width || 1920,
        height: response.design.page_dimensions?.height || 1080,
        ownerId: response.design.owner?.user_id || userId,
        createdAt: new Date(response.design.created_at),
        updatedAt: new Date(response.design.updated_at)
      };

      return this.success(design);
    });
  }

  /**
   * List user's Canva designs
   */
  async canvaListDesigns(
    tenantId: string,
    userId: string,
    options?: {
      folderId?: string;
      limit?: number;
      continuation?: string;
    }
  ): Promise<IntegrationResult<{ designs: CanvaDesign[]; continuation?: string }>> {
    return this.withConnection(tenantId, userId, 'canva', async (connection) => {
      await this.checkRateLimit(tenantId, 'canva');

      const params: Record<string, string> = {
        limit: String(options?.limit || 20)
      };
      if (options?.folderId) params.folder_id = options.folderId;
      if (options?.continuation) params.continuation = options.continuation;

      const response = await this.makeRequest<{ items: any[]; continuation?: string }>(
        'canva',
        connection.credentials!,
        'GET',
        '/v1/designs',
        undefined,
        params
      );

      const designs: CanvaDesign[] = (response.items || []).map(item => ({
        id: item.id,
        title: item.title,
        type: 'document',
        editUrl: item.urls?.edit_url || '',
        viewUrl: item.urls?.view_url || '',
        thumbnailUrl: item.thumbnail?.url || '',
        width: item.page_dimensions?.width || 1920,
        height: item.page_dimensions?.height || 1080,
        ownerId: item.owner?.user_id || userId,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));

      return this.success({
        designs,
        continuation: response.continuation
      });
    });
  }

  // ==========================================================================
  // GOOGLE CLASSROOM INTEGRATION
  // ==========================================================================

  /**
   * List Google Classroom courses
   */
  async googleClassroomListCourses(
    tenantId: string,
    userId: string,
    options?: {
      teacherId?: string;
      studentId?: string;
      courseStates?: ('active' | 'archived')[];
    }
  ): Promise<IntegrationResult<GoogleClassroomCourse[]>> {
    return this.withConnection(tenantId, userId, 'google_classroom', async (connection) => {
      await this.checkRateLimit(tenantId, 'google_classroom');

      const params: Record<string, string> = {};
      if (options?.teacherId) params.teacherId = options.teacherId;
      if (options?.studentId) params.studentId = options.studentId;
      if (options?.courseStates) params.courseStates = options.courseStates.map(s => s.toUpperCase()).join(',');

      const response = await this.makeRequest<{ courses: any[] }>(
        'google_classroom',
        connection.credentials!,
        'GET',
        '/v1/courses',
        undefined,
        params
      );

      const courses: GoogleClassroomCourse[] = (response.courses || []).map(c => ({
        id: c.id,
        name: c.name,
        section: c.section,
        description: c.descriptionHeading,
        room: c.room,
        ownerId: c.ownerId,
        ownerEmail: '',  // Would need additional API call
        courseState: c.courseState.toLowerCase() as any,
        enrollmentCode: c.enrollmentCode,
        createdAt: new Date(c.creationTime),
        updatedAt: new Date(c.updateTime)
      }));

      return this.success(courses);
    });
  }

  /**
   * Get a specific course
   */
  async googleClassroomGetCourse(
    tenantId: string,
    userId: string,
    courseId: string
  ): Promise<IntegrationResult<GoogleClassroomCourse>> {
    return this.withConnection(tenantId, userId, 'google_classroom', async (connection) => {
      await this.checkRateLimit(tenantId, 'google_classroom');

      const response = await this.makeRequest<any>(
        'google_classroom',
        connection.credentials!,
        'GET',
        `/v1/courses/${courseId}`
      );

      const course: GoogleClassroomCourse = {
        id: response.id,
        name: response.name,
        section: response.section,
        description: response.descriptionHeading,
        room: response.room,
        ownerId: response.ownerId,
        ownerEmail: '',
        courseState: response.courseState.toLowerCase() as any,
        enrollmentCode: response.enrollmentCode,
        createdAt: new Date(response.creationTime),
        updatedAt: new Date(response.updateTime)
      };

      return this.success(course);
    });
  }

  /**
   * Create assignment in Google Classroom
   */
  async googleClassroomCreateAssignment(
    tenantId: string,
    userId: string,
    courseId: string,
    assignment: {
      title: string;
      description?: string;
      dueDate?: Date;
      maxPoints?: number;
      materials?: { type: 'link' | 'driveFile'; url?: string; driveFileId?: string; title?: string }[];
      state?: 'draft' | 'published';
      scholarlyActivityId?: string;
    }
  ): Promise<IntegrationResult<GoogleClassroomAssignment>> {
    return this.withConnection(tenantId, userId, 'google_classroom', async (connection) => {
      await this.checkRateLimit(tenantId, 'google_classroom');

      // Build coursework object
      const coursework: Record<string, any> = {
        title: assignment.title,
        description: assignment.description,
        workType: 'ASSIGNMENT',
        state: assignment.state === 'draft' ? 'DRAFT' : 'PUBLISHED',
        maxPoints: assignment.maxPoints
      };

      // Add due date
      if (assignment.dueDate) {
        const due = assignment.dueDate;
        coursework.dueDate = {
          year: due.getFullYear(),
          month: due.getMonth() + 1,
          day: due.getDate()
        };
        coursework.dueTime = {
          hours: due.getHours(),
          minutes: due.getMinutes()
        };
      }

      // Add materials
      if (assignment.materials && assignment.materials.length > 0) {
        coursework.materials = assignment.materials.map(m => {
          if (m.type === 'link') {
            return { link: { url: m.url, title: m.title } };
          } else {
            return { driveFile: { driveFile: { id: m.driveFileId } } };
          }
        });
      }

      const response = await this.makeRequest<any>(
        'google_classroom',
        connection.credentials!,
        'POST',
        `/v1/courses/${courseId}/courseWork`,
        coursework
      );

      const result: GoogleClassroomAssignment = {
        id: response.id,
        courseId,
        title: response.title,
        description: response.description,
        workType: 'assignment',
        dueDate: response.dueDate ? new Date(
          response.dueDate.year,
          response.dueDate.month - 1,
          response.dueDate.day,
          response.dueTime?.hours || 23,
          response.dueTime?.minutes || 59
        ) : undefined,
        maxPoints: response.maxPoints,
        materials: [],
        state: response.state.toLowerCase() as any,
        createdAt: new Date(response.creationTime),
        updatedAt: new Date(response.updateTime),
        scholarlyActivityId: assignment.scholarlyActivityId
      };

      return this.success(result);
    });
  }

  /**
   * List assignments in a course
   */
  async googleClassroomListAssignments(
    tenantId: string,
    userId: string,
    courseId: string,
    options?: {
      courseWorkStates?: ('published' | 'draft')[];
      orderBy?: string;
    }
  ): Promise<IntegrationResult<GoogleClassroomAssignment[]>> {
    return this.withConnection(tenantId, userId, 'google_classroom', async (connection) => {
      await this.checkRateLimit(tenantId, 'google_classroom');

      const params: Record<string, string> = {};
      if (options?.courseWorkStates) {
        params.courseWorkStates = options.courseWorkStates.map(s => s.toUpperCase()).join(',');
      }
      if (options?.orderBy) params.orderBy = options.orderBy;

      const response = await this.makeRequest<{ courseWork: any[] }>(
        'google_classroom',
        connection.credentials!,
        'GET',
        `/v1/courses/${courseId}/courseWork`,
        undefined,
        params
      );

      const assignments: GoogleClassroomAssignment[] = (response.courseWork || []).map(cw => ({
        id: cw.id,
        courseId,
        title: cw.title,
        description: cw.description,
        workType: cw.workType.toLowerCase() as any,
        dueDate: cw.dueDate ? new Date(
          cw.dueDate.year,
          cw.dueDate.month - 1,
          cw.dueDate.day
        ) : undefined,
        maxPoints: cw.maxPoints,
        materials: [],
        state: cw.state.toLowerCase() as any,
        createdAt: new Date(cw.creationTime),
        updatedAt: new Date(cw.updateTime)
      }));

      return this.success(assignments);
    });
  }

  /**
   * Sync Google Classroom course with Scholarly
   */
  async googleClassroomSyncCourse(
    tenantId: string,
    userId: string,
    request: GoogleClassroomSyncRequest
  ): Promise<IntegrationResult<GoogleClassroomSyncResult>> {
    return this.withConnection(tenantId, userId, 'google_classroom', async (connection) => {
      const result: GoogleClassroomSyncResult = {
        courseId: request.courseId,
        studentsAdded: 0,
        studentsUpdated: 0,
        teachersAdded: 0,
        teachersUpdated: 0,
        assignmentsCreated: 0,
        assignmentsUpdated: 0,
        submissionsSynced: 0,
        errors: [],
        warnings: [],
        syncedAt: new Date()
      };

      try {
        // Sync students
        if (request.syncStudents) {
          const studentsResult = await this.syncGoogleClassroomStudents(
            tenantId,
            connection,
            request.courseId,
            request.scholarlyClassroomId,
            request.direction
          );
          result.studentsAdded = studentsResult.added;
          result.studentsUpdated = studentsResult.updated;
          result.errors.push(...studentsResult.errors);
        }

        // Sync teachers
        if (request.syncTeachers) {
          const teachersResult = await this.syncGoogleClassroomTeachers(
            tenantId,
            connection,
            request.courseId,
            request.scholarlyClassroomId,
            request.direction
          );
          result.teachersAdded = teachersResult.added;
          result.teachersUpdated = teachersResult.updated;
          result.errors.push(...teachersResult.errors);
        }

        // Sync assignments
        if (request.syncAssignments) {
          const assignmentsResult = await this.syncGoogleClassroomAssignments(
            tenantId,
            connection,
            request.courseId,
            request.scholarlyClassroomId,
            request.direction
          );
          result.assignmentsCreated = assignmentsResult.created;
          result.assignmentsUpdated = assignmentsResult.updated;
          result.errors.push(...assignmentsResult.errors);
        }

        // Sync submissions
        if (request.syncSubmissions) {
          const submissionsResult = await this.syncGoogleClassroomSubmissions(
            tenantId,
            connection,
            request.courseId,
            request.scholarlyClassroomId
          );
          result.submissionsSynced = submissionsResult.synced;
          result.errors.push(...submissionsResult.errors);
        }

        // Update connection last sync time
        await this.connectionRepo.update(tenantId, connection.id, {
          lastSyncAt: new Date()
        });

      } catch (error) {
        result.errors.push(`Sync failed: ${(error as Error).message}`);
      }

      return this.success(result);
    });
  }

  // ==========================================================================
  // EMAIL INTEGRATION (Gmail, Outlook, Zimbra)
  // ==========================================================================

  /**
   * Send email through connected provider
   */
  async sendEmail(
    tenantId: string,
    userId: string,
    provider: 'gmail' | 'outlook_365' | 'zimbra',
    request: SendEmailRequest
  ): Promise<IntegrationResult<SendEmailResult>> {
    return this.withConnection(tenantId, userId, provider, async (connection) => {
      await this.checkRateLimit(tenantId, provider);

      let result: SendEmailResult;

      switch (provider) {
        case 'gmail':
          result = await this.sendGmailMessage(connection, request);
          break;
        case 'outlook_365':
          result = await this.sendOutlookMessage(connection, request);
          break;
        case 'zimbra':
          result = await this.sendZimbraMessage(connection, request);
          break;
        default:
          return this.failure('UNSUPPORTED_PROVIDER', `Email provider ${provider} not supported`, provider);
      }

      // Update last used
      await this.connectionRepo.update(tenantId, connection.id, {
        lastUsedAt: new Date()
      });

      return this.success(result);
    });
  }

  /**
   * Send email using a template
   */
  async sendTemplateEmail(
    tenantId: string,
    userId: string,
    provider: 'gmail' | 'outlook_365' | 'zimbra',
    request: {
      to: { email: string; name?: string }[];
      templateId: string;
      templateData: Record<string, any>;
      cc?: { email: string; name?: string }[];
    }
  ): Promise<IntegrationResult<SendEmailResult>> {
    // Get template
    const template = await this.getEmailTemplate(tenantId, request.templateId);
    if (!template) {
      return this.failure('TEMPLATE_NOT_FOUND', 'Email template not found', provider);
    }

    // Render template with data
    const rendered = this.renderEmailTemplate(template, request.templateData);

    // Send
    return this.sendEmail(tenantId, userId, provider, {
      to: request.to,
      cc: request.cc,
      subject: rendered.subject,
      bodyHtml: rendered.bodyHtml,
      bodyText: rendered.bodyText
    });
  }

  /**
   * Send bulk emails (for parent notifications, etc.)
   */
  async sendBulkEmails(
    tenantId: string,
    userId: string,
    provider: 'gmail' | 'outlook_365' | 'zimbra',
    requests: SendEmailRequest[]
  ): Promise<IntegrationResult<{
    sent: number;
    failed: number;
    results: { email: string; success: boolean; error?: string }[];
  }>> {
    const results: { email: string; success: boolean; error?: string }[] = [];
    let sent = 0;
    let failed = 0;

    for (const request of requests) {
      const result = await this.sendEmail(tenantId, userId, provider, request);
      
      if (result.success) {
        sent++;
        results.push({ email: request.to[0].email, success: true });
      } else {
        failed++;
        results.push({ 
          email: request.to[0].email, 
          success: false, 
          error: result.error?.message 
        });
      }

      // Small delay between emails to avoid rate limits
      await this.sleep(100);
    }

    return this.success({ sent, failed, results });
  }

  // ==========================================================================
  // OUTLOOK CALENDAR INTEGRATION
  // ==========================================================================

  /**
   * Create calendar event in Outlook
   */
  async outlookCreateEvent(
    tenantId: string,
    userId: string,
    event: Omit<OutlookCalendarEvent, 'id'>
  ): Promise<IntegrationResult<OutlookCalendarEvent>> {
    return this.withConnection(tenantId, userId, 'outlook_365', async (connection) => {
      await this.checkRateLimit(tenantId, 'outlook_365');

      const eventData: Record<string, any> = {
        subject: event.subject,
        body: {
          contentType: event.bodyHtml ? 'html' : 'text',
          content: event.bodyHtml || event.bodyText || ''
        },
        start: {
          dateTime: event.start.toISOString(),
          timeZone: event.timeZone
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: event.timeZone
        },
        isAllDay: event.isAllDay,
        attendees: event.attendees.map(a => ({
          emailAddress: { address: a.email, name: a.name },
          type: a.type
        })),
        isOnlineMeeting: event.isOnlineMeeting
      };

      if (event.location) {
        eventData.location = {
          displayName: event.location.displayName,
          address: event.location.address ? {
            street: event.location.address
          } : undefined
        };
      }

      if (event.isOnlineMeeting) {
        eventData.onlineMeetingProvider = event.onlineMeetingProvider || 'teamsForBusiness';
      }

      if (event.recurrence) {
        eventData.recurrence = this.buildOutlookRecurrence(event.recurrence);
      }

      const response = await this.makeRequest<any>(
        'outlook_365',
        connection.credentials!,
        'POST',
        '/me/events',
        eventData
      );

      const createdEvent: OutlookCalendarEvent = {
        id: response.id,
        subject: response.subject,
        bodyText: response.body?.content,
        start: new Date(response.start.dateTime),
        end: new Date(response.end.dateTime),
        isAllDay: response.isAllDay,
        timeZone: response.start.timeZone,
        isOnlineMeeting: response.isOnlineMeeting,
        onlineMeetingUrl: response.onlineMeeting?.joinUrl,
        attendees: (response.attendees || []).map((a: any) => ({
          email: a.emailAddress.address,
          name: a.emailAddress.name,
          type: a.type.toLowerCase(),
          responseStatus: (a.status?.response || 'none').toLowerCase()
        })),
        reminders: [],
        scholarlyEventId: event.scholarlyEventId
      };

      return this.success(createdEvent);
    });
  }

  /**
   * List calendar events
   */
  async outlookListEvents(
    tenantId: string,
    userId: string,
    options?: {
      startDateTime?: Date;
      endDateTime?: Date;
      maxResults?: number;
    }
  ): Promise<IntegrationResult<OutlookCalendarEvent[]>> {
    return this.withConnection(tenantId, userId, 'outlook_365', async (connection) => {
      await this.checkRateLimit(tenantId, 'outlook_365');

      const params: Record<string, string> = {
        $top: String(options?.maxResults || 50),
        $orderby: 'start/dateTime'
      };

      if (options?.startDateTime) {
        params.$filter = `start/dateTime ge '${options.startDateTime.toISOString()}'`;
        if (options.endDateTime) {
          params.$filter += ` and end/dateTime le '${options.endDateTime.toISOString()}'`;
        }
      }

      const response = await this.makeRequest<{ value: any[] }>(
        'outlook_365',
        connection.credentials!,
        'GET',
        '/me/events',
        undefined,
        params
      );

      const events: OutlookCalendarEvent[] = (response.value || []).map(e => ({
        id: e.id,
        subject: e.subject,
        bodyText: e.body?.content,
        start: new Date(e.start.dateTime),
        end: new Date(e.end.dateTime),
        isAllDay: e.isAllDay,
        timeZone: e.start.timeZone,
        isOnlineMeeting: e.isOnlineMeeting,
        onlineMeetingUrl: e.onlineMeeting?.joinUrl,
        attendees: (e.attendees || []).map((a: any) => ({
          email: a.emailAddress.address,
          name: a.emailAddress.name,
          type: a.type.toLowerCase(),
          responseStatus: (a.status?.response || 'none').toLowerCase()
        })),
        reminders: []
      }));

      return this.success(events);
    });
  }

  /**
   * Update calendar event
   */
  async outlookUpdateEvent(
    tenantId: string,
    userId: string,
    eventId: string,
    updates: Partial<Omit<OutlookCalendarEvent, 'id'>>
  ): Promise<IntegrationResult<OutlookCalendarEvent>> {
    return this.withConnection(tenantId, userId, 'outlook_365', async (connection) => {
      await this.checkRateLimit(tenantId, 'outlook_365');

      const eventData: Record<string, any> = {};

      if (updates.subject) eventData.subject = updates.subject;
      if (updates.bodyHtml || updates.bodyText) {
        eventData.body = {
          contentType: updates.bodyHtml ? 'html' : 'text',
          content: updates.bodyHtml || updates.bodyText
        };
      }
      if (updates.start) {
        eventData.start = {
          dateTime: updates.start.toISOString(),
          timeZone: updates.timeZone || 'UTC'
        };
      }
      if (updates.end) {
        eventData.end = {
          dateTime: updates.end.toISOString(),
          timeZone: updates.timeZone || 'UTC'
        };
      }

      const response = await this.makeRequest<any>(
        'outlook_365',
        connection.credentials!,
        'PATCH',
        `/me/events/${eventId}`,
        eventData
      );

      const updatedEvent: OutlookCalendarEvent = {
        id: response.id,
        subject: response.subject,
        bodyText: response.body?.content,
        start: new Date(response.start.dateTime),
        end: new Date(response.end.dateTime),
        isAllDay: response.isAllDay,
        timeZone: response.start.timeZone,
        isOnlineMeeting: response.isOnlineMeeting,
        onlineMeetingUrl: response.onlineMeeting?.joinUrl,
        attendees: [],
        reminders: []
      };

      return this.success(updatedEvent);
    });
  }

  /**
   * Delete calendar event
   */
  async outlookDeleteEvent(
    tenantId: string,
    userId: string,
    eventId: string
  ): Promise<IntegrationResult<void>> {
    return this.withConnection(tenantId, userId, 'outlook_365', async (connection) => {
      await this.checkRateLimit(tenantId, 'outlook_365');

      await this.makeRequest<void>(
        'outlook_365',
        connection.credentials!,
        'DELETE',
        `/me/events/${eventId}`
      );

      return this.success(undefined);
    });
  }

  // ==========================================================================
  // PAYPAL INTEGRATION
  // ==========================================================================

  /**
   * Create PayPal payment order
   */
  async paypalCreatePayment(
    tenantId: string,
    userId: string,
    request: PayPalPaymentRequest
  ): Promise<IntegrationResult<PayPalPayment>> {
    return this.withConnection(tenantId, userId, 'paypal', async (connection) => {
      await this.checkRateLimit(tenantId, 'paypal');

      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: request.currency,
            value: request.amount.toFixed(2)
          },
          description: request.description,
          invoice_id: request.invoiceNumber,
          custom_id: request.metadata ? JSON.stringify(request.metadata) : undefined
        }],
        application_context: {
          brand_name: 'Scholarly',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: request.returnUrl,
          cancel_url: request.cancelUrl
        }
      };

      const response = await this.makeRequest<any>(
        'paypal',
        connection.credentials!,
        'POST',
        '/v2/checkout/orders',
        orderData
      );

      const approvalLink = response.links.find((l: any) => l.rel === 'approve');

      const payment: PayPalPayment = {
        id: response.id,
        status: response.status.toLowerCase() as any,
        amount: request.amount,
        currency: request.currency,
        approvalUrl: approvalLink?.href,
        createdAt: new Date()
      };

      return this.success(payment);
    });
  }

  /**
   * Capture PayPal payment (after user approval)
   */
  async paypalCapturePayment(
    tenantId: string,
    userId: string,
    orderId: string
  ): Promise<IntegrationResult<PayPalPayment>> {
    return this.withConnection(tenantId, userId, 'paypal', async (connection) => {
      await this.checkRateLimit(tenantId, 'paypal');

      const response = await this.makeRequest<any>(
        'paypal',
        connection.credentials!,
        'POST',
        `/v2/checkout/orders/${orderId}/capture`,
        {}
      );

      const capture = response.purchase_units[0].payments.captures[0];

      const payment: PayPalPayment = {
        id: response.id,
        status: response.status.toLowerCase() as any,
        amount: parseFloat(capture.amount.value),
        currency: capture.amount.currency_code,
        fee: capture.seller_receivable_breakdown?.paypal_fee?.value 
          ? parseFloat(capture.seller_receivable_breakdown.paypal_fee.value) 
          : undefined,
        netAmount: capture.seller_receivable_breakdown?.net_amount?.value
          ? parseFloat(capture.seller_receivable_breakdown.net_amount.value)
          : undefined,
        payerEmail: response.payer?.email_address,
        payerId: response.payer?.payer_id,
        createdAt: new Date(response.create_time),
        completedAt: new Date()
      };

      return this.success(payment);
    });
  }

  /**
   * Get PayPal payment details
   */
  async paypalGetPayment(
    tenantId: string,
    userId: string,
    orderId: string
  ): Promise<IntegrationResult<PayPalPayment>> {
    return this.withConnection(tenantId, userId, 'paypal', async (connection) => {
      await this.checkRateLimit(tenantId, 'paypal');

      const response = await this.makeRequest<any>(
        'paypal',
        connection.credentials!,
        'GET',
        `/v2/checkout/orders/${orderId}`
      );

      const payment: PayPalPayment = {
        id: response.id,
        status: response.status.toLowerCase() as any,
        amount: parseFloat(response.purchase_units[0].amount.value),
        currency: response.purchase_units[0].amount.currency_code,
        payerEmail: response.payer?.email_address,
        payerId: response.payer?.payer_id,
        createdAt: new Date(response.create_time)
      };

      return this.success(payment);
    });
  }

  /**
   * Create PayPal subscription
   */
  async paypalCreateSubscription(
    tenantId: string,
    userId: string,
    request: {
      planId: string;
      subscriberEmail: string;
      subscriberName?: string;
      returnUrl: string;
      cancelUrl: string;
      metadata?: Record<string, string>;
    }
  ): Promise<IntegrationResult<PayPalSubscription>> {
    return this.withConnection(tenantId, userId, 'paypal', async (connection) => {
      await this.checkRateLimit(tenantId, 'paypal');

      const subscriptionData = {
        plan_id: request.planId,
        subscriber: {
          email_address: request.subscriberEmail,
          name: request.subscriberName ? {
            given_name: request.subscriberName.split(' ')[0],
            surname: request.subscriberName.split(' ').slice(1).join(' ')
          } : undefined
        },
        application_context: {
          brand_name: 'Scholarly',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: request.returnUrl,
          cancel_url: request.cancelUrl
        },
        custom_id: request.metadata ? JSON.stringify(request.metadata) : undefined
      };

      const response = await this.makeRequest<any>(
        'paypal',
        connection.credentials!,
        'POST',
        '/v1/billing/subscriptions',
        subscriptionData
      );

      const subscription: PayPalSubscription = {
        id: response.id,
        status: response.status.toLowerCase() as any,
        planId: response.plan_id,
        planName: '',  // Would need to fetch plan details
        subscriberEmail: request.subscriberEmail,
        amount: 0,     // Would need to fetch plan details
        currency: 'AUD',
        createdAt: new Date(response.create_time)
      };

      return this.success(subscription);
    });
  }

  /**
   * Cancel PayPal subscription
   */
  async paypalCancelSubscription(
    tenantId: string,
    userId: string,
    subscriptionId: string,
    reason: string
  ): Promise<IntegrationResult<void>> {
    return this.withConnection(tenantId, userId, 'paypal', async (connection) => {
      await this.checkRateLimit(tenantId, 'paypal');

      await this.makeRequest<void>(
        'paypal',
        connection.credentials!,
        'POST',
        `/v1/billing/subscriptions/${subscriptionId}/cancel`,
        { reason }
      );

      return this.success(undefined);
    });
  }

  /**
   * Refund PayPal payment
   */
  async paypalRefundPayment(
    tenantId: string,
    userId: string,
    captureId: string,
    amount?: number,
    currency?: string,
    note?: string
  ): Promise<IntegrationResult<{ refundId: string; status: string }>> {
    return this.withConnection(tenantId, userId, 'paypal', async (connection) => {
      await this.checkRateLimit(tenantId, 'paypal');

      const refundData: Record<string, any> = {};
      if (amount !== undefined && currency) {
        refundData.amount = {
          value: amount.toFixed(2),
          currency_code: currency
        };
      }
      if (note) {
        refundData.note_to_payer = note;
      }

      const response = await this.makeRequest<any>(
        'paypal',
        connection.credentials!,
        'POST',
        `/v2/payments/captures/${captureId}/refund`,
        Object.keys(refundData).length > 0 ? refundData : undefined
      );

      return this.success({
        refundId: response.id,
        status: response.status.toLowerCase()
      });
    });
  }

  // ==========================================================================
  // PAYID INTEGRATION (Australian NPP)
  // ==========================================================================

  /**
   * Initiate PayID payment
   * 
   * PayID payments in Australia go through the New Payments Platform (NPP).
   * This requires bank-specific API integration.
   */
  async payidCreatePayment(
    tenantId: string,
    userId: string,
    request: PayIDPaymentRequest
  ): Promise<IntegrationResult<PayIDPayment>> {
    return this.withConnection(tenantId, userId, 'payid', async (connection) => {
      // Validate PayID format
      if (!this.isValidPayId(request.recipientPayId)) {
        return this.failure('INVALID_PAYID', 'Invalid PayID format', 'payid');
      }

      // Validate amount (PayID has limits)
      if (request.amount <= 0) {
        return this.failure('INVALID_AMOUNT', 'Amount must be positive', 'payid');
      }

      // Resolve PayID to get recipient details
      const recipientDetails = await this.resolvePayId(connection, request.recipientPayId);
      if (!recipientDetails) {
        return this.failure('PAYID_NOT_FOUND', 'PayID could not be resolved', 'payid');
      }

      // Create payment record
      const payment: PayIDPayment = {
        id: this.generateId('payid'),
        status: 'pending',
        amount: request.amount,
        currency: 'AUD',
        reference: request.reference.substring(0, 280),  // PayID reference max 280 chars
        recipientPayId: request.recipientPayId,
        recipientName: recipientDetails.name,
        initiatedAt: new Date()
      };

      // In production, this would:
      // 1. Call the bank's NPP API to initiate the payment
      // 2. Handle real-time confirmation or pending status
      // 3. Store the NPP transaction ID for reconciliation

      // For now, simulate successful initiation
      payment.status = 'pending';

      return this.success(payment);
    });
  }

  /**
   * Check PayID payment status
   */
  async payidGetPaymentStatus(
    tenantId: string,
    userId: string,
    paymentId: string
  ): Promise<IntegrationResult<PayIDPayment>> {
    return this.withConnection(tenantId, userId, 'payid', async (connection) => {
      // In production, this would query the bank API for the payment status
      // NPP payments are typically near-instant, so status would be:
      // - pending: Payment initiated but not yet processed
      // - completed: Payment successfully transferred
      // - failed: Payment could not be processed
      // - returned: Payment was returned by recipient's bank

      return this.failure(
        'NOT_IMPLEMENTED', 
        'PayID payment status checking requires bank API integration', 
        'payid'
      );
    });
  }

  /**
   * Validate a PayID format
   */
  async payidValidate(
    tenantId: string,
    userId: string,
    payId: string
  ): Promise<IntegrationResult<{
    valid: boolean;
    type: 'email' | 'phone' | 'abn' | 'organisation_id' | 'unknown';
    resolvedName?: string;
  }>> {
    return this.withConnection(tenantId, userId, 'payid', async (connection) => {
      const valid = this.isValidPayId(payId);
      let type: 'email' | 'phone' | 'abn' | 'organisation_id' | 'unknown' = 'unknown';
      let resolvedName: string | undefined;

      if (valid) {
        if (payId.includes('@')) {
          type = 'email';
        } else if (payId.startsWith('+61') || payId.startsWith('04')) {
          type = 'phone';
        } else if (/^\d{11}$/.test(payId.replace(/\s/g, ''))) {
          type = 'abn';
        }

        // Try to resolve
        const resolved = await this.resolvePayId(connection, payId);
        if (resolved) {
          resolvedName = resolved.name;
        }
      }

      return this.success({ valid, type, resolvedName });
    });
  }

  // ==========================================================================
  // WEBHOOK HANDLING
  // ==========================================================================

  /**
   * Process incoming webhook
   */
  async processWebhook(
    provider: IntegrationProvider,
    headers: Record<string, string>,
    body: string
  ): Promise<IntegrationResult<void>> {
    try {
      // Verify signature
      const isValid = await this.verifyWebhookSignature(provider, headers, body);
      if (!isValid) {
        return this.failure('INVALID_SIGNATURE', 'Webhook signature verification failed', provider);
      }

      // Parse payload
      const payload = JSON.parse(body);

      // Store webhook event
      const webhook: IntegrationWebhook = {
        id: this.generateId('wh'),
        provider,
        eventType: this.extractWebhookEventType(provider, payload),
        payload,
        signature: headers['x-signature'] || headers['x-canva-signature'],
        receivedAt: new Date(),
        status: 'pending'
      };

      // Route to provider-specific handler
      switch (provider) {
        case 'canva':
          await this.handleCanvaWebhook(payload);
          break;
        case 'google_classroom':
          await this.handleGoogleClassroomWebhook(payload);
          break;
        case 'paypal':
          await this.handlePayPalWebhook(payload);
          break;
        case 'outlook_365':
          await this.handleOutlookWebhook(payload);
          break;
        default:
          console.log(`Unhandled webhook for provider: ${provider}`);
      }

      webhook.processedAt = new Date();
      webhook.status = 'processed';

      return this.success(undefined);
    } catch (error) {
      return this.failure('WEBHOOK_PROCESSING_FAILED', (error as Error).message, provider);
    }
  }

  // ==========================================================================
  // SYNC ENGINE
  // ==========================================================================

  /**
   * Create a sync job
   */
  async createSyncJob(
    tenantId: string,
    connectionId: string,
    syncType: string,
    settings: Record<string, any>,
    schedule?: {
      type: 'scheduled';
      cronExpression: string;
    }
  ): Promise<IntegrationResult<SyncJob>> {
    try {
      const connection = await this.connectionRepo.findById(tenantId, connectionId);
      if (!connection) {
        return this.failure('CONNECTION_NOT_FOUND', 'Connection not found', 'canva');
      }

      const job: SyncJob = {
        id: this.generateId('sync'),
        tenantId,
        provider: connection.provider,
        connectionId,
        syncType,
        scheduleType: schedule ? 'scheduled' : 'manual',
        cronExpression: schedule?.cronExpression,
        status: 'idle',
        settings,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const savedJob = await this.syncJobRepo.save(tenantId, job);
      return this.success(savedJob);
    } catch (error) {
      return this.failure('SYNC_JOB_CREATION_FAILED', (error as Error).message, 'canva');
    }
  }

  /**
   * Execute a sync job
   */
  async executeSyncJob(
    tenantId: string,
    jobId: string
  ): Promise<IntegrationResult<SyncJobResult>> {
    try {
      const job = await this.syncJobRepo.findById(tenantId, jobId);
      if (!job) {
        return this.failure('JOB_NOT_FOUND', 'Sync job not found', 'canva');
      }

      // Update status to running
      await this.syncJobRepo.update(tenantId, jobId, {
        status: 'running',
        lastRunAt: new Date()
      });

      const startTime = Date.now();
      const result: SyncJobResult = {
        jobId,
        runId: this.generateId('run'),
        status: 'success',
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        recordsFailed: 0,
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 0,
        errors: [],
        warnings: []
      };

      try {
        // Execute provider-specific sync
        switch (job.provider) {
          case 'google_classroom':
            await this.executeGoogleClassroomSync(tenantId, job, result);
            break;
          default:
            result.warnings.push(`Sync not implemented for provider: ${job.provider}`);
        }

        result.completedAt = new Date();
        result.durationMs = Date.now() - startTime;
        result.status = result.recordsFailed > 0 ? 'partial' : 'success';

        // Update job with results
        await this.syncJobRepo.update(tenantId, jobId, {
          status: 'completed',
          lastResult: result,
          updatedAt: new Date()
        });

      } catch (error) {
        result.status = 'failed';
        result.completedAt = new Date();
        result.durationMs = Date.now() - startTime;
        result.errors.push({ error: (error as Error).message });

        await this.syncJobRepo.update(tenantId, jobId, {
          status: 'failed',
          lastResult: result,
          updatedAt: new Date()
        });
      }

      return this.success(result);
    } catch (error) {
      return this.failure('SYNC_EXECUTION_FAILED', (error as Error).message, 'canva');
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private initializeProviderConfigs(config: IntegrationsConfig): Map<IntegrationProvider, ProviderConfig> {
    const configs = new Map<IntegrationProvider, ProviderConfig>();
    const appUrl = config.appUrl || process.env.APP_URL || 'http://localhost:3000';

    // Canva Connect API
    if (config.canva) {
      configs.set('canva', {
        clientId: config.canva.clientId,
        clientSecret: config.canva.clientSecret,
        authorizationUrl: 'https://www.canva.com/api/oauth/authorize',
        tokenUrl: 'https://www.canva.com/api/oauth/token',
        apiBaseUrl: 'https://api.canva.com',
        defaultScopes: ['design:read', 'design:write', 'folder:read', 'brand:read', 'asset:read'],
        webhookSecret: config.canva.webhookSecret
      });
    }

    // Google (Classroom & Gmail share OAuth)
    if (config.google) {
      configs.set('google_classroom', {
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        apiBaseUrl: 'https://classroom.googleapis.com',
        defaultScopes: [
          'https://www.googleapis.com/auth/classroom.courses.readonly',
          'https://www.googleapis.com/auth/classroom.coursework.students',
          'https://www.googleapis.com/auth/classroom.rosters.readonly',
          'https://www.googleapis.com/auth/classroom.announcements.readonly'
        ]
      });

      configs.set('gmail', {
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        apiBaseUrl: 'https://gmail.googleapis.com',
        defaultScopes: [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.labels'
        ]
      });
    }

    // Microsoft (Outlook 365 - Mail & Calendar)
    if (config.microsoft) {
      const tenantId = config.microsoft.tenantId || 'common';
      configs.set('outlook_365', {
        clientId: config.microsoft.clientId,
        clientSecret: config.microsoft.clientSecret,
        authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        apiBaseUrl: 'https://graph.microsoft.com/v1.0',
        defaultScopes: [
          'Mail.Send',
          'Mail.Read',
          'Calendars.ReadWrite',
          'OnlineMeetings.ReadWrite',
          'offline_access'
        ]
      });
    }

    // PayPal
    if (config.paypal) {
      const isSandbox = config.paypal.environment === 'sandbox';
      configs.set('paypal', {
        clientId: config.paypal.clientId,
        clientSecret: config.paypal.clientSecret,
        authorizationUrl: `https://www.${isSandbox ? 'sandbox.' : ''}paypal.com/signin/authorize`,
        tokenUrl: `https://api-m.${isSandbox ? 'sandbox.' : ''}paypal.com/v1/oauth2/token`,
        apiBaseUrl: `https://api-m.${isSandbox ? 'sandbox.' : ''}paypal.com`,
        defaultScopes: ['openid', 'email'],
        webhookId: config.paypal.webhookId
      });
    }

    // PayID (Australian NPP - simplified, would need bank-specific implementation)
    if (config.payid) {
      configs.set('payid', {
        clientId: config.payid.apiKey,
        clientSecret: config.payid.apiSecret,
        authorizationUrl: '',  // PayID doesn't use OAuth
        tokenUrl: '',
        apiBaseUrl: config.payid.environment === 'production' 
          ? 'https://api.nppa.com.au'  // Placeholder - actual URL is bank-specific
          : 'https://api.sandbox.nppa.com.au',
        defaultScopes: []
      });
    }

    // Zimbra
    if (config.zimbra) {
      configs.set('zimbra', {
        clientId: '',
        clientSecret: '',
        authorizationUrl: '',  // Zimbra typically uses preauth or password
        tokenUrl: '',
        apiBaseUrl: config.zimbra.serverUrl,
        defaultScopes: []
      });
    }

    return configs;
  }

  private initializeRateLimits(): Map<IntegrationProvider, RateLimitConfig> {
    const limits = new Map<IntegrationProvider, RateLimitConfig>();
    const now = new Date();

    // Canva limits: 60/min, 1000/hour, 10000/day
    limits.set('canva', {
      provider: 'canva',
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      currentMinuteUsage: 0,
      currentHourUsage: 0,
      currentDayUsage: 0,
      minuteResetAt: new Date(now.getTime() + 60000),
      hourResetAt: new Date(now.getTime() + 3600000),
      dayResetAt: new Date(now.getTime() + 86400000)
    });

    // Google limits: 100/min, 5000/hour
    limits.set('google_classroom', {
      provider: 'google_classroom',
      requestsPerMinute: 100,
      requestsPerHour: 5000,
      requestsPerDay: 50000,
      currentMinuteUsage: 0,
      currentHourUsage: 0,
      currentDayUsage: 0,
      minuteResetAt: new Date(now.getTime() + 60000),
      hourResetAt: new Date(now.getTime() + 3600000),
      dayResetAt: new Date(now.getTime() + 86400000)
    });

    limits.set('gmail', {
      provider: 'gmail',
      requestsPerMinute: 100,
      requestsPerHour: 5000,
      requestsPerDay: 50000,
      currentMinuteUsage: 0,
      currentHourUsage: 0,
      currentDayUsage: 0,
      minuteResetAt: new Date(now.getTime() + 60000),
      hourResetAt: new Date(now.getTime() + 3600000),
      dayResetAt: new Date(now.getTime() + 86400000)
    });

    // Microsoft Graph limits
    limits.set('outlook_365', {
      provider: 'outlook_365',
      requestsPerMinute: 120,
      requestsPerHour: 10000,
      requestsPerDay: 100000,
      currentMinuteUsage: 0,
      currentHourUsage: 0,
      currentDayUsage: 0,
      minuteResetAt: new Date(now.getTime() + 60000),
      hourResetAt: new Date(now.getTime() + 3600000),
      dayResetAt: new Date(now.getTime() + 86400000)
    });

    // PayPal limits
    limits.set('paypal', {
      provider: 'paypal',
      requestsPerMinute: 30,
      requestsPerHour: 500,
      requestsPerDay: 5000,
      currentMinuteUsage: 0,
      currentHourUsage: 0,
      currentDayUsage: 0,
      minuteResetAt: new Date(now.getTime() + 60000),
      hourResetAt: new Date(now.getTime() + 3600000),
      dayResetAt: new Date(now.getTime() + 86400000)
    });

    return limits;
  }

  // OAuth helpers
  private generateState(tenantId: string, userId: string, provider: IntegrationProvider): string {
    const data = {
      tenantId,
      userId,
      provider,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex')
    };
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  private validateState(state: string): { tenantId: string; userId: string; provider: IntegrationProvider } | null {
    try {
      const data = JSON.parse(Buffer.from(state, 'base64url').toString());
      // Check timestamp (15 minute expiry)
      if (Date.now() - data.timestamp > 15 * 60 * 1000) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  private buildAuthorizationUrl(
    provider: IntegrationProvider,
    config: ProviderConfig,
    state: string,
    scopes: string[],
    redirectUri?: string
  ): string {
    const appUrl = this.config.appUrl || process.env.APP_URL || 'http://localhost:3000';
    const callbackUrl = redirectUri || `${appUrl}/api/integrations/${provider}/callback`;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: scopes.join(' '),
      state
    });

    // Provider-specific parameters
    if (provider === 'google_classroom' || provider === 'gmail') {
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    }

    if (provider === 'outlook_365') {
      params.set('response_mode', 'query');
    }

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  private async exchangeAuthorizationCode(
    provider: IntegrationProvider,
    config: ProviderConfig,
    code: string
  ): Promise<OAuthCredentials> {
    const appUrl = this.config.appUrl || process.env.APP_URL || 'http://localhost:3000';
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: `${appUrl}/api/integrations/${provider}/callback`
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'Bearer',
      expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
      scope: (data.scope || '').split(' ').filter(Boolean)
    };
  }

  private async refreshTokens(
    provider: IntegrationProvider,
    config: ProviderConfig,
    refreshToken: string
  ): Promise<OAuthCredentials> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,  // Some providers don't return new refresh token
      tokenType: data.token_type || 'Bearer',
      expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
      scope: (data.scope || '').split(' ').filter(Boolean)
    };
  }

  private async revokeTokens(connection: IntegrationConnection): Promise<void> {
    // Token revocation is provider-specific and optional
    // Some providers don't support it
  }

  private async setupProviderWebhooks(tenantId: string, connection: IntegrationConnection): Promise<void> {
    // Setup webhooks for providers that support them
    // This is provider-specific
  }

  private async removeProviderWebhooks(tenantId: string, connection: IntegrationConnection): Promise<void> {
    // Remove webhooks when disconnecting
  }

  private async withConnection<T>(
    tenantId: string,
    userId: string,
    provider: IntegrationProvider,
    fn: (connection: IntegrationConnection) => Promise<IntegrationResult<T>>
  ): Promise<IntegrationResult<T>> {
    const connection = await this.connectionRepo.findByProvider(tenantId, userId, provider);
    
    if (!connection) {
      return this.failure('NOT_CONNECTED', `Not connected to ${provider}. Please connect first.`, provider);
    }

    if (connection.status !== 'connected') {
      return this.failure('CONNECTION_INVALID', `${provider} connection is ${connection.status}`, provider);
    }

    // Check if tokens need refresh
    if (connection.credentials?.expiresAt && connection.credentials.expiresAt < new Date()) {
      const refreshResult = await this.refreshConnectionTokens(tenantId, connection.id);
      if (!refreshResult.success) {
        return this.failure('TOKEN_REFRESH_FAILED', 'Failed to refresh tokens. Please reconnect.', provider);
      }
      // Get updated connection
      const updatedConnection = await this.connectionRepo.findById(tenantId, connection.id);
      return fn(updatedConnection!);
    }

    return fn(connection);
  }

  private async checkRateLimit(tenantId: string, provider: IntegrationProvider): Promise<void> {
    const usage = await this.rateLimitRepo.getUsage(tenantId, provider);
    const limits = this.rateLimits.get(provider);

    if (!limits) return;

    // Check minute limit
    if (usage.currentMinuteUsage >= limits.requestsPerMinute) {
      const waitTime = Math.ceil((usage.minuteResetAt.getTime() - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded for ${provider}. Try again in ${waitTime} seconds.`);
    }

    // Check hour limit
    if (usage.currentHourUsage >= limits.requestsPerHour) {
      throw new Error(`Hourly rate limit exceeded for ${provider}. Please try again later.`);
    }

    await this.rateLimitRepo.incrementUsage(tenantId, provider);
  }

  private async makeRequest<T>(
    provider: IntegrationProvider,
    credentials: OAuthCredentials,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    body?: any,
    params?: Record<string, string>
  ): Promise<T> {
    const config = this.providerConfigs.get(provider);
    if (!config) {
      throw new Error(`Provider ${provider} not configured`);
    }

    let url = `${config.apiBaseUrl}${path}`;
    if (params && Object.keys(params).length > 0) {
      url += '?' + new URLSearchParams(params).toString();
    }

    const headers: Record<string, string> = {
      'Authorization': `${credentials.tokenType} ${credentials.accessToken}`,
      'Accept': 'application/json'
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${provider} API error: ${response.status} ${errorText}`);
    }

    // Handle empty responses (like DELETE)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return undefined as T;
    }

    return response.json();
  }

  // Email sending helpers
  private async sendGmailMessage(
    connection: IntegrationConnection,
    request: SendEmailRequest
  ): Promise<SendEmailResult> {
    const message = this.buildMimeMessage(request);
    const encoded = Buffer.from(message).toString('base64url');

    const response = await this.makeRequest<any>(
      'gmail',
      connection.credentials!,
      'POST',
      '/gmail/v1/users/me/messages/send',
      { raw: encoded }
    );

    return {
      messageId: response.id,
      threadId: response.threadId,
      status: 'sent',
      sentAt: new Date()
    };
  }

  private async sendOutlookMessage(
    connection: IntegrationConnection,
    request: SendEmailRequest
  ): Promise<SendEmailResult> {
    const message = {
      message: {
        subject: request.subject,
        body: {
          contentType: request.bodyHtml ? 'HTML' : 'Text',
          content: request.bodyHtml || request.bodyText || ''
        },
        toRecipients: request.to.map(r => ({
          emailAddress: { address: r.email, name: r.name }
        })),
        ccRecipients: request.cc?.map(r => ({
          emailAddress: { address: r.email, name: r.name }
        })) || []
      },
      saveToSentItems: true
    };

    await this.makeRequest<any>(
      'outlook_365',
      connection.credentials!,
      'POST',
      '/me/sendMail',
      message
    );

    return {
      messageId: this.generateId('msg'),
      status: 'sent',
      sentAt: new Date()
    };
  }

  private async sendZimbraMessage(
    connection: IntegrationConnection,
    request: SendEmailRequest
  ): Promise<SendEmailResult> {
    // Zimbra uses SOAP API - simplified implementation
    const config = this.providerConfigs.get('zimbra');
    if (!config) {
      throw new Error('Zimbra not configured');
    }

    const soapEnvelope = this.buildZimbraSoapEnvelope(request);

    const response = await fetch(`${config.apiBaseUrl}/service/soap/SendMsgRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml',
        'Authorization': connection.apiKey 
          ? `Basic ${Buffer.from(connection.apiKey).toString('base64')}`
          : `Bearer ${connection.credentials?.accessToken}`
      },
      body: soapEnvelope
    });

    if (!response.ok) {
      throw new Error(`Zimbra API error: ${response.status}`);
    }

    return {
      messageId: this.generateId('msg'),
      status: 'sent',
      sentAt: new Date()
    };
  }

  private buildMimeMessage(request: SendEmailRequest): string {
    const boundary = `----=_Part_${Date.now()}`;
    
    let message = '';
    message += `To: ${request.to.map(r => r.name ? `"${r.name}" <${r.email}>` : r.email).join(', ')}\r\n`;
    if (request.cc && request.cc.length > 0) {
      message += `Cc: ${request.cc.map(r => r.name ? `"${r.name}" <${r.email}>` : r.email).join(', ')}\r\n`;
    }
    message += `Subject: ${request.subject}\r\n`;
    message += `MIME-Version: 1.0\r\n`;
    
    if (request.bodyHtml && request.bodyText) {
      message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
      message += `--${boundary}\r\n`;
      message += `Content-Type: text/plain; charset=utf-8\r\n\r\n`;
      message += `${request.bodyText}\r\n`;
      message += `--${boundary}\r\n`;
      message += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
      message += `${request.bodyHtml}\r\n`;
      message += `--${boundary}--`;
    } else if (request.bodyHtml) {
      message += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
      message += request.bodyHtml;
    } else {
      message += `Content-Type: text/plain; charset=utf-8\r\n\r\n`;
      message += request.bodyText || '';
    }

    return message;
  }

  private buildZimbraSoapEnvelope(request: SendEmailRequest): string {
    const toAddresses = request.to.map(r => 
      `<e t="t" a="${r.email}"${r.name ? ` p="${r.name}"` : ''}/>`
    ).join('');
    
    const ccAddresses = (request.cc || []).map(r => 
      `<e t="c" a="${r.email}"${r.name ? ` p="${r.name}"` : ''}/>`
    ).join('');

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:urn="urn:zimbraMail">
  <soap:Body>
    <SendMsgRequest xmlns="urn:zimbraMail">
      <m>
        <e t="f" a="${request.to[0]?.email}"/>
        ${toAddresses}
        ${ccAddresses}
        <su>${this.escapeXml(request.subject)}</su>
        <mp ct="${request.bodyHtml ? 'text/html' : 'text/plain'}">
          <content>${this.escapeXml(request.bodyHtml || request.bodyText || '')}</content>
        </mp>
      </m>
    </SendMsgRequest>
  </soap:Body>
</soap:Envelope>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Template helpers
  private async getEmailTemplate(tenantId: string, templateId: string): Promise<EmailTemplate | null> {
    // In production, this would fetch from a template repository
    // For now, return a placeholder
    return {
      id: templateId,
      subject: '{{subject}}',
      bodyHtml: '<html><body>{{content}}</body></html>',
      bodyText: '{{content}}'
    };
  }

  private renderEmailTemplate(
    template: EmailTemplate,
    data: Record<string, any>
  ): { subject: string; bodyHtml?: string; bodyText?: string } {
    let subject = template.subject;
    let bodyHtml = template.bodyHtml;
    let bodyText = template.bodyText;

    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, String(value));
      if (bodyHtml) bodyHtml = bodyHtml.replace(regex, String(value));
      if (bodyText) bodyText = bodyText.replace(regex, String(value));
    }

    return { subject, bodyHtml, bodyText };
  }

  // Webhook helpers
  private async verifyWebhookSignature(
    provider: IntegrationProvider,
    headers: Record<string, string>,
    body: string
  ): Promise<boolean> {
    const config = this.providerConfigs.get(provider);
    
    switch (provider) {
      case 'canva':
        if (!config?.webhookSecret) return true;
        return this.verifyCanvaWebhook(headers, body, config.webhookSecret);
      
      case 'paypal':
        return this.verifyPayPalWebhook(headers, body);
      
      default:
        return true;
    }
  }

  private verifyCanvaWebhook(headers: Record<string, string>, body: string, secret: string): boolean {
    const signature = headers['x-canva-signature'];
    if (!signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  private verifyPayPalWebhook(headers: Record<string, string>, body: string): boolean {
    // PayPal webhook verification requires calling their API
    // For now, just check required headers are present
    return !!(
      headers['paypal-transmission-id'] &&
      headers['paypal-transmission-time'] &&
      headers['paypal-cert-url'] &&
      headers['paypal-transmission-sig']
    );
  }

  private extractWebhookEventType(provider: IntegrationProvider, payload: any): string {
    switch (provider) {
      case 'canva':
        return payload.type || 'unknown';
      case 'paypal':
        return payload.event_type || 'unknown';
      case 'google_classroom':
        return payload.message?.attributes?.eventType || 'unknown';
      case 'outlook_365':
        return payload.value?.[0]?.changeType || 'unknown';
      default:
        return 'unknown';
    }
  }

  private async handleCanvaWebhook(payload: any): Promise<void> {
    const eventType = payload.type;
    console.log('Canva webhook:', eventType, payload);
    // Handle different event types
  }

  private async handleGoogleClassroomWebhook(payload: any): Promise<void> {
    console.log('Google Classroom webhook:', payload);
    // Handle push notifications
  }

  private async handlePayPalWebhook(payload: any): Promise<void> {
    const eventType = payload.event_type;
    console.log('PayPal webhook:', eventType, payload);
    // Handle payment events
  }

  private async handleOutlookWebhook(payload: any): Promise<void> {
    console.log('Outlook webhook:', payload);
    // Handle notification changes
  }

  // Sync helpers
  private async syncGoogleClassroomStudents(
    tenantId: string,
    connection: IntegrationConnection,
    courseId: string,
    scholarlyClassroomId: string,
    direction: string
  ): Promise<{ added: number; updated: number; errors: string[] }> {
    const result = { added: 0, updated: 0, errors: [] as string[] };

    try {
      const response = await this.makeRequest<{ students: any[] }>(
        'google_classroom',
        connection.credentials!,
        'GET',
        `/v1/courses/${courseId}/students`
      );

      for (const student of response.students || []) {
        // In production, sync with Scholarly's student records
        result.added++;
      }
    } catch (error) {
      result.errors.push(`Failed to sync students: ${(error as Error).message}`);
    }

    return result;
  }

  private async syncGoogleClassroomTeachers(
    tenantId: string,
    connection: IntegrationConnection,
    courseId: string,
    scholarlyClassroomId: string,
    direction: string
  ): Promise<{ added: number; updated: number; errors: string[] }> {
    const result = { added: 0, updated: 0, errors: [] as string[] };

    try {
      const response = await this.makeRequest<{ teachers: any[] }>(
        'google_classroom',
        connection.credentials!,
        'GET',
        `/v1/courses/${courseId}/teachers`
      );

      for (const teacher of response.teachers || []) {
        result.added++;
      }
    } catch (error) {
      result.errors.push(`Failed to sync teachers: ${(error as Error).message}`);
    }

    return result;
  }

  private async syncGoogleClassroomAssignments(
    tenantId: string,
    connection: IntegrationConnection,
    courseId: string,
    scholarlyClassroomId: string,
    direction: string
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    const result = { created: 0, updated: 0, errors: [] as string[] };

    try {
      const response = await this.makeRequest<{ courseWork: any[] }>(
        'google_classroom',
        connection.credentials!,
        'GET',
        `/v1/courses/${courseId}/courseWork`
      );

      for (const assignment of response.courseWork || []) {
        result.created++;
      }
    } catch (error) {
      result.errors.push(`Failed to sync assignments: ${(error as Error).message}`);
    }

    return result;
  }

  private async syncGoogleClassroomSubmissions(
    tenantId: string,
    connection: IntegrationConnection,
    courseId: string,
    scholarlyClassroomId: string
  ): Promise<{ synced: number; errors: string[] }> {
    const result = { synced: 0, errors: [] as string[] };

    try {
      const courseWorkResponse = await this.makeRequest<{ courseWork: any[] }>(
        'google_classroom',
        connection.credentials!,
        'GET',
        `/v1/courses/${courseId}/courseWork`
      );

      for (const work of courseWorkResponse.courseWork || []) {
        const submissionsResponse = await this.makeRequest<{ studentSubmissions: any[] }>(
          'google_classroom',
          connection.credentials!,
          'GET',
          `/v1/courses/${courseId}/courseWork/${work.id}/studentSubmissions`
        );

        result.synced += (submissionsResponse.studentSubmissions || []).length;
      }
    } catch (error) {
      result.errors.push(`Failed to sync submissions: ${(error as Error).message}`);
    }

    return result;
  }

  private async executeGoogleClassroomSync(
    tenantId: string,
    job: SyncJob,
    result: SyncJobResult
  ): Promise<void> {
    console.log('Executing Google Classroom sync job:', job.id);
    // Implementation would use the sync methods above
  }

  // Canva helpers
  private mapCanvaDesignType(type: CanvaDesignType): string {
    const mapping: Record<CanvaDesignType, string> = {
      'presentation': 'PRESENTATION',
      'document': 'DOC',
      'worksheet': 'DOC',
      'certificate': 'DOC',
      'poster': 'POSTER',
      'infographic': 'INFOGRAPHIC',
      'social_media': 'INSTAGRAM_POST',
      'video': 'VIDEO',
      'whiteboard': 'WHITEBOARD'
    };
    return mapping[type] || 'DOC';
  }

  // Outlook helpers
  private buildOutlookRecurrence(recurrence: any): any {
    return {
      pattern: {
        type: recurrence.pattern,
        interval: recurrence.interval,
        daysOfWeek: recurrence.daysOfWeek
      },
      range: {
        type: recurrence.endDate ? 'endDate' : (recurrence.occurrences ? 'numbered' : 'noEnd'),
        endDate: recurrence.endDate?.toISOString().split('T')[0],
        numberOfOccurrences: recurrence.occurrences
      }
    };
  }

  // PayID helpers
  private isValidPayId(payId: string): boolean {
    // Email format
    if (payId.includes('@')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payId);
    }
    // Australian phone format
    if (payId.startsWith('+61') || payId.startsWith('04')) {
      return /^(\+61|0)4\d{8}$/.test(payId.replace(/\s/g, ''));
    }
    // ABN format (11 digits)
    if (/^\d{11}$/.test(payId.replace(/\s/g, ''))) {
      return true;
    }
    return false;
  }

  private async resolvePayId(
    connection: IntegrationConnection,
    payId: string
  ): Promise<{ name: string; bsb: string; accountNumber: string } | null> {
    // In production, this would call the NPP PayID resolution service
    // For now, return mock data for testing
    return {
      name: 'Test Account',
      bsb: '000-000',
      accountNumber: '000000000'
    };
  }

  // Utility methods
  private success<T>(data: T): IntegrationResult<T> {
    return { success: true, data };
  }

  private failure<T>(code: string, message: string, provider: IntegrationProvider): IntegrationResult<T> {
    return {
      success: false,
      error: {
        code,
        message,
        provider,
        recoverable: !['PROVIDER_NOT_CONFIGURED', 'NOT_CONNECTED'].includes(code)
      }
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { IntegrationsService };
export type {
  IntegrationProvider,
  ConnectionStatus,
  OAuthCredentials,
  IntegrationConnection,
  IntegrationSettings,
  IntegrationResult,
  IntegrationError,
  CanvaDesign,
  CanvaTemplate,
  CanvaCreateDesignRequest,
  GoogleClassroomCourse,
  GoogleClassroomAssignment,
  GoogleClassroomSyncRequest,
  GoogleClassroomSyncResult,
  SendEmailRequest,
  SendEmailResult,
  OutlookCalendarEvent,
  PayPalPayment,
  PayPalSubscription,
  PayIDPayment,
  SyncJob,
  SyncJobResult
};
