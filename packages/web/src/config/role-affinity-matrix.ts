// =============================================================================
// ROLE AFFINITY MATRIX
// =============================================================================
// Static configuration mapping each of the 52 tasks from the task taxonomy
// (Specification Sections 7–8) to its affinity score per role.
//
// Scoring logic:
//   1.0  — Core daily task for this role (e.g., Teacher + Attendance)
//   0.7–0.9 — Regularly used by this role
//   0.4–0.6 — Occasionally relevant
//   0.1–0.3 — Tangentially useful (e.g., Parent checking attendance)
//   0.0 / omitted — Not relevant for this role
//
// Every score is derived from the task's cluster assignment and the canonical
// menu item tables in Section 9.2 of the specification. Tasks that appear as
// anchors for a role receive 1.0. Tasks that appear as seeds receive 0.7–0.9.
// Tasks in the growth layer receive 0.4–0.6. Cross-cluster tasks (X1–X8)
// receive modest scores across all relevant roles.
//
// The matrix is intentionally comprehensive — the seed engine filters down
// from this full set using the composite scoring algorithm. Having accurate
// affinity data for every task-role pair prevents the engine from ever
// suggesting irrelevant items.
// =============================================================================

import type { RoleAffinityMatrix } from '@/types/seed-engine-types';

export const ROLE_AFFINITY_MATRIX: RoleAffinityMatrix = {

  // ═══════════════════════════════════════════════════════════════════════════
  // CLUSTER 1: DAILY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  D1: { // View Dashboard
    learner: 0.8,
    teacher: 0.8,
    parent: 0.9,
    tutor: 0.7,
    admin: 0.8,
    homeschool: 0.8,
    creator: 0.6,
  },
  D2: { // Take Attendance
    teacher: 1.0,
    admin: 0.5,
    parent: 0.3,   // Viewing child's attendance record
    homeschool: 0.6, // Logging attendance for compliance
  },
  D3: { // Check Messages
    teacher: 0.8,
    parent: 0.9,
    tutor: 0.8,
    admin: 0.5,
    learner: 0.4,
    homeschool: 0.6,
    creator: 0.3,
  },
  D4: { // View Timetable
    teacher: 0.9,
    admin: 0.7,
    learner: 0.6,
    parent: 0.5,
    homeschool: 0.4,
  },
  D5: { // Review Student Alerts
    teacher: 0.9,
    admin: 0.7,
    parent: 0.3,   // Only see alerts for their own children
    homeschool: 0.5,
  },
  D6: { // Continue Learning
    learner: 1.0,
    homeschool: 0.4, // When parent is assigning work
  },
  D7: { // Manage Relief
    admin: 1.0,
    teacher: 0.2,   // Viewing own relief schedule
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLUSTER 2: TEACHING & CURRICULUM
  // ═══════════════════════════════════════════════════════════════════════════

  T1: { // Plan a Lesson
    teacher: 0.9,
    homeschool: 0.8,
    tutor: 0.5,
  },
  T2: { // Enter Grades
    teacher: 1.0,   // Anchor item (Gradebook)
    homeschool: 0.6,
  },
  T3: { // Build an Assessment
    teacher: 0.7,
    homeschool: 0.5,
  },
  T4: { // Browse Assessment Library
    teacher: 0.6,
    homeschool: 0.5,
  },
  T5: { // Grade Pitches & Portfolios
    teacher: 0.5,
  },
  T6: { // Create a Challenge
    teacher: 0.5,
  },
  T7: { // Map to Standards
    teacher: 0.4,
    admin: 0.5,
    homeschool: 0.6,
  },
  T8: { // Generate Reports
    teacher: 0.6,
    admin: 0.8,
    homeschool: 0.7,
    parent: 0.2,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLUSTER 3: LEARNING & GROWTH
  // ═══════════════════════════════════════════════════════════════════════════

  L1: { // Browse Courses
    learner: 0.9,   // Anchor-adjacent (Courses anchor = L1 + L2)
    homeschool: 0.3,
  },
  L2: { // Complete a Lesson
    learner: 0.9,
    homeschool: 0.3,
  },
  L3: { // Chat with AI Buddy
    learner: 1.0,   // Anchor item
  },
  L4: { // Follow Golden Path
    learner: 0.6,   // Growth layer, advanced
  },
  L5: { // Explore Curiosity Engine
    learner: 0.5,
  },
  L6: { // Work on Design Challenge
    learner: 0.5,
  },
  L7: { // Build a Pitch Deck
    learner: 0.4,
  },
  L8: { // Manage Portfolio
    learner: 0.5,
    parent: 0.2,    // View child's portfolio (F7)
  },
  L9: { // View Achievements
    learner: 0.7,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLUSTER 4: LANGUAGE LEARNING (LINGUAFLOW)
  // ═══════════════════════════════════════════════════════════════════════════

  LF1: { // Practice Voice
    learner: 0.6,   // Higher if language assigned in onboarding
  },
  LF2: { // Learn Vocabulary
    learner: 0.6,
  },
  LF3: { // Practice Grammar
    learner: 0.5,
  },
  LF4: { // Conversation Simulation
    learner: 0.5,
  },
  LF5: { // Immersion Experience
    learner: 0.4,
  },
  LF6: { // Language Exchange
    learner: 0.3,
  },
  LF7: { // Track Language Progress
    learner: 0.4,
    parent: 0.2,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLUSTER 5: FAMILY & PARENTING
  // ═══════════════════════════════════════════════════════════════════════════

  F1: { // View Child Progress
    parent: 1.0,
    homeschool: 0.8,
  },
  F2: { // Check Attendance
    parent: 0.7,
    homeschool: 0.5,
  },
  F3: { // Message Teacher/Tutor
    parent: 0.8,
    homeschool: 0.4,
  },
  F4: { // View Calendar
    parent: 0.7,
    homeschool: 0.6,
    teacher: 0.3,
  },
  F5: { // Find and Book a Tutor
    parent: 0.5,    // Seed when child below benchmark
    homeschool: 0.4,
    learner: 0.3,
  },
  F6: { // Manage Payments
    parent: 0.4,
  },
  F7: { // View Child Portfolio
    parent: 0.4,
    homeschool: 0.3,
  },
  F8: { // Launch Little Explorers
    parent: 0.6,    // Higher if hasEarlyYearsChildren
    homeschool: 0.7,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLUSTER 6: HOMESCHOOL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  H1: { // Plan Curriculum
    homeschool: 1.0, // Anchor item
  },
  H2: { // Track Compliance
    homeschool: 1.0, // Anchor item
  },
  H3: { // Generate Compliance Reports
    homeschool: 0.7,
  },
  H4: { // Browse Resources
    homeschool: 0.6,
    teacher: 0.3,
  },
  H5: { // Manage Children
    homeschool: 0.8,
  },
  H6: { // Join a Co-op
    homeschool: 0.5,
  },
  H7: { // Track Multi-Child Progress
    homeschool: 0.8,
    parent: 0.3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLUSTER 7: TUTORING & SESSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  TU1: { // Set Availability
    tutor: 0.9,
  },
  TU2: { // View Upcoming Sessions
    tutor: 0.9,
  },
  TU3: { // Conduct a Session
    tutor: 0.8,
  },
  TU4: { // Review Session History
    tutor: 0.5,
  },
  TU5: { // View Student Progress
    tutor: 0.7,
  },
  TU6: { // Manage Resources
    tutor: 0.5,
  },
  TU7: { // Track Earnings
    tutor: 0.8,
  },
  TU8: { // Manage Profile
    tutor: 0.6,
    creator: 0.4,   // Creator profile management
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLUSTER 8: INSTITUTIONAL ADMINISTRATION
  // ═══════════════════════════════════════════════════════════════════════════

  A1: { // Manage Users
    admin: 0.9,    // Anchor-adjacent
  },
  A2: { // Build Timetable
    admin: 0.7,
  },
  A3: { // Configure Constraints
    admin: 0.4,    // Periodic, not daily
  },
  A4: { // Manage Interoperability
    admin: 0.3,    // Setup-phase task
  },
  A5: { // Institutional Reports
    admin: 0.8,
  },
  A6: { // Manage Payments
    admin: 0.5,
  },
  A7: { // Administer Marketplace
    admin: 0.3,
  },
  A8: { // Manage Micro-Schools
    admin: 0.3,
  },
  A9: { // Platform Governance
    admin: 0.3,
  },
  A10: { // ML Pipeline
    admin: 0.2,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLUSTER 9: COMPETITIVE & SOCIAL (ARENA)
  // ═══════════════════════════════════════════════════════════════════════════

  AR1: { // Browse Competitions
    learner: 0.6,   // Higher if competitiveInterest in onboarding
  },
  AR2: { // Join or Create a Team
    learner: 0.4,
  },
  AR3: { // Claim Bounties
    learner: 0.4,
    creator: 0.5,
  },
  AR4: { // Manage Tokens
    learner: 0.3,
  },
  AR5: { // Community Forum
    learner: 0.3,
  },
  AR6: { // Arena Governance
    learner: 0.2,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLUSTER 10: CONTENT CREATION & MARKETPLACE
  // ═══════════════════════════════════════════════════════════════════════════

  CR1: { // Create Content
    creator: 0.9,
    teacher: 0.4,
  },
  CR2: { // Create a Storybook
    creator: 0.8,
  },
  CR3: { // Submit for Review
    creator: 0.6,
  },
  CR4: { // Browse Marketplace
    creator: 0.5,
    teacher: 0.3,
    parent: 0.2,
    homeschool: 0.3,
    learner: 0.2,
  },
  CR5: { // Track Content Analytics
    creator: 0.7,
  },
  CR6: { // Respond to Bounties
    creator: 0.6,
  },
  CR7: { // Manage Creator Profile
    creator: 0.8,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CROSS-CLUSTER TASKS (X1–X8)
  // ═══════════════════════════════════════════════════════════════════════════

  X1: { // Manage Settings
    learner: 0.2,
    teacher: 0.2,
    parent: 0.2,
    tutor: 0.2,
    admin: 0.3,
    homeschool: 0.2,
    creator: 0.2,
  },
  X2: { // Complete KYC/WWCC
    tutor: 0.7,     // High — required before first session
    teacher: 0.3,
    creator: 0.3,
  },
  X3: { // View Notifications
    learner: 0.3,
    teacher: 0.4,
    parent: 0.4,
    tutor: 0.3,
    admin: 0.4,
    homeschool: 0.3,
    creator: 0.3,
  },
  X4: { // Search Platform (Cmd+K)
    // Not seedable — it's a meta-action, not a destination.
    // Included for completeness; affinity scores are 0.0.
  },
  X5: { // SSI & Credentials
    learner: 0.2,
    teacher: 0.2,
  },
  X6: { // Governance Participation
    learner: 0.1,
    teacher: 0.1,
    admin: 0.2,
    creator: 0.2,
  },
  X7: { // Access Help
    learner: 0.1,
    teacher: 0.1,
    parent: 0.2,
    tutor: 0.1,
    admin: 0.1,
    homeschool: 0.2,
    creator: 0.2,
  },
  X8: { // View Analytics
    teacher: 0.5,
    admin: 0.6,
    creator: 0.5,
    homeschool: 0.3,
  },
};

// =============================================================================
// ONBOARDING INTEREST → TASK BOOST MAP
// =============================================================================
// When the user's onboarding profile includes specific interests, certain
// tasks receive an additive boost to their role affinity score. This is how
// the data collected during the 786-line onboarding flow finally influences
// the navigation experience.
//
// These boosts are ADDITIVE to the base affinity, capped at 1.0.
// =============================================================================

export interface OnboardingBoost {
  /** The onboarding interest that triggers this boost. */
  interest: string;

  /** Tasks to boost and by how much. */
  boosts: Record<string, number>;
}

export const ONBOARDING_INTEREST_BOOSTS: OnboardingBoost[] = [
  {
    interest: 'coding',
    boosts: { AR1: 0.3, L6: 0.2, L7: 0.2 }, // Arena Code Wars, Design Challenge
  },
  {
    interest: 'gaming',
    boosts: { AR1: 0.3, AR2: 0.2, AR4: 0.1 }, // Competitions, Teams, Tokens
  },
  {
    interest: 'science',
    boosts: { L5: 0.3, L4: 0.2 }, // Curiosity Engine, Golden Path
  },
  {
    interest: 'music',
    boosts: { CR1: 0.2, L8: 0.2 }, // Content creation, Portfolio
  },
  {
    interest: 'art',
    boosts: { CR1: 0.3, CR2: 0.2, L8: 0.2 }, // Content creation, Storybooks, Portfolio
  },
  {
    interest: 'languages',
    boosts: { LF1: 0.3, LF2: 0.3, LF4: 0.2, LF7: 0.1 }, // LinguaFlow tasks
  },
  {
    interest: 'reading',
    boosts: { CR4: 0.2, L4: 0.2, L5: 0.2 }, // Marketplace, Golden Path, Curiosity
  },
  {
    interest: 'maths',
    boosts: { L4: 0.3, L2: 0.2, AR1: 0.1 }, // Golden Path, Lessons, Arena
  },
  {
    interest: 'sport',
    boosts: { AR1: 0.2, AR2: 0.2 }, // Competition, Teams
  },
  {
    interest: 'social',
    boosts: { AR5: 0.3, AR2: 0.2, LF6: 0.2 }, // Forum, Teams, Language Exchange
  },
];

// =============================================================================
// CONDITIONAL ONBOARDING BOOSTS
// =============================================================================
// Boosts that depend on specific onboarding flags rather than interest strings.
// =============================================================================

/**
 * If user has early years children (age 3–7), boost early years tasks.
 */
export const EARLY_YEARS_BOOSTS: Record<string, number> = {
  F8: 0.4,   // Little Explorers
};

/**
 * If user expressed competitive interest, boost arena cluster.
 */
export const COMPETITIVE_BOOSTS: Record<string, number> = {
  AR1: 0.3,
  AR2: 0.2,
  AR3: 0.1,
};

/**
 * If user has languages in their profile, boost LinguaFlow.
 */
export const LANGUAGE_BOOSTS: Record<string, number> = {
  LF1: 0.3,
  LF2: 0.3,
  LF3: 0.2,
  LF4: 0.2,
  LF7: 0.1,
};

/**
 * If creator profile completeness is below 80%, boost profile tasks.
 */
export const INCOMPLETE_PROFILE_BOOSTS: Record<string, number> = {
  TU8: 0.4,  // Manage Profile (tutor)
  CR7: 0.4,  // Manage Creator Profile
};
