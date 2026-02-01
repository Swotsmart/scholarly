/**
 * Shared Mesh Types
 * 
 * Base types and interfaces used across all Intelligence Mesh modules.
 * 
 * @module IntelligenceMesh/Shared
 * @version 1.7.0
 */

// ============================================================================
// BASE ENTITY
// ============================================================================

/**
 * Base entity for all mesh models
 */
export interface MeshBaseEntity {
  id: string;
  tenantId: string;
  
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================================================
// RESULT TYPE
// ============================================================================

/**
 * Result type for explicit error handling
 */
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

export const success = <T>(value: T): Result<T> => ({ success: true, value });
export const failure = <E>(error: E): Result<never, E> => ({ success: false, error });

// ============================================================================
// VALIDATION
// ============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(
    public entityType: string,
    public entityId: string
  ) {
    super(`${entityType} not found: ${entityId}`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// ============================================================================
// PAGINATION
// ============================================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// FILTERING
// ============================================================================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface BaseFilter {
  tenantId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
}

// ============================================================================
// EVENTS
// ============================================================================

export interface MeshEvent<T = any> {
  id: string;
  type: string;
  tenantId: string;
  timestamp: Date;
  
  payload: T;
  
  metadata: {
    source: string;
    version: string;
    correlationId?: string;
    causedBy?: string;
    userId?: string;
  };
}

// ============================================================================
// AI SERVICES
// ============================================================================

export interface AIServiceConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  retries: number;
}

export interface AIServiceResponse<T> {
  result: T;
  confidence: number;
  modelVersion: string;
  processingTime: number;
  tokensUsed: number;
}

// ============================================================================
// AUDIT
// ============================================================================

export interface AuditEntry {
  id: string;
  tenantId: string;
  
  action: string;
  entityType: string;
  entityId: string;
  
  userId: string;
  userName: string;
  
  timestamp: Date;
  
  before?: Record<string, any>;
  after?: Record<string, any>;
  
  metadata?: Record<string, any>;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  MeshBaseEntity,
  Result,
  PaginationParams,
  PaginatedResult,
  DateRange,
  BaseFilter,
  MeshEvent,
  AIServiceConfig,
  AIServiceResponse,
  AuditEntry
};
