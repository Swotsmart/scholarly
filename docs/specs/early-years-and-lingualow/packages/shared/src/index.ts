/**
 * Scholarly Platform - Shared Types & Utilities
 * 
 * Core types, error classes, and utilities used across all services.
 * 
 * @module @scholarly/shared
 */

// =============================================================================
// RESULT TYPE (Explicit Error Handling)
// =============================================================================

/**
 * Result type for explicit error handling without exceptions.
 * Every service method that can fail should return Result<T, E>.
 */
export type Result<T, E = ScholarlyError> =
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

/** Create a successful result */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/** Create a failure result */
export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/** Type guard for success */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

/** Type guard for failure */
export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

/** Unwrap a result, throwing if it's a failure */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}

/** Map over a successful result */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  if (result.success) {
    return success(fn(result.data));
  }
  return result;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/** Base error class for all Scholarly errors */
export class ScholarlyError extends Error {
  public readonly timestamp: Date;

  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ScholarlyError';
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/** Validation error (400) */
export class ValidationError extends ScholarlyError {
  constructor(
    message: string,
    public readonly fields?: Array<{ field: string; message: string }>
  ) {
    super('VALIDATION_ERROR', message, 400, { fields });
    this.name = 'ValidationError';
  }
}

/** Entity not found (404) */
export class NotFoundError extends ScholarlyError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} not found: ${id}`, 404, { entity, id });
    this.name = 'NotFoundError';
  }
}

/** Authentication error (401) */
export class AuthenticationError extends ScholarlyError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
    this.name = 'AuthenticationError';
  }
}

/** Authorization error (403) */
export class AuthorizationError extends ScholarlyError {
  constructor(message: string = 'Permission denied') {
    super('AUTHORIZATION_ERROR', message, 403);
    this.name = 'AuthorizationError';
  }
}

/** Rate limit error (429) */
export class RateLimitError extends ScholarlyError {
  constructor(retryAfterSeconds: number) {
    super(
      'RATE_LIMIT_ERROR',
      `Rate limit exceeded. Retry after ${retryAfterSeconds} seconds`,
      429,
      { retryAfterSeconds }
    );
    this.name = 'RateLimitError';
  }
}

/** Conflict error (409) */
export class ConflictError extends ScholarlyError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT_ERROR', message, 409, details);
    this.name = 'ConflictError';
  }
}

/** External service error (502) */
export class ExternalServiceError extends ScholarlyError {
  constructor(service: string, message: string) {
    super('EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, 502, { service });
    this.name = 'ExternalServiceError';
  }
}

/** Database error (500) */
export class DatabaseError extends ScholarlyError {
  constructor(message: string, cause?: Error) {
    super('DATABASE_ERROR', message, 500, { cause: cause?.message });
    this.name = 'DatabaseError';
  }
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================

/** Tenant context for multi-tenancy */
export interface TenantContext {
  tenantId: string;
  userId?: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
}

/** Request context with tracing */
export interface RequestContext extends TenantContext {
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  startTime: number;
}

// =============================================================================
// PAGINATION
// =============================================================================

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function paginate<T>(
  items: T[],
  total: number,
  options: PaginationOptions
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / options.limit);
  return {
    data: items,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
      hasMore: options.page < totalPages,
    },
  };
}

// =============================================================================
// ENUMS
// =============================================================================

/** CEFR language proficiency levels */
export enum CEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

/** Supported target languages */
export enum TargetLanguage {
  FRENCH = 'fra',
  MANDARIN = 'cmn',
  INDONESIAN = 'ind',
  SPANISH = 'spa',
  ITALIAN = 'ita',
  GERMAN = 'deu',
}

/** Language skill areas */
export enum LanguageSkill {
  LISTENING = 'listening',
  SPEAKING = 'speaking',
  READING = 'reading',
  WRITING = 'writing',
}

/** Heritage speaker pathways */
export enum HeritagePathway {
  LITERACY_LAUNCH = 'literacy_launch',
  ACADEMIC_REGISTER = 'academic_register',
  STANDARD_VARIETY = 'standard_variety',
  CULTURAL_DEEPENING = 'cultural_deepening',
  ACCELERATED = 'accelerated',
}

/** Vocabulary mastery levels */
export enum MasteryLevel {
  NEW = 'new',
  LEARNING = 'learning',
  REVIEWING = 'reviewing',
  MASTERED = 'mastered',
}

/** Early Years phonics phases */
export enum PhonicsPhase {
  PHASE_1 = 1,
  PHASE_2 = 2,
  PHASE_3 = 3,
  PHASE_4 = 4,
  PHASE_5 = 5,
  PHASE_6 = 6,
}

/** Numeracy levels (CPA approach) */
export enum NumeracyLevel {
  FOUNDATIONS = 'foundations',
  EARLY_NUMBER = 'early_number',
  DEVELOPING = 'developing',
  CONFIDENT = 'confident',
  ADVANCED = 'advanced',
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** XP level progression */
export const XP_LEVELS: ReadonlyArray<{ level: number; xpRequired: number; title: string }> = [
  { level: 1, xpRequired: 0, title: 'Novice' },
  { level: 2, xpRequired: 100, title: 'Apprentice' },
  { level: 3, xpRequired: 250, title: 'Student' },
  { level: 4, xpRequired: 450, title: 'Explorer' },
  { level: 5, xpRequired: 750, title: 'Adventurer' },
  { level: 6, xpRequired: 1150, title: 'Journeyer' },
  { level: 7, xpRequired: 1650, title: 'Traveler' },
  { level: 8, xpRequired: 2300, title: 'Voyager' },
  { level: 9, xpRequired: 3100, title: 'Wanderer' },
  { level: 10, xpRequired: 4100, title: 'Pathfinder' },
  { level: 11, xpRequired: 5400, title: 'Guide' },
  { level: 12, xpRequired: 7000, title: 'Expert' },
  { level: 13, xpRequired: 9000, title: 'Master' },
  { level: 14, xpRequired: 11500, title: 'Sage' },
  { level: 15, xpRequired: 14500, title: 'Scholar' },
  { level: 16, xpRequired: 18000, title: 'Virtuoso' },
  { level: 17, xpRequired: 22000, title: 'Luminary' },
  { level: 18, xpRequired: 27000, title: 'Maestro' },
  { level: 19, xpRequired: 33000, title: 'Paragon' },
  { level: 20, xpRequired: 40000, title: 'Polyglot' },
] as const;

/** MYP Phase to CEFR mapping */
export const MYP_PHASE_TO_CEFR: Readonly<Record<number, CEFRLevel[]>> = {
  1: [CEFRLevel.A1],
  2: [CEFRLevel.A1, CEFRLevel.A2],
  3: [CEFRLevel.A2, CEFRLevel.B1],
  4: [CEFRLevel.B1, CEFRLevel.B2],
  5: [CEFRLevel.B2, CEFRLevel.C1],
  6: [CEFRLevel.C1, CEFRLevel.C2],
} as const;

/** Phonics graphemes by phase */
export const PHONICS_PHASES: Readonly<Record<number, readonly string[]>> = {
  1: ['s', 'a', 't', 'p', 'i', 'n'],
  2: ['ck', 'e', 'u', 'r', 'h', 'b', 'f', 'ff', 'l', 'll', 'ss'],
  3: ['j', 'v', 'w', 'x', 'y', 'z', 'qu', 'ch', 'sh', 'th', 'ng'],
  4: ['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'sc', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'tr', 'tw'],
  5: ['ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'wh', 'ph', 'ew', 'oe', 'au'],
  6: ['tion', 'sion', 'ous', 'ture', 'sure', 'cial', 'tial'],
} as const;

/** Session time limits by age */
export const AGE_SESSION_LIMITS: Readonly<Record<string, { maxMinutes: number; maxActivities: number }>> = {
  'age3-4': { maxMinutes: 15, maxActivities: 8 },
  'age5-6': { maxMinutes: 20, maxActivities: 12 },
  'age7': { maxMinutes: 25, maxActivities: 15 },
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Generate a prefixed ID with timestamp */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${random}`;
}

/** Calculate age from date of birth */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

/** Get session limits for a child's age */
export function getSessionLimitsForAge(age: number): { maxMinutes: number; maxActivities: number } {
  if (age <= 4) return AGE_SESSION_LIMITS['age3-4'];
  if (age <= 6) return AGE_SESSION_LIMITS['age5-6'];
  return AGE_SESSION_LIMITS['age7'];
}

/** Calculate XP level and progress */
export function calculateXPLevel(totalXp: number): {
  level: number;
  title: string;
  currentLevelXp: number;
  xpForNextLevel: number;
  progress: number;
} {
  let currentLevel = XP_LEVELS[0];
  let nextLevel = XP_LEVELS[1];

  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (totalXp >= XP_LEVELS[i].xpRequired) {
      currentLevel = XP_LEVELS[i];
      nextLevel = XP_LEVELS[i + 1] || XP_LEVELS[i];
    } else {
      break;
    }
  }

  const currentLevelXp = totalXp - currentLevel.xpRequired;
  const xpForNextLevel = nextLevel.xpRequired - currentLevel.xpRequired;
  const progress = xpForNextLevel > 0 ? currentLevelXp / xpForNextLevel : 1;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    currentLevelXp,
    xpForNextLevel,
    progress: Math.min(progress, 1),
  };
}

/**
 * SM-2 Spaced Repetition Algorithm
 * Quality: 0-5 (0-2 = failure, 3-5 = success)
 */
export function calculateSM2(
  quality: number,
  easeFactor: number,
  interval: number,
  repetitions: number
): { interval: number; easeFactor: number; repetitions: number; nextReviewAt: Date } {
  let newInterval: number;
  let newEaseFactor: number;
  let newRepetitions: number;

  if (quality < 3) {
    // Failed - reset
    newInterval = 1;
    newRepetitions = 0;
    newEaseFactor = easeFactor;
  } else {
    // Success
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions = repetitions + 1;

    // Update ease factor
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(1.3, newEaseFactor);
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
    nextReviewAt,
  };
}

/** Determine mastery level from accuracy and interval */
export function determineMasteryLevel(
  timesCorrect: number,
  timesIncorrect: number,
  interval: number
): MasteryLevel {
  const total = timesCorrect + timesIncorrect;
  if (total === 0) return MasteryLevel.NEW;

  const accuracy = timesCorrect / total;

  if (interval >= 21 && accuracy >= 0.9) return MasteryLevel.MASTERED;
  if (interval >= 7 && accuracy >= 0.7) return MasteryLevel.REVIEWING;
  return MasteryLevel.LEARNING;
}

/** Determine heritage pathway from assessment */
export function determineHeritagePathway(
  oralProficiency: CEFRLevel,
  literacyLevel: CEFRLevel,
  academicRegister: CEFRLevel
): HeritagePathway {
  const levelValue = (level: CEFRLevel): number => {
    const values: Record<CEFRLevel, number> = {
      A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6,
    };
    return values[level];
  };

  const oral = levelValue(oralProficiency);
  const lit = levelValue(literacyLevel);
  const acad = levelValue(academicRegister);

  if (oral >= 4 && lit <= 2) return HeritagePathway.LITERACY_LAUNCH;
  if (oral >= 3 && lit >= 3 && acad <= 2) return HeritagePathway.ACADEMIC_REGISTER;
  if (oral >= 3 && lit <= 2) return HeritagePathway.STANDARD_VARIETY;
  if (oral <= 2 && lit <= 2) return HeritagePathway.CULTURAL_DEEPENING;
  return HeritagePathway.ACCELERATED;
}

/** Timing-safe string comparison */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against self to maintain constant time
    const dummy = a;
    let result = 0;
    for (let i = 0; i < dummy.length; i++) {
      result |= dummy.charCodeAt(i) ^ dummy.charCodeAt(i);
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Sleep for specified milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry a function with exponential backoff */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 100, maxDelayMs = 5000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxAttempts) break;

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}
