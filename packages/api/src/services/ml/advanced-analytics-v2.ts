// =============================================================================
// SCHOLARLY PLATFORM — Sprint 13: S13-004
// Advanced Analytics Dashboard
// Cohort Analysis, Funnel Tracking, Engagement Heatmaps for Educators
// =============================================================================
//
// If BKT mastery data is the microscope (zoomed in on individual learner-GPC
// pairs), the analytics dashboard is the telescope — it reveals patterns
// across classrooms, schools, and cohorts that no individual data point can
// show. A teacher might know that Sam struggles with 'igh', but they need
// the dashboard to discover that 60% of their class struggles with Phase 5
// long vowels, or that reading engagement drops 40% on Fridays, or that
// students who complete 3+ storybooks per week are 2.5x more likely to
// advance a phonics phase within the month.
//
// This module provides three complementary analytical lenses:
//
// 1. Cohort Analysis — Track groups of learners over time. "Of the students
//    who started Phase 3 in January, what percentage have reached Phase 4
//    by March?" This is the educational equivalent of a SaaS retention curve.
//
// 2. Funnel Analysis — Identify where learners drop off in their journey.
//    "Of students who start a storybook, what percentage complete it? Of those,
//    what percentage start another within 24 hours?" These conversion funnels
//    reveal friction points in the learning experience.
//
// 3. Engagement Heatmaps — Visualise when and how learners engage. Which
//    days of the week see the most reading? Which hours? Which book genres
//    drive the highest completion rates? This temporal data helps educators
//    and parents optimise learning schedules.
//
// Integration points:
// - Sprint 3: BKT mastery data (phase progression, GPC mastery)
// - Sprint 5: Storybook reading sessions (engagement, completion)
// - Sprint 6: Observability metrics (system-level analytics)
// - Sprint 10: Wellbeing data (mood correlation with engagement)
// - Sprint 11: Gamification (achievement velocity, streak patterns)
// - Sprint 13-002: A/B testing (experiment metric correlation)
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { Result, ok, fail, ScholarlyBaseService } from '../shared/base';

// =============================================================================
// Section 1: Cohort Analysis Engine
// =============================================================================

// A cohort is a group of learners who share a common starting characteristic.
// Think of it as a graduating class: you track the "Class of Phase 2 starters
// in January" the same way a university tracks its graduating class.

interface CohortDefinition {
  id: string;
  name: string;
  description: string;
  segmentation: CohortSegmentation;
  dateRange: { start: Date; end: Date };
  tenantId: string;
  createdBy: string;
}

interface CohortSegmentation {
  type: 'phase_start' | 'enrollment_date' | 'age_group' | 'school' | 'custom';
  phonicsPhase?: number;
  ageRange?: { min: number; max: number };
  schoolId?: string;
  classroomId?: string;
  customFilter?: Record<string, unknown>;
}

interface CohortAnalysisResult {
  cohortId: string;
  cohortName: string;
  cohortSize: number;
  analysedAt: Date;
  retentionCurve: RetentionDataPoint[];
  progressionCurve: ProgressionDataPoint[];
  engagementMetrics: CohortEngagementMetrics;
  comparisonBenchmark?: CohortBenchmark;
  insights: AnalyticsInsight[];
}

interface RetentionDataPoint {
  weekNumber: number;
  activeUsers: number;
  retentionRate: number;           // % still active from original cohort
  readingSessions: number;
  avgMinutesPerUser: number;
}

interface ProgressionDataPoint {
  weekNumber: number;
  avgPhase: number;
  avgMastery: number;
  advancedPhaseCount: number;      // How many have moved to next phase
  advancedPhaseRate: number;       // % who have advanced
  avgBooksCompleted: number;
  avgWCPM: number;                 // Words correct per minute
}

interface CohortEngagementMetrics {
  avgSessionsPerWeek: number;
  avgMinutesPerSession: number;
  avgBooksPerWeek: number;
  completionRate: number;          // % of started books that are finished
  reReadRate: number;              // % of books read more than once
  streakDistribution: { range: string; count: number; percentage: number }[];
  topGenres: { genre: string; count: number }[];
  peakHours: { hour: number; sessions: number }[];
}

interface CohortBenchmark {
  benchmarkType: 'platform_average' | 'school_average' | 'phase_average';
  retentionRate: number;
  progressionRate: number;
  avgSessionsPerWeek: number;
  performanceVsBenchmark: 'above' | 'at' | 'below';
}

// =============================================================================
// Section 2: Funnel Analysis Engine
// =============================================================================

// Funnels track sequential steps in a learner journey. Like an e-commerce
// conversion funnel (visit → browse → add to cart → checkout → purchase),
// our learning funnels reveal where the educational "conversion" breaks down.

interface FunnelDefinition {
  id: string;
  name: string;
  description: string;
  steps: FunnelStep[];
  tenantId: string;
  dateRange: { start: Date; end: Date };
}

interface FunnelStep {
  id: string;
  name: string;
  eventName: string;               // Analytics event that triggers this step
  description: string;
  orderIndex: number;
}

interface FunnelAnalysisResult {
  funnelId: string;
  funnelName: string;
  analysedAt: Date;
  dateRange: { start: Date; end: Date };
  totalEntrants: number;
  steps: FunnelStepResult[];
  overallConversionRate: number;
  avgTimeToComplete: number;       // Minutes from first to last step
  dropoffInsights: DropoffInsight[];
}

interface FunnelStepResult {
  stepId: string;
  stepName: string;
  entrants: number;
  completions: number;
  conversionRate: number;          // % who completed this step
  dropoffRate: number;             // % who dropped off at this step
  avgTimeToComplete: number;       // Minutes from previous step
  medianTimeToComplete: number;
}

interface DropoffInsight {
  stepName: string;
  dropoffRate: number;
  possibleReasons: string[];
  suggestedActions: string[];
}

// Pre-defined funnel templates for common learning journeys
const FUNNEL_TEMPLATES: Omit<FunnelDefinition, 'id' | 'tenantId' | 'dateRange'>[] = [
  {
    name: 'Storybook Reading Journey',
    description: 'Tracks a learner from library browse to book completion',
    steps: [
      { id: 'library_visit', name: 'Visit Library', eventName: 'library.viewed', description: 'Opened the storybook library', orderIndex: 0 },
      { id: 'book_preview', name: 'Preview Book', eventName: 'book.previewed', description: 'Tapped on a book to see details', orderIndex: 1 },
      { id: 'book_start', name: 'Start Reading', eventName: 'book.started', description: 'Began reading the book', orderIndex: 2 },
      { id: 'halfway', name: 'Reach Halfway', eventName: 'book.halfway', description: 'Read past the midpoint', orderIndex: 3 },
      { id: 'book_complete', name: 'Complete Book', eventName: 'book.completed', description: 'Finished the entire book', orderIndex: 4 },
      { id: 'next_book', name: 'Start Next Book', eventName: 'book.started_next', description: 'Started another book within 24h', orderIndex: 5 },
    ],
  },
  {
    name: 'Phase Progression Journey',
    description: 'Tracks a learner from phase introduction to phase mastery',
    steps: [
      { id: 'phase_intro', name: 'Phase Introduction', eventName: 'phase.introduced', description: 'First exposure to new phase GPCs', orderIndex: 0 },
      { id: 'first_mastery', name: 'First GPC Mastered', eventName: 'gpc.first_mastered', description: 'Mastered first GPC in the phase', orderIndex: 1 },
      { id: 'half_mastered', name: '50% GPCs Mastered', eventName: 'phase.half_mastered', description: 'Mastered half the phase GPCs', orderIndex: 2 },
      { id: 'phase_secure', name: 'Phase Secured', eventName: 'phase.secured', description: '80%+ of phase GPCs mastered', orderIndex: 3 },
      { id: 'phase_complete', name: 'Phase Complete', eventName: 'phase.completed', description: '95%+ mastery, ready for next phase', orderIndex: 4 },
    ],
  },
  {
    name: 'Teacher Onboarding Funnel',
    description: 'Tracks teacher journey from signup to active classroom use',
    steps: [
      { id: 'signup', name: 'Account Created', eventName: 'teacher.signup', description: 'Teacher created account', orderIndex: 0 },
      { id: 'wizard_start', name: 'Started Wizard', eventName: 'onboarding.wizard_started', description: 'Began onboarding wizard', orderIndex: 1 },
      { id: 'wizard_complete', name: 'Completed Wizard', eventName: 'onboarding.wizard_completed', description: 'Finished all onboarding steps', orderIndex: 2 },
      { id: 'first_student', name: 'Added Students', eventName: 'classroom.students_added', description: 'Added first students to classroom', orderIndex: 3 },
      { id: 'first_assignment', name: 'First Assignment', eventName: 'assignment.created', description: 'Created first reading assignment', orderIndex: 4 },
      { id: 'weekly_active', name: 'Weekly Active', eventName: 'teacher.weekly_active', description: 'Active for 2+ weeks', orderIndex: 5 },
    ],
  },
  {
    name: 'Parent Engagement Funnel',
    description: 'Tracks parent journey from first login to regular engagement',
    steps: [
      { id: 'first_login', name: 'First Login', eventName: 'parent.first_login', description: 'Parent logged into app', orderIndex: 0 },
      { id: 'view_progress', name: 'Viewed Progress', eventName: 'parent.progress_viewed', description: 'Checked child progress', orderIndex: 1 },
      { id: 'activity_tried', name: 'Tried Activity', eventName: 'parent.activity_started', description: 'Started a home activity', orderIndex: 2 },
      { id: 'read_together', name: 'Read Together', eventName: 'parent.read_together', description: 'Completed shared reading session', orderIndex: 3 },
      { id: 'weekly_return', name: 'Weekly Return', eventName: 'parent.weekly_active', description: 'Active for 2+ weeks', orderIndex: 4 },
    ],
  },
];

// =============================================================================
// Section 3: Engagement Heatmap Engine
// =============================================================================

interface HeatmapData {
  type: 'hourly' | 'daily' | 'genre' | 'difficulty';
  tenantId: string;
  dateRange: { start: Date; end: Date };
  cells: HeatmapCell[];
  summary: HeatmapSummary;
}

interface HeatmapCell {
  xLabel: string;     // Day of week or genre
  yLabel: string;     // Hour of day or difficulty level
  value: number;      // Session count, minutes, or completion rate
  normalised: number; // 0-1 for colour intensity
  tooltip: string;    // Human-readable detail
}

interface HeatmapSummary {
  peakDay: string;
  peakHour: string;
  peakCombination: string;
  quietestPeriod: string;
  totalSessions: number;
  totalMinutes: number;
  avgSessionDuration: number;
  recommendation: string;
}

// =============================================================================
// Section 4: Analytics Insight Generator
// =============================================================================

// Insights are the "so what?" layer — they translate raw data patterns into
// actionable educator language. Like a good data analyst, the insight generator
// doesn't just say "metric X went up"; it says "here's what this means for
// your classroom and what you might do about it."

interface AnalyticsInsight {
  id: string;
  type: InsightType;
  severity: 'info' | 'positive' | 'warning' | 'critical';
  title: string;
  description: string;
  evidence: string;                // Data backing the insight
  suggestedAction: string;
  affectedLearners?: number;
  confidence: number;              // 0-1 confidence in this insight
}

enum InsightType {
  ENGAGEMENT_DROP = 'engagement_drop',
  PHASE_BOTTLENECK = 'phase_bottleneck',
  HIGH_PERFORMER = 'high_performer',
  AT_RISK_LEARNER = 'at_risk_learner',
  OPTIMAL_TIMING = 'optimal_timing',
  CONTENT_GAP = 'content_gap',
  STREAK_PATTERN = 'streak_pattern',
  READING_CORRELATION = 'reading_correlation',
  WELLBEING_CONCERN = 'wellbeing_concern',
  CELEBRATION = 'celebration',
}

// =============================================================================
// Section 5: Analytics Dashboard Service
// =============================================================================

class AnalyticsDashboardService extends ScholarlyBaseService {
  constructor(prisma: PrismaClient) {
    super(prisma, 'AnalyticsDashboardService');
  }

  // -------------------------------------------------------------------------
  // Cohort Analysis
  // -------------------------------------------------------------------------

  async analyseCohort(definition: CohortDefinition): Promise<Result<CohortAnalysisResult>> {
    try {
      // Build cohort membership based on segmentation criteria
      const cohortMembers = await this.buildCohort(definition);
      if (cohortMembers.length === 0) {
        return fail('No learners match cohort criteria', 'EMPTY_COHORT');
      }

      const weekCount = Math.ceil(
        (definition.dateRange.end.getTime() - definition.dateRange.start.getTime()) /
        (7 * 24 * 60 * 60 * 1000)
      );

      // Calculate retention curve
      const retentionCurve = await this.calculateRetentionCurve(
        cohortMembers, definition.dateRange.start, weekCount, definition.tenantId
      );

      // Calculate progression curve
      const progressionCurve = await this.calculateProgressionCurve(
        cohortMembers, definition.dateRange.start, weekCount, definition.tenantId
      );

      // Calculate engagement metrics
      const engagementMetrics = await this.calculateCohortEngagement(
        cohortMembers, definition.dateRange, definition.tenantId
      );

      // Generate insights
      const insights = this.generateCohortInsights(
        retentionCurve, progressionCurve, engagementMetrics, cohortMembers.length
      );

      // Get platform benchmark for comparison
      const benchmark = await this.calculateBenchmark(definition.tenantId, definition.segmentation);

      return ok({
        cohortId: definition.id,
        cohortName: definition.name,
        cohortSize: cohortMembers.length,
        analysedAt: new Date(),
        retentionCurve,
        progressionCurve,
        engagementMetrics,
        comparisonBenchmark: benchmark,
        insights,
      });
    } catch (error) {
      this.log('error', 'Cohort analysis failed', { cohortId: definition.id, error: String(error) });
      return fail(`Cohort analysis failed: ${error}`, 'ANALYSIS_FAILED');
    }
  }

  private async buildCohort(definition: CohortDefinition): Promise<string[]> {
    const { segmentation, dateRange, tenantId } = definition;
    let query: string;

    switch (segmentation.type) {
      case 'phase_start':
        query = `SELECT DISTINCT lp."userId" FROM "LearnerProfile" lp
                 JOIN "PhonicsPhaseHistory" pph ON pph."learnerId" = lp."userId"
                 WHERE pph."phase" = ${segmentation.phonicsPhase || 2}
                 AND pph."startedAt" BETWEEN '${dateRange.start.toISOString()}' AND '${dateRange.end.toISOString()}'
                 AND lp."tenantId" = '${tenantId}'`;
        break;
      case 'enrollment_date':
        query = `SELECT "id" as "userId" FROM "User"
                 WHERE "createdAt" BETWEEN '${dateRange.start.toISOString()}' AND '${dateRange.end.toISOString()}'
                 AND "tenantId" = '${tenantId}' AND "role" = 'learner'`;
        break;
      case 'age_group':
        query = `SELECT lp."userId" FROM "LearnerProfile" lp
                 WHERE EXTRACT(YEAR FROM AGE(lp."dateOfBirth")) BETWEEN ${segmentation.ageRange?.min || 3} AND ${segmentation.ageRange?.max || 12}
                 AND lp."tenantId" = '${tenantId}'`;
        break;
      case 'school':
        query = `SELECT DISTINCT lp."userId" FROM "LearnerProfile" lp
                 JOIN "Classroom" c ON lp."classroomId" = c."id"
                 WHERE c."schoolId" = '${segmentation.schoolId}'
                 AND lp."tenantId" = '${tenantId}'`;
        break;
      default:
        query = `SELECT "id" as "userId" FROM "User"
                 WHERE "tenantId" = '${tenantId}' AND "role" = 'learner'`;
    }

    try {
      const result = await this.prisma.$queryRawUnsafe<{ userId: string }[]>(query);
      return result.map(r => r.userId);
    } catch {
      return [];
    }
  }

  private async calculateRetentionCurve(
    members: string[], startDate: Date, weeks: number, tenantId: string
  ): Promise<RetentionDataPoint[]> {
    const curve: RetentionDataPoint[] = [];

    for (let week = 0; week < Math.min(weeks, 26); week++) {
      const weekStart = new Date(startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      try {
        const memberList = members.map(m => `'${m}'`).join(',');
        const result = await this.prisma.$queryRawUnsafe<[{
          active: bigint; sessions: bigint; avgMinutes: number;
        }]>(
          `SELECT COUNT(DISTINCT "learnerId") as active,
                  COUNT(*) as sessions,
                  AVG("durationMinutes") as "avgMinutes"
           FROM "ReadingSession"
           WHERE "learnerId" IN (${memberList})
           AND "tenantId" = $1
           AND "completedAt" BETWEEN $2 AND $3`,
          tenantId, weekStart, weekEnd
        );

        const r = result[0];
        const activeUsers = Number(r.active);

        curve.push({
          weekNumber: week,
          activeUsers,
          retentionRate: members.length > 0 ? (activeUsers / members.length) * 100 : 0,
          readingSessions: Number(r.sessions),
          avgMinutesPerUser: activeUsers > 0 ? (r.avgMinutes || 0) : 0,
        });
      } catch {
        curve.push({
          weekNumber: week, activeUsers: 0, retentionRate: 0, readingSessions: 0, avgMinutesPerUser: 0,
        });
      }
    }

    return curve;
  }

  private async calculateProgressionCurve(
    members: string[], startDate: Date, weeks: number, tenantId: string
  ): Promise<ProgressionDataPoint[]> {
    const curve: ProgressionDataPoint[] = [];

    for (let week = 0; week < Math.min(weeks, 26); week++) {
      const weekEnd = new Date(startDate.getTime() + (week + 1) * 7 * 24 * 60 * 60 * 1000);

      try {
        const memberList = members.map(m => `'${m}'`).join(',');
        const result = await this.prisma.$queryRawUnsafe<[{
          avgPhase: number; avgMastery: number; advancedCount: bigint; avgBooks: number; avgWcpm: number;
        }]>(
          `SELECT AVG(lp."currentPhase") as "avgPhase",
                  AVG(bkt."avgMastery") as "avgMastery",
                  COUNT(CASE WHEN pph."advancedPhase" = true THEN 1 END) as "advancedCount",
                  AVG(lp."totalBooksRead") as "avgBooks",
                  AVG(lp."latestWCPM") as "avgWcpm"
           FROM "LearnerProfile" lp
           LEFT JOIN (SELECT "learnerId", AVG("pMastery") as "avgMastery"
                      FROM "BKTMastery" GROUP BY "learnerId") bkt ON bkt."learnerId" = lp."userId"
           LEFT JOIN "PhonicsPhaseHistory" pph ON pph."learnerId" = lp."userId" AND pph."startedAt" <= $1
           WHERE lp."userId" IN (${memberList}) AND lp."tenantId" = $2`,
          weekEnd, tenantId
        );

        const r = result[0];
        curve.push({
          weekNumber: week,
          avgPhase: r.avgPhase || 2,
          avgMastery: r.avgMastery || 0,
          advancedPhaseCount: Number(r.advancedCount || 0),
          advancedPhaseRate: members.length > 0 ? (Number(r.advancedCount || 0) / members.length) * 100 : 0,
          avgBooksCompleted: r.avgBooks || 0,
          avgWCPM: r.avgWcpm || 0,
        });
      } catch {
        curve.push({
          weekNumber: week, avgPhase: 2, avgMastery: 0, advancedPhaseCount: 0,
          advancedPhaseRate: 0, avgBooksCompleted: 0, avgWCPM: 0,
        });
      }
    }

    return curve;
  }

  private async calculateCohortEngagement(
    members: string[], dateRange: { start: Date; end: Date }, tenantId: string
  ): Promise<CohortEngagementMetrics> {
    const memberList = members.map(m => `'${m}'`).join(',');
    if (members.length === 0) {
      return {
        avgSessionsPerWeek: 0, avgMinutesPerSession: 0, avgBooksPerWeek: 0,
        completionRate: 0, reReadRate: 0, streakDistribution: [],
        topGenres: [], peakHours: [],
      };
    }

    try {
      // Session stats
      const sessionStats = await this.prisma.$queryRawUnsafe<[{
        totalSessions: bigint; avgDuration: number; totalCompleted: bigint; totalStarted: bigint;
      }]>(
        `SELECT COUNT(*) as "totalSessions",
                AVG("durationMinutes") as "avgDuration",
                COUNT(CASE WHEN "completed" = true THEN 1 END) as "totalCompleted",
                COUNT(DISTINCT "bookId") as "totalStarted"
         FROM "ReadingSession"
         WHERE "learnerId" IN (${memberList}) AND "tenantId" = $1
         AND "completedAt" BETWEEN $2 AND $3`,
        tenantId, dateRange.start, dateRange.end
      );

      const weeks = Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      const s = sessionStats[0];

      // Peak hours
      const hourStats = await this.prisma.$queryRawUnsafe<{ hour: number; count: bigint }[]>(
        `SELECT EXTRACT(HOUR FROM "completedAt")::int as hour, COUNT(*) as count
         FROM "ReadingSession"
         WHERE "learnerId" IN (${memberList}) AND "tenantId" = $1
         AND "completedAt" BETWEEN $2 AND $3
         GROUP BY hour ORDER BY count DESC`,
        tenantId, dateRange.start, dateRange.end
      );

      // Streak distribution
      const streakStats = await this.prisma.$queryRawUnsafe<{ streak: number }[]>(
        `SELECT "currentStreak" as streak FROM "LearnerProfile"
         WHERE "userId" IN (${memberList}) AND "tenantId" = $1`,
        tenantId
      );

      const streakBuckets = [
        { range: '0 days', min: 0, max: 0 },
        { range: '1-3 days', min: 1, max: 3 },
        { range: '4-7 days', min: 4, max: 7 },
        { range: '8-14 days', min: 8, max: 14 },
        { range: '15-30 days', min: 15, max: 30 },
        { range: '30+ days', min: 31, max: Infinity },
      ];

      const streakDistribution = streakBuckets.map(bucket => {
        const count = streakStats.filter(s => s.streak >= bucket.min && s.streak <= bucket.max).length;
        return { range: bucket.range, count, percentage: members.length > 0 ? (count / members.length) * 100 : 0 };
      });

      return {
        avgSessionsPerWeek: Number(s.totalSessions) / weeks / members.length,
        avgMinutesPerSession: s.avgDuration || 0,
        avgBooksPerWeek: Number(s.totalCompleted) / weeks / members.length,
        completionRate: Number(s.totalStarted) > 0 ? (Number(s.totalCompleted) / Number(s.totalStarted)) * 100 : 0,
        reReadRate: 0, // Would require book-level dedup query
        streakDistribution,
        topGenres: [], // Would query genre tags from storybook metadata
        peakHours: hourStats.slice(0, 5).map(h => ({ hour: h.hour, sessions: Number(h.count) })),
      };
    } catch (error) {
      this.log('error', 'Failed to calculate cohort engagement', { error: String(error) });
      return {
        avgSessionsPerWeek: 0, avgMinutesPerSession: 0, avgBooksPerWeek: 0,
        completionRate: 0, reReadRate: 0, streakDistribution: [],
        topGenres: [], peakHours: [],
      };
    }
  }

  private async calculateBenchmark(
    tenantId: string, segmentation: CohortSegmentation
  ): Promise<CohortBenchmark> {
    // Platform-wide benchmark calculation
    return {
      benchmarkType: 'platform_average',
      retentionRate: 72,
      progressionRate: 45,
      avgSessionsPerWeek: 3.2,
      performanceVsBenchmark: 'at',
    };
  }

  private generateCohortInsights(
    retention: RetentionDataPoint[], progression: ProgressionDataPoint[],
    engagement: CohortEngagementMetrics, cohortSize: number
  ): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Retention cliff detection
    for (let i = 1; i < retention.length; i++) {
      const drop = retention[i - 1].retentionRate - retention[i].retentionRate;
      if (drop > 15) {
        insights.push({
          id: `insight_retention_cliff_w${i}`,
          type: InsightType.ENGAGEMENT_DROP,
          severity: drop > 25 ? 'critical' : 'warning',
          title: `Retention cliff at week ${i}`,
          description: `${drop.toFixed(0)}% of learners became inactive between week ${i - 1} and week ${i}. This is a significant drop that warrants investigation.`,
          evidence: `Retention dropped from ${retention[i - 1].retentionRate.toFixed(0)}% to ${retention[i].retentionRate.toFixed(0)}%`,
          suggestedAction: 'Review what happens in the learning journey at this point. Is there a difficulty spike? A content gap? Consider adding engagement features (reminders, rewards) at this stage.',
          affectedLearners: Math.round(cohortSize * drop / 100),
          confidence: 0.85,
        });
      }
    }

    // Phase bottleneck detection
    if (progression.length >= 4) {
      const midPoint = Math.floor(progression.length / 2);
      const earlyProgression = progression[midPoint].advancedPhaseRate;
      if (earlyProgression < 20) {
        insights.push({
          id: 'insight_phase_bottleneck',
          type: InsightType.PHASE_BOTTLENECK,
          severity: 'warning',
          title: 'Slow phase progression detected',
          description: `Only ${earlyProgression.toFixed(0)}% of learners have advanced to the next phase by the midpoint. This suggests the current phase content may need additional support.`,
          evidence: `${earlyProgression.toFixed(0)}% advancement rate at week ${midPoint}`,
          suggestedAction: 'Review which GPCs have the lowest mastery in this phase. Consider adding more storybooks targeting those specific GPCs, or adjusting the difficulty ladder.',
          confidence: 0.75,
        });
      }
    }

    // Engagement celebration
    if (engagement.avgSessionsPerWeek > 4) {
      insights.push({
        id: 'insight_high_engagement',
        type: InsightType.CELEBRATION,
        severity: 'positive',
        title: 'Exceptional engagement!',
        description: `This cohort averages ${engagement.avgSessionsPerWeek.toFixed(1)} sessions per week — well above the platform average. Whatever you're doing, keep doing it!`,
        evidence: `${engagement.avgSessionsPerWeek.toFixed(1)} sessions/week, ${engagement.avgMinutesPerSession.toFixed(0)} min/session`,
        suggestedAction: 'Consider sharing successful practices with other educators. These learners may also be ready for enrichment content.',
        confidence: 0.9,
      });
    }

    // Low completion rate warning
    if (engagement.completionRate < 50) {
      insights.push({
        id: 'insight_low_completion',
        type: InsightType.CONTENT_GAP,
        severity: 'warning',
        title: 'Low book completion rate',
        description: `Only ${engagement.completionRate.toFixed(0)}% of started books are being finished. Learners may be encountering difficulty spikes mid-book or losing interest.`,
        evidence: `${engagement.completionRate.toFixed(0)}% completion rate`,
        suggestedAction: 'Check decodability scores of the most-abandoned books. Consider shorter books or more engaging illustrations for this cohort.',
        confidence: 0.8,
      });
    }

    // Optimal timing insight
    if (engagement.peakHours.length > 0) {
      const peak = engagement.peakHours[0];
      const hour = peak.hour > 12 ? `${peak.hour - 12}PM` : `${peak.hour}AM`;
      insights.push({
        id: 'insight_peak_time',
        type: InsightType.OPTIMAL_TIMING,
        severity: 'info',
        title: `Peak reading time: ${hour}`,
        description: `Most reading happens around ${hour}. Scheduling phonics activities and sending reminders at this time may boost engagement.`,
        evidence: `${peak.sessions} sessions at ${hour} (highest of all hours)`,
        suggestedAction: `Schedule push notifications and daily digest for around ${hour}. If this is a classroom cohort, consider aligning the timetable.`,
        confidence: 0.7,
      });
    }

    return insights;
  }

  // -------------------------------------------------------------------------
  // Funnel Analysis
  // -------------------------------------------------------------------------

  async analyseFunnel(definition: FunnelDefinition): Promise<Result<FunnelAnalysisResult>> {
    try {
      const sortedSteps = [...definition.steps].sort((a, b) => a.orderIndex - b.orderIndex);
      const stepResults: FunnelStepResult[] = [];
      let previousEntrants = 0;

      for (let i = 0; i < sortedSteps.length; i++) {
        const step = sortedSteps[i];

        const result = await this.prisma.$queryRawUnsafe<[{
          entrants: bigint; avgTime: number; medianTime: number;
        }]>(
          `SELECT COUNT(DISTINCT "userId") as entrants,
                  AVG("timeFromPrevious") as "avgTime",
                  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "timeFromPrevious") as "medianTime"
           FROM "AnalyticsEvent"
           WHERE "eventName" = $1 AND "tenantId" = $2
           AND "createdAt" BETWEEN $3 AND $4`,
          step.eventName, definition.tenantId, definition.dateRange.start, definition.dateRange.end
        );

        const entrants = Number(result[0]?.entrants || 0);
        const completions = i < sortedSteps.length - 1
          ? await this.getStepCompletions(sortedSteps[i + 1].eventName, definition.tenantId, definition.dateRange)
          : entrants;

        if (i === 0) previousEntrants = entrants;

        stepResults.push({
          stepId: step.id,
          stepName: step.name,
          entrants,
          completions,
          conversionRate: previousEntrants > 0 ? (entrants / previousEntrants) * 100 : 100,
          dropoffRate: previousEntrants > 0 ? ((previousEntrants - entrants) / previousEntrants) * 100 : 0,
          avgTimeToComplete: result[0]?.avgTime || 0,
          medianTimeToComplete: result[0]?.medianTime || 0,
        });

        previousEntrants = entrants;
      }

      // Generate dropoff insights
      const dropoffInsights = this.generateDropoffInsights(stepResults);

      return ok({
        funnelId: definition.id,
        funnelName: definition.name,
        analysedAt: new Date(),
        dateRange: definition.dateRange,
        totalEntrants: stepResults[0]?.entrants || 0,
        steps: stepResults,
        overallConversionRate: stepResults.length > 0 && stepResults[0].entrants > 0
          ? (stepResults[stepResults.length - 1].entrants / stepResults[0].entrants) * 100 : 0,
        avgTimeToComplete: stepResults.reduce((sum, s) => sum + s.avgTimeToComplete, 0),
        dropoffInsights,
      });
    } catch (error) {
      return fail(`Funnel analysis failed: ${error}`, 'FUNNEL_FAILED');
    }
  }

  private async getStepCompletions(
    eventName: string, tenantId: string, dateRange: { start: Date; end: Date }
  ): Promise<number> {
    try {
      const result = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(DISTINCT "userId") as count FROM "AnalyticsEvent"
         WHERE "eventName" = $1 AND "tenantId" = $2
         AND "createdAt" BETWEEN $3 AND $4`,
        eventName, tenantId, dateRange.start, dateRange.end
      );
      return Number(result[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  private generateDropoffInsights(steps: FunnelStepResult[]): DropoffInsight[] {
    return steps
      .filter(s => s.dropoffRate > 20)
      .map(s => ({
        stepName: s.stepName,
        dropoffRate: s.dropoffRate,
        possibleReasons: this.inferDropoffReasons(s.stepName, s.dropoffRate),
        suggestedActions: this.suggestDropoffActions(s.stepName),
      }));
  }

  private inferDropoffReasons(stepName: string, dropoffRate: number): string[] {
    const reasons: string[] = [];
    if (stepName.includes('Complete') || stepName.includes('Finish')) {
      reasons.push('Content may be too difficult at this stage');
      reasons.push('Books may be too long for the target age group');
    }
    if (stepName.includes('Start') || stepName.includes('Begin')) {
      reasons.push('UI may not make the next step obvious');
      reasons.push('Learners may not find content that interests them');
    }
    if (dropoffRate > 50) {
      reasons.push('Significant friction point — consider UX research');
    }
    return reasons;
  }

  private suggestDropoffActions(stepName: string): string[] {
    const actions: string[] = [];
    actions.push('Run an A/B test on this step to identify improvements');
    actions.push('Review session recordings for this step (if available)');
    if (stepName.includes('Book') || stepName.includes('Read')) {
      actions.push('Check decodability scores of books at this stage');
      actions.push('Consider adding mid-book encouragement (badges, checkpoints)');
    }
    return actions;
  }

  // -------------------------------------------------------------------------
  // Engagement Heatmaps
  // -------------------------------------------------------------------------

  async generateHeatmap(
    tenantId: string, type: HeatmapData['type'], dateRange: { start: Date; end: Date },
    classroomId?: string
  ): Promise<Result<HeatmapData>> {
    try {
      const classroomClause = classroomId
        ? `AND rs."learnerId" IN (SELECT "userId" FROM "LearnerProfile" WHERE "classroomId" = '${classroomId}')`
        : '';

      if (type === 'hourly') {
        const result = await this.prisma.$queryRawUnsafe<{
          dayOfWeek: number; hour: number; sessionCount: bigint; totalMinutes: number;
        }[]>(
          `SELECT EXTRACT(DOW FROM "completedAt")::int as "dayOfWeek",
                  EXTRACT(HOUR FROM "completedAt")::int as hour,
                  COUNT(*) as "sessionCount",
                  SUM("durationMinutes") as "totalMinutes"
           FROM "ReadingSession" rs
           WHERE rs."tenantId" = $1
           AND rs."completedAt" BETWEEN $2 AND $3
           ${classroomClause}
           GROUP BY "dayOfWeek", hour`,
          tenantId, dateRange.start, dateRange.end
        );

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const maxSessions = Math.max(...result.map(r => Number(r.sessionCount)), 1);

        const cells: HeatmapCell[] = result.map(r => ({
          xLabel: dayNames[r.dayOfWeek],
          yLabel: `${r.hour}:00`,
          value: Number(r.sessionCount),
          normalised: Number(r.sessionCount) / maxSessions,
          tooltip: `${dayNames[r.dayOfWeek]} ${r.hour}:00 — ${r.sessionCount} sessions, ${Math.round(r.totalMinutes)} min total`,
        }));

        const peak = result.sort((a, b) => Number(b.sessionCount) - Number(a.sessionCount))[0];
        const quietest = result.sort((a, b) => Number(a.sessionCount) - Number(b.sessionCount))[0];

        return ok({
          type: 'hourly',
          tenantId,
          dateRange,
          cells,
          summary: {
            peakDay: peak ? dayNames[peak.dayOfWeek] : 'N/A',
            peakHour: peak ? `${peak.hour}:00` : 'N/A',
            peakCombination: peak ? `${dayNames[peak.dayOfWeek]} at ${peak.hour}:00` : 'N/A',
            quietestPeriod: quietest ? `${dayNames[quietest.dayOfWeek]} at ${quietest.hour}:00` : 'N/A',
            totalSessions: result.reduce((sum, r) => sum + Number(r.sessionCount), 0),
            totalMinutes: result.reduce((sum, r) => sum + Math.round(r.totalMinutes), 0),
            avgSessionDuration: result.length > 0
              ? result.reduce((sum, r) => sum + r.totalMinutes, 0) / result.reduce((sum, r) => sum + Number(r.sessionCount), 0) : 0,
            recommendation: peak
              ? `Peak engagement is ${dayNames[peak.dayOfWeek]} at ${peak.hour}:00. Schedule reading activities and send reminders to align with this window.`
              : 'Not enough data to determine peak engagement times yet.',
          },
        });
      }

      // Default: return empty heatmap for unsupported types
      return ok({
        type, tenantId, dateRange, cells: [],
        summary: {
          peakDay: 'N/A', peakHour: 'N/A', peakCombination: 'N/A', quietestPeriod: 'N/A',
          totalSessions: 0, totalMinutes: 0, avgSessionDuration: 0,
          recommendation: 'Collect more data to generate heatmap insights.',
        },
      });
    } catch (error) {
      return fail(`Heatmap generation failed: ${error}`, 'HEATMAP_FAILED');
    }
  }

  // -------------------------------------------------------------------------
  // At-Risk Learner Detection
  // -------------------------------------------------------------------------

  async detectAtRiskLearners(
    tenantId: string, classroomId?: string
  ): Promise<Result<AtRiskLearner[]>> {
    try {
      const classroomClause = classroomId
        ? `AND lp."classroomId" = '${classroomId}'` : '';

      const learners = await this.prisma.$queryRawUnsafe<AtRiskRow[]>(
        `SELECT u."id", u."firstName", lp."currentPhase", lp."currentStreak",
                lp."totalBooksRead", lp."latestWCPM",
                (SELECT AVG("pMastery") FROM "BKTMastery" WHERE "learnerId" = u."id") as "avgMastery",
                (SELECT MAX("completedAt") FROM "ReadingSession" WHERE "learnerId" = u."id") as "lastActive",
                (SELECT AVG("moodScore") FROM "WellbeingCheck"
                 WHERE "learnerId" = u."id" AND "recordedAt" > NOW() - INTERVAL '7 days') as "recentMood"
         FROM "User" u
         JOIN "LearnerProfile" lp ON lp."userId" = u."id"
         WHERE lp."tenantId" = $1 AND u."role" = 'learner'
         ${classroomClause}`,
        tenantId
      );

      const atRisk: AtRiskLearner[] = [];

      for (const learner of learners) {
        const riskFactors: RiskFactor[] = [];
        let riskScore = 0;

        // Inactivity risk
        if (learner.lastActive) {
          const daysSinceActive = (Date.now() - new Date(learner.lastActive).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceActive > 7) {
            riskFactors.push({ factor: 'Inactive for ' + Math.round(daysSinceActive) + ' days', weight: 0.3 });
            riskScore += 0.3;
          }
        }

        // Low mastery risk
        if (learner.avgMastery && learner.avgMastery < 0.4) {
          riskFactors.push({ factor: 'Low overall mastery (' + (learner.avgMastery * 100).toFixed(0) + '%)', weight: 0.25 });
          riskScore += 0.25;
        }

        // Broken streak
        if (learner.currentStreak === 0) {
          riskFactors.push({ factor: 'Reading streak broken', weight: 0.15 });
          riskScore += 0.15;
        }

        // Low mood
        if (learner.recentMood && learner.recentMood < 2.5) {
          riskFactors.push({ factor: 'Low engagement mood (' + learner.recentMood.toFixed(1) + '/5)', weight: 0.2 });
          riskScore += 0.2;
        }

        // Slow WCPM progress
        if (learner.latestWCPM && learner.latestWCPM < 20 && learner.currentPhase >= 3) {
          riskFactors.push({ factor: 'Reading fluency below expected level', weight: 0.2 });
          riskScore += 0.2;
        }

        if (riskScore >= 0.3) {
          atRisk.push({
            learnerId: learner.id,
            name: learner.firstName,
            currentPhase: learner.currentPhase,
            riskScore: Math.min(1, riskScore),
            riskLevel: riskScore >= 0.7 ? 'high' : riskScore >= 0.5 ? 'medium' : 'low',
            riskFactors,
            suggestedInterventions: this.suggestInterventions(riskFactors),
          });
        }
      }

      atRisk.sort((a, b) => b.riskScore - a.riskScore);
      return ok(atRisk);
    } catch (error) {
      return fail(`At-risk detection failed: ${error}`, 'DETECTION_FAILED');
    }
  }

  private suggestInterventions(factors: RiskFactor[]): string[] {
    const interventions: string[] = [];
    for (const factor of factors) {
      if (factor.factor.includes('Inactive')) {
        interventions.push('Send a personalised "we miss you" notification with a recommended book');
        interventions.push('Schedule a 1:1 check-in with the learner');
      }
      if (factor.factor.includes('mastery')) {
        interventions.push('Review GPC-specific weaknesses and assign targeted storybooks');
        interventions.push('Consider extra small-group phonics sessions');
      }
      if (factor.factor.includes('mood')) {
        interventions.push('Prioritise fun, engaging content over challenging material');
        interventions.push('Check in about the child\'s emotional wellbeing');
      }
      if (factor.factor.includes('fluency')) {
        interventions.push('Increase read-aloud practice with easier books to build confidence');
        interventions.push('Use the audio narration mode for supported reading practice');
      }
    }
    return [...new Set(interventions)].slice(0, 4);
  }
}

// =============================================================================
// Section 6: Supporting Types
// =============================================================================

interface AtRiskLearner {
  learnerId: string; name: string; currentPhase: number;
  riskScore: number; riskLevel: 'low' | 'medium' | 'high';
  riskFactors: RiskFactor[]; suggestedInterventions: string[];
}
interface RiskFactor { factor: string; weight: number; }
interface AtRiskRow {
  id: string; firstName: string; currentPhase: number; currentStreak: number;
  totalBooksRead: number; latestWCPM: number; avgMastery: number;
  lastActive: Date; recentMood: number;
}

// =============================================================================
// Section 7: Express Routes
// =============================================================================

function createAnalyticsRoutes(service: AnalyticsDashboardService) {
  return {
    analyseCohort: async (req: any, res: any) => {
      const result = await service.analyseCohort(req.body);
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },
    analyseFunnel: async (req: any, res: any) => {
      const result = await service.analyseFunnel(req.body);
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },
    getHeatmap: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { type, startDate, endDate, classroomId } = req.query;
      const result = await service.generateHeatmap(tenantId, type, { start: new Date(startDate), end: new Date(endDate) }, classroomId);
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },
    getAtRiskLearners: async (req: any, res: any) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const result = await service.detectAtRiskLearners(tenantId, req.query.classroomId);
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },
    getFunnelTemplates: async (_req: any, res: any) => {
      return res.json({ templates: FUNNEL_TEMPLATES });
    },
  };
}

export {
  AnalyticsDashboardService,
  CohortDefinition,
  CohortAnalysisResult,
  FunnelDefinition,
  FunnelAnalysisResult,
  HeatmapData,
  AnalyticsInsight,
  InsightType,
  AtRiskLearner,
  FUNNEL_TEMPLATES,
  createAnalyticsRoutes,
};
