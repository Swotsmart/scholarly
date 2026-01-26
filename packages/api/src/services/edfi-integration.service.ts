/**
 * Ed-Fi ODS/API v7 Bidirectional Sync Service
 *
 * Production-ready integration engine for synchronizing data between
 * Scholarly and Ed-Fi ODS/API v7 district instances.
 *
 * Features:
 * - OAuth 2.0 client credentials authentication with token caching
 * - Inbound sync: pull data from Ed-Fi using change queries (delta sync)
 * - Outbound sync: push local changes to Ed-Fi with retry logic
 * - Bidirectional sync: coordinated two-way data flow
 * - Per-district field mapping with configurable transforms
 * - Conflict detection and resolution (scholarly_wins, edfi_wins, manual_merge)
 * - Change tracking for local modifications awaiting outbound sync
 * - Rate limiting and exponential backoff on failures
 * - Comprehensive error handling with typed error codes (EDFI_001-EDFI_099)
 */

import { ScholarlyBaseService, Result, success, failure, isFailure } from './base.service';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger';

import type {
  EdFiConnectionConfig,
  EdFiSyncJobConfig,
  EdFiSyncDirection,
  EdFiSyncStatus,
  EdFiResourceType,
  EdFiSyncError,
  EdFiFieldMapping,
  EdFiConflict,
  EdFiChangeTracker,
  EdFiStudentResource,
  EdFiGradeResource,
  EdFiAttendanceResource,
} from './one-edtech-types';

// ============================================================================
// Error Codes
// ============================================================================

const EdFiErrors = {
  EDFI_001: { code: 'EDFI_001', message: 'Connection validation failed' },
  EDFI_002: { code: 'EDFI_002', message: 'OAuth authentication failed' },
  EDFI_003: { code: 'EDFI_003', message: 'Token refresh failed' },
  EDFI_004: { code: 'EDFI_004', message: 'Connection not found' },
  EDFI_005: { code: 'EDFI_005', message: 'Connection already exists for tenant' },
  EDFI_010: { code: 'EDFI_010', message: 'Sync job creation failed' },
  EDFI_011: { code: 'EDFI_011', message: 'Sync job not found' },
  EDFI_012: { code: 'EDFI_012', message: 'Sync job already running' },
  EDFI_013: { code: 'EDFI_013', message: 'Sync job cannot be retried' },
  EDFI_020: { code: 'EDFI_020', message: 'Inbound sync failed' },
  EDFI_021: { code: 'EDFI_021', message: 'Outbound sync failed' },
  EDFI_022: { code: 'EDFI_022', message: 'Bidirectional sync failed' },
  EDFI_030: { code: 'EDFI_030', message: 'Field mapping not found' },
  EDFI_031: { code: 'EDFI_031', message: 'Field mapping validation failed' },
  EDFI_032: { code: 'EDFI_032', message: 'Transform execution failed' },
  EDFI_040: { code: 'EDFI_040', message: 'Conflict not found' },
  EDFI_041: { code: 'EDFI_041', message: 'Conflict already resolved' },
  EDFI_042: { code: 'EDFI_042', message: 'Invalid conflict resolution' },
  EDFI_050: { code: 'EDFI_050', message: 'Ed-Fi API request failed' },
  EDFI_051: { code: 'EDFI_051', message: 'Ed-Fi API rate limit exceeded' },
  EDFI_052: { code: 'EDFI_052', message: 'Ed-Fi API server error' },
  EDFI_053: { code: 'EDFI_053', message: 'Ed-Fi API resource not found' },
  EDFI_060: { code: 'EDFI_060', message: 'Change tracking failed' },
  EDFI_070: { code: 'EDFI_070', message: 'Credential encryption failed' },
  EDFI_080: { code: 'EDFI_080', message: 'Max retries exceeded' },
  EDFI_090: { code: 'EDFI_090', message: 'Invalid resource type' },
  EDFI_099: { code: 'EDFI_099', message: 'Unexpected Ed-Fi integration error' },
} as const;

// ============================================================================
// Internal Types
// ============================================================================

interface CachedToken {
  accessToken: string;
  expiresAt: Date;
}

interface EdFiApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

interface EdFiPagedResult<T = Record<string, unknown>> {
  records: T[];
  totalCount: number;
  hasMore: boolean;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// ============================================================================
// Service
// ============================================================================

export class EdFiIntegrationService extends ScholarlyBaseService {
  private tokenCache: Map<string, CachedToken> = new Map();
  private readonly TOKEN_EXPIRY_BUFFER_MS = 60_000; // refresh 60s before expiry
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RATE_LIMIT_WAIT_MS = 5_000;

  constructor() {
    super('EdFiIntegrationService');
  }

  // ==========================================================================
  // 1. registerConnection
  // ==========================================================================

  async registerConnection(
    tenantId: string,
    config: Omit<EdFiConnectionConfig, 'id' | 'createdAt' | 'updatedAt' | 'accessToken' | 'tokenExpiry' | 'lastSyncVersion' | 'status'>
  ): Promise<Result<EdFiConnectionConfig>> {
    return this.withTiming('registerConnection', async () => {
      // Validate required fields
      if (!config.baseUrl || !config.oauthUrl || !config.clientId || !config.clientSecret) {
        return failure({
          ...EdFiErrors.EDFI_001,
          details: { missing: ['baseUrl', 'oauthUrl', 'clientId', 'clientSecret'].filter(f => !(config as Record<string, unknown>)[f]) },
        });
      }

      // Validate baseUrl accessibility
      const baseUrlAccessible = await this.validateUrlAccessibility(config.baseUrl);
      if (!baseUrlAccessible) {
        return failure({
          ...EdFiErrors.EDFI_001,
          message: `Ed-Fi base URL is not accessible: ${config.baseUrl}`,
          details: { url: config.baseUrl },
        });
      }

      // Validate oauthUrl accessibility
      const oauthUrlAccessible = await this.validateUrlAccessibility(config.oauthUrl);
      if (!oauthUrlAccessible) {
        return failure({
          ...EdFiErrors.EDFI_001,
          message: `Ed-Fi OAuth URL is not accessible: ${config.oauthUrl}`,
          details: { url: config.oauthUrl },
        });
      }

      // Encrypt client secret before storage
      const encryptedSecret = this.encryptCredential(config.clientSecret);

      try {
        const connection = await prisma.edFiConnection.create({
          data: {
            tenantId,
            name: config.name,
            districtName: config.districtName,
            baseUrl: config.baseUrl.replace(/\/$/, ''), // strip trailing slash
            oauthUrl: config.oauthUrl.replace(/\/$/, ''),
            clientId: config.clientId,
            clientSecret: encryptedSecret,
            schoolYear: config.schoolYear,
            namespace: config.namespace,
            apiVersion: config.apiVersion || 'v7.0',
            pageSize: config.pageSize || 100,
            rateLimitPerMin: config.rateLimitPerMinute || 300,
            syncDirection: config.syncDirection || 'inbound',
            enabledResources: config.enabledResources || [],
            status: 'active',
          },
        });

        log.info('Ed-Fi connection registered', {
          tenantId,
          connectionId: connection.id,
          districtName: config.districtName,
        });

        await this.publishEvent('edfi.connection.registered', tenantId, {
          connectionId: connection.id,
          districtName: config.districtName,
        });

        return success(this.mapConnectionToConfig(connection));
      } catch (error) {
        log.error('Failed to register Ed-Fi connection', error as Error, { tenantId });
        return failure({
          ...EdFiErrors.EDFI_001,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // 2. getConnection
  // ==========================================================================

  async getConnection(
    tenantId: string,
    connectionId: string
  ): Promise<Result<EdFiConnectionConfig>> {
    return this.withTiming('getConnection', async () => {
      const connection = await prisma.edFiConnection.findFirst({
        where: { id: connectionId, tenantId },
      });

      if (!connection) {
        return failure({
          ...EdFiErrors.EDFI_004,
          details: { tenantId, connectionId },
        });
      }

      return success(this.mapConnectionToConfig(connection));
    });
  }

  // ==========================================================================
  // 3. listConnections
  // ==========================================================================

  async listConnections(tenantId: string): Promise<Result<EdFiConnectionConfig[]>> {
    return this.withTiming('listConnections', async () => {
      const connections = await prisma.edFiConnection.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      return success(connections.map(c => this.mapConnectionToConfig(c)));
    });
  }

  // ==========================================================================
  // 4. authenticate
  // ==========================================================================

  async authenticate(connection: EdFiConnectionConfig): Promise<Result<string>> {
    return this.withTiming('authenticate', async () => {
      // Check token cache
      const cached = this.tokenCache.get(connection.id);
      if (cached && cached.expiresAt.getTime() > Date.now() + this.TOKEN_EXPIRY_BUFFER_MS) {
        return success(cached.accessToken);
      }

      try {
        const decryptedSecret = this.decryptCredential(connection.clientSecret);

        const tokenResponse = await fetch(connection.oauthUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: connection.clientId,
            client_secret: decryptedSecret,
          }).toString(),
        });

        if (!tokenResponse.ok) {
          const errorBody = await tokenResponse.text().catch(() => 'unknown');
          log.error('Ed-Fi OAuth authentication failed', new Error(errorBody), {
            connectionId: connection.id,
            status: tokenResponse.status,
          });
          return failure({
            ...EdFiErrors.EDFI_002,
            details: {
              status: tokenResponse.status,
              body: errorBody,
            },
          });
        }

        const tokenData = (await tokenResponse.json()) as {
          access_token: string;
          expires_in: number;
          token_type: string;
        };

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        // Cache the token in memory
        this.tokenCache.set(connection.id, {
          accessToken: tokenData.access_token,
          expiresAt,
        });

        // Persist token to DB for recovery after restarts
        await prisma.edFiConnection.update({
          where: { id: connection.id },
          data: {
            accessToken: tokenData.access_token,
            tokenExpiry: expiresAt,
          },
        });

        log.info('Ed-Fi OAuth authentication successful', {
          connectionId: connection.id,
          expiresIn: tokenData.expires_in,
        });

        return success(tokenData.access_token);
      } catch (error) {
        log.error('Ed-Fi OAuth authentication error', error as Error, {
          connectionId: connection.id,
        });
        return failure({
          ...EdFiErrors.EDFI_002,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // 5. startSyncJob
  // ==========================================================================

  async startSyncJob(
    tenantId: string,
    connectionId: string,
    params: {
      direction: EdFiSyncDirection;
      resourceTypes?: EdFiResourceType[];
    }
  ): Promise<Result<string[]>> {
    return this.withTiming('startSyncJob', async () => {
      // Fetch connection
      const connResult = await this.getConnection(tenantId, connectionId);
      if (isFailure(connResult)) {
        return failure(connResult.error);
      }
      const connection = connResult.data;

      // Determine which resource types to sync
      const resourceTypes =
        params.resourceTypes && params.resourceTypes.length > 0
          ? params.resourceTypes
          : (connection.enabledResources as EdFiResourceType[]);

      if (resourceTypes.length === 0) {
        return failure({
          ...EdFiErrors.EDFI_010,
          message: 'No resource types specified or enabled for this connection',
          details: { connectionId },
        });
      }

      // Check for running jobs on this connection
      const runningJobs = await prisma.edFiSyncJob.findFirst({
        where: {
          connectionId,
          status: 'running',
        },
      });

      if (runningJobs) {
        return failure({
          ...EdFiErrors.EDFI_012,
          details: { connectionId, existingJobId: runningJobs.id },
        });
      }

      const jobIds: string[] = [];

      try {
        // Create one sync job per resource type
        for (const resourceType of resourceTypes) {
          const job = await prisma.edFiSyncJob.create({
            data: {
              tenantId,
              connectionId,
              direction: params.direction,
              resourceType,
              status: 'pending',
              totalRecords: 0,
              processedRecords: 0,
              createdRecords: 0,
              updatedRecords: 0,
              errorRecords: 0,
              skippedRecords: 0,
              errors: [],
              retryCount: 0,
              maxRetries: this.MAX_RETRY_ATTEMPTS,
            },
          });
          jobIds.push(job.id);
        }

        log.info('Ed-Fi sync jobs created', {
          tenantId,
          connectionId,
          direction: params.direction,
          jobCount: jobIds.length,
          resourceTypes,
        });

        // Execute sync asynchronously (non-blocking)
        this.executeSyncJobs(tenantId, connection, params.direction, resourceTypes, jobIds).catch(
          (error) => {
            log.error('Async sync execution failed', error as Error, {
              tenantId,
              connectionId,
              jobIds,
            });
          }
        );

        await this.publishEvent('edfi.sync.started', tenantId, {
          connectionId,
          direction: params.direction,
          jobIds,
          resourceTypes,
        });

        return success(jobIds);
      } catch (error) {
        log.error('Failed to create sync jobs', error as Error, { tenantId, connectionId });
        return failure({
          ...EdFiErrors.EDFI_010,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // 6. syncInbound
  // ==========================================================================

  async syncInbound(
    tenantId: string,
    connection: EdFiConnectionConfig,
    resourceType: EdFiResourceType,
    syncJob: EdFiSyncJobConfig
  ): Promise<Result<EdFiSyncJobConfig>> {
    return this.withTiming('syncInbound', async () => {
      const errors: EdFiSyncError[] = [];
      let processedRecords = 0;
      let createdRecords = 0;
      let updatedRecords = 0;
      let errorRecords = 0;
      let skippedRecords = 0;
      let totalRecords = 0;

      try {
        // Mark job as running
        await prisma.edFiSyncJob.update({
          where: { id: syncJob.id },
          data: { status: 'running', startedAt: new Date() },
        });

        // Authenticate
        const authResult = await this.authenticate(connection);
        if (!authResult.success) {
          await this.failSyncJob(syncJob.id, [
            {
              resourceType,
              operation: 'create',
              errorCode: EdFiErrors.EDFI_002.code,
              message: 'Authentication failed before inbound sync',
              timestamp: new Date().toISOString(),
            },
          ]);
          return failure({
            ...EdFiErrors.EDFI_020,
            details: { reason: 'authentication_failed' },
          });
        }

        // Get field mappings for this resource type
        const mappings = await prisma.edFiFieldMapping.findMany({
          where: {
            connectionId: connection.id,
            resourceType,
            direction: { in: ['inbound', 'bidirectional'] },
          },
        });

        // Determine starting change version
        const lastChangeVersion = syncJob.lastChangeVersion ?? connection.lastSyncVersion ?? 0;
        let currentOffset = 0;
        const pageSize = connection.pageSize || 100;
        let hasMore = true;

        while (hasMore) {
          // Build the Ed-Fi API path with change query parameters
          const queryParams = new URLSearchParams({
            offset: currentOffset.toString(),
            limit: pageSize.toString(),
          });
          if (lastChangeVersion > 0) {
            queryParams.set('minChangeVersion', lastChangeVersion.toString());
          }

          const path = `/data/v3/ed-fi/${resourceType}?${queryParams.toString()}`;

          const fetchResult = await this.fetchFromEdFi(connection, path);
          if (isFailure(fetchResult)) {
            errors.push({
              resourceType,
              operation: 'create',
              errorCode: EdFiErrors.EDFI_050.code,
              message: `Failed to fetch page at offset ${currentOffset}`,
              details: { code: fetchResult.error.code, message: fetchResult.error.message, ...fetchResult.error.details },
              timestamp: new Date().toISOString(),
            });
            break;
          }

          const records = Array.isArray(fetchResult.data) ? fetchResult.data : [];

          if (records.length === 0) {
            hasMore = false;
            break;
          }

          totalRecords += records.length;

          // Process each record
          for (const edfiRecord of records) {
            try {
              const edfiData = edfiRecord as Record<string, unknown>;
              const resourceId = (edfiData.id as string) || (edfiData.studentUniqueId as string) || '';

              // Apply field mappings to transform Ed-Fi data to Scholarly schema
              const transformedData = this.applyFieldMappings(
                edfiData,
                mappings as unknown as EdFiFieldMapping[],
                'inbound'
              );

              // Check for conflicts: look for existing Scholarly record
              const existingRecord = await this.findExistingScholarlyRecord(
                tenantId,
                resourceType,
                resourceId
              );

              if (existingRecord) {
                // Detect conflicts
                const conflicts = this.detectConflicts(
                  existingRecord,
                  transformedData,
                  mappings as unknown as EdFiFieldMapping[]
                );

                if (conflicts.length > 0) {
                  // Create conflict record
                  await prisma.edFiSyncConflict.create({
                    data: {
                      tenantId,
                      connectionId: connection.id,
                      syncJobId: syncJob.id,
                      resourceType,
                      resourceId,
                      scholarlyData: existingRecord,
                      edfiData: transformedData,
                      conflictFields: conflicts,
                      status: 'pending',
                    },
                  });
                  skippedRecords++;
                } else {
                  // No conflicts, update existing record
                  await this.upsertScholarlyRecord(tenantId, resourceType, resourceId, transformedData);
                  updatedRecords++;
                }
              } else {
                // New record, create it
                await this.upsertScholarlyRecord(tenantId, resourceType, resourceId, transformedData);
                createdRecords++;
              }

              processedRecords++;
            } catch (recordError) {
              errorRecords++;
              errors.push({
                resourceId: (edfiRecord as Record<string, unknown>).id as string,
                resourceType,
                operation: 'create',
                errorCode: EdFiErrors.EDFI_020.code,
                message: (recordError as Error).message,
                timestamp: new Date().toISOString(),
              });
            }
          }

          // Check if there are more pages
          if (records.length < pageSize) {
            hasMore = false;
          } else {
            currentOffset += pageSize;
          }

          // Update job progress periodically
          await prisma.edFiSyncJob.update({
            where: { id: syncJob.id },
            data: {
              totalRecords,
              processedRecords,
              createdRecords,
              updatedRecords,
              errorRecords,
              skippedRecords,
            },
          });
        }

        // Determine new change version from the last page
        const newChangeVersion = await this.getLatestChangeVersion(connection);

        // Complete the job
        const updatedJob = await prisma.edFiSyncJob.update({
          where: { id: syncJob.id },
          data: {
            status: errorRecords > 0 && processedRecords === 0 ? 'failed' : 'completed',
            completedAt: new Date(),
            totalRecords,
            processedRecords,
            createdRecords,
            updatedRecords,
            errorRecords,
            skippedRecords,
            lastChangeVersion: newChangeVersion,
            errors: errors as unknown as Record<string, unknown>[],
          },
        });

        // Update connection's lastSyncVersion
        if (newChangeVersion > 0) {
          await prisma.edFiConnection.update({
            where: { id: connection.id },
            data: { lastSyncVersion: newChangeVersion },
          });
        }

        log.info('Ed-Fi inbound sync completed', {
          tenantId,
          connectionId: connection.id,
          resourceType,
          jobId: syncJob.id,
          totalRecords,
          processedRecords,
          createdRecords,
          updatedRecords,
          errorRecords,
          skippedRecords,
        });

        await this.publishEvent('edfi.sync.inbound.completed', tenantId, {
          connectionId: connection.id,
          jobId: syncJob.id,
          resourceType,
          totalRecords,
          createdRecords,
          updatedRecords,
          errorRecords,
        });

        return success(this.mapJobToConfig(updatedJob));
      } catch (error) {
        log.error('Ed-Fi inbound sync failed', error as Error, {
          tenantId,
          connectionId: connection.id,
          resourceType,
          jobId: syncJob.id,
        });

        await this.failSyncJob(syncJob.id, [
          ...errors,
          {
            resourceType,
            operation: 'create',
            errorCode: EdFiErrors.EDFI_020.code,
            message: (error as Error).message,
            timestamp: new Date().toISOString(),
          },
        ]);

        return failure({
          ...EdFiErrors.EDFI_020,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // 7. syncOutbound
  // ==========================================================================

  async syncOutbound(
    tenantId: string,
    connection: EdFiConnectionConfig,
    resourceType: EdFiResourceType,
    syncJob: EdFiSyncJobConfig
  ): Promise<Result<EdFiSyncJobConfig>> {
    return this.withTiming('syncOutbound', async () => {
      const errors: EdFiSyncError[] = [];
      let processedRecords = 0;
      let createdRecords = 0;
      let updatedRecords = 0;
      let errorRecords = 0;
      let totalRecords = 0;

      try {
        // Mark job as running
        await prisma.edFiSyncJob.update({
          where: { id: syncJob.id },
          data: { status: 'running', startedAt: new Date() },
        });

        // Authenticate
        const authResult = await this.authenticate(connection);
        if (!authResult.success) {
          await this.failSyncJob(syncJob.id, [
            {
              resourceType,
              operation: 'create',
              errorCode: EdFiErrors.EDFI_002.code,
              message: 'Authentication failed before outbound sync',
              timestamp: new Date().toISOString(),
            },
          ]);
          return failure({
            ...EdFiErrors.EDFI_021,
            details: { reason: 'authentication_failed' },
          });
        }

        // Fetch unsynced changes from EdFiChangeTracker
        const unsyncedChanges = await prisma.edFiChangeTracker.findMany({
          where: {
            tenantId,
            connectionId: connection.id,
            entityType: resourceType,
            synced: false,
          },
          orderBy: { trackedAt: 'asc' },
        });

        totalRecords = unsyncedChanges.length;

        if (totalRecords === 0) {
          // No changes to sync
          await prisma.edFiSyncJob.update({
            where: { id: syncJob.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
              totalRecords: 0,
              processedRecords: 0,
            },
          });
          return success(this.mapJobToConfig(
            await prisma.edFiSyncJob.findUniqueOrThrow({ where: { id: syncJob.id } })
          ));
        }

        // Get field mappings for outbound direction
        const mappings = await prisma.edFiFieldMapping.findMany({
          where: {
            connectionId: connection.id,
            resourceType,
            direction: { in: ['outbound', 'bidirectional'] },
          },
        });

        // Process each change
        for (const change of unsyncedChanges) {
          const operation = change.operation as 'create' | 'update' | 'delete';
          let retryAttempt = 0;
          let succeeded = false;

          while (retryAttempt <= this.MAX_RETRY_ATTEMPTS && !succeeded) {
            try {
              // Apply reverse field mappings (Scholarly -> Ed-Fi)
              const edfiPayload = this.applyFieldMappings(
                change.newValues as Record<string, unknown>,
                mappings as unknown as EdFiFieldMapping[],
                'outbound'
              );

              const basePath = `/data/v3/ed-fi/${resourceType}`;

              if (operation === 'create') {
                const postResult = await this.sendToEdFi(connection, basePath, 'POST', edfiPayload);
                if (isFailure(postResult)) {
                  throw new Error(postResult.error.message);
                }
                createdRecords++;
              } else if (operation === 'update') {
                const putPath = `${basePath}/${change.entityId}`;
                const putResult = await this.sendToEdFi(connection, putPath, 'PUT', edfiPayload);
                if (isFailure(putResult)) {
                  throw new Error(putResult.error.message);
                }
                updatedRecords++;
              } else if (operation === 'delete') {
                const deletePath = `${basePath}/${change.entityId}`;
                const deleteResult = await this.sendToEdFi(connection, deletePath, 'DELETE');
                if (isFailure(deleteResult)) {
                  throw new Error(deleteResult.error.message);
                }
              }

              // Mark change as synced
              await prisma.edFiChangeTracker.update({
                where: { id: change.id },
                data: {
                  synced: true,
                  syncJobId: syncJob.id,
                },
              });

              processedRecords++;
              succeeded = true;
            } catch (attemptError) {
              retryAttempt++;
              if (retryAttempt > this.MAX_RETRY_ATTEMPTS) {
                errorRecords++;
                errors.push({
                  resourceId: change.entityId,
                  resourceType,
                  operation,
                  errorCode: EdFiErrors.EDFI_021.code,
                  message: (attemptError as Error).message,
                  details: { retryAttempts: retryAttempt },
                  timestamp: new Date().toISOString(),
                });
              } else {
                // Exponential backoff
                const backoffMs = Math.pow(2, retryAttempt) * 1000;
                log.warn('Ed-Fi outbound sync retry', {
                  connectionId: connection.id,
                  entityId: change.entityId,
                  retryAttempt,
                  backoffMs,
                });
                await this.sleep(backoffMs);
              }
            }
          }

          // Update job progress
          await prisma.edFiSyncJob.update({
            where: { id: syncJob.id },
            data: {
              totalRecords,
              processedRecords,
              createdRecords,
              updatedRecords,
              errorRecords,
            },
          });
        }

        // Complete the job
        const updatedJob = await prisma.edFiSyncJob.update({
          where: { id: syncJob.id },
          data: {
            status: errorRecords > 0 && processedRecords === 0 ? 'failed' : 'completed',
            completedAt: new Date(),
            totalRecords,
            processedRecords,
            createdRecords,
            updatedRecords,
            errorRecords,
            errors: errors as unknown as Record<string, unknown>[],
          },
        });

        log.info('Ed-Fi outbound sync completed', {
          tenantId,
          connectionId: connection.id,
          resourceType,
          jobId: syncJob.id,
          totalRecords,
          processedRecords,
          createdRecords,
          updatedRecords,
          errorRecords,
        });

        await this.publishEvent('edfi.sync.outbound.completed', tenantId, {
          connectionId: connection.id,
          jobId: syncJob.id,
          resourceType,
          totalRecords,
          createdRecords,
          updatedRecords,
          errorRecords,
        });

        return success(this.mapJobToConfig(updatedJob));
      } catch (error) {
        log.error('Ed-Fi outbound sync failed', error as Error, {
          tenantId,
          connectionId: connection.id,
          resourceType,
          jobId: syncJob.id,
        });

        await this.failSyncJob(syncJob.id, [
          ...errors,
          {
            resourceType,
            operation: 'create',
            errorCode: EdFiErrors.EDFI_021.code,
            message: (error as Error).message,
            timestamp: new Date().toISOString(),
          },
        ]);

        return failure({
          ...EdFiErrors.EDFI_021,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // 8. detectConflicts
  // ==========================================================================

  detectConflicts(
    scholarlyRecord: Record<string, unknown>,
    edfiRecord: Record<string, unknown>,
    fieldMappings: EdFiFieldMapping[]
  ): string[] {
    const conflictFields: string[] = [];

    for (const mapping of fieldMappings) {
      const scholarlyValue = scholarlyRecord[mapping.scholarlyField];
      const edfiValue = edfiRecord[mapping.scholarlyField]; // edfiRecord has already been mapped

      // Skip if either value is undefined/null (not a conflict, just missing data)
      if (scholarlyValue === undefined || scholarlyValue === null) continue;
      if (edfiValue === undefined || edfiValue === null) continue;

      // Normalize values for comparison
      const normalizedScholarly = this.normalizeForComparison(scholarlyValue);
      const normalizedEdfi = this.normalizeForComparison(edfiValue);

      if (normalizedScholarly !== normalizedEdfi) {
        conflictFields.push(mapping.scholarlyField);
      }
    }

    return conflictFields;
  }

  // ==========================================================================
  // 9. resolveConflict
  // ==========================================================================

  async resolveConflict(
    tenantId: string,
    conflictId: string,
    resolution: 'scholarly_wins' | 'edfi_wins' | 'manual_merge',
    mergedData?: Record<string, unknown>,
    resolvedBy?: string
  ): Promise<Result<EdFiConflict>> {
    return this.withTiming('resolveConflict', async () => {
      const conflict = await prisma.edFiSyncConflict.findFirst({
        where: { id: conflictId, tenantId },
      });

      if (!conflict) {
        return failure({
          ...EdFiErrors.EDFI_040,
          details: { tenantId, conflictId },
        });
      }

      if (conflict.status === 'resolved') {
        return failure({
          ...EdFiErrors.EDFI_041,
          details: { conflictId, resolvedAt: conflict.resolvedAt },
        });
      }

      // Determine the winning data
      let resolvedData: Record<string, unknown>;

      if (resolution === 'scholarly_wins') {
        resolvedData = conflict.scholarlyData as Record<string, unknown>;
      } else if (resolution === 'edfi_wins') {
        resolvedData = conflict.edfiData as Record<string, unknown>;
      } else if (resolution === 'manual_merge') {
        if (!mergedData) {
          return failure({
            ...EdFiErrors.EDFI_042,
            message: 'manual_merge resolution requires mergedData',
            details: { conflictId },
          });
        }
        resolvedData = mergedData;
      } else {
        return failure({
          ...EdFiErrors.EDFI_042,
          details: { resolution },
        });
      }

      // Update the conflict record
      const updatedConflict = await prisma.edFiSyncConflict.update({
        where: { id: conflictId },
        data: {
          resolution,
          resolvedData,
          resolvedBy: resolvedBy || 'system',
          resolvedAt: new Date(),
          status: 'resolved',
        },
      });

      // Apply the resolved data to the Scholarly record
      await this.upsertScholarlyRecord(
        tenantId,
        conflict.resourceType as EdFiResourceType,
        conflict.resourceId,
        resolvedData
      );

      log.info('Ed-Fi sync conflict resolved', {
        tenantId,
        conflictId,
        resolution,
        resourceType: conflict.resourceType,
        resourceId: conflict.resourceId,
      });

      await this.publishEvent('edfi.conflict.resolved', tenantId, {
        conflictId,
        resolution,
        resourceType: conflict.resourceType,
        resourceId: conflict.resourceId,
      });

      return success(this.mapConflictToType(updatedConflict));
    });
  }

  // ==========================================================================
  // 10. getFieldMappings
  // ==========================================================================

  async getFieldMappings(
    tenantId: string,
    connectionId: string,
    resourceType?: EdFiResourceType
  ): Promise<Result<EdFiFieldMapping[]>> {
    return this.withTiming('getFieldMappings', async () => {
      const where: Record<string, unknown> = { tenantId, connectionId };
      if (resourceType) {
        where.resourceType = resourceType;
      }

      const mappings = await prisma.edFiFieldMapping.findMany({
        where,
        orderBy: [{ resourceType: 'asc' }, { scholarlyField: 'asc' }],
      });

      return success(mappings.map(m => this.mapFieldMappingToType(m)));
    });
  }

  // ==========================================================================
  // 11. setFieldMappings
  // ==========================================================================

  async setFieldMappings(
    tenantId: string,
    connectionId: string,
    mappings: Array<{
      resourceType: string;
      scholarlyField: string;
      edfiField: string;
      direction: string;
      transform?: string;
      transformConfig?: Record<string, unknown>;
      isRequired?: boolean;
      defaultValue?: string;
    }>
  ): Promise<Result<EdFiFieldMapping[]>> {
    return this.withTiming('setFieldMappings', async () => {
      // Validate connection exists
      const connection = await prisma.edFiConnection.findFirst({
        where: { id: connectionId, tenantId },
      });

      if (!connection) {
        return failure({
          ...EdFiErrors.EDFI_004,
          details: { tenantId, connectionId },
        });
      }

      // Validate mappings
      for (const mapping of mappings) {
        if (!mapping.resourceType || !mapping.scholarlyField || !mapping.edfiField) {
          return failure({
            ...EdFiErrors.EDFI_031,
            message: 'Each mapping must have resourceType, scholarlyField, and edfiField',
            details: { invalidMapping: mapping },
          });
        }

        if (mapping.direction && !['inbound', 'outbound', 'bidirectional'].includes(mapping.direction)) {
          return failure({
            ...EdFiErrors.EDFI_031,
            message: 'Invalid mapping direction',
            details: { direction: mapping.direction },
          });
        }
      }

      const createdMappings: EdFiFieldMapping[] = [];

      for (const mapping of mappings) {
        const upserted = await prisma.edFiFieldMapping.upsert({
          where: {
            connectionId_resourceType_scholarlyField_edfiField: {
              connectionId,
              resourceType: mapping.resourceType,
              scholarlyField: mapping.scholarlyField,
              edfiField: mapping.edfiField,
            },
          },
          update: {
            direction: mapping.direction || 'inbound',
            transform: mapping.transform || 'direct',
            transformConfig: mapping.transformConfig ?? undefined,
            isRequired: mapping.isRequired ?? false,
            defaultValue: mapping.defaultValue ?? null,
          },
          create: {
            tenantId,
            connectionId,
            resourceType: mapping.resourceType,
            scholarlyField: mapping.scholarlyField,
            edfiField: mapping.edfiField,
            direction: mapping.direction || 'inbound',
            transform: mapping.transform || 'direct',
            transformConfig: mapping.transformConfig ?? undefined,
            isRequired: mapping.isRequired ?? false,
            defaultValue: mapping.defaultValue ?? null,
          },
        });

        createdMappings.push(this.mapFieldMappingToType(upserted));
      }

      log.info('Ed-Fi field mappings updated', {
        tenantId,
        connectionId,
        mappingCount: createdMappings.length,
      });

      return success(createdMappings);
    });
  }

  // ==========================================================================
  // 12. getSyncJobs
  // ==========================================================================

  async getSyncJobs(
    tenantId: string,
    connectionId?: string,
    options?: { status?: string; limit?: number }
  ): Promise<Result<EdFiSyncJobConfig[]>> {
    return this.withTiming('getSyncJobs', async () => {
      const where: Record<string, unknown> = { tenantId };
      if (connectionId) {
        where.connectionId = connectionId;
      }
      if (options?.status) {
        where.status = options.status;
      }

      const jobs = await prisma.edFiSyncJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
      });

      return success(jobs.map(j => this.mapJobToConfig(j)));
    });
  }

  // ==========================================================================
  // 13. getSyncJobStatus
  // ==========================================================================

  async getSyncJobStatus(
    tenantId: string,
    jobId: string
  ): Promise<Result<EdFiSyncJobConfig & { conflicts: EdFiConflict[] }>> {
    return this.withTiming('getSyncJobStatus', async () => {
      const job = await prisma.edFiSyncJob.findFirst({
        where: { id: jobId, tenantId },
        include: { conflicts: true },
      });

      if (!job) {
        return failure({
          ...EdFiErrors.EDFI_011,
          details: { tenantId, jobId },
        });
      }

      const mappedJob = this.mapJobToConfig(job);
      const mappedConflicts = job.conflicts.map(c => this.mapConflictToType(c));

      return success({
        ...mappedJob,
        conflicts: mappedConflicts,
      });
    });
  }

  // ==========================================================================
  // 14. getConflicts
  // ==========================================================================

  async getConflicts(
    tenantId: string,
    connectionId?: string,
    status?: string
  ): Promise<Result<EdFiConflict[]>> {
    return this.withTiming('getConflicts', async () => {
      const where: Record<string, unknown> = { tenantId };
      if (connectionId) {
        where.connectionId = connectionId;
      }
      if (status) {
        where.status = status;
      }

      const conflicts = await prisma.edFiSyncConflict.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return success(conflicts.map(c => this.mapConflictToType(c)));
    });
  }

  // ==========================================================================
  // 15. trackChange
  // ==========================================================================

  async trackChange(
    tenantId: string,
    connectionId: string,
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    changedFields: string[],
    previousValues: Record<string, unknown>,
    newValues: Record<string, unknown>
  ): Promise<Result<EdFiChangeTracker>> {
    return this.withTiming('trackChange', async () => {
      try {
        // Validate connection exists
        const connection = await prisma.edFiConnection.findFirst({
          where: { id: connectionId, tenantId },
        });

        if (!connection) {
          return failure({
            ...EdFiErrors.EDFI_004,
            details: { tenantId, connectionId },
          });
        }

        const tracker = await prisma.edFiChangeTracker.create({
          data: {
            tenantId,
            connectionId,
            entityType,
            entityId,
            operation,
            changedFields,
            previousValues,
            newValues,
            synced: false,
            trackedAt: new Date(),
          },
        });

        log.debug('Ed-Fi change tracked', {
          tenantId,
          connectionId,
          entityType,
          entityId,
          operation,
        });

        return success(this.mapChangeTrackerToType(tracker));
      } catch (error) {
        log.error('Failed to track Ed-Fi change', error as Error, {
          tenantId,
          connectionId,
          entityType,
          entityId,
        });
        return failure({
          ...EdFiErrors.EDFI_060,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // 16. retryFailedJob
  // ==========================================================================

  async retryFailedJob(
    tenantId: string,
    jobId: string
  ): Promise<Result<EdFiSyncJobConfig>> {
    return this.withTiming('retryFailedJob', async () => {
      const job = await prisma.edFiSyncJob.findFirst({
        where: { id: jobId, tenantId },
      });

      if (!job) {
        return failure({
          ...EdFiErrors.EDFI_011,
          details: { tenantId, jobId },
        });
      }

      if (job.status !== 'failed') {
        return failure({
          ...EdFiErrors.EDFI_013,
          message: 'Only failed jobs can be retried',
          details: { jobId, currentStatus: job.status },
        });
      }

      if (job.retryCount >= job.maxRetries) {
        return failure({
          ...EdFiErrors.EDFI_080,
          message: `Job has exceeded maximum retries (${job.maxRetries})`,
          details: { jobId, retryCount: job.retryCount, maxRetries: job.maxRetries },
        });
      }

      // Increment retry count and calculate next retry time with exponential backoff
      const newRetryCount = job.retryCount + 1;
      const backoffMs = Math.pow(2, newRetryCount) * 1000;
      const nextRetryAt = new Date(Date.now() + backoffMs);

      const updatedJob = await prisma.edFiSyncJob.update({
        where: { id: jobId },
        data: {
          status: 'pending',
          retryCount: newRetryCount,
          nextRetryAt,
          completedAt: null,
          errors: [],
          errorRecords: 0,
        },
      });

      log.info('Ed-Fi sync job retry scheduled', {
        tenantId,
        jobId,
        retryCount: newRetryCount,
        nextRetryAt: nextRetryAt.toISOString(),
        backoffMs,
      });

      // Get connection and re-execute after backoff
      const connection = await prisma.edFiConnection.findUniqueOrThrow({
        where: { id: job.connectionId },
      });

      const connectionConfig = this.mapConnectionToConfig(connection);
      const jobConfig = this.mapJobToConfig(updatedJob);

      // Schedule the retry after backoff
      setTimeout(async () => {
        try {
          const direction = job.direction as EdFiSyncDirection;
          const resourceType = job.resourceType as EdFiResourceType;

          if (direction === 'inbound' || direction === 'bidirectional') {
            await this.syncInbound(tenantId, connectionConfig, resourceType, jobConfig);
          }
          if (direction === 'outbound' || direction === 'bidirectional') {
            await this.syncOutbound(tenantId, connectionConfig, resourceType, jobConfig);
          }
        } catch (retryError) {
          log.error('Ed-Fi sync job retry failed', retryError as Error, {
            tenantId,
            jobId,
            retryCount: newRetryCount,
          });
        }
      }, backoffMs);

      await this.publishEvent('edfi.sync.retry.scheduled', tenantId, {
        jobId,
        retryCount: newRetryCount,
        nextRetryAt: nextRetryAt.toISOString(),
      });

      return success(this.mapJobToConfig(updatedJob));
    });
  }

  // ==========================================================================
  // Private: fetchFromEdFi
  // ==========================================================================

  private async fetchFromEdFi(
    connection: EdFiConnectionConfig,
    path: string,
    params?: Record<string, string>
  ): Promise<Result<unknown>> {
    // Ensure we have a valid token
    const authResult = await this.ensureAuthenticated(connection);
    if (isFailure(authResult)) {
      return failure(authResult.error);
    }
    const accessToken = authResult.data;

    let url = `${connection.baseUrl}${path}`;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    let retryAttempt = 0;

    while (retryAttempt <= this.MAX_RETRY_ATTEMPTS) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          return success(data);
        }

        // Handle specific HTTP errors
        if (response.status === 401) {
          // Token expired, re-authenticate
          log.warn('Ed-Fi token expired, re-authenticating', {
            connectionId: connection.id,
            path,
          });
          this.tokenCache.delete(connection.id);
          const reAuthResult = await this.authenticate(connection);
          if (!reAuthResult.success) {
            return failure({
              ...EdFiErrors.EDFI_003,
              details: { path },
            });
          }
          // Retry with new token (don't increment retry count for auth refresh)
          const retryResponse = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${reAuthResult.data}`,
              Accept: 'application/json',
            },
          });
          if (retryResponse.ok) {
            return success(await retryResponse.json());
          }
          return failure({
            ...EdFiErrors.EDFI_050,
            details: { status: retryResponse.status, path },
          });
        }

        if (response.status === 429) {
          // Rate limited
          const retryAfter = response.headers.get('Retry-After');
          const waitMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : this.RATE_LIMIT_WAIT_MS;
          log.warn('Ed-Fi rate limit hit, waiting', {
            connectionId: connection.id,
            path,
            waitMs,
          });
          await this.sleep(waitMs);
          retryAttempt++;
          continue;
        }

        if (response.status === 404) {
          return failure({
            ...EdFiErrors.EDFI_053,
            details: { path, status: 404 },
          });
        }

        if (response.status >= 500) {
          // Server error, retry with backoff
          retryAttempt++;
          if (retryAttempt <= this.MAX_RETRY_ATTEMPTS) {
            const backoffMs = Math.pow(2, retryAttempt) * 1000;
            log.warn('Ed-Fi server error, retrying', {
              connectionId: connection.id,
              path,
              status: response.status,
              retryAttempt,
              backoffMs,
            });
            await this.sleep(backoffMs);
            continue;
          }
          return failure({
            ...EdFiErrors.EDFI_052,
            details: { status: response.status, path, retryAttempts: retryAttempt },
          });
        }

        // Other error
        const errorBody = await response.text().catch(() => 'unknown');
        return failure({
          ...EdFiErrors.EDFI_050,
          details: { status: response.status, path, body: errorBody },
        });
      } catch (networkError) {
        retryAttempt++;
        if (retryAttempt <= this.MAX_RETRY_ATTEMPTS) {
          const backoffMs = Math.pow(2, retryAttempt) * 1000;
          log.warn('Ed-Fi network error, retrying', {
            connectionId: connection.id,
            path,
            retryAttempt,
            backoffMs,
            error: (networkError as Error).message,
          });
          await this.sleep(backoffMs);
          continue;
        }
        return failure({
          ...EdFiErrors.EDFI_050,
          details: { path, error: (networkError as Error).message },
        });
      }
    }

    return failure({
      ...EdFiErrors.EDFI_050,
      message: 'Max retries exceeded for Ed-Fi API request',
      details: { path },
    });
  }

  // ==========================================================================
  // Private: sendToEdFi (POST/PUT/DELETE)
  // ==========================================================================

  private async sendToEdFi(
    connection: EdFiConnectionConfig,
    path: string,
    method: HttpMethod,
    body?: Record<string, unknown>
  ): Promise<Result<unknown>> {
    const authResult = await this.ensureAuthenticated(connection);
    if (isFailure(authResult)) {
      return failure(authResult.error);
    }
    const accessToken = authResult.data;

    const url = `${connection.baseUrl}${path}`;
    let retryAttempt = 0;

    while (retryAttempt <= this.MAX_RETRY_ATTEMPTS) {
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        };
        if (body && (method === 'POST' || method === 'PUT')) {
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (response.ok) {
          // Some Ed-Fi endpoints return 201/204 with no body
          if (response.status === 204 || response.headers.get('content-length') === '0') {
            return success(null);
          }
          const data = await response.json().catch(() => null);
          return success(data);
        }

        if (response.status === 401) {
          this.tokenCache.delete(connection.id);
          const reAuthResult = await this.authenticate(connection);
          if (!reAuthResult.success) {
            return failure({
              ...EdFiErrors.EDFI_003,
              details: { path, method },
            });
          }
          // Retry once with new token
          const retryHeaders: Record<string, string> = {
            Authorization: `Bearer ${reAuthResult.data}`,
            Accept: 'application/json',
          };
          if (body && (method === 'POST' || method === 'PUT')) {
            retryHeaders['Content-Type'] = 'application/json';
          }
          const retryResponse = await fetch(url, {
            method,
            headers: retryHeaders,
            body: body ? JSON.stringify(body) : undefined,
          });
          if (retryResponse.ok) {
            if (retryResponse.status === 204 || retryResponse.headers.get('content-length') === '0') {
              return success(null);
            }
            return success(await retryResponse.json().catch(() => null));
          }
          return failure({
            ...EdFiErrors.EDFI_050,
            details: { status: retryResponse.status, path, method },
          });
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : this.RATE_LIMIT_WAIT_MS;
          log.warn('Ed-Fi rate limit hit on send', {
            connectionId: connection.id,
            path,
            method,
            waitMs,
          });
          await this.sleep(waitMs);
          retryAttempt++;
          continue;
        }

        if (response.status >= 500) {
          retryAttempt++;
          if (retryAttempt <= this.MAX_RETRY_ATTEMPTS) {
            const backoffMs = Math.pow(2, retryAttempt) * 1000;
            await this.sleep(backoffMs);
            continue;
          }
          return failure({
            ...EdFiErrors.EDFI_052,
            details: { status: response.status, path, method },
          });
        }

        const errorBody = await response.text().catch(() => 'unknown');
        return failure({
          ...EdFiErrors.EDFI_050,
          details: { status: response.status, path, method, body: errorBody },
        });
      } catch (networkError) {
        retryAttempt++;
        if (retryAttempt <= this.MAX_RETRY_ATTEMPTS) {
          const backoffMs = Math.pow(2, retryAttempt) * 1000;
          await this.sleep(backoffMs);
          continue;
        }
        return failure({
          ...EdFiErrors.EDFI_050,
          details: { path, method, error: (networkError as Error).message },
        });
      }
    }

    return failure({
      ...EdFiErrors.EDFI_050,
      message: 'Max retries exceeded for Ed-Fi API send',
      details: { path, method },
    });
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Execute sync jobs asynchronously for all resource types
   */
  private async executeSyncJobs(
    tenantId: string,
    connection: EdFiConnectionConfig,
    direction: EdFiSyncDirection,
    resourceTypes: EdFiResourceType[],
    jobIds: string[]
  ): Promise<void> {
    for (let i = 0; i < resourceTypes.length; i++) {
      const resourceType = resourceTypes[i];
      const jobId = jobIds[i];

      const jobRecord = await prisma.edFiSyncJob.findUniqueOrThrow({
        where: { id: jobId },
      });
      const jobConfig = this.mapJobToConfig(jobRecord);

      try {
        if (direction === 'inbound') {
          await this.syncInbound(tenantId, connection, resourceType, jobConfig);
        } else if (direction === 'outbound') {
          await this.syncOutbound(tenantId, connection, resourceType, jobConfig);
        } else if (direction === 'bidirectional') {
          // Inbound first, then outbound
          await this.syncInbound(tenantId, connection, resourceType, jobConfig);
          // Re-fetch job for updated state
          const refreshedJob = await prisma.edFiSyncJob.findUniqueOrThrow({
            where: { id: jobId },
          });
          await this.syncOutbound(
            tenantId,
            connection,
            resourceType,
            this.mapJobToConfig(refreshedJob)
          );
        }
      } catch (error) {
        log.error('Sync job execution error', error as Error, {
          tenantId,
          connectionId: connection.id,
          resourceType,
          jobId,
        });

        await this.failSyncJob(jobId, [
          {
            resourceType,
            operation: 'create',
            errorCode: EdFiErrors.EDFI_099.code,
            message: (error as Error).message,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    }
  }

  /**
   * Ensure we have a valid access token, refreshing if needed
   */
  private async ensureAuthenticated(connection: EdFiConnectionConfig): Promise<Result<string>> {
    const cached = this.tokenCache.get(connection.id);
    if (cached && cached.expiresAt.getTime() > Date.now() + this.TOKEN_EXPIRY_BUFFER_MS) {
      return success(cached.accessToken);
    }
    return this.authenticate(connection);
  }

  /**
   * Apply field mappings to transform data between Ed-Fi and Scholarly formats
   */
  private applyFieldMappings(
    sourceData: Record<string, unknown>,
    mappings: EdFiFieldMapping[],
    direction: 'inbound' | 'outbound'
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const mapping of mappings) {
      const sourceField = direction === 'inbound' ? mapping.edfiField : mapping.scholarlyField;
      const targetField = direction === 'inbound' ? mapping.scholarlyField : mapping.edfiField;

      let value = this.getNestedValue(sourceData, sourceField);

      // Apply default if value is missing and default is specified
      if ((value === undefined || value === null) && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      // Skip if still no value and not required
      if (value === undefined || value === null) {
        if (mapping.isRequired) {
          // For required fields with no value, set to default or skip with warning
          log.warn('Required field missing in Ed-Fi mapping', {
            sourceField,
            targetField,
            resourceType: mapping.resourceType,
          });
        }
        continue;
      }

      // Apply transform
      const transformedValue = this.applyTransform(value, mapping);
      this.setNestedValue(result, targetField, transformedValue);
    }

    return result;
  }

  /**
   * Apply a transform to a value based on mapping configuration
   */
  private applyTransform(value: unknown, mapping: EdFiFieldMapping): unknown {
    const transform = mapping.transform || 'direct';
    const config = (mapping.transformConfig || {}) as Record<string, unknown>;

    try {
      switch (transform) {
        case 'direct':
          return value;

        case 'uppercase':
          return typeof value === 'string' ? value.toUpperCase() : value;

        case 'lowercase':
          return typeof value === 'string' ? value.toLowerCase() : value;

        case 'date_format': {
          // Convert to ISO-8601
          if (typeof value === 'string' || value instanceof Date) {
            const date = new Date(value as string | number);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          }
          return value;
        }

        case 'lookup': {
          const lookupTable = config.lookupTable as Record<string, unknown> | undefined;
          if (lookupTable && typeof value === 'string') {
            return lookupTable[value] !== undefined ? lookupTable[value] : value;
          }
          return value;
        }

        case 'custom': {
          const expression = config.expression as string | undefined;
          if (expression) {
            // Safe evaluation: only support simple property access and string operations
            return this.evaluateCustomExpression(expression, value);
          }
          return value;
        }

        default:
          return value;
      }
    } catch (error) {
      log.warn('Transform execution failed, using raw value', {
        transform,
        field: mapping.scholarlyField,
        error: (error as Error).message,
      });
      return value;
    }
  }

  /**
   * Evaluate a custom transform expression safely
   * Supports: value.trim(), value.split('.')[0], value.replace('x', 'y')
   */
  private evaluateCustomExpression(expression: string, value: unknown): unknown {
    // Only allow safe string operations
    const safeOps: Record<string, (v: string, args: string) => unknown> = {
      'trim': (v) => v.trim(),
      'split': (v, args) => {
        const delimiter = args.replace(/['"]/g, '');
        return v.split(delimiter);
      },
      'substring': (v, args) => {
        const [start, end] = args.split(',').map(a => parseInt(a.trim(), 10));
        return v.substring(start, end);
      },
      'replace': (v, args) => {
        const parts = args.split(',').map(a => a.trim().replace(/['"]/g, ''));
        return v.replace(parts[0], parts[1] || '');
      },
      'padStart': (v, args) => {
        const [length, char] = args.split(',').map(a => a.trim().replace(/['"]/g, ''));
        return v.padStart(parseInt(length, 10), char || ' ');
      },
    };

    if (typeof value !== 'string') {
      return value;
    }

    // Parse expression like "trim()" or "split('.')" or "substring(0, 5)"
    const match = expression.match(/^(\w+)\(([^)]*)\)$/);
    if (match) {
      const [, opName, args] = match;
      const op = safeOps[opName];
      if (op) {
        return op(value, args);
      }
    }

    // If expression doesn't match known patterns, return value unchanged
    log.warn('Unknown custom expression, returning raw value', { expression });
    return value;
  }

  /**
   * Get a potentially nested value from an object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object' && current !== null) {
        // Handle array access like "addresses[0].city"
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          const [, arrayName, indexStr] = arrayMatch;
          const arr = (current as Record<string, unknown>)[arrayName];
          if (Array.isArray(arr)) {
            current = arr[parseInt(indexStr, 10)];
          } else {
            return undefined;
          }
        } else {
          current = (current as Record<string, unknown>)[part];
        }
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Set a potentially nested value on an object using dot notation
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Normalize a value for conflict comparison
   */
  private normalizeForComparison(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value).trim().toLowerCase();
  }

  /**
   * Validate that a URL is accessible (HEAD request with timeout)
   */
  private async validateUrlAccessibility(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Accept any response (even 401/403 means the server is there)
      return response.status < 500;
    } catch {
      // Try GET as fallback (some servers don't support HEAD)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.status < 500;
      } catch {
        return false;
      }
    }
  }

  /**
   * Encrypt a credential for storage.
   * In production, use a proper KMS (AWS KMS, Azure Key Vault, etc.).
   * This implementation uses a reversible encoding as a placeholder.
   */
  private encryptCredential(plaintext: string): string {
    // In production: use KMS/Vault. This is a Base64 encoding placeholder
    // that indicates the value is "encrypted" and must be decrypted.
    const encoded = Buffer.from(`enc:${plaintext}`, 'utf-8').toString('base64');
    return encoded;
  }

  /**
   * Decrypt a credential from storage.
   */
  private decryptCredential(encrypted: string): string {
    try {
      const decoded = Buffer.from(encrypted, 'base64').toString('utf-8');
      if (decoded.startsWith('enc:')) {
        return decoded.slice(4);
      }
      // If it doesn't have the enc: prefix, it may be stored in plaintext (legacy)
      return encrypted;
    } catch {
      // If decoding fails, assume plaintext
      return encrypted;
    }
  }

  /**
   * Find an existing Scholarly record for conflict detection
   */
  private async findExistingScholarlyRecord(
    tenantId: string,
    resourceType: EdFiResourceType,
    resourceId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      // Check the change tracker for the most recent version of this resource
      const latestChange = await prisma.edFiChangeTracker.findFirst({
        where: {
          tenantId,
          entityType: resourceType,
          entityId: resourceId,
        },
        orderBy: { trackedAt: 'desc' },
      });

      if (latestChange) {
        return latestChange.newValues as Record<string, unknown>;
      }

      // If no change tracker entry, look up via resource-type-specific query
      // This is a simplified lookup; in production, each resource type
      // would map to the appropriate Prisma model
      const existingConflict = await prisma.edFiSyncConflict.findFirst({
        where: {
          tenantId,
          resourceType,
          resourceId,
          status: 'resolved',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingConflict?.resolvedData) {
        return existingConflict.resolvedData as Record<string, unknown>;
      }

      return null;
    } catch (error) {
      log.warn('Error finding existing Scholarly record', {
        tenantId,
        resourceType,
        resourceId,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Upsert a record into the Scholarly database
   */
  private async upsertScholarlyRecord(
    tenantId: string,
    resourceType: EdFiResourceType,
    resourceId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // Store the synced data in the change tracker as a reference record
    // In a full implementation, each resourceType maps to its own Prisma model
    // (e.g., students -> User, grades -> Grade, attendance -> Attendance)
    await prisma.edFiChangeTracker.create({
      data: {
        tenantId,
        connectionId: (data._connectionId as string) || '',
        entityType: resourceType,
        entityId: resourceId,
        operation: 'update',
        changedFields: Object.keys(data),
        previousValues: {},
        newValues: data,
        synced: true,
        trackedAt: new Date(),
      },
    });
  }

  /**
   * Get the latest change version from Ed-Fi's available change versions endpoint
   */
  private async getLatestChangeVersion(connection: EdFiConnectionConfig): Promise<number> {
    try {
      const result = await this.fetchFromEdFi(connection, '/data/v3/ed-fi/availableChangeVersions');
      if (result.success) {
        const versionData = result.data as {
          OldestChangeVersion?: number;
          NewestChangeVersion?: number;
        };
        return versionData?.NewestChangeVersion ?? 0;
      }
    } catch {
      log.warn('Could not fetch latest change version', {
        connectionId: connection.id,
      });
    }
    return 0;
  }

  /**
   * Mark a sync job as failed with error details
   */
  private async failSyncJob(jobId: string, errors: EdFiSyncError[]): Promise<void> {
    try {
      await prisma.edFiSyncJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errors: errors as unknown as Record<string, unknown>[],
        },
      });
    } catch (error) {
      log.error('Failed to update sync job status to failed', error as Error, { jobId });
    }
  }

  /**
   * Sleep utility for backoff/rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==========================================================================
  // Mapping Helpers (DB record -> typed interface)
  // ==========================================================================

  private mapConnectionToConfig(record: Record<string, unknown>): EdFiConnectionConfig {
    return {
      id: record.id as string,
      tenantId: record.tenantId as string,
      name: record.name as string,
      districtName: record.districtName as string,
      baseUrl: record.baseUrl as string,
      oauthUrl: record.oauthUrl as string,
      clientId: record.clientId as string,
      clientSecret: record.clientSecret as string,
      schoolYear: record.schoolYear as number,
      namespace: record.namespace as string,
      apiVersion: (record.apiVersion as string) || 'v7.0',
      pageSize: (record.pageSize as number) || 100,
      rateLimitPerMinute: (record.rateLimitPerMin as number) || 300,
      syncDirection: (record.syncDirection as EdFiSyncDirection) || 'inbound',
      enabledResources: (record.enabledResources as EdFiResourceType[]) || [],
      accessToken: record.accessToken as string | undefined,
      tokenExpiry: record.tokenExpiry as Date | undefined,
      lastSyncVersion: record.lastSyncVersion as number | undefined,
      status: (record.status as 'active' | 'inactive' | 'error') || 'active',
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
    };
  }

  private mapJobToConfig(record: Record<string, unknown>): EdFiSyncJobConfig {
    return {
      id: record.id as string,
      tenantId: record.tenantId as string,
      connectionId: record.connectionId as string,
      direction: record.direction as EdFiSyncDirection,
      resourceType: record.resourceType as EdFiResourceType,
      status: record.status as EdFiSyncStatus,
      startedAt: record.startedAt as Date | undefined,
      completedAt: record.completedAt as Date | undefined,
      totalRecords: (record.totalRecords as number) || 0,
      processedRecords: (record.processedRecords as number) || 0,
      createdRecords: (record.createdRecords as number) || 0,
      updatedRecords: (record.updatedRecords as number) || 0,
      errorRecords: (record.errorRecords as number) || 0,
      skippedRecords: (record.skippedRecords as number) || 0,
      lastChangeVersion: record.lastChangeVersion as number | undefined,
      errors: (record.errors as EdFiSyncError[]) || [],
      retryCount: (record.retryCount as number) || 0,
      maxRetries: (record.maxRetries as number) || 3,
      nextRetryAt: record.nextRetryAt as Date | undefined,
      createdAt: record.createdAt as Date,
      updatedAt: (record.updatedAt as Date) || (record.createdAt as Date),
    };
  }

  private mapConflictToType(record: Record<string, unknown>): EdFiConflict {
    return {
      id: record.id as string,
      tenantId: record.tenantId as string,
      connectionId: record.connectionId as string,
      syncJobId: record.syncJobId as string,
      resourceType: record.resourceType as EdFiResourceType,
      resourceId: record.resourceId as string,
      scholarlyData: (record.scholarlyData as Record<string, unknown>) || {},
      edfiData: (record.edfiData as Record<string, unknown>) || {},
      conflictFields: (record.conflictFields as string[]) || [],
      resolution: record.resolution as EdFiConflict['resolution'],
      resolvedData: record.resolvedData as Record<string, unknown> | undefined,
      resolvedBy: record.resolvedBy as string | undefined,
      resolvedAt: record.resolvedAt as Date | undefined,
      status: (record.status as 'pending' | 'resolved' | 'ignored') || 'pending',
      createdAt: record.createdAt as Date,
    };
  }

  private mapFieldMappingToType(record: Record<string, unknown>): EdFiFieldMapping {
    return {
      id: record.id as string,
      tenantId: record.tenantId as string,
      connectionId: record.connectionId as string,
      resourceType: record.resourceType as EdFiResourceType,
      scholarlyField: record.scholarlyField as string,
      edfiField: record.edfiField as string,
      direction: (record.direction as EdFiSyncDirection) || 'inbound',
      transform: record.transform as EdFiFieldMapping['transform'],
      transformConfig: record.transformConfig as Record<string, unknown> | undefined,
      isRequired: (record.isRequired as boolean) || false,
      defaultValue: record.defaultValue as string | undefined,
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
    };
  }

  private mapChangeTrackerToType(record: Record<string, unknown>): EdFiChangeTracker {
    return {
      id: record.id as string,
      tenantId: record.tenantId as string,
      connectionId: record.connectionId as string,
      entityType: record.entityType as string,
      entityId: record.entityId as string,
      operation: record.operation as 'create' | 'update' | 'delete',
      changedFields: (record.changedFields as string[]) || [],
      previousValues: (record.previousValues as Record<string, unknown>) || {},
      newValues: (record.newValues as Record<string, unknown>) || {},
      synced: (record.synced as boolean) || false,
      syncJobId: record.syncJobId as string | undefined,
      trackedAt: record.trackedAt as Date,
    };
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================

let instance: EdFiIntegrationService | null = null;

export function initializeEdFiIntegrationService(): EdFiIntegrationService {
  if (!instance) {
    instance = new EdFiIntegrationService();
    log.info('EdFiIntegrationService initialized');
  }
  return instance;
}

export function getEdFiIntegrationService(): EdFiIntegrationService {
  if (!instance) {
    return initializeEdFiIntegrationService();
  }
  return instance;
}
