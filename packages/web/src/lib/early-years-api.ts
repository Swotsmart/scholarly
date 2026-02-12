/**
 * Early Years API Client
 * Handles all API interactions for the Little Explorers module
 */

import type {
  Family,
  Child,
  ChildDashboard,
  LearningSession,
  Activity,
  PhonicsProgress,
  ParentDashboard,
  LearningWorld,
  Mentor,
  SessionType,
  PicturePasswordAttempt,
  Achievement,
  WeeklyReport,
  ChildSummary,
} from '@/types/early-years';

// Demo mode - set to false when connecting to real API
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// DEMO DATA
// =============================================================================

const demoChildren: Child[] = [
  {
    id: 'eychild_lily',
    familyId: 'eyfamily_smith',
    firstName: 'Lily',
    preferredName: 'Lily',
    dateOfBirth: '2019-08-20',
    avatarId: 'bunny_pink',
    currentWorld: 'phonics_forest',
    currentMentor: 'ollie_owl',
    hasPicturePassword: true,
    totalStars: 128,
    currentStreak: 3,
    longestStreak: 7,
    level: 5,
    xp: 1250,
    createdAt: '2024-06-01T10:00:00Z',
  },
];

const demoFamily: Family = {
  id: 'eyfamily_smith',
  tenantId: 'scholarly-demo',
  familyName: 'Smith Family',
  primaryLanguage: 'en',
  homeLanguages: ['en'],
  timezone: 'Australia/Sydney',
  dataProcessingConsent: true,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-20T14:30:00Z',
  children: demoChildren,
  members: [
    {
      id: 'member-1',
      familyId: 'eyfamily_smith',
      userId: 'user-parent-1',
      role: 'primary_guardian',
      relationship: 'Father',
      canManageChildren: true,
      canViewProgress: true,
      user: {
        id: 'user-parent-1',
        email: 'parent@scholarly.app',
        firstName: 'David',
        lastName: 'Smith',
      },
    },
  ],
};

const demoAchievements: Achievement[] = [
  {
    id: 'ach-1',
    name: 'First Steps',
    description: 'Completed your first learning session',
    icon: '🎉',
    earnedAt: '2024-01-16T10:30:00Z',
    category: 'consistency',
    rarity: 'common',
  },
  {
    id: 'ach-2',
    name: 'Letter Master',
    description: 'Learned all Phase 2 letter sounds',
    icon: '📚',
    earnedAt: '2024-01-25T15:20:00Z',
    category: 'phonics',
    rarity: 'rare',
  },
  {
    id: 'ach-3',
    name: 'Star Collector',
    description: 'Earned 100 stars',
    icon: '⭐',
    earnedAt: '2024-02-01T11:00:00Z',
    category: 'consistency',
    rarity: 'rare',
  },
  {
    id: 'ach-4',
    name: 'Number Ninja',
    description: 'Mastered counting to 20',
    icon: '🔢',
    earnedAt: '2024-02-05T09:45:00Z',
    category: 'numeracy',
    rarity: 'common',
  },
  {
    id: 'ach-5',
    name: 'Week Warrior',
    description: 'Completed sessions 7 days in a row',
    icon: '🏆',
    earnedAt: '2024-02-10T16:30:00Z',
    category: 'consistency',
    rarity: 'epic',
  },
];

const demoChildDashboard: ChildDashboard = {
  child: demoChildren[0],
  recentSessions: [
    {
      id: 'eysession_lily_recent',
      childId: 'eychild_lily',
      world: 'phonics_forest',
      mentor: 'ollie_owl',
      sessionType: 'learning',
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      endedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 12 * 60 * 1000).toISOString(),
      activitiesCompleted: 5,
      starsEarned: 8,
      xpEarned: 65,
      status: 'completed',
    },
    {
      id: 'session-2',
      childId: 'eychild_lily',
      world: 'number_land',
      mentor: 'penny_penguin',
      sessionType: 'practice',
      startedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      endedAt: new Date(Date.now() - 26 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      activitiesCompleted: 4,
      starsEarned: 6,
      xpEarned: 45,
      status: 'completed',
    },
  ],
  phonicsProgress: {
    currentPhase: 2,
    phaseName: 'Initial Letter Sounds',
    graphemesLearned: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd'],
    graphemesInProgress: ['g', 'o', 'c', 'k'],
    totalGraphemes: 19,
    accuracy: 75,
    readyToAdvance: false,
  },
  numeracyProgress: {
    currentStage: 'Counting',
    conceptsMastered: ['Number recognition 1-10', 'Counting objects to 15'],
    conceptsInProgress: ['Number recognition 11-20', 'Simple addition to 5'],
    accuracy: 72,
    numberRecognition: 85,
    counting: 90,
    operations: 45,
  },
  achievements: demoAchievements.slice(0, 3),
  weeklyGoal: {
    targetSessions: 5,
    completedSessions: 3,
    targetMinutes: 60,
    completedMinutes: 42,
    targetStars: 30,
    earnedStars: 22,
    streakDays: 3,
  },
  recommendedActivities: [
    {
      world: 'phonics_forest',
      activityType: 'letter_recognition',
      reason: 'Practice the "g" and "o" sounds you\'re learning',
      difficulty: 1,
      estimatedMinutes: 8,
    },
    {
      world: 'number_land',
      activityType: 'counting_adventure',
      reason: 'Keep building those counting skills!',
      difficulty: 1,
      estimatedMinutes: 8,
    },
  ],
};

const demoParentDashboard: ParentDashboard = {
  family: demoFamily,
  childrenSummary: [
    {
      child: demoChildren[0],
      thisWeekMinutes: 42,
      thisWeekSessions: 3,
      phonicsPhase: 2,
      numeracyStage: 'Counting',
      recentAchievements: demoAchievements.slice(0, 2),
      mood: 'happy',
      engagementTrend: 'up',
    },
  ],
  weeklyReport: {
    totalMinutes: 42,
    totalSessions: 3,
    totalStarsEarned: 22,
    phonicsProgress: 42,
    numeracyProgress: 35,
    strongAreas: ['Letter recognition (s, a, t, p)', 'Counting to 15'],
    areasForGrowth: ['Blending sounds', 'Addition basics'],
    comparedToLastWeek: {
      minutesChange: 8,
      sessionsChange: 1,
      progressChange: 5,
    },
  },
  recommendations: [
    {
      type: 'celebration',
      title: 'Lily is doing great!',
      description: 'She\'s mastered 8 graphemes in Phase 2. Keep up the great work!',
      priority: 'high',
    },
    {
      type: 'activity',
      title: 'Practice "ck" sound',
      description: 'Lily is struggling with the "ck" digraph. Try the Phonics Forest activity.',
      actionUrl: '/early-years',
      priority: 'medium',
    },
    {
      type: 'offline_activity',
      title: 'Count objects together',
      description: 'Practice counting everyday objects to 20 to reinforce numeracy skills.',
      priority: 'medium',
    },
  ],
  upcomingMilestones: [
    {
      id: 'milestone-1',
      childId: 'eychild_lily',
      childName: 'Lily',
      title: 'Complete Phase 2 Phonics',
      description: 'Master all 19 initial letter sounds',
      expectedDate: '2024-03-15',
      category: 'phonics',
      progress: 42,
    },
    {
      id: 'milestone-2',
      childId: 'eychild_lily',
      childName: 'Lily',
      title: 'Count to 20 reliably',
      description: 'Recognize and count numbers 1-20 consistently',
      expectedDate: '2024-03-01',
      category: 'numeracy',
      progress: 75,
    },
  ],
};

// Valid picture password for demo: rabbit -> star -> rainbow
const demoPicturePassword = ['rabbit', 'star', 'rainbow'];

// =============================================================================
// API CLIENT
// =============================================================================

class EarlyYearsApiClient {
  private baseUrl: string;
  private demoMode: boolean;

  constructor() {
    this.baseUrl = `${API_BASE}/early-years`;
    this.demoMode = DEMO_MODE;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ===========================================================================
  // FAMILY MANAGEMENT
  // ===========================================================================

  async createFamily(data: {
    familyName?: string;
    primaryLanguage?: string;
    homeLanguages?: string[];
    timezone?: string;
    dataProcessingConsent: boolean;
  }): Promise<{ family: Family }> {
    if (this.demoMode) {
      return { family: { ...demoFamily, ...data } };
    }
    return this.request('POST', '/families', data);
  }

  async getMyFamily(): Promise<Family> {
    if (this.demoMode) {
      return demoFamily;
    }
    return this.request('GET', '/families/me');
  }

  async getFamily(familyId: string): Promise<{ family: Family }> {
    if (this.demoMode) {
      return { family: demoFamily };
    }
    return this.request('GET', `/families/${familyId}`);
  }

  // ===========================================================================
  // CHILD MANAGEMENT
  // ===========================================================================

  async enrollChild(
    familyId: string,
    data: {
      firstName: string;
      preferredName?: string;
      dateOfBirth: string;
      avatarId?: string;
    }
  ): Promise<{ child: Child }> {
    if (this.demoMode) {
      const newChild: Child = {
        id: `child-${Date.now()}`,
        familyId,
        firstName: data.firstName,
        preferredName: data.preferredName,
        dateOfBirth: data.dateOfBirth,
        avatarId: data.avatarId || 'avatar-default',
        hasPicturePassword: false,
        totalStars: 0,
        currentStreak: 0,
        longestStreak: 0,
        level: 1,
        xp: 0,
        createdAt: new Date().toISOString(),
      };
      return { child: newChild };
    }
    return this.request('POST', `/families/${familyId}/children`, data);
  }

  async getChildDashboard(childId: string): Promise<{ dashboard: ChildDashboard }> {
    if (this.demoMode) {
      const child = demoChildren.find(c => c.id === childId) || demoChildren[0];
      return {
        dashboard: {
          ...demoChildDashboard,
          child,
        },
      };
    }
    return this.request('GET', `/children/${childId}`);
  }

  async getChildren(familyId: string): Promise<{ children: Child[] }> {
    if (this.demoMode) {
      return { children: demoChildren.filter(c => c.familyId === familyId) };
    }
    return this.request('GET', `/families/${familyId}/children`);
  }

  // ===========================================================================
  // PICTURE PASSWORD
  // ===========================================================================

  async setupPicturePassword(
    childId: string,
    imageSequence: string[]
  ): Promise<{ success: boolean; message: string }> {
    if (this.demoMode) {
      return { success: true, message: 'Picture password set successfully!' };
    }
    return this.request('POST', `/children/${childId}/picture-password`, {
      imageSequence,
    });
  }

  async verifyPicturePassword(
    childId: string,
    imageSequence: string[]
  ): Promise<PicturePasswordAttempt> {
    if (this.demoMode) {
      // Check against demo password
      const isCorrect =
        imageSequence.length === demoPicturePassword.length &&
        imageSequence.every((img, i) => img === demoPicturePassword[i]);

      if (isCorrect) {
        return {
          success: true,
          childToken: 'demo-child-token-' + childId,
        };
      }
      return {
        success: false,
        remainingAttempts: 2,
      };
    }
    return this.request('POST', `/children/${childId}/picture-password/verify`, {
      imageSequence,
    });
  }

  // ===========================================================================
  // LEARNING SESSIONS
  // ===========================================================================

  async startSession(
    childId: string,
    data: {
      world: LearningWorld;
      mentor: Mentor;
      sessionType?: SessionType;
    }
  ): Promise<{ session: LearningSession }> {
    if (this.demoMode) {
      const session: LearningSession = {
        id: `session-${Date.now()}`,
        childId,
        world: data.world,
        mentor: data.mentor,
        sessionType: data.sessionType || 'learning',
        startedAt: new Date().toISOString(),
        activitiesCompleted: 0,
        starsEarned: 0,
        xpEarned: 0,
        status: 'active',
      };
      return { session };
    }
    return this.request('POST', `/children/${childId}/sessions`, data);
  }

  async recordActivity(
    sessionId: string,
    data: {
      activityType: string;
      targetContent?: string[];
      difficulty?: number;
      score: number;
      durationSeconds: number;
      attempts?: number;
      hintsUsed?: number;
      errorsCommitted?: number;
      responseData?: Record<string, unknown>;
    }
  ): Promise<{ activity: Activity }> {
    if (this.demoMode) {
      const starsEarned = Math.floor(data.score * 3);
      const activity: Activity = {
        id: `activity-${Date.now()}`,
        sessionId,
        activityType: data.activityType,
        targetContent: data.targetContent || [],
        difficulty: data.difficulty || 1,
        score: data.score,
        durationSeconds: data.durationSeconds,
        attempts: data.attempts || 1,
        hintsUsed: data.hintsUsed || 0,
        errorsCommitted: data.errorsCommitted || 0,
        starsEarned,
        completedAt: new Date().toISOString(),
      };
      return { activity };
    }
    return this.request('POST', `/sessions/${sessionId}/activities`, data);
  }

  async endSession(
    sessionId: string,
    data?: {
      completedNaturally?: boolean;
      childMoodRating?: number;
      parentNotes?: string;
    }
  ): Promise<{ session: LearningSession }> {
    if (this.demoMode) {
      const session: LearningSession = {
        id: sessionId,
        childId: 'child-1',
        world: 'phonics_forest',
        mentor: 'ollie_owl',
        sessionType: 'learning',
        startedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        activitiesCompleted: 6,
        starsEarned: 15,
        xpEarned: 95,
        status: 'completed',
      };
      return { session };
    }
    return this.request('POST', `/sessions/${sessionId}/end`, data);
  }

  // ===========================================================================
  // PROGRESS & PHONICS
  // ===========================================================================

  async getPhonicsProgress(childId: string): Promise<{ phonicsProgress: PhonicsProgress }> {
    if (this.demoMode) {
      return { phonicsProgress: demoChildDashboard.phonicsProgress };
    }
    return this.request('GET', `/children/${childId}/phonics`);
  }

  async advancePhonicsPhase(childId: string): Promise<{ phonicsProgress: PhonicsProgress }> {
    if (this.demoMode) {
      return {
        phonicsProgress: {
          ...demoChildDashboard.phonicsProgress,
          currentPhase: demoChildDashboard.phonicsProgress.currentPhase + 1,
        },
      };
    }
    return this.request('POST', `/children/${childId}/phonics/advance`);
  }

  // ===========================================================================
  // PARENT DASHBOARD
  // ===========================================================================

  async getParentDashboard(): Promise<ParentDashboard> {
    if (this.demoMode) {
      return demoParentDashboard;
    }
    return this.request('GET', '/parent/dashboard');
  }

  async getWeeklyReport(familyId: string): Promise<{ report: WeeklyReport }> {
    if (this.demoMode) {
      return { report: demoParentDashboard.weeklyReport };
    }
    return this.request('GET', `/families/${familyId}/weekly-report`);
  }

  async getChildSummary(childId: string): Promise<{ summary: ChildSummary }> {
    if (this.demoMode) {
      const summary = demoParentDashboard.childrenSummary.find(
        s => s.child.id === childId
      );
      return { summary: summary || demoParentDashboard.childrenSummary[0] };
    }
    return this.request('GET', `/children/${childId}/summary`);
  }

  async getAchievements(childId: string): Promise<{ achievements: Achievement[] }> {
    if (this.demoMode) {
      return { achievements: demoAchievements };
    }
    return this.request('GET', `/children/${childId}/achievements`);
  }
}

export const earlyYearsApi = new EarlyYearsApiClient();
