/**
 * Unified Error Class for the Scholarly Platform
 */

import { ErrorCode, ErrorCodes, ErrorCodeToStatus, shouldAlert } from './error-codes';
import { log } from '../lib/logger';

export interface ErrorDetails {
  field?: string;
  value?: unknown;
  constraint?: string;
  [key: string]: unknown;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetails;
    requestId: string;
    timestamp: string;
  };
}

export class ScholarlyApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ErrorDetails;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    details?: ErrorDetails,
    originalError?: Error
  ) {
    super(ErrorCodes[code]);

    this.code = code;
    this.statusCode = ErrorCodeToStatus[code];
    this.details = details;
    this.isOperational = true;

    // Capture stack trace
    if (originalError) {
      this.stack = originalError.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }

    // Log if should alert
    if (shouldAlert(code)) {
      log.error(`Alert-worthy error: ${code}`, this, details);
    }
  }

  /**
   * Convert to API response format
   */
  toResponse(requestId: string): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        requestId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ============ Static Factory Methods ============

  // Auth errors
  static invalidCredentials(details?: ErrorDetails) {
    return new ScholarlyApiError('AUTH_001', details);
  }

  static tokenExpired(details?: ErrorDetails) {
    return new ScholarlyApiError('AUTH_002', details);
  }

  static tokenInvalid(details?: ErrorDetails) {
    return new ScholarlyApiError('AUTH_003', details);
  }

  static refreshTokenInvalid(details?: ErrorDetails) {
    return new ScholarlyApiError('AUTH_004', details);
  }

  static refreshTokenReused(details?: ErrorDetails) {
    return new ScholarlyApiError('AUTH_005', details);
  }

  static accountLocked(details?: ErrorDetails) {
    return new ScholarlyApiError('AUTH_006', details);
  }

  static insufficientPermissions(details?: ErrorDetails) {
    return new ScholarlyApiError('AUTH_008', details);
  }

  // User errors
  static userNotFound(userId?: string) {
    return new ScholarlyApiError('USER_001', userId ? { userId } : undefined);
  }

  static emailAlreadyRegistered(email: string) {
    return new ScholarlyApiError('USER_002', { email });
  }

  static walletNotConnected(userId?: string) {
    return new ScholarlyApiError('USER_008', userId ? { userId } : undefined);
  }

  // Booking errors
  static tutorNotAvailable(tutorId: string, slot?: string) {
    return new ScholarlyApiError('BOOK_001', { tutorId, slot });
  }

  static timeSlotConflict(details?: ErrorDetails) {
    return new ScholarlyApiError('BOOK_002', details);
  }

  static bookingNotFound(bookingId?: string) {
    return new ScholarlyApiError('BOOK_003', bookingId ? { bookingId } : undefined);
  }

  // Session errors
  static sessionNotFound(sessionId?: string) {
    return new ScholarlyApiError('SESS_001', sessionId ? { sessionId } : undefined);
  }

  // Tutor errors
  static tutorNotFound(tutorId?: string) {
    return new ScholarlyApiError('TUTR_001', tutorId ? { tutorId } : undefined);
  }

  static tutorNotVerified(tutorId?: string) {
    return new ScholarlyApiError('TUTR_002', tutorId ? { tutorId } : undefined);
  }

  // Payment errors
  static insufficientBalance(required?: string, available?: string) {
    return new ScholarlyApiError('PAYM_001', { required, available });
  }

  static escrowNotFound(escrowId?: string) {
    return new ScholarlyApiError('PAYM_006', escrowId ? { escrowId } : undefined);
  }

  // Blockchain errors
  static transactionFailed(txHash?: string, reason?: string) {
    return new ScholarlyApiError('CHAIN_001', { txHash, reason });
  }

  static contractCallFailed(contract?: string, method?: string, reason?: string) {
    return new ScholarlyApiError('CHAIN_003', { contract, method, reason });
  }

  static credentialNotFound(tokenId?: string) {
    return new ScholarlyApiError('CHAIN_010', tokenId ? { tokenId } : undefined);
  }

  static credentialRevoked(tokenId?: string) {
    return new ScholarlyApiError('CHAIN_011', tokenId ? { tokenId } : undefined);
  }

  // Validation errors
  static validationFailed(errors: Array<{ field: string; message: string }>) {
    return new ScholarlyApiError('VALDT_001', { errors });
  }

  static validationError(details?: ErrorDetails | unknown[]) {
    // Handle Zod error arrays by wrapping them in an object
    if (Array.isArray(details)) {
      return new ScholarlyApiError('VALDT_001', { errors: details as unknown });
    }
    return new ScholarlyApiError('VALDT_001', details);
  }

  static requiredFieldMissing(field: string) {
    return new ScholarlyApiError('VALDT_002', { field });
  }

  // Not found errors
  static notFound(resourceTypeOrDetails?: string | ErrorDetails, resourceId?: string) {
    if (typeof resourceTypeOrDetails === 'string') {
      return new ScholarlyApiError('SYS_010', {
        resourceType: resourceTypeOrDetails,
        resourceId
      });
    }
    return new ScholarlyApiError('SYS_010', resourceTypeOrDetails);
  }

  // System errors
  static internalError(originalError?: Error) {
    return new ScholarlyApiError('SYS_001', undefined, originalError);
  }

  static databaseError(originalError?: Error) {
    return new ScholarlyApiError('SYS_002', undefined, originalError);
  }

  static rateLimitExceeded(details?: ErrorDetails) {
    return new ScholarlyApiError('SYS_005', details);
  }

  static serviceUnavailable(service?: string) {
    return new ScholarlyApiError('SYS_004', service ? { service } : undefined);
  }
}

// Export aliases for backward compatibility
export { ErrorCodes, ErrorCodeToStatus };
export type { ErrorCode };
