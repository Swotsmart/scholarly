/**
 * LinguaFlow (Language Learning) Type Definitions
 * CEFR-based language learning with IB Diploma integration
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type SkillType = 'reading' | 'writing' | 'listening' | 'speaking';
export type ContentType = 'vocabulary' | 'grammar' | 'conversation' | 'culture' | 'assessment';

export interface LanguageProfile {
  id: string;
  userId: string;
  targetLanguage: string;
  nativeLanguage: string;
  currentLevel: CEFRLevel;
  targetLevel: CEFRLevel;
  weeklyGoalMinutes: number;
  dailyStreakDays: number;
  longestStreak: number;
  totalXP: number;
  vocabularyMastered: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearningProgress {
  profile: LanguageProfile;
  skills: SkillProgress[];
  recentSessions: LearningSession[];
  weeklyStats: WeeklyStats;
  recommendations: Recommendation[];
}

export interface SkillProgress {
  skill: SkillType;
  level: CEFRLevel;
  progressPercent: number;
  practiceCount: number;
  lastPracticed: string;
}

export interface WeeklyStats {
  minutesPracticed: number;
  sessionsCompleted: number;
  vocabularyLearned: number;
  xpEarned: number;
  streakDays: number;
  goalProgress: number;
}

// =============================================================================
// VOCABULARY TYPES
// =============================================================================

export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  pronunciation?: string;
  partOfSpeech: string;
  cefrLevel: CEFRLevel;
  exampleSentence: string;
  exampleTranslation: string;
  audioUrl?: string;
  imageUrl?: string;
  tags: string[];
  theme: string;
}

export interface VocabularyProgress {
  itemId: string;
  item: VocabularyItem;
  easeFactor: number;
  repetitions: number;
  interval: number;
  nextReviewAt: string;
  lastReviewedAt: string;
  correctCount: number;
  incorrectCount: number;
  status: 'new' | 'learning' | 'review' | 'mastered';
}

export interface VocabularyReviewSession {
  id: string;
  cards: VocabularyProgress[];
  currentIndex: number;
  correctCount: number;
  incorrectCount: number;
  startedAt: string;
  completedAt?: string;
}

export interface ReviewResult {
  itemId: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5; // SM-2 quality rating
  responseTimeMs: number;
}

// =============================================================================
// GRAMMAR TYPES
// =============================================================================

export interface GrammarTopic {
  id: string;
  title: string;
  description: string;
  cefrLevel: CEFRLevel;
  category: string;
  explanation: string;
  examples: GrammarExample[];
  exercises: GrammarExercise[];
  relatedTopics: string[];
}

export interface GrammarExample {
  sentence: string;
  translation: string;
  highlight: string;
  explanation: string;
}

export interface GrammarExercise {
  id: string;
  type: 'fill_blank' | 'multiple_choice' | 'reorder' | 'conjugation';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  hint?: string;
}

// =============================================================================
// CONVERSATION TYPES
// =============================================================================

export interface ConversationScenario {
  id: string;
  title: string;
  description: string;
  cefrLevel: CEFRLevel;
  category: string;
  context: string;
  persona: ConversationPersona;
  objectives: string[];
  suggestedResponses: string[];
}

export interface ConversationPersona {
  name: string;
  role: string;
  personality: string;
  avatar: string;
  voiceStyle: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  translation?: string;
  corrections?: CorrectionSuggestion[];
  timestamp: string;
}

export interface CorrectionSuggestion {
  original: string;
  corrected: string;
  explanation: string;
  severity: 'minor' | 'moderate' | 'major';
}

// =============================================================================
// SESSION TYPES
// =============================================================================

export interface LearningSession {
  id: string;
  profileId: string;
  type: ContentType;
  skill: SkillType;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  xpEarned: number;
  activitiesCompleted: number;
  accuracy: number;
  status: 'active' | 'completed' | 'abandoned';
}

export interface Recommendation {
  type: 'vocabulary' | 'grammar' | 'conversation' | 'review';
  title: string;
  description: string;
  reason: string;
  cefrLevel: CEFRLevel;
  estimatedMinutes: number;
  priority: 'high' | 'medium' | 'low';
  actionUrl: string;
}

// =============================================================================
// IB DIPLOMA INTEGRATION
// =============================================================================

export interface IBProgress {
  profileId: string;
  languageType: 'ab_initio' | 'language_b_sl' | 'language_b_hl';
  currentGrade: number;
  predictedGrade: number;
  criteriaProgress: IBCriteriaProgress[];
  assessmentsDue: IBAssessment[];
}

export interface IBCriteriaProgress {
  criterion: 'A' | 'B' | 'C';
  criterionName: string;
  currentLevel: number;
  maxLevel: number;
  strengths: string[];
  areasForImprovement: string[];
}

export interface IBAssessment {
  id: string;
  name: string;
  type: 'internal' | 'external';
  dueDate: string;
  weight: number;
  status: 'upcoming' | 'in_progress' | 'submitted' | 'graded';
  grade?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const CEFR_LEVELS: Record<CEFRLevel, { name: string; description: string }> = {
  A1: { name: 'Beginner', description: 'Can understand and use familiar everyday expressions' },
  A2: { name: 'Elementary', description: 'Can communicate in simple, routine tasks' },
  B1: { name: 'Intermediate', description: 'Can deal with most situations while traveling' },
  B2: { name: 'Upper Intermediate', description: 'Can interact with fluency and spontaneity' },
  C1: { name: 'Advanced', description: 'Can use language flexibly and effectively' },
  C2: { name: 'Proficient', description: 'Can understand virtually everything heard or read' },
};

export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'zh', name: 'Mandarin Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
];

export const SKILL_ICONS: Record<SkillType, string> = {
  reading: '📖',
  writing: '✍️',
  listening: '🎧',
  speaking: '🗣️',
};
