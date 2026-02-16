'use client';

// =============================================================================
// USE SEED ENGINE HOOK
// =============================================================================
// React hook that orchestrates the seed engine lifecycle. Runs on three
// triggers:
//   1. Initial login (component mount with no previous seed run)
//   2. Session return after 30+ minutes away (SESSION_GAP_MS)
//   3. Manual refresh (exposed via refreshSeeds() for testing/admin)
//
// The hook assembles the SeedEngineInput from multiple data sources:
//   - Auth context → role, userId
//   - Onboarding store → interests, subjects, year levels, languages
//   - Composing menu store → current menu state, usage history
//   - Institutional context API → school calendar events, term data
//   - Peer patterns API → anonymised cohort usage data
//
// Once the engine returns results, the hook calls store.addSeeds() to
// populate the sidebar's "Suggested for you" section. The toast system
// (Phase 2) handles user feedback when seeds are promoted or dismissed.
//
// Architecture decisions:
//   - The engine itself is a pure function (no side effects). This hook
//     is the impure wrapper that collects inputs and applies outputs.
//   - Institutional and peer data are fetched asynchronously. The engine
//     runs with whatever data is available — missing signals degrade
//     gracefully rather than blocking the seed computation.
//   - Seed results are cached in a ref to prevent redundant engine runs
//     during the same session. The cache is invalidated on session gap.
// =============================================================================

import { useEffect, useRef, useCallback } from 'react';
import { computeSeeds, buildDefaultOnboarding } from '@/services/seed-engine.service';
import {
  resolveTimeBlock,
  resolveDayOfWeek,
  isSchoolDay,
} from '@/config/temporal-heuristics';

import type {
  SeedEngineInput,
  SeedEngineResult,
  RoleId,
  OnboardingProfile,
  InstitutionalContext,
  PeerUsagePattern,
  DayOfWeek,
  TimeBlock,
} from '@/types/seed-engine-types';

import { SESSION_GAP_MS } from '@/types/seed-engine-types';

// =============================================================================
// EXTERNAL DEPENDENCIES (imported from existing Scholarly modules)
// =============================================================================
// These imports reference the existing codebase modules. The types are
// defined here as interfaces for compile-time safety; the actual modules
// provide the runtime implementations.
// =============================================================================

/**
 * Hook that returns the current user's auth context.
 * Expected to come from the existing auth provider.
 */
interface AuthContext {
  userId: string;
  role: string;        // May be aliased (e.g., 'educator' → 'teacher')
  institutionId?: string;
  timezone?: string;   // IANA timezone string
}

/**
 * The composing menu store from Phase 1.
 * We call addSeeds() to inject seed results into the sidebar.
 */
interface ComposingMenuStoreApi {
  roleMenus: Record<string, {
    items: Array<{
      ref: string;
      state: string;
      useCount: number;
      lastUsed: string;
      pinned: boolean;
      dismissedAt?: string;
    }>;
    lastSeedRun: string;
    menuVersion: number;
  }>;
  addSeeds: (role: string, seeds: Array<{
    ref: string;
    score: number;
    reason: string;
  }>) => void;
}

/**
 * The onboarding store from the existing onboarding flow.
 * Contains user preferences collected during onboarding.
 */
interface OnboardingStoreApi {
  interests: string[];
  subjects: string[];
  yearLevels: number[];
  languages: string[];
  competitiveInterest: boolean;
  hasEarlyYearsChildren: boolean;
  profileCompleteness: number;
}

// =============================================================================
// ROLE NORMALISATION
// =============================================================================
// The auth context may use role aliases (e.g., 'educator' for 'teacher').
// The seed engine requires canonical role IDs.
// =============================================================================

const ROLE_ALIASES: Record<string, RoleId> = {
  teacher: 'teacher',
  educator: 'teacher',
  parent: 'parent',
  guardian: 'parent',
  learner: 'learner',
  student: 'learner',
  tutor: 'tutor',
  mentor: 'tutor',
  admin: 'admin',
  administrator: 'admin',
  school_admin: 'admin',
  homeschool: 'homeschool',
  homeschool_parent: 'homeschool',
  creator: 'creator',
  content_creator: 'creator',
  developer: 'creator',
};

function normaliseRole(role: string): RoleId {
  return ROLE_ALIASES[role.toLowerCase()] ?? 'learner';
}

// =============================================================================
// INSTITUTIONAL CONTEXT FETCHER
// =============================================================================
// Fetches the institutional calendar context from the server. Returns a
// default empty context on failure — the engine degrades gracefully.
// =============================================================================

async function fetchInstitutionalContext(
  institutionId: string | undefined,
): Promise<InstitutionalContext> {
  const defaultContext: InstitutionalContext = {
    activeEvents: [],
    currentTerm: 1,
    termsPerYear: 4,
    termWeek: 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  if (!institutionId) return defaultContext;

  try {
    const response = await fetch(
      `/api/v1/institutions/${institutionId}/context`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000), // 3-second timeout
      },
    );

    if (!response.ok) return defaultContext;

    const data = await response.json();

    return {
      activeEvents: data.activeEvents ?? [],
      currentTerm: data.currentTerm ?? 1,
      termsPerYear: data.termsPerYear ?? 4,
      termWeek: data.termWeek ?? 1,
      timezone: data.timezone ?? defaultContext.timezone,
    };
  } catch {
    // Network error, timeout, or invalid JSON — degrade gracefully
    return defaultContext;
  }
}

// =============================================================================
// PEER PATTERNS FETCHER
// =============================================================================
// Fetches anonymised peer usage patterns from the server. Returns an empty
// array on failure — the peer signal simply contributes 0.
// =============================================================================

async function fetchPeerPatterns(
  role: RoleId,
  institutionId: string | undefined,
): Promise<PeerUsagePattern[]> {
  try {
    const params = new URLSearchParams({ role });
    if (institutionId) params.set('institutionId', institutionId);

    const response = await fetch(
      `/api/v1/menu-analytics/peer-patterns?${params.toString()}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000),
      },
    );

    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data.patterns) ? data.patterns : [];
  } catch {
    return [];
  }
}

// =============================================================================
// TEMPORAL CONTEXT BUILDER
// =============================================================================
// Builds the temporal portion of SeedEngineInput from the current time,
// resolved to the user's timezone.
// =============================================================================

function buildTemporalContext(
  timezone: string,
  termWeek: number,
): SeedEngineInput['temporal'] {
  // Resolve current time in the user's timezone
  let now: Date;
  try {
    const formatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find(p => p.type === 'hour');
    const hour = hourPart ? parseInt(hourPart.value, 10) : new Date().getHours();
    now = new Date();

    const dayIndex = now.getDay();
    const dayOfWeek = resolveDayOfWeek(dayIndex);
    const timeBlock = resolveTimeBlock(hour);
    const schoolDay = isSchoolDay(dayOfWeek);

    return {
      hour,
      dayOfWeek,
      timeBlock,
      termWeek,
      isSchoolDay: schoolDay,
    };
  } catch {
    // Timezone resolution failed — use local time
    now = new Date();
    const hour = now.getHours();
    const dayOfWeek = resolveDayOfWeek(now.getDay());

    return {
      hour,
      dayOfWeek,
      timeBlock: resolveTimeBlock(hour),
      termWeek,
      isSchoolDay: isSchoolDay(dayOfWeek),
    };
  }
}

// =============================================================================
// ONBOARDING DATA MAPPER
// =============================================================================
// Maps the onboarding store shape to the seed engine's OnboardingProfile type.
// =============================================================================

function mapOnboardingData(
  store: OnboardingStoreApi | null,
): OnboardingProfile {
  if (!store) return buildDefaultOnboarding();

  return {
    interests: store.interests ?? [],
    subjects: store.subjects ?? [],
    yearLevels: store.yearLevels ?? [],
    languages: store.languages ?? [],
    competitiveInterest: store.competitiveInterest ?? false,
    hasEarlyYearsChildren: store.hasEarlyYearsChildren ?? false,
    profileCompleteness: store.profileCompleteness ?? 0,
  };
}

// =============================================================================
// HOOK: useSeedEngine
// =============================================================================

export interface UseSeedEngineOptions {
  /** Auth context from the auth provider. */
  auth: AuthContext;

  /** The composing menu store (Phase 1). */
  menuStore: ComposingMenuStoreApi;

  /** The onboarding store. Pass null if not yet loaded. */
  onboardingStore: OnboardingStoreApi | null;

  /** Whether to run the engine immediately on mount. Default: true. */
  autoRun?: boolean;

  /**
   * Callback fired after seeds are computed and applied.
   * Useful for analytics and debugging.
   */
  onSeedsComputed?: (result: SeedEngineResult) => void;
}

export interface UseSeedEngineReturn {
  /** The most recent seed engine result, or null if not yet run. */
  lastResult: SeedEngineResult | null;

  /** Whether the engine is currently computing seeds. */
  isComputing: boolean;

  /** Manually trigger a seed refresh. */
  refreshSeeds: () => Promise<void>;
}

export function useSeedEngine(
  options: UseSeedEngineOptions,
): UseSeedEngineReturn {
  const {
    auth,
    menuStore,
    onboardingStore,
    autoRun = true,
    onSeedsComputed,
  } = options;

  const lastResultRef = useRef<SeedEngineResult | null>(null);
  const isComputingRef = useRef(false);
  const lastRunTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);

  // Stable reference to avoid stale closure issues
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // ── Core engine runner ──

  const runEngine = useCallback(async () => {
    const { auth, menuStore, onboardingStore, onSeedsComputed } = optionsRef.current;

    // Prevent concurrent runs
    if (isComputingRef.current) return;
    isComputingRef.current = true;

    try {
      const role = normaliseRole(auth.role);

      // Fetch async data sources in parallel
      const [institutional, peerPatterns] = await Promise.all([
        fetchInstitutionalContext(auth.institutionId),
        fetchPeerPatterns(role, auth.institutionId),
      ]);

      // Check component is still mounted after async operations
      if (!mountedRef.current) return;

      // Build the onboarding profile
      const onboarding = mapOnboardingData(onboardingStore);

      // Build temporal context
      const temporal = buildTemporalContext(
        auth.timezone ?? institutional.timezone,
        institutional.termWeek,
      );

      // Build menu items snapshot from the store
      const roleMenu = menuStore.roleMenus[role];
      const menuItems = (roleMenu?.items ?? []).map(item => ({
        ref: item.ref,
        state: item.state as any,
        useCount: item.useCount,
        lastUsed: item.lastUsed,
        pinned: item.pinned,
        dismissedAt: item.dismissedAt,
      }));

      // Assemble the engine input
      const input: SeedEngineInput = {
        role,
        onboarding,
        temporal,
        menuItems,
        institutional,
        peerPatterns,
      };

      // Run the pure scoring algorithm
      const result = computeSeeds(input);

      // Check component is still mounted
      if (!mountedRef.current) return;

      // Apply seeds to the store
      if (result.seeds.length > 0) {
        menuStore.addSeeds(
          role,
          result.seeds.map(seed => ({
            ref: seed.taskRef,
            score: seed.compositeScore,
            reason: seed.reason,
          })),
        );
      }

      // Cache the result
      lastResultRef.current = result;
      lastRunTimeRef.current = Date.now();

      // Notify callback
      onSeedsComputed?.(result);
    } catch (error) {
      // Seed engine failures should never crash the UI.
      // The sidebar simply shows no seeds — the menu remains functional.
      console.error('[SeedEngine] Computation failed:', error);
    } finally {
      isComputingRef.current = false;
    }
  }, []);

  // ── Session gap detection ──

  const shouldRunOnMount = useCallback((): boolean => {
    const roleMenu = menuStore.roleMenus[normaliseRole(auth.role)];
    const lastSeedRun = roleMenu?.lastSeedRun;

    // No previous seed run — always run
    if (!lastSeedRun) return true;

    // Check if enough time has passed since last run
    const lastRunTime = new Date(lastSeedRun).getTime();
    const elapsed = Date.now() - lastRunTime;

    return elapsed >= SESSION_GAP_MS;
  }, [menuStore.roleMenus, auth.role]);

  // ── Auto-run on mount ──

  useEffect(() => {
    mountedRef.current = true;

    if (autoRun && shouldRunOnMount()) {
      // Small delay to let the sidebar render before computing seeds.
      // This prevents a flash of empty seeds followed by populated seeds.
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          runEngine();
        }
      }, 200);

      return () => {
        clearTimeout(timeoutId);
        mountedRef.current = false;
      };
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoRun, shouldRunOnMount, runEngine]);

  // ── Visibility change handler ──
  // Detect when the user returns to the tab after being away.
  // If the gap exceeds SESSION_GAP_MS, refresh seeds.

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const elapsed = Date.now() - lastRunTimeRef.current;
      if (elapsed >= SESSION_GAP_MS) {
        runEngine();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [runEngine]);

  // ── Public API ──

  const refreshSeeds = useCallback(async () => {
    await runEngine();
  }, [runEngine]);

  return {
    lastResult: lastResultRef.current,
    isComputing: isComputingRef.current,
    refreshSeeds,
  };
}
