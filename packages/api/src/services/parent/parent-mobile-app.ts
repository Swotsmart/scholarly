// =============================================================================
// SCHOLARLY PLATFORM — Sprint 13: S13-003
// Parent Mobile App
// Dedicated Parent Experience with Reading Progress & Recommendations
// =============================================================================
//
// If the Scholarly platform is a school, the Parent Mobile App is the parent
// observation gallery — a purpose-built window into their child's learning
// journey, designed specifically for the way parents engage with educational
// technology: in stolen moments between meetings, during the morning commute,
// or over a cup of coffee after the kids are in bed.
//
// This is NOT just a stripped-down version of the teacher dashboard. Parents
// have fundamentally different needs from educators. A teacher needs cohort
// analytics, curriculum alignment reports, and assessment data for 30 students.
// A parent needs to know three things: "Is my child making progress?", "What
// should we do at home tonight?", and "Should I be worried about anything?"
//
// The design philosophy mirrors a paediatrician's approach to parent
// communication: lead with reassurance where it's warranted, flag concerns
// early with actionable guidance, and always translate clinical data into
// language that empowers rather than overwhelms. A parent doesn't need to
// know their child's BKT mastery probability for /igh/ — they need to know
// "Sam is getting confident with long vowel sounds like 'igh' in words like
// night and light. Try pointing these out in bedtime stories!"
//
// Integration points:
// - Sprint 3: BKT mastery data (translated to parent-friendly progress)
// - Sprint 5: Storybook reading sessions (activity feed)
// - Sprint 6: Push notifications (daily digest, milestone alerts)
// - Sprint 9: Subscription management (family plan controls)
// - Sprint 10: Wellbeing monitoring (emotional state awareness)
// - Sprint 11: Gamification (achievement celebrations)
// =============================================================================

import { PrismaClient, Prisma } from '@prisma/client';
import { Result, ok, fail, ScholarlyBaseService } from '../shared/base';

// =============================================================================
// Section 1: Parent Dashboard Data Models
// =============================================================================

// ChildProgressSnapshot — The at-a-glance view a parent sees when they open
// the app. Like a school report card, but updated in real-time and written
// in plain language rather than educator jargon.

interface ChildProgressSnapshot {
  learnerId: string;
  name: string;
  avatarUrl?: string;
  age: number;
  currentPhonicsPhase: number;
  phaseProgress: number;              // 0-100% through current phase
  weeklyReadingMinutes: number;
  weeklyBooksCompleted: number;
  currentStreak: number;              // Consecutive days with reading activity
  longestStreak: number;
  totalBooksRead: number;
  overallMasteryLevel: MasteryLevel;
  recentAchievements: Achievement[];
  moodTrend: MoodTrend;
  lastActiveAt: Date;
  weeklyComparison: WeeklyComparison;
  focusAreas: FocusArea[];
  celebrations: Celebration[];
}

enum MasteryLevel {
  EMERGING = 'emerging',         // Just starting — lots of new sounds
  DEVELOPING = 'developing',     // Making progress — building confidence
  SECURING = 'securing',         // Solidifying knowledge — fewer gaps
  MASTERING = 'mastering',       // Strong reader — ready for next challenge
  EXCEEDING = 'exceeding',       // Above expected level — thriving
}

interface MoodTrend {
  currentMood: 'happy' | 'neutral' | 'frustrated' | 'tired' | 'excited';
  weeklyAverage: number;         // 1-5 scale
  trend: 'improving' | 'stable' | 'declining';
  note?: string;                 // AI-generated insight: "Sam seems most engaged in the morning"
}

interface WeeklyComparison {
  readingMinutesChange: number;  // +/- vs last week
  booksCompletedChange: number;
  accuracyChange: number;        // Percentage point change
  trend: 'improving' | 'stable' | 'declining';
  narrativeSummary: string;      // "Great week! Sam read 3 more books than last week"
}

interface FocusArea {
  id: string;
  title: string;                 // Parent-friendly: "Long vowel sounds"
  technicalName: string;         // For linking: "Phase 5 GPCs: ai, oa, ie, ee, oo"
  status: 'needs_practice' | 'improving' | 'nearly_there' | 'mastered';
  masteryPercentage: number;
  suggestedActivity: string;     // "Try reading 'The Snail Trail' together tonight"
  relatedBooks: string[];        // Book IDs in the library
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
  earnedAt: Date;
  shared: boolean;              // Whether parent has shared to family chat
}

interface Celebration {
  type: 'milestone' | 'streak' | 'phase_complete' | 'book_complete' | 'accuracy';
  title: string;
  description: string;
  celebratedAt: Date;
  dismissed: boolean;
}

// =============================================================================
// Section 2: Activity Feed
// =============================================================================

// The activity feed is the parent's timeline — a chronological stream of
// their child's learning activities, written like a friendly teacher's note
// rather than a database log. Think Instagram stories, but for literacy.

interface ActivityFeedItem {
  id: string;
  learnerId: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  thumbnailUrl?: string;
  actionUrl?: string;            // Deep link into the app
  isHighlight: boolean;          // Worthy of push notification
}

enum ActivityType {
  BOOK_STARTED = 'book_started',
  BOOK_COMPLETED = 'book_completed',
  ACHIEVEMENT_EARNED = 'achievement_earned',
  PHASE_ADVANCED = 'phase_advanced',
  STREAK_MILESTONE = 'streak_milestone',
  READING_SESSION = 'reading_session',
  NEW_WORDS_LEARNED = 'new_words_learned',
  ACCURACY_MILESTONE = 'accuracy_milestone',
  WELLBEING_NOTE = 'wellbeing_note',
  RECOMMENDATION = 'recommendation',
  TEACHER_NOTE = 'teacher_note',
}

// =============================================================================
// Section 3: Home Activity Recommendations
// =============================================================================

// This is the "what should we do at home tonight?" engine. It bridges the
// gap between school learning and home reinforcement by suggesting specific,
// actionable activities that parents can do with their children — no teaching
// degree required.

interface HomeActivity {
  id: string;
  title: string;
  description: string;
  duration: string;              // "5-10 minutes"
  difficulty: 'easy' | 'moderate' | 'challenging';
  category: HomeActivityCategory;
  targetSkills: string[];        // GPCs or skills this reinforces
  materials: string[];           // "Just a pencil and paper!"
  steps: string[];
  funFactor: number;             // 1-5 stars
  ageRange: { min: number; max: number };
  completionCount: number;       // How many times this family has done it
  lastCompletedAt?: Date;
}

enum HomeActivityCategory {
  READ_TOGETHER = 'read_together',      // Shared reading activities
  WORD_PLAY = 'word_play',              // Games with sounds and words
  WRITING = 'writing',                  // Mark-making and letter formation
  EVERYDAY = 'everyday',               // Learning moments in daily life
  CREATIVE = 'creative',               // Art, craft, storytelling
  OUTDOOR = 'outdoor',                 // Physical activities with literacy
  SCREEN_TIME = 'screen_time',         // Guided app activities
  BEDTIME = 'bedtime',                 // Bedtime reading routines
}

// =============================================================================
// Section 4: Family Management
// =============================================================================

interface FamilyProfile {
  id: string;
  tenantId: string;
  parentUserId: string;
  children: ChildProfile[];
  subscription: FamilySubscription;
  preferences: FamilyPreferences;
  dailyDigestEnabled: boolean;
  weeklyReportEnabled: boolean;
  milestoneAlertsEnabled: boolean;
  createdAt: Date;
}

interface ChildProfile {
  learnerId: string;
  name: string;
  age: number;
  avatarUrl?: string;
  school?: string;
  classroom?: string;
  teacherName?: string;
  readingGoal: { booksPerWeek: number; minutesPerDay: number };
  bedtimeReminderTime?: string;  // "19:30"
  interests: string[];           // Used for book recommendations
}

interface FamilySubscription {
  plan: 'free' | 'family' | 'family_plus';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  maxChildren: number;
  features: string[];
  renewsAt?: Date;
  managementUrl: string;         // Deep link to subscription settings
}

interface FamilyPreferences {
  language: string;
  timezone: string;
  notificationQuietHours: { start: string; end: string }; // "21:00" - "07:00"
  progressSharingWithTeacher: boolean;
  dataCollectionConsent: DataCollectionConsent;
}

interface DataCollectionConsent {
  essentialData: boolean;        // Always true (required for service)
  learningAnalytics: boolean;    // BKT tracking, reading metrics
  voiceRecordings: boolean;      // ASR read-aloud samples
  behaviouralAnalytics: boolean; // Engagement metrics
  consentedAt: Date;
  consentVersion: string;
}

// =============================================================================
// Section 5: Parent App Service
// =============================================================================

class ParentAppService extends ScholarlyBaseService {
  constructor(prisma: PrismaClient) {
    super(prisma, 'ParentAppService');
  }

  // -------------------------------------------------------------------------
  // Child Progress — Translating BKT into parent-friendly language
  // -------------------------------------------------------------------------

  async getChildProgress(
    parentId: string, learnerId: string, tenantId: string
  ): Promise<Result<ChildProgressSnapshot>> {
    // Verify parent-child relationship
    const linkResult = await this.verifyParentLink(parentId, learnerId, tenantId);
    if (!linkResult.success) return linkResult as Result<ChildProgressSnapshot>;

    try {
      // Fetch raw data from multiple sources
      const [learnerData, bktData, readingSessions, achievements, wellbeingData] = await Promise.all([
        this.fetchLearnerProfile(learnerId, tenantId),
        this.fetchBKTMastery(learnerId, tenantId),
        this.fetchRecentReadingSessions(learnerId, tenantId, 7),
        this.fetchRecentAchievements(learnerId, tenantId, 5),
        this.fetchWellbeingData(learnerId, tenantId),
      ]);

      if (!learnerData) return fail('Learner not found', 'LEARNER_NOT_FOUND');

      // Translate BKT mastery into parent-friendly focus areas
      const focusAreas = this.translateMasteryToFocusAreas(bktData);

      // Calculate weekly comparison
      const previousWeekSessions = await this.fetchRecentReadingSessions(learnerId, tenantId, 14);
      const weeklyComparison = this.calculateWeeklyComparison(readingSessions, previousWeekSessions);

      // Generate celebrations
      const celebrations = this.generateCelebrations(readingSessions, achievements, bktData);

      // Determine overall mastery level
      const overallMastery = this.calculateOverallMastery(bktData);

      const snapshot: ChildProgressSnapshot = {
        learnerId,
        name: learnerData.firstName,
        avatarUrl: learnerData.avatarUrl,
        age: this.calculateAge(learnerData.dateOfBirth),
        currentPhonicsPhase: learnerData.currentPhase || 2,
        phaseProgress: this.calculatePhaseProgress(bktData, learnerData.currentPhase || 2),
        weeklyReadingMinutes: readingSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0),
        weeklyBooksCompleted: readingSessions.filter(s => s.completed).length,
        currentStreak: learnerData.currentStreak || 0,
        longestStreak: learnerData.longestStreak || 0,
        totalBooksRead: learnerData.totalBooksRead || 0,
        overallMasteryLevel: overallMastery,
        recentAchievements: achievements,
        moodTrend: this.assessMoodTrend(wellbeingData),
        lastActiveAt: readingSessions[0]?.completedAt || new Date(),
        weeklyComparison,
        focusAreas,
        celebrations,
      };

      return ok(snapshot);
    } catch (error) {
      this.log('error', 'Failed to build child progress snapshot', { parentId, learnerId, error: String(error) });
      return fail('Failed to load progress', 'PROGRESS_LOAD_FAILED');
    }
  }

  // Translate BKT probabilities into language parents understand
  private translateMasteryToFocusAreas(bktData: BKTMasteryRecord[]): FocusArea[] {
    // Group GPCs by phonics concept (parents don't think in individual GPCs)
    const conceptGroups: Map<string, { gpcs: BKTMasteryRecord[]; label: string }> = new Map();

    const conceptMapping: Record<string, string> = {
      's,a,t,p': 'First letter sounds',
      'i,n,m,d': 'More letter sounds',
      'g,o,c,k': 'Tricky consonants',
      'e,u,r,h,b': 'Building blocks',
      'ai,ee,igh,oa,oo': 'Long vowel sounds',
      'ar,or,ur,ow,oi': 'R-controlled & diphthongs',
      'sh,ch,th,ng,nk': 'Consonant teams',
      'ay,ou,ie,ea,oy': 'More vowel patterns',
    };

    for (const [gpcGroup, label] of Object.entries(conceptMapping)) {
      const gpcs = gpcGroup.split(',');
      const matching = bktData.filter(b => gpcs.includes(b.grapheme));
      if (matching.length > 0) {
        conceptGroups.set(label, { gpcs: matching, label });
      }
    }

    const focusAreas: FocusArea[] = [];

    for (const [label, group] of conceptGroups) {
      const avgMastery = group.gpcs.reduce((sum, g) => sum + g.pMastery, 0) / group.gpcs.length;
      const weakGpcs = group.gpcs.filter(g => g.pMastery < 0.7);

      let status: FocusArea['status'];
      if (avgMastery >= 0.9) status = 'mastered';
      else if (avgMastery >= 0.75) status = 'nearly_there';
      else if (avgMastery >= 0.5) status = 'improving';
      else status = 'needs_practice';

      // Only surface areas that need attention or deserve celebration
      if (status === 'mastered' && focusAreas.length >= 3) continue;

      const suggestedActivity = this.generateActivitySuggestion(label, status, weakGpcs);

      focusAreas.push({
        id: `focus_${label.replace(/\s/g, '_').toLowerCase()}`,
        title: label,
        technicalName: group.gpcs.map(g => g.grapheme).join(', '),
        status,
        masteryPercentage: Math.round(avgMastery * 100),
        suggestedActivity,
        relatedBooks: [],  // Populated by recommendation engine
      });
    }

    // Sort: needs_practice first, mastered last
    const statusOrder = { needs_practice: 0, improving: 1, nearly_there: 2, mastered: 3 };
    focusAreas.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return focusAreas.slice(0, 6); // Max 6 focus areas to not overwhelm
  }

  private generateActivitySuggestion(
    conceptLabel: string, status: FocusArea['status'], weakGpcs: BKTMasteryRecord[]
  ): string {
    const weakSounds = weakGpcs.map(g => `'${g.grapheme}'`).join(', ');

    switch (status) {
      case 'needs_practice':
        return `Let's build confidence with ${conceptLabel.toLowerCase()}! Try playing "I Spy" with words that start with ${weakSounds}. Make it silly — the funnier the better!`;
      case 'improving':
        return `Great progress on ${conceptLabel.toLowerCase()}! While reading tonight, pause at words with ${weakSounds} and let your child sound them out. Celebrate every attempt!`;
      case 'nearly_there':
        return `Almost there with ${conceptLabel.toLowerCase()}! Try a word hunt — see how many ${weakSounds} words you can spot around the house or at the shops.`;
      case 'mastered':
        return `${conceptLabel} are rock-solid! Your child can now read lots of words with these sounds confidently. Time to celebrate this milestone!`;
    }
  }

  private calculateOverallMastery(bktData: BKTMasteryRecord[]): MasteryLevel {
    if (bktData.length === 0) return MasteryLevel.EMERGING;
    const avgMastery = bktData.reduce((sum, g) => sum + g.pMastery, 0) / bktData.length;
    const masteredCount = bktData.filter(g => g.pMastery >= 0.85).length;
    const masteredRatio = masteredCount / bktData.length;

    if (masteredRatio >= 0.9 && avgMastery >= 0.9) return MasteryLevel.EXCEEDING;
    if (masteredRatio >= 0.7 && avgMastery >= 0.8) return MasteryLevel.MASTERING;
    if (masteredRatio >= 0.5 && avgMastery >= 0.65) return MasteryLevel.SECURING;
    if (masteredRatio >= 0.2) return MasteryLevel.DEVELOPING;
    return MasteryLevel.EMERGING;
  }

  private calculatePhaseProgress(bktData: BKTMasteryRecord[], currentPhase: number): number {
    const phaseGpcs = bktData.filter(g => g.phase === currentPhase);
    if (phaseGpcs.length === 0) return 0;
    const mastered = phaseGpcs.filter(g => g.pMastery >= 0.85).length;
    return Math.round((mastered / phaseGpcs.length) * 100);
  }

  private calculateWeeklyComparison(
    thisWeek: ReadingSessionRecord[], allSessions: ReadingSessionRecord[]
  ): WeeklyComparison {
    const lastWeek = allSessions.filter(s => {
      const daysAgo = (Date.now() - s.completedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo >= 7 && daysAgo < 14;
    });

    const thisWeekMinutes = thisWeek.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const lastWeekMinutes = lastWeek.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const thisWeekBooks = thisWeek.filter(s => s.completed).length;
    const lastWeekBooks = lastWeek.filter(s => s.completed).length;
    const thisWeekAccuracy = thisWeek.length > 0
      ? thisWeek.reduce((sum, s) => sum + (s.accuracy || 0), 0) / thisWeek.length : 0;
    const lastWeekAccuracy = lastWeek.length > 0
      ? lastWeek.reduce((sum, s) => sum + (s.accuracy || 0), 0) / lastWeek.length : 0;

    const minutesChange = thisWeekMinutes - lastWeekMinutes;
    const booksChange = thisWeekBooks - lastWeekBooks;
    const accuracyChange = thisWeekAccuracy - lastWeekAccuracy;

    let trend: WeeklyComparison['trend'] = 'stable';
    if (minutesChange > 5 || booksChange > 0) trend = 'improving';
    else if (minutesChange < -10 && booksChange < 0) trend = 'declining';

    let narrative: string;
    if (trend === 'improving') {
      narrative = booksChange > 0
        ? `Fantastic week! ${booksChange} more book${booksChange > 1 ? 's' : ''} than last week, and ${thisWeekMinutes} minutes of reading time.`
        : `Great effort this week! ${thisWeekMinutes} minutes of reading — that's ${minutesChange} more than last week.`;
    } else if (trend === 'declining') {
      narrative = `A quieter week with ${thisWeekMinutes} minutes of reading. That's perfectly okay — every reader has ups and downs. Maybe try a shorter story tonight to get back in the groove!`;
    } else {
      narrative = `Steady week with ${thisWeekMinutes} minutes of reading and ${thisWeekBooks} book${thisWeekBooks !== 1 ? 's' : ''} completed. Consistency is the secret ingredient!`;
    }

    return {
      readingMinutesChange: minutesChange,
      booksCompletedChange: booksChange,
      accuracyChange: Math.round(accuracyChange * 100),
      trend,
      narrativeSummary: narrative,
    };
  }

  private assessMoodTrend(wellbeingData: WellbeingRecord[]): MoodTrend {
    if (wellbeingData.length === 0) {
      return { currentMood: 'neutral', weeklyAverage: 3, trend: 'stable' };
    }

    const latest = wellbeingData[0];
    const avg = wellbeingData.reduce((sum, w) => sum + w.moodScore, 0) / wellbeingData.length;
    const recentAvg = wellbeingData.slice(0, 3).reduce((sum, w) => sum + w.moodScore, 0) / Math.min(3, wellbeingData.length);
    const olderAvg = wellbeingData.slice(3).length > 0
      ? wellbeingData.slice(3).reduce((sum, w) => sum + w.moodScore, 0) / wellbeingData.slice(3).length
      : avg;

    const moodMap: Record<number, MoodTrend['currentMood']> = {
      1: 'frustrated', 2: 'tired', 3: 'neutral', 4: 'happy', 5: 'excited',
    };

    return {
      currentMood: moodMap[Math.round(latest.moodScore)] || 'neutral',
      weeklyAverage: Math.round(avg * 10) / 10,
      trend: recentAvg > olderAvg + 0.3 ? 'improving'
        : recentAvg < olderAvg - 0.3 ? 'declining' : 'stable',
      note: this.generateMoodInsight(wellbeingData),
    };
  }

  private generateMoodInsight(data: WellbeingRecord[]): string | undefined {
    if (data.length < 3) return undefined;

    // Find patterns in time-of-day engagement
    const morningScores = data.filter(d => d.hour < 12).map(d => d.moodScore);
    const afternoonScores = data.filter(d => d.hour >= 12 && d.hour < 17).map(d => d.moodScore);
    const eveningScores = data.filter(d => d.hour >= 17).map(d => d.moodScore);

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const best = [
      { period: 'morning', score: avg(morningScores) },
      { period: 'afternoon', score: avg(afternoonScores) },
      { period: 'evening', score: avg(eveningScores) },
    ].sort((a, b) => b.score - a.score)[0];

    if (best.score > 3.5) {
      return `Seems most engaged during ${best.period} sessions — try scheduling reading time then!`;
    }
    return undefined;
  }

  private generateCelebrations(
    sessions: ReadingSessionRecord[], achievements: Achievement[], bktData: BKTMasteryRecord[]
  ): Celebration[] {
    const celebrations: Celebration[] = [];

    // Books completed this week
    const booksCompleted = sessions.filter(s => s.completed).length;
    if (booksCompleted >= 5) {
      celebrations.push({
        type: 'milestone',
        title: 'Super Reader Week! 📚',
        description: `${booksCompleted} books completed this week — that's amazing dedication!`,
        celebratedAt: new Date(),
        dismissed: false,
      });
    }

    // New achievements
    for (const achievement of achievements) {
      const daysSinceEarned = (Date.now() - achievement.earnedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceEarned < 1) {
        celebrations.push({
          type: 'milestone',
          title: `New Badge: ${achievement.title}! 🏆`,
          description: achievement.description,
          celebratedAt: achievement.earnedAt,
          dismissed: false,
        });
      }
    }

    // Mastery milestones
    const newlyMastered = bktData.filter(g => g.pMastery >= 0.85 && g.previousPMastery < 0.85);
    if (newlyMastered.length > 0) {
      const sounds = newlyMastered.map(g => `'${g.grapheme}'`).join(', ');
      celebrations.push({
        type: 'phase_complete',
        title: 'New Sounds Mastered! ⭐',
        description: `Mastered ${newlyMastered.length} new sound${newlyMastered.length > 1 ? 's' : ''}: ${sounds}. These are locked in and ready to use!`,
        celebratedAt: new Date(),
        dismissed: false,
      });
    }

    return celebrations.slice(0, 5);
  }

  // -------------------------------------------------------------------------
  // Activity Feed
  // -------------------------------------------------------------------------

  async getActivityFeed(
    parentId: string, learnerId: string, tenantId: string, limit: number = 20, before?: Date
  ): Promise<Result<ActivityFeedItem[]>> {
    const linkResult = await this.verifyParentLink(parentId, learnerId, tenantId);
    if (!linkResult.success) return linkResult as Result<ActivityFeedItem[]>;

    try {
      const clampedLimit = Math.min(Math.max(1, limit), 100);
      const events = before
        ? await this.prisma.$queryRaw<RawActivityEvent[]>(
            Prisma.sql`SELECT e."id", e."type", e."title", e."description", e."metadata",
                    e."timestamp", e."thumbnailUrl", e."isHighlight"
             FROM "ActivityEvent" e
             WHERE e."learnerId" = ${learnerId} AND e."tenantId" = ${tenantId}
             AND e."timestamp" < ${before}
             ORDER BY e."timestamp" DESC
             LIMIT ${clampedLimit}`
          )
        : await this.prisma.$queryRaw<RawActivityEvent[]>(
            Prisma.sql`SELECT e."id", e."type", e."title", e."description", e."metadata",
                    e."timestamp", e."thumbnailUrl", e."isHighlight"
             FROM "ActivityEvent" e
             WHERE e."learnerId" = ${learnerId} AND e."tenantId" = ${tenantId}
             ORDER BY e."timestamp" DESC
             LIMIT ${clampedLimit}`
          );

      const feedItems: ActivityFeedItem[] = events.map(e => {
        let metadata: Record<string, unknown> = {};
        if (typeof e.metadata === 'string') {
          try {
            metadata = JSON.parse(e.metadata);
          } catch {
            metadata = {};
          }
        } else {
          metadata = e.metadata || {};
        }
        return {
          id: e.id,
          learnerId,
          type: e.type as ActivityType,
          title: e.title,
          description: e.description,
          timestamp: e.timestamp,
          metadata,
          thumbnailUrl: e.thumbnailUrl,
          isHighlight: e.isHighlight,
        };
      });

      return ok(feedItems);
    } catch (error) {
      this.log('error', 'Failed to load activity feed', { parentId, learnerId, error: String(error) });
      return fail('Failed to load activity feed', 'FEED_LOAD_FAILED');
    }
  }

  // -------------------------------------------------------------------------
  // Home Activity Recommendations
  // -------------------------------------------------------------------------

  async getHomeActivities(
    parentId: string, learnerId: string, tenantId: string
  ): Promise<Result<HomeActivity[]>> {
    const linkResult = await this.verifyParentLink(parentId, learnerId, tenantId);
    if (!linkResult.success) return linkResult as Result<HomeActivity[]>;

    const bktData = await this.fetchBKTMastery(learnerId, tenantId);
    const learnerData = await this.fetchLearnerProfile(learnerId, tenantId);
    if (!learnerData) return fail('Learner not found', 'LEARNER_NOT_FOUND');

    const age = this.calculateAge(learnerData.dateOfBirth);
    const weakAreas = bktData.filter(g => g.pMastery < 0.7);
    const now = new Date();
    const hour = now.getHours();

    // Select activities based on time of day, weak areas, and age
    const activities: HomeActivity[] = [];

    // Always include a bedtime reading recommendation in the evening
    if (hour >= 17) {
      activities.push(this.createBedtimeActivity(weakAreas, age));
    }

    // Word play activities for weak GPCs
    if (weakAreas.length > 0) {
      activities.push(this.createWordPlayActivity(weakAreas.slice(0, 3), age));
    }

    // Everyday learning moments
    activities.push(this.createEverydayActivity(weakAreas, age));

    // Creative activity
    activities.push(this.createCreativeActivity(weakAreas, age));

    // Screen time — guided app activity
    activities.push({
      id: 'screen_guided',
      title: 'Guided Reading Time',
      description: 'Open the Scholarly app together and read a recommended story. Take turns reading pages!',
      duration: '10-15 minutes',
      difficulty: 'easy',
      category: HomeActivityCategory.SCREEN_TIME,
      targetSkills: weakAreas.slice(0, 3).map(g => g.grapheme),
      materials: ['Scholarly app', 'A cosy spot'],
      steps: [
        'Open the library and pick a story from "Ready for You"',
        'Read the first page aloud, pointing to each word',
        'Let your child try the next page — help with tricky words',
        'Talk about the story: "What do you think happens next?"',
        'Celebrate finishing the book together!',
      ],
      funFactor: 4,
      ageRange: { min: 4, max: 8 },
      completionCount: 0,
    });

    return ok(activities.filter(a => age >= a.ageRange.min && age <= a.ageRange.max).slice(0, 5));
  }

  private createBedtimeActivity(weakAreas: BKTMasteryRecord[], age: number): HomeActivity {
    const targetSounds = weakAreas.slice(0, 2).map(g => g.grapheme);
    return {
      id: 'bedtime_reading',
      title: '🌙 Bedtime Story Time',
      description: `Read a story together and listen for ${targetSounds.length > 0 ? `words with '${targetSounds.join("' and '")}'` : 'interesting new words'}.`,
      duration: '10-15 minutes',
      difficulty: 'easy',
      category: HomeActivityCategory.BEDTIME,
      targetSkills: targetSounds,
      materials: ['A favourite book or Scholarly story'],
      steps: [
        'Snuggle up somewhere comfortable',
        'Let your child pick the story (choice builds ownership!)',
        'Read together — take turns if they want to try',
        targetSounds.length > 0 ? `Pause at words with '${targetSounds[0]}' — "Ooh, can you hear that sound?"` : 'Point to interesting words and talk about what they mean',
        'Ask one question about the story: "What was your favourite part?"',
      ],
      funFactor: 5,
      ageRange: { min: 3, max: 9 },
      completionCount: 0,
    };
  }

  private createWordPlayActivity(weakGpcs: BKTMasteryRecord[], age: number): HomeActivity {
    const sounds = weakGpcs.map(g => g.grapheme);
    return {
      id: 'word_play_' + sounds.join('_'),
      title: '🎯 Sound Detective',
      description: `Go on a sound hunt around the house! Find things that have the '${sounds[0]}' sound.`,
      duration: '5-10 minutes',
      difficulty: age < 5 ? 'easy' : 'moderate',
      category: HomeActivityCategory.WORD_PLAY,
      targetSkills: sounds,
      materials: ['Just your eyes and ears!'],
      steps: [
        `Say the sound '${sounds[0]}' together three times`,
        `Look around the room — can you find something with that sound?`,
        'When you find one, shout "I found it!" and say the word slowly',
        `See who can find 5 things with the '${sounds[0]}' sound first`,
        'Bonus: try to think of a silly sentence using all the words you found!',
      ],
      funFactor: 4,
      ageRange: { min: 3, max: 7 },
      completionCount: 0,
    };
  }

  private createEverydayActivity(weakAreas: BKTMasteryRecord[], age: number): HomeActivity {
    return {
      id: 'everyday_learning',
      title: '🛒 Supermarket Spotter',
      description: 'Turn your next shop into a reading adventure! Spot letters and words on packaging.',
      duration: 'During your shop',
      difficulty: 'easy',
      category: HomeActivityCategory.EVERYDAY,
      targetSkills: weakAreas.slice(0, 3).map(g => g.grapheme),
      materials: ['A trip to the shops'],
      steps: [
        'Before you go, pick a sound to look for',
        'In the shop, see who can spot the sound first on a label',
        'Try to read the word together: "B-R-E-A-D... bread!"',
        'Let your child help find items from the shopping list',
        'Count how many words you spotted on the way home',
      ],
      funFactor: 3,
      ageRange: { min: 4, max: 8 },
      completionCount: 0,
    };
  }

  private createCreativeActivity(weakAreas: BKTMasteryRecord[], age: number): HomeActivity {
    return {
      id: 'creative_story',
      title: '✏️ Make Your Own Story',
      description: 'Create a tiny story together using words your child knows. Draw pictures to go with it!',
      duration: '15-20 minutes',
      difficulty: 'moderate',
      category: HomeActivityCategory.CREATIVE,
      targetSkills: weakAreas.slice(0, 3).map(g => g.grapheme),
      materials: ['Paper', 'Crayons or pencils'],
      steps: [
        'Fold a piece of paper into 4 sections — that\'s 4 pages!',
        'Think of a character together (an animal? a robot?)',
        'Help your child write a sentence on each page — you spell tricky words',
        'Draw a picture for each page',
        'Read the finished book together — your child is now an author!',
      ],
      funFactor: 5,
      ageRange: { min: 4, max: 9 },
      completionCount: 0,
    };
  }

  // -------------------------------------------------------------------------
  // Family Management
  // -------------------------------------------------------------------------

  async getFamilyProfile(parentId: string, tenantId: string): Promise<Result<FamilyProfile>> {
    try {
      const children = await this.prisma.$queryRawUnsafe<ChildProfileRow[]>(
        `SELECT u."id" as "learnerId", u."firstName" as name, lp."dateOfBirth",
                u."avatarUrl", s."name" as school, c."name" as classroom
         FROM "ParentLink" pl
         JOIN "User" u ON pl."learnerId" = u."id"
         LEFT JOIN "LearnerProfile" lp ON lp."userId" = u."id"
         LEFT JOIN "Classroom" c ON lp."classroomId" = c."id"
         LEFT JOIN "School" s ON c."schoolId" = s."id"
         WHERE pl."parentId" = $1 AND pl."tenantId" = $2`,
        parentId, tenantId
      );

      const profile: FamilyProfile = {
        id: `family_${parentId}`,
        tenantId,
        parentUserId: parentId,
        children: children.map(c => ({
          learnerId: c.learnerId,
          name: c.name,
          age: this.calculateAge(c.dateOfBirth),
          avatarUrl: c.avatarUrl,
          school: c.school,
          classroom: c.classroom,
          readingGoal: { booksPerWeek: 3, minutesPerDay: 15 },
          interests: [],
        })),
        subscription: {
          plan: 'family',
          status: 'active',
          maxChildren: 5,
          features: ['storybook_library', 'offline_reading', 'progress_tracking'],
          managementUrl: '/settings/subscription',
        },
        preferences: {
          language: 'en-AU',
          timezone: 'Australia/Perth',
          notificationQuietHours: { start: '21:00', end: '07:00' },
          progressSharingWithTeacher: true,
          dataCollectionConsent: {
            essentialData: true,
            learningAnalytics: true,
            voiceRecordings: false,
            behaviouralAnalytics: true,
            consentedAt: new Date(),
            consentVersion: '2.0',
          },
        },
        dailyDigestEnabled: true,
        weeklyReportEnabled: true,
        milestoneAlertsEnabled: true,
        createdAt: new Date(),
      };

      return ok(profile);
    } catch (error) {
      return fail('Failed to load family profile', 'PROFILE_LOAD_FAILED');
    }
  }

  // -------------------------------------------------------------------------
  // Daily Digest Generation
  // -------------------------------------------------------------------------

  async generateDailyDigest(
    parentId: string, tenantId: string
  ): Promise<Result<DailyDigest>> {
    const familyResult = await this.getFamilyProfile(parentId, tenantId);
    if (!familyResult.success) return fail(familyResult.error, familyResult.code);

    const childDigests: ChildDailyDigest[] = [];

    for (const child of familyResult.data.children) {
      const sessions = await this.fetchRecentReadingSessions(child.learnerId, tenantId, 1);
      const todaySessions = sessions.filter(s => {
        const today = new Date();
        return s.completedAt.toDateString() === today.toDateString();
      });

      childDigests.push({
        childName: child.name,
        readToday: todaySessions.length > 0,
        minutesRead: todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0),
        booksCompleted: todaySessions.filter(s => s.completed).length,
        highlightMoment: todaySessions.length > 0
          ? `Read for ${todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)} minutes today!`
          : 'No reading yet today — maybe a bedtime story tonight?',
        suggestedActivity: 'Try a 10-minute story before bed',
      });
    }

    return ok({
      parentName: parentId,
      date: new Date(),
      children: childDigests,
      familyTip: this.getDailyFamilyTip(),
    });
  }

  private getDailyFamilyTip(): string {
    const tips = [
      'Reading together for just 15 minutes a day exposes children to over a million words a year!',
      'Let your child choose the book tonight — children read more eagerly when they pick the story.',
      'Try reading the same favourite book again! Repetition builds fluency and confidence.',
      'Ask "What do you think happens next?" while reading — it builds comprehension skills.',
      'Point to words as you read them — it helps children connect spoken and written language.',
      'Make funny voices for characters — laughter and learning go hand in hand!',
      'Celebrate mistakes! When your child tries a tricky word, that\'s bravery in action.',
    ];
    return tips[new Date().getDay() % tips.length];
  }

  // -------------------------------------------------------------------------
  // Push Notification Preferences
  // -------------------------------------------------------------------------

  async updateNotificationPreferences(
    parentId: string, tenantId: string,
    preferences: { dailyDigest?: boolean; weeklyReport?: boolean; milestoneAlerts?: boolean; quietHours?: { start: string; end: string } }
  ): Promise<Result<void>> {
    this.log('info', 'Updating parent notification preferences', { parentId, preferences });
    this.emit('notification.preferences.updated', { parentId, tenantId, preferences });
    return ok(undefined);
  }

  // -------------------------------------------------------------------------
  // Helper Methods
  // -------------------------------------------------------------------------

  private async verifyParentLink(parentId: string, learnerId: string, tenantId: string): Promise<Result<void>> {
    try {
      const result = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count FROM "ParentLink"
         WHERE "parentId" = $1 AND "learnerId" = $2 AND "tenantId" = $3`,
        parentId, learnerId, tenantId
      );
      if (Number(result[0]?.count) === 0) {
        return fail('Parent-child link not found', 'LINK_NOT_FOUND');
      }
      return ok(undefined);
    } catch {
      return fail('Failed to verify parent link', 'VERIFICATION_FAILED');
    }
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - new Date(dateOfBirth).getFullYear();
    const monthDiff = today.getMonth() - new Date(dateOfBirth).getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < new Date(dateOfBirth).getDate())) {
      age--;
    }
    return age;
  }

  // Data fetch helpers — in production these use Prisma typed queries
  private async fetchLearnerProfile(learnerId: string, tenantId: string): Promise<any> {
    const result = await this.prisma.$queryRawUnsafe(
      `SELECT u."firstName", u."avatarUrl", lp."dateOfBirth", lp."currentPhase",
              lp."currentStreak", lp."longestStreak", lp."totalBooksRead"
       FROM "User" u JOIN "LearnerProfile" lp ON lp."userId" = u."id"
       WHERE u."id" = $1 AND lp."tenantId" = $2`, learnerId, tenantId
    );
    return (result as any[])[0];
  }

  private async fetchBKTMastery(learnerId: string, tenantId: string): Promise<BKTMasteryRecord[]> {
    return this.prisma.$queryRawUnsafe(
      `SELECT "grapheme", "pMastery", "previousPMastery", "phase", "updatedAt"
       FROM "BKTMastery" WHERE "learnerId" = $1 AND "tenantId" = $2
       ORDER BY "phase" ASC, "grapheme" ASC`, learnerId, tenantId
    ) as Promise<BKTMasteryRecord[]>;
  }

  private async fetchRecentReadingSessions(learnerId: string, tenantId: string, days: number): Promise<ReadingSessionRecord[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return this.prisma.$queryRawUnsafe(
      `SELECT "id", "bookId", "completed", "durationMinutes", "accuracy", "completedAt"
       FROM "ReadingSession" WHERE "learnerId" = $1 AND "tenantId" = $2
       AND "completedAt" > $3 ORDER BY "completedAt" DESC`, learnerId, tenantId, cutoff
    ) as Promise<ReadingSessionRecord[]>;
  }

  private async fetchRecentAchievements(learnerId: string, tenantId: string, limit: number): Promise<Achievement[]> {
    return this.prisma.$queryRawUnsafe(
      `SELECT "id", "title", "description", "iconUrl", "earnedAt"
       FROM "Achievement" WHERE "learnerId" = $1 AND "tenantId" = $2
       ORDER BY "earnedAt" DESC LIMIT ${limit}`, learnerId, tenantId
    ) as Promise<Achievement[]>;
  }

  private async fetchWellbeingData(learnerId: string, tenantId: string): Promise<WellbeingRecord[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return this.prisma.$queryRawUnsafe(
      `SELECT "moodScore", EXTRACT(HOUR FROM "recordedAt") as hour, "recordedAt"
       FROM "WellbeingCheck" WHERE "learnerId" = $1 AND "tenantId" = $2
       AND "recordedAt" > $3 ORDER BY "recordedAt" DESC`, learnerId, tenantId, cutoff
    ) as Promise<WellbeingRecord[]>;
  }
}

// =============================================================================
// Section 6: Supporting Types
// =============================================================================

interface BKTMasteryRecord { grapheme: string; pMastery: number; previousPMastery: number; phase: number; updatedAt: Date; }
interface ReadingSessionRecord { id: string; bookId: string; completed: boolean; durationMinutes: number; accuracy: number; completedAt: Date; }
interface WellbeingRecord { moodScore: number; hour: number; recordedAt: Date; }
interface RawActivityEvent { id: string; type: string; title: string; description: string; metadata: any; timestamp: Date; thumbnailUrl?: string; isHighlight: boolean; }
interface ChildProfileRow { learnerId: string; name: string; dateOfBirth: Date; avatarUrl?: string; school?: string; classroom?: string; }
interface ChildDailyDigest { childName: string; readToday: boolean; minutesRead: number; booksCompleted: number; highlightMoment: string; suggestedActivity: string; }
interface DailyDigest { parentName: string; date: Date; children: ChildDailyDigest[]; familyTip: string; }

// =============================================================================
// Section 7: Express Routes
// =============================================================================

function createParentRoutes(service: ParentAppService) {
  return {
    getProgress: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const result = await service.getChildProgress(req.user.id, req.params.learnerId, tenantId);
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },
    getActivityFeed: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { limit = 20, before } = req.query;
      const result = await service.getActivityFeed(req.user.id, req.params.learnerId, tenantId, Number(limit), before ? new Date(before as string) : undefined);
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },
    getHomeActivities: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const result = await service.getHomeActivities(req.user.id, req.params.learnerId, tenantId);
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },
    getFamilyProfile: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const result = await service.getFamilyProfile(req.user.id, tenantId);
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },
    getDailyDigest: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const result = await service.generateDailyDigest(req.user.id, tenantId);
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },
    updateNotifications: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const result = await service.updateNotificationPreferences(req.user.id, tenantId, req.body);
      if (!result.success) return res.status(400).json(result);
      return res.json({ updated: true });
    },
  };
}

export {
  ParentAppService,
  ChildProgressSnapshot,
  MasteryLevel,
  HomeActivity,
  HomeActivityCategory,
  FamilyProfile,
  ActivityFeedItem,
  ActivityType,
  DailyDigest,
  createParentRoutes,
};
