/**
 * API Client for Scholarly Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'; // Demo mode only when explicitly enabled

// ==========================================================================
// MOCK DATA FOR DEMO MODE
// ==========================================================================

const DEMO_USERS = {
  'admin@scholarly.app': {
    id: 'user_admin_1',
    email: 'admin@scholarly.app',
    firstName: 'Admin',
    lastName: 'User',
    role: 'platform_admin',
    avatarUrl: undefined,
  },
  'teacher@scholarly.app': {
    id: 'user_teacher_1',
    email: 'teacher@scholarly.app',
    firstName: 'Dr. James',
    lastName: 'Wilson',
    role: 'teacher',
    avatarUrl: undefined,
  },
  'tutor@scholarly.app': {
    id: 'user_tutor_1',
    email: 'tutor@scholarly.app',
    firstName: 'Sarah',
    lastName: 'Chen',
    role: 'tutor',
    avatarUrl: undefined,
  },
  'parent@scholarly.app': {
    id: 'user_parent_1',
    email: 'parent@scholarly.app',
    firstName: 'David',
    lastName: 'Smith',
    role: 'parent',
    avatarUrl: undefined,
  },
  'learner@scholarly.app': {
    id: 'user_learner_1',
    email: 'learner@scholarly.app',
    firstName: 'Emma',
    lastName: 'Smith',
    role: 'learner',
    avatarUrl: undefined,
  },
};

const DEMO_CHALLENGES: DesignChallenge[] = [
  {
    id: 'challenge_sustainability_1',
    title: 'Sustainable Campus Life',
    description: 'Design an innovative solution that promotes sustainability on your school campus. Identify a specific environmental problem and create a practical solution.',
    phases: ['empathize', 'define', 'ideate', 'prototype', 'iterate', 'pitch'],
    constraints: {
      budget: 'Under $500',
      timeline: '3-4 weeks',
      scope: 'Must involve 100+ students',
    },
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'challenge_wellness_1',
    title: 'Student Wellness Innovation',
    description: 'Design a solution that addresses mental health and wellness challenges faced by students. Create an accessible solution that improves wellbeing.',
    phases: ['empathize', 'define', 'ideate', 'prototype', 'iterate', 'pitch'],
    constraints: {
      privacy: 'Must protect student data',
      accessibility: 'Works for all students',
      cost: 'Free or low-cost',
    },
    createdAt: '2024-01-15T00:00:00Z',
  },
];

const DEMO_JOURNEYS: LearnerJourney[] = [
  {
    id: 'journey_emma_sustainability',
    challengeId: 'challenge_sustainability_1',
    userId: 'user_learner_1',
    currentPhase: 'prototype',
    problemStatement: {
      content: 'Students throw away 200+ plastic bottles daily, contributing to landfill waste.',
      aiValidationStatus: 'validated',
      validatedAt: '2024-01-10T00:00:00Z',
    },
    artifacts: [],
    status: 'in_progress',
    createdAt: '2024-01-05T00:00:00Z',
  },
];

const DEMO_PORTFOLIOS: ShowcasePortfolio[] = [
  {
    id: 'showcase_emma_ecosip',
    title: 'EcoSip: Sustainable Campus Innovation',
    customSlug: 'emma-ecosip-2024',
    fullUrl: 'https://portfolio.scholarly.ai/u/emma-ecosip-2024',
    isPublic: true,
    status: 'published',
    items: [],
    aiSkillTags: [
      { id: 'skill_1', name: 'User Research', category: 'Design', confidence: 0.85 },
      { id: 'skill_2', name: 'Rapid Prototyping', category: 'Design', confidence: 0.90 },
      { id: 'skill_3', name: 'Design Thinking', category: 'Process', confidence: 0.88 },
    ],
    aiExecutiveSummary: 'Through user research and iterative prototyping, I designed EcoSip - a gamified app encouraging students to use reusable water bottles.',
    guestbookEntries: [],
    analytics: { totalViews: 47, uniqueViews: 32, viewsByDate: [], viewsByLocation: [] },
    themeConfig: { primaryColor: '#22c55e' },
    createdAt: '2024-01-20T00:00:00Z',
  },
];

interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle both string errors and structured error objects from the API
        const rawError = data.error;
        const errorMessage = typeof rawError === 'string'
          ? rawError
          : rawError?.message || 'Request failed';

        return {
          success: false,
          error: errorMessage,
          details: data.details || rawError?.details,
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ==========================================================================
  // AUTH
  // ==========================================================================

  auth = {
    login: async (email: string, password: string): Promise<ApiResponse<{ user: User; accessToken: string }>> => {
      if (DEMO_MODE) {
        const user = DEMO_USERS[email as keyof typeof DEMO_USERS];
        if (user && password === 'demo123') {
          const accessToken = `demo_token_${user.id}_${Date.now()}`;
          this.currentDemoUser = user;
          return { success: true, data: { user, accessToken } };
        }
        return { success: false, error: 'Invalid credentials. Try: teacher@scholarly.app or learner@scholarly.app with password: demo123' };
      }
      return this.post<{ user: User; accessToken: string }>('/auth/login', { email, password });
    },

    register: async (data: RegisterData): Promise<ApiResponse<{ user: User; accessToken: string }>> => {
      if (DEMO_MODE) {
        const user: User = {
          id: `user_${Date.now()}`,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role || 'learner',
        };
        const accessToken = `demo_token_${user.id}_${Date.now()}`;
        this.currentDemoUser = user;
        return { success: true, data: { user, accessToken } };
      }
      return this.post<{ user: User; accessToken: string }>('/auth/register', data);
    },

    logout: async (): Promise<ApiResponse<void>> => {
      if (DEMO_MODE) {
        this.currentDemoUser = null;
        return { success: true, data: undefined };
      }
      return this.post('/auth/logout');
    },

    me: async (): Promise<ApiResponse<User>> => {
      if (DEMO_MODE && this.currentDemoUser) {
        return { success: true, data: this.currentDemoUser };
      }
      if (DEMO_MODE) {
        return { success: false, error: 'Not authenticated' };
      }
      return this.get<User>('/auth/me');
    },

    refresh: async (): Promise<ApiResponse<{ accessToken: string }>> => {
      if (DEMO_MODE && this.currentDemoUser) {
        return { success: true, data: { accessToken: `demo_token_${this.currentDemoUser.id}_${Date.now()}` } };
      }
      if (DEMO_MODE) {
        return { success: false, error: 'Not authenticated' };
      }
      return this.post<{ accessToken: string }>('/auth/refresh');
    },
  };

  private currentDemoUser: User | null = null;

  // ==========================================================================
  // DESIGN & PITCH AI
  // ==========================================================================

  designPitch = {
    // Challenges
    getChallenges: async (): Promise<ApiResponse<DesignChallenge[]>> => {
      if (DEMO_MODE) {
        return { success: true, data: DEMO_CHALLENGES };
      }
      return this.get<DesignChallenge[]>('/design-pitch/challenges');
    },

    getChallenge: async (id: string): Promise<ApiResponse<DesignChallenge>> => {
      if (DEMO_MODE) {
        const challenge = DEMO_CHALLENGES.find(c => c.id === id);
        if (challenge) return { success: true, data: challenge };
        return { success: false, error: 'Challenge not found' };
      }
      return this.get<DesignChallenge>(`/design-pitch/challenges/${id}`);
    },

    createChallenge: (data: CreateChallengeData) =>
      this.post<DesignChallenge>('/design-pitch/challenges', data),

    // Journeys
    getJourneys: async (): Promise<ApiResponse<LearnerJourney[]>> => {
      if (DEMO_MODE) {
        return { success: true, data: DEMO_JOURNEYS };
      }
      return this.get<LearnerJourney[]>('/design-pitch/journeys');
    },

    getJourney: async (id: string): Promise<ApiResponse<LearnerJourney>> => {
      if (DEMO_MODE) {
        const journey = DEMO_JOURNEYS.find(j => j.id === id);
        if (journey) return { success: true, data: journey };
        return { success: false, error: 'Journey not found' };
      }
      return this.get<LearnerJourney>(`/design-pitch/journeys/${id}`);
    },

    startJourney: (challengeId: string, data: StartJourneyData) =>
      this.post<LearnerJourney>(`/design-pitch/challenges/${challengeId}/journeys`, data),

    updateJourney: (id: string, data: UpdateJourneyData) =>
      this.put<LearnerJourney>(`/design-pitch/journeys/${id}`, data),

    // Problem Statement
    validateProblem: (journeyId: string, statement: string) =>
      this.post<AIValidation>(`/design-pitch/journeys/${journeyId}/problem/validate`, { statement }),

    // Artifacts
    getArtifacts: (journeyId: string) =>
      this.get<VersionedArtifact[]>(`/design-pitch/journeys/${journeyId}/artifacts`),

    createArtifact: (journeyId: string, data: CreateArtifactData) =>
      this.post<VersionedArtifact>(`/design-pitch/journeys/${journeyId}/artifacts`, data),

    // Peer Review
    submitReview: (artifactId: string, data: SubmitReviewData) =>
      this.post<PeerReview>(`/design-pitch/artifacts/${artifactId}/reviews`, data),

    getReviews: (artifactId: string) =>
      this.get<PeerReview[]>(`/design-pitch/artifacts/${artifactId}/reviews`),

    synthesizeFeedback: (artifactId: string) =>
      this.post<ReviewAISynthesis>(`/design-pitch/artifacts/${artifactId}/reviews/synthesize`),

    // Pitch Deck
    createPitchDeck: (journeyId: string, data: CreatePitchDeckData) =>
      this.post<PitchDeck>(`/design-pitch/journeys/${journeyId}/pitch-deck`, data),

    getPitchDeck: (journeyId: string) =>
      this.get<PitchDeck>(`/design-pitch/journeys/${journeyId}/pitch-deck`),

    updateSlide: (deckId: string, slideIndex: number, data: UpdateSlideData) =>
      this.put<PitchSlide>(`/design-pitch/pitch-decks/${deckId}/slides/${slideIndex}`, data),

    // AI Coaching
    getCoaching: (journeyId: string) =>
      this.get<CoachingSession>(`/design-pitch/journeys/${journeyId}/coaching`),

    generatePersonas: (journeyId: string) =>
      this.post<UserPersona[]>(`/design-pitch/journeys/${journeyId}/personas/generate`),
  };

  // ==========================================================================
  // SHOWCASE PORTFOLIO
  // ==========================================================================

  showcase = {
    // Portfolio CRUD
    getPortfolios: async (): Promise<ApiResponse<ShowcasePortfolio[]>> => {
      if (DEMO_MODE) {
        return { success: true, data: DEMO_PORTFOLIOS };
      }
      return this.get<ShowcasePortfolio[]>('/showcase');
    },

    getPortfolio: async (id: string): Promise<ApiResponse<ShowcasePortfolio>> => {
      if (DEMO_MODE) {
        const portfolio = DEMO_PORTFOLIOS.find(p => p.id === id);
        if (portfolio) return { success: true, data: portfolio };
        return { success: false, error: 'Portfolio not found' };
      }
      return this.get<ShowcasePortfolio>(`/showcase/${id}`);
    },

    createPortfolio: (data: CreateShowcaseData) =>
      this.post<ShowcasePortfolio>('/showcase', data),

    updatePortfolio: (id: string, data: UpdateShowcaseData) =>
      this.put<ShowcasePortfolio>(`/showcase/${id}`, data),

    publishPortfolio: (id: string, data: PublishSettings) =>
      this.post<ShowcasePortfolio>(`/showcase/${id}/publish`, data),

    // Items
    addItem: (portfolioId: string, data: AddItemData) =>
      this.post<ShowcaseItem>(`/showcase/${portfolioId}/items`, data),

    updateReflection: (portfolioId: string, itemId: string, data: ReflectionData) =>
      this.put<ShowcaseItem>(`/showcase/${portfolioId}/items/${itemId}/reflection`, data),

    getReflectionPrompt: (portfolioId: string, itemId: string) =>
      this.get<{ prompt: string; context: string }>(
        `/showcase/${portfolioId}/items/${itemId}/reflection-prompt`
      ),

    reorderItems: (portfolioId: string, itemOrder: string[]) =>
      this.put<ShowcaseItem[]>(`/showcase/${portfolioId}/items/reorder`, { itemOrder }),

    removeItem: (portfolioId: string, itemId: string) =>
      this.delete(`/showcase/${portfolioId}/items/${itemId}`),

    // AI Assistant
    generateSkillTags: (portfolioId: string) =>
      this.post<SkillTag[]>(`/showcase/${portfolioId}/ai/skill-tags`),

    generateSummary: (portfolioId: string) =>
      this.post<{ summary: string; growthNarrative: string }>(
        `/showcase/${portfolioId}/ai/executive-summary`
      ),

    getCurationSuggestions: (portfolioId: string) =>
      this.get<CurationSuggestion[]>(`/showcase/${portfolioId}/ai/curation-suggestions`),

    getGrowthAnalysis: (portfolioId: string) =>
      this.get<GrowthAnalysis>(`/showcase/${portfolioId}/ai/growth-analysis`),

    // Sharing
    generateAccessLink: (portfolioId: string, config: AccessLinkConfig) =>
      this.post<AccessLink>(`/showcase/${portfolioId}/access-links`, config),

    updateSlug: (portfolioId: string, slug: string) =>
      this.put<{ slug: string; fullUrl: string }>(`/showcase/${portfolioId}/slug`, { slug }),

    // Guestbook
    getGuestbook: (portfolioId: string) =>
      this.get<GuestbookEntry[]>(`/showcase/${portfolioId}/guestbook`),

    moderateEntry: (portfolioId: string, entryId: string, action: 'approve' | 'reject', reason?: string) =>
      this.put<GuestbookEntry>(`/showcase/${portfolioId}/guestbook/${entryId}/moderate`, { action, reason }),

    // Analytics
    getAnalytics: (portfolioId: string) =>
      this.get<PortfolioAnalytics>(`/showcase/${portfolioId}/analytics`),

    // SEO
    updateSEO: (portfolioId: string, settings: SEOSettings) =>
      this.put<SEOSettings>(`/showcase/${portfolioId}/seo`, settings),
  };

  // ==========================================================================
  // PUBLIC SHOWCASE (No Auth)
  // ==========================================================================

  publicShowcase = {
    getBySlug: (slug: string, password?: string) =>
      this.get<ShowcasePortfolio>(`/showcase/public/${slug}${password ? `?password=${password}` : ''}`),

    getGuestbook: (slug: string) =>
      this.get<GuestbookEntry[]>(`/showcase/public/${slug}/guestbook`),

    submitGuestbook: (slug: string, data: GuestbookEntryInput) =>
      this.post<GuestbookEntry>(`/showcase/public/${slug}/guestbook`, data),

    trackView: (slug: string, data: ViewTrackingData) =>
      this.post(`/showcase/public/${slug}/track`, data),
  };

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  dashboard = {
    getSummary: async (): Promise<ApiResponse<DashboardSummary>> => {
      if (DEMO_MODE) {
        return { success: true, data: DEMO_DASHBOARD_SUMMARY };
      }
      return this.get<DashboardSummary>('/dashboard/summary');
    },
    getActivity: async (limit = 10): Promise<ApiResponse<{ activities: DashboardActivity[] }>> => {
      if (DEMO_MODE) {
        return { success: true, data: { activities: [] } };
      }
      return this.get<{ activities: DashboardActivity[] }>(`/dashboard/activity?limit=${limit}`);
    },
    getNotifications: async (status?: string): Promise<ApiResponse<{ notifications: DashboardNotification[]; unreadCount: number }>> => {
      if (DEMO_MODE) {
        return { success: true, data: { notifications: [], unreadCount: 0 } };
      }
      return this.get<{ notifications: DashboardNotification[]; unreadCount: number }>(`/dashboard/notifications${status ? `?status=${status}` : ''}`);
    },
    getQuickStats: async (): Promise<ApiResponse<{ stats: QuickStats }>> => {
      if (DEMO_MODE) {
        return { success: true, data: { stats: { activeTutors: 3, publishedContent: 12, todayBookings: 5, activeFamilies: 8 } } };
      }
      return this.get<{ stats: QuickStats }>('/dashboard/quick-stats');
    },
  };

  // ==========================================================================
  // AI BUDDY
  // ==========================================================================

  aiBuddy = {
    chat: async (message: string, context?: { conversationId?: string; yearLevel?: string; subjects?: string[]; currentTopic?: string; persona?: string }): Promise<ApiResponse<AiBuddyChatResponse>> => {
      if (DEMO_MODE) {
        return {
          success: true,
          data: {
            conversationId: 'demo_conv_1',
            message: {
              id: `msg_${Date.now()}`,
              role: 'assistant',
              content: 'I\'m your AI learning buddy! In demo mode, I can\'t provide real AI responses, but in a live environment I\'d help you with your studies using personalised, curriculum-aligned guidance. Try logging in with a real account to chat with me!',
              timestamp: new Date().toISOString(),
            },
          },
        };
      }
      return this.post<AiBuddyChatResponse>('/ai-buddy/chat', { message, context });
    },
    getConversations: async (): Promise<ApiResponse<AiBuddyConversation[]>> => {
      if (DEMO_MODE) {
        return { success: true, data: [] };
      }
      return this.get<AiBuddyConversation[]>('/ai-buddy/conversations');
    },
    getConversation: async (id: string): Promise<ApiResponse<AiBuddyConversation>> => {
      if (DEMO_MODE) {
        return { success: false, error: 'Not available in demo mode' };
      }
      return this.get<AiBuddyConversation>(`/ai-buddy/conversations/${id}`);
    },
  };

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  search = {
    users: async (query: string, filters?: { role?: string }): Promise<ApiResponse<SearchUsersResult>> => {
      if (DEMO_MODE) {
        const q = query.toLowerCase();
        const demoResults = Object.values(DEMO_USERS).filter(u =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
        return { success: true, data: { users: demoResults, total: demoResults.length } };
      }
      const params = new URLSearchParams({ search: query });
      if (filters?.role) params.set('role', filters.role);
      return this.get<SearchUsersResult>(`/users?${params}`);
    },
    content: async (query: string, filters?: { type?: string; subject?: string; yearLevel?: string }): Promise<ApiResponse<SearchContentResult>> => {
      if (DEMO_MODE) {
        const q = query.toLowerCase();
        const demoContent = DEMO_CONTENT_ITEMS.filter(c =>
          c.title.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q)
        );
        return { success: true, data: { content: demoContent, total: demoContent.length } };
      }
      const params = new URLSearchParams({ search: query });
      if (filters?.type) params.set('type', filters.type);
      if (filters?.subject) params.set('subject', filters.subject);
      if (filters?.yearLevel) params.set('yearLevel', filters.yearLevel);
      return this.get<SearchContentResult>(`/content?${params}`);
    },
    tutors: async (filters: { subject?: string; yearLevel?: string; maxPrice?: number; minRating?: number; search?: string }): Promise<ApiResponse<SearchTutorsResult>> => {
      if (DEMO_MODE) {
        return { success: true, data: { tutors: DEMO_TUTOR_PROFILES, total: DEMO_TUTOR_PROFILES.length } };
      }
      const params = new URLSearchParams();
      if (filters.subject) params.set('subject', filters.subject);
      if (filters.yearLevel) params.set('yearLevel', filters.yearLevel);
      if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
      if (filters.minRating) params.set('minRating', String(filters.minRating));
      if (filters.search) params.set('search', filters.search);
      return this.get<SearchTutorsResult>(`/tutors/search?${params}`);
    },
  };

  // ==========================================================================
  // ANALYTICS & DATA
  // ==========================================================================

  analytics = {
    getDashboard: (persona: string) =>
      this.get<DashboardData>(`/analytics/dashboard/${persona}`),

    getReports: () =>
      this.get<Report[]>('/analytics/reports'),

    generateReport: (type: string, params: ReportParams) =>
      this.post<GeneratedReport>('/analytics/reports/generate', { type, params }),
  };

  // ==========================================================================
  // ML PIPELINE
  // ==========================================================================

  ml = {
    getPredictions: (studentId: string) =>
      this.get<StudentPredictions>(`/ml/predictions/${studentId}`),

    getRecommendations: (studentId: string) =>
      this.get<LearningPathRecommendation[]>(`/ml/recommendations/${studentId}`),
  };
}

export const api = new ApiClient(API_BASE_URL);

// ==========================================================================
// TYPES
// ==========================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  roles?: string[];
  displayName?: string;
  avatarUrl?: string;
  permissions?: string[];
  groups?: string[];
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

// Design & Pitch Types
export interface DesignChallenge {
  id: string;
  title: string;
  description: string;
  phases: string[];
  constraints: object;
  createdAt: string;
}

export interface LearnerJourney {
  id: string;
  challengeId: string;
  userId: string;
  currentPhase: string;
  problemStatement?: ProblemStatement;
  artifacts: VersionedArtifact[];
  pitchDeck?: PitchDeck;
  status: string;
  createdAt: string;
}

export interface ProblemStatement {
  content: string;
  aiValidationStatus: string;
  validatedAt?: string;
}

export interface AIValidation {
  status: string;
  issues: Array<{ type: string; message: string }>;
  suggestions: string[];
}

export interface VersionedArtifact {
  id: string;
  title: string;
  type: string;
  versions: Array<{ version: number; content: string; createdAt: string }>;
  currentVersion: number;
}

export interface PeerReview {
  id: string;
  artifactId: string;
  reviewerId: string;
  feedbackText: string;
  pins: Array<{ x: number; y: number; comment: string }>;
  status: string;
}

export interface ReviewAISynthesis {
  growthAreas: Array<{ area: string; feedback: string; priority: string }>;
  summary: string;
}

export interface PitchDeck {
  id: string;
  journeyId: string;
  slides: PitchSlide[];
  status: string;
}

export interface PitchSlide {
  index: number;
  type: string;
  title: string;
  content: object;
}

export interface UserPersona {
  id: string;
  name: string;
  demographics: object;
  goals: string[];
  painPoints: string[];
}

export interface CoachingSession {
  questions: string[];
  insights: string[];
}

// Showcase Types
export interface ShowcasePortfolio {
  id: string;
  title: string;
  customSlug: string;
  fullUrl: string;
  isPublic: boolean;
  status: string;
  items: ShowcaseItem[];
  aiSkillTags: SkillTag[];
  aiExecutiveSummary?: string;
  guestbookEntries: GuestbookEntry[];
  analytics: PortfolioAnalytics;
  themeConfig: object;
  createdAt: string;
}

export interface ShowcaseItem {
  id: string;
  artifactId: string;
  displayOrder: number;
  isFeatured: boolean;
  reflection: { content: string; wordCount: number };
  journeyPhase: string;
}

export interface SkillTag {
  id: string;
  name: string;
  category: string;
  confidence: number;
}

export interface GuestbookEntry {
  id: string;
  guestName: string;
  message: string;
  rating?: number;
  status: string;
  submittedAt: string;
}

export interface PortfolioAnalytics {
  totalViews: number;
  uniqueViews: number;
  viewsByDate: Array<{ date: string; views: number }>;
  viewsByLocation: Array<{ location: string; views: number }>;
}

export interface CurationSuggestion {
  artifactId: string;
  artifactTitle: string;
  suggestedReason: string;
  confidence: number;
}

export interface GrowthAnalysis {
  overallGrowthScore: number;
  growthAreas: Array<{ area: string; growthPercentage: number }>;
  strengthsIdentified: string[];
}

export interface AccessLink {
  id: string;
  token: string;
  type: string;
  expiresAt?: string;
}

export interface SEOSettings {
  metaTitle?: string;
  metaDescription?: string;
  noIndex: boolean;
  keywords: string[];
}

// Input Types
export interface CreateChallengeData {
  title: string;
  description: string;
  constraints?: object;
}

export interface StartJourneyData {
  learningGoals: string[];
}

export interface UpdateJourneyData {
  problemStatement?: string;
  currentPhase?: string;
}

export interface CreateArtifactData {
  title: string;
  type: string;
  content: string;
}

export interface SubmitReviewData {
  feedbackText: string;
  pins?: Array<{ x: number; y: number; comment: string }>;
}

export interface CreatePitchDeckData {
  title?: string;
}

export interface UpdateSlideData {
  title?: string;
  content?: object;
}

export interface CreateShowcaseData {
  journeyId: string;
  title: string;
  headline?: string;
  preferredSlug?: string;
}

export interface UpdateShowcaseData {
  title?: string;
  headline?: string;
  themeConfig?: object;
  guestbookEnabled?: boolean;
}

export interface PublishSettings {
  isPublic: boolean;
  password?: string;
  expiresAt?: string;
  allowIndexing?: boolean;
}

export interface AddItemData {
  artifactId: string;
  version?: number;
  isFeatured?: boolean;
}

export interface ReflectionData {
  content: string;
  sentiment?: string;
  learningOutcomes?: string[];
  keyTakeaways?: string[];
}

export interface AccessLinkConfig {
  type: 'public' | 'password' | 'email' | 'time_limited';
  password?: string;
  allowedEmails?: string[];
  expiresAt?: string;
}

export interface GuestbookEntryInput {
  name: string;
  email?: string;
  organization?: string;
  message: string;
  rating?: number;
}

export interface ViewTrackingData {
  source?: string;
  referrer?: string;
  itemsViewed?: string[];
}

// Analytics Types
export interface DashboardData {
  widgets: object[];
  insights: object[];
}

export interface Report {
  id: string;
  type: string;
  status: string;
}

export interface ReportParams {
  dateRange?: { start: string; end: string };
  filters?: object;
}

export interface GeneratedReport {
  id: string;
  data: object;
}

export interface StudentPredictions {
  riskLevel: string;
  predictedPerformance: number;
  engagementScore: number;
}

export interface LearningPathRecommendation {
  pathId: string;
  title: string;
  relevance: number;
}

// ==========================================================================
// DASHBOARD TYPES
// ==========================================================================

export interface DashboardSummary {
  user: {
    id: string;
    roles: string[];
    tokenBalance: number;
    trustScore: number;
  };
  upcomingSessions?: Array<{
    id: string;
    scheduledStart: string;
    status: string;
    tutorUser?: { displayName: string; avatarUrl?: string };
  }>;
  recentPurchases?: Array<{
    id: string;
    content: { id: string; title: string; type: string; thumbnailUrl?: string };
    purchasedAt: string;
  }>;
  tutorStats?: Record<string, unknown>;
  pendingBookings?: number;
  monthlyEarnings?: number;
  creatorStats?: {
    totalContent: number;
    totalSales: number;
    totalDownloads: number;
    averageRating: number;
    totalEarnings: number;
    level: string;
  };
  platformStats?: {
    userCount: number;
    tutorCount: number;
    contentCount: number;
    bookingCount: number;
  };
  homeschool?: {
    childrenCount: number;
    coopsJoined: number;
    compliance: unknown;
  };
  schools?: Array<{
    id: string;
    name: string;
    status: string;
    studentCount: number;
    staffCount: number;
    pendingApplications: number;
  }>;
}

export interface DashboardActivity {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface DashboardNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  inAppStatus: string;
  createdAt: string;
}

export interface QuickStats {
  activeTutors: number;
  publishedContent: number;
  todayBookings: number;
  activeFamilies: number;
}

// ==========================================================================
// AI BUDDY TYPES
// ==========================================================================

export interface AiBuddyChatResponse {
  conversationId: string;
  message: {
    id: string;
    role: string;
    content: string;
    timestamp: string;
  };
}

export interface AiBuddyConversation {
  id: string;
  title: string;
  status: string;
  messages: Array<{ id: string; role: string; content: string; timestamp: string }>;
  createdAt: string;
}

// ==========================================================================
// SEARCH TYPES
// ==========================================================================

export interface SearchUsersResult {
  users: Array<{ id: string; email: string; firstName: string; lastName: string; role?: string; avatarUrl?: string }>;
  total: number;
}

export interface SearchContentResult {
  content: Array<{ id: string; title: string; type: string; subject: string; yearLevel?: string; thumbnailUrl?: string }>;
  total: number;
}

export interface TutorSearchProfile {
  id: string;
  name: string;
  bio: string;
  subjects: string[];
  yearLevels: string[];
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  sessionsCompleted: number;
  responseTime: string;
  availability: string;
  location?: string;
  languages: string[];
  verified: boolean;
  avatarUrl?: string;
}

export interface SearchTutorsResult {
  tutors: TutorSearchProfile[];
  total: number;
}

// ==========================================================================
// DEMO DATA — Search & Dashboard
// ==========================================================================

const DEMO_CONTENT_ITEMS = [
  { id: 'content_1', title: 'Mastering Fractions', type: 'lesson', subject: 'Mathematics', yearLevel: 'Year 5' },
  { id: 'content_2', title: 'Introduction to Algebra', type: 'lesson', subject: 'Mathematics', yearLevel: 'Year 7' },
  { id: 'content_3', title: 'Creative Writing Workshop', type: 'course', subject: 'English', yearLevel: 'Year 8' },
  { id: 'content_4', title: 'The Scientific Method', type: 'lesson', subject: 'Science', yearLevel: 'Year 6' },
  { id: 'content_5', title: 'Australian History: First Peoples', type: 'course', subject: 'History', yearLevel: 'Year 9' },
];

const DEMO_TUTOR_PROFILES: TutorSearchProfile[] = [
  {
    id: 'tutor_sarah',
    name: 'Sarah Chen',
    bio: 'Experienced mathematics tutor specializing in making complex concepts simple and engaging.',
    subjects: ['Mathematics', 'Physics'],
    yearLevels: ['Year 7-12'],
    rating: 4.8,
    reviewCount: 89,
    hourlyRate: 65,
    sessionsCompleted: 234,
    responseTime: '< 1 hour',
    availability: 'Weekday afternoons, Saturdays',
    location: 'Sydney, NSW',
    languages: ['English', 'Mandarin'],
    verified: true,
  },
  {
    id: 'tutor_michael',
    name: 'Michael Torres',
    bio: 'Physics teacher with 10+ years of experience. Passionate about helping students achieve their goals.',
    subjects: ['Physics', 'Chemistry'],
    yearLevels: ['Year 10-12'],
    rating: 4.9,
    reviewCount: 67,
    hourlyRate: 70,
    sessionsCompleted: 189,
    responseTime: '< 2 hours',
    availability: 'Evenings, Weekends',
    location: 'Melbourne, VIC',
    languages: ['English'],
    verified: true,
  },
  {
    id: 'tutor_emily',
    name: 'Emily Watson',
    bio: 'English literature specialist with a focus on essay writing and critical analysis skills.',
    subjects: ['English', 'Literature'],
    yearLevels: ['Year 9-12'],
    rating: 4.7,
    reviewCount: 54,
    hourlyRate: 60,
    sessionsCompleted: 156,
    responseTime: '< 3 hours',
    availability: 'Flexible',
    location: 'Brisbane, QLD',
    languages: ['English'],
    verified: true,
  },
];

const DEMO_DASHBOARD_SUMMARY: DashboardSummary = {
  user: { id: 'user_admin_1', roles: ['platform_admin'], tokenBalance: 0, trustScore: 100 },
  platformStats: { userCount: 5, tutorCount: 1, contentCount: 12, bookingCount: 3 },
};

export default api;
