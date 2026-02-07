// =============================================================================
// SCHOLARLY PLATFORM — Sprint 11: S11-007
// Parent Companion App
// =============================================================================
// Parents are the invisible backbone of every child's reading journey. The
// Parent Companion doesn't try to turn parents into teachers — instead, it
// gives them a warm, clear window into their child's progress and simple,
// actionable suggestions for how to support learning at home. Think of it
// as the weekly postcard from camp: "Here's what your child did this week,
// here's what they loved, and here's how you can keep the magic going."
// =============================================================================

import { Result, ServiceError } from '../shared/base';

// =============================================================================
// SECTION 1: PARENT DASHBOARD TYPES
// =============================================================================

export interface ParentDashboard {
  parentId: string;
  tenantId: string;
  children: ChildSummary[];
  notifications: ParentNotification[];
  weeklyDigest: WeeklyDigest | null;
  homeActivities: HomeActivity[];
  settings: ParentSettings;
  lastViewedAt: Date;
}

export interface ChildSummary {
  learnerId: string;
  displayName: string;
  avatarUrl: string;
  currentPhase: number;
  phaseName: string;
  overallProgress: number;
  weeklyReadingTime: number;
  weeklyBooksRead: number;
  weeklySessionCount: number;
  wcpm: number;
  wcpmTrend: 'improving' | 'stable' | 'needs_attention';
  recentAchievements: Achievement[];
  currentStreak: number;
  favouriteBook: string | null;
  nextMilestone: Milestone;
  wellbeingStatus: 'thriving' | 'okay' | 'needs_support';
  formationProgress: FormationSummary;
}

export interface Achievement {
  badgeId: string;
  name: string;
  description: string;
  iconUrl: string;
  earnedAt: Date;
}

export interface Milestone {
  name: string;
  description: string;
  progress: number;
  target: number;
  estimatedCompletion: string;
}

export interface FormationSummary {
  lettersLearned: number;
  totalLetters: number;
  recentPractice: string[];
  averageScore: number;
}

// =============================================================================
// SECTION 2: WEEKLY DIGEST
// =============================================================================

export interface WeeklyDigest {
  digestId: string;
  weekStarting: Date;
  weekEnding: Date;
  headline: string;
  summary: string;
  highlights: DigestHighlight[];
  metrics: WeeklyMetrics;
  recommendations: ParentRecommendation[];
  celebrationMoment: string;
  generatedAt: Date;
}

export interface DigestHighlight {
  type: 'achievement' | 'improvement' | 'new_skill' | 'milestone' | 'engagement';
  title: string;
  description: string;
  emoji: string;
}

export interface WeeklyMetrics {
  totalReadingTime: number;
  booksStarted: number;
  booksCompleted: number;
  sessionsCompleted: number;
  newGpcsMastered: string[];
  wcpmChange: number;
  masteryChange: number;
  lettersFormed: number;
  arenaPoints: number;
  streakDays: number;
}

export interface ParentRecommendation {
  type: 'read_together' | 'activity_at_home' | 'library_visit' | 'conversation_starter' | 'screen_break' | 'celebration';
  title: string;
  description: string;
  timeRequired: string;
  materials: string[];
  linkedGpcs: string[];
  linkedBook: string | null;
  priority: 'high' | 'medium' | 'low';
}

// =============================================================================
// SECTION 3: HOME ACTIVITIES
// =============================================================================

export interface HomeActivity {
  activityId: string;
  title: string;
  description: string;
  type: HomeActivityType;
  targetGpcs: string[];
  targetPhase: number;
  ageRange: string;
  timeRequired: string;
  materials: string[];
  instructions: ActivityStep[];
  tipsForParents: string[];
  linkedStorybooks: string[];
  difficulty: 'easy' | 'medium' | 'challenging';
  indoorOutdoor: 'indoor' | 'outdoor' | 'either';
  completed: boolean;
  rating: number | null;
}

export type HomeActivityType =
  | 'phonics_game'     // Sound-based game at home
  | 'word_hunt'        // Find words around the house/neighbourhood
  | 'story_extension'  // Activities inspired by a storybook
  | 'letter_craft'     // Art/craft for letter formation
  | 'reading_together' // Guided shared reading
  | 'writing_prompt'   // Simple writing activity
  | 'listening_game'   // Auditory discrimination game
  | 'rhyme_time'       // Rhyming and phonological awareness
  | 'cooking_reading'  // Follow a simple recipe (functional reading)
  | 'outdoor_literacy'; // Literacy activities outdoors

export interface ActivityStep {
  step: number;
  instruction: string;
  parentTip?: string;
  variation?: string;
}

export const SAMPLE_HOME_ACTIVITIES: HomeActivity[] = [
  {
    activityId: 'ha_sound_safari',
    title: 'Sound Safari',
    description: 'Go on a hunt around your home to find objects that start with the sounds your child is learning.',
    type: 'phonics_game',
    targetGpcs: ['s', 'a', 't', 'p'],
    targetPhase: 2,
    ageRange: '4-6',
    timeRequired: '15 minutes',
    materials: ['A bag or basket', 'Sticky notes (optional)'],
    instructions: [
      { step: 1, instruction: 'Choose a sound your child is learning, for example /s/.', parentTip: 'Say the sound, not the letter name.' },
      { step: 2, instruction: 'Walk around the house together looking for things that start with that sound.', variation: 'For older children, find things that end with the sound.' },
      { step: 3, instruction: 'When your child finds something, celebrate! Put it in the basket or label it with a sticky note.' },
      { step: 4, instruction: 'Count how many items you found. Try another sound!' },
    ],
    tipsForParents: [
      'Focus on the sound, not the spelling — "phone" starts with /f/ not /p/.',
      'Keep it fun and short — stop before your child loses interest.',
      'Take a photo of the collection to show their teacher!',
    ],
    linkedStorybooks: [],
    difficulty: 'easy',
    indoorOutdoor: 'either',
    completed: false,
    rating: null,
  },
  {
    activityId: 'ha_story_retell',
    title: 'Story Retell Puppets',
    description: 'After reading a Scholarly storybook, make simple puppets and retell the story together.',
    type: 'story_extension',
    targetGpcs: [],
    targetPhase: 3,
    ageRange: '4-7',
    timeRequired: '30 minutes',
    materials: ['Socks, paper bags, or craft sticks', 'Markers or crayons', 'Scrap paper'],
    instructions: [
      { step: 1, instruction: 'After reading the story, ask: "Who was in the story? What happened?"' },
      { step: 2, instruction: 'Make a simple puppet for each character using whatever materials you have.' },
      { step: 3, instruction: 'Take turns retelling parts of the story with the puppets.' },
      { step: 4, instruction: 'Ask your child: "What might happen next?" and act out their ideas.' },
    ],
    tipsForParents: [
      'The puppets don\'t need to be perfect — the retelling is what matters!',
      'Retelling builds comprehension, vocabulary, and narrative skills.',
      'If your child changes the story, go with it — creativity is wonderful.',
    ],
    linkedStorybooks: [],
    difficulty: 'medium',
    indoorOutdoor: 'indoor',
    completed: false,
    rating: null,
  },
];

// =============================================================================
// SECTION 4: PARENT NOTIFICATIONS & SETTINGS
// =============================================================================

export interface ParentNotification {
  notificationId: string;
  type: ParentNotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
  learnerId: string;
}

export type ParentNotificationType =
  | 'achievement_earned'
  | 'weekly_digest_ready'
  | 'milestone_reached'
  | 'streak_at_risk'
  | 'new_activity_available'
  | 'wellbeing_update'
  | 'teacher_message'
  | 'phase_advancement';

export interface ParentSettings {
  notificationPreferences: Record<ParentNotificationType, boolean>;
  digestDay: 'monday' | 'friday' | 'sunday';
  digestTime: string;
  language: string;
  timezone: string;
  activityDifficulty: 'easy' | 'medium' | 'challenging' | 'auto';
  showDetailedMetrics: boolean;
}

export const DEFAULT_PARENT_SETTINGS: ParentSettings = {
  notificationPreferences: {
    achievement_earned: true,
    weekly_digest_ready: true,
    milestone_reached: true,
    streak_at_risk: true,
    new_activity_available: true,
    wellbeing_update: true,
    teacher_message: true,
    phase_advancement: true,
  },
  digestDay: 'friday',
  digestTime: '17:00',
  language: 'en',
  timezone: 'UTC',
  activityDifficulty: 'auto',
  showDetailedMetrics: false,
};

// =============================================================================
// SECTION 5: PARENT COMPANION SERVICE
// =============================================================================

export class ParentCompanionService {
  async getDashboard(parentId: string, tenantId: string): Promise<Result<ParentDashboard>> {
    const dashboard: ParentDashboard = {
      parentId, tenantId,
      children: [],
      notifications: [],
      weeklyDigest: null,
      homeActivities: SAMPLE_HOME_ACTIVITIES,
      settings: DEFAULT_PARENT_SETTINGS,
      lastViewedAt: new Date(),
    };
    return { success: true, data: dashboard };
  }

  async generateWeeklyDigest(
    parentId: string, learnerId: string, tenantId: string,
    weekStart: Date, weekEnd: Date,
  ): Promise<Result<WeeklyDigest>> {
    // In production, aggregates the week's reading sessions, BKT updates,
    // achievements, and wellbeing data into a parent-friendly summary.
    // Uses Claude API to generate the narrative headline and celebration moment.
    const digest: WeeklyDigest = {
      digestId: `digest_${Date.now()}`,
      weekStarting: weekStart, weekEnding: weekEnd,
      headline: 'A wonderful week of reading!',
      summary: '',
      highlights: [],
      metrics: {
        totalReadingTime: 0, booksStarted: 0, booksCompleted: 0,
        sessionsCompleted: 0, newGpcsMastered: [], wcpmChange: 0,
        masteryChange: 0, lettersFormed: 0, arenaPoints: 0, streakDays: 0,
      },
      recommendations: [],
      celebrationMoment: '',
      generatedAt: new Date(),
    };
    return { success: true, data: digest };
  }

  async getHomeActivities(
    learnerId: string, tenantId: string, count: number = 5,
  ): Promise<Result<HomeActivity[]>> {
    // In production, selects activities aligned with the learner's
    // current phonics targets, recent storybooks, and preferences.
    return { success: true, data: SAMPLE_HOME_ACTIVITIES.slice(0, count) };
  }

  async recordActivityCompletion(
    activityId: string, parentId: string, rating: number,
  ): Promise<Result<void>> {
    return { success: true, data: undefined };
  }
}

// =============================================================================
// SECTION 6: NATS EVENTS
// =============================================================================

export const PARENT_EVENTS = {
  DASHBOARD_VIEWED: 'scholarly.parent.dashboard_viewed',
  DIGEST_GENERATED: 'scholarly.parent.digest_generated',
  ACTIVITY_COMPLETED: 'scholarly.parent.activity_completed',
  NOTIFICATION_SENT: 'scholarly.parent.notification_sent',
  SETTINGS_UPDATED: 'scholarly.parent.settings_updated',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================
export {
  ParentCompanionService,
  SAMPLE_HOME_ACTIVITIES,
  DEFAULT_PARENT_SETTINGS,
  PARENT_EVENTS,
};
