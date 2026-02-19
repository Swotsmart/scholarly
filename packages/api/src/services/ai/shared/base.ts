// ============================================================================
// SCHOLARLY PLATFORM — Shared Types & Base Service (Sprint 30)
// ============================================================================
// Carries forward the foundational patterns from Sprints 1–29.
// Every module in the platform inherits from this file.
// ============================================================================

export type Result<T> = { success: true; data: T } | { success: false; error: ScholarlyError };
export const ok = <T>(data: T): Result<T> => ({ success: true, data });
export const fail = <T>(error: ScholarlyError): Result<T> => ({ success: false, error });

export interface ScholarlyError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export class ValidationError implements ScholarlyError {
  code = 'VALIDATION_ERROR';
  constructor(public message: string, public details?: Record<string, unknown>) {}
}

export class NotFoundError implements ScholarlyError {
  code = 'NOT_FOUND';
  constructor(public message: string, public details?: Record<string, unknown>) {}
}

export class AuthorizationError implements ScholarlyError {
  code = 'AUTHORIZATION_ERROR';
  constructor(public message: string, public details?: Record<string, unknown>) {}
}

export class ServiceUnavailableError implements ScholarlyError {
  code = 'SERVICE_UNAVAILABLE';
  constructor(public message: string, public details?: Record<string, unknown>) {}
}

export class ProviderError implements ScholarlyError {
  code = 'PROVIDER_ERROR';
  constructor(public message: string, public details?: Record<string, unknown>) {}
}

export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface EventBus {
  publish(subject: string, data: unknown): Promise<void>;
  subscribe(subject: string, handler: (data: unknown) => void): Promise<void>;
}

export abstract class ScholarlyBaseService {
  protected readonly serviceName: string;
  protected startTime: Date;

  constructor(name: string) {
    this.serviceName = name;
    this.startTime = new Date();
  }

  protected getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }
}
