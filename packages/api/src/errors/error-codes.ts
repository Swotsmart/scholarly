/**
 * Unified Error Codes for the Scholarly Platform
 *
 * Format: {DOMAIN}_{NUMBER}
 * - AUTH: Authentication/Authorization errors
 * - USER: User-related errors
 * - BOOK: Booking errors
 * - SESS: Session errors
 * - TUTR: Tutor errors
 * - PAYM: Payment errors
 * - CHAIN: Blockchain errors
 * - VALDT: Validation errors
 * - SYS: System errors
 */

export const ErrorCodes = {
  // ============ Authentication (AUTH_xxx) ============
  AUTH_001: 'Invalid credentials',
  AUTH_002: 'Token expired',
  AUTH_003: 'Token invalid',
  AUTH_004: 'Refresh token invalid',
  AUTH_005: 'Refresh token reused (potential theft)',
  AUTH_006: 'Account locked',
  AUTH_007: 'Account not verified',
  AUTH_008: 'Insufficient permissions',
  AUTH_009: 'Session expired',
  AUTH_010: 'Two-factor authentication required',
  AUTH_011: 'Invalid two-factor code',
  AUTH_012: 'Password reset required',

  // ============ User (USER_xxx) ============
  USER_001: 'User not found',
  USER_002: 'Email already registered',
  USER_003: 'Username already taken',
  USER_004: 'Profile incomplete',
  USER_005: 'User suspended',
  USER_006: 'User deleted',
  USER_007: 'Invalid tenant',
  USER_008: 'Wallet not connected',
  USER_009: 'Wallet already linked',

  // ============ Booking (BOOK_xxx) ============
  BOOK_001: 'Tutor not available',
  BOOK_002: 'Time slot conflict',
  BOOK_003: 'Booking not found',
  BOOK_004: 'Cannot cancel confirmed booking',
  BOOK_005: 'Booking already confirmed',
  BOOK_006: 'Booking already cancelled',
  BOOK_007: 'Invalid booking duration',
  BOOK_008: 'Maximum bookings exceeded',
  BOOK_009: 'Insufficient notice for cancellation',
  BOOK_010: 'Booking in the past',

  // ============ Session (SESS_xxx) ============
  SESS_001: 'Session not found',
  SESS_002: 'Session already started',
  SESS_003: 'Session already ended',
  SESS_004: 'Cannot join session (not participant)',
  SESS_005: 'Session link expired',
  SESS_006: 'Maximum participants reached',

  // ============ Tutor (TUTR_xxx) ============
  TUTR_001: 'Tutor not found',
  TUTR_002: 'Tutor not verified',
  TUTR_003: 'Safeguarding check expired',
  TUTR_004: 'Subject not available',
  TUTR_005: 'Year level not taught',
  TUTR_006: 'Price exceeds maximum',
  TUTR_007: 'Tutor suspended',

  // ============ Payment (PAYM_xxx) ============
  PAYM_001: 'Insufficient balance',
  PAYM_002: 'Payment failed',
  PAYM_003: 'Refund failed',
  PAYM_004: 'Invalid payment method',
  PAYM_005: 'Payment already processed',
  PAYM_006: 'Escrow not found',
  PAYM_007: 'Escrow already funded',
  PAYM_008: 'Escrow already released',
  PAYM_009: 'Dispute already raised',
  PAYM_010: 'Dispute resolution failed',

  // ============ Blockchain (CHAIN_xxx) ============
  CHAIN_001: 'Transaction failed',
  CHAIN_002: 'Insufficient gas',
  CHAIN_003: 'Contract call failed',
  CHAIN_004: 'Transaction timeout',
  CHAIN_005: 'Nonce too low',
  CHAIN_006: 'Transaction underpriced',
  CHAIN_007: 'Wallet signature failed',
  CHAIN_008: 'Contract not deployed',
  CHAIN_009: 'Invalid contract address',
  CHAIN_010: 'Credential not found',
  CHAIN_011: 'Credential revoked',
  CHAIN_012: 'Credential expired',
  CHAIN_013: 'Not credential owner',

  // ============ Validation (VALDT_xxx) ============
  VALDT_001: 'Validation failed',
  VALDT_002: 'Required field missing',
  VALDT_003: 'Invalid email format',
  VALDT_004: 'Invalid phone format',
  VALDT_005: 'Invalid date format',
  VALDT_006: 'Invalid time range',
  VALDT_007: 'Value out of range',
  VALDT_008: 'Invalid file type',
  VALDT_009: 'File too large',
  VALDT_010: 'Invalid JSON',

  // ============ System (SYS_xxx) ============
  SYS_001: 'Internal server error',
  SYS_002: 'Database connection failed',
  SYS_003: 'Cache connection failed',
  SYS_004: 'External service unavailable',
  SYS_005: 'Rate limit exceeded',
  SYS_006: 'Request timeout',
  SYS_007: 'Service maintenance',
  SYS_008: 'Feature disabled',
  SYS_009: 'Configuration error',

  // ============ AI Buddy (AI_xxx) ============
  AI_001: 'AI response generation failed',
  AI_002: 'Conversation not found',
  AI_003: 'Failed to save settings',
  AI_004: 'AI service unavailable',
  AI_005: 'Context too long',
  AI_006: 'Content filtered',
  AI_007: 'Rate limit exceeded for AI',
  AI_008: 'Invalid conversation role',

  // ============ Portfolio (PORT_xxx) ============
  PORT_001: 'Failed to create portfolio',
  PORT_002: 'Failed to add artifact',
  PORT_003: 'Failed to get artifacts',
  PORT_004: 'Failed to create goal',
  PORT_005: 'Failed to create learning journey',
  PORT_006: 'Failed to get learning journeys',
  PORT_007: 'Portfolio not found',
  PORT_008: 'Artifact not found',
  PORT_009: 'Goal not found',
  PORT_010: 'Journey not found',
  PORT_011: 'Journey node locked',
  PORT_012: 'Invalid portfolio visibility',

  // ============ Curriculum (CURR_xxx) ============
  CURR_001: 'Framework not found',
  CURR_002: 'Content description not found',
  CURR_003: 'Invalid curriculum code',
  CURR_004: 'Lesson plan generation failed',
  CURR_005: 'Cross-curricular discovery failed',
  CURR_006: 'Alignment failed',
  CURR_007: 'Knowledge graph build failed',
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

// Error code to HTTP status mapping
export const ErrorCodeToStatus: Record<ErrorCode, number> = {
  // Auth - 401/403
  AUTH_001: 401,
  AUTH_002: 401,
  AUTH_003: 401,
  AUTH_004: 401,
  AUTH_005: 401,
  AUTH_006: 403,
  AUTH_007: 403,
  AUTH_008: 403,
  AUTH_009: 401,
  AUTH_010: 403,
  AUTH_011: 401,
  AUTH_012: 403,

  // User - 404/409
  USER_001: 404,
  USER_002: 409,
  USER_003: 409,
  USER_004: 400,
  USER_005: 403,
  USER_006: 410,
  USER_007: 400,
  USER_008: 400,
  USER_009: 409,

  // Booking - 400/404/409
  BOOK_001: 409,
  BOOK_002: 409,
  BOOK_003: 404,
  BOOK_004: 400,
  BOOK_005: 409,
  BOOK_006: 409,
  BOOK_007: 400,
  BOOK_008: 429,
  BOOK_009: 400,
  BOOK_010: 400,

  // Session - 400/404/409
  SESS_001: 404,
  SESS_002: 409,
  SESS_003: 409,
  SESS_004: 403,
  SESS_005: 410,
  SESS_006: 409,

  // Tutor - 404/403
  TUTR_001: 404,
  TUTR_002: 403,
  TUTR_003: 403,
  TUTR_004: 400,
  TUTR_005: 400,
  TUTR_006: 400,
  TUTR_007: 403,

  // Payment - 400/402/404
  PAYM_001: 402,
  PAYM_002: 502,
  PAYM_003: 502,
  PAYM_004: 400,
  PAYM_005: 409,
  PAYM_006: 404,
  PAYM_007: 409,
  PAYM_008: 409,
  PAYM_009: 409,
  PAYM_010: 500,

  // Blockchain - 500/502
  CHAIN_001: 502,
  CHAIN_002: 400,
  CHAIN_003: 502,
  CHAIN_004: 504,
  CHAIN_005: 400,
  CHAIN_006: 400,
  CHAIN_007: 400,
  CHAIN_008: 500,
  CHAIN_009: 400,
  CHAIN_010: 404,
  CHAIN_011: 410,
  CHAIN_012: 410,
  CHAIN_013: 403,

  // Validation - 400
  VALDT_001: 400,
  VALDT_002: 400,
  VALDT_003: 400,
  VALDT_004: 400,
  VALDT_005: 400,
  VALDT_006: 400,
  VALDT_007: 400,
  VALDT_008: 400,
  VALDT_009: 413,
  VALDT_010: 400,

  // System - 500/503
  SYS_001: 500,
  SYS_002: 503,
  SYS_003: 503,
  SYS_004: 503,
  SYS_005: 429,
  SYS_006: 504,
  SYS_007: 503,
  SYS_008: 501,
  SYS_009: 500,

  // AI Buddy - 500/502/404
  AI_001: 502,
  AI_002: 404,
  AI_003: 500,
  AI_004: 503,
  AI_005: 413,
  AI_006: 400,
  AI_007: 429,
  AI_008: 400,

  // Portfolio - 400/404/500
  PORT_001: 500,
  PORT_002: 500,
  PORT_003: 500,
  PORT_004: 500,
  PORT_005: 500,
  PORT_006: 500,
  PORT_007: 404,
  PORT_008: 404,
  PORT_009: 404,
  PORT_010: 404,
  PORT_011: 403,
  PORT_012: 400,

  // Curriculum - 400/404/500
  CURR_001: 404,
  CURR_002: 404,
  CURR_003: 400,
  CURR_004: 500,
  CURR_005: 500,
  CURR_006: 500,
  CURR_007: 500,
};

// Check if an error code indicates a client error (4xx)
export function isClientError(code: ErrorCode): boolean {
  const status = ErrorCodeToStatus[code];
  return status >= 400 && status < 500;
}

// Check if an error code indicates a server error (5xx)
export function isServerError(code: ErrorCode): boolean {
  const status = ErrorCodeToStatus[code];
  return status >= 500;
}

// Check if an error code should trigger alerts
export function shouldAlert(code: ErrorCode): boolean {
  // Alert on all server errors and security-related client errors
  if (isServerError(code)) return true;
  if (code === 'AUTH_005') return true; // Token reuse
  if (code === 'AUTH_006') return true; // Account locked
  return false;
}
