/**
 * Language Learning Service - Types and Configuration
 * 
 * Core types, CEFR definitions, and language configuration for LinguaFlow.
 */

// ============================================================================
// TYPES - CORE CONFIGURATION
// ============================================================================

export type LanguageCode = 'fr' | 'es' | 'zh' | 'de' | 'ja' | 'it';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type SkillType = 'reading' | 'writing' | 'listening' | 'speaking';
export type IBMYPPhase = 1 | 2 | 3 | 4 | 5 | 6;

export interface LanguageConfiguration {
  code: LanguageCode;
  name: string;
  nativeName: string;
  hasHeritagePathway: boolean;
  writingSystem: 'latin' | 'logographic' | 'syllabary' | 'mixed';
  hasTones: boolean;
  difficultyForEnglishSpeakers: 1 | 2 | 3 | 4 | 5;
  specialFeatures?: string[];
}

export const LANGUAGE_CONFIG: Record<LanguageCode, LanguageConfiguration> = {
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    hasHeritagePathway: false,
    writingSystem: 'latin',
    hasTones: false,
    difficultyForEnglishSpeakers: 2,
    specialFeatures: ['gendered_nouns', 'verb_conjugation', 'liaison'],
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    hasHeritagePathway: true,
    writingSystem: 'latin',
    hasTones: false,
    difficultyForEnglishSpeakers: 1,
    specialFeatures: ['gendered_nouns', 'verb_conjugation', 'subjunctive'],
  },
  zh: {
    code: 'zh',
    name: 'Mandarin Chinese',
    nativeName: '中文',
    hasHeritagePathway: true,
    writingSystem: 'logographic',
    hasTones: true,
    difficultyForEnglishSpeakers: 5,
    specialFeatures: ['tones', 'characters', 'measure_words', 'no_conjugation'],
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    hasHeritagePathway: false,
    writingSystem: 'latin',
    hasTones: false,
    difficultyForEnglishSpeakers: 2,
    specialFeatures: ['cases', 'gendered_nouns', 'word_order', 'compound_words'],
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    hasHeritagePathway: false,
    writingSystem: 'mixed',
    hasTones: false,
    difficultyForEnglishSpeakers: 5,
    specialFeatures: ['hiragana', 'katakana', 'kanji', 'politeness_levels'],
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    hasHeritagePathway: true,
    writingSystem: 'latin',
    hasTones: false,
    difficultyForEnglishSpeakers: 2,
    specialFeatures: ['gendered_nouns', 'verb_conjugation', 'formal_informal'],
  },
};

// ============================================================================
// CEFR FRAMEWORK
// ============================================================================

export interface CEFRLevelDefinition {
  level: CEFRLevel;
  name: string;
  description: string;
  vocabularyRange: string;
  grammarTopics: string[];
  canDoStatements: Record<SkillType, string>;
  ibMYPPhase: IBMYPPhase;
  hoursToAchieve: number;
}

export const CEFR_LEVELS: Record<CEFRLevel, CEFRLevelDefinition> = {
  A1: {
    level: 'A1',
    name: 'Beginner',
    description: 'Can understand and use familiar everyday expressions and very basic phrases.',
    vocabularyRange: '500-1000',
    grammarTopics: ['present_tense', 'basic_nouns', 'articles', 'simple_questions'],
    canDoStatements: {
      reading: 'Can understand familiar names, words and very simple sentences.',
      writing: 'Can write a short, simple postcard. Can fill in forms with personal details.',
      listening: 'Can recognise familiar words about self, family, and immediate surroundings.',
      speaking: 'Can interact in a simple way if the other person speaks slowly and clearly.',
    },
    ibMYPPhase: 1,
    hoursToAchieve: 90,
  },
  A2: {
    level: 'A2',
    name: 'Elementary',
    description: 'Can understand sentences and frequently used expressions related to areas of most immediate relevance.',
    vocabularyRange: '1000-2000',
    grammarTopics: ['past_tense', 'future_tense', 'comparatives', 'object_pronouns'],
    canDoStatements: {
      reading: 'Can read very short, simple texts. Can find specific information in simple everyday material.',
      writing: 'Can write short, simple notes and messages. Can write a very simple personal letter.',
      listening: 'Can understand phrases and high frequency vocabulary related to personal and family information.',
      speaking: 'Can communicate in simple and routine tasks requiring direct exchange of information.',
    },
    ibMYPPhase: 2,
    hoursToAchieve: 180,
  },
  B1: {
    level: 'B1',
    name: 'Intermediate',
    description: 'Can understand the main points of clear standard input on familiar matters.',
    vocabularyRange: '2000-4000',
    grammarTopics: ['conditional', 'subjunctive_intro', 'relative_clauses', 'passive_voice'],
    canDoStatements: {
      reading: 'Can understand texts that consist mainly of high frequency everyday language.',
      writing: 'Can write simple connected text on topics which are familiar or of personal interest.',
      listening: 'Can understand the main points of clear standard speech on familiar matters.',
      speaking: 'Can deal with most situations likely to arise whilst travelling.',
    },
    ibMYPPhase: 3,
    hoursToAchieve: 350,
  },
  B2: {
    level: 'B2',
    name: 'Upper Intermediate',
    description: 'Can understand the main ideas of complex text on both concrete and abstract topics.',
    vocabularyRange: '4000-6000',
    grammarTopics: ['subjunctive_full', 'advanced_conditionals', 'reported_speech', 'advanced_tenses'],
    canDoStatements: {
      reading: 'Can read articles and reports concerned with contemporary problems.',
      writing: 'Can write clear, detailed text on a wide range of subjects.',
      listening: 'Can understand extended speech and lectures and follow complex lines of argument.',
      speaking: 'Can interact with a degree of fluency and spontaneity with native speakers.',
    },
    ibMYPPhase: 4,
    hoursToAchieve: 500,
  },
  C1: {
    level: 'C1',
    name: 'Advanced',
    description: 'Can understand a wide range of demanding, longer texts, and recognise implicit meaning.',
    vocabularyRange: '6000-10000',
    grammarTopics: ['nuanced_expression', 'literary_tenses', 'advanced_syntax', 'idiomatic_usage'],
    canDoStatements: {
      reading: 'Can understand long and complex factual and literary texts, appreciating distinctions of style.',
      writing: 'Can express ideas fluently and spontaneously without obvious searching for expressions.',
      listening: 'Can understand extended speech even when it is not clearly structured.',
      speaking: 'Can use language flexibly and effectively for social, academic and professional purposes.',
    },
    ibMYPPhase: 5,
    hoursToAchieve: 700,
  },
  C2: {
    level: 'C2',
    name: 'Mastery',
    description: 'Can understand with ease virtually everything heard or read.',
    vocabularyRange: '10000+',
    grammarTopics: ['native_like_nuance', 'register_mastery', 'cultural_expression', 'literary_analysis'],
    canDoStatements: {
      reading: 'Can read with ease virtually all forms of the written language.',
      writing: 'Can write clear, smoothly-flowing text in an appropriate style.',
      listening: 'Can understand any kind of spoken language with ease.',
      speaking: 'Can express ideas spontaneously, very fluently and precisely, differentiating finer shades of meaning.',
    },
    ibMYPPhase: 6,
    hoursToAchieve: 1000,
  },
};

// ============================================================================
// LEARNER TYPES
// ============================================================================

export interface LanguageLearner {
  id: string;
  tenantId: string;
  userId: string;
  
  targetLanguage: LanguageCode;
  nativeLanguage: string;
  additionalLanguages: string[];
  
  overallCEFR: CEFRLevel;
  skillLevels: Record<SkillType, CEFRLevel>;
  targetCEFR: CEFRLevel;
  
  ibMYPPhase?: IBMYPPhase;
  ibLanguageCategory?: 'language_acquisition' | 'language_and_literature';
  
  isHeritageSpeaker: boolean;
  heritageProfile?: HeritageProfile;
  
  preferredPersonaId: string;
  voiceSpeed: 'slow' | 'normal' | 'fast';
  showRomanization: boolean;
  preferredTopics: string[];
  
  vocabularyMastered: number;
  vocabularyInProgress: number;
  conversationMinutes: number;
  lessonsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  
  srsCardsTotal: number;
  srsDueToday: number;
  srsAverageRetention: number;
  
  createdAt: Date;
  updatedAt: Date;
  lastSessionAt?: Date;
  lastPlacementTestAt?: Date;
}

export interface HeritageProfile {
  relationToLanguage: 'parent' | 'grandparent' | 'community' | 'immersion';
  exposureContext: 'home' | 'school' | 'community' | 'travel';
  speakingComfort: 'fluent' | 'conversational' | 'basic' | 'passive';
  readingAbility: 'fluent' | 'basic' | 'minimal' | 'none';
  writingAbility: 'fluent' | 'basic' | 'minimal' | 'none';
  formalRegisterExposure: 'high' | 'medium' | 'low' | 'none';
  culturalConnection: 'strong' | 'moderate' | 'limited';
  learningGoals: string[];
  specialFocus: ('literacy' | 'formal_register' | 'academic' | 'cultural' | 'writing')[];
}

export interface CreateLanguageLearnerInput {
  userId: string;
  targetLanguage: LanguageCode;
  nativeLanguage: string;
  additionalLanguages?: string[];
  isHeritageSpeaker?: boolean;
  heritageProfile?: HeritageProfile;
  targetCEFR?: CEFRLevel;
  ibMYPPhase?: IBMYPPhase;
}

// ============================================================================
// CONVERSATION TYPES
// ============================================================================

export interface ConversationPersona {
  id: string;
  language: LanguageCode;
  name: string;
  nativeName: string;
  role: string;
  description: string;
  personality: string[];
  interests: string[];
  communicationStyle: 'formal' | 'casual' | 'mixed';
  speakingSpeed: 'slow' | 'normal' | 'fast';
  country: string;
  city: string;
  culturalTopics: string[];
  systemPrompt: string;
  scaffoldingLevel: 'high' | 'medium' | 'low';
  errorCorrectionStyle: 'immediate' | 'delayed' | 'subtle' | 'explicit';
  minCEFR: CEFRLevel;
  maxCEFR: CEFRLevel;
  voiceId: string;
  gender: 'male' | 'female' | 'neutral';
  avatarUrl: string;
  backgroundUrl: string;
}

export interface LanguageConversation {
  id: string;
  tenantId: string;
  learnerId: string;
  personaId: string;
  language: LanguageCode;
  messages: ConversationMessage[];
  context: {
    cefrLevel: CEFRLevel;
    topic?: string;
    scenario?: string;
    grammarFocus?: string[];
    vocabularyFocus?: string[];
  };
  metrics: {
    messageCount: number;
    wordsProduced: number;
    errorsDetected: number;
    correctionsMade: number;
    newVocabularyIntroduced: string[];
  };
  startedAt: Date;
  endedAt?: Date;
  durationMinutes?: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  translation?: string;
  audioUrl?: string;
  timestamp: Date;
  corrections?: CorrectionItem[];
  newVocabulary?: VocabularyItem[];
  culturalNote?: string;
  pronunciationScore?: number;
  grammarErrors?: GrammarError[];
}

export interface CorrectionItem {
  original: string;
  corrected: string;
  explanation: string;
  errorType: 'grammar' | 'vocabulary' | 'spelling' | 'tone' | 'register';
}

export interface GrammarError {
  text: string;
  errorType: string;
  suggestion: string;
  explanation: string;
}

export interface VocabularyItem {
  id: string;
  language: LanguageCode;
  term: string;
  romanization?: string;
  pronunciation?: string;
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'phrase' | 'other';
  definitions: Definition[];
  examples: Example[];
  cefrLevel: CEFRLevel;
  topics: string[];
  frequency: 'very_common' | 'common' | 'uncommon' | 'rare';
  audioUrl?: string;
}

export interface Definition {
  meaning: string;
  context?: string;
  register?: 'formal' | 'informal' | 'slang' | 'literary';
}

export interface Example {
  sentence: string;
  translation: string;
  audioUrl?: string;
}

// ============================================================================
// SRS TYPES
// ============================================================================

export interface SRSCard {
  id: string;
  learnerId: string;
  tenantId: string;
  cardType: 'vocabulary' | 'grammar' | 'character' | 'phrase' | 'listening';
  front: string;
  back: string;
  context?: string;
  audioUrl?: string;
  imageUrl?: string;
  vocabularyId?: string;
  box: 1 | 2 | 3 | 4 | 5 | 6;
  easeFactor: number;
  interval: number;
  dueDate: Date;
  lastReviewedAt?: Date;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  createdAt: Date;
  updatedAt: Date;
  suspendedUntil?: Date;
}

export interface SRSReview {
  id: string;
  cardId: string;
  learnerId: string;
  tenantId: string;
  reviewedAt: Date;
  responseQuality: 0 | 1 | 2 | 3 | 4 | 5;
  responseTimeMs: number;
  previousBox: number;
  previousInterval: number;
  previousEaseFactor: number;
  newBox: number;
  newInterval: number;
  newEaseFactor: number;
}

export interface SRSStatistics {
  learnerId: string;
  language: LanguageCode;
  totalCards: number;
  cardsByBox: Record<number, number>;
  dueToday: number;
  dueThisWeek: number;
  overdue: number;
  retentionRate: number;
  averageEaseFactor: number;
  averageResponseTimeMs: number;
  currentStreak: number;
  longestStreak: number;
  lastReviewDate?: Date;
  cardsLearnedToday: number;
  cardsReviewedToday: number;
  newCardsAvailable: number;
}

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

export interface LanguageExercise {
  id: string;
  type: 'fill_blank' | 'multiple_choice' | 'translation' | 'comprehension' | 'dictation' | 'speaking_prompt';
  language: LanguageCode;
  cefrLevel: CEFRLevel;
  skill: SkillType;
  instructions: string;
  content: any;
  answer: string;
  explanation: string;
  difficulty: number;
  skills: string[];
  generatedFor: string;
  generatedAt: Date;
}

export interface ConversationSummary {
  conversationId: string;
  durationMinutes: number;
  messageCount: number;
  wordsProduced: number;
  newVocabulary: string[];
  errorsDetected: number;
  correctionsMade: number;
  topicsDiscussed: string[];
  strengths: string[];
  areasToImprove: string[];
  suggestedFollowUp: string[];
}

export interface ProficiencyPrediction {
  learnerId: string;
  language: LanguageCode;
  currentProficiency: {
    overall: CEFRLevel;
    reading: CEFRLevel;
    writing: CEFRLevel;
    listening: CEFRLevel;
    speaking: CEFRLevel;
  };
  predictedProgress: {
    thirtyDays: CEFRLevel;
    ninetyDays: CEFRLevel;
    oneYear: CEFRLevel;
  };
  estimatedHoursToNextLevel: number | null;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  confidence: number;
  assessedAt: Date;
}

export interface PlacementTestResult {
  id: string;
  learnerId: string;
  language: LanguageCode;
  recommendedCEFR: CEFRLevel;
  skillBreakdown: Record<SkillType, CEFRLevel>;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  recommendedStartingPoint: {
    unit: string;
    focus: string[];
  };
  completedAt: Date;
}

export interface LanguageDashboardData {
  learner: {
    id: string;
    language: LanguageCode;
    languageName: string;
  };
  cefrProgress: {
    currentLevel: CEFRLevel;
    currentLevelName: string;
    targetLevel: CEFRLevel;
    skillBreakdown: Record<SkillType, CEFRLevel>;
    progressToNextLevel: number;
    canDoStatements: Record<SkillType, string>;
  };
  weeklyStats: {
    minutesPracticed: number;
    conversationMinutes: number;
    exercisesCompleted: number;
    cardsReviewed: number;
    newVocabulary: number;
    currentStreak: number;
  };
  srsOverview: {
    dueToday: number;
    overdue: number;
    retention: number;
    totalCards: number;
  } | null;
  recentConversations: Array<{
    id: string;
    personaName: string;
    topic: string;
    date: Date;
    durationMinutes: number;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    earnedAt: Date;
  }>;
  recommendations: string[];
}

export interface PronunciationAttempt {
  id: string;
  learnerId: string;
  tenantId: string;
  targetText: string;
  targetLanguage: LanguageCode;
  targetAudioUrl?: string;
  audioRecordingUrl: string;
  transcription?: string;
  durationMs: number;
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  phonemeScores?: PhonemeScore[];
  wordScores?: WordScore[];
  toneScores?: ToneScore[];
  feedback: string[];
  areasToImprove: string[];
  createdAt: Date;
}

export interface PhonemeScore {
  phoneme: string;
  score: number;
  expected: string;
  actual: string;
}

export interface WordScore {
  word: string;
  score: number;
  errorType?: 'mispronunciation' | 'omission' | 'insertion';
}

export interface ToneScore {
  syllable: string;
  expectedTone: number;
  detectedTone: number;
  score: number;
}
