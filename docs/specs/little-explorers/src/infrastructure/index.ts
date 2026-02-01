/**
 * Little Explorers - Infrastructure Layer
 * 
 * Core infrastructure components that provide the foundation for all services:
 * 
 * - Logging: Structured logging with context
 * - Event Bus: Pub/sub for cross-service communication
 * - Cache: Redis-backed caching layer
 * - Database: Connection pooling and transaction support
 * - Base Service: Common patterns for all services
 * 
 * @module LittleExplorers/Infrastructure
 * @version 1.0.0
 */

import {
  Result, success, failure,
  LittleExplorersError, ValidationError, NotFoundError,
  EntityStatus, generateId
} from '../types';

// ============================================================================
// LOGGING
// ============================================================================

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogContext {
  tenantId?: string;
  userId?: string;
  classroomId?: string;
  studentId?: string;
  requestId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): Logger;
}

/**
 * Console-based logger implementation
 */
export class ConsoleLogger implements Logger {
  private readonly serviceName: string;
  private readonly baseContext: LogContext;

  constructor(serviceName: string, baseContext: LogContext = {}) {
    this.serviceName = serviceName;
    this.baseContext = baseContext;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const ctx = { ...this.baseContext, ...context };
    const contextStr = Object.keys(ctx).length > 0 ? ` ${JSON.stringify(ctx)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.serviceName}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? { ...context, error: error.message, stack: error.stack } : context;
    console.error(this.formatMessage(LogLevel.ERROR, message, errorContext));
  }

  child(context: LogContext): Logger {
    return new ConsoleLogger(this.serviceName, { ...this.baseContext, ...context });
  }
}

export function createLogger(serviceName: string, context?: LogContext): Logger {
  return new ConsoleLogger(serviceName, context);
}

// ============================================================================
// EVENT BUS
// ============================================================================

export interface LittleExplorersEvent {
  id: string;
  type: string;
  tenantId: string;
  timestamp: Date;
  version: string;
  source: string;
  payload: Record<string, unknown>;
  metadata?: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
    [key: string]: unknown;
  };
}

export type EventHandler = (event: LittleExplorersEvent) => Promise<void>;

export interface EventBus {
  publish(event: LittleExplorersEvent): Promise<void>;
  publishBatch(events: LittleExplorersEvent[]): Promise<void>;
  subscribe(pattern: string, handler: EventHandler): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
}

/**
 * In-memory event bus for development and testing
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers: Map<string, Map<string, EventHandler>> = new Map();
  private readonly eventLog: LittleExplorersEvent[] = [];
  private readonly logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || createLogger('InMemoryEventBus');
  }

  async publish(event: LittleExplorersEvent): Promise<void> {
    this.eventLog.push(event);
    this.logger.debug(`Publishing event: ${event.type}`, { 
      tenantId: event.tenantId, 
      eventId: event.id 
    });

    const matchingHandlers = this.findMatchingHandlers(event.type);
    
    await Promise.all(
      matchingHandlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          this.logger.error(`Event handler failed for ${event.type}`, error as Error, {
            tenantId: event.tenantId,
            eventId: event.id
          });
        }
      })
    );
  }

  async publishBatch(events: LittleExplorersEvent[]): Promise<void> {
    await Promise.all(events.map(event => this.publish(event)));
  }

  async subscribe(pattern: string, handler: EventHandler): Promise<string> {
    const subscriptionId = generateId('sub');
    
    if (!this.handlers.has(pattern)) {
      this.handlers.set(pattern, new Map());
    }
    
    this.handlers.get(pattern)!.set(subscriptionId, handler);
    this.logger.debug(`Subscribed to pattern: ${pattern}`, { subscriptionId });
    
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    for (const [pattern, handlers] of this.handlers) {
      if (handlers.has(subscriptionId)) {
        handlers.delete(subscriptionId);
        this.logger.debug(`Unsubscribed: ${subscriptionId}`, { pattern });
        return;
      }
    }
  }

  private findMatchingHandlers(eventType: string): EventHandler[] {
    const handlers: EventHandler[] = [];
    
    for (const [pattern, patternHandlers] of this.handlers) {
      if (this.matchesPattern(eventType, pattern)) {
        handlers.push(...patternHandlers.values());
      }
    }
    
    return handlers;
  }

  private matchesPattern(eventType: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === eventType) return true;
    
    // Support wildcards like "little-explorers.behaviour.*"
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventType.startsWith(prefix);
    }
    
    return false;
  }

  // For testing
  getEventLog(): LittleExplorersEvent[] {
    return [...this.eventLog];
  }

  clearEventLog(): void {
    this.eventLog.length = 0;
  }
}

// ============================================================================
// CACHE
// ============================================================================

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  increment(key: string, by?: number): Promise<number>;
  decrement(key: string, by?: number): Promise<number>;
  setExpiry(key: string, ttlSeconds: number): Promise<void>;
}

/**
 * In-memory cache for development and testing
 */
export class InMemoryCache implements Cache {
  private readonly store: Map<string, { value: unknown; expiresAt?: number }> = new Map();
  private readonly logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || createLogger('InMemoryCache');
    
    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deletePattern(pattern: string): Promise<number> {
    let deleted = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async increment(key: string, by: number = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + by;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, by: number = 1): Promise<number> {
    return this.increment(key, -by);
  }

  async setExpiry(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + (ttlSeconds * 1000);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.store) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  // For testing
  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

export interface DatabasePool {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }>;
  transaction<T>(fn: (client: DatabaseClient) => Promise<T>): Promise<T>;
}

export interface DatabaseClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }>;
}

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

export interface LittleExplorersConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  
  // Defaults
  defaults: {
    timezone: string;
    language: string;
    currency: string;
    pointsPerAward: number;
    quietHoursStart: string;
    quietHoursEnd: string;
  };
  
  // Limits
  limits: {
    maxStudentsPerClass: number;
    maxClassesPerSchool: number;
    maxMediaPerStory: number;
    maxMessageLength: number;
    maxPortfolioItemsPerDay: number;
    maxAIRequestsPerHour: number;
  };
  
  // Features
  features: {
    aiEnabled: boolean;
    translationEnabled: boolean;
    videoEnabled: boolean;
    emergencyAlertsEnabled: boolean;
  };
  
  // External services
  services: {
    aiProviderUrl?: string;
    translationServiceUrl?: string;
    mediaStorageUrl?: string;
    notificationServiceUrl?: string;
  };
}

export const DEFAULT_CONFIG: LittleExplorersConfig = {
  environment: 'development',
  version: '1.0.0',
  defaults: {
    timezone: 'Australia/Sydney',
    language: 'en',
    currency: 'AUD',
    pointsPerAward: 1,
    quietHoursStart: '21:00',
    quietHoursEnd: '07:00'
  },
  limits: {
    maxStudentsPerClass: 30,
    maxClassesPerSchool: 50,
    maxMediaPerStory: 10,
    maxMessageLength: 5000,
    maxPortfolioItemsPerDay: 50,
    maxAIRequestsPerHour: 1000
  },
  features: {
    aiEnabled: true,
    translationEnabled: true,
    videoEnabled: true,
    emergencyAlertsEnabled: true
  },
  services: {}
};

// ============================================================================
// BASE SERVICE CLASS
// ============================================================================

export interface ServiceDependencies {
  eventBus: EventBus;
  cache: Cache;
  config: LittleExplorersConfig;
  logger?: Logger;
}

/**
 * Base class for all Little Explorers services
 * 
 * Provides common functionality:
 * - Logging with context
 * - Event publishing
 * - Caching helpers
 * - Timing and metrics
 * - Error handling patterns
 */
export abstract class LittleExplorersBaseService {
  protected readonly serviceName: string;
  protected readonly logger: Logger;
  protected readonly eventBus: EventBus;
  protected readonly cache: Cache;
  protected readonly config: LittleExplorersConfig;

  constructor(serviceName: string, deps: ServiceDependencies) {
    this.serviceName = serviceName;
    this.logger = deps.logger || createLogger(serviceName);
    this.eventBus = deps.eventBus;
    this.cache = deps.cache;
    this.config = deps.config;
  }

  // ---------------------------------------------------------------------------
  // ID Generation
  // ---------------------------------------------------------------------------

  protected generateId(prefix: string): string {
    return generateId(prefix);
  }

  // ---------------------------------------------------------------------------
  // Event Publishing
  // ---------------------------------------------------------------------------

  protected async publishEvent(
    type: string,
    tenantId: string,
    payload: Record<string, unknown>,
    metadata?: LittleExplorersEvent['metadata']
  ): Promise<void> {
    const event: LittleExplorersEvent = {
      id: this.generateId('evt'),
      type: `little-explorers.${type}`,
      tenantId,
      timestamp: new Date(),
      version: '1.0',
      source: this.serviceName,
      payload,
      metadata
    };

    await this.eventBus.publish(event);
  }

  // ---------------------------------------------------------------------------
  // Caching Helpers
  // ---------------------------------------------------------------------------

  protected cacheKey(tenantId: string, ...parts: string[]): string {
    return `le:${tenantId}:${parts.join(':')}`;
  }

  protected async withCache<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.cache.set(key, value, ttlSeconds);
    return value;
  }

  protected async invalidateCache(tenantId: string, pattern: string): Promise<void> {
    const fullPattern = this.cacheKey(tenantId, pattern);
    await this.cache.deletePattern(fullPattern);
  }

  // ---------------------------------------------------------------------------
  // Operation Wrapper with Timing
  // ---------------------------------------------------------------------------

  protected async withTiming<T>(
    operation: string,
    tenantId: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<Result<T>> {
    const start = Date.now();
    const correlationId = this.generateId('cor');
    
    this.logger.debug(`Starting ${operation}`, { 
      tenantId, 
      correlationId,
      ...context 
    });

    try {
      const result = await fn();
      
      const duration = Date.now() - start;
      this.logger.info(`Completed ${operation}`, { 
        tenantId, 
        correlationId,
        durationMs: duration,
        ...context 
      });

      return success(result);
    } catch (error) {
      const duration = Date.now() - start;
      
      this.logger.error(`Failed ${operation}`, error as Error, { 
        tenantId, 
        correlationId,
        durationMs: duration,
        ...context 
      });

      if (error instanceof LittleExplorersError) {
        return failure(error);
      }

      return failure(new LittleExplorersError(
        'INTERNAL_ERROR',
        (error as Error).message,
        { operation, originalError: (error as Error).name }
      ));
    }
  }

  // ---------------------------------------------------------------------------
  // Batch Processing
  // ---------------------------------------------------------------------------

  protected async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: { concurrency?: number; stopOnError?: boolean } = {}
  ): Promise<{ results: R[]; errors: { item: T; error: Error }[] }> {
    const { concurrency = 10, stopOnError = false } = options;
    const results: R[] = [];
    const errors: { item: T; error: Error }[] = [];

    // Process in batches
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      
      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const error = result.reason as Error;
          errors.push({ item: batch[j], error });
          
          if (stopOnError) {
            return { results, errors };
          }
        }
      }
    }

    return { results, errors };
  }

  // ---------------------------------------------------------------------------
  // Retry Logic
  // ---------------------------------------------------------------------------

  protected async withRetry<T>(
    operation: () => Promise<T>,
    options: { maxAttempts?: number; delayMs?: number; backoff?: boolean } = {}
  ): Promise<T> {
    const { maxAttempts = 3, delayMs = 1000, backoff = true } = options;
    
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxAttempts) {
          const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
          this.logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
            error: lastError.message
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---------------------------------------------------------------------------
  // Date/Time Helpers
  // ---------------------------------------------------------------------------

  protected now(): Date {
    return new Date();
  }

  protected startOfDay(date: Date = new Date()): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  protected endOfDay(date: Date = new Date()): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  protected addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  protected isWithinQuietHours(
    time: Date,
    quietStart: string,
    quietEnd: string,
    timezone: string
  ): boolean {
    // Simple implementation - in production would use a proper timezone library
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const currentTime = hours * 60 + minutes;

    const [startHours, startMinutes] = quietStart.split(':').map(Number);
    const [endHours, endMinutes] = quietEnd.split(':').map(Number);
    const startTime = startHours * 60 + startMinutes;
    const endTime = endHours * 60 + endMinutes;

    if (startTime <= endTime) {
      // Same day (e.g., 09:00 to 17:00)
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Overnight (e.g., 21:00 to 07:00)
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  // ---------------------------------------------------------------------------
  // Validation Helpers
  // ---------------------------------------------------------------------------

  protected validateRequired<T>(value: T | null | undefined, fieldName: string): T {
    if (value === null || value === undefined) {
      throw new ValidationError(`${fieldName} is required`);
    }
    return value;
  }

  protected validateTenantId(tenantId: string): void {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      throw new ValidationError('tenantId is required');
    }
  }

  protected validateEntityId(id: string, entityName: string): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError(`${entityName} ID is required`);
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let globalEventBus: EventBus | null = null;
let globalCache: Cache | null = null;
let globalConfig: LittleExplorersConfig = DEFAULT_CONFIG;

export function initializeInfrastructure(config?: Partial<LittleExplorersConfig>): {
  eventBus: EventBus;
  cache: Cache;
  config: LittleExplorersConfig;
} {
  globalConfig = { ...DEFAULT_CONFIG, ...config };
  globalEventBus = new InMemoryEventBus();
  globalCache = new InMemoryCache();

  return {
    eventBus: globalEventBus,
    cache: globalCache,
    config: globalConfig
  };
}

export function getEventBus(): EventBus {
  if (!globalEventBus) {
    throw new Error('Infrastructure not initialized. Call initializeInfrastructure() first.');
  }
  return globalEventBus;
}

export function getCache(): Cache {
  if (!globalCache) {
    throw new Error('Infrastructure not initialized. Call initializeInfrastructure() first.');
  }
  return globalCache;
}

export function getConfig(): LittleExplorersConfig {
  return globalConfig;
}
