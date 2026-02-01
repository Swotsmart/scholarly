/**
 * Scholarly Hosting - Infrastructure Layer
 * 
 * Database connections, event publishing, logging, and validation utilities.
 * 
 * @module ScholarlyHosting/Infrastructure
 * @version 1.0.0
 */

import { Pool, PoolClient } from 'pg';
import { Result, success, failure, ValidationError } from '../types';

// ============================================================================
// DATABASE
// ============================================================================

let pool: Pool | null = null;

export function initializePool(config?: {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;
}): Pool {
  pool = new Pool({
    connectionString: config?.connectionString ?? process.env['DATABASE_URL'],
    host: config?.host ?? process.env['DB_HOST'] ?? 'localhost',
    port: config?.port ?? parseInt(process.env['DB_PORT'] ?? '5432'),
    database: config?.database ?? process.env['DB_NAME'] ?? 'scholarly_hosting',
    user: config?.user ?? process.env['DB_USER'] ?? 'postgres',
    password: config?.password ?? process.env['DB_PASSWORD'],
    max: config?.max ?? 20,
  });
  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    pool = initializePool();
  }
  return pool;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// EVENT PUBLISHING
// ============================================================================

export interface EventBus {
  publish(event: string, providerId: string, data: Record<string, unknown>): Promise<void>;
  subscribe(event: string, handler: (data: any) => Promise<void>): void;
}

let eventBus: EventBus | null = null;

export function setEventBus(bus: EventBus): void {
  eventBus = bus;
}

export async function publishEvent(
  eventType: string,
  providerId: string,
  data: Record<string, unknown>
): Promise<void> {
  const event = {
    id: generateId(),
    type: eventType,
    providerId,
    timestamp: new Date(),
    data,
    metadata: {
      source: 'scholarly-hosting',
      version: '1.0.0',
      correlationId: null,
      userId: null,
      agentId: null
    }
  };

  // Log event
  logger.debug({ event }, 'Publishing event');

  // Publish to event bus if configured
  if (eventBus) {
    await eventBus.publish(eventType, providerId, data);
  }

  // Store in database for audit
  try {
    await getPool().query(
      `INSERT INTO hosting_events (id, type, provider_id, timestamp, data, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [event.id, eventType, providerId, event.timestamp, JSON.stringify(data), JSON.stringify(event.metadata)]
    );
  } catch (error) {
    logger.error({ error, event }, 'Failed to store event');
  }
}

// ============================================================================
// LOGGING
// ============================================================================

export interface Logger {
  debug(obj: object, msg?: string): void;
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

class ConsoleLogger implements Logger {
  private formatMessage(level: string, obj: object, msg?: string): string {
    const timestamp = new Date().toISOString();
    const message = msg ? `${msg} ` : '';
    return `[${timestamp}] ${level}: ${message}${JSON.stringify(obj)}`;
  }

  debug(obj: object, msg?: string): void {
    if (process.env['LOG_LEVEL'] === 'debug') {
      console.debug(this.formatMessage('DEBUG', obj, msg));
    }
  }

  info(obj: object, msg?: string): void {
    console.info(this.formatMessage('INFO', obj, msg));
  }

  warn(obj: object, msg?: string): void {
    console.warn(this.formatMessage('WARN', obj, msg));
  }

  error(obj: object, msg?: string): void {
    console.error(this.formatMessage('ERROR', obj, msg));
  }
}

export const logger: Logger = new ConsoleLogger();

// ============================================================================
// VALIDATION
// ============================================================================

export const validators = {
  tenantId(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Tenant ID is required', 'tenantId');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      throw new ValidationError('Invalid tenant ID format', 'tenantId');
    }
    return value;
  },

  providerId(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Provider ID is required', 'providerId');
    }
    return value;
  },

  nonEmptyString(value: string, field: string): string {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new ValidationError(`${field} is required`, field);
    }
    return value.trim();
  },

  domain(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Domain is required', 'domain');
    }
    const domain = value.toLowerCase().trim();
    // Basic domain validation
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(domain)) {
      throw new ValidationError('Invalid domain format', 'domain');
    }
    return domain;
  },

  subdomain(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Subdomain is required', 'subdomain');
    }
    const subdomain = value.toLowerCase().trim();
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
      throw new ValidationError('Invalid subdomain format', 'subdomain');
    }
    return subdomain;
  },

  email(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Email is required', 'email');
    }
    const email = value.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('Invalid email format', 'email');
    }
    return email;
  },

  phone(value: string | null | undefined): string | null {
    if (!value) return null;
    const phone = value.replace(/\s+/g, '');
    if (!/^\+?[0-9]{8,15}$/.test(phone)) {
      throw new ValidationError('Invalid phone format', 'phone');
    }
    return phone;
  },

  url(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
      new URL(value);
      return value;
    } catch {
      throw new ValidationError('Invalid URL format', 'url');
    }
  },

  color(value: string): string {
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
      throw new ValidationError('Invalid color format (use #RRGGBB)', 'color');
    }
    return value;
  },

  positiveNumber(value: number, field: string): number {
    if (typeof value !== 'number' || value <= 0 || !Number.isFinite(value)) {
      throw new ValidationError(`${field} must be a positive number`, field);
    }
    return value;
  },

  percentage(value: number, field: string): number {
    if (typeof value !== 'number' || value < 0 || value > 100) {
      throw new ValidationError(`${field} must be between 0 and 100`, field);
    }
    return value;
  },

  yearLevel(value: string): string {
    const validLevels = [
      'early_years', 'foundation',
      'year_1', 'year_2', 'year_3', 'year_4', 'year_5', 'year_6',
      'year_7', 'year_8', 'year_9', 'year_10', 'year_11', 'year_12',
      'adult'
    ];
    if (!validLevels.includes(value)) {
      throw new ValidationError(`Invalid year level: ${value}`, 'yearLevel');
    }
    return value;
  },

  providerType(value: string): string {
    const validTypes = [
      'school', 'micro_school', 'tutoring_centre', 'solo_tutor',
      'homeschool_coop', 'curriculum_provider', 'enrichment', 'online_academy'
    ];
    if (!validTypes.includes(value)) {
      throw new ValidationError(`Invalid provider type: ${value}`, 'type');
    }
    return value;
  }
};

// ============================================================================
// ID GENERATION
// ============================================================================

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${random}`;
}

export function generateVerificationToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'scholerly-verify-';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sh_';
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const prefix = key.substring(0, 12);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

export function hashApiKey(key: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function verifyApiKey(providedKey: string, storedHash: string): boolean {
  const providedHash = hashApiKey(providedKey);
  return providedHash === storedHash;
}

// ============================================================================
// QUALITY SCORE WEIGHTS
// ============================================================================

export function getQualityWeightsForType(providerType: string): Record<string, number> {
  const weights: Record<string, Record<string, number>> = {
    school: {
      registration: 0.20,
      accreditation: 0.15,
      outcomes: 0.25,
      reviews: 0.15,
      staffQualifications: 0.15,
      compliance: 0.05,
      engagement: 0.05
    },
    micro_school: {
      registration: 0.20,
      accreditation: 0.10,
      outcomes: 0.20,
      reviews: 0.20,
      staffQualifications: 0.15,
      compliance: 0.05,
      engagement: 0.10
    },
    solo_tutor: {
      registration: 0.05,
      accreditation: 0.10,
      outcomes: 0.30,
      reviews: 0.30,
      staffQualifications: 0.15,
      compliance: 0.05,
      engagement: 0.05
    },
    tutoring_centre: {
      registration: 0.10,
      accreditation: 0.10,
      outcomes: 0.25,
      reviews: 0.25,
      staffQualifications: 0.15,
      compliance: 0.05,
      engagement: 0.10
    },
    homeschool_coop: {
      registration: 0.05,
      accreditation: 0.05,
      outcomes: 0.20,
      reviews: 0.35,
      staffQualifications: 0.10,
      compliance: 0.05,
      engagement: 0.20
    },
    default: {
      registration: 0.15,
      accreditation: 0.10,
      outcomes: 0.25,
      reviews: 0.20,
      staffQualifications: 0.15,
      compliance: 0.05,
      engagement: 0.10
    }
  };

  return weights[providerType] ?? weights['default'];
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  initializePool,
  getPool,
  withTransaction,
  setEventBus,
  publishEvent,
  logger,
  validators,
  generateId,
  generateVerificationToken,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  getQualityWeightsForType
};
