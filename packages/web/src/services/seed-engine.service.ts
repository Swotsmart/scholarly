// =============================================================================
// SEED ENGINE SERVICE
// =============================================================================
// The scoring algorithm that powers the "Suggested for you" section of the
// self-composing interface. This service evaluates every eligible task from
// the taxonomy against five weighted signals and returns the top 3–4
// candidates that score above the 0.3 threshold.
//
// Architecture:
//   The engine is a pure function — it takes a SeedEngineInput bundle and
//   returns a SeedEngineResult. It has no side effects, no network calls,
//   and no dependency on React or browser APIs. This makes it testable
//   in isolation and portable to a server-side context for future
//   server-computed seeds.
//
// Signal pipeline:
//   1. roleMatch()          — Task-role affinity × onboarding boosts (0.25)
//   2. temporalMatch()      — Time-of-day × term-week relevance     (0.30)
//   3. historyMatch()       — Usage patterns without menu presence   (0.20)
//   4. institutionalMatch() — School calendar event boosts           (0.15)
//   5. peerMatch()          — Anonymised cohort adoption rates       (0.10)
//
// Each signal function returns a raw score between 0.0 and 1.0. The engine
// multiplies each by its weight, sums them, and filters candidates above
// the SEED_SCORE_THRESHOLD (0.3). The top MAX_SEEDS (4) candidates become
// the seed suggestions for this session.
//
// Dependencies:
//   - role-affinity-matrix.ts (roleMatch signal data)
//   - temporal-heuristics.ts  (temporalMatch signal data)
//   - seed-engine-types.ts    (type definitions)
//   - menu-registry.ts        (Phase 1 — task metadata for eligibility)
// =============================================================================

import {
  ROLE_AFFINITY_MATRIX,
  ONBOARDING_INTEREST_BOOSTS,
  EARLY_YEARS_BOOSTS,
  COMPETITIVE_BOOSTS,
  LANGUAGE_BOOSTS,
  INCOMPLETE_PROFILE_BOOSTS,
} from '@/config/role-affinity-matrix';

import {
  getTemporalHeuristics,
  getTermWeekBoosts,
} from '@/config/temporal-heuristics';

import type {
  SeedEngineInput,
  SeedEngineResult,
  SeedCandidate,
  SeedSignalBreakdown,
  SeedSignalName,
  TaskRef,
  RoleId,
  OnboardingProfile,
  PeerUsagePattern,
  InstitutionalContext,
} from '@/types/seed-engine-types';

import {
  SEED_SIGNAL_WEIGHTS,
  SEED_SCORE_THRESHOLD,
  MAX_SEEDS,
  MIN_SEEDS,
  SEED_DISMISS_COOLDOWN_DAYS,
} from '@/types/seed-engine-types';

// =============================================================================
// ENGINE VERSION
// =============================================================================
// Increment this when the scoring algorithm changes materially. Used for
// cache invalidation and A/B testing. Format: major.minor
// =============================================================================

const ENGINE_VERSION = '1.0';

// =============================================================================
// ELIGIBILITY FILTER
// =============================================================================
// Not every task is a candidate for seeding. We exclude:
//   - Tasks already in the user's menu (anchor, active, pushed, seed)
//   - Tasks the user explicitly removed (REMOVED state)
//   - Tasks dismissed within the cooldown period (14 days)
//   - Meta-actions that aren't destinations (X4 = Cmd+K search)
//   - Tasks that are always in the footer (X1 = Settings)
// =============================================================================

/** Tasks that should never be suggested as seeds. */
const UNSEEDABLE_TASKS = new Set<TaskRef>([
  'X4', // Search Platform (Cmd+K) — meta-action, not a destination
  'X1', // Settings — always in footer
  'X7', // Help — always accessible
]);

/**
 * Determine whether a task is eligible to be a seed candidate.
 * A task is eligible if:
 *   1. It's not in the UNSEEDABLE set
 *   2. It's not already visible in the user's menu (anchor/active/seed/pushed)
 *   3. It hasn't been explicitly removed by the user (REMOVED state)
 *   4. If previously dismissed, the cooldown period has elapsed
 */
function isEligible(
  taskRef: TaskRef,
  input: SeedEngineInput,
  now: Date,
): boolean {
  if (UNSEEDABLE_TASKS.has(taskRef)) return false;

  const menuItem = input.menuItems.find(item => item.ref === taskRef);
  if (!menuItem) return true; // Not in menu state at all — eligible

  // Items already visible should not be re-suggested
  if (['anchor', 'active', 'seed', 'pushed'].includes(menuItem.state)) {
    return false;
  }

  // Explicitly removed — never auto-suggest (only manual restore)
  if (menuItem.state === 'removed') return false;

  // Dismissed — check cooldown
  if (menuItem.state === 'dismissed' && menuItem.dismissedAt) {
    const dismissedDate = new Date(menuItem.dismissedAt);
    const cooldownMs = SEED_DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    if (now.getTime() - dismissedDate.getTime() < cooldownMs) {
      return false;
    }
  }

  // Overflow and decaying items ARE eligible — the seed engine can
  // "resurface" items that have decayed if the context warrants it.
  return true;
}

// =============================================================================
// SIGNAL 1: ROLE MATCH (weight: 0.25)
// =============================================================================
// Combines the static role affinity matrix with dynamic onboarding boosts.
// The base score comes from ROLE_AFFINITY_MATRIX[taskRef][role]. Onboarding
// boosts are additive, capped at 1.0.
//
// Think of this as the "DNA" signal — it measures inherent task-role fit
// independent of time, history, or context.
// =============================================================================

function computeRoleMatch(
  taskRef: TaskRef,
  role: RoleId,
  onboarding: OnboardingProfile,
): number {
  // Base affinity from the static matrix
  const affinityRow = ROLE_AFFINITY_MATRIX[taskRef];
  if (!affinityRow) return 0;

  let score = affinityRow[role] ?? 0;

  // Apply interest-based boosts from onboarding
  for (const boostDef of ONBOARDING_INTEREST_BOOSTS) {
    if (onboarding.interests.includes(boostDef.interest)) {
      const taskBoost = boostDef.boosts[taskRef];
      if (taskBoost) {
        score += taskBoost;
      }
    }
  }

  // Apply language boosts if the user has languages in their profile
  if (onboarding.languages.length > 0) {
    const langBoost = LANGUAGE_BOOSTS[taskRef];
    if (langBoost) {
      score += langBoost;
    }
  }

  // Apply competitive interest boosts
  if (onboarding.competitiveInterest) {
    const compBoost = COMPETITIVE_BOOSTS[taskRef];
    if (compBoost) {
      score += compBoost;
    }
  }

  // Apply early years boosts
  if (onboarding.hasEarlyYearsChildren) {
    const eyBoost = EARLY_YEARS_BOOSTS[taskRef];
    if (eyBoost) {
      score += eyBoost;
    }
  }

  // Apply incomplete profile boosts
  if (onboarding.profileCompleteness < 80) {
    const profileBoost = INCOMPLETE_PROFILE_BOOSTS[taskRef];
    if (profileBoost) {
      score += profileBoost;
    }
  }

  // Cap at 1.0
  return Math.min(score, 1.0);
}

// =============================================================================
// SIGNAL 2: TEMPORAL MATCH (weight: 0.30)
// =============================================================================
// The heaviest signal. Combines time-of-day heuristics with term-week
// modifiers. A teacher at 7:45 AM on a Monday in week 1 of term gets
// different suggestions than the same teacher at 4 PM on Friday in week 10.
//
// Think of this as the "now" signal — it answers "what should this person
// be doing right now?" based on known patterns.
// =============================================================================

function computeTemporalMatch(
  taskRef: TaskRef,
  input: SeedEngineInput,
): number {
  const { role, temporal } = input;

  // Get time-of-day heuristics for this role and time block
  const heuristics = getTemporalHeuristics(
    role,
    temporal.timeBlock,
    temporal.isSchoolDay,
  );

  // Find this task's temporal score
  const heuristic = heuristics.find(h => h.taskRef === taskRef);
  let score = heuristic?.score ?? 0;

  // Add term-week modifiers
  const termBoosts = getTermWeekBoosts(role, temporal.termWeek);
  const termBoost = termBoosts[taskRef];
  if (termBoost) {
    score += termBoost;
  }

  // Cap at 1.0
  return Math.min(score, 1.0);
}

// =============================================================================
// SIGNAL 3: HISTORY MATCH (weight: 0.20)
// =============================================================================
// Rewards tasks the user has engaged with but not committed to their menu.
// The classic case: a teacher navigated to the Assessment Builder via Cmd+K
// twice last week but never added it to their menu. This signal says
// "you keep reaching for this — maybe it should be closer."
//
// Also provides a modest boost for overflow items that the user used
// heavily before they decayed, recognising that decay doesn't mean
// irrelevance.
//
// Scoring:
//   - Task used via Cmd+K/URL but not in menu: 0.4 base + 0.1 per use (cap 0.9)
//   - Task in overflow with high historical use: 0.3 base + 0.05 per use (cap 0.7)
//   - Task in decaying state: 0.2 (gentle nudge to re-engage)
//   - Task never used: 0.0
// =============================================================================

function computeHistoryMatch(
  taskRef: TaskRef,
  input: SeedEngineInput,
): number {
  const menuItem = input.menuItems.find(item => item.ref === taskRef);

  // Never used — no history signal
  if (!menuItem || menuItem.useCount === 0) return 0;

  const { state, useCount } = menuItem;

  // Used but not in menu (navigated via Cmd+K or direct URL)
  if (state === 'dismissed' || !['anchor', 'active', 'seed', 'pushed', 'removed'].includes(state)) {
    // "Near miss" — the user knows about this feature
    return Math.min(0.4 + (useCount * 0.1), 0.9);
  }

  // Overflow — was in menu, decayed from disuse
  if (state === 'overflow') {
    return Math.min(0.3 + (useCount * 0.05), 0.7);
  }

  // Decaying — still in menu but fading
  if (state === 'decaying') {
    return 0.2;
  }

  return 0;
}

// =============================================================================
// SIGNAL 4: INSTITUTIONAL MATCH (weight: 0.15)
// =============================================================================
// Captures school-level events that make certain tasks contextually relevant.
// The institutional context arrives pre-computed from the server, containing
// active events and their task boosts.
//
// Examples:
//   - NAPLAN next week → boost T8 (Reports) and T3 (Assessment Builder)
//   - Parent-teacher conference week → boost D3 (Messages) for parents
//   - Compliance deadline approaching → boost H2, H3 for homeschool
//
// The institutional signal is the most "external" signal — it reflects what
// the school needs, not what the individual user has done.
// =============================================================================

function computeInstitutionalMatch(
  taskRef: TaskRef,
  input: SeedEngineInput,
): number {
  const { institutional } = input;
  if (!institutional || institutional.activeEvents.length === 0) return 0;

  let maxBoost = 0;

  for (const event of institutional.activeEvents) {
    const boost = event.taskBoosts[taskRef];
    if (boost !== undefined && boost > maxBoost) {
      maxBoost = boost;
    }
  }

  // Cap at 1.0
  return Math.min(maxBoost, 1.0);
}

// =============================================================================
// SIGNAL 5: PEER MATCH (weight: 0.10)
// =============================================================================
// Uses anonymised, aggregated usage data from users in the same role to
// surface tasks that are popular among peers. This is the "wisdom of the
// crowd" signal.
//
// Scoring combines two sub-signals:
//   - Adoption rate: fraction of peers who have this task active (0.0–1.0)
//   - Trend weight: how recently peers started adopting this task
//
// The formula: 0.6 × adoptionRate + 0.4 × trendWeight
//
// The trend weight prevents the peer signal from always recommending the
// same well-established tasks. A task that 30% of Year 5 teachers just
// started using this week is more interesting than one that 80% have had
// in their menu for months.
// =============================================================================

function computePeerMatch(
  taskRef: TaskRef,
  peerPatterns: PeerUsagePattern[],
): number {
  const pattern = peerPatterns.find(p => p.taskRef === taskRef);
  if (!pattern) return 0;

  const combined = (0.6 * pattern.adoptionRate) + (0.4 * pattern.trendWeight);
  return Math.min(combined, 1.0);
}

// =============================================================================
// REASON GENERATION
// =============================================================================
// Each seed candidate carries a human-readable reason that's shown as the
// sparkle tooltip in the sidebar. The reason is generated from the signal
// that contributed most to the candidate's composite score.
//
// Good reasons are specific and actionable:
//   ✓ "Popular with Year 5 teachers this week"
//   ✓ "Reports are due soon"
//   ✓ "You've visited this 3 times via search"
//   ✗ "This might be useful" (too vague)
//   ✗ "Based on your profile" (too meta)
// =============================================================================

function generateReason(
  taskRef: TaskRef,
  primarySignal: SeedSignalName,
  input: SeedEngineInput,
): string {
  switch (primarySignal) {
    case 'temporal':
      return generateTemporalReason(taskRef, input);
    case 'role':
      return generateRoleReason(taskRef, input);
    case 'history':
      return generateHistoryReason(taskRef, input);
    case 'institutional':
      return generateInstitutionalReason(taskRef, input);
    case 'peer':
      return generatePeerReason(taskRef, input);
    default:
      return 'Suggested for you';
  }
}

function generateTemporalReason(
  _taskRef: TaskRef,
  input: SeedEngineInput,
): string {
  const { timeBlock, isSchoolDay } = input.temporal;

  const timeLabels: Record<string, string> = {
    early_morning: 'this early morning',
    morning: 'this morning',
    late_morning: 'this morning',
    midday: 'around lunchtime',
    afternoon: 'this afternoon',
    evening: 'this evening',
    night: 'tonight',
  };

  const timeLabel = timeLabels[timeBlock] ?? 'right now';
  const dayContext = isSchoolDay ? '' : ' on the weekend';

  return `Often used ${timeLabel}${dayContext}`;
}

function generateRoleReason(
  _taskRef: TaskRef,
  input: SeedEngineInput,
): string {
  const roleLabels: Record<RoleId, string> = {
    teacher: 'teachers',
    parent: 'parents',
    learner: 'learners',
    tutor: 'tutors',
    admin: 'administrators',
    homeschool: 'homeschool families',
    creator: 'content creators',
  };

  return `Recommended for ${roleLabels[input.role] ?? 'you'}`;
}

function generateHistoryReason(
  taskRef: TaskRef,
  input: SeedEngineInput,
): string {
  const menuItem = input.menuItems.find(item => item.ref === taskRef);
  if (!menuItem) return 'Based on your activity';

  if (menuItem.state === 'overflow') {
    return 'You used this before — bring it back?';
  }

  if (menuItem.useCount > 1) {
    return `You've visited this ${menuItem.useCount} times`;
  }

  return 'Based on your recent activity';
}

function generateInstitutionalReason(
  taskRef: TaskRef,
  input: SeedEngineInput,
): string {
  // Find the event that provides the boost for this task
  for (const event of input.institutional.activeEvents) {
    if (event.taskBoosts[taskRef]) {
      return event.label;
    }
  }
  return 'Relevant for your school right now';
}

function generatePeerReason(
  taskRef: TaskRef,
  input: SeedEngineInput,
): string {
  const pattern = input.peerPatterns.find(p => p.taskRef === taskRef);
  if (!pattern) return 'Popular with your peers';

  const pct = Math.round(pattern.adoptionRate * 100);

  const roleLabels: Record<RoleId, string> = {
    teacher: 'teachers',
    parent: 'parents',
    learner: 'learners',
    tutor: 'tutors',
    admin: 'admins',
    homeschool: 'homeschool parents',
    creator: 'creators',
  };

  const roleLabel = roleLabels[input.role] ?? 'users';

  if (pattern.trendWeight > 0.6) {
    return `Trending: ${pct}% of ${roleLabel} use this`;
  }

  return `Used by ${pct}% of ${roleLabel}`;
}

// =============================================================================
// DIVERSITY ENFORCEMENT
// =============================================================================
// The final seed selection applies a diversity filter to prevent all seeds
// from coming from the same cluster. If the top 4 candidates are all from
// the Teaching & Curriculum cluster, the user misses suggestions from
// Learning, Arena, or LinguaFlow.
//
// The diversity rule: no more than 2 seeds from the same task cluster.
// If a 3rd candidate from the same cluster would be selected, it's skipped
// in favour of the next highest-scoring candidate from a different cluster.
// =============================================================================

/** Map task refs to their cluster for diversity enforcement. */
const TASK_CLUSTER_MAP: Record<string, string> = {
  // Cluster 1: Daily Operations
  D1: 'daily', D2: 'daily', D3: 'daily', D4: 'daily',
  D5: 'daily', D6: 'daily', D7: 'daily',
  // Cluster 2: Teaching & Curriculum
  T1: 'teaching', T2: 'teaching', T3: 'teaching', T4: 'teaching',
  T5: 'teaching', T6: 'teaching', T7: 'teaching', T8: 'teaching',
  // Cluster 3: Learning & Growth
  L1: 'learning', L2: 'learning', L3: 'learning', L4: 'learning',
  L5: 'learning', L6: 'learning', L7: 'learning', L8: 'learning',
  L9: 'learning',
  // Cluster 4: LinguaFlow
  LF1: 'linguaflow', LF2: 'linguaflow', LF3: 'linguaflow',
  LF4: 'linguaflow', LF5: 'linguaflow', LF6: 'linguaflow',
  LF7: 'linguaflow',
  // Cluster 5: Family & Parenting
  F1: 'family', F2: 'family', F3: 'family', F4: 'family',
  F5: 'family', F6: 'family', F7: 'family', F8: 'family',
  // Cluster 6: Homeschool Management
  H1: 'homeschool', H2: 'homeschool', H3: 'homeschool',
  H4: 'homeschool', H5: 'homeschool', H6: 'homeschool',
  H7: 'homeschool',
  // Cluster 7: Tutoring & Sessions
  TU1: 'tutoring', TU2: 'tutoring', TU3: 'tutoring', TU4: 'tutoring',
  TU5: 'tutoring', TU6: 'tutoring', TU7: 'tutoring', TU8: 'tutoring',
  // Cluster 8: Institutional Administration
  A1: 'admin', A2: 'admin', A3: 'admin', A4: 'admin', A5: 'admin',
  A6: 'admin', A7: 'admin', A8: 'admin', A9: 'admin', A10: 'admin',
  // Cluster 9: Arena
  AR1: 'arena', AR2: 'arena', AR3: 'arena', AR4: 'arena',
  AR5: 'arena', AR6: 'arena',
  // Cluster 10: Content Creation
  CR1: 'content', CR2: 'content', CR3: 'content', CR4: 'content',
  CR5: 'content', CR6: 'content', CR7: 'content',
  // Cross-cluster
  X1: 'cross', X2: 'cross', X3: 'cross', X4: 'cross',
  X5: 'cross', X6: 'cross', X7: 'cross', X8: 'cross',
};

const MAX_SEEDS_PER_CLUSTER = 2;

function applyDiversityFilter(
  candidates: SeedCandidate[],
  maxSeeds: number,
): SeedCandidate[] {
  const selected: SeedCandidate[] = [];
  const clusterCounts: Record<string, number> = {};

  for (const candidate of candidates) {
    if (selected.length >= maxSeeds) break;

    const cluster = TASK_CLUSTER_MAP[candidate.taskRef] ?? 'unknown';
    const currentCount = clusterCounts[cluster] ?? 0;

    if (currentCount >= MAX_SEEDS_PER_CLUSTER) continue;

    selected.push(candidate);
    clusterCounts[cluster] = currentCount + 1;
  }

  // If diversity filtering reduced below MIN_SEEDS, relax the constraint
  // and fill from remaining candidates regardless of cluster
  if (selected.length < MIN_SEEDS) {
    for (const candidate of candidates) {
      if (selected.length >= MIN_SEEDS) break;
      if (!selected.includes(candidate)) {
        selected.push(candidate);
      }
    }
  }

  return selected;
}

// =============================================================================
// MAIN ENGINE: computeSeeds()
// =============================================================================
// The public entry point. Pure function: input → output, no side effects.
//
// Algorithm:
//   1. Enumerate all task refs from the affinity matrix
//   2. Filter to eligible candidates (not in menu, not removed, etc.)
//   3. Score each candidate across all 5 signals
//   4. Filter to candidates above the score threshold (0.3)
//   5. Sort by composite score descending
//   6. Apply diversity filter (max 2 per cluster)
//   7. Return top 3–4 candidates with signal breakdown and reasons
// =============================================================================

export function computeSeeds(input: SeedEngineInput): SeedEngineResult {
  const startTime = performance.now();
  const now = new Date();

  // Step 1: Get all task refs from the affinity matrix
  const allTaskRefs = Object.keys(ROLE_AFFINITY_MATRIX) as TaskRef[];

  // Step 2: Filter to eligible candidates
  const eligibleRefs = allTaskRefs.filter(ref => isEligible(ref, input, now));

  // Step 3: Score each candidate
  const allCandidates: SeedCandidate[] = eligibleRefs.map(taskRef => {
    // Compute raw signal scores
    const rawRole = computeRoleMatch(taskRef, input.role, input.onboarding);
    const rawTemporal = computeTemporalMatch(taskRef, input);
    const rawHistory = computeHistoryMatch(taskRef, input);
    const rawInstitutional = computeInstitutionalMatch(taskRef, input);
    const rawPeer = computePeerMatch(taskRef, input.peerPatterns);

    // Apply weights
    const signals: SeedSignalBreakdown = {
      role: rawRole * SEED_SIGNAL_WEIGHTS.role,
      temporal: rawTemporal * SEED_SIGNAL_WEIGHTS.temporal,
      history: rawHistory * SEED_SIGNAL_WEIGHTS.history,
      institutional: rawInstitutional * SEED_SIGNAL_WEIGHTS.institutional,
      peer: rawPeer * SEED_SIGNAL_WEIGHTS.peer,
    };

    // Composite score
    const compositeScore =
      signals.role +
      signals.temporal +
      signals.history +
      signals.institutional +
      signals.peer;

    // Identify primary signal (the one that contributed most)
    const signalEntries = Object.entries(signals) as Array<[SeedSignalName, number]>;
    const primarySignal = signalEntries.reduce(
      (max, entry) => entry[1] > max[1] ? entry : max,
      signalEntries[0]!,
    )[0];

    // Generate reason based on primary signal
    const reason = generateReason(taskRef, primarySignal, input);

    return {
      taskRef,
      compositeScore,
      signals,
      reason,
      primarySignal,
    };
  });

  // Step 4: Filter above threshold
  const aboveThreshold = allCandidates
    .filter(c => c.compositeScore >= SEED_SCORE_THRESHOLD);

  // Step 5: Sort by composite score descending
  const sorted = aboveThreshold.sort(
    (a, b) => b.compositeScore - a.compositeScore,
  );

  // Step 6: Apply diversity filter
  const seeds = applyDiversityFilter(sorted, MAX_SEEDS);

  // Step 7: Build result
  const computeTimeMs = Math.round(performance.now() - startTime);

  return {
    seeds,
    allCandidates: sorted,
    computedAt: now.toISOString(),
    engineVersion: ENGINE_VERSION,
    computeTimeMs,
  };
}

// =============================================================================
// UTILITY: buildDefaultOnboarding()
// =============================================================================
// Provides safe defaults for users who haven't completed onboarding.
// The seed engine gracefully degrades — without onboarding data, the role
// and temporal signals carry the weight.
// =============================================================================

export function buildDefaultOnboarding(): OnboardingProfile {
  return {
    interests: [],
    subjects: [],
    yearLevels: [],
    languages: [],
    competitiveInterest: false,
    hasEarlyYearsChildren: false,
    profileCompleteness: 0,
  };
}
