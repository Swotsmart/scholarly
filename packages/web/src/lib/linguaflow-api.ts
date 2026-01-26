/**
 * LinguaFlow API Client
 * Handles all API interactions for language learning
 */

import type {
  LanguageProfile,
  LearningProgress,
  VocabularyItem,
  VocabularyProgress,
  VocabularyReviewSession,
  ReviewResult,
  GrammarTopic,
  ConversationScenario,
  ConversationMessage,
  LearningSession,
  CEFRLevel,
  SkillType,
} from '@/types/linguaflow';

const DEMO_MODE = true;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// DEMO DATA
// =============================================================================

const demoProfile: LanguageProfile = {
  id: 'profile-1',
  userId: 'user-1',
  targetLanguage: 'fr',
  nativeLanguage: 'en',
  currentLevel: 'B1',
  targetLevel: 'B2',
  weeklyGoalMinutes: 120,
  dailyStreakDays: 12,
  longestStreak: 23,
  totalXP: 4520,
  vocabularyMastered: 342,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: new Date().toISOString(),
};

const demoVocabulary: VocabularyItem[] = [
  {
    id: 'vocab-1',
    word: 'réussir',
    translation: 'to succeed, to pass (an exam)',
    pronunciation: 'ray-ew-SEER',
    partOfSpeech: 'verb',
    cefrLevel: 'B1',
    exampleSentence: 'J\'ai réussi mon examen de français.',
    exampleTranslation: 'I passed my French exam.',
    tags: ['achievement', 'education'],
    theme: 'Academic',
  },
  {
    id: 'vocab-2',
    word: 'développement',
    translation: 'development',
    pronunciation: 'day-vlop-MAHN',
    partOfSpeech: 'noun',
    cefrLevel: 'B1',
    exampleSentence: 'Le développement durable est essentiel.',
    exampleTranslation: 'Sustainable development is essential.',
    tags: ['environment', 'growth'],
    theme: 'Business',
  },
  {
    id: 'vocab-3',
    word: 'bien que',
    translation: 'although, even though',
    pronunciation: 'bee-EN kuh',
    partOfSpeech: 'conjunction',
    cefrLevel: 'B1',
    exampleSentence: 'Bien qu\'il pleuve, je sortirai.',
    exampleTranslation: 'Even though it\'s raining, I will go out.',
    tags: ['connectors', 'subjunctive'],
    theme: 'Grammar',
  },
  {
    id: 'vocab-4',
    word: 'souligner',
    translation: 'to underline, to emphasize',
    pronunciation: 'soo-lee-NYAY',
    partOfSpeech: 'verb',
    cefrLevel: 'B1',
    exampleSentence: 'Je voudrais souligner trois points importants.',
    exampleTranslation: 'I would like to emphasize three important points.',
    tags: ['presentation', 'communication'],
    theme: 'Academic',
  },
  {
    id: 'vocab-5',
    word: 'cependant',
    translation: 'however, nevertheless',
    pronunciation: 'suh-pahn-DAHN',
    partOfSpeech: 'adverb',
    cefrLevel: 'B1',
    exampleSentence: 'Il fait froid; cependant, je vais me promener.',
    exampleTranslation: 'It\'s cold; however, I\'m going for a walk.',
    tags: ['connectors', 'formal'],
    theme: 'Grammar',
  },
  {
    id: 'vocab-6',
    word: 'améliorer',
    translation: 'to improve',
    pronunciation: 'ah-may-lee-oh-RAY',
    partOfSpeech: 'verb',
    cefrLevel: 'B1',
    exampleSentence: 'Je veux améliorer mon français.',
    exampleTranslation: 'I want to improve my French.',
    tags: ['self-improvement', 'learning'],
    theme: 'Education',
  },
];

const demoProgress: LearningProgress = {
  profile: demoProfile,
  skills: [
    { skill: 'reading', level: 'B1', progressPercent: 75, practiceCount: 45, lastPracticed: '2024-02-10T10:00:00Z' },
    { skill: 'writing', level: 'A2', progressPercent: 60, practiceCount: 32, lastPracticed: '2024-02-09T14:00:00Z' },
    { skill: 'listening', level: 'B1', progressPercent: 80, practiceCount: 52, lastPracticed: '2024-02-10T11:00:00Z' },
    { skill: 'speaking', level: 'A2', progressPercent: 45, practiceCount: 18, lastPracticed: '2024-02-08T16:00:00Z' },
  ],
  recentSessions: [
    {
      id: 'session-1',
      profileId: 'profile-1',
      type: 'vocabulary',
      skill: 'reading',
      startedAt: '2024-02-10T10:00:00Z',
      endedAt: '2024-02-10T10:25:00Z',
      durationMinutes: 25,
      xpEarned: 85,
      activitiesCompleted: 20,
      accuracy: 0.85,
      status: 'completed',
    },
    {
      id: 'session-2',
      profileId: 'profile-1',
      type: 'conversation',
      skill: 'speaking',
      startedAt: '2024-02-09T14:00:00Z',
      endedAt: '2024-02-09T14:30:00Z',
      durationMinutes: 30,
      xpEarned: 120,
      activitiesCompleted: 1,
      accuracy: 0.78,
      status: 'completed',
    },
  ],
  weeklyStats: {
    minutesPracticed: 95,
    sessionsCompleted: 8,
    vocabularyLearned: 24,
    xpEarned: 450,
    streakDays: 5,
    goalProgress: 79,
  },
  recommendations: [
    {
      type: 'vocabulary',
      title: 'Review Due Cards',
      description: '12 vocabulary cards are due for review',
      reason: 'Spaced repetition keeps words in long-term memory',
      cefrLevel: 'B1',
      estimatedMinutes: 10,
      priority: 'high',
      actionUrl: '/linguaflow/vocabulary/review',
    },
    {
      type: 'conversation',
      title: 'Practice Speaking',
      description: 'Ordering at a restaurant scenario',
      reason: 'Your speaking skill needs more practice',
      cefrLevel: 'B1',
      estimatedMinutes: 15,
      priority: 'medium',
      actionUrl: '/linguaflow/conversation',
    },
    {
      type: 'grammar',
      title: 'Subjunctive Mood',
      description: 'Learn when to use the subjunctive',
      reason: 'Essential for B1 level communication',
      cefrLevel: 'B1',
      estimatedMinutes: 20,
      priority: 'medium',
      actionUrl: '/linguaflow/grammar/subjunctive',
    },
  ],
};

// =============================================================================
// API CLIENT
// =============================================================================

class LinguaFlowApiClient {
  private baseUrl: string;
  private demoMode: boolean;

  constructor() {
    this.baseUrl = `${API_BASE}/linguaflow`;
    this.demoMode = DEMO_MODE;
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Profile
  async getProfile(): Promise<{ profile: LanguageProfile }> {
    if (this.demoMode) return { profile: demoProfile };
    return this.request('GET', '/profile');
  }

  async updateProfile(data: Partial<LanguageProfile>): Promise<{ profile: LanguageProfile }> {
    if (this.demoMode) return { profile: { ...demoProfile, ...data } };
    return this.request('PATCH', '/profile', data);
  }

  // Progress
  async getProgress(): Promise<LearningProgress> {
    if (this.demoMode) return demoProgress;
    return this.request('GET', '/progress');
  }

  // Vocabulary
  async getVocabularyDue(limit?: number): Promise<{ cards: VocabularyProgress[] }> {
    if (this.demoMode) {
      return {
        cards: demoVocabulary.map((item) => ({
          itemId: item.id,
          item,
          easeFactor: 2.5,
          repetitions: 1,
          interval: 1,
          nextReviewAt: new Date().toISOString(),
          lastReviewedAt: new Date(Date.now() - 86400000).toISOString(),
          correctCount: 3,
          incorrectCount: 1,
          status: 'review' as const,
        })),
      };
    }
    return this.request('GET', `/vocabulary/due?limit=${limit || 20}`);
  }

  async submitReview(results: ReviewResult[]): Promise<{ xpEarned: number; cardsReviewed: number }> {
    if (this.demoMode) {
      return { xpEarned: results.length * 5, cardsReviewed: results.length };
    }
    return this.request('POST', '/vocabulary/review', { results });
  }

  async searchVocabulary(query: string): Promise<{ items: VocabularyItem[] }> {
    if (this.demoMode) {
      return {
        items: demoVocabulary.filter(
          (v) =>
            v.word.toLowerCase().includes(query.toLowerCase()) ||
            v.translation.toLowerCase().includes(query.toLowerCase())
        ),
      };
    }
    return this.request('GET', `/vocabulary/search?q=${encodeURIComponent(query)}`);
  }

  // Sessions
  async startSession(type: string, skill: SkillType): Promise<{ session: LearningSession }> {
    if (this.demoMode) {
      return {
        session: {
          id: `session-${Date.now()}`,
          profileId: demoProfile.id,
          type: type as any,
          skill,
          startedAt: new Date().toISOString(),
          durationMinutes: 0,
          xpEarned: 0,
          activitiesCompleted: 0,
          accuracy: 0,
          status: 'active',
        },
      };
    }
    return this.request('POST', '/sessions', { type, skill });
  }

  async endSession(sessionId: string): Promise<{ session: LearningSession }> {
    if (this.demoMode) {
      return {
        session: {
          ...demoProgress.recentSessions[0],
          id: sessionId,
          status: 'completed',
          endedAt: new Date().toISOString(),
        },
      };
    }
    return this.request('POST', `/sessions/${sessionId}/end`);
  }
}

export const linguaflowApi = new LinguaFlowApiClient();
