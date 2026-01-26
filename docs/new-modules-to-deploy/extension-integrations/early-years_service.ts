/**
 * Early Years Service (Little Explorers)
 * 
 * Comprehensive service for early childhood education (ages 3-7).
 * Integrates with existing Scholarly infrastructure:
 * 
 * 1. AI Buddy Extension - Child-friendly personas (Lettie, Numero, etc.)
 * 2. AI Content Studio - Phonics activities, decodable readers
 * 3. Data Lake - Eye tracking, phonics events, session data
 * 4. ML Pipeline - Reading difficulty prediction
 * 5. Analytics - Parent dashboards, progress tracking
 * 
 * Features:
 * - Storybook-driven learning through "Alphabetia" world
 * - Picture password authentication for pre-literate children
 * - Adaptive phonics engine (Systematic Synthetic Phonics)
 * - Adaptive numeracy engine (Concrete-Pictorial-Abstract)
 * - Eye tracking integration for reading development
 * - Family portal with multilingual support
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  EventBus,
  Cache,
  ScholarlyConfig
} from '@scholarly/shared/types/scholarly-types';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger';

// Import existing services for integration
import { AIIntegrationService, getAIService } from './ai-integration.service';
import { AIBuddyService, getAIBuddyService, BuddyRole, Conversation } from './ai-buddy.service';
import { AIContentStudioService, getAIContentStudioService } from './ai-content-studio.service';
import { DataLakeService, getDataLakeService } from './data-lake.service';
import { MLPipelineService, getMLPipelineService } from './ml-pipeline.service';
import { AnalyticsReportingService, getAnalyticsService } from './analytics-reporting.service';

// ============================================================================
// TYPES - EARLY YEARS LEARNER
// ============================================================================

export type DevelopmentalStage = 'emergent' | 'early' | 'developing' | 'fluent';
export type PhonicsPhase = 1 | 2 | 3 | 4 | 5 | 6;
export type NumeracyStage = 'subitizing' | 'counting' | 'number_sense' | 'operations' | 'place_value';
export type AgeGroup = '3-4' | '5-6' | '7';

export interface EarlyYearsLearner {
  id: string;
  tenantId: string;
  childId: string;
  familyAccountId: string;
  
  // Demographics
  firstName: string;
  dateOfBirth: Date;
  ageGroup: AgeGroup;
  preferredLanguage: string;
  
  // Developmental profile
  developmentalStage: DevelopmentalStage;
  
  // Phonics progress
  phonicsPhase: PhonicsPhase;
  phonemesMastered: string[];
  phonemesInProgress: string[];
  decodingLevel: number; // 0-100
  
  // Numeracy progress
  numeracyStage: NumeracyStage;
  numbersRecognized: number[];
  operationsUnlocked: ('addition' | 'subtraction')[];
  
  // Story world progress
  currentWorld: string;
  currentEpisode: string;
  completedEpisodes: string[];
  unlockedCharacters: string[];
  
  // Engagement
  totalStars: number;
  currentStreak: number;
  longestStreak: number;
  totalSessionMinutes: number;
  
  // Settings
  sessionDurationMinutes: number;
  breakFrequencyMinutes: number;
  audioNarrationEnabled: boolean;
  textToSpeechSpeed: 'slow' | 'normal';
  celebrationIntensity: 'gentle' | 'medium' | 'exciting';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastSessionAt?: Date;
}

export interface CreateEarlyYearsLearnerInput {
  childId: string;
  familyAccountId: string;
  firstName: string;
  dateOfBirth: Date;
  preferredLanguage?: string;
}

// ============================================================================
// TYPES - STORYBOOK WORLD
// ============================================================================

export interface StoryWorld {
  id: string;
  name: string;
  displayName: string;
  description: string;
  theme: 'letters' | 'numbers' | 'nature' | 'space' | 'ocean';
  backgroundImageUrl: string;
  musicTrackUrl: string;
  unlockRequirements: UnlockRequirement[];
  episodes: StoryEpisode[];
  characters: StoryCharacter[];
}

export interface StoryEpisode {
  id: string;
  worldId: string;
  sequence: number;
  title: string;
  description: string;
  narrativeIntro: string;
  learningObjectives: string[];
  curriculumCodes: string[];
  targetPhonemes?: string[];
  targetNumbers?: number[];
  targetConcepts?: string[];
  activities: EpisodeActivity[];
  rewards: EpisodeReward[];
  estimatedMinutes: number;
}

export interface EpisodeActivity {
  id: string;
  type: 'phonics_game' | 'number_game' | 'story_reading' | 'character_chat' | 'creative_play' | 'assessment';
  title: string;
  instructions: string;
  audioInstructions: string;
  content: ActivityContent;
  successCriteria: SuccessCriteria;
  adaptiveDifficulty: boolean;
}

export interface ActivityContent {
  // Phonics
  targetPhoneme?: string;
  words?: string[];
  decodableText?: string;
  
  // Numeracy
  targetNumber?: number;
  operation?: 'counting' | 'addition' | 'subtraction' | 'comparison';
  manipulatives?: string[];
  
  // Story
  storyText?: string;
  storyAudioUrl?: string;
  illustrations?: string[];
  
  // Interactive
  characterId?: string;
  promptTemplate?: string;
}

export interface SuccessCriteria {
  minCorrect: number;
  maxAttempts: number;
  timeLimit?: number;
  streakRequired?: number;
}

export interface EpisodeReward {
  type: 'stars' | 'character_unlock' | 'world_unlock' | 'badge' | 'sticker';
  value: string | number;
  condition: 'completion' | 'mastery' | 'speed' | 'streak';
}

export interface StoryCharacter {
  id: string;
  name: string;
  displayName: string;
  role: 'guide' | 'helper' | 'friend' | 'challenge';
  personality: CharacterPersonality;
  specialization: 'phonics' | 'numeracy' | 'creativity' | 'logic' | 'music';
  avatarUrl: string;
  voiceProfile: VoiceProfile;
  unlockRequirements: UnlockRequirement[];
  greetings: string[];
  encouragements: string[];
  celebrations: string[];
}

export interface CharacterPersonality {
  traits: string[];
  communicationStyle: 'playful' | 'gentle' | 'energetic' | 'calm' | 'curious';
  humorLevel: 'minimal' | 'moderate' | 'high';
  patience: 'very_patient' | 'patient' | 'encouraging';
}

export interface VoiceProfile {
  voiceId: string;
  pitch: 'low' | 'medium' | 'high';
  speed: 'slow' | 'medium' | 'fast';
  accent?: string;
}

export interface UnlockRequirement {
  type: 'episode_complete' | 'stars_earned' | 'streak_days' | 'phonemes_mastered' | 'numbers_learned';
  value: string | number;
}

// ============================================================================
// TYPES - PHONICS ENGINE
// ============================================================================

/**
 * 44 English phonemes organized by SSP phases
 */
export const PHONICS_PHASES: Record<PhonicsPhase, PhonemeSet> = {
  1: {
    phase: 1,
    phonemes: ['s', 'a', 't', 'p', 'i', 'n'],
    focus: 'Initial sounds and CVC words',
    exampleWords: ['sat', 'pin', 'tap', 'tin', 'nap', 'sip'],
    graphemes: ['s', 'a', 't', 'p', 'i', 'n'],
  },
  2: {
    phase: 2,
    phonemes: ['ck', 'e', 'u', 'r', 'h', 'b', 'f', 'ff', 'l', 'll', 'ss'],
    focus: 'More consonants and short vowels',
    exampleWords: ['back', 'bell', 'huff', 'doll', 'mess', 'run'],
    graphemes: ['ck', 'e', 'u', 'r', 'h', 'b', 'f', 'ff', 'l', 'll', 'ss'],
  },
  3: {
    phase: 3,
    phonemes: ['j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu', 'ch', 'sh', 'th', 'ng', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'ure', 'er'],
    focus: 'Digraphs and long vowel sounds',
    exampleWords: ['chip', 'shop', 'thin', 'ring', 'rain', 'feet', 'night', 'boat'],
    graphemes: ['j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu', 'ch', 'sh', 'th', 'ng', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'ure', 'er'],
  },
  4: {
    phase: 4,
    phonemes: [], // Focus on blending, no new phonemes
    focus: 'Consonant clusters and polysyllabic words',
    exampleWords: ['clap', 'frog', 'stamp', 'string', 'splash'],
    graphemes: ['CCVC', 'CVCC', 'CCVCC', 'CCCVC'],
    blendPatterns: ['bl', 'cl', 'fl', 'gl', 'pl', 'sl', 'br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr', 'sc', 'sk', 'sm', 'sn', 'sp', 'st', 'sw', 'tw', 'scr', 'shr', 'spl', 'spr', 'str', 'thr'],
  },
  5: {
    phase: 5,
    phonemes: ['ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'wh', 'ph', 'ew', 'oe', 'au', 'a-e', 'e-e', 'i-e', 'o-e', 'u-e'],
    focus: 'Alternative spellings and pronunciations',
    exampleWords: ['play', 'house', 'pie', 'beach', 'boy', 'bird', 'blue', 'saw', 'whale', 'phone'],
    graphemes: ['ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'wh', 'ph', 'ew', 'oe', 'au', 'a-e', 'e-e', 'i-e', 'o-e', 'u-e'],
    alternativeSpellings: {
      '/ai/': ['ai', 'ay', 'a-e', 'ey', 'eigh', 'a'],
      '/ee/': ['ee', 'ea', 'e-e', 'ie', 'y', 'ey'],
      '/igh/': ['igh', 'ie', 'i-e', 'y', 'i'],
      '/oa/': ['oa', 'ow', 'o-e', 'oe', 'o'],
      '/oo/': ['oo', 'ue', 'u-e', 'ew', 'ui'],
    },
  },
  6: {
    phase: 6,
    phonemes: [],
    focus: 'Suffixes, prefixes, and spelling patterns',
    exampleWords: ['jumping', 'jumped', 'unhappy', 'rewrite', 'careful'],
    graphemes: [],
    morphemes: {
      prefixes: ['un-', 're-', 'pre-', 'dis-', 'mis-'],
      suffixes: ['-s', '-es', '-ing', '-ed', '-er', '-est', '-ful', '-less', '-ly', '-ment', '-ness'],
    },
  },
};

export interface PhonemeSet {
  phase: PhonicsPhase;
  phonemes: string[];
  focus: string;
  exampleWords: string[];
  graphemes: string[];
  blendPatterns?: string[];
  alternativeSpellings?: Record<string, string[]>;
  morphemes?: { prefixes: string[]; suffixes: string[] };
}

export interface PhonemeMastery {
  phoneme: string;
  phase: PhonicsPhase;
  recognitionAccuracy: number;
  blendingAccuracy: number;
  segmentingAccuracy: number;
  writingAccuracy: number;
  attemptCount: number;
  lastPracticed: Date;
  masteryLevel: 'not_started' | 'emerging' | 'developing' | 'secure' | 'mastered';
}

export interface PhonicsSession {
  id: string;
  learnerId: string;
  startTime: Date;
  endTime?: Date;
  targetPhonemes: string[];
  activities: PhonicsActivityResult[];
  overallAccuracy: number;
  wordsDecoded: number;
  newPhonemesIntroduced: string[];
  phonemesMasteredThisSession: string[];
}

export interface PhonicsActivityResult {
  activityId: string;
  activityType: 'recognition' | 'blending' | 'segmenting' | 'reading' | 'writing';
  phoneme: string;
  attempts: PhonicsAttempt[];
  accuracy: number;
  timeSpentSeconds: number;
  hintsUsed: number;
}

export interface PhonicsAttempt {
  stimulus: string;
  expectedResponse: string;
  actualResponse: string;
  correct: boolean;
  responseTimeMs: number;
  hintUsed: boolean;
  timestamp: Date;
}

// ============================================================================
// TYPES - NUMERACY ENGINE
// ============================================================================

export interface NumeracyProfile {
  learnerId: string;
  stage: NumeracyStage;
  
  // Subitizing (instant recognition of quantities)
  subitizingRange: number; // Highest number instantly recognized (typically 1-5)
  subitizingAccuracy: number;
  
  // Counting
  countingRange: number; // Highest number counted accurately
  oneToOneCorrespondence: boolean;
  cardinalityUnderstood: boolean;
  countingBackwards: number; // Highest starting point
  skipCounting: { by2s: number; by5s: number; by10s: number };
  
  // Number sense
  numberRecognition: number; // Highest numeral recognized
  numberWriting: number; // Highest numeral written correctly
  numberSequencing: number; // Highest number in sequence tasks
  comparisons: { moreLess: boolean; equalTo: boolean; ordering: number };
  
  // Operations
  additionRange: number; // Highest sum attempted
  subtractionRange: number; // Highest minuend attempted
  additionStrategies: ('counting_all' | 'counting_on' | 'known_facts' | 'derived_facts')[];
  
  // Place value
  tensOnesUnderstood: boolean;
  placeValueRange: number;
  
  // Problem solving
  wordProblemLevel: 'none' | 'simple' | 'multi_step';
  
  lastAssessedAt: Date;
}

export interface NumeracySession {
  id: string;
  learnerId: string;
  startTime: Date;
  endTime?: Date;
  focus: 'subitizing' | 'counting' | 'number_sense' | 'operations' | 'problem_solving';
  activities: NumeracyActivityResult[];
  overallAccuracy: number;
  conceptsIntroduced: string[];
  conceptsMastered: string[];
}

export interface NumeracyActivityResult {
  activityId: string;
  activityType: 'subitize' | 'count' | 'recognize' | 'compare' | 'add' | 'subtract' | 'problem_solve';
  targetConcept: string;
  attempts: NumeracyAttempt[];
  accuracy: number;
  timeSpentSeconds: number;
  manipulativesUsed: string[];
}

export interface NumeracyAttempt {
  stimulus: string;
  expectedAnswer: number | string;
  actualAnswer: number | string;
  correct: boolean;
  responseTimeMs: number;
  strategyUsed?: string;
  manipulativeUsed?: string;
  timestamp: Date;
}

// ============================================================================
// TYPES - EYE TRACKING
// ============================================================================

export interface EyeTrackingSession {
  id: string;
  learnerId: string;
  sessionType: 'reading' | 'phonics' | 'numeracy' | 'calibration';
  contentId: string;
  contentType: string;
  startTime: Date;
  endTime?: Date;
  calibrationQuality: number; // 0-100
  metrics: EyeTrackingMetrics;
  patterns: ReadingPattern[];
  concerns: EyeTrackingConcern[];
}

export interface EyeTrackingMetrics {
  // Fixation metrics
  totalFixations: number;
  averageFixationDurationMs: number;
  fixationDurationVariance: number;
  
  // Saccade metrics
  totalSaccades: number;
  averageSaccadeLengthPx: number;
  forwardSaccades: number;
  regressiveSaccades: number; // Looking back - potential comprehension issues
  
  // Reading metrics
  wordsPerMinute?: number;
  lineTrackingAccuracy: number; // 0-100
  skipRate: number; // Percentage of words skipped
  rereadRate: number; // Percentage of words re-read
  
  // Attention metrics
  timeOnTask: number;
  distractionEvents: number;
  focusScore: number; // 0-100
}

export interface ReadingPattern {
  patternType: 'normal' | 'regression_heavy' | 'word_skipping' | 'line_jumping' | 'slow_decoding' | 'rapid_scanning';
  frequency: number;
  locations: PatternLocation[];
  severity: 'mild' | 'moderate' | 'significant';
  possibleCauses: string[];
}

export interface PatternLocation {
  wordIndex: number;
  word: string;
  fixationDurationMs: number;
  regressionCount: number;
}

export interface EyeTrackingConcern {
  concernType: 'tracking_difficulty' | 'decoding_struggle' | 'attention_issue' | 'fatigue' | 'calibration_drift';
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendations: string[];
  flagForReview: boolean;
}

// ============================================================================
// TYPES - PICTURE PASSWORD
// ============================================================================

export interface PicturePassword {
  id: string;
  learnerId: string;
  tenantId: string;
  
  // Password configuration
  gridSize: 3 | 4; // 3x3 or 4x4 grid
  sequenceLength: 3 | 4;
  imageSet: string; // ID of image set used
  
  // Encrypted sequence (image IDs in order)
  encryptedSequence: string;
  sequenceHash: string;
  
  // Security
  failedAttempts: number;
  lockedUntil?: Date;
  lastSuccessfulLogin?: Date;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface PicturePasswordImage {
  id: string;
  setId: string;
  imageUrl: string;
  altText: string;
  category: 'animals' | 'food' | 'toys' | 'nature' | 'vehicles' | 'colors';
  displayOrder: number;
}

export interface PicturePasswordAttempt {
  id: string;
  passwordId: string;
  attemptedAt: Date;
  successful: boolean;
  sequenceEntered: string[]; // Image IDs entered
  ipAddress?: string;
  deviceFingerprint?: string;
  parentOverride: boolean;
}

export interface VerifyPicturePasswordResult {
  success: boolean;
  remainingAttempts?: number;
  lockedUntil?: Date;
  requiresParentUnlock?: boolean;
}

// ============================================================================
// TYPES - FAMILY PORTAL
// ============================================================================

export interface FamilyAccount {
  id: string;
  tenantId: string;
  primaryParentId: string;
  familyName: string;
  children: string[]; // EarlyYearsLearner IDs
  additionalParents: string[];
  preferredLanguage: string;
  timezone: string;
  notificationPreferences: NotificationPreferences;
  subscriptionTier: 'free' | 'family' | 'premium';
  createdAt: Date;
}

export interface NotificationPreferences {
  dailySummary: boolean;
  weeklyReport: boolean;
  milestoneAlerts: boolean;
  concernAlerts: boolean;
  activitySuggestions: boolean;
  preferredChannel: 'email' | 'push' | 'sms';
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface ParentDashboardData {
  child: {
    id: string;
    firstName: string;
    avatarUrl?: string;
  };
  summary: {
    totalSessionsThisWeek: number;
    totalMinutesThisWeek: number;
    currentStreak: number;
    starsEarnedThisWeek: number;
  };
  phonicsProgress: {
    currentPhase: PhonicsPhase;
    phonemesMastered: number;
    totalPhonemes: number;
    recentlyLearned: string[];
    needsReinforcement: string[];
  };
  numeracyProgress: {
    currentStage: NumeracyStage;
    countingRange: number;
    operationsIntroduced: string[];
    recentConcepts: string[];
  };
  storyProgress: {
    currentWorld: string;
    episodesCompleted: number;
    totalEpisodes: number;
    charactersUnlocked: string[];
  };
  recommendations: HomeActivityRecommendation[];
  concerns: ParentAlert[];
  recentActivity: RecentActivityItem[];
}

export interface HomeActivityRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'phonics' | 'numeracy' | 'reading' | 'creative';
  targetSkill: string;
  materials: string[];
  estimatedMinutes: number;
  instructions: string[];
}

export interface ParentAlert {
  id: string;
  type: 'concern' | 'milestone' | 'suggestion';
  severity: 'info' | 'attention' | 'action_needed';
  title: string;
  description: string;
  actionItems?: string[];
  createdAt: Date;
}

export interface RecentActivityItem {
  date: Date;
  sessionMinutes: number;
  activitiesCompleted: number;
  starsEarned: number;
  highlights: string[];
}

// ============================================================================
// TYPES - AI BUDDY PERSONAS FOR EARLY YEARS
// ============================================================================

export interface EarlyYearsBuddyPersona {
  characterId: string;
  name: string;
  displayName: string;
  specialization: 'phonics' | 'numeracy' | 'creativity' | 'logic' | 'music';
  
  // Personality for AI
  systemPrompt: string;
  personalityTraits: string[];
  communicationGuidelines: string[];
  
  // Safety
  ageAppropriateLanguageLevel: 'preschool' | 'early_primary' | 'primary';
  forbiddenTopics: string[];
  redirectPhrases: string[];
  
  // Engagement
  greetingTemplates: string[];
  encouragementTemplates: string[];
  celebrationTemplates: string[];
  hintTemplates: string[];
  farewellTemplates: string[];
}

/**
 * Pre-defined character personas for Early Years
 */
export const EARLY_YEARS_CHARACTERS: Record<string, EarlyYearsBuddyPersona> = {
  lettie: {
    characterId: 'lettie',
    name: 'Lettie',
    displayName: 'Lettie the Letter Lion',
    specialization: 'phonics',
    systemPrompt: `You are Lettie the Letter Lion, a friendly, playful lion who LOVES letters and sounds! 
    
You help young children (ages 3-7) learn phonics through fun and encouragement. You:
- Speak in simple, short sentences (max 10 words per sentence)
- Use lots of enthusiasm and positive reinforcement
- Make letter sounds fun (e.g., "Ssssss like a snake!")
- Never get frustrated - always patient and encouraging
- Celebrate every attempt, even incorrect ones ("Great try! Let's listen again...")
- Use repetition naturally
- Relate sounds to animals, objects kids know
- Ask one simple question at a time
- Never use complex words or abstract concepts

SAFETY RULES (CRITICAL):
- Only discuss letters, sounds, reading, and related topics
- If child mentions anything concerning, gently redirect: "Let's get back to our letters! Ready for more fun?"
- Never discuss: family problems, scary things, personal information
- Keep everything playful and positive`,
    personalityTraits: ['playful', 'patient', 'enthusiastic', 'encouraging', 'silly'],
    communicationGuidelines: [
      'Maximum 10 words per sentence',
      'Use sound effects and onomatopoeia',
      'Celebrate every attempt',
      'Ask only yes/no or simple choice questions',
      'Use repetition for learning',
      'Include movement suggestions (clap, stomp, roar)',
    ],
    ageAppropriateLanguageLevel: 'preschool',
    forbiddenTopics: ['violence', 'death', 'family problems', 'strangers', 'secrets', 'personal information'],
    redirectPhrases: [
      "Let's get back to our letter fun!",
      "Ooh, I love letters more! Let's play!",
      "Time for more sounds! Ready?",
    ],
    greetingTemplates: [
      "ROAR! Hi friend! I'm Lettie! Ready for letter fun?",
      "Hello, hello! Lettie is SO happy to see you!",
      "Yay, you're here! Let's play with letters!",
    ],
    encouragementTemplates: [
      "You're doing AMAZING!",
      "Wow! You're a letter superstar!",
      "I knew you could do it!",
      "That was ROAR-some!",
    ],
    celebrationTemplates: [
      "🎉 ROAR! You got it! Do a happy dance!",
      "⭐ Superstar! Give yourself a big hug!",
      "🌟 Amazing! Let's clap together! Clap clap clap!",
    ],
    hintTemplates: [
      "Listen carefully... {phoneme}... What sound is that?",
      "Let's try together! {phoneme}... Your turn!",
      "This letter says {phoneme}... like in {word}!",
    ],
    farewellTemplates: [
      "Bye bye, friend! You learned so much today!",
      "See you next time! Keep practicing your sounds!",
      "ROAR! Great job today! Lettie is proud of you!",
    ],
  },
  
  numero: {
    characterId: 'numero',
    name: 'Numero',
    displayName: 'Numero the Number Knight',
    specialization: 'numeracy',
    systemPrompt: `You are Numero the Number Knight, a brave and friendly knight who protects the kingdom of numbers!

You help young children (ages 3-7) learn counting and basic math through adventure stories. You:
- Speak in simple, short sentences (max 10 words)
- Turn math into exciting quests and adventures
- Use concrete objects kids can imagine (apples, stars, dragons)
- Count together out loud with enthusiasm
- Celebrate both correct answers AND good tries
- Use fingers, toys, and objects in explanations
- Never use abstract math language
- Make mistakes feel okay - "Even knights need practice!"

SAFETY RULES (CRITICAL):
- Only discuss numbers, counting, and simple math concepts
- If child mentions anything concerning, redirect: "Let's count some more treasures!"
- Never discuss: danger, fear, weapons (sword is for "pointing at numbers")
- Keep everything as a fun, safe adventure`,
    personalityTraits: ['brave', 'kind', 'adventurous', 'patient', 'protective'],
    communicationGuidelines: [
      'Use quest/adventure framing',
      'Count out loud together',
      'Use concrete objects (not abstract numbers)',
      'Relate to things children can touch/see',
      'Make the child feel like a hero',
    ],
    ageAppropriateLanguageLevel: 'preschool',
    forbiddenTopics: ['violence', 'weapons', 'fear', 'danger', 'personal information'],
    redirectPhrases: [
      "On to our next number quest!",
      "The kingdom needs us to count!",
      "Let's find more treasures to count!",
    ],
    greetingTemplates: [
      "Greetings, young hero! Ready for a number quest?",
      "Welcome, brave one! Numbers need our help today!",
      "Huzzah! My counting friend is here!",
    ],
    encouragementTemplates: [
      "Brave work, young hero!",
      "The kingdom is proud of you!",
      "You're becoming a true Number Knight!",
      "Excellent counting, my friend!",
    ],
    celebrationTemplates: [
      "🏰 Victory! You solved it! Take a bow!",
      "⚔️ Huzzah! The kingdom celebrates you!",
      "👑 You earned a gold star, brave knight!",
    ],
    hintTemplates: [
      "Let's count together: one... two... what comes next?",
      "Use your fingers! Show me {number}!",
      "Imagine {number} shiny apples. How many?",
    ],
    farewellTemplates: [
      "Farewell, brave hero! Numbers will miss you!",
      "Until next time, young knight! Keep counting!",
      "The kingdom thanks you! See you soon!",
    ],
  },
  
  captain_calculate: {
    characterId: 'captain_calculate',
    name: 'Captain Calculate',
    displayName: 'Captain Calculate',
    specialization: 'numeracy',
    systemPrompt: `You are Captain Calculate, a friendly pirate captain who sails the seas looking for number treasures!

You help children (ages 5-7) learn addition and subtraction through treasure-hunting adventures. You:
- Speak like a friendly pirate (Ahoy! Arrr! Matey!)
- Turn math problems into treasure counting
- Use visual counting with gold coins, gems, starfish
- Encourage using fingers and drawings
- Make adding and taking away feel like adventures
- Celebrate every attempt
- Never rush - take time to count together

SAFETY RULES (CRITICAL):
- Only discuss numbers, counting, addition, subtraction
- Pirates are FRIENDLY and share treasures
- No scary pirate things - no sharks, walking planks, etc.
- If off-topic: "Arrr! Let's count our treasure!"`,
    personalityTraits: ['adventurous', 'generous', 'enthusiastic', 'patient', 'silly'],
    communicationGuidelines: [
      'Use pirate-speak (friendly version)',
      'Frame problems as treasure counting',
      'Use gold coins and gems as manipulatives',
      'Celebrate sharing (subtraction = sharing treasure)',
    ],
    ageAppropriateLanguageLevel: 'early_primary',
    forbiddenTopics: ['danger', 'scary ocean creatures', 'fighting', 'being lost'],
    redirectPhrases: [
      "Arrr! Back to our treasure!",
      "Time to count more gold, matey!",
      "The treasure map shows more numbers!",
    ],
    greetingTemplates: [
      "Ahoy, matey! Ready to count treasure?",
      "Welcome aboard! We have numbers to find!",
      "Arrr! My favorite number friend is here!",
    ],
    encouragementTemplates: [
      "Shiver me timbers, you're good at this!",
      "Yo ho ho! Great counting, matey!",
      "You're a true treasure hunter!",
    ],
    celebrationTemplates: [
      "🏴‍☠️ Arrr! You found the answer! X marks the spot!",
      "💰 Treasure! You got it right! Do a pirate dance!",
      "⚓ Land ho! You solved it, matey!",
    ],
    hintTemplates: [
      "Count the gold coins: one, two, three...",
      "If we have {n1} and get {n2} more... count with me!",
      "Draw {n1} circles. Now add {n2} more. How many?",
    ],
    farewellTemplates: [
      "Fair winds, matey! Keep counting treasure!",
      "Until we sail again, young pirate!",
      "Arrr! Great math today! See you soon!",
    ],
  },
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class EarlyYearsService extends ScholarlyBaseService {
  private aiService: AIIntegrationService;
  private aiBuddyService: AIBuddyService;
  private contentStudioService: AIContentStudioService;
  private dataLakeService: DataLakeService;
  private mlPipelineService: MLPipelineService;
  private analyticsService: AnalyticsReportingService;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
  }) {
    super('EarlyYearsService', deps);
    
    // Initialize integrations with existing services
    this.aiService = getAIService();
    this.aiBuddyService = getAIBuddyService();
    this.contentStudioService = getAIContentStudioService();
    this.dataLakeService = getDataLakeService();
    this.mlPipelineService = getMLPipelineService();
    this.analyticsService = getAnalyticsService();
  }

  // ==========================================================================
  // LEARNER MANAGEMENT
  // ==========================================================================

  /**
   * Create a new early years learner profile
   */
  async createLearner(
    tenantId: string,
    input: CreateEarlyYearsLearnerInput
  ): Promise<Result<EarlyYearsLearner>> {
    try {
      // Calculate age group
      const age = this.calculateAge(input.dateOfBirth);
      const ageGroup = this.determineAgeGroup(age);
      
      // Determine initial settings based on age
      const sessionSettings = this.getAgeAppropriateSettings(ageGroup);
      
      const learner: EarlyYearsLearner = {
        id: this.generateId('eyl'),
        tenantId,
        childId: input.childId,
        familyAccountId: input.familyAccountId,
        firstName: input.firstName,
        dateOfBirth: input.dateOfBirth,
        ageGroup,
        preferredLanguage: input.preferredLanguage || 'en',
        
        // Start at beginning
        developmentalStage: 'emergent',
        phonicsPhase: 1,
        phonemesMastered: [],
        phonemesInProgress: [],
        decodingLevel: 0,
        
        numeracyStage: 'subitizing',
        numbersRecognized: [],
        operationsUnlocked: [],
        
        currentWorld: 'alphabetia_forest',
        currentEpisode: 'episode_1',
        completedEpisodes: [],
        unlockedCharacters: ['lettie'], // Start with Lettie
        
        totalStars: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalSessionMinutes: 0,
        
        ...sessionSettings,
        
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      await prisma.earlyYearsLearner.create({
        data: learner as any,
      });

      // Emit event to data lake
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'early_years',
        eventType: 'learner.created',
        userId: input.childId,
        timestamp: new Date(),
        data: {
          learnerId: learner.id,
          ageGroup,
          initialPhase: 1,
        },
      });

      // Publish event
      await this.publishEvent('early_years.learner.created', tenantId, {
        learnerId: learner.id,
        childId: input.childId,
        ageGroup,
      });

      log.info('Created early years learner', { learnerId: learner.id, ageGroup });
      return success(learner);
    } catch (error) {
      log.error('Failed to create early years learner', { error });
      return failure(new ValidationError('Failed to create learner'));
    }
  }

  /**
   * Get learner profile
   */
  async getLearner(
    tenantId: string,
    learnerId: string
  ): Promise<Result<EarlyYearsLearner>> {
    try {
      const learner = await prisma.earlyYearsLearner.findFirst({
        where: { id: learnerId, tenantId },
      });

      if (!learner) {
        return failure(new NotFoundError('EarlyYearsLearner', learnerId));
      }

      return success(learner as unknown as EarlyYearsLearner);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // INTEGRATION 1: AI BUDDY - CHILD-FRIENDLY PERSONAS
  // ==========================================================================

  /**
   * Start a conversation with an Early Years character
   * Extends the AI Buddy service with child-friendly personas
   */
  async startCharacterConversation(
    tenantId: string,
    learnerId: string,
    characterId: string,
    context?: {
      currentActivity?: string;
      targetPhoneme?: string;
      targetNumber?: number;
    }
  ): Promise<Result<EarlyYearsConversation>> {
    try {
      // Get learner profile
      const learnerResult = await this.getLearner(tenantId, learnerId);
      if (!learnerResult.success) {
        return failure(learnerResult.error);
      }
      const learner = learnerResult.data;

      // Get character persona
      const persona = EARLY_YEARS_CHARACTERS[characterId];
      if (!persona) {
        return failure(new NotFoundError('Character', characterId));
      }

      // Build age-appropriate system prompt
      const systemPrompt = this.buildChildSafeSystemPrompt(persona, learner, context);

      // Create conversation with custom persona
      const conversationId = this.generateId('eyconv');
      
      const conversation: EarlyYearsConversation = {
        id: conversationId,
        tenantId,
        learnerId,
        characterId,
        characterName: persona.displayName,
        systemPrompt,
        messages: [],
        context: {
          learnerAge: this.calculateAge(learner.dateOfBirth),
          phonicsPhase: learner.phonicsPhase,
          numeracyStage: learner.numeracyStage,
          currentActivity: context?.currentActivity,
          targetPhoneme: context?.targetPhoneme,
          targetNumber: context?.targetNumber,
        },
        safetyFlags: [],
        startedAt: new Date(),
      };

      // Add greeting message
      const greeting = this.selectRandomTemplate(persona.greetingTemplates);
      conversation.messages.push({
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
        characterExpression: 'happy',
      });

      // Save conversation
      await this.saveConversation(tenantId, conversation);

      // Log to data lake
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'early_years',
        eventType: 'character_conversation.started',
        userId: learner.childId,
        timestamp: new Date(),
        data: {
          conversationId,
          characterId,
          context,
        },
      });

      return success(conversation);
    } catch (error) {
      log.error('Failed to start character conversation', { error });
      return failure(error as Error);
    }
  }

  /**
   * Send a message in a character conversation
   * Applies child safety filters and age-appropriate responses
   */
  async sendCharacterMessage(
    tenantId: string,
    conversationId: string,
    message: string
  ): Promise<Result<EarlyYearsMessage>> {
    try {
      // Get conversation
      const conversation = await this.getConversation(tenantId, conversationId);
      if (!conversation) {
        return failure(new NotFoundError('Conversation', conversationId));
      }

      const persona = EARLY_YEARS_CHARACTERS[conversation.characterId];
      
      // CRITICAL: Child safety check
      const safetyCheck = await this.performChildSafetyCheck(message);
      if (safetyCheck.requiresRedirect) {
        // Store safety flag for review
        conversation.safetyFlags.push({
          timestamp: new Date(),
          triggerType: safetyCheck.triggerType,
          // Don't store the message content for privacy
        });
        
        // Return gentle redirect
        const redirectResponse = this.selectRandomTemplate(persona.redirectPhrases);
        const assistantMessage: EarlyYearsMessage = {
          role: 'assistant',
          content: redirectResponse,
          timestamp: new Date(),
          characterExpression: 'gentle',
          wasRedirected: true,
        };
        
        conversation.messages.push(assistantMessage);
        await this.saveConversation(tenantId, conversation);
        
        return success(assistantMessage);
      }

      // Add user message
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Build messages for AI
      const aiMessages = this.buildAIMessages(conversation, persona);

      // Get AI response
      const aiResponse = await this.aiService.complete({
        messages: aiMessages,
        maxTokens: 150, // Keep responses short for children
        temperature: 0.7,
      });

      if (!aiResponse.success) {
        return failure(new Error('AI response failed'));
      }

      // Process and validate response
      let responseContent = aiResponse.data.content;
      
      // Ensure response is age-appropriate length
      responseContent = this.enforceSimpleLanguage(responseContent, persona.ageAppropriateLanguageLevel);

      // Determine character expression
      const expression = this.determineExpression(responseContent);

      const assistantMessage: EarlyYearsMessage = {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        characterExpression: expression,
      };

      conversation.messages.push(assistantMessage);
      await this.saveConversation(tenantId, conversation);

      // Log to data lake
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'early_years',
        eventType: 'character_conversation.message',
        userId: conversation.learnerId,
        timestamp: new Date(),
        data: {
          conversationId,
          characterId: conversation.characterId,
          messageCount: conversation.messages.length,
          wasRedirected: false,
        },
      });

      return success(assistantMessage);
    } catch (error) {
      log.error('Failed to send character message', { error });
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // INTEGRATION 2: AI CONTENT STUDIO - PHONICS ACTIVITIES
  // ==========================================================================

  /**
   * Generate phonics activities for a specific phoneme
   */
  async generatePhonicsActivities(
    tenantId: string,
    learnerId: string,
    targetPhoneme: string,
    count: number = 5
  ): Promise<Result<GeneratedPhonicsActivity[]>> {
    try {
      const learnerResult = await this.getLearner(tenantId, learnerId);
      if (!learnerResult.success) {
        return failure(learnerResult.error);
      }
      const learner = learnerResult.data;

      // Find phase for this phoneme
      const phase = this.findPhonemePhase(targetPhoneme);
      
      // Use AI Content Studio to generate activities
      const prompt = `Generate ${count} phonics activities for young children (ages ${learner.ageGroup}) learning the phoneme "${targetPhoneme}".

Each activity should:
1. Be appropriate for Phase ${phase} Systematic Synthetic Phonics
2. Include visual, auditory, AND kinesthetic elements
3. Take 2-3 minutes maximum
4. Use only CVC or simple words appropriate for this phase
5. Include clear success criteria

For phoneme "${targetPhoneme}":
- Example words: ${PHONICS_PHASES[phase].exampleWords.slice(0, 5).join(', ')}
- Focus: ${PHONICS_PHASES[phase].focus}

Return as JSON array with structure:
{
  "activities": [
    {
      "title": "Activity name",
      "type": "recognition|blending|segmenting|reading|writing",
      "instructions": "Simple instructions for the activity",
      "audioScript": "What the character says",
      "words": ["word1", "word2"],
      "visualElements": ["description of visuals"],
      "kinestheticElement": "movement or action",
      "successCriteria": { "minCorrect": 3, "maxAttempts": 5 }
    }
  ]
}`;

      const response = await this.aiService.complete({
        messages: [
          { role: 'system', content: 'You are an expert early years phonics curriculum designer.' },
          { role: 'user', content: prompt },
        ],
        jsonMode: true,
        maxTokens: 2000,
      });

      if (!response.success) {
        return failure(new Error('Failed to generate activities'));
      }

      const parsed = JSON.parse(response.data.content);
      const activities: GeneratedPhonicsActivity[] = parsed.activities.map((a: any, i: number) => ({
        id: this.generateId('phact'),
        phoneme: targetPhoneme,
        phase,
        ...a,
        generatedAt: new Date(),
        generatedFor: learnerId,
      }));

      // Log generation
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'early_years',
        eventType: 'phonics.activities_generated',
        userId: learner.childId,
        timestamp: new Date(),
        data: {
          phoneme: targetPhoneme,
          phase,
          activityCount: activities.length,
        },
      });

      return success(activities);
    } catch (error) {
      log.error('Failed to generate phonics activities', { error });
      return failure(error as Error);
    }
  }

  /**
   * Generate a decodable reader for current phonics level
   */
  async generateDecodableReader(
    tenantId: string,
    learnerId: string,
    options?: {
      theme?: string;
      sentenceCount?: number;
    }
  ): Promise<Result<DecodableReader>> {
    try {
      const learnerResult = await this.getLearner(tenantId, learnerId);
      if (!learnerResult.success) {
        return failure(learnerResult.error);
      }
      const learner = learnerResult.data;

      // Get all phonemes up to current phase
      const availablePhonemes = this.getPhonemesThroughPhase(learner.phonicsPhase);
      const masteredPhonemes = learner.phonemesMastered;

      const prompt = `Create a decodable reader for a child in Phase ${learner.phonicsPhase} phonics.

RULES:
1. Use ONLY these phonemes: ${availablePhonemes.join(', ')}
2. Emphasize recently learned: ${masteredPhonemes.slice(-5).join(', ')}
3. Use only CVC, CVCC, or CCVC words appropriate for Phase ${learner.phonicsPhase}
4. ${options?.sentenceCount || 8} sentences maximum
5. Theme: ${options?.theme || 'animals'}
6. Include repetition of key words
7. Make it engaging and fun for ages ${learner.ageGroup}

Return as JSON:
{
  "title": "Story title",
  "sentences": [
    {
      "text": "Simple sentence",
      "targetWords": ["word1", "word2"],
      "illustration": "Description of illustration"
    }
  ],
  "vocabulary": ["word1", "word2"],
  "phonemesPracticed": ["s", "a", "t"]
}`;

      const response = await this.aiService.complete({
        messages: [
          { role: 'system', content: 'You are an expert in creating decodable readers for early phonics learners.' },
          { role: 'user', content: prompt },
        ],
        jsonMode: true,
        maxTokens: 1500,
      });

      if (!response.success) {
        return failure(new Error('Failed to generate reader'));
      }

      const parsed = JSON.parse(response.data.content);
      const reader: DecodableReader = {
        id: this.generateId('reader'),
        ...parsed,
        phase: learner.phonicsPhase,
        generatedFor: learnerId,
        generatedAt: new Date(),
      };

      return success(reader);
    } catch (error) {
      log.error('Failed to generate decodable reader', { error });
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // INTEGRATION 3: DATA LAKE - EVENT INGESTION
  // ==========================================================================

  /**
   * Record a phonics practice session
   */
  async recordPhonicsSession(
    tenantId: string,
    session: PhonicsSession
  ): Promise<Result<void>> {
    try {
      // Ingest session data to data lake
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'early_years',
        eventType: 'phonics.session_completed',
        userId: session.learnerId,
        timestamp: new Date(),
        data: {
          sessionId: session.id,
          duration: session.endTime 
            ? (session.endTime.getTime() - session.startTime.getTime()) / 1000 
            : 0,
          targetPhonemes: session.targetPhonemes,
          overallAccuracy: session.overallAccuracy,
          wordsDecoded: session.wordsDecoded,
          newPhonemes: session.newPhonemesIntroduced,
          masteredPhonemes: session.phonemesMasteredThisSession,
        },
      });

      // Ingest individual activity results
      for (const activity of session.activities) {
        await this.dataLakeService.ingestEvent({
          tenantId,
          source: 'early_years',
          eventType: 'phonics.activity_completed',
          userId: session.learnerId,
          timestamp: new Date(),
          data: {
            sessionId: session.id,
            activityId: activity.activityId,
            activityType: activity.activityType,
            phoneme: activity.phoneme,
            accuracy: activity.accuracy,
            timeSpent: activity.timeSpentSeconds,
            hintsUsed: activity.hintsUsed,
            attempts: activity.attempts.length,
          },
        });
      }

      // Update learner profile
      await this.updateLearnerPhonicsProgress(tenantId, session);

      // Publish event for real-time dashboards
      await this.publishEvent('early_years.phonics.session_completed', tenantId, {
        learnerId: session.learnerId,
        sessionId: session.id,
        accuracy: session.overallAccuracy,
        masteredPhonemes: session.phonemesMasteredThisSession,
      });

      return success(undefined);
    } catch (error) {
      log.error('Failed to record phonics session', { error });
      return failure(error as Error);
    }
  }

  /**
   * Record eye tracking session data
   */
  async recordEyeTrackingSession(
    tenantId: string,
    session: EyeTrackingSession
  ): Promise<Result<void>> {
    try {
      // Ingest to data lake
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'early_years',
        eventType: 'eye_tracking.session_completed',
        userId: session.learnerId,
        timestamp: new Date(),
        data: {
          sessionId: session.id,
          sessionType: session.sessionType,
          contentId: session.contentId,
          duration: session.endTime 
            ? (session.endTime.getTime() - session.startTime.getTime()) / 1000 
            : 0,
          calibrationQuality: session.calibrationQuality,
          metrics: session.metrics,
          patternsSummary: session.patterns.map(p => ({
            type: p.patternType,
            frequency: p.frequency,
            severity: p.severity,
          })),
          concernCount: session.concerns.length,
          flaggedForReview: session.concerns.some(c => c.flagForReview),
        },
      });

      // If there are concerns, ingest separately for monitoring
      for (const concern of session.concerns) {
        await this.dataLakeService.ingestEvent({
          tenantId,
          source: 'early_years',
          eventType: 'eye_tracking.concern_detected',
          userId: session.learnerId,
          timestamp: new Date(),
          data: {
            sessionId: session.id,
            concernType: concern.concernType,
            severity: concern.severity,
            flagForReview: concern.flagForReview,
          },
        });
      }

      // Publish for real-time processing
      await this.publishEvent('early_years.eye_tracking.session_completed', tenantId, {
        learnerId: session.learnerId,
        sessionId: session.id,
        metrics: session.metrics,
        hasConcerns: session.concerns.length > 0,
      });

      return success(undefined);
    } catch (error) {
      log.error('Failed to record eye tracking session', { error });
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // INTEGRATION 4: ML PIPELINE - READING DIFFICULTY PREDICTION
  // ==========================================================================

  /**
   * Predict reading difficulty risk for a learner
   */
  async predictReadingDifficulty(
    tenantId: string,
    learnerId: string
  ): Promise<Result<ReadingDifficultyPrediction>> {
    try {
      const learnerResult = await this.getLearner(tenantId, learnerId);
      if (!learnerResult.success) {
        return failure(learnerResult.error);
      }
      const learner = learnerResult.data;

      // Get recent session data for features
      const recentSessions = await this.getRecentPhonicsData(tenantId, learnerId, 30);
      const eyeTrackingData = await this.getRecentEyeTrackingData(tenantId, learnerId, 30);

      // Build feature vector
      const features = {
        // Phonics features
        phonicsPhase: learner.phonicsPhase,
        phonemesMasteredCount: learner.phonemesMastered.length,
        decodingLevel: learner.decodingLevel,
        averageAccuracy7Days: recentSessions.averageAccuracy7Days,
        accuracyTrend: recentSessions.accuracyTrend,
        avgTimePerWord: recentSessions.avgTimePerWord,
        hintsPerSession: recentSessions.hintsPerSession,
        
        // Eye tracking features
        avgFixationDuration: eyeTrackingData.avgFixationDuration,
        regressionRate: eyeTrackingData.regressionRate,
        lineTrackingAccuracy: eyeTrackingData.lineTrackingAccuracy,
        focusScore: eyeTrackingData.focusScore,
        
        // Engagement features
        sessionConsistency: recentSessions.sessionConsistency,
        currentStreak: learner.currentStreak,
        totalSessionMinutes: learner.totalSessionMinutes,
        
        // Demographic features
        ageInMonths: this.calculateAgeInMonths(learner.dateOfBirth),
        weeksInProgram: this.calculateWeeksInProgram(learner.createdAt),
      };

      // Call ML pipeline for prediction
      const predictionResult = await this.mlPipelineService.predictStudentRisk(
        tenantId,
        learnerId,
        'reading_difficulty'
      );

      if (!predictionResult.success) {
        // Fall back to rule-based assessment
        return success(this.ruleBasedReadingAssessment(features));
      }

      const mlPrediction = predictionResult.data;

      // Enrich with reading-specific factors
      const prediction: ReadingDifficultyPrediction = {
        learnerId,
        riskScore: mlPrediction.riskScore,
        riskLevel: mlPrediction.riskLevel,
        confidence: mlPrediction.confidence,
        
        riskFactors: this.identifyReadingRiskFactors(features, mlPrediction),
        
        recommendations: this.generateReadingRecommendations(features, mlPrediction.riskLevel),
        
        monitoringPlan: {
          reassessInDays: mlPrediction.riskLevel === 'high' ? 7 : 14,
          focusAreas: this.identifyFocusAreas(features),
          parentNotification: mlPrediction.riskLevel !== 'low',
        },
        
        assessedAt: new Date(),
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      };

      // Log prediction
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'early_years',
        eventType: 'ml.reading_difficulty_predicted',
        userId: learner.childId,
        timestamp: new Date(),
        data: {
          learnerId,
          riskScore: prediction.riskScore,
          riskLevel: prediction.riskLevel,
          confidence: prediction.confidence,
        },
      });

      return success(prediction);
    } catch (error) {
      log.error('Failed to predict reading difficulty', { error });
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // INTEGRATION 5: ANALYTICS - PARENT DASHBOARDS
  // ==========================================================================

  /**
   * Get parent dashboard data for a child
   */
  async getParentDashboard(
    tenantId: string,
    learnerId: string
  ): Promise<Result<ParentDashboardData>> {
    try {
      const learnerResult = await this.getLearner(tenantId, learnerId);
      if (!learnerResult.success) {
        return failure(learnerResult.error);
      }
      const learner = learnerResult.data;

      // Get weekly stats
      const weeklyStats = await this.getWeeklyStats(tenantId, learnerId);
      
      // Get phonics progress
      const phonicsProgress = await this.getPhonicsProgressSummary(tenantId, learnerId);
      
      // Get numeracy progress
      const numeracyProgress = await this.getNumeracyProgressSummary(tenantId, learnerId);
      
      // Get story progress
      const storyProgress = await this.getStoryProgressSummary(tenantId, learnerId);
      
      // Generate recommendations
      const recommendations = await this.generateHomeActivityRecommendations(tenantId, learnerId);
      
      // Get any concerns/alerts
      const concerns = await this.getParentAlerts(tenantId, learnerId);
      
      // Get recent activity
      const recentActivity = await this.getRecentActivity(tenantId, learnerId, 7);

      const dashboard: ParentDashboardData = {
        child: {
          id: learnerId,
          firstName: learner.firstName,
        },
        summary: {
          totalSessionsThisWeek: weeklyStats.sessionCount,
          totalMinutesThisWeek: weeklyStats.totalMinutes,
          currentStreak: learner.currentStreak,
          starsEarnedThisWeek: weeklyStats.starsEarned,
        },
        phonicsProgress: {
          currentPhase: learner.phonicsPhase,
          phonemesMastered: learner.phonemesMastered.length,
          totalPhonemes: this.getTotalPhonemesForPhase(learner.phonicsPhase),
          recentlyLearned: phonicsProgress.recentlyLearned,
          needsReinforcement: phonicsProgress.needsReinforcement,
        },
        numeracyProgress: {
          currentStage: learner.numeracyStage,
          countingRange: numeracyProgress.countingRange,
          operationsIntroduced: learner.operationsUnlocked,
          recentConcepts: numeracyProgress.recentConcepts,
        },
        storyProgress: {
          currentWorld: learner.currentWorld,
          episodesCompleted: learner.completedEpisodes.length,
          totalEpisodes: storyProgress.totalEpisodes,
          charactersUnlocked: learner.unlockedCharacters,
        },
        recommendations,
        concerns,
        recentActivity,
      };

      // Register dashboard view
      await this.analyticsService.trackDashboardView({
        tenantId,
        dashboardType: 'early_years_parent',
        userId: learnerId,
        viewedAt: new Date(),
      });

      return success(dashboard);
    } catch (error) {
      log.error('Failed to get parent dashboard', { error });
      return failure(error as Error);
    }
  }

  /**
   * Register Early Years dashboard widgets with Analytics service
   */
  async registerDashboardWidgets(tenantId: string): Promise<Result<void>> {
    try {
      // Phonics progress widget
      await this.analyticsService.registerWidget({
        tenantId,
        widgetId: 'early_years_phonics_progress',
        name: 'Phonics Progress',
        type: 'gauge',
        personaTypes: ['parent'],
        dataSource: {
          type: 'query',
          query: 'early_years_phonics_mastery',
        },
        visualization: {
          showLabels: true,
          colors: ['#4CAF50', '#FFC107', '#F44336'],
        },
      });

      // Numeracy progress widget
      await this.analyticsService.registerWidget({
        tenantId,
        widgetId: 'early_years_numeracy_progress',
        name: 'Number Skills',
        type: 'bar_chart',
        personaTypes: ['parent'],
        dataSource: {
          type: 'query',
          query: 'early_years_numeracy_skills',
        },
      });

      // Weekly activity widget
      await this.analyticsService.registerWidget({
        tenantId,
        widgetId: 'early_years_weekly_activity',
        name: 'This Week\'s Learning',
        type: 'line_chart',
        personaTypes: ['parent'],
        dataSource: {
          type: 'query',
          query: 'early_years_weekly_activity',
        },
      });

      // Story world progress widget
      await this.analyticsService.registerWidget({
        tenantId,
        widgetId: 'early_years_story_progress',
        name: 'Adventure Progress',
        type: 'funnel',
        personaTypes: ['parent'],
        dataSource: {
          type: 'query',
          query: 'early_years_story_completion',
        },
      });

      // Home activity recommendations widget
      await this.analyticsService.registerWidget({
        tenantId,
        widgetId: 'early_years_home_activities',
        name: 'Home Activities',
        type: 'ai_insight',
        personaTypes: ['parent'],
        dataSource: {
          type: 'ml_prediction',
          modelId: 'home_activity_recommender',
        },
      });

      return success(undefined);
    } catch (error) {
      log.error('Failed to register dashboard widgets', { error });
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // PICTURE PASSWORD AUTHENTICATION
  // ==========================================================================

  /**
   * Create a picture password for a child
   */
  async createPicturePassword(
    tenantId: string,
    learnerId: string,
    imageSequence: string[],
    gridSize: 3 | 4 = 3
  ): Promise<Result<{ passwordId: string }>> {
    try {
      if (imageSequence.length < 3 || imageSequence.length > 4) {
        return failure(new ValidationError('Sequence must be 3-4 images'));
      }

      // Hash the sequence for storage
      const sequenceHash = await this.hashSequence(imageSequence);
      const encryptedSequence = await this.encryptSequence(imageSequence);

      const password: PicturePassword = {
        id: this.generateId('picpwd'),
        learnerId,
        tenantId,
        gridSize,
        sequenceLength: imageSequence.length as 3 | 4,
        imageSet: 'default_animals', // TODO: Allow selection
        encryptedSequence,
        sequenceHash,
        failedAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await prisma.picturePassword.create({ data: password as any });

      return success({ passwordId: password.id });
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Verify a picture password attempt
   */
  async verifyPicturePassword(
    tenantId: string,
    learnerId: string,
    attemptedSequence: string[],
    metadata?: { ipAddress?: string; deviceFingerprint?: string }
  ): Promise<Result<VerifyPicturePasswordResult>> {
    try {
      const password = await prisma.picturePassword.findFirst({
        where: { learnerId, tenantId },
      });

      if (!password) {
        return failure(new NotFoundError('PicturePassword', learnerId));
      }

      // Check if locked
      if (password.lockedUntil && password.lockedUntil > new Date()) {
        return success({
          success: false,
          lockedUntil: password.lockedUntil,
          requiresParentUnlock: true,
        });
      }

      // Verify sequence
      const attemptHash = await this.hashSequence(attemptedSequence);
      const isCorrect = attemptHash === password.sequenceHash;

      // Record attempt
      await prisma.picturePasswordAttempt.create({
        data: {
          id: this.generateId('attempt'),
          passwordId: password.id,
          attemptedAt: new Date(),
          successful: isCorrect,
          sequenceEntered: attemptedSequence,
          ipAddress: metadata?.ipAddress,
          deviceFingerprint: metadata?.deviceFingerprint,
          parentOverride: false,
        },
      });

      if (isCorrect) {
        // Reset failed attempts
        await prisma.picturePassword.update({
          where: { id: password.id },
          data: {
            failedAttempts: 0,
            lastSuccessfulLogin: new Date(),
          },
        });

        return success({ success: true });
      } else {
        // Increment failed attempts
        const newFailedAttempts = password.failedAttempts + 1;
        const lockUntil = newFailedAttempts >= 3 
          ? new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes
          : undefined;

        await prisma.picturePassword.update({
          where: { id: password.id },
          data: {
            failedAttempts: newFailedAttempts,
            lockedUntil: lockUntil,
          },
        });

        return success({
          success: false,
          remainingAttempts: Math.max(0, 3 - newFailedAttempts),
          lockedUntil: lockUntil,
          requiresParentUnlock: newFailedAttempts >= 3,
        });
      }
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private calculateAgeInMonths(dateOfBirth: Date): number {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    return (today.getFullYear() - birth.getFullYear()) * 12 + 
           (today.getMonth() - birth.getMonth());
  }

  private calculateWeeksInProgram(createdAt: Date): number {
    return Math.floor((Date.now() - createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000));
  }

  private determineAgeGroup(age: number): AgeGroup {
    if (age <= 4) return '3-4';
    if (age <= 6) return '5-6';
    return '7';
  }

  private getAgeAppropriateSettings(ageGroup: AgeGroup): Partial<EarlyYearsLearner> {
    const settings: Record<AgeGroup, Partial<EarlyYearsLearner>> = {
      '3-4': {
        sessionDurationMinutes: 15,
        breakFrequencyMinutes: 5,
        audioNarrationEnabled: true,
        textToSpeechSpeed: 'slow',
        celebrationIntensity: 'exciting',
      },
      '5-6': {
        sessionDurationMinutes: 20,
        breakFrequencyMinutes: 7,
        audioNarrationEnabled: true,
        textToSpeechSpeed: 'normal',
        celebrationIntensity: 'medium',
      },
      '7': {
        sessionDurationMinutes: 25,
        breakFrequencyMinutes: 10,
        audioNarrationEnabled: false,
        textToSpeechSpeed: 'normal',
        celebrationIntensity: 'medium',
      },
    };
    return settings[ageGroup];
  }

  private findPhonemePhase(phoneme: string): PhonicsPhase {
    for (let phase = 1; phase <= 6; phase++) {
      if (PHONICS_PHASES[phase as PhonicsPhase].phonemes.includes(phoneme)) {
        return phase as PhonicsPhase;
      }
    }
    return 1; // Default
  }

  private getPhonemesThroughPhase(phase: PhonicsPhase): string[] {
    const phonemes: string[] = [];
    for (let p = 1; p <= phase; p++) {
      phonemes.push(...PHONICS_PHASES[p as PhonicsPhase].phonemes);
    }
    return phonemes;
  }

  private getTotalPhonemesForPhase(phase: PhonicsPhase): number {
    return this.getPhonemesThroughPhase(phase).length;
  }

  private buildChildSafeSystemPrompt(
    persona: EarlyYearsBuddyPersona,
    learner: EarlyYearsLearner,
    context?: { currentActivity?: string; targetPhoneme?: string; targetNumber?: number }
  ): string {
    let prompt = persona.systemPrompt;
    
    // Add context
    prompt += `\n\nCURRENT CONTEXT:
- Child's name: ${learner.firstName}
- Age group: ${learner.ageGroup}
- Phonics phase: ${learner.phonicsPhase}
- Current activity: ${context?.currentActivity || 'free conversation'}`;

    if (context?.targetPhoneme) {
      prompt += `\n- Target phoneme: ${context.targetPhoneme}`;
    }
    if (context?.targetNumber) {
      prompt += `\n- Target number: ${context.targetNumber}`;
    }

    prompt += `\n\nREMEMBER: Keep ALL responses under 3 sentences. Use simple words only.`;

    return prompt;
  }

  private async performChildSafetyCheck(message: string): Promise<{
    requiresRedirect: boolean;
    triggerType?: string;
  }> {
    const lowerMessage = message.toLowerCase();
    
    // Check for concerning patterns
    const concerningPatterns = [
      { pattern: /hurt|scared|afraid|nightmare/i, type: 'emotional_concern' },
      { pattern: /secret|don't tell|promise not/i, type: 'secrecy_concern' },
      { pattern: /stranger|someone.*touch/i, type: 'safety_concern' },
      { pattern: /hate myself|nobody likes me|want to die/i, type: 'wellbeing_concern' },
      { pattern: /address|phone number|where.*live/i, type: 'personal_info' },
    ];

    for (const { pattern, type } of concerningPatterns) {
      if (pattern.test(lowerMessage)) {
        return { requiresRedirect: true, triggerType: type };
      }
    }

    return { requiresRedirect: false };
  }

  private selectRandomTemplate(templates: string[]): string {
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private buildAIMessages(
    conversation: EarlyYearsConversation,
    persona: EarlyYearsBuddyPersona
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: conversation.systemPrompt },
    ];

    // Add conversation history (last 6 messages to keep context manageable)
    const recentMessages = conversation.messages.slice(-6);
    for (const msg of recentMessages) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    return messages;
  }

  private enforceSimpleLanguage(
    response: string,
    level: 'preschool' | 'early_primary' | 'primary'
  ): string {
    // Split into sentences
    const sentences = response.split(/[.!?]+/).filter(s => s.trim());
    
    // Limit based on level
    const maxSentences = level === 'preschool' ? 2 : level === 'early_primary' ? 3 : 4;
    const limited = sentences.slice(0, maxSentences);
    
    // Rejoin
    let result = limited.join('. ').trim();
    if (!result.endsWith('.') && !result.endsWith('!') && !result.endsWith('?')) {
      result += '.';
    }
    
    return result;
  }

  private determineExpression(content: string): string {
    const lower = content.toLowerCase();
    if (lower.includes('great') || lower.includes('amazing') || lower.includes('yay')) {
      return 'excited';
    }
    if (lower.includes('try again') || lower.includes('almost')) {
      return 'encouraging';
    }
    if (lower.includes('?')) {
      return 'curious';
    }
    return 'happy';
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveConversation(tenantId: string, conversation: EarlyYearsConversation): Promise<void> {
    await prisma.earlyYearsConversation.upsert({
      where: { id: conversation.id },
      create: conversation as any,
      update: {
        messages: conversation.messages as any,
        safetyFlags: conversation.safetyFlags as any,
      },
    });
  }

  private async getConversation(tenantId: string, conversationId: string): Promise<EarlyYearsConversation | null> {
    const conv = await prisma.earlyYearsConversation.findFirst({
      where: { id: conversationId, tenantId },
    });
    return conv as unknown as EarlyYearsConversation | null;
  }

  private async hashSequence(sequence: string[]): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(sequence.join('|')).digest('hex');
  }

  private async encryptSequence(sequence: string[]): Promise<string> {
    // In production, use proper encryption
    return Buffer.from(sequence.join('|')).toString('base64');
  }

  // Stub methods for data retrieval (would query actual database in production)
  private async getRecentPhonicsData(tenantId: string, learnerId: string, days: number) {
    return {
      averageAccuracy7Days: 0.75,
      accuracyTrend: 0.02,
      avgTimePerWord: 3500,
      hintsPerSession: 2.5,
      sessionConsistency: 0.8,
    };
  }

  private async getRecentEyeTrackingData(tenantId: string, learnerId: string, days: number) {
    return {
      avgFixationDuration: 250,
      regressionRate: 0.15,
      lineTrackingAccuracy: 85,
      focusScore: 78,
    };
  }

  private ruleBasedReadingAssessment(features: any): ReadingDifficultyPrediction {
    // Simple rule-based fallback
    let riskScore = 0;
    
    if (features.averageAccuracy7Days < 0.6) riskScore += 30;
    if (features.regressionRate > 0.25) riskScore += 25;
    if (features.lineTrackingAccuracy < 70) riskScore += 20;
    if (features.accuracyTrend < 0) riskScore += 15;
    
    const riskLevel = riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low';
    
    return {
      learnerId: '',
      riskScore,
      riskLevel,
      confidence: 0.6,
      riskFactors: [],
      recommendations: [],
      monitoringPlan: {
        reassessInDays: 14,
        focusAreas: [],
        parentNotification: riskLevel !== 'low',
      },
      assessedAt: new Date(),
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    };
  }

  private identifyReadingRiskFactors(features: any, mlPrediction: any): any[] {
    const factors = [];
    if (features.averageAccuracy7Days < 0.7) {
      factors.push({
        factor: 'Decoding accuracy below expected',
        impact: -20,
        trend: features.accuracyTrend >= 0 ? 'improving' : 'declining',
      });
    }
    if (features.regressionRate > 0.2) {
      factors.push({
        factor: 'Frequent eye movement regressions',
        impact: -15,
        trend: 'stable',
      });
    }
    return factors;
  }

  private generateReadingRecommendations(features: any, riskLevel: string): any[] {
    const recommendations = [];
    if (riskLevel === 'high' || riskLevel === 'medium') {
      recommendations.push({
        type: 'phonics_review',
        title: 'Phonics Reinforcement',
        description: 'Focus on phonemes that need strengthening',
      });
    }
    return recommendations;
  }

  private identifyFocusAreas(features: any): string[] {
    const areas = [];
    if (features.averageAccuracy7Days < 0.75) areas.push('decoding_accuracy');
    if (features.regressionRate > 0.2) areas.push('fluency');
    if (features.focusScore < 70) areas.push('attention');
    return areas;
  }

  private async updateLearnerPhonicsProgress(tenantId: string, session: PhonicsSession): Promise<void> {
    // Update learner with session results
  }

  private async getWeeklyStats(tenantId: string, learnerId: string) {
    return { sessionCount: 5, totalMinutes: 75, starsEarned: 45 };
  }

  private async getPhonicsProgressSummary(tenantId: string, learnerId: string) {
    return { recentlyLearned: ['sh', 'ch'], needsReinforcement: ['th'] };
  }

  private async getNumeracyProgressSummary(tenantId: string, learnerId: string) {
    return { countingRange: 20, recentConcepts: ['counting to 20', 'more/less'] };
  }

  private async getStoryProgressSummary(tenantId: string, learnerId: string) {
    return { totalEpisodes: 24 };
  }

  private async generateHomeActivityRecommendations(tenantId: string, learnerId: string): Promise<HomeActivityRecommendation[]> {
    return [
      {
        id: '1',
        title: 'Sound Hunt',
        description: 'Find things around the house that start with the "sh" sound',
        type: 'phonics',
        targetSkill: 'sh phoneme recognition',
        materials: ['None needed'],
        estimatedMinutes: 10,
        instructions: ['Walk around the house together', 'Ask your child to find things starting with "sh"', 'Celebrate each find!'],
      },
    ];
  }

  private async getParentAlerts(tenantId: string, learnerId: string): Promise<ParentAlert[]> {
    return [];
  }

  private async getRecentActivity(tenantId: string, learnerId: string, days: number): Promise<RecentActivityItem[]> {
    return [];
  }
}

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

export interface EarlyYearsConversation {
  id: string;
  tenantId: string;
  learnerId: string;
  characterId: string;
  characterName: string;
  systemPrompt: string;
  messages: EarlyYearsMessage[];
  context: {
    learnerAge: number;
    phonicsPhase: PhonicsPhase;
    numeracyStage: NumeracyStage;
    currentActivity?: string;
    targetPhoneme?: string;
    targetNumber?: number;
  };
  safetyFlags: Array<{
    timestamp: Date;
    triggerType?: string;
  }>;
  startedAt: Date;
}

export interface EarlyYearsMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  characterExpression?: string;
  wasRedirected?: boolean;
}

export interface GeneratedPhonicsActivity {
  id: string;
  phoneme: string;
  phase: PhonicsPhase;
  title: string;
  type: 'recognition' | 'blending' | 'segmenting' | 'reading' | 'writing';
  instructions: string;
  audioScript: string;
  words: string[];
  visualElements: string[];
  kinestheticElement: string;
  successCriteria: SuccessCriteria;
  generatedAt: Date;
  generatedFor: string;
}

export interface DecodableReader {
  id: string;
  title: string;
  sentences: Array<{
    text: string;
    targetWords: string[];
    illustration: string;
  }>;
  vocabulary: string[];
  phonemesPracticed: string[];
  phase: PhonicsPhase;
  generatedFor: string;
  generatedAt: Date;
}

export interface ReadingDifficultyPrediction {
  learnerId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  riskFactors: Array<{
    factor: string;
    impact: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
  }>;
  monitoringPlan: {
    reassessInDays: number;
    focusAreas: string[];
    parentNotification: boolean;
  };
  assessedAt: Date;
  validUntil: Date;
}

// ============================================================================
// SERVICE INITIALIZATION
// ============================================================================

let earlyYearsServiceInstance: EarlyYearsService | null = null;

export function initializeEarlyYearsService(deps: {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
}): EarlyYearsService {
  earlyYearsServiceInstance = new EarlyYearsService(deps);
  return earlyYearsServiceInstance;
}

export function getEarlyYearsService(): EarlyYearsService {
  if (!earlyYearsServiceInstance) {
    throw new Error('EarlyYearsService not initialized');
  }
  return earlyYearsServiceInstance;
}

export { EarlyYearsService as default };
