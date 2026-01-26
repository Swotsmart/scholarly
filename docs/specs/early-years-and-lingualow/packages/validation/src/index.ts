/**
 * Scholarly Platform - Validation Schemas
 * 
 * Zod schemas for runtime validation of all API inputs.
 * Every request body, query parameter, and path parameter MUST be validated
 * before processing.
 * 
 * @module @scholarly/validation
 */

import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

/** CUID format validation */
export const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid CUID format');

/** UUID format validation */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/** ID that accepts either CUID or UUID */
export const idSchema = z.string().min(1, 'ID is required');

/** Tenant ID (required on most requests) */
export const tenantIdSchema = z.string().min(1, 'Tenant ID is required');

/** Pagination parameters */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** Date range filter */
export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: 'Start date must be before end date' }
);

// =============================================================================
// USER & AUTH SCHEMAS
// =============================================================================

export const emailSchema = z.string().email('Invalid email address').max(255);

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
  timezone: z.string().default('Australia/Sydney'),
  locale: z.string().default('en-AU'),
});

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional().nullable(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
}).refine(
  (data) => data.currentPassword !== data.newPassword,
  { message: 'New password must be different from current password' }
);

// =============================================================================
// EARLY YEARS SCHEMAS
// =============================================================================

/** Family creation */
export const createFamilySchema = z.object({
  familyName: z.string().max(100).optional(),
  primaryLanguage: z.string().min(2).max(10).default('en'),
  homeLanguages: z.array(z.string().min(2).max(10)).max(10).default([]),
  timezone: z.string().default('Australia/Sydney'),
  dataProcessingConsent: z.boolean().refine(
    (val) => val === true,
    { message: 'Data processing consent is required' }
  ),
});

/** Child enrollment */
export const enrollChildSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  preferredName: z.string().max(50).optional(),
  dateOfBirth: z.coerce.date().refine(
    (date) => {
      const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return age >= 3 && age <= 7;
    },
    { message: 'Child must be between 3 and 7 years old' }
  ),
  avatarId: z.string().optional(),
});

/** Picture password setup */
export const setupPicturePasswordSchema = z.object({
  imageSequence: z
    .array(z.string().min(1))
    .min(3, 'Sequence must have at least 3 images')
    .max(5, 'Sequence must have at most 5 images'),
});

/** Picture password verification */
export const verifyPicturePasswordSchema = z.object({
  imageSequence: z
    .array(z.string().min(1))
    .min(3)
    .max(5),
});

/** Session start */
export const startSessionSchema = z.object({
  sessionType: z.enum(['learning', 'practice', 'assessment']).default('learning'),
  world: z.enum([
    'sound_discovery',
    'letter_land',
    'word_woods',
    'story_kingdom',
    'reading_realm',
    'number_jungle',
    'counting_castle',
    'shape_world',
  ]).optional(),
  mentor: z.enum([
    'mimo_owl',
    'bongo_bear',
    'melody_songbird',
    'puzzle_fox',
  ]).optional(),
});

/** Activity recording */
export const recordActivitySchema = z.object({
  activityType: z.enum([
    'phoneme_identification',
    'grapheme_matching',
    'blending_practice',
    'segmenting_practice',
    'sight_word_recognition',
    'counting',
    'number_recognition',
    'subitizing',
    'addition',
    'subtraction',
    'shape_recognition',
    'pattern_matching',
  ]),
  targetContent: z.array(z.string()).min(1),
  difficulty: z.number().int().min(1).max(5).default(1),
  score: z.number().min(0).max(1).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  attempts: z.number().int().min(1).default(1),
  hintsUsed: z.number().int().min(0).default(0),
  errorsCommitted: z.number().int().min(0).default(0),
  responseData: z.record(z.unknown()).optional(),
});

/** Session end */
export const endSessionSchema = z.object({
  // Optional feedback
  childMoodRating: z.number().int().min(1).max(5).optional(),
  parentNotes: z.string().max(500).optional(),
});

// =============================================================================
// LINGUAFLOW SCHEMAS
// =============================================================================

/** Supported languages */
export const targetLanguageSchema = z.enum(['fra', 'cmn', 'ind', 'spa', 'ita', 'deu']);

/** CEFR levels */
export const cefrLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

/** Language profile creation */
export const createLanguageProfileSchema = z.object({
  targetLanguage: targetLanguageSchema,
  nativeLanguage: z.string().min(2).max(10).default('en'),
  additionalLanguages: z.array(z.string().min(2).max(10)).max(10).default([]),
  isHeritageSpeaker: z.boolean().default(false),
  curriculumFramework: z.enum(['ACARA', 'IB', 'BOTH']).default('ACARA'),
  yearLevel: z.string().max(10).optional(),
  ibProgramme: z.enum(['PYP', 'MYP', 'DP']).optional(),
  ibPhaseOrLevel: z.string().max(10).optional(),
});

/** Update CEFR level */
export const updateCefrLevelSchema = z.object({
  skill: z.enum(['overall', 'listening', 'speaking', 'reading', 'writing']),
  level: cefrLevelSchema,
});

/** Heritage pathway creation */
export const createHeritagePathwaySchema = z.object({
  oralProficiency: cefrLevelSchema,
  literacyLevel: cefrLevelSchema,
  academicRegisterLevel: cefrLevelSchema,
  dialectFeatures: z.array(z.string()).max(20).default([]),
});

/** Add vocabulary word */
export const addVocabularySchema = z.object({
  wordId: z.string().min(1),
  word: z.string().min(1).max(100),
  translation: z.string().min(1).max(200),
  cefrLevel: cefrLevelSchema.default('A1'),
  partOfSpeech: z.string().max(20).optional(),
  exampleSentence: z.string().max(500).optional(),
  audioUrl: z.string().url().optional(),
});

/** Review vocabulary */
export const reviewVocabularySchema = z.object({
  wordId: z.string().min(1),
  quality: z.number().int().min(0).max(5),
  responseTimeMs: z.number().int().min(0).optional(),
  pronunciationScore: z.number().min(0).max(1).optional(),
});

/** Start conversation */
export const startConversationSchema = z.object({
  mode: z.enum([
    'role_play',
    'free_conversation',
    'topic_discussion',
    'targeted_practice',
    'presentation_rehearsal',
    'ib_oral_practice',
  ]),
  scenarioId: z.string().optional(),
  scenarioTitle: z.string().max(200).optional(),
  aiRole: z.string().max(100).optional(),
  targetVocabulary: z.array(z.string()).max(50).default([]),
  targetStructures: z.array(z.string()).max(20).default([]),
  isHeritageVariant: z.boolean().default(false),
});

/** Add conversation message */
export const addConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(5000),
  audioUrl: z.string().url().optional(),
  pronunciationScore: z.number().min(0).max(1).optional(),
});

/** End conversation */
export const endConversationSchema = z.object({
  // Optional self-assessment
  selfFluencyRating: z.number().int().min(1).max(5).optional(),
  selfConfidenceRating: z.number().int().min(1).max(5).optional(),
});

/** Create offline package */
export const createOfflinePackageSchema = z.object({
  packageType: z.enum([
    'vocabulary_review',
    'lesson_unit',
    'conversation_scenarios',
    'practice_tests',
    'full_sync',
  ]),
  vocabularyIds: z.array(z.string()).max(500).optional(),
  lessonIds: z.array(z.string()).max(50).optional(),
  scenarioIds: z.array(z.string()).max(50).optional(),
});

/** Sync offline progress */
export const syncOfflineProgressSchema = z.object({
  vocabularyReviews: z.array(z.object({
    wordId: z.string(),
    quality: z.number().int().min(0).max(5),
    reviewedAt: z.coerce.date(),
  })).optional(),
  conversationSessions: z.array(z.object({
    mode: z.string(),
    durationMinutes: z.number().int().min(0),
    completedAt: z.coerce.date(),
    messagesCount: z.number().int().min(0),
  })).optional(),
  lastOfflineActivityAt: z.coerce.date(),
});

/** IB criteria alignment */
export const alignIbCriteriaSchema = z.object({
  criterion: z.enum(['A', 'B', 'C', 'D']),
  score: z.number().int().min(0).max(8),
  evidence: z.string().max(2000).optional(),
});

// =============================================================================
// VALIDATION MIDDLEWARE HELPER
// =============================================================================

export type ValidationSchema = z.ZodType<unknown>;

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Validates data against a Zod schema and returns a structured result
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  
  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}

// =============================================================================
// EXPORTED TYPE INFERENCE
// =============================================================================

export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;

export type CreateFamily = z.infer<typeof createFamilySchema>;
export type EnrollChild = z.infer<typeof enrollChildSchema>;
export type SetupPicturePassword = z.infer<typeof setupPicturePasswordSchema>;
export type VerifyPicturePassword = z.infer<typeof verifyPicturePasswordSchema>;
export type StartSession = z.infer<typeof startSessionSchema>;
export type RecordActivity = z.infer<typeof recordActivitySchema>;
export type EndSession = z.infer<typeof endSessionSchema>;

export type CreateLanguageProfile = z.infer<typeof createLanguageProfileSchema>;
export type UpdateCefrLevel = z.infer<typeof updateCefrLevelSchema>;
export type CreateHeritagePathway = z.infer<typeof createHeritagePathwaySchema>;
export type AddVocabulary = z.infer<typeof addVocabularySchema>;
export type ReviewVocabulary = z.infer<typeof reviewVocabularySchema>;
export type StartConversation = z.infer<typeof startConversationSchema>;
export type AddConversationMessage = z.infer<typeof addConversationMessageSchema>;
export type EndConversation = z.infer<typeof endConversationSchema>;
export type CreateOfflinePackage = z.infer<typeof createOfflinePackageSchema>;
export type SyncOfflineProgress = z.infer<typeof syncOfflineProgressSchema>;
export type AlignIbCriteria = z.infer<typeof alignIbCriteriaSchema>;

export type Pagination = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
