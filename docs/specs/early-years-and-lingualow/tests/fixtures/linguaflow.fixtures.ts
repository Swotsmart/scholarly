/**
 * LinguaFlow Test Fixtures
 * 
 * Factory functions and mock data for testing the LinguaFlow language learning module
 */

import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// ID GENERATORS
// =============================================================================

export const generateId = () => uuidv4();
export const generateTenantId = () => `tenant_${uuidv4()}`;
export const generateUserId = () => `user_${uuidv4()}`;
export const generateProfileId = () => `profile_${uuidv4()}`;
export const generateVocabProgressId = () => `vocabprog_${uuidv4()}`;
export const generateVocabItemId = () => `vocab_${uuidv4()}`;
export const generateConversationId = () => `conv_${uuidv4()}`;
export const generatePathwayId = () => `pathway_${uuidv4()}`;
export const generateAchievementId = () => `achievement_${uuidv4()}`;
export const generatePackageId = () => `package_${uuidv4()}`;

// =============================================================================
// CONSTANTS
// =============================================================================

export const SUPPORTED_LANGUAGES = ['french', 'mandarin', 'indonesian', 'spanish', 'italian', 'german'] as const;
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const CEFR_SKILLS = ['listening', 'speaking', 'reading', 'writing', 'overall'] as const;
export const HERITAGE_PATHWAY_TYPES = ['literacy_launch', 'academic_register', 'standard_variety', 'cultural_deepening', 'accelerated'] as const;
export const IB_PROGRAMMES = ['PYP', 'MYP', 'DP'] as const;

// =============================================================================
// PROFILE FIXTURES
// =============================================================================

export interface ProfileFixture {
  id: string;
  tenantId: string;
  userId: string;
  targetLanguage: string;
  nativeLanguage: string;
  overallLevel: string;
  listeningLevel: string;
  speakingLevel: string;
  readingLevel: string;
  writingLevel: string;
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalConversations: number;
  totalConversationMinutes: number;
  dailyGoal: number;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function createProfileFixture(overrides: Partial<ProfileFixture> = {}): ProfileFixture {
  const now = new Date();
  return {
    id: generateProfileId(),
    tenantId: generateTenantId(),
    userId: generateUserId(),
    targetLanguage: 'french',
    nativeLanguage: 'en',
    overallLevel: 'A1',
    listeningLevel: 'A1',
    speakingLevel: 'A1',
    readingLevel: 'A1',
    writingLevel: 'A1',
    totalXp: 0,
    currentLevel: 1,
    currentStreak: 0,
    longestStreak: 0,
    totalConversations: 0,
    totalConversationMinutes: 0,
    dailyGoal: 10,
    lastActiveAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

export interface CreateProfileInput {
  targetLanguage: string;
  nativeLanguage?: string;
  overallLevel?: string;
  dailyGoal?: number;
}

export function createProfileInput(overrides: Partial<CreateProfileInput> = {}): CreateProfileInput {
  return {
    targetLanguage: 'french',
    nativeLanguage: 'en',
    overallLevel: 'A1',
    dailyGoal: 10,
    ...overrides,
  };
}

// =============================================================================
// VOCABULARY PROGRESS FIXTURES
// =============================================================================

export interface VocabProgressFixture {
  id: string;
  profileId: string;
  totalWordsExposed: number;
  totalWordsMastered: number;
  totalWordsLearning: number;
  averageRetention: number;
  lastReviewAt: Date | null;
  todayWordsReviewed: number;
  todayNewWords: number;
  createdAt: Date;
  updatedAt: Date;
}

export function createVocabProgressFixture(overrides: Partial<VocabProgressFixture> = {}): VocabProgressFixture {
  const now = new Date();
  return {
    id: generateVocabProgressId(),
    profileId: generateProfileId(),
    totalWordsExposed: 0,
    totalWordsMastered: 0,
    totalWordsLearning: 0,
    averageRetention: 0,
    lastReviewAt: null,
    todayWordsReviewed: 0,
    todayNewWords: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// =============================================================================
// VOCABULARY ITEM FIXTURES
// =============================================================================

export interface VocabItemFixture {
  id: string;
  progressId: string;
  wordId: string;
  word: string;
  translation: string;
  pronunciation: string | null;
  context: string | null;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: Date | null;
  lastPracticedAt: Date | null;
  timesCorrect: number;
  timesIncorrect: number;
  lastAttemptCorrect: boolean;
  masteryLevel: string;
  masteredAt: Date | null;
  createdAt: Date;
}

export function createVocabItemFixture(overrides: Partial<VocabItemFixture> = {}): VocabItemFixture {
  const now = new Date();
  return {
    id: generateVocabItemId(),
    progressId: generateVocabProgressId(),
    wordId: `word_${uuidv4()}`,
    word: 'bonjour',
    translation: 'hello',
    pronunciation: 'bɔ̃ʒuʁ',
    context: 'Bonjour, comment allez-vous?',
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReviewAt: now,
    lastPracticedAt: null,
    timesCorrect: 0,
    timesIncorrect: 0,
    lastAttemptCorrect: false,
    masteryLevel: 'new',
    masteredAt: null,
    createdAt: now,
    ...overrides,
  };
}

export interface AddVocabularyInput {
  wordId: string;
  word: string;
  translation: string;
  pronunciation?: string;
  context?: string;
  tags?: string[];
}

export function addVocabularyInput(overrides: Partial<AddVocabularyInput> = {}): AddVocabularyInput {
  return {
    wordId: `word_${uuidv4()}`,
    word: 'bonjour',
    translation: 'hello',
    pronunciation: 'bɔ̃ʒuʁ',
    context: 'Bonjour, comment allez-vous?',
    ...overrides,
  };
}

export interface ReviewVocabularyInput {
  wordId: string;
  quality: number; // 0-5 for SM-2
}

export function reviewVocabularyInput(quality: number = 4, overrides: Partial<ReviewVocabularyInput> = {}): ReviewVocabularyInput {
  return {
    wordId: `word_${uuidv4()}`,
    quality,
    ...overrides,
  };
}

// =============================================================================
// CONVERSATION FIXTURES
// =============================================================================

export interface ConversationFixture {
  id: string;
  profileId: string;
  scenario: string;
  targetSkills: string[];
  cefrLevel: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number;
  fluencyScore: number | null;
  accuracyScore: number | null;
  overallScore: number | null;
  strengths: string[];
  areasToImprove: string[];
  vocabularyUsed: string[];
  xpEarned: number;
}

export function createConversationFixture(overrides: Partial<ConversationFixture> = {}): ConversationFixture {
  const now = new Date();
  return {
    id: generateConversationId(),
    profileId: generateProfileId(),
    scenario: 'ordering_at_restaurant',
    targetSkills: ['speaking', 'listening'],
    cefrLevel: 'A1',
    messages: [],
    startedAt: now,
    endedAt: null,
    durationMinutes: 0,
    fluencyScore: null,
    accuracyScore: null,
    overallScore: null,
    strengths: [],
    areasToImprove: [],
    vocabularyUsed: [],
    xpEarned: 0,
    ...overrides,
  };
}

export interface StartConversationInput {
  scenario: string;
  targetSkills?: string[];
  cefrLevel?: string;
}

export function startConversationInput(overrides: Partial<StartConversationInput> = {}): StartConversationInput {
  return {
    scenario: 'ordering_at_restaurant',
    targetSkills: ['speaking', 'listening'],
    ...overrides,
  };
}

export interface AddMessageInput {
  content: string;
  role?: 'user' | 'assistant';
}

export function addMessageInput(content: string = 'Bonjour, je voudrais commander.'): AddMessageInput {
  return {
    content,
    role: 'user',
  };
}

export interface EndConversationInput {
  userFeedback?: string;
  selfAssessment?: number;
}

export function endConversationInput(overrides: Partial<EndConversationInput> = {}): EndConversationInput {
  return {
    selfAssessment: 4,
    ...overrides,
  };
}

// =============================================================================
// HERITAGE PATHWAY FIXTURES
// =============================================================================

export interface HeritagePathwayFixture {
  id: string;
  profileId: string;
  pathwayType: string;
  homeExposureLevel: string;
  formalEducationYears: number;
  literacyLevel: string;
  culturalConnection: string;
  assessmentScores: Record<string, number>;
  recommendedFocus: string[];
  createdAt: Date;
  updatedAt: Date;
}

export function createHeritagePathwayFixture(overrides: Partial<HeritagePathwayFixture> = {}): HeritagePathwayFixture {
  const now = new Date();
  return {
    id: generatePathwayId(),
    profileId: generateProfileId(),
    pathwayType: 'literacy_launch',
    homeExposureLevel: 'high',
    formalEducationYears: 0,
    literacyLevel: 'none',
    culturalConnection: 'strong',
    assessmentScores: {
      oralFluency: 4,
      literacy: 1,
      formalRegister: 2,
    },
    recommendedFocus: ['literacy', 'formal_writing'],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export interface CreateHeritagePathwayInput {
  homeExposureLevel: 'none' | 'low' | 'medium' | 'high';
  formalEducationYears: number;
  literacyLevel: 'none' | 'basic' | 'intermediate' | 'advanced';
  culturalConnection: 'none' | 'weak' | 'moderate' | 'strong';
  assessmentScores?: Record<string, number>;
}

export function createHeritagePathwayInput(overrides: Partial<CreateHeritagePathwayInput> = {}): CreateHeritagePathwayInput {
  return {
    homeExposureLevel: 'high',
    formalEducationYears: 0,
    literacyLevel: 'none',
    culturalConnection: 'strong',
    ...overrides,
  };
}

// =============================================================================
// ACHIEVEMENT FIXTURES
// =============================================================================

export interface AchievementFixture {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  xpReward: number;
  iconUrl: string | null;
  isActive: boolean;
}

export function createAchievementFixture(overrides: Partial<AchievementFixture> = {}): AchievementFixture {
  return {
    id: generateAchievementId(),
    code: 'first_word',
    name: 'First Word',
    description: 'Learn your first vocabulary word',
    category: 'vocabulary',
    xpReward: 10,
    iconUrl: null,
    isActive: true,
    ...overrides,
  };
}

export interface LearnerAchievementFixture {
  id: string;
  profileId: string;
  achievementId: string;
  earnedAt: Date;
  currentProgress: number;
}

export function createLearnerAchievementFixture(overrides: Partial<LearnerAchievementFixture> = {}): LearnerAchievementFixture {
  return {
    id: generateId(),
    profileId: generateProfileId(),
    achievementId: generateAchievementId(),
    earnedAt: new Date(),
    currentProgress: 0,
    ...overrides,
  };
}

// =============================================================================
// OFFLINE PACKAGE FIXTURES
// =============================================================================

export interface OfflinePackageFixture {
  id: string;
  profileId: string;
  packageType: string;
  content: Record<string, unknown>;
  expiresAt: Date;
  syncedAt: Date | null;
  createdAt: Date;
}

export function createOfflinePackageFixture(overrides: Partial<OfflinePackageFixture> = {}): OfflinePackageFixture {
  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  return {
    id: generatePackageId(),
    profileId: generateProfileId(),
    packageType: 'vocabulary_review',
    content: {
      vocabulary: [],
      scenarios: [],
    },
    expiresAt,
    syncedAt: null,
    createdAt: now,
    ...overrides,
  };
}

export interface CreateOfflinePackageInput {
  packageType?: 'vocabulary_review' | 'conversation_practice' | 'mixed';
  includeVocabulary?: boolean;
  includeScenarios?: boolean;
  maxItems?: number;
}

export function createOfflinePackageInput(overrides: Partial<CreateOfflinePackageInput> = {}): CreateOfflinePackageInput {
  return {
    packageType: 'vocabulary_review',
    includeVocabulary: true,
    maxItems: 50,
    ...overrides,
  };
}

export interface SyncOfflineProgressInput {
  packageId: string;
  reviews: Array<{
    wordId: string;
    quality: number;
    reviewedAt: string;
  }>;
  completedScenarios?: string[];
}

export function syncOfflineProgressInput(packageId: string, overrides: Partial<SyncOfflineProgressInput> = {}): SyncOfflineProgressInput {
  return {
    packageId,
    reviews: [
      { wordId: 'word_1', quality: 4, reviewedAt: new Date().toISOString() },
      { wordId: 'word_2', quality: 3, reviewedAt: new Date().toISOString() },
    ],
    ...overrides,
  };
}

// =============================================================================
// IB CURRICULUM FIXTURES
// =============================================================================

export interface IbCriteriaInput {
  programme: 'PYP' | 'MYP' | 'DP';
  phase?: number;
  criterion: 'A' | 'B' | 'C' | 'D';
  score: number;
  taskDescription?: string;
  assessmentDate?: Date;
}

export function ibCriteriaInput(overrides: Partial<IbCriteriaInput> = {}): IbCriteriaInput {
  return {
    programme: 'MYP',
    phase: 3,
    criterion: 'A',
    score: 6,
    taskDescription: 'Oral presentation about daily routine',
    assessmentDate: new Date(),
    ...overrides,
  };
}

// =============================================================================
// CEFR UPDATE FIXTURES
// =============================================================================

export interface UpdateCefrLevelInput {
  skill: 'listening' | 'speaking' | 'reading' | 'writing' | 'overall';
  level: string;
  assessmentType?: string;
  assessmentScore?: number;
}

export function updateCefrLevelInput(overrides: Partial<UpdateCefrLevelInput> = {}): UpdateCefrLevelInput {
  return {
    skill: 'speaking',
    level: 'A2',
    assessmentType: 'conversation_practice',
    ...overrides,
  };
}

// =============================================================================
// MOCK HELPERS
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
 * Creates SM-2 algorithm result
 */
export function sm2Result(quality: number) {
  const easeFactor = Math.max(1.3, 2.5 + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  let interval = 1;
  let repetitions = 0;
  
  if (quality >= 3) {
    repetitions = 1;
    interval = 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);
  }
  
  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewAt: new Date(Date.now() + interval * 24 * 60 * 60 * 1000),
  };
}

/**
 * XP level calculator mock
 */
export function calculateLevel(xp: number): { level: number; xpForCurrentLevel: number; xpForNextLevel: number } {
  // Simplified: 100 XP per level
  const level = Math.floor(xp / 100) + 1;
  return {
    level: Math.min(level, 20),
    xpForCurrentLevel: (level - 1) * 100,
    xpForNextLevel: level * 100,
  };
}
