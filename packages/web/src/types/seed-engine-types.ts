// =============================================================================
// SEED ENGINE TYPES
// =============================================================================
// Type definitions for the seed engine — the AI-powered contextual suggestion
// system that populates the "Suggested for you" section of the sidebar.
//
// These types extend the existing composing-menu-types.ts vocabulary with
// seed-specific concerns: scoring signals, candidate evaluation, institutional
// context, and onboarding data integration.
//
// The seed engine scores every eligible task against five weighted signals:
//
//   score(task, user, context) =
//     0.25 × roleMatch(task, user.role, user.onboarding)
//   + 0.30 × temporalMatch(task, context.dayOfWeek, context.hour, context.termWeek)
//   + 0.20 × historyMatch(task, user.menuState)
//   + 0.15 × institutionalMatch(task, user.institution)
//   + 0.10 × peerMatch(task, user.role, user.context)
//
// Tasks scoring ≥ 0.3 are eligible. The top 3–4 become seeds.
// =============================================================================

import type { MenuItemState } from '@/types/composing-menu-types';

// =============================================================================
// SIGNAL WEIGHTS
// =============================================================================
// Centralised weight definitions. These are intentionally typed as a readonly
// record so that downstream code can iterate over them for transparency
// logging and debugging without magic numbers scattered through the engine.
// =============================================================================

export const SEED_SIGNAL_WEIGHTS = {
  role: 0.25,
  temporal: 0.30,
  history: 0.20,
  institutional: 0.15,
  peer: 0.10,
} as const;

export type SeedSignalName = keyof typeof SEED_SIGNAL_WEIGHTS;

// =============================================================================
// SCORING THRESHOLD & LIMITS
// =============================================================================

/** Minimum composite score for a task to be eligible as a seed. */
export const SEED_SCORE_THRESHOLD = 0.3;

/** Maximum number of seed suggestions per session. */
export const MAX_SEEDS = 4;

/** Minimum number of seeds to show (engine won't suggest fewer). */
export const MIN_SEEDS = 2;

/** Cooldown period before a dismissed seed can be re-suggested (days). */
export const SEED_DISMISS_COOLDOWN_DAYS = 14;

/** Session gap that triggers a seed refresh (milliseconds). */
export const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes

// =============================================================================
// ROLE AFFINITY
// =============================================================================
// Maps each task ref to its affinity score per role. A score of 1.0 means
// the task is a core part of that role's workflow; 0.0 means it has no
// relevance. Values between represent varying degrees of cross-role utility.
//
// Example: Attendance (D2) is 1.0 for teachers (daily ritual), 0.3 for
// parents (checking their child's record), and 0.0 for learners.
// =============================================================================

export type RoleId =
  | 'learner'
  | 'teacher'
  | 'parent'
  | 'tutor'
  | 'admin'
  | 'homeschool'
  | 'creator';

export type TaskRef = string; // e.g., 'D1', 'T2', 'LF3', 'AR1'

/**
 * A single row in the role affinity matrix.
 * Keys are role IDs, values are 0.0–1.0 affinity scores.
 */
export type RoleAffinityRow = Partial<Record<RoleId, number>>;

/**
 * The complete role affinity matrix: task ref → role scores.
 * Used by the roleMatch signal in the seed engine.
 */
export type RoleAffinityMatrix = Record<TaskRef, RoleAffinityRow>;

// =============================================================================
// TEMPORAL CONTEXT
// =============================================================================
// The temporal signal is the heaviest-weighted signal (0.30) because the
// right tool at the right time is more valuable than the right tool at the
// wrong time. A teacher seeing Attendance at 7:45 AM is a gift; seeing it
// at 9 PM is noise.
// =============================================================================

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type TimeBlock =
  | 'early_morning'  // 6–8 AM
  | 'morning'        // 8–10 AM
  | 'late_morning'   // 10 AM–12 PM
  | 'midday'         // 12–2 PM
  | 'afternoon'      // 2–5 PM
  | 'evening'        // 5–8 PM
  | 'night';         // 8–11 PM

/**
 * A temporal heuristic entry: which tasks score highly for a given
 * role at a given time block.
 */
export interface TemporalHeuristic {
  taskRef: TaskRef;
  score: number; // 0.0–1.0
}

/**
 * Complete temporal heuristic table: role → time block → scored tasks.
 */
export type TemporalHeuristicTable = Record<
  RoleId,
  Partial<Record<TimeBlock, TemporalHeuristic[]>>
>;

// =============================================================================
// USAGE HISTORY SIGNAL
// =============================================================================
// The history signal rewards tasks the user has engaged with via Cmd+K or
// direct URL but hasn't yet added to their menu. These are "near misses" —
// features the user clearly knows about but hasn't committed to.
// =============================================================================

export interface UsageHistoryEntry {
  taskRef: TaskRef;
  useCount: number;
  lastUsed: string; // ISO timestamp
  currentState: MenuItemState;
  source: 'sidebar' | 'command_palette' | 'direct_url' | 'deep_link';
}

// =============================================================================
// INSTITUTIONAL CONTEXT
// =============================================================================
// The institutional signal captures school-level events that make certain
// tasks more relevant. NAPLAN week boosts Reports for teachers. Start of
// term boosts Timetable for admins. Parent-teacher conference week boosts
// Messages for parents.
// =============================================================================

export interface InstitutionalEvent {
  /** Machine-readable event type for matching to task boosts. */
  type: InstitutionalEventType;

  /** Human-readable label for logging and debugging. */
  label: string;

  /** When this event is relevant (ISO date range). */
  startDate: string;
  endDate: string;

  /**
   * Task boosts triggered by this event.
   * Maps task ref → boost score (0.0–1.0, added to the institutional signal).
   */
  taskBoosts: Record<TaskRef, number>;
}

export type InstitutionalEventType =
  | 'term_start'
  | 'term_end'
  | 'assessment_period'
  | 'reporting_period'
  | 'parent_teacher_conference'
  | 'standardised_testing'    // NAPLAN, etc.
  | 'enrolment_period'
  | 'compliance_deadline'
  | 'professional_development'
  | 'custom';

export interface InstitutionalContext {
  /** Active institutional events for the user's school/institution. */
  activeEvents: InstitutionalEvent[];

  /** The current term/semester number (1-based). */
  currentTerm: number;

  /** Total terms per year (for normalising term_week). */
  termsPerYear: number;

  /** Week number within the current term (1-based). */
  termWeek: number;

  /** School timezone (IANA format, e.g., 'Australia/Perth'). */
  timezone: string;
}

// =============================================================================
// PEER PATTERN SIGNAL
// =============================================================================
// The peer signal uses anonymised, aggregated usage data from users in the
// same role to surface tasks that are popular among peers. This is the
// "wisdom of the crowd" signal — if 80% of Year 5 teachers use Lesson
// Planner in their first week, it's a strong candidate for new teachers.
// =============================================================================

export interface PeerUsagePattern {
  taskRef: TaskRef;

  /**
   * Adoption rate: fraction of peers in the same role who have this task
   * in their active menu (0.0–1.0). Computed server-side from
   * MenuAnalyticsDaily aggregation.
   */
  adoptionRate: number;

  /**
   * Recency weight: how recently peers started using this task.
   * Higher values mean trending upward. Decays over 30 days.
   */
  trendWeight: number;
}

// =============================================================================
// ONBOARDING DATA
// =============================================================================
// Data collected during the onboarding flow (786-line onboarding page) that
// influences the role profile signal. Currently collected but largely
// ignored — the seed engine is where this data finally earns its keep.
// =============================================================================

export interface OnboardingProfile {
  /** User-selected interests (e.g., 'coding', 'music', 'science'). */
  interests: string[];

  /** Subjects the user teaches or studies. */
  subjects: string[];

  /** Year levels (for teachers: classes they teach; for learners: their year). */
  yearLevels: number[];

  /** Languages the user is learning or teaching. */
  languages: string[];

  /** Whether the user expressed interest in competition/gaming. */
  competitiveInterest: boolean;

  /** Whether the user has children under 7 (triggers early years seeds). */
  hasEarlyYearsChildren: boolean;

  /** Profile completeness percentage (0–100). */
  profileCompleteness: number;
}

// =============================================================================
// SEED CANDIDATE
// =============================================================================
// The output of the scoring algorithm before final selection. Each candidate
// carries its composite score plus the breakdown by signal for transparency
// and debugging.
// =============================================================================

export interface SeedCandidate {
  taskRef: TaskRef;

  /** Composite score: weighted sum of all signal scores. */
  compositeScore: number;

  /** Individual signal scores for transparency. */
  signals: SeedSignalBreakdown;

  /** Human-readable reason for suggesting this task. */
  reason: string;

  /** The signal that contributed most to this candidate's score. */
  primarySignal: SeedSignalName;
}

export interface SeedSignalBreakdown {
  role: number;       // Raw score × 0.25 weight
  temporal: number;   // Raw score × 0.30 weight
  history: number;    // Raw score × 0.20 weight
  institutional: number; // Raw score × 0.15 weight
  peer: number;       // Raw score × 0.10 weight
}

// =============================================================================
// SEED ENGINE INPUT
// =============================================================================
// The complete context bundle passed to the seed engine's score() function.
// Assembled by the session-start hook from multiple data sources.
// =============================================================================

export interface SeedEngineInput {
  /** The user's current active role. */
  role: RoleId;

  /** Onboarding profile data. */
  onboarding: OnboardingProfile;

  /** Current time context (resolved to the user's timezone). */
  temporal: {
    hour: number;           // 0–23
    dayOfWeek: DayOfWeek;
    timeBlock: TimeBlock;
    termWeek: number;
    isSchoolDay: boolean;   // Mon–Fri and not a holiday
  };

  /** Current menu state for the active role. */
  menuItems: Array<{
    ref: TaskRef;
    state: MenuItemState;
    useCount: number;
    lastUsed: string;
    pinned: boolean;
    dismissedAt?: string;
  }>;

  /** Institutional events and calendar context. */
  institutional: InstitutionalContext;

  /** Anonymised peer usage data. */
  peerPatterns: PeerUsagePattern[];
}

// =============================================================================
// SEED ENGINE OUTPUT
// =============================================================================

export interface SeedEngineResult {
  /** The selected seeds, ordered by score descending. */
  seeds: SeedCandidate[];

  /** All evaluated candidates (for debugging/analytics). */
  allCandidates: SeedCandidate[];

  /** Timestamp of this engine run (ISO). */
  computedAt: string;

  /** Engine version for cache invalidation and A/B testing. */
  engineVersion: string;

  /** Total computation time in milliseconds. */
  computeTimeMs: number;
}
