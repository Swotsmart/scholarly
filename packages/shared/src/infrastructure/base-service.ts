/**
 * Base Service Class
 * All Scholarly services extend this class for common functionality
 */

import { Result, success, failure } from '../types/result';
import { ScholarlyError } from '../types/errors';
import type { EventBus } from './event-bus';
import type { Cache } from './cache';
import type { ScholarlyConfig } from './config';

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}

export interface ScholarlyEvent {
  id: string;
  type: string;
  tenantId: string;
  timestamp: Date;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ServiceDependencies {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
  logger?: Logger;
}

export abstract class ScholarlyBaseService {
  protected readonly serviceName: string;
  protected readonly logger: Logger;
  protected readonly eventBus: EventBus;
  protected readonly cache: Cache;
  protected readonly config: ScholarlyConfig;

  constructor(serviceName: string, deps: ServiceDependencies) {
    this.serviceName = serviceName;
    this.eventBus = deps.eventBus;
    this.cache = deps.cache;
    this.config = deps.config;
    this.logger = deps.logger || this.createDefaultLogger();
  }

  private createDefaultLogger(): Logger {
    const serviceName = this.serviceName;
    const isDev = process.env.NODE_ENV !== 'production';

    return {
      debug: (msg, ctx) => {
        if (isDev) {
          console.debug(`[${serviceName}] ${msg}`, ctx || '');
        }
      },
      info: (msg, ctx) => console.info(`[${serviceName}] ${msg}`, ctx || ''),
      warn: (msg, ctx) => console.warn(`[${serviceName}] ${msg}`, ctx || ''),
      error: (msg, err, ctx) => console.error(`[${serviceName}] ${msg}`, err, ctx || ''),
    };
  }

  protected async withTiming<T>(
    operation: string,
    tenantId: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<Result<T>> {
    const start = Date.now();
    try {
      const result = await fn();
      this.logger.debug(`${operation} completed`, {
        tenantId,
        duration: Date.now() - start,
        ...context,
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
    payload: Record<string, unknown>
  ): Promise<void> {
    const event: ScholarlyEvent = {
      id: this.generateId('evt'),
      type,
      tenantId,
      timestamp: new Date(),
      payload,
    };
    await this.eventBus.publish(type, event);
  }

  protected cacheKey(tenantId: string, ...parts: string[]): string {
    return `scholarly:${tenantId}:${parts.join(':')}`;
  }

  protected async getFromCache<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  protected async setInCache<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this.cache.set(key, value, ttlSeconds);
  }

  protected async invalidateCache(tenantId: string, pattern: string): Promise<void> {
    await this.cache.invalidatePattern(this.cacheKey(tenantId, pattern));
  }

  protected generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `${prefix}_${timestamp}_${random}`;
  }

  protected validateTenantId(tenantId: string): void {
    if (!tenantId || tenantId.trim() === '') {
      throw new ScholarlyError('VALIDATION_ERROR', 'tenantId is required');
    }
  }
}
