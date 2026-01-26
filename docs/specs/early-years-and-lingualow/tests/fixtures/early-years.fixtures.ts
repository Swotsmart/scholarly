/**
 * Early Years Test Fixtures
 * 
 * Factory functions and mock data for testing the Early Years module
 */

import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// ID GENERATORS
// =============================================================================

export const generateId = () => uuidv4();
export const generateTenantId = () => `tenant_${uuidv4()}`;
export const generateUserId = () => `user_${uuidv4()}`;
export const generateFamilyId = () => `family_${uuidv4()}`;
export const generateChildId = () => `child_${uuidv4()}`;
export const generateSessionId = () => `session_${uuidv4()}`;

// =============================================================================
// DATE HELPERS
// =============================================================================

/**
 * Creates a date of birth for a child of the specified age
 */
export function dateOfBirthForAge(age: number): Date {
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - age);
  dob.setMonth(dob.getMonth() - 6); // Middle of the year
  return dob;
}

// =============================================================================
// FAMILY FIXTURES
// =============================================================================

export interface FamilyFixture {
  id: string;
  tenantId: string;
  primaryUserId: string;
  familyName: string | null;
  primaryLanguage: string;
  homeLanguages: string[];
  timezone: string;
  dataProcessingConsent: boolean;
  dataProcessingConsentAt: Date;
  totalLearningMinutes: number;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function createFamilyFixture(overrides: Partial<FamilyFixture> = {}): FamilyFixture {
  const now = new Date();
  return {
    id: generateFamilyId(),
    tenantId: generateTenantId(),
    primaryUserId: generateUserId(),
    familyName: 'Test Family',
    primaryLanguage: 'en',
    homeLanguages: ['en'],
    timezone: 'Australia/Sydney',
    dataProcessingConsent: true,
    dataProcessingConsentAt: now,
    totalLearningMinutes: 0,
    lastActiveAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

export interface CreateFamilyInput {
  familyName?: string;
  primaryLanguage?: string;
  homeLanguages?: string[];
  timezone?: string;
  dataProcessingConsent: boolean;
}

export function createFamilyInput(overrides: Partial<CreateFamilyInput> = {}): CreateFamilyInput {
  return {
    familyName: 'Test Family',
    primaryLanguage: 'en',
    homeLanguages: ['en'],
    timezone: 'Australia/Sydney',
    dataProcessingConsent: true,
    ...overrides,
  };
}

// =============================================================================
// CHILD FIXTURES
// =============================================================================

export interface ChildFixture {
  id: string;
  tenantId: string;
  familyId: string;
  firstName: string;
  preferredName: string | null;
  dateOfBirth: Date;
  avatarId: string | null;
  totalTreasures: number;
  totalStars: number;
  totalLearningMinutes: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function createChildFixture(overrides: Partial<ChildFixture> = {}): ChildFixture {
  const now = new Date();
  return {
    id: generateChildId(),
    tenantId: generateTenantId(),
    familyId: generateFamilyId(),
    firstName: 'Test Child',
    preferredName: null,
    dateOfBirth: dateOfBirthForAge(5), // Default 5 years old
    avatarId: null,
    totalTreasures: 0,
    totalStars: 0,
    totalLearningMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalSessions: 0,
    lastActiveAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

export interface EnrollChildInput {
  firstName: string;
  preferredName?: string;
  dateOfBirth: Date;
  avatarId?: string;
}

export function enrollChildInput(age: number = 5, overrides: Partial<EnrollChildInput> = {}): EnrollChildInput {
  return {
    firstName: 'Test Child',
    dateOfBirth: dateOfBirthForAge(age),
    ...overrides,
  };
}

// =============================================================================
// PICTURE PASSWORD FIXTURES
// =============================================================================

export interface PicturePasswordFixture {
  id: string;
  childId: string;
  imageSequenceHash: string;
  sequenceLength: number;
  failedAttempts: number;
  lockedUntil: Date | null;
  lastAttemptAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createPicturePasswordFixture(overrides: Partial<PicturePasswordFixture> = {}): PicturePasswordFixture {
  const now = new Date();
  return {
    id: generateId(),
    childId: generateChildId(),
    imageSequenceHash: '$2a$10$mockedhashvalue',
    sequenceLength: 4,
    failedAttempts: 0,
    lockedUntil: null,
    lastAttemptAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export const validPictureSequence = ['cat', 'dog', 'bird', 'fish'];
export const invalidPictureSequence = ['cat', 'dog', 'wrong', 'fish'];

// =============================================================================
// SESSION FIXTURES
// =============================================================================

export interface SessionFixture {
  id: string;
  tenantId: string;
  childId: string;
  familyId: string;
  sessionType: string;
  world: string;
  mentor: string;
  startedAt: Date;
  endedAt: Date | null;
  maxDurationMinutes: number;
  maxActivities: number;
  activitiesCompleted: number;
  treasuresEarned: number;
  starsEarned: number;
  completedNaturally: boolean;
}

export function createSessionFixture(overrides: Partial<SessionFixture> = {}): SessionFixture {
  return {
    id: generateSessionId(),
    tenantId: generateTenantId(),
    childId: generateChildId(),
    familyId: generateFamilyId(),
    sessionType: 'learning',
    world: 'sound_discovery',
    mentor: 'mimo_owl',
    startedAt: new Date(),
    endedAt: null,
    maxDurationMinutes: 20,
    maxActivities: 12,
    activitiesCompleted: 0,
    treasuresEarned: 0,
    starsEarned: 0,
    completedNaturally: false,
    ...overrides,
  };
}

export interface StartSessionInput {
  sessionType?: 'learning' | 'practice' | 'assessment';
  world?: string;
  mentor?: string;
}

export function startSessionInput(overrides: Partial<StartSessionInput> = {}): StartSessionInput {
  return {
    sessionType: 'learning',
    ...overrides,
  };
}

// =============================================================================
// ACTIVITY FIXTURES
// =============================================================================

export interface ActivityFixture {
  id: string;
  sessionId: string;
  activityType: string;
  targetContent: string[];
  difficulty: number;
  score: number | null;
  durationSeconds: number | null;
  attempts: number;
  hintsUsed: number;
  errorsCommitted: number;
  completedAt: Date | null;
  treasureAwarded: boolean;
  responseData: Record<string, unknown>;
  createdAt: Date;
}

export function createActivityFixture(overrides: Partial<ActivityFixture> = {}): ActivityFixture {
  return {
    id: generateId(),
    sessionId: generateSessionId(),
    activityType: 'phoneme_identification',
    targetContent: ['s', 'a', 't'],
    difficulty: 1,
    score: null,
    durationSeconds: null,
    attempts: 1,
    hintsUsed: 0,
    errorsCommitted: 0,
    completedAt: null,
    treasureAwarded: false,
    responseData: {},
    createdAt: new Date(),
    ...overrides,
  };
}

export interface RecordActivityInput {
  activityType: string;
  targetContent: string[];
  difficulty?: number;
  score?: number;
  durationSeconds?: number;
  attempts?: number;
  hintsUsed?: number;
  errorsCommitted?: number;
  responseData?: Record<string, unknown>;
}

export function recordActivityInput(overrides: Partial<RecordActivityInput> = {}): RecordActivityInput {
  return {
    activityType: 'phoneme_identification',
    targetContent: ['s', 'a', 't'],
    difficulty: 1,
    score: 0.9,
    durationSeconds: 30,
    attempts: 1,
    hintsUsed: 0,
    errorsCommitted: 0,
    ...overrides,
  };
}

// =============================================================================
// PHONICS PROGRESS FIXTURES
// =============================================================================

export interface PhonicsProgressFixture {
  id: string;
  childId: string;
  currentPhase: number;
  masteredGraphemes: string[];
  introducedGraphemes: string[];
  strugglingGraphemes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export function createPhonicsProgressFixture(overrides: Partial<PhonicsProgressFixture> = {}): PhonicsProgressFixture {
  const now = new Date();
  return {
    id: generateId(),
    childId: generateChildId(),
    currentPhase: 1,
    masteredGraphemes: [],
    introducedGraphemes: [],
    strugglingGraphemes: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// =============================================================================
// MOCK REPOSITORY HELPERS
// =============================================================================

/**
 * Creates a mock Result success response
 */
export function mockSuccess<T>(data: T) {
  return { success: true as const, data };
}

/**
 * Creates a mock Result failure response
 */
export function mockFailure(error: Error) {
  return { success: false as const, error };
}

/**
 * Creates a mock for findByIdInTenant that returns the fixture if IDs match
 */
export function mockFindByIdInTenant<T extends { id: string; tenantId: string }>(
  fixtures: T[],
) {
  return jest.fn().mockImplementation((tenantId: string, id: string) => {
    const found = fixtures.find(f => f.id === id && f.tenantId === tenantId);
    if (found) {
      return Promise.resolve(mockSuccess(found));
    }
    return Promise.resolve(mockFailure(new Error('Not found')));
  });
}
