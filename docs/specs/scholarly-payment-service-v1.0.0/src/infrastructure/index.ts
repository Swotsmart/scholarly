/**
 * Scholarly Payment Service - Infrastructure Layer
 * 
 * This module provides the foundational infrastructure for the payment service:
 * database connections, event publishing, logging, validation, and utilities.
 * 
 * @module ScholarlyPayment/Infrastructure
 * @version 1.0.0
 */

import { Pool, PoolClient } from 'pg';
import {
  Result,
  success,
  failure,
  PaymentError,
  ValidationError,
  PaymentEventType,
  PaymentEvent,
  Currency,
  FeeCategory,
  PaymentMethod,
  AccountOwnerType,
  LegalEntityType
} from '../types';

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

let pool: Pool | null = null;

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  maxConnections?: number;
}

export function initializePool(config?: DatabaseConfig): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config?.connectionString ?? process.env['DATABASE_URL'],
      host: config?.host ?? process.env['DB_HOST'] ?? 'localhost',
      port: config?.port ?? parseInt(process.env['DB_PORT'] ?? '5432'),
      database: config?.database ?? process.env['DB_NAME'] ?? 'scholarly_payment',
      user: config?.user ?? process.env['DB_USER'] ?? 'postgres',
      password: config?.password ?? process.env['DB_PASSWORD'],
      max: config?.maxConnections ?? 20
    });
  }
  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    return initializePool();
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

export async function closeConnections(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ============================================================================
// LOGGING
// ============================================================================

export interface LogContext {
  tenantId?: string;
  accountId?: string;
  invoiceId?: string;
  payoutId?: string;
  userId?: string;
  correlationId?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(defaultContext: LogContext): Logger;
}

class ConsoleLogger implements Logger {
  private readonly defaultContext: LogContext;
  private readonly serviceName: string;

  constructor(serviceName: string = 'payment-service', defaultContext: LogContext = {}) {
    this.serviceName = serviceName;
    this.defaultContext = defaultContext;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const ctx = { ...this.defaultContext, ...context };
    const contextStr = Object.keys(ctx).length > 0 ? ` ${JSON.stringify(ctx)}` : '';
    return `[${timestamp}] [${this.serviceName}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (process.env['LOG_LEVEL'] === 'debug') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? { errorMessage: error.message } : {};
    console.error(this.formatMessage('error', message, { ...context, ...errorContext }));
  }

  child(defaultContext: LogContext): Logger {
    return new ConsoleLogger(this.serviceName, { ...this.defaultContext, ...defaultContext });
  }
}

export const logger: Logger = new ConsoleLogger('scholarly-payment');

export function createLogger(serviceName: string, defaultContext?: LogContext): Logger {
  return new ConsoleLogger(serviceName, defaultContext);
}

// ============================================================================
// EVENT PUBLISHING
// ============================================================================

export interface EventBus {
  publish(event: PaymentEvent): Promise<void>;
  subscribe(eventType: PaymentEventType, handler: (event: PaymentEvent) => Promise<void>): void;
}

let eventBus: EventBus | null = null;

class InMemoryEventBus implements EventBus {
  private handlers: Map<PaymentEventType, Set<(event: PaymentEvent) => Promise<void>>> = new Map();

  async publish(event: PaymentEvent): Promise<void> {
    logger.debug('Publishing event', { eventType: event.type, eventId: event.id });

    // Store event for audit
    try {
      await getPool().query(
        `INSERT INTO payment_events (id, type, tenant_id, account_id, timestamp, data, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [event.id, event.type, event.tenantId, event.accountId, event.timestamp, 
         JSON.stringify(event.data), JSON.stringify(event.metadata)]
      );
    } catch (error) {
      logger.error('Failed to persist event', error as Error, { eventId: event.id });
    }

    // Dispatch to handlers
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          logger.error('Event handler failed', error as Error, { eventType: event.type });
        }
      }
    }
  }

  subscribe(eventType: PaymentEventType, handler: (event: PaymentEvent) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }
}

export function getEventBus(): EventBus {
  if (!eventBus) {
    eventBus = new InMemoryEventBus();
  }
  return eventBus;
}

export function setEventBus(bus: EventBus): void {
  eventBus = bus;
}

export async function publishEvent(
  type: PaymentEventType,
  tenantId: string,
  accountId: string,
  data: Record<string, unknown>,
  metadata?: { correlationId?: string; userId?: string }
): Promise<void> {
  const event: PaymentEvent = {
    id: generateId('evt'),
    type,
    tenantId,
    accountId,
    timestamp: new Date(),
    data,
    metadata: {
      source: 'scholarly-payment',
      version: '1.0.0',
      correlationId: metadata?.correlationId ?? null,
      userId: metadata?.userId ?? null
    }
  };

  await getEventBus().publish(event);
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

function validateABN(abn: string): boolean {
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = abn.split('').map(Number);
  digits[0] -= 1; // Subtract 1 from first digit
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += digits[i] * weights[i];
  }
  return sum % 89 === 0;
}

export const validators = {
  tenantId(value: unknown): string {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      throw new ValidationError('Tenant ID is required', 'tenantId');
    }
    const trimmed = value.trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      throw new ValidationError('Invalid tenant ID format', 'tenantId');
    }
    return trimmed;
  },

  accountId(value: unknown): string {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      throw new ValidationError('Account ID is required', 'accountId');
    }
    return value.trim();
  },

  nonEmptyString(value: unknown, fieldName: string): string {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }
    return value.trim();
  },

  optionalString(value: unknown, fieldName: string): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }
    return value.trim();
  },

  email(value: unknown): string {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Email is required', 'email');
    }
    const email = value.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('Invalid email format', 'email');
    }
    return email;
  },

  phone(value: unknown): string | null {
    if (!value) return null;
    if (typeof value !== 'string') {
      throw new ValidationError('Phone must be a string', 'phone');
    }
    const phone = value.replace(/\s+/g, '');
    if (!/^\+?[0-9]{8,15}$/.test(phone)) {
      throw new ValidationError('Invalid phone format', 'phone');
    }
    return phone;
  },

  positiveInteger(value: unknown, fieldName: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      throw new ValidationError(`${fieldName} must be a positive integer`, fieldName);
    }
    return value;
  },

  nonNegativeInteger(value: unknown, fieldName: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      throw new ValidationError(`${fieldName} must be a non-negative integer`, fieldName);
    }
    return value;
  },

  percentage(value: unknown, fieldName: string): number {
    if (typeof value !== 'number' || value < 0 || value > 100) {
      throw new ValidationError(`${fieldName} must be between 0 and 100`, fieldName);
    }
    return value;
  },

  currency(value: unknown): Currency {
    const validCurrencies: Currency[] = ['AUD', 'GBP', 'USD', 'CAD', 'NZD', 'SGD'];
    if (!value || typeof value !== 'string' || !validCurrencies.includes(value as Currency)) {
      throw new ValidationError(`Invalid currency. Must be one of: ${validCurrencies.join(', ')}`, 'currency');
    }
    return value as Currency;
  },

  feeCategory(value: unknown): FeeCategory {
    const validCategories: FeeCategory[] = [
      'tuition', 'enrollment', 'materials', 'technology', 'excursion',
      'uniform', 'examination', 'tutoring', 'co_curricular', 'boarding',
      'transport', 'catering', 'facility', 'insurance', 'late_payment',
      'marketplace', 'subscription', 'other'
    ];
    if (!value || typeof value !== 'string' || !validCategories.includes(value as FeeCategory)) {
      throw new ValidationError(`Invalid fee category`, 'category');
    }
    return value as FeeCategory;
  },

  paymentMethod(value: unknown): PaymentMethod {
    const validMethods: PaymentMethod[] = [
      'card', 'bank_transfer', 'direct_debit', 'bpay', 'payid', 'token', 'cash', 'cheque'
    ];
    if (!value || typeof value !== 'string' || !validMethods.includes(value as PaymentMethod)) {
      throw new ValidationError(`Invalid payment method`, 'paymentMethod');
    }
    return value as PaymentMethod;
  },

  accountOwnerType(value: unknown): AccountOwnerType {
    const validTypes: AccountOwnerType[] = [
      'school', 'micro_school', 'tutor', 'tutoring_centre', 'homeschool_coop', 'parent', 'content_creator'
    ];
    if (!value || typeof value !== 'string' || !validTypes.includes(value as AccountOwnerType)) {
      throw new ValidationError(`Invalid account owner type`, 'ownerType');
    }
    return value as AccountOwnerType;
  },

  legalEntityType(value: unknown): LegalEntityType {
    const validTypes: LegalEntityType[] = [
      'individual', 'sole_trader', 'company', 'trust', 'partnership', 'non_profit'
    ];
    if (!value || typeof value !== 'string' || !validTypes.includes(value as LegalEntityType)) {
      throw new ValidationError(`Invalid legal entity type`, 'legalEntityType');
    }
    return value as LegalEntityType;
  },

  abn(value: unknown): string | null {
    if (!value) return null;
    if (typeof value !== 'string') {
      throw new ValidationError('ABN must be a string', 'abn');
    }
    const abn = value.replace(/\s+/g, '');
    if (!/^\d{11}$/.test(abn)) {
      throw new ValidationError('ABN must be 11 digits', 'abn');
    }
    if (!validateABN(abn)) {
      throw new ValidationError('Invalid ABN checksum', 'abn');
    }
    return abn;
  },

  date(value: unknown, fieldName: string): Date {
    if (!value) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }
    const date = value instanceof Date ? value : new Date(value as string);
    if (isNaN(date.getTime())) {
      throw new ValidationError(`${fieldName} must be a valid date`, fieldName);
    }
    return date;
  },

  futureDate(value: unknown, fieldName: string): Date {
    const date = validators.date(value, fieldName);
    if (date <= new Date()) {
      throw new ValidationError(`${fieldName} must be in the future`, fieldName);
    }
    return date;
  }
};

// ============================================================================
// ID GENERATION
// ============================================================================

export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}${random}`;
}

export function generateInvoiceNumber(prefix: string, sequence: number): string {
  const year = new Date().getFullYear();
  const paddedSequence = sequence.toString().padStart(5, '0');
  return `${prefix}${year}-${paddedSequence}`;
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sp_';
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
// MONEY UTILITIES
// ============================================================================

/**
 * Convert dollars to cents (safe integer conversion)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars (for display)
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Format cents as currency string
 */
export function formatMoney(cents: number, currency: Currency = 'AUD'): string {
  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency
  });
  return formatter.format(cents / 100);
}

/**
 * Calculate GST (Australian Goods and Services Tax)
 */
export function calculateGST(amountCents: number, inclusive: boolean = true): { 
  gross: number; 
  net: number; 
  gst: number 
} {
  if (inclusive) {
    // Amount includes GST
    const net = Math.round(amountCents / 1.1);
    const gst = amountCents - net;
    return { gross: amountCents, net, gst };
  } else {
    // Amount excludes GST
    const gst = Math.round(amountCents * 0.1);
    const gross = amountCents + gst;
    return { gross, net: amountCents, gst };
  }
}

/**
 * Calculate platform fee
 */
export function calculatePlatformFee(
  amountCents: number, 
  feePercentage: number,
  minimumFee: number = 0,
  maximumFee: number | null = null
): number {
  let fee = Math.round(amountCents * (feePercentage / 100));
  fee = Math.max(fee, minimumFee);
  if (maximumFee !== null) {
    fee = Math.min(fee, maximumFee);
  }
  return fee;
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Get start of day in timezone
 */
export function startOfDay(date: Date, timezone: string = 'Australia/Sydney'): Date {
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2024');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Add days to date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get next weekday (Monday = 1, Sunday = 0)
 */
export function getNextWeekday(date: Date, weekday: number): Date {
  const result = new Date(date);
  const currentDay = result.getDay();
  const daysUntilWeekday = (weekday - currentDay + 7) % 7;
  result.setDate(result.getDate() + (daysUntilWeekday || 7));
  return result;
}

/**
 * Check if date is business day (weekday)
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

/**
 * Get next business day
 */
export function getNextBusinessDay(date: Date): Date {
  const result = new Date(date);
  do {
    result.setDate(result.getDate() + 1);
  } while (!isBusinessDay(result));
  return result;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface PaymentConfig {
  environment: 'development' | 'staging' | 'production';
  
  // Platform fees
  platformFeePercentage: number;       // Default: 5%
  minimumPlatformFee: number;          // Cents
  maximumPlatformFee: number | null;   // Cents or null for no max
  
  // Payout settings
  defaultPayoutSchedule: 'daily' | 'weekly' | 'monthly';
  minimumPayoutAmount: number;         // Cents
  payoutHoldDays: number;              // Days to hold funds before payout
  
  // Invoice settings
  defaultPaymentTerms: number;         // Days
  reminderSchedule: number[];          // Days relative to due date
  
  // Stripe settings
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripeConnectAccountCountry: string;
  
  // Xero settings
  xeroClientId: string;
  xeroClientSecret: string;
  xeroRedirectUri: string;
  
  // Defaults
  defaultCurrency: Currency;
  defaultTimezone: string;
  defaultTaxRate: number;              // GST percentage
}

const defaultConfig: PaymentConfig = {
  environment: (process.env['NODE_ENV'] as 'development' | 'staging' | 'production') ?? 'development',
  
  platformFeePercentage: 5,
  minimumPlatformFee: 50,              // $0.50
  maximumPlatformFee: null,
  
  defaultPayoutSchedule: 'weekly',
  minimumPayoutAmount: 5000,           // $50.00
  payoutHoldDays: 7,
  
  defaultPaymentTerms: 14,
  reminderSchedule: [-7, -3, -1, 1, 3, 7],
  
  stripeSecretKey: process.env['STRIPE_SECRET_KEY'] ?? '',
  stripeWebhookSecret: process.env['STRIPE_WEBHOOK_SECRET'] ?? '',
  stripeConnectAccountCountry: 'AU',
  
  xeroClientId: process.env['XERO_CLIENT_ID'] ?? '',
  xeroClientSecret: process.env['XERO_CLIENT_SECRET'] ?? '',
  xeroRedirectUri: process.env['XERO_REDIRECT_URI'] ?? 'http://localhost:3000/api/xero/callback',
  
  defaultCurrency: 'AUD',
  defaultTimezone: 'Australia/Sydney',
  defaultTaxRate: 10
};

let config: PaymentConfig = defaultConfig;

export function getConfig(): PaymentConfig {
  return config;
}

export function setConfig(newConfig: Partial<PaymentConfig>): void {
  config = { ...config, ...newConfig };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  initializePool,
  getPool,
  withTransaction,
  closeConnections,
  logger,
  createLogger,
  getEventBus,
  setEventBus,
  publishEvent,
  validators,
  generateId,
  generateInvoiceNumber,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  dollarsToCents,
  centsToDollars,
  formatMoney,
  calculateGST,
  calculatePlatformFee,
  startOfDay,
  addDays,
  getNextWeekday,
  isBusinessDay,
  getNextBusinessDay,
  getConfig,
  setConfig
};
