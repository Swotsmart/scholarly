/**
 * Base Service Class
 *
 * Provides common functionality for all Scholarly services:
 * - Result type for consistent error handling
 * - Timing/metrics tracking
 * - Event publishing
 * - Logging integration
 */

import { log } from '../lib/logger';

// ============================================================================
// Result Type - Consistent error handling across services
// ============================================================================

export interface ScholarlyError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ScholarlyError };

export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<T>(error: ScholarlyError | Error): Result<T> {
  if (error instanceof Error) {
    // Check if it's a ScholarlyError (has code property)
    const errorWithCode = error as Error & Partial<ScholarlyError>;
    return {
      success: false,
      error: {
        code: errorWithCode.code || 'SERVICE_ERROR',
        message: error.message,
        details: errorWithCode.details,
      },
    };
  }
  return { success: false, error };
}

/**
 * Convert a regular Error to ScholarlyError
 */
export function toScholarlyError(error: Error, code = 'SERVICE_ERROR'): ScholarlyError {
  const errorWithCode = error as Error & Partial<ScholarlyError>;
  return {
    code: errorWithCode.code || code,
    message: error.message,
    details: errorWithCode.details,
  };
}

/**
 * Type guard to check if a Result is a failure
 */
export function isFailure<T>(result: Result<T>): result is { success: false; error: ScholarlyError } {
  return !result.success;
}

/**
 * Type guard to check if a Result is a success
 */
export function isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success;
}

/**
 * Get error from a failed result, with proper typing
 */
export function getError<T>(result: Result<T>): ScholarlyError | undefined {
  if (isFailure(result)) {
    return result.error;
  }
  return undefined;
}

// ============================================================================
// Base Service Class
// ============================================================================

export interface ServiceDependencies {
  eventBus?: EventBus;
  cache?: Cache;
  config?: Record<string, unknown>;
}

export interface EventBus {
  publish(event: string, tenantId: string, payload: unknown): Promise<void>;
  subscribe(event: string, handler: (payload: unknown) => Promise<void>): void;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

export abstract class ScholarlyBaseService {
  protected serviceName: string;
  protected eventBus?: EventBus;
  protected cache?: Cache;
  protected config?: Record<string, unknown>;

  constructor(serviceName: string, deps?: ServiceDependencies) {
    this.serviceName = serviceName;
    this.eventBus = deps?.eventBus;
    this.cache = deps?.cache;
    this.config = deps?.config;
  }

  /**
   * Wrap an operation with timing metrics
   */
  protected async withTiming<T>(
    operation: string,
    fn: () => Promise<Result<T>>
  ): Promise<Result<T>> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      if (result.success) {
        log.info(`${this.serviceName}.${operation} completed`, {
          service: this.serviceName,
          operation,
          duration,
          success: true,
        });
      } else {
        // Type narrowing: result is { success: false; error: ScholarlyError }
        const errorResult = result as { success: false; error: ScholarlyError };
        log.warn(`${this.serviceName}.${operation} failed`, {
          service: this.serviceName,
          operation,
          duration,
          success: false,
          error: errorResult.error.code,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error(`${this.serviceName}.${operation} threw exception`, error as Error, {
        service: this.serviceName,
        operation,
        duration,
      });

      return failure({
        code: 'SERVICE_ERROR',
        message: `${this.serviceName}.${operation} failed unexpectedly`,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Publish an event to the event bus
   */
  protected async publishEvent(
    event: string,
    tenantId: string,
    payload: unknown
  ): Promise<void> {
    if (this.eventBus) {
      try {
        await this.eventBus.publish(event, tenantId, payload);
        log.debug(`Event published: ${event}`, { tenantId, event });
      } catch (error) {
        log.error('Failed to publish event', error as Error, {
          event,
          tenantId,
        });
      }
    }
  }

  /**
   * Get value from cache
   */
  protected async cacheGet<T>(key: string): Promise<T | null> {
    if (!this.cache) return null;

    try {
      return await this.cache.get<T>(key);
    } catch (error) {
      log.warn('Cache get failed', { key, error: String(error) });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  protected async cacheSet<T>(
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<void> {
    if (!this.cache) return;

    try {
      await this.cache.set(key, value, ttlSeconds);
    } catch (error) {
      log.warn('Cache set failed', { key, error: String(error) });
    }
  }

  /**
   * Invalidate cache by key
   */
  protected async cacheInvalidate(key: string): Promise<void> {
    if (!this.cache) return;

    try {
      await this.cache.delete(key);
    } catch (error) {
      log.warn('Cache invalidate failed', { key, error: String(error) });
    }
  }

  /**
   * Generate a unique ID
   */
  protected generateId(prefix?: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    const id = `${timestamp}${random}`;
    return prefix ? `${prefix}_${id}` : id;
  }

  /**
   * Validate required fields
   */
  protected validateRequired<T extends object>(
    data: T,
    requiredFields: (keyof T)[]
  ): Result<void> {
    const missing = requiredFields.filter(
      (field) => (data as Record<string, unknown>)[field as string] === undefined ||
                 (data as Record<string, unknown>)[field as string] === null
    );

    if (missing.length > 0) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields',
        details: { missingFields: missing },
      });
    }

    return success(undefined);
  }
}

// ============================================================================
// Common Validators
// ============================================================================

export class Validator {
  static isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  static isUUID(value: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  static isCUID(value: string): boolean {
    return /^c[a-z0-9]{24}$/.test(value);
  }

  static isPositiveNumber(value: number): boolean {
    return typeof value === 'number' && value > 0 && !isNaN(value);
  }

  static isInRange(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && value >= min && value <= max;
  }

  static isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  static isValidDate(value: unknown): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
  }

  static isArray<T>(value: unknown, itemValidator?: (item: unknown) => item is T): value is T[] {
    if (!Array.isArray(value)) return false;
    if (itemValidator) {
      return value.every(itemValidator);
    }
    return true;
  }
}

// ============================================================================
// Common Error Codes
// ============================================================================

export const ErrorCodes = {
  // Validation errors (VAL_xxx)
  VAL_001: { code: 'VAL_001', message: 'Invalid input' },
  VAL_002: { code: 'VAL_002', message: 'Missing required field' },
  VAL_003: { code: 'VAL_003', message: 'Invalid format' },

  // Not found errors (NF_xxx)
  NF_001: { code: 'NF_001', message: 'Resource not found' },
  NF_002: { code: 'NF_002', message: 'User not found' },
  NF_003: { code: 'NF_003', message: 'Tenant not found' },

  // Authorization errors (AUTH_xxx)
  AUTH_001: { code: 'AUTH_001', message: 'Invalid credentials' },
  AUTH_002: { code: 'AUTH_002', message: 'Token expired' },
  AUTH_003: { code: 'AUTH_003', message: 'Insufficient permissions' },

  // Business logic errors (BIZ_xxx)
  BIZ_001: { code: 'BIZ_001', message: 'Operation not allowed' },
  BIZ_002: { code: 'BIZ_002', message: 'Resource conflict' },
  BIZ_003: { code: 'BIZ_003', message: 'Limit exceeded' },

  // System errors (SYS_xxx)
  SYS_001: { code: 'SYS_001', message: 'Internal server error' },
  SYS_002: { code: 'SYS_002', message: 'Database error' },
  SYS_003: { code: 'SYS_003', message: 'External service error' },
} as const;

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ValidationError extends Error implements ScholarlyError {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.details = details;
  }
}

export class NotFoundError extends Error implements ScholarlyError {
  code: string;
  details?: Record<string, unknown>;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} with id '${resourceId}' not found`);
    this.name = 'NotFoundError';
    this.code = 'NOT_FOUND';
    this.details = { resourceType, resourceId };
  }
}

export class AuthorizationError extends Error implements ScholarlyError {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = 'AUTHORIZATION_ERROR';
    this.details = details;
  }
}

export class BusinessError extends Error implements ScholarlyError {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// Service Configuration Types
// ============================================================================

export interface ScholarlyConfig {
  environment: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  features: Record<string, boolean>;
  limits: Record<string, number>;
  [key: string]: unknown;
}
