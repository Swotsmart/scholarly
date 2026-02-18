// =============================================================================
// TEMPORAL HEURISTICS
// =============================================================================
// Time-of-day and day-of-week scoring for the seed engine's temporal signal.
//
// This is the heaviest-weighted signal (0.30) because the right tool at the
// right time is more valuable than the right tool at the wrong time.
//
// Think of it like a restaurant menu that changes through the day: breakfast
// items in the morning, lunch specials at midday, dinner menu in the evening.
// A teacher at 7:45 AM needs Attendance, not Reports. A parent at 5:30 PM
// wants Progress, not Calendar.
//
// All scores are derived from the temporal heuristic table in Section 12.2
// of the specification. The table covers five roles × four primary time
// blocks. This implementation expands to seven time blocks for finer
// granularity while preserving the spec's score assignments.
//
// Time blocks (user-local timezone):
//   early_morning  6–8 AM    (pre-school prep)
//   morning        8–10 AM   (school start / first working block)
//   late_morning   10 AM–12  (mid-morning working block)
//   midday         12–2 PM   (lunch / lighter activity)
//   afternoon      2–5 PM    (post-lunch working block)
//   evening        5–8 PM    (after school / family time)
//   night          8–11 PM   (personal time / prep for tomorrow)
// =============================================================================

import type {
  TemporalHeuristicTable,
  TimeBlock,
  DayOfWeek,
  TaskRef,
  RoleId,
} from '@/types/seed-engine-types';

// =============================================================================
// TIME BLOCK RESOLUTION
// =============================================================================

/**
 * Resolve an hour (0–23) to a TimeBlock.
 * Hours outside the 6–23 range are treated as 'night' (late night / no-op).
 */
export function resolveTimeBlock(hour: number): TimeBlock {
  if (hour >= 6 && hour < 8) return 'early_morning';
  if (hour >= 8 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 12) return 'late_morning';
  if (hour >= 12 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

/**
 * Resolve a JS Date.getDay() value (0=Sun) to our DayOfWeek type.
 */
export function resolveDayOfWeek(dayIndex: number): DayOfWeek {
  const days: DayOfWeek[] = [
    'sunday', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday',
  ];
  return days[dayIndex] ?? 'monday';
}

/**
 * Determine if a given day is a school day (Monday–Friday).
 * Does NOT account for public holidays — the institutional context
 * layer handles holidays separately.
 */
export function isSchoolDay(day: DayOfWeek): boolean {
  return !['saturday', 'sunday'].includes(day);
}

// =============================================================================
// WEEKEND MODIFIERS
// =============================================================================
// Weekend temporal heuristics differ significantly from weekdays. Teachers
// aren't taking attendance on Saturday; parents might be reviewing the week's
// progress. These modifiers are applied when isSchoolDay is false.
// =============================================================================

const WEEKEND_HEURISTICS: Partial<Record<RoleId, Partial<Record<TimeBlock, Array<{ taskRef: TaskRef; score: number }>>>>> = {
  teacher: {
    morning: [
      { taskRef: 'T1', score: 0.6 },   // Lesson planning for next week
      { taskRef: 'T8', score: 0.4 },   // Catching up on reports
    ],
    afternoon: [
      { taskRef: 'T1', score: 0.5 },
      { taskRef: 'CR1', score: 0.3 },  // Content creation
    ],
  },
  parent: {
    morning: [
      { taskRef: 'F1', score: 0.7 },   // Review progress from the week
      { taskRef: 'F5', score: 0.4 },   // Book a tutor for next week
    ],
    afternoon: [
      { taskRef: 'F8', score: 0.6 },   // Little Explorers with young children
      { taskRef: 'F7', score: 0.4 },   // Browse child's portfolio
    ],
  },
  learner: {
    morning: [
      { taskRef: 'L3', score: 0.7 },   // Ask Issy
      { taskRef: 'L1', score: 0.5 },   // Browse courses
    ],
    afternoon: [
      { taskRef: 'AR1', score: 0.9 },  // Arena — peak weekend engagement
      { taskRef: 'LF4', score: 0.5 },  // Language conversation practice
    ],
    evening: [
      { taskRef: 'L3', score: 0.8 },   // Ask Issy
      { taskRef: 'L3', score: 0.8 },   // Ask Issy
      { taskRef: 'AR1', score: 0.7 },  // Arena
    ],
  },
  homeschool: {
    morning: [
      { taskRef: 'H1', score: 0.5 },   // Curriculum planning
      { taskRef: 'H4', score: 0.4 },   // Browse resources
    ],
  },
};

// =============================================================================
// WEEKDAY TEMPORAL HEURISTICS TABLE
// =============================================================================
// The core table from Section 12.2, expanded to seven time blocks.
// Each entry maps a task ref to its temporal relevance score (0.0–1.0).
// =============================================================================

export const TEMPORAL_HEURISTICS: TemporalHeuristicTable = {

  // ─── TEACHER ────────────────────────────────────────────────────────────
  // Morning: Operations sprint (attendance, alerts, timetable)
  // Midday: Instructional prep (lesson planning, gradebook)
  // Afternoon: Assessment and reporting
  // Evening: Light prep work
  // ───────────────────────────────────────────────────────────────────────

  teacher: {
    early_morning: [
      { taskRef: 'D2', score: 0.9 },   // Attendance — pre-class prep
      { taskRef: 'D4', score: 0.8 },   // Timetable — checking the day
      { taskRef: 'D5', score: 0.7 },   // Student Alerts — triage
    ],
    morning: [
      { taskRef: 'D2', score: 1.0 },   // Attendance — peak time
      { taskRef: 'D4', score: 0.9 },   // Timetable
      { taskRef: 'D5', score: 0.8 },   // Student Alerts
      { taskRef: 'D3', score: 0.6 },   // Messages
    ],
    late_morning: [
      { taskRef: 'T1', score: 0.7 },   // Lesson Planner — mid-morning prep
      { taskRef: 'T2', score: 0.6 },   // Gradebook
      { taskRef: 'D5', score: 0.5 },   // Alerts follow-up
    ],
    midday: [
      { taskRef: 'T1', score: 0.7 },   // Lesson Planner
      { taskRef: 'T2', score: 0.6 },   // Gradebook
      { taskRef: 'D3', score: 0.5 },   // Messages
    ],
    afternoon: [
      { taskRef: 'T2', score: 0.9 },   // Grading — end of day
      { taskRef: 'T8', score: 0.8 },   // Reports
      { taskRef: 'T5', score: 0.6 },   // Grade Pitches & Portfolios
    ],
    evening: [
      { taskRef: 'T1', score: 0.5 },   // Lesson planning for tomorrow
      { taskRef: 'T8', score: 0.4 },   // Reports (catching up)
    ],
    night: [
      { taskRef: 'T1', score: 0.3 },   // Light prep only
    ],
  },

  // ─── PARENT ─────────────────────────────────────────────────────────────
  // Morning: Quick check before commute (messages, calendar)
  // Midday: Low activity — parents are at work
  // Afternoon: Progress check after school
  // Evening: Deep engagement window (progress, tutor booking)
  // ───────────────────────────────────────────────────────────────────────

  parent: {
    early_morning: [
      { taskRef: 'D3', score: 0.7 },   // Messages — quick scan
      { taskRef: 'F4', score: 0.6 },   // Calendar — what's on today
    ],
    morning: [
      { taskRef: 'D3', score: 0.8 },   // Messages
      { taskRef: 'F4', score: 0.7 },   // Calendar
      { taskRef: 'F2', score: 0.5 },   // Check attendance
    ],
    late_morning: [
      { taskRef: 'D3', score: 0.4 },   // Messages (lower priority at work)
    ],
    midday: [
      // Low activity period for parents
    ],
    afternoon: [
      { taskRef: 'F1', score: 0.9 },   // Progress — after school
      { taskRef: 'D3', score: 0.8 },   // Messages
      { taskRef: 'F2', score: 0.6 },   // Attendance check
    ],
    evening: [
      { taskRef: 'F1', score: 0.8 },   // Progress — family review time
      { taskRef: 'F5', score: 0.7 },   // Tutor Booking
      { taskRef: 'F7', score: 0.5 },   // Child portfolio
      { taskRef: 'F8', score: 0.6 },   // Little Explorers (bedtime activity)
    ],
    night: [
      { taskRef: 'F1', score: 0.4 },   // Quick progress glance
    ],
  },

  // ─── LEARNER ────────────────────────────────────────────────────────────
  // Morning: Structured learning (courses, calendar)
  // Midday: Ask Issy, exploratory
  // Afternoon: Peak engagement — Arena, active learning
  // Evening: Reflective — Ask Issy, LinguaFlow
  // ───────────────────────────────────────────────────────────────────────

  learner: {
    early_morning: [
      // Low engagement for most learners
    ],
    morning: [
      { taskRef: 'D6', score: 0.8 },   // Continue Learning
      { taskRef: 'D4', score: 0.7 },   // Timetable
      { taskRef: 'L1', score: 0.6 },   // Browse Courses
    ],
    late_morning: [
      { taskRef: 'L2', score: 0.7 },   // Complete a Lesson
      { taskRef: 'L3', score: 0.6 },   // Ask Issy
    ],
    midday: [
      { taskRef: 'L3', score: 0.8 },   // Ask Issy — break time
      { taskRef: 'L1', score: 0.7 },   // Browse Courses
      { taskRef: 'AR1', score: 0.5 },  // Arena — lunchtime competition
    ],
    afternoon: [
      { taskRef: 'AR1', score: 0.9 },  // Arena — after school peak
      { taskRef: 'D6', score: 0.7 },   // Continue Learning
      { taskRef: 'L6', score: 0.6 },   // Design Challenges
    ],
    evening: [
      { taskRef: 'L3', score: 0.8 },   // Ask Issy — evening chat
      { taskRef: 'LF1', score: 0.7 },  // LinguaFlow Voice
      { taskRef: 'LF4', score: 0.6 },  // Conversation practice
      { taskRef: 'AR1', score: 0.6 },  // Arena — evening session
    ],
    night: [
      { taskRef: 'L3', score: 0.5 },   // Ask Issy — light engagement
    ],
  },

  // ─── TUTOR ──────────────────────────────────────────────────────────────
  // Morning: Session prep (students, upcoming)
  // Midday/Afternoon: Active sessions
  // Evening: Business management (earnings, availability)
  // ───────────────────────────────────────────────────────────────────────

  tutor: {
    early_morning: [
      { taskRef: 'TU5', score: 0.7 },  // Student review before sessions
    ],
    morning: [
      { taskRef: 'TU5', score: 0.9 },  // Session Prep — review students
      { taskRef: 'TU2', score: 0.8 },  // Upcoming Sessions
      { taskRef: 'TU6', score: 0.5 },  // Resources prep
    ],
    late_morning: [
      { taskRef: 'TU3', score: 0.8 },  // Conduct Session
      { taskRef: 'TU2', score: 0.6 },  // Upcoming
    ],
    midday: [
      { taskRef: 'TU3', score: 0.9 },  // Sessions — peak teaching time
      { taskRef: 'TU2', score: 0.5 },  // Upcoming
    ],
    afternoon: [
      { taskRef: 'TU3', score: 0.9 },  // Sessions continue
      { taskRef: 'TU4', score: 0.7 },  // Session Notes — between sessions
    ],
    evening: [
      { taskRef: 'TU7', score: 0.8 },  // Earnings — end of day review
      { taskRef: 'TU1', score: 0.6 },  // Availability — set next week
      { taskRef: 'TU8', score: 0.4 },  // Profile updates
    ],
    night: [
      { taskRef: 'TU1', score: 0.4 },  // Availability planning
    ],
  },

  // ─── ADMIN ──────────────────────────────────────────────────────────────
  // Morning: Operational triage (relief, absences)
  // Midday: Strategic work (reports, users)
  // Afternoon: Planning (scheduling, constraints)
  // Evening: Low activity
  // ───────────────────────────────────────────────────────────────────────

  admin: {
    early_morning: [
      { taskRef: 'D7', score: 0.9 },   // Relief — urgent morning task
      { taskRef: 'D5', score: 0.7 },   // Student Alerts
    ],
    morning: [
      { taskRef: 'D7', score: 1.0 },   // Relief — peak
      { taskRef: 'D5', score: 0.9 },   // Alerts
      { taskRef: 'A1', score: 0.6 },   // User management
    ],
    late_morning: [
      { taskRef: 'A5', score: 0.7 },   // Reports
      { taskRef: 'A1', score: 0.6 },   // Users
    ],
    midday: [
      { taskRef: 'A5', score: 0.7 },   // Reports
      { taskRef: 'A1', score: 0.6 },   // Users
    ],
    afternoon: [
      { taskRef: 'A2', score: 0.7 },   // Scheduling
      { taskRef: 'A5', score: 0.6 },   // Reports
      { taskRef: 'A3', score: 0.5 },   // Constraints
    ],
    evening: [
      // Low admin activity in evening
    ],
    night: [],
  },

  // ─── HOMESCHOOL ─────────────────────────────────────────────────────────
  // Morning: Teaching (curriculum, children, compliance)
  // Midday: Break / resources
  // Afternoon: Review and record (progress, compliance)
  // Evening: Planning for tomorrow
  // ───────────────────────────────────────────────────────────────────────

  homeschool: {
    early_morning: [
      { taskRef: 'H1', score: 0.8 },   // Curriculum — morning prep
      { taskRef: 'H5', score: 0.7 },   // Manage Children — set up for the day
    ],
    morning: [
      { taskRef: 'H1', score: 0.9 },   // Curriculum — peak teaching
      { taskRef: 'H5', score: 0.8 },   // Children
      { taskRef: 'F8', score: 0.7 },   // Little Explorers for youngest
    ],
    late_morning: [
      { taskRef: 'H5', score: 0.7 },   // Children — rotate subjects
      { taskRef: 'H4', score: 0.5 },   // Resources
    ],
    midday: [
      { taskRef: 'H4', score: 0.6 },   // Browse Resources
      { taskRef: 'H6', score: 0.4 },   // Co-op discovery
    ],
    afternoon: [
      { taskRef: 'H7', score: 0.8 },   // Multi-Child Progress — review
      { taskRef: 'H2', score: 0.7 },   // Compliance tracking — log hours
      { taskRef: 'H3', score: 0.5 },   // Compliance reports
    ],
    evening: [
      { taskRef: 'H1', score: 0.6 },   // Curriculum planning for tomorrow
      { taskRef: 'H2', score: 0.4 },   // Compliance catch-up
    ],
    night: [],
  },

  // ─── CREATOR ────────────────────────────────────────────────────────────
  // Creators have more flexible schedules. Peak creation is morning/afternoon.
  // Analytics review is evening.
  // ───────────────────────────────────────────────────────────────────────

  creator: {
    early_morning: [],
    morning: [
      { taskRef: 'CR1', score: 0.8 },  // Create Content
      { taskRef: 'CR2', score: 0.7 },  // Create Storybook
      { taskRef: 'CR6', score: 0.5 },  // Check bounties
    ],
    late_morning: [
      { taskRef: 'CR1', score: 0.8 },  // Content creation continues
      { taskRef: 'CR2', score: 0.7 },
    ],
    midday: [
      { taskRef: 'CR4', score: 0.5 },  // Browse Marketplace
      { taskRef: 'CR6', score: 0.5 },  // Bounties
    ],
    afternoon: [
      { taskRef: 'CR1', score: 0.7 },  // Create
      { taskRef: 'CR3', score: 0.6 },  // Submit for review
    ],
    evening: [
      { taskRef: 'CR5', score: 0.8 },  // Analytics — end of day review
      { taskRef: 'CR7', score: 0.4 },  // Profile management
    ],
    night: [
      { taskRef: 'CR5', score: 0.4 },  // Light analytics check
    ],
  },
};

// =============================================================================
// WEEKEND TEMPORAL LOOKUP
// =============================================================================

/**
 * Get temporal heuristics for a given role, time block, and school day status.
 * Returns the weekend heuristics when applicable, falling back to weekday.
 */
export function getTemporalHeuristics(
  role: RoleId,
  timeBlock: TimeBlock,
  schoolDay: boolean,
): Array<{ taskRef: TaskRef; score: number }> {
  if (!schoolDay) {
    const weekendRole = WEEKEND_HEURISTICS[role];
    if (weekendRole && weekendRole[timeBlock]) {
      return weekendRole[timeBlock]!;
    }
    // Fall back to weekday heuristics but with reduced scores
    const weekdayEntries = TEMPORAL_HEURISTICS[role]?.[timeBlock] ?? [];
    return weekdayEntries.map(entry => ({
      taskRef: entry.taskRef,
      score: entry.score * 0.5, // Halve weekday scores on weekends
    }));
  }

  return TEMPORAL_HEURISTICS[role]?.[timeBlock] ?? [];
}

// =============================================================================
// TERM WEEK MODIFIERS
// =============================================================================
// Certain tasks become more relevant at specific points in the term.
// Start of term: setup tasks. End of term: reporting tasks.
// These modifiers are additive to the temporal score.
// =============================================================================

export interface TermWeekModifier {
  /** Task ref to boost. */
  taskRef: TaskRef;
  /** Roles this modifier applies to. */
  roles: RoleId[];
  /** Term week range (1-indexed, inclusive). */
  fromWeek: number;
  toWeek: number;
  /** Additive boost to the temporal score. */
  boost: number;
}

export const TERM_WEEK_MODIFIERS: TermWeekModifier[] = [
  // ── Start of term (weeks 1–2): Setup & orientation ──
  {
    taskRef: 'A2',  // Build Timetable
    roles: ['admin'],
    fromWeek: 1,
    toWeek: 2,
    boost: 0.4,
  },
  {
    taskRef: 'A3',  // Configure Constraints
    roles: ['admin'],
    fromWeek: 1,
    toWeek: 2,
    boost: 0.3,
  },
  {
    taskRef: 'A4',  // Manage Interoperability
    roles: ['admin'],
    fromWeek: 1,
    toWeek: 1,
    boost: 0.3,
  },
  {
    taskRef: 'H1',  // Plan Curriculum
    roles: ['homeschool'],
    fromWeek: 1,
    toWeek: 3,
    boost: 0.3,
  },

  // ── Mid-term (assessment period usually weeks 4–6): Assessment boost ──
  {
    taskRef: 'T3',  // Build an Assessment
    roles: ['teacher'],
    fromWeek: 4,
    toWeek: 6,
    boost: 0.3,
  },
  {
    taskRef: 'T4',  // Browse Assessment Library
    roles: ['teacher'],
    fromWeek: 4,
    toWeek: 6,
    boost: 0.2,
  },

  // ── End of term (last 2 weeks, approximated as weeks 9–10): Reports ──
  {
    taskRef: 'T8',  // Generate Reports
    roles: ['teacher', 'admin'],
    fromWeek: 9,
    toWeek: 10,
    boost: 0.4,
  },
  {
    taskRef: 'A5',  // Institutional Reports
    roles: ['admin'],
    fromWeek: 9,
    toWeek: 10,
    boost: 0.4,
  },
  {
    taskRef: 'H3',  // Generate Compliance Reports
    roles: ['homeschool'],
    fromWeek: 9,
    toWeek: 10,
    boost: 0.4,
  },
  {
    taskRef: 'F1',  // View Child Progress
    roles: ['parent'],
    fromWeek: 9,
    toWeek: 10,
    boost: 0.2,
  },
];

/**
 * Get term-week modifiers applicable for a given role and week.
 */
export function getTermWeekBoosts(
  role: RoleId,
  termWeek: number,
): Record<TaskRef, number> {
  const boosts: Record<TaskRef, number> = {};

  for (const modifier of TERM_WEEK_MODIFIERS) {
    if (
      modifier.roles.includes(role) &&
      termWeek >= modifier.fromWeek &&
      termWeek <= modifier.toWeek
    ) {
      boosts[modifier.taskRef] = Math.max(
        boosts[modifier.taskRef] ?? 0,
        modifier.boost,
      );
    }
  }

  return boosts;
}
