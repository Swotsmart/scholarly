/**
 * Shared Types for Scholarly Extensions
 * 
 * These types are shared between the Early Years Curriculum and Integrations services.
 * They mirror the core Scholarly types for compatibility.
 */

// ============================================================================
// RESULT TYPE
// ============================================================================

export type Result<T, E = ScholarlyError> = 
  | { success: true; data: T }
  | { success: false; error: E };

export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class ScholarlyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ScholarlyError';
  }
}

export class ValidationError extends ScholarlyError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ScholarlyError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} not found: ${id}`, { entity, id });
    this.name = 'NotFoundError';
  }
}

export class AuthorizationError extends ScholarlyError {
  constructor(message: string, details?: Record<string, any>) {
    super('AUTHORIZATION_ERROR', message, details);
    this.name = 'AuthorizationError';
  }
}

// ============================================================================
// INFRASTRUCTURE INTERFACES
// ============================================================================

export interface Logger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
}

export interface EventBus {
  publish(topic: string, event: ScholarlyEvent): Promise<void>;
  subscribe(topic: string, handler: (event: ScholarlyEvent) => Promise<void>): Promise<void>;
}

export interface ScholarlyEvent {
  id: string;
  type: string;
  tenantId: string;
  timestamp: Date;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

export interface ScholarlyConfig {
  environment: 'development' | 'staging' | 'production';
  defaultJurisdiction?: string;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const Validator = {
  tenantId(tenantId: string): void {
    if (!tenantId || tenantId.trim() === '') {
      throw new ValidationError('tenantId is required');
    }
  },

  userId(userId: string): void {
    if (!userId || userId.trim() === '') {
      throw new ValidationError('userId is required');
    }
  },

  required(value: any, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
      throw new ValidationError(`${fieldName} is required`);
    }
  },

  positiveNumber(value: number, fieldName: string): void {
    if (typeof value !== 'number' || value <= 0) {
      throw new ValidationError(`${fieldName} must be a positive number`);
    }
  },

  email(value: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new ValidationError('Invalid email format');
    }
  },

  dateInFuture(date: Date, fieldName: string): void {
    if (date <= new Date()) {
      throw new ValidationError(`${fieldName} must be in the future`);
    }
  }
};

// ============================================================================
// BASE SERVICE CLASS
// ============================================================================

export abstract class ScholarlyBaseService {
  protected readonly serviceName: string;
  protected readonly logger: Logger;
  protected readonly eventBus: EventBus;
  protected readonly cache: Cache;
  protected readonly config: ScholarlyConfig;

  constructor(
    serviceName: string,
    deps: { eventBus: EventBus; cache: Cache; config: ScholarlyConfig }
  ) {
    this.serviceName = serviceName;
    this.eventBus = deps.eventBus;
    this.cache = deps.cache;
    this.config = deps.config;
    this.logger = this.createLogger();
  }

  private createLogger(): Logger {
    const serviceName = this.serviceName;
    return {
      debug: (msg, ctx) => console.debug(`[${serviceName}] ${msg}`, ctx || ''),
      info: (msg, ctx) => console.info(`[${serviceName}] ${msg}`, ctx || ''),
      warn: (msg, ctx) => console.warn(`[${serviceName}] ${msg}`, ctx || ''),
      error: (msg, err, ctx) => console.error(`[${serviceName}] ${msg}`, err, ctx || '')
    };
  }

  protected async withTiming<T>(
    operation: string,
    tenantId: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<Result<T>> {
    const start = Date.now();
    try {
      const result = await fn();
      this.logger.debug(`${operation} completed`, {
        tenantId,
        duration: Date.now() - start,
        ...context
      });
      return success(result);
    } catch (error) {
      this.logger.error(`${operation} failed`, error as Error, { tenantId, ...context });
      if (error instanceof ScholarlyError) {
        return failure(error);
      }
      return failure(new ScholarlyError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  protected async publishEvent(
    type: string,
    tenantId: string,
    payload: Record<string, any>
  ): Promise<void> {
    const event: ScholarlyEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      tenantId,
      timestamp: new Date(),
      payload
    };
    await this.eventBus.publish(type, event);
  }

  protected cacheKey(tenantId: string, key: string): string {
    return `scholarly:${tenantId}:${key}`;
  }

  protected async invalidateCache(tenantId: string, pattern: string): Promise<void> {
    await this.cache.invalidatePattern(this.cacheKey(tenantId, pattern));
  }

  protected generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
