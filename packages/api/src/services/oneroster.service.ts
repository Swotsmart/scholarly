/**
 * OneRoster 1.2 Service
 *
 * Production-ready implementation of the 1EdTech OneRoster 1.2 standard for
 * Student Information System (SIS) integration. Supports:
 *
 * - OAuth 2.0 client credentials authentication
 * - REST API consumer (fetching orgs, users, classes, enrollments, etc.)
 * - Delta sync using dateLastModified
 * - Configurable field mappings between OneRoster and Scholarly schemas
 * - Bulk CSV import/export per the OneRoster CSV specification
 * - Full query support (filter, sort, limit, offset, fields, dateLastModified)
 *
 * Error codes: ROSTER_001 through ROSTER_099
 */

import { ScholarlyBaseService, Result, success, failure } from './base.service';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger';
import {
  OneRosterOrg,
  OneRosterUser,
  OneRosterClass,
  OneRosterEnrollment,
  OneRosterAcademicSession,
  OneRosterCourse,
  OneRosterDemographic,
  OneRosterQuery,
  OneRosterFilter,
  OneRosterConnection,
  OneRosterFieldMapping,
  OneRosterBulkResult,
  OneRosterStatus,
  OneRosterRoleType,
} from './one-edtech-types';

// ============================================================================
// Constants
// ============================================================================

const ONEROSTER_API_PREFIX = 'ims/oneroster/v1p2';
const TOKEN_EXPIRY_BUFFER_MS = 60_000; // Refresh token 60s before expiry
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 10_000;
const CSV_DELIMITER = ',';

const RESOURCE_ENDPOINTS: Record<string, string> = {
  orgs: 'orgs',
  users: 'users',
  classes: 'classes',
  enrollments: 'enrollments',
  academicSessions: 'academicSessions',
  courses: 'courses',
  demographics: 'demographics',
};

const CSV_HEADERS: Record<string, string[]> = {
  orgs: ['sourcedId', 'status', 'dateLastModified', 'name', 'type', 'identifier', 'parentSourcedId'],
  users: [
    'sourcedId', 'status', 'dateLastModified', 'enabledUser', 'username',
    'givenName', 'familyName', 'middleName', 'role', 'identifier',
    'email', 'sms', 'phone', 'orgSourcedIds', 'grades',
  ],
  classes: [
    'sourcedId', 'status', 'dateLastModified', 'title', 'classCode',
    'classType', 'location', 'grades', 'subjects', 'courseSourcedId',
    'schoolSourcedId', 'termSourcedIds', 'subjectCodes', 'periods',
  ],
  enrollments: [
    'sourcedId', 'status', 'dateLastModified', 'userSourcedId',
    'classSourcedId', 'schoolSourcedId', 'role', 'primary',
    'beginDate', 'endDate',
  ],
  academicSessions: [
    'sourcedId', 'status', 'dateLastModified', 'title', 'type',
    'startDate', 'endDate', 'parentSourcedId', 'schoolYear',
  ],
  courses: [
    'sourcedId', 'status', 'dateLastModified', 'title', 'schoolYearSourcedId',
    'courseCode', 'grades', 'subjects', 'orgSourcedId', 'subjectCodes',
  ],
  demographics: [
    'sourcedId', 'status', 'dateLastModified', 'birthDate', 'sex',
    'americanIndianOrAlaskaNative', 'asian', 'blackOrAfricanAmerican',
    'nativeHawaiianOrOtherPacificIslander', 'white',
    'demographicRaceTwoOrMoreRaces', 'hispanicOrLatinoEthnicity',
    'countryOfBirthCode', 'stateOfBirthAbbreviation', 'cityOfBirth',
    'publicSchoolResidenceStatus',
  ],
};

// ============================================================================
// Types
// ============================================================================

interface SyncOptions {
  fullSync?: boolean;
  batchSize?: number;
  dryRun?: boolean;
}

interface TokenCache {
  accessToken: string;
  expiresAt: Date;
}

type OneRosterResource =
  | OneRosterOrg
  | OneRosterUser
  | OneRosterClass
  | OneRosterEnrollment
  | OneRosterAcademicSession
  | OneRosterCourse
  | OneRosterDemographic;

interface OneRosterApiResponse<T> {
  [key: string]: T[];
}

// ============================================================================
// OneRoster Service
// ============================================================================

export class OneRosterService extends ScholarlyBaseService {
  private tokenCache: Map<string, TokenCache> = new Map();

  constructor() {
    super('OneRosterService');
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /**
   * Register a new OneRoster SIS connection with OAuth2 credentials.
   */
  async registerConnection(
    tenantId: string,
    config: {
      name: string;
      baseUrl: string;
      clientId: string;
      clientSecret: string;
      tokenUrl: string;
      scope?: string;
      fieldMappings?: OneRosterFieldMapping[];
    }
  ): Promise<Result<OneRosterConnection>> {
    return this.withTiming('registerConnection', async () => {
      const validation = this.validateRequired(config, ['name', 'baseUrl', 'clientId', 'clientSecret', 'tokenUrl']);
      if (!validation.success) {
        return failure({ code: 'ROSTER_001', message: 'Missing required connection fields', details: { ...(validation as any).error.details } });
      }

      // Normalize the baseUrl: strip trailing slash
      const baseUrl = config.baseUrl.replace(/\/+$/, '');

      try {
        const connection = await prisma.oneRosterConnection.create({
          data: {
            tenantId,
            name: config.name,
            baseUrl,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            tokenUrl: config.tokenUrl,
            scope: config.scope ?? null,
            syncStatus: 'idle',
            fieldMappings: config.fieldMappings
              ? {
                  create: config.fieldMappings.map((m) => ({
                    sourceField: m.sourceField,
                    targetField: m.targetField,
                    transform: m.transform ?? null,
                    customTransform: m.customTransform ?? null,
                  })),
                }
              : undefined,
          },
          include: { fieldMappings: true },
        });

        log.info('OneRoster connection registered', { tenantId, connectionId: connection.id, name: config.name });

        await this.publishEvent('oneroster.connection.registered', tenantId, {
          connectionId: connection.id,
          name: config.name,
        });

        return success(this.toConnectionType(connection));
      } catch (error) {
        log.error('Failed to register OneRoster connection', error as Error, { tenantId });
        return failure({ code: 'ROSTER_002', message: 'Failed to register OneRoster connection', details: { error: (error as Error).message } });
      }
    });
  }

  /**
   * Retrieve a connection configuration by ID.
   */
  async getConnection(tenantId: string, connectionId: string): Promise<Result<OneRosterConnection>> {
    return this.withTiming('getConnection', async () => {
      const connection = await prisma.oneRosterConnection.findFirst({
        where: { id: connectionId, tenantId },
        include: { fieldMappings: true },
      });

      if (!connection) {
        return failure({ code: 'ROSTER_003', message: 'OneRoster connection not found', details: { connectionId, tenantId } });
      }

      return success(this.toConnectionType(connection));
    });
  }

  // ==========================================================================
  // OAuth 2.0 Authentication
  // ==========================================================================

  /**
   * Authenticate with the OneRoster provider using OAuth 2.0 client credentials flow.
   * Caches the access token in memory and persists to the database.
   */
  async authenticate(connection: OneRosterConnection): Promise<Result<string>> {
    return this.withTiming('authenticate', async () => {
      // Check in-memory cache first
      const cached = this.tokenCache.get(connection.id);
      if (cached && cached.expiresAt.getTime() > Date.now() + TOKEN_EXPIRY_BUFFER_MS) {
        return success(cached.accessToken);
      }

      // Check if DB-stored token is still valid
      if (
        connection.accessToken &&
        connection.tokenExpiry &&
        connection.tokenExpiry.getTime() > Date.now() + TOKEN_EXPIRY_BUFFER_MS
      ) {
        this.tokenCache.set(connection.id, {
          accessToken: connection.accessToken,
          expiresAt: connection.tokenExpiry,
        });
        return success(connection.accessToken);
      }

      // Perform OAuth 2.0 client credentials grant
      try {
        const body = new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: connection.clientId,
          client_secret: connection.clientSecret,
        });
        if (connection.scope) {
          body.set('scope', connection.scope);
        }

        const response = await fetch(connection.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          log.error('OAuth token request failed', new Error(errorText), {
            connectionId: connection.id,
            status: response.status,
          });
          return failure({
            code: 'ROSTER_010',
            message: 'OAuth 2.0 authentication failed',
            details: { status: response.status, response: errorText },
          });
        }

        const tokenData = (await response.json()) as {
          access_token: string;
          expires_in: number;
          token_type: string;
        };

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        // Cache in memory
        this.tokenCache.set(connection.id, {
          accessToken: tokenData.access_token,
          expiresAt,
        });

        // Persist to database
        await prisma.oneRosterConnection.update({
          where: { id: connection.id },
          data: {
            accessToken: tokenData.access_token,
            tokenExpiry: expiresAt,
          },
        });

        log.info('OneRoster OAuth token acquired', {
          connectionId: connection.id,
          expiresIn: tokenData.expires_in,
        });

        return success(tokenData.access_token);
      } catch (error) {
        log.error('OAuth authentication error', error as Error, { connectionId: connection.id });
        return failure({
          code: 'ROSTER_011',
          message: 'Failed to authenticate with OneRoster provider',
          details: { error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // Query Building
  // ==========================================================================

  /**
   * Build a OneRoster REST API query string from structured query parameters.
   * Follows the OneRoster 1.2 specification for filtering, sorting, and pagination.
   */
  buildQueryString(query?: OneRosterQuery): string {
    if (!query) return '';

    const params: string[] = [];

    // Filter parameter: filter=field='value' AND field2>'value2'
    if (query.filter && query.filter.length > 0) {
      const filterParts = query.filter.map((f) => {
        const escapedValue = f.value.replace(/'/g, "''");
        return `${f.field}${f.predicate}'${escapedValue}'`;
      });
      params.push(`filter=${encodeURIComponent(filterParts.join(' AND '))}`);
    }

    // Sort parameter: sort=field
    if (query.sort) {
      params.push(`sort=${encodeURIComponent(query.sort)}`);
    }

    // OrderBy parameter: orderBy=asc|desc
    if (query.orderBy) {
      params.push(`orderBy=${encodeURIComponent(query.orderBy)}`);
    }

    // Limit and offset for pagination
    if (query.limit !== undefined) {
      params.push(`limit=${Math.min(query.limit, MAX_PAGE_SIZE)}`);
    }
    if (query.offset !== undefined) {
      params.push(`offset=${query.offset}`);
    }

    // Fields selection
    if (query.fields && query.fields.length > 0) {
      params.push(`fields=${encodeURIComponent(query.fields.join(','))}`);
    }

    // Delta sync filter by dateLastModified
    if (query.dateLastModified) {
      // If no explicit filter for dateLastModified, add one
      const hasDateFilter = query.filter?.some((f) => f.field === 'dateLastModified');
      if (!hasDateFilter) {
        params.push(
          `filter=${encodeURIComponent(`dateLastModified>='${query.dateLastModified}'`)}`
        );
      }
    }

    return params.join('&');
  }

  // ==========================================================================
  // In-Memory Filtering
  // ==========================================================================

  /**
   * Apply OneRoster filter predicates to in-memory data.
   * Useful for client-side post-processing when the provider does not support
   * all filter predicates.
   */
  applyFilters<T extends Record<string, unknown>>(data: T[], filters: OneRosterFilter[]): T[] {
    if (!filters || filters.length === 0) return data;

    return data.filter((record) => {
      return filters.every((filter) => {
        const fieldValue = this.getNestedValue(record, filter.field);
        if (fieldValue === undefined || fieldValue === null) {
          return filter.predicate === '!=' ? true : false;
        }

        const recordStr = String(fieldValue);
        const filterVal = filter.value;

        switch (filter.predicate) {
          case '=':
            return recordStr === filterVal;
          case '!=':
            return recordStr !== filterVal;
          case '>':
            return recordStr > filterVal;
          case '>=':
            return recordStr >= filterVal;
          case '<':
            return recordStr < filterVal;
          case '<=':
            return recordStr <= filterVal;
          case '~':
            // Contains (case-insensitive substring match per OneRoster spec)
            return recordStr.toLowerCase().includes(filterVal.toLowerCase());
          default:
            return true;
        }
      });
    });
  }

  // ==========================================================================
  // Resource Fetching (REST Consumer)
  // ==========================================================================

  /**
   * Fetch organizations from the OneRoster endpoint.
   */
  async getOrgs(
    tenantId: string,
    connectionId: string,
    query?: OneRosterQuery
  ): Promise<Result<OneRosterOrg[]>> {
    return this.withTiming('getOrgs', async () => {
      return this.fetchResource<OneRosterOrg>(tenantId, connectionId, 'orgs', 'orgs', query);
    });
  }

  /**
   * Fetch users from the OneRoster endpoint.
   */
  async getUsers(
    tenantId: string,
    connectionId: string,
    query?: OneRosterQuery
  ): Promise<Result<OneRosterUser[]>> {
    return this.withTiming('getUsers', async () => {
      return this.fetchResource<OneRosterUser>(tenantId, connectionId, 'users', 'users', query);
    });
  }

  /**
   * Fetch classes from the OneRoster endpoint.
   */
  async getClasses(
    tenantId: string,
    connectionId: string,
    query?: OneRosterQuery
  ): Promise<Result<OneRosterClass[]>> {
    return this.withTiming('getClasses', async () => {
      return this.fetchResource<OneRosterClass>(tenantId, connectionId, 'classes', 'classes', query);
    });
  }

  /**
   * Fetch enrollments from the OneRoster endpoint.
   */
  async getEnrollments(
    tenantId: string,
    connectionId: string,
    query?: OneRosterQuery
  ): Promise<Result<OneRosterEnrollment[]>> {
    return this.withTiming('getEnrollments', async () => {
      return this.fetchResource<OneRosterEnrollment>(tenantId, connectionId, 'enrollments', 'enrollments', query);
    });
  }

  /**
   * Fetch academic sessions from the OneRoster endpoint.
   */
  async getAcademicSessions(
    tenantId: string,
    connectionId: string,
    query?: OneRosterQuery
  ): Promise<Result<OneRosterAcademicSession[]>> {
    return this.withTiming('getAcademicSessions', async () => {
      return this.fetchResource<OneRosterAcademicSession>(
        tenantId,
        connectionId,
        'academicSessions',
        'academicSessions',
        query
      );
    });
  }

  /**
   * Fetch courses from the OneRoster endpoint.
   */
  async getCourses(
    tenantId: string,
    connectionId: string,
    query?: OneRosterQuery
  ): Promise<Result<OneRosterCourse[]>> {
    return this.withTiming('getCourses', async () => {
      return this.fetchResource<OneRosterCourse>(tenantId, connectionId, 'courses', 'courses', query);
    });
  }

  // ==========================================================================
  // Delta Sync
  // ==========================================================================

  /**
   * Synchronize a specific resource type from the OneRoster provider.
   * Uses delta sync via dateLastModified when not performing a full sync.
   *
   * Creates a OneRosterSyncJob record, fetches changed records, applies
   * field mappings, and upserts into the Scholarly database.
   */
  async syncResource(
    tenantId: string,
    connectionId: string,
    resourceType: string,
    options?: SyncOptions
  ): Promise<Result<{ jobId: string; totalRecords: number; processedRecords: number; errorRecords: number }>> {
    return this.withTiming('syncResource', async () => {
      // Validate resource type
      if (!RESOURCE_ENDPOINTS[resourceType]) {
        return failure({
          code: 'ROSTER_020',
          message: `Invalid resource type: ${resourceType}`,
          details: { validTypes: Object.keys(RESOURCE_ENDPOINTS) },
        });
      }

      // Fetch the connection
      const connResult = await this.getConnection(tenantId, connectionId);
      if (!connResult.success) return failure((connResult as any).error);
      const connection = connResult.data;

      const batchSize = options?.batchSize ?? DEFAULT_PAGE_SIZE;

      // Create sync job record
      const syncJob = await prisma.oneRosterSyncJob.create({
        data: {
          tenantId,
          connectionId,
          resourceType,
          direction: 'inbound',
          status: 'running',
          totalRecords: 0,
          processedRecords: 0,
          errorRecords: 0,
          deltaFrom: options?.fullSync ? null : connection.lastSyncAt,
          startedAt: new Date(),
          errors: [],
        },
      });

      // Update connection sync status
      await prisma.oneRosterConnection.update({
        where: { id: connectionId },
        data: { syncStatus: 'syncing' },
      });

      log.info('OneRoster sync job started', {
        tenantId,
        connectionId,
        jobId: syncJob.id,
        resourceType,
        fullSync: options?.fullSync ?? false,
      });

      try {
        // Build the delta query
        const query: OneRosterQuery = {
          limit: batchSize,
          offset: 0,
        };

        if (!options?.fullSync && connection.lastSyncAt) {
          query.dateLastModified = connection.lastSyncAt.toISOString();
        }

        // Fetch all records with pagination
        const allRecords: Record<string, unknown>[] = [];
        let hasMore = true;
        let currentOffset = 0;

        while (hasMore) {
          query.offset = currentOffset;
          const fetchResult = await this.fetchFromOneRoster(connection, RESOURCE_ENDPOINTS[resourceType], query);

          if (!fetchResult.success) {
            await this.failSyncJob(syncJob.id, connectionId, (fetchResult as any).error.message);
            return failure((fetchResult as any).error);
          }

          const responseData = fetchResult.data;
          // The OneRoster response wraps data in a key matching the resource type
          const resourceKey = Object.keys(responseData).find((k) => Array.isArray(responseData[k]));
          const records = resourceKey ? (responseData[resourceKey] as Record<string, unknown>[]) : [];

          allRecords.push(...records);

          if (records.length < batchSize) {
            hasMore = false;
          } else {
            currentOffset += batchSize;
          }
        }

        // Update total records
        await prisma.oneRosterSyncJob.update({
          where: { id: syncJob.id },
          data: { totalRecords: allRecords.length },
        });

        // Apply field mappings
        const mappedRecords = this.applyFieldMappings(allRecords, connection.fieldMappings);

        // Upsert records
        let processedCount = 0;
        let errorCount = 0;
        const errors: Array<{ line: number; field?: string; message: string }> = [];

        for (let i = 0; i < mappedRecords.length; i++) {
          const record = mappedRecords[i];
          try {
            if (!options?.dryRun) {
              await this.upsertSyncedRecord(tenantId, resourceType, record);
            }
            processedCount++;
          } catch (error) {
            errorCount++;
            errors.push({
              line: i + 1,
              message: (error as Error).message,
            });
            log.warn('Failed to upsert synced record', {
              tenantId,
              resourceType,
              sourcedId: record.sourcedId as string,
              error: (error as Error).message,
            });
          }

          // Update progress periodically
          if ((i + 1) % 50 === 0 || i === mappedRecords.length - 1) {
            await prisma.oneRosterSyncJob.update({
              where: { id: syncJob.id },
              data: {
                processedRecords: processedCount,
                errorRecords: errorCount,
              },
            });
          }
        }

        // Complete the sync job
        const now = new Date();
        await prisma.oneRosterSyncJob.update({
          where: { id: syncJob.id },
          data: {
            status: errorCount > 0 && processedCount === 0 ? 'failed' : 'completed',
            processedRecords: processedCount,
            errorRecords: errorCount,
            errors: errors as any,
            completedAt: now,
          },
        });

        // Update connection
        await prisma.oneRosterConnection.update({
          where: { id: connectionId },
          data: {
            syncStatus: 'idle',
            lastSyncAt: now,
          },
        });

        log.info('OneRoster sync job completed', {
          tenantId,
          connectionId,
          jobId: syncJob.id,
          resourceType,
          totalRecords: allRecords.length,
          processedRecords: processedCount,
          errorRecords: errorCount,
        });

        await this.publishEvent('oneroster.sync.completed', tenantId, {
          connectionId,
          jobId: syncJob.id,
          resourceType,
          processedRecords: processedCount,
          errorRecords: errorCount,
        });

        return success({
          jobId: syncJob.id,
          totalRecords: allRecords.length,
          processedRecords: processedCount,
          errorRecords: errorCount,
        });
      } catch (error) {
        await this.failSyncJob(syncJob.id, connectionId, (error as Error).message);
        return failure({
          code: 'ROSTER_025',
          message: 'Sync job failed unexpectedly',
          details: { error: (error as Error).message, jobId: syncJob.id },
        });
      }
    });
  }

  /**
   * Trigger a delta sync for one or more resource types.
   * If no resourceTypes are specified, syncs all standard resource types.
   */
  async triggerDeltaSync(
    tenantId: string,
    connectionId: string,
    resourceTypes?: string[]
  ): Promise<Result<{ jobs: Array<{ resourceType: string; jobId: string }> }>> {
    return this.withTiming('triggerDeltaSync', async () => {
      const types = resourceTypes ?? Object.keys(RESOURCE_ENDPOINTS);
      const jobs: Array<{ resourceType: string; jobId: string }> = [];

      for (const resourceType of types) {
        if (!RESOURCE_ENDPOINTS[resourceType]) {
          log.warn('Skipping unknown resource type in delta sync', { resourceType });
          continue;
        }

        const syncResult = await this.syncResource(tenantId, connectionId, resourceType);
        if (syncResult.success) {
          jobs.push({ resourceType, jobId: syncResult.data.jobId });
        } else {
          log.error('Delta sync failed for resource type', new Error((syncResult as any).error.message), {
            tenantId,
            connectionId,
            resourceType,
          });
        }
      }

      if (jobs.length === 0) {
        return failure({
          code: 'ROSTER_030',
          message: 'Delta sync failed for all resource types',
          details: { tenantId, connectionId, requestedTypes: types },
        });
      }

      return success({ jobs });
    });
  }

  // ==========================================================================
  // Field Mappings
  // ==========================================================================

  /**
   * Transform an array of records using the configured field mappings.
   * Each mapping defines a source field, target field, and optional transform.
   */
  applyFieldMappings(
    data: Record<string, unknown>[],
    mappings: OneRosterFieldMapping[]
  ): Record<string, unknown>[] {
    if (!mappings || mappings.length === 0) return data;

    return data.map((record) => {
      const mapped = { ...record };

      for (const mapping of mappings) {
        const sourceValue = this.getNestedValue(record, mapping.sourceField);
        if (sourceValue === undefined) continue;

        let transformedValue: unknown = sourceValue;

        if (mapping.transform) {
          transformedValue = this.applyTransform(sourceValue, mapping.transform, mapping.customTransform);
        }

        this.setNestedValue(mapped, mapping.targetField, transformedValue);
      }

      return mapped;
    });
  }

  // ==========================================================================
  // Bulk CSV Import
  // ==========================================================================

  /**
   * Parse and import CSV data per the OneRoster CSV specification.
   * Expects a header row followed by data rows. Validates each row and
   * creates/updates records in the database. Returns a bulk result
   * with per-row error details.
   */
  async bulkImportCSV(
    tenantId: string,
    connectionId: string,
    resourceType: string,
    csvData: string
  ): Promise<Result<OneRosterBulkResult>> {
    return this.withTiming('bulkImportCSV', async () => {
      if (!CSV_HEADERS[resourceType]) {
        return failure({
          code: 'ROSTER_040',
          message: `Unsupported resource type for CSV import: ${resourceType}`,
          details: { validTypes: Object.keys(CSV_HEADERS) },
        });
      }

      // Verify connection exists
      const connResult = await this.getConnection(tenantId, connectionId);
      if (!connResult.success) return failure((connResult as any).error);
      const connection = connResult.data;

      const lines = csvData.split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length < 2) {
        return failure({
          code: 'ROSTER_041',
          message: 'CSV data must contain at least a header row and one data row',
        });
      }

      // Parse header
      const headers = this.parseCSVLine(lines[0]);
      const expectedHeaders = CSV_HEADERS[resourceType];

      // Validate that required sourcedId column exists
      if (!headers.includes('sourcedId')) {
        return failure({
          code: 'ROSTER_042',
          message: 'CSV header must include sourcedId column',
          details: { headers },
        });
      }

      const result: OneRosterBulkResult = {
        totalRecords: lines.length - 1,
        processedRecords: 0,
        errorRecords: 0,
        errors: [],
      };

      // Create a sync job for the import
      const syncJob = await prisma.oneRosterSyncJob.create({
        data: {
          tenantId,
          connectionId,
          resourceType,
          direction: 'inbound',
          status: 'running',
          totalRecords: result.totalRecords,
          processedRecords: 0,
          errorRecords: 0,
          startedAt: new Date(),
          errors: [],
        },
      });

      // Parse and process data rows
      for (let i = 1; i < lines.length; i++) {
        const lineNum = i + 1;
        try {
          const values = this.parseCSVLine(lines[i]);

          if (values.length !== headers.length) {
            result.errors.push({
              line: lineNum,
              message: `Column count mismatch: expected ${headers.length}, got ${values.length}`,
            });
            result.errorRecords++;
            continue;
          }

          // Build record from headers and values
          const record: Record<string, unknown> = {};
          for (let j = 0; j < headers.length; j++) {
            const value = values[j].trim();
            if (value !== '') {
              record[headers[j]] = value;
            }
          }

          // Validate required sourcedId
          if (!record.sourcedId || String(record.sourcedId).trim() === '') {
            result.errors.push({
              line: lineNum,
              field: 'sourcedId',
              message: 'sourcedId is required and must not be empty',
            });
            result.errorRecords++;
            continue;
          }

          // Apply field mappings
          const mappedRecords = this.applyFieldMappings([record], connection.fieldMappings);
          const mappedRecord = mappedRecords[0];

          // Upsert the record
          await this.upsertSyncedRecord(tenantId, resourceType, mappedRecord);
          result.processedRecords++;
        } catch (error) {
          result.errors.push({
            line: lineNum,
            message: (error as Error).message,
          });
          result.errorRecords++;
        }
      }

      // Complete the sync job
      await prisma.oneRosterSyncJob.update({
        where: { id: syncJob.id },
        data: {
          status: result.errorRecords > 0 && result.processedRecords === 0 ? 'failed' : 'completed',
          processedRecords: result.processedRecords,
          errorRecords: result.errorRecords,
          errors: result.errors as any,
          completedAt: new Date(),
        },
      });

      log.info('OneRoster CSV import completed', {
        tenantId,
        connectionId,
        resourceType,
        totalRecords: result.totalRecords,
        processedRecords: result.processedRecords,
        errorRecords: result.errorRecords,
      });

      await this.publishEvent('oneroster.csv.imported', tenantId, {
        connectionId,
        resourceType,
        result,
      });

      return success(result);
    });
  }

  // ==========================================================================
  // Bulk CSV Export
  // ==========================================================================

  /**
   * Export records as a CSV string conforming to the OneRoster CSV specification.
   */
  async bulkExportCSV(
    tenantId: string,
    connectionId: string,
    resourceType: string,
    query?: OneRosterQuery
  ): Promise<Result<string>> {
    return this.withTiming('bulkExportCSV', async () => {
      if (!CSV_HEADERS[resourceType]) {
        return failure({
          code: 'ROSTER_050',
          message: `Unsupported resource type for CSV export: ${resourceType}`,
          details: { validTypes: Object.keys(CSV_HEADERS) },
        });
      }

      // Fetch data from the OneRoster endpoint
      const fetchResult = await this.fetchResourceData(tenantId, connectionId, resourceType, query);
      if (!fetchResult.success) return failure((fetchResult as any).error);

      const records = fetchResult.data;
      const headers = CSV_HEADERS[resourceType];

      // Build CSV
      const csvLines: string[] = [];

      // Header row
      csvLines.push(headers.join(CSV_DELIMITER));

      // Data rows
      for (const record of records) {
        const row = headers.map((header) => {
          const value = this.extractCSVValue(record, header, resourceType);
          return this.escapeCSVField(value);
        });
        csvLines.push(row.join(CSV_DELIMITER));
      }

      const csvString = csvLines.join('\n');

      log.info('OneRoster CSV export completed', {
        tenantId,
        connectionId,
        resourceType,
        recordCount: records.length,
      });

      return success(csvString);
    });
  }

  // ==========================================================================
  // Private Helpers - REST Consumer
  // ==========================================================================

  /**
   * Fetch data from a OneRoster REST endpoint.
   * Handles token refresh, pagination (offset-based and Link header), and error handling.
   */
  private async fetchFromOneRoster(
    connection: OneRosterConnection,
    resourcePath: string,
    query?: OneRosterQuery
  ): Promise<Result<Record<string, unknown>>> {
    // Ensure we have a valid token
    const authResult = await this.authenticate(connection);
    if (!authResult.success) return failure((authResult as any).error);
    const accessToken = authResult.data;

    const queryString = this.buildQueryString(query);
    const separator = queryString ? '?' : '';
    const url = `${connection.baseUrl}/${ONEROSTER_API_PREFIX}/${resourcePath}${separator}${queryString}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (response.status === 401) {
        // Token may have been invalidated server-side; clear cache and retry once
        this.tokenCache.delete(connection.id);
        const retryAuth = await this.authenticate(connection);
        if (!retryAuth.success) return failure((retryAuth as any).error);

        const retryResponse = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${retryAuth.data}`,
            Accept: 'application/json',
          },
        });

        if (!retryResponse.ok) {
          return failure({
            code: 'ROSTER_060',
            message: `OneRoster API request failed after token refresh: ${retryResponse.status}`,
            details: { url, status: retryResponse.status },
          });
        }

        const data = await retryResponse.json();
        return success(data as Record<string, unknown>);
      }

      if (!response.ok) {
        const errorBody = await response.text();
        return failure({
          code: 'ROSTER_061',
          message: `OneRoster API request failed: ${response.status}`,
          details: {
            url,
            status: response.status,
            statusText: response.statusText,
            body: errorBody.substring(0, 500),
          },
        });
      }

      const data = await response.json();
      return success(data as Record<string, unknown>);
    } catch (error) {
      return failure({
        code: 'ROSTER_062',
        message: 'OneRoster API request failed with network error',
        details: { url, error: (error as Error).message },
      });
    }
  }

  /**
   * Generic resource fetcher that wraps fetchFromOneRoster with response parsing.
   */
  private async fetchResource<T>(
    tenantId: string,
    connectionId: string,
    resourceType: string,
    responseKey: string,
    query?: OneRosterQuery
  ): Promise<Result<T[]>> {
    const connResult = await this.getConnection(tenantId, connectionId);
    if (!connResult.success) return failure((connResult as any).error);
    const connection = connResult.data;

    const endpoint = RESOURCE_ENDPOINTS[resourceType];
    if (!endpoint) {
      return failure({
        code: 'ROSTER_063',
        message: `Unknown resource type: ${resourceType}`,
      });
    }

    // Paginated fetch: accumulate all pages
    const allRecords: T[] = [];
    const pageSize = query?.limit ?? DEFAULT_PAGE_SIZE;
    let currentOffset = query?.offset ?? 0;
    let hasMore = true;

    while (hasMore) {
      const paginatedQuery: OneRosterQuery = {
        ...query,
        limit: pageSize,
        offset: currentOffset,
      };

      const fetchResult = await this.fetchFromOneRoster(connection, endpoint, paginatedQuery);
      if (!fetchResult.success) return failure((fetchResult as any).error);

      const responseData = fetchResult.data;
      const records = (responseData[responseKey] as T[]) ?? [];
      allRecords.push(...records);

      // If the caller specified a limit, respect it and don't paginate further
      if (query?.limit !== undefined) {
        hasMore = false;
      } else if (records.length < pageSize) {
        hasMore = false;
      } else {
        currentOffset += pageSize;
      }
    }

    return success(allRecords);
  }

  /**
   * Fetch resource data - first tries local REST fetch, used by export.
   */
  private async fetchResourceData(
    tenantId: string,
    connectionId: string,
    resourceType: string,
    query?: OneRosterQuery
  ): Promise<Result<Record<string, unknown>[]>> {
    const connResult = await this.getConnection(tenantId, connectionId);
    if (!connResult.success) return failure((connResult as any).error);
    const connection = connResult.data;

    const endpoint = RESOURCE_ENDPOINTS[resourceType];
    if (!endpoint) {
      return failure({ code: 'ROSTER_064', message: `Unknown resource type: ${resourceType}` });
    }

    // Fetch with pagination
    const allRecords: Record<string, unknown>[] = [];
    const pageSize = query?.limit ?? DEFAULT_PAGE_SIZE;
    let currentOffset = query?.offset ?? 0;
    let hasMore = true;

    while (hasMore) {
      const paginatedQuery: OneRosterQuery = {
        ...query,
        limit: pageSize,
        offset: currentOffset,
      };

      const fetchResult = await this.fetchFromOneRoster(connection, endpoint, paginatedQuery);
      if (!fetchResult.success) return failure((fetchResult as any).error);

      const responseData = fetchResult.data;
      const resourceKey = Object.keys(responseData).find((k) => Array.isArray(responseData[k]));
      const records = resourceKey ? (responseData[resourceKey] as Record<string, unknown>[]) : [];
      allRecords.push(...records);

      if (query?.limit !== undefined) {
        hasMore = false;
      } else if (records.length < pageSize) {
        hasMore = false;
      } else {
        currentOffset += pageSize;
      }
    }

    return success(allRecords);
  }

  // ==========================================================================
  // Private Helpers - Sync
  // ==========================================================================

  /**
   * Upsert a synced record into the Scholarly database.
   * Uses a generic JSON storage model keyed by (tenantId, resourceType, sourcedId).
   */
  private async upsertSyncedRecord(
    tenantId: string,
    resourceType: string,
    record: Record<string, unknown>
  ): Promise<void> {
    const sourcedId = record.sourcedId as string;
    if (!sourcedId) {
      throw new Error('Record missing required sourcedId field');
    }

    const status = (record.status as string) ?? 'active';
    const dateLastModified = record.dateLastModified
      ? new Date(record.dateLastModified as string)
      : new Date();

    // Use the AuditLog model to store sync data as a durable record
    // and store the resource data in a structured way using available models
    // We upsert based on tenantId + entityType + entityId
    await prisma.auditLog.upsert({
      where: {
        id: `oneroster_${tenantId}_${resourceType}_${sourcedId}`,
      },
      create: {
        id: `oneroster_${tenantId}_${resourceType}_${sourcedId}`,
        tenantId,
        action: 'sync',
        entityType: `oneroster_${resourceType}`,
        entityId: sourcedId,
        changes: record as any,
        metadata: {
          status,
          dateLastModified: dateLastModified.toISOString(),
          syncedAt: new Date().toISOString(),
        },
        sensitivity: 'normal',
      },
      update: {
        changes: record as any,
        metadata: {
          status,
          dateLastModified: dateLastModified.toISOString(),
          syncedAt: new Date().toISOString(),
        },
        timestamp: new Date(),
      },
    });
  }

  /**
   * Mark a sync job as failed and reset connection sync status.
   */
  private async failSyncJob(jobId: string, connectionId: string, errorMessage: string): Promise<void> {
    await prisma.oneRosterSyncJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errors: [{ line: 0, message: errorMessage }] as any,
        completedAt: new Date(),
      },
    });

    await prisma.oneRosterConnection.update({
      where: { id: connectionId },
      data: { syncStatus: 'error' },
    });
  }

  // ==========================================================================
  // Private Helpers - Field Mapping Transforms
  // ==========================================================================

  /**
   * Apply a transform to a field value.
   */
  private applyTransform(
    value: unknown,
    transform: string,
    customTransform?: string | null
  ): unknown {
    const strValue = String(value);

    switch (transform) {
      case 'uppercase':
        return strValue.toUpperCase();
      case 'lowercase':
        return strValue.toLowerCase();
      case 'trim':
        return strValue.trim();
      case 'date_iso':
        try {
          return new Date(strValue).toISOString();
        } catch {
          return strValue;
        }
      case 'custom':
        return this.applyCustomTransform(value, customTransform);
      default:
        return value;
    }
  }

  /**
   * Apply a custom JavaScript-like transform expression.
   * Supports simple expressions: split, join, substring, replace.
   */
  private applyCustomTransform(value: unknown, expression?: string | null): unknown {
    if (!expression) return value;

    const strValue = String(value);

    try {
      // Support a limited set of safe string transforms
      if (expression.startsWith('split:')) {
        const delimiter = expression.substring(6);
        return strValue.split(delimiter);
      }
      if (expression.startsWith('join:')) {
        const delimiter = expression.substring(5);
        return Array.isArray(value) ? (value as string[]).join(delimiter) : strValue;
      }
      if (expression.startsWith('replace:')) {
        const parts = expression.substring(8).split(':');
        if (parts.length >= 2) {
          return strValue.replace(new RegExp(parts[0], 'g'), parts[1]);
        }
      }
      if (expression.startsWith('substring:')) {
        const parts = expression.substring(10).split(':').map(Number);
        return strValue.substring(parts[0], parts[1]);
      }
      if (expression.startsWith('prefix:')) {
        return expression.substring(7) + strValue;
      }
      if (expression.startsWith('suffix:')) {
        return strValue + expression.substring(7);
      }
      if (expression === 'boolean') {
        return strValue === 'true' || strValue === '1' || strValue === 'yes';
      }
      if (expression === 'number') {
        const num = Number(strValue);
        return isNaN(num) ? 0 : num;
      }

      return value;
    } catch {
      log.warn('Custom transform failed', { expression, value: strValue });
      return value;
    }
  }

  // ==========================================================================
  // Private Helpers - CSV
  // ==========================================================================

  /**
   * Parse a single CSV line handling quoted fields with commas and escaped quotes.
   */
  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          // Check for escaped quote (double quote)
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i += 2;
            continue;
          }
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
        current += char;
        i++;
      } else {
        if (char === '"') {
          inQuotes = true;
          i++;
          continue;
        }
        if (char === CSV_DELIMITER) {
          fields.push(current);
          current = '';
          i++;
          continue;
        }
        current += char;
        i++;
      }
    }

    fields.push(current);
    return fields;
  }

  /**
   * Escape a field value for CSV output.
   */
  private escapeCSVField(value: string): string {
    if (value === '' || value === null || value === undefined) {
      return '';
    }

    // Quote the field if it contains commas, quotes, or newlines
    if (value.includes(CSV_DELIMITER) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  /**
   * Extract a CSV value from a OneRoster record, handling nested references.
   */
  private extractCSVValue(record: Record<string, unknown>, header: string, resourceType: string): string {
    // Handle special mapping for GUIDRef fields in CSV format
    if (header === 'parentSourcedId') {
      const parent = record.parent as Record<string, unknown> | undefined;
      return parent?.sourcedId ? String(parent.sourcedId) : '';
    }

    if (header === 'orgSourcedIds') {
      const orgs = record.orgs as Array<Record<string, unknown>> | undefined;
      return orgs ? orgs.map((o) => String(o.sourcedId ?? '')).join(',') : '';
    }

    if (header === 'orgSourcedId') {
      const org = record.org as Record<string, unknown> | undefined;
      return org?.sourcedId ? String(org.sourcedId) : '';
    }

    if (header === 'courseSourcedId') {
      const course = record.course as Record<string, unknown> | undefined;
      return course?.sourcedId ? String(course.sourcedId) : '';
    }

    if (header === 'schoolSourcedId') {
      const school = record.school as Record<string, unknown> | undefined;
      return school?.sourcedId ? String(school.sourcedId) : '';
    }

    if (header === 'userSourcedId') {
      const user = record.user as Record<string, unknown> | undefined;
      return user?.sourcedId ? String(user.sourcedId) : '';
    }

    if (header === 'classSourcedId') {
      const cls = record.class as Record<string, unknown> | undefined;
      return cls?.sourcedId ? String(cls.sourcedId) : '';
    }

    if (header === 'termSourcedIds') {
      const terms = record.terms as Array<Record<string, unknown>> | undefined;
      return terms ? terms.map((t) => String(t.sourcedId ?? '')).join(',') : '';
    }

    if (header === 'schoolYearSourcedId') {
      const schoolYear = record.schoolYear as Record<string, unknown> | undefined;
      return schoolYear?.sourcedId ? String(schoolYear.sourcedId) : '';
    }

    // Handle array fields
    if (header === 'grades' || header === 'subjects' || header === 'subjectCodes' || header === 'periods') {
      const arr = record[header];
      if (Array.isArray(arr)) {
        return arr.join(',');
      }
      return arr ? String(arr) : '';
    }

    // Handle boolean
    if (header === 'enabledUser' || header === 'primary') {
      const val = record[header];
      if (val === undefined || val === null) return '';
      return String(val);
    }

    // Handle demographic booleans
    if (
      header === 'americanIndianOrAlaskaNative' ||
      header === 'asian' ||
      header === 'blackOrAfricanAmerican' ||
      header === 'nativeHawaiianOrOtherPacificIslander' ||
      header === 'white' ||
      header === 'demographicRaceTwoOrMoreRaces' ||
      header === 'hispanicOrLatinoEthnicity'
    ) {
      const val = record[header];
      if (val === undefined || val === null) return '';
      return String(val);
    }

    // Standard field
    const value = record[header];
    if (value === undefined || value === null) return '';
    return String(value);
  }

  // ==========================================================================
  // Private Helpers - Utilities
  // ==========================================================================

  /**
   * Get a value from a potentially nested object path (e.g., "user.sourcedId").
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Set a value at a potentially nested object path.
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Convert a Prisma OneRosterConnection record to the OneRosterConnection interface.
   */
  private toConnectionType(record: any): OneRosterConnection {
    return {
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      baseUrl: record.baseUrl,
      clientId: record.clientId,
      clientSecret: record.clientSecret,
      tokenUrl: record.tokenUrl,
      scope: record.scope ?? undefined,
      accessToken: record.accessToken ?? undefined,
      tokenExpiry: record.tokenExpiry ?? undefined,
      lastSyncAt: record.lastSyncAt ?? undefined,
      syncStatus: record.syncStatus as OneRosterConnection['syncStatus'],
      fieldMappings: (record.fieldMappings ?? []).map((m: any) => ({
        sourceField: m.sourceField,
        targetField: m.targetField,
        transform: m.transform ?? undefined,
        customTransform: m.customTransform ?? undefined,
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================

let instance: OneRosterService | null = null;

export function initializeOneRosterService(): OneRosterService {
  if (!instance) instance = new OneRosterService();
  return instance;
}

export function getOneRosterService(): OneRosterService {
  if (!instance) throw new Error('OneRosterService not initialized. Call initializeOneRosterService() first.');
  return instance;
}
