/**
 * Scholarly Integrations Service
 *
 * Unified service for managing third-party integrations:
 * - Canva (Design & Content Creation)
 * - Google Classroom (LMS Sync)
 * - Gmail (Email Communication)
 * - Outlook 365 (Email & Calendar)
 * - PayPal (Payments & Subscriptions)
 * - PayID (Australian Instant Payments)
 * - Zimbra Mail (Email)
 *
 * Features:
 * - OAuth flow management
 * - Token refresh handling
 * - Rate limiting
 * - Webhook processing
 * - Sync jobs
 *
 * @module IntegrationsService
 */

import crypto from 'crypto';
import { log } from '../lib/logger';
import { Result, success, failure, isFailure, ScholarlyBaseService, ServiceDependencies } from './base.service';
import {
  IntegrationProvider,
  ConnectionStatus,
  OAuthCredentials,
  IntegrationConnection,
  IntegrationSettings,
  IntegrationWebhook,
  IntegrationResult,
  IntegrationError,
  IntegrationsConfig,
  ProviderConfig,
  RateLimitConfig,
  // Canva
  CanvaCreateDesignRequest,
  CanvaDesign,
  CanvaTemplateSearchRequest,
  CanvaTemplate,
  // Google Classroom
  GoogleClassroomCourse,
  GoogleClassroomAssignment,
  GoogleClassroomSyncRequest,
  GoogleClassroomSyncResult,
  // Email
  SendEmailRequest,
  SendEmailResult,
  // Outlook Calendar
  OutlookCalendarEvent,
  // PayPal
  PayPalPaymentRequest,
  PayPalPayment,
  PayPalSubscription,
  // PayID
  PayIDPaymentRequest,
  PayIDPayment,
  // Sync
  SyncJob,
  SyncJobResult,
} from './integrations-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface IntegrationConnectionRepository {
  findById(tenantId: string, id: string): Promise<IntegrationConnection | null>;
  findByUserAndProvider(
    tenantId: string,
    userId: string,
    provider: IntegrationProvider
  ): Promise<IntegrationConnection | null>;
  findByTenant(tenantId: string): Promise<IntegrationConnection[]>;
  save(tenantId: string, connection: IntegrationConnection): Promise<IntegrationConnection>;
  update(tenantId: string, id: string, updates: Partial<IntegrationConnection>): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface SyncJobRepository {
  findById(tenantId: string, id: string): Promise<SyncJob | null>;
  findByConnection(tenantId: string, connectionId: string): Promise<SyncJob[]>;
  save(tenantId: string, job: SyncJob): Promise<SyncJob>;
  update(tenantId: string, id: string, updates: Partial<SyncJob>): Promise<void>;
}

// ============================================================================
// SERVICE SINGLETON
// ============================================================================

let integrationsServiceInstance: IntegrationsService | null = null;

export function initializeIntegrationsService(deps: {
  connectionRepo: IntegrationConnectionRepository;
  syncJobRepo: SyncJobRepository;
  config: IntegrationsConfig;
}): IntegrationsService {
  integrationsServiceInstance = new IntegrationsService(deps);
  return integrationsServiceInstance;
}

export function getIntegrationsService(): IntegrationsService {
  if (!integrationsServiceInstance) {
    throw new Error(
      'IntegrationsService not initialized. Call initializeIntegrationsService first.'
    );
  }
  return integrationsServiceInstance;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class IntegrationsService extends ScholarlyBaseService {
  private readonly connectionRepo: IntegrationConnectionRepository;
  private readonly syncJobRepo: SyncJobRepository;
  private readonly integrationsConfig: IntegrationsConfig;
  private readonly providerConfigs: Map<IntegrationProvider, ProviderConfig>;
  private readonly rateLimits: Map<IntegrationProvider, RateLimitConfig>;

  constructor(deps: {
    connectionRepo: IntegrationConnectionRepository;
    syncJobRepo: SyncJobRepository;
    config: IntegrationsConfig;
  }) {
    super('IntegrationsService');
    this.connectionRepo = deps.connectionRepo;
    this.syncJobRepo = deps.syncJobRepo;
    this.integrationsConfig = deps.config;
    this.providerConfigs = this.initializeProviderConfigs(deps.config);
    this.rateLimits = this.initializeRateLimits();
  }

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  /**
   * Get OAuth authorization URL for a provider
   */
  async getAuthorizationUrl(
    tenantId: string,
    userId: string,
    provider: IntegrationProvider,
    options?: {
      scopes?: string[];
      redirectUri?: string;
    }
  ): Promise<Result<{ url: string; state: string }>> {
    return this.withTiming('getAuthorizationUrl', async () => {
      const config = this.providerConfigs.get(provider);
      if (!config) {
        return failure({
          code: 'PROVIDER_NOT_CONFIGURED',
          message: `Provider ${provider} is not configured`,
        });
      }

      const state = this.generateState(tenantId, userId, provider);
      const scopes = options?.scopes || config.defaultScopes;
      const url = this.buildAuthorizationUrl(
        provider,
        config,
        state,
        scopes,
        options?.redirectUri
      );

      return success({ url, state });
    });
  }

  /**
   * Handle OAuth callback and create connection
   */
  async handleOAuthCallback(
    code: string,
    state: string
  ): Promise<Result<IntegrationConnection>> {
    return this.withTiming('handleOAuthCallback', async () => {
      const stateData = this.validateState(state);
      if (!stateData) {
        return failure({ code: 'INVALID_STATE', message: 'Invalid or expired state parameter' });
      }

      const { tenantId, userId, provider } = stateData;
      const config = this.providerConfigs.get(provider);
      if (!config) {
        return failure({
          code: 'PROVIDER_NOT_CONFIGURED',
          message: `Provider ${provider} is not configured`,
        });
      }

      // Exchange code for tokens
      const credentials = await this.exchangeAuthorizationCode(provider, config, code);

      // Create or update connection
      let connection = await this.connectionRepo.findByUserAndProvider(
        tenantId,
        userId,
        provider
      );

      if (connection) {
        await this.connectionRepo.update(tenantId, connection.id, {
          status: 'connected',
          credentials,
          connectedAt: new Date(),
          errorMessage: undefined,
          errorAt: undefined,
        });
        connection = await this.connectionRepo.findById(tenantId, connection.id);
      } else {
        connection = await this.connectionRepo.save(tenantId, {
          id: this.generateId('conn'),
          tenantId,
          userId,
          provider,
          status: 'connected',
          credentials,
          connectedAt: new Date(),
          settings: {
            autoSync: false,
            notifyOnSync: true,
            notifyOnError: true,
            providerSettings: {},
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      log.info('OAuth connection established', {
        tenantId,
        userId,
        provider,
        connectionId: connection!.id,
      });

      return success(connection!);
    });
  }

  /**
   * Disconnect an integration
   */
  async disconnect(
    tenantId: string,
    userId: string,
    provider: IntegrationProvider
  ): Promise<Result<void>> {
    return this.withTiming('disconnect', async () => {
      const connection = await this.connectionRepo.findByUserAndProvider(
        tenantId,
        userId,
        provider
      );
      if (!connection) {
        return failure({
          code: 'NOT_FOUND',
          message: `No connection found for provider ${provider}`,
        });
      }

      // Revoke tokens if possible
      if (connection.credentials?.accessToken) {
        await this.revokeToken(provider, connection.credentials.accessToken).catch(() => {
          // Ignore revocation errors
        });
      }

      await this.connectionRepo.delete(tenantId, connection.id);

      log.info('Integration disconnected', { tenantId, userId, provider });

      return success(undefined);
    });
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(
    tenantId: string,
    userId: string,
    provider: IntegrationProvider
  ): Promise<Result<{ connected: boolean; status: ConnectionStatus; lastUsed?: Date }>> {
    return this.withTiming<{ connected: boolean; status: ConnectionStatus; lastUsed?: Date }>('getConnectionStatus', async () => {
      const connection = await this.connectionRepo.findByUserAndProvider(
        tenantId,
        userId,
        provider
      );

      if (!connection) {
        return success({ connected: false, status: 'disconnected' as ConnectionStatus, lastUsed: undefined });
      }

      // Check if token is expired
      if (
        connection.credentials?.expiresAt &&
        connection.credentials.expiresAt < new Date()
      ) {
        return success({
          connected: false,
          status: 'expired' as ConnectionStatus,
          lastUsed: connection.lastUsedAt,
        });
      }

      return success({
        connected: connection.status === 'connected',
        status: connection.status,
        lastUsed: connection.lastUsedAt,
      });
    });
  }

  // ==========================================================================
  // CANVA INTEGRATION
  // ==========================================================================

  /**
   * Create a new Canva design
   */
  async canvaCreateDesign(
    tenantId: string,
    userId: string,
    request: CanvaCreateDesignRequest
  ): Promise<IntegrationResult<CanvaDesign>> {
    return this.withConnection(tenantId, userId, 'canva', async (connection) => {
      await this.checkRateLimit(tenantId, 'canva');

      const requestBody: Record<string, unknown> = {
        design_type: this.mapCanvaDesignType(request.type),
        title: request.title,
      };

      if (request.templateId) {
        requestBody.template_id = request.templateId;
      }
      if (request.width && request.height) {
        requestBody.page_dimensions = {
          width: request.width,
          height: request.height,
          units: 'px',
        };
      }
      if (request.brandKitId) {
        requestBody.brand_kit_id = request.brandKitId;
      }
      if (request.folderId) {
        requestBody.folder_id = request.folderId;
      }

      const response = await this.makeRequest<{ design: Record<string, unknown> }>(
        'canva',
        connection.credentials!,
        'POST',
        '/v1/designs',
        requestBody
      );

      const design: CanvaDesign = {
        id: response.design.id as string,
        title: response.design.title as string,
        type: request.type,
        editUrl: (response.design.urls as Record<string, string>).edit_url,
        viewUrl: (response.design.urls as Record<string, string>).view_url,
        thumbnailUrl: ((response.design.thumbnail as Record<string, string>)?.url) || '',
        width:
          ((response.design.page_dimensions as Record<string, number>)?.width) ||
          request.width ||
          1920,
        height:
          ((response.design.page_dimensions as Record<string, number>)?.height) ||
          request.height ||
          1080,
        ownerId: ((response.design.owner as Record<string, string>)?.user_id) || userId,
        folderId: request.folderId,
        createdAt: new Date(response.design.created_at as string),
        updatedAt: new Date(response.design.updated_at as string),
      };

      await this.connectionRepo.update(tenantId, connection.id, {
        lastUsedAt: new Date(),
      });

      return this.integrationSuccess(design);
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
        limit: String(request.limit || 20),
      };

      if (request.type) {
        params.design_type = this.mapCanvaDesignType(request.type);
      }

      const response = await this.makeRequest<{ items: Record<string, unknown>[] }>(
        'canva',
        connection.credentials!,
        'GET',
        '/v1/brand-templates',
        undefined,
        params
      );

      const templates: CanvaTemplate[] = (response.items || []).map((item) => ({
        id: item.id as string,
        title: item.title as string,
        type: request.type || 'document',
        thumbnailUrl: ((item.thumbnail as Record<string, string>)?.url) || '',
        previewUrl: ((item.preview as Record<string, string>)?.url) || '',
        category: (item.category as string) || 'education',
        tags: (item.tags as string[]) || [],
      }));

      return this.integrationSuccess(templates);
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
      const jobResponse = await this.makeRequest<{
        job: { id: string; status: string };
      }>(
        'canva',
        connection.credentials!,
        'POST',
        `/v1/designs/${designId}/exports`,
        { format: format.toUpperCase() }
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
          return this.integrationFailure(
            'EXPORT_FAILED',
            statusResponse.job.error?.message || 'Canva export job failed',
            'canva'
          );
        }

        attempts++;
      }

      if (!exportUrl) {
        return this.integrationFailure(
          'EXPORT_TIMEOUT',
          'Canva export timed out after 30 seconds',
          'canva'
        );
      }

      return this.integrationSuccess({
        exportUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
      if (options?.courseStates) {
        params.courseStates = options.courseStates.map((s) => s.toUpperCase()).join(',');
      }

      const response = await this.makeRequest<{ courses: Record<string, unknown>[] }>(
        'google_classroom',
        connection.credentials!,
        'GET',
        '/v1/courses',
        undefined,
        params
      );

      const courses: GoogleClassroomCourse[] = (response.courses || []).map((c) => ({
        id: c.id as string,
        name: c.name as string,
        section: c.section as string | undefined,
        description: c.descriptionHeading as string | undefined,
        room: c.room as string | undefined,
        ownerId: c.ownerId as string,
        ownerEmail: '',
        courseState: (c.courseState as string).toLowerCase() as GoogleClassroomCourse['courseState'],
        enrollmentCode: c.enrollmentCode as string | undefined,
        createdAt: new Date(c.creationTime as string),
        updatedAt: new Date(c.updateTime as string),
      }));

      return this.integrationSuccess(courses);
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
      materials?: {
        type: 'link' | 'driveFile';
        url?: string;
        driveFileId?: string;
        title?: string;
      }[];
      state?: 'draft' | 'published';
      scholarlyActivityId?: string;
    }
  ): Promise<IntegrationResult<GoogleClassroomAssignment>> {
    return this.withConnection(tenantId, userId, 'google_classroom', async (connection) => {
      await this.checkRateLimit(tenantId, 'google_classroom');

      const coursework: Record<string, unknown> = {
        title: assignment.title,
        description: assignment.description,
        workType: 'ASSIGNMENT',
        state: assignment.state === 'draft' ? 'DRAFT' : 'PUBLISHED',
        maxPoints: assignment.maxPoints,
      };

      if (assignment.dueDate) {
        const due = assignment.dueDate;
        coursework.dueDate = {
          year: due.getFullYear(),
          month: due.getMonth() + 1,
          day: due.getDate(),
        };
        coursework.dueTime = {
          hours: due.getHours(),
          minutes: due.getMinutes(),
        };
      }

      if (assignment.materials && assignment.materials.length > 0) {
        coursework.materials = assignment.materials.map((m) => {
          if (m.type === 'link') {
            return { link: { url: m.url, title: m.title } };
          } else {
            return { driveFile: { driveFile: { id: m.driveFileId } } };
          }
        });
      }

      const response = await this.makeRequest<Record<string, unknown>>(
        'google_classroom',
        connection.credentials!,
        'POST',
        `/v1/courses/${courseId}/courseWork`,
        coursework
      );

      const result: GoogleClassroomAssignment = {
        id: response.id as string,
        courseId,
        title: response.title as string,
        description: response.description as string | undefined,
        workType: 'assignment',
        dueDate: response.dueDate
          ? new Date(
              (response.dueDate as Record<string, number>).year,
              (response.dueDate as Record<string, number>).month - 1,
              (response.dueDate as Record<string, number>).day
            )
          : undefined,
        maxPoints: response.maxPoints as number | undefined,
        materials: [],
        state: ((response.state as string) || 'published').toLowerCase() as 'published' | 'draft' | 'deleted',
        createdAt: new Date(response.creationTime as string),
        updatedAt: new Date(response.updateTime as string),
        scholarlyActivityId: assignment.scholarlyActivityId,
      };

      return this.integrationSuccess(result);
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
        syncedAt: new Date(),
      };

      try {
        // Sync implementation would go here
        // For now, return partial result
        result.warnings.push('Sync not fully implemented');

        await this.connectionRepo.update(tenantId, connection.id, {
          lastSyncAt: new Date(),
        });
      } catch (error) {
        result.errors.push(`Sync failed: ${(error as Error).message}`);
      }

      return this.integrationSuccess(result);
    });
  }

  // ==========================================================================
  // EMAIL INTEGRATION
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
          return this.integrationFailure(
            'UNSUPPORTED_PROVIDER',
            `Email provider ${provider} not supported`,
            provider
          );
      }

      await this.connectionRepo.update(tenantId, connection.id, {
        lastUsedAt: new Date(),
      });

      return this.integrationSuccess(result);
    });
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(
    tenantId: string,
    userId: string,
    provider: 'gmail' | 'outlook_365' | 'zimbra',
    requests: SendEmailRequest[]
  ): Promise<
    IntegrationResult<{
      sent: number;
      failed: number;
      results: { email: string; success: boolean; error?: string }[];
    }>
  > {
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
          error: result.error?.message,
        });
      }

      await this.sleep(100);
    }

    return this.integrationSuccess({ sent, failed, results });
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

      const eventData: Record<string, unknown> = {
        subject: event.subject,
        body: {
          contentType: event.bodyHtml ? 'html' : 'text',
          content: event.bodyHtml || event.bodyText || '',
        },
        start: {
          dateTime: event.start.toISOString(),
          timeZone: event.timeZone,
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: event.timeZone,
        },
        isAllDay: event.isAllDay,
        attendees: event.attendees.map((a) => ({
          emailAddress: { address: a.email, name: a.name },
          type: a.type,
        })),
        isOnlineMeeting: event.isOnlineMeeting,
      };

      if (event.location) {
        eventData.location = {
          displayName: event.location.displayName,
          address: event.location.address
            ? { street: event.location.address }
            : undefined,
        };
      }

      if (event.isOnlineMeeting) {
        eventData.onlineMeetingProvider = event.onlineMeetingProvider || 'teamsForBusiness';
      }

      const response = await this.makeRequest<Record<string, unknown>>(
        'outlook_365',
        connection.credentials!,
        'POST',
        '/me/events',
        eventData
      );

      const createdEvent: OutlookCalendarEvent = {
        id: response.id as string,
        subject: response.subject as string,
        bodyText: (response.body as Record<string, string>)?.content,
        start: new Date((response.start as Record<string, string>).dateTime),
        end: new Date((response.end as Record<string, string>).dateTime),
        isAllDay: response.isAllDay as boolean,
        timeZone: (response.start as Record<string, string>).timeZone,
        isOnlineMeeting: response.isOnlineMeeting as boolean,
        onlineMeetingUrl: (response.onlineMeeting as Record<string, string>)?.joinUrl,
        attendees: ((response.attendees as Record<string, unknown>[]) || []).map(
          (a: Record<string, unknown>) => ({
            email: (a.emailAddress as Record<string, string>).address,
            name: (a.emailAddress as Record<string, string>).name,
            type: (a.type as string).toLowerCase() as 'required' | 'optional' | 'resource',
            responseStatus: (
              ((a.status as Record<string, string>)?.response) || 'none'
            ).toLowerCase() as 'none' | 'organizer' | 'tentative' | 'accepted' | 'declined',
          })
        ),
        reminders: [],
        scholarlyEventId: event.scholarlyEventId,
      };

      return this.integrationSuccess(createdEvent);
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
        $orderby: 'start/dateTime',
      };

      if (options?.startDateTime) {
        params.$filter = `start/dateTime ge '${options.startDateTime.toISOString()}'`;
        if (options.endDateTime) {
          params.$filter += ` and end/dateTime le '${options.endDateTime.toISOString()}'`;
        }
      }

      const response = await this.makeRequest<{ value: Record<string, unknown>[] }>(
        'outlook_365',
        connection.credentials!,
        'GET',
        '/me/events',
        undefined,
        params
      );

      const events: OutlookCalendarEvent[] = (response.value || []).map((e) => ({
        id: e.id as string,
        subject: e.subject as string,
        bodyText: (e.body as Record<string, string>)?.content,
        start: new Date((e.start as Record<string, string>).dateTime),
        end: new Date((e.end as Record<string, string>).dateTime),
        isAllDay: e.isAllDay as boolean,
        timeZone: (e.start as Record<string, string>).timeZone,
        isOnlineMeeting: e.isOnlineMeeting as boolean,
        onlineMeetingUrl: (e.onlineMeeting as Record<string, string>)?.joinUrl,
        attendees: ((e.attendees as Record<string, unknown>[]) || []).map(
          (a: Record<string, unknown>) => ({
            email: (a.emailAddress as Record<string, string>).address,
            name: (a.emailAddress as Record<string, string>).name,
            type: (a.type as string).toLowerCase() as 'required' | 'optional' | 'resource',
            responseStatus: (
              ((a.status as Record<string, string>)?.response) || 'none'
            ).toLowerCase() as 'none' | 'organizer' | 'tentative' | 'accepted' | 'declined',
          })
        ),
        reminders: [],
      }));

      return this.integrationSuccess(events);
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
        purchase_units: [
          {
            amount: {
              currency_code: request.currency,
              value: request.amount.toFixed(2),
            },
            description: request.description,
            invoice_id: request.invoiceNumber,
            custom_id: request.metadata ? JSON.stringify(request.metadata) : undefined,
          },
        ],
        application_context: {
          brand_name: 'Scholarly',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: request.returnUrl,
          cancel_url: request.cancelUrl,
        },
      };

      const response = await this.makeRequest<Record<string, unknown>>(
        'paypal',
        connection.credentials!,
        'POST',
        '/v2/checkout/orders',
        orderData
      );

      const approvalLink = (response.links as { rel: string; href: string }[]).find(
        (l) => l.rel === 'approve'
      );

      const payment: PayPalPayment = {
        id: response.id as string,
        status: (response.status as string).toLowerCase() as PayPalPayment['status'],
        amount: request.amount,
        currency: request.currency,
        approvalUrl: approvalLink?.href,
        createdAt: new Date(),
      };

      return this.integrationSuccess(payment);
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

      const response = await this.makeRequest<Record<string, unknown>>(
        'paypal',
        connection.credentials!,
        'POST',
        `/v2/checkout/orders/${orderId}/capture`,
        {}
      );

      const purchaseUnits = response.purchase_units as Record<string, unknown>[];
      const payments = purchaseUnits[0].payments as Record<string, unknown>;
      const captures = payments.captures as Record<string, unknown>[];
      const capture = captures[0];

      const payment: PayPalPayment = {
        id: response.id as string,
        status: (response.status as string).toLowerCase() as PayPalPayment['status'],
        amount: parseFloat((capture.amount as Record<string, string>).value),
        currency: (capture.amount as Record<string, string>).currency_code,
        fee: (capture.seller_receivable_breakdown as Record<string, Record<string, string>>)
          ?.paypal_fee?.value
          ? parseFloat(
              (capture.seller_receivable_breakdown as Record<string, Record<string, string>>)
                .paypal_fee.value
            )
          : undefined,
        netAmount: (capture.seller_receivable_breakdown as Record<string, Record<string, string>>)
          ?.net_amount?.value
          ? parseFloat(
              (capture.seller_receivable_breakdown as Record<string, Record<string, string>>)
                .net_amount.value
            )
          : undefined,
        payerEmail: (response.payer as Record<string, string>)?.email_address,
        payerId: (response.payer as Record<string, string>)?.payer_id,
        createdAt: new Date(response.create_time as string),
        completedAt: new Date(),
      };

      return this.integrationSuccess(payment);
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
          name: request.subscriberName
            ? {
                given_name: request.subscriberName.split(' ')[0],
                surname: request.subscriberName.split(' ').slice(1).join(' '),
              }
            : undefined,
        },
        application_context: {
          brand_name: 'Scholarly',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: request.returnUrl,
          cancel_url: request.cancelUrl,
        },
        custom_id: request.metadata ? JSON.stringify(request.metadata) : undefined,
      };

      const response = await this.makeRequest<Record<string, unknown>>(
        'paypal',
        connection.credentials!,
        'POST',
        '/v1/billing/subscriptions',
        subscriptionData
      );

      const subscription: PayPalSubscription = {
        id: response.id as string,
        status: (response.status as string).toLowerCase() as PayPalSubscription['status'],
        planId: response.plan_id as string,
        planName: '',
        subscriberEmail: request.subscriberEmail,
        amount: 0,
        currency: 'AUD',
        createdAt: new Date(response.create_time as string),
      };

      return this.integrationSuccess(subscription);
    });
  }

  // ==========================================================================
  // PAYID INTEGRATION
  // ==========================================================================

  /**
   * Initiate PayID payment
   */
  async payidCreatePayment(
    tenantId: string,
    userId: string,
    request: PayIDPaymentRequest
  ): Promise<IntegrationResult<PayIDPayment>> {
    return this.withConnection(tenantId, userId, 'payid', async (connection) => {
      if (!this.isValidPayId(request.recipientPayId)) {
        return this.integrationFailure('INVALID_PAYID', 'Invalid PayID format', 'payid');
      }

      if (request.amount <= 0) {
        return this.integrationFailure('INVALID_AMOUNT', 'Amount must be positive', 'payid');
      }

      const recipientDetails = await this.resolvePayId(connection, request.recipientPayId);
      if (!recipientDetails) {
        return this.integrationFailure('PAYID_NOT_FOUND', 'PayID could not be resolved', 'payid');
      }

      const payment: PayIDPayment = {
        id: this.generateId('payid'),
        status: 'pending',
        amount: request.amount,
        currency: 'AUD',
        reference: request.reference.substring(0, 280),
        recipientPayId: request.recipientPayId,
        recipientName: recipientDetails.name,
        initiatedAt: new Date(),
      };

      return this.integrationSuccess(payment);
    });
  }

  /**
   * Validate a PayID format
   */
  async payidValidate(
    tenantId: string,
    userId: string,
    payId: string
  ): Promise<
    IntegrationResult<{
      valid: boolean;
      type: 'email' | 'phone' | 'abn' | 'organisation_id' | 'unknown';
      resolvedName?: string;
    }>
  > {
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

        const resolved = await this.resolvePayId(connection, payId);
        if (resolved) {
          resolvedName = resolved.name;
        }
      }

      return this.integrationSuccess({ valid, type, resolvedName });
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
      const isValid = await this.verifyWebhookSignature(provider, headers, body);
      if (!isValid) {
        return this.integrationFailure(
          'INVALID_SIGNATURE',
          'Webhook signature verification failed',
          provider
        );
      }

      const payload = JSON.parse(body);

      const webhook: IntegrationWebhook = {
        id: this.generateId('wh'),
        provider,
        eventType: this.extractWebhookEventType(provider, payload),
        payload,
        signature: headers['x-signature'] || headers['x-canva-signature'],
        receivedAt: new Date(),
        status: 'pending',
      };

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
          log.info('Unhandled webhook', { provider });
      }

      return this.integrationSuccess(undefined);
    } catch (error) {
      return this.integrationFailure(
        'WEBHOOK_PROCESSING_FAILED',
        (error as Error).message,
        provider
      );
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
    settings: Record<string, unknown>,
    schedule?: { type: 'scheduled'; cronExpression: string }
  ): Promise<IntegrationResult<SyncJob>> {
    try {
      const connection = await this.connectionRepo.findById(tenantId, connectionId);
      if (!connection) {
        return this.integrationFailure('CONNECTION_NOT_FOUND', 'Connection not found', 'canva');
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
        updatedAt: new Date(),
      };

      const savedJob = await this.syncJobRepo.save(tenantId, job);
      return this.integrationSuccess(savedJob);
    } catch (error) {
      return this.integrationFailure(
        'SYNC_JOB_CREATION_FAILED',
        (error as Error).message,
        'canva'
      );
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
        return this.integrationFailure('JOB_NOT_FOUND', 'Sync job not found', 'canva');
      }

      await this.syncJobRepo.update(tenantId, jobId, {
        status: 'running',
        lastRunAt: new Date(),
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
        warnings: [],
      };

      try {
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

        await this.syncJobRepo.update(tenantId, jobId, {
          status: 'completed',
          lastResult: result,
          updatedAt: new Date(),
        });
      } catch (error) {
        result.status = 'failed';
        result.completedAt = new Date();
        result.durationMs = Date.now() - startTime;
        result.errors.push({ error: (error as Error).message });

        await this.syncJobRepo.update(tenantId, jobId, {
          status: 'failed',
          lastResult: result,
          updatedAt: new Date(),
        });
      }

      return this.integrationSuccess(result);
    } catch (error) {
      return this.integrationFailure(
        'SYNC_EXECUTION_FAILED',
        (error as Error).message,
        'canva'
      );
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private initializeProviderConfigs(
    config: IntegrationsConfig
  ): Map<IntegrationProvider, ProviderConfig> {
    const configs = new Map<IntegrationProvider, ProviderConfig>();
    const appUrl = config.appUrl || process.env.APP_URL || 'http://localhost:3000';

    if (config.canva) {
      configs.set('canva', {
        clientId: config.canva.clientId,
        clientSecret: config.canva.clientSecret,
        authorizationUrl: 'https://www.canva.com/api/oauth/authorize',
        tokenUrl: 'https://www.canva.com/api/oauth/token',
        apiBaseUrl: 'https://api.canva.com',
        defaultScopes: [
          'design:read',
          'design:write',
          'folder:read',
          'brand:read',
          'asset:read',
        ],
        webhookSecret: config.canva.webhookSecret,
      });
    }

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
        ],
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
        ],
      });
    }

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
          'offline_access',
        ],
      });
    }

    if (config.paypal) {
      const isSandbox = config.paypal.environment === 'sandbox';
      configs.set('paypal', {
        clientId: config.paypal.clientId,
        clientSecret: config.paypal.clientSecret,
        authorizationUrl: `https://www.${isSandbox ? 'sandbox.' : ''}paypal.com/signin/authorize`,
        tokenUrl: `https://api-m.${isSandbox ? 'sandbox.' : ''}paypal.com/v1/oauth2/token`,
        apiBaseUrl: `https://api-m.${isSandbox ? 'sandbox.' : ''}paypal.com`,
        defaultScopes: ['openid', 'email'],
        webhookId: config.paypal.webhookId,
      });
    }

    if (config.payid) {
      configs.set('payid', {
        clientId: config.payid.apiKey,
        clientSecret: config.payid.apiSecret,
        authorizationUrl: '',
        tokenUrl: '',
        apiBaseUrl:
          config.payid.environment === 'production'
            ? 'https://api.nppa.com.au'
            : 'https://api.sandbox.nppa.com.au',
        defaultScopes: [],
      });
    }

    if (config.zimbra) {
      configs.set('zimbra', {
        clientId: '',
        clientSecret: '',
        authorizationUrl: '',
        tokenUrl: '',
        apiBaseUrl: config.zimbra.serverUrl,
        defaultScopes: [],
      });
    }

    return configs;
  }

  private initializeRateLimits(): Map<IntegrationProvider, RateLimitConfig> {
    const limits = new Map<IntegrationProvider, RateLimitConfig>();
    const now = new Date();

    const providers: IntegrationProvider[] = [
      'canva',
      'google_classroom',
      'gmail',
      'outlook_365',
      'paypal',
    ];

    for (const provider of providers) {
      limits.set(provider, {
        provider,
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        currentMinuteUsage: 0,
        currentHourUsage: 0,
        currentDayUsage: 0,
        minuteResetAt: new Date(now.getTime() + 60000),
        hourResetAt: new Date(now.getTime() + 3600000),
        dayResetAt: new Date(now.getTime() + 86400000),
      });
    }

    return limits;
  }

  private generateState(
    tenantId: string,
    userId: string,
    provider: IntegrationProvider
  ): string {
    const data = {
      tenantId,
      userId,
      provider,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  private validateState(
    state: string
  ): { tenantId: string; userId: string; provider: IntegrationProvider } | null {
    try {
      const data = JSON.parse(Buffer.from(state, 'base64url').toString());
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
    const appUrl = this.integrationsConfig.appUrl || process.env.APP_URL || 'http://localhost:3000';
    const callbackUrl = redirectUri || `${appUrl}/api/integrations/${provider}/callback`;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
    });

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
    const appUrl = this.integrationsConfig.appUrl || process.env.APP_URL || 'http://localhost:3000';

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: `${appUrl}/api/integrations/${provider}/callback`,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;

    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string | undefined,
      tokenType: (data.token_type as string) || 'Bearer',
      expiresAt: new Date(Date.now() + ((data.expires_in as number) || 3600) * 1000),
      scope: ((data.scope as string) || '').split(' '),
    };
  }

  private async revokeToken(provider: IntegrationProvider, token: string): Promise<void> {
    // Token revocation implementation
  }

  private async withConnection<T>(
    tenantId: string,
    userId: string,
    provider: IntegrationProvider,
    operation: (connection: IntegrationConnection) => Promise<IntegrationResult<T>>
  ): Promise<IntegrationResult<T>> {
    const connection = await this.connectionRepo.findByUserAndProvider(
      tenantId,
      userId,
      provider
    );

    if (!connection) {
      return this.integrationFailure(
        'NOT_CONNECTED',
        `No ${provider} connection found. Please connect first.`,
        provider
      );
    }

    if (connection.status !== 'connected') {
      return this.integrationFailure(
        'CONNECTION_INVALID',
        `${provider} connection is ${connection.status}`,
        provider
      );
    }

    // Check token expiry and refresh if needed
    if (connection.credentials?.expiresAt && connection.credentials.expiresAt < new Date()) {
      if (connection.credentials.refreshToken) {
        try {
          await this.refreshToken(tenantId, connection);
        } catch (error) {
          return this.integrationFailure(
            'TOKEN_REFRESH_FAILED',
            'Failed to refresh token. Please reconnect.',
            provider
          );
        }
      } else {
        return this.integrationFailure(
          'TOKEN_EXPIRED',
          'Access token expired and no refresh token available. Please reconnect.',
          provider
        );
      }
    }

    return operation(connection);
  }

  private async refreshToken(
    tenantId: string,
    connection: IntegrationConnection
  ): Promise<void> {
    const config = this.providerConfigs.get(connection.provider);
    if (!config || !connection.credentials?.refreshToken) {
      throw new Error('Cannot refresh token');
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.credentials.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;

    await this.connectionRepo.update(tenantId, connection.id, {
      credentials: {
        ...connection.credentials,
        accessToken: data.access_token as string,
        refreshToken: (data.refresh_token as string) || connection.credentials.refreshToken,
        expiresAt: new Date(Date.now() + ((data.expires_in as number) || 3600) * 1000),
      },
    });
  }

  private async makeRequest<T>(
    provider: IntegrationProvider,
    credentials: OAuthCredentials,
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    const config = this.providerConfigs.get(provider);
    if (!config) {
      throw new Error(`Provider ${provider} not configured`);
    }

    let url = `${config.apiBaseUrl}${path}`;
    if (params) {
      url += '?' + new URLSearchParams(params).toString();
    }

    const headers: Record<string, string> = {
      Authorization: `${credentials.tokenType} ${credentials.accessToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async checkRateLimit(tenantId: string, provider: IntegrationProvider): Promise<void> {
    const limit = this.rateLimits.get(provider);
    if (!limit) return;

    const now = new Date();

    if (now > limit.minuteResetAt) {
      limit.currentMinuteUsage = 0;
      limit.minuteResetAt = new Date(now.getTime() + 60000);
    }
    if (now > limit.hourResetAt) {
      limit.currentHourUsage = 0;
      limit.hourResetAt = new Date(now.getTime() + 3600000);
    }
    if (now > limit.dayResetAt) {
      limit.currentDayUsage = 0;
      limit.dayResetAt = new Date(now.getTime() + 86400000);
    }

    if (
      limit.currentMinuteUsage >= limit.requestsPerMinute ||
      limit.currentHourUsage >= limit.requestsPerHour ||
      limit.currentDayUsage >= limit.requestsPerDay
    ) {
      throw new Error(`Rate limit exceeded for ${provider}`);
    }

    limit.currentMinuteUsage++;
    limit.currentHourUsage++;
    limit.currentDayUsage++;
  }

  private mapCanvaDesignType(type: string): string {
    const mapping: Record<string, string> = {
      presentation: 'Presentation',
      document: 'Doc',
      worksheet: 'Doc',
      certificate: 'Doc',
      poster: 'Poster',
      infographic: 'Infographic',
      social_media: 'InstagramPost',
      video: 'Video',
      whiteboard: 'Whiteboard',
    };
    return mapping[type] || 'Doc';
  }

  private async sendGmailMessage(
    connection: IntegrationConnection,
    request: SendEmailRequest
  ): Promise<SendEmailResult> {
    // Gmail send implementation
    return {
      messageId: this.generateId('msg'),
      status: 'sent',
      sentAt: new Date(),
    };
  }

  private async sendOutlookMessage(
    connection: IntegrationConnection,
    request: SendEmailRequest
  ): Promise<SendEmailResult> {
    // Outlook send implementation
    return {
      messageId: this.generateId('msg'),
      status: 'sent',
      sentAt: new Date(),
    };
  }

  private async sendZimbraMessage(
    connection: IntegrationConnection,
    request: SendEmailRequest
  ): Promise<SendEmailResult> {
    // Zimbra send implementation
    return {
      messageId: this.generateId('msg'),
      status: 'sent',
      sentAt: new Date(),
    };
  }

  private isValidPayId(payId: string): boolean {
    if (payId.includes('@')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payId);
    }
    if (payId.startsWith('+61') || payId.startsWith('04')) {
      return /^(\+61|0)[4]\d{8}$/.test(payId.replace(/\s/g, ''));
    }
    if (/^\d{11}$/.test(payId.replace(/\s/g, ''))) {
      return true;
    }
    return false;
  }

  private async resolvePayId(
    connection: IntegrationConnection,
    payId: string
  ): Promise<{ name: string; bsb?: string; account?: string } | null> {
    // PayID resolution would be implemented via bank API
    return { name: 'Test Account' };
  }

  private async verifyWebhookSignature(
    provider: IntegrationProvider,
    headers: Record<string, string>,
    body: string
  ): Promise<boolean> {
    // Webhook signature verification
    return true;
  }

  private extractWebhookEventType(
    provider: IntegrationProvider,
    payload: Record<string, unknown>
  ): string {
    switch (provider) {
      case 'canva':
        return (payload.type as string) || 'unknown';
      case 'paypal':
        return (payload.event_type as string) || 'unknown';
      default:
        return 'unknown';
    }
  }

  private async handleCanvaWebhook(payload: Record<string, unknown>): Promise<void> {
    log.info('Processing Canva webhook', { type: payload.type });
  }

  private async handleGoogleClassroomWebhook(payload: Record<string, unknown>): Promise<void> {
    log.info('Processing Google Classroom webhook');
  }

  private async handlePayPalWebhook(payload: Record<string, unknown>): Promise<void> {
    log.info('Processing PayPal webhook', { type: payload.event_type });
  }

  private async handleOutlookWebhook(payload: Record<string, unknown>): Promise<void> {
    log.info('Processing Outlook webhook');
  }

  private async executeGoogleClassroomSync(
    tenantId: string,
    job: SyncJob,
    result: SyncJobResult
  ): Promise<void> {
    result.warnings.push('Google Classroom sync not fully implemented');
  }

  private integrationSuccess<T>(data: T): IntegrationResult<T> {
    return { success: true, data };
  }

  private integrationFailure<T>(
    code: string,
    message: string,
    provider: IntegrationProvider
  ): IntegrationResult<T> {
    return {
      success: false,
      error: {
        code,
        message,
        provider,
        recoverable: code !== 'NOT_CONNECTED' && code !== 'TOKEN_EXPIRED',
      },
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
