/**
 * Error Types for Scholarly Platform
 */

export class ScholarlyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly httpStatus: number = 500
  ) {
    super(message);
    this.name = 'ScholarlyError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class ValidationError extends ScholarlyError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ScholarlyError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} not found: ${id}`, { entity, id }, 404);
    this.name = 'NotFoundError';
  }
}

export class AuthenticationError extends ScholarlyError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, undefined, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ScholarlyError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTHORIZATION_ERROR', message, details, 403);
    this.name = 'AuthorizationError';
  }
}

export class SafeguardingError extends ScholarlyError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('SAFEGUARDING_ERROR', message, details, 403);
    this.name = 'SafeguardingError';
  }
}

export class ComplianceError extends ScholarlyError {
  constructor(message: string, jurisdiction: string, details?: Record<string, unknown>) {
    super('COMPLIANCE_ERROR', message, { ...details, jurisdiction }, 403);
    this.name = 'ComplianceError';
  }
}

export class ConflictError extends ScholarlyError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT_ERROR', message, details, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ScholarlyError {
  constructor(message: string = 'Rate limit exceeded') {
    super('RATE_LIMIT_ERROR', message, undefined, 429);
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends ScholarlyError {
  constructor(service: string) {
    super('SERVICE_UNAVAILABLE', `${service} is temporarily unavailable`, { service }, 503);
    this.name = 'ServiceUnavailableError';
  }
}
