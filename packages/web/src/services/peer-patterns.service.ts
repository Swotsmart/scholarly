// =============================================================================
// PEER PATTERNS SERVICE
// =============================================================================
// Provides peer-based signals for the seed engine. Analyzes what menu items
// are popular among users with similar roles, institutions, and usage patterns.
//
// This is the "social proof" signal in the seed engine scoring formula:
//   peerMatch(task, user.role, user.context) contributes 10% of composite score.
//
// In the current implementation, this runs client-side with cached data.
// A future iteration could call the API for real-time peer analytics.
//
// Specification reference:
//   Seed engine scoring — 0.10 × peerMatch weight
//   Phase 3 plan — "peer-patterns.service.ts: pure computation, no UI"
// =============================================================================

import type { ComposingMenuItem } from '@/types/composing-menu-types';

// =============================================================================
// TYPES
// =============================================================================

export interface PeerPattern {
  /** Task reference from the menu registry */
  taskRef: string;

  /** Percentage of peers (same role) who have this task active (0–1) */
  adoptionRate: number;

  /** Average position in peers' menus (lower = more prominent) */
  avgPosition: number;

  /** Number of peers sampled */
  sampleSize: number;

  /** Trend over the last 30 days */
  trend: 'rising' | 'stable' | 'declining';
}

export interface PeerContext {
  /** The role to find peers for */
  role: string;

  /** Optional institution ID for same-school peer matching */
  institutionId?: string;

  /** Current user's active task refs (to exclude from suggestions) */
  currentTaskRefs: string[];
}

export interface PeerPatternsResult {
  /** Peer patterns sorted by adoption rate (descending) */
  patterns: PeerPattern[];

  /** When this data was last computed */
  computedAt: string;

  /** Whether the data is from cache or fresh */
  fromCache: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Cache duration for peer patterns (1 hour) */
const CACHE_DURATION_MS = 60 * 60 * 1000;

/** Minimum adoption rate for a pattern to be considered relevant */
const MIN_ADOPTION_RATE = 0.15;

/** Maximum number of peer patterns to return */
const MAX_PATTERNS = 10;

// =============================================================================
// IN-MEMORY CACHE
// =============================================================================

interface CacheEntry {
  result: PeerPatternsResult;
  cachedAt: number;
}

const peerCache = new Map<string, CacheEntry>();

function getCacheKey(context: PeerContext): string {
  return `${context.role}:${context.institutionId || 'global'}`;
}

// =============================================================================
// DEFAULT PEER PATTERNS
// =============================================================================
// Hardcoded baseline patterns derived from expected usage across roles.
// These provide reasonable peer signals before real analytics data is available.
// =============================================================================

const defaultPeerPatterns: Record<string, PeerPattern[]> = {
  teacher: [
    { taskRef: 'T1', adoptionRate: 0.82, avgPosition: 2, sampleSize: 100, trend: 'stable' },
    { taskRef: 'T2', adoptionRate: 0.78, avgPosition: 3, sampleSize: 100, trend: 'stable' },
    { taskRef: 'D2', adoptionRate: 0.71, avgPosition: 4, sampleSize: 100, trend: 'rising' },
    { taskRef: 'T5', adoptionRate: 0.65, avgPosition: 5, sampleSize: 100, trend: 'stable' },
    { taskRef: 'T8', adoptionRate: 0.45, avgPosition: 7, sampleSize: 100, trend: 'rising' },
    { taskRef: 'D4', adoptionRate: 0.40, avgPosition: 8, sampleSize: 100, trend: 'stable' },
    { taskRef: 'T3T4', adoptionRate: 0.38, avgPosition: 6, sampleSize: 100, trend: 'stable' },
    { taskRef: 'T7', adoptionRate: 0.25, avgPosition: 9, sampleSize: 100, trend: 'declining' },
  ],
  learner: [
    { taskRef: 'L1', adoptionRate: 0.88, avgPosition: 1, sampleSize: 200, trend: 'stable' },
    { taskRef: 'L3', adoptionRate: 0.72, avgPosition: 3, sampleSize: 200, trend: 'rising' },
    { taskRef: 'L4L5', adoptionRate: 0.55, avgPosition: 4, sampleSize: 200, trend: 'rising' },
    { taskRef: 'LF', adoptionRate: 0.48, avgPosition: 5, sampleSize: 200, trend: 'rising' },
    { taskRef: 'L6L7', adoptionRate: 0.42, avgPosition: 6, sampleSize: 200, trend: 'stable' },
    { taskRef: 'L8', adoptionRate: 0.35, avgPosition: 7, sampleSize: 200, trend: 'stable' },
    { taskRef: 'L9', adoptionRate: 0.30, avgPosition: 8, sampleSize: 200, trend: 'stable' },
  ],
  parent: [
    { taskRef: 'F1', adoptionRate: 0.90, avgPosition: 1, sampleSize: 80, trend: 'stable' },
    { taskRef: 'D3-parent', adoptionRate: 0.75, avgPosition: 3, sampleSize: 80, trend: 'stable' },
    { taskRef: 'F1_PROGRESS', adoptionRate: 0.68, avgPosition: 4, sampleSize: 80, trend: 'rising' },
    { taskRef: 'F4', adoptionRate: 0.52, avgPosition: 5, sampleSize: 80, trend: 'stable' },
    { taskRef: 'F5', adoptionRate: 0.40, avgPosition: 6, sampleSize: 80, trend: 'rising' },
    { taskRef: 'F8', adoptionRate: 0.35, avgPosition: 7, sampleSize: 80, trend: 'stable' },
    { taskRef: 'F6', adoptionRate: 0.28, avgPosition: 8, sampleSize: 80, trend: 'stable' },
  ],
  tutor: [
    { taskRef: 'TU2', adoptionRate: 0.85, avgPosition: 2, sampleSize: 40, trend: 'stable' },
    { taskRef: 'TU5', adoptionRate: 0.80, avgPosition: 3, sampleSize: 40, trend: 'stable' },
    { taskRef: 'TU1', adoptionRate: 0.72, avgPosition: 4, sampleSize: 40, trend: 'stable' },
    { taskRef: 'TU7', adoptionRate: 0.60, avgPosition: 5, sampleSize: 40, trend: 'rising' },
  ],
  admin: [
    { taskRef: 'A1', adoptionRate: 0.92, avgPosition: 1, sampleSize: 20, trend: 'stable' },
    { taskRef: 'T8-admin', adoptionRate: 0.75, avgPosition: 3, sampleSize: 20, trend: 'rising' },
    { taskRef: 'D4-admin', adoptionRate: 0.65, avgPosition: 4, sampleSize: 20, trend: 'stable' },
    { taskRef: 'A4', adoptionRate: 0.40, avgPosition: 5, sampleSize: 20, trend: 'stable' },
  ],
};

// =============================================================================
// COMPUTE PEER SCORE
// =============================================================================
// Returns a 0–1 score indicating how strongly peers recommend this task.
// =============================================================================

export function computePeerScore(
  taskRef: string,
  role: string,
  currentItems: ComposingMenuItem[]
): number {
  const patterns = defaultPeerPatterns[role] || [];
  const pattern = patterns.find((p) => p.taskRef === taskRef);

  if (!pattern) return 0;

  // Already in the user's menu → no peer signal needed
  const existing = currentItems.find((i) => i.ref === taskRef);
  if (existing && (existing.state === 'active' || existing.state === 'anchor' || existing.state === 'pushed')) {
    return 0;
  }

  // Base score from adoption rate (0–1)
  let score = pattern.adoptionRate;

  // Boost rising trends
  if (pattern.trend === 'rising') {
    score = Math.min(1, score * 1.15);
  }

  // Slight penalty for declining trends
  if (pattern.trend === 'declining') {
    score *= 0.85;
  }

  return Math.round(score * 100) / 100;
}

// =============================================================================
// GET PEER PATTERNS
// =============================================================================
// Returns cached or freshly computed peer patterns for a given context.
// In a production system, this would call an API endpoint. Currently returns
// hardcoded defaults filtered by the user's context.
// =============================================================================

export function getPeerPatterns(context: PeerContext): PeerPatternsResult {
  const cacheKey = getCacheKey(context);
  const cached = peerCache.get(cacheKey);

  if (cached && Date.now() - cached.cachedAt < CACHE_DURATION_MS) {
    return { ...cached.result, fromCache: true };
  }

  const rolePatterns = defaultPeerPatterns[context.role] || [];

  // Filter out tasks the user already has
  const filtered = rolePatterns
    .filter((p) => !context.currentTaskRefs.includes(p.taskRef))
    .filter((p) => p.adoptionRate >= MIN_ADOPTION_RATE)
    .sort((a, b) => b.adoptionRate - a.adoptionRate)
    .slice(0, MAX_PATTERNS);

  const result: PeerPatternsResult = {
    patterns: filtered,
    computedAt: new Date().toISOString(),
    fromCache: false,
  };

  peerCache.set(cacheKey, { result, cachedAt: Date.now() });

  return result;
}

// =============================================================================
// GET TOP PEER TASKS
// =============================================================================
// Convenience function returning just the task refs of the most popular
// peer items, suitable for direct use in the seed engine.
// =============================================================================

export function getTopPeerTasks(
  role: string,
  currentTaskRefs: string[],
  limit: number = 5
): string[] {
  const result = getPeerPatterns({ role, currentTaskRefs });
  return result.patterns.slice(0, limit).map((p) => p.taskRef);
}
