/**
 * Scholarly Base Types
 * 
 * Core types shared across all Scholarly services.
 * This file mirrors the main types.ts from the Scholarly project.
 */

// ============================================================================
// RESULT TYPE
// ============================================================================

/**
 * Result type for explicit error handling
 */
export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: ScholarlyError };

export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<T>(error: ScholarlyError): Result<T> {
  return { success: false, error };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export abstract class ScholarlyError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends ScholarlyError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  
  constructor(message: string, public readonly field?: string) {
    super(message);
  }
}

export class NotFoundError extends ScholarlyError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  
  constructor(public readonly resource: string, public readonly id: string) {
    super(`${resource} not found: ${id}`);
  }
}

export class AuthorizationError extends ScholarlyError {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 403;
  
  constructor(message: string = 'Not authorized') {
    super(message);
  }
}

export class ConflictError extends ScholarlyError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;
  
  constructor(message: string) {
    super(message);
  }
}

// ============================================================================
// VALIDATOR
// ============================================================================

export class Validator {
  static tenantId(value: string): void {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new ValidationError('Invalid tenant ID', 'tenantId');
    }
  }

  static required(value: any, fieldName: string): void {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }
  }

  static email(value: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new ValidationError('Invalid email format', 'email');
    }
  }

  static positiveNumber(value: number, fieldName: string): void {
    if (typeof value !== 'number' || value <= 0) {
      throw new ValidationError(`${fieldName} must be a positive number`, fieldName);
    }
  }

  static dateRange(start: Date, end: Date): void {
    if (end <= start) {
      throw new ValidationError('End date must be after start date');
    }
  }
}

// ============================================================================
// SERVICE INFRASTRUCTURE
// ============================================================================

export interface EventBus {
  publish(topic: string, tenantId: string, payload: Record<string, any>): Promise<void>;
  subscribe(topic: string, handler: (payload: any) => Promise<void>): void;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

export interface ScholarlyConfig {
  environment: 'development' | 'staging' | 'production';
  serviceName: string;
  version: string;
  [key: string]: any;
}

// ============================================================================
// BASE SERVICE
// ============================================================================

/**
 * Base class for all Scholarly services
 */
export abstract class ScholarlyBaseService {
  protected readonly serviceName: string;
  protected readonly eventBus: EventBus;
  protected readonly cache: Cache;
  protected readonly config: ScholarlyConfig;

  constructor(
    serviceName: string,
    deps: {
      eventBus: EventBus;
      cache: Cache;
      config: ScholarlyConfig;
    }
  ) {
    this.serviceName = serviceName;
    this.eventBus = deps.eventBus;
    this.cache = deps.cache;
    this.config = deps.config;
  }

  /**
   * Generate a unique ID
   */
  protected generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a cache key
   */
  protected cacheKey(tenantId: string, ...parts: string[]): string {
    return `${this.serviceName}:${tenantId}:${parts.join(':')}`;
  }

  /**
   * Publish an event to the event bus
   */
  protected async publishEvent(
    topic: string,
    tenantId: string,
    payload: Record<string, any>
  ): Promise<void> {
    await this.eventBus.publish(topic, tenantId, {
      ...payload,
      _meta: {
        service: this.serviceName,
        timestamp: new Date().toISOString(),
        tenantId
      }
    });
  }

  /**
   * Execute an operation with timing and error handling
   */
  protected async withTiming<T>(
    operation: string,
    tenantId: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<Result<T>> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      // Log timing in development
      if (this.config.environment === 'development') {
        console.log(`[${this.serviceName}] ${operation} completed in ${duration}ms`, metadata);
      }
      
      return success(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`[${this.serviceName}] ${operation} failed after ${duration}ms`, {
        error,
        metadata
      });
      
      if (error instanceof ScholarlyError) {
        return failure(error);
      }
      
      return failure(new ValidationError(
        error instanceof Error ? error.message : 'Unknown error'
      ));
    }
  }
}
