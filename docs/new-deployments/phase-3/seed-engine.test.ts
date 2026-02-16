// =============================================================================
// SEED ENGINE TEST SUITE
// =============================================================================

import { describe, it, expect } from '@jest/globals';
import { computeSeeds, buildDefaultOnboarding } from '@/services/seed-engine.service';
import {
  resolveTimeBlock, resolveDayOfWeek, isSchoolDay,
  getTemporalHeuristics, getTermWeekBoosts,
} from '@/config/temporal-heuristics';
import { ROLE_AFFINITY_MATRIX } from '@/config/role-affinity-matrix';
import type { SeedEngineInput, RoleId } from '@/types/seed-engine-types';
import { SEED_SCORE_THRESHOLD, MAX_SEEDS } from '@/types/seed-engine-types';

// ── Helpers ──

function buildInput(overrides: Partial<SeedEngineInput> = {}): SeedEngineInput {
  return {
    role: 'teacher',
    onboarding: buildDefaultOnboarding(),
    temporal: { hour: 9, dayOfWeek: 'monday', timeBlock: 'morning', termWeek: 3, isSchoolDay: true },
    menuItems: [],
    institutional: { activeEvents: [], currentTerm: 1, termsPerYear: 4, termWeek: 3, timezone: 'Australia/Perth' },
    peerPatterns: [],
    ...overrides,
  };
}

function daysAgo(days: number): string {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString();
}

// =============================================================================
// 1. ELIGIBILITY FILTERING
// =============================================================================

describe('Eligibility Filtering', () => {
  it('excludes anchor items', () => {
    const result = computeSeeds(buildInput({
      menuItems: [{ ref: 'D1', state: 'anchor', useCount: 50, lastUsed: new Date().toISOString(), pinned: false }],
    }));
    expect(result.seeds.map(s => s.taskRef)).not.toContain('D1');
  });

  it('excludes active items', () => {
    const result = computeSeeds(buildInput({
      menuItems: [{ ref: 'D2', state: 'active', useCount: 10, lastUsed: new Date().toISOString(), pinned: false }],
    }));
    expect(result.seeds.map(s => s.taskRef)).not.toContain('D2');
  });

  it('excludes removed items', () => {
    const result = computeSeeds(buildInput({
      menuItems: [{ ref: 'D2', state: 'removed', useCount: 5, lastUsed: daysAgo(10), pinned: false }],
    }));
    expect(result.seeds.map(s => s.taskRef)).not.toContain('D2');
  });

  it('excludes dismissed items within 14-day cooldown', () => {
    const result = computeSeeds(buildInput({
      menuItems: [{ ref: 'D2', state: 'dismissed', useCount: 1, lastUsed: daysAgo(5), pinned: false, dismissedAt: daysAgo(5) }],
    }));
    expect(result.seeds.map(s => s.taskRef)).not.toContain('D2');
  });

  it('includes dismissed items after 14-day cooldown', () => {
    const result = computeSeeds(buildInput({
      menuItems: [{ ref: 'D2', state: 'dismissed', useCount: 3, lastUsed: daysAgo(20), pinned: false, dismissedAt: daysAgo(20) }],
    }));
    expect(result.allCandidates.map(c => c.taskRef)).toContain('D2');
  });

  it('includes overflow items as candidates', () => {
    const result = computeSeeds(buildInput({
      menuItems: [{ ref: 'D2', state: 'overflow', useCount: 15, lastUsed: daysAgo(65), pinned: false }],
    }));
    expect(result.allCandidates.map(c => c.taskRef)).toContain('D2');
  });

  it('never suggests unseedable tasks (X4, X1, X7)', () => {
    const result = computeSeeds(buildInput());
    const refs = result.allCandidates.map(c => c.taskRef);
    expect(refs).not.toContain('X4');
    expect(refs).not.toContain('X1');
    expect(refs).not.toContain('X7');
  });

  it('excludes pushed items', () => {
    const result = computeSeeds(buildInput({
      menuItems: [{ ref: 'D2', state: 'pushed', useCount: 0, lastUsed: new Date().toISOString(), pinned: false }],
    }));
    expect(result.seeds.map(s => s.taskRef)).not.toContain('D2');
  });

  it('excludes seed items already showing', () => {
    const result = computeSeeds(buildInput({
      menuItems: [{ ref: 'D2', state: 'seed', useCount: 0, lastUsed: new Date().toISOString(), pinned: false }],
    }));
    expect(result.seeds.map(s => s.taskRef)).not.toContain('D2');
  });
});

// =============================================================================
// 2. ROLE MATCH SIGNAL
// =============================================================================

describe('Role Match Signal', () => {
  it('scores teacher tasks high for teacher role', () => {
    const result = computeSeeds(buildInput({ role: 'teacher' }));
    const d2 = result.allCandidates.find(c => c.taskRef === 'D2');
    expect(d2?.signals.role).toBeGreaterThan(0); // D2 teacher affinity = 1.0
  });

  it('scores arena tasks zero for teacher without boosts', () => {
    const result = computeSeeds(buildInput({ role: 'teacher' }));
    const ar1 = result.allCandidates.find(c => c.taskRef === 'AR1');
    expect(ar1?.signals.role ?? 0).toBe(0);
  });

  it('boosts tasks based on onboarding interests', () => {
    const boosted = computeSeeds(buildInput({
      role: 'learner',
      onboarding: { ...buildDefaultOnboarding(), interests: ['coding', 'gaming'], competitiveInterest: true },
    }));
    const unboosted = computeSeeds(buildInput({ role: 'learner' }));

    const ar1Boosted = boosted.allCandidates.find(c => c.taskRef === 'AR1');
    const ar1Unboosted = unboosted.allCandidates.find(c => c.taskRef === 'AR1');
    expect(ar1Boosted?.signals.role).toBeGreaterThan(ar1Unboosted?.signals.role ?? 0);
  });

  it('boosts LinguaFlow when languages are set', () => {
    const result = computeSeeds(buildInput({
      role: 'learner',
      onboarding: { ...buildDefaultOnboarding(), languages: ['French'] },
    }));
    const lf1 = result.allCandidates.find(c => c.taskRef === 'LF1');
    expect(lf1?.signals.role).toBeGreaterThan(0.15); // 0.6 base + 0.3 boost = 0.9 × 0.25
  });

  it('boosts Little Explorers for early years children', () => {
    const result = computeSeeds(buildInput({
      role: 'parent',
      onboarding: { ...buildDefaultOnboarding(), hasEarlyYearsChildren: true },
    }));
    const f8 = result.allCandidates.find(c => c.taskRef === 'F8');
    expect(f8?.signals.role).toBe(0.25); // (0.6 + 0.4) capped at 1.0 × 0.25
  });

  it('caps role score at 0.25 (weight limit)', () => {
    const result = computeSeeds(buildInput({
      role: 'learner',
      onboarding: { ...buildDefaultOnboarding(), interests: ['coding', 'gaming', 'science'], competitiveInterest: true },
    }));
    for (const c of result.allCandidates) {
      expect(c.signals.role).toBeLessThanOrEqual(0.25);
    }
  });
});

// =============================================================================
// 3. TEMPORAL MATCH SIGNAL
// =============================================================================

describe('Temporal Match Signal', () => {
  it('scores Attendance at 0.30 for teacher at 8 AM Monday', () => {
    const result = computeSeeds(buildInput({
      role: 'teacher',
      temporal: { hour: 8, dayOfWeek: 'monday', timeBlock: 'morning', termWeek: 3, isSchoolDay: true },
    }));
    const d2 = result.allCandidates.find(c => c.taskRef === 'D2');
    expect(d2?.signals.temporal).toBe(0.30); // 1.0 × 0.30
  });

  it('scores Arena at 0.27 for learner afternoon', () => {
    const result = computeSeeds(buildInput({
      role: 'learner',
      temporal: { hour: 15, dayOfWeek: 'wednesday', timeBlock: 'afternoon', termWeek: 5, isSchoolDay: true },
    }));
    const ar1 = result.allCandidates.find(c => c.taskRef === 'AR1');
    expect(ar1?.signals.temporal).toBeCloseTo(0.27, 2); // 0.9 × 0.30
  });

  it('reduces temporal scores on weekends', () => {
    const weekday = computeSeeds(buildInput({
      role: 'teacher',
      temporal: { hour: 9, dayOfWeek: 'monday', timeBlock: 'morning', termWeek: 3, isSchoolDay: true },
    }));
    const weekend = computeSeeds(buildInput({
      role: 'teacher',
      temporal: { hour: 9, dayOfWeek: 'saturday', timeBlock: 'morning', termWeek: 3, isSchoolDay: false },
    }));

    const d2Weekday = weekday.allCandidates.find(c => c.taskRef === 'D2');
    const d2Weekend = weekend.allCandidates.find(c => c.taskRef === 'D2');
    expect(d2Weekend?.signals.temporal ?? 0).toBeLessThan(d2Weekday?.signals.temporal ?? 0);
  });

  it('applies term-week boosts at end of term', () => {
    const early = computeSeeds(buildInput({
      temporal: { hour: 14, dayOfWeek: 'friday', timeBlock: 'afternoon', termWeek: 3, isSchoolDay: true },
    }));
    const late = computeSeeds(buildInput({
      temporal: { hour: 14, dayOfWeek: 'friday', timeBlock: 'afternoon', termWeek: 10, isSchoolDay: true },
    }));

    const t8Early = early.allCandidates.find(c => c.taskRef === 'T8');
    const t8Late = late.allCandidates.find(c => c.taskRef === 'T8');
    expect(t8Late?.signals.temporal ?? 0).toBeGreaterThan(t8Early?.signals.temporal ?? 0);
  });
});

// =============================================================================
// 4. HISTORY MATCH SIGNAL
// =============================================================================

describe('History Match Signal', () => {
  it('scores 0 for tasks never used', () => {
    const result = computeSeeds(buildInput({ menuItems: [] }));
    for (const c of result.allCandidates) {
      expect(c.signals.history).toBe(0);
    }
  });

  it('scores overflow items with high use count', () => {
    const result = computeSeeds(buildInput({
      menuItems: [{ ref: 'T1', state: 'overflow', useCount: 20, lastUsed: daysAgo(65), pinned: false }],
    }));
    const t1 = result.allCandidates.find(c => c.taskRef === 'T1');
    expect(t1?.signals.history).toBeGreaterThan(0); // 0.3 + 20×0.05 = 1.3 → capped 0.7 × 0.20
  });

  it('scores decaying items at a gentle nudge level', () => {
    const result = computeSeeds(buildInput({
      menuItems: [{ ref: 'T1', state: 'decaying', useCount: 5, lastUsed: daysAgo(35), pinned: false }],
    }));
    const t1 = result.allCandidates.find(c => c.taskRef === 'T1');
    expect(t1?.signals.history).toBeCloseTo(0.04, 2); // 0.2 × 0.20
  });
});

// =============================================================================
// 5. INSTITUTIONAL MATCH SIGNAL
// =============================================================================

describe('Institutional Match Signal', () => {
  it('scores 0 when no institutional events are active', () => {
    const result = computeSeeds(buildInput());
    for (const c of result.allCandidates) {
      expect(c.signals.institutional).toBe(0);
    }
  });

  it('boosts tasks matching active events', () => {
    const result = computeSeeds(buildInput({
      institutional: {
        activeEvents: [{
          type: 'standardised_testing',
          label: 'NAPLAN next week',
          startDate: new Date().toISOString(),
          endDate: daysAgo(-7),
          taskBoosts: { T8: 0.8, T3: 0.6 },
        }],
        currentTerm: 1, termsPerYear: 4, termWeek: 5,
        timezone: 'Australia/Perth',
      },
    }));

    const t8 = result.allCandidates.find(c => c.taskRef === 'T8');
    const t3 = result.allCandidates.find(c => c.taskRef === 'T3');
    expect(t8?.signals.institutional).toBeCloseTo(0.12, 2); // 0.8 × 0.15
    expect(t3?.signals.institutional).toBeCloseTo(0.09, 2); // 0.6 × 0.15
  });

  it('takes the maximum boost when multiple events boost the same task', () => {
    const result = computeSeeds(buildInput({
      institutional: {
        activeEvents: [
          { type: 'standardised_testing', label: 'NAPLAN', startDate: '', endDate: '', taskBoosts: { T8: 0.6 } },
          { type: 'reporting_period', label: 'Term reports', startDate: '', endDate: '', taskBoosts: { T8: 0.9 } },
        ],
        currentTerm: 1, termsPerYear: 4, termWeek: 9,
        timezone: 'Australia/Perth',
      },
    }));

    const t8 = result.allCandidates.find(c => c.taskRef === 'T8');
    expect(t8?.signals.institutional).toBeCloseTo(0.135, 2); // max(0.6, 0.9) × 0.15
  });
});

// =============================================================================
// 6. PEER MATCH SIGNAL
// =============================================================================

describe('Peer Match Signal', () => {
  it('scores 0 when no peer data is available', () => {
    const result = computeSeeds(buildInput({ peerPatterns: [] }));
    for (const c of result.allCandidates) {
      expect(c.signals.peer).toBe(0);
    }
  });

  it('combines adoption rate and trend weight', () => {
    const result = computeSeeds(buildInput({
      peerPatterns: [
        { taskRef: 'T1', adoptionRate: 0.8, trendWeight: 0.3 },
      ],
    }));

    const t1 = result.allCandidates.find(c => c.taskRef === 'T1');
    // (0.6 × 0.8 + 0.4 × 0.3) = 0.48 + 0.12 = 0.60 × 0.10 = 0.06
    expect(t1?.signals.peer).toBeCloseTo(0.06, 2);
  });

  it('weights trending tasks higher', () => {
    const result = computeSeeds(buildInput({
      peerPatterns: [
        { taskRef: 'T1', adoptionRate: 0.3, trendWeight: 0.9 },  // Trending
        { taskRef: 'T3', adoptionRate: 0.8, trendWeight: 0.1 },  // Established
      ],
    }));

    const t1 = result.allCandidates.find(c => c.taskRef === 'T1');
    const t3 = result.allCandidates.find(c => c.taskRef === 'T3');

    // T1: 0.6×0.3 + 0.4×0.9 = 0.54 × 0.10 = 0.054
    // T3: 0.6×0.8 + 0.4×0.1 = 0.52 × 0.10 = 0.052
    // T1 slightly higher due to trending weight
    expect(t1?.signals.peer).toBeGreaterThanOrEqual(t3?.signals.peer ?? 0);
  });
});

// =============================================================================
// 7. COMPOSITE SCORING
// =============================================================================

describe('Composite Scoring', () => {
  it('sums all signal scores into composite', () => {
    const result = computeSeeds(buildInput({
      role: 'teacher',
      temporal: { hour: 8, dayOfWeek: 'monday', timeBlock: 'morning', termWeek: 3, isSchoolDay: true },
    }));

    for (const c of result.allCandidates) {
      const expected = c.signals.role + c.signals.temporal + c.signals.history +
                       c.signals.institutional + c.signals.peer;
      expect(c.compositeScore).toBeCloseTo(expected, 10);
    }
  });

  it('filters candidates below the 0.3 threshold', () => {
    const result = computeSeeds(buildInput());
    // All candidates above threshold should be in allCandidates
    for (const c of result.allCandidates) {
      expect(c.compositeScore).toBeGreaterThanOrEqual(SEED_SCORE_THRESHOLD);
    }
  });

  it('sorts candidates by composite score descending', () => {
    const result = computeSeeds(buildInput());
    for (let i = 1; i < result.allCandidates.length; i++) {
      expect(result.allCandidates[i]!.compositeScore)
        .toBeLessThanOrEqual(result.allCandidates[i - 1]!.compositeScore);
    }
  });

  it('returns at most MAX_SEEDS (4) seeds', () => {
    const result = computeSeeds(buildInput());
    expect(result.seeds.length).toBeLessThanOrEqual(MAX_SEEDS);
  });

  it('includes metadata in the result', () => {
    const result = computeSeeds(buildInput());
    expect(result.computedAt).toBeTruthy();
    expect(result.engineVersion).toBe('1.0');
    expect(result.computeTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// 8. DIVERSITY ENFORCEMENT
// =============================================================================

describe('Diversity Enforcement', () => {
  it('limits seeds to max 2 from the same cluster', () => {
    // Use a role that has many tasks in one cluster with high temporal scores
    const result = computeSeeds(buildInput({
      role: 'teacher',
      temporal: { hour: 8, dayOfWeek: 'monday', timeBlock: 'morning', termWeek: 3, isSchoolDay: true },
    }));

    // Count cluster occurrences in final seeds
    const clusterCounts: Record<string, number> = {};
    for (const seed of result.seeds) {
      const cluster = getCluster(seed.taskRef);
      clusterCounts[cluster] = (clusterCounts[cluster] ?? 0) + 1;
    }

    for (const count of Object.values(clusterCounts)) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });
});

// Helper to get cluster from task ref
function getCluster(ref: string): string {
  if (ref.startsWith('D')) return 'daily';
  if (ref.startsWith('T')) return 'teaching';
  if (ref.startsWith('L')) return 'learning';
  if (ref.startsWith('LF')) return 'linguaflow';
  if (ref.startsWith('F')) return 'family';
  if (ref.startsWith('H')) return 'homeschool';
  if (ref.startsWith('TU')) return 'tutoring';
  if (ref.startsWith('A')) return 'admin';
  if (ref.startsWith('AR')) return 'arena';
  if (ref.startsWith('CR')) return 'content';
  return 'cross';
}

// =============================================================================
// 9. INTEGRATION SCENARIOS
// =============================================================================

describe('Integration Scenarios', () => {
  it('Scenario: Sarah the teacher, Monday 8 AM, start of term', () => {
    const result = computeSeeds(buildInput({
      role: 'teacher',
      onboarding: { ...buildDefaultOnboarding(), subjects: ['Maths', 'Science'], yearLevels: [5] },
      temporal: { hour: 8, dayOfWeek: 'monday', timeBlock: 'morning', termWeek: 1, isSchoolDay: true },
      menuItems: [
        { ref: 'D1', state: 'anchor', useCount: 100, lastUsed: new Date().toISOString(), pinned: false },
        { ref: 'T2', state: 'anchor', useCount: 80, lastUsed: new Date().toISOString(), pinned: false },
      ],
    }));

    // Expect Attendance (D2) and Timetable (D4) as top seeds for morning
    const seedRefs = result.seeds.map(s => s.taskRef);
    expect(seedRefs).toContain('D2'); // High temporal + high role
    expect(seedRefs).toContain('D4'); // High temporal for morning
    expect(result.seeds.length).toBeGreaterThanOrEqual(2);
    expect(result.seeds.length).toBeLessThanOrEqual(4);
  });

  it('Scenario: David the parent, evening, child below benchmark', () => {
    const result = computeSeeds(buildInput({
      role: 'parent',
      onboarding: { ...buildDefaultOnboarding(), hasEarlyYearsChildren: true },
      temporal: { hour: 18, dayOfWeek: 'tuesday', timeBlock: 'evening', termWeek: 5, isSchoolDay: true },
      menuItems: [
        { ref: 'D1', state: 'anchor', useCount: 20, lastUsed: new Date().toISOString(), pinned: false },
        { ref: 'D3', state: 'anchor', useCount: 15, lastUsed: new Date().toISOString(), pinned: false },
      ],
    }));

    const seedRefs = result.seeds.map(s => s.taskRef);
    // Evening parent should see Progress (F1) and Little Explorers (F8)
    expect(seedRefs).toContain('F1'); // 1.0 role + 0.8 temporal
    expect(seedRefs).toContain('F8'); // 0.6 + 0.4 early years boost
  });

  it('Scenario: James the learner, afternoon, interests in gaming and coding', () => {
    const result = computeSeeds(buildInput({
      role: 'learner',
      onboarding: { ...buildDefaultOnboarding(), interests: ['coding', 'gaming'], competitiveInterest: true },
      temporal: { hour: 15, dayOfWeek: 'wednesday', timeBlock: 'afternoon', termWeek: 4, isSchoolDay: true },
      menuItems: [
        { ref: 'D1', state: 'anchor', useCount: 30, lastUsed: new Date().toISOString(), pinned: false },
        { ref: 'L3', state: 'anchor', useCount: 25, lastUsed: new Date().toISOString(), pinned: false },
      ],
    }));

    const seedRefs = result.seeds.map(s => s.taskRef);
    expect(seedRefs).toContain('AR1'); // High temporal + gaming+coding boost
  });

  it('Scenario: Rachel the tutor, evening, first week', () => {
    const result = computeSeeds(buildInput({
      role: 'tutor',
      onboarding: { ...buildDefaultOnboarding(), profileCompleteness: 40 },
      temporal: { hour: 19, dayOfWeek: 'monday', timeBlock: 'evening', termWeek: 1, isSchoolDay: true },
      menuItems: [
        { ref: 'D1', state: 'anchor', useCount: 5, lastUsed: new Date().toISOString(), pinned: false },
      ],
    }));

    const seedRefs = result.seeds.map(s => s.taskRef);
    // Evening tutor should see Earnings (TU7) and Availability (TU1)
    expect(seedRefs).toContain('TU7'); // 0.8 role + 0.8 temporal
  });

  it('Scenario: Catherine the admin, morning, NAPLAN assessment week', () => {
    const result = computeSeeds(buildInput({
      role: 'admin',
      temporal: { hour: 9, dayOfWeek: 'monday', timeBlock: 'morning', termWeek: 5, isSchoolDay: true },
      institutional: {
        activeEvents: [{
          type: 'standardised_testing',
          label: 'NAPLAN testing this week',
          startDate: new Date().toISOString(),
          endDate: daysAgo(-5),
          taskBoosts: { T8: 0.7, A5: 0.8, T3: 0.5 },
        }],
        currentTerm: 1, termsPerYear: 4, termWeek: 5,
        timezone: 'Australia/Perth',
      },
      menuItems: [
        { ref: 'D1', state: 'anchor', useCount: 50, lastUsed: new Date().toISOString(), pinned: false },
        { ref: 'A1', state: 'anchor', useCount: 40, lastUsed: new Date().toISOString(), pinned: false },
      ],
    }));

    const seedRefs = result.seeds.map(s => s.taskRef);
    // NAPLAN should boost Reports (A5) and Relief (D7) for morning admin
    expect(seedRefs).toContain('D7'); // 1.0 temporal for admin morning
    expect(seedRefs).toContain('A5'); // institutional NAPLAN boost
  });
});

// =============================================================================
// 10. EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('handles empty menu items gracefully', () => {
    const result = computeSeeds(buildInput({ menuItems: [] }));
    expect(result.seeds.length).toBeGreaterThanOrEqual(0);
    expect(result.computedAt).toBeTruthy();
  });

  it('handles empty onboarding gracefully', () => {
    const result = computeSeeds(buildInput({ onboarding: buildDefaultOnboarding() }));
    expect(result.seeds.length).toBeGreaterThanOrEqual(0);
  });

  it('handles all items in menu (no eligible candidates)', () => {
    // Add every task as active
    const allRefs = Object.keys(ROLE_AFFINITY_MATRIX);
    const menuItems = allRefs.map(ref => ({
      ref, state: 'active' as const, useCount: 10,
      lastUsed: new Date().toISOString(), pinned: false,
    }));

    const result = computeSeeds(buildInput({ menuItems }));
    expect(result.seeds.length).toBe(0);
  });

  it('provides reason strings for all seeds', () => {
    const result = computeSeeds(buildInput());
    for (const seed of result.seeds) {
      expect(seed.reason).toBeTruthy();
      expect(seed.reason.length).toBeGreaterThan(0);
    }
  });

  it('identifies the primary signal correctly', () => {
    const result = computeSeeds(buildInput());
    for (const seed of result.seeds) {
      const signals = seed.signals;
      const primaryValue = signals[seed.primarySignal];
      const allValues = Object.values(signals);
      // Primary signal should be the max (or tied for max)
      expect(primaryValue).toBe(Math.max(...allValues));
    }
  });

  it('runs across all 7 roles without errors', () => {
    const roles: RoleId[] = ['learner', 'teacher', 'parent', 'tutor', 'admin', 'homeschool', 'creator'];
    for (const role of roles) {
      const result = computeSeeds(buildInput({ role }));
      expect(result.seeds.length).toBeGreaterThanOrEqual(0);
      expect(result.seeds.length).toBeLessThanOrEqual(MAX_SEEDS);
      expect(result.computedAt).toBeTruthy();
    }
  });

  it('handles night time with minimal suggestions', () => {
    const result = computeSeeds(buildInput({
      temporal: { hour: 23, dayOfWeek: 'wednesday', timeBlock: 'night', termWeek: 5, isSchoolDay: true },
    }));
    // Should still produce results (role signal still works), but fewer temporal hits
    expect(result.seeds.length).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// TEMPORAL UTILITIES
// =============================================================================

describe('Temporal Utilities', () => {
  it('resolves time blocks correctly', () => {
    expect(resolveTimeBlock(7)).toBe('early_morning');
    expect(resolveTimeBlock(9)).toBe('morning');
    expect(resolveTimeBlock(11)).toBe('late_morning');
    expect(resolveTimeBlock(13)).toBe('midday');
    expect(resolveTimeBlock(15)).toBe('afternoon');
    expect(resolveTimeBlock(18)).toBe('evening');
    expect(resolveTimeBlock(22)).toBe('night');
    expect(resolveTimeBlock(3)).toBe('night');
  });

  it('resolves days of week correctly', () => {
    expect(resolveDayOfWeek(0)).toBe('sunday');
    expect(resolveDayOfWeek(1)).toBe('monday');
    expect(resolveDayOfWeek(5)).toBe('friday');
    expect(resolveDayOfWeek(6)).toBe('saturday');
  });

  it('identifies school days correctly', () => {
    expect(isSchoolDay('monday')).toBe(true);
    expect(isSchoolDay('friday')).toBe(true);
    expect(isSchoolDay('saturday')).toBe(false);
    expect(isSchoolDay('sunday')).toBe(false);
  });

  it('returns term-week boosts for end of term', () => {
    const boosts = getTermWeekBoosts('teacher', 10);
    expect(boosts['T8']).toBeGreaterThan(0); // Reports boost at end of term
  });

  it('returns empty boosts for mid-term (week 7)', () => {
    const boosts = getTermWeekBoosts('teacher', 7);
    expect(Object.keys(boosts).length).toBe(0);
  });
});

// =============================================================================
// ROLE AFFINITY MATRIX INTEGRITY
// =============================================================================

describe('Role Affinity Matrix', () => {
  it('contains all 52 taxonomy tasks plus cross-cluster tasks', () => {
    const refs = Object.keys(ROLE_AFFINITY_MATRIX);
    // 7 daily + 8 teaching + 9 learning + 7 linguaflow + 8 family
    // + 7 homeschool + 8 tutoring + 10 admin + 6 arena + 7 content + 8 cross = ~85
    expect(refs.length).toBeGreaterThanOrEqual(60); // Allow for X4 being empty
  });

  it('has no affinity score exceeding 1.0', () => {
    for (const [ref, row] of Object.entries(ROLE_AFFINITY_MATRIX)) {
      for (const [role, score] of Object.entries(row)) {
        expect(score).toBeLessThanOrEqual(1.0);
        expect(score).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('assigns anchor tasks score 1.0 for their anchor role', () => {
    // Teacher anchors: D1 (dashboard), T2 (gradebook)
    expect(ROLE_AFFINITY_MATRIX['T2']?.teacher).toBe(1.0);
    // Parent: F1 (child progress)
    expect(ROLE_AFFINITY_MATRIX['F1']?.parent).toBe(1.0);
    // Homeschool: H1 (curriculum), H2 (compliance)
    expect(ROLE_AFFINITY_MATRIX['H1']?.homeschool).toBe(1.0);
    expect(ROLE_AFFINITY_MATRIX['H2']?.homeschool).toBe(1.0);
  });
});
