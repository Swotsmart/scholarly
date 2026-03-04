/**
 * Parent Module Type Definitions
 *
 * Types derived from the actual backend responses in:
 *   packages/api/src/routes/parent-portal.ts (868L, 6 endpoints)
 *   packages/api/src/routes/subscriptions.ts (1,144L)
 *   packages/api/src/routes/tutors.ts (302L)
 *
 * Backend mount: /api/v1/parent/* (parent-portal.ts)
 * Related mounts: /api/v1/subscriptions/*, /api/v1/tutors/*
 */

// =============================================================================
// CHILD PROGRESS — GET /parent/:learnerId/progress
// =============================================================================

export interface PhonicsProgress {
  currentPhase: number;
  masteredGraphemes: string[];
  introducedGraphemes: string[];
  strugglingGraphemes: string[];
  blendingAccuracy: number;
  segmentingAccuracy: number;
  sightWordsMastered: string[];
}

export interface NumeracyProgress {
  currentLevel: number;
  subitizingAccuracy: number;
  additionAccuracy: number;
  subtractionAccuracy: number;
  shapesKnown: string[];
  reliableCountingRange: number;
}

export interface WeeklyProgress {
  minutesLearned: number;
  starsEarned: number;
  activitiesCompleted: number;
  sessionsCount: number;
}

export interface ChildProgress {
  learnerId: string;
  firstName: string;
  currentWorld: string;
  currentPhase: number;
  masteryLevel: 'Beginning' | 'Emerging' | 'Developing' | 'Mastering';
  readingStreak: number;
  totalBooksRead: number;
  totalStars: number;
  totalLearningMinutes: number;
  totalSessions: number;
  phonicsProgress: PhonicsProgress | null;
  numeracyProgress: NumeracyProgress | null;
  weeklyProgress: WeeklyProgress;
}

// =============================================================================
// ACTIVITY FEED — GET /parent/:learnerId/activity-feed
// =============================================================================

export interface SessionActivity {
  id: string;
  activityType: string;
  targetContent: string;
  difficulty: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number;
  score: number;
  attempts: number;
  hintsUsed: number;
  treasureAwarded: boolean;
}

export interface ActivitySession {
  sessionId: string;
  sessionType: string;
  world: string;
  mentor: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  activitiesCompleted: number;
  totalActivities: number;
  graphemesPracticed: string[];
  numbersPracticed: number[];
  treasuresEarned: number;
  starsEarned: number;
  averageFocusScore: number | null;
  childMoodRating: number | null;
  parentNotes: string | null;
  activities: SessionActivity[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ActivityFeedResponse {
  activities: ActivitySession[];
  pagination: Pagination;
}

// =============================================================================
// HOME ACTIVITIES — GET /parent/:learnerId/home-activities
// =============================================================================

export interface HomeActivity {
  category: string;
  title: string;
  description: string;
  difficulty: string;
  targetSkills: string[];
}

export interface HomeActivitiesResponse {
  learnerId: string;
  recommended: HomeActivity[];
  categories: string[];
}

// =============================================================================
// FAMILY PROFILE — GET /parent/family-profile
// =============================================================================

export interface FamilyChildPhonics {
  currentPhase: number;
  masteredGraphemes: number;
  blendingAccuracy: number;
  segmentingAccuracy: number;
  sightWordsMastered: number;
}

export interface FamilyChildNumeracy {
  currentLevel: number;
  subitizingAccuracy: number;
  additionAccuracy: number;
  subtractionAccuracy: number;
  shapesKnown: number;
}

export interface FamilyChild {
  id: string;
  firstName: string;
  preferredName: string | null;
  dateOfBirth: string;
  avatarId: string | null;
  currentWorld: string;
  currentMentor: string;
  totalStars: number;
  totalTreasures: number;
  totalLearningMinutes: number;
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveAt: string | null;
  phonicsProgress: FamilyChildPhonics | null;
  numeracyProgress: FamilyChildNumeracy | null;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  digestEnabled: boolean;
  digestFrequency: string | null;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
}

export interface FamilyProfile {
  familyId: string;
  familyName: string;
  primaryLanguage: string;
  homeLanguages: string[];
  timezone: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  totalLearningMinutes: number;
  lastActiveAt: string | null;
  children: FamilyChild[];
  preferences: NotificationPreferences;
}

// =============================================================================
// DAILY DIGEST — GET /parent/daily-digest
// =============================================================================

export interface ChildDigestStats {
  sessionsCount: number;
  totalMinutes: number;
  starsEarned: number;
  treasuresEarned: number;
  activitiesCompleted: number;
  graphemesPracticed: string[];
  numbersPracticed: number[];
  activityTypes: string[];
}

export interface ChildDigest {
  childId: string;
  firstName: string;
  preferredName: string | null;
  avatarId: string | null;
  currentWorld: string;
  stats: ChildDigestStats;
  highlights: string[];
}

export interface DailyDigest {
  date: string;
  familyId: string;
  children: ChildDigest[];
  highlights: string[];
  recommendations: string[];
}

// =============================================================================
// NOTIFICATION UPDATE — PUT /parent/notifications
// =============================================================================

export interface NotificationUpdate {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  digestEnabled?: boolean;
  digestFrequency?: 'daily' | 'weekly' | null;
  digestTime?: string | null;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string;
  categoryPreferences?: Record<string, boolean>;
}
