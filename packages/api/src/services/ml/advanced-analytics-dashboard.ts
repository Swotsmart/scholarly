// =============================================================================
// SCHOLARLY PLATFORM — Sprint 11: S11-004
// Advanced Analytics Dashboard
// =============================================================================
// If the Interactive Reader is where children learn and the Enchanted Library
// is where they discover, the Analytics Dashboard is where educators understand.
// Think of it as the mission control centre for a classroom's reading journey:
// dozens of screens showing trajectories, velocities, and fuel levels — except
// the trajectories are reading progress, the velocities are learning rates,
// and the fuel levels are engagement and wellbeing.
//
// The dashboard serves three audiences with different needs:
//   TEACHER: "Which students need intervention? Is my phonics instruction working?"
//   ADMIN: "How are different cohorts performing? Where do we allocate resources?"
//   PARENT: "How is my child progressing? What can I do at home to help?"
//
// Architecture:
//   DataAggregationService (pulls from BKT, reading sessions, wellbeing, Arena)
//   → CohortAnalysisEngine (groups learners, computes comparative metrics)
//   → InterventionAlertSystem (detects struggling learners, generates alerts)
//   → DashboardRenderer (builds widget configurations for the frontend)
// =============================================================================

import { Result, ServiceError } from '../shared/base';

// =============================================================================
// SECTION 1: DASHBOARD CONFIGURATION
// =============================================================================

/**
 * A DashboardConfig defines which widgets appear, their layout, data sources,
 * and refresh intervals. Teachers can customise their dashboard by adding,
 * removing, and rearranging widgets.
 */
export interface DashboardConfig {
  /** Dashboard identifier */
  dashboardId: string;
  /** Owner user ID */
  ownerId: string;
  /** Tenant context */
  tenantId: string;
  /** Dashboard role context */
  role: DashboardRole;
  /** Widget layout (responsive grid positions) */
  layout: DashboardLayout;
  /** Active widgets */
  widgets: DashboardWidget[];
  /** Global date range filter */
  dateRange: DateRangeFilter;
  /** Cohort filters applied globally */
  cohortFilters: CohortFilter[];
  /** Auto-refresh interval in seconds (0 = manual only) */
  refreshInterval: number;
  /** Theme preference */
  theme: 'light' | 'dark' | 'system';
  /** Created timestamp */
  createdAt: Date;
  /** Last accessed */
  lastAccessedAt: Date;
}

export type DashboardRole = 'teacher' | 'admin' | 'parent' | 'researcher';

export interface DashboardLayout {
  /** Number of columns in the grid */
  columns: number;
  /** Row height in pixels */
  rowHeight: number;
  /** Widget positions */
  positions: WidgetPosition[];
}

export interface WidgetPosition {
  widgetId: string;
  x: number;      // Column position (0-based)
  y: number;      // Row position (0-based)
  width: number;  // Columns spanned
  height: number; // Rows spanned
}

export interface DateRangeFilter {
  preset: 'today' | 'this_week' | 'this_month' | 'this_term' | 'this_year' | 'custom';
  startDate?: Date;
  endDate?: Date;
}

export interface CohortFilter {
  type: 'class' | 'year_group' | 'phonics_phase' | 'intervention_group' | 'custom';
  value: string;
  label: string;
}

// =============================================================================
// SECTION 2: WIDGET DEFINITIONS
// =============================================================================

/**
 * Each widget is a self-contained analytics view with its own data source,
 * visualisation type, and configuration. Think of widgets as instruments
 * on a car dashboard: the speedometer (WCPM trends), fuel gauge (engagement),
 * temperature gauge (wellbeing), and navigation display (learning trajectory).
 */
export interface DashboardWidget {
  widgetId: string;
  type: WidgetType;
  title: string;
  description: string;
  dataSource: DataSourceConfig;
  visualisation: VisualisationConfig;
  /** Widget-specific configuration */
  config: Record<string, unknown>;
  /** Whether this widget supports drill-down to individual learners */
  drillDownEnabled: boolean;
  /** Alert thresholds that trigger visual indicators on this widget */
  alertThresholds?: AlertThreshold[];
}

export type WidgetType =
  | 'mastery_heatmap'        // GPC mastery across learners (rows) × GPCs (columns)
  | 'reading_velocity'       // WCPM trends over time per learner/cohort
  | 'engagement_gauge'       // Reading frequency, session duration, book completion
  | 'intervention_alerts'    // List of learners flagged for intervention
  | 'cohort_comparison'      // Side-by-side cohort metrics
  | 'phonics_phase_progress' // Progress through phonics phases (funnel chart)
  | 'storybook_analytics'    // Most/least read books, engagement by theme
  | 'wellbeing_radar'        // Multi-dimensional wellbeing indicators
  | 'arena_leaderboard'      // Competitive standings and point distribution
  | 'formation_progress'     // Letter formation mastery trends
  | 'decodability_trends'    // Story decodability scores over time
  | 'session_summary'        // Recent reading session summaries
  | 'goal_tracker'           // Individual/class goals and progress
  | 'parent_overview'        // Simplified parent-friendly summary
  | 'time_on_task'           // Reading time distribution analysis
  | 'error_pattern_analysis' // Common misread GPCs, error clustering
  | 'vocabulary_growth'      // Vocabulary exposure and retention tracking
  | 'collaboration_metrics'; // Team story creation participation and quality

export interface DataSourceConfig {
  /** Primary data domain */
  domain: 'bkt' | 'reading_sessions' | 'wellbeing' | 'arena' | 'storybooks' | 'formation' | 'collaboration';
  /** Aggregation level */
  aggregation: 'individual' | 'class' | 'year_group' | 'school' | 'tenant';
  /** Time granularity */
  timeGranularity: 'session' | 'daily' | 'weekly' | 'monthly' | 'termly';
  /** Additional data joins (e.g., wellbeing + reading_sessions) */
  joins?: string[];
  /** Sort configuration */
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  /** Maximum data points to display */
  maxDataPoints?: number;
}

export interface VisualisationConfig {
  chartType: ChartType;
  colours: string[];
  showLegend: boolean;
  showLabels: boolean;
  animate: boolean;
  responsive: boolean;
  /** Accessibility: screen reader description template */
  ariaDescriptionTemplate: string;
}

export type ChartType =
  | 'heatmap' | 'line' | 'bar' | 'stacked_bar' | 'gauge'
  | 'radar' | 'funnel' | 'scatter' | 'table' | 'list'
  | 'donut' | 'treemap' | 'sparkline' | 'progress_ring';

export interface AlertThreshold {
  metric: string;
  operator: 'lt' | 'gt' | 'eq' | 'between';
  value: number;
  upperValue?: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

// =============================================================================
// SECTION 3: COHORT ANALYSIS ENGINE
// =============================================================================

/**
 * The CohortAnalysisEngine groups learners into meaningful cohorts and computes
 * comparative metrics. It answers questions like "Are my Phase 3 students
 * progressing faster than they were last term?" and "Which class in Year 2
 * has the strongest GPC mastery?"
 */
export interface CohortAnalysisResult {
  /** Cohort definition */
  cohort: CohortDefinition;
  /** Number of learners in cohort */
  learnerCount: number;
  /** Summary metrics */
  metrics: CohortMetrics;
  /** Distribution data for visualisations */
  distributions: CohortDistributions;
  /** Comparison with previous period */
  periodComparison?: PeriodComparison;
  /** Comparison with other cohorts */
  cohortComparisons?: CohortComparisonResult[];
  /** Generated insights (AI-powered observations) */
  insights: CohortInsight[];
  /** Timestamp of computation */
  computedAt: Date;
}

export interface CohortDefinition {
  cohortId: string;
  name: string;
  type: 'class' | 'year_group' | 'phonics_phase' | 'intervention' | 'custom';
  memberIds: string[];
  criteria: Record<string, unknown>;
}

export interface CohortMetrics {
  /** Average BKT mastery across all GPCs */
  averageMastery: number;
  /** Median mastery (less affected by outliers) */
  medianMastery: number;
  /** Standard deviation of mastery (spread indicator) */
  masteryStdDev: number;
  /** Average WCPM (words correct per minute) */
  averageWcpm: number;
  /** Median WCPM */
  medianWcpm: number;
  /** Average reading sessions per week */
  sessionsPerWeek: number;
  /** Average session duration in minutes */
  avgSessionDuration: number;
  /** Book completion rate */
  bookCompletionRate: number;
  /** Average decodability score in reading sessions */
  avgDecodabilityScore: number;
  /** Percentage of learners at or above age-expected level */
  atOrAboveExpected: number;
  /** Percentage flagged for intervention */
  interventionRate: number;
  /** Average engagement score (composite) */
  engagementScore: number;
  /** Average wellbeing score */
  wellbeingScore: number;
  /** GPC mastery coverage: what % of phase GPCs are mastered by >80% of cohort */
  gpcCoverageRate: number;
  /** Arena participation rate */
  arenaParticipationRate: number;
  /** Letter formation average score */
  avgFormationScore: number;
}

export interface CohortDistributions {
  /** Mastery distribution (histogram buckets) */
  masteryDistribution: DistributionBucket[];
  /** WCPM distribution */
  wcpmDistribution: DistributionBucket[];
  /** Phonics phase distribution (how many at each phase) */
  phaseDistribution: Record<number, number>;
  /** Session frequency distribution */
  sessionFrequencyDistribution: DistributionBucket[];
}

export interface DistributionBucket {
  rangeStart: number;
  rangeEnd: number;
  count: number;
  percentage: number;
  label: string;
}

export interface PeriodComparison {
  previousPeriod: { start: Date; end: Date };
  currentPeriod: { start: Date; end: Date };
  masteryChange: number;
  wcpmChange: number;
  engagementChange: number;
  interventionRateChange: number;
  direction: 'improving' | 'stable' | 'declining';
}

export interface CohortComparisonResult {
  comparedCohortId: string;
  comparedCohortName: string;
  masteryDelta: number;
  wcpmDelta: number;
  engagementDelta: number;
  direction: 'ahead' | 'behind' | 'aligned';
}

export interface CohortInsight {
  type: 'strength' | 'concern' | 'trend' | 'recommendation';
  message: string;
  confidence: number;
  affectedLearners?: string[];
  suggestedAction?: string;
}

// =============================================================================
// SECTION 4: INTERVENTION ALERT SYSTEM
// =============================================================================

/**
 * The InterventionAlertSystem monitors learner metrics against configurable
 * thresholds and generates actionable alerts when a child may need additional
 * support. It's the early warning system that prevents small struggles from
 * becoming large gaps.
 *
 * Alert types range from "this child hasn't read in 5 days" (engagement)
 * to "this child's mastery of Phase 3 digraphs is plateauing despite
 * practice" (learning plateau) to "this child's wellbeing scores have
 * been declining" (pastoral concern).
 */
export interface InterventionAlert {
  alertId: string;
  learnerId: string;
  learnerName: string;
  tenantId: string;
  alertType: InterventionAlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  triggerMetrics: TriggerMetric[];
  suggestedInterventions: SuggestedIntervention[];
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  notes: AlertNote[];
}

export type InterventionAlertType =
  | 'mastery_plateau'       // Learning rate has stalled
  | 'mastery_decline'       // Previously mastered GPCs being forgotten
  | 'engagement_drop'       // Significant decrease in reading activity
  | 'prolonged_absence'     // No reading sessions for extended period
  | 'wcpm_below_expected'   // Reading fluency below age expectations
  | 'high_error_rate'       // Consistently high error rate on target GPCs
  | 'wellbeing_concern'     // Declining wellbeing indicators
  | 'formation_difficulty'  // Struggling with letter formation
  | 'phase_readiness'       // Ready to advance to next phonics phase
  | 'frustration_detected'  // Multiple abandoned sessions or high error + low engagement
  | 'mirror_reversal_persistent' // Persistent b/d or p/q confusion
  | 'gifted_acceleration';  // Performing well above expectations, may need challenge

export interface TriggerMetric {
  metric: string;
  currentValue: number;
  threshold: number;
  direction: 'above' | 'below';
  period: string;
}

export interface SuggestedIntervention {
  type: 'targeted_practice' | 'one_on_one' | 'peer_support' | 'parent_activity'
    | 'difficulty_adjustment' | 'wellbeing_checkin' | 'acceleration' | 'specialist_referral';
  title: string;
  description: string;
  estimatedDuration: string;
  resources: string[];
  priority: number;
}

export interface AlertNote {
  noteId: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: Date;
}

// =============================================================================
// SECTION 5: ALERT RULE ENGINE
// =============================================================================

/**
 * Alert rules define the conditions that trigger intervention alerts.
 * Teachers can customise these per class or per learner.
 */
export interface AlertRule {
  ruleId: string;
  name: string;
  alertType: InterventionAlertType;
  enabled: boolean;
  conditions: AlertCondition[];
  severity: InterventionAlert['severity'];
  cooldownPeriod: number; // Hours before same alert can re-trigger for same learner
  scope: 'global' | 'tenant' | 'class' | 'learner';
  suggestedInterventions: SuggestedIntervention[];
}

export interface AlertCondition {
  metric: string;
  operator: 'lt' | 'gt' | 'eq' | 'change_lt' | 'change_gt' | 'absent_for';
  value: number;
  window: string; // e.g., '7d', '30d', '1h'
  aggregation: 'avg' | 'min' | 'max' | 'count' | 'sum' | 'latest';
}

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    ruleId: 'mastery_plateau',
    name: 'Mastery Plateau Detection',
    alertType: 'mastery_plateau',
    enabled: true,
    conditions: [
      { metric: 'bkt.mastery_change', operator: 'lt', value: 0.02, window: '14d', aggregation: 'avg' },
      { metric: 'reading_sessions.count', operator: 'gt', value: 5, window: '14d', aggregation: 'count' },
    ],
    severity: 'medium',
    cooldownPeriod: 168, // 7 days
    scope: 'global',
    suggestedInterventions: [
      { type: 'targeted_practice', title: 'Targeted GPC Practice', description: 'Focus sessions on the specific GPCs showing plateau.', estimatedDuration: '15 min/day', resources: ['jit-remediation'], priority: 1 },
      { type: 'difficulty_adjustment', title: 'Adjust Story Difficulty', description: 'Temporarily lower decodability threshold to build confidence.', estimatedDuration: 'Automatic', resources: ['story-engine'], priority: 2 },
    ],
  },
  {
    ruleId: 'engagement_drop',
    name: 'Engagement Drop Detection',
    alertType: 'engagement_drop',
    enabled: true,
    conditions: [
      { metric: 'reading_sessions.count', operator: 'change_lt', value: -0.5, window: '7d', aggregation: 'count' },
    ],
    severity: 'medium',
    cooldownPeriod: 72,
    scope: 'global',
    suggestedInterventions: [
      { type: 'parent_activity', title: 'Home Reading Activity', description: 'Send parent a themed reading activity pack.', estimatedDuration: '20 min', resources: ['parent-companion'], priority: 1 },
      { type: 'peer_support', title: 'Buddy Reading', description: 'Pair with an engaged reader for collaborative sessions.', estimatedDuration: '15 min', resources: ['collaboration-engine'], priority: 2 },
    ],
  },
  {
    ruleId: 'prolonged_absence',
    name: 'Prolonged Absence Detection',
    alertType: 'prolonged_absence',
    enabled: true,
    conditions: [
      { metric: 'reading_sessions.last_session', operator: 'absent_for', value: 5, window: '5d', aggregation: 'latest' },
    ],
    severity: 'high',
    cooldownPeriod: 120,
    scope: 'global',
    suggestedInterventions: [
      { type: 'parent_activity', title: 'Gentle Check-In', description: 'Send a friendly notification with a new story recommendation.', estimatedDuration: '5 min', resources: ['push-notifications'], priority: 1 },
    ],
  },
  {
    ruleId: 'wellbeing_concern',
    name: 'Wellbeing Decline Detection',
    alertType: 'wellbeing_concern',
    enabled: true,
    conditions: [
      { metric: 'wellbeing.composite_score', operator: 'change_lt', value: -0.2, window: '14d', aggregation: 'avg' },
    ],
    severity: 'high',
    cooldownPeriod: 168,
    scope: 'global',
    suggestedInterventions: [
      { type: 'wellbeing_checkin', title: 'Wellbeing Check-In', description: 'Schedule a pastoral check-in with the learner.', estimatedDuration: '10 min', resources: ['wellbeing-monitor'], priority: 1 },
    ],
  },
  {
    ruleId: 'phase_readiness',
    name: 'Phase Advancement Readiness',
    alertType: 'phase_readiness',
    enabled: true,
    conditions: [
      { metric: 'bkt.phase_mastery', operator: 'gt', value: 0.85, window: '7d', aggregation: 'avg' },
      { metric: 'bkt.phase_coverage', operator: 'gt', value: 0.9, window: '7d', aggregation: 'latest' },
    ],
    severity: 'low',
    cooldownPeriod: 336,
    scope: 'global',
    suggestedInterventions: [
      { type: 'acceleration', title: 'Phase Advancement', description: 'Learner is ready to progress to the next phonics phase.', estimatedDuration: 'Automatic', resources: ['scope-sequence'], priority: 1 },
    ],
  },
  {
    ruleId: 'mirror_reversal',
    name: 'Persistent Mirror Reversal',
    alertType: 'mirror_reversal_persistent',
    enabled: true,
    conditions: [
      { metric: 'formation.mirror_reversal_rate', operator: 'gt', value: 0.3, window: '14d', aggregation: 'avg' },
    ],
    severity: 'medium',
    cooldownPeriod: 168,
    scope: 'global',
    suggestedInterventions: [
      { type: 'targeted_practice', title: 'b/d Discrimination Practice', description: 'Focused exercises distinguishing commonly confused letters.', estimatedDuration: '10 min/day', resources: ['formation-engine'], priority: 1 },
      { type: 'specialist_referral', title: 'Dyslexia Screening Recommendation', description: 'Persistent reversals may indicate need for specialist assessment.', estimatedDuration: 'External referral', resources: [], priority: 2 },
    ],
  },
];

// =============================================================================
// SECTION 6: DATA AGGREGATION SERVICE
// =============================================================================

/**
 * The DataAggregationService pulls metrics from across the Scholarly platform
 * and consolidates them into the shapes needed by dashboard widgets. It's the
 * data pipeline that transforms raw events into actionable intelligence.
 */
export class DataAggregationService {
  /**
   * Aggregate metrics for a cohort over a time period.
   */
  async aggregateCohortMetrics(
    tenantId: string,
    cohortDefinition: CohortDefinition,
    dateRange: DateRangeFilter,
    timeGranularity: DataSourceConfig['timeGranularity'],
  ): Promise<Result<CohortAnalysisResult>> {
    // In production, this queries the BKT tables, reading session logs,
    // wellbeing records, and Arena results via Prisma, then computes
    // aggregates. Here we define the complete contract.
    const metrics: CohortMetrics = {
      averageMastery: 0,
      medianMastery: 0,
      masteryStdDev: 0,
      averageWcpm: 0,
      medianWcpm: 0,
      sessionsPerWeek: 0,
      avgSessionDuration: 0,
      bookCompletionRate: 0,
      avgDecodabilityScore: 0,
      atOrAboveExpected: 0,
      interventionRate: 0,
      engagementScore: 0,
      wellbeingScore: 0,
      gpcCoverageRate: 0,
      arenaParticipationRate: 0,
      avgFormationScore: 0,
    };

    return {
      success: true,
      data: {
        cohort: cohortDefinition,
        learnerCount: cohortDefinition.memberIds.length,
        metrics,
        distributions: {
          masteryDistribution: this.generateDistributionBuckets(0, 1, 10),
          wcpmDistribution: this.generateDistributionBuckets(0, 150, 10),
          phaseDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          sessionFrequencyDistribution: this.generateDistributionBuckets(0, 7, 7),
        },
        insights: [],
        computedAt: new Date(),
      },
    };
  }

  /**
   * Generate individual learner analytics summary for drill-down.
   */
  async getLearnerAnalytics(
    tenantId: string,
    learnerId: string,
    dateRange: DateRangeFilter,
  ): Promise<Result<LearnerAnalyticsSummary>> {
    const summary: LearnerAnalyticsSummary = {
      learnerId,
      currentPhase: 3,
      overallMastery: 0,
      wcpm: 0,
      wcpmTrend: 'improving',
      booksRead: 0,
      totalReadingTime: 0,
      recentSessions: [],
      gpcMasteryBreakdown: [],
      strengths: [],
      areasForGrowth: [],
      activeAlerts: [],
      goals: [],
      recommendations: [],
    };
    return { success: true, data: summary };
  }

  /**
   * Check all alert rules against current learner data.
   */
  async evaluateAlertRules(
    tenantId: string,
    learnerId: string,
    rules: AlertRule[],
  ): Promise<Result<InterventionAlert[]>> {
    // In production, each rule's conditions are evaluated against the
    // learner's recent metrics. Alerts that fire are deduped against
    // existing active alerts and cooldown periods.
    return { success: true, data: [] };
  }

  private generateDistributionBuckets(min: number, max: number, buckets: number): DistributionBucket[] {
    const step = (max - min) / buckets;
    return Array.from({ length: buckets }, (_, i) => ({
      rangeStart: min + i * step,
      rangeEnd: min + (i + 1) * step,
      count: 0,
      percentage: 0,
      label: `${(min + i * step).toFixed(1)}–${(min + (i + 1) * step).toFixed(1)}`,
    }));
  }
}

export interface LearnerAnalyticsSummary {
  learnerId: string;
  currentPhase: number;
  overallMastery: number;
  wcpm: number;
  wcpmTrend: 'improving' | 'stable' | 'declining';
  booksRead: number;
  totalReadingTime: number;
  recentSessions: ReadingSessionSummary[];
  gpcMasteryBreakdown: GpcMasteryItem[];
  strengths: string[];
  areasForGrowth: string[];
  activeAlerts: InterventionAlert[];
  goals: LearnerGoal[];
  recommendations: string[];
}

export interface ReadingSessionSummary {
  sessionId: string;
  bookTitle: string;
  date: Date;
  duration: number;
  wcpm: number;
  accuracy: number;
  mode: string;
}

export interface GpcMasteryItem {
  grapheme: string;
  phoneme: string;
  mastery: number;
  trend: 'improving' | 'stable' | 'declining';
  lastPractised: Date;
}

export interface LearnerGoal {
  goalId: string;
  title: string;
  target: number;
  current: number;
  deadline: Date;
  status: 'on_track' | 'at_risk' | 'achieved' | 'overdue';
}

// =============================================================================
// SECTION 7: PRESET DASHBOARD TEMPLATES
// =============================================================================

/**
 * Pre-built dashboard templates that teachers can start with and customise.
 */
export const DASHBOARD_TEMPLATES: Record<DashboardRole, Partial<DashboardConfig>> = {
  teacher: {
    refreshInterval: 300,
    layout: { columns: 12, rowHeight: 80, positions: [] },
    widgets: [
      {
        widgetId: 'w_mastery_heatmap', type: 'mastery_heatmap',
        title: 'GPC Mastery Overview', description: 'See which GPCs your class has mastered at a glance.',
        dataSource: { domain: 'bkt', aggregation: 'class', timeGranularity: 'weekly' },
        visualisation: { chartType: 'heatmap', colours: ['#fee0d2', '#fc9272', '#de2d26'], showLegend: true, showLabels: true, animate: true, responsive: true, ariaDescriptionTemplate: 'Heatmap showing GPC mastery for {learnerCount} learners' },
        config: {}, drillDownEnabled: true,
      },
      {
        widgetId: 'w_intervention_alerts', type: 'intervention_alerts',
        title: 'Intervention Alerts', description: 'Learners who may need additional support.',
        dataSource: { domain: 'bkt', aggregation: 'individual', timeGranularity: 'daily' },
        visualisation: { chartType: 'list', colours: ['#ffd700', '#ff6b6b', '#cc0000'], showLegend: false, showLabels: true, animate: false, responsive: true, ariaDescriptionTemplate: '{count} active intervention alerts' },
        config: {}, drillDownEnabled: true,
      },
      {
        widgetId: 'w_reading_velocity', type: 'reading_velocity',
        title: 'Reading Fluency Trends', description: 'WCPM trends for the class over time.',
        dataSource: { domain: 'reading_sessions', aggregation: 'class', timeGranularity: 'weekly' },
        visualisation: { chartType: 'line', colours: ['#4e79a7', '#f28e2b', '#e15759'], showLegend: true, showLabels: false, animate: true, responsive: true, ariaDescriptionTemplate: 'Line chart showing WCPM trends over {period}' },
        config: {}, drillDownEnabled: true,
      },
      {
        widgetId: 'w_engagement_gauge', type: 'engagement_gauge',
        title: 'Class Engagement', description: 'Reading frequency and session completion rates.',
        dataSource: { domain: 'reading_sessions', aggregation: 'class', timeGranularity: 'daily' },
        visualisation: { chartType: 'gauge', colours: ['#e15759', '#f28e2b', '#59a14f'], showLegend: false, showLabels: true, animate: true, responsive: true, ariaDescriptionTemplate: 'Engagement gauge at {value}%' },
        config: {}, drillDownEnabled: false,
      },
      {
        widgetId: 'w_phase_progress', type: 'phonics_phase_progress',
        title: 'Phase Progression', description: 'How many learners are at each phonics phase.',
        dataSource: { domain: 'bkt', aggregation: 'class', timeGranularity: 'monthly' },
        visualisation: { chartType: 'funnel', colours: ['#4e79a7', '#59a14f', '#9c755f', '#f28e2b', '#e15759', '#b07aa1'], showLegend: true, showLabels: true, animate: true, responsive: true, ariaDescriptionTemplate: 'Funnel chart showing phase distribution' },
        config: {}, drillDownEnabled: true,
      },
    ],
  },
  admin: {
    refreshInterval: 600,
    layout: { columns: 12, rowHeight: 80, positions: [] },
    widgets: [
      {
        widgetId: 'w_cohort_comparison', type: 'cohort_comparison',
        title: 'Cohort Performance Comparison', description: 'Compare classes and year groups.',
        dataSource: { domain: 'bkt', aggregation: 'school', timeGranularity: 'termly' },
        visualisation: { chartType: 'bar', colours: ['#4e79a7', '#f28e2b'], showLegend: true, showLabels: true, animate: true, responsive: true, ariaDescriptionTemplate: 'Bar chart comparing {cohortCount} cohorts' },
        config: {}, drillDownEnabled: true,
      },
    ],
  },
  parent: {
    refreshInterval: 0,
    layout: { columns: 6, rowHeight: 100, positions: [] },
    widgets: [
      {
        widgetId: 'w_parent_overview', type: 'parent_overview',
        title: 'Your Child\'s Progress', description: 'A summary of this week\'s reading journey.',
        dataSource: { domain: 'reading_sessions', aggregation: 'individual', timeGranularity: 'weekly' },
        visualisation: { chartType: 'progress_ring', colours: ['#59a14f', '#4e79a7'], showLegend: false, showLabels: true, animate: true, responsive: true, ariaDescriptionTemplate: 'Progress overview showing {booksRead} books read' },
        config: {}, drillDownEnabled: false,
      },
    ],
  },
  researcher: {
    refreshInterval: 3600,
    layout: { columns: 12, rowHeight: 80, positions: [] },
    widgets: [],
  },
};

// =============================================================================
// SECTION 8: NATS EVENTS
// =============================================================================

export const ANALYTICS_EVENTS = {
  DASHBOARD_ACCESSED: 'scholarly.analytics.dashboard_accessed',
  WIDGET_DRILLDOWN: 'scholarly.analytics.widget_drilldown',
  ALERT_CREATED: 'scholarly.analytics.alert_created',
  ALERT_ACKNOWLEDGED: 'scholarly.analytics.alert_acknowledged',
  ALERT_RESOLVED: 'scholarly.analytics.alert_resolved',
  COHORT_ANALYSED: 'scholarly.analytics.cohort_analysed',
  EXPORT_GENERATED: 'scholarly.analytics.export_generated',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================
export {
  DataAggregationService,
  DEFAULT_ALERT_RULES,
  DASHBOARD_TEMPLATES,
  ANALYTICS_EVENTS,
};
